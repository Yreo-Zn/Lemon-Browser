/**
 * LEMON BROWSER - Proceso Principal (Main Process)
 * ================================================
 * Este archivo gestiona el proceso principal de Electron, incluyendo:
 * - Creación y configuración de la ventana principal
 * - Gestión de extensiones (uBlock Origin)
 * - Manejo de atajos de teclado globales
 * - Persistencia de configuraciones
 * - Jumplist de Windows
 */

const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https'); // Necesario para descargar CRX
const extract = require('extract-zip'); // Necesario para descomprimir .crx (zip)

// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

/** Directorio de datos del usuario */
const DATA_DIR = path.join(app.getPath('documents'), 'Your_Lemon_Data');
/** Archivo de configuración JSON */
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
/** Directorio de extensiones de usuario */
const USER_EXTENSIONS_DIR = path.join(DATA_DIR, 'extensions');

/**
 * Función para convertir un .crx en .zip eliminando la cabecera CRX
 */
function convertCrxToZip(crxPath, zipPath) {
  return new Promise((resolve, reject) => {
    try {
      const buffer = fs.readFileSync(crxPath);

      // Chequear firma 'Cr24' (0x34327243)
      if (buffer.readUInt32LE(0) !== 0x34327243) {
        // No parece un CRX, tal vez ya es un ZIP o es inválido
        // Copiar tal cual por si acaso
        fs.writeFileSync(zipPath, buffer);
        resolve();
        return;
      }

      const version = buffer.readUInt32LE(4);
      let headerSize = 0;

      if (version === 2) {
        const pubKeyLen = buffer.readUInt32LE(8);
        const sigLen = buffer.readUInt32LE(12);
        headerSize = 16 + pubKeyLen + sigLen;
      } else if (version === 3) {
        const headerLen = buffer.readUInt32LE(8);
        headerSize = 12 + headerLen;
      } else {
        reject(new Error(`Versión CRX no soportada: ${version}`));
        return;
      }

      const zipBuffer = buffer.slice(headerSize);
      fs.writeFileSync(zipPath, zipBuffer);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/** Dimensiones por defecto de la ventana */
const DEFAULT_WIDTH = 1700;
const DEFAULT_HEIGHT = 1000;

/** ID de la extensión uBlock Origin (se asigna cuando se carga) */
let uBlockExtensionId = null;

/** Atajos de teclado por defecto */
let currentShortcuts = {
  'shortcut-search': { key: 'ArrowUp', ctrl: true, shift: false, alt: false },
  'shortcut-close': { key: 'ArrowDown', ctrl: true, shift: false, alt: false },
  'shortcut-back': { key: 'ArrowLeft', ctrl: true, shift: false, alt: false },
  'shortcut-forward': { key: 'ArrowRight', ctrl: true, shift: false, alt: false },
  'shortcut-tab-next': { key: 'ArrowRight', ctrl: false, shift: false, alt: true },
  'shortcut-tab-prev': { key: 'ArrowLeft', ctrl: false, shift: false, alt: true },
  'shortcut-center-window': { key: 'ArrowUp', ctrl: false, shift: false, alt: true }
};

// ============================================================================
// INICIALIZACIÓN Y CONFIGURACIÓN DE LA APP
// ============================================================================

// Crear directorio de datos si no existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Cargar configuración inicial (síncrona) para decidir si cargar uBlock al inicio
let initialSettings = {};
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    initialSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  }
} catch (e) {
  console.error('Error cargando configuración inicial:', e);
}

// 1. Ya no usaremos appendSwitch aquí para las extensiones de usuario, 
// las cargaremos dinámicamente al iniciar la sesión para mayor fiabilidad.


// Deshabilitar aceleración de hardware para mejor compatibilidad con transparencia
app.disableHardwareAcceleration();

// Establecer nombre de la aplicación
app.setName('Lemon Browser');

// ============================================================================
// FUNCIONES DE GESTIÓN DE ADBLOCK (uBlock Origin)
// ============================================================================

// ============================================================================
// GESTIÓN DE EXTENSIONES DE USUARIO
// ============================================================================

/**
 * Lógica interna para instalar extensión (reutilizable)
 */
async function installExtensionInternal(filePath) {
  try {
    const fileName = path.basename(filePath, path.extname(filePath));
    // Si viene de temp con ID, usamos el ID como nombre de carpeta, si no, el nombre del archivo
    let destDirName = fileName;

    // Si es un ID de extensión (32 chars a-p), usarlo directamente
    if (/^[a-z]{32}$/.test(fileName)) {
      destDirName = fileName;
    }

    const destDir = path.join(USER_EXTENSIONS_DIR, destDirName);

    // Crear directorio destino
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Descomprimir
    await extract(filePath, { dir: destDir });

    // Cargar en la sesión actual
    const ext = await session.defaultSession.extensions.loadExtension(destDir);

    console.log(`Extensión instalada: ${ext.name} (${ext.id})`);
    return { success: true, name: ext.name, id: ext.id };
  } catch (error) {
    console.error('Error instalando extensión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Instala una extensión desde un archivo .crx o .zip
 * @param {string} filePath Ruta al archivo .crx
 */
ipcMain.handle('install-extension', async (event, filePath) => {
  return await installExtensionInternal(filePath);
});

/**
 * Obtiene la lista de extensiones instaladas (excluyendo internas si se desea)
 */
ipcMain.handle('get-extensions-list', async () => {
  const extensions = session.defaultSession.extensions.getAllExtensions();
  // Filtrar o formatear según necesidad. Devolvemos info básica.
  return extensions.map(e => ({
    id: e.id,
    name: e.name,
    description: e.description,
    version: e.version,
    path: e.path,
    icon: '' // Podríamos intentar obtener el icono del manifest
  }));
});


/**
 * Descarga y guarda una extensión desde la Chrome Web Store
 */
ipcMain.handle('download-and-install-crx', async (event, extensionId) => {
  try {
    console.log(`Iniciando descarga de extensión: ${extensionId}`);
    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=133.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;

    const tempPath = path.join(app.getPath('temp'), `${extensionId}.crx`);
    const downloadFile = (url, dest, cb) => {
      const file = fs.createWriteStream(dest);
      const protocol = url.startsWith('https') ? https : require('http');

      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          downloadFile(response.headers.location, dest, cb);
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => cb(null));
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => { });
        cb(err);
      });
    };

    await new Promise((resolve, reject) => {
      downloadFile(crxUrl, tempPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Descarga completada, convirtiendo a ZIP e instalando...');

    // Convertir CRX a ZIP para poder extraerlo
    const zipPath = path.join(app.getPath('temp'), `${extensionId}.zip`);
    await convertCrxToZip(tempPath, zipPath);

    // Usar la lógica existente de instalación con el ZIP
    const result = await installExtensionInternal(zipPath);

    // Limpiar archivos temporales
    fs.unlink(tempPath, () => { });
    fs.unlink(zipPath, () => { });

    return result;

  } catch (error) {
    console.error('Error descargando extensión:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Descarga y guarda una extensión desde Microsoft Edge Add-ons
 */
ipcMain.handle('download-and-install-edge-crx', async (event, extensionId) => {
  try {
    console.log(`Iniciando descarga de extensión Edge: ${extensionId}`);
    // URL descubierta para Edge Add-ons
    const crxUrl = `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;

    const tempPath = path.join(app.getPath('temp'), `${extensionId}_edge.crx`);
    const downloadFile = (url, dest, cb) => {
      const file = fs.createWriteStream(dest);
      const protocol = url.startsWith('https') ? https : require('http');

      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          downloadFile(response.headers.location, dest, cb);
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => cb(null));
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => { });
        cb(err);
      });
    };

    await new Promise((resolve, reject) => {
      downloadFile(crxUrl, tempPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Descarga Edge completada, convirtiendo a ZIP e instalando...');

    // Convertir CRX a ZIP
    const zipPath = path.join(app.getPath('temp'), `${extensionId}_edge.zip`);
    await convertCrxToZip(tempPath, zipPath);

    // Instalar
    const result = await installExtensionInternal(zipPath);

    // Limpiar
    fs.unlink(tempPath, () => { });
    fs.unlink(zipPath, () => { });

    return result;

  } catch (error) {
    console.error('Error descargando extensión Edge:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Elimina una extensión de usuario
 */
ipcMain.handle('remove-extension', async (event, extensionId) => {
  try {
    const ext = session.defaultSession.extensions.getExtension(extensionId);
    if (!ext) return { success: false, error: 'Extensión no encontrada' };

    // Solo permitir borrar si está en USER_EXTENSIONS_DIR para proteger uBlock interno
    if (!ext.path.startsWith(USER_EXTENSIONS_DIR)) {
      return { success: false, error: 'No se puede eliminar una extensión del sistema' };
    }

    await session.defaultSession.extensions.removeExtension(extensionId);

    // Eliminar archivos
    // Nota: 'ext.path' es la ruta absoluta al directorio de la extensión
    if (fs.existsSync(ext.path)) {
      fs.rmSync(ext.path, { recursive: true, force: true });
    }

    return { success: true };
  } catch (error) {
    console.error('Error eliminando extensión:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Abre la página de opciones de la extensión
 */
ipcMain.on('open-extension-options', (event, extensionId) => {
  const ext = session.defaultSession.extensions.getExtension(extensionId);

  if (ext && (ext.manifest.options_page || (ext.manifest.options_ui && ext.manifest.options_ui.page))) {
    const optionsPage = ext.manifest.options_page || ext.manifest.options_ui.page;
    const optionsUrl = `chrome-extension://${extensionId}/${optionsPage}`;

    // Crear una ventana dedicada para las opciones ya que los webviews no soportan chrome-extension://
    const optionsWin = new BrowserWindow({
      width: 1000,
      height: 800,
      title: `Opciones - ${ext.name}`,
      icon: path.join(__dirname, 'Icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    optionsWin.setMenu(null);
    optionsWin.loadURL(optionsUrl);
  } else {
    console.log('La extensión no tiene página de opciones definida en manifest.');
  }
});


// ============================================================================
// FUNCIONES DE GESTIÓN DE ADBLOCK (uBlock Origin)
// ============================================================================

/**
 * Habilita el adblocker (uBlock Origin) dinámicamente
 * Si ya está cargado vía switch, no hace nada
 */
async function enableAdblocker() {
  if (uBlockExtensionId) return;

  const ses = session.defaultSession;

  // Verificar si ya está cargada
  const extensions = ses.extensions.getAllExtensions();
  const existing = extensions.find(e => e.name === 'uBlock Origin');

  if (existing) {
    uBlockExtensionId = existing.id;
    console.log(`uBlock Origin ya activo (ID detectado: ${uBlockExtensionId})`);
    return;
  }

  // Cargar extensión si no existe
  try {
    const extensionPath = path.join(__dirname, 'extensions', 'ublock');
    const ext = await ses.extensions.loadExtension(extensionPath);
    uBlockExtensionId = ext.id;
    console.log('uBlock Origin habilitado (recién cargado)');
  } catch (error) {
    console.error('Error al habilitar uBlock Origin:', error);
  }
}

/**
 * Carga todas las extensiones guardadas en el disco
 */
async function loadStoredExtensions() {
  console.log('Cargando extensiones guardadas...');

  // 1. uBlock si está habilitado
  if (initialSettings['adblock-toggle'] === true) {
    await enableAdblocker();
  }

  // 2. Extensiones de usuario
  if (fs.existsSync(USER_EXTENSIONS_DIR)) {
    const folders = fs.readdirSync(USER_EXTENSIONS_DIR).filter(file => {
      return fs.statSync(path.join(USER_EXTENSIONS_DIR, file)).isDirectory();
    });

    for (const folder of folders) {
      const extPath = path.join(USER_EXTENSIONS_DIR, folder);
      try {
        const ext = await session.defaultSession.extensions.loadExtension(extPath);
        console.log(`Cargada extensión persistente: ${ext.name} (${ext.id})`);
      } catch (err) {
        console.error(`Error cargando extensión en ${extPath}:`, err);
      }
    }
  }
}

/**
 * Deshabilita el adblocker (uBlock Origin)
 */
function disableAdblocker() {
  if (uBlockExtensionId) {
    session.defaultSession.extensions.removeExtension(uBlockExtensionId);
    uBlockExtensionId = null;
    console.log('uBlock Origin deshabilitado');
  } else {
    // Buscar por nombre si el ID no está disponible
    const extensions = session.defaultSession.extensions.getAllExtensions();
    const existing = extensions.find(e => e.name === 'uBlock Origin');
    if (existing) {
      session.defaultSession.extensions.removeExtension(existing.id);
      console.log('uBlock Origin deshabilitado (detectado por nombre)');
    }
  }
}

// ============================================================================
// CREACIÓN DE VENTANA PRINCIPAL
// ============================================================================

/**
 * Crea la ventana principal del navegador
 */
function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: width,
    height: height,
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
    icon: path.join(__dirname, 'Icon.png'),
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      backgroundThrottling: false
    }
  });

  win.setMenu(null);

  // ========================================================================
  // MANEJO DE INPUTS Y ATAJOS DE TECLADO
  // ========================================================================

  /**
   * Maneja los eventos de teclado antes de que lleguen a la página
   * @param {Event} event - Evento de Electron
   * @param {Object} input - Objeto con información del input
   */
  const handleInput = (event, input) => {
    if (input.type === 'keyDown') {
      const shortcuts = {
        back: currentShortcuts['shortcut-back'],
        forward: currentShortcuts['shortcut-forward'],
        search: currentShortcuts['shortcut-search'],
        close: currentShortcuts['shortcut-close'],
        nextTab: currentShortcuts['shortcut-tab-next'],
        prevTab: currentShortcuts['shortcut-tab-prev'],
        centerWin: currentShortcuts['shortcut-center-window']
      };

      /**
       * Compara si un input coincide con un atajo configurado
       */
      const matchesShortcut = (shortcut) =>
        input.key === shortcut.key &&
        input.control === shortcut.ctrl &&
        input.shift === shortcut.shift &&
        input.alt === shortcut.alt;

      // Navegación hacia atrás
      if (matchesShortcut(shortcuts.back)) {
        win.webContents.send('browser-go-back');
        event.preventDefault();
      }
      // Navegación hacia adelante
      else if (matchesShortcut(shortcuts.forward)) {
        win.webContents.send('browser-go-forward');
        event.preventDefault();
      }
      // Enfocar barra de búsqueda
      else if (matchesShortcut(shortcuts.search)) {
        win.webContents.send('browser-focus-search');
        event.preventDefault();
      }
      // Cerrar pestaña actual
      else if (shortcuts.close && matchesShortcut(shortcuts.close)) {
        win.webContents.send('browser-close-tab');
        event.preventDefault();
      }
      // Siguiente pestaña
      else if (shortcuts.nextTab && matchesShortcut(shortcuts.nextTab)) {
        win.webContents.send('browser-next-tab');
        event.preventDefault();
      }
      // Pestaña anterior
      else if (shortcuts.prevTab && matchesShortcut(shortcuts.prevTab)) {
        win.webContents.send('browser-prev-tab');
        event.preventDefault();
      }
      // Centrar ventana
      else if (shortcuts.centerWin && matchesShortcut(shortcuts.centerWin)) {
        centerWindow(win);
        event.preventDefault();
      }
    }
  };

  /**
   * Centra la ventana en la pantalla con las dimensiones por defecto
   * @param {BrowserWindow} win - Ventana a centrar
   */
  function centerWindow(win) {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const x = Math.round((width - DEFAULT_WIDTH) / 2);
    const y = Math.round((height - DEFAULT_HEIGHT) / 2);

    win.setBounds({
      x: x,
      y: y,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT
    });
  }

  // Registrar manejadores de input
  win.webContents.on('before-input-event', handleInput);
  win.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.on('before-input-event', handleInput);
  });

  win.on('maximize', () => {
    win.webContents.send('window-maximized-state', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('window-maximized-state', false);
  });

  // Cargar interfaz
  win.loadFile('index.html');



  // Mostrar ventana con pequeño delay para suavizar aparición
  win.once('ready-to-show', () => {
    setTimeout(() => {
      win.show();
    }, 100);
  });

  // ========================================================================
  // MANEJADORES IPC (Comunicación con Renderer)
  // ========================================================================

  /** Controlar eventos del ratón (modo fantasma) */
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  /** Minimizar ventana */
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  /** Maximizar/restaurar ventana */
  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
        // Centrar después de desmaximizar
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

  /** Cerrar ventana */
  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  // Manejo de arrastre de ventana
  let isDragging = false;
  let offsetX, offsetY;

  ipcMain.on('window-drag-start', (event, { mouseX, mouseY }) => {
    isDragging = true;
    offsetX = mouseX;
    offsetY = mouseY;
  });

  ipcMain.on('window-drag-move', (event, { screenX, screenY }) => {
    if (!isDragging) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setPosition(screenX - offsetX, screenY - offsetY);
    }
  });

  ipcMain.on('window-drag-end', () => {
    isDragging = false;
  });

  /** Actualizar atajos de teclado desde renderer */
  ipcMain.on('update-shortcuts', (event, shortcuts) => {
    currentShortcuts = shortcuts;
  });

  /** Habilitar/deshabilitar adblock dinámicamente */
  ipcMain.on('set-adblock-enabled', (event, enabled) => {
    if (enabled) {
      enableAdblocker();
    } else {
      disableAdblocker();
    }
  });

  /** Solicitar estado inicial de adblock al renderer */
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('request-initial-adblock');
  });

  // ========================================================================
  // MANEJO DE CONFIGURACIÓN PERSISTENTE
  // ========================================================================

  /** Obtener configuración guardada */
  ipcMain.handle('get-settings', async () => {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Error leyendo configuración:', err);
    }
    return {};
  });

  /** Guardar configuración */
  ipcMain.on('save-settings', (event, settings) => {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    } catch (err) {
      console.error('Error guardando configuración:', err);
    }
  });

  /** Abrir carpeta de datos */
  ipcMain.on('open-data-folder', () => {
    shell.openPath(DATA_DIR).catch(err => {
      console.error('Error abriendo carpeta de datos:', err);
    });
  });

  /** Obtener el estado de maximización actual */
  ipcMain.handle('get-maximized-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });

  // ========================================================================
  // JUMPLIST DE WINDOWS
  // ========================================================================

  if (process.platform === 'win32') {
    app.setUserTasks([
      {
        program: process.execPath,
        arguments: '--new-tab',
        iconPath: process.execPath,
        iconIndex: 0,
        title: 'Nueva Pestaña',
        description: 'Abre una nueva pestaña en el navegador'
      },
      {
        program: process.execPath,
        arguments: '--settings',
        iconPath: process.execPath,
        iconIndex: 0,
        title: 'Ajustes',
        description: 'Abre la configuración del navegador'
      }
    ]);
  }
}

// ============================================================================
// EVENTOS DE LA APLICACIÓN
// ============================================================================

/** Manejar argumentos de Jumplist (segunda instancia) */
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

/** Inicialización de la app */
app.whenReady().then(async () => {
  await loadStoredExtensions();
  createWindow();

  // NUEVO: Manejar creación de nuevas ventanas desde webviews (target="_blank")
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler((details) => {
        // Fallback robusto: Enviar a la primera ventana (la principal)
        const windows = BrowserWindow.getAllWindows();
        const win = windows[0];

        if (win) {
          win.webContents.send('browser-new-tab', details.url);
        }
        return { action: 'deny' };
      });

      // MENÚ CONTEXTUAL PARA CHROME WEB STORE (EN WEBVIEWS)
      contents.on('context-menu', (event, params) => {
        const pageURL = params.pageURL;
        // Detectar si estamos en la Chrome Web Store
        if (pageURL && (pageURL.includes('chromewebstore.google.com') || pageURL.includes('chrome.google.com/webstore'))) {
          // Intentar extraer el ID de la extensión de la URL
          // URL típica: https://chromewebstore.google.com/detail/nombre-extension/id-extension
          const idMatch = pageURL.match(/\/detail\/[^\/]+\/([a-z]{32})/);

          if (idMatch && idMatch[1]) {
            const extensionId = idMatch[1];
            const { Menu, MenuItem, BrowserWindow } = require('electron');
            const menu = new Menu();

            menu.append(new MenuItem({
              label: 'Instalar extensión en Lemon Browser',
              icon: path.join(__dirname, 'Icon.png'), // Opcional si tienes icono pequeño
              click: () => {
                const windows = BrowserWindow.getAllWindows();
                const win = windows[0]; // Asumimos ventana principal

                if (win) {
                  // Enviar mensaje al renderer para mostrar feedback
                  win.webContents.executeJavaScript(`alert('Iniciando instalación de la extensión... Por favor espera.')`);
                  win.webContents.send('trigger-extension-install', extensionId);
                }
              }
            }));

            // Mostrar menú incluso si no hay otros items, o añadirse a los existentes?
            // popup() muestra un menú nuevo (reemplazando al nativo si lo llamamos así)
            // Para añadir a los items existentes necesitaríamos interceptar el menú nativo, 
            // pero Electron a veces lo complica. Popup es lo más seguro para "nuestra" opción.
            // Si el usuario quiere copiar/pegar, usará atajos. Vamos a probar con popup.
            menu.popup();
          }
        }

        // MENÚ CONTEXTUAL PARA MICROSOFT EDGE ADDONS
        if (pageURL && (pageURL.includes('microsoftedge.microsoft.com/addons'))) {
          // URL típica: https://microsoftedge.microsoft.com/addons/detail/nombre/id
          // ID es 32 chars a-p
          const idMatch = pageURL.match(/\/detail\/[^\/]+\/([a-z]{32})/);

          if (idMatch && idMatch[1]) {
            const extensionId = idMatch[1];
            const { Menu, MenuItem, BrowserWindow } = require('electron');
            const menu = new Menu();

            menu.append(new MenuItem({
              label: 'Instalar extensión de Edge en Lemon Browser',
              icon: path.join(__dirname, 'Icon.png'),
              click: () => {
                const windows = BrowserWindow.getAllWindows();
                const win = windows[0];

                if (win) {
                  win.webContents.executeJavaScript(`alert('Iniciando instalación de la extensión de Edge... Por favor espera.')`);
                  // Usamos un evento diferente para distinguir el origen si fuera necesario, 
                  // o pasamos el source. Vamos a usar un evento nuevo 'trigger-edge-extension-install'
                  win.webContents.send('trigger-edge-extension-install', extensionId);
                }
              }
            }));

            menu.popup();
          }
        }
      });
    }
  });
});

/** Cerrar app cuando todas las ventanas se cierran (excepto en macOS) */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});