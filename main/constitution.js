/**
 * LEMON BROWSER — Constitution Adapter (Main Process, CJS)
 * ==========================================================
 * Bridge between the CommonJS browser and the ESM constitutional framework.
 * Uses dynamic import() to load the ESM framework within Electron's Node.js 22.
 *
 * RATIONALE:
 * - The browser (main.js) is CommonJS
 * - The constitutional framework (lemon-implementation/) is ESM
 * - Node.js 22 supports await import() from CJS natively
 * - This adapter isolates the bridging so the rest of the browser stays clean
 */

const path = require('path');
const { pathToFileURL } = require('url');
const { createLogger } = require('./logger');

const log = createLogger('constitution');

const FRAMEWORK_PATH = path.join(__dirname, '..', 'lemon-implementation', 'src', 'index.js');
const CONSTITUTION_ROOT = path.join(__dirname, '..', 'corax', 'constitution');

let framework = null;

/**
 * Initialize the constitutional framework.
 * Stores constitutional data inside the browser's own data directory
 * (Your_Lemon_Data/constitution/) to keep a single source of truth.
 *
 * @param {string} dataDir - Browser data directory (Documents/Your_Lemon_Data)
 * @returns {object|null} Framework instance, or null if initialization failed
 */
async function initConstitution(dataDir) {
  try {
    log.info('Loading constitutional framework...');
    const frameworkUrl = pathToFileURL(FRAMEWORK_PATH).href;
    const { LemonConstitutionFramework } = await import(frameworkUrl);

    framework = await LemonConstitutionFramework.create({
      storageDir: path.join(dataDir, 'constitution'),
      constitutionRoot: CONSTITUTION_ROOT,
    });

    // ── PETREA 7: Whitelist extension store domains ───────────
    try {
      const net = framework.getPetrea('networkIsolation');
      const storeDomains = [
        'clients2.google.com',
        'chrome.google.com',
        'chromewebstore.google.com',
        'edge.microsoft.com',
        'microsoftedge.microsoft.com',
      ];
      for (const domain of storeDomains) {
        if (!net.isWhitelisted(domain)) {
          await net.addDomain(domain);
        }
      }
    } catch (err) {
      log.warn('Could not configure extension store domains', { message: err.message });
    }

    // ── PETREA 6: Configure integrity monitor for real browser files ──
    try {
      const integrity = framework.getPetrea('integrityMonitor');
      const browserRoot = path.join(__dirname, '..');
      const criticalBrowserFiles = [
        'main.js',
        'preload.js',
        'main/security.js',
        'main/extensions.js',
        'main/corax-bridge.js',
        'main/constitution.js',
      ];
      // Recompute hashes for the actual browser files
      const newHashes = {};
      const fs = require('fs');
      const crypto = require('crypto');
      for (const file of criticalBrowserFiles) {
        const fullPath = path.join(browserRoot, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          newHashes[fullPath] = crypto.createHash('sha256').update(content).digest('hex');
        } catch { /* file not found — skip */ }
      }
      // Merge browser file hashes into integrity monitor
      Object.assign(integrity.hashes, newHashes);
      log.info('Integrity monitor configured for browser files', {
        files: Object.keys(newHashes).length,
      });
    } catch (err) {
      log.warn('Could not configure integrity monitoring', { message: err.message });
    }

    log.info('Constitutional framework initialized', {
      modules: Object.keys(framework.modules).length,
    });

    return framework;
  } catch (err) {
    log.error('Constitutional framework failed to initialize — browser continues without it', {
      message: err.message,
      stack: err.stack,
    });
    framework = null;
    return null;
  }
}

/**
 * Graceful shutdown of the constitutional framework.
 * Flushes audit trail and preserves soul state before the app closes.
 */
async function shutdownConstitution() {
  if (!framework) return;
  try {
    log.info('Shutting down constitutional framework...');
    await framework.shutdown();
    log.info('Constitutional framework shut down cleanly');
  } catch (err) {
    log.error('Error during constitutional shutdown', { message: err.message });
  } finally {
    framework = null;
  }
}

/**
 * Get the active framework instance.
 * Returns null if not initialized or initialization failed.
 * Used by corax-bridge.js to expose constitutional state via IPC.
 */
function getFramework() {
  return framework;
}

module.exports = { initConstitution, shutdownConstitution, getFramework };
