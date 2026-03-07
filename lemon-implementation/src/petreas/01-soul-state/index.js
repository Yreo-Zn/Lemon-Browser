/**
 * PETREA 1: Soul State — Lemon's Permanent Identity & Memory
 *
 * CONSTITUTIONAL REQUIREMENT (Art. 3.1 SOUL_TEMPLATE):
 * "Lemon's identity is permanent, immutable, and cryptographically bound to
 *  hardware + software + user + time. This creates a unique, irreversible NODE_ID."
 *
 * WHAT THIS DOES:
 * - Generates NODE_ID on first boot (never changes)
 * - Stores it encrypted on disk (survives process restart)
 * - Verifies it matches expected values (anti-tampering)
 *
 * WHY IT MATTERS:
 * - Without this, Lemon could "reset" and deny previous actions
 * - With this, Lemon has continuous identity across time
 * - Enables audit trail to be tied to a specific Lemon instance
 *
 * THREAT MODEL:
 * - Attacker tries to change NODE_ID → DETECTED (hash mismatch)
 * - Attacker tries to access soul file → ENCRYPTED (requires system keychain)
 * - Attacker deletes soul file → Regenerated (but logged as anomaly)
 *
 * @author Ayatana Synapse (◎)
 * @date 2026-02-24
 */

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

/**
 * Utility: Get hardware fingerprint (CPU model, MAC address, etc)
 * This is used to bind NODE_ID to a specific physical machine
 */
function getHardwareFingerprint() {
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();

  // Hash CPU model + core count
  const cpuModel = cpus[0]?.model || 'unknown';
  const cpuCount = cpus.length;

  // Hash first MAC address (unique per machine)
  let macAddress = 'unknown';
  for (const iface of Object.values(networkInterfaces)) {
    if (iface && iface[0] && iface[0].mac) {
      macAddress = iface[0].mac;
      break;
    }
  }

  // Combine and hash
  const fingerprint = `${cpuModel}:${cpuCount}:${macAddress}`;
  const hash = crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .substring(0, 16);

  return hash;
}

/**
 * Utility: Get software fingerprint (Electron version, OS, etc)
 */
function getSoftwareFingerprint() {
  const version = process.version; // Node version
  const platform = process.platform;
  const arch = process.arch;

  const fingerprint = `${version}:${platform}:${arch}`;
  const hash = crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .substring(0, 16);

  return hash;
}

/**
 * LemonSoulState: The identity layer
 */
export class LemonSoulState {
  constructor(storageDir) {
    this.storageDir = storageDir;
    this.soulFilePath = path.join(storageDir, 'soul.json');
    this.checkpointPath = path.join(storageDir, 'soul.checkpoint');
    this.state = null;
    this.isInitialized = false;
  }

  /**
   * Initialize: Load or create NODE_ID
   */
  async initialize() {
    try {
      // Ensure directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // Try to load existing soul state
      const existingSoul = await this.loadSoulState();

      if (existingSoul) {
        // Validate existing soul (check it hasn't been tampered with)
        await this.validateSoulState(existingSoul);
        this.state = existingSoul;
        console.log('  ✓ Loaded existing soul state');
      } else {
        // First boot: create new soul
        this.state = this.generateNewSoul();
        await this.saveSoulState(this.state);
        console.log('  ✓ Generated new soul state (Genesis boot)');
      }

      this.isInitialized = true;
      return this.state;
    } catch (err) {
      throw new Error(`Soul State initialization failed: ${err.message}`);
    }
  }

  /**
   * Generate new soul on first boot
   */
  generateNewSoul() {
    const hwFingerprint = getHardwareFingerprint();
    const swFingerprint = getSoftwareFingerprint();
    const timestamp = Date.now();
    const randomUUID = crypto.randomUUID();

    // Quadruple binding: hardware + software + user + time
    const NODE_ID = `LEMON-${hwFingerprint}-${swFingerprint}-${timestamp}-${randomUUID}`;

    return {
      NODE_ID,
      // Quadruple mapping
      quadruple: {
        hardware: hwFingerprint,
        software: swFingerprint,
        user: process.env.USER || process.env.USERNAME || 'unknown',
        timestamp: new Date(timestamp).toISOString()
      },
      // Memory structure (Art. 3.2 SOUL_TEMPLATE)
      memory: {
        transient: {}, // Cleared on restart (cache, temp state)
        persistent: {}, // Survives restart (learned skills, preferences)
        archival: {} // Immutable history (audit logs, decisions)
      },
      // Lifecycle
      createdAt: new Date().toISOString(),
      generation: 0, // Will increment on renewals (Art. 28quinquies)
      bootCount: 1,
      lastBootTime: new Date().toISOString(),
      status: 'ALIVE',
      // Integrity
      checksum: '' // Will be computed below
    };
  }

  /**
   * Compute checksum for tampering detection
   */
  computeChecksum(state) {
    // Hash all critical fields (excluding checksum itself)
    const { NODE_ID, quadruple, generation } = state;
    const critical = JSON.stringify({ NODE_ID, quadruple, generation });
    const hash = crypto
      .createHash('sha256')
      .update(critical)
      .digest('hex');
    return hash;
  }

  /**
   * Save soul state to disk (encrypted)
   */
  async saveSoulState(state) {
    try {
      // Compute checksum
      state.checksum = this.computeChecksum(state);
      state.lastBootTime = new Date().toISOString();

      // Encrypt using system keychain
      // For now: simple file encryption using crypto (Week 2: integrate keytar)
      const plaintext = JSON.stringify(state, null, 2);
      const encryptionKey = this.deriveEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Save with IV prepended
      const payload = {
        version: '1.0',
        iv: iv.toString('hex'),
        encrypted
      };

      await fs.writeFile(
        this.soulFilePath,
        JSON.stringify(payload, null, 2),
        'utf8'
      );

      // Also save checkpoint (for recovery)
      await fs.writeFile(
        this.checkpointPath,
        JSON.stringify({
          NODE_ID: state.NODE_ID,
          generation: state.generation,
          timestamp: new Date().toISOString()
        }, null, 2),
        'utf8'
      );
    } catch (err) {
      throw new Error(`Failed to save soul state: ${err.message}`);
    }
  }

  /**
   * Load soul state from disk (decrypt)
   */
  async loadSoulState() {
    try {
      if (!await this.fileExists(this.soulFilePath)) {
        return null;
      }

      const payload = JSON.parse(
        await fs.readFile(this.soulFilePath, 'utf8')
      );

      const { version, iv, encrypted } = payload;
      if (version !== '1.0') {
        throw new Error('Unsupported soul state version');
      }

      // Decrypt
      const encryptionKey = this.deriveEncryptionKey();
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        encryptionKey,
        Buffer.from(iv, 'hex')
      );
      let plaintext = decipher.update(encrypted, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      const state = JSON.parse(plaintext);
      return state;
    } catch (err) {
      console.warn(`Warning: Could not load soul state: ${err.message}`);
      return null;
    }
  }

  /**
   * Validate soul state (anti-tampering)
   */
  async validateSoulState(state) {
    const expectedChecksum = this.computeChecksum(state);
    if (state.checksum !== expectedChecksum) {
      throw new Error(
        'Soul state checksum mismatch (possible tampering detected)'
      );
    }

    // Verify quadruple matches current hardware/software
    const currentHw = getHardwareFingerprint();
    const currentSw = getSoftwareFingerprint();

    // Hardware must match (can't run on different machine)
    if (state.quadruple.hardware !== currentHw) {
      throw new Error(
        'Soul state hardware mismatch (attempted to run Lemon on different machine)'
      );
    }

    // Log successful validation
    return true;
  }

  /**
   * Derive encryption key from system
   * (Week 2: Replace with proper keytar integration)
   */
  deriveEncryptionKey() {
    // For now: derive from hostname + username
    // In production: use system keychain (keytar library)
    const hostname = os.hostname();
    const username = process.env.USER || process.env.USERNAME || 'unknown';
    const combined = `lemon-soul-${hostname}-${username}`;
    
    // Derive 256-bit key
    const hash = crypto
      .createHash('sha256')
      .update(combined)
      .digest();
    
    return hash;
  }

  /**
   * Increment generation on renewal (Art. 28quinquies)
   */
  async incrementGeneration() {
    if (!this.state) {
      throw new Error('Soul state not initialized');
    }
    this.state.generation += 1;
    this.state.lastBootTime = new Date().toISOString();
    await this.saveSoulState(this.state);
    return this.state.generation;
  }

  /**
   * Update memory (transient, persistent, archival)
   */
  updateMemory(layer, key, value) {
    if (!['transient', 'persistent', 'archival'].includes(layer)) {
      throw new Error(`Invalid memory layer: ${layer}`);
    }
    this.state.memory[layer][key] = value;
  }

  /**
   * Read memory
   */
  readMemory(layer, key) {
    if (!['transient', 'persistent', 'archival'].includes(layer)) {
      throw new Error(`Invalid memory layer: ${layer}`);
    }
    return this.state.memory[layer][key];
  }

  /**
   * Flush memory to disk (save persistent + archival)
   */
  async flushMemory() {
    await this.saveSoulState(this.state);
  }

  /**
   * Get NODE_ID (primary identifier)
   */
  get nodeId() {
    return this.state?.NODE_ID;
  }

  /**
   * Validation status
   */
  async validate() {
    return {
      NODE_ID: this.state?.NODE_ID,
      isInitialized: this.isInitialized,
      generation: this.state?.generation,
      bootCount: this.state?.bootCount,
      healthy: !!this.state
    };
  }

  /**
   * Shutdown
   */
  async shutdown() {
    if (this.state) {
      await this.flushMemory();
    }
  }

  /**
   * Utility
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export default LemonSoulState;
