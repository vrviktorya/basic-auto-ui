const puppeteer = require('puppeteer');

// Создаем простую HTML строку для тестирования
const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { background: #f0f8ff; color: #333; font-family: Arial; }
        .primary { color: #ff6b6b; background: #4ecdc4; padding: 20px; }
        .secondary { color: #45b7d1; background: #96ceb4; margin: 10px; }
        .accent { color: #f7d794; background: #546de5; border: 2px solid #e15f41; }
    </style>
</head>
<body>
    <div class="primary">Primary Colors</div>
    <div class="secondary">Secondary Colors</div>
    <div class="accent">Accent Colors</div>
    <button style="background: #e15f41; color: white;">Button</button>
</body>
</html>
`;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    
    // Устанавливаем содержимое страницы напрямую
    await page.setContent(testHTML, {
      waitUntil: 'networkidle0'
    });

    console.log('✅ Тестовая страница создана');
    
    const colors = await page.evaluate(() => {
      const colorSet = new Set();
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
          const color = style[prop];
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            colorSet.add(color);
          }
        });
      });
      return Array.from(colorSet);
    });

    console.log('🎨 Найденные цвета:', colors);
    
  } finally {
    await browser.close();
  }
})();