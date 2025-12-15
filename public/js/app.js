class DesignSystemAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.currentAnalysis = null;
        this.currentGeneratedSite = null;
    }

    initializeEventListeners() {
        // Форма анализа
        document.getElementById('analysisForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.analyzeWebsite();
        });

        // Быстрые кнопки
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-url');
                document.getElementById('urlInput').value = url;
                this.analyzeWebsite();
            });
        });

        // Кнопки действий
        document.getElementById('analyzeAnotherBtn')?.addEventListener('click', () => {
            this.showInputSection();
        });

        document.getElementById('retryBtn')?.addEventListener('click', () => {
            this.analyzeWebsite();
        });

        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportDesignSystem();
        });

        // Обработчики для истории
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
            this.clearHistory();
        });

        // Инициализация синтеза
        this.initSynthesis();
        
        // Загрузка истории при старте
        this.loadHistory();
    }

    // НОВЫЙ МЕТОД: Показ сообщений
    showMessage(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        
        // Создаем временное уведомление (можно заменить на красивый toast)
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f56565' : type === 'success' ? '#48bb78' : '#4299e1'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Инициализация синтеза
    initSynthesis() {
        const generateBtn = document.getElementById('generateSiteBtn');
        const downloadBtn = document.getElementById('downloadSiteBtn');
        const templateSelect = document.getElementById('templateSelect');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateSite();
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadSite();
            });
        }

        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                if (this.currentAnalysis) {
                    this.generateSite();
                }
            });
        }

        // Обработчики для переключения устройств предпросмотра
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const device = e.target.dataset.device;
                this.switchPreviewDevice(device);
            });
        });
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Загрузка истории
    async loadHistory() {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            
            if (data.success) {
                this.renderHistory(data.history);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    renderHistory(history) {
        const emptyState = document.getElementById('historyEmpty');
        const historyList = document.getElementById('historyList');
        
        if (!history || history.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (historyList) historyList.style.display = 'none';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (historyList) {
            historyList.style.display = 'block';
            historyList.innerHTML = history.map(item => `
                <div class="history-item" data-url="${item.url}">
                    <div class="history-item-info">
                        <div class="history-item-url">${item.url}</div>
                        <div class="history-item-meta">
                            <span>${new Date(item.timestamp).toLocaleString('ru-RU')}</span>
                            <span>${item.colorCount} цветов</span>
                            <span>${item.typographyCount} стилей</span>
                        </div>
                    </div>
                    <div class="history-item-colors">
                        ${item.colors.map(color => `
                            <div class="history-color" style="background: ${color.hex};" title="${color.hex}"></div>
                        `).join('')}
                    </div>
                    <div class="history-item-actions">
                        <button class="btn-history analyze" title="Анализировать снова">
                            <span class="material-symbols-outlined">search</span>
                        </button>
                        <button class="btn-history delete" title="Удалить из истории">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            `).join('');
            
            // Обработчики событий для истории
            historyList.querySelectorAll('.history-item .analyze').forEach((btn, index) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = history[index].url;
                    document.getElementById('urlInput').value = url;
                    this.analyzeWebsite();
                });
            });
            
            historyList.querySelectorAll('.history-item .delete').forEach((btn, index) => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = history[index].id;
                    await this.deleteHistoryItem(id);
                });
            });
            
            historyList.querySelectorAll('.history-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    const url = history[index].url;
                    document.getElementById('urlInput').value = url;
                    this.analyzeWebsite();
                });
            });
        }
    }

    // Удаление элемента истории
    async deleteHistoryItem(id) {
        try {
            const response = await fetch(`/api/history/${id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                this.loadHistory();
            }
        } catch (error) {
            console.error('Error deleting history item:', error);
        }
    }

    // Очистка всей истории
    async clearHistory() {
        if (!confirm('Вы уверены, что хотите очистить всю историю анализов?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/history', {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                this.loadHistory();
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    async analyzeWebsite() {
        const url = document.getElementById('urlInput').value.trim();

        if (!url) {
            this.showError('Пожалуйста, введите URL сайта');
            return;
        }

        // Валидация URL
        if (!this.isValidUrl(url)) {
            this.showError('Пожалуйста, введите корректный URL (начинается с http:// или https://)');
            return;
        }

        this.showLoadingState(url);
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    analysisType: 'full'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || 'Неизвестная ошибка');
            }

            if (data.success) {
                this.showResults(data.data, url);
            } else {
                throw new Error(data.error || 'Анализ завершился неудачно');
            }

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(error.message);
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    showInputSection() {
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('synthesisSection').style.display = 'none';
        document.getElementById('urlInput').focus();
    }

    showLoadingState(url) {
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('resultsContent').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('synthesisSection').style.display = 'none';
        
        document.getElementById('analysisUrl').textContent = url;
        document.getElementById('analysisTime').textContent = new Date().toLocaleString('ru-RU');
        
        // Блокируем кнопку отправки
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = true;
        analyzeBtn.querySelector('.btn-text').style.display = 'none';
        analyzeBtn.querySelector('.btn-loading').style.display = 'inline';
    }

    showResults(data, url) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsContent').style.display = 'block';
        
        // Восстанавливаем кнопку
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = false;
        analyzeBtn.querySelector('.btn-text').style.display = 'flex';
        analyzeBtn.querySelector('.btn-loading').style.display = 'none';

        // Сохраняем текущий анализ
        this.currentAnalysis = { data, url };

        // Отображаем данные
        this.renderColorPalette(data.colors);
        this.renderTypography(data.typography);
        this.renderLayout(data.layout, data.layoutTokens);   // НОВОЕ
        this.renderDesignTokens(data);


        
        // Автоматически генерируем сайт после анализа
        this.generateSite();
        
        // Перезагружаем историю
        this.loadHistory();
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsContent').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('synthesisSection').style.display = 'none';
        
        document.getElementById('errorMessage').textContent = message;
        
        // Восстанавливаем кнопку
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = false;
        analyzeBtn.querySelector('.btn-text').style.display = 'inline';
        analyzeBtn.querySelector('.btn-loading').style.display = 'none';
    }

    renderColorPalette(colors) {
        const container = document.getElementById('colorPalette');
        const stats = document.getElementById('colorStats');
        
        if (!container) {
            console.error('Color palette container not found');
            return;
        }
        
        container.innerHTML = '';
        
        if (!colors || !colors.palette || colors.palette.length === 0) {
            container.innerHTML = `
                <div class="no-colors-message">
                    <span class="material-symbols-outlined">palette</span>
                    <p>Цвета не найдены</p>
                    <p class="debug-info">Всего цветовых строк: ${colors?.total || 0}</p>
                </div>
            `;
            if (stats) stats.textContent = 'Цвета не найдены';
            return;
        }

        // Статистика
        if (stats) {
            stats.textContent = `Найдено ${colors.total} уникальных цветов, сгруппировано в ${colors.palette.length} семантических цветов`;
        }

        // Отображаем палитру с ролями
        colors.palette.forEach((color) => {
            const colorElement = document.createElement('div');
            colorElement.className = 'color-item';
            
            const contrastColor = this.getContrastColor(color.hex);
            const roleName = color.roleName || 'Дополнительный';
            
            colorElement.innerHTML = `
                <div class="color-preview" style="background: ${color.hex}; color: ${contrastColor};">
                    ${color.hex}
                    <div class="color-role-badge">${roleName}</div>
                </div>
                <div class="color-info">
                    <div class="color-role">${roleName}</div>
                    <div class="color-value">${color.rgb}</div>
                    <div class="color-value">Яркость: ${Math.round(color.brightness)}</div>
                    <div class="color-value">Насыщенность: ${color.saturation}%</div>
                    <div class="color-value">Используется в ${color.count} элементах</div>
                </div>
            `;
            
            container.appendChild(colorElement);
        });
    }

    renderTypography(typography) {
        const container = document.getElementById('typographySection');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!typography.styles || typography.styles.length === 0) {
            container.innerHTML = '<p>Типографика не найдена</p>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'typography-grid';
        
        // Группируем по тегам для лучшего отображения
        const groupedStyles = this.groupTypographyByTag(typography.styles);
        
        Object.entries(groupedStyles).forEach(([tag, styles]) => {
            styles.forEach(style => {
                const item = document.createElement('div');
                item.className = 'typography-item';
                
                item.innerHTML = `
                    <div class="typography-sample" style="font-size: ${style.fontSize}; font-family: ${style.fontFamily}; font-weight: ${style.fontWeight}; line-height: ${style.lineHeight}; color: ${style.color};">
                        ${style.example || 'Пример текста с таким стилем'}
                    </div>
                    <div class="typography-details">
                        ${tag.toUpperCase()} | ${style.fontSize} | ${style.fontFamily} | Вес: ${style.fontWeight}
                    </div>
                `;
                
                grid.appendChild(item);
            });
        });
        
        container.appendChild(grid);
    }

    renderLayout(layout, layoutTokens) {
        const sectionsContainer = document.getElementById('layoutSections');
        const tokensContainer = document.getElementById('layoutTokens');
    
        if (!sectionsContainer || !tokensContainer) return;
    
        sectionsContainer.innerHTML = '';
    
        if (!layout || !layout.sections || layout.sections.length === 0) {
            sectionsContainer.innerHTML = '<p>Layout-секции не обнаружены.</p>';
        } else {
            layout.sections.forEach(section => {
                const div = document.createElement('div');
                div.className = 'layout-section-item';
    
                const type = section.type || 'generic';
                const tag = section.tag || 'div';
                const className = section.className || '';
    
                div.innerHTML = `
                    <div><strong>${section.index + 1}. ${tag.toUpperCase()}</strong> (${type})</div>
                    <div class="layout-section-meta">
                        <span class="layout-badge">display: ${section.display}</span>
                        ${section.flexDirection ? `<span class="layout-badge">flex-dir: ${section.flexDirection}</span>` : ''}
                        ${section.gridTemplateColumns ? `<span class="layout-badge">grid: ${section.gridTemplateColumns}</span>` : ''}
                        ${section.maxWidthPx ? `<span class="layout-badge">max-width: ${Math.round(section.maxWidthPx)}px</span>` : ''}
                        ${section.paddingY ? `<span class="layout-badge">paddingY: ${Math.round(section.paddingY)}px</span>` : ''}
                        ${section.childrenCount ? `<span class="layout-badge">children: ${section.childrenCount}</span>` : ''}
                    </div>
                    ${className ? `<div class="layout-section-classes">${className}</div>` : ''}
                `;
    
                sectionsContainer.appendChild(div);
            });
        }
    
        // Токены выводим JSONом, чтобы быстро проверять, что реально приходит с сервера
        tokensContainer.textContent = layoutTokens
            ? JSON.stringify(layoutTokens, null, 2)
            : '// layoutTokens не были сгенерированы';
    }
    

    renderDesignTokens(data) {
        // Генерируем CSS токены
        const colorTokens = this.generateColorTokens(data.colors.palette);
        const typographyTokens = this.generateTypographyTokens(data.typography.styles);
        
        const colorTokensElement = document.getElementById('colorTokens');
        const typographyTokensElement = document.getElementById('typographyTokens');
        
        if (colorTokensElement) colorTokensElement.textContent = colorTokens;
        if (typographyTokensElement) typographyTokensElement.textContent = typographyTokens;
    }

    groupTypographyByTag(styles) {
        return styles.reduce((groups, style) => {
            const tag = style.tag || 'unknown';
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(style);
            return groups;
        }, {});
    }

    determineColorRole(color, index, palette) {
        const brightness = this.getBrightness(color.hex);
        
        if (brightness > 240) return 'Фон';
        if (brightness < 30) return 'Основной текст';
        if (index === 0) return 'Основной цвет';
        if (index === 1) return 'Вторичный цвет';
        if (brightness > 200) return 'Поверхность';
        if (this.isAccentColor(color.hex, palette)) return 'Акцентный';
        return `Цвет ${index + 1}`;
    }

    isAccentColor(hex, palette) {
        // Упрощенный расчет контраста
        const hsl = this.hexToHsl(hex);
        return hsl.s > 0.5 && hsl.l > 0.3 && hsl.l < 0.7;
    }

    getBrightness(hex) {
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    getContrastColor(hex) {
        const brightness = this.getBrightness(hex);
        return brightness > 128 ? '#000000' : '#FFFFFF';
    }

    hexToHsl(hex) {
        // Упрощенное преобразование HEX в HSL
        const r = parseInt(hex.substr(1, 2), 16) / 255;
        const g = parseInt(hex.substr(3, 2), 16) / 255;
        const b = parseInt(hex.substr(5, 2), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        
        let h = 0, s = 0;
        
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s, l };
    }

    generateColorTokens(palette) {
        let css = ':root {\n';
        
        palette.forEach((color, index) => {
            const role = this.determineColorRole(color, index, palette).toLowerCase().replace(' ', '-');
            css += `  --color-${role}: ${color.hex};\n`;
            css += `  --color-${role}-rgb: ${color.rgb.replace('rgb(', '').replace(')', '')};\n`;
        });
        
        css += '}';
        return css;
    }

    generateTypographyTokens(styles) {
        if (!styles || !styles.length) return '/* Типографика не найдена */';
        
        const mainFont = styles[0].fontFamily;
        let css = `:root {\n  --font-primary: ${mainFont};\n`;
        
        // Группируем по размерам
        const fontSizes = [...new Set(styles.map(s => s.fontSize))].sort((a, b) => 
            parseFloat(a) - parseFloat(b)
        );
        
        fontSizes.forEach((size, index) => {
            css += `  --font-size-${index + 1}: ${size};\n`;
        });
        
        css += '}';
        return css;
    }

    // МЕТОДЫ СИНТЕЗА САЙТА
    async generateSite() {
        if (!this.currentAnalysis) {
            this.showMessage('Сначала выполните анализ сайта', 'error');
            return;
        }

        const templateType = document.getElementById('templateSelect')?.value || 'corporate';
        
        try {
            this.showMessage('Генерируем сайт...', 'info');
            
            const response = await fetch('/api/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    designSystem: this.currentAnalysis.data,
                    templateType: templateType
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showGeneratedSite(data.html, templateType);
                this.showMessage('Сайт успешно сгенерирован!', 'success');
            } else {
                this.showMessage(`Ошибка генерации: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Site generation error:', error);
            this.showMessage('Ошибка при генерации сайта', 'error');
        }
    }

    showGeneratedSite(html, templateType) {
        // Показываем секцию синтеза
        const synthesisSection = document.getElementById('synthesisSection');
        if (synthesisSection) {
            synthesisSection.style.display = 'block';
            
            // Прокручиваем к секции синтеза
            synthesisSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Обновляем информацию
        const currentTemplate = document.getElementById('currentTemplate');
        const colorScheme = document.getElementById('colorScheme');
        const typographyInfo = document.getElementById('typographyInfo');
        
        if (currentTemplate) currentTemplate.textContent = this.getTemplateName(templateType);
        if (colorScheme) colorScheme.textContent = 'На основе анализа';
        if (typographyInfo) typographyInfo.textContent = 'Адаптивная';
        
        // Загружаем HTML в iframe
        const preview = document.getElementById('sitePreview');
        if (preview) {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            preview.src = url;
            this.currentGeneratedSite = html;
        }
    }

    downloadSite() {
        if (!this.currentGeneratedSite) {
            this.showMessage('Нет сгенерированного сайта для скачивания', 'error');
            return;
        }
        
        const domain = this.currentAnalysis?.data?.domain || 'generated-site';
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `synthesized-site-${domain}-${timestamp}.html`;
        
        this.downloadFile(filename, this.currentGeneratedSite);
        this.showMessage('Сайт скачан!', 'success');
    }

    switchPreviewDevice(device) {
        // Обновляем активную кнопку
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-device="${device}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Обновляем контейнер предпросмотра
        const container = document.querySelector('.preview-container');
        if (container) {
            container.className = 'preview-container';
            container.classList.add(device);
        }
    }

    getTemplateName(templateType) {
        const names = {
            corporate: 'Корпоративный',
            startup: 'Стартап',
            portfolio: 'Портфолио',
            minimal: 'Минималистичный'
        };
        return names[templateType] || templateType;
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportDesignSystem() {
        if (!this.currentAnalysis) {
            alert('Нет данных для экспорта');
            return;
        }

        const { data, url } = this.currentAnalysis;
        const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Создаем содержимое для экспорта
        const cssContent = this.generateExportCSS(data);
        const htmlContent = this.generateExportHTML(data, url);
        const jsonContent = JSON.stringify(data, null, 2);
        
        // Создаем ZIP (упрощенная версия - можно доработать с JSZip)
        this.downloadFile(`design-system-${domain}-${timestamp}.css`, cssContent);
        this.downloadFile(`design-system-${domain}-${timestamp}.html`, htmlContent);
        this.downloadFile(`design-system-${domain}-${timestamp}.json`, jsonContent);
        
        this.showMessage('Дизайн-система экспортирована в 3 файла!', 'success');
    }

    generateExportCSS(data) {
        return this.generateColorTokens(data.colors.palette) + '\n\n' + 
               this.generateTypographyTokens(data.typography.styles);
    }

    generateExportHTML(data, url) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Design System - ${url}</title>
    <style>
        ${this.generateExportCSS(data)}
        body { font-family: var(--font-primary); max-width: 800px; margin: 0 auto; padding: 2rem; }
        .color-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .color-item { border-radius: 8px; overflow: hidden; }
        .color-preview { height: 80px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Design System for ${url}</h1>
    <div class="color-grid">
        ${data.colors.palette.map(color => `
        <div class="color-item">
            <div class="color-preview" style="background: ${color.hex}; color: ${this.getContrastColor(color.hex)};">
                ${color.hex}
            </div>
        </div>
        `).join('')}
    </div>
</body>
</html>`;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.analyzer = new DesignSystemAnalyzer();
    
    // Проверка здоровья сервера
    fetch('/api/health')
        .then(response => response.json())
        .then(data => console.log('Server health:', data))
        .catch(error => console.error('Health check failed:', error));
});