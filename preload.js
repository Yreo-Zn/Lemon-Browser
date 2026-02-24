/**
 * LEMON BROWSER - Preload Script (Main Window)
 * ==============================================
 * Security bridge between main process and renderer.
 * Exposes only the minimum required IPC API surface via contextBridge.
 * 
 * Constitutional compliance: Art. 17sexies (hostilidad universal),
 * §17.4-17.5 (browser action permission scoping).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Settings ──────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),

  // ── Window Controls ───────────────────────────────────────────
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  getMaximizedState: () => ipcRenderer.invoke('get-maximized-state'),

  // ── Ghost Mode (Mouse Events) ────────────────────────────────
  setIgnoreMouseEvents: (ignore, options) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore, options),

  // ── Window Drag ───────────────────────────────────────────────
  windowDragStart: (data) => ipcRenderer.send('window-drag-start', data),
  windowDragMove: (data) => ipcRenderer.send('window-drag-move', data),
  windowDragEnd: () => ipcRenderer.send('window-drag-end'),

  // ── Shortcuts ─────────────────────────────────────────────────
  updateShortcuts: (shortcuts) => ipcRenderer.send('update-shortcuts', shortcuts),

  // ── Adblock ───────────────────────────────────────────────────
  setAdblockEnabled: (enabled) => ipcRenderer.send('set-adblock-enabled', enabled),

  // ── Data Folder ───────────────────────────────────────────────
  openDataFolder: () => ipcRenderer.send('open-data-folder'),

  // ── Path Helpers ──────────────────────────────────────────────
  getSettingsUrl: () => ipcRenderer.invoke('get-settings-url'),

  // ── Events from Main Process ──────────────────────────────────
  onRequestInitialAdblock: (callback) =>
    ipcRenderer.on('request-initial-adblock', () => callback()),
  onWindowMaximizedState: (callback) =>
    ipcRenderer.on('window-maximized-state', (_e, isMaximized) => callback(isMaximized)),
  onWindowRestored: (callback) =>
    ipcRenderer.on('window-restored', () => callback()),
  onBrowserGoBack: (callback) =>
    ipcRenderer.on('browser-go-back', () => callback()),
  onBrowserGoForward: (callback) =>
    ipcRenderer.on('browser-go-forward', () => callback()),
  onBrowserFocusSearch: (callback) =>
    ipcRenderer.on('browser-focus-search', () => callback()),
  onBrowserNextTab: (callback) =>
    ipcRenderer.on('browser-next-tab', () => callback()),
  onBrowserPrevTab: (callback) =>
    ipcRenderer.on('browser-prev-tab', () => callback()),
  onBrowserCloseTab: (callback) =>
    ipcRenderer.on('browser-close-tab', () => callback()),
  onBrowserNewTab: (callback) =>
    ipcRenderer.on('browser-new-tab', (_e, url) => callback(url)),
  onTriggerExtensionInstall: (callback) =>
    ipcRenderer.on('trigger-extension-install', (_e, extensionId) => callback(extensionId)),
  onTriggerEdgeExtensionInstall: (callback) =>
    ipcRenderer.on('trigger-edge-extension-install', (_e, extensionId) => callback(extensionId)),
  onOpenSettingsRequested: (callback) =>
    ipcRenderer.on('open-settings-requested', () => callback()),
});
