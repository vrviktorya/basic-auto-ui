const convert = require('color-convert');
const kmeans = require('node-kmeans');

class LABColorAnalyzer {
    constructor() {
        this.colorRoles = {
            background: 'Фон',
            text: 'Текст', 
            primary: 'Основной',
            secondary: 'Вторичный',
            accent: 'Акцентный',
            surface: 'Поверхность',
            border: 'Граница',
            success: 'Успех',
            warning: 'Предупреждение',
            error: 'Ошибка'
        };
    }

    async analyzeColors(colorStrings) {
        console.log(`🎨 LAB Analysis: Processing ${colorStrings.length} color strings`);
        
        try {
            const validColors = this.filterAndParseColors(colorStrings);
            console.log(`✅ Valid colors after parsing: ${validColors.length}`);
            
            if (validColors.length === 0) {
                return { 
                    palette: [], 
                    semantics: {}, 
                    total: 0,
                    debug: { rawColors: colorStrings.length, validColors: 0 }
                };
            }

            // LAB кластеризация
            const labClusters = await this.clusterInLabSpace(validColors);
            console.log(`📊 LAB clustering created ${labClusters.length} clusters`);
            
            const palette = this.assignColorSemantics(labClusters);
            
            return {
                palette: palette,
                semantics: this.analyzeColorSemantics(palette),
                total: validColors.length,
                debug: {
                    rawColors: colorStrings.length,
                    validColors: validColors.length,
                    clusters: labClusters.length
                }
            };
        } catch (error) {
            console.error('❌ LAB color analysis error:', error);
            // Fallback to simple analysis
            return this.fallbackAnalysis(colorStrings);
        }
    }

    async clusterInLabSpace(colors) {
        if (colors.length === 0) return [];
        
        // Преобразуем RGB в LAB
        const labVectors = colors.map(color => {
            try {
                return convert.rgb.lab([color.r, color.g, color.b]);
            } catch (error) {
                // Fallback: используем RGB как есть
                return [color.r, color.g, color.b];
            }
        });

        // Определяем оптимальное количество кластеров
        const clusterCount = this.calculateOptimalClusters(labVectors.length);
        
        return new Promise((resolve, reject) => {
            kmeans.clusterize(labVectors, { k: clusterCount }, (err, clusters) => {
                if (err || !clusters) {
                    console.error('LAB clustering failed, using fallback:', err);
                    resolve(this.simpleColorGrouping(colors));
                    return;
                }

                const result = clusters.map(cluster => {
                    // Преобразуем центроид LAB обратно в RGB
                    let centroidRgb;
                    try {
                        centroidRgb = convert.lab.rgb(cluster.centroid.map(c => Math.round(c)));
                    } catch (error) {
                        // Если преобразование не удалось, используем среднее RGB
                        centroidRgb = cluster.centroid.map(c => Math.round(c));
                    }

                    return {
                        rgb: centroidRgb,
                        lab: cluster.centroid,
                        count: cluster.clusterIndices ? cluster.clusterIndices.length : 1,
                        clusterSize: cluster.cluster ? cluster.cluster.length : 1
                    };
                });

                // Сортируем по размеру кластера
                result.sort((a, b) => b.count - a.count);
                resolve(result);
            });
        });
    }

    calculateOptimalClusters(colorCount) {
        // Эмпирическая формула для определения количества кластеров
        if (colorCount <= 5) return Math.max(2, colorCount);
        if (colorCount <= 15) return Math.min(6, Math.floor(colorCount / 3));
        return Math.min(8, Math.floor(colorCount / 5));
    }

    simpleColorGrouping(colors) {
        const groups = [];
        const labThreshold = 15; // Порог в LAB пространстве

        colors.forEach(color => {
            const lab = convert.rgb.lab([color.r, color.g, color.b]);
            let foundGroup = false;
            
            for (let group of groups) {
                const distance = this.labDistance(lab, group.lab);
                if (distance < labThreshold) {
                    group.count++;
                    group.colors.push(color);
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                groups.push({
                    rgb: [color.r, color.g, color.b],
                    lab: lab,
                    count: 1,
                    colors: [color],
                    clusterSize: 1
                });
            }
        });

        return groups.sort((a, b) => b.count - a.count).slice(0, 8);
    }

    labDistance(lab1, lab2) {
        // Простое евклидово расстояние в LAB пространстве
        return Math.sqrt(
            Math.pow(lab1[0] - lab2[0], 2) +
            Math.pow(lab1[1] - lab2[1], 2) +
            Math.pow(lab1[2] - lab2[2], 2)
        );
    }

    assignColorSemantics(clusters) {
        const palette = clusters.map(cluster => {
            const rgb = cluster.rgb;
            const hex = this.rgbToHex(rgb[0], rgb[1], rgb[2]);
            const lab = cluster.lab;
            const hsl = this.rgbToHsl(rgb[0], rgb[1], rgb[2]);
            
            return {
                rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                hex: hex,
                count: cluster.count,
                lab: lab,
                hsl: hsl,
                brightness: this.getBrightness(rgb[0], rgb[1], rgb[2]),
                saturation: hsl.s,
                luminance: lab[0] // L компонент из LAB - воспринимаемая яркость
            };
        });

        // Сортируем по воспринимаемой яркости (L из LAB)
        palette.sort((a, b) => a.luminance - b.luminance);

        // Назначаем роли с улучшенной логикой
        return this.assignRolesWithWeights(palette);
    }

    assignRolesWithWeights(palette) {
        if (palette.length === 0) return palette;

        const roles = [...palette];
        
        // 1. Фон - самый светлый цвет с высокой светлотой в LAB
        const lightest = roles[roles.length - 1];
        if (lightest.luminance > 80) { // L > 80 в LAB - очень светлый
            lightest.role = 'background';
            lightest.roleName = this.colorRoles.background;
        }

        // 2. Текст - самый темный цвет
        const darkest = roles[0];
        if (darkest.luminance < 30) { // L < 30 в LAB - очень темный
            darkest.role = 'text';
            darkest.roleName = this.colorRoles.text;
        }

        // 3. Основной цвет - самый частый И насыщенный
        const unassigned = roles.filter(color => !color.role);
        if (unassigned.length > 0) {
            const primary = unassigned.reduce((prev, current) => {
                const prevScore = prev.count * (prev.saturation / 100);
                const currentScore = current.count * (current.saturation / 100);
                return prevScore > currentScore ? prev : current;
            });
            primary.role = 'primary';
            primary.roleName = this.colorRoles.primary;
        }

        // 4. Акцентный цвет - самый насыщенный с хорошей светлотой
        const forAccent = roles.filter(color => !color.role);
        if (forAccent.length > 0) {
            const accent = forAccent.reduce((prev, current) => {
                // Предпочитаем цвета с насыщенностью > 60 и светлотой 30-70
                const prevFit = prev.saturation > 60 && prev.luminance > 30 && prev.luminance < 70;
                const currentFit = current.saturation > 60 && current.luminance > 30 && current.luminance < 70;
                
                if (prevFit && !currentFit) return prev;
                if (!prevFit && currentFit) return current;
                return prev.saturation > current.saturation ? prev : current;
            });
            
            if (accent.saturation > 50) {
                accent.role = 'accent';
                accent.roleName = this.colorRoles.accent;
            }
        }

        // 5. Остальные роли
        const roleOrder = ['secondary', 'surface', 'border'];
        let roleIndex = 0;
        
        roles.forEach(color => {
            if (!color.role && roleIndex < roleOrder.length) {
                color.role = roleOrder[roleIndex];
                color.roleName = this.colorRoles[roleOrder[roleIndex]];
                roleIndex++;
            } else if (!color.role) {
                color.role = 'additional';
                color.roleName = 'Дополнительный';
            }
        });

        return roles;
    }

    analyzeColorSemantics(palette) {
        const semantics = {
            hasGoodContrast: false,
            colorCount: palette.length,
            primaryColor: null,
            accentColor: null,
            isDarkTheme: false,
            averageLuminance: 0,
            accessibilityScore: 0,
            saturatedColors: 0,
            neutralColors: 0
        };

        if (palette.length === 0) return semantics;

        const background = palette.find(color => color.role === 'background');
        const text = palette.find(color => color.role === 'text');
        const primary = palette.find(color => color.role === 'primary');
        const accent = palette.find(color => color.role === 'accent');

        // Проверка контрастности с использованием LAB luminance
        if (background && text) {
            const contrastRatio = (Math.max(background.luminance, text.luminance) + 0.05) / 
                                 (Math.min(background.luminance, text.luminance) + 0.05);
            semantics.hasGoodContrast = contrastRatio > 4.5; // WCAG AA standard
        }

        if (primary) semantics.primaryColor = primary.hex;
        if (accent) semantics.accentColor = accent.hex;

        // Определение темы на основе средней светлоты
        semantics.averageLuminance = palette.reduce((sum, color) => sum + color.luminance, 0) / palette.length;
        semantics.isDarkTheme = semantics.averageLuminance < 50;

        // Оценка доступности
        let accessibilityScore = 5;
        if (semantics.hasGoodContrast) accessibilityScore += 3;
        if (semantics.primaryColor && semantics.accentColor) accessibilityScore += 2;
        semantics.accessibilityScore = Math.min(10, accessibilityScore);

        // Анализ цветового профиля
        semantics.saturatedColors = palette.filter(color => color.saturation > 60).length;
        semantics.neutralColors = palette.filter(color => color.saturation < 20).length;

        return semantics;
    }

    // Fallback метод
    fallbackAnalysis(colorStrings) {
        const validColors = this.filterAndParseColors(colorStrings);
        const simpleGroups = this.simpleColorGrouping(validColors);
        
        const palette = simpleGroups.map(group => {
            const rgb = group.rgb;
            const hex = this.rgbToHex(rgb[0], rgb[1], rgb[2]);
            const hsl = this.rgbToHsl(rgb[0], rgb[1], rgb[2]);
            const lab = convert.rgb.lab([rgb[0], rgb[1], rgb[2]]);
            
            return {
                rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                hex: hex,
                count: group.count,
                hsl: hsl,
                lab: lab,
                brightness: this.getBrightness(rgb[0], rgb[1], rgb[2]),
                saturation: hsl.s,
                luminance: lab[0],
                role: 'additional',
                roleName: 'Дополнительный'
            };
        });

        const semanticPalette = this.assignRolesWithWeights(palette);
        
        return {
            palette: semanticPalette,
            semantics: this.analyzeColorSemantics(semanticPalette),
            total: validColors.length
        };
    }

    // Вспомогательные методы (такие же как в SimpleColorAnalyzer)
    filterAndParseColors(colorStrings) {
        const validColors = [];
        
        colorStrings.forEach(colorStr => {
            try {
                const color = this.parseColor(colorStr);
                if (color && this.isValidColor(color)) {
                    validColors.push(color);
                }
            } catch (error) {
                // Пропускаем невалидные цвета
            }
        });

        return validColors;
    }

    parseColor(colorStr) {
        if (!colorStr) return null;
        const cleanStr = colorStr.replace(/\s+/g, '');
        
        const rgbMatch = cleanStr.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
                a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
                original: colorStr
            };
        }

        const hexMatch = cleanStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
            return {
                r: parseInt(hexMatch[1], 16),
                g: parseInt(hexMatch[2], 16),
                b: parseInt(hexMatch[3], 16),
                a: 1,
                original: colorStr
            };
        }

        return null;
    }

    isValidColor(color) {
        if (color.a < 0.05) return false;
        if (color.r === 0 && color.g === 0 && color.b === 0 && color.a < 0.1) return false;
        return color.r >= 0 && color.r <= 255 &&
               color.g >= 0 && color.g <= 255 &&
               color.b >= 0 && color.b <= 255;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }
}

module.exports = LABColorAnalyzer;