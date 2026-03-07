/**
 * LEMON BROWSER — Gestión de Extensiones y Adblock (Main Process)
 * =================================================================
 * - Conversión CRX → ZIP
 * - Instalación, descarga y eliminación de extensiones
 * - Gestión de uBlock Origin (adblock)
 * - Carga de extensiones persistidas al inicio
 */

const { session, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const extract = require('extract-zip');
const { USER_EXTENSIONS_DIR } = require('./config');
const { createLogger } = require('./logger');
const { getFramework } = require('./constitution');

const log = createLogger('extensions');

// ── Constitutional helpers ──────────────────────────────────────

/**
 * Log a browser action to the constitutional audit trail (PETREA 3).
 * Fails silently if the constitution is not active.
 */
function auditLog(entry) {
  try {
    const fw = getFramework();
    if (!fw || !fw.isInitialized) return;
    const audit = fw.getPetrea('auditTrail');
    audit.log(entry);
  } catch { /* constitution not ready — non-blocking */ }
}

/**
 * Validate an extension before installation via PETREA 5.
 * Returns { allowed, reason } — allowed is always true if constitution is inactive.
 */
function constitutionValidateExtension(manifest) {
  try {
    const fw = getFramework();
    if (!fw || !fw.isInitialized) return { allowed: true, reason: 'constitution-inactive' };
    const validator = fw.getPetrea('extensionValidator');

    // Check if already whitelisted
    if (manifest.id && validator.isWhitelisted(manifest.id)) {
      return { allowed: true, reason: 'whitelisted' };
    }

    // Validate manifest structure
    validator.validateManifest(manifest);
    return { allowed: true, reason: 'manifest-valid' };
  } catch (err) {
    return { allowed: false, reason: err.message };
  }
}

/**
 * Register a successfully installed extension in the PETREA 5 whitelist.
 */
async function constitutionWhitelistExtension(manifest) {
  try {
    const fw = getFramework();
    if (!fw || !fw.isInitialized) return;
    const validator = fw.getPetrea('extensionValidator');
    await validator.whitelistExtension(manifest);
  } catch { /* non-blocking */ }
}

/** ID de la extensión uBlock Origin (se asigna cuando se carga) */
let uBlockExtensionId = null;

// ── Utilidades CRX ──────────────────────────────────────────────

/**
 * Convierte un .crx en .zip eliminando la cabecera CRX
 */
function convertCrxToZip(crxPath, zipPath) {
  return new Promise((resolve, reject) => {
    fs.promises.readFile(crxPath).then(buffer => {
      if (buffer.readUInt32LE(0) !== 0x34327243) {
        fs.promises.writeFile(zipPath, buffer).then(resolve).catch(reject);
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
      fs.promises.writeFile(zipPath, zipBuffer).then(resolve).catch(reject);
    }).catch(reject);
  });
}

// ── Instalación interna ─────────────────────────────────────────

async function installExtensionInternal(filePath) {
  try {
    const fileName = path.basename(filePath, path.extname(filePath));
    let destDirName = fileName;

    if (/^[a-z]{32}$/.test(fileName)) {
      destDirName = fileName;
    }

    const destDir = path.join(USER_EXTENSIONS_DIR, destDirName);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    await extract(filePath, { dir: destDir });

    // ── PETREA 5: Validate extension manifest before loading ──
    const manifestPath = path.join(destDir, 'manifest.json');
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.id = manifest.id || destDirName;
      const check = constitutionValidateExtension(manifest);
      if (!check.allowed) {
        log.warn('Extension blocked by constitution', { name: manifest.name, reason: check.reason });
        auditLog({ event: 'extension_blocked', name: manifest.name, reason: check.reason, severity: 'WARNING' });
        fs.rmSync(destDir, { recursive: true, force: true });
        return { success: false, error: `Bloqueada por la constitución: ${check.reason}` };
      }
    }

    const ext = await session.defaultSession.extensions.loadExtension(destDir);
    log.info(`Extensión instalada: ${ext.name} (${ext.id})`);

    // ── PETREA 5: Whitelist + PETREA 3: Audit ─────────────────
    await constitutionWhitelistExtension({ id: ext.id, name: ext.name, version: ext.version, permissions: manifest.permissions || [] });
    auditLog({ event: 'extension_installed', name: ext.name, id: ext.id, version: ext.version });

    return { success: true, name: ext.name, id: ext.id };
  } catch (error) {
    log.error('Error instalando extensión', { message: error.message });
    auditLog({ event: 'extension_install_failed', error: error.message, severity: 'WARNING' });
    return { success: false, error: error.message };
  }
}

// ── Descarga helpers ────────────────────────────────────────────

function downloadFile(url, dest, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Demasiados redirects'));
      return;
    }
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : require('http');

    protocol.get(url, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        file.close();
        fs.unlink(dest, () => {});
        downloadFile(response.headers.location, dest, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${response.statusCode} descargando extensión`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// ── Adblock (uBlock Origin) ────────────────────────────────────

async function enableAdblocker() {
  if (uBlockExtensionId) return;

  const ses = session.defaultSession;
  const extensions = ses.extensions.getAllExtensions();
  const existing = extensions.find(e => e.name === 'uBlock Origin');

  if (existing) {
    uBlockExtensionId = existing.id;
    log.info(`uBlock Origin ya activo (ID: ${uBlockExtensionId})`);
    return;
  }

  try {
    const extensionPath = path.join(__dirname, '..', 'extensions', 'ublock');
    const ext = await ses.extensions.loadExtension(extensionPath);
    uBlockExtensionId = ext.id;
    log.info('uBlock Origin habilitado');
  } catch (error) {
    log.error('Error al habilitar uBlock Origin', { message: error.message });
  }
}

function disableAdblocker() {
  if (uBlockExtensionId) {
    session.defaultSession.extensions.removeExtension(uBlockExtensionId);
    uBlockExtensionId = null;
    log.info('uBlock Origin deshabilitado');
  } else {
    const extensions = session.defaultSession.extensions.getAllExtensions();
    const existing = extensions.find(e => e.name === 'uBlock Origin');
    if (existing) {
      session.defaultSession.extensions.removeExtension(existing.id);
      log.info('uBlock Origin deshabilitado (por nombre)');
    }
  }
}

// ── Carga de extensiones al inicio ──────────────────────────────

async function loadStoredExtensions(initialSettings) {
  log.info('Cargando extensiones guardadas...');

  if (initialSettings['adblock-toggle'] === true) {
    await enableAdblocker();
  }

  if (fs.existsSync(USER_EXTENSIONS_DIR)) {
    const folders = fs.readdirSync(USER_EXTENSIONS_DIR).filter(file =>
      fs.statSync(path.join(USER_EXTENSIONS_DIR, file)).isDirectory()
    );

    for (const folder of folders) {
      const extPath = path.join(USER_EXTENSIONS_DIR, folder);
      try {
        const ext = await session.defaultSession.extensions.loadExtension(extPath);
        log.info(`Cargada extensión: ${ext.name} (${ext.id})`);
      } catch (err) {
        log.error(`Error cargando extensión en ${extPath}`, { message: err.message });
      }
    }
  }
}

// ── Registro de IPC handlers ────────────────────────────────────

function registerExtensionHandlers(app) {
  // Adblock toggle desde el renderer
  ipcMain.on('set-adblock-enabled', async (_event, enabled) => {
    if (enabled) {
      await enableAdblocker();
    } else {
      disableAdblocker();
    }
  });

  ipcMain.handle('install-extension', async (_event, filePath) => {
    return await installExtensionInternal(filePath);
  });

  ipcMain.handle('get-extensions-list', async () => {
    const extensions = session.defaultSession.extensions.getAllExtensions();
    return extensions.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      version: e.version,
      path: e.path,
      icon: ''
    }));
  });

  ipcMain.handle('download-and-install-crx', async (_event, extensionId) => {
    try {
      log.info(`Descargando extensión: ${extensionId}`);
      auditLog({ event: 'extension_download_start', source: 'chrome', extensionId });
      const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=133.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
      const tempPath = path.join(app.getPath('temp'), `${extensionId}.crx`);

      await downloadFile(crxUrl, tempPath);

      const zipPath = path.join(app.getPath('temp'), `${extensionId}.zip`);
      await convertCrxToZip(tempPath, zipPath);
      const result = await installExtensionInternal(zipPath);

      fs.unlink(tempPath, () => {});
      fs.unlink(zipPath, () => {});
      return result;
    } catch (error) {
      log.error('Error descargando extensión', { message: error.message });
      auditLog({ event: 'extension_download_failed', source: 'chrome', extensionId, error: error.message, severity: 'WARNING' });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download-and-install-edge-crx', async (_event, extensionId) => {
    try {
      log.info(`Descargando extensión Edge: ${extensionId}`);
      auditLog({ event: 'extension_download_start', source: 'edge', extensionId });
      const crxUrl = `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;
      const tempPath = path.join(app.getPath('temp'), `${extensionId}_edge.crx`);

      await downloadFile(crxUrl, tempPath);

      const zipPath = path.join(app.getPath('temp'), `${extensionId}_edge.zip`);
      await convertCrxToZip(tempPath, zipPath);
      const result = await installExtensionInternal(zipPath);

      fs.unlink(tempPath, () => {});
      fs.unlink(zipPath, () => {});
      return result;
    } catch (error) {
      log.error('Error descargando extensión Edge', { message: error.message });
      auditLog({ event: 'extension_download_failed', source: 'edge', extensionId, error: error.message, severity: 'WARNING' });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-extension', async (_event, extensionId) => {
    try {
      const ext = session.defaultSession.extensions.getExtension(extensionId);
      if (!ext) return { success: false, error: 'Extensión no encontrada' };

      if (!ext.path.startsWith(USER_EXTENSIONS_DIR)) {
        return { success: false, error: 'No se puede eliminar una extensión del sistema' };
      }

      await session.defaultSession.extensions.removeExtension(extensionId);
      auditLog({ event: 'extension_removed', name: ext.name, id: extensionId });

      if (fs.existsSync(ext.path)) {
        fs.rmSync(ext.path, { recursive: true, force: true });
      }

      return { success: true };
    } catch (error) {
      log.error('Error eliminando extensión', { message: error.message });
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('open-extension-options', (_event, extensionId) => {
    const ext = session.defaultSession.extensions.getExtension(extensionId);

    if (ext && (ext.manifest.options_page || (ext.manifest.options_ui && ext.manifest.options_ui.page))) {
      const optionsPage = ext.manifest.options_page || ext.manifest.options_ui.page;
      const optionsUrl = `chrome-extension://${extensionId}/${optionsPage}`;

      const optionsWin = new BrowserWindow({
        width: 1000,
        height: 800,
        title: `Opciones - ${ext.name}`,
        icon: path.join(__dirname, '..', 'Icon.png'),
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });

      optionsWin.setMenu(null);
      optionsWin.loadURL(optionsUrl);
    }
  });
}

module.exports = {
  registerExtensionHandlers,
  loadStoredExtensions,
  enableAdblocker,
  disableAdblocker
};
