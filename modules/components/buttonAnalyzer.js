// modules/components/buttonAnalyzer.js
class ButtonAnalyzer {
    async extractButtons(page) {
        console.log('🔍 Starting detailed button analysis...');
        
        return await page.evaluate(() => {
            // Вспомогательные функции внутри контекста страницы
            const isButtonLike = (element, style, rect, text) => {
                const tag = element.tagName.toLowerCase();
                const classes = element.className.toLowerCase();
                const textLower = text.toLowerCase();
                
                // Явные признаки кнопки
                if (tag === 'button') return true;
                if (tag === 'input' && ['button', 'submit', 'reset'].includes(element.type)) return true;
                if (element.getAttribute('role') === 'button') return true;
                
                // Классы, указывающие на кнопку
                const buttonClasses = ['btn', 'button', 'cta', 'action', 'primary', 'secondary', 'outline'];
                const hasButtonClass = buttonClasses.some(cls => classes.includes(cls));
                if (hasButtonClass) return true;
                
                // Визуальные признаки
                const hasBackground = style.backgroundColor && 
                                    style.backgroundColor !== 'transparent' && 
                                    style.backgroundColor !== 'rgba(0, 0, 0, 0)';
                const hasBorder = style.borderWidth && style.borderWidth !== '0px';
                const hasBorderRadius = style.borderRadius && style.borderRadius !== '0px';
                const hasPointerCursor = style.cursor === 'pointer';
                const reasonableSize = rect.width >= 40 && rect.height >= 20 && rect.width <= 500;
                
                // Текстовые признаки кнопки
                const buttonTexts = ['купить', 'заказать', 'отправить', 'подробнее', 'скачать', 'узнать', 'подключить', 'перейти', 'связаться', 'открыть', 'далее', 'получить', 'оформить', 'посмотреть', 'забронировать',
                                   'начать', 'войти', 'регистрация', 'contact', 'submit', 'send', 
                                   'download', 'learn', 'get', 'try', 'shop', 'buy', 'read', 'open'];
                const hasButtonText = buttonTexts.some(btnText => textLower.includes(btnText));
                
                // Оценка "кнопочности"
                let score = 0;
                if (hasBackground) score += 2;
                if (hasBorder) score += 1;
                if (hasBorderRadius) score += 1;
                if (hasPointerCursor) score += 2;
                if (reasonableSize) score += 2;
                if (hasButtonText) score += 3;
                if (element.hasAttribute('onclick')) score += 2;
                if (element.hasAttribute('href')) score += 1;
                
                return score >= 3;
            };
            
            const classifyButton = (element, style, text) => {
                const classes = element.className.toLowerCase();
                const textLower = text.toLowerCase();
                const bgColor = style.backgroundColor;
                
                // Проверяем классы
                if (classes.includes('primary')) return 'primary';
                if (classes.includes('secondary')) return 'secondary';
                if (classes.includes('outline')) return 'outline';
                if (classes.includes('text')) return 'text';
                if (classes.includes('ghost')) return 'ghost';
                if (classes.includes('danger') || classes.includes('error')) return 'danger';
                
                // Определяем по стилям
                const isTransparent = !bgColor || 
                                     bgColor === 'transparent' || 
                                     bgColor === 'rgba(0, 0, 0, 0)';
                const hasBorder = style.borderWidth && style.borderWidth !== '0px';
                
                if (hasBorder && isTransparent) return 'outline';
                if (isTransparent && !hasBorder) return 'text';
                
                // По тексту
                const primaryTexts = ['купить', 'заказать', 'отправить', 'купить сейчас', 'оформить', 'связаться', 'открыть', 'далее', 'получить', 'забронировать', 'регистрация', 'submit', 'send', 'buy'];
                if (primaryTexts.some(t => textLower.includes(t))) return 'primary';
                
                return 'primary'; // По умолчанию
            };
            
            const validateButton = (buttonData) => {
                if (!buttonData.styles) return false;
                
                // Проверяем наличие основных свойств
                if (!buttonData.styles.backgroundColor && 
                    !buttonData.styles.borderColor && 
                    !buttonData.text) {
                    return false;
                }
                
                return true;
            };

            const buttons = [];
            
            // Основные селекторы для поиска кнопок
            const buttonSelectors = [
                'button',
                'input[type="button"]',
                'input[type="submit"]',
                'input[type="reset"]',
                '.btn',
                '.Btn',
                '.button',
                '.Button',
                '[class*="btn"]',
                '[class*="button"]',
                '[class*="Button"]',
                '[class*="Btn"]',
                'a.btn',
                'a.button',
                'a[class*="btn"]',
                'a[class*="button"]',
                '[role="button"]'
            ];

            // Собираем все элементы-кандидаты
            const allElements = [];
            buttonSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (!allElements.includes(el)) {
                            allElements.push(el);
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки селекторов
                }
            });

            console.log(`Found ${allElements.length} potential button elements`);

            allElements.forEach((element, index) => {
                try {
                    const style = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    
                    // Пропускаем невидимые элементы
                    if (style.display === 'none' || 
                        style.visibility === 'hidden' || 
                        rect.width === 0 || 
                        rect.height === 0) {
                        return;
                    }

                    // Получаем текст кнопки
                    let buttonText = '';
                    if (element.tagName.toLowerCase() === 'input') {
                        buttonText = element.value || '';
                    } else {
                        // Убираем пробелы и переносы строк
                        buttonText = element.textContent
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 50);
                    }

                    // Пропускаем элементы без текста (если это не иконка)
                    if (!buttonText && !element.querySelector('img, svg, i, .icon')) {
                        return;
                    }

                    // Определяем, является ли элемент кнопкой по стилям
                    if (!isButtonLike(element, style, rect, buttonText)) {
                        return;
                    }

                    // Собираем все CSS-свойства
                    const buttonData = {
                        // Информация об элементе
                        tagName: element.tagName.toLowerCase(),
                        className: element.className,
                        id: element.id,
                        html: element.outerHTML.substring(0, 200),
                        
                        // Размеры
                        width: rect.width,
                        height: rect.height,
                        
                        // Текст
                        text: buttonText,
                        hasIcon: element.querySelector('img, svg, i, .icon, .material-icons') !== null,
                        
                        // Стили
                        styles: {
                            // Отступы
                            padding: {
                                top: style.paddingTop,
                                right: style.paddingRight,
                                bottom: style.paddingBottom,
                                left: style.paddingLeft
                            },
                            margin: {
                                top: style.marginTop,
                                right: style.marginRight,
                                bottom: style.marginBottom,
                                left: style.marginLeft
                            },
                            
                            // Границы
                            borderWidth: style.borderWidth,
                            borderStyle: style.borderStyle,
                            borderColor: style.borderColor,
                            borderRadius: style.borderRadius,
                            borderTopLeftRadius: style.borderTopLeftRadius,
                            borderTopRightRadius: style.borderTopRightRadius,
                            borderBottomLeftRadius: style.borderBottomLeftRadius,
                            borderBottomRightRadius: style.borderBottomRightRadius,
                            
                            // Цвета
                            backgroundColor: style.backgroundColor,
                            color: style.color,
                            backgroundImage: style.backgroundImage,
                            
                            // Текст
                            fontFamily: style.fontFamily,
                            fontSize: style.fontSize,
                            fontWeight: style.fontWeight,
                            lineHeight: style.lineHeight,
                            letterSpacing: style.letterSpacing,
                            textAlign: style.textAlign,
                            textTransform: style.textTransform,
                            textDecoration: style.textDecoration,
                            
                            // Эффекты
                            boxShadow: style.boxShadow,
                            textShadow: style.textShadow,
                            opacity: style.opacity,
                            
                            // Размещение
                            display: style.display,
                            justifyContent: style.justifyContent,
                            alignItems: style.alignItems,
                            flexDirection: style.flexDirection,
                            gap: style.gap,
                            
                            // Курсор
                            cursor: style.cursor,
                            
                            // Переходы
                            transition: style.transition,
                            transitionDuration: style.transitionDuration
                        },
                        
                        // Классификация
                        type: classifyButton(element, style, buttonText)
                    };
                    
                    // Добавляем только если это похоже на кнопку
                    if (validateButton(buttonData)) {
                        buttons.push(buttonData);
                        console.log(`Added button ${index}: ${buttonText} (${buttonData.styles.backgroundColor})`);
                    }
                } catch (error) {
                    console.error('Error processing button element:', error);
                }
            });
            
            console.log(`Total valid buttons found: ${buttons.length}`);
            return buttons;
        });
    }
    
    // Кластеризация кнопок по стилям
    clusterButtons(buttons) {
        if (!buttons || buttons.length === 0) {
            console.log('No buttons to cluster');
            return {
                primary: null,
                secondary: null,
                outline: null,
                text: null,
                icon: null
            };
        }
        
        console.log(`Clustering ${buttons.length} buttons...`);
        
        // Группируем по типу
        const groups = {
            primary: [],
            secondary: [],
            outline: [],
            text: [],
            icon: [],
            other: []
        };
        
        buttons.forEach(button => {
            const type = button.type || 'primary';
            if (groups[type]) {
                groups[type].push(button);
            } else {
                groups.other.push(button);
            }
        });
        
        // Если нет primary, используем самую частую группу
        if (groups.primary.length === 0) {
            let maxGroup = 'other';
            let maxCount = 0;
            
            Object.entries(groups).forEach(([groupName, groupButtons]) => {
                if (groupButtons.length > maxCount && groupName !== 'other') {
                    maxCount = groupButtons.length;
                    maxGroup = groupName;
                }
            });
            
            if (maxGroup !== 'other') {
                groups.primary = groups[maxGroup];
                groups[maxGroup] = [];
            }
        }
        
        // Находим наиболее представительную кнопку в каждой группе
        const result = {};
        
        Object.entries(groups).forEach(([groupName, groupButtons]) => {
            if (groupButtons.length > 0) {
                result[groupName] = this.findRepresentativeButton(groupButtons);
                console.log(`Group ${groupName}: ${groupButtons.length} buttons, representative: ${result[groupName]?.text}`);
            } else {
                result[groupName] = null;
            }
        });
        
        return result;
    }
    
    // Поиск наиболее представительной кнопки в группе
    findRepresentativeButton(buttons) {
        if (buttons.length === 0) return null;
        if (buttons.length === 1) return buttons[0];
        
        // Находим кнопку с наибольшей шириной (обычно основная кнопка больше)
        const sortedBySize = [...buttons].sort((a, b) => {
            const sizeA = a.width * a.height;
            const sizeB = b.width * b.height;
            return sizeB - sizeA; // По убыванию
        });
        
        return sortedBySize[0];
    }
    
    // Получение CSS-строки для кнопки
    getButtonCSS(button, className) {
        if (!button || !button.styles) return '';
        
        const styles = button.styles;
        
        return `
.${className} {
    ${styles.backgroundColor ? `background-color: ${styles.backgroundColor};` : ''}
    ${styles.color ? `color: ${styles.color};` : ''}
    ${styles.borderColor && styles.borderWidth !== '0px' ? 
        `border: ${styles.borderWidth} ${styles.borderStyle} ${styles.borderColor};` : 
        styles.borderWidth && styles.borderWidth !== '0px' ? `border: ${styles.borderWidth} solid ${styles.borderColor || 'currentColor'};` : ''
    }
    ${styles.borderRadius ? `border-radius: ${styles.borderRadius};` : ''}
    ${styles.padding ? `padding: ${styles.padding.top} ${styles.padding.right} ${styles.padding.bottom} ${styles.padding.left};` : ''}
    ${styles.fontFamily ? `font-family: ${styles.fontFamily};` : ''}
    ${styles.fontSize ? `font-size: ${styles.fontSize};` : ''}
    ${styles.fontWeight ? `font-weight: ${styles.fontWeight};` : ''}
    ${styles.lineHeight ? `line-height: ${styles.lineHeight};` : ''}
    ${styles.textAlign ? `text-align: ${styles.textAlign};` : ''}
    ${styles.textTransform ? `text-transform: ${styles.textTransform};` : ''}
    ${styles.boxShadow && styles.boxShadow !== 'none' ? `box-shadow: ${styles.boxShadow};` : ''}
    ${styles.transition ? `transition: ${styles.transition};` : 'transition: all 0.3s ease;'}
    display: ${styles.display || 'inline-block'};
    cursor: ${styles.cursor || 'pointer'};
    text-decoration: ${styles.textDecoration || 'none'};
}`;
    }
}

module.exports = ButtonAnalyzer;