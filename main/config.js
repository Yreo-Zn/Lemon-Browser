/**
 * LEMON BROWSER — Configuración y Constantes (Main Process)
 * ==========================================================
 */

const { app } = require('electron');
const path = require('path');

/** Directorio de datos del usuario (lazy — resuelto cuando app está ready) */
let _dataDir = null;

function getDataDir() {
  if (!_dataDir) {
    _dataDir = path.join(app.getPath('documents'), 'Your_Lemon_Data');
  }
  return _dataDir;
}

/** Dimensiones por defecto de la ventana */
const DEFAULT_WIDTH = 1700;
const DEFAULT_HEIGHT = 1000;

/** Atajos de teclado por defecto */
const DEFAULT_SHORTCUTS = {
  'shortcut-search': { key: 'ArrowUp', ctrl: true, shift: false, alt: false },
  'shortcut-close': { key: 'ArrowDown', ctrl: true, shift: false, alt: false },
  'shortcut-back': { key: 'ArrowLeft', ctrl: true, shift: false, alt: false },
  'shortcut-forward': { key: 'ArrowRight', ctrl: true, shift: false, alt: false },
  'shortcut-tab-next': { key: 'ArrowRight', ctrl: false, shift: false, alt: true },
  'shortcut-tab-prev': { key: 'ArrowLeft', ctrl: false, shift: false, alt: true },
  'shortcut-center-window': { key: 'ArrowUp', ctrl: false, shift: false, alt: true }
};

/**
 * Exportaciones — paths como getters lazy para evitar llamar
 * app.getPath() antes de que Electron esté listo.
 * Compatible con destructuring: const { DATA_DIR } = require('./config');
 */
Object.defineProperties(module.exports, {
  DATA_DIR:            { get: getDataDir, enumerable: true },
  SETTINGS_FILE:       { get: () => path.join(getDataDir(), 'settings.json'), enumerable: true },
  USER_EXTENSIONS_DIR: { get: () => path.join(getDataDir(), 'extensions'), enumerable: true },
});

module.exports.DEFAULT_WIDTH = DEFAULT_WIDTH;
module.exports.DEFAULT_HEIGHT = DEFAULT_HEIGHT;
module.exports.DEFAULT_SHORTCUTS = DEFAULT_SHORTCUTS;
