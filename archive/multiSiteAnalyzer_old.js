// modules/multiSiteAnalyzer.js
const analyzeDesignSystem = require('../modules/analyzer');

class MultiSiteAnalyzer {
    constructor() {
        this.strategies = {
            dominant: this.dominantStrategy.bind(this),
            average: this.averageStrategy.bind(this),
            weighted: this.weightedStrategy.bind(this)
        };
    }

    /**
     * Анализ нескольких сайтов с объединением результатов
     */
    async analyzeMultipleSites(urls, options = {}) {
        console.log(`🌐 Starting multi-site analysis of ${urls.length} sites`);
        
        if (!urls || urls.length === 0) {
            throw new Error('At least one URL is required');
        }

        if (urls.length === 1) {
            console.log('⚠️ Single site analysis, returning single result');
            return await analyzeDesignSystem(urls[0]);
        }

        const strategy = options.strategy || 'dominant';
        const weights = options.weights || Array(urls.length).fill(1);
        
        // Анализируем каждый сайт
        const analyses = [];
        for (let i = 0; i < urls.length; i++) {
            try {
                console.log(`📊 Analyzing site ${i + 1}/${urls.length}: ${urls[i]}`);
                const analysis = await analyzeDesignSystem(urls[i]);
                analyses.push({
                    data: analysis,
                    weight: weights[i] || 1
                });
            } catch (error) {
                console.error(`❌ Failed to analyze ${urls[i]}:`, error.message);
                // Продолжаем с другими сайтами
            }
        }

        if (analyses.length === 0) {
            throw new Error('All analyses failed');
        }

        // Объединяем результаты
        const merged = this.mergeAnalyses(analyses, strategy);
        
        console.log(`✅ Multi-site analysis completed. Merged ${analyses.length} sites`);
        return merged;
    }

    /**
     * Объединение результатов анализа
     */
    mergeAnalyses(analyses, strategy) {
        const strategyFn = this.strategies[strategy] || this.strategies.dominant;
        return strategyFn(analyses);
    }

    /**
     * Стратегия: доминирующий стиль (берем самый частый)
     */
    dominantStrategy(analyses) {
        const primarySite = analyses.reduce((prev, current) => 
            prev.data.colors.total > current.data.colors.total ? prev : current
        );
        
        return {
            ...primarySite.data,
            sourceType: 'multi-site',
            mergedFrom: analyses.map(a => a.data.domain),
            strategy: 'dominant',
            metadata: {
                totalSites: analyses.length,
                primarySite: primarySite.data.domain,
                mergedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Стратегия: усреднение (комбинируем стили)
     */
    averageStrategy(analyses) {
        // Объединяем цвета
        const allColors = analyses.flatMap(a => 
            a.data.colors.palette.map(color => ({
                ...color,
                weight: a.weight
            }))
        );
        
        // Объединяем типографику
        const allTypography = analyses.flatMap(a => 
            a.data.typography.styles.map(style => ({
                ...style,
                weight: a.weight
            }))
        );
        
        // Объединяем кнопки
        const allButtons = analyses.map(a => ({
            buttons: a.data.buttons,
            weight: a.weight
        }));

        // Кластеризуем цвета по схожести
        const mergedColors = this.mergeColorPalettes(allColors);
        const mergedTypography = this.mergeTypography(allTypography);
        const mergedButtons = this.mergeButtons(allButtons);

        return {
            url: analyses.map(a => a.data.url).join(', '),
            domain: 'merged-multi-site',
            colors: {
                palette: mergedColors,
                total: mergedColors.length,
                source: 'merged'
            },
            typography: {
                styles: mergedTypography,
                total: mergedTypography.length
            },
            buttons: mergedButtons,
            sourceType: 'multi-site',
            mergedFrom: analyses.map(a => a.data.domain),
            strategy: 'average',
            timestamp: new Date().toISOString(),
            analysisVersion: 'multi-v1'
        };
    }

    /**
     * Стратегия: взвешенное объединение
     */
    weightedStrategy(analyses) {
        // Реализация с учетом весов
        return this.averageStrategy(analyses);
    }

    /**
     * Объединение цветовых палитр
     */
    mergeColorPalettes(colorObjects) {
        // Группируем цвета по ролям
        const colorsByRole = {};
        
        colorObjects.forEach(colorObj => {
            const role = colorObj.role || 'unassigned';
            if (!colorsByRole[role]) {
                colorsByRole[role] = [];
            }
            colorsByRole[role].push(colorObj);
        });

        // Для каждой роли выбираем наиболее частый цвет
        const mergedPalette = [];
        
        Object.entries(colorsByRole).forEach(([role, colors]) => {
            if (colors.length === 0) return;
            
            // Простая эвристика: берем самый насыщенный/яркий
            const sorted = [...colors].sort((a, b) => {
                const scoreA = (a.saturation || 0) + (a.brightness || 0);
                const scoreB = (b.saturation || 0) + (b.brightness || 0);
                return scoreB - scoreA;
            });
            
            const selectedColor = sorted[0];
            mergedPalette.push({
                ...selectedColor,
                role: role,
                roleName: selectedColor.roleName || role,
                count: colors.length, // Сколько сайтов используют этот цвет
                sources: colors.map(c => ({ 
                    hex: c.hex, 
                    weight: c.weight,
                    brightness: c.brightness 
                }))
            });
        });

        // Ограничиваем палитру 8 цветами
        return mergedPalette.slice(0, 8).map((color, index) => ({
            ...color,
            priority: index + 1
        }));
    }

    /**
     * Объединение типографики
     */
    mergeTypography(typographyObjects) {
        // Группируем по тегам
        const byTag = {};
        
        typographyObjects.forEach(style => {
            const tag = style.tag?.toLowerCase() || 'unknown';
            if (!byTag[tag]) {
                byTag[tag] = [];
            }
            byTag[tag].push(style);
        });

        // Для каждого тега выбираем наиболее частый стиль
        const mergedStyles = [];
        
        Object.entries(byTag).forEach(([tag, styles]) => {
            if (styles.length === 0) return;
            
            // Группируем по семейству шрифтов
            const fontGroups = {};
            styles.forEach(style => {
                const font = style.fontFamily || 'Arial';
                if (!fontGroups[font]) {
                    fontGroups[font] = [];
                }
                fontGroups[font].push(style);
            });
            
            // Выбираем самый частый шрифт
            let mostCommonFont = 'Arial';
            let maxCount = 0;
            Object.entries(fontGroups).forEach(([font, fontStyles]) => {
                if (fontStyles.length > maxCount) {
                    maxCount = fontStyles.length;
                    mostCommonFont = font;
                }
            });
            
            // Берем стиль с самым частым шрифтом
            const selectedStyle = fontGroups[mostCommonFont][0];
            mergedStyles.push({
                ...selectedStyle,
                tag: tag,
                frequency: styles.length, // Сколько сайтов используют этот стиль
                sources: styles.map(s => ({
                    fontFamily: s.fontFamily,
                    fontSize: s.fontSize,
                    weight: s.weight
                }))
            });
        });

        return mergedStyles;
    }

    /**
     * Объединение анализа кнопок
     */
    mergeButtons(buttonAnalyses) {
        if (buttonAnalyses.length === 0) {
            return { found: false, total: 0, clusters: {} };
        }

        // Собираем все типы кнопок
        const allClusters = {};
        
        buttonAnalyses.forEach(({ buttons, weight }) => {
            if (!buttons.clusters) return;
            
            Object.entries(buttons.clusters).forEach(([type, button]) => {
                if (button) {
                    if (!allClusters[type]) {
                        allClusters[type] = [];
                    }
                    allClusters[type].push({
                        button,
                        weight
                    });
                }
            });
        });

        // Для каждого типа выбираем лучшую кнопку
        const mergedClusters = {};
        
        Object.entries(allClusters).forEach(([type, buttons]) => {
            if (buttons.length === 0) {
                mergedClusters[type] = null;
                return;
            }
            
            // Критерии выбора:
            // 1. Высокая контрастность
            // 2. Разумный размер
            // 3. Наличие текста
            const scoredButtons = buttons.map(({ button, weight }) => {
                let score = 0;
                const styles = button.styles || {};
                
                // Контрастность
                if (styles.backgroundColor && styles.color) {
                    const bg = this.getBrightness(styles.backgroundColor);
                    const fg = this.getBrightness(styles.color);
                    const contrast = Math.abs(bg - fg);
                    score += contrast / 2.55; // Нормализуем
                }
                
                // Размер
                if (button.width && button.height) {
                    const area = button.width * button.height;
                    if (area > 1000 && area < 10000) {
                        score += 20; // Идеальный размер
                    }
                }
                
                // Наличие текста
                if (button.text && button.text.length > 0) {
                    score += 30;
                }
                
                // Вес сайта
                score *= weight;
                
                return { button, score };
            });
            
            // Выбираем кнопку с максимальным счетом
            scoredButtons.sort((a, b) => b.score - a.score);
            mergedClusters[type] = scoredButtons[0]?.button || null;
        });

        const totalButtons = buttonAnalyses.reduce((sum, { buttons }) => 
            sum + (buttons.total || 0), 0
        );

        return {
            found: totalButtons > 0,
            total: totalButtons,
            clusters: mergedClusters,
            sourceCount: buttonAnalyses.length
        };
    }

    /**
     * Вспомогательная функция для расчета яркости
     */
    getBrightness(colorStr) {
        if (!colorStr) return 128;
        
        try {
            // Простой расчет яркости из HEX/RGB
            const hexMatch = colorStr.match(/#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
            if (hexMatch) {
                const r = parseInt(hexMatch[1], 16);
                const g = parseInt(hexMatch[2], 16);
                const b = parseInt(hexMatch[3], 16);
                return (r * 299 + g * 587 + b * 114) / 1000;
            }
            
            const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);
                return (r * 299 + g * 587 + b * 114) / 1000;
            }
        } catch (e) {
            console.log('Brightness calculation error:', e);
        }
        
        return 128;
    }
}

module.exports = MultiSiteAnalyzer;