/**
 * LEMON BROWSER — Punto de entrada del Main Process (CommonJS)
 * ==============================================================
 * Importa módulos y orquesta el ciclo de vida de la app Electron.
 */

const { app, BrowserWindow, dialog, session } = require('electron');
const fs = require('fs');

const { DATA_DIR, SETTINGS_FILE } = require('./main/config');
const logger = require('./main/logger');
const { setupSecurity } = require('./main/security');
const { registerWindowHandlers, createWindow } = require('./main/window');
const {
  registerExtensionHandlers, loadStoredExtensions
} = require('./main/extensions');
const { registerCoraxHandlers } = require('./main/corax-bridge');
const { initConstitution, shutdownConstitution } = require('./main/constitution');

// ── Crear directorio de datos ───────────────────────────────────
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Inicializar logger ──────────────────────────────────────────
logger.init('info');
const log = logger.createLogger('main');

// ── Manejadores globales de errores (B05) ───────────────────────
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', { message: error.message, stack: error.stack });
  dialog.showErrorBox('Error inesperado', `${error.message}\n\nRevisa los logs en Your_Lemon_Data/logs/`);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  log.error('Unhandled rejection', { message: msg, stack });
});

// ── Cargar configuración inicial (síncrona) ─────────────────────
let initialSettings = {};
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    initialSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  }
} catch (e) {
  log.error('Error cargando configuración inicial', { message: e.message });
}

// ── Configuración de la app ─────────────────────────────────────
app.disableHardwareAcceleration();
app.setName('Lemon Browser');

// ── Instancia única (B01) ───────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {

// ── Segunda instancia (Jumplist) ────────────────────────────────
app.on('second-instance', (event, commandLine) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();

    if (commandLine.includes('--new-tab')) {
      win.webContents.send('browser-focus-search');
    } else if (commandLine.includes('--settings')) {
      win.webContents.send('open-settings-requested');
    }
  }
});

// ── Inicialización ──────────────────────────────────────────────
app.whenReady().then(async () => {
  log.info('App ready — inicializando');
  setupSecurity();
  registerWindowHandlers();
  registerExtensionHandlers(app);
  registerCoraxHandlers();

  // ── Constitución: inicializar framework (fail-safe) ─────────
  await initConstitution(DATA_DIR);

  await loadStoredExtensions(initialSettings);
  createWindow();
  log.info('Ventana creada');
});

// ── Cerrar app ──────────────────────────────────────────────────
app.on('window-all-closed', async () => {
  log.info('Todas las ventanas cerradas');
  await shutdownConstitution();
  logger.close();
  if (process.platform !== 'darwin') app.quit();
});

} // fin de gotLock else
