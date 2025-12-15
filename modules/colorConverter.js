class ColorConverter {
    /**
     * Парсинг цвета из строки
     */
    parseColor(colorStr) {
        if (!colorStr) return null;
        
        try {
            // HEX формат #RRGGBB или #RGB
            const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            if (hexMatch) {
                return {
                    r: parseInt(hexMatch[1], 16),
                    g: parseInt(hexMatch[2], 16),
                    b: parseInt(hexMatch[3], 16),
                    a: 1
                };
            }

            // HEX 3-значный формат
            const hexShortMatch = colorStr.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
            if (hexShortMatch) {
                return {
                    r: parseInt(hexShortMatch[1] + hexShortMatch[1], 16),
                    g: parseInt(hexShortMatch[2] + hexShortMatch[2], 16),
                    b: parseInt(hexShortMatch[3] + hexShortMatch[3], 16),
                    a: 1
                };
            }

            // RGB/RGBA формат
            const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
            if (rgbMatch) {
                return {
                    r: parseInt(rgbMatch[1]),
                    g: parseInt(rgbMatch[2]),
                    b: parseInt(rgbMatch[3]),
                    a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
                };
            }

            // HSL/HSLA формат
            const hslMatch = colorStr.match(/hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/i);
            if (hslMatch) {
                const h = parseInt(hslMatch[1]);
                const s = parseFloat(hslMatch[2]) / 100;
                const l = parseFloat(hslMatch[3]) / 100;
                const a = hslMatch[4] ? parseFloat(hslMatch[4]) : 1;
                const rgb = this.hslToRgb(h, s, l);
                return { ...rgb, a };
            }

        } catch (e) {
            console.log('Parse color error:', e, colorStr);
        }
        
        return null;
    }

    /**
     * Конвертация RGB в HEX
     */
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    /**
     * Конвертация RGB в HSL
     */
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
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
            s: s,
            l: l
        };
    }

    /**
     * Конвертация HSL в RGB
     */
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
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

    /**
     * Расчет яркости цвета
     */
    getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    /**
     * Расчет насыщенности
     */
    getSaturation(r, g, b) {
        const hsl = this.rgbToHsl(r, g, b);
        return Math.round(hsl.s * 100);
    }

    /**
     * Проверка на валидный цвет
     */
    isValidColor(colorStr) {
        if (!colorStr || typeof colorStr !== 'string') return false;
        const str = colorStr.trim().toLowerCase();
        
        // Исключаем прозрачные и системные цвета
        if (str === 'transparent' || str === 'inherit' || str === 'currentcolor') return false;
        if (str === 'none' || str === 'initial' || str === 'unset') return false;
        if (str.includes('url(') || str.includes('image(')) return false;
        if (str === 'rgba(0, 0, 0, 0)') return false;
        
        // Проверяем цветовые форматы
        return /^#([a-f\d]{3,8})$/i.test(str) || 
               /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(str) ||
               /^hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(,\s*[\d.]+\s*)?\)$/i.test(str);
    }
}

module.exports = ColorConverter;