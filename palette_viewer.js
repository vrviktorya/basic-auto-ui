const fs = require('fs');

// Читаем сгенерированную палитру
if (fs.existsSync('palette.json')) {
  const paletteData = JSON.parse(fs.readFileSync('palette.json', 'utf8'));
  
  console.log('🎨 ВИЗУАЛИЗАЦИЯ ПАЛИТРЫ:\n');
  
  paletteData.palette.forEach(color => {
    const hex = color.hex;
    const rgb = color.rgb;
    const size = color.size;
    
    // Создаем простую текстовую визуализацию
    const block = '█'.repeat(10);
    console.log(`${block} ${hex} - RGB(${rgb.join(', ')}) - ${size} элементов`);
  });
  
  console.log('\n📊 Статистика:');
  console.log(`Источник: ${paletteData.source}`);
  console.log(`Сгенерировано: ${new Date(paletteData.generated).toLocaleString()}`);
  console.log(`Всего цветов в палитре: ${paletteData.palette.length}`);
} else {
  console.log('❌ Файл palette.json не найден. Сначала запустите color_cluster.js');
}