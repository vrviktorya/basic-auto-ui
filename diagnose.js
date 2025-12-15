const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Диагностика проблемы...');
  
  const browser = await puppeteer.launch({
    headless: false, // Показываем браузер для отладки
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Включаем логирование сетевых событий
    page.on('request', request => {
      console.log('📤 Запрос:', request.url());
    });
    
    page.on('response', response => {
      console.log('📥 Ответ:', response.status(), response.url());
    });
    
    page.on('console', msg => {
      console.log('🖥️  Браузер:', msg.text());
    });
    
    console.log('🌐 Пробуем загрузить простой сайт...');
    
    await page.goto('https://httpbin.org/ip', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log('✅ Простой сайт загружен успешно');
    
    // Теперь пробуем colorhunt с меньшим таймаутом
    console.log('🌐 Пробуем colorhunt.co...');
    await page.goto('https://colorhunt.co/', {
      waitUntil: 'domcontentloaded', 
      timeout: 10000
    }).catch(err => {
      console.log('❌ Colorhunt не загрузился:', err.message);
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Диагностика завершена');
  }
})();