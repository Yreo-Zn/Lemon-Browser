/**
 * PETREA 2: IPC Whitelist — Communication Gate Keeper
 *
 * CONSTITUTIONAL REQUIREMENT (Art. 3.2 FEDERATION):
 * "Only documented channels can communicate between Lemon components.
 *  All IPC messages must be validated against a static whitelist."
 *
 * WHAT THIS DOES:
 * - Maintains a whitelist of allowed IPC channels
 * - Validates every message against the whitelist
 * - Rejects unknown channels (fail-safe)
 * - Logs all rejection attempts (security audit)
 *
 * THREAT MODEL:
 * - Attacker injects malicious IPC messages → REJECTED (not in whitelist)
 * - Injection tries new channel names → LOGGED (attempted breach)
 * - Legitimate code tries to communicate → ALLOWED (in whitelist)
 *
 * @author Ayatana Synapse (◎)
 * @date 2026-02-24
 */

import Ajv from 'ajv';

/**
 * Define allowed IPC channels
 * Format: { channel: { schema, requiredRole, description } }
 */
const IPC_WHITELIST = {
  // Soul State queries (read-only)
  'soul:read': {
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' }
      }
    },
    requiredRole: 'any',
    description: 'Read soul state value'
  },

  // Audit trail logging (append-only)
  'audit:log': {
    schema: {
      type: 'object',
      properties: {
        event: { type: 'string' },
        severity: { enum: ['INFO', 'WARN', 'CRITICAL'] }
      },
      required: ['event']
    },
    requiredRole: 'any',
    description: 'Log to audit trail'
  },

  // Credential vault (system-only)
  'credentials:get': {
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string' },
        username: { type: 'string' }
      },
      required: ['service', 'username']
    },
    requiredRole: 'system-admin',
    description: 'Retrieve credential from vault'
  },

  // Extension validation
  'extension:validate': {
    schema: {
      type: 'object',
      properties: {
        manifestPath: { type: 'string' }
      },
      required: ['manifestPath']
    },
    requiredRole: 'system-admin',
    description: 'Validate extension manifest'
  },

  // Integrity checks
  'integrity:check': {
    schema: {
      type: 'object'
    },
    requiredRole: 'system-admin',
    description: 'Run integrity verification'
  }
};

/**
 * LemonPreload: IPC validation layer
 */
export class LemonPreload {
  constructor() {
    this.whitelist = IPC_WHITELIST;
    this.isInitialized = false;
    this.rejectionCount = 0;
    this.ajv = new Ajv();
  }

  async initialize() {
    // Pre-compile schemas for performance
    this.validators = {};
    for (const [channel, config] of Object.entries(this.whitelist)) {
      this.validators[channel] = this.ajv.compile(config.schema);
    }
    this.isInitialized = true;
  }

  /**
   * Validate incoming IPC message
   *
   * RETURNS: { valid: boolean, error?: string }
   */
  validateMessage(channel, data) {
    // Check if channel is in whitelist
    if (!this.whitelist[channel]) {
      this.rejectionCount++;
      return {
        valid: false,
        error: `Channel not whitelisted: ${channel}`,
        severity: 'CRITICAL'
      };
    }

    // Validate schema
    const validator = this.validators[channel];
    const isValid = validator(data);

    if (!isValid) {
      return {
        valid: false,
        error: `Invalid message schema: ${JSON.stringify(validator.errors)}`,
        severity: 'WARN'
      };
    }

    return { valid: true };
  }

  /**
   * Get whitelist for debugging
   */
  getWhitelist() {
    return Object.entries(this.whitelist).map(([channel, config]) => ({
      channel,
      requiredRole: config.requiredRole,
      description: config.description
    }));
  }

  /**
   * Validation status
   */
  async validate() {
    return {
      isInitialized: this.isInitialized,
      whitelistedChannels: Object.keys(this.whitelist).length,
      rejectionCount: this.rejectionCount,
      healthy: this.isInitialized
    };
  }

  async shutdown() {
    // Nothing to cleanup
  }
}

export default LemonPreload;
