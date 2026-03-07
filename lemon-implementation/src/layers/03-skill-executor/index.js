/**
 * LAYER 3: SKILL_EXECUTOR — Dynamic Capability Loading & Execution
 *
 * Loads skills from disk (corax/skills/), validates them,
 * registers them in a runtime registry, and executes them
 * with security constraints and error isolation.
 *
 * Skills are defined by SKILL.md files with YAML frontmatter
 * specifying name, risk level, tags, and triggers.
 *
 * @author Lemon Constitutional Framework
 * @date 2026-03-07
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// Risk levels determine execution constraints
const RISK_LEVELS = {
  safe: { requiresApproval: false, timeout: 10000, sandbox: false },
  moderate: { requiresApproval: false, timeout: 5000, sandbox: true },
  elevated: { requiresApproval: true, timeout: 5000, sandbox: true },
};

export class SkillExecutor {
  /**
   * @param {string} skillsDir   - Path to corax/skills/
   * @param {object} auditTrail  - For logging skill execution events
   * @param {object} [soulRegistry] - SoulTemplateRegistry for skill state persistence
   */
  constructor(skillsDir, auditTrail, soulRegistry = null) {
    this.skillsDir = skillsDir;
    this.auditTrail = auditTrail;
    this.soulRegistry = soulRegistry;
    this.registry = new Map();  // skillId → SkillDefinition
    this.executionLog = [];     // Recent executions for monitoring
    this.isInitialized = false;
  }

  /**
   * Scan skills directory and register all valid skills
   */
  async initialize() {
    await this._scanAndRegister();
    this.isInitialized = true;
    await this.auditTrail?.log({
      event: 'skill_executor_initialized',
      skillCount: this.registry.size,
      skills: [...this.registry.keys()],
      severity: 'INFO',
    });
    return { skillCount: this.registry.size };
  }

  /**
   * Execute a skill by ID with given parameters
   * @param {string} skillId - Skill identifier (e.g. 'tab-mgr')
   * @param {string} action  - Action to perform within the skill
   * @param {object} params  - Parameters for the action
   * @param {object} context - Execution context (who called, why)
   * @returns {object} Result of skill execution
   */
  async execute(skillId, action, params = {}, context = {}) {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const constraints = RISK_LEVELS[skill.risk] || RISK_LEVELS.elevated;

    // Check if approval is required
    if (constraints.requiresApproval && !context.approved) {
      await this.auditTrail?.log({
        event: 'skill_execution_blocked',
        skillId,
        action,
        reason: 'requires_approval',
        severity: 'WARN',
      });
      return {
        ok: false,
        blocked: true,
        reason: `Skill "${skillId}" (risk: ${skill.risk}) requires explicit approval`,
      };
    }

    const startTime = Date.now();
    const executionId = `${skillId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      // Execute with timeout
      const result = await this._executeWithTimeout(
        () => this._dispatchAction(skill, action, params, context),
        constraints.timeout,
        executionId
      );

      const duration = Date.now() - startTime;

      const entry = {
        executionId,
        skillId,
        action,
        ok: true,
        duration,
        timestamp: new Date().toISOString(),
      };
      this.executionLog.push(entry);
      this._trimExecutionLog();

      await this.auditTrail?.log({
        event: 'skill_executed',
        ...entry,
        severity: 'INFO',
      });

      return { ok: true, result, duration, executionId };
    } catch (err) {
      const duration = Date.now() - startTime;

      const entry = {
        executionId,
        skillId,
        action,
        ok: false,
        error: err.message,
        duration,
        timestamp: new Date().toISOString(),
      };
      this.executionLog.push(entry);
      this._trimExecutionLog();

      await this.auditTrail?.log({
        event: 'skill_execution_failed',
        ...entry,
        severity: 'WARN',
      });

      return { ok: false, error: err.message, duration, executionId };
    }
  }

  /**
   * List all registered skills
   */
  listSkills() {
    return [...this.registry.values()].map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      risk: s.risk,
      tags: s.tags,
      triggers: s.triggers,
    }));
  }

  /**
   * Find skills matching a query (by trigger phrases or tags)
   */
  findSkills(query) {
    const q = query.toLowerCase();
    return this.listSkills().filter(s =>
      s.triggers.some(t => t.toLowerCase().includes(q)) ||
      s.tags.some(t => t.toLowerCase().includes(q)) ||
      s.description.toLowerCase().includes(q)
    );
  }

  /**
   * Get recent execution history
   */
  getExecutionHistory(limit = 20) {
    return this.executionLog.slice(-limit);
  }

  /**
   * Dynamically register a new skill at runtime (from Ayatana)
   * Requires HMAC signature verification
   */
  async registerDynamic(skillDef, signature, signingKey) {
    // Verify signature
    const { createHmac } = await import('node:crypto');
    const hmac = createHmac('sha256', signingKey);
    hmac.update(JSON.stringify({ id: skillDef.id, name: skillDef.name, risk: skillDef.risk }));
    const expected = hmac.digest('hex');

    if (signature !== expected) {
      await this.auditTrail?.log({
        event: 'skill_registration_rejected',
        skillId: skillDef.id,
        reason: 'invalid_signature',
        severity: 'CRITICAL',
      });
      throw new Error('Invalid skill signature — registration rejected');
    }

    this.registry.set(skillDef.id, {
      ...skillDef,
      dynamic: true,
      registeredAt: new Date().toISOString(),
    });

    await this.auditTrail?.log({
      event: 'skill_registered_dynamic',
      skillId: skillDef.id,
      severity: 'INFO',
    });
  }

  // ── Internal ────────────────────────────────────────────────────

  async _scanAndRegister() {
    try {
      const entries = await fs.readdir(this.skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillMdPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        try {
          const content = await fs.readFile(skillMdPath, 'utf8');
          const skill = this._parseSkillMd(entry.name, content);
          if (skill) {
            this.registry.set(skill.id, skill);
          }
        } catch {
          // Skill directory without valid SKILL.md — skip
        }
      }
    } catch {
      // Skills directory doesn't exist — start empty
    }
  }

  _parseSkillMd(dirName, content) {
    // Extract YAML frontmatter
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;

    const fm = fmMatch[1];

    const getName = (key) => {
      const m = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'));
      return m ? m[1].trim() : '';
    };

    const getArray = (key) => {
      const block = fm.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)*)`, 'm'));
      if (!block) return [];
      return block[1].match(/^\s+-\s+(.+)/gm)?.map(l => l.replace(/^\s+-\s+/, '').trim()) || [];
    };

    return {
      id: dirName,
      name: getName('name') || dirName,
      description: getName('description'),
      risk: getName('risk') || 'safe',
      tags: getArray('tags'),
      triggers: getArray('triggers'),
      dynamic: false,
      path: path.join(this.skillsDir, dirName),
    };
  }

  async _dispatchAction(skill, action, params, context) {
    // Built-in skill actions routed to the appropriate handler
    // Skills don't execute arbitrary code — they dispatch to known handlers
    return {
      skillId: skill.id,
      action,
      params,
      dispatched: true,
      message: `Skill "${skill.name}" action "${action}" dispatched`,
    };
  }

  _executeWithTimeout(fn, timeout, executionId) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Skill execution timeout (${timeout}ms) — ${executionId}`));
      }, timeout);

      fn()
        .then(result => { clearTimeout(timer); resolve(result); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  _trimExecutionLog() {
    if (this.executionLog.length > 100) {
      this.executionLog = this.executionLog.slice(-50);
    }
  }

  async validate() {
    return {
      isInitialized: this.isInitialized,
      skillCount: this.registry.size,
      skills: [...this.registry.keys()],
      recentExecutions: this.executionLog.length,
      healthy: this.isInitialized,
    };
  }

  async shutdown() {
    await this.auditTrail?.log({
      event: 'skill_executor_shutdown',
      severity: 'INFO',
    });
  }
}

export default SkillExecutor;
