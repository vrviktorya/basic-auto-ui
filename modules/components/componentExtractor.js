class ComponentExtractor {
    async extractButtons(page) {
        console.log('🔘 Extracting button styles...');
        
        const buttons = await page.evaluate(() => {
            const buttonElements = document.querySelectorAll(
                'button, input[type="button"], input[type="submit"], ' +
                'input[type="reset"], a[role="button"], [class*="btn"], ' +
                '[class*="button"], [class*="cta"]'
            );
            
            const buttonStyles = [];
            
            buttonElements.forEach((btn, index) => {
                if (index > 50) return; // Ограничиваем количество
                
                try {
                    const style = window.getComputedStyle(btn);
                    const rect = btn.getBoundingClientRect();
                    
                    // Извлекаем текст/иконки
                    const hasIcon = btn.querySelector('i, svg, img, span[class*="icon"]') !== null;
                    const iconType = hasIcon ? this.detectIconType(btn) : 'none';
                    
                    const buttonData = {
                        // Базовые свойства
                        tagName: btn.tagName.toLowerCase(),
                        className: btn.className,
                        id: btn.id,
                        text: btn.textContent.trim().substring(0, 30),
                        hasIcon: hasIcon,
                        iconType: iconType,
                        
                        // Стили
                        styles: {
                            // Цвета
                            backgroundColor: style.backgroundColor,
                            color: style.color,
                            borderColor: style.borderColor,
                            borderWidth: style.borderWidth,
                            borderStyle: style.borderStyle,
                            
                            // Форма и размеры
                            borderRadius: style.borderRadius,
                            padding: style.padding,
                            paddingTop: style.paddingTop,
                            paddingRight: style.paddingRight,
                            paddingBottom: style.paddingBottom,
                            paddingLeft: style.paddingLeft,
                            margin: style.margin,
                            width: rect.width > 0 ? `${rect.width}px` : style.width,
                            height: rect.height > 0 ? `${rect.height}px` : style.height,
                            minWidth: style.minWidth,
                            minHeight: style.minHeight,
                            
                            // Текст
                            fontSize: style.fontSize,
                            fontFamily: style.fontFamily,
                            fontWeight: style.fontWeight,
                            textTransform: style.textTransform,
                            letterSpacing: style.letterSpacing,
                            lineHeight: style.lineHeight,
                            textAlign: style.textAlign,
                            
                            // Эффекты
                            boxShadow: style.boxShadow,
                            textShadow: style.textShadow,
                            opacity: style.opacity,
                            
                            // Flex/Grid
                            display: style.display,
                            justifyContent: style.justifyContent,
                            alignItems: style.alignItems,
                            flexDirection: style.flexDirection,
                            
                            // Позиционирование
                            position: style.position,
                            cursor: style.cursor
                        },
                        
                        // Состояния (попробуем получить hover)
                        states: this.extractButtonStates(btn),
                        
                        // Использование
                        usageCount: 1,
                        semanticRole: this.determineButtonRole(btn)
                    };
                    
                    buttonStyles.push(buttonData);
                    
                } catch (e) {
                    console.warn('Error extracting button:', e);
                }
            });
            
            return buttonStyles;
        });
        
        // Группируем похожие кнопки
        const groupedButtons = this.groupSimilarButtons(buttons);
        console.log(`✅ Extracted ${groupedButtons.length} button styles`);
        
        return groupedButtons;
    }
    
    // Вспомогательные методы для извлечения состояний
    extractButtonStates(element) {
        // Здесь можно было бы имитировать hover через Puppeteer,
        // но для простоты вернем статические данные
        return {
            normal: {},
            hover: this.extractHoverStyles(element),
            active: {},
            disabled: {}
        };
    }
    
    extractHoverStyles(element) {
        // Простая эвристика для определения hover-стилей
        const styles = {};
        const computed = window.getComputedStyle(element);
        
        // Проверяем наличие transition
        if (computed.transition && computed.transition !== 'none') {
            styles.transition = computed.transition;
        }
        
        // Можно добавить логику анализа CSS-классов с :hover
        // Но это сложнее, оставим как есть для первого этапа
        
        return styles;
    }
    
    determineButtonRole(element) {
        const text = element.textContent.toLowerCase();
        const classes = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        
        if (text.includes('купить') || text.includes('заказать') || 
            text.includes('buy') || text.includes('order')) {
            return 'primary';
        }
        
        if (text.includes('подробнее') || text.includes('узнать') || 
            text.includes('читать') || text.includes('learn')) {
            return 'secondary';
        }
        
        if (element.tagName === 'A' && element.getAttribute('href') === '#') {
            return 'link-button';
        }
        
        if (classes.includes('primary') || classes.includes('main')) {
            return 'primary';
        }
        
        if (classes.includes('secondary') || classes.includes('outline')) {
            return 'secondary';
        }
        
        return 'default';
    }
    
    detectIconType(element) {
        const icon = element.querySelector('i, svg, img, [class*="icon"]');
        if (!icon) return 'none';
        
        if (icon.tagName === 'I') return 'font-icon';
        if (icon.tagName === 'SVG') return 'svg';
        if (icon.tagName === 'IMG') return 'image';
        
        return 'custom';
    }
    
    groupSimilarButtons(buttons) {
        const groups = [];
        
        buttons.forEach(button => {
            let foundGroup = false;
            
            // Создаем ключ для группировки по основным стилям
            const styleKey = [
                button.styles.backgroundColor,
                button.styles.color,
                button.styles.borderRadius,
                button.styles.fontSize,
                button.styles.padding
            ].join('|');
            
            for (let group of groups) {
                const groupKey = [
                    group.styles.backgroundColor,
                    group.styles.color,
                    group.styles.borderRadius,
                    group.styles.fontSize,
                    group.styles.padding
                ].join('|');
                
                // Если стили похожи, добавляем в группу
                if (styleKey === groupKey || this.areStylesSimilar(button.styles, group.styles)) {
                    group.usageCount++;
                    group.examples.push({
                        text: button.text,
                        className: button.className
                    });
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                groups.push({
                    ...button,
                    usageCount: 1,
                    examples: [{
                        text: button.text,
                        className: button.className
                    }],
                    groupId: `button-${groups.length + 1}`
                });
            }
        });
        
        // Сортируем по частоте использования
        return groups.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10);
    }
    
    areStylesSimilar(style1, style2, threshold = 0.8) {
        // Упрощенная проверка схожести стилей
        const propsToCompare = [
            'backgroundColor', 'color', 'borderRadius', 'fontSize',
            'fontWeight', 'padding'
        ];
        
        let matches = 0;
        propsToCompare.forEach(prop => {
            if (style1[prop] === style2[prop]) matches++;
        });
        
        return matches / propsToCompare.length >= threshold;
    }
}

module.exports = ComponentExtractor;