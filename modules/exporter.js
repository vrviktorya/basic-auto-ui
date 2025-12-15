class DesignSystemExporter {
    constructor() {
        this.formats = {
            css: 'CSS Variables',
            json: 'JSON',
            scss: 'SCSS Variables',
            tailwind: 'Tailwind Config'
        };
    }

    exportToCSS(colorPalette, typography, options = {}) {
        const { prefix = 'ds', includeComments = true } = options;
        
        let css = `/* Auto-generated Design System - ${new Date().toISOString()} */\n`;
        css += `/* Source: ${colorPalety.source || 'Unknown'} */\n\n`;
        
        css += `:root {\n`;
        
        // Цвета
        colorPalette.forEach(color => {
            const variableName = this.sanitizeName(`${prefix}-color-${color.role}`);
            if (includeComments) {
                css += `  /* ${color.roleName} */\n`;
            }
            css += `  --${variableName}: ${color.hex};\n`;
            css += `  --${variableName}-rgb: ${color.rgb.replace('rgb(', '').replace(')', '')};\n`;
            
            if (includeComments && color.count) {
                css += `  /* Используется в ${color.count} элементах */\n`;
            }
            css += `\n`;
        });
        
        // Типографика (если есть)
        if (typography && typography.styles && typography.styles.length > 0) {
            css += `  /* Typography */\n`;
            typography.styles.slice(0, 5).forEach((font, index) => {
                const fontName = this.sanitizeName(`${prefix}-font-${font.tag || `style-${index + 1}`}`);
                css += `  --${fontName}-family: ${font.fontFamily};\n`;
                css += `  --${fontName}-size: ${font.fontSize};\n`;
                css += `  --${fontName}-weight: ${font.fontWeight};\n`;
                css += `  --${fontName}-line-height: ${font.lineHeight};\n\n`;
            });
        }
        
        css += `}\n\n`;
        
        // CSS классы для быстрого использования
        css += `/* Utility Classes */\n`;
        colorPalette.forEach(color => {
            const className = this.sanitizeName(`color-${color.role}`);
            css += `.${className} { color: var(--${prefix}-color-${color.role}); }\n`;
            css += `.bg-${className} { background-color: var(--${prefix}-color-${color.role}); }\n`;
            css += `.border-${className} { border-color: var(--${prefix}-color-${color.role}); }\n`;
        });
        
        return css;
    }

    exportToJSON(colorPalette, typography, options = {}) {
        const { includeMetadata = true } = options;
        
        const designSystem = {
            name: 'Auto-generated Design System',
            version: '1.0.0',
            generated: new Date().toISOString(),
            source: colorPalette.source || 'Unknown'
        };
        
        if (includeMetadata) {
            designSystem.metadata = {
                totalColors: colorPalette.length,
                totalFonts: typography?.styles?.length || 0,
                analysisVersion: colorPalette.analysisVersion || 'unknown'
            };
        }
        
        // Colors
        designSystem.colors = {};
        colorPalette.forEach(color => {
            designSystem.colors[color.role] = {
                name: color.roleName,
                value: color.hex,
                rgb: color.rgb,
                hsl: color.hsl,
                brightness: Math.round(color.brightness),
                saturation: color.saturation,
                usage: color.count,
                role: color.role
            };
        });
        
        // Typography
        if (typography && typography.styles) {
            designSystem.typography = {};
            typography.styles.slice(0, 8).forEach((font, index) => {
                const fontKey = font.tag || `style_${index + 1}`;
                designSystem.typography[fontKey] = {
                    fontFamily: font.fontFamily,
                    fontSize: font.fontSize,
                    fontWeight: font.fontWeight,
                    lineHeight: font.lineHeight,
                    example: font.example,
                    color: font.color
                };
            });
        }
        
        // Semantic information
        if (colorPalette.semantics) {
            designSystem.semantics = colorPalette.semantics;
        }
        
        return JSON.stringify(designSystem, null, 2);
    }

    exportToSCSS(colorPalette, typography, options = {}) {
        const { prefix = 'ds' } = options;
        
        let scss = `// Auto-generated SCSS Design System\n`;
        scss += `// Source: ${colorPalette.source || 'Unknown'}\n\n`;
        
        // Colors
        scss += `// Colors\n`;
        colorPalette.forEach(color => {
            const variableName = this.sanitizeName(`$${prefix}-color-${color.role}`);
            scss += `${variableName}: ${color.hex} !default;\n`;
            scss += `${variableName}-rgb: ${color.rgb.replace('rgb(', '').replace(')', '')} !default;\n`;
        });
        
        scss += `\n`;
        
        // Color map for loops
        scss += `$${prefix}-colors: (\n`;
        colorPalette.forEach(color => {
            scss += `  "${color.role}": $${prefix}-color-${color.role},\n`;
        });
        scss += `) !default;\n\n`;
        
        // Typography
        if (typography && typography.styles) {
            scss += `// Typography\n`;
            typography.styles.slice(0, 5).forEach((font, index) => {
                const fontKey = font.tag || `style-${index + 1}`;
                scss += `$${prefix}-font-${fontKey}-family: "${font.fontFamily}" !default;\n`;
                scss += `$${prefix}-font-${fontKey}-size: ${font.fontSize} !default;\n`;
                scss += `$${prefix}-font-${fontKey}-weight: ${font.fontWeight} !default;\n`;
                scss += `$${prefix}-font-${fontKey}-line-height: ${font.lineHeight} !default;\n\n`;
            });
        }
        
        return scss;
    }

    exportToTailwind(colorPalette, options = {}) {
        const { prefix = 'ds' } = options;
        
        let config = `// Tailwind CSS Design System Configuration\n`;
        config += `// Auto-generated from analysis\n\n`;
        
        config += `module.exports = {\n`;
        config += `  theme: {\n`;
        config += `    extend: {\n`;
        config += `      colors: {\n`;
        
        // Colors
        colorPalette.forEach(color => {
            const colorName = color.role === 'primary' ? 'primary' : 
                            color.role === 'accent' ? 'accent' : color.role;
            config += `        '${colorName}': '${color.hex}',\n`;
        });
        
        config += `      },\n`;
        
        // Font families if available
        if (options.typography && options.typography.styles) {
            const fonts = [...new Set(options.typography.styles.map(f => f.fontFamily))].slice(0, 3);
            config += `      fontFamily: {\n`;
            fonts.forEach((font, index) => {
                config += `        'custom-${index + 1}': ['${font}', 'sans-serif'],\n`;
            });
            config += `      },\n`;
        }
        
        config += `    },\n`;
        config += `  },\n`;
        config += `  plugins: [],\n`;
        config += `}\n`;
        
        return config;
    }

    sanitizeName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    getAllFormats(colorPalette, typography, options = {}) {
        return {
            css: this.exportToCSS(colorPalette, typography, options),
            json: this.exportToJSON(colorPalette, typography, options),
            scss: this.exportToSCSS(colorPalette, typography, options),
            tailwind: this.exportToTailwind(colorPalette, { ...options, typography })
        };
    }
}

module.exports = DesignSystemExporter;