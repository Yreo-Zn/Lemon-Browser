/**
 * PETREA 6: Integrity Monitor — Process Tamper Detection
 *
 * CONSTITUTIONAL REQUIREMENT (Art. 3.6 LEMON_CONSTITUTION):
 * "Lemon's core files are continuously verified against known-good hashes.
 *  Any modification triggers immediate alert."
 *
 * WHAT THIS DOES:
 * - Computes hashes of critical files on startup
 * - Monitors continuously (IMMEDIATE heartbeat)
 * - Detects unauthorized modifications
 * - Escalates to audit trail on tampering detected
 *
 * @author Ayatana Synapse (◎)
 * @date 2026-02-24
 */

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const CRITICAL_FILES = [
  'src/index.js',
  'src/petreas/01-soul-state/index.js',
  'src/petreas/02-preload/index.js',
  'src/petreas/03-audit-trail/index.js',
  'src/petreas/04-credential-encryption/index.js',
  'src/petreas/05-extension-security/index.js',
  'src/petreas/06-integrity-monitor/index.js',
  'src/petreas/07-network-isolation/index.js'
];

export class LemonIntegrityMonitor {
  constructor(storageDir, nodeId, auditTrail = null) {
    this.storageDir = storageDir;
    this.nodeId = nodeId;
    this.auditTrail = auditTrail;
    this.hashesPath = path.join(storageDir, 'integrity-hashes.json');
    this.hashes = {};
    this.isInitialized = false;
    this.monitorInterval = null;
    this.onViolation = null; // Callback for HEARTBEAT escalation
  }

  async initialize() {
    try {
      // Load existing hashes or create new
      const content = await fs.readFile(this.hashesPath, 'utf8');
      this.hashes = JSON.parse(content);
      console.log(`  ✓ Loaded integrity baseline: ${Object.keys(this.hashes).length} files`);
    } catch {
      // First boot: compute baseline hashes
      await this.computeHashes();
      await this.saveHashes();
      console.log(`  ✓ computed integrity baseline: ${Object.keys(this.hashes).length} files`);
    }

    // Start continuous monitoring
    this.startMonitoring();
    this.isInitialized = true;
  }

  /**
   * Compute hashes of all critical files
   */
  async computeHashes() {
    this.hashes = {};
    
    for (const file of CRITICAL_FILES) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const hash = crypto
          .createHash('sha256')
          .update(content)
          .digest('hex');
        this.hashes[file] = hash;
      } catch (err) {
        console.warn(`Warning: Could not hash ${file}: ${err.message}`);
      }
    }
  }

  /**
   * Verify hashes match (detect tampering)
   */
  async verifyIntegrity() {
    const violations = [];

    for (const [file, expectedHash] of Object.entries(this.hashes)) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const currentHash = crypto
          .createHash('sha256')
          .update(content)
          .digest('hex');

        if (currentHash !== expectedHash) {
          violations.push({
            file,
            expectedHash,
            currentHash,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        violations.push({
          file,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      clean: violations.length === 0,
      violations
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    this.monitorInterval = setInterval(async () => {
      const result = await this.verifyIntegrity();
      if (!result.clean) {
        console.error('⚠️  INTEGRITY VIOLATION DETECTED');

        // Log to audit trail (CRITICAL severity)
        if (this.auditTrail) {
          await this.auditTrail.log({
            event: 'integrity_violation',
            violations: result.violations,
            severity: 'CRITICAL',
          });
        }

        // Notify HEARTBEAT for escalation
        if (this.onViolation) {
          await this.onViolation(result.violations);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  async saveHashes() {
    await fs.mkdir(path.dirname(this.hashesPath), { recursive: true });
    await fs.writeFile(
      this.hashesPath,
      JSON.stringify(this.hashes, null, 2),
      'utf8'
    );
  }

  async validate() {
    const result = await this.verifyIntegrity();
    return {
      isInitialized: this.isInitialized,
      filesMonitored: Object.keys(this.hashes).length,
      clean: result.clean,
      violationCount: result.violations.length,
      healthy: result.clean
    };
  }

  async shutdown() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    await this.saveHashes();
  }
}

export default LemonIntegrityMonitor;
