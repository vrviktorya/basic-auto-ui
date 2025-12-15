const convert = require('color-convert');

class ReliableColorAnalyzer {
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
            const validColors = this.filterAndParseColors(colorStrings);
            console.log(`✅ Valid colors: ${validColors.length}`);
            
            if (validColors.length === 0) {
                return this.getEmptyResult();
            }

            // Простая группировка без агрессивного объединения
            const groups = this.simpleGrouping(validColors);
            console.log(`📊 Created ${groups.length} color groups`);
            
            const palette = this.assignSemanticRoles(groups);
            
            return {
                palette: palette,
                semantics: this.analyzeColorSemantics(palette),
                total: validColors.length
            };
        } catch (error) {
            console.error('❌ Color analysis error:', error);
            return this.getEmptyResult();
        }
    }

    simpleGrouping(colors) {
        const groups = [];
        const seen = new Set();

        // Собираем уникальные цвета и их частоту
        const colorMap = new Map();
        colors.forEach(color => {
            const key = `${color.r},${color.g},${color.b}`;
            colorMap.set(key, (colorMap.get(key) || 0) + 1);
        });

        // Преобразуем в группы
        colorMap.forEach((count, key) => {
            const [r, g, b] = key.split(',').map(Number);
            const brightness = this.getBrightness(r, g, b);
            const saturation = this.getSaturation(r, g, b);
            
            // Пропускаем почти прозрачные цвета
            if (count < 2 && brightness > 240 && saturation < 10) return;
            if (count < 2 && brightness < 20 && saturation < 10) return;

            groups.push({
                rgb: [r, g, b],
                count: count,
                brightness: brightness,
                saturation: saturation
            });
        });

        // Сортируем по значимости
        return groups
            .sort((a, b) => {
                // Насыщенные цвета имеют приоритет
                if (a.saturation > 50 && b.saturation <= 50) return -1;
                if (b.saturation > 50 && a.saturation <= 50) return 1;
                // Затем по частоте
                return b.count - a.count;
            })
            .slice(0, 8); // Ограничиваем 8 цветами
    }

    assignSemanticRoles(groups) {
        if (groups.length === 0) return [];

        const palette = groups.map(group => {
            const [r, g, b] = group.rgb;
            const hex = this.rgbToHex(r, g, b);
            
            return {
                rgb: `rgb(${r}, ${g}, ${b})`,
                hex: hex,
                count: group.count,
                brightness: group.brightness,
                saturation: group.saturation,
                role: 'additional',
                roleName: 'Дополнительный'
            };
        });

        return this.simpleRoleAssignment(palette);
    }

    simpleRoleAssignment(palette) {
        if (palette.length === 0) return palette;

        const assigned = new Set();

        // 1. ФОН - самый светлый
        const sortedByBrightness = [...palette].sort((a, b) => b.brightness - a.brightness);
        const backgroundCandidate = sortedByBrightness.find(color => 
            color.brightness > 240 && color.saturation < 20
        );
        if (backgroundCandidate) {
            backgroundCandidate.role = 'background';
            backgroundCandidate.roleName = this.colorRoles.background;
            assigned.add(backgroundCandidate.hex);
        }

        // 2. ТЕКСТ - самый темный
        const textCandidate = sortedByBrightness[sortedByBrightness.length - 1];
        if (textCandidate && textCandidate.brightness < 100 && !assigned.has(textCandidate.hex)) {
            textCandidate.role = 'text';
            textCandidate.roleName = this.colorRoles.text;
            assigned.add(textCandidate.hex);
        }

        // 3. АКЦЕНТНЫЙ - самый насыщенный
        const sortedBySaturation = [...palette].sort((a, b) => b.saturation - a.saturation);
        const accentCandidate = sortedBySaturation.find(color => 
            color.saturation > 60 && !assigned.has(color.hex)
        );
        if (accentCandidate) {
            accentCandidate.role = 'accent';
            accentCandidate.roleName = this.colorRoles.accent;
            assigned.add(accentCandidate.hex);
        }

        // 4. ОСНОВНОЙ - самый частый из оставшихся
        const unassigned = palette.filter(color => !assigned.has(color.hex));
        if (unassigned.length > 0) {
            const primaryCandidate = unassigned.sort((a, b) => b.count - a.count)[0];
            if (primaryCandidate) {
                primaryCandidate.role = 'primary';
                primaryCandidate.roleName = this.colorRoles.primary;
                assigned.add(primaryCandidate.hex);
            }
        }

        // 5. ВТОРИЧНЫЙ - следующий по частоте
        const remaining = palette.filter(color => !assigned.has(color.hex));
        if (remaining.length > 0) {
            const secondaryCandidate = remaining.sort((a, b) => b.count - a.count)[0];
            if (secondaryCandidate) {
                secondaryCandidate.role = 'secondary';
                secondaryCandidate.roleName = this.colorRoles.secondary;
            }
        }

        return palette;
    }

    analyzeColorSemantics(palette) {
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
            const contrast = Math.abs(background.brightness - text.brightness);
            semantics.hasGoodContrast = contrast > 150;
        }

        if (primary) semantics.primaryColor = primary.hex;
        if (accent) semantics.accentColor = accent.hex;

        const avgBrightness = palette.reduce((sum, color) => sum + color.brightness, 0) / palette.length;
        semantics.isDarkTheme = avgBrightness < 128;

        return semantics;
    }

    // Вспомогательные методы
    getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    getSaturation(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let saturation = 0;
        
        if (max !== min) {
            const lightness = (max + min) / 2;
            saturation = (max - min) / (1 - Math.abs(2 * lightness - 1));
        }
        
        return Math.round(saturation * 100);
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

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
        const cleanStr = colorStr.trim().toLowerCase().replace(/\s+/g, '');
        
        // HEX форматы
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

        // HEX 3-значный
        const hexShortMatch = cleanStr.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
        if (hexShortMatch) {
            return {
                r: parseInt(hexShortMatch[1] + hexShortMatch[1], 16),
                g: parseInt(hexShortMatch[2] + hexShortMatch[2], 16),
                b: parseInt(hexShortMatch[3] + hexShortMatch[3], 16),
                a: 1,
                original: colorStr
            };
        }

        // RGB/RGBA
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

        return null;
    }

    isValidColor(color) {
        if (color.a < 0.1) return false;
        return true;
    }

    getEmptyResult() {
        return {
            palette: [],
            semantics: {},
            total: 0
        };
    }
}

module.exports = ReliableColorAnalyzer;