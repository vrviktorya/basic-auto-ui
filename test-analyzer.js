const analyzeDesignSystem = require('./modules/analyzer');
const TEST_SITES = require('./test-sites');

async function runTests() {
    console.log('🧪 Starting automated tests...\n');
    
    let passed = 0;
    let failed = 0;

    for (const site of TEST_SITES) {
        console.log(`\n🔍 Testing: ${site.description}`);
        console.log(`   URL: ${site.url}`);
        
        try {
            const result = await analyzeDesignSystem(site.url);
            const foundColors = result.colors.palette.map(color => color.hex);
            
            // Проверяем ожидаемые цвета
            const missingColors = site.expectedColors.filter(expected => 
                !foundColors.some(found => areColorsSimilar(found, expected))
            );
            
            if (missingColors.length === 0) {
                console.log('✅ PASS: All expected colors found');
                passed++;
            } else {
                console.log('❌ FAIL: Missing colors:', missingColors);
                console.log('   Found colors:', foundColors);
                failed++;
            }
            
            // Выводим семантические роли
            const roles = result.colors.palette.map(color => 
                `${color.hex} - ${color.roleName}`
            );
            console.log('   Roles:', roles.join(', '));
            
        } catch (error) {
            console.log('❌ ERROR:', error.message);
            failed++;
        }
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log(`🎯 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
}

function areColorsSimilar(color1, color2) {
    // Простая проверка схожести цветов
    return color1.toLowerCase() === color2.toLowerCase();
}

// Запуск тестов если файл вызван напрямую
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = runTests;