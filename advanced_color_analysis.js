const puppeteer = require('puppeteer');
const kmeans = require('node-kmeans');
const chroma = require('chroma-js');

// Функция для определения роли цвета на основе его свойств и контекста
function determineColorRole(color, usageContext = {}) {
    const hex = color.hex;
    const rgb = chroma(hex).rgb();
    
    // Вычисляем perceptual lightness (L из LAB)
    const lightness = chroma(hex).get('lab.l');
    const saturation = chroma(hex).get('lch.c');
    const hue = chroma(hex).get('lch.h');
    
    // Анализ яркости и насыщенности
    if (lightness > 92) return 'background-light';
    if (lightness < 8) return 'text-dark';
    if (saturation > 50 && lightness > 60) return 'primary';
    if (saturation > 40 && lightness > 30 && lightness < 70) return 'secondary';
    if (saturation > 60) return 'accent';
    if (lightness > 70) return 'background';
    if (lightness < 30) return 'text';
    
    return 'neutral';
}

// Функция для анализа контрастности
function analyzeContrast(color1, color2) {
    const contrast = chroma.contrast(color1, color2);
    return {
        ratio: contrast,
        aa: contrast >= 4.5, // WCAG AA стандарт
        aaa: contrast >= 7,  // WCAG AAA стандарт
        level: contrast >= 7 ? 'AAA' : contrast >= 4.5 ? 'AA' : 'FAIL'
    };
}

// Функция для обработки градиентов
function parseGradient(gradientString) {
    if (!gradientString.includes('gradient')) return null;
    
    const colors = [];
    const colorRegex = /(rgba?\([^)]+\)|#[a-f0-9]{6}|#[a-f0-9]{3}|hsl\([^)]+\))/gi;
    const matches = gradientString.match(colorRegex);
    
    if (matches) {
        matches.forEach(color => {
            try {
                const chromaColor = chroma(color);
                colors.push({
                    value: color,
                    hex: chromaColor.hex(),
                    rgb: chromaColor.rgb(),
                    type: 'gradient-color'
                });
            } catch (e) {
                // Игнорируем некорректные цвета
            }
        });
    }
    
    return colors.length > 0 ? {
        type: gradientString.includes('linear') ? 'linear-gradient' : 'radial-gradient',
        colors: colors,
        original: gradientString
    } : null;
}

// Преобразование RGB в LAB пространство
function rgbToLab(r, g, b) {
    return chroma(r, g, b).lab();
}

// Улучшенная кластеризация в LAB пространстве
async function clusterColorsLAB(colorVectors) {
    // Преобразуем RGB в LAB
    const labVectors = colorVectors.map(rgb => rgbToLab(rgb[0], rgb[1], rgb[2]));
    
    return new Promise((resolve, reject) => {
        kmeans.clusterize(labVectors, { k: Math.min(6, labVectors.length) }, (err, res) => {
            if (err) {
                reject(err);
            } else {
                // Преобразуем центроиды обратно в RGB для удобства
                const clusters = res.map(cluster => {
                    const centroid = cluster.centroid;
                    const rgb = chroma.lab(centroid[0], centroid[1], centroid[2]).rgb();
                    return {
                        centroid: centroid,
                        rgb: rgb,
                        hex: chroma(rgb).hex(),
                        cluster: cluster.cluster,
                        lab: centroid
                    };
                });
                resolve(clusters);
            }
        });
    });
}

// Основная функция анализа
async function advancedColorAnalysis(url) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log(`🎨 Расширенный анализ: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // Сбор расширенной информации о цветах
        const colorData = await page.evaluate(() => {
            const colors = new Map();
            const elements = document.querySelectorAll('*');
            
            elements.forEach(element => {
                try {
                    const style = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    const tagName = element.tagName.toLowerCase();
                    
                    // Анализируемые свойства
                    const colorProperties = {
                        color: style.color,
                        backgroundColor: style.backgroundColor,
                        borderColor: style.borderColor,
                        borderTopColor: style.borderTopColor,
                        borderRightColor: style.borderRightColor,
                        borderBottomColor: style.borderBottomColor,
                        borderLeftColor: style.borderLeftColor,
                        outlineColor: style.outlineColor,
                        textDecorationColor: style.textDecorationColor,
                        backgroundImage: style.backgroundImage
                    };
                    
                    // Собираем контекст использования
                    Object.entries(colorProperties).forEach(([prop, value]) => {
                        if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent' && !value.includes('url(')) {
                            const key = value;
                            if (!colors.has(key)) {
                                colors.set(key, {
                                    value: value,
                                    usage: [],
                                    elements: 0,
                                    area: 0
                                });
                            }
                            
                            const colorInfo = colors.get(key);
                            colorInfo.usage.push({
                                property: prop,
                                tag: tagName,
                                element: element.className || element.id || tagName
                            });
                            colorInfo.elements++;
                            
                            // Приблизительная площадь (только для фонов)
                            if (prop === 'backgroundColor' && rect.width > 0 && rect.height > 0) {
                                colorInfo.area += rect.width * rect.height;
                            }
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки
                }
            });
            
            return Array.from(colors.values());
        });

        console.log(`📊 Собрано ${colorData.length} цветовых использований`);

        // Обработка градиентов
        const gradients = [];
        const flatColors = [];
        
        colorData.forEach(item => {
            if (item.value.includes('gradient')) {
                const gradient = parseGradient(item.value);
                if (gradient) {
                    gradients.push({
                        ...gradient,
                        usage: item.usage,
                        elements: item.elements,
                        area: item.area
                    });
                }
            } else {
                flatColors.push(item);
            }
        });

        console.log(`🌈 Найдено ${gradients.length} градиентов`);

        // Подготовка цветов для кластеризации
        const colorVectors = [];
        const colorMap = new Map();

        flatColors.forEach(item => {
            try {
                const chromaColor = chroma(item.value);
                const rgb = chromaColor.rgb();
                const key = chromaColor.hex();
                
                if (!colorMap.has(key)) {
                    colorMap.set(key, {
                        hex: key,
                        rgb: rgb,
                        lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
                        usage: item.usage,
                        elements: item.elements,
                        area: item.area,
                        original: item.value
                    });
                    colorVectors.push(rgb);
                }
            } catch (e) {
                // Пропускаем некорректные цвета
            }
        });

        // Кластеризация в LAB пространстве
        const clusters = await clusterColorsLAB(colorVectors);
        
        // Обогащаем кластеры семантической информацией
        const enrichedClusters = clusters.map(cluster => {
            const clusterColors = cluster.cluster.map(index => {
                const color = Array.from(colorMap.values())[index];
                return {
                    ...color,
                    role: determineColorRole(color, color.usage[0])
                };
            });
            
            // Определяем доминирующую роль кластера
            const roleCounts = {};
            clusterColors.forEach(color => {
                roleCounts[color.role] = (roleCounts[color.role] || 0) + 1;
            });
            
            const dominantRole = Object.keys(roleCounts).reduce((a, b) => 
                roleCounts[a] > roleCounts[b] ? a : b
            );
            
            // Анализ контрастности с белым и черным
            const contrastWithWhite = analyzeContrast(cluster.hex, '#FFFFFF');
            const contrastWithBlack = analyzeContrast(cluster.hex, '#000000');
            
            return {
                ...cluster,
                colors: clusterColors,
                dominantRole: dominantRole,
                contrast: {
                    white: contrastWithWhite,
                    black: contrastWithBlack
                },
                perceptualLightness: chroma(cluster.hex).get('lab.l'),
                saturation: chroma(cluster.hex).get('lch.c')
            };
        });

        // Сортируем кластеры по роли и значимости
        const rolePriority = {
            'primary': 1, 'secondary': 2, 'accent': 3, 
            'background': 4, 'background-light': 5,
            'text': 6, 'text-dark': 7, 'neutral': 8
        };
        
        enrichedClusters.sort((a, b) => {
            const roleDiff = rolePriority[a.dominantRole] - rolePriority[b.dominantRole];
            if (roleDiff !== 0) return roleDiff;
            return b.colors.length - a.colors.length; // По размеру кластера
        });

        return {
            url,
            domain: new URL(url).hostname,
            flatColors: enrichedClusters,
            gradients: gradients,
            summary: {
                totalColors: colorData.length,
                uniqueColors: colorMap.size,
                gradientsCount: gradients.length,
                clustersCount: enrichedClusters.length
            },
            timestamp: new Date().toISOString()
        };

    } finally {
        await browser.close();
    }
}

// Функция для создания отчета
function generateColorReport(analysis) {
    console.log('\n🎨 РАСШИРЕННЫЙ АНАЛИЗ ЦВЕТОВ');
    console.log('=' .repeat(50));
    console.log(`📊 Сайт: ${analysis.url}`);
    console.log(`📈 Статистика: ${analysis.summary.totalColors} использований, ${analysis.summary.uniqueColors} уникальных цветов, ${analysis.summary.gradientsCount} градиентов`);
    
    console.log('\n🎯 СЕМАНТИЧЕСКАЯ ПАЛИТРА:');
    analysis.flatColors.forEach((cluster, index) => {
        console.log(`\n${index + 1}. ${cluster.dominantRole.toUpperCase()}: ${cluster.hex}`);
        console.log(`   📏 Lightness: ${cluster.perceptualLightness.toFixed(1)} | Saturation: ${cluster.saturation.toFixed(1)}`);
        console.log(`   🎯 Контраст: White ${cluster.contrast.white.level} (${cluster.contrast.white.ratio.toFixed(2)}) | Black ${cluster.contrast.black.level} (${cluster.contrast.black.ratio.toFixed(2)})`);
        console.log(`   📊 Элементов: ${cluster.colors.length}`);
        
        // Показываем примеры использования
        if (cluster.colors[0] && cluster.colors[0].usage[0]) {
            const usage = cluster.colors[0].usage[0];
            console.log(`   💡 Пример: ${usage.property} в <${usage.tag}>`);
        }
    });
    
    if (analysis.gradients.length > 0) {
        console.log('\n🌈 ГРАДИЕНТЫ:');
        analysis.gradients.forEach((gradient, index) => {
            console.log(`\n${index + 1}. ${gradient.type}`);
            console.log(`   Цвета: ${gradient.colors.map(c => c.hex).join(' → ')}`);
            console.log(`   Используется в: ${gradient.elements} элементах`);
        });
    }
    
    // Рекомендации по доступности
    console.log('\n🔍 РЕКОМЕНДАЦИИ ПО ДОСТУПНОСТИ:');
    analysis.flatColors.forEach(cluster => {
        if (cluster.dominantRole.includes('text') && cluster.contrast.white.level === 'FAIL' && cluster.contrast.black.level === 'FAIL') {
            console.log(`   ⚠️  ${cluster.hex} может иметь проблемы с читаемостью`);
        }
    });
}

// Запуск анализа
(async () => {
    const sites = [
        'https://itcontact.ru/',
        'https://hh.ru'
    ];

    for (const site of sites) {
        try {
            console.log(`\n${'='.repeat(60)}`);
            const analysis = await advancedColorAnalysis(site);
            generateColorReport(analysis);
            
            // Сохраняем результаты
            const fs = require('fs');
            const domain = analysis.domain.replace(/[^a-zA-Z0-9]/g, '-');
            fs.writeFileSync(
                `color-analysis-${domain}.json`, 
                JSON.stringify(analysis, null, 2)
            );
            
        } catch (error) {
            console.error(`❌ Ошибка анализа ${site}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
})();