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
    // window.electronAPI provided by preload-settings.js (contextBridge)

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

    let globalSettings = await window.electronAPI.getSettings();

    /**
     * Guarda la configuración globalmente
     */
    function saveSettings() {
        window.electronAPI.saveSettings(globalSettings);
    }

    // ========================================================================
    // INICIALIZACIÓN DE TOGGLES (INTERRUPTORES)
    // ========================================================================

    const toggles = document.querySelectorAll('input[type="checkbox"]');

    const animationHandler = () => {
        window.electronAPI.sendToHost('animation-settings-changed', {
            reduceMotion: document.getElementById('reduce-motion-toggle').checked,
            noAnimations: document.getElementById('no-animations-toggle').checked
        });
    };

    const toggleHandlers = {
        'liquid-glass-toggle': (checked) => {
            window.electronAPI.sendToHost('theme-changed', { theme: 'liquid-glass', enabled: checked });
        },
        'remember-pages-toggle': (checked) => {
            window.electronAPI.sendToHost('remember-pages-changed', checked);
        },
        'adblock-toggle': (checked) => {
            window.electronAPI.sendToHost('adblock-changed', checked);
        },
        'blank-page-toggle': (checked) => {
            window.electronAPI.sendToHost('blank-page-changed', checked);
        },
        'dnt-toggle': (checked) => {
            window.electronAPI.sendToHost('dnt-changed', checked);
        },
        'reduce-motion-toggle': animationHandler,
        'no-animations-toggle': animationHandler
    };

    toggles.forEach(toggle => {
        const key = toggle.id;
        if (globalSettings[key] !== undefined) {
            toggle.checked = globalSettings[key] === true;
        }

        toggle.addEventListener('change', () => {
            globalSettings[key] = toggle.checked;
            saveSettings();

            const handler = toggleHandlers[key];
            if (handler) handler(toggle.checked);
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

    const dataFolderBtn = document.getElementById('open-data-folder-btn');
    if (dataFolderBtn) {
        dataFolderBtn.addEventListener('click', () => {
            window.electronAPI.openDataFolder();
        });
    }

    // ========================================================================
    // BORRAR DATOS DE NAVEGACIÓN
    // ========================================================================

    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', async () => {
            if (confirm('¿Estás seguro de que deseas borrar todos los datos de navegación?')) {
                clearDataBtn.disabled = true;
                clearDataBtn.textContent = 'Borrando…';
                try {
                    await window.electronAPI.clearBrowsingData();
                    clearDataBtn.textContent = '¡Datos borrados!';
                    setTimeout(() => {
                        clearDataBtn.textContent = 'Borrar datos ahora';
                        clearDataBtn.disabled = false;
                    }, 2000);
                } catch (err) {
                    clearDataBtn.textContent = 'Error al borrar';
                    clearDataBtn.disabled = false;
                }
            }
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

        window.electronAPI.sendToHost('accent-color-changed', color);
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
            input.innerText = label;
            window.electronAPI.sendToHost('shortcuts-changed', shortcuts);
        });
    });

    // Restablecer atajos a valores por defecto
    if (resetShortcutsBtn) {
        resetShortcutsBtn.addEventListener('click', () => {
            shortcuts = { ...defaultShortcuts };
            globalSettings['browser-shortcuts'] = shortcuts;
            saveSettings();
            updateShortcutDisplay();
            window.electronAPI.sendToHost('shortcuts-changed', shortcuts);
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
            window.electronAPI.sendToHost('close-settings');
        });
    }

    // ========================================================================
    // GESTIÓN DE EXTENSIONES
    // ========================================================================

    const dropZone = document.getElementById('drop-zone');
    const extensionsList = document.getElementById('extensions-list');
    const openWebStoreBtn = document.getElementById('open-webstore-btn');
    const openEdgeStoreBtn = document.getElementById('open-edge-store-btn');
    const openOperaStoreBtn = document.getElementById('open-opera-store-btn');

    if (dropZone && extensionsList) {
        // Cargar extensiones al iniciar
        loadExtensions();

        // Botón para abrir Chrome Web Store
        if (openWebStoreBtn) {
            openWebStoreBtn.addEventListener('click', () => {
                window.electronAPI.sendToHost('open-url', 'https://chromewebstore.google.com/');
            });
        }

        // Botón para abrir Edge Add-ons
        if (openEdgeStoreBtn) {
            openEdgeStoreBtn.addEventListener('click', () => {
                window.electronAPI.sendToHost('open-url', 'https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home');
            });
        }

        // Botón para abrir Opera Addons
        if (openOperaStoreBtn) {
            openOperaStoreBtn.addEventListener('click', () => {
                window.electronAPI.sendToHost('open-url', 'https://addons.opera.com/extensions/');
            });
        }

        // Escuchar evento de instalación desde el Main Process (Context Menu)
        window.electronAPI.onTriggerExtensionInstall(async (extensionId) => {
            const confirmInstall = confirm('¿Quieres instalar esta extensión desde la Chrome Web Store?');
            if (!confirmInstall) return;

            // Mostrar feedback
            dropZone.innerHTML = `<p>Descargando e instalando extensión (${extensionId})...</p>`;

            try {
                const result = await window.electronAPI.downloadAndInstallCrx(extensionId);
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
        window.electronAPI.onTriggerEdgeExtensionInstall(async (extensionId) => {
            const confirmInstall = confirm('¿Quieres instalar esta extensión desde Microsoft Edge Add-ons?');
            if (!confirmInstall) return;

            // Mostrar feedback
            dropZone.innerHTML = `<p>Descargando e instalando extensión de Edge (${extensionId})...</p>`;

            try {
                const result = await window.electronAPI.downloadAndInstallEdgeCrx(extensionId);
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

        // Escuchar evento de instalación desde Opera Addons
        window.electronAPI.onTriggerOperaExtensionInstall(async (extensionSlug) => {
            const confirmInstall = confirm('¿Quieres instalar esta extensión desde Opera Addons?');
            if (!confirmInstall) return;

            dropZone.innerHTML = `<p>Descargando e instalando extensión de Opera (${extensionSlug})...</p>`;

            try {
                const result = await window.electronAPI.downloadAndInstallOperaCrx(extensionSlug);
                if (result.success) {
                    alert(`Extensión de Opera "${result.name}" instalada correctamente.`);
                    loadExtensions();
                } else {
                    alert(`Error al instalar: ${result.error}`);
                }
            } catch (err) {
                alert(`Error inesperado: ${err.message}`);
            } finally {
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
                        const result = await window.electronAPI.installExtension(file.path);
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
            const extensions = await window.electronAPI.getExtensionsList();
            renderExtensions(extensions);
        }

        /**
         * Renderiza las extensiones en el DOM
         */
        function renderExtensions(extensions) {
            extensionsList.innerHTML = '';

            extensions.forEach(ext => {
                const card = document.createElement('div');
                card.className = 'extension-card';

                const initial = ext.name ? ext.name.charAt(0).toUpperCase() : '?';

                // Header
                const header = document.createElement('div');
                header.className = 'extension-header';

                const iconDiv = document.createElement('div');
                iconDiv.className = 'extension-icon';
                iconDiv.textContent = initial;

                const infoDiv = document.createElement('div');
                infoDiv.className = 'extension-info';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'extension-name';
                nameDiv.title = ext.name;
                nameDiv.textContent = ext.name;

                const versionDiv = document.createElement('div');
                versionDiv.className = 'extension-version';
                versionDiv.textContent = 'v' + ext.version;

                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(versionDiv);
                header.appendChild(iconDiv);
                header.appendChild(infoDiv);

                // Actions
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'extension-actions';

                const optionsBtn = document.createElement('button');
                optionsBtn.className = 'extension-btn options-btn';
                optionsBtn.dataset.id = ext.id;
                optionsBtn.innerHTML = '<ion-icon name="settings-outline"></ion-icon> Configurar';
                optionsBtn.addEventListener('click', () => {
                    window.electronAPI.openExtensionOptions(ext.id);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'extension-btn delete delete-btn';
                deleteBtn.dataset.id = ext.id;
                deleteBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
                deleteBtn.addEventListener('click', async () => {
                    if (confirm('¿Estás seguro de que deseas eliminar esta extensión?')) {
                        const result = await window.electronAPI.removeExtension(ext.id);
                        if (result.success) {
                            loadExtensions();
                        } else {
                            alert(`Error: ${result.error}`);
                        }
                    }
                });

                actionsDiv.appendChild(optionsBtn);
                actionsDiv.appendChild(deleteBtn);

                card.appendChild(header);
                card.appendChild(actionsDiv);
                extensionsList.appendChild(card);
            });
        }
    }
});
