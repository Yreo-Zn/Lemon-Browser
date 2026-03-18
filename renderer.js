/**
 * LEMON BROWSER - Proceso de Renderizado (Renderer Process)
 * ===========================================================
 * Este archivo gestiona la interfaz de usuario y la lógica del navegador:
 * 
 * SECCIONES PRINCIPALES:
 * ----------------------
 * 1. Configuración y Constantes (Motores de búsqueda, sitios populares)
 * 2. Gestión de Configuración (Persistencia, color de acento, atajos)
 * 3. Modo Fantasma (Click-through window cuando no hay interacción)
 * 4. Marcadores y Páginas Recientes (Gestión de bookmarks)
 * 5. Búsqueda Inteligente (Sugerencias, preview de páginas)
 * 6. Gestión de Pestañas (Creación, cierre, cambio entre pestañas)
 * 7. Hibernación de Pestañas (Ahorro de memoria para pestañas inactivas)
 * 8. Tutorial Inicial (Onboarding para nuevos usuarios)
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * ---------------------------
 * - Interfaz transparente con efecto de cristal (glassmorphism)
 * - Modo fantasma: permite click-through cuando no se usa
 * - Hibernación automática de pestañas tras 10 minutos de inactividad
 * - Sistema de sugerencias inteligente basado en keywords
 * - Preview de sitios antes de navegar (hover de 3 segundos)
 * - Atajos de teclado personalizables
 * - Marcadores y páginas recientes
 * - Color de acento personalizable
 */

const { ipcRenderer } = require('electron');
const path = require('path');

/** User Agent para simular navegador de escritorio */
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";


// ============================================================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ============================================================================

// CONFIGURACIÓN DE BUSCADORES
const searchEngines = {
    google: {
        name: 'Google',
        url: 'https://www.google.com/search?q=',
        icon: 'https://www.google.com/favicon.ico'
    },
    duckduckgo: {
        name: 'DuckDuckGo',
        url: 'https://duckduckgo.com/?q=',
        icon: 'https://duckduckgo.com/favicon.ico'
    },
    bing: {
        name: 'Bing',
        url: 'https://www.bing.com/search?q=',
        icon: 'https://www.bing.com/favicon.ico'
    },
    ecosia: {
        name: 'Ecosia',
        url: 'https://www.ecosia.org/search?q=',
        icon: 'https://www.ecosia.org/favicon.ico'
    }
};

// BASE DE DATOS DE SITIOS POPULARES
const popularSites = [
    // Redes Sociales
    { name: 'YouTube', url: 'https://www.youtube.com', icon: 'https://www.youtube.com/favicon.ico', keywords: ['youtube', 'video', 'videos', 'you', 'yt'] },
    { name: 'Facebook', url: 'https://www.facebook.com', icon: 'https://www.facebook.com/favicon.ico', keywords: ['facebook', 'face', 'fb', 'social'] },
    { name: 'Twitter / X', url: 'https://twitter.com', icon: 'https://twitter.com/favicon.ico', keywords: ['twitter', 'x', 'tweet', 'tweets'] },
    { name: 'Instagram', url: 'https://www.instagram.com', icon: 'https://www.instagram.com/favicon.ico', keywords: ['instagram', 'insta', 'ig', 'fotos'] },
    { name: 'TikTok', url: 'https://www.tiktok.com', icon: 'https://www.tiktok.com/favicon.ico', keywords: ['tiktok', 'tik', 'tok'] },
    { name: 'LinkedIn', url: 'https://www.linkedin.com', icon: 'https://www.linkedin.com/favicon.ico', keywords: ['linkedin', 'linked', 'trabajo', 'empleo'] },
    { name: 'Reddit', url: 'https://www.reddit.com', icon: 'https://www.reddit.com/favicon.ico', keywords: ['reddit', 'red', 'foro'] },
    { name: 'Discord', url: 'https://discord.com', icon: 'https://discord.com/favicon.ico', keywords: ['discord', 'chat', 'comunidad'] },
    { name: 'Twitch', url: 'https://www.twitch.tv', icon: 'https://www.twitch.tv/favicon.ico', keywords: ['twitch', 'stream', 'streaming', 'directo'] },

    // Correo y Productividad
    { name: 'Gmail', url: 'https://mail.google.com', icon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', keywords: ['gmail', 'mail', 'correo', 'email', 'gm'] },
    { name: 'Outlook', url: 'https://outlook.live.com', icon: 'https://outlook.live.com/favicon.ico', keywords: ['outlook', 'hotmail', 'correo', 'email'] },
    { name: 'Google Drive', url: 'https://drive.google.com', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png', keywords: ['drive', 'google drive', 'archivos', 'nube'] },
    { name: 'Dropbox', url: 'https://www.dropbox.com', icon: 'https://www.dropbox.com/favicon.ico', keywords: ['dropbox', 'drop', 'archivos', 'nube'] },
    { name: 'Notion', url: 'https://www.notion.so', icon: 'https://www.notion.so/favicon.ico', keywords: ['notion', 'notas', 'productividad'] },
    { name: 'Trello', url: 'https://trello.com', icon: 'https://trello.com/favicon.ico', keywords: ['trello', 'tareas', 'proyecto'] },

    // Desarrollo
    { name: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico', keywords: ['github', 'git', 'codigo', 'repositorio', 'repo'] },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'https://stackoverflow.com/favicon.ico', keywords: ['stackoverflow', 'stack', 'programacion', 'codigo'] },
    { name: 'GitLab', url: 'https://gitlab.com', icon: 'https://gitlab.com/favicon.ico', keywords: ['gitlab', 'git', 'codigo'] },
    { name: 'CodePen', url: 'https://codepen.io', icon: 'https://codepen.io/favicon.ico', keywords: ['codepen', 'code', 'html', 'css'] },
    { name: 'npm', url: 'https://www.npmjs.com', icon: 'https://www.npmjs.com/favicon.ico', keywords: ['npm', 'node', 'paquetes', 'javascript'] },

    // Entretenimiento
    { name: 'Netflix', url: 'https://www.netflix.com', icon: 'https://www.netflix.com/favicon.ico', keywords: ['netflix', 'series', 'peliculas', 'streaming'] },
    { name: 'Spotify', url: 'https://www.spotify.com', icon: 'https://www.spotify.com/favicon.ico', keywords: ['spotify', 'musica', 'music', 'canciones'] },
    { name: 'Amazon', url: 'https://www.amazon.com', icon: 'https://www.amazon.com/favicon.ico', keywords: ['amazon', 'compras', 'tienda'] },
    { name: 'eBay', url: 'https://www.ebay.com', icon: 'https://www.ebay.com/favicon.ico', keywords: ['ebay', 'compras', 'subastas'] },
    { name: 'Twitch', url: 'https://www.twitch.tv', icon: 'https://www.twitch.tv/favicon.ico', keywords: ['twitch', 'streaming', 'juegos'] },

    // Noticias y Educación
    { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'https://www.wikipedia.org/favicon.ico', keywords: ['wikipedia', 'wiki', 'enciclopedia', 'informacion'] },
    { name: 'Medium', url: 'https://medium.com', icon: 'https://medium.com/favicon.ico', keywords: ['medium', 'articulos', 'blog'] },
    { name: 'Coursera', url: 'https://www.coursera.org', icon: 'https://www.coursera.org/favicon.ico', keywords: ['coursera', 'cursos', 'educacion'] },
    { name: 'Udemy', url: 'https://www.udemy.com', icon: 'https://www.udemy.com/favicon.ico', keywords: ['udemy', 'cursos', 'aprender'] },

    // Herramientas
    { name: 'Google Maps', url: 'https://maps.google.com', icon: 'https://www.google.com/images/branding/product/1x/maps_32dp.png', keywords: ['maps', 'mapas', 'google maps', 'direcciones'] },
    { name: 'Google Translate', url: 'https://translate.google.com', icon: 'https://ssl.gstatic.com/images/branding/product/1x/translate_24dp.png', keywords: ['translate', 'traductor', 'traducir', 'google translate'] },
    { name: 'Canva', url: 'https://www.canva.com', icon: 'https://www.canva.com/favicon.ico', keywords: ['canva', 'diseño', 'design', 'grafico'] },
    { name: 'Figma', url: 'https://www.figma.com', icon: 'https://www.figma.com/favicon.ico', keywords: ['figma', 'diseño', 'design', 'ui', 'ux'] },

    // Otros
    { name: 'WhatsApp Web', url: 'https://web.whatsapp.com', icon: 'https://web.whatsapp.com/favicon.ico', keywords: ['whatsapp', 'whats', 'chat', 'mensajes'] },
    { name: 'Telegram Web', url: 'https://web.telegram.org', icon: 'https://web.telegram.org/favicon.ico', keywords: ['telegram', 'chat', 'mensajes'] },
    { name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://chat.openai.com/favicon.ico', keywords: ['chatgpt', 'gpt', 'openai', 'ai', 'chat'] },
    { name: 'Google Calendar', url: 'https://calendar.google.com', icon: 'https://calendar.google.com/favicon.ico', keywords: ['calendar', 'calendario', 'agenda', 'eventos'] }
];

// ============================================================================
// 2. GESTIÓN DE CONFIGURACIÓN Y PERSISTENCIA
// ============================================================================

// MEMORIA DE AJUSTES GLOBALES
let globalSettings = {};

/**
 * Inicializa y carga la configuración guardada del usuario
 * Aplica preferencias de: motor de búsqueda, atajos, colores, animaciones, etc.
 */
async function initSettings() {
    globalSettings = await ipcRenderer.invoke('get-settings');

    // Motor de búsqueda
    currentEngine = globalSettings['preferredEngine'] || 'google';
    if (!searchEngines[currentEngine]) currentEngine = 'google';
    updateEngineUI();

    // Sincronizar atajos
    if (globalSettings['browser-shortcuts']) {
        currentShortcuts = globalSettings['browser-shortcuts'];
        syncShortcutsWithMain();
    }

    // Aplicar color de acento
    const accentColor = globalSettings['accentColor'] || '#6496ff';
    applyAccentColor(accentColor);

    // Aplicar animaciones
    applyAnimationSettings();

    // Marcadores
    savedPages = globalSettings['savedPages'] || [];
    renderSavedPages();

    // Sitios recientes
    recentSites = globalSettings['recentSites'] || [];

    // Restaurar páginas si está activado
    restorePages();

    // Tutorial
    initTutorial();

    // Restaurar posición de la pestaña de marcadores
    if (globalSettings['bookmarksTabLeft'] !== undefined) {
        const trigger = document.getElementById('saved-pages-trigger');
        if (trigger) {
            trigger.style.left = globalSettings['bookmarksTabLeft'];
        }
    }
}

// RECENT SITES STORAGE
let recentSites = [];
/**
 * Guarda un sitio en la lista de recientes
 * @param {Object} site - Objeto con name, url, icon
 */
function saveRecentSite(site) {
    const limit = parseInt(globalSettings['recent-sites-limit'] || '5');

    if (limit <= 0) {
        if (recentSites.length > 0) {
            recentSites = [];
            globalSettings['recentSites'] = recentSites;
            ipcRenderer.send('save-settings', globalSettings);
        }
        return;
    }

    recentSites = recentSites.filter(s => s.url !== site.url);
    recentSites.unshift(site);
    recentSites = recentSites.slice(0, limit);
    globalSettings['recentSites'] = recentSites;
    ipcRenderer.send('save-settings', globalSettings);
}

// SAVE OPEN PAGES STATE
/**
 * Guarda el estado de las páginas abiertas para restaurarlas después
 */
function saveOpenPagesState() {
    const rememberEnabled = globalSettings['remember-pages-toggle'] === 'true';
    if (!rememberEnabled) {
        globalSettings['lastOpenPages'] = [];
        ipcRenderer.send('save-settings', globalSettings);
        return;
    }

    const pagesToSave = openPages.map(page => ({
        url: page.webview.getURL(),
        name: page.name || page.url,
        favicon: page.favicon
    }));

    globalSettings['lastOpenPages'] = pagesToSave;
    ipcRenderer.send('save-settings', globalSettings);
}

let currentEngine = 'google';

// SELECCIÓN DE ELEMENTOS DEL DOM
const searchBar = document.getElementById('search-bar');
const barContainer = document.getElementById('bar-container');
const suggestionsBox = document.getElementById('suggestions');
const resultsArea = document.getElementById('results-area');
const previewContainer = document.getElementById('preview-container');
const previewView = document.getElementById('preview-view');
const wrapper = document.querySelector('.search-wrapper');
const currentEngineBtn = document.getElementById('current-engine-btn');
const engineDropdown = document.getElementById('engine-dropdown');
const currentEngineIcon = document.getElementById('current-engine-icon');
const mainBrowserContainer = document.getElementById('main-browser-container');
const mainWebview = document.getElementById('main-webview'); // We'll keep this reference but might not use it if we dynamic-create
const settingsBtn = document.getElementById('settings-btn');
const settingsContainer = document.getElementById('settings-container');
const settingsWebview = document.getElementById('settings-webview');
const windowControlsContainer = document.getElementById('window-controls-container');
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

// NEW ELEMENTS
const activeSearchesContainer = document.getElementById('active-searches-container');
const closeSearchContainer = document.getElementById('close-search-container');
const closeTabsBtn = document.getElementById('close-tabs-btn');
const dotContextMenu = document.getElementById('dot-context-menu');
const ctxClose = document.getElementById('ctx-close');
const ctxMute = document.getElementById('ctx-mute');
const dragPillContainer = document.getElementById('drag-pill-container');
const tutorialOverlay = document.getElementById('tutorial-overlay');
const tutorialContent = document.getElementById('tutorial-content');
const tutorialDots = document.getElementById('tutorial-dots');
const tutorialNext = document.getElementById('tutorial-next');
const tutorialSkip = document.getElementById('tutorial-skip');
const savedPagesContainer = document.getElementById('saved-pages-container');
const savedPagesTrigger = document.getElementById('saved-pages-trigger');
const savedPagesTriggerInner = document.getElementById('saved-pages-trigger-inner');
const menuOverlay = document.getElementById('menu-overlay');

let savedPages = [];

let openPages = [];
let activePageIndex = -1;
let contextTargetIndex = -1;

let selectedIndex = -1;
let previewTimer = null; // Temporizador para la preview
let searchIdleTimer = null; // Temporizador para auto-cerrar barra de búsqueda

// ============================================================================
// 3. MODO FANTASMA (Click-through Window)
// ============================================================================

// MODO FANTASMA - ESTADO
let isInteractive = null; // Iniciar como null para forzar la primera sincronización

/**
 * Controla el modo fantasma (click-through) de la ventana
 * @param {boolean} value - true = interactivo (normal), false = fantasma (click-through)
 */
function setInteractive(value) {
    if (isInteractive === value) return;
    isInteractive = value;

    // false = interactivo (no ignorar mouse)
    // true = fantasma (ignorar mouse)
    const ignore = !value;
    ipcRenderer.send('set-ignore-mouse-events', ignore, { forward: true });
}

function updateControlsMode(isHome, hideControls = false) {
    if (!windowControlsContainer) return;

    if (hideControls) {
        windowControlsContainer.classList.add('hidden');
    } else {
        windowControlsContainer.classList.remove('hidden');
    }

    if (isHome) {
        if (wrapper) {
            wrapper.appendChild(windowControlsContainer);
            windowControlsContainer.classList.add('on-bar');
        }
        if (dragPillContainer) dragPillContainer.classList.add('hidden');
        document.body.classList.remove('pages-open');
        if (savedPagesTrigger) savedPagesTrigger.classList.add('hidden');
        if (savedPagesContainer) savedPagesContainer.classList.remove('deployed');
        renderSavedPages(); // Render in horizontal mode
    } else {
        document.body.appendChild(windowControlsContainer);
        windowControlsContainer.classList.remove('on-bar');
        if (dragPillContainer) dragPillContainer.classList.remove('hidden');
        document.body.classList.add('pages-open');
        if (savedPagesTrigger) savedPagesTrigger.classList.remove('hidden');
        renderSavedPages(); // Render in vertical mode (hidden until deployed)
    }
}

// ATAJOS DE TECLADO - CONFIGURACIÓN
const defaultShortcuts = {
    'shortcut-search': { key: 'ArrowUp', ctrl: true, shift: false, alt: false },
    'shortcut-close': { key: 'ArrowDown', ctrl: true, shift: false, alt: false },
    'shortcut-back': { key: 'ArrowLeft', ctrl: true, shift: false, alt: false },
    'shortcut-forward': { key: 'ArrowRight', ctrl: true, shift: false, alt: false },
    'shortcut-tab-next': { key: 'ArrowRight', ctrl: false, shift: false, alt: true },
    'shortcut-tab-prev': { key: 'ArrowLeft', ctrl: false, shift: false, alt: true },
    'shortcut-center-window': { key: 'ArrowUp', ctrl: false, shift: false, alt: true }
};

let currentShortcuts = defaultShortcuts;

function syncShortcutsWithMain() {
    ipcRenderer.send('update-shortcuts', currentShortcuts);
}

// Sincronizar al inicio (después de cargar ajustes)
initSettings();

ipcRenderer.on('request-initial-adblock', () => {
    const adblockEnabled = globalSettings['adblock-toggle'] === true; // globalSettings almacena booleanos
    ipcRenderer.send('set-adblock-enabled', adblockEnabled);
});

function hexToRgb(hex) {
    if (!hex) return { r: 100, g: 150, b: 255 };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 100, g: 150, b: 255 }; // Default blue
}

// Function to apply accent color
function applyAccentColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--accent-color', color);

    // Calculate lighter and darker variants
    const rgb = hexToRgb(color);
    const lighter = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
    const medium = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
    const darker = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;

    document.documentElement.style.setProperty('--accent-color-light', lighter);
    document.documentElement.style.setProperty('--accent-color-medium', medium);
    document.documentElement.style.setProperty('--accent-color-dark', darker);

    // Update injected CSS for all open webviews
    updateWebviewScrollbars();
}

function getScrollbarCSS() {
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    const rgb = hexToRgb(accentColor);
    const accentMedium = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;

    return `
        ::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
        }
        ::-webkit-scrollbar-track {
            background: rgba(15, 15, 15, 0.1) !important;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(100, 100, 100, 0.3) !important;
            border-radius: 20px !important;
            border: 2px solid transparent !important;
            background-clip: content-box !important;
            transition: background 0.3s !important;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: ${accentMedium} !important;
            border: 0px solid transparent !important;
        }
    `;
}

function updateWebviewScrollbars() {
    const css = getScrollbarCSS();
    openPages.forEach(page => {
        if (page.webview && typeof page.webview.insertCSS === 'function') {
            try {
                page.webview.insertCSS(css);
            } catch (e) { /* ignore */ }
        }
    });

    if (previewView && typeof previewView.insertCSS === 'function') {
        try {
            previewView.insertCSS(css);
        } catch (e) { /* ignore */ }
    }

    if (settingsWebview && typeof settingsWebview.insertCSS === 'function') {
        try {
            settingsWebview.insertCSS(css);
        } catch (e) { /* ignore */ }
    }
}




function resetSearchIdleTimer() {
    clearTimeout(searchIdleTimer);
    // Solo si hay páginas abiertas (si no hay páginas, la barra debe quedarse visible)
    if (openPages.length > 0) {
        searchIdleTimer = setTimeout(() => {
            // Si la barra está visible y el input está vacío, la ocultamos
            if (wrapper.style.display === 'flex' && searchBar.value.trim() === '') {
                wrapper.style.display = 'none';
                if (activePageIndex >= 0) {
                    setInteractive(true);
                }
            }
        }, 7000);
    }
}

ipcRenderer.on('window-maximized-state', (event, isMaximized) => {
    if (isMaximized) {
        document.body.classList.add('is-maximized');
    } else {
        document.body.classList.remove('is-maximized');
    }
    renderSavedPages();
});

// NUEVO: Sincronizar estado al cambiar visibilidad de ventana
ipcRenderer.on('window-restored', () => {
    setInteractive(true);
    if (openPages.length > 0) {
        document.body.classList.add('pages-open');
    } else {
        document.body.classList.remove('pages-open');
    }

    // Check if maximized after restoration
    ipcRenderer.invoke('get-maximized-state').then(isMaximized => {
        if (isMaximized) {
            document.body.classList.add('is-maximized');
        } else {
            document.body.classList.remove('is-maximized');
        }
    }).catch(() => { });

    renderSavedPages();
});

// ============================================================================
// 4. MARCADORES Y PÁGINAS GUARDADAS
// ============================================================================

/**
 * Guarda una página en los marcadores
 * @param {Object} page - Objeto con datos de la página
 */
function savePage(page) {
    if (!page || !page.webview) return;
    const site = {
        name: page.name || page.url,
        url: page.webview.getURL(), // Usar URL real actual
        icon: page.favicon || 'https://www.google.com/favicon.ico'
    };

    // Evitar duplicados
    savedPages = savedPages.filter(s => s.url !== site.url);
    savedPages.unshift(site);

    // Guardar en globalSettings y persistir
    globalSettings['savedPages'] = savedPages;
    ipcRenderer.send('save-settings', globalSettings);

    renderSavedPages();
}

/**
 * Renderiza los marcadores guardados en la interfaz
 * Cambia entre modo horizontal (home) y vertical (navegando)
 */
function renderSavedPages() {
    if (!savedPagesContainer) return;
    savedPagesContainer.innerHTML = '';

    if (document.body.classList.contains('pages-open')) {
        savedPagesContainer.classList.add('vertical');
        savedPagesContainer.classList.remove('horizontal');
    } else {
        savedPagesContainer.classList.add('horizontal');
        savedPagesContainer.classList.remove('vertical');
    }

    if (savedPages.length > 0) {
        savedPagesContainer.classList.remove('hidden');
    } else {
        savedPagesContainer.classList.add('hidden');
        return;
    }

    savedPages.forEach((page, index) => {
        const item = document.createElement('div');
        item.className = 'saved-page-item glass';
        item.innerHTML = `
            <img src="${page.icon}" onerror="this.src='https://www.google.com/favicon.ico'">
            <span>${page.name}</span>
            <div class="remove-bookmark" title="Eliminar">×</div>
        `;

        // Botón de eliminar
        const removeBtn = item.querySelector('.remove-bookmark');
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            savedPages.splice(index, 1);
            globalSettings['savedPages'] = savedPages;
            ipcRenderer.send('save-settings', globalSettings);
            renderSavedPages();
        };

        item.onclick = (e) => {
            e.stopPropagation();
            navigateTo(page.url);
            if (document.body.classList.contains('pages-open')) {
                savedPagesContainer.classList.remove('deployed');
                if (menuOverlay) menuOverlay.classList.add('hidden');
            }
        };
        savedPagesContainer.appendChild(item);
    });
}

// LOGICA DEL TRIGGER (DRAG & CLICK)
if (savedPagesTrigger && savedPagesTriggerInner) {
    let isDragging = false;
    let startX = 0;
    let startLeft = 0;
    let hasMoved = false;

    savedPagesTriggerInner.addEventListener('pointerdown', (e) => {
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startLeft = savedPagesTrigger.offsetLeft;
        savedPagesTriggerInner.setPointerCapture(e.pointerId);

        // Desactivar transiciones durante el arrastre
        savedPagesTrigger.style.transition = 'none';

        setInteractive(true);
    });

    savedPagesTriggerInner.addEventListener('pointermove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        if (Math.abs(deltaX) > 5) hasMoved = true;

        let newLeft = startLeft + deltaX;

        // Límites de arrastre
        const minLeft = 10;
        const maxLeft = window.innerWidth - savedPagesTrigger.offsetWidth - 10;
        newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));

        savedPagesTrigger.style.left = `${newLeft}px`;
    });

    savedPagesTriggerInner.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        savedPagesTriggerInner.releasePointerCapture(e.pointerId);

        // Restaurar transiciones (solo para el movimiento vertical de hover/maximizado)
        savedPagesTrigger.style.transition = 'top var(--trans-spring)';

        // Guardar posición horizontal
        globalSettings['bookmarksTabLeft'] = savedPagesTrigger.style.left;
        ipcRenderer.send('save-settings', globalSettings);

        // Si no se movió significativamente, es un clic
        if (!hasMoved) {
            if (savedPagesContainer) {
                const isDeploying = !savedPagesContainer.classList.contains('deployed');
                savedPagesContainer.classList.toggle('deployed', isDeploying);

                if (menuOverlay) {
                    menuOverlay.classList.toggle('hidden', !isDeploying);
                }

                if (isDeploying) {
                    setInteractive(true);
                    renderSavedPages();
                }
            }
        }
    });
}

// Overlay para cerrar menú (esto funciona incluso sobre webviews)
if (menuOverlay) {
    menuOverlay.onclick = (e) => {
        e.stopPropagation();
        if (savedPagesContainer) {
            savedPagesContainer.classList.remove('deployed');
            menuOverlay.classList.add('hidden');

            // Re-evaluar interactividad
            setTimeout(() => {
                document.dispatchEvent(new MouseEvent('mousemove', {
                    clientX: e.clientX,
                    clientY: e.clientY
                }));
            }, 100);
        }
    };
}

// Asegurar interactividad inicial inmediatamente
setInteractive(true);

if (savedPagesContainer) {
    savedPagesContainer.addEventListener('mouseenter', () => setInteractive(true));
}
if (savedPagesTrigger) {
    savedPagesTrigger.addEventListener('mouseenter', () => setInteractive(true));
}

// CONTROL DE CLICS (MODO FANTASMA)
if (wrapper) {
    wrapper.addEventListener('mouseenter', () => {
        setInteractive(true);
    });

    wrapper.addEventListener('mouseleave', () => {
        const hasText = searchBar.value.trim().length > 0;
        const isDropdownOpen = engineDropdown && engineDropdown.classList.contains('visible');
        const hasPreview = previewContainer.classList.contains('show');
        const isBrowserActive = mainBrowserContainer && !mainBrowserContainer.classList.contains('hidden');
        const isSettingsVisible = settingsContainer && !settingsContainer.classList.contains('hidden');
        const isMouseOverControls = windowControlsContainer && windowControlsContainer.matches(':hover');

        // Solo volver a modo fantasma si NO hay nada activo
        if (!hasPreview && !hasText && !isDropdownOpen && !isBrowserActive && !isSettingsVisible && !isMouseOverControls) {
            setInteractive(false);
        }
    });
}

// CONTROLES DE VENTANA
if (windowControlsContainer) {
    windowControlsContainer.addEventListener('mouseenter', () => {
        setInteractive(true);
    });

    windowControlsContainer.addEventListener('mouseleave', () => {
        const hasText = searchBar.value.trim().length > 0;
        const isBrowserActive = mainBrowserContainer && !mainBrowserContainer.classList.contains('hidden');
        const isSettingsVisible = settingsContainer && !settingsContainer.classList.contains('hidden');

        if (!hasText && !isBrowserActive && !isSettingsVisible && !wrapper.matches(':hover')) {
            setInteractive(false);
        }
    });
}

// DETECCIÓN DE BORDES PARA REDIMENSIONAMIENTO
// Permite que Windows detecte el ratón en los bordes incluso si la ventana es transparente
document.addEventListener('mousemove', (e) => {
    // Si hay una página activa, un settings abierto o la barra tiene texto, 
    // ya somos interactivos por las otras reglas, no hace falta esto.
    const isBrowserActive = mainBrowserContainer && !mainBrowserContainer.classList.contains('hidden');
    const isSettingsVisible = settingsContainer && !settingsContainer.classList.contains('hidden');
    const isTutorialVisible = tutorialOverlay && !tutorialOverlay.classList.contains('hidden');
    const hasText = searchBar.value.trim().length > 0;

    if (isBrowserActive || isSettingsVisible || isTutorialVisible || hasText) return;

    const edgeThreshold = 10; // Píxeles de margen en los bordes
    const topInteractiveHeight = 60; // Altura de la zona de los botones arriba

    const isNearEdge =
        e.clientX < edgeThreshold ||
        e.clientX > window.innerWidth - edgeThreshold ||
        e.clientY < edgeThreshold ||
        e.clientY > window.innerHeight - edgeThreshold ||
        e.clientY < topInteractiveHeight; // Zona de botones superior

    if (isNearEdge) {
        setInteractive(true);
    } else {
        // Solo volver a modo fantasma si no estamos sobre el buscador o controles
        const isOverWrapper = wrapper.matches(':hover');
        const isOverControls = windowControlsContainer.matches(':hover');
        const isOverCloseTab = closeSearchContainer.matches(':hover');
        const isOverDragPill = dragPillContainer && dragPillContainer.matches(':hover');
        const isOverPreview = previewContainer && previewContainer.matches(':hover');
        const isOverTutorial = tutorialOverlay && tutorialOverlay.matches(':hover');
        const isOverSavedPages = savedPagesContainer && (savedPagesContainer.matches(':hover') || savedPagesContainer.classList.contains('deployed'));
        const isOverSavedTrigger = savedPagesTrigger && savedPagesTrigger.matches(':hover');
        const isOverOverlay = menuOverlay && !menuOverlay.classList.contains('hidden');
        const isOverDots = activeSearchesContainer && activeSearchesContainer.matches(':hover');

        if (isOverWrapper || isOverControls || isOverCloseTab || isOverDragPill || isOverDots || isOverTutorial || isOverPreview || isOverSavedPages || isOverSavedTrigger || isOverOverlay) {
            setInteractive(true);
        } else {
            setInteractive(false);
        }
    }
});

if (minBtn) minBtn.onclick = () => ipcRenderer.send('window-minimize');
if (maxBtn) maxBtn.onclick = () => ipcRenderer.send('window-maximize');
if (closeBtn) closeBtn.onclick = () => ipcRenderer.send('window-close');

// REDIMENSIONAMIENTO DESDE EL BORDE
let isResizingWindow = false;

const resizeHandles = document.querySelectorAll('.resize-handle');
resizeHandles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
        const classList = Array.from(handle.classList);
        const edge = classList.find(c => c !== 'resize-handle');
        if (edge) {
            isResizingWindow = true;
            ipcRenderer.send('window-resize-start', { mouseX: e.screenX, mouseY: e.screenY, edge });
            setInteractive(true);
            e.preventDefault(); // Evitar selección
        }
    });
    
    // Asegurar interactividad al pasar el ratón por el borde
    handle.addEventListener('mouseenter', () => setInteractive(true));
});

document.addEventListener('mousemove', (e) => {
    if (isResizingWindow) {
        ipcRenderer.send('window-resize-move', { screenX: e.screenX, screenY: e.screenY });
        setInteractive(true);
    }
});

document.addEventListener('mouseup', () => {
    if (isResizingWindow) {
        isResizingWindow = false;
        ipcRenderer.send('window-resize-end');
    }
});

// Mantener interactivo si entramos en la preview

if (previewContainer) {
    previewContainer.addEventListener('mouseenter', () => {
        setInteractive(true);
    });
}

// Mantener interactivo en el dropdown
if (engineDropdown) {
    engineDropdown.addEventListener('mouseenter', () => {
        setInteractive(true);
    });
}

// Mantener interactivo en el contenedor de settings
if (settingsContainer) {
    settingsContainer.addEventListener('mouseenter', () => {
        setInteractive(true);
    });

    settingsContainer.addEventListener('mouseleave', () => {
        // Solo volver a modo fantasma si el settings está oculto
        if (settingsContainer.classList.contains('hidden')) {
            setInteractive(false);
        }
    });
}

// Mantener interactivo en el tutorial
if (tutorialOverlay) {
    tutorialOverlay.addEventListener('mouseenter', () => {
        setInteractive(true);
    });
}

/**
 * Vuelve a la pantalla de inicio (barra de búsqueda)
 */
function returnToHome() {
    // Ocultar navegador y todos sus webviews
    if (mainBrowserContainer) {
        mainBrowserContainer.classList.add('hidden');
        // No borramos las páginas aquí, solo las ocultamos si es necesario, 
        // pero returnToHome ahora se llama solo cuando no hay páginas.
    }

    // Ocultar settings
    if (settingsContainer) {
        settingsContainer.classList.add('hidden');
    }

    // Ocultar controles de búsqueda
    if (closeSearchContainer) {
        closeSearchContainer.classList.add('hidden');
    }

    if (savedPagesContainer) {
        savedPagesContainer.classList.remove('deployed');
        if (menuOverlay) menuOverlay.classList.add('hidden');
    }

    // Mostrar barra de búsqueda
    if (wrapper) {
        wrapper.style.display = 'flex';
        searchBar.focus();
        searchBar.select();
    }

    // Asegurar que somos interactivos al volver al home
    setInteractive(true);
    updateControlsMode(true, false);

    // Limpiar estado de búsqueda anterior
    searchBar.value = '';
    barContainer.classList.remove('active-mode');
    if (resultsArea) resultsArea.classList.add('hidden');
    hidePreview();
}



// ============================================================================
// 5. BÚSQUEDA INTELIGENTE Y SUGERENCIAS
// ============================================================================

// GESTIÓN DE SELECCIÓN Y PREVIEW
function updateSelection(items) {
    items.forEach(i => i.classList.remove('active'));
    clearTimeout(previewTimer); // Limpiar si movemos la flecha rápido
    hidePreview();

    if (selectedIndex >= 0 && items[selectedIndex]) {
        const sel = items[selectedIndex];
        sel.classList.add('active');

        // Si te quedas 3 segundos sobre una opción, se abre la preview
        previewTimer = setTimeout(() => {
            // Shift the bar to the left to make room for preview
            if (wrapper) wrapper.classList.add('with-preview');

            // Set a tablet-like user agent so pages adapt to the wider width
            const tabletUA = "Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";
            previewView.setUserAgent(tabletUA);

            previewView.src = sel.dataset.url;
            previewContainer.classList.add('show');

            // Standard zoom for tablet view
            previewView.addEventListener('dom-ready', () => {
                previewView.setZoomLevel(0);
            }, { once: true });

            // Al mostrar la preview, la ventana DEBE ser sólida para interactuar
            setInteractive(true);
        }, 3000);
    }
}

function hidePreview() {
    if (wrapper) wrapper.classList.remove('with-preview');
    previewContainer.classList.remove('show');
    if (previewView) {
        // Forzar detención y limpieza
        try {
            previewView.stop();
            previewView.src = 'about:blank';
        } catch (e) {
            previewView.src = 'about:blank';
        }
    }
}

// EVENTOS DE TECLADO
searchBar.addEventListener('keydown', (e) => {
    const items = document.querySelectorAll('.suggestion-item');

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(0, selectedIndex - 1);
        updateSelection(items);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
        updateSelection(items);
    } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && items[selectedIndex]) {
            navigateTo(items[selectedIndex].dataset.url);
        } else {
            const val = searchBar.value;
            if (val) {
                const engine = searchEngines[currentEngine];
                navigateTo(`${engine.url}${encodeURIComponent(val)}`);
            }
        }
    }
});

// EVENTO DE ESCRITURA
searchBar.addEventListener('input', (e) => {
    if (e.target.value.trim().length > 0) {
        clearTimeout(searchIdleTimer); // Detener auto-cierre si se escribe algo
        setInteractive(true); // Mantejar sólido mientras se escribe
        barContainer.classList.add('active-mode');
        renderSuggestions(e.target.value);
    } else {
        barContainer.classList.remove('active-mode');
        if (resultsArea) resultsArea.classList.add('hidden');
        hidePreview();

        resetSearchIdleTimer(); // Reiniciar auto-cierre si se borra el texto

        // Si borramos todo y el mouse no está encima, volver a fantasma
        if (!wrapper.matches(':hover')) {
            setInteractive(false);
        }
    }
});

// RENDERIZAR SUGERENCIAS INTELIGENTES
/**
 * Renderiza sugerencias inteligentes basadas en la consulta
 * Prioridad: 1) Sitios recientes 2) Sitios populares 3) Motor de búsqueda
 * @param {string} query - Término de búsqueda
 */
function renderSuggestions(query) {
    suggestionsBox.innerHTML = '';
    if (resultsArea) resultsArea.classList.remove('hidden');

    const queryLower = query.toLowerCase().trim();
    const suggestions = [];

    // 0. Buscar en sitios RECIENTES (Prioridad máxima)
    const matchedRecent = recentSites
        .filter(site =>
            site.name.toLowerCase().includes(queryLower) ||
            site.url.toLowerCase().includes(queryLower)
        )
        .slice(0, 2);

    matchedRecent.forEach(site => {
        suggestions.push({
            type: 'site',
            name: site.name,
            url: site.url,
            icon: site.icon,
            isRecent: true
        });
    });

    // 1. Buscar sitios populares que coincidan (Si queda espacio)
    const matchedSites = popularSites
        .map(site => {
            // Calcular puntuación de coincidencia
            let score = 0;

            // Coincidencia exacta con el nombre
            if (site.name.toLowerCase() === queryLower) {
                score = 1000;
            }
            // El nombre comienza con la búsqueda
            else if (site.name.toLowerCase().startsWith(queryLower)) {
                score = 500;
            }
            // El nombre contiene la búsqueda
            else if (site.name.toLowerCase().includes(queryLower)) {
                score = 300;
            }

            // Coincidencia con keywords
            site.keywords.forEach(keyword => {
                if (keyword === queryLower) {
                    score = Math.max(score, 800);
                } else if (keyword.startsWith(queryLower)) {
                    score = Math.max(score, 400);
                } else if (keyword.includes(queryLower)) {
                    score = Math.max(score, 200);
                }
            });

            return { ...site, score };
        })
        .filter(site => site.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Máximo 3 sitios populares

    // Agregar sitios populares a las sugerencias
    matchedSites.forEach(site => {
        suggestions.push({
            type: 'site',
            name: site.name,
            url: site.url,
            icon: site.icon
        });
    });

    // 2. Si hay espacio, agregar opción de búsqueda en el motor actual
    if (suggestions.length < 4) {
        const engine = searchEngines[currentEngine];
        suggestions.push({
            type: 'search',
            name: `Buscar "${query}" en ${engine.name}`,
            url: `${engine.url}${encodeURIComponent(query)}`,
            icon: engine.icon
        });
    }

    // 3. Renderizar todas las sugerencias
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.dataset.url = suggestion.url;

        if (suggestion.type === 'site') {
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                    <img src="${suggestion.icon}" style="width: 20px; height: 20px; object-fit: contain;" onerror="this.style.display='none'">
                    <span style="flex: 1;">${suggestion.name} ${suggestion.isRecent ? '<span style="font-size: 0.7em; opacity: 0.5; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 10px; margin-left: 5px;">Reciente</span>' : ''}</span>
                    <span style="font-size: 0.85em; opacity: 0.6;">${suggestion.url.replace('https://', '').replace('www.', '').split('/')[0]}</span>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                    <img src="${suggestion.icon}" style="width: 20px; height: 20px; object-fit: contain;">
                    <span style="flex: 1;">${suggestion.name}</span>
                </div>
            `;
        }

        div.onclick = () => navigateTo(div.dataset.url);
        suggestionsBox.appendChild(div);
    });

    selectedIndex = -1; // Resetear selección al escribir
}

// LÓGICA DE BUSCADORES
function updateEngineUI() {
    // Actualizar icono principal
    currentEngineIcon.src = searchEngines[currentEngine].icon;

    // Renderizar opciones del dropdown
    engineDropdown.innerHTML = '';
    Object.keys(searchEngines).forEach(key => {
        if (key === currentEngine) return; // No mostrar el actual en la lista

        const engine = searchEngines[key];
        const item = document.createElement('div');
        item.className = 'engine-option';
        item.innerHTML = `<img src="${engine.icon}"><span>${engine.name}</span>`;
        item.onclick = (e) => {
            e.stopPropagation(); // Evitar cerrar inmediatamente si hay bubbling
            selectEngine(key);
        };
        engineDropdown.appendChild(item);
    });
}

function selectEngine(engineKey) {
    currentEngine = engineKey;
    globalSettings['preferredEngine'] = currentEngine;
    ipcRenderer.send('save-settings', globalSettings);

    updateEngineUI();
    toggleDropdown(false);

    // Si hay texto, actualizar sugerencia inmediatamente
    if (searchBar.value.trim().length > 0) {
        renderSuggestions(searchBar.value);
    }
    searchBar.focus();
}

function toggleDropdown(forceState) {
    const isVisible = engineDropdown.classList.contains('visible');
    const newState = forceState !== undefined ? forceState : !isVisible;

    if (newState) {
        engineDropdown.classList.remove('hidden');
        // Pequeño delay para permitir transición si estaba hidden
        requestAnimationFrame(() => {
            engineDropdown.classList.add('visible');
        });
        setInteractive(true); // Asegurar que podemos clicar
    } else {
        engineDropdown.classList.remove('visible');
        // Esperar transición antes de ocultar completamente si usaramos hidden, 
        // pero por ahora solo manejamos opacidad con la clase visible
    }
}

// Event Listeners para el selector
currentEngineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
});

// Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!currentEngineBtn.contains(e.target) && !engineDropdown.contains(e.target)) {
        if (engineDropdown.classList.contains('visible')) {
            toggleDropdown(false);
        }
    }
});


// Load and apply saved accent color on startup
const savedAccentColor = localStorage.getItem('accentColor') || '#6496ff';
applyAccentColor(savedAccentColor);

// PREVIEW AND SETTINGS SCROLLBARS
if (previewView) {
    previewView.addEventListener('dom-ready', () => {
        try {
            previewView.insertCSS(getScrollbarCSS());
        } catch (e) { console.error("Error injecting CSS to preview:", e); }
    });
}

if (settingsWebview) {
    settingsWebview.addEventListener('dom-ready', () => {
        try {
            settingsWebview.insertCSS(getScrollbarCSS());
        } catch (e) { console.error("Error injecting CSS to settings:", e); }
    });
}


function openSettings() {
    const settingsUrl = 'file://' + path.join(__dirname, 'settings.html');

    // Hide main browser if open
    if (mainBrowserContainer) mainBrowserContainer.classList.add('hidden');

    // Show settings
    if (settingsContainer && settingsWebview) {
        settingsContainer.classList.remove('hidden');
        settingsWebview.setUserAgent(DESKTOP_UA);
        settingsWebview.src = settingsUrl;

        // Listen for messages from settings
        settingsWebview.addEventListener('ipc-message', (event) => {
            if (event.channel === 'close-settings') {
                settingsContainer.classList.add('hidden');
                if (openPages.length > 0) {
                    mainBrowserContainer.classList.remove('hidden');
                    if (closeSearchContainer) closeSearchContainer.classList.remove('hidden');
                    updateControlsMode(false);
                    setInteractive(true);
                } else {
                    returnToHome();
                }
            } else if (event.channel === 'accent-color-changed') {
                const newColor = event.args[0];
                globalSettings['accentColor'] = newColor;
                ipcRenderer.send('save-settings', globalSettings);
                applyAccentColor(newColor);
            } else if (event.channel === 'shortcuts-changed') {
                currentShortcuts = event.args[0];
                globalSettings['browser-shortcuts'] = currentShortcuts;
                ipcRenderer.send('save-settings', globalSettings);
                syncShortcutsWithMain();
            } else if (event.channel === 'theme-changed') {
                const { theme, enabled } = event.args[0];
                globalSettings[theme + '-toggle'] = enabled;
                ipcRenderer.send('save-settings', globalSettings);
                applyTheme(theme, enabled);
            } else if (event.channel === 'remember-pages-changed') {
                globalSettings['remember-pages-toggle'] = event.args[0];
                ipcRenderer.send('save-settings', globalSettings);
                saveOpenPagesState();
            } else if (event.channel === 'adblock-changed') {
                globalSettings['adblock-toggle'] = event.args[0];
                ipcRenderer.send('save-settings', globalSettings);
                ipcRenderer.send('set-adblock-enabled', event.args[0]);
            } else if (event.channel === 'animation-settings-changed') {
                const { reduceMotion, noAnimations } = event.args[0];
                globalSettings['reduce-motion-toggle'] = reduceMotion;
                globalSettings['no-animations-toggle'] = noAnimations;
                ipcRenderer.send('save-settings', globalSettings);
                applyAnimationSettings();
            }
        });

        // Ensure interactive mode
        setInteractive(true);
        updateControlsMode(false, true); // Hide controls in settings
        wrapper.style.display = 'none';
        if (closeSearchContainer) closeSearchContainer.classList.add('hidden');
    }
}

settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openSettings();
});

ipcRenderer.on('open-settings-requested', () => {
    openSettings();
});

// LIQUID GLASS THEME LOGIC
function applyTheme(theme, enabled) {
    if (theme === 'liquid-glass') {
        if (enabled) {
            document.body.classList.add('liquid-glass');
        } else {
            document.body.classList.remove('liquid-glass');
        }
    }
}

// Initial theme application
// Initial theme application (Disabled for now)
// const isLiquidGlassEnabled = localStorage.getItem('liquid-glass-toggle') === 'true';
// applyTheme('liquid-glass', isLiquidGlassEnabled);

// Listen for messages from settings via IPC (if we were using ipcMain -> ipcRenderer)
// But since we use ipcRenderer.sendToHost, we need to handle it in the webview event listener
// Actually, the settings container uses a webview. Let's find where we handle settings messages.

/**
 * Cambia a una pestaña específica
 * Si la pestaña está hibernada, la despierta automáticamente
 * @param {number} index - Índice de la pestaña en el array openPages
 */
function switchToPage(index) {
    if (index === activePageIndex) return;

    // Desactivar actual
    if (activePageIndex >= 0 && openPages[activePageIndex]) {
        if (openPages[activePageIndex].webview) {
            openPages[activePageIndex].webview.classList.add('hidden');
        }
        openPages[activePageIndex].dot.classList.remove('active');
        openPages[activePageIndex].lastUsed = Date.now();
    }

    activePageIndex = index;

    // Activar nueva
    if (activePageIndex >= 0 && openPages[activePageIndex]) {
        const page = openPages[activePageIndex];

        // Si estaba hibernada, despertarla
        if (!page.webview) {
            wakeUpPage(page);
        }

        page.webview.classList.remove('hidden');
        page.dot.classList.add('active');
        page.lastUsed = Date.now();
        setInteractive(true);
    }
}

// ============================================================================
// 7. HIBERNACIÓN DE PESTAÑAS (Tab Sleeping)
// ============================================================================

/**
 * Reactiva una pestaña hibernada
 * @param {Object} page - Objeto de la página hibernada
 */
function wakeUpPage(page) {
    const webview = document.createElement('webview');
    webview.useragent = DESKTOP_UA;
    webview.setAttribute('allowpopups', ''); // Permitir popups para capturarlos con new-window
    webview.style.width = '100vw';
    webview.style.height = '100vh';
    webview.style.background = 'white';
    webview.src = page.url; // Asignar src al FINAL

    mainBrowserContainer.appendChild(webview);
    page.webview = webview;

    // Re-vincular eventos
    webview.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons[0]) {
            page.dot.innerHTML = `<img src="${e.favicons[0]}">`;
            page.favicon = e.favicons[0];
        }
    });

    webview.addEventListener('page-title-updated', (e) => {
        page.name = e.title;
        saveOpenPagesState();
    });

    webview.addEventListener('did-navigate', () => {
        saveOpenPagesState();
    });

    webview.addEventListener('dom-ready', () => {
        try {
            webview.insertCSS(getScrollbarCSS());
        } catch (e) { console.error("Error injecting CSS:", e); }
    }, { once: true });

    // Manejar enlaces que abren nuevas ventanas
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        navigateTo(e.url);
    });
}

/**
 * Hiberna una pestaña para liberar memoria
 * Guarda el estado y destruye el webview
 * @param {Object} page - Página a hibernar
 */
function hibernatePage(page) {
    if (!page.webview) return;

    // Guardar URL actual antes de destruir
    page.url = page.webview.getURL();

    // Destruir webview
    page.webview.remove();
    page.webview = null;

    console.log(`Pestaña hibernada: ${page.name || page.url}`);
}

// Intervalo de hibernación (cada minuto)
setInterval(() => {
    const HIBERNATION_TIME = 10 * 60 * 1000; // 10 minutos
    const now = Date.now();

    openPages.forEach((page, index) => {
        if (index === activePageIndex) return; // No hibernar la activa
        if (!page.webview) return; // Ya hibernada

        if (now - page.lastUsed > HIBERNATION_TIME) {
            hibernatePage(page);
        }
    });
}, 60000);

function switchNextTab() {
    if (openPages.length <= 1) return;
    const nextIndex = (activePageIndex + 1) % openPages.length;
    switchToPage(nextIndex);
}

function switchPrevTab() {
    if (openPages.length <= 1) return;
    const prevIndex = (activePageIndex - 1 + openPages.length) % openPages.length;
    switchToPage(prevIndex);
}

function closeCurrentPage() {
    if (activePageIndex < 0 || !openPages[activePageIndex]) return;
    closePageAtIndex(activePageIndex);
}

function closePageAtIndex(index) {
    if (index < 0 || !openPages[index]) return;

    const pageToClose = openPages[index];

    // Remover del DOM
    pageToClose.webview.remove();
    pageToClose.dot.remove();

    // Remover del array
    openPages.splice(index, 1);

    if (openPages.length > 0) {
        // Si cerramos la activa, switch a la anterior
        if (index === activePageIndex) {
            const nextIndex = Math.max(0, index - 1);
            activePageIndex = -1;
            switchToPage(nextIndex);
        } else if (index < activePageIndex) {
            // Si cerramos una que está antes, el índice de la activa baja
            activePageIndex--;
        }
        saveOpenPagesState();
    } else {
        activePageIndex = -1;
        returnToHome();
    }
}

// Evento para el botón de cerrar página
if (closeTabsBtn) {
    closeTabsBtn.onclick = (e) => {
        e.stopPropagation();
        closeCurrentPage();
    };
}

// ============================================================================
// 6. GESTIÓN DE PESTAÑAS Y NAVEGACIÓN
// ============================================================================

// NAVEGACIÓN FINAL (Browsing)
/**
 * Navega a una URL, creando una nueva pestaña
 * @param {string} url - URL de destino
 */
function navigateTo(url) {
    setInteractive(true);
    hidePreview();
    if (previewTimer) clearTimeout(previewTimer);
    if (searchIdleTimer) clearTimeout(searchIdleTimer);

    // Ocultar resultados y limpiar búsqueda
    if (resultsArea) resultsArea.classList.add('hidden');
    searchBar.value = '';
    searchBar.blur();
    barContainer.classList.remove('active-mode');

    // Hide settings if open
    if (settingsContainer) settingsContainer.classList.add('hidden');

    // Desactivar página activa actual si existe
    if (activePageIndex >= 0 && openPages[activePageIndex]) {
        openPages[activePageIndex].webview.classList.add('hidden');
        openPages[activePageIndex].dot.classList.remove('active');
    }

    // Crear nueva página
    const webview = document.createElement('webview');
    webview.useragent = DESKTOP_UA;
    webview.setAttribute('allowpopups', ''); // Permitir popups para capturarlos con new-window
    webview.style.width = '100vw';
    webview.style.height = '100vh';
    webview.style.background = 'white';
    webview.src = url; // Asignar src al FINAL

    mainBrowserContainer.appendChild(webview);

    const dot = document.createElement('div');
    dot.className = 'search-dot active';
    activeSearchesContainer.appendChild(dot);

    const pageObj = {
        webview,
        dot,
        url,
        lastUsed: Date.now()
    };
    openPages.push(pageObj);
    activePageIndex = openPages.length - 1;

    // Automáticamente añadir a recientes
    saveRecentSite({
        name: url,
        url: url,
        icon: 'https://www.google.com/favicon.ico'
    });

    // Manejar favicon
    webview.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons[0]) {
            dot.innerHTML = `<img src="${e.favicons[0]}">`;
            pageObj.favicon = e.favicons[0];
        }
    });

    dot.onclick = (e) => {
        e.stopPropagation();
        switchToPage(openPages.indexOf(pageObj));
    };

    // CONTEXT MENU PARA EL PUNTO
    dot.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();

        contextTargetIndex = openPages.indexOf(pageObj);

        // Posicionar menú
        const rect = dot.getBoundingClientRect();
        dotContextMenu.style.left = `${rect.left}px`;
        dotContextMenu.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        dotContextMenu.classList.remove('hidden');

        // Actualizar estado de mute en el menú
        const isMuted = webview.isAudioMuted();
        ctxMute.querySelector('span').innerText = isMuted ? 'Activar sonido' : 'Silenciar';

        setInteractive(true);
    };

    // Mostrar contenedores
    mainBrowserContainer.classList.remove('hidden');
    if (closeSearchContainer) closeSearchContainer.classList.remove('hidden');

    updateControlsMode(false);
    wrapper.style.display = 'none';

    // Limpiar historial al cargar e inyectar scrollbar
    webview.addEventListener('dom-ready', () => {
        webview.clearHistory();
        try {
            webview.insertCSS(getScrollbarCSS());
        } catch (e) { console.error("Error injecting CSS:", e); }
    }, { once: true });

    // Manejar enlaces que abren nuevas ventanas
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        navigateTo(e.url);
    });

    // Actualizar nombre para "Añadir a recientes" cuando cargue el título
    webview.addEventListener('page-title-updated', (e) => {
        pageObj.name = e.title;
        saveOpenPagesState();

        // Actualizar en recientes con el título real
        saveRecentSite({
            name: e.title,
            url: webview.getURL(),
            icon: pageObj.favicon || 'https://www.google.com/favicon.ico'
        });
    });

    webview.addEventListener('did-navigate', () => {
        saveOpenPagesState();
    });
}


updateEngineUI();

// MANEJO DE NAVEGACIÓN DESDE MAIN (Atajos de teclado)
ipcRenderer.on('browser-go-back', () => {
    if (activePageIndex >= 0 && openPages[activePageIndex]) {
        const wv = openPages[activePageIndex].webview;
        if (wv.canGoBack()) {
            wv.goBack();
        }
    }
});

ipcRenderer.on('browser-go-forward', () => {
    if (activePageIndex >= 0 && openPages[activePageIndex]) {
        const wv = openPages[activePageIndex].webview;
        if (wv.canGoForward()) {
            wv.goForward();
        }
    }
});

ipcRenderer.on('browser-focus-search', () => {
    wrapper.style.display = 'flex';
    searchBar.focus();
    searchBar.select();
    setInteractive(true);
    resetSearchIdleTimer();
});

ipcRenderer.on('browser-next-tab', () => {
    switchNextTab();
});

ipcRenderer.on('browser-prev-tab', () => {
    switchPrevTab();
});

ipcRenderer.on('browser-close-tab', () => {
    closeCurrentPage();
});

// NUEVO: Manejar solicitud de nueva pestaña desde main (target="_blank")
ipcRenderer.on('browser-new-tab', (event, url) => {
    navigateTo(url);
});

// NUEVO: Manejar solicitud de instalación de extensión desde Context Menu
ipcRenderer.on('trigger-extension-install', (event, extensionId) => {
    openSettings();
    // Esperar a que el webview esté listo para recibir el mensaje
    if (settingsWebview.isLoading()) {
        settingsWebview.addEventListener('dom-ready', () => {
            settingsWebview.send('trigger-extension-install', extensionId);
        }, { once: true });
    } else {
        settingsWebview.send('trigger-extension-install', extensionId);
    }
});

// NUEVO: Manejar solicitud de instalación de extensión de EDGE desde Context Menu
ipcRenderer.on('trigger-edge-extension-install', (event, extensionId) => {
    openSettings();
    // Esperar a que el webview esté listo para recibir el mensaje
    if (settingsWebview.isLoading()) {
        settingsWebview.addEventListener('dom-ready', () => {
            settingsWebview.send('trigger-edge-extension-install', extensionId);
        }, { once: true });
    } else {
        settingsWebview.send('trigger-edge-extension-install', extensionId);
    }
});

// Atajo configurable para cerrar página - REMOVIDO PARA USAR MAIN.JS
// window.addEventListener('keydown', (e) => {
//     const s = currentShortcuts['shortcut-close'];
//     if (s && e.key === s.key && e.ctrlKey === s.ctrl && e.shiftKey === s.shift && e.altKey === s.alt) {
//         closeCurrentPage();
//     }
// });

// Inicializar posición de controles
updateControlsMode(true);

// MENÚ CONTEXTUAL - ACCIONES
if (ctxClose) {
    ctxClose.onclick = () => {
        closePageAtIndex(contextTargetIndex);
        dotContextMenu.classList.add('hidden');
    };
}

if (ctxMute) {
    ctxMute.onclick = () => {
        const page = openPages[contextTargetIndex];
        if (page) {
            const currentState = page.webview.isAudioMuted();
            page.webview.setAudioMuted(!currentState);
        }
        dotContextMenu.classList.add('hidden');
    };
}


// NUEVO: Añadir a marcadores reales
const ctxSave = document.createElement('div');
ctxSave.className = 'context-item';
ctxSave.id = 'ctx-save';
ctxSave.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
    <span>Guardar en marcadores</span>
`;
ctxSave.onclick = () => {
    const page = openPages[contextTargetIndex];
    if (page) {
        savePage(page);
    }
    dotContextMenu.classList.add('hidden');
};
if (dotContextMenu) dotContextMenu.appendChild(ctxSave);

function closeTabContextMenu() {
    if (dotContextMenu) {
        dotContextMenu.classList.add('hidden');
    }
}

// Cerrar menú contextual al interactuar fuera de él
window.addEventListener('mousedown', (e) => {
    if (dotContextMenu && !dotContextMenu.contains(e.target)) {
        closeTabContextMenu();
    }
}, true); // Fase de captura para asegurar detección

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTabContextMenu();
    }
});

// Cerrar cuando el foco sale de la ventana principal (ej: clic en un webview)
window.addEventListener('blur', () => {
    closeTabContextMenu();
});

// LÓGICA DE ARRASTRE MANUAL (IPC)
const dragPill = document.getElementById('drag-pill');
if (dragPill) {
    let isDragging = false;

    dragPill.addEventListener('pointerdown', (e) => {
        isDragging = true;
        dragPill.setPointerCapture(e.pointerId);
        ipcRenderer.send('window-drag-start', {
            mouseX: e.clientX,
            mouseY: e.clientY
        });

        // Ensure we are interactive during drag
        setInteractive(true);
    });

    dragPill.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        ipcRenderer.send('window-drag-move', {
            screenX: e.screenX,
            screenY: e.screenY
        });
    });

    dragPill.addEventListener('pointerup', (e) => {
        if (isDragging) {
            isDragging = false;
            dragPill.releasePointerCapture(e.pointerId);
            ipcRenderer.send('window-drag-end');
        }
    });

    dragPill.addEventListener('lostpointercapture', () => {
        if (isDragging) {
            isDragging = false;
            ipcRenderer.send('window-drag-end');
        }
    });
}

// RESTORE PAGES ON STARTUP
function restorePages() {
    const rememberEnabled = globalSettings['remember-pages-toggle'] === true;
    if (!rememberEnabled) return;

    const savedLastPages = globalSettings['lastOpenPages'] || [];
    if (savedLastPages.length > 0) {
        savedLastPages.forEach(page => {
            navigateTo(page.url);
        });
    }
}

// ============================================================================
// 8. TUTORIAL INICIAL (Onboarding)
// ============================================================================

// --- LÓGICA DEL TUTORIAL ---
let currentTutorialStep = 0;

const tutorialSteps = [
    {
        title: '¡Bienvenido a Lemon!',
        description: 'Lemon Browser es un navegador ligero y minimalista diseñado para la productividad. Vamos a enseñarte cómo sacarle el máximo partido.',
        icon: '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
    },
    {
        title: 'Atajos de Navegación',
        description: 'Navega rápido por la aplicación usando el teclado. Puedes personalizar estos atajos en cualquier momento desde los ajustes.',
        isShortcuts: true,
        shortcuts: [
            { name: 'Buscar / Abrir barra', keys: 'Ctrl + ↑' },
            { name: 'Cerrar página actual', keys: 'Ctrl + ↓' },
            { name: 'Atrás / Adelante', keys: 'Ctrl + ← / →' }
        ]
    },
    {
        title: 'Gestión de Pestañas',
        description: 'Lemon usa un sistema de burbujas en la parte inferior para que gestiones tus sitios abiertos. Haz click derecho sobre ellas para más opciones',
        isShortcuts: true,
        shortcuts: [
            { name: 'Siguiente pestaña', keys: 'Alt + →' },
            { name: 'Anterior pestaña', keys: 'Alt + ←' },
            { name: 'Centrar ventana', keys: 'Alt + ↑' }
        ]
    },
    {
        title: 'Configuración y Estilo',
        description: 'Haz clic en el icono de engranaje en la barra de búsqueda para cambiar el color de acento y más opciones.',
        icon: '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0l.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
    }
];

// (Función initTutorial definida más adelante en el archivo)


function showStep(index) {
    currentTutorialStep = index;
    const step = tutorialSteps[index];

    let contentHTML = `
        <div class="tutorial-step-img">${step.icon || ''}</div>
        <h2>${step.title}</h2>
        <p>${step.description}</p>
    `;

    if (step.isShortcuts) {
        contentHTML = `
            <h2>${step.title}</h2>
            <p>${step.description}</p>
            <div class="tutorial-shortcut-list">
                ${step.shortcuts.map(s => `
                    <div class="tutorial-shortcut-item">
                        <span>${s.name}</span>
                        <span class="kbd">${s.keys}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    tutorialContent.innerHTML = contentHTML;

    // Render dots
    tutorialDots.innerHTML = tutorialSteps.map((_, i) => `
        <div class="tutorial-dot ${i === index ? 'active' : ''}"></div>
    `).join('');

    tutorialNext.innerText = index === tutorialSteps.length - 1 ? '¡Empezar!' : 'Siguiente';
}

tutorialNext.onclick = () => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
        showStep(currentTutorialStep + 1);
    } else {
        finishTutorial();
    }
};

tutorialSkip.onclick = () => finishTutorial();

function finishTutorial() {
    tutorialOverlay.style.opacity = '0';
    globalSettings['tutorial-completed'] = true;
    ipcRenderer.send('save-settings', globalSettings);

    setTimeout(() => {
        tutorialOverlay.classList.add('hidden');
        if (openPages.length === 0) {
            returnToHome();
        }
    }, 500);
}

// Iniciar el tutorial al cargar
function initTutorial() {
    // Esto se puede llamar desde initSettings si se desea más control
    const completed = globalSettings['tutorial-completed'];
    if (completed === true) {
        tutorialOverlay.classList.add('hidden');
    } else {
        tutorialOverlay.classList.remove('hidden');
        showStep(0);
    }
}

// ANIMATION SETTINGS LOGIC
function applyAnimationSettings() {
    const reduceMotion = globalSettings['reduce-motion-toggle'] === true;
    const noAnimations = globalSettings['no-animations-toggle'] === true;

    document.body.classList.toggle('reduce-motion', reduceMotion);
    document.body.classList.toggle('no-animations', noAnimations);
}

// Initial application
// (Llamado desde initSettings)
