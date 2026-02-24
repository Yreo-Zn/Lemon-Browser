/**
 * LEMON BROWSER — Seguridad (Main Process)
 * ==========================================
 * - Content Security Policy (CSP) para páginas internas
 * - will-attach-webview: forzar contextIsolation en webviews dinámicos
 * - web-contents-created: manejar new-window y context menus de tiendas de extensiones
 */

const { app, session, BrowserWindow, Menu, MenuItem } = require('electron');
const path = require('path');

/**
 * Configura CSP headers para la sesión por defecto.
 * Solo aplica a páginas locales (file://); las externas mantienen sus propios headers.
 */
function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Solo inyectar CSP en páginas propias (file://)
    if (details.url.startsWith('file://')) {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' https:; " +
            "frame-src 'none'"
          ]
        }
      });
    } else {
      callback({ responseHeaders: details.responseHeaders });
    }
  });
}

/**
 * Registra handler will-attach-webview en la ventana principal
 * para forzar seguridad en todos los webviews creados dinámicamente.
 */
function setupWebviewSecurity(win) {
  win.webContents.on('will-attach-webview', (_event, webPreferences, _params) => {
    // Forzar aislamiento de contexto en todos los webviews
    webPreferences.contextIsolation = true;
    webPreferences.nodeIntegration = false;

    // Siempre inyectar preload de settings — el webview puede adjuntarse con
    // src="about:blank" y luego cambiar a settings.html, por lo que no podemos
    // filtrar por params.src. Solo existe un webview interno (settings).
    webPreferences.preload = path.join(__dirname, '..', 'preload-settings.js');
  });
}

/**
 * Configura handlers globales de web-contents-created:
 * - Gestión de popups (target="_blank") desde webviews
 * - Menú contextual para instalar extensiones desde Chrome Web Store y Edge Add-ons
 */
function setupWebContentsHandlers() {
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      // Redirigir new-window a nueva pestaña en el renderer principal
      contents.setWindowOpenHandler((details) => {
        const windows = BrowserWindow.getAllWindows();
        const win = windows[0];
        if (win) {
          win.webContents.send('browser-new-tab', details.url);
        }
        return { action: 'deny' };
      });

      // Menú contextual para tiendas de extensiones
      contents.on('context-menu', (_event, params) => {
        const pageURL = params.pageURL;
        if (!pageURL) return;

        // Chrome Web Store
        if (pageURL.includes('chromewebstore.google.com') || pageURL.includes('chrome.google.com/webstore')) {
          const idMatch = pageURL.match(/\/detail\/[^/]+\/([a-z]{32})/);
          if (idMatch && idMatch[1]) {
            showExtensionInstallMenu(idMatch[1], 'Chrome', 'trigger-extension-install');
          }
        }

        // Microsoft Edge Add-ons
        if (pageURL.includes('microsoftedge.microsoft.com/addons')) {
          const idMatch = pageURL.match(/\/detail\/[^/]+\/([a-z]{32})/);
          if (idMatch && idMatch[1]) {
            showExtensionInstallMenu(idMatch[1], 'Edge', 'trigger-edge-extension-install');
          }
        }
      });
    }
  });
}

function showExtensionInstallMenu(extensionId, source, ipcChannel) {
  const menu = new Menu();
  menu.append(new MenuItem({
    label: `Instalar extensión${source === 'Edge' ? ' de Edge' : ''} en Lemon Browser`,
    icon: path.join(__dirname, '..', 'Icon.png'),
    click: () => {
      const windows = BrowserWindow.getAllWindows();
      const win = windows[0];
      if (win) {
        win.webContents.send(ipcChannel, extensionId);
      }
    }
  }));
  menu.popup();
}

/**
 * Inicializa todas las medidas de seguridad.
 * Llamar desde app.whenReady() ANTES de createWindow().
 */
function setupSecurity() {
  setupCSP();
  setupWebContentsHandlers();
}

module.exports = {
  setupSecurity,
  setupWebviewSecurity
};
