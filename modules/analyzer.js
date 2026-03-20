// modules/analyzer.js
const puppeteer = require('puppeteer');
const BasicColorExtractor = require('./colors/basicColorExtractor');
const UltraSimpleColorAnalyzer = require('./colors/ultrasimpleColorAnalyzer');
const ButtonAnalyzer = require('./components/buttonAnalyzer');


async function analyzeDesignSystem(url) {
    let browser;
    
    try {
        console.log(`🔍 Starting analysis: ${url}`);
        
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            timeout: 30000
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(20000);
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`🌐 Navigating to: ${url}`);
        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        if (!response || !response.ok()) {
            throw new Error(`HTTP error: ${response ? response.status() : 'no response'}`);
        }

        console.log('✅ Page loaded successfully');

        // Ждем загрузки контента
        await page.waitForTimeout(3000);
        
        // Прокручиваем страницу для загрузки ленивых элементов
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
        
        await page.waitForTimeout(2000);

        // Извлекаем цвета
        console.log('🎨 Extracting colors...');
        const extractor = new BasicColorExtractor();
        const colors = await extractor.extractAllColors(page);
        
        console.log(`📊 Raw colors: ${colors.length}`);
        
        // Анализируем цвета
        console.log('🔬 Analyzing colors...');
        const analyzer = new UltraSimpleColorAnalyzer();
        const colorAnalysis = await analyzer.analyzeColors(colors);
        
        console.log(`🎯 Final palette: ${colorAnalysis.palette.length} colors`);
        
        // Анализ типографики
        console.log('📝 Analyzing typography...');
        const typography = await extractTypography(page);

        // Анализ кнопок
        console.log('🔄 Extracting buttons...');
        const buttonAnalyzer = new ButtonAnalyzer();
        const rawButtons = await buttonAnalyzer.extractButtons(page);
        
        console.log(`📊 Found ${rawButtons.length} button-like elements`);
        
        let buttonClusters = {};
        
        if (rawButtons.length > 0) {
            buttonClusters = buttonAnalyzer.clusterButtons(rawButtons);
            
            // Выводим информацию о найденных кнопках
            console.log('📋 Button clusters:');
            Object.entries(buttonClusters).forEach(([type, button]) => {
                if (button) {
                    console.log(`  ${type}: ${button.text || 'no text'} (${button.styles.backgroundColor || 'no bg'})`);
                }
            });
        } else {
            console.log('ℹ️ No buttons found, using default styles');
            buttonClusters = {
                primary: null,
                secondary: null,
                outline: null,
                text: null,
                icon: null
            };
        }

        return {
            url,
            domain: new URL(url).hostname,
            colors: colorAnalysis,
            typography: {
                total: typography.length,
                styles: typography
            },
            buttons: {
                total: rawButtons.length,
                found: rawButtons.length > 0,
                clusters: buttonClusters,
                samples: rawButtons.slice(0, 5)
            },
            timestamp: new Date().toISOString(),
            analysisVersion: 'stable-v2'
        };

    } catch (error) {
        console.error(`❌ Analysis failed for ${url}:`, error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function extractTypography(page) {
    console.log('📝 Starting detailed typography extraction...');
    
    const result = await page.evaluate(() => {
        const fonts = new Map();
        const elements = document.querySelectorAll('*');
        
        console.log(`📝 Scanning ${elements.length} elements for fonts...`);
        
        elements.forEach(element => {
            try {
                const style = window.getComputedStyle(element);
                const text = element.textContent.trim();
                
                if (text && text.length > 0 && text.length < 200) {
                    const fontData = {
                        fontSize: style.fontSize,
                        fontFamily: style.fontFamily,
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        color: style.color,
                        tag: element.tagName.toLowerCase(),
                        example: text.substring(0, 50)
                    };
                    
                    // ОЧЕНЬ ВАЖНО: Очищаем название шрифта
                    if (fontData.fontFamily) {
                        // Берем первый шрифт из списка, убираем кавычки
                        const cleanedFont = fontData.fontFamily.split(',')[0]
                            .replace(/['"]/g, '')
                            .trim();
                        fontData.fontFamily = cleanedFont;
                        
                        // Логируем заголовки
                        if (['h1', 'h2', 'h3'].includes(fontData.tag.toLowerCase())) {
                            console.log(`🎯 Found heading ${fontData.tag}: ${cleanedFont} ${fontData.fontSize}`);
                        }
                    }
                    
                    const key = `${fontData.fontFamily}-${fontData.fontSize}-${fontData.fontWeight}`;
                    if (!fonts.has(key)) {
                        fonts.set(key, fontData);
                    }
                }
            } catch (e) {
                // Игнорируем ошибки
            }
        });
        
        console.log(`📝 Extracted ${fonts.size} unique font styles`);
        // Выводим первые 5 найденных шрифтов
        Array.from(fonts.values()).slice(0, 5).forEach((font, i) => {
            console.log(`  ${i+1}. ${font.tag}: ${font.fontFamily} ${font.fontSize}`);
        });
        
        return Array.from(fonts.values());
    });
    
    console.log(`✅ Typography extraction completed: ${result.length} styles`);
    return result;
}

module.exports = analyzeDesignSystem;