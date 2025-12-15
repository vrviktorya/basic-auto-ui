advancedColor

class AdvancedColorAnalyzer {
    constructor() {
        this.colorRoles = {
            background: 'Фон',
            text: 'Текст', 
            primary: 'Основной',
            accent: 'Акцентный',
            secondary: 'Вторичный',
            surface: 'Поверхность',
            border: 'Граница'
        };
    }

    async analyzeColors(extractionResult) {
        console.log('🔬 Starting ADVANCED color analysis...');
        
        try {
            const { rawColors, weightedColors } = extractionResult;
            
            if (!weightedColors || weightedColors.length === 0) {
                return this.getEmptyResult();
            }

            console.log(`🎨 Processing ${weightedColors.length} weighted colors`);
            
            // Группируем похожие цвета
            const colorGroups = this.groupSimilarColors(weightedColors);
            console.log(`📊 Created ${colorGroups.length} color groups`);
            
            // Сортируем группы по значимости (вес × количество)
            colorGroups.sort((a, b) => (b.totalWeight * b.totalCount) - (a.totalWeight * a.totalCount));
            
            // Берем топ-8 самых значимых групп
            const topGroups = colorGroups.slice(0, 8);
            
            // Создаем палитру
            const palette = this.createPalette(topGroups);
            
            // Назначаем семантические роли
            const finalPalette = this.assignSemanticRoles(palette);
            
            return {
                palette: finalPalette,
                semantics: this.analyzeColorSemantics(finalPalette),
                total: rawColors.length,
                debug: {
                    rawColors: rawColors.length,
                    weightedColors: weightedColors.length,
                    groups: colorGroups.length
                }
            };

        } catch (error) {
            console.error('❌ Advanced analysis error:', error);
            return this.getEmptyResult();
        }
    }

    groupSimilarColors(weightedColors) {
        const groups = [];
        const hslThreshold = 15; // Порог схожести в HSL
        
        weightedColors.forEach(colorData => {
            const hsl = this.rgbToHsl(colorData.rgb.r, colorData.rgb.g, colorData.rgb.b);
            let foundGroup = false;
            
            for (let group of groups) {
                const distance = this.hslDistance(hsl, group.hsl);
                if (distance < hslThreshold) {
                    // Объединяем в существующую группу
                    group.colors.push(colorData);
                    group.totalCount += colorData.count;
                    group.totalWeight += colorData.weight;
                    
                    // Обновляем средний цвет (взвешенно)
                    const weightRatio = colorData.weight / group.totalWeight;
                    group.hsl.h = group.hsl.h * (1 - weightRatio) + hsl.h * weightRatio;
                    group.hsl.s = group.hsl.s * (1 - weightRatio) + hsl.s * weightRatio;
                    group.hsl.l = group.hsl.l * (1 - weightRatio) + hsl.l * weightRatio;
                    
                    foundGroup = true;
                    break;
                }
            }
            
            if (!foundGroup) {
                // Создаем новую группу
                groups.push({
                    hsl: hsl,
                    colors: [colorData],
                    totalCount: colorData.count,
                    totalWeight: colorData.weight,
                    rgb: this.hslToRgb(hsl.h, hsl.s, hsl.l)
                });
            }
        });
        
        return groups;
    }

    hslDistance(hsl1, hsl2) {
        // Взвешенное расстояние в HSL пространстве
        const hDiff = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h)) / 360 * 100;
        const sDiff = Math.abs(hsl1.s - hsl2.s);
        const lDiff = Math.abs(hsl1.l - hsl2.l);
        
        return hDiff * 0.5 + sDiff * 0.3 + lDiff * 0.2;
    }

    createPalette(groups) {
        return groups.map(group => {
            const rgb = group.rgb;
            const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
            const hsl = group.hsl;
            const brightness = this.getBrightness(rgb.r, rgb.g, rgb.b);
            
            return {
                rgb: `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`,
                hex: hex,
                count: group.totalCount,
                weight: group.totalWeight,
                hsl: hsl,
                brightness: brightness,
                saturation: hsl.s,
                luminance: hsl.l,
                sources: this.getTopSources(group.colors),
                role: 'unassigned',
                roleName: 'Не назначена'
            };
        });
    }

    assignSemanticRoles(palette) {
        if (palette.length === 0) return palette;
        
        const assigned = new Set();
        const roles = [...palette];
        
        // 1. ФОН - самый светлый с высоким весом
        const lightColors = roles.filter(color => color.luminance > 85 && color.weight > 10);
        if (lightColors.length > 0) {
            const background = lightColors.reduce((a, b) => 
                (a.weight * a.luminance) > (b.weight * b.luminance) ? a : b
            );
            background.role = 'background';
            background.roleName = this.colorRoles.background;
            assigned.add(background.hex);
        }
        
        // 2. ТЕКСТ - самый темный с высоким весом
        const darkColors = roles.filter(color => color.luminance < 30 && color.weight > 10);
        if (darkColors.length > 0) {
            const text = darkColors.reduce((a, b) => 
                (a.weight * (100 - a.luminance)) > (b.weight * (100 - b.luminance)) ? a : b
            );
            text.role = 'text';
            text.roleName = this.colorRoles.text;
            assigned.add(text.hex);
        }
        
        // 3. АКЦЕНТНЫЙ - самый насыщенный с высоким весом, не слишком светлый/темный
        const unassigned = roles.filter(color => !assigned.has(color.hex));
        const accentCandidates = unassigned.filter(color => 
            color.saturation > 60 && 
            color.luminance > 20 && 
            color.luminance < 80 &&
            color.weight > 20
        );
        
        if (accentCandidates.length > 0) {
            const accent = accentCandidates.reduce((a, b) => 
                (a.saturation * a.weight) > (b.saturation * b.weight) ? a : b
            );
            accent.role = 'accent';
            accent.roleName = this.colorRoles.accent;
            assigned.add(accent.hex);
        }
        
        // 4. ОСНОВНОЙ - самый весомый из оставшихся
        const remaining = roles.filter(color => !assigned.has(color.hex));
        if (remaining.length > 0) {
            const primary = remaining.reduce((a, b) => 
                a.weight > b.weight ? a : b
            );
            primary.role = 'primary';
            primary.roleName = this.colorRoles.primary;
            assigned.add(primary.hex);
        }
        
        // 5. ВТОРИЧНЫЙ - следующий по весу
        const secondaryRemaining = roles.filter(color => !assigned.has(color.hex));
        if (secondaryRemaining.length > 0) {
            const secondary = secondaryRemaining.reduce((a, b) => 
                a.weight > b.weight ? a : b
            );
            secondary.role = 'secondary';
            secondary.roleName = this.colorRoles.secondary;
        }
        
        // Остальные - дополнительные
        roles.forEach(color => {
            if (!color.role || color.role === 'unassigned') {
                color.role = 'surface';
                color.roleName = this.colorRoles.surface;
            }
        });
        
        return roles;
    }

    analyzeColorSemantics(palette) {
        const semantics = {
            hasGoodContrast: false,
            colorCount: palette.length,
            primaryColor: null,
            accentColor: null,
            isDarkTheme: false,
            averageLuminance: 0,
            brandColors: []
        };

        if (palette.length === 0) return semantics;

        const background = palette.find(color => color.role === 'background');
        const text = palette.find(color => color.role === 'text');
        const primary = palette.find(color => color.role === 'primary');
        const accent = palette.find(color => color.role === 'accent');

        // Проверка контраста
        if (background && text) {
            const contrast = Math.abs(background.luminance - text.luminance);
            semantics.hasGoodContrast = contrast > 50;
        }

        // Основные цвета
        if (primary) semantics.primaryColor = primary.hex;
        if (accent) semantics.accentColor = accent.hex;

        // Определение темы
        semantics.averageLuminance = palette.reduce((sum, color) => sum + color.luminance, 0) / palette.length;
        semantics.isDarkTheme = semantics.averageLuminance < 50;

        // Брендовые цвета (насыщенные с высоким весом)
        semantics.brandColors = palette
            .filter(color => color.saturation > 50 && color.weight > 30)
            .map(color => color.hex)
            .slice(0, 3);

        return semantics;
    }

    getTopSources(colorArray) {
        return colorArray
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 3)
            .map(color => ({
                tag: color.sources[0]?.tag || 'unknown',
                prop: color.sources[0]?.prop || 'unknown',
                text: color.sources[0]?.text || ''
            }));
    }

    // Вспомогательные методы для преобразования цветов
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

    hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    getEmptyResult() {
        return {
            palette: [],
            semantics: {},
            total: 0,
            debug: { rawColors: 0, weightedColors: 0, groups: 0 }
        };
    }
}

module.exports = AdvancedColorAnalyzer;