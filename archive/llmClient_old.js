// modules/llmClient.js
class LLMClient {
    async mergeDesignSystems(designSystems) {
        console.log('🧠 Mock LLM: merging', designSystems.length, 'design systems');
        console.log('📊 Systems:', designSystems.map(ds => ds.domain).join(', '));

        // Объединяем цвета: берём 6 лучших из всех сайтов
        const allColors = designSystems.flatMap(ds => ds.colors.palette || []);
        const topColors = allColors
            .slice(0, 6)
            .map((c, i) => ({
                hex: c.hex || '#000000',
                role: ['primary', 'secondary', 'accent', 'background', 'surface', 'text'][i % 6],
                name: `Color ${i + 1}`,
                sourceDomains: [designSystems[0].domain]
            }));

        // Типографика: body/h1 из первого сайта, остальное — смешано
        const typography = {
            body: designSystems[0].typography.styles.find(s => ['p', 'div', 'span'].includes(s.tag)) || {},
            h1: designSystems[0].typography.styles.find(s => s.tag === 'h1') || {},
            h2: designSystems[1]?.typography.styles.find(s => s.tag === 'h2') || {},
            h3: designSystems[0]?.typography.styles.find(s => s.tag === 'h3') || {},
            p: designSystems[0].typography.styles.find(s => s.tag === 'p') || {},
            a: designSystems[1]?.typography.styles.find(s => s.tag === 'a') || {},
            button: designSystems[0].typography.styles.find(s => s.tag === 'button') || {}
        };

        // Кнопки: primary от первого, secondary/outline от второго
        const buttons = {
            primary: designSystems[0].buttons.clusters.primary || {},
            secondary: designSystems[1]?.buttons.clusters.secondary || designSystems[1]?.buttons.clusters.outline || {},
            outline: designSystems[1]?.buttons.clusters.outline || {},
            text: designSystems[0].buttons.clusters.text || {}
        };

        const merged = {
            colors: { palette: topColors },
            typography,
            buttons
        };

        console.log('✅ Mock LLM: merged primary color:', topColors[0]?.hex);
        console.log('✅ Mock LLM: body font:', typography.body.fontFamily);
        console.log('✅ Mock LLM result:', JSON.stringify(merged, null, 2));

        return merged;
    }
}

module.exports = LLMClient;
