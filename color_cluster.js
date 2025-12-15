const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const kmeans = require('node-kmeans');

// Функция для преобразования цвета в числовой вектор [r, g, b]
function colorToVector(colorStr) {
  // Обработка rgb строки
  if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
  }
  // Обработка hex строки
  else if (colorStr.startsWith('#')) {
    const hex = colorStr.substring(1);
    if (hex.length === 3) {
      // #rgb -> #rrggbb
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b];
    }
  }
  return null;
}

// Функция для фильтрации черного, белого и серых оттенков
function isBlackWhiteOrGray(vector, tolerance = 40) {
  const [r, g, b] = vector;
  
  // Проверка на черный (все компоненты близки к 0)
  if (r <= tolerance && g <= tolerance && b <= tolerance) {
    return true;
  }
  
  // Проверка на белый (все компоненты близки к 255)
  if (r >= (255 - tolerance) && g >= (255 - tolerance) && b >= (255 - tolerance)) {
    return true;
  }
  
  // Проверка на серый (все компоненты примерно равны)
  if (Math.abs(r - g) <= tolerance && Math.abs(r - b) <= tolerance && Math.abs(g - b) <= tolerance) {
    return true;
  }
  
  return false;
}

// Функция для преобразования вектора обратно в hex
function vectorToHex(vector) {
  return '#' + vector.map(c => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

(async () => {
  console.log('🎨 Запуск анализа с кластеризацией цветов...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const filePath = path.resolve(__dirname, 'local_test.html');
    
    await page.goto(`file://${filePath}`, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    console.log('✅ Страница загружена');

    // Получаем цвета с частотами
    const colorAnalysis = await page.evaluate(() => {
      const colorStats = new Map();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(element => {
        try {
          const style = window.getComputedStyle(element);
          const colorProperties = [
            'color', 'background-color', 'border-color',
            'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
            'outline-color', 'text-decoration-color'
          ];
          
          colorProperties.forEach(property => {
            const colorValue = style.getPropertyValue(property);
            if (colorValue && 
                colorValue !== 'rgba(0, 0, 0, 0)' && 
                colorValue !== 'transparent' &&
                !colorValue.includes('gradient')) {
              
              const currentCount = colorStats.get(colorValue) || 0;
              colorStats.set(colorValue, currentCount + 1);
            }
          });
        } catch (e) {
          // Игнорируем ошибки
        }
      });
      
      return Array.from(colorStats.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => ({ color: entry[0], count: entry[1] }));
    });

    console.log(`📊 Извлечено ${colorAnalysis.length} уникальных цветов`);

    // Подготавливаем данные для кластеризации
    const colorVectors = [];
    const colorWeights = [];
    const originalColors = [];

    colorAnalysis.forEach(item => {
      const vector = colorToVector(item.color);
      if (vector && !isBlackWhiteOrGray(vector)) {
        colorVectors.push(vector);
        colorWeights.push(item.count); // Используем частоту как вес
        originalColors.push(item.color);
      }
    });

    console.log(`🎯 После фильтрации осталось ${colorVectors.length} значимых цветов`);

    if (colorVectors.length === 0) {
      console.log('❌ Не осталось цветов для кластеризации');
      return;
    }

    // Выполняем кластеризацию K-means
    const k = Math.min(6, colorVectors.length); // Максимум 6 кластеров
    console.log(`🔢 Выполняем кластеризацию на ${k} групп...`);

    kmeans.clusterize(colorVectors, { k }, (err, clusters) => {
      if (err) {
        console.error('❌ Ошибка кластеризации:', err);
        return;
      }

      console.log('\n🎨 РЕЗУЛЬТАТЫ КЛАСТЕРИЗАЦИИ:');
      
      // Анализируем каждый кластер
      clusters.forEach((cluster, index) => {
        const centroid = cluster.centroid;
        const hexColor = vectorToHex(centroid);
        const size = cluster.clusterIndices.length;
        
        console.log(`\n📦 Кластер ${index + 1}:`);
        console.log(`   Цвет: ${hexColor}`);
        console.log(`   RGB: [${centroid.map(c => Math.round(c)).join(', ')}]`);
        console.log(`   Размер: ${size} цветов`);
        
        // Показываем примеры цветов из кластера
        console.log(`   Примеры:`);
        cluster.clusterIndices.slice(0, 3).forEach(colorIndex => {
          console.log(`     - ${originalColors[colorIndex]}`);
        });
      });

      // Создаем палитру из центроидов кластеров
      const palette = clusters.map(cluster => ({
        hex: vectorToHex(cluster.centroid),
        rgb: cluster.centroid.map(c => Math.round(c)),
        size: cluster.clusterIndices.length
      }));

      // Сортируем палитру по размеру кластера (популярности)
      palette.sort((a, b) => b.size - a.size);

      console.log('\n🎯 ДОМИНИРУЮЩАЯ ПАЛИТРА:');
      palette.forEach((color, index) => {
        console.log(`${index + 1}. ${color.hex} - RGB(${color.rgb.join(', ')}) [используется в ${color.size} элементах]`);
      });

      // Сохраняем палитру в файл
      const paletteData = {
        generated: new Date().toISOString(),
        source: 'local_test.html',
        palette: palette
      };

      fs.writeFileSync('palette.json', JSON.stringify(paletteData, null, 2));
      console.log('\n💾 Палитра сохранена в palette.json');
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Анализ завершен');
  }
})();