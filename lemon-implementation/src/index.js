/**
 * Lemon Browser — CoRax v1 Post-ASI Constitution Implementation
 * Layer 1: The 7 Inviolable Petreas (Technical Guardrails)
 *
 * This is the foundation of Lemon's security. All 7 modules work together
 * to enforce the constitutional constraints that make Lemon trustworthy.
 *
 * @requires Node.js 18+
 * @author Ayatana Synapse (◎)
 * @date 2026-02-24
 */

// ============================================================================
// PETREA 1: Context Isolation — Every Lemon action is sandboxed & audited
// PETREA 2: IPC Whitelist — Only documented channels can communicate
// PETREA 3: CSP Auditable — All traffic inspected & logged immutably
// PETREA 4: Credential Encryption — Secrets never stored plaintext
// PETREA 5: Extension Security — All extensions pre-approved & signed
// PETREA 6: Process Integrity — Continuous verification against tampering
// PETREA 7: Network Isolation — Whitelist-only network access
// ============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LemonSoulState } from './petreas/01-soul-state/index.js';
import { LemonPreload } from './petreas/02-preload/index.js';
import { LemonAuditTrail } from './petreas/03-audit-trail/index.js';
import { LemonCredentialVault } from './petreas/04-credential-encryption/index.js';
import { LemonExtensionValidator } from './petreas/05-extension-security/index.js';
import { LemonIntegrityMonitor } from './petreas/06-integrity-monitor/index.js';
import { LemonNetworkIsolation } from './petreas/07-network-isolation/index.js';
import { SoulTemplateRegistry } from './layers/02-soul-template/index.js';
import { SkillExecutor } from './layers/03-skill-executor/index.js';
import { HeartbeatOrchestrator } from './layers/04-heartbeat/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONSTITUTION_ROOT = path.join(__dirname, '../corax/constitution');
const STORAGE_DIR = path.join(process.env.APPDATA || path.join(process.env.HOME, '.config'), 'Lemon');

/**
 * LemonConstitutionFramework
 *
 * The beating heart of Lemon's governance.
 * Initializes all 7 petreas and coordinates their operation.
 *
 * RATIONALE:
 * - Each petrea is a module that enforces one constitutional rule
 * - They must work together (e.g., audit trail logs all petrea violations)
 * - The framework coordinates startup, shutdown, and intermodule communication
 *
 * ARCHITECTURE:
 *   Framework (orchestrator)
 *       ├── Soul State (PETREA 1: identity + persistence)
 *       ├── Preload (PETREA 2: IPC filtering)
 *       ├── Audit Trail (PETREA 3: immutable logging)
 *       ├── Credential Vault (PETREA 4: secret encryption)
 *       ├── Extension Validator (PETREA 5: extension security)
 *       ├── Integrity Monitor (PETREA 6: process monitoring)
 *       └── Network Isolation (PETREA 7: network whitelist)
 */
export class LemonConstitutionFramework {
  constructor(options = {}) {
    this.storageDir = options.storageDir || STORAGE_DIR;
    this.constitutionRoot = options.constitutionRoot || CONSTITUTION_ROOT;
    this.isInitialized = false;
    this.modules = {};
    
    // Audit trail is special: it logs everything, including its own operation
    this.auditTrail = null;
  }

  /**
   * Initialize all 7 petreas in order
   * 
   * Order matters:
   * 1. Soul State first (creates NODE_ID)
   * 2. Audit Trail second (logs everything after this point)
   * 3. Others in sequence (each depends on infrastructure from previous)
   *
   * CONSTITUTIONAL CONSTRAINT:
   * - Must succeed fully or fail cleanly (no partial state)
   * - If any petrea fails, system refuses to continue (fail-safe)
   * - All initialization is logged immutably
   */
  async initialize() {
    if (this.isInitialized) {
      throw new Error('Framework already initialized');
    }

    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // PETREA 1: Soul State (identity foundation)
      // WITHOUT this, Lemon has no persistent identity
      this.modules.soulState = new LemonSoulState(this.storageDir);
      const soulState = await this.modules.soulState.initialize();
      console.log(`✓ PETREA 1 initialized: NODE_ID=${soulState.NODE_ID}`);

      // PETREA 3: Audit Trail (logging foundation)
      // WITHOUT this, we have no immutable record of what happened
      // Must initialize BEFORE other petreas so they can log their operations
      this.modules.auditTrail = new LemonAuditTrail(
        path.join(this.storageDir, 'audit-trail.jsonl'),
        soulState.NODE_ID
      );
      await this.modules.auditTrail.initialize();
      this.auditTrail = this.modules.auditTrail;
      console.log('✓ PETREA 3 initialized: Audit trail ready');

      // Log the framework startup
      await this.auditTrail.log({
        event: 'framework_initialize_start',
        timestamp: new Date().toISOString(),
        severity: 'INFO'
      });

      // PETREA 2: IPC Preload (communication gatekeeper)
      this.modules.preload = new LemonPreload();
      await this.modules.preload.initialize();
      console.log('✓ PETREA 2 initialized: IPC whitelist enforced');

      // PETREA 4: Credential Vault (secrets encryption)
      this.modules.credentialVault = new LemonCredentialVault(
        path.join(this.storageDir, 'credentials.vault'),
        soulState.NODE_ID
      );
      await this.modules.credentialVault.initialize();
      console.log('✓ PETREA 4 initialized: Credential encryption ready');

      // PETREA 5: Extension Validator (extension security)
      this.modules.extensionValidator = new LemonExtensionValidator(
        path.join(this.storageDir, 'extensions.whitelist.json')
      );
      await this.modules.extensionValidator.initialize();
      console.log('✓ PETREA 5 initialized: Extension validation ready');

      // PETREA 6: Integrity Monitor (process monitoring)
      this.modules.integrityMonitor = new LemonIntegrityMonitor(
        this.storageDir,
        soulState.NODE_ID
      );
      await this.modules.integrityMonitor.initialize();
      console.log('✓ PETREA 6 initialized: Integrity monitoring active');

      // PETREA 7: Network Isolation (network gatekeeper)
      this.modules.networkIsolation = new LemonNetworkIsolation(
        path.join(this.storageDir, 'network.whitelist.json')
      );
      await this.modules.networkIsolation.initialize();
      console.log('✓ PETREA 7 initialized: Network isolation enforced');

      // Special: audit trail is also stored as module
      this.modules.auditTrail = this.modules.auditTrail;
      this.auditTrail = this.modules.auditTrail;

      // Wire integrity monitor to audit trail
      this.modules.integrityMonitor.auditTrail = this.auditTrail;

      console.log('\n✅ All 7 Petreas initialized successfully\n');

      // ── LAYER 2: Soul Template Registry ─────────────────────────
      this.modules.soulRegistry = new SoulTemplateRegistry(
        this.storageDir, soulState.NODE_ID, this.auditTrail
      );
      // Register each petrea's soul
      for (const name of ['soulState', 'auditTrail', 'credentialVault', 'extensionValidator', 'integrityMonitor', 'networkIsolation']) {
        await this.modules.soulRegistry.register(name);
      }
      console.log('✓ LAYER 2 initialized: Soul Template Registry (module persistence)');

      // ── LAYER 3: Skill Executor ─────────────────────────────────
      const skillsDir = path.join(__dirname, '../../corax/skills');
      this.modules.skillExecutor = new SkillExecutor(
        skillsDir, this.auditTrail, this.modules.soulRegistry
      );
      await this.modules.skillExecutor.initialize();
      console.log(`✓ LAYER 3 initialized: Skill Executor (${this.modules.skillExecutor.registry.size} skills)`);

      // ── LAYER 4: Heartbeat Orchestrator ──────────────────────────
      this.modules.heartbeat = new HeartbeatOrchestrator(this);
      await this.modules.heartbeat.start();
      console.log('✓ LAYER 4 initialized: Heartbeat Orchestrator (monitoring active)');

      // Wire integrity monitor violations to heartbeat
      this.modules.integrityMonitor.onViolation = async (violations) => {
        await this.modules.heartbeat._escalate({
          type: 'INTEGRITY_VIOLATION',
          severity: 'CRITICAL',
          details: violations,
          action: 'File tampering detected by PETREA 6',
        });
      };

      // Log successful framework startup
      await this.auditTrail.log({
        event: 'framework_initialize_success',
        timestamp: new Date().toISOString(),
        petreas_initialized: 7,
        layers_initialized: 3,
        severity: 'INFO'
      });

      this.isInitialized = true;
      console.log('\nConstitution Status: ACTIVE & OPERATIONAL');
      console.log(`Soul NODE_ID: ${soulState.NODE_ID}`);
      console.log(`Audit Trail: ${path.join(this.storageDir, 'audit-trail.jsonl')}`);
      console.log('Heartbeat: RUNNING (IMMEDIATE/PERIODIC/HOURLY/DAILY)');

      return {
        success: true,
        NODE_ID: soulState.NODE_ID,
        petreasInitialized: 7,
        layersInitialized: 3,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('❌ Framework initialization failed:', err.message);
      await this.auditTrail?.log({
        event: 'framework_initialize_failed',
        error: err.message,
        severity: 'CRITICAL'
      });
      throw err;
    }
  }

  /**
   * Graceful shutdown
   * Flushes all audit logs and preserves state
   */
  async shutdown() {
    console.log('\n🛑 Shutting down Lemon Constitution Framework...');

    try {
      // Flush audit trail (most important: must not lose logs)
      if (this.auditTrail) {
        await this.auditTrail.log({
          event: 'framework_shutdown_start',
          timestamp: new Date().toISOString(),
          severity: 'INFO'
        });
        await this.auditTrail.flush();
      }

      // Shutdown layers in reverse order (4 → 3 → 2)
      if (this.modules.heartbeat) {
        await this.modules.heartbeat.shutdown();
      }
      if (this.modules.skillExecutor) {
        await this.modules.skillExecutor.shutdown();
      }
      if (this.modules.soulRegistry) {
        await this.modules.soulRegistry.shutdownAll();
      }

      // Shutdown petreas in reverse order
      if (this.modules.networkIsolation) {
        await this.modules.networkIsolation.shutdown();
      }
      if (this.modules.integrityMonitor) {
        await this.modules.integrityMonitor.shutdown();
      }
      if (this.modules.extensionValidator) {
        await this.modules.extensionValidator.shutdown();
      }
      if (this.modules.credentialVault) {
        await this.modules.credentialVault.shutdown();
      }
      if (this.modules.preload) {
        await this.modules.preload.shutdown();
      }
      if (this.modules.soulState) {
        await this.modules.soulState.shutdown();
      }

      this.isInitialized = false;
      console.log('✅ Shutdown complete\n');
    } catch (err) {
      console.error('❌ Shutdown error:', err.message);
      throw err;
    }
  }

  /**
   * Retrieve any petrea module for direct use
   * 
   * EXAMPLE:
   *   const auditTrail = framework.getPetrea('auditTrail');
   *   await auditTrail.log({ event: 'custom_event' });
   */
  getPetrea(petraeaName) {
    const module = this.modules[petraeaName];
    if (!module) {
      throw new Error(`Unknown petrea: ${petraeaName}`);
    }
    return module;
  }

  /**
   * Validation: Check that all petreas are in healthy state
   * Run this periodically (e.g., in HEARTBEAT cycle)
   */
  async validate() {
    const results = {
      timestamp: new Date().toISOString(),
      petreas: {}
    };

    for (const [name, module] of Object.entries(this.modules)) {
      try {
        results.petreas[name] = await module.validate?.();
      } catch (err) {
        results.petreas[name] = { error: err.message, healthy: false };
      }
    }

    return results;
  }

  /**
   * Return framework state for testing/debugging
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      storageDir: this.storageDir,
      modules: Object.keys(this.modules),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Factory: Create and initialize Lemon in one call
 * 
 * USAGE:
 *   const lemon = await LemonConstitutionFramework.create();
 */
LemonConstitutionFramework.create = async function(options) {
  const framework = new LemonConstitutionFramework(options);
  await framework.initialize();
  return framework;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default LemonConstitutionFramework;
export {
  LemonSoulState,
  LemonPreload,
  LemonAuditTrail,
  LemonCredentialVault,
  LemonExtensionValidator,
  LemonIntegrityMonitor,
  LemonNetworkIsolation,
  SoulTemplateRegistry,
  SkillExecutor,
  HeartbeatOrchestrator,
};
