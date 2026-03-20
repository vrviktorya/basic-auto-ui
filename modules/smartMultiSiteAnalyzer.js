// modules/smartMultiSiteAnalyzer.js
const analyzeDesignSystem = require('./analyzer');
const chroma = require('chroma-js');

class SmartMultiSiteAnalyzer {
    constructor() {
        this.strategies = {
            bestPractices: this.bestPracticesStrategy.bind(this),
            commonPatterns: this.commonPatternsStrategy.bind(this),
            userPriorities: this.userPrioritiesStrategy.bind(this),
            hybrid: this.hybridStrategy.bind(this)
        };
    }

    async analyzeMultipleSites(urls, options = {}) {
        console.log(`🧠 Smart analysis of ${urls.length} sites`);

        if (!urls || urls.length === 0) {
            throw new Error('At least one URL is required');
        }

        const strategy = options.strategy || 'bestPractices';
        const weights = options.weights || Array(urls.length).fill(1);
        const preferences = options.preferences || {}; // для userPriorities

        // Анализируем каждый сайт
        const analyses = [];
        for (let i = 0; i < urls.length; i++) {
            try {
                console.log(`📊 Analyzing site ${i + 1}/${urls.length}: ${urls[i]}`);
                const analysis = await analyzeDesignSystem(urls[i]);
                analyses.push({
                    data: analysis,
                    weight: weights[i] || 1,
                    domain: new URL(urls[i]).hostname,
                    index: i
                });
            } catch (error) {
                console.error(`❌ Failed to analyze ${urls[i]}:`, error.message);
            }
        }

        if (analyses.length === 0) {
            throw new Error('All analyses failed');
        }

        // Выбираем стратегию
        const strategyFn = this.strategies[strategy] || this.strategies.bestPractices;
        const merged = strategyFn(analyses, preferences);

        console.log(`✅ Smart multi-site analysis completed (strategy: ${strategy})`);
        return merged;
    }

    // ------------------------------------------------------------
    // СТРАТЕГИЯ 1: Лучшие практики (Best Practices)
    // ------------------------------------------------------------
    bestPracticesStrategy(analyses) {
        // 1. Лучшие цвета по ролям
        const bestColors = this._selectBestColorsByRole(analyses);

        // 2. Лучшая типографика по тегам
        const bestTypography = this._selectBestTypographyByTag(analyses);

        // 3. Лучшие кнопки по типам
        const bestButtons = this._selectBestButtonsByType(analyses);

        return {
            url: analyses.map(a => a.domain).join(', '),
            domain: 'best-practices',
            colors: {
                palette: bestColors,
                total: bestColors.length,
                semantics: this._analyzeColorSemantics(bestColors)
            },
            typography: {
                styles: bestTypography.styles,
                total: bestTypography.styles.length,
                hierarchy: bestTypography.hierarchy
            },
            buttons: bestButtons,
            sourceType: 'smart-multi-site',
            mergedFrom: analyses.map(a => a.domain),
            strategy: 'bestPractices',
            timestamp: new Date().toISOString(),
            analysisVersion: 'smart-v2'
        };
    }

    // ------------------------------------------------------------
    // СТРАТЕГИЯ 2: Общие паттерны (Common Patterns)
    // ------------------------------------------------------------
    commonPatternsStrategy(analyses) {
        // 1. Ищем общие цвета (кластеризация по сайтам)
        const commonColors = this._findCommonColors(analyses);

        // 2. Ищем общие шрифты (по семейству и размеру)
        const commonTypography = this._findCommonTypography(analyses);

        // 3. Ищем общие стили кнопок
        const commonButtons = this._findCommonButtons(analyses);

        // Для недостающих ролей берём лучшие практики
        const bestPracticesResult = this.bestPracticesStrategy(analyses);

        // Дополняем
        const finalColors = this._mergeColorResults(commonColors, bestPracticesResult.colors.palette);
        const finalTypography = this._mergeTypographyResults(commonTypography, bestPracticesResult.typography);
        const finalButtons = this._mergeButtonResults(commonButtons, bestPracticesResult.buttons);

        return {
            url: analyses.map(a => a.domain).join(', '),
            domain: 'common-patterns',
            colors: {
                palette: finalColors,
                total: finalColors.length,
                semantics: this._analyzeColorSemantics(finalColors)
            },
            typography: finalTypography,
            buttons: finalButtons,
            sourceType: 'smart-multi-site',
            mergedFrom: analyses.map(a => a.domain),
            strategy: 'commonPatterns',
            timestamp: new Date().toISOString(),
            analysisVersion: 'smart-v2'
        };
    }

    // ------------------------------------------------------------
    // СТРАТЕГИЯ 3: Пользовательские приоритеты (User Priorities)
    // ------------------------------------------------------------
    userPrioritiesStrategy(analyses, preferences) {
        // preferences: { colors: index, typography: index, buttons: index }
        const defaultSource = 0;
        const colorSourceIdx = (preferences.colors !== undefined) ? preferences.colors : defaultSource;
        const typographySourceIdx = (preferences.typography !== undefined) ? preferences.typography : defaultSource;
        const buttonsSourceIdx = (preferences.buttons !== undefined) ? preferences.buttons : defaultSource;

        const colorAnalysis = analyses[colorSourceIdx] || analyses[0];
        const typographyAnalysis = analyses[typographySourceIdx] || analyses[0];
        const buttonsAnalysis = analyses[buttonsSourceIdx] || analyses[0];

        // Собираем результат из указанных источников
        const result = {
            url: analyses.map(a => a.domain).join(', '),
            domain: 'user-priorities',
            colors: { ...colorAnalysis.data.colors },
            typography: { ...typographyAnalysis.data.typography },
            buttons: { ...buttonsAnalysis.data.buttons },
            sourceType: 'smart-multi-site',
            mergedFrom: analyses.map(a => a.domain),
            preferences: { colors: colorSourceIdx, typography: typographySourceIdx, buttons: buttonsSourceIdx },
            strategy: 'userPriorities',
            timestamp: new Date().toISOString(),
            analysisVersion: 'smart-v2'
        };

        // Добавляем метаданные
        result.colors.semantics = this._analyzeColorSemantics(result.colors.palette);
        result.typography.hierarchy = this._analyzeTypographyHierarchy(result.typography.styles);

        return result;
    }

    // ------------------------------------------------------------
    // СТРАТЕГИЯ 4: Гибридная (Hybrid)
    // ------------------------------------------------------------
    hybridStrategy(analyses, preferences) {
        // preferences: { useCommonFor: ['colors', 'typography', 'buttons'] }
        const useCommonFor = preferences.useCommonFor || ['colors', 'typography', 'buttons'];

        // Получаем результаты двух базовых стратегий
        const commonResult = this.commonPatternsStrategy(analyses);
        const bestResult = this.bestPracticesStrategy(analyses);

        // Собираем гибрид
        const hybridColors = useCommonFor.includes('colors') ? commonResult.colors.palette : bestResult.colors.palette;
        const hybridTypography = useCommonFor.includes('typography') ? commonResult.typography : bestResult.typography;
        const hybridButtons = useCommonFor.includes('buttons') ? commonResult.buttons : bestResult.buttons;

        return {
            url: analyses.map(a => a.domain).join(', '),
            domain: 'hybrid',
            colors: {
                palette: hybridColors,
                total: hybridColors.length,
                semantics: this._analyzeColorSemantics(hybridColors)
            },
            typography: hybridTypography,
            buttons: hybridButtons,
            sourceType: 'smart-multi-site',
            mergedFrom: analyses.map(a => a.domain),
            preferences: { useCommonFor },
            strategy: 'hybrid',
            timestamp: new Date().toISOString(),
            analysisVersion: 'smart-v2'
        };
    }

    // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

    // ----- Лучшие практики -----
    _selectBestColorsByRole(analyses) {
        const roles = ['primary', 'accent', 'background', 'text', 'surface', 'secondary'];
        const bestColors = [];

        roles.forEach(role => {
            const candidates = analyses.flatMap(a =>
                a.data.colors.palette
                    .filter(c => c.role === role)
                    .map(c => ({ ...c, weight: a.weight, source: a.domain }))
            );

            if (candidates.length === 0) {
                // Если нет точной роли, ищем подходящие по характеристикам
                const fallback = this._findFallbackColorForRole(analyses, role);
                if (fallback) candidates.push(fallback);
            }

            if (candidates.length > 0) {
                const best = this._pickBestColorByRole(candidates, role);
                bestColors.push(best);
            }
        });

        // Дополнительные цвета (не вошедшие в основные роли)
        const extras = this._extractAdditionalColors(analyses, bestColors);
        return [...bestColors, ...extras].slice(0, 10);
    }

    _pickBestColorByRole(candidates, role) {
        // Оцениваем каждый кандидат
        const scored = candidates.map(c => {
            let score = 0;
            const sat = c.saturation || 0;
            const bright = c.brightness || 128;
            const count = c.count || 1;

            switch (role) {
                case 'primary':
                    score = sat * 0.5 + bright * 0.3 + Math.min(count, 100) * 0.2;
                    break;
                case 'accent':
                    score = sat * 0.7 + bright * 0.2 + Math.min(count, 100) * 0.1;
                    break;
                case 'background':
                    // Фон должен быть светлым
                    score = (255 - bright) * 0.6 + (sat < 30 ? 100 : 0) * 0.4;
                    break;
                case 'text':
                    // Текст должен быть тёмным
                    score = bright * 0.5 + (sat < 20 ? 100 : 0) * 0.5;
                    break;
                default:
                    score = bright * 0.5 + sat * 0.3 + Math.min(count, 100) * 0.2;
            }
            return { candidate: c, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const best = scored[0].candidate;
        return {
            ...best,
            role,
            roleName: this._getRoleName(role),
            decisionReason: `Лучший по оценке ${Math.round(scored[0].score)}`
        };
    }

    _findFallbackColorForRole(analyses, role) {
        // Ищем цвет, подходящий под роль, среди всех цветов
        const allColors = analyses.flatMap(a =>
            a.data.colors.palette.map(c => ({ ...c, weight: a.weight }))
        );

        const candidates = allColors.filter(c => {
            const bright = c.brightness || 128;
            const sat = c.saturation || 0;
            if (role === 'background') return bright > 200 && sat < 30;
            if (role === 'text') return bright < 80 && sat < 30;
            if (role === 'primary') return bright > 80 && bright < 200 && sat > 40;
            if (role === 'accent') return sat > 60;
            if (role === 'surface') return bright > 180 && bright < 240;
            if (role === 'secondary') return bright > 100 && bright < 200 && sat > 20 && sat < 60;
            return false;
        });

        if (candidates.length === 0) return null;
        // Берём первый подходящий (можно улучшить оценкой)
        return candidates[0];
    }

    _extractAdditionalColors(analyses, existing) {
        const all = analyses.flatMap(a =>
            a.data.colors.palette.map(c => ({ ...c, weight: a.weight }))
        );
        const existingHexes = new Set(existing.map(c => c.hex.toLowerCase()));
        const threshold = 0.9; // похожесть

        const additional = [];
        all.forEach(c => {
            const hex = c.hex.toLowerCase();
            if (!existingHexes.has(hex) && !additional.some(a => this._colorSimilarity(a.hex, hex) > threshold)) {
                additional.push(c);
            }
        });

        return additional.slice(0, 5);
    }

    _selectBestTypographyByTag(analyses) {
        const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'body'];
        const styles = [];
        const hierarchy = {};

        tags.forEach(tag => {
            const candidates = analyses.flatMap(a =>
                (a.data.typography.styles || [])
                    .filter(s => s.tag === tag)
                    .map(s => ({ ...s, weight: a.weight, source: a.domain }))
            );

            if (candidates.length > 0) {
                const best = this._pickBestTypography(candidates, tag);
                styles.push(best);
                hierarchy[tag] = {
                    fontSize: best.fontSize,
                    fontWeight: best.fontWeight,
                    source: best.source
                };
            } else if (tag === 'body') {
                // Создаём body из наиболее частого шрифта
                const bodyFont = this._determineBaseFont(analyses);
                if (bodyFont) {
                    styles.push({
                        tag: 'body',
                        fontFamily: bodyFont.fontFamily,
                        fontSize: bodyFont.fontSize || '16px',
                        fontWeight: bodyFont.fontWeight || '400',
                        lineHeight: bodyFont.lineHeight || '1.5',
                        source: 'synthesized'
                    });
                }
            }
        });

        return { styles, hierarchy };
    }

    _pickBestTypography(candidates, tag) {
        const scored = candidates.map(c => {
            let score = 0;
            const size = parseFloat(c.fontSize) || 0;
            const weight = parseInt(c.fontWeight) || 400;

            if (tag.startsWith('h')) {
                const level = parseInt(tag[1]);
                const idealSize = 48 - level * 6; // примерная прогрессия
                const sizeDiff = Math.abs(size - idealSize);
                score += Math.max(0, 50 - sizeDiff);
                if (weight >= 600) score += 30;
            } else if (tag === 'p' || tag === 'body') {
                if (size >= 14 && size <= 18) score += 40;
                if (weight === 400) score += 30;
                const lh = parseFloat(c.lineHeight);
                if (lh >= 1.4 && lh <= 1.6) score += 20;
            } else if (tag === 'button') {
                if (size >= 14 && size <= 18) score += 30;
                if (weight >= 500 && weight <= 600) score += 40;
            } else if (tag === 'a') {
                if (size >= 14 && size <= 16) score += 30;
                if (c.textDecoration && c.textDecoration.includes('underline')) score += 40;
            }

            score *= (c.weight || 1);
            return { candidate: c, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].candidate;
    }

    _determineBaseFont(analyses) {
        const candidates = analyses.flatMap(a =>
            (a.data.typography.styles || [])
                .filter(s => ['body', 'p', 'div', 'span'].includes(s.tag))
                .map(s => ({ ...s, weight: a.weight }))
        );
        if (candidates.length === 0) return null;

        const groups = {};
        candidates.forEach(c => {
            const family = c.fontFamily || 'system-ui';
            if (!groups[family]) groups[family] = [];
            groups[family].push(c);
        });

        let bestFamily = null;
        let maxWeight = 0;
        Object.entries(groups).forEach(([family, list]) => {
            const totalWeight = list.reduce((sum, c) => sum + (c.weight || 1), 0);
            if (totalWeight > maxWeight) {
                maxWeight = totalWeight;
                bestFamily = list[0];
            }
        });
        return bestFamily;
    }

    _selectBestButtonsByType(analyses) {
        const types = ['primary', 'secondary', 'outline', 'text', 'danger', 'success'];
        const clusters = {};
        let total = 0;

        types.forEach(type => {
            const candidates = analyses.flatMap(a => {
                const btn = a.data.buttons?.clusters?.[type];
                if (btn) return [{ ...btn, weight: a.weight, source: a.domain }];
                return [];
            });

            if (candidates.length > 0) {
                const best = this._pickBestButton(candidates, type);
                clusters[type] = best;
                total += candidates.length;
            } else {
                clusters[type] = null;
            }
        });

        return {
            found: total > 0,
            total,
            clusters,
            semantics: this._analyzeButtonSemantics(clusters)
        };
    }

    _pickBestButton(candidates, type) {
        const scored = candidates.map(b => {
            let score = this._evaluateButton(b, type);
            score *= (b.weight || 1);
            return { candidate: b, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0].candidate;
        best.decisionReason = `Лучшая ${type} кнопка (оценка ${Math.round(scored[0].score)})`;
        return best;
    }

    _evaluateButton(button, type) {
        const styles = button.styles || {};
        let score = 0;

        // Контраст
        if (styles.backgroundColor && styles.color) {
            try {
                const contrast = chroma.contrast(styles.backgroundColor, styles.color);
                score += Math.min(contrast * 10, 50);
            } catch { }
        }

        // Размер
        const width = button.width || 0;
        const height = button.height || 0;
        const area = width * height;
        if (area >= 2000 && area <= 8000) score += 30;
        else if (area >= 1000) score += 15;

        // Текст
        if (button.text) score += 20;

        // Специфика типа
        if (type === 'primary' && styles.backgroundColor) score += 20;
        if (type === 'outline' && styles.borderWidth && styles.borderWidth !== '0px') score += 30;
        if (type === 'text' && (!styles.backgroundColor || styles.backgroundColor === 'transparent')) score += 30;

        return Math.min(score, 100);
    }

    // ----- Общие паттерны -----
    _findCommonColors(analyses) {
        // Собираем все цвета с их источниками
        const allColors = analyses.flatMap(a =>
            a.data.colors.palette.map(c => ({
                ...c,
                sourceIdx: a.index,
                sourceDomain: a.domain
            }))
        );

        // Кластеризуем по схожести
        const clusters = this._clusterSimilarColors(allColors, 0.15);
        const commonClusters = clusters.filter(cluster => {
            const uniqueSources = new Set(cluster.map(c => c.sourceIdx));
            return uniqueSources.size >= 2; // встречается минимум в двух сайтах
        });

        // Для каждой роли пытаемся найти подходящий кластер
        const roles = ['primary', 'accent', 'background', 'text', 'surface'];
        const commonColors = [];

        roles.forEach(role => {
            // Ищем кластер, где большинство цветов имеют эту роль или подходят по характеристикам
            let bestCluster = null;
            let bestScore = -1;

            commonClusters.forEach((cluster, idx) => {
                const roleCount = cluster.filter(c => c.role === role).length;
                // Оцениваем по соответствию роли и размеру кластера
                const score = roleCount * 2 + cluster.length;
                if (score > bestScore) {
                    bestScore = score;
                    bestCluster = cluster;
                }
            });

            if (bestCluster) {
                const representative = this._findRepresentativeColor(bestCluster);
                representative.role = role;
                representative.roleName = this._getRoleName(role);
                representative.decisionReason = `Общий паттерн (встречается в ${bestCluster.length} цветах из ${new Set(bestCluster.map(c => c.sourceIdx)).size} сайтов)`;
                commonColors.push(representative);
            }
        });

        return commonColors;
    }

    _findCommonTypography(analyses) {
        const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button'];
        const commonStyles = [];
        const hierarchy = {};

        tags.forEach(tag => {
            // Собираем все стили этого тега со всех сайтов
            const allStyles = analyses.flatMap(a =>
                (a.data.typography.styles || [])
                    .filter(s => s.tag === tag)
                    .map(s => ({ ...s, sourceIdx: a.index, sourceDomain: a.domain }))
            );

            // Группируем по семейству шрифта (с учётом синонимов)
            const groups = {};
            allStyles.forEach(s => {
                const family = this._normalizeFontFamily(s.fontFamily);
                if (!groups[family]) groups[family] = [];
                groups[family].push(s);
            });

            // Ищем семейство, которое встречается в нескольких сайтах
            let commonFamily = null;
            let maxSites = 1;
            Object.entries(groups).forEach(([family, styles]) => {
                const sites = new Set(styles.map(s => s.sourceIdx)).size;
                if (sites > maxSites) {
                    maxSites = sites;
                    commonFamily = family;
                }
            });

            if (commonFamily && maxSites >= 2) {
                // Берём первый стиль из этого семейства (можно усреднить размер)
                const representative = groups[commonFamily][0];
                commonStyles.push(representative);
                hierarchy[tag] = {
                    fontSize: representative.fontSize,
                    fontWeight: representative.fontWeight,
                    source: 'common'
                };
            }
        });

        return { styles: commonStyles, hierarchy };
    }

    _findCommonButtons(analyses) {
        const types = ['primary', 'secondary', 'outline', 'text'];
        const clusters = {};
        let total = 0;

        types.forEach(type => {
            const allButtons = analyses.flatMap(a => {
                const btn = a.data.buttons?.clusters?.[type];
                if (btn) return [{ ...btn, sourceIdx: a.index, sourceDomain: a.domain }];
                return [];
            });

            if (allButtons.length === 0) {
                clusters[type] = null;
                return;
            }

            // Группируем похожие кнопки по стилям
            const groups = [];
            allButtons.forEach(btn => {
                let found = false;
                for (let group of groups) {
                    if (this._buttonsSimilar(btn, group[0])) {
                        group.push(btn);
                        found = true;
                        break;
                    }
                }
                if (!found) groups.push([btn]);
            });

            // Ищем группу с элементами из разных сайтов
            let bestGroup = null;
            let maxSites = 1;
            groups.forEach(group => {
                const sites = new Set(group.map(b => b.sourceIdx)).size;
                if (sites > maxSites) {
                    maxSites = sites;
                    bestGroup = group;
                }
            });

            if (bestGroup && maxSites >= 2) {
                const representative = bestGroup[0]; // берём первый
                clusters[type] = representative;
                total++;
            } else {
                clusters[type] = null;
            }
        });

        return {
            found: total > 0,
            total,
            clusters,
            semantics: this._analyzeButtonSemantics(clusters)
        };
    }

    _buttonsSimilar(btn1, btn2) {
        const s1 = btn1.styles || {};
        const s2 = btn2.styles || {};
        // Сравниваем основные свойства
        if (s1.backgroundColor !== s2.backgroundColor) return false;
        if (s1.color !== s2.color) return false;
        if (s1.borderWidth !== s2.borderWidth) return false;
        if (s1.borderRadius !== s2.borderRadius) return false;
        return true;
    }

    // ----- Слияние результатов -----
    _mergeColorResults(common, best) {
        const commonMap = new Map(common.map(c => [c.role, c]));
        const merged = [];

        // Сначала добавляем все общие
        common.forEach(c => merged.push(c));

        // Затем добавляем недостающие роли из лучших
        best.forEach(b => {
            if (!commonMap.has(b.role)) {
                merged.push(b);
            }
        });

        // Ограничиваем до 10 цветов
        return merged.slice(0, 10);
    }

    _mergeTypographyResults(common, bestTyp) {
        const commonMap = new Map(common.styles.map(s => [s.tag, s]));
        const mergedStyles = [];

        // Общие
        common.styles.forEach(s => mergedStyles.push(s));

        // Недостающие из лучших
        bestTyp.styles.forEach(s => {
            if (!commonMap.has(s.tag)) {
                mergedStyles.push(s);
            }
        });

        return {
            styles: mergedStyles,
            total: mergedStyles.length,
            hierarchy: bestTyp.hierarchy // можно перестроить, но пока так
        };
    }

    _mergeButtonResults(common, bestBtns) {
        const commonClusters = common.clusters;
        const bestClusters = bestBtns.clusters;
        const merged = {};

        Object.keys(bestClusters).forEach(type => {
            if (commonClusters[type]) {
                merged[type] = commonClusters[type];
            } else {
                merged[type] = bestClusters[type];
            }
        });

        return {
            found: Object.values(merged).some(v => v !== null),
            total: Object.values(merged).filter(v => v !== null).length,
            clusters: merged,
            semantics: this._analyzeButtonSemantics(merged)
        };
    }

    // ----- Анализ семантики -----
    _analyzeColorSemantics(palette) {
        const semantics = {
            hasPrimary: false,
            hasAccent: false,
            hasGoodContrast: false,
            colorHarmony: 'unknown',
            themeType: 'light',
            recommendations: []
        };

        const primary = palette.find(c => c.role === 'primary');
        const accent = palette.find(c => c.role === 'accent');
        const background = palette.find(c => c.role === 'background');
        const text = palette.find(c => c.role === 'text');

        semantics.hasPrimary = !!primary;
        semantics.hasAccent = !!accent;

        if (background && text) {
            try {
                const contrast = chroma.contrast(background.hex, text.hex);
                semantics.hasGoodContrast = contrast >= 4.5;
                semantics.contrastRatio = contrast.toFixed(2);
            } catch { }
        }

        const avgBright = palette.reduce((sum, c) => sum + (c.brightness || 0), 0) / palette.length;
        semantics.themeType = avgBright > 128 ? 'light' : 'dark';

        return semantics;
    }

    _analyzeTypographyHierarchy(styles) {
        const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        const foundSizes = [];
        headings.forEach(level => {
            const s = styles.find(st => st.tag === level);
            if (s) foundSizes.push(parseFloat(s.fontSize) || 0);
        });

        let isMonotonic = true;
        for (let i = 1; i < foundSizes.length; i++) {
            if (foundSizes[i] >= foundSizes[i - 1]) {
                isMonotonic = false;
                break;
            }
        }

        return {
            hasClearHierarchy: isMonotonic && foundSizes.length >= 3,
            levelCount: foundSizes.length,
            fontSizeProgression: foundSizes,
            recommendations: []
        };
    }

    _analyzeButtonSemantics(clusters) {
        const semantics = {
            hasPrimary: !!clusters.primary,
            hasSecondary: !!clusters.secondary,
            hasOutline: !!clusters.outline,
            hasText: !!clusters.text,
            totalTypes: Object.values(clusters).filter(Boolean).length,
            recommendations: []
        };
        if (clusters.primary && clusters.primary.styles) {
            try {
                const contrast = chroma.contrast(clusters.primary.styles.backgroundColor, clusters.primary.styles.color);
                if (contrast < 4.5) semantics.recommendations.push('Улучшить контраст primary кнопки');
                semantics.primaryContrast = contrast.toFixed(2);
            } catch { }
        }
        return semantics;
    }

    // ----- Утилиты -----
    _clusterSimilarColors(colors, threshold = 0.15) {
        const clusters = [];
        const used = new Set();

        colors.forEach((color, idx) => {
            if (used.has(idx)) return;
            const cluster = [color];
            used.add(idx);

            colors.forEach((other, otherIdx) => {
                if (used.has(otherIdx)) return;
                const sim = this._colorSimilarity(color.hex, other.hex);
                if (sim > (1 - threshold)) {
                    cluster.push(other);
                    used.add(otherIdx);
                }
            });

            clusters.push(cluster);
        });

        return clusters;
    }

    _colorSimilarity(hex1, hex2) {
        try {
            const lab1 = chroma(hex1).lab();
            const lab2 = chroma(hex2).lab();
            const dL = lab1[0] - lab2[0];
            const dA = lab1[1] - lab2[1];
            const dB = lab1[2] - lab2[2];
            const dist = Math.sqrt(dL * dL + dA * dA + dB * dB);
            return Math.max(0, 1 - dist / 100);
        } catch {
            return 0;
        }
    }

    _findRepresentativeColor(cluster) {
        if (cluster.length === 1) return cluster[0];
        // Усреднение в LAB
        let sumL = 0, sumA = 0, sumB = 0, totalWeight = 0;
        cluster.forEach(c => {
            try {
                const lab = chroma(c.hex).lab();
                const w = c.weight || 1;
                sumL += lab[0] * w;
                sumA += lab[1] * w;
                sumB += lab[2] * w;
                totalWeight += w;
            } catch { }
        });
        const avgL = sumL / totalWeight;
        const avgA = sumA / totalWeight;
        const avgB = sumB / totalWeight;
        const avgHex = chroma.lab(avgL, avgA, avgB).hex();

        // Берём ближайший реальный цвет для сохранения остальных полей
        let closest = cluster[0];
        let minDist = Infinity;
        cluster.forEach(c => {
            const d = this._colorDistance(avgHex, c.hex);
            if (d < minDist) {
                minDist = d;
                closest = c;
            }
        });

        return {
            ...closest,
            hex: avgHex,
            rgb: chroma(avgHex).rgb().join(', '),
            brightness: chroma(avgHex).luminance() * 100,
            saturation: chroma(avgHex).get('hsl.s') * 100
        };
    }

    _colorDistance(hex1, hex2) {
        const lab1 = chroma(hex1).lab();
        const lab2 = chroma(hex2).lab();
        const dL = lab1[0] - lab2[0];
        const dA = lab1[1] - lab2[1];
        const dB = lab1[2] - lab2[2];
        return Math.sqrt(dL * dL + dA * dA + dB * dB);
    }

    _normalizeFontFamily(fontFamily) {
        if (!fontFamily) return 'system-ui';
        return fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    }

    _getRoleName(role) {
        const names = {
            primary: 'Основной',
            accent: 'Акцентный',
            background: 'Фон',
            text: 'Текст',
            surface: 'Поверхность',
            secondary: 'Вторичный'
        };
        return names[role] || role;
    }
}

module.exports = SmartMultiSiteAnalyzer;