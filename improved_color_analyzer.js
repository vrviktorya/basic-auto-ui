const puppeteer = require('puppeteer');
const kmeans = require('node-kmeans');

// Функция для определения роли цвета на основе его свойств
function determineColorRole(color, usageContext = {}) {
    const r = color.rgb[0], g = color.rgb[1], b = color.rgb[2];
    
    // Вычисляем яркость (perceptual lightness)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    
    // Определяем роль на основе яркости и насыщенности
    if (brightness > 240) return 'background-light';
    if (brightness < 30) return 'text-dark';
    if (saturation > 100 && brightness > 150) return 'primary';
    if (saturation > 80 && brightness > 100 && brightness < 200) return 'secondary';
    if (saturation > 120) return 'accent';
    if (brightness > 200) return 'background';
    if (brightness < 80) return 'text';
    
    return 'neutral';
}

// Улучшенная функция анализа с фильтрацией
async function improvedColorAnalysis(url) {
    console.log(`🎨 Улучшенный анализ: ${url}`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log(`🌐 Переходим на: ${url}`);
        await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });

        console.log('✅ Страница загружена');

        // Улучшенный анализ с фильтрацией видимых элементов
        const colorData = await page.evaluate(() => {
            const colors = new Map();
            
            // Функция проверки видимости элемента
            const isVisible = (element) => {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' &&
                       rect.width > 0 && 
                       rect.height > 0 &&
                       rect.top < window.innerHeight &&
                       rect.bottom > 0;
            };

            // Собираем только видимые элементы
            const visibleElements = Array.from(document.querySelectorAll('*')).filter(isVisible);
            
            console.log(`📊 Анализируем ${visibleElements.length} видимых элементов`);

            visibleElements.forEach(element => {
                try {
                    const style = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    const area = rect.width * rect.height;
                    
                    // Только значимые элементы (исключаем мелкие/декоративные)
                    if (area < 100) return;

                    const colorProperties = {
                        color: style.color,
                        backgroundColor: style.backgroundColor,
                        borderColor: style.borderColor
                    };

                    Object.entries(colorProperties).forEach(([prop, value]) => {
                        if (value && 
                            value !== 'rgba(0, 0, 0, 0)' && 
                            value !== 'transparent' &&
                            !value.includes('gradient') &&
                            value !== 'rgb(0, 0, 0)' &&
                            value !== 'rgb(255, 255, 255)') {
                            
                            const key = value;
                            if (!colors.has(key)) {
                                colors.set(key, {
                                    value: value,
                                    count: 0,
                                    area: 0,
                                    properties: new Set(),
                                    elements: new Set()
                                });
                            }
                            
                            const colorInfo = colors.get(key);
                            colorInfo.count++;
                            colorInfo.area += area;
                            colorInfo.properties.add(prop);
                            colorInfo.elements.add(element.tagName.toLowerCase());
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки для отдельных элементов
                }
            });

            // Фильтруем цвета по значимости
            const filteredColors = Array.from(colors.entries())
                .filter(([_, info]) => info.count >= 2 || info.area > 10000) // Минимум 2 использования или большая площадь
                .sort((a, b) => b[1].area - a[1].area) // Сортируем по площади
                .slice(0, 50); // Берем топ-50 самых значимых цветов

            return filteredColors.map(([value, info]) => ({
                value: value,
                count: info.count,
                area: info.area,
                properties: Array.from(info.properties),
                elements: Array.from(info.elements)
            }));
        });

        console.log(`🎨 После фильтрации: ${colorData.length} значимых цветов`);

        // Преобразуем цвета в векторы для кластеризации
        const colorVectors = [];
        const colorInfoMap = new Map();

        colorData.forEach(item => {
            const match = item.value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s*[\d.]+)?\)/);
            if (match) {
                const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
                const key = `${r},${g},${b}`;
                
                if (!colorInfoMap.has(key)) {
                    colorInfoMap.set(key, {
                        rgb: [r, g, b],
                        count: 0,
                        area: 0,
                        original: item.value,
                        properties: new Set(item.properties),
                        elements: new Set(item.elements)
                    });
                    colorVectors.push([r, g, b]);
                }
                
                const colorInfo = colorInfoMap.get(key);
                colorInfo.count += item.count;
                colorInfo.area += item.area;
                item.properties.forEach(prop => colorInfo.properties.add(prop));
                item.elements.forEach(el => colorInfo.elements.add(el));
            }
        });

        console.log(`📊 ${colorVectors.length} уникальных RGB цветов для кластеризации`);

        let palette = [];
        
        if (colorVectors.length > 0) {
            palette = await new Promise((resolve) => {
                const clustersCount = Math.min(8, Math.max(3, Math.floor(colorVectors.length / 3)));
                
                kmeans.clusterize(colorVectors, { 
                    k: clustersCount 
                }, (err, res) => {
                    if (err) {
                        console.error('❌ Ошибка кластеризации:', err);
                        resolve([]);
                    } else if (res) {
                        const clustered = res.map(cluster => {
                            const centroid = cluster.centroid.map(val => Math.round(val));
                            const hex = `#${((1 << 24) + (centroid[0] << 16) + (centroid[1] << 8) + centroid[2]).toString(16).slice(1).toUpperCase()}`;
                            
                            // Находим самый частый цвет в кластере
                            const clusterColors = cluster.cluster.map(index => {
                                const rgb = colorVectors[index];
                                const key = rgb.join(',');
                                return colorInfoMap.get(key);
                            }).filter(Boolean);
                            
                            const mostFrequent = clusterColors.reduce((prev, current) => 
                                (prev.count > current.count) ? prev : current
                            );
                            
                            return {
                                rgb: `rgb(${centroid.join(', ')})`,
                                hex: hex,
                                count: cluster.cluster.length,
                                totalUsage: clusterColors.reduce((sum, color) => sum + color.count, 0),
                                totalArea: clusterColors.reduce((sum, color) => sum + color.area, 0),
                                role: determineColorRole({ rgb: centroid }),
                                properties: Array.from(new Set(clusterColors.flatMap(c => Array.from(c.properties)))),
                                elements: Array.from(new Set(clusterColors.flatMap(c => Array.from(c.elements)))),
                                centroid: centroid
                            };
                        }).sort((a, b) => b.totalArea - a.totalArea); // Сортируем по общей площади
                        
                        resolve(clustered);
                    } else {
                        resolve([]);
                    }
                });
            });
        }

        console.log(`🎯 Создана палитра из ${palette.length} основных цветов`);

        return {
            url,
            domain: new URL(url).hostname,
            colors: {
                total: colorData.length,
                palette: palette
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Ошибка анализа:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = { improvedColorAnalysis };