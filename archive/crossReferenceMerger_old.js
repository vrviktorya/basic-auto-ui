// modules/crossReferenceMerger.js
const ColorConverter = require('../modules/colors/utils/colorConverter');

class CrossReferenceMerger {
    constructor() {
        this.colorConverter = new ColorConverter();
    }

    mergeDesignSystems(analyses, strategy = 'dominant', weights = []) {
        console.log(`🔄 Merging ${analyses.length} design systems with strategy: ${strategy}`);
        
        // Если вес не задан, распределяем равномерно
        if (weights.length === 0) {
            weights = analyses.map(() => 1 / analyses.length);
        }
        
        const merged = {
            colors: this.mergeColors(analyses, strategy, weights),
            typography: this.mergeTypography(analyses, strategy, weights),
            buttons: this.mergeButtons(analyses, strategy, weights),
            url: 'Cross-reference merged',
            domain: 'mixed-design-system',
            timestamp: new Date().toISOString(),
            analysisVersion: 'cross-reference-v1'
        };
        
        return merged;
    }

    mergeColors(analyses, strategy, weights) {
        console.log('🎨 Merging colors from multiple sites...');
        
        // Собираем все цвета со всех сайтов
        const allColors = [];
        const colorGroups = {
            background: [], text: [], primary: [], 
            accent: [], secondary: [], surface: []
        };
        
        analyses.forEach((analysis, index) => {
            if (analysis.colors && analysis.colors.palette) {
                analysis.colors.palette.forEach(color => {
                    if (color.role && colorGroups[color.role]) {
                        // Добавляем с учетом веса сайта
                        for (let i = 0; i < Math.ceil(weights[index] * 10); i++) {
                            colorGroups[color.role].push({
                                ...color,
                                sourceWeight: weights[index]
                            });
                        }
                    }
                });
            }
        });
        
        // Применяем стратегию для каждой роли
        const mergedPalette = [];
        
        Object.entries(colorGroups).forEach(([role, colors]) => {
            if (colors.length > 0) {
                let selectedColor;
                
                switch(strategy) {
                    case 'dominant':
                        // Выбираем самый частый цвет
                        selectedColor = this.getMostFrequentColor(colors);
                        break;
                    case 'average':
                        // Усредняем цвета
                        selectedColor = this.averageColors(colors, role);
                        break;
                    case 'weighted':
                        // Взвешенное усреднение
                        selectedColor = this.weightedAverageColors(colors, role);
                        break;
                    default:
                        selectedColor = colors[0];
                }
                
                mergedPalette.push({
                    ...selectedColor,
                    role: role,
                    roleName: this.getRoleName(role),
                    source: 'merged'
                });
            }
        });
        
        return {
            palette: mergedPalette,
            total: mergedPalette.length,
            semantics: this.analyzeMergedSemantics(mergedPalette)
        };
    }

    mergeTypography(analyses, strategy, weights) {
        console.log('📝 Merging typography from multiple sites...');
        
        // Группируем стили по тегам
        const styleGroups = {
            h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
            p: [], a: [], button: [], body: []
        };
        
        analyses.forEach((analysis, index) => {
            if (analysis.typography && analysis.typography.styles) {
                // Нормализуем типографику для каждого сайта
                const normalizer = new (require('../modules/synthesis/siteSynthesizer'))();
                const normalized = normalizer.normalizeTypography(analysis.typography.styles);
                
                Object.entries(normalized).forEach(([tag, style]) => {
                    if (style && styleGroups[tag]) {
                        styleGroups[tag].push({
                            ...style,
                            sourceWeight: weights[index]
                        });
                    }
                });
            }
        });
        
        // Выбираем лучший стиль для каждого тега
        const mergedStyles = {};
        
        Object.entries(styleGroups).forEach(([tag, styles]) => {
            if (styles.length > 0) {
                switch(strategy) {
                    case 'dominant':
                        // Выбираем самый частый шрифт и усредняем размер
                        mergedStyles[tag] = this.getDominantTypography(styles, tag);
                        break;
                    case 'average':
                        // Усредняем все параметры
                        mergedStyles[tag] = this.averageTypography(styles, tag);
                        break;
                    case 'weighted':
                        // Взвешенное усреднение
                        mergedStyles[tag] = this.weightedAverageTypography(styles, tag);
                        break;
                }
            }
        });
        
        // Если нет body, создаем из параграфа
        if (!mergedStyles.body && mergedStyles.p) {
            mergedStyles.body = { ...mergedStyles.p };
        }
        
        return {
            total: Object.keys(mergedStyles).length,
            styles: this.convertToTypographyArray(mergedStyles)
        };
    }

    mergeButtons(analyses, strategy, weights) {
        console.log('🔄 Merging buttons from multiple sites...');
        
        // Собираем все кнопки по типам
        const buttonGroups = {
            primary: [], secondary: [], outline: [], 
            text: [], danger: [], success: [], warning: [], info: [], icon: []
        };
        
        analyses.forEach((analysis, index) => {
            if (analysis.buttons && analysis.buttons.clusters) {
                Object.entries(analysis.buttons.clusters).forEach(([type, button]) => {
                    if (button && buttonGroups[type]) {
                        buttonGroups[type].push({
                            ...button,
                            sourceWeight: weights[index]
                        });
                    }
                });
            }
        });
        
        // Выбираем лучшие кнопки по usability
        const mergedClusters = {};
        let totalButtons = 0;
        
        Object.entries(buttonGroups).forEach(([type, buttons]) => {
            if (buttons.length > 0) {
                const bestButton = this.selectBestButton(buttons, type, strategy);
                if (bestButton) {
                    mergedClusters[type] = bestButton;
                    totalButtons++;
                }
            }
        });
        
        // Берем примеры из всех сайтов
        const allSamples = [];
        analyses.forEach(analysis => {
            if (analysis.buttons && analysis.buttons.samples) {
                allSamples.push(...analysis.buttons.samples.slice(0, 2));
            }
        });
        
        return {
            total: totalButtons,
            found: totalButtons > 0,
            clusters: mergedClusters,
            samples: allSamples.slice(0, 5)
        };
    }

    // Вспомогательные методы для цветов
    getMostFrequentColor(colors) {
        const frequency = {};
        colors.forEach(color => {
            const key = color.hex;
            frequency[key] = (frequency[key] || 0) + 1;
        });
        
        let maxFreq = 0;
        let mostFrequent = colors[0];
        
        Object.entries(frequency).forEach(([hex, freq]) => {
            if (freq > maxFreq) {
                maxFreq = freq;
                mostFrequent = colors.find(c => c.hex === hex);
            }
        });
        
        return mostFrequent;
    }

    averageColors(colors, role) {
        if (colors.length === 0) return null;
        
        // Для ярких ролей (акцентных) выбираем самый насыщенный
        if (role === 'accent' || role === 'primary') {
            return colors.reduce((max, color) => 
                color.saturation > max.saturation ? color : max
            );
        }
        
        // Для фоновых ролей усредняем
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        
        colors.forEach(color => {
            const rgb = this.colorConverter.parseColor(color.hex);
            if (rgb) {
                totalR += rgb.r;
                totalG += rgb.g;
                totalB += rgb.b;
                count++;
            }
        });
        
        if (count === 0) return colors[0];
        
        const avgR = Math.round(totalR / count);
        const avgG = Math.round(totalG / count);
        const avgB = Math.round(totalB / count);
        
        return {
            hex: this.colorConverter.rgbToHex(avgR, avgG, avgB),
            rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
            brightness: this.colorConverter.getBrightness(avgR, avgG, avgB),
            saturation: this.colorConverter.getSaturation(avgR, avgG, avgB),
            count: colors.length
        };
    }

    // Вспомогательные методы для типографики
    getDominantTypography(styles, tag) {
        // Находим самый частый шрифт
        const fontFrequency = {};
        styles.forEach(style => {
            if (style.fontFamily) {
                fontFrequency[style.fontFamily] = (fontFrequency[style.fontFamily] || 0) + 1;
            }
        });
        
        let dominantFont = 'Arial, sans-serif';
        let maxFreq = 0;
        Object.entries(fontFrequency).forEach(([font, freq]) => {
            if (freq > maxFreq) {
                maxFreq = freq;
                dominantFont = font;
            }
        });
        
        // Усредняем размер и вес
        const avgFontSize = this.averageFontSize(styles);
        const avgFontWeight = this.averageFontWeight(styles);
        
        return {
            fontFamily: dominantFont,
            fontSize: avgFontSize,
            fontWeight: avgFontWeight,
            lineHeight: '1.5',
            letterSpacing: 'normal',
            textTransform: 'none'
        };
    }

    averageFontSize(styles) {
        let total = 0;
        let count = 0;
        
        styles.forEach(style => {
            const size = parseFloat(style.fontSize);
            if (!isNaN(size)) {
                total += size;
                count++;
            }
        });
        
        return count > 0 ? `${Math.round(total / count)}px` : '16px';
    }

    // Вспомогательные методы для кнопок
    selectBestButton(buttons, type, strategy) {
        // Оценка кнопок по usability
        const scoredButtons = buttons.map(button => ({
            button,
            score: this.calculateButtonUsabilityScore(button, type)
        }));
        
        // Сортируем по убыванию оценки
        scoredButtons.sort((a, b) => b.score - a.score);
        
        // Выбираем лучшую в зависимости от стратегии
        if (strategy === 'dominant') {
            return scoredButtons[0]?.button || null;
        } else {
            // Для average/weighted усредняем стили
            return this.averageButtonStyles(buttons);
        }
    }

    calculateButtonUsabilityScore(button, type) {
        let score = 0;
        const styles = button.styles || {};
        
        // Контраст текста и фона
        if (styles.backgroundColor && styles.color) {
            const bg = this.colorConverter.parseColor(styles.backgroundColor);
            const fg = this.colorConverter.parseColor(styles.color);
            
            if (bg && fg) {
                const contrast = Math.abs(
                    this.colorConverter.getBrightness(bg.r, bg.g, bg.b) -
                    this.colorConverter.getBrightness(fg.r, fg.g, fg.b)
                );
                if (contrast > 100) score += 3; // Хороший контраст
            }
        }
        
        // Адекватный размер
        const width = button.width || 0;
        const height = button.height || 0;
        if (width >= 100 && width <= 300) score += 2;
        if (height >= 40 && height <= 60) score += 2;
        
        // Скругления (лучше иметь скругления)
        if (styles.borderRadius && styles.borderRadius !== '0px') {
            score += 1;
        }
        
        // Наличие текста
        if (button.text && button.text.trim().length > 0) {
            score += 2;
        }
        
        // Семантика цвета для типа
        if (styles.backgroundColor) {
            const rgb = this.colorConverter.parseColor(styles.backgroundColor);
            if (rgb) {
                const hsl = this.colorConverter.rgbToHsl(rgb.r, rgb.g, rgb.b);
                
                // Акцентные цвета для primary кнопок
                if (type === 'primary' && hsl.s > 0.5) {
                    score += 2;
                }
                
                // Нейтральные цвета для secondary
                if (type === 'secondary' && hsl.s < 0.3) {
                    score += 1;
                }
            }
        }
        
        return score;
    }

    averageButtonStyles(buttons) {
        // Упрощенное усреднение стилей кнопок
        if (buttons.length === 0) return null;
        
        const firstButton = buttons[0];
        return {
            ...firstButton,
            styles: firstButton.styles
        };
    }

    getRoleName(role) {
        const names = {
            background: 'Фон',
            text: 'Текст',
            primary: 'Основной',
            accent: 'Акцентный',
            secondary: 'Вторичный',
            surface: 'Поверхность'
        };
        return names[role] || role;
    }

    analyzeMergedSemantics(palette) {
        const semantics = {
            hasGoodContrast: false,
            colorCount: palette.length,
            primaryColor: null,
            accentColor: null,
            isDarkTheme: false
        };

        const background = palette.find(c => c.role === 'background');
        const text = palette.find(c => c.role === 'text');
        const primary = palette.find(c => c.role === 'primary');
        const accent = palette.find(c => c.role === 'accent');

        if (background && text) {
            semantics.hasGoodContrast = Math.abs(background.brightness - text.brightness) > 50;
        }

        if (primary) semantics.primaryColor = primary.hex;
        if (accent) semantics.accentColor = accent.hex;

        semantics.isDarkTheme = palette.reduce((sum, color) => sum + color.brightness, 0) / palette.length < 128;

        return semantics;
    }

    convertToTypographyArray(mergedStyles) {
        return Object.entries(mergedStyles).map(([tag, style]) => ({
            tag: tag,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
            example: 'Пример текста'
        }));
    }
}

module.exports = CrossReferenceMerger;