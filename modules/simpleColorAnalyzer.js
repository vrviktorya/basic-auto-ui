class SimpleColorAnalyzer {
    constructor() {
        this.colorRoles = {
            background: 'Фон',
            text: 'Текст',
            primary: 'Основной',
            secondary: 'Вторичный', 
            accent: 'Акцентный',
            surface: 'Поверхность',
            border: 'Граница'
        };
    }

    async analyzeColors(colorStrings) {
        console.log(`🎨 Analyzing ${colorStrings.length} color strings`);
        
        try {
            const validColors = this.filterAndParseColors(colorStrings);
            console.log(`✅ Valid colors after parsing: ${validColors.length}`);
            
            if (validColors.length === 0) {
                return { 
                    palette: [], 
                    semantics: {}, 
                    total: 0,
                    debug: { rawColors: colorStrings.length, validColors: 0 }
                };
            }

            // Простая группировка по яркости
            const groups = this.simpleGrouping(validColors);
            console.log(`📊 Created ${groups.length} color groups`);
            
            const palette = this.assignColorSemantics(groups);
            
            return {
                palette: palette,
                semantics: this.analyzeColorSemantics(palette),
                total: validColors.length,
                debug: {
                    rawColors: colorStrings.length,
                    validColors: validColors.length,
                    groups: groups.length
                }
            };
        } catch (error) {
            console.error('❌ Color analysis error:', error);
            return { 
                palette: [], 
                semantics: {}, 
                total: 0,
                error: error.message 
            };
        }
    }

    // Упрощенная группировка цветов
    simpleGrouping(colors) {
        if (colors.length === 0) return [];
        
        const groups = [];
        const brightnessThreshold = 50;

        colors.forEach(color => {
            const brightness = this.getBrightness(color.r, color.g, color.b);
            let foundGroup = false;
            
            for (let group of groups) {
                if (Math.abs(brightness - group.brightness) < brightnessThreshold) {
                    group.count++;
                    group.colors.push(color);
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                groups.push({
                    rgb: [color.r, color.g, color.b],
                    brightness: brightness,
                    count: 1,
                    colors: [color]
                });
            }
        });

        // Сортируем по частоте использования и ограничиваем до 8 групп
        return groups.sort((a, b) => b.count - a.count).slice(0, 8);
    }

    assignColorSemantics(groups) {
        const palette = groups.map(group => {
            const rgb = group.rgb;
            const hex = this.rgbToHex(rgb[0], rgb[1], rgb[2]);
            const hsl = this.rgbToHsl(rgb[0], rgb[1], rgb[2]);
            
            return {
                rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                hex: hex,
                count: group.count,
                hsl: hsl,
                brightness: group.brightness,
                saturation: hsl.s,
                role: 'additional',
                roleName: 'Дополнительный'
            };
        });

        // Сортируем по яркости
        palette.sort((a, b) => a.brightness - b.brightness);

        // Назначаем роли
        return this.assignRoles(palette);
    }

    assignRoles(palette) {
        if (palette.length === 0) return palette;

        const roles = [...palette];
        
        // 1. Самый светлый - фон
        const lightest = roles[roles.length - 1];
        if (lightest.brightness > 200) {
            lightest.role = 'background';
            lightest.roleName = this.colorRoles.background;
        }

        // 2. Самый темный - текст
        const darkest = roles[0];
        if (darkest.brightness < 100) {
            darkest.role = 'text';
            darkest.roleName = this.colorRoles.text;
        }

        // 3. Самый частый - основной
        const mostFrequent = roles.reduce((prev, current) => 
            prev.count > current.count ? prev : current
        );
        if (mostFrequent.role === 'additional') {
            mostFrequent.role = 'primary';
            mostFrequent.roleName = this.colorRoles.primary;
        }

        // 4. Самый насыщенный - акцентный
        const mostSaturated = roles.reduce((prev, current) => 
            prev.saturation > current.saturation ? prev : current
        );
        if (mostSaturated.role === 'additional' && mostSaturated.saturation > 30) {
            mostSaturated.role = 'accent';
            mostSaturated.roleName = this.colorRoles.accent;
        }

        // 5. Остальные - вторичные
        roles.forEach(color => {
            if (color.role === 'additional') {
                color.role = 'secondary';
                color.roleName = this.colorRoles.secondary;
            }
        });

        return roles;
    }

    // В методе analyzeColorSemantics добавляем больше данных:
analyzeColorSemantics(palette) {
    const semantics = {
        hasGoodContrast: false,
        colorCount: palette.length,
        primaryColor: null,
        accentColor: null,
        isDarkTheme: false,
        averageBrightness: 0,
        accessibilityScore: 0,
        saturatedColors: 0,
        neutralColors: 0
    };

    if (palette.length === 0) return semantics;

    const background = palette.find(color => color.role === 'background');
    const text = palette.find(color => color.role === 'text');
    const primary = palette.find(color => color.role === 'primary');
    const accent = palette.find(color => color.role === 'accent');

    if (background && text) {
        semantics.hasGoodContrast = Math.abs(background.brightness - text.brightness) > 125;
    }

    if (primary) semantics.primaryColor = primary.hex;
    if (accent) semantics.accentColor = accent.hex;

    // Рассчитываем среднюю яркость
    semantics.averageBrightness = palette.reduce((sum, color) => sum + color.brightness, 0) / palette.length;
    semantics.isDarkTheme = semantics.averageBrightness < 128;

    // Оценка доступности
    let accessibilityScore = 5; // Базовая оценка
    if (semantics.hasGoodContrast) accessibilityScore += 3;
    if (semantics.primaryColor && semantics.accentColor) accessibilityScore += 2;
    semantics.accessibilityScore = Math.min(10, accessibilityScore);

    // Подсчет насыщенных и нейтральных цветов
    semantics.saturatedColors = palette.filter(color => color.saturation > 50).length;
    semantics.neutralColors = palette.filter(color => color.saturation < 20).length;

    return semantics;
}

    // Вспомогательные методы
    filterAndParseColors(colorStrings) {
        const validColors = [];
        
        colorStrings.forEach(colorStr => {
            try {
                const color = this.parseColor(colorStr);
                if (color && this.isValidColor(color)) {
                    validColors.push(color);
                }
            } catch (error) {
                // Пропускаем невалидные цвета
            }
        });

        return validColors;
    }

    parseColor(colorStr) {
        if (!colorStr) return null;
        
        // Убираем пробелы
        const cleanStr = colorStr.replace(/\s+/g, '');
        
        // Парсим RGB/RGBA
        const rgbMatch = cleanStr.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
                a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
                original: colorStr
            };
        }

        // Парсим HEX
        const hexMatch = cleanStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
            return {
                r: parseInt(hexMatch[1], 16),
                g: parseInt(hexMatch[2], 16),
                b: parseInt(hexMatch[3], 16),
                a: 1,
                original: colorStr
            };
        }

        return null;
    }

    isValidColor(color) {
        // Более мягкая валидация
        if (color.a < 0.05) return false; // Очень прозрачные цвета
        if (color.r === 0 && color.g === 0 && color.b === 0 && color.a < 0.1) return false;
        
        return color.r >= 0 && color.r <= 255 &&
               color.g >= 0 && color.g <= 255 &&
               color.b >= 0 && color.b <= 255;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }
}

module.exports = SimpleColorAnalyzer;