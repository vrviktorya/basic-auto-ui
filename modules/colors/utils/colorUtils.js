// Временная реализация - потом добавим color-convert
function rgbToLab(rgbArray) {
    // Временная заглушка - возвращаем RGB как есть
    // Позже заменим на настоящую реализацию CIELAB
    return rgbArray;
}

function labToRgb(labArray) {
    // Временная заглушка
    return labArray;
}

function getColorSemantics(color, index, palette) {
    const hex = color.hex;
    const brightness = getBrightness(hex);
    
    // Простая эвристика для определения роли цвета
    if (brightness > 240) return 'background';
    if (brightness < 30) return 'text-primary';
    if (index === 0 && brightness < 200) return 'primary';
    if (index === 1) return 'secondary';
    
    const hsl = hexToHsl(hex);
    if (hsl.s > 60 && hsl.l > 30 && hsl.l < 70) return 'accent';
    if (brightness > 200) return 'surface';
    if (brightness > 150) return 'border';
    
    return `color-${index + 1}`;
}

function analyzeContrast(foreground, background) {
    const fg = getBrightness(foreground);
    const bg = getBrightness(background);
    const contrast = Math.abs(fg - bg);
    
    return {
        contrast: contrast,
        ratio: contrast / 255,
        accessible: contrast > 125
    };
}

function getBrightness(hex) {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

function hexToHsl(hex) {
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    let h = 0, s = 0;
    
    if (max !== min) {
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

function rgbStringToArray(rgbString) {
    const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

module.exports = {
    rgbToLab,
    labToRgb,
    getColorSemantics,
    analyzeContrast,
    getBrightness,
    hexToHsl,
    rgbStringToArray,
    rgbToHex
};