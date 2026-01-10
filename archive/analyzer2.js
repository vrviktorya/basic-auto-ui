const puppeteer = require('puppeteer');
const BasicColorExtractor = require('../basicColorExtractor');
const UltraSimpleColorAnalyzer = require('../ultrasimpleColorAnalyzer');
//const HybridColorAnalyzer = require('./hybridColorAnalyzer'); // ЗАМЕНЯЕМ
//const EnhancedColorExtractor = require('./enhancedColorExtractor'); // Новый извлекатель

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

        return {
            url,
            domain: new URL(url).hostname,
            colors: colorAnalysis,
            typography: {
                total: typography.length,
                styles: typography
            },
            timestamp: new Date().toISOString(),
            analysisVersion: 'stable-v1'
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
    return await page.evaluate(() => {
        const fonts = new Map();
        const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button, li, div');
        
        elements.forEach(element => {
            try {
                const style = window.getComputedStyle(element);
                const text = element.textContent.trim();
                
                if (text && text.length > 0 && text.length < 100) {
                    const fontData = {
                        fontSize: style.fontSize,
                        fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, ''),
                        fontWeight: style.fontWeight,
                        lineHeight: style.lineHeight,
                        color: style.color,
                        tag: element.tagName.toLowerCase(),
                        example: text.substring(0, 50)
                    };
                    
                    const key = `${fontData.fontFamily}-${fontData.fontSize}-${fontData.fontWeight}`;
                    if (!fonts.has(key)) {
                        fonts.set(key, fontData);
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        });
        
        return Array.from(fonts.values());
    });
}

module.exports = analyzeDesignSystem;