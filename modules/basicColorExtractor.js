class BasicColorExtractor {
    async extractAllColors(page) {
        console.log('🎨 Starting BASIC color extraction...');
        
        try {
            const colors = await page.evaluate(() => {
                const colorSet = new Set();
                const elements = document.querySelectorAll('*');
                
                console.log(`🔍 Scanning ${elements.length} elements for colors...`);
                
                // Простая функция проверки цвета
                function isValidColor(colorStr) {
                    if (!colorStr || typeof colorStr !== 'string') return false;
                    const str = colorStr.trim().toLowerCase();
                    
                    // Исключаем прозрачные и системные цвета
                    if (str === 'transparent' || str === 'inherit' || str === 'currentcolor') return false;
                    if (str === 'none' || str === 'initial' || str === 'unset') return false;
                    if (str.includes('url(') || str.includes('image(')) return false;
                    if (str === 'rgba(0, 0, 0, 0)') return false;
                    
                    // Проверяем цветовые форматы
                    return /^#([a-f\d]{3,8})$/i.test(str) || 
                           /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(str) ||
                           /^hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(,\s*[\d.]+\s*)?\)$/i.test(str);
                }

                elements.forEach(element => {
                    try {
                        const style = window.getComputedStyle(element);
                        
                        // Проверяем основные свойства
                        const colorProps = [
                            'color', 'backgroundColor', 'borderColor',
                            'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
                            'outlineColor', 'textDecorationColor'
                        ];
                        
                        colorProps.forEach(prop => {
                            const colorValue = style[prop];
                            if (colorValue && isValidColor(colorValue)) {
                                colorSet.add(colorValue);
                            }
                        });
                        
                        // Особый анализ для кнопок и ссылок
                        const tagName = element.tagName.toLowerCase();
                        if (tagName === 'button' || tagName === 'a' || 
                            element.className.includes('btn') || 
                            element.className.includes('button')) {
                            
                            const bgColor = style.backgroundColor;
                            if (isValidColor(bgColor)) {
                                colorSet.add(bgColor);
                            }
                        }
                        
                    } catch (e) {
                        // Игнорируем ошибки для отдельных элементов
                    }
                });
                
                console.log(`📊 Found ${colorSet.size} raw color strings`);
                return Array.from(colorSet);
            });

            console.log(`✅ Basic extraction found ${colors.length} color strings`);
            return colors;

        } catch (error) {
            console.error('❌ Basic color extraction failed:', error);
            return [];
        }
    }
}

module.exports = BasicColorExtractor;