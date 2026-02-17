/**
 * LEMON BROWSER - Configuración de la Aplicación
 * ===============================================
 * Este archivo gestiona la interfaz de configuración incluyendo:
 * - Navegación entre secciones de configuración
 * - Toggles y controles de configuración
 *  - Color de acento personalizable
 * - Atajos de teclado personalizables
 * - Límite de sitios recientes
 */

document.addEventListener('DOMContentLoaded', async () => {
    const { ipcRenderer } = require('electron');

    // ========================================================================
    // NAVEGACIÓN ENTRE SECCIONES
    // ========================================================================

    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Desactivar todas las secciones
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // Activar la seleccionada
            item.classList.add('active');
            const sectionId = item.dataset.section;
            document.getElementById(sectionId).classList.add('active');
        });
    });

    // ========================================================================
    // GESTIÓN DE CONFIGURACIÓN PERSISTENTE
    // ========================================================================

    let globalSettings = await ipcRenderer.invoke('get-settings');

    /**
     * Guarda la configuración globalmente
     */
    function saveSettings() {
        ipcRenderer.send('save-settings', globalSettings);
    }

    // ========================================================================
    // INICIALIZACIÓN DE TOGGLES (INTERRUPTORES)
    // ========================================================================

    const toggles = document.querySelectorAll('input[type="checkbox"]');
    toggles.forEach(toggle => {
        const key = toggle.id;
        if (globalSettings[key] !== undefined) {
            toggle.checked = globalSettings[key] === true;
        }

        toggle.addEventListener('change', () => {
            globalSettings[key] = toggle.checked;
            saveSettings();

            // Notificaciones específicas según el toggle
            if (key === 'liquid-glass-toggle') {
                ipcRenderer.sendToHost('theme-changed', {
                    theme: 'liquid-glass',
                    enabled: toggle.checked
                });
            } else if (key === 'remember-pages-toggle') {
                ipcRenderer.sendToHost('remember-pages-changed', toggle.checked);
            } else if (key === 'adblock-toggle') {
                ipcRenderer.sendToHost('adblock-changed', toggle.checked);
            } else if (key === 'reduce-motion-toggle' || key === 'no-animations-toggle') {
                ipcRenderer.sendToHost('animation-settings-changed', {
                    reduceMotion: document.getElementById('reduce-motion-toggle').checked,
                    noAnimations: document.getElementById('no-animations-toggle').checked
                });
            }
        });
    });

    // ========================================================================
    // LÍMITE DE SITIOS RECIENTES
    // ========================================================================

    const recentLimitInput = document.getElementById('recent-sites-limit');
    if (recentLimitInput) {
        recentLimitInput.value = globalSettings['recent-sites-limit'] || '5';

        recentLimitInput.addEventListener('change', () => {
            const value = parseInt(recentLimitInput.value);
            if (value >= 0 && value <= 20) {
                globalSettings['recent-sites-limit'] = value.toString();
                saveSettings();
            } else {
                recentLimitInput.value = globalSettings['recent-sites-limit'] || '5';
            }
        });
    }

    // ========================================================================
    // CARPETA DE DATOS
    // ========================================================================

    const dataFolderBtn = document.getElementById('open-data-folder');
    if (dataFolderBtn) {
        dataFolderBtn.addEventListener('click', () => {
            ipcRenderer.send('open-data-folder');
        });
    }

    // ========================================================================
    // SELECTOR DE COLOR DE ACENTO
    // ========================================================================

    const colorPicker = document.getElementById('accent-color-picker');
    const colorPresets = document.querySelectorAll('.color-preset');

    const savedColor = globalSettings['accentColor'] || '#bb86fc';
    colorPicker.value = savedColor;
    applyAccentColor(savedColor);
    updateActivePreset(savedColor);

    // Evento de cambio de color manual
    colorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        applyAccentColor(color);
        globalSettings['accentColor'] = color;
        saveSettings();
        updateActivePreset(color);
    });

    // Eventos de presets de color
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            colorPicker.value = color;
            applyAccentColor(color);
            globalSettings['accentColor'] = color;
            saveSettings();
            updateActivePreset(color);
        });
    });

    /**
     * Aplica el color de acento a la interfaz
     * @param {string} color - Color en formato hexadecimal
     */
    function applyAccentColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);

        const rgb = hexToRgb(color);
        document.documentElement.style.setProperty('--accent-color-light', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
        document.documentElement.style.setProperty('--accent-color-medium', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
        document.documentElement.style.setProperty('--accent-color-dark', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);

        ipcRenderer.sendToHost('accent-color-changed', color);
    }

    /**
     * Actualiza el preset activo visualmente
     * @param {string} color - Color actual
     */
    function updateActivePreset(color) {
        colorPresets.forEach(p => {
            if (p.dataset.color.toLowerCase() === color.toLowerCase()) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
    }

    /**
     * Convierte un color hexadecimal a RGB
     * @param {string} hex - Color en formato hexadecimal
     * @returns {Object} Objeto con propiedades r, g, b
     */
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 187, g: 134, b: 252 };
    }

    // ========================================================================
    // ATAJOS DE TECLADO PERSONALIZABLES
    // ========================================================================

    const shortcutInputs = document.querySelectorAll('.shortcut-input');
    const resetShortcutsBtn = document.getElementById('reset-shortcuts-btn');

    const defaultShortcuts = {
        'shortcut-search': { key: 'ArrowUp', ctrl: true, shift: false, alt: false, label: 'Ctrl + ArrowUp' },
        'shortcut-close': { key: 'ArrowDown', ctrl: true, shift: false, alt: false, label: 'Ctrl + ArrowDown' },
        'shortcut-back': { key: 'ArrowLeft', ctrl: true, shift: false, alt: false, label: 'Ctrl + ArrowLeft' },
        'shortcut-forward': { key: 'ArrowRight', ctrl: true, shift: false, alt: false, label: 'Ctrl + ArrowRight' },
        'shortcut-tab-next': { key: 'ArrowRight', ctrl: false, shift: false, alt: true, label: 'Alt + ArrowRight' },
        'shortcut-tab-prev': { key: 'ArrowLeft', ctrl: false, shift: false, alt: true, label: 'Alt + ArrowLeft' },
        'shortcut-center-window': { key: 'ArrowUp', ctrl: false, shift: false, alt: true, label: 'Alt + ArrowUp' }
    };

    let shortcuts = globalSettings['browser-shortcuts'] || defaultShortcuts;

    /**
     * Actualiza la visualización de los atajos
     */
    function updateShortcutDisplay() {
        shortcutInputs.forEach(input => {
            const id = input.dataset.shortcut;
            if (shortcuts[id]) {
                input.innerText = shortcuts[id].label || 'Sin asignar';
            }
        });
    }

    updateShortcutDisplay();

    // Eventos para capturar nuevos atajos
    shortcutInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const id = input.dataset.shortcut;
            const key = e.key;
            const ctrl = e.ctrlKey;
            const shift = e.shiftKey;
            const alt = e.altKey;

            // Construir label legible
            let label = '';
            if (ctrl) label += 'Ctrl + ';
            if (shift) label += 'Shift + ';
            if (alt) label += 'Alt + ';
            label += key;

            shortcuts[id] = { key, ctrl, shift, alt, label };
            globalSettings['browser-shortcuts'] = shortcuts;
            saveSettings();
            input.innerText = shortcut.label;
            ipcRenderer.sendToHost('shortcuts-changed', shortcuts);
        });
    });

    // Restablecer atajos a valores por defecto
    if (resetShortcutsBtn) {
        resetShortcutsBtn.addEventListener('click', () => {
            shortcuts = { ...defaultShortcuts };
            globalSettings['browser-shortcuts'] = shortcuts;
            saveSettings();
            updateShortcutDisplay();
            ipcRenderer.sendToHost('shortcuts-changed', shortcuts);
        });
    }

    // Tutorial reset button
    const tutorialResetBtn = document.getElementById('tutorial-reset-btn');
    if (tutorialResetBtn) {
        tutorialResetBtn.addEventListener('click', () => {
            globalSettings['tutorial-completed'] = false;
            saveSettings();
            alert('El tutorial se mostrará la próxima vez que inicies la aplicación.');
        });
    }

    // ========================================================================
    // BOTÓN DE CERRAR CONFIGURACIÓN
    // ========================================================================

    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.sendToHost('close-settings');
        });
    }

    // ========================================================================
    // GESTIÓN DE EXTENSIONES
    // ========================================================================

    const dropZone = document.getElementById('drop-zone');
    const extensionsList = document.getElementById('extensions-list');
    const openWebStoreBtn = document.getElementById('open-webstore-btn');

    if (dropZone && extensionsList) {
        // Cargar extensiones al iniciar
        loadExtensions();

        // Botón para abrir Chrome Web Store
        if (openWebStoreBtn) {
            openWebStoreBtn.addEventListener('click', () => {
                // Abrir en nueva pestaña
                const { shell } = require('electron');
                // shell.openExternal abre en navegador predeterminado del sistema. 
                // Queremos abrirlo en NUESTRO navegador (nueva pestaña).
                ipcRenderer.send('browser-new-tab', 'https://chromewebstore.google.com/');
            });
        }

        // Escuchar evento de instalación desde el Main Process (Context Menu)
        ipcRenderer.on('trigger-extension-install', async (event, extensionId) => {
            const confirmInstall = confirm('¿Quieres instalar esta extensión desde la Chrome Web Store?');
            if (!confirmInstall) return;

            // Mostrar feedback
            dropZone.innerHTML = `<p>Descargando e instalando extensión (${extensionId})...</p>`;

            try {
                const result = await ipcRenderer.invoke('download-and-install-crx', extensionId);
                if (result.success) {
                    alert(`Extensión "${result.name}" instalada correctamente.`);
                    loadExtensions();
                } else {
                    alert(`Error al instalar: ${result.error}`);
                }
            } catch (err) {
                alert(`Error inesperado: ${err.message}`);
            } finally {
                // Restaurar texto
                dropZone.innerHTML = `
                    <ion-icon name="cloud-upload-outline"></ion-icon>
                    <p>Suelta archivos de extensión aquí</p>
                `;
            }
        });

        // Escuchar evento de instalación desde EDGE Addons
        ipcRenderer.on('trigger-edge-extension-install', async (event, extensionId) => {
            const confirmInstall = confirm('¿Quieres instalar esta extensión desde Microsoft Edge Add-ons?');
            if (!confirmInstall) return;

            // Mostrar feedback
            dropZone.innerHTML = `<p>Descargando e instalando extensión de Edge (${extensionId})...</p>`;

            try {
                const result = await ipcRenderer.invoke('download-and-install-edge-crx', extensionId);
                if (result.success) {
                    alert(`Extensión de Edge "${result.name}" instalada correctamente.`);
                    loadExtensions();
                } else {
                    alert(`Error al instalar: ${result.error}`);
                }
            } catch (err) {
                alert(`Error inesperado: ${err.message}`);
            } finally {
                // Restaurar texto
                dropZone.innerHTML = `
                    <ion-icon name="cloud-upload-outline"></ion-icon>
                    <p>Suelta archivos de extensión aquí</p>
                `;
            }
        });

        // Drag & Drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.path.endsWith('.crx') || file.path.endsWith('.zip')) {
                    // Mostrar estado de carga
                    dropZone.innerHTML = `<p>Instalando ${file.name}...</p>`;

                    try {
                        const result = await ipcRenderer.invoke('install-extension', file.path);
                        if (result.success) {
                            alert(`Extensión "${result.name}" instalada correctamente.`);
                            loadExtensions();
                        } else {
                            alert(`Error al instalar: ${result.error}`);
                        }
                    } catch (err) {
                        alert(`Error inesperado: ${err.message}`);
                    } finally {
                        // Restaurar texto
                        dropZone.innerHTML = `
                            <ion-icon name="cloud-upload-outline"></ion-icon>
                            <p>Suelta archivos de extensión aquí</p>
                        `;
                    }
                } else {
                    alert('Por favor, arrastra un archivo .crx o .zip válido.');
                }
            }
        });

        /**
         * Carga y renderiza la lista de extensiones
         */
        async function loadExtensions() {
            const extensions = await ipcRenderer.invoke('get-extensions-list');
            renderExtensions(extensions);
        }

        /**
         * Renderiza las extensiones en el DOM
         */
        function renderExtensions(extensions) {
            extensionsList.innerHTML = '';

            extensions.forEach(ext => {
                // Filtrar extensiones internas si es necesario (ej. uBlock podría mostrarse pero no borrarse)

                const card = document.createElement('div');
                card.className = 'extension-card';

                // Intentar obtener inicial del nombre para el icono
                const initial = ext.name ? ext.name.charAt(0).toUpperCase() : '?';

                card.innerHTML = `
                    <div class="extension-header">
                        <div class="extension-icon">${initial}</div>
                        <div class="extension-info">
                            <div class="extension-name" title="${ext.name}">${ext.name}</div>
                            <div class="extension-version">v${ext.version}</div>
                        </div>
                    </div>
                    <div class="extension-actions">
                        <button class="extension-btn options-btn" data-id="${ext.id}">
                            <ion-icon name="settings-outline"></ion-icon> Configurar
                        </button>
                        <button class="extension-btn delete delete-btn" data-id="${ext.id}">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                `;

                extensionsList.appendChild(card);
            });

            // Asignar eventos a los botones
            document.querySelectorAll('.options-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    ipcRenderer.send('open-extension-options', id);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('¿Estás seguro de que deseas eliminar esta extensión?')) {
                        const id = btn.dataset.id;
                        const result = await ipcRenderer.invoke('remove-extension', id);
                        if (result.success) {
                            loadExtensions();
                        } else {
                            alert(`Error: ${result.error}`);
                        }
                    }
                });
            });
        }
    }
});
