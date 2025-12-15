// анализ через screenshot
const puppeteer = require('puppeteer');
const Jimp = require('jimp');

// Сначала установите Jimp: npm install jimp

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('🌐 Переходим на сайт...');
    await page.goto('https://stripe.com/', { // Stripe имеет красивую цветовую палитру
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Страница загружена');

    // Способ 1: Анализ через computed styles
    console.log('🔍 Анализ стилей...');
    const stylesAnalysis = await page.evaluate(() => {
      const colorMap = new Map();
      const sampleElements = document.querySelectorAll([
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        'a', 'button', 'section', 'header', 'footer'
      ].join(','));

      sampleElements.forEach(el => {
        try {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          const textColor = style.color;
          const borderColor = style.borderColor;

          [bgColor, textColor, borderColor].forEach(color => {
            if (color && 
                color !== 'rgba(0, 0, 0, 0)' && 
                color !== 'transparent' &&
                !color.startsWith('rgba(0, 0, 0,')) {
              
              colorMap.set(color, (colorMap.get(color) || 0) + 1);
            }
          });
        } catch (e) {
          // Пропускаем элементы с ошибками
        }
      });

      // Сортируем по частоте использования
      return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20) // Топ-20 цветов
        .map(entry => ({ color: entry[0], count: entry[1] }));
    });

    console.log('🎨 Топ цветов по частоте использования:');
    stylesAnalysis.forEach((item, index) => {
      console.log(`${index + 1}. ${item.color} (используется ${item.count} раз)`);
    });

    // Способ 2: Делаем скриншот и анализируем доминирующие цвета
    console.log('📸 Делаем скриншот для анализа...');
    await page.screenshot({ path: 'screenshot.png' });
    console.log('📸 Скриншот сохранен как screenshot.png');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Анализ завершен');
  }
})();