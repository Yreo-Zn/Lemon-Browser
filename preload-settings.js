/**
 * LEMON BROWSER - Preload Script (Settings Webview)
 * ===================================================
 * Security bridge for the settings page loaded in a <webview>.
 * Exposes only settings-specific IPC + sendToHost via contextBridge.
 *
 * Constitutional compliance: Art. 17sexies §17sexies.3 (aislamiento de contexto).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Settings Persistence ──────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),

  // ── Data Folder ───────────────────────────────────────────────
  openDataFolder: () => ipcRenderer.send('open-data-folder'),

  // ── Extension Management ──────────────────────────────────────
  installExtension: (filePath) => ipcRenderer.invoke('install-extension', filePath),
  downloadAndInstallCrx: (extensionId) => ipcRenderer.invoke('download-and-install-crx', extensionId),
  downloadAndInstallEdgeCrx: (extensionId) => ipcRenderer.invoke('download-and-install-edge-crx', extensionId),
  getExtensionsList: () => ipcRenderer.invoke('get-extensions-list'),
  removeExtension: (extensionId) => ipcRenderer.invoke('remove-extension', extensionId),
  openExtensionOptions: (extensionId) => ipcRenderer.send('open-extension-options', extensionId),

  // ── Communication to Host (renderer) via webview IPC ──────────
  sendToHost: (channel, ...args) => {
    // Allowlist of channels the settings page may send to the host
    const allowedChannels = [
      'close-settings',
      'accent-color-changed',
      'shortcuts-changed',
      'theme-changed',
      'remember-pages-changed',
      'adblock-changed',
      'animation-settings-changed',
      'open-url',
    ];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.sendToHost(channel, ...args);
    }
  },

  // ── Events from Host (renderer sends to settings webview) ─────
  onTriggerExtensionInstall: (callback) =>
    ipcRenderer.on('trigger-extension-install', (_e, extensionId) => callback(extensionId)),
  onTriggerEdgeExtensionInstall: (callback) =>
    ipcRenderer.on('trigger-edge-extension-install', (_e, extensionId) => callback(extensionId)),
});
