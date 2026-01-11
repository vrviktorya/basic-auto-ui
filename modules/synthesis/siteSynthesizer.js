// modules/synthesis/siteSynthesizer.js
class SiteSynthesizer {
    constructor() {
        this.templates = {
            corporate: this.generateCorporateTemplate.bind(this),
            startup: this.generateStartupTemplate.bind(this),
            portfolio: this.generatePortfolioTemplate.bind(this),
            minimal: this.generateMinimalTemplate.bind(this)
        };
    }

    generateSite(designSystem, templateType = 'corporate') {
        const template = this.templates[templateType] || this.templates.corporate;
        return template(designSystem);
    }

    generateCorporateTemplate(designSystem) {
        const colors = this.normalizeColors(designSystem.colors.palette);
        const typography = this.normalizeTypography(designSystem.typography.styles);
        const buttons = designSystem.buttons;
        
        // Получаем CSS для кнопок
        const buttonCSS = this.generateButtonCSS(buttons);
        
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${designSystem.domain || 'Синтезированный сайт'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <style>
        /* Global styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${typography.body?.fontFamily || 'Inter, sans-serif'};
            line-height: 1.6;
            color: ${colors.text || '#333333'};
            background: ${colors.background || '#ffffff'};
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        /* Button styles */
        ${buttonCSS}
        
        /* Header */
        .header {
            position: fixed;
            top: 0;
            width: 100%;
            z-index: 1000;
            background: ${colors.background || '#ffffff'};
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 1rem 0;
        }
        
        .nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: ${colors.primary || '#333333'};
        }
        
        .nav-menu {
            display: flex;
            list-style: none;
            gap: 2rem;
        }
        
        .nav-menu a {
            color: ${colors.text || '#333333'};
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .nav-menu a:hover {
            color: ${colors.primary || '#007bff'};
        }
        
        /* Hero Section */
        .hero {
            min-height: 80vh;
            display: flex;
            align-items: center;
            padding: 100px 2rem 2rem;
            max-width: 1200px;
            margin: 0 auto;
            gap: 3rem;
            background: ${colors.surface || colors.background || '#f8f9fa'};
        }
        
        .hero-content {
            flex: 1;
        }
        
        .hero h1 {
            font-size: ${typography.h1?.fontSize || '3rem'};
            font-weight: ${typography.h1?.fontWeight || 'bold'};
            color: ${colors.text || '#333333'};
            margin-bottom: 1.5rem;
            line-height: 1.2;
        }
        
        .hero p {
            font-size: ${typography.p?.fontSize || '1.2rem'};
            color: ${colors.text || '#666666'};
            margin-bottom: 2rem;
            max-width: 600px;
        }
        
        .hero-buttons {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
        }
        
        /* Footer */
        .footer {
            padding: 2rem 0;
            background: ${colors.surface || '#343a40'};
            color: ${colors.text || '#ffffff'};
            text-align: center;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <nav class="nav">
            <div class="logo">
                ${this.extractBrandName(designSystem.domain) || 'Brand'}
            </div>
            <ul class="nav-menu">
                <li><a href="#home">Главная</a></li>
                <li><a href="#about">О нас</a></li>
                <li><a href="#services">Услуги</a></li>
                <li><a href="#contact">Контакты</a></li>
            </ul>
            <button class="cta-button">Связаться</button>
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1>Добро пожаловать в ${this.extractBrandName(designSystem.domain) || 'нашу компанию'}</h1>
            <p>Мы предоставляем лучшие решения для вашего бизнеса с инновационным подходом и профессиональной командой.</p>
            <div class="hero-buttons">
                <button class="btn-primary">Начать работу</button>
                <button class="btn-secondary">Узнать больше</button>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 ${this.extractBrandName(designSystem.domain) || 'Company'}. Все права защищены.</p>
        </div>
    </footer>
</body>
</html>`;
    }

    generateButtonCSS(buttons) {
        // Если нет кнопок, возвращаем базовые стили
        if (!buttons || !buttons.found) {
            return this.generateDefaultButtonCSS();
        }
        
        let css = '/* Button styles */\n\n';
        
        // Primary button
        const primaryBtn = buttons.clusters.primary;
        if (primaryBtn && primaryBtn.styles) {
            const s = primaryBtn.styles;
            css += `.btn-primary, .cta-button {\n`;
            css += `  background: ${s.backgroundColor || '#007bff'};\n`;
            css += `  color: ${s.color || '#ffffff'};\n`;
            if (s.borderWidth && s.borderWidth !== '0px') {
                css += `  border: ${s.borderWidth} ${s.borderStyle || 'solid'} ${s.borderColor || s.backgroundColor || '#007bff'};\n`;
            } else {
                css += `  border: none;\n`;
            }
            css += `  border-radius: ${s.borderRadius || '6px'};\n`;
            css += `  padding: ${s.padding?.top || '12px'} ${s.padding?.right || '24px'} ${s.padding?.bottom || '12px'} ${s.padding?.left || '24px'};\n`;
            css += `  font-family: ${s.fontFamily || 'inherit'};\n`;
            css += `  font-size: ${s.fontSize || '1rem'};\n`;
            css += `  font-weight: ${s.fontWeight || '500'};\n`;
            if (s.boxShadow && s.boxShadow !== 'none') css += `  box-shadow: ${s.boxShadow};\n`;
            css += `  transition: ${s.transition || 'all 0.3s ease'};\n`;
            css += `  cursor: ${s.cursor || 'pointer'};\n`;
            css += `}\n\n`;
            
            css += `.btn-primary:hover, .cta-button:hover {\n`;
            css += `  opacity: 0.9;\n`;
            css += `  transform: translateY(-2px);\n`;
            css += `}\n\n`;
        } else {
            css += this.generateDefaultButtonCSS('primary');
        }
        
        // Secondary button
        const secondaryBtn = buttons.clusters.secondary || buttons.clusters.outline;
        if (secondaryBtn && secondaryBtn.styles) {
            const s = secondaryBtn.styles;
            css += `.btn-secondary {\n`;
            css += `  background: ${s.backgroundColor || 'transparent'};\n`;
            css += `  color: ${s.color || '#007bff'};\n`;
            if (s.borderWidth && s.borderWidth !== '0px') {
                css += `  border: ${s.borderWidth} ${s.borderStyle || 'solid'} ${s.borderColor || '#007bff'};\n`;
            } else {
                css += `  border: 2px solid ${s.color || '#007bff'};\n`;
            }
            css += `  border-radius: ${s.borderRadius || '6px'};\n`;
            css += `  padding: ${s.padding?.top || '10px'} ${s.padding?.right || '20px'} ${s.padding?.bottom || '10px'} ${s.padding?.left || '20px'};\n`;
            css += `  font-family: ${s.fontFamily || 'inherit'};\n`;
            css += `  font-size: ${s.fontSize || '1rem'};\n`;
            css += `  font-weight: ${s.fontWeight || '500'};\n`;
            css += `  transition: ${s.transition || 'all 0.3s ease'};\n`;
            css += `  cursor: ${s.cursor || 'pointer'};\n`;
            css += `}\n\n`;
            
            css += `.btn-secondary:hover {\n`;
            css += `  background: ${s.backgroundColor === 'transparent' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.1)'};\n`;
            css += `}\n`;
        } else {
            css += this.generateDefaultButtonCSS('secondary');
        }
        
        return css;
    }
    
    generateDefaultButtonCSS(type = 'all') {
        if (type === 'primary' || type === 'all') {
            return `.btn-primary, .cta-button {
    background: #007bff;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
    cursor: pointer;
    display: inline-block;
}

.btn-primary:hover, .cta-button:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}\n\n`;
        }
        
        if (type === 'secondary' || type === 'all') {
            return `.btn-secondary {
    background: transparent;
    color: #007bff;
    border: 2px solid #007bff;
    border-radius: 6px;
    padding: 10px 20px;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
    cursor: pointer;
}

.btn-secondary:hover {
    background: rgba(0, 123, 255, 0.1);
}\n`;
        }
        
        return '';
    }

    generateButtonHTML(buttons, className, text, buttonType = 'primary') {
        if (!buttons || !buttons.clusters || !buttons.clusters[buttonType]) {
            return `<button class="${className}">${text}</button>`;
        }
        
        const buttonData = buttons.clusters[buttonType];
        const hasIcon = buttonData.hasIcon;
        
        if (hasIcon) {
            return `<button class="${className}">
        <span class="material-symbols-outlined">arrow_forward</span>
        ${text}
    </button>`;
        } else {
            return `<button class="${className}">${text}</button>`;
        }
    }
    
    // Также добавьте этот метод в класс (для кнопок с иконками):
    generateIconButtonHTML(buttons, className, text, icon, buttonType = 'primary') {
        if (!buttons || !buttons.clusters || !buttons.clusters[buttonType]) {
            return `<button class="${className}">
        <span class="material-symbols-outlined">${icon}</span>
        ${text}
    </button>`;
        }
        
        return `<button class="${className}">
        <span class="material-symbols-outlined">${icon}</span>
        ${text}
    </button>`;
    }

    /* Генерация глобальных CSS-стилей */
    generateGlobalCSS(colors, typography) {
        return `
* {
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
    max-width: 1200px;
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
    margin-bottom: 1rem;
    font-size: ${typography.p?.fontSize || '1rem'};
    line-height: 1.6;
}

/* Buttons */
button {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
`;
    }

    /* CSS для корпоративного шаблона */
    generateCorporateCSS(colors, typography) {
        return `
/* Header Styles */
.header {
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
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

.nav-menu a {
    color: inherit;
    font-weight: 500;
}

/* Hero Section */
.hero {
    min-height: 80vh;
    display: flex;
    align-items: center;
    padding: 100px 2rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
    gap: 3rem;
}

.hero-content {
    flex: 1;
}

.hero-visual {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

.placeholder-visual {
    width: 300px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
}

.hero-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
}

.btn-primary, .btn-secondary {
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.3s ease;
}

.btn-secondary {
    background: transparent;
}

/* Features Section */
.features {
    padding: 4rem 0;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.feature-card {
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    background: ${colors.surface || '#ffffff'};
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-5px);
}

.feature-icon {
    width: 60px;
    height: 60px;
    margin: 0 auto 1rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

/* Services Section */
.services {
    padding: 4rem 0;
}

.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.service-card {
    padding: 2rem;
    border-radius: 8px;
    background: ${colors.background || '#ffffff'};
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Contact Section */
.contact {
    padding: 4rem 0;
}

.contact-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin-top: 3rem;
}

.contact-form {
    padding: 2rem;
    border-radius: 8px;
}

.contact-form input,
.contact-form textarea {
    width: 100%;
    padding: 12px;
    margin-bottom: 1rem;
    border-radius: 4px;
    font-size: 1rem;
}

.contact-form textarea {
    height: 120px;
    resize: vertical;
}

/* Footer */
.footer {
    padding: 2rem 0;
    text-align: center;
}

/* Responsive Design */
@media (max-width: 768px) {
    .nav {
        flex-direction: column;
        gap: 1rem;
    }
    
    .nav-menu {
        gap: 1rem;
    }
    
    .hero {
        flex-direction: column;
        text-align: center;
        padding-top: 120px;
    }
    
    .hero-buttons {
        justify-content: center;
    }
    
    .contact-content {
        grid-template-columns: 1fr;
    }
    
    .features-grid,
    .services-grid {
        grid-template-columns: 1fr;
    }
}
`;
    }

    /* Генерация карточек преимуществ */
    generateFeatureCards(colors, typography, count = 3) {
        const features = [
            { title: 'Инновации', icon: '💡', description: 'Современные технологии и подходы' },
            { title: 'Качество', icon: '⭐', description: 'Высокое качество выполнения работ' },
            { title: 'Поддержка', icon: '🔧', description: 'Круглосуточная техническая поддержка' },
            { title: 'Опыт', icon: '🏆', description: 'Многолетний опыт в отрасли' },
            { title: 'Надежность', icon: '🛡️', description: 'Гарантия надежности и безопасности' },
            { title: 'Скорость', icon: '⚡', description: 'Быстрое выполнение задач' }
        ];

        return features.slice(0, count).map(feature => `
            <div class="feature-card">
                <div class="feature-icon" style="background: ${colors.accent || colors.primary || '#007bff'}; color: ${this.getContrastColor(colors.accent || colors.primary || '#007bff')}">
                    ${feature.icon}
                </div>
                <h3 style="color: ${colors.text || '#333333'}">${feature.title}</h3>
                <p style="color: ${colors.text || '#666666'}">${feature.description}</p>
            </div>
        `).join('');
    }

    /* Генерация карточек услуг */
    generateServiceCards(colors, typography, count = 4) {
        const services = [
            { title: 'Веб-разработка', description: 'Создание современных веб-приложений' },
            { title: 'Дизайн', description: 'Разработка пользовательских интерфейсов' },
            { title: 'Консалтинг', description: 'Профессиональные консультации' },
            { title: 'Поддержка', description: 'Техническая поддержка и обслуживание' },
            { title: 'Аналитика', description: 'Анализ данных и бизнес-процессов' },
            { title: 'Маркетинг', description: 'Продвижение и маркетинговые стратегии' }
        ];

        return services.slice(0, count).map(service => `
            <div class="service-card">
                <h3 style="color: ${colors.primary || '#007bff'}">${service.title}</h3>
                <p style="color: ${colors.text || '#666666'}">${service.service}</p>
            </div>
        `).join('');
    }

    /* Нормализация цветов для удобного доступа */
    normalizeColors(palette) {
        const normalized = {};
        
        if (!palette) return normalized;

        palette.forEach(color => {
            if (color.role && color.hex) {
                normalized[color.role] = color.hex;
            }
        });

        // Заполняем недостающие роли
        if (!normalized.background) {
            const background = palette.find(c => c.role === 'background') || 
                             palette.find(c => c.brightness > 240);
            normalized.background = background?.hex || '#ffffff';
        }

        if (!normalized.text) {
            const text = palette.find(c => c.role === 'text') || 
                        palette.find(c => c.brightness < 50);
            normalized.text = text?.hex || '#333333';
        }

        if (!normalized.primary) {
            const primary = palette.find(c => c.role === 'primary') || 
                           palette.find(c => c.saturation > 50 && c.brightness > 50 && c.brightness < 200);
            normalized.primary = primary?.hex || '#007bff';
        }

        if (!normalized.accent) {
            const accent = palette.find(c => c.role === 'accent') || 
                          palette.find(c => c.saturation > 80);
            normalized.accent = accent?.hex || normalized.primary || '#007bff';
        }

        if (!normalized.secondary) {
            const secondary = palette.find(c => c.role === 'secondary') || 
                             palette.find(c => c.saturation > 20 && c.saturation < 80);
            normalized.secondary = secondary?.hex || '#6c757d';
        }

        if (!normalized.surface) {
            const surface = palette.find(c => c.role === 'surface') || 
                           palette.find(c => c.brightness > 200 && c.brightness < 250);
            normalized.surface = surface?.hex || '#f8f9fa';
        }

        if (!normalized.border) {
            normalized.border = this.adjustColorBrightness(normalized.text, 0.8);
        }

        return normalized;
    }

    /* Нормализация типографики */
    normalizeTypography(styles) {
        const normalized = {};
        
        if (!styles) return normalized;

        // Группируем по тегам и находим наиболее частые стили
        const byTag = {};
        styles.forEach(style => {
            if (style.tag && !byTag[style.tag]) {
                byTag[style.tag] = style;
            }
        });

        normalized.h1 = byTag.h1 || byTag.h2 || { fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' };
        normalized.h2 = byTag.h2 || byTag.h3 || { fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' };
        normalized.h3 = byTag.h3 || byTag.h4 || { fontSize: '1.5rem', fontWeight: '600', fontFamily: 'Arial, sans-serif' };
        normalized.body = byTag.p || byTag.div || { fontSize: '1rem', fontFamily: 'Arial, sans-serif' };
        normalized.p = byTag.p || byTag.div || { fontSize: '1rem', fontFamily: 'Arial, sans-serif' };

        return normalized;
    }

    /* Вспомогательные методы */
    getContrastColor(hexColor) {
        if (!hexColor) return '#ffffff';
        
        // Упрощенный расчет контраста
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    adjustColorBrightness(hex, factor) {
        // Упрощенное изменение яркости цвета
        let r = parseInt(hex.substr(1, 2), 16);
        let g = parseInt(hex.substr(3, 2), 16);
        let b = parseInt(hex.substr(5, 2), 16);
        
        r = Math.min(255, Math.max(0, Math.floor(r * factor)));
        g = Math.min(255, Math.max(0, Math.floor(g * factor)));
        b = Math.min(255, Math.max(0, Math.floor(b * factor)));
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    extractBrandName(domain) {
        if (!domain) return 'Company';
        return domain.split('.')[0].replace(/[^a-zA-Zа-яА-Я0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /* Другие шаблоны (заглушки для будущей реализации) */
    generateStartupTemplate(designSystem) {
        return this.generateCorporateTemplate(designSystem); // Пока используем корпоративный
    }

    generatePortfolioTemplate(designSystem) {
        return this.generateCorporateTemplate(designSystem); // Пока используем корпоративный
    }

    generateMinimalTemplate(designSystem) {
        return this.generateCorporateTemplate(designSystem); // Пока используем корпоративный
    }
}

module.exports = SiteSynthesizer;