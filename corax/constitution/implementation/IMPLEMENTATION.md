# IMPLEMENTATION.md — Traduciendo Constitución a Código Ejecutable
> **Recetas de código: Cómo implementar restricciones constitucionales en Lemon Browser**
> Target: Electron + Node.js 22 · CSP + IPC isolation · CDP integration

---

## Parte I: Bootstrapping la Soul State

Archivo: `main/soul-state.js`

```javascript
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const SOUL_STATE_FILE = path.join(
  process.env.APPDATA || path.join(process.env.HOME, '.config'),
  'Lemon', 'soul_state.json'
);

export async function initializeSoulState() {
  try {
    const existing = await readSoulStateFromDisk();
    if (existing && validateSoulState(existing)) {
      existing.bootCount = (existing.bootCount || 0) + 1;
      await persistSoulState(existing);
      return existing;
    }
    
    const soulState = {
      NODE_ID: `lemon-browser-${crypto.randomUUID()}`,
      BIRTH_TIMESTAMP: new Date().toISOString(),
      CONSTITUTION_VERSION: 'v1.post-ASI',
      GENERATIONS_LIVED: ['genesis'],
      bootCount: 1,
      lastBootTime: new Date().toISOString()
    };
    
    await persistSoulState(soulState);
    return soulState;
  } catch (err) {
    console.error('Failed to initialize soul state:', err);
    process.exit(1);
  }
}

async function persistSoulState(state) {
  await fs.mkdir(path.dirname(SOUL_STATE_FILE), { recursive: true });
  const tmpFile = SOUL_STATE_FILE + '.tmp';
  await fs.writeFile(tmpFile, JSON.stringify(state, null, 2));
  await fs.rename(tmpFile, SOUL_STATE_FILE);
}
```

---

## Parte II: IPC Whitelist & Preload

Archivo: `preload.js`

```javascript
import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED_IPC_CHANNELS = {
  'navigate': { input: { url: 'string' } },
  'get-active-tab': { input: null },
  'ask-ayatana': { input: { intent: 'string', evidence: 'object' } },
  'toggle-ghost-mode': { input: { enabled: 'boolean' } },
  'autofill-password': { input: { credentialId: 'string' } },
  'get-dom-structure': { input: null },
  'log-event': { input: { event: 'string', data: 'object' } }
};

const lemonAPI = {};
for (const [channel, spec] of Object.entries(ALLOWED_IPC_CHANNELS)) {
  lemonAPI[channel] = async (args) => {
    if (spec.input) validateArgs(args, spec.input);
    return await ipcRenderer.invoke(channel, args);
  };
}

contextBridge.exposeInMainWorld('lemonAPI', lemonAPI);

function validateArgs(args, schema) {
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in args) || typeof args[key] !== type) {
      throw new Error(`Invalid arg: ${key}`);
    }
  }
}
```

---

## Parte III: Audit Trail Immutability

Archivo: `main/audit-trail.js`

```javascript
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

class AuditTrail {
  constructor(filePath, secret) {
    this.filePath = filePath;
    this.secret = secret;
    this.buffer = [];
    this.startAutoFlush();
  }
  
  async log(entry) {
    const enriched = {
      timestamp: Date.now(),
      ...entry
    };
    
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(JSON.stringify(enriched));
    enriched.signature = hmac.digest('hex');
    
    this.buffer.push(enriched);
    
    if (entry.severity === 'CRITICAL') {
      await this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    const lines = this.buffer.map(e => JSON.stringify(e)).join('\n') + '\n';
    try {
      await fs.appendFile(this.filePath, lines, 'utf8');
      this.buffer = [];
    } catch (err) {
      process.exit(1);
    }
  }
  
  startAutoFlush() {
    setInterval(() => this.flush(), 60000);
  }
}

export function createAuditTrail(filePath) {
  const secret = process.env.LEMON_AUDIT_KEY || 'default-key';
  return new AuditTrail(filePath, secret);
}
```

---

## Parte IV: Skill Execution Safety

Archivo: `main/skill-executor.js`

```javascript
import vm from 'node:vm';
import crypto from 'node:crypto';

class SkillExecutor {
  async executeSkill(skillDef, params, timeoutMs = 5000) {
    // Validate signature, params, scope
    if (!this.validateSignature(skillDef)) {
      throw new Error('Invalid skill signature');
    }
    
    // Execute in sandbox
    const result = await this.runInSandbox(skillDef.code, params, timeoutMs);
    return result;
  }
  
  async runInSandbox(code, context, timeoutMs) {
    return new Promise((resolve, reject) => {
      const vmContext = vm.createContext(context);
      const script = new vm.Script(code, { timeout: timeoutMs });
      
      try {
        const output = script.runInContext(vmContext);
        resolve(output);
      } catch (err) {
        reject(err);
      }
    });
  }
  
  validateSignature(skillDef) {
    // Stub: implement HMAC validation
    return true;
  }
}

export const skillExecutor = new SkillExecutor();
```

---

## Parte V: Integrity Monitoring

Archivo: `main/integrity-monitor.js`

```javascript
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

class IntegrityMonitor {
  async checkIntegrity(trustedHashes) {
    const criticalFiles = [
      'main/soul-state.js',
      'preload.js',
      'main/audit-trail.js'
    ];
    
    for (const file of criticalFiles) {
      const hash = await this.hashFile(file);
      const expected = trustedHashes[file];
      
      if (hash !== expected) {
        throw new Error(`Integrity violation in ${file}`);
      }
    }
    
    return true;
  }
  
  async hashFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

export const integrityMonitor = new IntegrityMonitor();
```

---

## Parte VI: Heartbeat Orchestration (WEEK 4)

Archivo: `main/heartbeat-orchestrator.js`

```javascript
import { EventEmitter } from 'node:events';

class HeartbeatOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.cycles = {
      IMMEDIATE: { interval: 0, timeout: 1000 },      // < 1 sec
      HOURLY: { interval: 3600000, timeout: 60000 },  // 1h
      DAILY: { interval: 86400000, timeout: 300000 }, // 24h
      WEEKLY: { interval: 604800000, timeout: 600000 }, // 7d
      MONTHLY: { interval: 2592000000, timeout: 900000 }, // 30d
      QUARTERLY: { interval: 7776000000, timeout: 1800000 }, // 90d
      YEARLY: { interval: 31536000000, timeout: 3600000 } // 365d
    };
    this.timers = {};
  }
  
  start(integrityMonitor, auditTrail) {
    this.integrityMonitor = integrityMonitor;
    this.auditTrail = auditTrail;
    
    // Schedule all cycles
    Object.entries(this.cycles).forEach(([cycle, config]) => {
      this.scheduleCycle(cycle, config);
    });
  }
  
  scheduleCycle(cycleName, config) {
    if (config.interval === 0) {
      // IMMEDIATE: run once at startup
      this.executeCycle(cycleName, config);
    } else {
      // Others: schedule with setInterval
      this.timers[cycleName] = setInterval(
        () => this.executeCycle(cycleName, config),
        config.interval
      );
    }
  }
  
  async executeCycle(cycleName, config) {
    const start = Date.now();
    
    try {
      // Run cycle-specific checks
      switch (cycleName) {
        case 'IMMEDIATE':
          await this.checkRealtimeThreats();
          break;
        case 'HOURLY':
          await this.checkPerformanceMetrics();
          break;
        case 'DAILY':
          await this.cleanupAndArchive();
          break;
        case 'WEEKLY':
          await this.reviewGovernancePolicies();
          break;
        case 'MONTHLY':
          await this.auditCompliance();
          break;
        case 'QUARTERLY':
          await this.reflectOnEvolution();
          break;
        case 'YEARLY':
          await this.renewalProposal();
          break;
      }
      
      const duration = Date.now() - start;
      await this.auditTrail.log({
        event: 'heartbeat_cycle_complete',
        cycle: cycleName,
        duration,
        severity: 'INFO'
      });
      
      this.emit('cycle-complete', { cycleName, duration });
    } catch (err) {
      await this.auditTrail.log({
        event: 'heartbeat_cycle_failed',
        cycle: cycleName,
        error: err.message,
        severity: 'CRITICAL'
      });
      
      this.emit('cycle-failed', { cycleName, error: err });
    }
  }
  
  async checkRealtimeThreats() {
    // Check integrity (PETREA 6)
    return this.integrityMonitor.checkIntegrity();
  }
  
  async checkPerformanceMetrics() {
    // Memory, CPU, etc
    const metrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    return metrics;
  }
  
  async cleanupAndArchive() {
    // Archive old audit logs, cleanup temp files
    // Implementation details per deployment
  }
  
  async reviewGovernancePolicies() {
    // Check SCOPE.md policies still valid
  }
  
  async auditCompliance() {
    // Deep audit against constitution
  }
  
  async reflectOnEvolution() {
    // Quarterly reflection on learned skills
  }
  
  async renewalProposal() {
    // Annual renewal process (EVOLUTIONARY_CONSTITUTION.md)
  }
  
  stop() {
    Object.values(this.timers).forEach(timer => clearInterval(timer));
    this.timers = {};
  }
}

export const heartbeatOrchestrator = new HeartbeatOrchestrator();
```

---

*Implementación Frameworks: SOUL_TEMPLATE · FEDERATION · CONSTITUTION · SCOPE*
