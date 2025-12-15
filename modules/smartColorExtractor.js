smartColor

class SmartColorExtractor {
    async extractAllColors(page) {
        console.log('🎨 Starting SMART color extraction...');
        
        try {
            const colors = await page.evaluate(() => {
                const colorMap = new Map(); // Для подсчета частоты
                const elementTypes = {
                    button: 10,      // Кнопки - высший приоритет
                    a: 8,           // Ссылки
                    h1: 7, h2: 7, h3: 6, h4: 6, h5: 5, h6: 5, // Заголовки
                    nav: 9,         // Навигация
                    header: 8,      // Шапка
                    footer: 3,      // Подвал
                    div: 1,         // Обычные div
                    span: 1,
                    p: 2
                };

                function isValidColor(colorStr) {
                    if (!colorStr || typeof colorStr !== 'string') return false;
                    const str = colorStr.trim().toLowerCase();
                    
                    // Исключаем прозрачные и системные цвета
                    if (str === 'transparent' || str === 'inherit' || str === 'currentcolor') return false;
                    if (str === 'none' || str === 'initial' || str === 'unset') return false;
                    if (str.includes('url(') || str.includes('image(')) return false;
                    if (str === 'rgba(0, 0, 0, 0)' || str === 'rgb(0, 0, 0)') return false;
                    
                    // Проверяем цветовые форматы
                    const formats = [
                        /^#[0-9a-f]{3,8}$/i,
                        /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/,
                        /^hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(,\s*[\d.]+\s*)?\)$/
                    ];
                    
                    return formats.some(format => format.test(str));
                }

                function parseColorToRGB(colorStr) {
                    const clean = colorStr.trim().toLowerCase();
                    
                    // HEX форматы
                    if (clean.startsWith('#')) {
                        let hex = clean.slice(1);
                        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                        if (hex.length === 6) {
                            const r = parseInt(hex.slice(0, 2), 16);
                            const g = parseInt(hex.slice(2, 4), 16);
                            const b = parseInt(hex.slice(4, 6), 16);
                            return { r, g, b, a: 1, original: colorStr };
                        }
                    }
                    
                    // RGB/RGBA
                    const rgbMatch = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbMatch) {
                        return {
                            r: parseInt(rgbMatch[1]),
                            g: parseInt(rgbMatch[2]),
                            b: parseInt(rgbMatch[3]),
                            a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
                            original: colorStr
                        };
                    }
                    
                    return null;
                }

                function getElementVisibility(element) {
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    
                    return rect.width > 0 && 
                           rect.height > 0 && 
                           style.visibility !== 'hidden' &&
                           style.display !== 'none' &&
                           style.opacity !== '0';
                }

                function analyzeElementColors(element, weight) {
                    if (!getElementVisibility(element)) return;
                    
                    try {
                        const style = window.getComputedStyle(element);
                        const tagName = element.tagName.toLowerCase();
                        const elementWeight = elementTypes[tagName] || 1;
                        
                        // Анализ цветовых свойств с весами
                        const colorProps = [
                            { prop: 'color', weight: elementWeight * 2 },
                            { prop: 'backgroundColor', weight: elementWeight * 3 }, // Фон важнее
                            { prop: 'borderColor', weight: elementWeight },
                            { prop: 'borderTopColor', weight: elementWeight },
                            { prop: 'borderRightColor', weight: elementWeight },
                            { prop: 'borderBottomColor', weight: elementWeight },
                            { prop: 'borderLeftColor', weight: elementWeight }
                        ];
                        
                        colorProps.forEach(({prop, weight: propWeight}) => {
                            const colorValue = style[prop];
                            if (isValidColor(colorValue)) {
                                const rgb = parseColorToRGB(colorValue);
                                if (rgb && rgb.a > 0.1) { // Игнорируем почти прозрачные
                                    const key = `${rgb.r},${rgb.g},${rgb.b}`;
                                    const current = colorMap.get(key) || { 
                                        rgb, count: 0, weight: 0, sources: [] 
                                    };
                                    
                                    current.count += 1;
                                    current.weight += propWeight * elementWeight;
                                    current.sources.push({
                                        tag: tagName,
                                        prop: prop,
                                        color: colorValue,
                                        text: element.textContent?.slice(0, 30) || ''
                                    });
                                    
                                    colorMap.set(key, current);
                                }
                            }
                        });
                        
                        // Особый анализ для кнопок и ссылок (брендовые цвета)
                        if (tagName === 'button' || tagName === 'a' || 
                            element.getAttribute('role') === 'button' ||
                            element.classList.toString().toLowerCase().includes('btn')) {
                            
                            const bgColor = style.backgroundColor;
                            if (isValidColor(bgColor)) {
                                const rgb = parseColorToRGB(bgColor);
                                if (rgb && rgb.a > 0.9) { // Только непрозрачные фоны
                                    const key = `${rgb.r},${rgb.g},${rgb.b}`;
                                    const current = colorMap.get(key) || { 
                                        rgb, count: 0, weight: 0, sources: [] 
                                    };
                                    
                                    current.count += 5; // Бонус за кнопки
                                    current.weight += 50; // Высокий вес
                                    current.sources.push({
                                        tag: 'BRAND_BUTTON',
                                        prop: 'backgroundColor',
                                        color: bgColor,
                                        text: 'Кнопка: ' + (element.textContent?.slice(0, 20) || '')
                                    });
                                    
                                    colorMap.set(key, current);
                                }
                            }
                        }
                        
                    } catch (e) {
                        // Игнорируем ошибки для отдельных элементов
                    }
                }

                // Основной процесс анализа
                console.log('🔍 Analyzing visible elements for colors...');
                
                // Приоритетный анализ ключевых элементов
                const prioritySelectors = [
                    'button', 'a', 'nav', 'header', 
                    '[class*="btn"]', '[class*="button"]',
                    '[class*="primary"]', '[class*="accent"]',
                    '[class*="brand"]', '[class*="color"]'
                ];
                
                prioritySelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => analyzeElementColors(el, 5));
                });
                
                // Общий анализ всех видимых элементов
                const allElements = document.querySelectorAll('*');
                console.log(`📄 Total elements: ${allElements.length}`);
                
                let analyzed = 0;
                allElements.forEach(element => {
                    if (analyzed < 5000) { // Ограничим для производительности
                        analyzeElementColors(element, 1);
                        analyzed++;
                    }
                });
                
                // Преобразуем в массив и сортируем по весу
                const colorArray = Array.from(colorMap.values())
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 50); // Берем топ-50 по весу
                
                console.log(`📊 Found ${colorArray.length} weighted colors`);
                return colorArray.map(item => ({
                    rgb: item.rgb,
                    count: item.count,
                    weight: item.weight,
                    sources: item.sources.slice(0, 3) // Только первые 3 источника
                }));
                
            });

            console.log(`✅ Smart extraction: ${colors.length} weighted colors`);
            
            // Преобразуем в массив строк для обратной совместимости
            const colorStrings = colors.map(color => 
                `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`
            );
            
            return {
                rawColors: colorStrings,
                weightedColors: colors
            };

        } catch (error) {
            console.error('❌ Smart color extraction failed:', error);
            // Fallback
            return { rawColors: [], weightedColors: [] };
        }
    }
}

module.exports = SmartColorExtractor;