// modules/components/iconAnalyzer.js
class IconAnalyzer {
    analyzeIcon(element) {
        const iconData = {
            hasIcon: false,
            library: null,
            iconName: null,
            iconType: null, // 'font', 'svg', 'img', 'css'
            position: null, // 'before', 'after', 'only', 'background'
            size: null,
            color: null
        };
        
        // Проверяем наличие иконок в HTML элемента
        const html = element.html || element.outerHTML || '';
        const className = element.className || '';
        
        // Определяем библиотеки иконок
        const iconLibraries = {
            'material-symbols-outlined': { name: 'Material Symbols', type: 'font' },
            'material-icons': { name: 'Material Icons', type: 'font' },
            'material-icons-outlined': { name: 'Material Icons Outlined', type: 'font' },
            'material-icons-round': { name: 'Material Icons Round', type: 'font' },
            'material-icons-sharp': { name: 'Material Icons Sharp', type: 'font' },
            'fa': { name: 'Font Awesome', type: 'font' },
            'fas': { name: 'Font Awesome Solid', type: 'font' },
            'far': { name: 'Font Awesome Regular', type: 'font' },
            'fab': { name: 'Font Awesome Brands', type: 'font' },
            'bi': { name: 'Bootstrap Icons', type: 'font' },
            'ri': { name: 'Remix Icons', type: 'font' },
            'icon-': { name: 'Custom Icons', type: 'font' },
            'iconoir': { name: 'Iconoir', type: 'font' }
        };
        
        // Проверяем наличие SVG
        const hasSvg = html.includes('<svg') || className.includes('svg');
        const hasImg = html.includes('<img') && !html.includes('data:image/svg+xml');
        const hasIconClass = className.includes('icon-') || 
                            Object.keys(iconLibraries).some(lib => className.includes(lib));
        
        // Проверяем background-image
        const hasBackgroundImage = element.styles?.backgroundImage && 
                                  element.styles.backgroundImage !== 'none';
        
        if (hasSvg) {
            iconData.hasIcon = true;
            iconData.iconType = 'svg';
            
            // Пытаемся извлечь имя иконки из SVG
            const svgMatch = html.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
            if (svgMatch) {
                // Проверяем наличие классов в SVG
                const svgClassMatch = svgMatch[0].match(/class="([^"]*)"/);
                if (svgClassMatch) {
                    iconData.iconName = svgClassMatch[1];
                }
            }
        } else if (hasImg) {
            iconData.hasIcon = true;
            iconData.iconType = 'img';
            
            // Извлекаем src изображения
            const srcMatch = html.match(/src="([^"]*)"/);
            if (srcMatch) {
                iconData.iconName = srcMatch[1].split('/').pop().split('.')[0];
            }
        } else if (hasIconClass) {
            iconData.hasIcon = true;
            iconData.iconType = 'font';
            
            // Определяем библиотеку
            for (const [libClass, libInfo] of Object.entries(iconLibraries)) {
                if (className.includes(libClass)) {
                    iconData.library = libInfo.name;
                    break;
                }
            }
            
            // Извлекаем имя иконки из классов
            const iconClassMatch = className.match(/(?:fa|bi|ri|icon)-([a-z0-9-]+)/i);
            if (iconClassMatch) {
                iconData.iconName = iconClassMatch[1];
            }
        } else if (hasBackgroundImage) {
            iconData.hasIcon = true;
            iconData.iconType = 'background';
            iconData.position = 'background';
        }
        
        // Определяем позицию иконки относительно текста
        if (iconData.hasIcon && element.text) {
            const text = element.text.trim();
            const htmlText = html.replace(/<[^>]*>/g, '');
            
            if (html.includes(`>${text}<`)) {
                // Текст идет после иконки
                const beforeIcon = html.split(`>${text}<`)[0];
                if (beforeIcon.includes('<svg') || beforeIcon.includes('<img') || 
                    beforeIcon.includes('icon-') || beforeIcon.includes('fa-')) {
                    iconData.position = 'before';
                } else {
                    iconData.position = 'after';
                }
            } else if (!text || text.length < 3) {
                // Текст очень короткий или отсутствует - возможно, только иконка
                iconData.position = 'only';
            }
        }
        
        // Определяем размер иконки
        if (element.styles?.fontSize) {
            const fontSize = parseFloat(element.styles.fontSize);
            if (fontSize) {
                iconData.size = `${fontSize}px`;
            }
        }
        
        return iconData;
    }
    
    // Получение CSS для подключения библиотеки иконок
    getIconLibraryCSS(libraryName) {
        const libraryCSS = {
            'Material Symbols': `
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
                <style>
                    .material-symbols-outlined {
                        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                    }
                </style>`,
            'Material Icons': `
                <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />`,
            'Font Awesome': `
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />`,
            'Bootstrap Icons': `
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" />`,
            'Remix Icons': `
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />`
        };
        
        return libraryCSS[libraryName] || '';
    }
}

module.exports = IconAnalyzer;