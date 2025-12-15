class UltraSimpleAnalyzer {
    constructor() {
        this.colorRoles = {
            background: 'Фон',
            text: 'Текст',
            primary: 'Основной',
            accent: 'Акцентный',
            secondary: 'Вторичный'
        };
    }

    async analyzeColors(colorStrings) {
        console.log(`🎨 Processing ${colorStrings.length} color strings`);
        
        try {
            // Парсим все цвета без сложной фильтрации
            const parsedColors = [];
            const seen = new Set();
            
            for (const colorStr of colorStrings) {
                try {
                    const color = this.parseColor(colorStr);
                    if (color && color.a >= 0.3) { // Только слегка прозрачные
                        const key = `${color.r},${color.g},${color.b}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            parsedColors.push({
                                r: color.r,
                                g: color.g, 
                                b: color.b,
                                hex: this.rgbToHex(color.r, color.g, color.b),
                                brightness: this.getBrightness(color.r, color.g, color.b),
                                saturation: this.getSaturation(color.r, color.g, color.b)
                            });
                        }
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
            }

            console.log(`✅ Parsed ${parsedColors.length} unique colors`);
            
            if (parsedColors.length === 0) {
                return this.getEmptyResult();
            }

            // Простая группировка по яркости и насыщенности
            const groups = this.simpleGrouping(parsedColors);
            console.log(`📊 Created ${groups.length} color groups`);
            
            const palette = this.simpleRoleAssignment(groups);
            
            return {
                palette: palette,
                semantics: this.simpleSemanticAnalysis(palette),
                total: colorStrings.length
            };
        } catch (error) {
            console.error('❌ Ultra simple analysis error:', error);
            return this.getEmptyResult();
        }
    }

    simpleGrouping(colors) {
        // Просто берем все цвета и сортируем по значимости
        return colors
            .map(color => ({
                rgb: [color.r, color.g, color.b],
                hex: color.hex,
                brightness: color.brightness,
                saturation: color.saturation,
                count: 1 // Все цвета равны по весу
            }))
            .sort((a, b) => {
                // Сначала насыщенные цвета, затем по контрасту
                if (a.saturation > 50 && b.saturation <= 50) return -1;
                if (b.saturation > 50 && a.saturation <= 50) return 1;
                return Math.abs(b.brightness - 128) - Math.abs(a.brightness - 128);
            })
            .slice(0, 8); // Ограничиваем 8 цветами
    }

    simpleRoleAssignment(groups) {
        if (groups.length === 0) return [];

        const palette = groups.map(group => ({
            rgb: `rgb(${group.rgb[0]}, ${group.rgb[1]}, ${group.rgb[2]})`,
            hex: group.hex,
            count: group.count,
            brightness: group.brightness,
            saturation: group.saturation,
            role: 'additional',
            roleName: 'Дополнительный'
        }));

        const assigned = new Set();

        // 1. ФОН - самый светлый
        const sortedByBrightness = [...palette].sort((a, b) => b.brightness - a.brightness);
        if (sortedByBrightness.length > 0) {
            const background = sortedByBrightness[0];
            if (background.brightness > 200) {
                background.role = 'background';
                background.roleName = this.colorRoles.background;
                assigned.add(background.hex);
            }
        }

        // 2. ТЕКСТ - самый темный
        if (sortedByBrightness.length > 0) {
            const text = sortedByBrightness[sortedByBrightness.length - 1];
            if (text.brightness < 100 && !assigned.has(text.hex)) {
                text.role = 'text';
                text.roleName = this.colorRoles.text;
                assigned.add(text.hex);
            }
        }

        // 3. АКЦЕНТНЫЙ - самый насыщенный
        const sortedBySaturation = [...palette].sort((a, b) => b.saturation - a.saturation);
        const accentCandidate = sortedBySaturation.find(color => 
            !assigned.has(color.hex) && color.saturation > 60
        );
        if (accentCandidate) {
            accentCandidate.role = 'accent';
            accentCandidate.roleName = this.colorRoles.accent;
            assigned.add(accentCandidate.hex);
        }

        // 4. ОСНОВНОЙ - первый не назначенный
        const unassigned = palette.filter(color => !assigned.has(color.hex));
        if (unassigned.length > 0) {
            unassigned[0].role = 'primary';
            unassigned[0].roleName = this.colorRoles.primary;
            assigned.add(unassigned[0].hex);
        }

        // 5. ВТОРИЧНЫЙ - следующий не назначенный
        const remaining = palette.filter(color => !assigned.has(color.hex));
        if (remaining.length > 0) {
            remaining[0].role = 'secondary';
            remaining[0].roleName = this.colorRoles.secondary;
        }

        return palette;
    }

    simpleSemanticAnalysis(palette) {
        return {
            hasGoodContrast: palette.length > 1,
            colorCount: palette.length,
            primaryColor: palette.find(c => c.role === 'primary')?.hex || null,
            accentColor: palette.find(c => c.role === 'accent')?.hex || null,
            isDarkTheme: palette.reduce((sum, c) => sum + c.brightness, 0) / palette.length < 128
        };
    }

    getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    getSaturation(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max === min) return 0;
        const l = (max + min) / 2;
        const s = (max - min) / (1 - Math.abs(2 * l - 1));
        return Math.round(s * 100);
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    parseColor(colorStr) {
        if (!colorStr) return null;
        
        try {
            // HEX
            const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            if (hexMatch) {
                return {
                    r: parseInt(hexMatch[1], 16),
                    g: parseInt(hexMatch[2], 16),
                    b: parseInt(hexMatch[3], 16),
                    a: 1
                };
            }

            // HEX 3-значный
            const hexShortMatch = colorStr.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
            if (hexShortMatch) {
                return {
                    r: parseInt(hexShortMatch[1] + hexShortMatch[1], 16),
                    g: parseInt(hexShortMatch[2] + hexShortMatch[2], 16),
                    b: parseInt(hexShortMatch[3] + hexShortMatch[3], 16),
                    a: 1
                };
            }

            // RGB
            const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
            if (rgbMatch) {
                return {
                    r: parseInt(rgbMatch[1]),
                    g: parseInt(rgbMatch[2]),
                    b: parseInt(rgbMatch[3]),
                    a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
                };
            }
        } catch (e) {
            console.log('Parse color error:', e);
        }
        
        return null;
    }

    getEmptyResult() {
        return {
            palette: [],
            semantics: {},
            total: 0
        };
    }
}

// Убедимся, что экспорт правильный
module.exports = UltraSimpleAnalyzer;