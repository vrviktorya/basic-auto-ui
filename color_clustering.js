const puppeteer = require('puppeteer');
const kmeans = require('node-kmeans');

// Функция для преобразования RGB строки в числовой массив [r, g, b]
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

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    const testUrl = 'https://itcontact.ru'; // Можно поменять на любой сайт
    console.log(`🎨 Тестируем сайт: ${testUrl}`);
    
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Страница загружена');

    // Извлечение цветов
    const colorData = await page.evaluate(() => {
      const colors = new Set();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(element => {
        try {
          const style = window.getComputedStyle(element);
          const colorProps = {
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            borderTopColor: style.borderTopColor,
            borderRightColor: style.borderRightColor,
            borderBottomColor: style.borderBottomColor,
            borderLeftColor: style.borderLeftColor,
            outlineColor: style.outlineColor
          };
          
          Object.values(colorProps).forEach(color => {
            if (color && 
                color !== 'rgba(0, 0, 0, 0)' && 
                color !== 'transparent' &&
                !color.startsWith('rgba(0, 0, 0,') &&
                color !== 'rgb(0, 0, 0)' &&
                !color.includes('gradient') &&
                !colors.has(color)) {
              colors.add(color);
            }
          });
        } catch (e) {
          // Игнорируем ошибки
        }
      });
      
      return Array.from(colors).filter(color => 
        color && color.length > 0 && color !== 'none'
      );
    });

    console.log(`🎨 Найдено ${colorData.length} уникальных цветов`);

    // Преобразуем цвета в числовые векторы для кластеризации
    const colorVectors = [];
    const validColors = [];

    colorData.forEach(colorStr => {
      const rgbArray = rgbStringToArray(colorStr);
      if (rgbArray) {
        colorVectors.push(rgbArray);
        validColors.push(colorStr);
      }
    });

    console.log(`📊 ${colorVectors.length} цветов подготовлено для кластеризации`);

    if (colorVectors.length === 0) {
      console.log('❌ Нет цветов для кластеризации');
      return;
    }

    // Кластеризация с помощью K-means
    const clustersCount = Math.min(5, colorVectors.length); // Максимум 5 кластеров
    
    kmeans.clusterize(colorVectors, { k: clustersCount }, (err, res) => {
      if (err) {
        console.error('❌ Ошибка кластеризации:', err);
        return;
      }

      console.log(`\n🎯 Результаты кластеризации (${clustersCount} основных цветов):`);
      
      res.forEach((cluster, index) => {
        if (cluster.centroid && cluster.cluster.length > 0) {
          const centroid = cluster.centroid.map(val => Math.round(val));
          const colorHex = rgbToHex(centroid[0], centroid[1], centroid[2]);
          
          console.log(`\n${index + 1}. Основной цвет: rgb(${centroid.join(', ')}) | ${colorHex}`);
          console.log(`   Размер кластера: ${cluster.cluster.length} цветов`);
          console.log(`   Примеры цветов в кластере:`);
          
          // Покажем несколько примеров из кластера
          cluster.cluster.slice(0, 3).forEach(colorVec => {
            const originalColor = validColors[colorVectors.findIndex(v => 
              v[0] === colorVec[0] && v[1] === colorVec[1] && v[2] === colorVec[2]
            )];
            console.log(`     - ${originalColor}`);
          });
        }
      });

      // Создаем палитру на основе центроидов кластеров
      const palette = res.map(cluster => {
        const centroid = cluster.centroid.map(val => Math.round(val));
        return {
          rgb: `rgb(${centroid.join(', ')})`,
          hex: rgbToHex(centroid[0], centroid[1], centroid[2]),
          count: cluster.cluster.length
        };
      });

      // Сортируем палитру по размеру кластера (от наиболее частого к наименее частому)
      palette.sort((a, b) => b.count - a.count);

      console.log('\n🎨 РЕКОМЕНДУЕМАЯ ПАЛИТРА:');
      palette.forEach((color, index) => {
        console.log(`${index + 1}. ${color.rgb} | ${color.hex} | (используется в ${color.count} элементах)`);
      });

      // Визуальное представление палитры в консоли
      console.log('\n🖌️  Визуальная палитра:');
      palette.forEach(color => {
        console.log(`   █████  ${color.hex}`);
      });
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    // Даем время для завершения кластеризации перед закрытием браузера
    setTimeout(async () => {
      await browser.close();
      console.log('\n✅ Скрипт завершен');
    }, 1000);
  }
})();

// Вспомогательная функция для преобразования RGB в HEX
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Функция для группировки похожих цветов (альтернативный подход)
function groupSimilarColors(colors, threshold = 50) {
  const groups = [];
  
  colors.forEach(color => {
    const rgb = rgbStringToArray(color);
    if (!rgb) return;
    
    let foundGroup = false;
    for (let group of groups) {
      const groupColor = group.representative;
      if (colorDistance(rgb, groupColor) < threshold) {
        group.colors.push(color);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push({
        representative: rgb,
        colors: [color]
      });
    }
  });
  
  return groups;
}