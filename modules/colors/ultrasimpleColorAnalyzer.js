class UltraSimpleColorAnalyzer {
    constructor() {
        this.colorRoles = {
            background: 'Фон',
            text: 'Текст',
            primary: 'Основной', 
            accent: 'Акцентный',
            secondary: 'Вторичный',
            surface: 'Поверхность'
        };
    }

    async analyzeColors(colorStrings) {
        console.log(`🎨 Processing ${colorStrings.length} color strings`);
        
        try {
            // Парсим цвета
            const parsedColors = [];
            const seen = new Set();
            
            for (const colorStr of colorStrings) {
                try {
                    const color = this.parseColor(colorStr);
                    if (color && color.a > 0.1) { // Игнорируем почти прозрачные
                        const key = `${color.r},${color.g},${color.b}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            parsedColors.push({
                                r: color.r,
                                g: color.g, 
                                b: color.b,
                                hex: this.rgbToHex(color.r, color.g, color.b),
                                brightness: this.getBrightness(color.r, color.g, color.b),
                                saturation: this.getSaturation(color.r, color.g, color.b),
                                count: 1
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

            // Группируем похожие цвета
            const groups = this.groupColors(parsedColors);
            console.log(`📊 Created ${groups.length} color groups`);
            
            // Создаем палитру и назначаем роли
            const palette = this.createPalette(groups);
            const finalPalette = this.assignRoles(palette);
            
            return {
                palette: finalPalette,
                semantics: this.analyzeSemantics(finalPalette),
                total: colorStrings.length
            };
        } catch (error) {
            console.error('❌ Simple analysis error:', error);
            return this.getEmptyResult();
        }
    }

    groupColors(colors) {
        const groups = [];
        const threshold = 25; // Порог схожести
        
        colors.forEach(color => {
            let foundGroup = false;
            
            for (let group of groups) {
                const distance = this.colorDistance(color, group);
                if (distance < threshold) {
                    group.colors.push(color);
                    group.count += color.count;
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                groups.push({
                    r: color.r,
                    g: color.g,
                    b: color.b,
                    hex: color.hex,
                    brightness: color.brightness,
                    saturation: color.saturation,
                    colors: [color],
                    count: color.count
                });
            }
        });
        
        return groups.sort((a, b) => b.count - a.count).slice(0, 8);
    }

    colorDistance(color1, color2) {
        return Math.sqrt(
            Math.pow(color1.r - color2.r, 2) +
            Math.pow(color1.g - color2.g, 2) + 
            Math.pow(color1.b - color2.b, 2)
        );
    }

    createPalette(groups) {
        return groups.map(group => ({
            rgb: `rgb(${group.r}, ${group.g}, ${group.b})`,
            hex: group.hex,
            count: group.count,
            brightness: group.brightness,
            saturation: group.saturation,
            role: 'unassigned',
            roleName: 'Не назначена'
        }));
    }

    assignRoles(palette) {
        if (palette.length === 0) return palette;
        
        const assigned = new Set();
        const roles = [...palette];
        
        // 1. ФОН - самый светлый
        const sortedByBrightness = [...roles].sort((a, b) => b.brightness - a.brightness);
        if (sortedByBrightness.length > 0 && sortedByBrightness[0].brightness > 200) {
            sortedByBrightness[0].role = 'background';
            sortedByBrightness[0].roleName = this.colorRoles.background;
            assigned.add(sortedByBrightness[0].hex);
        }
        
        // 2. ТЕКСТ - самый темный
        if (sortedByBrightness.length > 0) {
            const textCandidate = sortedByBrightness[sortedByBrightness.length - 1];
            if (textCandidate.brightness < 100 && !assigned.has(textCandidate.hex)) {
                textCandidate.role = 'text';
                textCandidate.roleName = this.colorRoles.text;
                assigned.add(textCandidate.hex);
            }
        }
        
        // 3. АКЦЕНТНЫЙ - самый насыщенный
        const sortedBySaturation = [...roles].sort((a, b) => b.saturation - a.saturation);
        const accentCandidate = sortedBySaturation.find(color => 
            !assigned.has(color.hex) && color.saturation > 50
        );
        if (accentCandidate) {
            accentCandidate.role = 'accent';
            accentCandidate.roleName = this.colorRoles.accent;
            assigned.add(accentCandidate.hex);
        }
        
        // 4. ОСНОВНОЙ - первый не назначенный с хорошей насыщенностью
        const unassigned = roles.filter(color => !assigned.has(color.hex));
        const primaryCandidate = unassigned.find(color => color.saturation > 20) || unassigned[0];
        if (primaryCandidate) {
            primaryCandidate.role = 'primary';
            primaryCandidate.roleName = this.colorRoles.primary;
            assigned.add(primaryCandidate.hex);
        }
        
        // 5. ВТОРИЧНЫЙ - следующий не назначенный
        const remaining = roles.filter(color => !assigned.has(color.hex));
        if (remaining.length > 0) {
            remaining[0].role = 'secondary';
            remaining[0].roleName = this.colorRoles.secondary;
        }
        
        // Остальные - поверхность
        roles.forEach(color => {
            if (color.role === 'unassigned') {
                color.role = 'surface';
                color.roleName = this.colorRoles.surface;
            }
        });
        
        return roles;
    }

    analyzeSemantics(palette) {
        const semantics = {
            hasGoodContrast: false,
            colorCount: palette.length,
            primaryColor: null,
            accentColor: null,
            isDarkTheme: false
        };

        if (palette.length === 0) return semantics;

        const background = palette.find(color => color.role === 'background');
        const text = palette.find(color => color.role === 'text');
        const primary = palette.find(color => color.role === 'primary');
        const accent = palette.find(color => color.role === 'accent');

        if (background && text) {
            semantics.hasGoodContrast = Math.abs(background.brightness - text.brightness) > 50;
        }

        if (primary) semantics.primaryColor = primary.hex;
        if (accent) semantics.accentColor = accent.hex;

        semantics.isDarkTheme = palette.reduce((sum, color) => sum + color.brightness, 0) / palette.length < 128;

        return semantics;
    }

    // Вспомогательные методы
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

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
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

    getEmptyResult() {
        return {
            palette: [],
            semantics: {},
            total: 0
        };
    }
}

module.exports = UltraSimpleColorAnalyzer;