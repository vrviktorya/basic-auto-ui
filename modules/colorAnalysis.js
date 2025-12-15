const convert = require('color-convert');
const kmeans = require('node-kmeans');

class ColorAnalyzer {
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

    // Основная функция анализа
    async analyzeColors(colorStrings) {
        try {
            // Фильтруем и преобразуем цвета
            const validColors = this.filterAndParseColors(colorStrings);
            
            if (validColors.length === 0) {
                return { palette: [], semantics: {}, total: 0 };
            }

            // Улучшенная кластеризация в LAB пространстве
            const labClusters = await this.clusterInLabSpace(validColors);
            
            // Определяем семантику цветов
            const semanticPalette = this.assignColorSemantics(labClusters);
            
            return {
                palette: semanticPalette,
                semantics: this.analyzeColorSemantics(semanticPalette),
                total: validColors.length
            };
        } catch (error) {
            console.error('Color analysis error:', error);
            // Fallback: простая группировка
            return this.fallbackColorAnalysis(colorStrings);
        }
    }

    // Fallback метод если кластеризация не работает
    fallbackColorAnalysis(colorStrings) {
        const validColors = this.filterAndParseColors(colorStrings);
        const simpleGroups = this.simpleColorGrouping(validColors);
        
        const palette = simpleGroups.map(group => {
            const rgb = group.rgb;
            const hex = this.rgbToHex(rgb[0], rgb[1], rgb[2]);
            const hsl = this.rgbToHsl(rgb[0], rgb[1], rgb[2]);
            
            return {
                rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                hex: hex,
                count: group.count,
                hsl: hsl,
                brightness: this.getBrightness(rgb[0], rgb[1], rgb[2]),
                saturation: hsl.s
            };
        });

        const semanticPalette = this.assignColorSemantics(palette);
        
        return {
            palette: semanticPalette,
            semantics: this.analyzeColorSemantics(semanticPalette),
            total: validColors.length
        };
    }

    // Фильтрация и парсинг цветов
    filterAndParseColors(colorStrings) {
        const validColors = [];
        
        colorStrings.forEach(colorStr => {
            try {
                const color = this.parseColor(colorStr);
                if (color && this.isValidColor(color)) {
                    validColors.push(color);
                }
            } catch (error) {
                console.log('Skipping invalid color:', colorStr);
            }
        });

        return validColors;
    }

    // Парсинг цвета из разных форматов
    parseColor(colorStr) {
        if (!colorStr) return null;

        // Убираем пробелы
        const cleanStr = colorStr.replace(/\s+/g, '');
        
        // Парсим RGB/RGBA
        const rgbMatch = cleanStr.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
                a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
                original: colorStr,
                type: 'rgb'
            };
        }

        // Парсим HEX
        const hexMatch = cleanStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
            return {
                r: parseInt(hexMatch[1], 16),
                g: parseInt(hexMatch[2], 16),
                b: parseInt(hexMatch[3], 16),
                a: 1,
                original: colorStr,
                type: 'hex'
            };
        }

        // Парсим named colors (базовые)
        const namedColors = {
            'white': { r: 255, g: 255, b: 255 },
            'black': { r: 0, g: 0, b: 0 },
            'red': { r: 255, g: 0, b: 0 },
            'green': { r: 0, g: 255, b: 0 },
            'blue': { r: 0, g: 0, b: 255 },
            'transparent': null
        };

        const lowerStr = cleanStr.toLowerCase();
        if (namedColors[lowerStr] && namedColors[lowerStr] !== null) {
            return {
                ...namedColors[lowerStr],
                a: 1,
                original: colorStr,
                type: 'named'
            };
        }

        return null;
    }

    // Проверка валидности цвета
    isValidColor(color) {
        if (color.a < 0.1) return false; // Пропускаем почти прозрачные
        if (color.r === 0 && color.g === 0 && color.b === 0 && color.a < 1) return false; // Пропускаем прозрачный черный
        
        // Проверяем что значения в диапазоне
        return color.r >= 0 && color.r <= 255 &&
               color.g >= 0 && color.g <= 255 &&
               b >= 0 && color.b <= 255;
    }

    // Преобразование RGB в LAB
    rgbToLab(r, g, b) {
        try {
            return convert.rgb.lab([r, g, b]);
        } catch (error) {
            // Fallback: используем упрощенное преобразование
            return [r, g, b];
        }
    }

    // Преобразование LAB в RGB
    labToRgb(l, a, b) {
        try {
            return convert.lab.rgb([l, a, b]);
        } catch (error) {
            return [l, a, b];
        }
    }

    // Кластеризация в LAB пространстве
    async clusterInLabSpace(colors) {
        try {
            // Преобразуем цвета в LAB пространство
            const labVectors = colors.map(color => {
                const lab = this.rgbToLab(color.r, color.g, color.b);
                return {
                    lab,
                    original: color,
                    rgb: [color.r, color.g, color.b]
                };
            });

            // Определяем оптимальное количество кластеров
            const clusterCount = Math.min(8, Math.max(3, Math.floor(colors.length / 10)));
            
            return new Promise((resolve, reject) => {
                const vectors = labVectors.map(item => item.lab);
                
                kmeans.clusterize(vectors, { k: clusterCount }, (err, clusters) => {
                    if (err || !clusters) {
                        reject(new Error('Clustering failed'));
                        return;
                    }

                    const result = clusters.map((cluster, index) => {
                        // Преобразуем центроид обратно в RGB
                        const centroidLab = cluster.centroid;
                        const centroidRgb = this.labToRgb(
                            Math.round(centroidLab[0]),
                            Math.round(centroidLab[1]), 
                            Math.round(centroidLab[2])
                        );

                        // ИСПРАВЛЕНИЕ: правильное получение цветов кластера
                        const clusterColors = [];
                        if (cluster.cluster && cluster.cluster.length > 0) {
                            clusterColors.push(...cluster.cluster.map(idx => labVectors[idx].original));
                        }

                        return {
                            rgb: centroidRgb,
                            lab: centroidLab,
                            count: cluster.cluster ? cluster.cluster.length : 1,
                            colors: clusterColors
                        };
                    });

                    // Сортируем по размеру кластера
                    result.sort((a, b) => b.count - a.count);
                    resolve(result);
                });
            });
        } catch (error) {
            console.error('LAB clustering failed, using fallback:', error);
            throw error;
        }
    }

    // Простая группировка для fallback
    simpleColorGrouping(colors) {
        const groups = [];
        const threshold = 30; // Порог схожести цветов
        
        colors.forEach(color => {
            let foundGroup = false;
            
            for (let group of groups) {
                const groupColor = group.representative;
                const distance = this.colorDistance(
                    [color.r, color.g, color.b],
                    [groupColor.r, groupColor.g, groupColor.b]
                );
                
                if (distance < threshold) {
                    group.colors.push(color);
                    group.count++;
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                groups.push({
                    representative: color,
                    colors: [color],
                    count: 1,
                    rgb: [color.r, color.g, color.b]
                });
            }
        });

        return groups.sort((a, b) => b.count - a.count);
    }

    // Расстояние между цветами
    colorDistance(color1, color2) {
        return Math.sqrt(
            Math.pow(color1[0] - color2[0], 2) +
            Math.pow(color1[1] - color2[1], 2) + 
            Math.pow(color1[2] - color2[2], 2)
        );
    }

    // Назначение семантики цветам
    assignColorSemantics(clusters) {
        const palette = clusters.map(cluster => {
            const rgb = cluster.rgb;
            const hex = this.rgbToHex(rgb[0], rgb[1], rgb[2]);
            const hsl = this.rgbToHsl(rgb[0], rgb[1], rgb[2]);
            
            return {
                rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                hex: hex,
                count: cluster.count,
                hsl: hsl,
                brightness: this.getBrightness(rgb[0], rgb[1], rgb[2]),
                saturation: hsl.s
            };
        });

        // Сортируем по яркости для семантического анализа
        palette.sort((a, b) => a.brightness - b.brightness);

        // Назначаем роли
        return this.assignRoles(palette);
    }

    // Назначение ролей цветам
    assignRoles(palette) {
        const roles = [...palette];
        const assignedRoles = new Set();

        // 1. Фоновые цвета (самые светлые)
        for (let i = roles.length - 1; i >= 0; i--) {
            if (roles[i].brightness > 240 && !assignedRoles.has('background')) {
                roles[i].role = 'background';
                roles[i].roleName = this.colorRoles.background;
                assignedRoles.add('background');
                break;
            }
        }

        // 2. Текстовые цвета (самые темные)
        for (let i = 0; i < roles.length; i++) {
            if (roles[i].brightness < 50 && !assignedRoles.has('text')) {
                roles[i].role = 'text';
                roles[i].roleName = this.colorRoles.text;
                assignedRoles.add('text');
                break;
            }
        }

        // 3. Основной цвет (самый частый и насыщенный)
        const unassigned = roles.filter(color => !color.role);
        if (unassigned.length > 0) {
            const primary = unassigned.reduce((prev, current) => 
                (prev.count > current.count && prev.saturation > 20) ? prev : current
            );
            primary.role = 'primary';
            primary.roleName = this.colorRoles.primary;
            assignedRoles.add('primary');
        }

        // 4. Вторичный цвет (второй по частоте)
        const remaining = roles.filter(color => !color.role);
        if (remaining.length > 0) {
            const secondary = remaining.reduce((prev, current) => 
                (prev.count > current.count) ? prev : current
            );
            secondary.role = 'secondary';
            secondary.roleName = this.colorRoles.secondary;
            assignedRoles.add('secondary');
        }

        // 5. Акцентный цвет (самый насыщенный)
        const forAccent = roles.filter(color => !color.role);
        if (forAccent.length > 0) {
            const accent = forAccent.reduce((prev, current) => 
                (prev.saturation > current.saturation) ? prev : current
            );
            if (accent.saturation > 30) {
                accent.role = 'accent';
                accent.roleName = this.colorRoles.accent;
                assignedRoles.add('accent');
            }
        }

        // 6. Остальным назначаем оставшиеся роли
        const roleOrder = ['surface', 'border', 'success', 'warning', 'error'];
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

    // Анализ семантики цветовой палитры
    analyzeColorSemantics(palette) {
        const semantics = {
            hasGoodContrast: false,
            colorCount: palette.length,
            primaryColor: null,
            accentColor: null,
            isDarkTheme: false
        };

        const background = palette.find(color => color.role === 'background');
        const text = palette.find(color => color.role === 'text');
        const primary = palette.find(color => color.role === 'primary');

        if (background && text) {
            semantics.hasGoodContrast = this.checkContrast(
                background.brightness, 
                text.brightness
            );
        }

        if (primary) {
            semantics.primaryColor = primary.hex;
        }

        const accent = palette.find(color => color.role === 'accent');
        if (accent) {
            semantics.accentColor = accent.hex;
        }

        // Определяем темная или светлая тема
        const avgBrightness = palette.reduce((sum, color) => sum + color.brightness, 0) / palette.length;
        semantics.isDarkTheme = avgBrightness < 128;

        return semantics;
    }

    // Проверка контрастности
    checkContrast(backgroundBrightness, textBrightness) {
        const contrast = Math.abs(backgroundBrightness - textBrightness);
        return contrast > 125; // Минимальный контраст для доступности
    }

    // Вспомогательные функции
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

module.exports = ColorAnalyzer;