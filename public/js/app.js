class DesignSystemAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.currentAnalysis = null;
        this.currentGeneratedSite = null;
        this.editorSettings = {
        colors: {},
        typography: {},
        buttons: {}
    };
    this.googleFontsList = [
        'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
        'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact',
        // Google Fonts
        'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Raleway',
        'Poppins', 'Nunito', 'Inter', 'Manrope', 'Rubik'
    ];
    this.initExportButton();
    this.debounceTimer = null;
    this.sourceAnalyses = [];
    }

    initializeEventListeners() {
        const strategySelect = document.getElementById('strategySelect');
if (strategySelect) {
    // Очищаем существующие опции
    strategySelect.innerHTML = '';
    
    // Добавляем опции стратегий
    const strategies = [
        { value: 'bestPractices', label: 'Лучшие практики' },
        { value: 'commonPatterns', label: 'Общие паттерны' },
        { value: 'userPriorities', label: 'Пользовательские приоритеты' },
        { value: 'hybrid', label: 'Гибридная' }
    ];
    
    strategies.forEach(strategy => {
        const option = document.createElement('option');
        option.value = strategy.value;
        option.textContent = strategy.label;
        strategySelect.appendChild(option);
    });
}
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

        document.getElementById('strategySelect').addEventListener('change', () => {
            this.toggleStrategyPanels();
        });

        document.getElementById('strategySelect').addEventListener('change', () => {
            this.toggleStrategyPanels();
        });

        // Инициализация синтеза
        this.initSynthesis();
        
        // Загрузка истории при старте
        this.loadHistory();

        // Добавим в конструктор DesignSystemAnalyzer
        this.multiUrls = [''];

        // Добавим в initializeEventListeners() после других обработчиков
        this.initializeMultiSiteListeners();
    }

    // Новый метод для инициализации мультисайтовых обработчиков
    initializeMultiSiteListeners() {
        // Кнопка добавления URL
        document.getElementById('addUrlBtn')?.addEventListener('click', () => {
            this.addUrlInput();
        });
        
        // Кнопка анализа нескольких сайтов
        document.getElementById('analyzeMultipleBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.analyzeMultipleWebsites();
        });
        
        // Удаление URL
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-url')) {
                const row = e.target.closest('.input-group');
                if (row && document.querySelectorAll('.input-group').length > 1) {
                    row.remove();
                }
            }
        });
        
        // Инициализируем первый input
        this.addUrlInput();
    }

    initEditor(data) {
        // Цвета
        this.editorSettings.colors = {};
        data.colors.palette.forEach(color => {
            if (color.role) {
                this.editorSettings.colors[color.role] = {
                    hex: color.hex,
                    alternatives: this.findAlternativeColorsForRole(data.colors.palette, color.role)
                };
            }
        });

        // Типографика
        this.editorSettings.typography = {};
        const typographyStyles = data.typography.styles || [];
        ['body', 'h1', 'h2', 'h3', 'p', 'a', 'button'].forEach(tag => {
            const style = typographyStyles.find(s => s.tag === tag) || {};
            this.editorSettings.typography[tag] = {
                fontFamily: style.fontFamily || 'Arial',
                fontSize: style.fontSize || (tag === 'h1' ? '32px' : tag === 'h2' ? '24px' : '16px'),
                fontWeight: style.fontWeight || '400',
                lineHeight: style.lineHeight || '1.5'
            };
        });

        // Кнопки — собираем все варианты из sourceAnalyses
        this.editorSettings.buttons = {};
        if (this.sourceAnalyses && this.sourceAnalyses.length > 0) {
            const variantsByType = {};

            this.sourceAnalyses.forEach((source, idx) => {
                const domain = source.domain || `Сайт ${idx+1}`;
                const buttonsData = source.data.buttons;
                if (!buttonsData) return;

                // Добавляем samples
                if (buttonsData.samples && buttonsData.samples.length) {
                    buttonsData.samples.forEach(btn => {
                        const type = btn.type || 'unknown';
                        if (!variantsByType[type]) variantsByType[type] = [];
                        variantsByType[type].push({
                            ...btn,
                            source: domain,
                            sourceIdx: idx,
                            isCustom: false
                        });
                    });
                }

                // Добавляем clusters (если не дублируются)
                if (buttonsData.clusters) {
                    Object.entries(buttonsData.clusters).forEach(([type, btn]) => {
                        if (!btn) return;
                        const exists = variantsByType[type]?.some(v => 
                            v.text === btn.text && 
                            v.styles?.backgroundColor === btn.styles?.backgroundColor
                        );
                        if (!exists) {
                            if (!variantsByType[type]) variantsByType[type] = [];
                            variantsByType[type].push({
                                ...btn,
                                source: domain,
                                sourceIdx: idx,
                                isCustom: false
                            });
                        }
                    });
                }
            });

            // Добавляем кастомный вариант для каждого типа
            Object.keys(variantsByType).forEach(type => {
                variantsByType[type].push({
                    type: type,
                    text: 'Новая кнопка',
                    styles: {
                        backgroundColor: '#007bff',
                        color: '#ffffff',
                        borderWidth: '0',
                        borderStyle: 'solid',
                        borderColor: 'transparent',
                        borderRadius: '6px',
                        padding: { top: '12px', right: '24px', bottom: '12px', left: '24px' },
                        fontFamily: 'Arial',
                        fontSize: '16px',
                        fontWeight: '500',
                        lineHeight: '1.5'
                    },
                    source: 'Кастомная',
                    isCustom: true
                });

                this.editorSettings.buttons[type] = {
                    selectedIndex: 0,
                    variants: variantsByType[type]
                };
            });
        } else {
            // fallback, если нет sourceAnalyses
            if (data.buttons && data.buttons.clusters) {
                Object.entries(data.buttons.clusters).forEach(([type, btn]) => {
                    if (btn) {
                        this.editorSettings.buttons[type] = {
                            selectedIndex: 0,
                            variants: [btn]
                        };
                    }
                });
            }
        }

        this.renderEditor();
        document.getElementById('editorSection').style.display = 'block';
        this.initTabs();
    }


initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            // Убираем active со всех кнопок и панелей
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
        });
    });
}

findAlternativeColorsForRole(palette, role) {
    return palette.filter(c => c.role !== role).map(c => c.hex);
}

renderEditor() {
    this.renderColorEditor();
    this.renderTypographyEditor();
    this.renderButtonsEditor();
    this.attachEditorEvents();
}

renderColorEditor() {
    const container = document.getElementById('colorEditor');
    if (!container) return;
    let html = '';
    Object.entries(this.editorSettings.colors).forEach(([role, data]) => {
        const roleName = this.getRoleName(role);
        const alternatives = data.alternatives || [];
        const options = alternatives.map(alt => `<option value="${alt}" ${alt === data.hex ? 'selected' : ''}>${alt}</option>`).join('');
        html += `
            <div class="color-editor-item" data-role="${role}">
                <div class="color-preview" style="background: ${data.hex}; color: ${this.getContrastColor(data.hex)};">${data.hex}</div>
                <div class="color-role">${roleName}</div>
                <div class="color-controls">
                    <input type="color" class="color-picker" value="${data.hex}" data-role="${role}" title="Выбрать цвет">
                    <select class="color-alternative" data-role="${role}">
                        <option value="">Палитра</option>
                        ${options}
                    </select>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    this.attachColorEvents();
}

attachColorEvents() {
    document.querySelectorAll('.color-picker').forEach(input => {
        input.addEventListener('input', (e) => {
            const role = e.target.dataset.role;
            const newColor = e.target.value;
            this.editorSettings.colors[role].hex = newColor;
            this.updateColorPreview(role, newColor);
            this.markAsDirty();
        });
    });
    document.querySelectorAll('.color-alternative').forEach(select => {
        select.addEventListener('change', (e) => {
            const role = e.target.dataset.role;
            const newColor = e.target.value;
            if (newColor) {
                this.editorSettings.colors[role].hex = newColor;
                const picker = document.querySelector(`.color-picker[data-role="${role}"]`);
                if (picker) picker.value = newColor;
                this.updateColorPreview(role, newColor);
                this.markAsDirty();
            }
        });
    });
}

attachTypographyEvents() {
    document.querySelectorAll('.font-family, .font-size, .font-weight, .line-height').forEach(input => {
        input.addEventListener('input', (e) => {
            const tag = e.target.dataset.tag;
            const prop = e.target.classList.contains('font-family') ? 'fontFamily' :
                        e.target.classList.contains('font-size') ? 'fontSize' :
                        e.target.classList.contains('font-weight') ? 'fontWeight' : 'lineHeight';
            this.editorSettings.typography[tag][prop] = e.target.value;
            this.markAsDirty();
        });
    });
}

markAsDirty() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    // ничего не делаем, ждём кнопку "Применить"
}

initApplyButton() {
    const applyBtn = document.getElementById('applyChangesBtn');
    if (applyBtn) {
        applyBtn.style.display = 'inline-flex';
        applyBtn.addEventListener('click', () => {
            this.regenerateSite(); // без debounce, сразу
        });
    }
}

renderTypographyEditor() {
    const container = document.getElementById('typographyEditor');
    if (!container) return;

    // Группируем теги
    const groups = {
        'Заголовки': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        'Текст': ['body', 'p'],
        'Ссылки': ['a'],
        'Кнопки': ['button']
    };

    let html = '';
    Object.entries(groups).forEach(([groupName, tags]) => {
        html += `<div class="typography-group"><h4>${groupName}</h4>`;
        tags.forEach(tag => {
            const settings = this.editorSettings.typography[tag] || {
                fontFamily: 'Arial',
                fontSize: '16px',
                fontWeight: '400',
                lineHeight: '1.5'
            };
            const fontOptions = this.googleFontsList.map(f => `<option value="${f}" ${settings.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('');
            html += `
                <div class="typography-editor-item" data-tag="${tag}">
                    <div class="tag">${tag.toUpperCase()}</div>
                    <div class="controls">
                        <div class="control-group">
                            <label>Шрифт</label>
                            <select class="font-family" data-tag="${tag}">
                                ${fontOptions}
                            </select>
                        </div>
                        <div class="control-group">
                            <label>Размер</label>
                            <input type="text" class="font-size" value="${settings.fontSize}" data-tag="${tag}" placeholder="16px">
                        </div>
                        <div class="control-group">
                            <label>Вес</label>
                            <input type="text" class="font-weight" value="${settings.fontWeight}" data-tag="${tag}" placeholder="400">
                        </div>
                        <div class="control-group">
                            <label>Высота строки</label>
                            <input type="text" class="line-height" value="${settings.lineHeight}" data-tag="${tag}" placeholder="1.5">
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });
    container.innerHTML = html;
    this.attachTypographyEvents();
}

renderButtonsEditor() {
    const container = document.getElementById('buttonsEditor');
    if (!container) return;
    let html = '';

    Object.entries(this.editorSettings.buttons).forEach(([type, data]) => {
        const variants = data.variants || [];
        if (variants.length === 0) return;
        const selectedIdx = data.selectedIndex;
        const selectedBtn = variants[selectedIdx] || variants[0];

        // Строим строку стилей для предпросмотра
        const styles = selectedBtn.styles || {};
        const styleString = `
            background: ${styles.backgroundColor || 'transparent'};
            color: ${styles.color || '#000'};
            border: ${styles.borderWidth || '0'} ${styles.borderStyle || 'solid'} ${styles.borderColor || 'transparent'};
            border-radius: ${styles.borderRadius || '0'};
            padding: ${styles.padding?.top || '8px'} ${styles.padding?.right || '16px'} ${styles.padding?.bottom || '8px'} ${styles.padding?.left || '16px'};
            font-family: ${styles.fontFamily || 'inherit'};
            font-size: ${styles.fontSize || '1rem'};
            font-weight: ${styles.fontWeight || 'normal'};
            line-height: ${styles.lineHeight || '1.5'};
        `;

        // Кнопки переключения вариантов
        const variantButtons = variants.map((v, idx) => {
            let label = v.source && !v.isCustom ? v.source.substring(0, 10) : 'Кастом';
            if (v.text && v.text.length > 8) label = v.text.substring(0, 8) + '…';
            else if (v.text) label = v.text;
            else label = `Вар. ${idx+1}`;
            return `<button class="variant-btn ${idx === selectedIdx ? 'active' : ''}" data-type="${type}" data-index="${idx}">${label}</button>`;
        }).join('');

        // Панель редактирования
        const bgHex = this.rgbOrHexToHex(styles.backgroundColor);
        const colorHex = this.rgbOrHexToHex(styles.color);
        const borderColorHex = this.rgbOrHexToHex(styles.borderColor);

        html += `
            <div class="buttons-editor-item" data-type="${type}">
                <div class="button-type">${this.getButtonTypeName(type)}</div>
                <div class="variants">
                    ${variantButtons}
                    <button class="variant-btn" data-type="${type}" data-index="new">+ Создать</button>
                </div>
                <div class="button-preview" style="${styleString}">${selectedBtn.text || 'Кнопка'}</div>
                <div class="button-editor-panel">
                    <h5>Настройки</h5>
                    <div class="editor-grid">
                        <div class="control-group">
                            <label>Текст</label>
                            <input type="text" class="btn-text" value="${selectedBtn.text || ''}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Цвет фона</label>
                            <input type="color" class="btn-bg" value="${bgHex}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Цвет текста</label>
                            <input type="color" class="btn-color" value="${colorHex}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Размер шрифта</label>
                            <input type="text" class="btn-font-size" value="${styles.fontSize || '16px'}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Вес шрифта</label>
                            <input type="text" class="btn-font-weight" value="${styles.fontWeight || '400'}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Радиус скругления</label>
                            <input type="text" class="btn-border-radius" value="${styles.borderRadius || '0'}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Ширина границы</label>
                            <input type="text" class="btn-border-width" value="${styles.borderWidth || '0'}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Стиль границы</label>
                            <select class="btn-border-style" data-type="${type}">
                                <option value="solid" ${styles.borderStyle === 'solid' ? 'selected' : ''}>Solid</option>
                                <option value="dashed" ${styles.borderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                                <option value="dotted" ${styles.borderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                                <option value="none" ${styles.borderStyle === 'none' ? 'selected' : ''}>None</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label>Цвет границы</label>
                            <input type="color" class="btn-border-color" value="${borderColorHex}" data-type="${type}">
                        </div>
                        <div class="control-group">
                            <label>Отступы (top right bottom left)</label>
                            <div style="display: flex; gap: 4px;">
                                <input type="text" class="btn-padding-top" placeholder="top" value="${styles.padding?.top || '0'}" data-type="${type}" style="width: 60px;">
                                <input type="text" class="btn-padding-right" placeholder="right" value="${styles.padding?.right || '0'}" data-type="${type}" style="width: 60px;">
                                <input type="text" class="btn-padding-bottom" placeholder="bottom" value="${styles.padding?.bottom || '0'}" data-type="${type}" style="width: 60px;">
                                <input type="text" class="btn-padding-left" placeholder="left" value="${styles.padding?.left || '0'}" data-type="${type}" style="width: 60px;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    this.attachButtonEvents();
}

// Вспомогательная функция rgb -> hex
rgbOrHexToHex(color) {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2,'0');
        const g = parseInt(match[2]).toString(16).padStart(2,'0');
        const b = parseInt(match[3]).toString(16).padStart(2,'0');
        return `#${r}${g}${b}`;
    }
    return '#000000';
}

// Обработчики для кнопок
attachButtonEvents() {
    const container = document.getElementById('buttonsEditor');
    if (!container) return;

    // Переключение вариантов
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('variant-btn')) {
            const type = e.target.dataset.type;
            const index = e.target.dataset.index;
            if (index === 'new') {
                this.createNewButtonVariant(type);
            } else {
                this.editorSettings.buttons[type].selectedIndex = parseInt(index);
                this.renderButtonsEditor();
                this.regenerateSite();
            }
        }
    });

    // Изменение полей
    container.addEventListener('input', (e) => {
        const target = e.target;
        if (target.matches('.btn-text, .btn-bg, .btn-color, .btn-font-size, .btn-font-weight, .btn-border-radius, .btn-border-width, .btn-border-style, .btn-border-color, .btn-padding-top, .btn-padding-right, .btn-padding-bottom, .btn-padding-left')) {
            const type = target.dataset.type;
            let prop = '';
            if (target.classList.contains('btn-text')) prop = 'text';
            else if (target.classList.contains('btn-bg')) prop = 'backgroundColor';
            else if (target.classList.contains('btn-color')) prop = 'color';
            else if (target.classList.contains('btn-font-size')) prop = 'fontSize';
            else if (target.classList.contains('btn-font-weight')) prop = 'fontWeight';
            else if (target.classList.contains('btn-border-radius')) prop = 'borderRadius';
            else if (target.classList.contains('btn-border-width')) prop = 'borderWidth';
            else if (target.classList.contains('btn-border-style')) prop = 'borderStyle';
            else if (target.classList.contains('btn-border-color')) prop = 'borderColor';
            else if (target.classList.contains('btn-padding-top')) prop = 'paddingTop';
            else if (target.classList.contains('btn-padding-right')) prop = 'paddingRight';
            else if (target.classList.contains('btn-padding-bottom')) prop = 'paddingBottom';
            else if (target.classList.contains('btn-padding-left')) prop = 'paddingLeft';

            if (prop) {
                this.updateButtonProperty(type, prop, target.value);
            }
        }
    });
}

// Создание нового кастомного варианта
createNewButtonVariant(type) {
    const newBtn = {
        type: type,
        text: 'Новая кнопка',
        styles: {
            backgroundColor: '#007bff',
            color: '#ffffff',
            borderWidth: '0',
            borderStyle: 'solid',
            borderColor: 'transparent',
            borderRadius: '6px',
            padding: { top: '12px', right: '24px', bottom: '12px', left: '24px' },
            fontFamily: 'Arial',
            fontSize: '16px',
            fontWeight: '500',
            lineHeight: '1.5'
        },
        source: 'Кастомная',
        isCustom: true
    };
    this.editorSettings.buttons[type].variants.push(newBtn);
    this.editorSettings.buttons[type].selectedIndex = this.editorSettings.buttons[type].variants.length - 1;
    this.renderButtonsEditor();
    this.regenerateSite();
}

// Обновление свойства выбранной кнопки
updateButtonProperty(type, prop, value) {
    const buttonData = this.editorSettings.buttons[type];
    const selected = buttonData.variants[buttonData.selectedIndex];
    
    // Если выбранный вариант не кастомный, создаём кастомный на его основе
    if (!selected.isCustom) {
        const newVariant = JSON.parse(JSON.stringify(selected));
        newVariant.isCustom = true;
        newVariant.source = 'Кастомная';
        buttonData.variants.push(newVariant);
        buttonData.selectedIndex = buttonData.variants.length - 1;
    }

    const current = buttonData.variants[buttonData.selectedIndex];
    
    if (prop.includes('padding')) {
        const side = prop.replace('padding', '').toLowerCase();
        if (!current.styles.padding) current.styles.padding = {};
        current.styles.padding[side] = value;
    } else if (prop === 'text') {
        current.text = value;
    } else {
        if (!current.styles) current.styles = {};
        current.styles[prop] = value;
    }

    this.renderButtonsEditor(); // обновить UI (чтобы предпросмотр и поля отобразили новые значения)
    this.regenerateSite();
}

attachEditorEvents() {
    // Цвета
    document.querySelectorAll('.color-picker').forEach(input => {
        input.addEventListener('input', (e) => {
            const role = e.target.dataset.role;
            const newColor = e.target.value;
            this.editorSettings.colors[role].hex = newColor;
            this.updateColorPreview(role, newColor);
            this.markAsDirty();
        });
    });
    document.querySelectorAll('.color-alternative').forEach(select => {
        select.addEventListener('change', (e) => {
            const role = e.target.dataset.role;
            const newColor = e.target.value;
            if (newColor) {
                this.editorSettings.colors[role].hex = newColor;
                const picker = document.querySelector(`.color-picker[data-role="${role}"]`);
                if (picker) picker.value = newColor;
                this.updateColorPreview(role, newColor);
                this.markAsDirty();
            }
        });
    });

    // Типографика
    document.querySelectorAll('.font-family, .font-size, .font-weight, .line-height').forEach(input => {
        input.addEventListener('input', (e) => {
            const tag = e.target.dataset.tag;
            const prop = e.target.classList.contains('font-family') ? 'fontFamily' :
                        e.target.classList.contains('font-size') ? 'fontSize' :
                        e.target.classList.contains('font-weight') ? 'fontWeight' : 'lineHeight';
            this.editorSettings.typography[tag][prop] = e.target.value;
            this.markAsDirty();
        });
    });

    // Кнопки: переключение вариантов
    document.querySelectorAll('.variant-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            const index = parseInt(e.target.dataset.index);
            this.editorSettings.buttons[type].selectedIndex = index;
            this.renderButtonsEditor(); // обновить секцию кнопок
            this.markAsDirty();
        });
    });
}

updateColorPreview(role, color) {
    const item = document.querySelector(`.color-editor-item[data-role="${role}"]`);
    if (item) {
        const preview = item.querySelector('.color-preview');
        preview.style.background = color;
        preview.style.color = this.getContrastColor(color);
        preview.textContent = color;
    }
}

regenerateSite() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
        if (!this.currentAnalysis) return;
        const modifiedData = this.buildModifiedDesignSystem();
        this.generateSiteWithData(modifiedData);
    }, 500); // задержка 500 мс
}

buildModifiedDesignSystem() {
    const original = this.currentAnalysis.data;
    const modified = JSON.parse(JSON.stringify(original));

    // Применяем изменения цветов
    Object.entries(this.editorSettings.colors).forEach(([role, data]) => {
        const colorInPalette = modified.colors.palette.find(c => c.role === role);
        if (colorInPalette) colorInPalette.hex = data.hex;
    });

    // Применяем изменения типографики
    modified.typography.styles = modified.typography.styles || [];
    Object.entries(this.editorSettings.typography).forEach(([tag, settings]) => {
        let style = modified.typography.styles.find(s => s.tag === tag);
        if (!style) {
            style = { tag };
            modified.typography.styles.push(style);
        }
        style.fontFamily = settings.fontFamily;
        style.fontSize = settings.fontSize;
        style.fontWeight = settings.fontWeight;
        style.lineHeight = settings.lineHeight;
    });

    // Применяем изменения кнопок
    if (modified.buttons && modified.buttons.clusters) {
        Object.entries(this.editorSettings.buttons).forEach(([type, data]) => {
            const selectedBtn = data.variants[data.selectedIndex];
            if (selectedBtn) {
                modified.buttons.clusters[type] = selectedBtn;
            }
        });
    }

    return modified;
}

generateSiteWithData(designSystem) {
    const templateType = document.getElementById('templateSelect')?.value || 'corporate';
    fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designSystem, templateType })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            this.showGeneratedSite(data.html, templateType);
        } else {
            this.showMessage('Ошибка генерации: ' + data.error, 'error');
        }
    })
    .catch(err => this.showMessage('Ошибка сети', 'error'));
}

initExportButton() {
    document.getElementById('exportDesignBtn').addEventListener('click', () => {
        this.exportCurrentDesign();
    });
}

exportCurrentDesign() {
    if (!this.currentAnalysis) return;
    const modifiedData = this.buildModifiedDesignSystem();
    const css = this.generateExportCSS(modifiedData);
    const json = JSON.stringify(modifiedData, null, 2);
    this.downloadFile('design-system.css', css);
    this.downloadFile('design-system.json', json);
    this.showMessage('Дизайн-система экспортирована', 'success');
}

// Метод для добавления поля ввода URL
addUrlInput() {
    const container = document.getElementById('multiUrlInputs');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'input-group';
    row.style.cssText = 'display: flex; gap: 1rem; margin-bottom: 1.5rem;';
    
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'multi-url-input url-input';
    input.placeholder = 'https://example.com';
    input.style.flex = '1';
    input.style.maxWidth = '818px';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-url';
    removeBtn.innerHTML = '<span class="material-symbols-outlined delete">delete</span>';
    removeBtn.style.cssText = 'padding: 1rem; background: #fed7d7; color: #c53030; border: none; border-radius: 6px; cursor: pointer;';
    removeBtn.style.height = '50px';
    removeBtn.style.minWidth = '40px';
    removeBtn.style.alignItems = 'center';
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    container.appendChild(row);
    
    // Фокус на новое поле
    input.focus();
}

// Метод для анализа нескольких сайтов
async analyzeMultipleWebsites() {
    const urlInputs = document.querySelectorAll('.multi-url-input');
    const urls = Array.from(urlInputs)
        .map(input => input.value.trim())
        .filter(url => url && this.isValidUrl(url));

    if (urls.length < 2) {
        this.showMessage('Для кросс-референсного анализа нужно минимум 2 сайта', 'error');
        return;
    }

    const strategy = document.getElementById('strategySelect')?.value || 'bestPractices';
    let preferences = {};

    // Собираем пользовательские настройки
    if (strategy === 'userPriorities') {
        preferences = {
            colors: parseInt(document.getElementById('colorSourceSelect')?.value) || 0,
            typography: parseInt(document.getElementById('typographySourceSelect')?.value) || 0,
            buttons: parseInt(document.getElementById('buttonsSourceSelect')?.value) || 0
        };
    } else if (strategy === 'hybrid') {
        preferences = { useCommonFor: [] };
        if (document.getElementById('hybridColors')?.checked) preferences.useCommonFor.push('colors');
        if (document.getElementById('hybridTypography')?.checked) preferences.useCommonFor.push('typography');
        if (document.getElementById('hybridButtons')?.checked) preferences.useCommonFor.push('buttons');
    }

    this.showMultiSiteLoadingState(urls);

    try {
        const response = await fetch('/api/analyze-multiple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls, strategy, preferences })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.details || 'Неизвестная ошибка');
        }

        if (data.success) {
            console.log('✅ Multi-site results received:', data.data);
            this.showMultiSiteResults(data.data, urls, strategy);
        } else {
            throw new Error(data.error || 'Анализ завершился неудачно');
        }

    } catch (error) {
        console.error('❌ Multi-site analysis error:', error);
        this.showError(error.message);
        // Разблокируем кнопку
        const analyzeBtn = document.getElementById('analyzeMultipleBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            const btnText = analyzeBtn.querySelector('.btn-text');
            const btnLoading = analyzeBtn.querySelector('.btn-loading');
            if (btnText) btnText.style.display = 'flex';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }
}

// Показ состояния загрузки для мультисайтового анализа
showMultiSiteLoadingState(urls) {
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('resultsContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('synthesisSection').style.display = 'none';
    
    // Обновляем информацию о загрузке
    document.getElementById('analysisUrl').textContent = `${urls.length} сайтов`;
    document.getElementById('analysisTime').textContent = new Date().toLocaleString('ru-RU');
    
    // Блокируем кнопку
    const analyzeBtn = document.getElementById('analyzeMultipleBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        const btnText = analyzeBtn.querySelector('.btn-text');
        const btnLoading = analyzeBtn.querySelector('.btn-loading');
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline';
    }
}

// Метод для показа/скрытия панелей
toggleStrategyPanels() {
    const strategy = document.getElementById('strategySelect').value;
    document.getElementById('userPrioritiesPanel').style.display = strategy === 'userPriorities' ? 'block' : 'none';
    document.getElementById('hybridPanel').style.display = strategy === 'hybrid' ? 'block' : 'none';

    // Если открыта панель userPriorities, нужно заполнить select списком сайтов
    if (strategy === 'userPriorities') {
        this.updatePrioritySources();
    }
}

// Заполнение выпадающих списков именами сайтов (вызывается перед показом панели)
updatePrioritySources() {
    const urlInputs = document.querySelectorAll('.multi-url-input');
    const urls = Array.from(urlInputs).map(input => input.value.trim()).filter(url => url);
    const selects = ['colorSourceSelect', 'typographySourceSelect', 'buttonsSourceSelect'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '';
        urls.forEach((url, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = `${idx + 1}. ${url}`;
            select.appendChild(option);
        });
    });
}

// Показ результатов мультисайтового анализа
showMultiSiteResults(data, urls, strategy) {
    if (data.sourceAnalyses) {
        this.sourceAnalyses = data.sourceAnalyses;
    }
    this.showResults(data, urls.join(', '));

    // Добавляем бейдж стратегии, если элемент существует
    const resultsHeader = document.querySelector('.results-header');
    if (resultsHeader) {
        // Удаляем старый бейдж, если был
        const oldBadge = resultsHeader.querySelector('.strategy-info-badge');
        if (oldBadge) oldBadge.remove();

        const strategyInfo = document.createElement('div');
        strategyInfo.className = 'strategy-info-badge';
        strategyInfo.textContent = `Стратегия: ${this.getStrategyName(strategy)}`;
        resultsHeader.appendChild(strategyInfo);
    }

    // Восстанавливаем кнопку
    const analyzeBtn = document.getElementById('analyzeMultipleBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = false;
        const btnText = analyzeBtn.querySelector('.btn-text');
        const btnLoading = analyzeBtn.querySelector('.btn-loading');
        if (btnText) btnText.style.display = 'flex';
        if (btnLoading) btnLoading.style.display = 'none';
    }
}

getRoleName(role) {
    const names = {
        primary: 'Основной',
        accent: 'Акцентный',
        background: 'Фон',
        text: 'Текст',
        surface: 'Поверхность',
        secondary: 'Вторичный',
        danger: 'Опасный',
        success: 'Успех',
        warning: 'Предупреждение',
        info: 'Информационный'
    };
    return names[role] || role;
}

getStrategyName(strategyId) {
    const names = {
        bestPractices: 'Лучшие практики',
        commonPatterns: 'Общие паттерны',
        userPriorities: 'Пользовательские приоритеты',
        hybrid: 'Гибридная',
        semanticMerge: 'Семантическое слияние',
        similarityBased: 'На основе схожести',
        weightedSemantic: 'Взвешенное семантическое',
        bestOfEach: 'Лучший из каждого'
    };
    return names[strategyId] || strategyId;
}

// Рендерим источники цветов для мультисайтового анализа
renderMultiSiteColorSources(data) {
    const colorItems = document.querySelectorAll('.color-item');
    colorItems.forEach((item, index) => {
        if (data.colors.palette[index]?.sources) {
            const sources = data.colors.palette[index].sources;
            const sourceInfo = document.createElement('div');
            sourceInfo.className = 'color-sources';
            sourceInfo.style.cssText = `
                margin-top: 0.5rem;
                padding-top: 0.5rem;
                border-top: 1px dashed #e2e8f0;
                font-size: 0.8rem;
                color: #718096;
            `;
            
            const sourceColors = sources.slice(0, 3).map(source => 
                `<span style="display: inline-block; width: 12px; height: 12px; background: ${source.hex}; border-radius: 2px; margin-right: 2px;" title="${source.hex}"></span>`
            ).join('');
            
            const extraCount = sources.length > 3 ? `+${sources.length - 3}` : '';
            sourceInfo.innerHTML = `
                <div style="margin-bottom: 0.25rem;">Источники:</div>
                <div>${sourceColors}${extraCount}</div>
            `;
            
            item.querySelector('.color-info')?.appendChild(sourceInfo);
        }
    });
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
        const loadingState = document.getElementById('loadingState');
        const resultsContent = document.getElementById('resultsContent');
        if (!loadingState || !resultsContent) {
            console.error('Critical DOM elements missing!');
            return;
        }
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

        this.initEditor(data);
        
        // Перезагружаем историю
        this.loadHistory();
    }

    showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;

    // Восстанавливаем обе кнопки (одиночный и множественный анализ)
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.querySelector('.btn-text').style.display = 'flex';
        analyzeBtn.querySelector('.btn-loading').style.display = 'none';
    }

    const multiBtn = document.getElementById('analyzeMultipleBtn');
    if (multiBtn) {
        multiBtn.disabled = false;
        const btnText = multiBtn.querySelector('.btn-text');
        const btnLoading = multiBtn.querySelector('.btn-loading');
        if (btnText) btnText.style.display = 'flex';
        if (btnLoading) btnLoading.style.display = 'none';
    }
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
    
    getButtonTypeName(type) {
    const names = {
        primary: 'Основная кнопка',
        secondary: 'Вторичная кнопка',
        outline: 'Контурная кнопка',
        text: 'Текстовая кнопка',
        danger: 'Кнопка опасного действия',
        success: 'Кнопка успеха',
        warning: 'Предупреждение',
        info: 'Информационная кнопка',
        icon: 'Кнопка-иконка'
    };
    return names[type] || type;
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
    
    // Проверка здоровья сервера
    fetch('/api/health')
        .then(response => response.json())
        .then(data => console.log('Server health:', data))
        .catch(error => console.error('Health check failed:', error));
});
