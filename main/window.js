/**
 * LEMON BROWSER — Ventana Principal y IPC (Main Process)
 * ========================================================
 * - Creación de la ventana del navegador
 * - Atajos de teclado (before-input-event)
 * - IPC handlers: controles de ventana, settings, arrastre
 * - Jumplist de Windows
 */

const { BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { DATA_DIR, SETTINGS_FILE, DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_SHORTCUTS } = require('./config');
const { setupWebviewSecurity } = require('./security');
const { createLogger } = require('./logger');

const log = createLogger('window');

let currentShortcuts = { ...DEFAULT_SHORTCUTS };
let dispatchTable = {};

// ── Funciones auxiliares de ventana ─────────────────────────────

function centerWindow(win) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  win.setBounds({
    x: Math.round((width - DEFAULT_WIDTH) / 2),
    y: Math.round((height - DEFAULT_HEIGHT) / 2),
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT
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

  // Ctrl+D → Bookmark current page
  if (ctrl && !shift && key === 'd') {
    event.preventDefault();
    win.webContents.send('browser-bookmark');
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

  // Ctrl+G → Find next
  if (ctrl && !shift && key === 'g') {
    event.preventDefault();
    win.webContents.send('browser-find-next');
    return;
  }

  // Ctrl+Shift+G → Find previous
  if (ctrl && shift && key === 'g') {
    event.preventDefault();
    win.webContents.send('browser-find-prev');
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
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
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
    if (!win || win.isMaximized()) return;
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
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('get-settings-url', () => {
    return pathToFileURL(path.join(__dirname, '..', 'settings.html')).href;
  });
}

// ── Creación de ventana ─────────────────────────────────────────

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    frame: false,
    thickFrame: false,
    resizable: true,
    minimizable: true,
    maximizable: true,
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

  // Estado de maximización
  win.on('maximize', () => win.webContents.send('window-maximized-state', true));
  win.on('unmaximize', () => {
    win.webContents.send('window-maximized-state', false);
    win.webContents.send('window-restored');
  });

  // Cargar UI
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  win.once('ready-to-show', () => {
    setTimeout(() => win.show(), 100);
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
