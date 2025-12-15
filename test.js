const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Начало работы...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Используем очень простой и надежный сайт
    await page.goto('https://itcontact.ru', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    console.log('✅ Успех! Страница загружена');
    
    // Простой анализ заголовка
    const title = await page.title();
    const h1Text = await page.$eval('h1', el => el.textContent);
    
    console.log('Заголовок страницы:', title);
    console.log('H1 текст:', h1Text);

    // Базовое извлечение цветов
    const colors = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return {
        background: style.backgroundColor,
        color: style.color,
        fontFamily: style.fontFamily
      };
    });

    console.log('Базовые стили body:', colors);

  } catch (error) {
    console.error('💥 Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Скрипт завершен');
  }
})();

