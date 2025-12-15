const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Запуск локального парсера...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Получаем абсолютный путь к файлу
    const filePath = path.resolve(__dirname, 'local_test.html');
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.error('❌ Файл local_test.html не найден!');
      return;
    }
    
    console.log('📁 Загружаем локальный файл:', filePath);
    
    await page.goto(`file://${filePath}`, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    console.log('✅ Локальная страница загружена');
    console.log('Заголовок:', await page.title());

    // Расширенный анализ цветов
    const colorAnalysis = await page.evaluate(() => {
      const colorStats = new Map();
      const elements = document.querySelectorAll('*');
      
      console.log(`Анализируем ${elements.length} элементов...`);
      
      elements.forEach(element => {
        try {
          const style = window.getComputedStyle(element);
          
          // Все возможные цветовые свойства
          const colorProperties = [
            'color', 'background-color', 'border-color',
            'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
            'outline-color', 'text-decoration-color', 'column-rule-color',
            'caret-color'
          ];
          
          colorProperties.forEach(property => {
            const colorValue = style.getPropertyValue(property);
            
            if (colorValue && 
                colorValue !== 'rgba(0, 0, 0, 0)' && 
                colorValue !== 'transparent' &&
                !colorValue.includes('gradient')) {
              
              // Подсчитываем частоту использования цвета
              const currentCount = colorStats.get(colorValue) || 0;
              colorStats.set(colorValue, currentCount + 1);
            }
          });
          
          // Также проверяем CSS переменные
          const cssText = element.getAttribute('style');
          if (cssText && cssText.includes('#')) {
            const hexColors = cssText.match(/#[0-9A-Fa-f]{3,6}/g);
            if (hexColors) {
              hexColors.forEach(hexColor => {
                const currentCount = colorStats.get(hexColor) || 0;
                colorStats.set(hexColor, currentCount + 1);
              });
            }
          }
          
        } catch (e) {
          // Игнорируем ошибки для отдельных элементов
        }
      });
      
      // Сортируем по частоте использования
      return Array.from(colorStats.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => ({ color: entry[0], count: entry[1] }));
    });

    console.log('\n🎨 РЕЗУЛЬТАТЫ АНАЛИЗА ЦВЕТОВ:');
    console.log(`Найдено ${colorAnalysis.length} уникальных цветов\n`);
    
    colorAnalysis.forEach((item, index) => {
      console.log(`${index + 1}. ${item.color.padEnd(20)} (используется ${item.count} раз)`);
    });

    // Группируем цвета
    const backgroundColors = colorAnalysis.filter(item => 
      item.color.includes('background') || item.count > 5
    );
    
    const textColors = colorAnalysis.filter(item => 
      item.color.includes('rgb(') && !item.color.includes('rgba(0, 0, 0')
    );

    console.log('\n📊 СТАТИСТИКА:');
    console.log(`Фоновые цвета: ${backgroundColors.length}`);
    console.log(`Текстовые цвета: ${textColors.length}`);
    console.log(`Всего элементов проанализировано: ${colorAnalysis.reduce((sum, item) => sum + item.count, 0)}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Локальный парсер завершил работу');
  }
})();