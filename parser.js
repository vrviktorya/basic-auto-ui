const puppeteer = require('puppeteer');

// Список сайтов для тестирования с богатой цветовой палитрой
const TEST_SITES = [
  'https://dribbble.com/',
  'https://itcontact.ru',
  'https://www.awwwards.com/',
  'https://coolors.co/',
  'https://cssgradient.io/'
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Тестируем первый сайт из списка
    const testUrl = TEST_SITES[1]; // colorhunt.co - отличный источник цветов
    console.log(`🎨 Тестируем сайт: ${testUrl}`);
    
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Страница загружена');
    console.log('Заголовок:', await page.title());

    // Улучшенное извлечение цветов
    const colorData = await page.evaluate(() => {
      const colors = new Set();
      const elements = document.querySelectorAll('*');
      
      console.log(`📊 Анализируем ${elements.length} элементов...`);
      
      elements.forEach(element => {
        try {
          const style = window.getComputedStyle(element);
          
          // Проверяем все цветовые свойства
          const colorProps = {
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            borderTopColor: style.borderTopColor,
            borderRightColor: style.borderRightColor,
            borderBottomColor: style.borderBottomColor,
            borderLeftColor: style.borderLeftColor,
            outlineColor: style.outlineColor,
            textDecorationColor: style.textDecorationColor,
            columnRuleColor: style.columnRuleColor
          };
          
          // Добавляем уникальные цвета
          Object.values(colorProps).forEach(color => {
            if (color && 
                color !== 'rgba(0, 0, 0, 0)' && 
                color !== 'transparent' &&
                !color.startsWith('rgba(0, 0, 0,') &&
                color !== 'rgb(0, 0, 0)' &&
                !colors.has(color)) {
              colors.add(color);
            }
          });
        } catch (e) {
          // Игнорируем ошибки для отдельных элементов
        }
      });
      
      return Array.from(colors).filter(color => 
        color && color.length > 0 && color !== 'none'
      );
    });

    console.log(`🎨 Найдено ${colorData.length} уникальных цветов:`);
    colorData.forEach((color, index) => {
      console.log(`${index + 1}. ${color}`);
    });

    // Простая группировка цветов по типу
    const colorGroups = {
      backgrounds: colorData.filter(color => 
        color.includes('rgb') && !color.includes('rgba(0, 0, 0')
      ),
      text: colorData.filter(color => 
        color.includes('rgb') && color.includes('rgba(0, 0, 0')
      )
    };

    console.log('\n📊 Группы цветов:');
    console.log(`Фоновые цвета: ${colorGroups.backgrounds.length}`);
    console.log(`Текстовые цвета: ${colorGroups.text.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Скрипт завершен');
  }
})();