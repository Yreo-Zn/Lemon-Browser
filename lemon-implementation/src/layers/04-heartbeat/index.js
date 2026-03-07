/**
 * LAYER 4: HEARTBEAT — Monitoring, Health Cycles & Emergency Escalation
 *
 * Maintains Lemon "alive" between interactions with 4 active cycles:
 *   IMMEDIATE (5s)  — Integrity checks, critical alerts
 *   PERIODIC  (60s) — Health validation, audit flush, resource check
 *   HOURLY    (1h)  — Deep scan, skill registry verify, stats
 *   DAILY     (24h) — Checkpoint, cleanup, report generation
 *
 * Escalation chain: detect → log → respond → escalate (if needed)
 *
 * @author Lemon Constitutional Framework
 * @date 2026-03-07
 */

const CYCLES = {
  IMMEDIATE: 5_000,
  PERIODIC: 60_000,
  HOURLY: 3_600_000,
  DAILY: 86_400_000,
};

export class HeartbeatOrchestrator {
  /**
   * @param {object} framework - The LemonConstitutionFramework instance
   * @param {object} options   - Override cycle intervals, escalation callbacks
   */
  constructor(framework, options = {}) {
    this.framework = framework;
    this.intervals = { ...CYCLES, ...options.intervals };
    this.timers = {};
    this.isRunning = false;
    this.stats = {
      startedAt: null,
      cycles: { immediate: 0, periodic: 0, hourly: 0, daily: 0 },
      violations: [],
      lastHealthCheck: null,
      consecutiveFailures: 0,
    };

    // Escalation callback: called when HEARTBEAT detects critical issues
    // This is the integration point for Ayatana Synapse
    this.onEscalation = options.onEscalation || this._defaultEscalation.bind(this);
  }

  /**
   * Start all heartbeat cycles
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stats.startedAt = new Date().toISOString();

    await this._logAudit('heartbeat_started', 'INFO');

    // Start each cycle
    this.timers.immediate = setInterval(
      () => this._runCycle('immediate', () => this._immediateCheck()),
      this.intervals.IMMEDIATE
    );

    this.timers.periodic = setInterval(
      () => this._runCycle('periodic', () => this._periodicCheck()),
      this.intervals.PERIODIC
    );

    this.timers.hourly = setInterval(
      () => this._runCycle('hourly', () => this._hourlyCheck()),
      this.intervals.HOURLY
    );

    this.timers.daily = setInterval(
      () => this._runCycle('daily', () => this._dailyCheck()),
      this.intervals.DAILY
    );

    // Run immediate check once on start
    await this._runCycle('immediate', () => this._immediateCheck());

    return { status: 'running', intervals: this.intervals };
  }

  /**
   * Stop all heartbeat cycles
   */
  async stop() {
    for (const timer of Object.values(this.timers)) {
      clearInterval(timer);
    }
    this.timers = {};
    this.isRunning = false;
    await this._logAudit('heartbeat_stopped', 'INFO');
  }

  // ── Cycle Implementations ──────────────────────────────────────

  /**
   * IMMEDIATE (every 5s): Critical integrity checks
   */
  async _immediateCheck() {
    const results = { ok: true, checks: [] };

    // 1. Integrity monitor check
    const integrity = this.framework.modules?.integrityMonitor;
    if (integrity) {
      const verification = await integrity.verifyIntegrity();
      if (!verification.clean) {
        results.ok = false;
        results.checks.push({
          name: 'integrity',
          passed: false,
          violations: verification.violations,
        });

        // ESCALATE: file tampering detected
        await this._escalate({
          type: 'INTEGRITY_VIOLATION',
          severity: 'CRITICAL',
          details: verification.violations,
          action: 'File tampering detected — constitutional violation',
        });
      } else {
        results.checks.push({ name: 'integrity', passed: true });
      }
    }

    // 2. Soul state alive check
    const soul = this.framework.modules?.soulState;
    if (soul && !soul.isInitialized) {
      results.ok = false;
      results.checks.push({ name: 'soul-state', passed: false });
      await this._escalate({
        type: 'SOUL_STATE_DOWN',
        severity: 'CRITICAL',
        action: 'Soul state not initialized — identity compromised',
      });
    }

    return results;
  }

  /**
   * PERIODIC (every 60s): Health validation + audit flush
   */
  async _periodicCheck() {
    const results = { ok: true, checks: [] };

    // 1. Validate all petreas
    if (this.framework.validate) {
      try {
        const validation = await this.framework.validate();
        for (const [name, status] of Object.entries(validation.petreas || {})) {
          if (status && !status.healthy) {
            results.ok = false;
            results.checks.push({ name, passed: false, status });

            await this._escalate({
              type: 'PETREA_UNHEALTHY',
              severity: 'WARN',
              petrea: name,
              details: status,
              action: `Petrea "${name}" reported unhealthy`,
            });
          }
        }
      } catch (err) {
        results.ok = false;
        results.checks.push({ name: 'framework-validate', passed: false, error: err.message });
      }
    }

    // 2. Flush audit trail
    const audit = this.framework.modules?.auditTrail;
    if (audit?.flush) {
      await audit.flush();
    }

    // 3. Memory/resource baseline
    const mem = process.memoryUsage();
    results.memory = {
      heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
      rssMB: Math.round(mem.rss / (1024 * 1024)),
    };

    // Warn if memory is high (>500MB heap)
    if (results.memory.heapUsedMB > 500) {
      await this._escalate({
        type: 'HIGH_MEMORY',
        severity: 'WARN',
        memory: results.memory,
        action: 'Memory usage exceeds 500MB threshold',
      });
    }

    this.stats.lastHealthCheck = new Date().toISOString();
    return results;
  }

  /**
   * HOURLY: Deep scan + skill registry verification
   */
  async _hourlyCheck() {
    const results = { ok: true, checks: [] };

    // 1. Verify audit trail integrity (sample)
    const audit = this.framework.modules?.auditTrail;
    if (audit?.verifyIntegrity) {
      try {
        const integrity = await audit.verifyIntegrity();
        results.checks.push({
          name: 'audit-integrity',
          passed: integrity?.valid !== false,
        });
      } catch (err) {
        results.checks.push({ name: 'audit-integrity', passed: false, error: err.message });
      }
    }

    // 2. Soul template registry check
    const soulRegistry = this.framework.modules?.soulRegistry;
    if (soulRegistry?.validateAll) {
      const soulStatus = await soulRegistry.validateAll();
      for (const [name, status] of Object.entries(soulStatus)) {
        if (!status.healthy) {
          results.ok = false;
          results.checks.push({ name: `soul:${name}`, passed: false });
        }
      }
    }

    // 3. Network isolation check
    const network = this.framework.modules?.networkIsolation;
    if (network) {
      results.checks.push({
        name: 'network-isolation',
        passed: network.isInitialized,
        blockedRequests: network.blockedRequests,
      });
    }

    return results;
  }

  /**
   * DAILY: Checkpoint + cleanup + summary
   */
  async _dailyCheck() {
    const results = { ok: true };

    // 1. Generate daily summary
    const summary = {
      date: new Date().toISOString().split('T')[0],
      uptime: this.stats.startedAt
        ? Date.now() - new Date(this.stats.startedAt).getTime()
        : 0,
      cycles: { ...this.stats.cycles },
      violations: this.stats.violations.length,
      memory: process.memoryUsage(),
    };

    await this._logAudit('heartbeat_daily_summary', 'INFO', summary);

    // 2. Trim old violations (keep last 100)
    if (this.stats.violations.length > 100) {
      this.stats.violations = this.stats.violations.slice(-100);
    }

    return results;
  }

  // ── Escalation System ──────────────────────────────────────────

  async _escalate(incident) {
    const enriched = {
      ...incident,
      timestamp: new Date().toISOString(),
      nodeId: this.framework.modules?.soulState?.state?.NODE_ID || 'unknown',
    };

    // Record
    this.stats.violations.push(enriched);
    this.stats.consecutiveFailures++;

    // Log to audit trail
    await this._logAudit('heartbeat_escalation', incident.severity, enriched);

    // Call escalation handler (Ayatana integration point)
    try {
      await this.onEscalation(enriched);
    } catch (err) {
      // Escalation handler failed — last resort logging
      console.error('[HEARTBEAT] Escalation handler failed:', err.message);
    }

    // Emergency: if too many consecutive failures, consider shutdown
    if (this.stats.consecutiveFailures >= 10) {
      await this._logAudit('heartbeat_emergency_threshold', 'CRITICAL', {
        consecutiveFailures: this.stats.consecutiveFailures,
        action: 'Emergency threshold reached — requesting intervention',
      });
    }
  }

  _defaultEscalation(incident) {
    const prefix = incident.severity === 'CRITICAL' ? '🚨' : '⚠️';
    console.error(`${prefix} [HEARTBEAT] ${incident.type}: ${incident.action}`);
  }

  // ── Helpers ────────────────────────────────────────────────────

  async _runCycle(name, fn) {
    this.stats.cycles[name] = (this.stats.cycles[name] || 0) + 1;
    try {
      const result = await fn();
      if (result?.ok) {
        this.stats.consecutiveFailures = 0; // Reset on success
      }
      return result;
    } catch (err) {
      await this._logAudit(`heartbeat_cycle_error_${name}`, 'WARN', {
        error: err.message,
      });
    }
  }

  async _logAudit(event, severity, extra = {}) {
    const audit = this.framework.modules?.auditTrail || this.framework.auditTrail;
    if (audit?.log) {
      await audit.log({ event, severity, ...extra });
    }
  }

  async validate() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      healthy: this.isRunning && this.stats.consecutiveFailures < 5,
    };
  }

  async shutdown() {
    await this.stop();
  }
}

export default HeartbeatOrchestrator;
