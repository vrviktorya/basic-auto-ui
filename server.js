const express = require('express');
const cors = require('cors');
const path = require('path');
const analyzeDesignSystem = require('./modules/analyzer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/temp', express.static('temp'));

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API для анализа сайта
app.post('/api/analyze', async (req, res) => {
    try {
        const { url, analysisType = 'full' } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                details: 'Please provide a valid website URL'
            });
        }

        console.log(`🔄 Starting analysis of: ${url}`);
        
        const result = await analyzeDesignSystem(url, analysisType);
        
        console.log(`✅ Analysis completed for: ${url}`);
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
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

// API для массового анализа
app.post('/api/analyze-multiple', async (req, res) => {
    try {
        const { urls, analysisType = 'full' } = req.body;
        
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ 
                error: 'URLs array is required'
            });
        }

        console.log(`🔄 Starting analysis of ${urls.length} URLs`);
        
        const results = [];
        for (const url of urls) {
            try {
                const result = await analyzeDesignSystem(url, analysisType);
                results.push({
                    url,
                    success: true,
                    data: result
                });
            } catch (error) {
                results.push({
                    url,
                    success: false,
                    error: error.message
                });
            }
            // Пауза между запросами
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        res.json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Multiple analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Auto UI Design System Analyzer'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Auto UI Design System Analyzer is ready!`);
});