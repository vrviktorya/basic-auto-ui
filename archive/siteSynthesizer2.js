class SiteSynthesizer {
    constructor() {
        this.templates = {
            corporate: this.generateCorporateTemplate.bind(this),
            startup: this.generateStartupTemplate.bind(this),
            portfolio: this.generatePortfolioTemplate.bind(this),
            minimal: this.generateMinimalTemplate.bind(this)
        };
    }

    /* Основной метод для генерации сайта */
    generateSite(designSystem, templateType = 'corporate') {
        const template = this.templates[templateType] || this.templates.corporate;
        return template(designSystem);
    }

    /* Корпоративный шаблон (подходит для банков, IT-компаний) */
    generateCorporateTemplate(designSystem) {
        const colors = this.normalizeColors(designSystem.colors.palette);
        const typography = this.normalizeTypography(designSystem.typography.styles);
        
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${designSystem.domain || 'Синтезированный сайт'}</title>
    <style>
        ${this.generateGlobalCSS(colors, typography)}
        ${this.generateCorporateCSS(colors, typography)}
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header" style="background: ${colors.background || '#ffffff'}">
        <nav class="nav">
            <div class="logo" style="color: ${colors.primary || '#333333'}">
                ${this.extractBrandName(designSystem.domain) || 'Brand'}
            </div>
            <ul class="nav-menu">
                <li><a href="#home" style="color: ${colors.text || '#333333'}">Главная</a></li>
                <li><a href="#about" style="color: ${colors.text || '#333333'}">О нас</a></li>
                <li><a href="#services" style="color: ${colors.text || '#333333'}">Услуги</a></li>
                <li><a href="#contact" style="color: ${colors.text || '#333333'}">Контакты</a></li>
            </ul>
            <button class="cta-button" style="background: ${colors.accent || colors.primary || '#007bff'}; color: ${this.getContrastColor(colors.accent || colors.primary || '#007bff')}">
                Связаться
            </button>
        </nav>
    </header>

    <!-- Hero Section -->
    <section id="home" class="hero" style="background: ${colors.surface || colors.background || '#f8f9fa'}">
        <div class="hero-content">
            <h1 style="color: ${colors.text || '#333333'}; font-family: ${typography.h1?.fontFamily || 'inherit'}">
                Добро пожаловать в нашу компанию
            </h1>
            <p style="color: ${colors.text || '#666666'}; font-family: ${typography.p?.fontFamily || 'inherit'}">
                Мы предоставляем лучшие решения для вашего бизнеса с инновационным подходом и профессиональной командой.
            </p>
            <div class="hero-buttons">
                <button class="btn-primary" style="background: ${colors.primary || colors.accent || '#007bff'}; color: ${this.getContrastColor(colors.primary || colors.accent || '#007bff')}">
                    Начать работу
                </button>
                <button class="btn-secondary" style="border-color: ${colors.primary || '#007bff'}; color: ${colors.primary || '#007bff'}">
                    Узнать больше
                </button>
            </div>
        </div>
        <div class="hero-visual">
            <div class="placeholder-visual" style="background: ${colors.secondary || '#e9ecef'}; border: 2px dashed ${colors.border || '#dee2e6'}">
                Визуальный элемент
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="about" class="features" style="background: ${colors.background || '#ffffff'}">
        <div class="container">
            <h2 style="color: ${colors.text || '#333333'}; text-align: center;">Наши преимущества</h2>
            <div class="features-grid">
                ${this.generateFeatureCards(colors, typography, 3)}
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="services" style="background: ${colors.surface || '#f8f9fa'}">
        <div class="container">
            <h2 style="color: ${colors.text || '#333333'}; text-align: center;">Наши услуги</h2>
            <div class="services-grid">
                ${this.generateServiceCards(colors, typography, 4)}
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="contact" style="background: ${colors.background || '#ffffff'}">
        <div class="container">
            <h2 style="color: ${colors.text || '#333333'}; text-align: center;">Свяжитесь с нами</h2>
            <div class="contact-content">
                <div class="contact-info">
                    <h3 style="color: ${colors.primary || '#007bff'}">Контактная информация</h3>
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
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer" style="background: ${colors.surface || '#343a40'}; color: ${colors.text || '#ffffff'}">
        <div class="container">
            <p>&copy; 2024 ${this.extractBrandName(designSystem.domain) || 'Company'}. Все права защищены.</p>
        </div>
    </footer>
</body>
</html>`;
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
