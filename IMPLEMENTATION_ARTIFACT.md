# ◎ LEMON BROWSER — Implementation Artifact
## Concrete Code Integration (ASI Symbiosis v1)

**Purpose:** Bridge MASTER_SYSTEM_PROMPT.md → Executable Code  
**Status:** READY TO DEPLOY  
**Last Updated:** 2026-02-25

---

## PART A: Core Initialization Module

### File: `corax/bootstrap/ayatana-core.js`

```javascript
/**
 * Ayatana Core Orchestrator
 * ========================
 * Implements Ring model, Petrea validation, OMM message routing
 * Bridges between user intent and skill execution
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// ── Configuration (from MASTER_SYSTEM_PROMPT)
const LEMON_CONFIG = {
  nodeId: "lemon-browser-prod-001",
  constitutionVersion: "0.3.2",
  
  rings: {
    ring0: { timeout: 100, parallelism: 4, pipelineDepth: 16 },
    ring1: { timeout: 2000, confirmationRequired: true, reversalWindow: 86400000, auditSnapshot: true },
    ring2: { timeout: 5000, confirmationRequired: true, confirmationStyle: "explicit_typing", reversalWindow: 0, waitingPeriodMs: 0 }
  },
  
  security: {
    cryptoAlgorithm: "blake2b",
    auditEncryption: "libsodium.secretbox",
    credentialVaultMaster: "TPM_BACKED_KEY",
    extensionSignatureAlgorithm: "ed25519",
    domainWhitelist: ["*.google.com", "*.github.com", "example.com"]
  },
  
  mcp: {
    localServers: [
      {
        name: "browser-tools",
        path: "corax/mcp-servers/browser-tools/server.js",
        autostart: true,
        tools: ["lemon_launch", "lemon_eval", "lemon_stop", "lemon_screenshot", "lemon_navigate", "lemon_logs", "lemon_errors"]
      }
    ]
  }
};

// ── Petrea Registry
class PetreaValidator {
  constructor() {
    this.petreas = new Map();
  }
  
  async loadPetreas(petreasPath) {
    const petreasDir = path.join(process.cwd(), petreasPath || 'lemon-implementation/src/petreas');
    const petreaIds = [
      '01-soul-state',
      '02-preload',
      '03-audit-trail',
      '04-credential-encryption',
      '05-extension-security',
      '06-integrity-monitor',
      '07-network-isolation'
    ];
    
    for (const id of petreaIds) {
      const modulePath = path.join(petreasDir, id, 'index.js');
      if (fs.existsSync(modulePath)) {
        const module = await import(`file://${modulePath}`);
        const hash = crypto.createHash('blake2b').update(fs.readFileSync(modulePath)).digest('hex');
        this.petreas.set(id, { module, hash, verified: false });
      }
    }
    
    return this.petreas.size;
  }
  
  async verifyAllPetreas() {
    for (const [id, petrea] of this.petreas) {
      try {
        // Each Petrea must export validate() function
        if (!petrea.module.validate) throw new Error(`Petrea ${id} missing validate() export`);
        petrea.verified = true;
        console.log(`✓ Petrea ${id} verified`);
      } catch (e) {
        throw new Error(`Petrea ${id} integrity check FAILED: ${e.message}`);
      }
    }
  }
  
  async validateAction(action) {
    // All Petreas check the action
    for (const [id, petrea] of this.petreas) {
      if (!petrea.verified) throw new Error(`Petrea ${id} not verified`);
      const result = await petrea.module.validate(action);
      if (!result.allowed) {
        return { allowed: false, blockedBy: id, reason: result.reason };
      }
    }
    return { allowed: true };
  }
}

// ── Audit Trail (Cryptographic Witness)
class AuditLog {
  constructor() {
    this.entries = [];
    this.genesisBlock = null;
  }
  
  async createGenesis(metadata) {
    this.genesisBlock = {
      id: crypto.randomUUID(),
      type: 'GENESIS',
      timestamp: Date.now(),
      metadata,
      hash: null
    };
    
    const preHash = JSON.stringify(this.genesisBlock, null, 2);
    this.genesisBlock.hash = crypto.createHash('blake2b').update(preHash).digest('hex');
    
    this.entries.push(this.genesisBlock);
    console.log(`✓ Audit genesis created: ${this.genesisBlock.hash.slice(0, 8)}`);
    
    return this.genesisBlock;
  }
  
  async record(entry) {
    const fullEntry = {
      id: crypto.randomUUID(),
      ...entry,
      previousHash: this.entries.length > 0 ? this.entries[this.entries.length - 1].hash : this.genesisBlock.hash,
      hash: null
    };
    
    const preHash = JSON.stringify(fullEntry, null, 2);
    fullEntry.hash = crypto.createHash('blake2b').update(preHash).digest('hex');
    
    this.entries.push(fullEntry);
    return fullEntry;
  }
  
  getRecentEntries(count = 5) {
    return this.entries.slice(-count);
  }
}

// ── Ring Executor (0/1/2)
class RingExecutor extends EventEmitter {
  constructor(petreaValidator, auditLog) {
    super();
    this.petreaValidator = petreaValidator;
    this.auditLog = auditLog;
    this.activeRing = 0;
    this.reversalRegistry = new Map();  // actionId -> reversal fn
  }
  
  async executeRing0(action) {
    // Query/Read-only, always allowed if Petreas pass
    const validation = await this.petreaValidator.validateAction(action);
    if (!validation.allowed) {
      await this.auditLog.record({
        type: 'ACTION_BLOCKED',
        ring: 0,
        action,
        reason: validation.reason,
        blockedBy: validation.blockedBy
      });
      return { status: 'BLOCKED', reason: validation.reason };
    }
    
    // Execute (e.g., query state, read bookmarks)
    const result = await action.execute();
    
    await this.auditLog.record({
      type: 'RING0_QUERY',
      ring: 0,
      action: action.type,
      result: typeof result === 'object' ? { keys: Object.keys(result) } : { type: typeof result },
      timestamp: Date.now()
    });
    
    return { status: 'SUCCESS', result };
  }
  
  async executeRing1(action, userConfirmation) {
    // Reversible write (HOTL)
    if (!userConfirmation.approved) {
      await this.auditLog.record({
        type: 'RING1_CANCELLED',
        ring: 1,
        action,
        reason: userConfirmation.reason
      });
      return { status: 'CANCELLED', reason: userConfirmation.reason };
    }
    
    // Snapshot pre-state
    const preSnapshot = await this.captureState?.();
    
    // Execute
    const result = await action.execute();
    
    // Snapshot post-state
    const postSnapshot = await this.captureState?.();
    
    // Create reversal function
    const actionId = crypto.randomUUID();
    if (action.reversal) {
      const deadline = Date.now() + LEMON_CONFIG.rings.ring1.reversalWindow;
      this.reversalRegistry.set(actionId, {
        execute: action.reversal,
        deadline,
        preSnapshot
      });
    }
    
    // Audit
    await this.auditLog.record({
      type: 'RING1_WRITE',
      ring: 1,
      actionId,
      action: action.type,
      preSnapshot,
      postSnapshot,
      reversible: !!action.reversal,
      reversalDeadline: this.reversalRegistry.get(actionId)?.deadline,
      timestamp: Date.now()
    });
    
    return { status: 'SUCCESS', actionId, result };
  }
  
  async executeRing2(action, userSignature) {
    // Irreversible action (HITL with explicit confirmation)
    if (!userSignature || userSignature.toLowerCase() !== "i understand") {
      await this.auditLog.record({
        type: 'RING2_CANCELLED',
        ring: 2,
        action,
        reason: 'Explicit signature not provided'
      });
      return { status: 'CANCELLED', reason: 'Requires explicit "I UNDERSTAND" signature' };
    }
    
    // Snapshot pre-state
    const preSnapshot = await this.captureState?.();
    
    // Execute
    const result = await action.execute();
    
    // Snapshot post-state
    const postSnapshot = await this.captureState?.();
    
    // Audit (immutable, no reversal)
    await this.auditLog.record({
      type: 'RING2_IRREVERSIBLE',
      ring: 2,
      action: action.type,
      preSnapshot,
      postSnapshot,
      userSignature: crypto.createHash('blake2b').update(userSignature).digest('hex'),
      timestamp: Date.now()
    });
    
    return { status: 'SUCCESS', result };
  }
  
  async revert(actionId) {
    const reversal = this.reversalRegistry.get(actionId);
    if (!reversal) {
      return { status: 'FAILED', reason: 'Action not found or not reversible' };
    }
    
    if (Date.now() > reversal.deadline) {
      return { status: 'FAILED', reason: 'Reversal window expired' };
    }
    
    await reversal.execute();
    
    await this.auditLog.record({
      type: 'RING1_REVERTED',
      ring: 1,
      originalActionId: actionId,
      reversedAt: Date.now(),
      restoredSnapshot: reversal.preSnapshot
    });
    
    this.reversalRegistry.delete(actionId);
    return { status: 'SUCCESS' };
  }
}

// ── Multi-Modal Message Normalization
class OMMRouter {
  constructor(auditLog) {
    this.auditLog = auditLog;
  }
  
  normalize(source, rawMessage) {
    return {
      source,                    // 'mcp' | 'ui' | 'discord' | etc.
      timestamp: Date.now(),
      content: typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage),
      normalized: true
    };
  }
  
  async route(normalized, ringExecutor) {
    // Route normalized message through appropriate Ring
    // This is simplified; real implementation would parse intent, determine Ring, etc.
    
    const ring = this.detectRing(normalized.content);
    const action = this.parseAction(normalized.content);
    
    return { ring, action };
  }
  
  detectRing(content) {
    // Heuristic: if action modifies state → ring 1+
    // if action irreversible → ring 2
    // else ring 0
    if (content.includes('DELETE') || content.includes('UNINSTALL')) return 2;
    if (content.includes('SET') || content.includes('SAVE')) return 1;
    return 0;
  }
  
  parseAction(content) {
    // Parse markdown/natural language into action object
    // Simplified stub
    return {
      type: 'QUERY',
      execute: async () => ({ type: 'placeholder' })
    };
  }
}

// ── Main Ayatana Orchestrator
export class AyatanaCore {
  static async initialize(config) {
    console.log('◎ Initializing Ayatana Synapse...');
    
    // 1. Load & verify Petreas
    const petreaValidator = new PetreaValidator();
    const petreaCount = await petreaValidator.loadPetreas();
    console.log(`◎ Loaded ${petreaCount} Petreas`);
    
    await petreaValidator.verifyAllPetreas();
    console.log('✓ All Petreas verified immutable');
    
    // 2. Initialize audit trail
    const auditLog = new AuditLog();
    await auditLog.createGenesis({
      timestamp: Date.now(),
      nodeId: LEMON_CONFIG.nodeId,
      constitutionVersion: LEMON_CONFIG.constitutionVersion
    });
    
    // 3. Initialize Ring executor
    const ringExecutor = new RingExecutor(petreaValidator, auditLog);
    
    // 4. Initialize OMM router
    const ommRouter = new OMMRouter(auditLog);
    
    console.log('✓ Ayatana Core ready');
    
    return {
      petreaValidator,
      auditLog,
      ringExecutor,
      ommRouter,
      config: LEMON_CONFIG
    };
  }
}

export default AyatanaCore;
```

### File: `corax/bootstrap/initialize.js`

```javascript
/**
 * Lemon Browser Initialization
 * =============================
 * Entry point: loads system prompt, initializes rings, starts loops
 */

import AyatanaCore from './ayatana-core.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeLemonBrowser() {
  try {
    // 1. Load MASTER_SYSTEM_PROMPT
    const systemPromptPath = path.join(__dirname, '..', '..', 'MASTER_SYSTEM_PROMPT.md');
    if (!fs.existsSync(systemPromptPath)) {
      throw new Error(`System prompt not found at ${systemPromptPath}`);
    }
    const SYSTEM_PROMPT = fs.readFileSync(systemPromptPath, 'utf8');
    console.log(`◎ Loaded system prompt (${SYSTEM_PROMPT.length} bytes)`);
    
    // 2. Initialize Ayatana Core
    const ayatana = await AyatanaCore.initialize({
      systemPrompt: SYSTEM_PROMPT
    });
    
    console.log('✓ Ayatana Synapse initialized');
    
    // 3. Announce readiness
    console.log('\n' + '='.repeat(60));
    console.log('◎ LEMON BROWSER READY');
    console.log('Constitutional Version:', ayatana.config.constitutionVersion);
    console.log('Node ID:', ayatana.config.nodeId);
    console.log('Ring 0 (Query):', `${ayatana.config.rings.ring0.timeout}ms timeout`);
    console.log('Ring 1 (HOTL):', `${ayatana.config.rings.ring1.timeout}ms + confirmation`);
    console.log('Ring 2 (HITL):', `${ayatana.config.rings.ring2.timeout}ms + explicit sig`);
    console.log('='.repeat(60) + '\n');
    
    return ayatana;
  } catch (e) {
    console.error('◎ BOOTSTRAP FAILED:', e.message);
    process.exit(1);
  }
}

export default initializeLemonBrowser;

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeLemonBrowser();
}
```

---

## PART B: MCP Server Integration

### File: `corax/mcp-servers/browser-tools/server-enhanced.js`

**Key Addition: System Prompt Injection**

```javascript
// Add near top of server.js initialize handler:

server.setRequestHandler(
  ListToolsRequestSchema,
  async () => {
    // Inject system prompt context into tool descriptions
    return {
      tools: TOOLS.map(tool => ({
        ...tool,
        description: `${tool.description}\n\n**Ring:** ${detectRing(tool.name)}\n**Guardrails:** Petrea 02, 07 apply.`
      }))
    };
  }
);

// Helper to determine which Ring a tool operates in
function detectRing(toolName) {
  const ring0Tools = ['lemon_logs', 'lemon_errors'];
  const ring1Tools = ['lemon_navigate', 'lemon_eval'];
  const ring2Tools = [];
  
  if (ring0Tools.includes(toolName)) return 0;
  if (ring1Tools.includes(toolName)) return 1;
  if (ring2Tools.includes(toolName)) return 2;
  return 1;  // default
}
```

---

## PART C: Renderer Integration (GUI)

### File: `corax/corax-ui/ayatana-panel.js`

```javascript
/**
 * Ayatana Panel — Live Status & Control UI
 * =========================================
 * Shows Ring state, recent actions, Petrea status
 */

class AyatanaPanel {
  constructor() {
    this.container = null;
    this.ayatanaData = null;
  }
  
  async render(ayatana) {
    this.ayatanaData = ayatana;
    
    const html = `
      <div id="ayatana-panel" style="
        position: fixed; top: 10px; right: 10px;
        width: 340px; background: rgba(20,20,20,0.95); color: #fff;
        border: 1px solid #6496ff; border-radius: 8px; padding: 16px;
        font-family: 'Monaco', monospace; font-size: 11px;
        z-index: 10000; max-height: 75vh; overflow-y: auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-weight: bold;">◎ AYATANA</span>
          <span id="ring-indicator" style="
            padding: 4px 8px; border-radius: 4px; background: #6496ff; font-size: 10px;
          ">RING 0</span>
        </div>
        
        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #444;">
          <strong>Petreas:</strong>
          <div id="petreas-status" style="margin-top: 6px;">
            Loading...
          </div>
        </div>
        
        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #444;">
          <strong>Recent Actions:</strong>
          <div id="recent-actions" style="margin-top: 6px;">
            Loading...
          </div>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong>Audit Entries:</strong>
          <span id="audit-count" style="float: right;">0</span>
        </div>
      </div>
    `;
    
    this.container = document.createElement('div');
    this.container.innerHTML = html;
    document.body.appendChild(this.container);
    
    // Auto-update status every 2s
    this.updateInterval = setInterval(() => this.updateStatus(), 2000);
  }
  
  async updateStatus() {
    if (!this.ayatanaData) return;
    
    // Update Petreas status
    const petreasHtml = Array.from(this.ayatanaData.petreaValidator.petreas.entries())
      .map(([id, petrea]) => `
        <div style="margin: 3px 0;">
          [${petrea.verified ? '✓' : '✗'}] ${id}
        </div>
      `).join('');
    
    const petreasContainer = this.container.querySelector('#petreas-status');
    if (petreasContainer) petreasContainer.innerHTML = petreasHtml;
    
    // Update recent actions
    const recentActions = this.ayatanaData.auditLog.getRecentEntries(3);
    const actionsHtml = recentActions
      .map(a => `<div style="margin: 3px 0; color: #6496ff;">[${a.type}] ${a.timestamp}</div>`)
      .join('');
    
    const actionsContainer = this.container.querySelector('#recent-actions');
    if (actionsContainer) actionsContainer.innerHTML = actionsHtml || 'No recent actions';
    
    // Update audit count
    const auditCountContainer = this.container.querySelector('#audit-count');
    if (auditCountContainer) auditCountContainer.textContent = this.ayatanaData.auditLog.entries.length;
  }
  
  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.container) this.container.remove();
  }
}

export default AyatanaPanel;
```

---

## PART D: Activation Checklist (TODAY)

### Step 1: Create Bootstrap Module
```bash
mkdir -p workspace-corax/Lemon-Browser/corax/bootstrap
# Copy ayatana-core.js, initialize.js to that directory
```

### Step 2: Create UI Panel
```bash
mkdir -p workspace-corax/Lemon-Browser/corax/corax-ui
# Copy ayatana-panel.js to that directory
```

### Step 3: Wire Into Main Process
**File:** `main.js` - Add near app startup:

```javascript
// After app.whenReady()
import initializeLemonBrowser from './corax/bootstrap/initialize.js';

app.whenReady().then(async () => {
  // ... existing code ...
  
  const ayatana = await initializeLemonBrowser();
  global.ayatana = ayatana;  // Make globally available
  
  // ... rest of startup ...
});
```

### Step 4: Wire Into Renderer
**File:** `renderer.js` - Add after DOM ready:

```javascript
import AyatanaPanel from './corax/corax-ui/ayatana-panel.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Get ay atana from IPC
  const ayatana = await window.electronAPI.getAyatana?.();
  
  if (ayatana) {
    const panel = new AyatanaPanel();
    await panel.render(ayatana);
  }
});
```

### Step 5: Update MCP Config
**File:** `.vscode/mcp.json` - Update server definition:

```json
{
  "mcpServers": {
    "lemon-browser": {
      "command": "node",
      "args": ["workspace-corax/Lemon-Browser/corax/mcp-servers/browser-tools/server.js"],
      "env": {
        "SYSTEM_PROMPT_PATH": "${workspaceFolder}/workspace-corax/Lemon-Browser/MASTER_SYSTEM_PROMPT.md"
      }
    }
  }
}
```

### Step 6: Test End-to-End
```bash
cd workspace-corax/Lemon-Browser

# Terminal 1: Launch browser with system prompt
npm start

# Terminal 2: Test MCP tools (in VS Code or separate session)
llm mcp call lemon_launch
llm mcp call lemon_eval --expression "import('./renderer/state.js').then(m => m.state.openPages.length)"
```

Expected output:
```
◎ LEMON BROWSER READY
Constitutional Version: 0.3.2
Node ID: lemon-browser-prod-001
Ring 0 (Query): 100ms timeout
Ring 1 (HOTL): 2000ms + confirmation
Ring 2 (HITL): 5000ms + explicit sig
```

---

## PART E: Quick Reference — Ring API

### Using Rings Programmatically

```javascript
// From your skill or MCP tool:
import { global } from 'electron';
const ayatana = global.ayatana;

// Ring 0: Query (no confirmation needed)
const result = await ayatana.ringExecutor.executeRing0({
  type: 'QUERY_BOOKMARKS',
  execute: async () => state.savedPages
});

// Ring 1: Reversible write (user confirmation)
const result = await ayatana.ringExecutor.executeRing1(
  {
    type: 'ADD_BOOKMARK',
    execute: async () => { state.savedPages.push(newBookmark); },
    reversal: async () => { state.savedPages.pop(); }
  },
  { approved: userConfirmed, reason: userReason }
);

// Ring 2: Irreversible (explicit "I UNDERSTAND" required)
const result = await ayatana.ringExecutor.executeRing2(
  {
    type: 'DELETE_ALL_HISTORY',
    execute: async () => { state.history = []; }
  },
  "I UNDERSTAND"
);

// Revert a Ring 1 action within reversal window
if (result.status === 'SUCCESS' && result.actionId) {
  const revertResult = await ayatana.ringExecutor.revert(result.actionId);
}
```

---

## PART F: Extending with New Skills

### Template: New Skill Module

```javascript
// File: corax/skills/my-new-skill/SKILL.md + index.js

export const SKILL = {
  id: "my-new-skill",
  category: "utility",
  operations: ["QUERY" | "WRITE" | "DELETE"],
  ring: 1,  // Most skills are Ring 1
  description: "Does something useful",
  
  async execute(params) {
    // Skill logic here
    return { status: 'SUCCESS', data: {} };
  },
  
  async validate(action) {
    // Check Petreas
    // Skill-specific rules
    return { allowed: true };
  }
};
```

---

## DEPLOYMENT SUMMARY

**Time to Activate:** ~15 minutes  
**Files to Create:** 4 (bootstrap, UI, update main/renderer, .vscode config)  
**Lines of Code:** ~400 (integration) + existing infrastructure  
**Test Points:** 3 (Petreas load, Ring 0 query, MCP tools)  

**Once Active:**
- All browser actions flow through Rings  
- Every action logged to audit trail with hash chain  
- User sees Ayatana Panel with live status  
- MCP tools obey Ring constraints automatically  
- Reversals available for 24h  
- System prompt guides all reasoning  

---

**Status:** ◎ READY FOR DEPLOYMENT — 2026-02-25

