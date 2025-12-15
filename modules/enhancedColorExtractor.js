class EnhancedColorExtractor {
    constructor() {
        this.colorCache = new Set();
    }

    async extractAllColors(page) {
        console.log('🎨 Starting enhanced color extraction...');
        
        try {
            const colors = await page.evaluate(() => {
                // Вспомогательные функции, которые будут выполняться в контексте браузера
                function extractColorsFromStyle(style) {
                    const colorSet = new Set();
                    const colorProperties = [
                        'color', 'backgroundColor', 'borderColor', 
                        'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
                        'outlineColor', 'textDecorationColor', 'columnRuleColor',
                        'caretColor', 'scrollbarColor', 'fill', 'stroke'
                    ];

                    colorProperties.forEach(prop => {
                        try {
                            const color = style.getPropertyValue(prop);
                            if (color && isValidColorString(color)) {
                                colorSet.add(color.trim());
                            }
                        } catch (e) {
                            // Ignore individual property errors
                        }
                    });

                    return Array.from(colorSet);
                }

                function extractCSSVariables() {
                    const colorSet = new Set();
                    try {
                        const stylesheets = Array.from(document.styleSheets);
                        stylesheets.forEach(sheet => {
                            try {
                                const rules = Array.from(sheet.cssRules || []);
                                rules.forEach(rule => {
                                    if (rule instanceof CSSStyleRule) {
                                        const style = rule.style;
                                        // Извлекаем CSS переменные
                                        for (let i = 0; i < style.length; i++) {
                                            const prop = style[i];
                                            if (prop.startsWith('--')) {
                                                const value = style.getPropertyValue(prop);
                                                if (isValidColorString(value)) {
                                                    colorSet.add(value.trim());
                                                }
                                            }
                                        }
                                        
                                        // Извлекаем значения свойств
                                        const colorProps = ['color', 'background-color', 'border-color'];
                                        colorProps.forEach(colorProp => {
                                            const value = style.getPropertyValue(colorProp);
                                            if (isValidColorString(value)) {
                                                colorSet.add(value.trim());
                                            }
                                        });
                                    }
                                });
                            } catch (e) {
                                // Ignore cross-origin stylesheet errors
                            }
                        });
                    } catch (error) {
                        console.log('CSS variables extraction partial failure:', error);
                    }
                    return Array.from(colorSet);
                }

                function extractSVGColors() {
                    const colorSet = new Set();
                    try {
                        // SVG элементы с атрибутами fill и stroke
                        const svgElements = document.querySelectorAll('[fill], [stroke], svg *');
                        svgElements.forEach(el => {
                            const fill = el.getAttribute('fill');
                            const stroke = el.getAttribute('stroke');
                            
                            if (fill && isValidColorString(fill)) {
                                colorSet.add(fill.trim());
                            }
                            if (stroke && isValidColorString(stroke)) {
                                colorSet.add(stroke.trim());
                            }
                        });
                    } catch (error) {
                        console.log('SVG extraction partial failure:', error);
                    }
                    return Array.from(colorSet);
                }

                function extractPseudoElements() {
                    const colorSet = new Set();
                    try {
                        const elements = document.querySelectorAll('*');
                        elements.forEach(element => {
                            try {
                                // ::before
                                const before = window.getComputedStyle(element, '::before');
                                extractColorsFromStyle(before).forEach(color => colorSet.add(color));
                                
                                // ::after  
                                const after = window.getComputedStyle(element, '::after');
                                extractColorsFromStyle(after).forEach(color => colorSet.add(color));
                            } catch (e) {
                                // Ignore pseudo-element errors
                            }
                        });
                    } catch (error) {
                        console.log('Pseudo elements extraction partial failure:', error);
                    }
                    return Array.from(colorSet);
                }

                function extractInlineStyles() {
                    const colorSet = new Set();
                    try {
                        const elementsWithInlineStyles = document.querySelectorAll('[style]');
                        elementsWithInlineStyles.forEach(el => {
                            const inlineStyle = el.getAttribute('style');
                            if (inlineStyle) {
                                // Парсим inline style для цветовых свойств
                                const colorRegex = /(color|background|border)[^:]*:\s*([^;]+)/gi;
                                let match;
                                while ((match = colorRegex.exec(inlineStyle)) !== null) {
                                    const value = match[2].trim();
                                    if (isValidColorString(value)) {
                                        colorSet.add(value);
                                    }
                                }
                            }
                        });
                    } catch (error) {
                        console.log('Inline styles extraction partial failure:', error);
                    }
                    return Array.from(colorSet);
                }

                function extractGradientColors() {
                    const colorSet = new Set();
                    try {
                        const elements = document.querySelectorAll('*');
                        elements.forEach(element => {
                            try {
                                const style = window.getComputedStyle(element);
                                const backgroundImage = style.backgroundImage;
                                
                                if (backgroundImage.includes('gradient')) {
                                    // Упрощенный парсинг градиентов - извлекаем цветовые остановки
                                    const colorStops = backgroundImage.match(/#[a-fA-F0-9]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g);
                                    if (colorStops) {
                                        colorStops.forEach(stop => {
                                            if (isValidColorString(stop)) {
                                                colorSet.add(stop.trim());
                                            }
                                        });
                                    }
                                }
                            } catch (e) {
                                // Ignore gradient extraction errors
                            }
                        });
                    } catch (error) {
                        console.log('Gradient extraction partial failure:', error);
                    }
                    return Array.from(colorSet);
                }

                function isValidColorString(colorStr) {
                    if (!colorStr || typeof colorStr !== 'string') return false;
                    
                    const str = colorStr.trim().toLowerCase();
                    
                    // Пропускаем прозрачные и невалидные значения
                    if (str === 'transparent' || str === 'inherit' || str === 'currentcolor') return false;
                    if (str === 'none' || str === 'initial' || str === 'unset') return false;
                    if (str.includes('url(') || str.includes('image(')) return false;
                    
                    // Проверяем цветовые форматы
                    const colorFormats = [
                        /^#[0-9a-f]{3}$/i,
                        /^#[0-9a-f]{6}$/i,
                        /^#[0-9a-f]{8}$/i,
                        /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i,
                        /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i,
                        /^hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/i,
                        /^hsla\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)$/i
                    ];

                    return colorFormats.some(format => format.test(str));
                }

                // НОВАЯ ФУНКЦИЯ: Приоритетное извлечение цветов из ключевых элементов
                function extractPriorityColors() {
                    const priorityColorSet = new Set();
                    
                    try {
                        // Элементы, которые обычно содержат брендовые цвета
                        const prioritySelectors = [
                            'button', 'a', '[class*="button"]', '[class*="btn"]', 
                            '[class*="primary"]', '[class*="accent"]', '[class*="brand"]',
                            '[class*="color"]', '[class*="logo"]', '[class*="header"]',
                            '[class*="nav"]', '[class*="menu"]', '[class*="cta"]',
                            '[style*="background"]', '[style*="color"]'
                        ];

                        prioritySelectors.forEach(selector => {
                            try {
                                const elements = document.querySelectorAll(selector);
                                elements.forEach(element => {
                                    try {
                                        const style = window.getComputedStyle(element);
                                        const bgColor = style.backgroundColor;
                                        const color = style.color;
                                        const borderColor = style.borderColor;
                                        
                                        // Приоритетно добавляем цвета из этих элементов
                                        if (isValidColorString(bgColor) && !isGrayishColor(bgColor)) {
                                            priorityColorSet.add(bgColor);
                                        }
                                        if (isValidColorString(color) && !isGrayishColor(color)) {
                                            priorityColorSet.add(color);
                                        }
                                        if (isValidColorString(borderColor) && !isGrayishColor(borderColor)) {
                                            priorityColorSet.add(borderColor);
                                        }
                                    } catch (e) {
                                        // Ignore element errors
                                    }
                                });
                            } catch (e) {
                                // Ignore selector errors
                            }
                        });
                    } catch (error) {
                        console.log('Priority extraction partial failure:', error);
                    }
                    return Array.from(priorityColorSet);
                }

                // НОВАЯ ФУНКЦИЯ: Определение серых/нейтральных цветов
                function isGrayishColor(colorStr) {
                    if (!isValidColorString(colorStr)) return false;
                    
                    try {
                        // Парсим цвет
                        let r, g, b;
                        if (colorStr.startsWith('#')) {
                            if (colorStr.length === 4) {
                                r = parseInt(colorStr[1] + colorStr[1], 16);
                                g = parseInt(colorStr[2] + colorStr[2], 16);
                                b = parseInt(colorStr[3] + colorStr[3], 16);
                            } else {
                                r = parseInt(colorStr.substr(1, 2), 16);
                                g = parseInt(colorStr.substr(3, 2), 16);
                                b = parseInt(colorStr.substr(5, 2), 16);
                            }
                        } else if (colorStr.startsWith('rgb')) {
                            const match = colorStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
                            if (match) {
                                r = parseInt(match[1]);
                                g = parseInt(match[2]);
                                b = parseInt(match[3]);
                            }
                        }
                        
                        if (r !== undefined && g !== undefined && b !== undefined) {
                            // Проверяем на "серость" - все каналы близки друг к другу
                            const maxDiff = Math.max(Math.abs(r-g), Math.abs(r-b), Math.abs(g-b));
                            return maxDiff < 30; // Если разница меньше 30 - считаем серым
                        }
                    } catch (e) {
                        // Если не удалось распарсить, не считаем серым
                    }
                    return false;
                }

                // НОВАЯ ФУНКЦИЯ: Проверка видимости элемента
                function isElementVisible(element) {
                    try {
                        const style = window.getComputedStyle(element);
                        const rect = element.getBoundingClientRect();
                        
                        // Проверяем основные свойства видимости
                        if (style.display === 'none') return false;
                        if (style.visibility === 'hidden') return false;
                        if (style.opacity === '0') return false;
                        if (rect.width === 0 || rect.height === 0) return false;
                        
                        // Проверяем, находится ли элемент в viewport
                        if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
                        if (rect.right < 0 || rect.left > window.innerWidth) return false;
                        
                        return true;
                    } catch (e) {
                        return false;
                    }
                }

                // НОВАЯ ФУНКЦИЯ: Извлечение цветов из ключевых семантических элементов
            function extractSemanticColors() {
                const semanticColorSet = new Set();
                
                try {
                    // Ключевые элементы, которые обычно содержат брендовые цвета
                    const semanticSelectors = [
                        // Заголовки
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        '[class*="heading"]', '[class*="title"]', '[class*="header"]',
                        // Навигация и кнопки
                        'nav', 'header', 'footer', 
                        'button', '[role="button"]', '[class*="button"]', '[class*="btn"]',
                        'a[href]', '[class*="link"]', '[class*="nav"]',
                        // Брендовые элементы
                        '[class*="logo"]', '[class*="brand"]', '[class*="primary"]',
                        '[class*="accent"]', '[class*="color"]',
                        // Важные секции
                        'main', 'section', 'article', 'aside',
                        '[class*="hero"]', '[class*="banner"]', '[class*="cta"]',
                        // Формы
                        'input', 'select', 'textarea',
                        '[class*="form"]', '[class*="input"]', '[class*="field"]'
                    ];

                    semanticSelectors.forEach(selector => {
                        try {
                            const elements = document.querySelectorAll(selector);
                            elements.forEach(element => {
                                if (!isElementVisible(element)) return;
                                
                                try {
                                    const style = window.getComputedStyle(element);
                                    const bgColor = style.backgroundColor;
                                    const color = style.color;
                                    const borderColor = style.borderColor;
                                    
                                    // Приоритетно добавляем цвета из семантических элементов
                                    if (isValidColorString(bgColor)) {
                                        semanticColorSet.add(bgColor);
                                    }
                                    if (isValidColorString(color)) {
                                        semanticColorSet.add(color);
                                    }
                                    if (isValidColorString(borderColor)) {
                                        semanticColorSet.add(borderColor);
                                    }
                                    
                                    // Также проверяем псевдоэлементы
                                    try {
                                        const before = window.getComputedStyle(element, '::before');
                                        extractColorsFromStyle(before).forEach(c => semanticColorSet.add(c));
                                    } catch (e) {}
                                    
                                    try {
                                        const after = window.getComputedStyle(element, '::after');
                                        extractColorsFromStyle(after).forEach(c => semanticColorSet.add(c));
                                    } catch (e) {}
                                } catch (e) {
                                    // Ignore element errors
                                }
                            });
                        } catch (e) {
                            // Ignore selector errors
                        }
                    });
                } catch (error) {
                    console.log('Semantic extraction partial failure:', error);
                }
                return Array.from(semanticColorSet);
            }

            // Основная логика извлечения - СНАЧАЛА семантические цвета
            const colorSet = new Set();
            const elements = document.querySelectorAll('*');
            
            console.log(`📄 Analyzing ${elements.length} elements...`);

            // 1. СЕМАНТИЧЕСКИЕ ЦВЕТА - самый высокий приоритет
            extractSemanticColors().forEach(color => colorSet.add(color));

            // 2. Стандартные computed styles ВИДИМЫХ элементов
            const visibleElements = Array.from(elements).filter(isElementVisible);
            visibleElements.forEach(element => {
                try {
                    const style = window.getComputedStyle(element);
                    extractColorsFromStyle(style).forEach(color => colorSet.add(color));
                } catch (e) {}
            });

            // 3. CSS переменные
            extractCSSVariables().forEach(color => colorSet.add(color));

            // 4. Остальные методы (SVG, inline styles, градиенты)
            extractSVGColors().forEach(color => colorSet.add(color));
            extractPseudoElements().forEach(color => colorSet.add(color));
            extractInlineStyles().forEach(color => colorSet.add(color));
            extractGradientColors().forEach(color => colorSet.add(color));

            return Array.from(colorSet);
        });

        console.log(`✅ Enhanced extraction found ${colors.length} color strings`);
        return colors;

    } catch (error) {
        console.error('❌ Enhanced color extraction failed:', error);
        return await this.extractBasicColors(page);
    }
}
}

module.exports = EnhancedColorExtractor;