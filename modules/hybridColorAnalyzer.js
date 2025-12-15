const ColorConverter = require('./colorConverter');

class HybridColorAnalyzer {
    constructor() {
        this.converter = new ColorConverter();
        this.colorRoles = {
            background: 'Фон',
            text: 'Текст', 
            primary: 'Основной',
            accent: 'Акцентный',
            secondary: 'Вторичный',
            surface: 'Поверхность',
            border: 'Граница'
        };
        
        // Параметры гибридной кластеризации
        this.config = {
            hueThreshold: 15, // Порог группировки по оттенку (0-360)
            saturationThreshold: 0.15, // Порог по насыщенности (0-1)
            lightnessThreshold: 0.15, // Порог по светлоте (0-1)
            rgbDistanceThreshold: 30, // Порог расстояния в RGB (0-442)
            minClusterSize: 2, // Минимальный размер кластера
            saturationWeight: 0.6, // Вес насыщенности в комбинированном весе
            frequencyWeight: 0.4 // Вес частоты в комбинированном весе
        };
    }

    /**
     * Основной метод анализа цветов
     */
    async analyzeColors(colorStrings, options = {}) {
        console.log(`🎨 Hybrid analysis: processing ${colorStrings.length} colors`);
        
        try {
            // 1. Парсим и фильтруем цвета
            const parsedColors = this.parseAndFilterColors(colorStrings);
            if (parsedColors.length === 0) {
                return this.getEmptyResult();
            }

            // 2. Предварительная группировка в HSL по оттенкам
            const hslGroups = this.groupByHSLHue(parsedColors);
            console.log(`📊 HSL groups: ${hslGroups.length}`);

            // 3. Точная кластеризация внутри групп в RGB
            const rgbClusters = this.clusterWithinHSLGroups(hslGroups);
            console.log(`🔬 RGB clusters: ${rgbClusters.length}`);

            // 4. Сортировка по комбинированному весу
            const sortedClusters = this.sortByCombinedWeight(rgbClusters);

            // 5. Создание палитры
            const palette = this.createPalette(sortedClusters);
            
            // 6. Назначение семантических ролей
            const finalPalette = this.assignSemanticRoles(palette);

            return {
                palette: finalPalette,
                semantics: this.analyzeSemantics(finalPalette),
                total: colorStrings.length,
                grouped: sortedClusters.length,
                analysisMethod: 'hybrid'
            };

        } catch (error) {
            console.error('❌ Hybrid analysis error:', error);
            return this.getEmptyResult();
        }
    }

    /**
     * 1. Парсинг и фильтрация цветов
     */
    parseAndFilterColors(colorStrings) {
        const parsedColors = [];
        const seenColors = new Set();

        colorStrings.forEach(colorStr => {
            try {
                // Парсим цвет
                const rgb = this.converter.parseColor(colorStr);
                if (!rgb || rgb.a < 0.1) return; // Пропускаем прозрачные

                // Конвертируем в HEX и HSL
                const hex = this.converter.rgbToHex(rgb.r, rgb.g, rgb.b);
                const hsl = this.converter.rgbToHsl(rgb.r, rgb.g, rgb.b);

                // Создаем уникальный ключ для предотвращения дубликатов
                const colorKey = `${hex}|${hsl.h.toFixed(0)}|${hsl.s.toFixed(2)}|${hsl.l.toFixed(2)}`;
                
                if (!seenColors.has(colorKey)) {
                    seenColors.add(colorKey);
                    
                    parsedColors.push({
                        hex: hex,
                        rgb: { r: rgb.r, g: rgb.g, b: rgb.b },
                        hsl: hsl,
                        brightness: this.converter.getBrightness(rgb.r, rgb.g, rgb.b),
                        saturation: Math.round(hsl.s * 100),
                        lightness: Math.round(hsl.l * 100),
                        count: 1,
                        original: colorStr
                    });
                } else {
                    // Увеличиваем счетчик для существующего цвета
                    const existing = parsedColors.find(c => 
                        `${c.hex}|${c.hsl.h.toFixed(0)}|${c.hsl.s.toFixed(2)}|${c.hsl.l.toFixed(2)}` === colorKey
                    );
                    if (existing) existing.count++;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }
        });

        // Фильтруем системные и невидимые цвета
        return this.filterSystemColors(parsedColors);
    }

    /**
     * Фильтрация системных и невидимых цветов
     */
    filterSystemColors(colors) {
        return colors.filter(color => {
            const { hsl, brightness, saturation } = color;
            
            // Исключаем почти черные и почти белые (системные тени, границы)
            if (brightness < 10 || brightness > 245) return false;
            
            // Исключаем полностью ненасыщенные серые (кроме нужных оттенков)
            if (hsl.s < 0.05 && (hsl.l < 0.2 || hsl.l > 0.8)) return false;
            
            // Исключаем системные цвета (синие ссылки и т.д.)
            const isSystemBlue = hsl.h >= 210 && hsl.h <= 240 && hsl.s > 0.4;
            const isSystemRed = hsl.h >= 0 && hsl.h <= 20 && hsl.s > 0.7;
            
            return !(isSystemBlue || isSystemRed);
        });
    }

    /**
     * 2. Группировка по оттенкам HSL
     */
    groupByHSLHue(colors) {
        const groups = [];
        const hueGroups = {};
        
        // Сортируем по оттенку
        colors.sort((a, b) => a.hsl.h - b.hsl.h);
        
        // Группируем по оттенку с порогом
        colors.forEach(color => {
            const hue = Math.round(color.hsl.h / this.config.hueThreshold) * this.config.hueThreshold;
            
            if (!hueGroups[hue]) {
                hueGroups[hue] = [];
            }
            hueGroups[hue].push(color);
        });
        
        // Преобразуем в массив групп
        Object.keys(hueGroups).forEach(hue => {
            if (hueGroups[hue].length >= this.config.minClusterSize) {
                groups.push({
                    hue: parseInt(hue),
                    colors: hueGroups[hue]
                });
            }
        });
        
        return groups;
    }

    /**
     * 3. Кластеризация внутри HSL групп в RGB пространстве
     */
    clusterWithinHSLGroups(hslGroups) {
        const allClusters = [];
        
        hslGroups.forEach(group => {
            const colors = group.colors;
            
            if (colors.length <= 2) {
                // Маленькие группы считаем одним кластером
                const cluster = this.createCluster(colors);
                allClusters.push(cluster);
                return;
            }
            
            // Выполняем итеративную кластеризацию в RGB
            const clusters = this.rgbClustering(colors);
            allClusters.push(...clusters);
        });
        
        return allClusters;
    }

    /**
     * Кластеризация в RGB пространстве
     */
    rgbClustering(colors) {
        const clusters = [];
        const visited = new Set();
        
        colors.forEach((color, index) => {
            if (visited.has(index)) return;
            
            const cluster = [color];
            visited.add(index);
            
            // Ищем похожие цвета
            for (let j = index + 1; j < colors.length; j++) {
                if (visited.has(j)) continue;
                
                const otherColor = colors[j];
                const distance = this.colorDistanceRGB(color, otherColor);
                
                if (distance <= this.config.rgbDistanceThreshold) {
                    cluster.push(otherColor);
                    visited.add(j);
                }
            }
            
            if (cluster.length > 0) {
                clusters.push(this.createCluster(cluster));
            }
        });
        
        return clusters;
    }

    /**
     * Расстояние между цветами в RGB пространстве
     */
    colorDistanceRGB(color1, color2) {
        const rDiff = color1.rgb.r - color2.rgb.r;
        const gDiff = color1.rgb.g - color2.rgb.g;
        const bDiff = color1.rgb.b - color2.rgb.b;
        
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }

    /**
     * Создание кластера из группы цветов
     */
    createCluster(colors) {
        if (!colors || colors.length === 0) return null;
        
        // Вычисляем средние значения
        let totalR = 0, totalG = 0, totalB = 0;
        let totalH = 0, totalS = 0, totalL = 0;
        let totalCount = 0;
        let totalBrightness = 0;
        
        colors.forEach(color => {
            totalR += color.rgb.r * color.count;
            totalG += color.rgb.g * color.count;
            totalB += color.rgb.b * color.count;
            
            totalH += color.hsl.h * color.count;
            totalS += color.hsl.s * color.count;
            totalL += color.hsl.l * color.count;
            
            totalBrightness += color.brightness * color.count;
            totalCount += color.count;
        });
        
        const avgR = Math.round(totalR / totalCount);
        const avgG = Math.round(totalG / totalCount);
        const avgB = Math.round(totalB / totalCount);
        
        const avgH = totalH / totalCount;
        const avgS = totalS / totalCount;
        const avgL = totalL / totalCount;
        
        const avgBrightness = totalBrightness / totalCount;
        const avgSaturation = Math.round(avgS * 100);
        
        // Основной цвет кластера - наиболее частый цвет
        const mostFrequent = colors.reduce((prev, current) => 
            (prev.count > current.count) ? prev : current
        );
        
        return {
            rgb: { r: avgR, g: avgG, b: avgB },
            hex: mostFrequent.hex, // Используем самый частый цвет как представитель
            hsl: { h: avgH, s: avgS, l: avgL },
            brightness: Math.round(avgBrightness),
            saturation: avgSaturation,
            lightness: Math.round(avgL * 100),
            count: totalCount,
            colors: colors,
            originalCount: colors.length,
            combinedWeight: this.calculateCombinedWeight(avgS, totalCount)
        };
    }

    /**
     * 4. Сортировка по комбинированному весу
     */
    sortByCombinedWeight(clusters) {
        return clusters
            .filter(cluster => cluster && cluster.count > 0)
            .sort((a, b) => {
                // Сначала по комбинированному весу
                const weightDiff = b.combinedWeight - a.combinedWeight;
                if (Math.abs(weightDiff) > 0.1) return weightDiff;
                
                // Затем по насыщенности
                const saturationDiff = b.saturation - a.saturation;
                if (Math.abs(saturationDiff) > 5) return saturationDiff;
                
                // Затем по частоте
                return b.count - a.count;
            })
            .slice(0, 12); // Ограничиваем 12 кластерами
    }

    /**
     * Расчет комбинированного веса
     */
    calculateCombinedWeight(saturation, frequency) {
        const normalizedSaturation = saturation; // 0-1
        const normalizedFrequency = Math.min(frequency / 100, 1); // Нормализуем частоту
        
        return (normalizedSaturation * this.config.saturationWeight) + 
               (normalizedFrequency * this.config.frequencyWeight);
    }

    /**
     * 5. Создание палитры из кластеров
     */
    createPalette(clusters) {
        return clusters.map((cluster, index) => ({
            rgb: `rgb(${cluster.rgb.r}, ${cluster.rgb.g}, ${cluster.rgb.b})`,
            hex: cluster.hex,
            count: cluster.count,
            brightness: cluster.brightness,
            saturation: cluster.saturation,
            lightness: cluster.lightness,
            clusterSize: cluster.originalCount,
            combinedWeight: cluster.combinedWeight.toFixed(2),
            role: 'unassigned',
            roleName: 'Не назначена'
        }));
    }

    /**
     * 6. Назначение семантических ролей
     */
    assignSemanticRoles(palette) {
        if (palette.length === 0) return palette;
        
        const assigned = new Set();
        const roles = [...palette];
        
        // Сортируем по разным критериям
        const byBrightness = [...roles].sort((a, b) => b.brightness - a.brightness);
        const bySaturation = [...roles].sort((a, b) => b.saturation - a.saturation);
        const byCount = [...roles].sort((a, b) => b.count - a.count);
        
        // 1. ФОН - самый светлый с низкой насыщенностью
        const backgroundCandidates = byBrightness.filter(color => 
            color.brightness > 220 && color.saturation < 30
        );
        if (backgroundCandidates.length > 0 && !assigned.has(backgroundCandidates[0].hex)) {
            backgroundCandidates[0].role = 'background';
            backgroundCandidates[0].roleName = this.colorRoles.background;
            assigned.add(backgroundCandidates[0].hex);
        }
        
        // 2. ТЕКСТ - самый темный с низкой насыщенностью
        const textCandidates = byBrightness.filter(color => 
            color.brightness < 100 && color.saturation < 30 && !assigned.has(color.hex)
        );
        if (textCandidates.length > 0) {
            textCandidates[0].role = 'text';
            textCandidates[0].roleName = this.colorRoles.text;
            assigned.add(textCandidates[0].hex);
        }
        
        // 3. АКЦЕНТНЫЙ - самый насыщенный и не слишком светлый/темный
        const accentCandidates = bySaturation.filter(color => 
            color.saturation > 60 && 
            color.brightness > 70 && 
            color.brightness < 180 &&
            !assigned.has(color.hex)
        );
        if (accentCandidates.length > 0) {
            accentCandidates[0].role = 'accent';
            accentCandidates[0].roleName = this.colorRoles.accent;
            assigned.add(accentCandidates[0].hex);
        }
        
        // 4. ОСНОВНОЙ - самый частый насыщенный цвет
        const primaryCandidates = byCount.filter(color => 
            color.saturation > 30 && 
            !assigned.has(color.hex) &&
            (color.role !== 'accent' || palette.length < 4)
        );
        if (primaryCandidates.length > 0) {
            primaryCandidates[0].role = 'primary';
            primaryCandidates[0].roleName = this.colorRoles.primary;
            assigned.add(primaryCandidates[0].hex);
        }
        
        // 5. ВТОРИЧНЫЙ - следующий по значимости
        const secondaryCandidates = byCount.filter(color => 
            !assigned.has(color.hex) && color.saturation > 10
        );
        if (secondaryCandidates.length > 0) {
            secondaryCandidates[0].role = 'secondary';
            secondaryCandidates[0].roleName = this.colorRoles.secondary;
            assigned.add(secondaryCandidates[0].hex);
        }
        
        // 6. Остальные цвета
        roles.forEach(color => {
            if (color.role === 'unassigned') {
                if (color.brightness > 180 && color.saturation < 40) {
                    color.role = 'surface';
                    color.roleName = this.colorRoles.surface;
                } else if (color.brightness > 100 && color.brightness < 160 && color.saturation < 50) {
                    color.role = 'border';
                    color.roleName = this.colorRoles.border;
                } else {
                    color.role = 'additional';
                    color.roleName = 'Дополнительный';
                }
            }
        });
        
        return roles;
    }

    /**
     * Анализ семантики палитры
     */
    analyzeSemantics(palette) {
        const semantics = {
            hasGoodContrast: false,
            colorCount: palette.length,
            primaryColor: null,
            accentColor: null,
            isDarkTheme: false,
            colorDistribution: {}
        };

        if (palette.length === 0) return semantics;

        const background = palette.find(color => color.role === 'background');
        const text = palette.find(color => color.role === 'text');
        const primary = palette.find(color => color.role === 'primary');
        const accent = palette.find(color => color.role === 'accent');

        // Контрастность
        if (background && text) {
            const contrast = Math.abs(background.brightness - text.brightness);
            semantics.hasGoodContrast = contrast > 100;
            semantics.contrastRatio = contrast;
        }

        // Основные цвета
        if (primary) semantics.primaryColor = primary.hex;
        if (accent) semantics.accentColor = accent.hex;

        // Определение темы
        const avgBrightness = palette.reduce((sum, color) => sum + color.brightness, 0) / palette.length;
        semantics.isDarkTheme = avgBrightness < 128;
        semantics.averageBrightness = Math.round(avgBrightness);

        // Распределение цветов по ролям
        palette.forEach(color => {
            if (!semantics.colorDistribution[color.role]) {
                semantics.colorDistribution[color.role] = 0;
            }
            semantics.colorDistribution[color.role]++;
        });

        return semantics;
    }

    /**
     * Получение пустого результата при ошибке
     */
    getEmptyResult() {
        return {
            palette: [],
            semantics: {},
            total: 0,
            grouped: 0,
            analysisMethod: 'hybrid'
        };
    }
}

module.exports = HybridColorAnalyzer;