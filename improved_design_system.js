// прри ошибке в design-system-analysis
const puppeteer = require('puppeteer');
const kmeans = require('node-kmeans');
const fs = require('fs');
const path = require('path');

// Создаем папку для результатов
const resultsDir = path.join(__dirname, 'design-systems');
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
}

// Улучшенная функция анализа с лучшей обработкой ошибок
async function analyzeDesignSystem(url) {
    let browser;
    try {
        console.log(`🔍 Начинаем анализ: ${url}`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            timeout: 60000
        });

        const page = await browser.newPage();
        
        // Устанавливаем таймауты
        page.setDefaultNavigationTimeout(45000);
        page.setDefaultTimeout(30000);
        
        // Устанавливаем User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`🌐 Переходим на ${url}...`);
        
        const response = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 45000
        });

        if (!response || !response.ok()) {
            throw new Error(`HTTP error: ${response ? response.status() : 'no response'}`);
        }

        console.log('✅ Страница загружена');

        // Анализ цветов
        const colors = await page.evaluate(() => {
            const colorSet = new Set();
            const elements = document.querySelectorAll('body *');
            
            elements.forEach(element => {
                try {
                    const style = window.getComputedStyle(element);
                    const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 
                                      'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
                    
                    colorProps.forEach(prop => {
                        const color = style[prop];
                        if (color && 
                            color !== 'rgba(0, 0, 0, 0)' && 
                            color !== 'transparent' &&
                            !color.includes('gradient') &&
                            color !== 'rgb(0, 0, 0)') {
                            colorSet.add(color);
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки для отдельных элементов
                }
            });
            
            return Array.from(colorSet);
        });

        // Анализ типографики
        const typography = await page.evaluate(() => {
            const fonts = new Map();
            const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button, li');
            
            elements.forEach(element => {
                try {
                    const style = window.getComputedStyle(element);
                    const text = element.textContent.trim();
                    
                    if (text && text.length > 0) {
                        const fontKey = `${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;
                        if (!fonts.has(fontKey)) {
                            fonts.set(fontKey, {
                                fontSize: style.fontSize,
                                fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, ''),
                                fontWeight: style.fontWeight,
                                lineHeight: style.lineHeight,
                                color: style.color,
                                example: text.substring(0, 40) + (text.length > 40 ? '...' : ''),
                                tag: element.tagName.toLowerCase()
                            });
                        }
                    }
                } catch (e) {
                    // Игнорируем ошибки
                }
            });
            
            return Array.from(fonts.values());
        });

        // Кластеризация цветов
        const colorVectors = colors.map(color => {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
        }).filter(Boolean);

        let colorPalette = [];
        
        if (colorVectors.length > 0) {
            const clustersCount = Math.min(6, Math.max(3, Math.floor(colorVectors.length / 5)));
            colorPalette = await new Promise((resolve) => {
                kmeans.clusterize(colorVectors, { k: clustersCount }, (err, res) => {
                    if (!err && res) {
                        const palette = res.map(cluster => {
                            const centroid = cluster.centroid.map(val => Math.round(val));
                            return {
                                rgb: `rgb(${centroid.join(', ')})`,
                                hex: `#${((1 << 24) + (centroid[0] << 16) + (centroid[1] << 8) + centroid[2]).toString(16).slice(1).toUpperCase()}`,
                                count: cluster.cluster.length
                            };
                        }).sort((a, b) => b.count - a.count);
                        resolve(palette);
                    } else {
                        resolve([]);
                    }
                });
            });
        }

        return {
            url,
            domain: new URL(url).hostname,
            colors: {
                total: colors.length,
                palette: colorPalette
            },
            typography: {
                total: typography.length,
                styles: typography
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error(`❌ Ошибка анализа ${url}:`, error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Функция генерации дизайн-системы
function generateDesignSystem(analysis, outputName = null) {
    if (!analysis) return null;

    const domain = analysis.domain.replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = outputName || `design-system-${domain}`;
    const filePath = path.join(resultsDir, fileName);

    // Генерация CSS
    const cssContent = generateCSS(analysis);
    fs.writeFileSync(`${filePath}.css`, cssContent);

    // Генерация HTML демо
    const htmlContent = generateHTMLDemo(analysis, `${fileName}.css`);
    fs.writeFileSync(`${filePath}.html`, htmlContent);

    // Генерация JSON с данными
    const jsonContent = JSON.stringify(analysis, null, 2);
    fs.writeFileSync(`${filePath}.json`, jsonContent);

    console.log(`✅ Дизайн-система для ${analysis.domain} сохранена в:\n   - ${filePath}.css\n   - ${filePath}.html\n   - ${filePath}.json`);

    return filePath;
}

// Генерация CSS
function generateCSS(analysis) {
    const { colors, typography } = analysis;
    
    let css = `/* Автоматически сгенерированная дизайн-система */
/* Источник: ${analysis.url} */
/* Сгенерировано: ${analysis.timestamp} */

:root {
  /* Цветовая палитра */\n`;

    // Добавляем цвета как CSS переменные
    colors.palette.forEach((color, index) => {
        const role = getColorRole(color.hex, index);
        css += `  --color-${role}: ${color.hex};\n`;
        css += `  --color-${role}-rgb: ${color.rgb};\n`;
    });

    css += '\n  /* Типографика */\n';

    // Группируем шрифты по размерам
    const fontSizes = [...new Set(typography.styles.map(style => style.fontSize))].sort((a, b) => {
        return parseFloat(a) - parseFloat(b);
    });

    fontSizes.forEach((size, index) => {
        css += `  --font-size-${index + 1}: ${size};\n`;
    });

    // Основной шрифт (самый частый)
    const mainFont = typography.styles.reduce((prev, current) => 
        prev.count > current.count ? prev : current
    );

    if (mainFont) {
        css += `  --font-primary: ${mainFont.fontFamily}, sans-serif;\n`;
        css += `  --font-weight-normal: ${mainFont.fontWeight};\n`;
        css += `  --line-height-normal: ${mainFont.lineHeight};\n`;
    }

    css += `}

/* Базовые стили */
* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-primary);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  background-color: var(--color-background);
  color: var(--color-text-primary);
  margin: 0;
  padding: 0;
}

/* Типографика */
h1 { 
  font-size: var(--font-size-5); 
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 1rem;
}

h2 { 
  font-size: var(--font-size-4); 
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.8rem;
}

h3 { 
  font-size: var(--font-size-3); 
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.6rem;
}

p, .text-body {
  font-size: var(--font-size-2);
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.text-small {
  font-size: var(--font-size-1);
  color: var(--color-text-tertiary);
}

/* Компоненты */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  border-radius: 6px;
  font-size: var(--font-size-2);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;
}

.button:hover {
  background-color: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.button-secondary {
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);
}

.button-outline {
  background-color: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.card {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.header {
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.footer {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  padding: 2rem;
  border-top: 1px solid var(--color-border);
}

/* Утилиты */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.color-swatch {
  display: inline-block;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  margin: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
`;

    return css;
}

// Генерация HTML демо
function generateHTMLDemo(analysis, cssFile) {
    const { colors, typography } = analysis;
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Дизайн-система - ${analysis.domain}</title>
    <link rel="stylesheet" href="${cssFile}">
    <style>
        .color-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        .color-item {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .color-preview {
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        .color-info {
            padding: 0.5rem;
            background: white;
            font-size: 0.8rem;
        }
        .typography-sample {
            margin: 1rem 0;
            padding: 1rem;
            border-left: 4px solid var(--color-primary);
            background: var(--color-surface);
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>🎨 Дизайн-система</h1>
            <p>Автоматически сгенерирована на основе <a href="${analysis.url}" style="color: inherit;">${analysis.domain}</a></p>
        </div>
    </header>

    <main class="container">
        <section>
            <h2>Цветовая палитра</h2>
            <div class="color-grid">
                ${colors.palette.map(color => `
                <div class="color-item">
                    <div class="color-preview" style="background: ${color.hex}; color: ${getContrastColor(color.hex)};">
                        ${color.hex}
                    </div>
                    <div class="color-info">
                        <strong>${getColorRole(color.hex, colors.palette.indexOf(color))}</strong><br>
                        ${color.rgb}<br>
                        Используется в ${color.count} элементах
                    </div>
                </div>
                `).join('')}
            </div>
        </section>

        <section>
            <h2>Типографика</h2>
            ${typography.styles.slice(0, 10).map(style => `
            <div class="typography-sample">
                <div style="font-size: ${style.fontSize}; font-family: ${style.fontFamily}; font-weight: ${style.fontWeight}; line-height: ${style.lineHeight}; color: ${style.color};">
                    ${style.example || 'Пример текста'}
                </div>
                <small>
                    ${style.tag.toUpperCase()} | ${style.fontSize} | ${style.fontFamily} | Вес: ${style.fontWeight}
                </small>
            </div>
            `).join('')}
        </section>

        <section>
            <h2>Компоненты</h2>
            <div class="grid">
                <div class="card">
                    <h3>Кнопки</h3>
                    <button class="button">Основная кнопка</button>
                    <button class="button button-secondary">Вторичная кнопка</button>
                    <button class="button button-outline">Контурная кнопка</button>
                </div>
                
                <div class="card">
                    <h3>Карточки</h3>
                    <div class="card">
                        <h4>Пример карточки</h4>
                        <p>Это автоматически сгенерированная карточка с подобранными стилями.</p>
                        <button class="button">Действие</button>
                    </div>
                </div>
            </div>
        </section>

        <section>
            <h2>Типографическая шкала</h2>
            <div class="card">
                <h1>Заголовок H1</h1>
                <h2>Заголовок H2</h2>
                <h3>Заголовок H3</h3>
                <p>Основной текст абзаца с автоматически подобранными стилями шрифта, размера и цвета.</p>
                <p class="text-small">Мелкий текст для подписей и дополнительной информации.</p>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>Сгенерировано: ${new Date(analysis.timestamp).toLocaleString('ru-RU')}</p>
            <p>Всего цветов: ${colors.total} | Стилей текста: ${typography.total}</p>
        </div>
    </footer>
</body>
</html>`;
}

// Вспомогательные функции
function getColorRole(hex, index) {
    const color = hex.toLowerCase();
    const brightness = getBrightness(hex);
    
    if (brightness > 240) return 'background';
    if (brightness < 30) return 'text-primary';
    if (index === 0) return 'primary';
    if (index === 1) return 'secondary';
    if (index === 2) return 'accent';
    if (brightness > 200) return 'surface';
    if (brightness > 150) return 'border';
    return `color-${index + 1}`;
}

function getBrightness(hex) {
    const r = parseInt(hex.substr(1,2), 16);
    const g = parseInt(hex.substr(3,2), 16);
    const b = parseInt(hex.substr(5,2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

function getContrastColor(hex) {
    const brightness = getBrightness(hex);
    return brightness > 128 ? '#000000' : '#FFFFFF';
}

// Основная функция
(async () => {
    const sites = [
        'https://www.awwwards.com/',
        'https://coolors.co/',
        'https://dribbble.com/',
        'https://stripe.com/'
    ];

    console.log('🚀 ЗАПУСК УЛУЧШЕННОГО АНАЛИЗА ДИЗАЙН-СИСТЕМ\n');

    for (const site of sites) {
        console.log(`\n${'='.repeat(60)}`);
        const analysis = await analyzeDesignSystem(site);
        
        if (analysis) {
            generateDesignSystem(analysis);
        } else {
            console.log(`❌ Пропускаем ${site} из-за ошибки анализа`);
        }
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`\n🎉 Анализ завершен! Все файлы сохранены в папку: ${resultsDir}`);
})();