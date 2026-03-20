// modules/multiSiteMerger.js
const UltraSimpleColorAnalyzer = require('../modules/colors/ultrasimpleColorAnalyzer');
const ColorConverter = require('../modules/colors/utils/colorConverter');

class MultiSiteMerger {
    constructor() {
        this.colorConverter = new ColorConverter();
        this.colorAnalyzer = new UltraSimpleColorAnalyzer();
    }

    /**
     * Основной метод объединения данных от нескольких сайтов
     */
    mergeDesignSystems(designSystems, strategy = 'dominant', weights = null) {
        console.log(`🔄 Merging ${designSystems.length} design systems with strategy: ${strategy}`);
        
        const result = {
            colors: this.mergeColors(designSystems.map(ds => ds.colors), strategy, weights),
            typography: this.mergeTypography(designSystems.map(ds => ds.typography), strategy, weights),
            buttons: this.mergeButtons(designSystems.map(ds => ds.buttons), strategy, weights),
            domains: designSystems.map(ds => ds.domain),
            timestamp: new Date().toISOString(),
            strategy: strategy
        };

        return result;
    }

    /**
     * Объединение цветовых палитр
     */
    mergeColors(colorAnalyses, strategy, weights) {
        if (strategy === 'dominant') {
            return this.mergeColorsDominant(colorAnalyses);
        } else if (strategy === 'average') {
            return this.mergeColorsAverage(colorAnalyses);
        } else if (strategy === 'weighted') {
            return this.mergeColorsWeighted(colorAnalyses, weights);
        }
        
        return this.mergeColorsDominant(colorAnalyses);
    }

    /**
     * Стратегия: доминирующий стиль (берем цвета с самого насыщенного сайта)
     */
    mergeColorsDominant(colorAnalyses) {
        // Находим сайт с наибольшим количеством насыщенных цветов
        let mostSaturatedIndex = 0;
        let maxSaturationCount = 0;

        colorAnalyses.forEach((colors, index) => {
            const saturatedColors = colors.palette.filter(color => 
                color.saturation > 60 && color.brightness > 30 && color.brightness < 200
            ).length;
            
            if (saturatedColors > maxSaturationCount) {
                maxSaturationCount = saturatedColors;
                mostSaturatedIndex = index;
            }
        });

        console.log(`🎨 Dominant color scheme from site ${mostSaturatedIndex} with ${maxSaturationCount} saturated colors`);
        return colorAnalyses[mostSaturatedIndex];
    }

    /**
     * Стратегия: усреднение цветов
     */
    mergeColorsAverage(colorAnalyses) {
        // Собираем все цвета по ролям
        const colorsByRole = {
            background: [],
            text: [],
            primary: [],
            accent: [],
            secondary: [],
            surface: []
        };

        colorAnalyses.forEach(colors => {
            colors.palette.forEach(color => {
                if (color.role && colorsByRole[color.role]) {
                    colorsByRole[color.role].push(color);
                }
            });
        });

        // Усредняем цвета для каждой роли
        const mergedPalette = Object.entries(colorsByRole)
            .filter(([role, colors]) => colors.length > 0)
            .map(([role, colors]) => {
                if (colors.length === 1) {
                    return { ...colors[0], role, roleName: this.getRoleName(role) };
                }

                // Усредняем RGB значения
                let totalR = 0, totalG = 0, totalB = 0;
                let totalBrightness = 0, totalSaturation = 0;

                colors.forEach(color => {
                    const rgb = this.colorConverter.parseColor(color.hex || color.rgb);
                    if (rgb) {
                        totalR += rgb.r;
                        totalG += rgb.g;
                        totalB += rgb.b;
                    }
                    totalBrightness += color.brightness || 0;
                    totalSaturation += color.saturation || 0;
                });

                const avgR = Math.round(totalR / colors.length);
                const avgG = Math.round(totalG / colors.length);
                const avgB = Math.round(totalB / colors.length);
                const avgHex = this.colorConverter.rgbToHex(avgR, avgG, avgB);
                const avgBrightness = Math.round(totalBrightness / colors.length);
                const avgSaturation = Math.round(totalSaturation / colors.length);

                return {
                    rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
                    hex: avgHex,
                    brightness: avgBrightness,
                    saturation: avgSaturation,
                    role: role,
                    roleName: this.getRoleName(role),
                    count: colors.reduce((sum, c) => sum + (c.count || 1), 0)
                };
            });

        return {
            palette: mergedPalette,
            semantics: this.colorAnalyzer.analyzeSemantics(mergedPalette),
            total: mergedPalette.length
        };
    }

    /**
     * Стратегия: взвешенное объединение
     */
    mergeColorsWeighted(colorAnalyses, weights) {
        if (!weights || weights.length !== colorAnalyses.length) {
            console.log('⚠️ No valid weights provided, using average strategy');
            return this.mergeColorsAverage(colorAnalyses);
        }

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);

        // Группируем цвета по ролям с учетом весов
        const colorsByRole = {};
        const roleWeights = {};

        colorAnalyses.forEach((colors, siteIndex) => {
            colors.palette.forEach(color => {
                if (color.role) {
                    if (!colorsByRole[color.role]) {
                        colorsByRole[color.role] = [];
                        roleWeights[color.role] = [];
                    }
                    colorsByRole[color.role].push(color);
                    roleWeights[color.role].push(normalizedWeights[siteIndex]);
                }
            });
        });

        // Взвешенное усреднение
        const mergedPalette = Object.entries(colorsByRole)
            .map(([role, colors]) => {
                let weightedR = 0, weightedG = 0, weightedB = 0;
                let totalWeightForRole = 0;

                colors.forEach((color, i) => {
                    const rgb = this.colorConverter.parseColor(color.hex || color.rgb);
                    if (rgb) {
                        const weight = roleWeights[role][i] || 1;
                        weightedR += rgb.r * weight;
                        weightedG += rgb.g * weight;
                        weightedB += rgb.b * weight;
                        totalWeightForRole += weight;
                    }
                });

                const avgR = Math.round(weightedR / totalWeightForRole);
                const avgG = Math.round(weightedG / totalWeightForRole);
                const avgB = Math.round(weightedB / totalWeightForRole);
                const avgHex = this.colorConverter.rgbToHex(avgR, avgG, avgB);

                return {
                    rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
                    hex: avgHex,
                    brightness: Math.round(colors.reduce((sum, c) => sum + (c.brightness || 0), 0) / colors.length),
                    saturation: Math.round(colors.reduce((sum, c) => sum + (c.saturation || 0), 0) / colors.length),
                    role: role,
                    roleName: this.getRoleName(role),
                    count: colors.length
                };
            });

        return {
            palette: mergedPalette,
            semantics: this.colorAnalyzer.analyzeSemantics(mergedPalette),
            total: mergedPalette.length
        };
    }

    /**
     * Объединение типографики
     */
    mergeTypography(typographyAnalyses, strategy, weights) {
        if (strategy === 'dominant') {
            return this.mergeTypographyDominant(typographyAnalyses);
        } else if (strategy === 'average') {
            return this.mergeTypographyAverage(typographyAnalyses);
        }
        
        return this.mergeTypographyDominant(typographyAnalyses);
    }

    mergeTypographyDominant(typographyAnalyses) {
        // Находим сайт с наибольшим разнообразием типографики
        let mostDiverseIndex = 0;
        let maxStylesCount = 0;

        typographyAnalyses.forEach((typography, index) => {
            if (typography.styles && typography.styles.length > maxStylesCount) {
                maxStylesCount = typography.styles.length;
                mostDiverseIndex = index;
            }
        });

        console.log(`📝 Dominant typography from site ${mostDiverseIndex} with ${maxStylesCount} styles`);
        return typographyAnalyses[mostDiverseIndex];
    }

    mergeTypographyAverage(typographyAnalyses) {
        // Собираем все стили
        const allStyles = [];
        typographyAnalyses.forEach(typography => {
            if (typography.styles) {
                allStyles.push(...typography.styles);
            }
        });

        // Группируем по тегам и выбираем наиболее частые стили
        const stylesByTag = {};
        
        allStyles.forEach(style => {
            const tag = style.tag?.toLowerCase() || 'unknown';
            if (!stylesByTag[tag]) {
                stylesByTag[tag] = [];
            }
            stylesByTag[tag].push(style);
        });

        // Выбираем лучший стиль для каждого тега
        const mergedStyles = Object.entries(stylesByTag).map(([tag, styles]) => {
            // Для заголовков выбираем самый крупный
            if (tag.startsWith('h')) {
                const sortedBySize = [...styles].sort((a, b) => {
                    const sizeA = parseFloat(a.fontSize) || 0;
                    const sizeB = parseFloat(b.fontSize) || 0;
                    return sizeB - sizeA;
                });
                return sortedBySize[0];
            }

            // Для body и p выбираем наиболее читаемый (средний размер)
            if (tag === 'body' || tag === 'p') {
                const readableSizes = styles.filter(s => {
                    const size = parseFloat(s.fontSize) || 0;
                    return size >= 14 && size <= 20;
                });
                
                if (readableSizes.length > 0) {
                    // Выбираем средний размер
                    readableSizes.sort((a, b) => {
                        const sizeA = parseFloat(a.fontSize) || 0;
                        const sizeB = parseFloat(b.fontSize) || 0;
                        return sizeA - sizeB;
                    });
                    return readableSizes[Math.floor(readableSizes.length / 2)];
                }
            }

            // Для остальных - выбираем наиболее частый шрифт
            const fontCounts = {};
            styles.forEach(s => {
                const font = s.fontFamily?.split(',')[0]?.replace(/['"]/g, '').trim() || 'Unknown';
                fontCounts[font] = (fontCounts[font] || 0) + 1;
            });

            const mostCommonFont = Object.entries(fontCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Arial';

            // Возвращаем первый стиль с наиболее частым шрифтом
            return styles.find(s => 
                s.fontFamily?.includes(mostCommonFont)) || styles[0];
        });

        return {
            total: mergedStyles.length,
            styles: mergedStyles
        };
    }

    /**
     * Объединение кнопок
     */
    mergeButtons(buttonAnalyses, strategy, weights) {
        if (!buttonAnalyses || buttonAnalyses.length === 0) {
            return { total: 0, found: false, clusters: {}, samples: [] };
        }

        if (strategy === 'dominant') {
            return this.mergeButtonsDominant(buttonAnalyses);
        }
        
        return this.mergeButtonsUsability(buttonAnalyses);
    }

    mergeButtonsDominant(buttonAnalyses) {
        // Находим сайт с наибольшим количеством кнопок
        let mostButtonsIndex = 0;
        let maxButtonsCount = 0;

        buttonAnalyses.forEach((buttons, index) => {
            if (buttons.total > maxButtonsCount) {
                maxButtonsCount = buttons.total;
                mostButtonsIndex = index;
            }
        });

        console.log(`🔘 Dominant buttons from site ${mostButtonsIndex} with ${maxButtonsCount} buttons`);
        return buttonAnalyses[mostButtonsIndex];
    }

    mergeButtonsUsability(buttonAnalyses) {
        // Собираем все кнопки
        const allButtons = [];
        buttonAnalyses.forEach(buttons => {
            if (buttons.samples) {
                allButtons.push(...buttons.samples);
            }
        });

        if (allButtons.length === 0) {
            return { total: 0, found: false, clusters: {}, samples: [] };
        }

        // Группируем по типам
        const buttonsByType = {};
        allButtons.forEach(button => {
            const type = button.type || 'primary';
            if (!buttonsByType[type]) {
                buttonsByType[type] = [];
            }
            buttonsByType[type].push(button);
        });

        // Выбираем лучшую кнопку для каждого типа по usability критериям
        const bestButtons = {};
        
        Object.entries(buttonsByType).forEach(([type, buttons]) => {
            // Сортируем по usability: контраст, размер, читаемость
            const sortedByUsability = [...buttons].sort((a, b) => {
                const scoreA = this.calculateButtonUsabilityScore(a);
                const scoreB = this.calculateButtonUsabilityScore(b);
                return scoreB - scoreA; // По убыванию
            });

            bestButtons[type] = sortedByUsability[0];
        });

        return {
            total: allButtons.length,
            found: allButtons.length > 0,
            clusters: bestButtons,
            samples: allButtons.slice(0, 10)
        };
    }

    /**
     * Расчет usability score для кнопки
     */
    calculateButtonUsabilityScore(button) {
        let score = 0;
        
        // Контраст между текстом и фоном
        if (button.styles?.backgroundColor && button.styles?.color) {
            const bgColor = this.colorConverter.parseColor(button.styles.backgroundColor);
            const textColor = this.colorConverter.parseColor(button.styles.color);
            
            if (bgColor && textColor) {
                const bgBrightness = this.colorConverter.getBrightness(bgColor.r, bgColor.g, bgColor.b);
                const textBrightness = this.colorConverter.getBrightness(textColor.r, textColor.g, textColor.b);
                const contrast = Math.abs(bgBrightness - textBrightness);
                
                if (contrast > 125) score += 3; // Хороший контраст
                else if (contrast > 50) score += 1;
            }
        }

        // Размер кнопки
        const width = button.width || 0;
        const height = button.height || 0;
        if (width >= 44 && height >= 44) score += 2; // Минимальный размер для accessibility
        if (width >= 100 && height >= 40) score += 1; // Хороший размер

        // Размер шрифта
        const fontSize = parseFloat(button.styles?.fontSize) || 0;
        if (fontSize >= 14) score += 1; // Читаемый размер
        if (fontSize >= 16) score += 1; // Оптимальный размер

        // Скругление углов (умеренное лучше для usability)
        const borderRadius = button.styles?.borderRadius;
        if (borderRadius) {
            const radiusValue = parseFloat(borderRadius) || 0;
            if (radiusValue >= 4 && radiusValue <= 8) score += 1;
        }

        return score;
    }

    getRoleName(role) {
        const roleNames = {
            background: 'Фон',
            text: 'Текст',
            primary: 'Основной',
            accent: 'Акцентный',
            secondary: 'Вторичный',
            surface: 'Поверхность'
        };
        return roleNames[role] || role;
    }
}

module.exports = MultiSiteMerger;