const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const analyzeDesignSystem = require('./modules/analyzer');

const app = express();
const PORT = process.env.PORT || 3001;

// Хранилище истории (в памяти, при перезапуске сервера очищается)
let analysisHistory = [];

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
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

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Auto UI Design System Analyzer with History is ready!`);
});