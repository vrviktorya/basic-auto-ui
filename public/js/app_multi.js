class DesignSystemAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.currentAnalysis = null;
        this.currentGeneratedSite = null;
        this.editedDesignSystem = null;
        this.currentEditedColors = null;
        this.currentEditedTypography = null;
        this.currentEditedButtons = null;
        this.mergeProcess = null;
        
        // Загружаем доступные стратегии
        this.loadStrategies();
    }

    initializeEventListeners() {
        // Форма анализа одного сайта
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

        // Кросс-референсный анализ
        document.getElementById('addUrlBtn')?.addEventListener('click', () => {
            this.addUrlInput();
        });

        document.getElementById('analyzeMultipleBtn')?.addEventListener('click', () => {
            this.analyzeMultipleWebsites();
        });

        // Обработчики для истории
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
            this.clearHistory();
        });

        // Инициализация синтеза и редактора
        this.initSynthesis();
        this.initEditor();
        
        // Загрузка истории при старте
        this.loadHistory();
    }

    // ====== ОСНОВНЫЕ МЕТОДЫ ======

    async analyzeWebsite() {
        const url = document.getElementById('urlInput').value.trim();

        if (!url) {
            this.showMessage('Пожалуйста, введите URL сайта', 'error');
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showMessage('Пожалуйста, введите корректный URL (начинается с http:// или https://)', 'error');
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
                    url: url
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

    async analyzeMultipleWebsites() {
        const urlInputs = document.querySelectorAll('.multi-url-input');
        const urls = Array.from(urlInputs).map(input => input.value.trim()).filter(url => url);
        
        if (urls.length < 2) {
            this.showMessage('Пожалуйста, введите как минимум два URL', 'error');
            return;
        }
        
        const strategySelect = document.getElementById('strategySelect');
        const strategy = strategySelect ? strategySelect.value : 'semantic_fusion';
        
        this.showLoadingStateMultiple(urls);
        
        try {
            const response = await fetch('/api/analyze/cross-reference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    urls: urls,
                    strategy: strategy
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.details || 'Неизвестная ошибка');
            }

            if (data.success) {
                this.showResults(data.data, 'Кросс-референсный анализ');
                this.currentAnalysis = { 
                    data: data.data, 
                    urls: urls, 
                    isMultiSite: true,
                    mergeProcess: data.mergeProcess
                };
                this.mergeProcess = data.mergeProcess;
                
                // Показываем процесс объединения
                this.showMergeProcess();
            } else {
                throw new Error(data.error || 'Анализ завершился неудачно');
            }

        } catch (error) {
            console.error('Multiple analysis error:', error);
            this.showError(error.message);
        }
    }

    // ====== ИНТЕРАКТИВНЫЙ РЕДАКТОР ======

    initEditor() {
        // Табы редактора
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab || e.target.closest('[data-tab]').dataset.tab;
                this.switchEditorTab(tabId);
            });
        });

        // Цвета
        document.getElementById('applyColor')?.addEventListener('click', () => {
            this.applyCustomColor();
        });

        document.getElementById('colorPicker')?.addEventListener('input', (e) => {
            this.previewColorChange(e.target.value);
        });

        // Типографика
        document.getElementById('bodyFont')?.addEventListener('change', (e) => {
            this.updateTypographyPreview();
        });

        document.getElementById('headingFont')?.addEventListener('change', (e) => {
            this.updateTypographyPreview();
        });

        document.getElementById('baseSize')?.addEventListener('input', (e) => {
            document.getElementById('baseSizeValue').textContent = e.target.value + 'px';
            this.updateTypographyPreview();
        });

        document.getElementById('headingScale')?.addEventListener('input', (e) => {
            document.getElementById('headingScaleValue').textContent = e.target.value + '%';
            this.updateTypographyPreview();
        });

        // Кнопки
        document.querySelectorAll('[data-button-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const buttonType = e.target.dataset.buttonType || 
                                 e.target.closest('[data-button-type]').dataset.buttonType;
                this.openButtonEditor(buttonType);
            });
        });

        document.getElementById('saveButtonChanges')?.addEventListener('click', () => {
            this.saveButtonChanges();
        });

        document.getElementById('cancelButtonChanges')?.addEventListener('click', () => {
            this.closeButtonEditor();
        });

        // Предпросмотр устройств
        document.querySelectorAll('.preview-device').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const device = e.target.dataset.device || 
                              e.target.closest('[data-device]').dataset.device;
                this.switchPreviewDeviceEditor(device);
            });
        });

        // Основные действия
        document.getElementById('applyChanges')?.addEventListener('click', () => {
            this.applyEditorChanges();
        });

        document.getElementById('resetChanges')?.addEventListener('click', () => {
            this.resetEditorChanges();
        });

        document.getElementById('openEditorBtn')?.addEventListener('click', () => {
            this.openEditor();
        });

        // Экспорт из редактора
        document.getElementById('exportEditedBtn')?.addEventListener('click', () => {
            this.exportEditedDesignSystem();
        });
    }

    setupEditor(designSystem) {
        this.currentEditedColors = JSON.parse(JSON.stringify(designSystem.colors));
        this.currentEditedTypography = JSON.parse(JSON.stringify(designSystem.typography));
        this.currentEditedButtons = JSON.parse(JSON.stringify(designSystem.buttons));
        
        this.renderColorEditor();
        this.renderTypographyEditor();
        this.renderButtonsEditor();
        this.updateLivePreview();
    }

    renderColorEditor() {
        const container = document.getElementById('colorPresets');
        const rolesContainer = document.getElementById('colorRoles');
        
        if (!container || !rolesContainer || !this.currentEditedColors) return;

        // Рендерим пресеты
        const presets = this.generateColorPresets();
        container.innerHTML = presets.map((preset, index) => `
            <div class="preset-item ${index === 0 ? 'active' : ''}" data-preset-index="${index}">
                <div class="preset-colors">
                    ${preset.colors.slice(0, 5).map(color => `
                        <div class="preset-color" style="background: ${color.hex};" title="${color.hex}"></div>
                    `).join('')}
                </div>
                <div class="preset-name">${preset.name}</div>
                <div class="preset-sources">${preset.sources ? preset.sources.join(', ') : ''}</div>
            </div>
        `).join('');

        container.querySelectorAll('.preset-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectColorPreset(presets[index]);
            });
        });

        // Рендерим роли цветов
        rolesContainer.innerHTML = this.currentEditedColors.palette.map(color => `
            <div class="color-role-item" data-role="${color.role}">
                <div class="color-role-preview" style="background: ${color.hex};"></div>
                <div class="color-role-info">
                    <div class="color-role-name">${color.roleName || color.role}</div>
                    <div class="color-role-value">${color.hex}</div>
                    ${color.mergeSources ? `
                    <div class="color-role-sources">
                        <small>Источники: ${color.mergeSources.join(', ')}</small>
                    </div>` : ''}
                </div>
                <div class="color-role-actions">
                    <button class="btn-select-role" data-role="${color.role}" title="Редактировать">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                </div>
            </div>
        `).join('');

        rolesContainer.querySelectorAll('.btn-select-role').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const role = e.target.closest('button').dataset.role;
                this.selectColorRoleForEditing(role);
            });
        });
    }

    generateColorPresets() {
        const presets = [];
        
        // Текущая палитра
        presets.push({
            name: 'Текущая палитра',
            colors: this.currentEditedColors.palette,
            sources: ['Редактируемая']
        });

        // Если есть исходные системы из кросс-анализа
        if (this.currentAnalysis && this.currentAnalysis.isMultiSite) {
            this.currentAnalysis.data.metadata?.mergedFrom?.forEach((source, index) => {
                // В реальной реализации здесь нужно загрузить цвета из каждого источника
                // Для примера создаем заглушку
                presets.push({
                    name: `Палитра: ${source}`,
                    colors: this.generateRandomPalette(),
                    sources: [source]
                });
            });
        }

        // Стандартные пресеты
        presets.push({
            name: 'Корпоративный синий',
            colors: [
                { hex: '#1a365d', role: 'primary', roleName: 'Основной' },
                { hex: '#2d3748', role: 'secondary', roleName: 'Вторичный' },
                { hex: '#4a5568', role: 'accent', roleName: 'Акцентный' },
                { hex: '#ffffff', role: 'background', roleName: 'Фон' },
                { hex: '#1a202c', role: 'text', roleName: 'Текст' }
            ],
            sources: ['Стандартная']
        });

        return presets;
    }

    selectColorPreset(preset) {
        document.querySelectorAll('.preset-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.preset-item').classList.add('active');
        
        this.currentEditedColors.palette = preset.colors;
        this.renderColorEditor();
        this.updateLivePreview();
        
        this.showMessage(`Применена палитра: ${preset.name}`, 'success');
    }

    selectColorRoleForEditing(role) {
        const colorItem = this.currentEditedColors.palette.find(c => c.role === role);
        if (colorItem) {
            document.getElementById('colorPicker').value = colorItem.hex;
            document.getElementById('colorPicker').dataset.editingRole = role;
            
            // Подсвечиваем выбранную роль
            document.querySelectorAll('.color-role-item').forEach(item => {
                item.classList.remove('selected');
            });
            document.querySelector(`[data-role="${role}"]`).classList.add('selected');
            
            this.showMessage(`Редактируем цвет: ${colorItem.roleName || role}`, 'info');
        }
    }

    previewColorChange(newColor) {
        const role = document.getElementById('colorPicker').dataset.editingRole;
        if (!role) return;
        
        const preview = document.querySelector(`[data-role="${role}"] .color-role-preview`);
        if (preview) {
            preview.style.background = newColor;
        }
    }

    applyCustomColor() {
        const colorPicker = document.getElementById('colorPicker');
        const role = colorPicker.dataset.editingRole;
        const newColor = colorPicker.value;
        
        if (!role) {
            this.showMessage('Выберите роль цвета для редактирования', 'error');
            return;
        }
        
        const colorIndex = this.currentEditedColors.palette.findIndex(c => c.role === role);
        if (colorIndex !== -1) {
            this.currentEditedColors.palette[colorIndex].hex = newColor;
            this.renderColorEditor();
            this.updateLivePreview();
            this.showMessage(`Цвет ${role} обновлен на ${newColor}`, 'success');
        }
    }

    renderTypographyEditor() {
        if (!this.currentEditedTypography) return;
        
        // Находим шрифт для body
        const bodyStyle = this.currentEditedTypography.styles.find(s => 
            s.tag === 'body' || s.tag === 'p'
        );
        
        if (bodyStyle) {
            document.getElementById('bodyFont').value = bodyStyle.fontFamily || 'Arial, sans-serif';
            const fontSize = parseFloat(bodyStyle.fontSize) || 16;
            document.getElementById('baseSize').value = fontSize;
            document.getElementById('baseSizeValue').textContent = fontSize + 'px';
        }
        
        // Находим шрифт для заголовков
        const headingStyle = this.currentEditedTypography.styles.find(s => 
            s.tag === 'h1' || s.tag === 'h2'
        );
        
        if (headingStyle) {
            document.getElementById('headingFont').value = headingStyle.fontFamily || 'Arial, sans-serif';
        }
        
        this.updateTypographyPreview();
    }

    updateTypographyPreview() {
        const bodyFont = document.getElementById('bodyFont').value;
        const headingFont = document.getElementById('headingFont').value;
        const baseSize = parseInt(document.getElementById('baseSize').value);
        const headingScale = parseInt(document.getElementById('headingScale').value) / 100;
        
        const preview = document.getElementById('typographyPreview');
        preview.innerHTML = `
            <div class="typography-preview-content">
                <h1 style="
                    font-family: ${headingFont}; 
                    font-size: ${baseSize * 2.5 * headingScale}px;
                    font-weight: bold;
                    margin: 0 0 1rem 0;
                    color: ${this.getColorByRole('text') || '#333'};
                ">Заголовок H1</h1>
                
                <h2 style="
                    font-family: ${headingFont}; 
                    font-size: ${baseSize * 2.0 * headingScale}px;
                    font-weight: 600;
                    margin: 0 0 0.75rem 0;
                    color: ${this.getColorByRole('text') || '#333'};
                ">Заголовок H2</h2>
                
                <p style="
                    font-family: ${bodyFont}; 
                    font-size: ${baseSize}px;
                    line-height: 1.5;
                    margin: 0 0 1rem 0;
                    color: ${this.getColorByRole('text') || '#666'};
                ">
                    Это пример текста для предпросмотра типографики. Здесь показано, как будет выглядеть основной текст на сайте.
                </p>
                
                <button style="
                    font-family: ${bodyFont}; 
                    font-size: ${baseSize}px;
                    padding: ${Math.round(baseSize * 0.75)}px ${Math.round(baseSize * 1.5)}px;
                    border-radius: 6px;
                    background: ${this.getColorByRole('primary') || '#007bff'};
                    color: white;
                    border: none;
                    cursor: pointer;
                ">
                    Пример кнопки
                </button>
            </div>
        `;
    }

    renderButtonsEditor() {
        const presetsContainer = document.getElementById('buttonPresets');
        if (!presetsContainer || !this.currentEditedButtons) return;
        
        const presets = this.generateButtonPresets();
        presetsContainer.innerHTML = presets.map(preset => `
            <div class="button-preset-item" data-button-type="${preset.type}">
                <div class="button-preview-small" style="
                    background: ${preset.styles.backgroundColor || '#007bff'};
                    color: ${preset.styles.color || '#ffffff'};
                    border: ${preset.styles.borderWidth || '0px'} ${preset.styles.borderStyle || 'solid'} ${preset.styles.borderColor || 'transparent'};
                    border-radius: ${preset.styles.borderRadius || '6px'};
                    font-family: ${preset.styles.fontFamily || 'inherit'};
                    font-size: ${preset.styles.fontSize || '1rem'};
                    padding: ${preset.styles.padding?.top || '8px'} ${preset.styles.padding?.right || '16px'};
                ">
                    ${preset.text || preset.name}
                </div>
                <div class="preset-name">${preset.name}</div>
                ${preset.source ? `<div class="preset-source">${preset.source}</div>` : ''}
            </div>
        `).join('');
        
        presetsContainer.querySelectorAll('.button-preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.buttonType;
                const preset = presets.find(p => p.type === type);
                if (preset) {
                    this.selectButtonPreset(preset);
                }
            });
        });
        
        this.updateButtonPreviews();
    }

    generateButtonPresets() {
        const presets = [];
        
        // Кнопки из текущей системы
        if (this.currentEditedButtons.clusters) {
            Object.entries(this.currentEditedButtons.clusters).forEach(([type, button]) => {
                if (button) {
                    presets.push({
                        type: type,
                        name: this.getButtonTypeName(type),
                        styles: button.styles,
                        text: button.text || this.getButtonTypeName(type),
                        source: 'Текущая система'
                    });
                }
            });
        }
        
        // Стандартные пресеты
        presets.push({
            type: 'primary',
            name: 'Стандартная основная',
            styles: {
                backgroundColor: '#007bff',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '16px',
                padding: { top: '12px', right: '24px', bottom: '12px', left: '24px' }
            },
            text: 'Основная кнопка',
            source: 'Стандартная'
        });
        
        return presets;
    }

    selectButtonPreset(preset) {
        if (this.currentEditedButtons.clusters[preset.type]) {
            this.currentEditedButtons.clusters[preset.type].styles = preset.styles;
            this.updateButtonPreviews();
            this.updateLivePreview();
            this.showMessage(`Применен стиль для ${preset.name}`, 'success');
        }
    }

    updateButtonPreviews() {
        const primaryButton = this.currentEditedButtons.clusters?.primary;
        const secondaryButton = this.currentEditedButtons.clusters?.secondary;
        
        if (primaryButton && primaryButton.styles) {
            const preview = document.getElementById('primaryButtonPreview');
            if (preview) {
                preview.style.cssText = `
                    background: ${primaryButton.styles.backgroundColor || '#007bff'};
                    color: ${primaryButton.styles.color || '#ffffff'};
                    border: ${primaryButton.styles.borderWidth || '0px'} solid ${primaryButton.styles.borderColor || 'transparent'};
                    border-radius: ${primaryButton.styles.borderRadius || '6px'};
                    font-family: ${primaryButton.styles.fontFamily || 'inherit'};
                    font-size: ${primaryButton.styles.fontSize || '1rem'};
                    padding: ${primaryButton.styles.padding?.top || '12px'} ${primaryButton.styles.padding?.right || '24px'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                preview.textContent = primaryButton.text || 'Основная кнопка';
            }
        }
        
        if (secondaryButton && secondaryButton.styles) {
            const preview = document.getElementById('secondaryButtonPreview');
            if (preview) {
                preview.style.cssText = `
                    background: ${secondaryButton.styles.backgroundColor || 'transparent'};
                    color: ${secondaryButton.styles.color || '#007bff'};
                    border: ${secondaryButton.styles.borderWidth || '2px'} solid ${secondaryButton.styles.borderColor || '#007bff'};
                    border-radius: ${secondaryButton.styles.borderRadius || '6px'};
                    font-family: ${secondaryButton.styles.fontFamily || 'inherit'};
                    font-size: ${secondaryButton.styles.fontSize || '1rem'};
                    padding: ${secondaryButton.styles.padding?.top || '10px'} ${secondaryButton.styles.padding?.right || '20px'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                preview.textContent = secondaryButton.text || 'Вторичная кнопка';
            }
        }
    }

    openButtonEditor(buttonType) {
        const button = this.currentEditedButtons.clusters?.[buttonType];
        if (!button) {
            this.showMessage(`Кнопка типа ${buttonType} не найдена`, 'error');
            return;
        }
        
        const modal = document.getElementById('buttonModal');
        const styles = button.styles || {};
        
        document.getElementById('modalButtonType').textContent = this.getButtonTypeName(buttonType);
        modal.dataset.editingButtonType = buttonType;
        
        // Заполняем значения
        document.getElementById('buttonBgColor').value = this.hexToRgbColor(styles.backgroundColor || '#007bff');
        document.getElementById('buttonTextColor').value = this.hexToRgbColor(styles.color || '#ffffff');
        
        const padding = parseFloat(styles.padding?.top) || 12;
        document.getElementById('buttonPadding').value = padding;
        document.getElementById('buttonPaddingValue').textContent = padding + 'px';
        
        const radius = parseFloat(styles.borderRadius) || 6;
        document.getElementById('buttonRadius').value = radius;
        document.getElementById('buttonRadiusValue').textContent = radius + 'px';
        
        modal.style.display = 'flex';
    }

    saveButtonChanges() {
        const modal = document.getElementById('buttonModal');
        const buttonType = modal.dataset.editingButtonType;
        
        if (!buttonType || !this.currentEditedButtons.clusters?.[buttonType]) {
            this.closeButtonEditor();
            return;
        }
        
        const styles = this.currentEditedButtons.clusters[buttonType].styles || {};
        
        // Обновляем стили
        styles.backgroundColor = document.getElementById('buttonBgColor').value;
        styles.color = document.getElementById('buttonTextColor').value;
        
        const padding = document.getElementById('buttonPadding').value;
        styles.padding = {
            top: padding + 'px',
            right: padding * 2 + 'px',
            bottom: padding + 'px',
            left: padding * 2 + 'px'
        };
        
        styles.borderRadius = document.getElementById('buttonRadius').value + 'px';
        
        this.currentEditedButtons.clusters[buttonType].styles = styles;
        
        this.closeButtonEditor();
        this.updateButtonPreviews();
        this.updateLivePreview();
        this.showMessage(`Стиль кнопки ${this.getButtonTypeName(buttonType)} обновлен`, 'success');
    }

    closeButtonEditor() {
        document.getElementById('buttonModal').style.display = 'none';
    }

    updateLivePreview() {
        const preview = document.getElementById('livePreview');
        if (!preview) return;
        
        preview.innerHTML = `
            <div class="live-preview-content" style="
                padding: 2rem;
                background: ${this.getColorByRole('background') || '#ffffff'};
                color: ${this.getColorByRole('text') || '#333333'};
                font-family: ${this.getTypographySetting('body')?.fontFamily || 'Arial, sans-serif'};
                border-radius: 8px;
            ">
                <h1 style="
                    font-family: ${this.getTypographySetting('heading')?.fontFamily || 'Arial, sans-serif'};
                    font-size: ${this.getTypographySetting('heading')?.fontSize || '2.5rem'};
                    color: ${this.getColorByRole('text') || '#333333'};
                    margin-bottom: 1rem;
                ">
                    Предпросмотр изменений
                </h1>
                
                <p style="
                    font-size: ${this.getTypographySetting('body')?.fontSize || '1rem'};
                    line-height: 1.5;
                    margin-bottom: 2rem;
                ">
                    Это предпросмотр текста с текущими настройками типографики и цветов.
                    Здесь показано, как будет выглядеть контент на сайте.
                </p>
                
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button style="
                        background: ${this.getButtonColor('primary') || '#007bff'};
                        color: ${this.getButtonTextColor('primary') || '#ffffff'};
                        border-radius: ${this.getButtonRadius('primary') || '6px'};
                        padding: ${this.getButtonPadding('primary') || '12px 24px'};
                        border: none;
                        font-family: ${this.getTypographySetting('body')?.fontFamily || 'Arial, sans-serif'};
                        font-size: ${this.getTypographySetting('body')?.fontSize || '1rem'};
                        cursor: pointer;
                    ">
                        Основная кнопка
                    </button>
                    
                    <button style="
                        background: ${this.getButtonColor('secondary') || 'transparent'};
                        color: ${this.getButtonTextColor('secondary') || '#007bff'};
                        border: 2px solid ${this.getButtonBorderColor('secondary') || '#007bff'};
                        border-radius: ${this.getButtonRadius('secondary') || '6px'};
                        padding: ${this.getButtonPadding('secondary') || '10px 20px'};
                        font-family: ${this.getTypographySetting('body')?.fontFamily || 'Arial, sans-serif'};
                        font-size: ${this.getTypographySetting('body')?.fontSize || '1rem'};
                        cursor: pointer;
                    ">
                        Вторичная кнопка
                    </button>
                </div>
            </div>
        `;
    }

    // ====== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ РЕДАКТОРА ======

    getColorByRole(role) {
        const color = this.currentEditedColors?.palette?.find(c => c.role === role);
        return color?.hex;
    }

    getTypographySetting(type) {
        if (!this.currentEditedTypography) return null;
        
        if (type === 'body') {
            const bodyStyle = this.currentEditedTypography.styles.find(s => 
                s.tag === 'body' || s.tag === 'p'
            );
            return {
                fontFamily: document.getElementById('bodyFont')?.value || 'Arial, sans-serif',
                fontSize: document.getElementById('baseSize')?.value + 'px' || '16px'
            };
        }
        
        if (type === 'heading') {
            return {
                fontFamily: document.getElementById('headingFont')?.value || 'Arial, sans-serif',
                fontSize: (parseInt(document.getElementById('baseSize')?.value || 16) * 
                         parseInt(document.getElementById('headingScale')?.value || 150) / 100) + 'px'
            };
        }
        
        return null;
    }

    getButtonColor(type) {
        return this.currentEditedButtons?.clusters?.[type]?.styles?.backgroundColor;
    }

    getButtonTextColor(type) {
        return this.currentEditedButtons?.clusters?.[type]?.styles?.color;
    }

    getButtonRadius(type) {
        return this.currentEditedButtons?.clusters?.[type]?.styles?.borderRadius;
    }

    getButtonPadding(type) {
        const padding = this.currentEditedButtons?.clusters?.[type]?.styles?.padding;
        if (!padding) return '12px 24px';
        return `${padding.top} ${padding.right}`;
    }

    getButtonBorderColor(type) {
        return this.currentEditedButtons?.clusters?.[type]?.styles?.borderColor;
    }

    hexToRgbColor(hex) {
        if (hex.startsWith('rgb')) return hex;
        
        // Простая конвертация hex в формат для color input
        if (hex.startsWith('#')) {
            return hex;
        }
        
        // Если это не hex, пытаемся преобразовать
        if (hex.includes('rgb')) {
            const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                return `#${((1 << 24) + (parseInt(match[1]) << 16) + (parseInt(match[2]) << 8) + parseInt(match[3])).toString(16).slice(1)}`;
            }
        }
        
        return '#007bff';
    }

    switchEditorTab(tabId) {
        // Обновляем активные табы
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.editor-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
        const contentElement = document.getElementById(`editor${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
        
        if (tabElement) tabElement.classList.add('active');
        if (contentElement) contentElement.classList.add('active');
        
        // При переключении на предпросмотр обновляем его
        if (tabId === 'preview') {
            this.updateLivePreview();
        }
    }

    switchPreviewDeviceEditor(device) {
        const preview = document.getElementById('livePreview');
        if (!preview) return;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.preview-device').forEach(btn => {
            btn.classList.remove('active');
        });
        
        event.target.closest('.preview-device').classList.add('active');
        
        // Обновляем размеры предпросмотра
        preview.style.maxWidth = device === 'desktop' ? '100%' : 
                                device === 'tablet' ? '768px' : '375px';
        preview.style.margin = device === 'desktop' ? '0' : '0 auto';
    }

    applyEditorChanges() {
        if (!this.currentAnalysis) {
            this.showMessage('Нет данных для редактирования', 'error');
            return;
        }
        
        // Создаем объединенную дизайн-систему с изменениями
        this.editedDesignSystem = {
            ...this.currentAnalysis.data,
            colors: this.currentEditedColors,
            typography: this.getEditedTypography(),
            buttons: this.currentEditedButtons,
            metadata: {
                ...this.currentAnalysis.data.metadata,
                edited: true,
                editTimestamp: new Date().toISOString(),
                editorChanges: {
                    colorsChanged: true,
                    typographyChanged: true,
                    buttonsChanged: true
                }
            }
        };
        
        // Показываем сообщение
        this.showMessage('Изменения применены! Теперь можно сгенерировать сайт.', 'success');
        
        // Переключаем на вкладку синтеза
        document.getElementById('synthesisSection').scrollIntoView({ behavior: 'smooth' });
        
        // Обновляем кнопку генерации
        document.getElementById('generateSiteBtn').textContent = 'Сгенерировать сайт с изменениями';
    }

    getEditedTypography() {
        const bodyFont = document.getElementById('bodyFont').value;
        const headingFont = document.getElementById('headingFont').value;
        const baseSize = parseInt(document.getElementById('baseSize').value);
        const headingScale = parseInt(document.getElementById('headingScale').value) / 100;
        
        return {
            total: 1,
            styles: [{
                tag: 'body',
                fontFamily: bodyFont,
                fontSize: `${baseSize}px`,
                fontWeight: 'normal',
                lineHeight: '1.5'
            }, {
                tag: 'h1',
                fontFamily: headingFont,
                fontSize: `${Math.round(baseSize * 2.5 * headingScale)}px`,
                fontWeight: 'bold',
                lineHeight: '1.2'
            }, {
                tag: 'h2',
                fontFamily: headingFont,
                fontSize: `${Math.round(baseSize * 2.0 * headingScale)}px`,
                fontWeight: '600',
                lineHeight: '1.3'
            }, {
                tag: 'p',
                fontFamily: bodyFont,
                fontSize: `${baseSize}px`,
                fontWeight: 'normal',
                lineHeight: '1.5'
            }]
        };
    }

    resetEditorChanges() {
        if (confirm('Вы уверены, что хотите сбросить все изменения к исходным значениям?')) {
            this.currentEditedColors = JSON.parse(JSON.stringify(this.currentAnalysis.data.colors));
            this.currentEditedTypography = JSON.parse(JSON.stringify(this.currentAnalysis.data.typography));
            this.currentEditedButtons = JSON.parse(JSON.stringify(this.currentAnalysis.data.buttons));
            
            this.renderColorEditor();
            this.renderTypographyEditor();
            this.renderButtonsEditor();
            this.updateLivePreview();
            
            this.showMessage('Изменения сброшены к исходным значениям', 'success');
        }
    }

    openEditor() {
        if (!this.currentAnalysis) {
            this.showMessage('Сначала выполните анализ сайта', 'error');
            return;
        }
        
        this.setupEditor(this.currentAnalysis.data);
        
        // Показываем секцию редактора
        const editorSection = document.getElementById('editorSection');
        editorSection.style.display = 'block';
        editorSection.scrollIntoView({ behavior: 'smooth' });
        
        this.showMessage('Редактор дизайн-системы открыт', 'info');
    }

    exportEditedDesignSystem() {
        if (!this.editedDesignSystem) {
            this.showMessage('Нет отредактированной дизайн-системы для экспорта', 'error');
            return;
        }
        
        this.exportDesignSystem(this.editedDesignSystem);
    }

    // ====== ПОКАЗ ПРОЦЕССА ОБЪЕДИНЕНИЯ ======

    showMergeProcess() {
        if (!this.mergeProcess || !this.mergeProcess.length) return;
        
        const processContainer = document.getElementById('mergeProcess');
        if (!processContainer) return;
        
        let html = '<h3>Процесс объединения:</h3><div class="merge-steps">';
        
        this.mergeProcess.forEach((step, index) => {
            html += `
                <div class="merge-step">
                    <div class="step-header">
                        <span class="step-number">${index + 1}</span>
                        <span class="step-title">${step.step}</span>
                        <span class="step-time">${new Date(step.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="step-details">
                        ${this.formatMergeDetails(step.details)}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        processContainer.innerHTML = html;
        processContainer.style.display = 'block';
    }

    formatMergeDetails(details) {
        if (!details) return '';
        
        let html = '';
        Object.entries(details).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                html += `<div class="detail-item"><strong>${key}:</strong> ${value.join(', ')}</div>`;
            } else if (typeof value === 'object') {
                html += `<div class="detail-item"><strong>${key}:</strong> ${JSON.stringify(value)}</div>`;
            } else {
                html += `<div class="detail-item"><strong>${key}:</strong> ${value}</div>`;
            }
        });
        
        return html;
    }

    // ====== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ======

    addUrlInput() {
        const container = document.getElementById('multiUrlInputs');
        const newInput = document.createElement('div');
        newInput.className = 'url-input-row';
        newInput.innerHTML = `
            <div class="input-group">
                <input type="url" class="multi-url-input url-input" placeholder="https://example.com" required>
                <button type="button" class="btn-remove-url">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        
        container.appendChild(newInput);
        
        // Добавляем обработчик удаления
        newInput.querySelector('.btn-remove-url').addEventListener('click', () => {
            container.removeChild(newInput);
        });
    }

    async loadStrategies() {
        try {
            const response = await fetch('/api/strategies');
            const data = await response.json();
            
            if (data.success) {
                const select = document.getElementById('strategySelect');
                if (select) {
                    select.innerHTML = data.strategies.map(strategy => `
                        <option value="${strategy.id}">${strategy.name} - ${strategy.description}</option>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading strategies:', error);
        }
    }

    generateRandomPalette() {
        const colors = [
            { hex: '#1e40af', role: 'primary' },
            { hex: '#3b82f6', role: 'secondary' },
            { hex: '#ef4444', role: 'accent' },
            { hex: '#f8fafc', role: 'background' },
            { hex: '#1f2937', role: 'text' }
        ];
        return colors;
    }

    getButtonTypeName(type) {
        const names = {
            primary: 'Основная кнопка',
            secondary: 'Вторичная кнопка',
            outline: 'Контурная кнопка',
            text: 'Текстовая кнопка',
            danger: 'Опасная кнопка',
            success: 'Успешная кнопка',
            warning: 'Предупреждающая кнопка',
            info: 'Информационная кнопка',
            icon: 'Кнопка с иконкой'
        };
        return names[type] || type;
    }

    // НОВЫЙ МЕТОД: Показ сообщений
    showMessage(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <span class="material-symbols-outlined">
                ${type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(messageDiv);
        
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
        this.renderButtons(data.buttons);
        this.renderDesignTokens(data);
        
        // Автоматически генерируем сайт после анализа
        this.generateSite();
        
        // Перезагружаем историю
        this.loadHistory();

        // Добавляем кнопку для открытия редактора
        const actionsSection = document.querySelector('.actions-section');
        if (actionsSection && !actionsSection.querySelector('#openEditorBtn')) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-secondary';
            editBtn.id = 'openEditorBtn';
            editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span>Редактировать дизайн-систему';
            actionsSection.appendChild(editBtn);
            
            editBtn.addEventListener('click', () => {
                this.openEditor();
            });
        }
        
        // Добавляем кнопку экспорта отредактированной системы
        if (actionsSection && !actionsSection.querySelector('#exportEditedBtn')) {
            const exportEditBtn = document.createElement('button');
            exportEditBtn.className = 'btn-secondary';
            exportEditBtn.id = 'exportEditedBtn';
            exportEditBtn.innerHTML = '<span class="material-symbols-outlined">download</span>Экспорт отредактированной';
            actionsSection.appendChild(exportEditBtn);
            
            exportEditBtn.addEventListener('click', () => {
                this.exportEditedDesignSystem();
            });
        }
        
        // Если это кросс-анализ, показываем процесс объединения
        if (data.metadata?.isCrossReference) {
            this.showMergeProcess();
        }
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
        
        // Функция для нормализации названия шрифта
        const normalizeFontForCSS = (fontFamily) => {
            if (!fontFamily) return 'inherit';
            
            // Берем первый шрифт из списка
            const firstFont = fontFamily.split(',')[0].trim();
            
            // Убираем кавычки если есть
            const cleanFont = firstFont.replace(/['"]/g, '');
            
            // Если шрифт содержит пробелы, добавляем кавычки
            if (cleanFont.includes(' ')) {
                return `'${cleanFont}'`;
            }
            
            return cleanFont;
        };
        
        // Функция для отображения названия шрифта в тексте
        const displayFontName = (fontFamily) => {
            if (!fontFamily) return 'inherit';
            const firstFont = fontFamily.split(',')[0].trim();
            return firstFont.replace(/['"]/g, '');
        };
        
        let html = `
            <div class="typography-summary">
                <p>Найдено <strong>${typography.total}</strong> уникальных стилей текста</p>
            </div>
            <div class="typography-grid">
        `;
        
        // Группируем по тегам для лучшего представления
        const groupedByTag = {};
        typography.styles.forEach(style => {
            const tag = style.tag?.toLowerCase() || 'unknown';
            if (!groupedByTag[tag]) groupedByTag[tag] = [];
            groupedByTag[tag].push(style);
        });
        
        // Создаем карточки только для нужных тегов
        const neededTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button'];
        
        neededTags.forEach(tag => {
            const styles = groupedByTag[tag];
            if (!styles || styles.length === 0) return;
            
            html += `
                <div class="typography-card">
                    <div class="typography-card-header">
                        <h4>${tag.toUpperCase()}</h4>
                        <span class="typography-count">${styles.length} стилей</span>
                    </div>
            `;
            
            // Показываем до 3 стилей для каждого тега
            styles.slice(0, 3).forEach(style => {
                const fontSizeNum = parseFloat(style.fontSize);
                const fontSizeDisplay = fontSizeNum > 10 ? fontSizeNum + 'px' : style.fontSize;
                const normalizedFont = normalizeFontForCSS(style.fontFamily);
                const displayFont = displayFontName(style.fontFamily);
                
                html += `
                    <div class="typography-sample-card">
                        <div class="typography-preview" style="
                            font-size: ${style.fontSize};
                            font-family: ${normalizedFont}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            font-weight: ${style.fontWeight};
                            line-height: ${style.lineHeight};
                            color: ${style.color};
                            letter-spacing: ${style.letterSpacing || 'normal'};
                            text-transform: ${style.textTransform || 'none'};
                            padding: 12px;
                            border-radius: 6px;
                            background: #f8f9fa;
                            margin-bottom: 8px;
                        ">
                            ${style.example || 'Пример текста'}
                        </div>
                        <div class="typography-properties">
                            <div class="property">
                                <span class="property-label">Шрифт:</span>
                                <span class="property-value">${displayFont}</span>
                            </div>
                            <div class="property">
                                <span class="property-label">Размер:</span>
                                <span class="property-value">${fontSizeDisplay}</span>
                            </div>
                            <div class="property">
                                <span class="property-label">Вес:</span>
                                <span class="property-value">${style.fontWeight}</span>
                            </div>
                            <div class="property">
                                <span class="property-label">Межстрочный:</span>
                                <span class="property-value">${style.lineHeight}</span>
                            </div>
                            ${style.letterSpacing && style.letterSpacing !== 'normal' ? `
                            <div class="property">
                                <span class="property-label">Межбуквенный:</span>
                                <span class="property-value">${style.letterSpacing}</span>
                            </div>` : ''}
                            
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        html += `</div>`;
        container.innerHTML = html;
    }

    renderButtons(buttons) {
        const container = document.getElementById('buttonsSection');
        if (!container) {
            // Создаем секцию для кнопок, если её нет
            const resultsContent = document.getElementById('resultsContent');
            if (resultsContent) {
                const buttonSection = document.createElement('div');
                buttonSection.className = 'result-section';
                buttonSection.innerHTML = `

                `;
                resultsContent.appendChild(buttonSection);
            } else {
                return;
            }
        }
        
        const buttonsContainer = document.getElementById('buttonsSection');
        if (!buttonsContainer) return;
        
        buttonsContainer.innerHTML = '';
        
        if (!buttons || !buttons.found || buttons.total === 0) {
            buttonsContainer.innerHTML = `
                <div class="no-buttons-message">
                    <span class="material-symbols-outlined">smart_button</span>
                    <p>Кнопки не найдены на странице</p>
                    <p class="empty-subtitle">Будут использованы стандартные стили кнопок</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="buttons-summary">
                <p>Найдено <strong>${buttons.total}</strong> кнопок и интерактивных элементов</p>
            </div>
            <div class="buttons-grid">
        `;
        
        // Отображаем все найденные типы кнопок
        Object.entries(buttons.clusters).forEach(([type, button]) => {
            if (button) {
                const styles = button.styles;
                const contrastColor = this.getContrastColor(styles.backgroundColor);
                
                html += `
                <div class="button-card" data-type="${type}">
                    <div class="button-card-header">
                        <h4>${this.getButtonTypeName(type)}</h4>
                        <span class="button-type-badge">${type}</span>
                    </div>
                    <div class="button-preview" style="
                        background: ${styles.backgroundColor || 'transparent'};
                        color: ${styles.color || contrastColor};
                        border: ${styles.borderWidth} ${styles.borderStyle} ${styles.borderColor || 'transparent'};
                        border-radius: ${styles.borderRadius || '0'};
                        padding: ${styles.padding?.top || '0'} ${styles.padding?.right || '0'} ${styles.padding?.bottom || '0'} ${styles.padding?.left || '0'};
                        font-family: ${styles.fontFamily || 'inherit'};
                        font-size: ${styles.fontSize || '1rem'};
                        font-weight: ${styles.fontWeight || 'normal'};
                        text-align: center;
                        min-height: 60px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 1rem 0;
                        box-shadow: ${styles.boxShadow || 'none'};
                    ">
                        ${button.text || this.getButtonTypeName(type)}
                    </div>
                    <div class="button-details">
                        <div class="button-detail">
                            <span class="detail-label">Текст:</span>
                            <span class="detail-value">${button.text || '—'}</span>
                        </div>
                        <div class="button-detail">
                            <span class="detail-label">Цвет фона:</span>
                            <span class="detail-value color-value" style="color: ${styles.backgroundColor}">
                                ${styles.backgroundColor || '—'}
                            </span>
                        </div>
                        <div class="button-detail">
                            <span class="detail-label">Цвет текста:</span>
                            <span class="detail-value color-value" style="color: ${styles.color}">
                                ${styles.color || '—'}
                            </span>
                        </div>
                        <div class="button-detail">
                            <span class="detail-label">Скругление:</span>
                            <span class="detail-value">${styles.borderRadius || '0'}</span>
                        </div>
                        <div class="button-detail">
                            <span class="detail-label">Шрифт:</span>
                            <span class="detail-value">${styles.fontFamily || '—'}</span>
                        </div>
                        <div class="button-detail">
                            <span class="detail-label">Размер:</span>
                            <span class="detail-value">${Math.round(button.width)} × ${Math.round(button.height)}px</span>
                        </div>
                    </div>
                </div>
                `;
            }
        });
        
        html += `</div>`;
        
        // Показываем примеры использования
        if (buttons.samples && buttons.samples.length > 0) {
            html += `
            <div class="button-samples">
                <h4>Примеры найденных кнопок</h4>
                <div class="samples-grid">
            `;
            
            buttons.samples.forEach((sample, index) => {
                if (index < 5) { // Ограничиваем количество
                    html += `
                    <div class="sample-item">
                        <div class="sample-preview" style="
                            background: ${sample.styles.backgroundColor || 'transparent'};
                            color: ${sample.styles.color || '#000'};
                            border: ${sample.styles.borderWidth} ${sample.styles.borderStyle} ${sample.styles.borderColor || 'transparent'};
                            border-radius: ${sample.styles.borderRadius || '0'};
                            padding: 8px 12px;
                            font-size: 0.9rem;
                        ">
                            ${sample.text || 'Кнопка'}
                        </div>
                        <div class="sample-info">
                            <div>${sample.tagName}</div>
                            <div class="sample-classes">${sample.className.substring(0, 30)}</div>
                        </div>
                    </div>
                    `;
                }
            });
            
            html += `
                </div>
            </div>
            `;
        }
        
        buttonsContainer.innerHTML = html;
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
        const groups = {};
        const neededTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button'];
        
        // Инициализируем группы
        neededTags.forEach(tag => {
            groups[tag] = [];
        });
        
        // Распределяем стили по группам
        styles.forEach(style => {
            const tag = style.tag?.toLowerCase();
            if (neededTags.includes(tag) && groups[tag]) {
                groups[tag].push(style);
            }
        });
        
        return groups;
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
        
        // Группируем стили по тегам и находим наиболее частый шрифт
        const groupedByTag = {};
        const fontFamilyCount = {};
        
        styles.forEach(style => {
            const tag = style.tag?.toLowerCase() || 'unknown';
            if (!groupedByTag[tag]) groupedByTag[tag] = [];
            groupedByTag[tag].push(style);
            
            // Подсчитываем частоту шрифтов
            if (style.fontFamily) {
                const font = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                fontFamilyCount[font] = (fontFamilyCount[font] || 0) + 1;
            }
        });
        
        // Находим наиболее частый шрифт
        let mostCommonFont = 'inherit';
        let maxCount = 0;
        Object.entries(fontFamilyCount).forEach(([font, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommonFont = font;
            }
        });
        
        // Определяем базовые стили из тега p или первого найденного
        const bodyStyles = groupedByTag['p']?.[0] || 
                          groupedByTag['div']?.[0] || 
                          groupedByTag['span']?.[0] || 
                          styles[0];
        
        // Базовые переменные
        let css = ':root {\n';
        css += `  --font-family-body: "${mostCommonFont}";\n`;
        
        css += '\n';
        
        // Переменные для конкретных тегов
        const neededTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button'];
        
        neededTags.forEach(tag => {
            const tagStyles = groupedByTag[tag];
            if (!tagStyles || tagStyles.length === 0) return;
            
            const style = tagStyles[0]; // Берем первый стиль для этого тега
            let fontFamily = style.fontFamily;
            if (fontFamily) {
                fontFamily = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            }
            
            css += `  /* ${tag.toUpperCase()} */\n`;
            css += `  --${tag}-font-family: "${fontFamily || mostCommonFont}";\n`;
            css += `  --${tag}-font-size: ${style.fontSize || 'inherit'};\n`;
            css += `  --${tag}-font-weight: ${style.fontWeight || 'inherit'};\n`;
            css += `  --${tag}-line-height: ${style.lineHeight || 'inherit'};\n`;
            if (style.letterSpacing && style.letterSpacing !== 'normal') {
                css += `  --${tag}-letter-spacing: ${style.letterSpacing};\n`;
            }
            if (style.color) {
                css += `  --${tag}-color: ${style.color};\n`;
            }
            css += '\n';
        });
        
        css += '}\n';
        
        
        return css;
    }

    // Вспомогательный метод для нормализации названия шрифта
normalizeFontFamily(fontFamily) {
    if (!fontFamily) return 'inherit';
    
    // Берем первый шрифт из списка
    const firstFont = fontFamily.split(',')[0].trim();
    
    // Убираем кавычки если есть
    return firstFont.replace(/['"]/g, '');
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
    
    fetch('/api/health')
        .then(response => response.json())
        .then(data => console.log('Server health:', data))
        .catch(error => console.error('Health check failed:', error));
});
