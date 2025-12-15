class ClassicColorExtractor {
    constructor() {
        this.colorCache = new Set();
    }

    async extractAllColors(page) {
        console.log('🎨 Starting classic color extraction...');
        
        try {
            const colors = await page.evaluate(() => {
                const colorSet = new Set();
                const elements = document.querySelectorAll('*');
                
                elements.forEach(element => {
                    try {
                        const style = window.getComputedStyle(element);
                        const colorProps = [
                            'color', 'backgroundColor', 'borderColor',
                            'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
                            'outlineColor', 'textDecorationColor', 'fill', 'stroke'
                        ];
                        
                        colorProps.forEach(prop => {
                            const color = style[prop];
                            if (color && 
                                color !== 'rgba(0, 0, 0, 0)' && 
                                color !== 'transparent' &&
                                !color.includes('gradient') &&
                                color !== 'rgb(0, 0, 0)' &&
                                !color.includes('url(')) {
                                colorSet.add(color);
                            }
                        });
                    } catch (e) {
                        // Ignore errors for specific elements
                    }
                });
                
                return Array.from(colorSet);
            });

            console.log(`✅ Classic extraction found ${colors.length} color strings`);
            return colors;

        } catch (error) {
            console.error('❌ Classic color extraction failed:', error);
            return [];
        }
    }
}

module.exports = ClassicColorExtractor;