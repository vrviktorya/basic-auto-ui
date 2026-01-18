// modules/components/siteSynthesizer.js
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

        console.log('📊 Typography for template:', JSON.stringify(typography, null, 2));
    
        console.log('🔍 Body fontFamily:', typography.body?.fontFamily);
        console.log('🔍 H1 fontFamily:', typography.h1?.fontFamily);
        
        const fontsToLoad = this.getFontsToLoad(typography)

        // Генерируем CSS для типографики
    const typographyCSS = this.generateTypographyCSS(typography, colors);
        
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${designSystem.domain || 'Синтезированный сайт'}</title>
    <!-- Подключаем Google Fonts -->
    ${fontsToLoad.googleFontsLink}
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: ${this.ensureFontFamily(typography.body?.fontFamily)}, ${fontsToLoad.fallbackFonts};
            font-size: ${typography.body?.fontSize || '16px'};
            line-height: ${typography.body?.lineHeight || '1.5'};
            letter-spacing: ${typography.body?.letterSpacing || 'normal'};
            color: ${colors.text || '#333333'};
            background: ${colors.background || '#ffffff'};
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        /* Typography Classes */
        ${typographyCSS}
        
        /* Button styles */
        ${buttonCSS}
        
        /* Typography Elements */
        h1, h2, h3, h4, h5, h6 {
            font-family: ${this.ensureFontFamily(typography.h1?.fontFamily)}, ${fontsToLoad.fallbackFonts};
            line-height: ${typography.h1?.lineHeight || '1.2'};
            letter-spacing: ${typography.h1?.letterSpacing || 'normal'};
            text-transform: ${typography.h1?.textTransform || 'none'};
            color: ${colors.text || '#333333'};
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

        h4 {
            font-size: ${typography.h4?.fontSize || '1.25rem'};
            font-weight: ${typography.h4?.fontWeight || '600'};
        }

        p {
            font-family: ${this.ensureFontFamily(typography.p?.fontFamily)}, ${fontsToLoad.fallbackFonts};
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 1rem;
            line-height: ${typography.p?.lineHeight || '1.5'};
            letter-spacing: ${typography.p?.letterSpacing || 'normal'};
            color: ${colors.text || '#666666'};
        }

        a {
            color: ${colors.primary || colors.text};
            text-decoration: none;
            transition: color 0.3s ease;
            cursor: pointer;
            font-size: ${typography.a?.fontSize || '1rem'};
            font-family: "${typography.a?.fontFamily || 'Arial'}", ${fontsToLoad.fallbackFonts};
            font-weight: ${typography.a?.fontWeight || 'normal'};
            letter-spacing: ${typography.a?.letterSpacing || 'normal'};
        }

        a:hover {
            color: ${colors.accent || colors.primary || colors.surface || '#0056b3'};
        }

        button, .btn-primary, .btn-secondary, .cta-button {
            font-family: "${typography.button?.fontFamily || 'Arial'}", ${fontsToLoad.fallbackFonts};
            font-size: ${typography.button?.fontSize || '1rem'};
            font-weight: ${typography.button?.fontWeight || '500'};
            letter-spacing: ${typography.button?.letterSpacing || 'normal'};
            text-transform: ${typography.button?.textTransform || 'none'};
        }

        /* Header */
        .header {
            position: fixed;
            top: 0;
            width: 100%;
            z-index: 1000;
            background: ${colors.background || '#ffffff'};
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
            color: ${colors.accent || '#333333'};
        }

        .nav-menu {
            display: flex;
            list-style: none;
            gap: 2rem;
        }
        
        .nav-menu a {
            font-size: 20px;
            font-weight: bold;
            color: ${colors.text || '#333333'};
            text-decoration: none;
            cursor: pointer;
            transition: color 0.3s ease;
        }
        
        .nav-menu a:hover {
            color: ${colors.accent || color.primary};
        }

        section {
            width: 100%;
            max-width: 1200px;
            padding-left: 2rem;
            padding-right: 2rem;
        }

        /* Hero Section */
        .hero {
            min-height: 80vh;
            display: flex;
            align-items: center;
            padding: 100px 2rem 2rem;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            gap: 3rem;
            background: ${colors.surface || colors.background || '#f8f9fa'};
        }
        
        .hero-content {
            flex: 1;
        }
        
        
        .hero h1 {
            margin-bottom: 1.5rem;
            max-width: 600px;
        }
        
        .hero p {
            margin-bottom: 2rem;
            max-width: 600px;
        }
        
        .hero-buttons {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
        }

        .placeholder-visual {
            width: 300px;
            height: 200px;
            display: flex;
            align-items: center;
            taxt-align: center;
            justify-content: center;
            border-radius: 8px;
            font-size: 16px;
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
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
            background: ${colors.surface || '#ffffff'};
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }

        .feature-card h4{
            padding-bottom: 1rem;
            line-height: normal;
        }
        .feature-card p{
            line-height: normal;
        }

        .feature-card:hover {
            transform: translateY(-3px);
        }

        .feature-icon {
            background: ${colors.accent || colors.surface || '#007bff'};
            color: ${this.getContrastColor(colors.accent || colors.primary || '#007bff')};
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
            background: ${colors.background || '#f8f9fa'}
        }

        .services h2 {
            color: ${colors.text || '#333333'}; 
            text-align: center;
        }

        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .services-grid h5 {
            color: ${colors.primary || '#007bff'}; 
            text-align: center;
            margin-bottom: 1rem;
        }

        .services-grid p {
            color: ${colors.text || '#666666'}; 
            text-align: center;
        }

        .service-card {
            padding: 1.5rem;
            border-radius: 8px;
            background: ${colors.background || '#ffffff'};
            box-shadow: 0 0 6px 0 rgba(0,0,0,0.1);
        }

        .service-card h5{
            color: ${colors.primary || '#007bff'}; 
            text-align: center;
            padding-bottom: 1rem;
            line-height: normal;
        }

        .service-card p{
            style="color: ${colors.text || '#666666'}; 
            text-align: center;
            line-height: normal;
        }

        /* Contact Section */
        .contact .container {
            padding: 2rem 4rem;
        }

        .contact-content {
            display: flex;
            margin: 0 auto;
            justify-content: space-between;
            gap: 60px;
        }

        .container h2{
           margin: 0 0 32px 0;
        }

        .contact-info {
         width: 100%;
         max-width: 420px;
        }

        .contact-info p{
            margin: 0 0 32px;
        }

        a.contact-us {
            display: block;
            margin-bottom: 6px;
            font-size: 20px;
            font-weight: 600;
            color: ${colors.text || '#007bff'};
        }

        .contact-form {
            border-radius: 8px;
            width: 100%;
            max-width: 400px;
        }

        .contact-form input,
        .contact-form textarea {
            display: flex;
            flex-basis: 56%;
            width: 100%;
            padding: 12px;
            margin-bottom: 1rem;
            border-radius: 4px;
            font-size: 20px;
        }

        .contact-form textarea {
            height: 100px;
            resize: vertical;
        }
        
        /* Footer */
        .footer {
            padding: 2rem 0;
            background: ${colors.secondary || '#ffffff'}";
            color: ${colors.text || '#ffffff'};
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

    </style>
</head>
<body>
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
            <button class="cta-button">Связаться</button>
            </nav>
    </header>

    <!-- Hero Section -->
    <section id="home" class="hero" style="background: ${colors.secondary || colors.background || '#f8f9fa'}">
        <div class="hero-content">
            <h1 style="color: ${colors.text || '#333333'}; }">Добро пожаловать в <span style="color: ${colors.accent || colors.text || '#333333'}; font-family: ">${this.extractBrandName(designSystem.domain) || 'нашу компанию'}</span></h1>
            <p style="color: ${colors.text || '#666666'}; font-size: 24px;">
                Мы предоставляем лучшие решения для вашего бизнеса с инновационным подходом и профессиональной командой.
            </p>
            <div class="hero-buttons">
                <button class="btn-primary">Начать работу</button>
                <button class="btn-secondary">Узнать больше</button>
            </div>
        </div>
        <div class="hero-visual">
            <div class="placeholder-visual" style="background: ${colors.surface || '#e9ecef'}; border: 2px dashed ${colors.border || '#dee2e6'}">
                Визуальный элемент
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="about" class="features" style="background: ${colors.background || '#ffffff'}">
        <div class="container">
            <h2 style="color: ${colors.text || '#333333'};  text-align: center;">Наши преимущества</h2>
            <div class="features-grid">
                ${this.generateFeatureCards(colors, typography, 4)}
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="services">
        <div class="container">
            <h2>Наши услуги</h2>
            <div class="services-grid">
                ${this.generateServiceCards(colors, typography, 4)}
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="contact" style="background: ${colors.secondary || '#ffffff'}">
        <div class="container">
            <h2 style="color: ${colors.text || '#333333'}; text-align: left;">Свяжитесь с нами</h2>
            <div class="contact-content">
                <div class="contact-info">
                    <p style="color: ${colors.text || '#007bff'}; font-size: 18px"">Можете связаться с нашими специалистами в любое время или оставить заявку на сайте с помощью онлайн-формы.</p>
                    <a href="tel:+971523898989" class="contact-us">+7 (999) 999-99-99</a>
                    <a href="email:info@example.com" class="contact-us"">info@example.com</a>
                </div>
                <form class="contact-form" style="background: ${colors.secondary || '#f8f9fa'}">
                    <input type="text" placeholder="Ваше имя" style="border: 1px solid ${colors.border || '#dee2e6'}">
                    <input type="email" placeholder="Ваш email" style="border: 1px solid ${colors.border || '#dee2e6'}">
                    <textarea placeholder="Ваше сообщение" style="border: 1px solid ${colors.border || '#dee2e6'}"></textarea>
                    
                    <button class="btn-primary">Отправить</button>
                </form>
            </div>
        </div>
    </section>


    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p style="font-size: 16px">&copy; 2026 ${this.extractBrandName(designSystem.domain) || 'Company'}. Все права защищены.</p>
        </div>
    </footer>
</body>
</html>`;
    }

    /* Вспомогательная функция для правильного форматирования font-family */
ensureFontFamily(fontFamily) {
    if (!fontFamily) return "'Arial'";
    
    // Если уже есть кавычки, оставляем как есть
    if (fontFamily.includes("'") || fontFamily.includes('"')) {
        return fontFamily;
    }
    
    // Иначе добавляем одинарные кавычки
    return `'${fontFamily.split(',')[0].trim()}'`;
}

    /* Определяем, какие шрифты нужно подключать */
    getFontsToLoad(typography) {
        const fontWeights = {};
        const allFonts = new Set();
        
        // Собираем все шрифты и их веса
        Object.values(typography).forEach(style => {
            if (style && style.fontFamily) {
                const cleanFont = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                if (cleanFont && cleanFont !== 'inherit') {
                    allFonts.add(cleanFont);
                    
                    if (!fontWeights[cleanFont]) {
                        fontWeights[cleanFont] = new Set();
                    }
                    
                    // Добавляем вес
                    if (style.fontWeight) {
                        // Конвертируем названия в числа
                        let weight = style.fontWeight;
                        if (weight === 'normal') weight = '400';
                        if (weight === 'bold') weight = '700';
                        fontWeights[cleanFont].add(weight);
                    }
                }
            }
        });
        
        console.log('📋 Font weights collected:', fontWeights);
        
        // Для Google Fonts
        const googleFonts = [];
        const availableGoogleFonts = ['Montserrat', 'Roboto', 'Open+Sans', 'Lato'];
        
        allFonts.forEach(font => {
            const normalizedFont = font.replace(/\s+/g, '+');
            if (availableGoogleFonts.includes(normalizedFont)) {
                // Получаем все веса для этого шрифта
                const weights = fontWeights[font] ? Array.from(fontWeights[font]) : ['400'];
                // Формируем параметр для Google Fonts
                const weightsParam = weights.join(';');
                googleFonts.push(`${normalizedFont}:wght@${weightsParam}`);
                console.log(`✅ Google Font: ${font} with weights ${weightsParam}`);
            }
        });
        
        // Формируем ссылку
        let googleFontsLink = '';
        if (googleFonts.length > 0) {
            googleFontsLink = `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?${googleFonts.join('&')}&display=swap" rel="stylesheet">`;
        }
        
        return {
            googleFontsLink,
            fallbackFonts: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            fonts: Array.from(allFonts)
        };
    }

    /* Генерация CSS классов для типографики */
generateTypographyCSS(typography, colors) {
    let css = '';
    
    // Создаем CSS-переменные для типографики
    css += ':root {\n';
    Object.entries(typography).forEach(([key, style]) => {
        if (style) {
            css += `  --font-${key}-family: ${style.fontFamily || 'inherit'};\n`;
            css += `  --font-${key}-size: ${style.fontSize || '1rem'};\n`;
            css += `  --font-${key}-weight: ${style.fontWeight || 'normal'};\n`;
            css += `  --font-${key}-line-height: ${style.lineHeight || '1.5'};\n`;
            css += `  --font-${key}-spacing: ${style.letterSpacing || 'normal'};\n`;
            css += `  --font-${key}-transform: ${style.textTransform || 'none'};\n`;
        }
    });
    css += '}\n\n';
    
    // Классы для типографики
    css += '.text-heading-1 {\n';
    css += `  font-family: var(--font-h1-family, ${typography.h1?.fontFamily || 'inherit'});\n`;
    css += `  font-size: var(--font-h1-size, ${typography.h1?.fontSize || '2.5rem'});\n`;
    css += `  font-weight: var(--font-h1-weight, ${typography.h1?.fontWeight || 'bold'});\n`;
    css += `  line-height: var(--font-h1-line-height, ${typography.h1?.lineHeight || '1.2'});\n`;
    css += `  letter-spacing: var(--font-h1-spacing, ${typography.h1?.letterSpacing || 'normal'});\n`;
    css += `  text-transform: var(--font-h1-transform, ${typography.h1?.textTransform || 'none'});\n`;
    css += `  color: ${colors.text || '#333333'};\n`;
    css += '}\n\n';
    
    css += '.text-heading-2 {\n';
    css += `  font-family: var(--font-h2-family, ${typography.h2?.fontFamily || 'inherit'});\n`;
    css += `  font-size: var(--font-h2-size, ${typography.h2?.fontSize || '2rem'});\n`;
    css += `  font-weight: var(--font-h2-weight, ${typography.h2?.fontWeight || 'bold'});\n`;
    css += `  line-height: var(--font-h2-line-height, ${typography.h2?.lineHeight || '1.3'});\n`;
    css += `  letter-spacing: var(--font-h2-spacing, ${typography.h2?.letterSpacing || 'normal'});\n`;
    css += `  text-transform: var(--font-h2-transform, ${typography.h2?.textTransform || 'none'});\n`;
    css += `  color: ${colors.text || '#333333'};\n`;
    css += '}\n\n';
    
    css += '.text-body {\n';
    css += `  font-family: var(--font-p-family, ${typography.p?.fontFamily || 'inherit'});\n`;
    css += `  font-size: var(--font-p-size, ${typography.p?.fontSize || '1rem'});\n`;
    css += `  font-weight: var(--font-p-weight, ${typography.p?.fontWeight || 'normal'});\n`;
    css += `  line-height: var(--font-p-line-height, ${typography.p?.lineHeight || '1.5'});\n`;
    css += `  letter-spacing: var(--font-p-spacing, ${typography.p?.letterSpacing || 'normal'});\n`;
    css += `  text-transform: var(--font-p-transform, ${typography.p?.textTransform || 'none'});\n`;
    css += `  color: ${colors.text || '#666666'};\n`;
    css += '}\n\n';
    
    return css;
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
    taxt-align: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 16px;
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
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
    generateFeatureCards(colors, typography, count = 4) {
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
                <div class="feature-icon">
                    ${feature.icon}
                </div>
                <h4 style="color: ${colors.text || '#333333'}; text-align: center;">${feature.title}</h3>
                <p style="color: ${colors.text || '#666666'}; font-size: 18px; text-align: center;">${feature.description}</p>
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
                <h5>${service.title}</h3>
                <p style="font-size: 18px">${service.description}</p>
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

    normalizeTypography(styles) {
        console.log('🔄 Normalizing typography...');
        console.log('Input styles:', styles ? styles.length : 0);
    
        const defaultStyles = {
            h1: { fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', lineHeight: '1.2' },
            h2: { fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', lineHeight: '1.3' },
            h3: { fontSize: '1.5rem', fontWeight: '600', fontFamily: 'Arial, sans-serif', lineHeight: '1.4' },
            h4: { fontSize: '1.25rem', fontWeight: '600', fontFamily: 'Arial, sans-serif', lineHeight: '1.4' },
            h5: { fontSize: '1.125rem', fontWeight: '600', fontFamily: 'Arial, sans-serif', lineHeight: '1.4' },
            h6: { fontSize: '1rem', fontWeight: '600', fontFamily: 'Arial, sans-serif', lineHeight: '1.4' },
            p: { fontSize: '1rem', fontFamily: 'Arial, sans-serif', fontWeight: 'normal', lineHeight: '1.5' },
            a: { fontSize: '1rem', fontFamily: 'Arial, sans-serif', fontWeight: 'normal', lineHeight: '1.5' },
            button: { fontSize: '1rem', fontFamily: 'Arial, sans-serif', fontWeight: '500', lineHeight: '1.5' },
            body: { fontSize: '1rem', fontFamily: 'Arial, sans-serif', fontWeight: 'normal', lineHeight: '1.5' }
        };
    
        if (!styles || styles.length === 0) {
            console.log('⚠️ No typography styles found, using defaults');
            return defaultStyles;
        }
    
        const normalized = { ...defaultStyles };
        const byTag = {};
        
        // Группируем по тегам
        styles.forEach(style => {
            if (style && style.tag) {
                const tag = style.tag.toLowerCase();
                if (!byTag[tag]) {
                    byTag[tag] = [];
                }
                byTag[tag].push(style);
            }
        });
    
        console.log('Grouped by tag:', Object.keys(byTag));
    
        // Функция для поиска ближайшего заголовка
        const findClosestHeading = (targetTag) => {
            const headingsOrder = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
            const targetIndex = headingsOrder.indexOf(targetTag);
            
            // Ищем вверх (более крупные заголовки)
            for (let i = targetIndex - 1; i >= 0; i--) {
                const higherTag = headingsOrder[i];
                if (byTag[higherTag] && byTag[higherTag].length > 0) {
                    console.log(`🔍 Found ${higherTag} above ${targetTag}`);
                    return byTag[higherTag][0];
                }
            }
            
            // Ищем вниз (менее крупные заголовки)
            for (let i = targetIndex + 1; i < headingsOrder.length; i++) {
                const lowerTag = headingsOrder[i];
                if (byTag[lowerTag] && byTag[lowerTag].length > 0) {
                    console.log(`🔍 Found ${lowerTag} below ${targetTag}`);
                    return byTag[lowerTag][0];
                }
            }
            
            // Если ничего не нашли, ищем любой заголовок
            for (const tag of headingsOrder) {
                if (byTag[tag] && byTag[tag].length > 0) {
                    console.log(`🔍 Found any heading ${tag} for ${targetTag}`);
                    return byTag[tag][0];
                }
            }
            
            return null;
        };
    
        // Обрабатываем ВСЕ заголовки в порядке важности
        const headingsOrder = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        
        for (const tag of headingsOrder) {
            if (byTag[tag] && byTag[tag].length > 0) {
                // Если стиль найден для этого тега
                const style = byTag[tag][0];
                normalized[tag] = {
                    fontSize: style.fontSize,
                    fontFamily: style.fontFamily,
                    fontWeight: style.fontWeight,
                    lineHeight: style.lineHeight,
                    letterSpacing: style.letterSpacing,
                    textTransform: style.textTransform,
                    color: style.color
                };
                console.log(`✅ Set ${tag} (found): ${normalized[tag].fontFamily} ${normalized[tag].fontSize}`);
            } else {
                // Ищем ближайший заголовок
                console.log(`🔍 Looking for closest heading to ${tag}...`);
                const closestStyle = findClosestHeading(tag);
                
                if (closestStyle) {
                    normalized[tag] = {
                        fontSize: this.adjustFontSizeForHeading(tag, closestStyle.fontSize),
                        fontFamily: closestStyle.fontFamily,
                        fontWeight: closestStyle.fontWeight,
                        lineHeight: closestStyle.lineHeight,
                        letterSpacing: closestStyle.letterSpacing || 'normal',
                        textTransform: closestStyle.textTransform || 'none',
                        color: closestStyle.color
                    };
                    console.log(`✅ Set ${tag} (from closest): ${normalized[tag].fontFamily} ${normalized[tag].fontSize}`);
                } else {
                    console.log(`⚠️ No style found for ${tag}, keeping default`);
                }
            }
        }
    
        // Обрабатываем другие теги (p, a, button, body)
        const otherTags = ['p', 'a', 'button', 'body'];
        
        otherTags.forEach(tag => {
            if (byTag[tag] && byTag[tag].length > 0) {
                const style = byTag[tag][0];
                normalized[tag] = {
                    fontSize: style.fontSize,
                    fontFamily: style.fontFamily,
                    fontWeight: style.fontWeight,
                    lineHeight: style.lineHeight,
                    letterSpacing: style.letterSpacing,
                    textTransform: style.textTransform,
                    color: style.color
                };
                console.log(`✅ Set ${tag}: ${normalized[tag].fontFamily} ${normalized[tag].fontSize}`);
            } else {
                // Специальная логика для body
                if (tag === 'body') {
                    if (byTag['p'] && byTag['p'].length > 0) {
                        const pStyle = byTag['p'][0];
                        normalized.body = {
                            fontSize: pStyle.fontSize,
                            fontFamily: pStyle.fontFamily,
                            fontWeight: pStyle.fontWeight,
                            lineHeight: pStyle.lineHeight,
                            letterSpacing: pStyle.letterSpacing || 'normal',
                            textTransform: pStyle.textTransform || 'none'
                        };
                        console.log(`✅ Set body from p: ${normalized.body.fontFamily}`);
                    } else if (byTag['div'] && byTag['div'].length > 0) {
                        const divStyle = byTag['div'][0];
                        normalized.body = {
                            fontSize: divStyle.fontSize,
                            fontFamily: divStyle.fontFamily,
                            fontWeight: divStyle.fontWeight,
                            lineHeight: divStyle.lineHeight,
                            letterSpacing: divStyle.letterSpacing || 'normal',
                            textTransform: divStyle.textTransform || 'none'
                        };
                        console.log(`✅ Set body from div: ${normalized.body.fontFamily}`);
                    }
                }
                
                // Для button, если не найден, используем стиль от a или p
                else if (tag === 'button') {
                    if (byTag['a'] && byTag['a'].length > 0) {
                        const aStyle = byTag['a'][0];
                        normalized.button = {
                            fontSize: aStyle.fontSize,
                            fontFamily: aStyle.fontFamily,
                            fontWeight: aStyle.fontWeight,
                            lineHeight: aStyle.lineHeight,
                            letterSpacing: aStyle.letterSpacing || 'normal',
                            textTransform: aStyle.textTransform || 'none'
                        };
                    } else if (byTag['p'] && byTag['p'].length > 0) {
                        const pStyle = byTag['p'][0];
                        normalized.button = {
                            fontSize: pStyle.fontSize,
                            fontFamily: pStyle.fontFamily,
                            fontWeight: pStyle.fontWeight || '500',
                            lineHeight: pStyle.lineHeight,
                            letterSpacing: pStyle.letterSpacing || 'normal',
                            textTransform: pStyle.textTransform || 'none'
                        };
                    }
                }
            }
        });
    
        return normalized;
    }
    
    /* Вспомогательная функция для корректировки размера шрифта в зависимости от уровня заголовка */
    adjustFontSizeForHeading(tag, originalSize) {
        const headingLevels = {
            'h1': 1, 'h2': 2, 'h3': 3, 'h4': 4, 'h5': 5, 'h6': 6
        };
        
        const baseSize = parseFloat(originalSize) || 16;
        const level = headingLevels[tag] || 1;
        
        // Коэффициенты для уменьшения размера шрифта для более мелких заголовков
        const multipliers = {
            1: 1.0,    // h1 - 100%
            2: 0.85,   // h2 - 85%
            3: 0.70,   // h3 - 70%
            4: 0.60,   // h4 - 60%
            5: 0.50,   // h5 - 50%
            6: 0.45    // h6 - 45%
        };
        
        const adjustedSize = baseSize * multipliers[level];
        return `${adjustedSize}px`;
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