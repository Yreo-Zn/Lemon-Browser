/**
 * LEMON BROWSER — Ventana Principal y IPC (Main Process)
 * ========================================================
 * - Creación de la ventana del navegador
 * - Atajos de teclado (before-input-event)
 * - IPC handlers: controles de ventana, settings, arrastre
 * - Jumplist de Windows
 */

const { BrowserWindow, ipcMain, shell, screen, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { DATA_DIR, SETTINGS_FILE, DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_SHORTCUTS } = require('./config');
const { setupWebviewSecurity } = require('./security');
const { createLogger } = require('./logger');

const log = createLogger('window');

let currentShortcuts = { ...DEFAULT_SHORTCUTS };
let dispatchTable = {};

// Workaround: transparent + frameless on Windows breaks isMaximized()/unmaximize().
// Track state manually via WeakMaps.
const maximizedMap = new WeakMap();
const boundsMap = new WeakMap();



// ── Funciones auxiliares de ventana ─────────────────────────────

function centerWindow(win) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const targetW = Math.min(DEFAULT_WIDTH, Math.round(width * 0.9));
  const targetH = Math.min(DEFAULT_HEIGHT, Math.round(height * 0.9));

  win.setBounds({
    x: Math.round((width - targetW) / 2),
    y: Math.round((height - targetH) / 2),
    width: targetW,
    height: targetH
  });
}

// ── Atajos de teclado ───────────────────────────────────────────

function shortcutKey(s) {
  return `${s.key}|${s.ctrl ? 1 : 0}|${s.shift ? 1 : 0}|${s.alt ? 1 : 0}`;
}

function inputKey(input) {
  return `${input.key}|${input.control ? 1 : 0}|${input.shift ? 1 : 0}|${input.alt ? 1 : 0}`;
}

function rebuildDispatchTable() {
  const table = {};
  const sc = currentShortcuts;
  if (sc['shortcut-back'])          table[shortcutKey(sc['shortcut-back'])]          = 'browser-go-back';
  if (sc['shortcut-forward'])       table[shortcutKey(sc['shortcut-forward'])]       = 'browser-go-forward';
  if (sc['shortcut-search'])        table[shortcutKey(sc['shortcut-search'])]        = 'browser-focus-search';
  if (sc['shortcut-close'])         table[shortcutKey(sc['shortcut-close'])]         = 'browser-close-tab';
  if (sc['shortcut-tab-next'])      table[shortcutKey(sc['shortcut-tab-next'])]      = 'browser-next-tab';
  if (sc['shortcut-tab-prev'])      table[shortcutKey(sc['shortcut-tab-prev'])]      = 'browser-prev-tab';
  if (sc['shortcut-center-window']) table[shortcutKey(sc['shortcut-center-window'])] = '__center-window__';
  dispatchTable = table;
}

rebuildDispatchTable();

function handleInput(win, event, input) {
  if (input.type !== 'keyDown') return;

  // ── Standard browser shortcuts (always active, not customizable) ──
  const ctrl = input.control || input.meta;
  const shift = input.shift;
  const alt = input.alt;
  const key = input.key.toLowerCase();

  // F12 or Ctrl+Shift+I → DevTools for active webview
  if (key === 'f12' || (ctrl && shift && key === 'i')) {
    event.preventDefault();
    win.webContents.send('browser-toggle-devtools');
    return;
  }

  // F5 or Ctrl+R → Reload active tab
  if (key === 'f5' || (ctrl && !shift && key === 'r')) {
    event.preventDefault();
    win.webContents.send('browser-reload');
    return;
  }

  // Ctrl+Shift+R → Hard reload
  if (ctrl && shift && key === 'r') {
    event.preventDefault();
    win.webContents.send('browser-hard-reload');
    return;
  }

  // Ctrl+T → New tab (focus search bar)
  if (ctrl && !shift && key === 't') {
    event.preventDefault();
    win.webContents.send('browser-focus-search');
    return;
  }

  // Ctrl+W → Close current tab
  if (ctrl && !shift && key === 'w') {
    event.preventDefault();
    win.webContents.send('browser-close-tab');
    return;
  }

  // Ctrl+Tab → Next tab
  if (ctrl && !shift && key === 'tab') {
    event.preventDefault();
    win.webContents.send('browser-next-tab');
    return;
  }

  // Ctrl+Shift+Tab → Previous tab
  if (ctrl && shift && key === 'tab') {
    event.preventDefault();
    win.webContents.send('browser-prev-tab');
    return;
  }

  // Ctrl+1..9 → Switch to tab by index (9 = last)
  if (ctrl && !shift && !alt && input.key >= '1' && input.key <= '9') {
    event.preventDefault();
    win.webContents.send('browser-switch-tab', parseInt(input.key));
    return;
  }

  // Ctrl+L → Focus address bar
  if (ctrl && !shift && key === 'l') {
    event.preventDefault();
    win.webContents.send('browser-focus-search');
    return;
  }

  // Alt+Left → Back
  if (alt && !ctrl && !shift && key === 'arrowleft') {
    event.preventDefault();
    win.webContents.send('browser-go-back');
    return;
  }

  // Alt+Right → Forward
  if (alt && !ctrl && !shift && key === 'arrowright') {
    event.preventDefault();
    win.webContents.send('browser-go-forward');
    return;
  }

  // Ctrl+D → Bookmark current page (Synapse Save)
  if (ctrl && !shift && key === 'd') {
    event.preventDefault();
    win.webContents.send('browser-save-page');
    return;
  }

  // Ctrl+H → Toggle History Sidebar
  if (ctrl && !shift && key === 'h') {
    event.preventDefault();
    win.webContents.send('browser-toggle-history');
    return;
  }

  // Escape → Stop loading / return to home
  if (key === 'escape' && !ctrl && !shift && !alt) {
    event.preventDefault();
    win.webContents.send('browser-escape');
    return;
  }

  // F11 → Toggle fullscreen
  if (key === 'f11' && !ctrl && !shift && !alt) {
    event.preventDefault();
    win.setFullScreen(!win.isFullScreen());
    return;
  }

  // Ctrl+= / Ctrl+- / Ctrl+0 → Zoom
  if (ctrl && !shift && (key === '=' || key === '+')) {
    event.preventDefault();
    win.webContents.send('browser-zoom-in');
    return;
  }
  if (ctrl && !shift && key === '-') {
    event.preventDefault();
    win.webContents.send('browser-zoom-out');
    return;
  }
  if (ctrl && !shift && key === '0') {
    event.preventDefault();
    win.webContents.send('browser-zoom-reset');
    return;
  }

  // Ctrl+F → Find in page
  if (ctrl && !shift && key === 'f') {
    event.preventDefault();
    win.webContents.send('browser-find');
    return;
  }

  // F3 → Find next
  if (key === 'f3' && !ctrl && !shift && !alt) {
    event.preventDefault();
    win.webContents.send('browser-find-next');
    return;
  }

  // Shift+F3 → Find previous
  if (key === 'f3' && !ctrl && shift && !alt) {
    event.preventDefault();
    win.webContents.send('browser-find-prev');
    return;
  }

  // Ctrl+B → Toggle Library (Bookmarks)
  if (ctrl && !shift && key === 'b') {
    event.preventDefault();
    win.webContents.send('toggle-library');
    return;
  }

  // Ctrl+G → Toggle Gallery (Tabs categorized)
  if (ctrl && !shift && key === 'g') {
    event.preventDefault();
    win.webContents.send('toggle-gallery');
    return;
  }

  // Ctrl+Shift+T → Reopen last closed tab
  if (ctrl && shift && key === 't') {
    event.preventDefault();
    win.webContents.send('browser-reopen-tab');
    return;
  }

  // Ctrl+N → New tab (alias)
  if (ctrl && !shift && key === 'n') {
    event.preventDefault();
    win.webContents.send('browser-focus-search');
    return;
  }

  // Ctrl+E / Ctrl+K → Focus address bar (aliases)
  if (ctrl && !shift && (key === 'e' || key === 'k')) {
    event.preventDefault();
    win.webContents.send('browser-focus-search');
    return;
  }

  // F6 → Focus address bar
  if (key === 'f6' && !ctrl && !shift && !alt) {
    event.preventDefault();
    win.webContents.send('browser-focus-search');
    return;
  }

  // Alt+D → Focus address bar
  if (alt && !ctrl && !shift && key === 'd') {
    event.preventDefault();
    win.webContents.send('browser-focus-search');
    return;
  }

  // Ctrl+P → Print current page
  if (ctrl && !shift && key === 'p') {
    event.preventDefault();
    win.webContents.send('browser-print');
    return;
  }

  // Ctrl+S → Bookmark (save) current page
  if (ctrl && !shift && key === 's') {
    event.preventDefault();
    win.webContents.send('browser-bookmark');
    return;
  }

  // Ctrl+U → View page source
  if (ctrl && !shift && key === 'u') {
    event.preventDefault();
    win.webContents.send('browser-view-source');
    return;
  }

  // Alt+Home → Return to home
  if (alt && !ctrl && !shift && key === 'home') {
    event.preventDefault();
    win.webContents.send('browser-home');
    return;
  }

  // Ctrl+Shift+W → Close window
  if (ctrl && shift && key === 'w') {
    event.preventDefault();
    win.close();
    return;
  }

  // Alt+F4 → Close window
  if (alt && !ctrl && !shift && key === 'f4') {
    event.preventDefault();
    win.close();
    return;
  }

  // Ctrl+Shift+Delete → Open settings (clear browsing data)
  if (ctrl && shift && key === 'delete') {
    event.preventDefault();
    win.webContents.send('open-settings-requested');
    return;
  }

  // Backspace → Go back (not when input is focused — handled by renderer)
  if (key === 'backspace' && !ctrl && !shift && !alt) {
    win.webContents.send('browser-back-if-not-input');
    return;
  }

  // ── Custom configurable shortcuts ──
  const iKey = inputKey(input);
  const action = dispatchTable[iKey];
  if (!action) return;

  event.preventDefault();
  if (action === '__center-window__') {
    centerWindow(win);
  } else {
    win.webContents.send(action);
  }
}

// ── Registro de IPC handlers ────────────────────────────────────

function registerWindowHandlers() {
  // Controles de ventana
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setIgnoreMouseEvents(ignore, options);
  });

  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (maximizedMap.get(win)) {
      const saved = boundsMap.get(win);
      if (saved) win.setBounds(saved);
      else win.unmaximize();
      maximizedMap.set(win, false);
      win.webContents.send('window-maximized-state', false);
      win.webContents.send('window-restored');
    } else {
      boundsMap.set(win, win.getBounds());
      win.maximize();
      maximizedMap.set(win, true);
      win.webContents.send('window-maximized-state', true);
    }
  });

  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  // Arrastre de ventana
  let isDragging = false;
  let offsetX, offsetY;

  ipcMain.on('window-drag-start', (_event, data) => {
    if (!data || typeof data.mouseX !== 'number' || typeof data.mouseY !== 'number') return;
    isDragging = true;
    offsetX = data.mouseX;
    offsetY = data.mouseY;
  });

  ipcMain.on('window-drag-move', (event, data) => {
    if (!isDragging || !data || typeof data.screenX !== 'number' || typeof data.screenY !== 'number') return;
    const x = Math.round(data.screenX - offsetX);
    const y = Math.round(data.screenY - offsetY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setPosition(x, y);
  });

  ipcMain.on('window-drag-end', () => {
    isDragging = false;
  });

  // Redimensionado de ventana (frameless transparent no tiene bordes nativos)
  let resizeState = null;

  ipcMain.on('window-resize-start', (event, data) => {
    if (!data || typeof data.edge !== 'string' || typeof data.screenX !== 'number' || typeof data.screenY !== 'number') return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || maximizedMap.get(win)) return;
    resizeState = {
      edge: data.edge,
      startScreenX: data.screenX,
      startScreenY: data.screenY,
      startBounds: win.getBounds()
    };
  });

  ipcMain.on('window-resize-move', (event, data) => {
    if (!resizeState || !data || typeof data.screenX !== 'number' || typeof data.screenY !== 'number') return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    const dx = data.screenX - resizeState.startScreenX;
    const dy = data.screenY - resizeState.startScreenY;
    const { x, y, width, height } = resizeState.startBounds;
    const minW = 400;
    const minH = 300;
    const edge = resizeState.edge;

    let newX = x, newY = y, newW = width, newH = height;

    if (edge.includes('right'))  newW = Math.max(minW, width + dx);
    if (edge.includes('left'))  { newW = Math.max(minW, width - dx); newX = x + width - newW; }
    if (edge.includes('bottom')) newH = Math.max(minH, height + dy);
    if (edge.includes('top'))   { newH = Math.max(minH, height - dy); newY = y + height - newH; }

    win.setBounds({
      x: Math.round(newX), y: Math.round(newY),
      width: Math.round(newW), height: Math.round(newH)
    });
  });

  ipcMain.on('window-resize-end', () => {
    resizeState = null;
  });

  // Atajos
  ipcMain.on('update-shortcuts', (_event, shortcuts) => {
    currentShortcuts = shortcuts;
    rebuildDispatchTable();
  });

  // Configuración persistente (async I/O — PERF-02)
  ipcMain.handle('get-settings', async () => {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      log.error('Error leyendo configuración', { message: err.message });
    }
    return {};
  });

  ipcMain.on('save-settings', (_event, settings) => {
    fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8')
      .catch(err => log.error('Error guardando configuración', { message: err.message }));
  });

  ipcMain.on('open-data-folder', () => {
    shell.openPath(DATA_DIR).catch(err => {
      log.error('Error abriendo carpeta de datos', { message: err.message });
    });
  });

  ipcMain.handle('get-maximized-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? (maximizedMap.get(win) || false) : false;
  });

  ipcMain.handle('get-settings-url', () => {
    return pathToFileURL(path.join(__dirname, '..', 'settings.html')).href;
  });

  ipcMain.handle('clear-browsing-data', async () => {
    const ses = session.defaultSession;
    await ses.clearStorageData();
    await ses.clearCache();
    log.info('Browsing data cleared');
    return { success: true };
  });
}

// ── Creación de ventana ─────────────────────────────────────────

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    transparent: true,
    frame: false,
    thickFrame: true,
    hasShadow: false,
    resizable: true,
    minimizable: true,
    maximizable: true,
    minWidth: 400,
    minHeight: 300,
    alwaysOnTop: false,
    skipTaskbar: false,
    title: 'Lemon Browser',
    icon: path.join(__dirname, '..', 'Icon.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
      webviewTag: true,
      backgroundThrottling: true
    }
  });

  win.setMenu(null);

  // Seguridad: forzar contextIsolation en webviews
  setupWebviewSecurity(win);

  // Atajos de teclado
  const inputHandler = (event, input) => handleInput(win, event, input);
  win.webContents.on('before-input-event', inputHandler);
  win.webContents.on('did-attach-webview', (_event, webContents) => {
    webContents.on('before-input-event', inputHandler);
  });

  // Notify renderer of maximize/unmaximize state changes (+ WeakMap tracking)
  win.on('maximize', () => {
    // Save pre-maximize bounds if not already tracked (covers native OS maximize via dblclick/snap)
    if (!maximizedMap.get(win)) {
      const current = boundsMap.get(win);
      if (!current) boundsMap.set(win, win.getBounds());
    }
    maximizedMap.set(win, true);
    win.webContents.send('window-maximized-state', true);
  });
  win.on('unmaximize', () => {
    maximizedMap.set(win, false);
    win.webContents.send('window-maximized-state', false);
    win.webContents.send('window-restored');
  });

  // Notify renderer of fullscreen state changes
  win.on('enter-full-screen', () => {
    win.webContents.send('window-fullscreen-state', true);
  });
  win.on('leave-full-screen', () => {
    win.webContents.send('window-fullscreen-state', false);
  });

  // Keep boundsMap updated when the user moves/resizes the restored window
  // so that unmaximize always restores to the latest position.
  // Also notify renderer of state changes for Aero Snap scenarios.
  win.on('moved', () => {
    if (!maximizedMap.get(win)) boundsMap.set(win, win.getBounds());
  });
  win.on('resized', () => {
    if (!maximizedMap.get(win)) {
      boundsMap.set(win, win.getBounds());
      // Renderer may need to know the window is no longer maximized (e.g. after Aero Snap)
      win.webContents.send('window-maximized-state', false);
    }
  });

  // Cargar UI
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  win.once('ready-to-show', () => {
    centerWindow(win);
    boundsMap.set(win, win.getBounds());
    maximizedMap.set(win, false);
    win.show();
  });

  // Solicitar estado de adblock al renderer
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('request-initial-adblock');
  });

  // Jumplist (Windows)
  if (process.platform === 'win32') {
    const { app } = require('electron');
    app.setUserTasks([
      {
        program: process.execPath,
        arguments: '--new-tab',
        iconPath: process.execPath,
        iconIndex: 0,
        title: 'Nueva Pestaña',
        description: 'Abre una nueva pestaña'
      },
      {
        program: process.execPath,
        arguments: '--settings',
        iconPath: process.execPath,
        iconIndex: 0,
        title: 'Ajustes',
        description: 'Abre la configuración'
      }
    ]);
  }

  return win;
}

module.exports = {
  createWindow,
  registerWindowHandlers
};
