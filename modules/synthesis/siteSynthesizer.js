class SiteSynthesizer {
    constructor() {
        this.templates = {
            corporate: this.generateCorporateTemplate.bind(this),
            startup: this.generateStartupTemplate.bind(this),
            portfolio: this.generatePortfolioTemplate.bind(this),
            minimal: this.generateMinimalTemplate.bind(this)
        };
    }

    /**
     * Основной метод для генерации сайта
     * @param {Object} designSystem - Система дизайна
     * @param {string} templateType - Тип шаблона
     * @returns {string} HTML-страница
     */
    generateSite(designSystem, templateType = 'corporate') {
        const template = this.templates[templateType] || this.templates.corporate;
        return template(designSystem);
    }

    /**
     * Корпоративный шаблон
     * @param {Object} designSystem
     * @returns {string} HTML-страница
     */
    generateCorporateTemplate(designSystem) {
        const colors = this.normalizeColors(designSystem.colors?.palette);
        const typography = this.normalizeTypography(designSystem.typography?.styles);
        const layoutTokens = designSystem.layoutTokens || {};
        const structure = designSystem.layout?.structure || { blocks: [], sections: [] };

        const bodyHtml = this.generateBodyFromStructure(structure, colors, typography, layoutTokens);

        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${designSystem.domain || 'Синтезированный сайт'}</title>
    <style>
        ${this.generateGlobalCSS(colors, typography, layoutTokens)}
        ${this.generateCorporateCSS(colors, typography, layoutTokens)}
    </style>
</head>
<body>
    ${bodyHtml}
</body>
</html>`;
    }

    /**
     * Генерация тела страницы на основе структуры
     */
    generateBodyFromStructure(structure, colors, typography, layoutTokens) {
        const blocks = structure.blocks || [];
        const sectionsMap = new Map((structure.sections || []).map(sec => [sec.index, sec]));

        if (!blocks.length) {
            return this.generateFallbackStructure(colors, typography, layoutTokens);
        }

        return blocks
            .map(block => {
                const mainSec = sectionsMap.get(block.mainSectionIndex) || block.sections?.[0];
                if (!mainSec) return '';

                switch (block.type) {
                    case 'nav':       return this.generateNavWrapper(block, mainSec, colors, typography, layoutTokens);
                    case 'hero':      return this.generateHeroWrapper(block, mainSec, colors, typography, layoutTokens);
                    case 'gridSection': return this.generateGridWrapper(block, mainSec, colors, typography, layoutTokens);
                    case 'strip':     return this.generateStripWrapper(block, mainSec, colors, typography, layoutTokens);
                    case 'contact':   return this.generateContactWrapper(block, mainSec, colors, typography, layoutTokens);
                    case 'footer':    return this.generateFooterWrapper(block, mainSec, colors, typography, layoutTokens);
                    default:          return this.generateContentWrapper(block, colors, typography, layoutTokens);
                }
            })
            .filter(Boolean)
            .join('');
    }

    /**
     * Получение вертикальных отступов секции
     */
    getSectionPaddingY(block, layoutTokens) {
        const paddingY = block?.paddingY;
        return paddingY && paddingY > 0 
            ? `${Math.round(paddingY)}px 0` 
            : `${layoutTokens.spacing?.sectionY || '4rem'} 0`;
    }

    /**
     * Получение максимальной ширины секции
     */
    getSectionMaxWidth(block, layoutTokens) {
        const maxWidth = block?.maxWidthPx;
        return maxWidth 
            ? `${Math.round(maxWidth)}px` 
            : layoutTokens.container?.maxWidth || '1200px';
    }

    /**
     * Получение цвета фона по роли
     */
    getBackgroundColorForRole(colors, backgroundRole) {
        switch (backgroundRole) {
            case 'bgSurface': return colors.surface || '#f8f9fa';
            case 'bgAccent':  return colors.accent || colors.primary || '#007bff';
            case 'bgDark':    return colors.secondary || '#1f2933';
            default:          return colors.background || '#ffffff';
        }
    }

    /**
     * Генерация обёртки навигации
     */
    generateNavWrapper(block, sec, colors, typography, layoutTokens) {
        const padding = this.getSectionPaddingY(block, layoutTokens);
        const maxWidth = this.getSectionMaxWidth(block, layoutTokens);
        const bg = this.getBackgroundColorForRole(colors, block.backgroundRole);

        return `<header class="ds-nav" style="padding: ${padding}; background: ${bg};">
    <div class="container" style="max-width: ${maxWidth};">
        ${this.generateNavBlock(colors, typography, layoutTokens, sec)}
    </div>
</header>`;
    }

    /**
     * Генерация обёртки Hero-секции
     */
    generateHeroWrapper(block, sec, colors, typography, layoutTokens) {
        const padding = this.getSectionPaddingY(block, layoutTokens);
        const maxWidth = this.getSectionMaxWidth(block, layoutTokens);
        const bg = this.getBackgroundColorForRole(colors, block.backgroundRole || 'bgSurface');

        return `<section id="hero" class="ds-section ds-section-hero" style="padding: ${padding}; background: ${bg};">
    <div class="container" style="max-width: ${maxWidth};">
        ${this.generateHeroBlock(colors, typography, layoutTokens, sec)}
    </div>
</section>`;
    }

    /**
     * Генерация обёртки сетки
     */
    generateGridWrapper(block, sec, colors, typography, layoutTokens) {
        const padding = this.getSectionPaddingY(block, layoutTokens);
        const maxWidth = this.getSectionMaxWidth(block, layoutTokens);
        const bg = this.getBackgroundColorForRole(colors, block.backgroundRole);

        return `<section class="ds-section ds-section-grid" style="padding: ${padding}; background: ${bg};">
    <div class="container" style="max-width: ${maxWidth};">
        ${this.generateGridBlock(block, colors, typography, layoutTokens, sec)}
    </div>
</section>`;
    }

    /**
     * Генерация обёртки полосы (strip)
     */
    generateStripWrapper(block, sec, colors, typography, layoutTokens) {
        const padding = this.getSectionPaddingY(block, layoutTokens);
        const maxWidth = this.getSectionMaxWidth(block, layoutTokens);
        const bg = this.getBackgroundColorForRole(colors, block.backgroundRole);

        return `<section class="ds-section ds-section-strip" style="padding: ${padding}; background: ${bg};">
    <div class="container" style="max-width: ${maxWidth};">
        ${this.generateGenericBlock(colors, typography, layoutTokens, sec, block)}
    </div>
</section>`;
    }

    /**
     * Генерация обёртки секции контактов
     */
    generateContactWrapper(block, sec, colors, typography, layoutTokens) {
        const padding = this.getSectionPaddingY(block, layoutTokens);
        const maxWidth = this.getSectionMaxWidth(block, layoutTokens);
        const bg = this.getBackgroundColorForRole(colors, block.backgroundRole || 'bgNeutral');

        return `<section id="contact" class="ds-section ds-section-contact" style="padding: ${padding}; background: ${bg};">
    <div class="container" style="max-width: ${maxWidth};">
        ${this.generateContactBlock(colors, typography, layoutTokens, sec)}
    </div>
</section>`;
    }

    /**
     * Генерация обёртки футера
     */
    generateFooterWrapper(block, sec, colors, typography, layoutTokens) {
        const padding = this.getSectionPaddingY(block, layoutTokens);
        const maxWidth = this.getSectionMaxWidth(block, layoutTokens);
        const bg = this.getBackgroundColorForRole(colors, block.backgroundRole || 'bgDark');
        const textColor = this.getContrastColor(bg);

        return `<footer class="ds-section ds-section-footer" style="padding: ${padding}; background: ${bg}; color: ${textColor};">
    <div class="container" style="max-width: ${maxWidth};">
        ${this.generateFooterBlock(colors, typography, layoutTokens, sec)}
    </div>
</footer>`;
    }

    /**
     * Генерация обёртки контентной секции
     */
    generateContentWrapper(block, colors, typography, layoutTokens) {
        const padding = this.getSectionPaddingY(block, layoutTokens);
        const maxWidth = this.getSectionMaxWidth(block, layoutTokens);
        const bg = this.getBackgroundColorForRole(colors, block.backgroundRole || 'bgNeutral');

        const sectionsHtml = (block.sections || [])
            .map(sec => this.generateGenericBlock(colors, typography, layoutTokens, sec, block))
            .join('');

        return `<section class="ds-section ds-section-content" style="padding: ${padding}; background: ${bg};">
    <div class="container" style="max-width: ${maxWidth};">
        ${sectionsHtml}
    </div>
</section>`;
    }

    /**
     * Генерация блока навигации
     */
    generateNavBlock(colors, typography, layoutTokens, sec) {
        const brand = this.extractBrandName(sec.domain);
        return `<nav class="nav">
    <div class="logo" style="color: ${colors.primary || '#333333'};">${brand}</div>
    <ul class="nav-menu">
        <li><a href="#hero">Главная</a></li>
        <li><a href="#content">Разделы</a></li>
        <li><a href="#contact">Контакты</a></li>
    </ul>
    <button class="cta-button" style="background: ${colors.accent || colors.primary || '#007bff'}; color: ${this.getContrastColor(colors.accent || colors.primary || '#007bff')}">
        Связаться
    </button>
</nav>`;
    }

    /**
     * Генерация Hero-блока
     */
    generateHeroBlock(colors, typography, layoutTokens, sec) {
        return `<div class="hero-layout">
    <div class="hero-content">
        <h1 style="color: ${colors.text || '#333333'}; font-family: ${typography.h1?.fontFamily || 'inherit'}">
            Hero секция
        </h1>
        <p style="color: ${colors.text || '#666666'}; font-family: ${typography.p?.fontFamily || 'inherit'}">
            Эта hero‑секция повторяет размеры и фон исходного блока.
        </p>
        <div class="hero-buttons">
            <button class="btn-primary" style="background: ${colors.primary || colors.accent || '#007bff'}; color: ${this.getContrastColor(colors.primary || colors.accent || '#007bff')}">
                Основное действие
            </button>
            <button class="btn-secondary" style="border-color: ${colors.primary || '#007bff'}; color: ${colors.primary || '#007bff'}">
                Подробнее
            </button>
        </div>
    </div>
    <div class="hero-visual">
        <div class="placeholder-visual" style="background: ${colors.surface || '#e9ecef'}; border: 2px dashed ${colors.border || '#dee2e6'}">
            Визуальный блок
        </div>
    </div>
</div>`;
    }

    /**
     * Генерация блока сетки
     */
    generateGridBlock(block, colors, typography, layoutTokens, sec) {
        const cols = block.columns || layoutTokens.grid?.columnsDesktop || 3;
        const cardsCount = Math.max(3, cols * 2);

        const cardsHtml = Array.from({ length: cardsCount }, (_, i) => `
            <div class="grid-card">
                <h3 style="color: ${colors.text || '#111827'}">Карточка ${i + 1}</h3>
                <p style="color: ${colors.text || '#4b5563'}">Эта карточка находится в секции сетки, аналогичной исходному «row»/«cards»‑блоку.</p>
            </div>
        `).join('');

        return `<h2 style="color: ${colors.text || '#111827'}; text-align: center;">Секция сетки</h2>
<div class="grid-layout" style="display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 2rem; margin-top: 2rem;">
    ${cardsHtml}
</div>`;
    }

    /**
     * Генерация общего блока
     */
    generateGenericBlock(colors, typography, layoutTokens, sec, block) {
        const approx = (sec.className || '').split(' ')[0] || sec.tag || 'Раздел';

        return `<div class="content-section">
    <h2 style="color: ${colors.text || '#111827'}">${approx}</h2>
    <p style="color: ${colors.text || '#4b5563'}">
        Этот раздел повторяет композицию исходного: ширина, вертикальные отступы и фоновый слой (${block.backgroundRole || 'bgNeutral'}).
    </p>
</div>`;
    }

    /**
     * Генерация резервной структуры
     */
    generateFallbackStructure(colors, typography, layoutTokens) {
        const fakeLayout = {
            sections: [
                { type: 'hero', paddingY: 120 },
                { type: 'features', paddingY: 80 },
                { type: 'services', paddingY: 80 },
                { type: 'contact', paddingY: 80 },
                { type: 'footer', paddingY: 40 }
            ]
        };
        return this.generateSectionsFromLayout(fakeLayout, colors, typography, layoutTokens);
    }

    /**
     * Генерация структуры из макета (для обратной совместимости)
     */
    generateSectionsFromLayout(layout, colors, typography, layoutTokens) {
        const sections = layout.sections || [];
        if (!sections.length) return this.generateFallbackStructure(colors, typography, layoutTokens);

        return sections.map(section => {
            const paddingY = section.paddingY ? `${Math.round(section.paddingY)}px` : (layoutTokens.spacing?.sectionY || '4rem');
            const maxWidth = section.maxWidthPx ? `${Math.round(section.maxWidthPx)}px` : (layoutTokens.container?.maxWidth || '1200px');
            const bgColor = section.type === 'hero' ? (colors.surface || colors.background || '#f8f9fa') : (colors.background || '#ffffff');

            let content = '';
            switch (section.type) {
                case 'hero':     content = this.generateHeroBlock(colors, typography, layoutTokens, section); break;
                case 'services': content = this.generateServicesBlock(colors, typography, layoutTokens, section); break;
                case 'contact':  content = this.generateContactBlock(colors, typography, layoutTokens, section); break;
                case 'footer':   content = this.generateFooterBlock(colors, typography, layoutTokens, section); break;
                default:         content = this.generateGenericBlock(colors, typography, layoutTokens, section); break;
            }

            return `<section class="ds-section ds-section-${section.type || 'generic'}" style="padding: ${paddingY} 0; background: ${bgColor};">
    <div class="container" style="max-width: ${maxWidth};">
        ${content}
    </div>
</section>`;
        }).join('');
    }

    /**
     * Генерация блока услуг
     */
    generateServicesBlock(colors, typography, layoutTokens, section) {
        const cols = (section.gridColumns?.[0]) || layoutTokens.grid?.columnsDesktop || 3;

        const services = [
            { title: 'Услуга 1', description: 'Описание услуги 1' },
            { title: 'Услуга 2', description: 'Описание услуги 2' },
            { title: 'Услуга 3', description: 'Описание услуги 3' },
            { title: 'Услуга 4', description: 'Описание услуги 4' }
        ];

        const cardsHtml = services.map(s => `
            <div class="service-card">
                <h3 style="color: ${colors.primary || '#007bff'}">${s.title}</h3>
                <p style="color: ${colors.text || '#666666'}">${s.description}</p>
            </div>
        `).join('');

        return `<h2 style="color: ${colors.text || '#333333'}; text-align: center;">Наши услуги</h2>
<div class="services-grid" style="display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 2rem; margin-top: 3rem;">
    ${cardsHtml}
</div>`;
    }

    /**
     * Генерация блока контактов
     */
    generateContactBlock(colors, typography, layoutTokens, section) {
        return `<h2 style="color: ${colors.text || '#333333'}; text-align: center;">Контакты</h2>
<div class="contact-content">
    <div class="contact-info">
        <h3 style="color: ${colors.primary || '#007bff'}">Свяжитесь с нами</h3>
        <p style="color: ${colors.text || '#666666'}">Email: info@example.com</p>
        <p style="color: ${colors.text || '#666666'}">Телефон: +7 (999) 999-99-99</p>
    </div>
    <form class="contact-form" style="background: ${colors.surface || '#f8f9fa'}">
        <input type="text" placeholder="Ваше имя" style="border: 1px solid ${colors.border || '#dee2e6'}">
        <input type="email" placeholder="Ваш email" style="border: 1px solid ${colors.border || '#dee2e6'}">
        <textarea placeholder="Ваше сообщение" style="border: 1px solid ${colors.border || '#dee2e6'}"></textarea>
        <button type="submit" style="background: ${colors.accent || colors.primary || '#007bff'}; color: ${this.getContrastColor(colors.accent || colors.primary || '#007bff')}">
            Отправить
        </button>
    </form>
</div>`;
    }

    /**
     * Генерация футера
     */
    generateFooterBlock() {
        return `<div class="footer-inner">
    <p>&copy; ${new Date().getFullYear()} Авто-сгенерированный сайт. Все права защищены.</p>
</div>`;
    }

    /**
     * Глобальные CSS-стили
     */
    generateGlobalCSS(colors, typography, layoutTokens = {}) {
        const containerMaxWidth = layoutTokens.container?.maxWidth || '1200px';
        const buttonRadius = layoutTokens.radius?.button || '6px';
        const cardRadius = layoutTokens.radius?.card || '8px';

        return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: ${typography.body?.fontFamily || 'Arial, sans-serif'};
    line-height: 1.6;
    color: ${colors.text || '#333333'};
    background: ${colors.background || '#ffffff'};
}

.container {
    max-width: ${containerMaxWidth};
    margin: 0 auto;
    padding: 0 20px;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    margin-bottom: 1rem;
    line-height: 1.2;
}

h1 {
    font-size: ${typography.h1?.fontSize || '2.5rem'};
    font-weight: ${typography.h1?.fontWeight || 'bold'};
}

h2 {
    font-size: ${typography.h2?.fontSize || '2rem'};
    font-weight: ${typography.h2?.fontWeight || 'bold'};
}

h3 {
    font-size: ${typography.h3?.fontSize || '1.5rem'};
    font-weight: ${typography.h3?.fontWeight || '600'};
}

p {
    font-size: ${typography.p?.fontSize || '1rem'};
    line-height: 1.6;
    margin-bottom: 1rem;
}

/* Buttons */
button {
    padding: 12px 24px;
    border: none;
    border-radius: ${buttonRadius};
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: ${layoutTokens.shadow?.soft || '0 4px 12px rgba(0,0,0,0.15)'};
}

/* Links */
a {
    color: ${colors.primary || '#007bff'};
    text-decoration: none;
    transition: color 0.3s ease;
}

a:hover {
    color: ${colors.accent || '#0056b3'};
}

/* Forms */
form input, form textarea {
    width: 100%;
    padding: 12px;
    margin-bottom: 1rem;
    border: 1px solid ${colors.border || '#dee2e6'};
    border-radius: ${buttonRadius};
    font-size: 1rem;
}

form button {
    width: 100%;
}

/* Layout */
.grid-layout, .services-grid {
    display: grid;
    gap: 2rem;
    margin-top: 2rem;
}

.placeholder-visual {
    width: 300px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${cardRadius};
}

/* Responsive */
@media (max-width: 768px) {
    .container {
        padding: 0 16px;
    }
    
    .hero-layout {
        flex-direction: column;
        text-align: center;
    }
    
    .hero-buttons {
        justify-content: center;
    }
    
    .contact-content,
    .grid-layout,
    .services-grid {
        grid-template-columns: 1fr;
    }
}`;
    }

    /**
     * CSS для корпоративного шаблона
     */
    generateCorporateCSS(colors, typography, layoutTokens = {}) {
        const cardShadow = layoutTokens.shadow?.card || '0 4px 6px rgba(0,0,0,0.1)';
        const columnsDesktop = layoutTokens.grid?.columnsDesktop || 3;

        return `.ds-nav {
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.ds-section-hero {
    min-height: 80vh;
}

.hero-layout {
    display: flex;
    gap: 3rem;
    align-items: center;
}

.hero-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
}

.placeholder-visual {
    width: 300px;
    height: 200px;
    background: ${colors.surface || '#e9ecef'};
    border: 2px dashed ${colors.border || '#dee2e6'};
    border-radius: ${layoutTokens.radius?.card || '8px'};
    display: flex;
    align-items: center;
    justify-content: center;
}

.grid-card, .service-card {
    padding: 1.5rem;
    border-radius: ${layoutTokens.radius?.card || '8px'};
    background: ${colors.background || '#ffffff'};
    box-shadow: ${cardShadow};
}

.ds-section-footer {
    background: ${colors.secondary || '#1f2933'};
    color: ${this.getContrastColor(colors.secondary || '#1f2933')};
}

.footer-inner {
    text-align: center;
    padding: 2rem 0;
}

@media (max-width: 768px) {
    .nav {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }
    
    .nav-menu {
        gap: 1rem;
    }
    
    .hero-buttons {
        justify-content: center;
    }
    
    .contact-content {
        grid-template-columns: 1fr;
    }
    
    .features-grid,
    .services-grid,
    .grid-layout {
        grid-template-columns: 1fr;
    }
}`;
    }

    /**
     * Нормализация цветов
     */
    normalizeColors(palette) {
        if (!palette || !Array.isArray(palette)) return {};

        const normalized = palette.reduce((acc, color) => {
            if (color.role && color.hex) {
                acc[color.role] = color.hex;
            }
            return acc;
        }, {});

        const findColor = (condition) => palette.find(condition)?.hex;

        normalized.background = normalized.background || findColor(c => c.role === 'background') || findColor(c => c.brightness > 240) || '#ffffff';
        normalized.text = normalized.text || findColor(c => c.role === 'text') || findColor(c => c.brightness < 50) || '#333333';
        normalized.primary = normalized.primary || findColor(c => c.role === 'primary') || findColor(c => c.saturation > 50 && c.brightness > 50 && c.brightness < 200) || '#007bff';
        normalized.accent = normalized.accent || findColor(c => c.role === 'accent') || findColor(c => c.saturation > 80) || normalized.primary || '#007bff';
        normalized.secondary = normalized.secondary || findColor(c => c.role === 'secondary') || findColor(c => c.saturation > 20 && c.saturation < 80) || '#6c757d';
        normalized.surface = normalized.surface || findColor(c => c.role === 'surface') || findColor(c => c.brightness > 200 && c.brightness < 250) || '#f8f9fa';
        normalized.border = normalized.border || this.adjustColorBrightness(normalized.text, 0.8);

        return normalized;
    }

    /**
     * Нормализация типографики
     */
    normalizeTypography(styles) {
        if (!styles || !Array.isArray(styles)) return {};

        const byTag = styles.reduce((acc, style) => {
            if (style.tag && !acc[style.tag]) {
                acc[style.tag] = style;
            }
            return acc;
        }, {});

        return {
            h1: byTag.h1 || byTag.h2 || { fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' },
            h2: byTag.h2 || byTag.h3 || { fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' },
            h3: byTag.h3 || byTag.h4 || { fontSize: '1.5rem', fontWeight: '600', fontFamily: 'Arial, sans-serif' },
            body: byTag.p || byTag.div || { fontSize: '1rem', fontFamily: 'Arial, sans-serif' },
            p: byTag.p || byTag.div || { fontSize: '1rem', fontFamily: 'Arial, sans-serif' }
        };
    }

    /**
     * Получение контрастного цвета
     */
    getContrastColor(hexColor) {
        if (!hexColor) return '#ffffff';
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    /**
     * Изменение яркости цвета
     */
    adjustColorBrightness(hex, factor) {
        if (!hex) return '#cccccc';
        let r = parseInt(hex.substr(1, 2), 16);
        let g = parseInt(hex.substr(3, 2), 16);
        let b = parseInt(hex.substr(5, 2), 16);
        
        r = Math.min(255, Math.max(0, Math.floor(r * factor)));
        g = Math.min(255, Math.max(0, Math.floor(g * factor)));
        b = Math.min(255, Math.max(0, Math.floor(b * factor)));
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * Извлечение названия бренда из домена
     */
    extractBrandName(domain) {
        if (!domain) return 'Company';
        return domain.split('.')[0]
            .replace(/[^a-zA-Zа-яА-Я0-9]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    // Заглушки для других шаблонов
    generateStartupTemplate(designSystem) { return this.generateCorporateTemplate(designSystem); }
    generatePortfolioTemplate(designSystem) { return this.generateCorporateTemplate(designSystem); }
    generateMinimalTemplate(designSystem) { return this.generateCorporateTemplate(designSystem); }
}

module.exports = SiteSynthesizer;