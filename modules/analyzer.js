const puppeteer = require('puppeteer');
const BasicColorExtractor = require('./basicColorExtractor');
const UltraSimpleColorAnalyzer = require('./ultrasimpleColorAnalyzer');
const { analyzeLayout } = require('./layoutTokens');
const { buildLayoutStructure } = require('./layoutStructure');

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

        // Анализ layout
        console.log('📐 Analyzing layout...');
        const rawLayout = await extractLayout(page);
        const layoutTokens = analyzeLayout(rawLayout);
        const structure = buildLayoutStructure(rawLayout);

        return {
            url,
            domain: new URL(url).hostname,
            colors: colorAnalysis,
            typography: {
                total: typography.length,
                styles: typography
            },
            layout: {
                ...rawLayout,
                structure
            },
            layoutTokens,
            timestamp: new Date().toISOString(),
            analysisVersion: 'layout-structure-v1'
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

async function extractLayout(page) {
    return await page.evaluate(() => {
        function parsePx(v) {
            if (!v) return null;
            if (v === 'none' || v === '0' || v === '0px') return 0;
            const n = parseFloat(String(v).replace('px', '').trim());
            return isNaN(n) ? null : n;
        }

        function rgbToHex(rgb) {
            if (!rgb) return null;
            const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return null;
            const [_, r, g, b] = m.map(Number);
            const toHex = n => n.toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
        }

        function getLuma(r, g, b) {
            return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        }

        function detectType(el) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className || '').toLowerCase();

            if (tag === 'header' || cls.includes('hero') || cls.includes('banner')) return 'hero';
            if (cls.includes('services') || cls.includes('cards') || cls.includes('features')) return 'grid';
            if (cls.includes('contact') || cls.includes('form')) return 'contact';
            if (tag === 'footer' || cls.includes('footer')) return 'footer';
            return 'content';
        }

        function detectRole(el, type) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className || '').toLowerCase();

            if (tag === 'header' || cls.includes('navbar') || cls.includes('nav-bar')) return 'nav';
            if (type === 'hero') return 'hero';
            if (type === 'grid') return 'gridSection';
            if (type === 'footer') return 'footer';
            if (type === 'contact') return 'contact';
            return 'content';
        }

        function detectColumns(el) {
            const colNodes = el.querySelectorAll('[class*="col-"], .col, .card, .feature-card, .service-card');
            if (colNodes.length === 0) return null;

            const positions = Array.from(colNodes)
                .map(node => node.getBoundingClientRect().left)
                .map(x => Math.round(x / 10) * 10);
            const unique = Array.from(new Set(positions));
            const cols = unique.length;
            return cols || null;
        }

        function detectBackgroundRole(style, bgHex) {
            if (!bgHex) return 'bgNeutral';
            const m = style.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return 'bgNeutral';
            const [_, r, g, b] = m.map(Number);
            const luma = getLuma(r, g, b);

            if (luma > 0.95) return 'bgNeutral';
            if (luma > 0.6) return 'bgSurface';
            if (luma < 0.3) return 'bgDark';
            return 'bgAccent';
        }

        const docWidth = window.innerWidth || document.documentElement.clientWidth;
        const rawSections = [];
        const candidates = document.querySelectorAll(
            'header, main, footer, section, .section, .hero, .features, .services, .contact, .row'
        );

        candidates.forEach((el, index) => {
            const s = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            const paddingTop = parsePx(s.paddingTop);
            const paddingBottom = parsePx(s.paddingBottom);
            const marginTop = parsePx(s.marginTop);
            const marginBottom = parsePx(s.marginBottom);

            const maxWidth = parsePx(s.maxWidth) || rect.width;
            const isCentered = s.marginLeft === 'auto' && s.marginRight === 'auto';

            const type = detectType(el);
            const role = detectRole(el, type);
            const columns = detectColumns(el);
            const bgColorCss = s.backgroundColor;
            const bgHex = rgbToHex(bgColorCss);
            const backgroundRole = detectBackgroundRole(s, bgHex);

            rawSections.push({
                index,
                tag: el.tagName.toLowerCase(),
                className: (el.className || '').toString(),
                type,
                role,
                backgroundColor: bgHex,
                backgroundRole,
                display: s.display,
                flexDirection: s.flexDirection,
                justifyContent: s.justifyContent,
                alignItems: s.alignItems,
                gridTemplateColumns: s.gridTemplateColumns,
                columns,
                maxWidthPx: maxWidth,
                isCentered,
                widthPx: rect.width,
                paddingY: (paddingTop || 0) + (paddingBottom || 0),
                marginY: (marginTop || 0) + (marginBottom || 0),
                heightPx: rect.height,
                childrenCount: el.children.length
            });
        });

        const common = {
            viewportWidth: docWidth,
            containerMaxWidthPx: null
        };

        const centered = rawSections.filter(
            s => s.isCentered && s.maxWidthPx && s.maxWidthPx < docWidth
        );
        if (centered.length > 0) {
            const widths = centered.map(s => s.maxWidthPx).sort((a, b) => a - b);
            const mid = Math.floor(widths.length / 2);
            common.containerMaxWidthPx = widths[mid];
        }

        return {
            sections: rawSections,
            common
        };
    });
}


module.exports = analyzeDesignSystem;