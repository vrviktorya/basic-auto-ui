const kmeans = require('node-kmeans');
const { rgbToLab, labToRgb, rgbStringToArray, rgbToHex } = require('./colorUtils');

async function improvedClustering(colors, options = {}) {
    const { method = 'rgb' } = options;
    
    // Преобразуем цвета в векторы
    const colorVectors = colors.map(color => {
        const rgbArray = rgbStringToArray(color);
        if (!rgbArray) return null;
        
        if (method === 'lab') {
            return rgbToLab(rgbArray);
        } else {
            return rgbArray;
        }
    }).filter(Boolean);

    if (colorVectors.length === 0) {
        return [];
    }

    // Определяем количество кластеров
    const clustersCount = Math.min(6, Math.max(3, Math.floor(colorVectors.length / 5)));
    
    return new Promise((resolve) => {
        kmeans.clusterize(colorVectors, { k: clustersCount }, (err, res) => {
            if (err || !res) {
                console.error('Clustering error:', err);
                resolve([]);
                return;
            }

            const palette = res.map(cluster => {
                let centroid;
                if (method === 'lab') {
                    const rgb = labToRgb(cluster.centroid);
                    centroid = rgb.map(val => Math.round(val));
                } else {
                    centroid = cluster.centroid.map(val => Math.round(val));
                }
                
                return {
                    rgb: `rgb(${centroid.join(', ')})`,
                    hex: rgbToHex(centroid[0], centroid[1], centroid[2]),
                    count: cluster.cluster.length
                };
            }).sort((a, b) => b.count - a.count);

            resolve(palette);
        });
    });
}

module.exports = { improvedClustering };