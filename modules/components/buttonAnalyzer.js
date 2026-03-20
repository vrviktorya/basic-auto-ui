// modules/components/buttonAnalyzer.js
const ColorConverter = require('../colors/utils/colorConverter');

class ButtonAnalyzer {
    constructor() {
        this.colorConverter = new ColorConverter();
    }

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
                if (classes.includes('success')) return 'success';
                if (classes.includes('warning')) return 'warning';
                if (classes.includes('info')) return 'info';
                
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
    
    // НОВЫЕ МЕТОДЫ ДЛЯ АНАЛИЗА КНОПОК
    
    // Анализ состояний кнопок (hover, active, focus)
    extractButtonStates(page, buttonElement) {
        // Этот метод требует сложной реализации с Puppeteer
        // Пока возвращаем заглушку
        return {
            normal: buttonElement.styles,
            hover: null,
            active: null,
            focus: null
        };
    }
    
    // Классификация размеров кнопок
    classifyButtonSize(button) {
        const height = button.height || 0;
        const fontSize = parseFloat(button.styles.fontSize) || 16;
        
        if (height < 32 || fontSize < 12) return 'xs';
        if (height < 40 || fontSize < 14) return 'sm';
        if (height < 48 || fontSize < 16) return 'md';
        if (height < 56 || fontSize < 18) return 'lg';
        return 'xl';
    }
    
    // Анализ иконок в кнопках
    analyzeIcons(button) {
        const iconLibraries = {
            'material-symbols-outlined': 'Material Symbols',
            'material-icons': 'Material Icons',
            'fa': 'Font Awesome',
            'fas': 'Font Awesome Solid',
            'fab': 'Font Awesome Brands',
            'bi': 'Bootstrap Icons',
            'ri': 'Remix Icons',
            'icon-': 'Custom Icons'
        };
        
        const iconData = {
            hasIcon: false,
            library: null,
            iconName: null,
            position: 'none' // before, after, only, none
        };
        
        // Простая проверка по классам
        const className = button.className || '';
        for (const [libClass, libName] of Object.entries(iconLibraries)) {
            if (className.includes(libClass)) {
                iconData.hasIcon = true;
                iconData.library = libName;
                break;
            }
        }
        
        // Проверяем наличие иконок в HTML
        if (button.html) {
            const hasSvg = button.html.includes('<svg');
            const hasImg = button.html.includes('<img');
            const hasIconClass = button.html.includes('icon-') || button.html.includes('fa-');
            
            if (hasSvg || hasImg || hasIconClass) {
                iconData.hasIcon = true;
            }
        }
        
        return iconData;
    }
    
    // Улучшенная классификация типа кнопки
    classifyButtonType(button) {
        const styles = button.styles;
        let score = { 
            primary: 0, 
            secondary: 0, 
            outline: 0, 
            text: 0, 
            danger: 0, 
            success: 0,
            warning: 0,
            info: 0
        };
        
        // Анализируем цвета
        const bgColor = styles.backgroundColor;
        const isTransparent = !bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)';
        const hasBorder = styles.borderWidth && styles.borderWidth !== '0px';
        
        // Эвристические правила
        if (!isTransparent && !hasBorder) {
            score.primary += 3;
        }
        
        if (isTransparent && hasBorder) {
            score.outline += 3;
        }
        
        if (isTransparent && !hasBorder) {
            score.text += 3;
        }
        
        // Анализируем цветовые семантики
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
            try {
                const colorObj = this.colorConverter.parseColor(bgColor);
                if (colorObj) {
                    const hsl = this.colorConverter.rgbToHsl(colorObj.r, colorObj.g, colorObj.b);
                    
                    // Красные оттенки (опасные действия)
                    if ((hsl.h >= 0 && hsl.h <= 30) || (hsl.h >= 330 && hsl.h <= 360)) {
                        score.danger += 2;
                    }
                    
                    // Зеленые оттенки (успешные действия)
                    if (hsl.h >= 90 && hsl.h <= 150) {
                        score.success += 2;
                    }
                    
                    // Оранжевые/желтые оттенки (предупреждения)
                    if (hsl.h >= 30 && hsl.h <= 90) {
                        score.warning += 2;
                    }
                    
                    // Синие оттенки (информационные)
                    if (hsl.h >= 180 && hsl.h <= 270) {
                        score.info += 2;
                    }
                }
            } catch (error) {
                console.log('Error parsing color:', bgColor, error);
            }
        }
        
        // Учитываем текст кнопки
        const buttonText = (button.text || '').toLowerCase();
        const dangerTexts = ['удалить', 'отменить', 'стереть', 'очистить', 'delete', 'remove', 'cancel'];
        const successTexts = ['сохранить', 'подтвердить', 'готово', 'save', 'confirm', 'done'];
        const warningTexts = ['предупреждение', 'внимание', 'warning', 'alert'];
        const infoTexts = ['информация', 'подробнее', 'справка', 'info', 'details', 'help'];
        
        if (dangerTexts.some(text => buttonText.includes(text))) {
            score.danger += 2;
        }
        
        if (successTexts.some(text => buttonText.includes(text))) {
            score.success += 2;
        }
        
        if (warningTexts.some(text => buttonText.includes(text))) {
            score.warning += 2;
        }
        
        if (infoTexts.some(text => buttonText.includes(text))) {
            score.info += 2;
        }
        
        // Выбираем тип с максимальным счетом
        const maxType = Object.keys(score).reduce((a, b) => score[a] > score[b] ? a : b);
        const maxScore = score[maxType];
        
        return {
            type: maxType,
            confidence: maxScore / 10 // Нормализуем до 0-1
        };
    }
    
    // Кластеризация кнопок по стилям с улучшенной классификацией
    clusterButtons(buttons) {
        if (!buttons || buttons.length === 0) {
            console.log('No buttons to cluster');
            return {
                primary: null,
                secondary: null,
                outline: null,
                text: null,
                danger: null,
                success: null,
                warning: null,
                info: null,
                icon: null
            };
        }
        
        console.log(`Clustering ${buttons.length} buttons...`);
        
        // Инициализируем кластеры
        const clusters = {
            primary: { buttons: [], confidence: 0 },
            secondary: { buttons: [], confidence: 0 },
            outline: { buttons: [], confidence: 0 },
            text: { buttons: [], confidence: 0 },
            danger: { buttons: [], confidence: 0 },
            success: { buttons: [], confidence: 0 },
            warning: { buttons: [], confidence: 0 },
            info: { buttons: [], confidence: 0 },
            icon: { buttons: [], confidence: 0 }
        };
        
        // Классифицируем каждую кнопку
        buttons.forEach(button => {
            const classification = this.classifyButtonType(button);
            const type = classification.type;
            
            if (clusters[type]) {
                clusters[type].buttons.push(button);
                clusters[type].confidence += classification.confidence;
            }
            
            // Отдельно проверяем на иконки
            const iconData = this.analyzeIcons(button);
            if (iconData.hasIcon) {
                clusters.icon.buttons.push(button);
                clusters.icon.confidence += 0.5;
            }
        });
        
        // Фильтруем пустые кластеры и выбираем лучшие примеры
        const result = {};
        Object.entries(clusters).forEach(([type, cluster]) => {
            if (cluster.buttons.length > 0) {
                // Находим наиболее репрезентативную кнопку
                const representative = this.findBestRepresentative(cluster.buttons, type);
                result[type] = {
                    ...representative,
                    count: cluster.buttons.length,
                    confidence: cluster.buttons.length > 0 ? 
                        cluster.confidence / cluster.buttons.length : 0,
                    size: this.classifyButtonSize(representative),
                    iconData: this.analyzeIcons(representative)
                };
                console.log(`Group ${type}: ${cluster.buttons.length} buttons, representative: ${representative?.text}`);
            } else {
                result[type] = null;
            }
        });
        
        return result;
    }
    
    // Нахождение лучшего представителя кластера
    findBestRepresentative(buttons, type) {
        if (buttons.length === 0) return null;
        if (buttons.length === 1) return buttons[0];
        
        // Сортируем по релевантности для типа
        const sortedButtons = [...buttons].sort((a, b) => {
            const scoreA = this.calculateButtonRelevance(a, type);
            const scoreB = this.calculateButtonRelevance(b, type);
            return scoreB - scoreA; // По убыванию
        });
        
        return sortedButtons[0];
    }
    
    // Расчет релевантности кнопки для типа
    calculateButtonRelevance(button, type) {
        let score = 0;
        
        // Размер кнопки (средние размеры обычно лучше)
        const height = button.height || 0;
        if (height >= 40 && height <= 60) score += 2;
        
        // Наличие текста
        if (button.text && button.text.trim().length > 0) score += 2;
        
        // Качество стилей
        const styles = button.styles;
        if (styles.backgroundColor && styles.backgroundColor !== 'transparent') score += 1;
        if (styles.borderRadius && styles.borderRadius !== '0px') score += 1;
        if (styles.fontSize && parseFloat(styles.fontSize) >= 14) score += 1;
        
        return score;
    }
    
    // Поиск наиболее представительной кнопки в группе (старый метод для обратной совместимости)
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