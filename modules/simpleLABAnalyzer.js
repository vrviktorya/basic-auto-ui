const convert = require('color-convert');

class SimpleLABAnalyzer {
    constructor() {
        this.colorRoles = {
            background: 'Фон',
            text: 'Текст', 
            primary: 'Основной',
            accent: 'Акцентный',
            secondary: 'Вторичный'
        };
        this.minColorDistance = 12; // Более строгий порог для различия цветов
    }

    async analyzeColors(colorStrings) {
        console.log(`🎨 Processing ${colorStrings.length} color strings`);
        
        try {
            const validColors = this.filterAndParseColors(colorStrings);
            console.log(`✅ Valid colors after filtering: ${validColors.length}`);
            
            if (validColors.length === 0) {
                return this.getEmptyResult();
            }

            // Улучшенная группировка с удалением дублей
            const groups = this.advancedColorGrouping(validColors);
            console.log(`📊 Created ${groups.length} color groups after deduplication`);
            
            const palette = this.assignSemanticRoles(groups);
            
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
            return this.getEmptyResult();
        }
    }

    analyzeColorSemantics(palette) {
        const semantics = {
            hasGoodContrast: false,
            colorCount: palette.length,
            primaryColor: null,
            accentColor: null,
            isDarkTheme: false,
            averageLuminance: 0
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

        semantics.averageLuminance = palette.reduce((sum, color) => sum + color.luminance, 0) / palette.length;
        semantics.isDarkTheme = semantics.averageLuminance < 50;

        return semantics;
    }

    // Продвинутая группировка с учетом HSL и LAB пространств
    advancedColorGrouping(colors) {
        const groups = [];
        
        // Сначала сортируем по частоте для приоритета популярных цветов
        const colorCounts = new Map();
        colors.forEach(color => {
            const key = `${color.r},${color.g},${color.b}`;
            colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        });

        const sortedColors = [...colors].sort((a, b) => {
            const keyA = `${a.r},${a.g},${a.b}`;
            const keyB = `${b.r},${b.g},${b.b}`;
            return colorCounts.get(keyB) - colorCounts.get(keyA);
        });

        sortedColors.forEach(color => {
            const lab = this.rgbToLAB(color.r, color.g, color.b);
            const hsl = this.rgbToHsl(color.r, color.g, color.b);
            
            let foundGroup = false;
            
            for (let group of groups) {
                const labDistance = this.calculateLABDistance(lab, group.lab);
                const hslDistance = this.calculateHSLDistance(hsl, group.hsl);
                
                // Комбинированная проверка в двух пространствах
                if (labDistance < this.minColorDistance && hslDistance < 0.1) {
                    group.count++;
                    group.colors.push(color);
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                groups.push({
                    rgb: [color.r, color.g, color.b],
                    lab: lab,
                    hsl: hsl,
                    count: colorCounts.get(`${color.r},${color.g},${color.b}`),
                    colors: [color],
                    brightness: this.getBrightness(color.r, color.g, color.b),
                    saturation: hsl.s
                });
            }
        });

        // Фильтруем редкие цвета и сортируем по значимости
        return groups
            .filter(group => group.count >= 2) // Минимум 2 использования
            .sort((a, b) => {
                // Сначала по насыщенности (насыщенные важнее), затем по частоте
                if (a.saturation > 50 && b.saturation <= 50) return -1;
                if (b.saturation > 50 && a.saturation <= 50) return 1;
                return b.count - a.count;
            })
            .slice(0, 8); // Ограничиваем 8 цветами
    }

    // Улучшенное назначение ролей
    assignSemanticRoles(groups) {
        if (groups.length === 0) return [];

        const palette = groups.map(group => ({
            rgb: `rgb(${group.rgb[0]}, ${group.rgb[1]}, ${group.rgb[2]})`,
            hex: this.rgbToHex(group.rgb[0], group.rgb[1], group.rgb[2]),
            count: group.count,
            hsl: group.hsl,
            lab: group.lab,
            brightness: group.brightness,
            saturation: group.saturation,
            luminance: group.lab[0],
            role: 'unassigned',
            roleName: 'Не назначен'
        }));

        return this.smartRoleAssignment(palette);
    }

    // Умное назначение ролей с приоритетом визуальной значимости
    smartRoleAssignment(palette) {
        const assigned = new Set();
        const roles = {};
        
        // 1. ФОН - самый светлый нейтральный цвет
        const backgroundCandidates = palette.filter(color => 
            color.brightness > 240 && color.saturation < 15
        );
        if (backgroundCandidates.length > 0) {
            const background = backgroundCandidates.sort((a, b) => b.count - a.count)[0];
            background.role = 'background';
            background.roleName = this.colorRoles.background;
            assigned.add(background.hex);
            roles.background = background;
        }

        // 2. ТЕКСТ - самый темный цвет с низкой насыщенностью
        const textCandidates = palette.filter(color => 
            !assigned.has(color.hex) && color.brightness < 80 && color.saturation < 40
        );
        if (textCandidates.length > 0) {
            const text = textCandidates.sort((a, b) => a.brightness - b.brightness)[0];
            text.role = 'text';
            text.roleName = this.colorRoles.text;
            assigned.add(text.hex);
            roles.text = text;
        }

        // 3. АКЦЕНТНЫЙ - самый насыщенный и визуально заметный цвет
        const accentCandidates = palette.filter(color => 
            !assigned.has(color.hex) && color.saturation > 70
        );
        if (accentCandidates.length > 0) {
            // Предпочтение красным/оранжевым как более заметным
            const weightedAccents = accentCandidates.map(color => {
                let weight = color.saturation;
                // Красные/оранжевые получают бонус
                if (color.hsl.h >= 0 && color.hsl.h <= 60) weight *= 1.5;
                // Синие/фиолетовые тоже важны
                if (color.hsl.h >= 200 && color.hsl.h <= 300) weight *= 1.2;
                return { color, weight };
            }).sort((a, b) => b.weight - a.weight);
            
            const accent = weightedAccents[0].color;
            accent.role = 'accent';
            accent.roleName = this.colorRoles.accent;
            assigned.add(accent.hex);
            roles.accent = accent;
        }

        // 4. ОСНОВНОЙ - самый частый НЕ-нейтральный цвет
        const primaryCandidates = palette.filter(color => 
            !assigned.has(color.hex) && color.saturation > 20
        );
        if (primaryCandidates.length > 0) {
            const primary = primaryCandidates.sort((a, b) => b.count - a.count)[0];
            primary.role = 'primary';
            primary.roleName = this.colorRoles.primary;
            assigned.add(primary.hex);
            roles.primary = primary;
        }

        // 5. ВТОРИЧНЫЙ - оставшиеся значимые цвета
        const remainingColors = palette.filter(color => !assigned.has(color.hex));
        if (remainingColors.length > 0) {
            const secondary = remainingColors.sort((a, b) => b.count - a.count)[0];
            if (secondary) {
                secondary.role = 'secondary';
                secondary.roleName = this.colorRoles.secondary;
                assigned.add(secondary.hex);
            }
        }

        // Назначаем остальным роль "Дополнительный"
        palette.forEach(color => {
            if (!assigned.has(color.hex)) {
                color.role = 'additional';
                color.roleName = 'Дополнительный';
            }
        });

        return palette;
    }

    // Вспомогательные методы
    rgbToLAB(r, g, b) {
        try {
            return convert.rgb.lab([r, g, b]);
        } catch (error) {
            return [r, g, b]; // Fallback
        }
    }

    calculateLABDistance(lab1, lab2) {
        const dl = lab1[0] - lab2[0];
        const da = lab1[1] - lab2[1];
        const db = lab1[2] - lab2[2];
        return Math.sqrt(dl * dl + da * da + db * db);
    }

    calculateHSLDistance(hsl1, hsl2) {
        // Нормализованное расстояние в HSL пространстве
        const dh = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h)) / 360;
        const ds = Math.abs(hsl1.s - hsl2.s) / 100;
        const dl = Math.abs(hsl1.l - hsl2.l) / 100;
        return Math.sqrt(dh * dh + ds * ds + dl * dl);
    }

    getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
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

    filterAndParseColors(colorStrings) {
        const validColors = [];
        const seen = new Set();
        
        colorStrings.forEach(colorStr => {
            try {
                const color = this.parseColor(colorStr);
                if (color && this.isValidColor(color)) {
                    const key = `${color.r},${color.g},${color.b}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        validColors.push(color);
                    }
                }
            } catch (error) {
                // Пропускаем невалидные цвета
            }
        });

        return validColors;
    }

    parseColor(colorStr) {
        if (!colorStr) return null;
        
        // Очистка строки
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

        // HEX 3-значный формат
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

        // RGB/RGBA форматы
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
        if (color.a < 0.1) return false; // Игнорируем почти прозрачные
        if (color.r === 0 && color.g === 0 && color.b === 0 && color.a < 0.5) return false;
        if (color.r === 255 && color.g === 255 && color.b === 255 && color.a < 0.5) return false;
        return true;
    }

    getEmptyResult() {
        return {
            palette: [],
            semantics: {},
            total: 0,
            debug: { rawColors: 0, validColors: 0 }
        };
    }
}

module.exports = SimpleLABAnalyzer;