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

  // ── Window Resize ─────────────────────────────────────────────
  windowResizeStart: (data) => ipcRenderer.send('window-resize-start', data),
  windowResizeMove: (data) => ipcRenderer.send('window-resize-move', data),
  windowResizeEnd: () => ipcRenderer.send('window-resize-end'),

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

  // ── Standard Browser Actions ──────────────────────────────────
  onBrowserToggleDevtools: (callback) =>
    ipcRenderer.on('browser-toggle-devtools', () => callback()),
  onBrowserReload: (callback) =>
    ipcRenderer.on('browser-reload', () => callback()),
  onBrowserHardReload: (callback) =>
    ipcRenderer.on('browser-hard-reload', () => callback()),
  onBrowserSwitchTab: (callback) =>
    ipcRenderer.on('browser-switch-tab', (_e, index) => callback(index)),
  onBrowserBookmark: (callback) =>
    ipcRenderer.on('browser-bookmark', () => callback()),
  onBrowserEscape: (callback) =>
    ipcRenderer.on('browser-escape', () => callback()),
  onBrowserZoomIn: (callback) =>
    ipcRenderer.on('browser-zoom-in', () => callback()),
  onBrowserZoomOut: (callback) =>
    ipcRenderer.on('browser-zoom-out', () => callback()),
  onBrowserZoomReset: (callback) =>
    ipcRenderer.on('browser-zoom-reset', () => callback()),
  onBrowserFind: (callback) =>
    ipcRenderer.on('browser-find', () => callback()),
  onBrowserFindNext: (callback) =>
    ipcRenderer.on('browser-find-next', () => callback()),
  onBrowserFindPrev: (callback) =>
    ipcRenderer.on('browser-find-prev', () => callback()),
  onBrowserFullscreen: (callback) =>
    ipcRenderer.on('browser-fullscreen', () => callback()),
  onBrowserReopenTab: (callback) =>
    ipcRenderer.on('browser-reopen-tab', () => callback()),
  onBrowserPrint: (callback) =>
    ipcRenderer.on('browser-print', () => callback()),
  onBrowserViewSource: (callback) =>
    ipcRenderer.on('browser-view-source', () => callback()),
  onBrowserHome: (callback) =>
    ipcRenderer.on('browser-home', () => callback()),
  onBrowserBackIfNotInput: (callback) =>
    ipcRenderer.on('browser-back-if-not-input', () => callback()),

  // ── CoRax Bridge ────────────────────────────────────────────────
  coraxGetStatus: () => ipcRenderer.invoke('corax-get-status'),
  coraxGetSkills: () => ipcRenderer.invoke('corax-get-skills'),
  coraxExecute: (command) => ipcRenderer.invoke('corax-execute', command),
  onCoraxAction: (callback) =>
    ipcRenderer.on('corax-action', (_e, action, ...args) => callback(action, ...args)),
  // ── Constitution ───────────────────────────────────────────────────
  constitutionGetHealth: () => ipcRenderer.invoke('constitution-get-health'),
  constitutionGetSoul: () => ipcRenderer.invoke('constitution-get-soul'),
  constitutionGetHeartbeat: () => ipcRenderer.invoke('constitution-get-heartbeat'),
  constitutionGetAudit: (count) => ipcRenderer.invoke('constitution-get-audit', count),
});
