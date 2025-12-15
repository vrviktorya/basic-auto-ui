const puppeteer = require('puppeteer');
const kmeans = require('node-kmeans');

const SITES_TO_ANALYZE = [
  { name: 'ИТ Контакт', url: 'https://itcontact.ru' },
  { name: 'Awwwards', url: 'https://www.awwwards.com/' },
  { name: 'Coolors', url: 'https://coolors.co/' }
];

function rgbStringToArray(rgbString) {
    const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return null;
  }

// Функция для вычисления расстояния между цветами (евклидово расстояние)
function colorDistance(color1, color2) {
    return Math.sqrt(
      Math.pow(color1[0] - color2[0], 2) +
      Math.pow(color1[1] - color2[1], 2) +
      Math.pow(color1[2] - color2[2], 2)
    );
  }

// Вспомогательная функция для преобразования RGB в HEX
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

async function analyzeSite(page, site) {
  console.log(`\n🔍 Анализируем: ${site.name} - ${site.url}`);
  
  try {
    await page.goto(site.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Извлечение цветов (аналогично предыдущему скрипту)
    const colorData = await page.evaluate(() => {
      const colors = new Set();
      const elements = document.querySelectorAll('body *');
      
      elements.forEach(element => {
        try {
          const style = window.getComputedStyle(element);
          [style.color, style.backgroundColor, style.borderColor].forEach(color => {
            if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
              colors.add(color);
            }
          });
        } catch (e) {}
      });
      
      return Array.from(colors);
    });

    // Обработка и кластеризация цветов
    const colorVectors = colorData.map(color => rgbStringToArray(color)).filter(Boolean);
    
    if (colorVectors.length > 0) {
      const clustersCount = Math.min(5, colorVectors.length);
      
      return new Promise((resolve) => {
        kmeans.clusterize(colorVectors, { k: clustersCount }, (err, res) => {
          if (err) {
            console.error(`❌ Ошибка при анализе ${site.name}:`, err);
            resolve(null);
          } else {
            const palette = res.map(cluster => {
              const centroid = cluster.centroid.map(val => Math.round(val));
              return {
                rgb: `rgb(${centroid.join(', ')})`,
                hex: rgbToHex(centroid[0], centroid[1], centroid[2])
              };
            });
            resolve({ site: site.name, palette, colorCount: colorData.length });
          }
        });
      });
    }
  } catch (error) {
    console.error(`❌ Ошибка загрузки ${site.name}:`, error.message);
    return null;
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const results = [];

  for (const site of SITES_TO_ANALYZE) {
    const result = await analyzeSite(page, site);
    if (result) {
      results.push(result);
    }
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎊 СВОДНЫЙ ОТЧЕТ ПО АНАЛИЗУ ДИЗАЙН-СИСТЕМ:');
  results.forEach(result => {
    console.log(`\n📊 ${result.site}:`);
    console.log(`   Всего цветов: ${result.colorCount}`);
    console.log(`   Основная палитра:`);
    result.palette.forEach((color, index) => {
      console.log(`   ${index + 1}. ${color.rgb} | ${color.hex}`);
    });
  });

  await browser.close();
})();