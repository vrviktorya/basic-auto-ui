// modules/components/buttonStateAnalyzer.js
class ButtonStateAnalyzer {
    constructor() {
        this.stateSelectors = {
            hover: ':hover',
            active: ':active',
            focus: ':focus',
            disabled: ':disabled',
            focusVisible: ':focus-visible',
            focusWithin: ':focus-within'
        };
    }

    async extractButtonStates(page, buttonElement) {
        console.log('🔍 Extracting button states...');
        
        const states = await page.evaluate((element, stateSelectors) => {
            const getStateStyles = (stateSelector) => {
                const styles = {};
                try {
                    // Создаем временный элемент с таким же классом
                    const tempElement = document.createElement('div');
                    tempElement.className = element.className;
                    tempElement.style.cssText = window.getComputedStyle(element).cssText;
                    
                    // Добавляем класс состояния
                    const stateClass = `state-${Date.now()}`;
                    const styleTag = document.createElement('style');
                    styleTag.textContent = `.${stateClass}${stateSelector} {
                        ${Object.entries(window.getComputedStyle(element)).map(([key]) => 
                            `${key}: var(--state-${key}, inherit);`
                        ).join('\n')}
                    }`;
                    document.head.appendChild(styleTag);
                    
                    tempElement.classList.add(stateClass);
                    document.body.appendChild(tempElement);
                    
                    // Пытаемся получить стили
                    const computed = window.getComputedStyle(tempElement);
                    
                    // Сравниваем с оригинальными стилями
                    const original = window.getComputedStyle(element);
                    const differentStyles = {};
                    
                    // Проверяем основные свойства
                    const importantProperties = [
                        'backgroundColor', 'color', 'borderColor', 'borderWidth',
                        'borderRadius', 'boxShadow', 'transform', 'opacity',
                        'textDecoration', 'outline', 'outlineColor'
                    ];
                    
                    importantProperties.forEach(prop => {
                        const stateValue = computed[prop];
                        const originalValue = original[prop];
                        if (stateValue !== originalValue && stateValue) {
                            differentStyles[prop] = stateValue;
                        }
                    });
                    
                    document.body.removeChild(tempElement);
                    document.head.removeChild(styleTag);
                    
                    return differentStyles;
                } catch (error) {
                    console.error('Error extracting state styles:', error);
                    return {};
                }
            };

            const result = {};
            Object.entries(stateSelectors).forEach(([state, selector]) => {
                result[state] = getStateStyles(selector);
            });

            return result;
        }, buttonElement, this.stateSelectors);

        return states;
    }

    // Альтернативный метод через анализ CSS-правил
    analyzeCSSRulesForStates(cssRules, buttonSelector) {
        const states = {};
        
        cssRules.forEach(rule => {
            if (rule.type === CSSRule.STYLE_RULE) {
                const selectorText = rule.selectorText;
                
                Object.entries(this.stateSelectors).forEach(([state, stateSelector]) => {
                    // Проверяем, применяется ли правило к кнопке с состоянием
                    if (selectorText.includes(stateSelector) && 
                        (selectorText.includes(buttonSelector) || 
                         this.matchesButton(selectorText, buttonSelector))) {
                        
                        const stateStyles = {};
                        for (let i = 0; i < rule.style.length; i++) {
                            const property = rule.style[i];
                            stateStyles[property] = rule.style[property];
                        }
                        
                        if (Object.keys(stateStyles).length > 0) {
                            states[state] = stateStyles;
                        }
                    }
                });
            }
        });
        
        return states;
    }

    matchesButton(selector, buttonSelector) {
        // Упрощенная проверка соответствия селектора
        const buttonClasses = buttonSelector.split('.');
        if (buttonClasses.length > 1) {
            const buttonClass = buttonClasses[1].split(' ')[0];
            return selector.includes(`.${buttonClass}`);
        }
        return false;
    }

    // Генерация CSS для состояний на основе базовых стилей
    generateStateCSS(baseStyles, state) {
        const stateCSS = { ...baseStyles };
        
        switch (state) {
            case 'hover':
                // Усиливаем тень и добавляем эффект подъема
                if (stateCSS.boxShadow && stateCSS.boxShadow !== 'none') {
                    stateCSS.boxShadow = this.intensifyShadow(stateCSS.boxShadow);
                } else {
                    stateCSS.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
                stateCSS.transform = 'translateY(-2px)';
                stateCSS.cursor = 'pointer';
                break;
                
            case 'active':
                // Эффект нажатия
                stateCSS.transform = 'translateY(0)';
                stateCSS.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                break;
                
            case 'focus':
                // Фокусное состояние
                stateCSS.outline = '2px solid rgba(66, 153, 225, 0.5)';
                stateCSS.outlineOffset = '2px';
                break;
                
            case 'disabled':
                // Неактивное состояние
                stateCSS.opacity = '0.6';
                stateCSS.cursor = 'not-allowed';
                break;
        }
        
        return stateCSS;
    }

    intensifyShadow(shadow) {
        // Усиление тени для hover состояния
        return shadow.replace(/rgba\(([^)]+)\)/g, (match, rgba) => {
            const values = rgba.split(',').map(v => v.trim());
            if (values.length === 4) {
                const alpha = parseFloat(values[3]);
                return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${Math.min(alpha * 1.5, 1)})`;
            }
            return match;
        });
    }

    // Объединение реальных и сгенерированных состояний
    mergeButtonStates(realStates, baseStyles) {
        const allStates = ['hover', 'active', 'focus', 'disabled'];
        const result = {};
        
        allStates.forEach(state => {
            if (realStates[state] && Object.keys(realStates[state]).length > 0) {
                // Используем реальные стили
                result[state] = realStates[state];
            } else {
                // Генерируем стили на основе базовых
                result[state] = this.generateStateCSS(baseStyles, state);
            }
        });
        
        return result;
    }
}

module.exports = ButtonStateAnalyzer;