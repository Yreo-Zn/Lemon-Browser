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

  const key = inputKey(input);
  const action = dispatchTable[key];
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
        setImmediate(() => {
          centerWindow(win);
          win.webContents.send('window-restored');
          win.webContents.send('window-maximized-state', false);
        });
      } else {
        win.maximize();
        win.webContents.send('window-restored');
        win.webContents.send('window-maximized-state', true);
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
    return 'file://' + path.join(__dirname, '..', 'settings.html').replace(/\\/g, '/');
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
    resizable: true,
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
  win.on('unmaximize', () => win.webContents.send('window-maximized-state', false));

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
