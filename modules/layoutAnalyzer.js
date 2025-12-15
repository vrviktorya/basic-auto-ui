class LayoutAnalyzer {
    constructor() {
        this.layoutPatterns = {
            containers: {},
            grids: [],
            flexboxes: [],
            spacing: {},
            sections: []
        };
    }

    async analyzePageLayout(page) {
        console.log('📐 Analyzing layout and composition...');
        
        const layoutData = await page.evaluate(() => {
            const data = {
                containers: {},
                grids: [],
                flexboxes: [],
                spacing: {},
                sections: [],
                commonWidths: {},
                commonHeights: {}
            };

            // Анализ всех элементов
            const allElements = document.querySelectorAll('*');
            
            allElements.forEach(element => {
                try {
                    const style = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    
                    // Игнорируем скрытые элементы
                    if (rect.width === 0 || rect.height === 0 || 
                        style.display === 'none' || style.visibility === 'hidden') {
                        return;
                    }

                    // Анализ display свойств
                    const display = style.display;
                    const isGrid = display === 'grid' || display === 'inline-grid';
                    const isFlex = display === 'flex' || display === 'inline-flex';
                    
                    // Анализ контейнеров (ширина, отступы)
                    if (element.clientWidth > 100) { // Игнорируем мелкие элементы
                        const width = Math.round(rect.width);
                        const height = Math.round(rect.height);
                        
                        // Собираем статистику по ширинам
                        if (width > 200 && width < 2000) {
                            const roundedWidth = Math.round(width / 50) * 50; // Группируем по 50px
                            data.commonWidths[roundedWidth] = (data.commonWidths[roundedWidth] || 0) + 1;
                        }
                        
                        // Анализ отступов
                        const margin = {
                            top: parseInt(style.marginTop) || 0,
                            right: parseInt(style.marginRight) || 0,
                            bottom: parseInt(style.marginBottom) || 0,
                            left: parseInt(style.marginLeft) || 0
                        };
                        
                        const padding = {
                            top: parseInt(style.paddingTop) || 0,
                            right: parseInt(style.paddingRight) || 0,
                            bottom: parseInt(style.paddingBottom) || 0,
                            left: parseInt(style.paddingLeft) || 0
                        };
                        
                        // Сохраняем частые отступы
                        Object.values(margin).forEach(m => {
                            if (m > 0) data.spacing[m] = (data.spacing[m] || 0) + 1;
                        });
                        
                        Object.values(padding).forEach(p => {
                            if (p > 0) data.spacing[p] = (data.spacing[p] || 0) + 1;
                        });
                        
                        // Анализ сеток
                        if (isGrid) {
                            const gridData = {
                                columns: style.gridTemplateColumns,
                                rows: style.gridTemplateRows,
                                gap: style.gap,
                                width: width,
                                height: height,
                                elementCount: element.children.length
                            };
                            data.grids.push(gridData);
                        }
                        
                        // Анализ flexbox
                        if (isFlex) {
                            const flexData = {
                                direction: style.flexDirection,
                                wrap: style.flexWrap,
                                justifyContent: style.justifyContent,
                                alignItems: style.alignItems,
                                width: width,
                                elementCount: element.children.length
                            };
                            data.flexboxes.push(flexData);
                        }
                        
                        // Выявление секций (большие контейнеры с контентом)
                        if (width > 600 && element.children.length >= 3) {
                            const tagName = element.tagName.toLowerCase();
                            const id = element.id || '';
                            const className = element.className || '';
                            
                            // Ищем секции по классам, ID или тегам
                            const isSection = tagName === 'section' || 
                                            tagName === 'main' || 
                                            tagName === 'article' ||
                                            className.includes('section') ||
                                            className.includes('hero') ||
                                            className.includes('features') ||
                                            className.includes('services') ||
                                            id.includes('section') ||
                                            id.includes('hero');
                            
                            if (isSection) {
                                data.sections.push({
                                    tag: tagName,
                                    id: id,
                                    className: className,
                                    width: width,
                                    height: height,
                                    children: element.children.length,
                                    background: style.backgroundColor,
                                    padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Игнорируем ошибки при анализе отдельных элементов
                }
            });

            // Анализ viewport и общих размеров
            data.viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            // Поиск основного контейнера (обычно с максимальной шириной)
            const mainContainers = Array.from(document.querySelectorAll('div, main, section'))
                .filter(el => {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 1000 && 
                           style.maxWidth && 
                           style.maxWidth !== 'none' && 
                           !style.maxWidth.includes('100%');
                })
                .map(el => {
                    const style = window.getComputedStyle(el);
                    return {
                        maxWidth: style.maxWidth,
                        width: el.clientWidth,
                        margin: style.margin,
                        padding: style.padding
                    };
                });

            if (mainContainers.length > 0) {
                data.mainContainer = mainContainers[0];
            }

            return data;
        });

        // Обработка и группировка данных
        return this.processLayoutData(layoutData);
    }

    processLayoutData(rawData) {
        // Находим наиболее частые отступы
        const commonSpacing = Object.entries(rawData.spacing)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([value, count]) => parseInt(value))
            .sort((a, b) => a - b);

        // Находим наиболее частые ширины
        const commonWidths = Object.entries(rawData.commonWidths)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([width, count]) => parseInt(width))
            .sort((a, b) => a - b);

        // Анализ преобладающих layout паттернов
        const layoutPatterns = this.detectLayoutPatterns(rawData);

        return {
            spacing: {
                values: commonSpacing,
                unit: 'px',
                base: commonSpacing[0] || 16
            },
            containers: {
                widths: commonWidths,
                mainWidth: rawData.mainContainer?.maxWidth || '1200px',
                maxWidth: Math.max(...commonWidths) || 1200
            },
            grids: {
                count: rawData.grids.length,
                commonGap: this.findMostCommonValue(rawData.grids.map(g => g.gap)),
                commonColumns: this.findMostCommonValue(rawData.grids.map(g => g.columns))
            },
            flexboxes: {
                count: rawData.flexboxes.length,
                commonDirection: this.findMostCommonValue(rawData.flexboxes.map(f => f.direction)) || 'row',
                commonJustify: this.findMostCommonValue(rawData.flexboxes.map(f => f.justifyContent)) || 'flex-start',
                commonAlign: this.findMostCommonValue(rawData.flexboxes.map(f => f.alignItems)) || 'stretch'
            },
            sections: {
                count: rawData.sections.length,
                types: this.groupSectionsByType(rawData.sections),
                commonPadding: this.findMostCommonValue(rawData.sections.map(s => s.padding)) || '40px 0'
            },
            patterns: layoutPatterns,
            viewport: rawData.viewport
        };
    }

    detectLayoutPatterns(data) {
        const patterns = {
            hasHeroSection: false,
            hasGridLayout: false,
            hasCardGrid: false,
            hasSidebar: false,
            isCentered: false,
            isFullWidth: false
        };

        // Проверяем наличие hero секции
        patterns.hasHeroSection = data.sections.some(s => 
            s.className.includes('hero') || 
            s.id.includes('hero') ||
            (s.height > 400 && s.children > 2)
        );

        // Проверяем использование grid
        patterns.hasGridLayout = data.grids.length > 3;
        
        // Проверяем карточную сетку
        patterns.hasCardGrid = data.grids.some(grid => 
            grid.elementCount >= 3 && 
            grid.gap && 
            grid.gap !== 'normal' && 
            grid.gap !== '0px'
        );

        // Проверяем выравнивание основного контейнера
        if (data.mainContainer) {
            const margin = data.mainContainer.margin;
            patterns.isCentered = margin.includes('auto');
            patterns.isFullWidth = data.mainContainer.maxWidth === '100%' || 
                                 data.mainContainer.maxWidth.includes('100%');
        }

        return patterns;
    }

    groupSectionsByType(sections) {
        const types = {};
        
        sections.forEach(section => {
            let type = 'generic';
            
            if (section.className.includes('hero') || section.id.includes('hero')) {
                type = 'hero';
            } else if (section.className.includes('feature') || section.id.includes('feature')) {
                type = 'features';
            } else if (section.className.includes('service') || section.id.includes('service')) {
                type = 'services';
            } else if (section.className.includes('testimonial') || section.id.includes('testimonial')) {
                type = 'testimonials';
            } else if (section.className.includes('contact') || section.id.includes('contact')) {
                type = 'contact';
            } else if (section.className.includes('footer') || section.id.includes('footer')) {
                type = 'footer';
            }
            
            types[type] = (types[type] || 0) + 1;
        });
        
        return types;
    }

    findMostCommonValue(array) {
        if (!array || array.length === 0) return null;
        
        const frequency = {};
        let maxCount = 0;
        let mostCommon = null;
        
        array.forEach(value => {
            if (value && value !== 'normal' && value !== '0px') {
                frequency[value] = (frequency[value] || 0) + 1;
                if (frequency[value] > maxCount) {
                    maxCount = frequency[value];
                    mostCommon = value;
                }
            }
        });
        
        return mostCommon;
    }

    generateLayoutTokens(layoutData) {
        const tokens = {};
        
        // Генерация spacing tokens
        tokens.spacing = {};
        if (layoutData.spacing.values.length > 0) {
            const base = layoutData.spacing.base;
            layoutData.spacing.values.forEach((value, index) => {
                tokens.spacing[`spacing-${index + 1}`] = `${value}px`;
            });
            
            // Добавляем относительные токены
            tokens.spacing['spacing-xs'] = `${Math.round(base * 0.25)}px`;
            tokens.spacing['spacing-sm'] = `${Math.round(base * 0.5)}px`;
            tokens.spacing['spacing-md'] = `${base}px`;
            tokens.spacing['spacing-lg'] = `${base * 2}px`;
            tokens.spacing['spacing-xl'] = `${base * 3}px`;
        }
        
        // Генерация container tokens
        tokens.containers = {};
        if (layoutData.containers.widths.length > 0) {
            layoutData.containers.widths.forEach((width, index) => {
                tokens.containers[`container-${index + 1}`] = `${width}px`;
            });
            tokens.containers['container-max'] = `${layoutData.containers.maxWidth}px`;
        }
        
        // Генерация grid tokens
        tokens.grid = {
            gap: layoutData.grids.commonGap || '24px',
            columns: layoutData.grids.commonColumns || 'repeat(auto-fit, minmax(300px, 1fr))'
        };
        
        // Генерация flex tokens
        tokens.flex = {
            direction: layoutData.flexboxes.commonDirection || 'row',
            justify: layoutData.flexboxes.commonJustify || 'flex-start',
            align: layoutData.flexboxes.commonAlign || 'stretch'
        };
        
        return tokens;
    }
}

module.exports = LayoutAnalyzer;