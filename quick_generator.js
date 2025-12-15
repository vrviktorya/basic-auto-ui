const fs = require('fs');
const path = require('path');

// Данные из предыдущего анализа (можно скопировать из консоли)
const existingData = {
    "Awwwards": {
        colors: {
            palette: [
                { "hex": "#11240F", rgb: "rgb(17, 36, 15)", count: 21 },
                { hex: "#D6DFD9", rgb: "(214, 223, 217)", count: 19 },
                { hex: "#BE8A37", rgb: "(190, 138, 55)", count: 9 },
                { hex: "#E12BA4", rgb: "rgb(225, 43, 164)", count: 9 },
                { hex: "#4139F3", rgb: "rgb(65, 57, 243)", count: 7 },
                { hex: "#32BCBB", rgb: "rgb(50, 188, 187)", count: 5 }
            ],
            total: 25
        },
        typography: {
            styles: [
                {
                    fontSize: "14px",
                    fontFamily: "Inter Tight",
                    fontWeight: "500",
                    lineHeight: "1.5",
                    color: "rgb(30, 30, 30)",
                    tag: "span",
                    example: "Пример текста"
                }
            ],
            total: 28
        },
        url: "https://www.awwwards.com/",
        domain: "www.awwwards.com",
        timestamp: new Date().toISOString()
    }
};

// Используем функции из предыдущего скрипта
const { generateDesignSystem } = require('./improved_design_system.js');

Object.entries(existingData).forEach(([name, data]) => {
    generateDesignSystem(data, `previously-analyzed-${name.toLowerCase()}`);
});

console.log('✅ Быстрая генерация завершена!');
