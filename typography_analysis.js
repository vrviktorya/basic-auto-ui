const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    const testUrl = 'https://itcontact.ru';
    console.log(`🔍 Анализируем типографику: ${testUrl}`);
    
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Страница загружена');

    // Извлечение типографики
    const typographyData = await page.evaluate(() => {
      const typography = new Map();
      const elements = document.querySelectorAll([
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li', 'button'
      ].join(','));
      
      elements.forEach(element => {
        try {
          const style = window.getComputedStyle(element);
          const textContent = element.textContent;
          
          if (textContent && textContent.trim().length > 0) {
            const fontData = {
              tagName: element.tagName.toLowerCase(),
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              color: style.color,
              textContent: textContent.trim().substring(0, 50) // обрезаем для вывода
            };
            
            const key = `${fontData.fontFamily}-${fontData.fontSize}-${fontData.fontWeight}`;
            if (!typography.has(key)) {
              typography.set(key, { ...fontData, count: 1 });
            } else {
              const existing = typography.get(key);
              typography.set(key, { ...existing, count: existing.count + 1 });
            }
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      });
      
      return Array.from(typography.values());
    });

    console.log(`📊 Найдено ${typographyData.length} уникальных стилей текста`);

    // Группируем по тегам и размерам
    const typographyGroups = {
      headings: typographyData.filter(item => 
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(item.tagName)
      ),
      body: typographyData.filter(item => 
        ['p', 'span', 'li'].includes(item.tagName)
      ),
      interactive: typographyData.filter(item => 
        ['a', 'button'].includes(item.tagName)
      )
    };

    console.log('\n🎯 ТИПОГРАФИКА:');

    if (typographyGroups.headings.length > 0) {
      console.log('\n📝 ЗАГОЛОВКИ:');
      typographyGroups.headings.forEach(item => {
        console.log(`   ${item.tagName.toUpperCase()}: ${item.fontSize} | ${item.fontFamily} | Вес: ${item.fontWeight}`);
        console.log(`   Пример: "${item.textContent}"`);
        console.log(`   Используется: ${item.count} раз\n`);
      });
    }

    if (typographyGroups.body.length > 0) {
      console.log('\n📄 ОСНОВНОЙ ТЕКСТ:');
      typographyGroups.body.forEach(item => {
        console.log(`   ${item.tagName}: ${item.fontSize} | ${item.fontFamily} | Вес: ${item.fontWeight}`);
        console.log(`   Пример: "${item.textContent}"`);
        console.log(`   Используется: ${item.count} раз\n`);
      });
    }

    if (typographyGroups.interactive.length > 0) {
      console.log('\n🔗 ИНТЕРАКТИВНЫЕ ЭЛЕМЕНТЫ:');
      typographyGroups.interactive.forEach(item => {
        console.log(`   ${item.tagName}: ${item.fontSize} | ${item.fontFamily} | Вес: ${item.fontWeight}`);
        console.log(`   Пример: "${item.textContent}"`);
        console.log(`   Используется: ${item.count} раз\n`);
      });
    }

    // Создаем шкалу типографики
    const fontSizeScale = [...new Set(typographyData.map(item => item.fontSize))].sort((a, b) => {
      return parseFloat(a) - parseFloat(b);
    });

    console.log('\n📏 ШКАЛА РАЗМЕРОВ ШРИФТА:');
    fontSizeScale.forEach(size => {
      const elementsWithSize = typographyData.filter(item => item.fontSize === size);
      console.log(`   ${size}: ${elementsWithSize.map(item => item.tagName).join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Анализ типографики завершен');
  }
})();