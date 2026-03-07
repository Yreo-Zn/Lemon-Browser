/**
 * LAYER 2: SOUL_TEMPLATE — Module-Level Persistent State
 *
 * Allows any module (Petrea or Skill) to save/load state with
 * constitutional guarantees: encryption, checksums, audit trail logging.
 *
 * Each module gets its own "soul" file in the storage directory,
 * encrypted with a key derived from NODE_ID + module name.
 *
 * @author Lemon Constitutional Framework
 * @date 2026-03-07
 */

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

export class ModuleSoulState {
  /**
   * @param {string} moduleName - Unique module identifier (e.g. 'audit-trail')
   * @param {string} storageDir - Base directory for soul files
   * @param {string} nodeId     - Lemon's NODE_ID (for key derivation)
   * @param {object} [auditTrail] - Optional audit trail instance for logging
   */
  constructor(moduleName, storageDir, nodeId, auditTrail = null) {
    this.moduleName = moduleName;
    this.storageDir = path.join(storageDir, 'souls');
    this.nodeId = nodeId;
    this.auditTrail = auditTrail;
    this.filePath = path.join(this.storageDir, `${moduleName}.soul.json`);
    this.backupPath = path.join(this.storageDir, `${moduleName}.soul.backup.json`);
    this.data = null;
    this.version = 1;
    this.isInitialized = false;
  }

  /**
   * Initialize: load existing soul state or create empty one
   */
  async initialize() {
    await fs.mkdir(this.storageDir, { recursive: true });

    const existing = await this._loadFromDisk(this.filePath);
    if (existing) {
      this.data = existing.data;
      this.version = existing.version;
      this.isInitialized = true;
      return this.data;
    }

    // Try backup
    const backup = await this._loadFromDisk(this.backupPath);
    if (backup) {
      this.data = backup.data;
      this.version = backup.version;
      await this._persistToDisk(); // Restore primary from backup
      await this._log('module_soul_recovered_from_backup', 'WARN');
      this.isInitialized = true;
      return this.data;
    }

    // Genesis: empty state
    this.data = {};
    this.version = 1;
    await this._persistToDisk();
    await this._log('module_soul_genesis', 'INFO');
    this.isInitialized = true;
    return this.data;
  }

  /**
   * Save data to the module's soul (encrypt + sign + persist)
   */
  async save(data) {
    this.data = data;
    this.version += 1;
    await this._persistToDisk();
    await this._log('module_soul_saved', 'INFO');
  }

  /**
   * Load current data (from memory cache)
   */
  load() {
    return this.data;
  }

  /**
   * Validate checksum of the persisted file (anti-tampering)
   * @returns {boolean} true if file is intact
   */
  async validateChecksum() {
    const loaded = await this._loadFromDisk(this.filePath);
    if (!loaded) return false;

    const currentChecksum = this._computeChecksum(loaded.data, loaded.version);
    return currentChecksum === loaded.checksum;
  }

  /**
   * Recover from backup file
   */
  async recover() {
    const backup = await this._loadFromDisk(this.backupPath);
    if (!backup) {
      throw new Error(`No backup found for module: ${this.moduleName}`);
    }
    this.data = backup.data;
    this.version = backup.version;
    await this._persistToDisk();
    await this._log('module_soul_manual_recovery', 'WARN');
    return this.data;
  }

  // ── Internal helpers ──────────────────────────────────────────

  _deriveKey() {
    return crypto
      .createHash('sha256')
      .update(`soul-template-${this.nodeId}-${this.moduleName}`)
      .digest();
  }

  _computeChecksum(data, version) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({ data, version, module: this.moduleName }))
      .digest('hex');
  }

  async _persistToDisk() {
    const key = this._deriveKey();
    const iv = crypto.randomBytes(16);
    const plaintext = JSON.stringify(this.data);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const checksum = this._computeChecksum(this.data, this.version);

    const payload = {
      module: this.moduleName,
      version: this.version,
      checksum,
      iv: iv.toString('hex'),
      encrypted,
      updatedAt: new Date().toISOString(),
    };

    // Write backup first (atomic: if primary write fails, backup is intact)
    try {
      const existing = await fs.readFile(this.filePath, 'utf8').catch(() => null);
      if (existing) {
        await fs.writeFile(this.backupPath, existing, 'utf8');
      }
    } catch { /* no previous file to back up */ }

    await fs.writeFile(this.filePath, JSON.stringify(payload, null, 2), 'utf8');
  }

  async _loadFromDisk(filePath) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const payload = JSON.parse(raw);

      // Decrypt
      const key = this._deriveKey();
      const iv = Buffer.from(payload.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let plaintext = decipher.update(payload.encrypted, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      const data = JSON.parse(plaintext);
      const expectedChecksum = this._computeChecksum(data, payload.version);

      if (expectedChecksum !== payload.checksum) {
        await this._log('module_soul_checksum_mismatch', 'CRITICAL');
        return null; // Tampered — refuse to load
      }

      return { data, version: payload.version, checksum: payload.checksum };
    } catch {
      return null;
    }
  }

  async _log(event, severity) {
    if (this.auditTrail) {
      await this.auditTrail.log({
        event,
        module: this.moduleName,
        version: this.version,
        severity,
      });
    }
  }

  async validate() {
    const checksumValid = await this.validateChecksum();
    return {
      module: this.moduleName,
      isInitialized: this.isInitialized,
      version: this.version,
      checksumValid,
      healthy: this.isInitialized && checksumValid,
    };
  }

  async shutdown() {
    if (this.data !== null) {
      await this._persistToDisk();
    }
  }
}

/**
 * SoulTemplateRegistry: Manages all module souls centrally
 */
export class SoulTemplateRegistry {
  constructor(storageDir, nodeId, auditTrail) {
    this.storageDir = storageDir;
    this.nodeId = nodeId;
    this.auditTrail = auditTrail;
    this.modules = new Map();
  }

  /**
   * Register and initialize a module's soul state
   */
  async register(moduleName) {
    if (this.modules.has(moduleName)) {
      return this.modules.get(moduleName);
    }
    const soul = new ModuleSoulState(
      moduleName, this.storageDir, this.nodeId, this.auditTrail
    );
    await soul.initialize();
    this.modules.set(moduleName, soul);
    return soul;
  }

  /**
   * Get a registered module's soul
   */
  get(moduleName) {
    return this.modules.get(moduleName) || null;
  }

  async validateAll() {
    const results = {};
    for (const [name, soul] of this.modules) {
      results[name] = await soul.validate();
    }
    return results;
  }

  async shutdownAll() {
    for (const [, soul] of this.modules) {
      await soul.shutdown();
    }
  }
}

export default ModuleSoulState;
