const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const analyzeDesignSystem = require('../modules/analyzer/analyzer');
const DesignSystemExporter = require('../modules/exporter/exporter');
const SiteSynthesizer = require('../modules/synthesis/siteSynthesizer');

const app = express();

// Хранилище истории (в памяти, при перезапуске сервера очищается)
let analysisHistory = [];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API для анализа сайта
app.post('/api/analyze', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                details: 'Please provide a valid website URL'
            });
        }

        console.log(`🔄 Starting analysis of: ${url}`);
        
        const result = await analyzeDesignSystem(url, 'full');
        
        // Добавляем в историю
        const historyItem = {
            id: Date.now(),
            url: url,
            domain: result.domain,
            timestamp: new Date().toISOString(),
            colors: result.colors.palette.slice(0, 5), // Сохраняем только 5 основных цветов
            typographyCount: result.typography.styles.length,
            colorCount: result.colors.total
        };
        
        analysisHistory.unshift(historyItem); // Добавляем в начало
        analysisHistory = analysisHistory.slice(0, 20); // Ограничиваем историю 20 записями
        
        console.log(`✅ Analysis completed for: ${url}`);
        res.json({
            success: true,
            data: result,
            historyId: historyItem.id, // Возвращаем ID для связи
            timestamp: historyItem.timestamp
        });

    } catch (error) {
        console.error('❌ Analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Analysis failed. Please check the URL and try again.'
        });
    }
});

// API для получения истории
app.get('/api/history', (req, res) => {
    res.json({
        success: true,
        history: analysisHistory
    });
});

// API для удаления элемента истории
app.delete('/api/history/:id', (req, res) => {
    const id = parseInt(req.params.id);
    analysisHistory = analysisHistory.filter(item => item.id !== id);
    
    res.json({
        success: true,
        message: 'History item deleted'
    });
});

// API для очистки всей истории
app.delete('/api/history', (req, res) => {
    analysisHistory = [];
    res.json({
        success: true,
        message: 'History cleared'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Auto UI Design System Analyzer',
        historyCount: analysisHistory.length
    });
});

// НОВЫЙ ЭНДПОИНТ: Экспорт дизайн-системы
app.post('/api/export', (req, res) => {
    try {
        const { format, colors, typography, options = {} } = req.body;
        
        if (!format || !colors) {
            return res.status(400).json({
                success: false,
                error: 'Format and colors are required'
            });
        }

        const exporter = new DesignSystemExporter();
        let exportedContent;
        
        switch (format.toLowerCase()) {
            case 'css':
                exportedContent = exporter.exportToCSS(colors, typography, options);
                break;
            case 'json':
                exportedContent = exporter.exportToJSON(colors, typography, options);
                break;
            case 'scss':
                exportedContent = exporter.exportToSCSS(colors, typography, options);
                break;
            case 'tailwind':
                exportedContent = exporter.exportToTailwind(colors, { ...options, typography });
                break;
            case 'all':
                exportedContent = exporter.getAllFormats(colors, typography, options);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Unsupported format: ${format}. Supported: css, json, scss, tailwind, all`
                });
        }

        console.log(`📤 Exported design system as ${format}`);
        
        res.json({
            success: true,
            format: format,
            content: exportedContent,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Export error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// НОВЫЙ ЭНДПОИНТ: Получение доступных форматов
app.get('/api/export/formats', (req, res) => {
    const exporter = new DesignSystemExporter();
    res.json({
        success: true,
        formats: exporter.formats
    });
});

// Эндпоинт для синтеза сайта
app.post('/api/synthesize', async (req, res) => {
    try {
        const { designSystem, templateType = 'corporate' } = req.body;
        
        if (!designSystem) {
            return res.status(400).json({
                success: false,
                error: 'Design system data is required'
            });
        }

        console.log(`🛠️ Generating site with template: ${templateType}`);
        
        const synthesizer = new SiteSynthesizer();
        const generatedSite = synthesizer.generateSite(designSystem, templateType);
        
        console.log('✅ Site generated successfully');
        
        res.json({
            success: true,
            html: generatedSite,
            templateType: templateType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Site synthesis error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Site generation failed. Please try again.'
        });
    }
});

// Эндпоинт для получения доступных шаблонов
app.get('/api/synthesize/templates', (req, res) => {
    const synthesizer = new SiteSynthesizer();
    res.json({
        success: true,
        templates: Object.keys(synthesizer.templates)
    });
});

// Функция для поиска свободного порта
function findFreePort(startPort = 3000, maxAttempts = 50) {
    return new Promise((resolve, reject) => {
        const net = require('net');
        let port = startPort;
        let attempts = 0;

        function tryPort() {
            if (attempts >= maxAttempts) {
                reject(new Error(`Could not find free port after ${maxAttempts} attempts`));
                return;
            }

            const server = net.createServer();
            server.listen(port, () => {
                server.close(() => {
                    resolve(port);
                });
            });
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    attempts++;
                    port++;
                    tryPort();
                } else {
                    reject(err);
                }
            });
        }

        tryPort();
    });
}

// Запуск сервера на свободном порту
findFreePort(3002, 20)
    .then(port => {
        app.listen(port, () => {
            console.log(`🚀 Server running at http://localhost:${port}`);
            console.log(`📊 Auto UI Design System Analyzer is ready!`);
            console.log(`📍 Open this URL in your browser: http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('❌ Failed to start server:', err);
    });
