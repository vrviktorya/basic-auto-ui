const fs = require('fs');

// Генератор CSS на основе проанализированной дизайн-системы
function generateDesignSystem(analysisResult, outputName = 'design-system') {
  const { colors, typography } = analysisResult;
  
  // Создаем CSS переменные
  let css = `/* Автоматически сгенерированная дизайн-система на основе ${analysisResult.url} */
:root {
  /* Цветовая палитра */\n`;
  
  // Добавляем цвета
  colors.palette.slice(0, 6).forEach((color, index) => {
    const role = getColorRole(color.hex);
    css += `  --color-${role.toLowerCase().replace(' ', '-')}-${index + 1}: ${color.hex};\n`;
  });

  css += '\n  /* Типографика */\n';
  
  // Добавляем типографику
  const mainFont = Object.values(typography.scale).flat()[0];
  if (mainFont) {
    css += `  --font-primary: ${mainFont.fontFamily};\n`;
  }

  // Добавляем размеры шрифтов
  const allFontSizes = [...new Set(Object.values(typography.scale).flat().map(item => item.fontSize))].sort();
  allFontSizes.forEach((size, index) => {
    css += `  --font-size-${index + 1}: ${size};\n`;
  });

  css += `}

/* Базовые стили */
body {
  font-family: var(--font-primary);
  background-color: var(--color-фон-1);
  color: var(--color-основной-текст-1);
  line-height: 1.6;
}

/* Компоненты */
.button {
  display: inline-block;
  padding: 12px 24px;
  background-color: var(--color-основной-1);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: var(--font-size-2);
  cursor: pointer;
  transition: background-color 0.3s;
}

.button:hover {
  background-color: var(--color-акцентный-1);
}

.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* Типографика */
h1 { font-size: var(--font-size-5); font-weight: bold; }
h2 { font-size: var(--font-size-4); font-weight: bold; }
h3 { font-size: var(--font-size-3); font-weight: bold; }
p { font-size: var(--font-size-2); }
`;

  // Сохраняем в файл
  fs.writeFileSync(`${outputName}.css`, css);
  
  // Создаем HTML пример
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Дизайн-система на основе ${analysisResult.url}</title>
    <link rel="stylesheet" href="${outputName}.css">
</head>
<body>
    <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
        <h1>Автоматически сгенерированная дизайн-система</h1>
        <p>На основе анализа: ${analysisResult.url}</p>
        
        <div style="margin: 40px 0;">
            <h2>Цветовая палитра</h2>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${colors.palette.slice(0, 6).map(color => 
                  `<div style="background: ${color.hex}; width: 100px; height: 100px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${getContrastColor(color.hex)};">
                    ${color.hex}
                  </div>`
                ).join('')}
            </div>
        </div>
        
        <div style="margin: 40px 0;">
            <h2>Компоненты</h2>
            <button class="button">Пример кнопки</button>
            <div class="card" style="margin-top: 20px; max-width: 300px;">
                <h3>Карточка</h3>
                <p>Пример карточки с автоматически подобранными стилями</p>
            </div>
        </div>
        
        <div style="margin: 40px 0;">
            <h2>Типографика</h2>
            <h1>Заголовок H1</h1>
            <h2>Заголовок H2</h2>
            <h3>Заголовок H3</h3>
            <p>Пример основного текста с автоматически подобранным шрифтом и размером.</p>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(`${outputName}.html`, html);
  
  console.log(`✅ Дизайн-система сохранена в файлы:\n   - ${outputName}.css\n   - ${outputName}.html`);
}

// Вспомогательная функция для определения роли цвета
function getColorRole(hex) {
    const color = hex.toLowerCase();
    if (color === '#ffffff' || color === '#f8f8f8' || color === '#fdfdfd') return 'Фон';
    if (color === '#000000' || color === '#333333' || color === '#1e1e1e') return 'Основной текст';
    if (['#ff0000', '#ff2f52', '#f72f52', '#d8195e'].some(c => color.includes(c))) return 'Акцентный';
    if (['#007bff', '#0000ff', '#356fc0', '#587fb5'].some(c => color.includes(c))) return 'Основной';
    if (['#00ff00', '#96b038', '#553d57'].some(c => color.includes(c))) return 'Вторичный';
    return 'Дополнительный';
  }
function getContrastColor(hex) {
  // Простая проверка для определения светлого/темного текста
  const r = parseInt(hex.substr(1,2), 16);
  const g = parseInt(hex.substr(3,2), 16);
  const b = parseInt(hex.substr(5,2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

module.exports = { generateDesignSystem };