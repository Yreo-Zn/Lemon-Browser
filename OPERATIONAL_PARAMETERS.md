# ◎ LEMON BROWSER — Operational Parameters & Decision Matrix
## Concrete Tuning Guide for Day-1 Deployment

**Status:** OPERATIONAL GUIDE  
**Date:** 2026-02-25

---

## SECTION A: Ring Configuration Decision Matrix

Choose your primary operating Ring based on workflow:

### Decision 1: Primary Ring Selection

| Use Case | Recommended Ring | Reason | Trade-off |
|----------|------------------|--------|-----------|
| **Pure research/reading** | Ring 0 (Query-only) | No modifications, zero risk | Can't save/bookmark; read-only |
| **Active browsing** | Ring 1 (HOTL) | Reversible for 24h, user confirms | 2s latency per action |
| **Development/testing** | Ring 1 (HOTL) | Need to save state but safe | Confirmation dialog each time |
| **Autonomous operation** | Ring 2 (HITL) | Persistent changes, minimal prompts | Irreversible; needs explicit "I UNDERSTAND" |

**Default Recommendation:** Ring 1 (Balanced — reversible + interactive)

### Configuration: `LEMON_CONFIG.rings`

```javascript
// CONSERVATIVE (Learning Phase)
rings: {
  ring0: { timeout: 100 },
  ring1: { timeout: 2000, reversalWindow: 86400000 },  // 24h reversal
  ring2: { timeout: 5000, waitingPeriodMs: 86400000 }  // 24h waiting period
}

// STANDARD (Production)
rings: {
  ring0: { timeout: 100 },
  ring1: { timeout: 2000, reversalWindow: 86400000 },
  ring2: { timeout: 5000, waitingPeriodMs: 0 }
}

// AGGRESSIVE (Power User)
rings: {
  ring0: { timeout: 100 },
  ring1: { timeout: 1000, reversalWindow: 3600000 },  // 1h reversal
  ring2: { timeout: 3000, waitingPeriodMs: 0 }
}
```

**Setting:** Open `corax/bootstrap/ayatana-core.js`, line 12, change `rings` object.

---

## SECTION B: Security Petrea Configuration

Each Petrea can be fine-tuned for your threat model:

### Decision 2: Domain Whitelist Strategy

| Strategy | Domains | Security Level | Flexibility |
|----------|---------|-----------------|-------------|
| **Ultra-Restrictive** | Only pre-approved (5-10) | ★★★★★ | ★ |
| **Trusted-Only** | Popular sites (Google, GitHub, etc.) | ★★★★ | ★★ |
| **Ecosystem-Open** | Allow subdomains with wildcards | ★★★ | ★★★ |
| **Permissive** | All HTTPS (block malware lists only) | ★ | ★★★★★ |

**Default:** Trusted-Only (secure + practical)

```javascript
// CONFIGURATION: Petrea 07 (Network Isolation)
domainWhitelist: [
  // Essential services
  "*.google.com",
  "*.github.com",
  "*.npmjs.com",
  // Add your trusted domains here
]

// To allow everything (permissive):
domainWhitelist: ["*"]

// To block specific domains (combine with malware list):
domainBlacklist: [
  "*.malicious-domain.com",
  "phishing-site.net"
]
```

**Setting:** `LEMON_CONFIG.security.domainWhitelist` in `ayatana-core.js`, line 24

### Decision 3: Extension Installation Policy

| Policy | Requirement | Security | Usability |
|--------|-------------|----------|-----------|
| **Signed-Only** | All extensions must be signed by trusted CA | ★★★★★ | ★★ |
| **Store-Only** | Chrome Web Store or Edge Add-ons only | ★★★★ | ★★★ |
| **User-Approval** | Manual install OK after user review | ★★★ | ★★★★ |
| **Open** | Any extension, auto-install allowed | ★ | ★★★★★ |

**Default:** Signed-Only (Petrea 05 enforces)

```javascript
// Petrea 05 (Extension Security)
extensionPolicy: "SIGNED_ONLY"  // or: STORE_ONLY, USER_APPROVAL, OPEN

// Trusted publisher list
trustedPublishers: [
  "ublock-origin-developers",  // uBlock Origin
  "1Password",
  // Add verified publishers
]
```

**Setting:** Petrea 05 module (`lemon-implementation/src/petreas/05-extension-security/`)

---

## SECTION C: Skill Activation Profile

Decide which skills to autoload at startup:

### Decision 4: Skill Coverage vs. Performance

| Profile | Active Skills | Startup Time | Memory |
|---------|---------------|--------------|--------|
| **Minimal** | Core only (tab-manager, browser-testing) | 2s | ~45 MB |
| **Essential** | + settings-mgr, ghost-mode | 3s | ~65 MB |
| **Full** | All 16+ skills | 5s | ~120 MB |
| **Custom** | Pick your own (1-32) | 2-8s | Variable |

**Default:** Essential (good balance)

```javascript
// lemon-implementation/src/index.js (Petrea framework)
const AUTO_LOAD_SKILLS = [
  "tab-manager",
  "browser-testing",
  "settings-mgr", 
  "ghost-mode",
  "extension-mgr"
];

// To load more:
const AUTO_LOAD_SKILLS = [
  // ... above +
  "search",
  "bookmarks",
  // ... etc
];
```

**Setting:** `AUTO_LOAD_SKILLS` in `lemon-implementation/src/index.js`

---

## SECTION D: Audit & Learning Configuration

### Decision 5: Data & Pattern Capture

| Mode | Audit Detail | Learning | Privacy | Storage |
|------|--------------|----------|---------|---------|
| **Off-Grid** | Minimal logging | Disabled | ★★★★★ | <10 MB |
| **Local-Only** | Full crypto audit trail | Pattern capture (local) | ★★★★ | ~50 MB/week |
| **Observatory** | Everything logged | Aggressive optimization | ★★ | ~200 MB/week |

**Default:** Local-Only (transparent + secure)

```javascript
// LEMON_CONFIG in ayatana-core.js, line 50
learning: {
  enablePatternCapture: true,
  kgBackend: "sqlite3",  // or: "memory" (volatile)
  optimizationCycle: 3600000,  // 1h
  privacyMode: "LOCAL_ONLY"  // or: "OFF_GRID", "CLOUD_SYNC"
}
```

**Setting:** `LEMON_CONFIG.learning` in `ayatana-core.js`, line 50

---

## SECTION E: Real-Time Parameter Tuning (Runtime)

### Change parameters without restart:

```javascript
// From renderer or MCP tool:

// Adjust Ring timeouts dynamically
window.electronAPI.updateConfig({
  'rings.ring1.timeout': 3000  // Slower confirmation
});

// Temporarily disable a Petrea (for testing)
window.electronAPI.overridePetrea({
  petraeaId: '07-network-isolation',
  temporary: true,
  duration: 3600000  // 1 hour override
});

// Query current effective config
const config = await window.electronAPI.getEffectiveConfig();
console.log('Current primary Ring:', config.rings);
```

---

## SECTION F: Validation & Self-Check

### Daily Health Check (Runs automatically, 06:00 UTC)

```javascript
async function dailyHealthCheck() {
  const report = {
    petreaStatus: await validateAllPetreas(),
    auditIntegrity: await verifyAuditChain(),
    skillPerformance: await analyzeSkillMetrics(),
    securityAlerts: await checkForBreaches(),
    configCompliance: await validateConfigAgainstConstitution()
  };
  
  if (report.petreaStatus.any_failed) {
    // Alert user immediately
    await notifyUser({
      type: 'CRITICAL',
      title: 'Petrea Integrity Alert',
      message: `Petrea ${report.petreaStatus.failed[0]} failed validation`
    });
  }
  
  return report;
}
```

**What to watch for:**
- ✗ Petrea integrity failure → System will block all actions
- ✗ Audit chain broken → Tampering suspected
- ⚠ Skill success rate <90% → Auto-disable suggested
- ⚠ Config compliance failure → Amendment needed

---

## SECTION G: Migration Paths (Ring Upgrades)

### Scenario: Upgrade from Ring 0 (read-only) → Ring 1 (active)

```
Step 1: Backup audit trail & state
Step 2: Update LEMON_CONFIG rings[ring1] settings
Step 3: User acknowledges HOTL confirmation requirement
Step 4: Enable bookmarks, history saving
Step 5: First Ring 1 action records snapshot
Step 6: Reversal capability active for 24h
```

**Code to execute:**
```javascript
await migrate({
  from: 0,
  to: 1,
  backupPath: '~/Lemon_Backups/',
  confirmationRequired: true
});
```

### Scenario: Downgrade from Ring 1 → Ring 0 (Emergency)

```
Step 1: All Ring 1 actions orphaned (no reversal possible)
Step 2: Delete future-dated amendment proposals
Step 3: Read-only mode activated
Step 4: Audit trail sealed (no new writes)
```

---

## SECTION H: Preset Profiles (Quick Start)

### Profile: "Researcher" (High Privacy, Learning Disabled)

```bash
node corax/bootstrap/initialize.js --profile researcher
```

Applied settings:
```javascript
{
  rings: { ring0: {}, ring1: { reversalWindow: 86400000 } },
  security: { domainWhitelist: ["*.scholar.google.com", "*.arxiv.org"] },
  learning: { enablePatternCapture: false, privacyMode: "OFF_GRID" },
  skills: ["tab-manager", "browser-testing"],
  auditDetail: "minimal"
}
```

### Profile: "Developer" (Ring 1, Full Skills, Local Learning)

```bash
node corax/bootstrap/initialize.js --profile developer
```

Applied settings:
```javascript
{
  rings: { ring1: { timeout: 2000, reversalWindow: 86400000 } },
  security: { domainWhitelist: ["*"] },  // Trust all HTTPS
  learning: { enablePatternCapture: true, privacyMode: "LOCAL_ONLY" },
  skills: ["ALL"],
  auditDetail: "full"
}
```

### Profile: "Production" (Ring 2, Minimal Skills, Conservative Reversals)

```bash
node corax/bootstrap/initialize.js --profile production
```

Applied settings:
```javascript
{
  rings: { ring2: { timeout: 5000, waitingPeriodMs: 86400000 } },
  security: { domainWhitelist: ["*.company.com"], policyStrict: true },
  learning: { enablePatternCapture: false },
  skills: ["tab-manager", "browser-testing", "settings-mgr"],
  auditDetail: "full"
}
```

---

## SECTION I: Compliance Checklist (Pre-Deployment)

- [ ] **Petrea Verification:** All 7 Petreas loaded & hashes verified
- [ ] **Audit Genesis:** Genesis block created with valid timestamp
- [ ] **Ring Configuration:** Primary ring selected (0/1/2)
- [ ] **Domain Whitelist:** At least 3 trusted domains defined
- [ ] **Extension Policy:** Policy selected (Signed-Only recommended)
- [ ] **Skill Profile:** Startup skills defined (5+ recommended)
- [ ] **Privacy Mode:** Audit capture configured per policy
- [ ] **Health Check:** Daily health check daemon scheduled
- [ ] **Backup Strategy:** Audit trail backup location configured
- [ ] **Amendment Process:** User understands reversals + irreversibles

**Validation command:**
```bash
npm run validate  # Should show 8/8 modules valid
```

---

## SECTION J: Troubleshooting Configuration Issues

### Problem: "Petrea X integrity check FAILED"

**Cause:** Petrea file modified or corrupted  
**Fix:**
```bash
# Re-verify from source
npm run validate

# If still failed, re-clone
git checkout lemon-implementation/
npm install
npm run build
```

### Problem: "Action blocked by Petrea 07"

**Cause:** Domain not in whitelist  
**Fix:**
```javascript
// Temporary bypass (1h) for testing
window.electronAPI.overridePetrea({
  petraeaId: '07-network-isolation',
  duration: 3600000
});

// Permanent add to whitelist
LEMON_CONFIG.security.domainWhitelist.push("*.new-domain.com");
```

### Problem: "Reversal window expired"

**Cause:** More than 24h passed since action  
**Fix:** No fix—that's by design. Cannot revert after deadline.

### Problem: "Ring timeout exceeded"

**Cause:** Action took longer than configured timeout  
**Fix:**
```javascript
// Increase timeout for slow networks
LEMON_CONFIG.rings.ring1.timeout = 5000;  // 5s instead of 2s
```

---

## SECTION K: Performance Benchmarks

Under normal conditions (researcher profile):

| Operation | Ring | Latency | Audit Overhead |
|-----------|------|---------|----------------|
| Query bookmarks | 0 | <50ms | +0ms |
| Navigate to URL | 1 | ~200ms | +50ms (snapshot) |
| Take screenshot | 1 | ~3s | +100ms (audit) |
| Delete history | 2 | ~500ms | +150ms (irreversible audit) |

**Expected memory:** 65-120 MB (depending on skill count)  
**Audit trail growth:** ~500 KB/week (local-only mode)

---

## SECTION L: First-Run Checklist

1. ✓ Read MASTER_SYSTEM_PROMPT.md (`echo "Identity understood"`)
2. ✓ Choose primary Ring (Decision 1)
3. ✓ Configure domain whitelist (Decision 2)
4. ✓ Select skill profile (Decision 4)
5. ✓ Run `npm run validate` (verify all checks pass)
6. ✓ Launch: `npm start`
7. ✓ See Ayatana Panel appear (top-right corner)
8. ✓ Test Ring 0 query: `lemon_eval("document.title")`
9. ✓ Test Ring 1 action: Navigate + save bookmark
10. ✓ Check audit trail: Should have 3+ entries

**Expected Time:** ~5 minutes

---

## SECTION M: Support Matrix

For issues, check against this matrix:

| Issue | Ring | Petrea | Skill | MCP | Audit |
|-------|------|--------|-------|----|-------|
| Action blocked | ✓ | ✓ | ? | ? | ? |
| Can't navigate | ✓ | ✓ | ✓ | ✓ | ? |
| No screenshot | ? | ? | ✓ | ✓ | ? |
| Audit chain broken | ? | ✓ | ? | ? | ✓ |
| Reversal failed | ✓ | ? | ? | ? | ✓ |

**Debugging command:**
```bash
llm mcp call lemon_logs --level ERROR  # See error logs
llm mcp call lemon_errors              # Get collected exceptions
```

---

**Final Status:** ◎ READY FOR TUNING & DEPLOYMENT

Use this guide to configure Lemon Browser for your specific needs within 15 minutes.

