//Комплексный анализ (цвета + типографика)

const puppeteer = require('puppeteer');
const kmeans = require('node-kmeans');

// Вспомогательные функции
function rgbStringToArray(rgbString) {
  const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

async function analyzeDesignSystem(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log(`\n🎨 Анализируем дизайн-систему: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Анализ цветов
    const colors = await page.evaluate(() => {
      const colorSet = new Set();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(element => {
        try {
          const style = window.getComputedStyle(element);
          ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
            const color = style[prop];
            if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
              colorSet.add(color);
            }
          });
        } catch (e) {}
      });
      
      return Array.from(colorSet);
    });

    // Анализ типографики
    const typography = await page.evaluate(() => {
      const fonts = new Map();
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, button, span');
      
      elements.forEach(element => {
        const style = window.getComputedStyle(element);
        const text = element.textContent.trim();
        
        if (text.length > 0) {
          const key = `${element.tagName}-${style.fontSize}-${style.fontFamily}`;
          if (!fonts.has(key)) {
            fonts.set(key, {
              tag: element.tagName,
              fontSize: style.fontSize,
              fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, ''), // берем первый шрифт
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              color: style.color,
              example: text.substring(0, 30)
            });
          }
        }
      });
      
      return Array.from(fonts.values());
    });

    // Кластеризация цветов
    const colorVectors = colors.map(color => rgbStringToArray(color)).filter(Boolean);
    let colorPalette = [];

    if (colorVectors.length > 0) {
      const clustersCount = Math.min(6, colorVectors.length);
      colorPalette = await new Promise((resolve) => {
        kmeans.clusterize(colorVectors, { k: clustersCount }, (err, res) => {
          if (!err) {
            const palette = res.map(cluster => {
              const centroid = cluster.centroid.map(val => Math.round(val));
              return {
                rgb: `rgb(${centroid.join(', ')})`,
                hex: rgbToHex(centroid[0], centroid[1], centroid[2]),
                count: cluster.cluster.length
              };
            }).sort((a, b) => b.count - a.count);
            resolve(palette);
          } else {
            resolve([]);
          }
        });
      });
    }

    // Группировка типографики
    const typographyScale = {};
    typography.forEach(item => {
      if (!typographyScale[item.tag]) {
        typographyScale[item.tag] = [];
      }
      typographyScale[item.tag].push(item);
    });

    return {
      url,
      colors: {
        total: colors.length,
        palette: colorPalette
      },
      typography: {
        total: typography.length,
        scale: typographyScale
      }
    };

  } finally {
    await browser.close();
  }
}

// Основная функция
(async () => {
  const sites = [
    'https://itcontact.ru',
    'https://www.awwwards.com',
    'https://hh.ru'
  ];

  console.log('🚀 ЗАПУСК КОМПЛЕКСНОГО АНАЛИЗА ДИЗАЙН-СИСТЕМ\n');

  const results = [];
  
  for (const site of sites) {
    try {
      const result = await analyzeDesignSystem(site);
      results.push(result);
      console.log(`✅ ${site} - проанализирован`);
    } catch (error) {
      console.log(`❌ ${site} - ошибка: ${error.message}`);
    }
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Вывод результатов
  console.log('\n🎊 РЕЗУЛЬТАТЫ АНАЛИЗА ДИЗАЙН-СИСТЕМ:\n');

  results.forEach((result, index) => {
    console.log(`📊 ${index + 1}. ${result.url}`);
    console.log(`   🎨 ЦВЕТА (${result.colors.total} найденных, ${result.colors.palette.length} основных):`);
    
    result.colors.palette.forEach((color, i) => {
      console.log(`      ${i + 1}. ${color.hex} | ${color.rgb} | (${color.count} элементов)`);
    });

    console.log(`   📝 ТИПОГРАФИКА (${result.typography.total} стилей):`);
    Object.keys(result.typography.scale).forEach(tag => {
      const styles = result.typography.scale[tag];
      console.log(`      ${tag}:`);
      styles.forEach(style => {
        console.log(`        - ${style.fontSize} | ${style.fontFamily} | Вес: ${style.fontWeight}`);
      });
    });

    console.log('\n   🎯 РЕКОМЕНДОВАННАЯ ДИЗАЙН-СИСТЕМА:');
    console.log('      ЦВЕТА:');
    result.colors.palette.slice(0, 5).forEach(color => {
      console.log(`        █████ ${color.hex} - ${getColorRole(color.hex)}`);
    });
    
    console.log('      ТИПОГРАФИКА:');
    const mainFont = Object.values(result.typography.scale).flat()[0];
    if (mainFont) {
      console.log(`        Основной шрифт: ${mainFont.fontFamily}`);
    }

    console.log('----------------------------------------\n');
  });

})();

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