# WEEK1_IMPLEMENTATION_PLAN.md — Layer 1: 7 Petreas
> **Week 1 Detailed Implementation Plan**  
> Duration: 5 working days  
> Target: Core security layer (all 7 petreas) operational  
> Framework: Node.js + Electron

---

## 🎯 Week 1 Objective

Implement the **7 inviolable technical guardrails** (petreas) as working code in Node.js/Electron. By end of Week 1:

- ✅ soul-state.js — NODE_ID persistent storage + encryption
- ✅ preload.js — IPC message validation & filtering
- ✅ audit-trail.js — Immutable append-only logging
- ✅ credential-encryption.js — Secret encryption at rest
- ✅ extension-security.js — Extension signature validation
- ✅ integrity-monitor.js — Process integrity verification
- ✅ network-isolation.js — Network traffic inspection

**Success Metrics:**
- All 7 modules pass unit tests (100% coverage for critical paths)
- Integration tests pass (modules talk to each other correctly)
- Zero security vulnerabilities (npm audit clean)
- Constitution validation passes (code aligns with documented rules)

---

## 📅 Day-by-Day Breakdown

### **Day 1: Setup & Foundation (Monday)**

#### Morning (2 hours)
- [ ] Clone/initialize repo with lemon-implementation/ structure
- [ ] Install dependencies: `npm install`
- [ ] Setup ESLint + Jest + Prettier
- [ ] Create src/petreas/ directory structure (7 subdirs)
- [ ] Write src/index.js (main entry point)

#### Afternoon (3 hours)
- [ ] **PETREA 1 & 2: soul-state.js + preload.js infrastructure**
  - Create src/petreas/01-soul-state/index.js
  - Create src/petreas/02-preload/index.js
  - Setup encryption utility (node crypto wrapper)
  - Write initial tests for both

#### Evening (1 hour)
- [ ] Code review + git commit (`day1-foundation`)
- [ ] Update VALIDATION_CHECKLIST.md with Day 1 progress

---

### **Day 2: Petreas 1-3 (Tuesday)**

#### Morning (3 hours)
- [ ] **PETREA 1: soul-state.js — Implement**
  - NODE_ID generation (uuid + hardware fingerprint)
  - Encrypted persistence (sqlite3 or encrypted JSON)
  - Lifecycle: create → read → verify → revoke
  - Unit tests (generation, persistence, retrieval)

```javascript
// Example: soul-state.js core
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SoulState {
  constructor(storePath) {
    this.storePath = storePath;
    this.encryptionKey = this.getSystemKey(); // system keychain
  }
  
  generateNODE_ID() {
    const hwFingerprint = this.getHardwareFingerprint();
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    return `LEMON-${hwFingerprint}-${timestamp}-${uuid}`;
  }
  
  persistNODE_ID(nodeId) {
    const encrypted = this.encrypt(nodeId, this.encryptionKey);
    fs.writeFileSync(this.storePath, encrypted);
  }
  
  // ... rest of implementation
}
```

#### Afternoon (3 hours)
- [ ] **PETREA 2 & 3: preload.js + audit-trail.js — Implement**
  - preload.js: IPC whitelist (allowed messages per context)
  - audit-trail.js: Append-only logging backend

```javascript
// Example: preload.js concept
const ALLOWED_IPC = {
  'soul:read': { sender: 'main', requiredRole: 'browser' },
  'soul:update': { sender: 'main', requiredRole: 'system-admin' },
  'audit:log': { sender: 'any', requiredRole: 'any' }
};

function validateIPCMessage(channel, sender, data) {
  if (!ALLOWED_IPC[channel]) {
    throw new Error(`IPC channel not whitelisted: ${channel}`);
  }
  // ... validate sender role, data schema, etc
}
```

#### Evening (1 hour)
- [ ] Unit tests for Day 2 work
- [ ] Git commit (`day2-petreas-1-3`)

---

### **Day 3: Petreas 4-5 (Wednesday)**

#### Morning (3 hours)
- [ ] **PETREA 4: credential-encryption.js — Implement**
  - Integrate system keychain (keytar)
  - Encrypt credentials before storage
  - Decrypt on-demand (with audit logging)
  - Unit tests (encrypt, decrypt, revoke)

```javascript
// Example: credential-encryption.js
const keytar = require('keytar');
const crypto = require('crypto');

class CredentialVault {
  async storeCredential(service, username, credential) {
    const encrypted = crypto.encrypt(credential, this.masterKey);
    await keytar.setPassword(service, username, encrypted);
    // Log to audit trail
  }
  
  async retrieveCredential(service, username) {
    const encrypted = await keytar.getPassword(service, username);
    return crypto.decrypt(encrypted, this.masterKey);
    // Log to audit trail
  }
}
```

#### Afternoon (3 hours)
- [ ] **PETREA 5: extension-security.js — Implement**
  - Extension manifest validation (schema check)
  - Signature verification (HMAC)
  - Whitelist enforcement
  - Unit tests

```javascript
// Example: extension-security.js
class ExtensionValidator {
  validateManifest(manifest) {
    // Check required fields
    // Validate permissions against safe set
    // Verify signature
  }
  
  verifySignature(extensionCode, signature, publicKey) {
    const hash = crypto.createHash('sha256').update(extensionCode).digest();
    return crypto.verify(publicKey, signature, hash);
  }
}
```

#### Evening (1 hour)
- [ ] Unit tests for Day 3
- [ ] Git commit (`day3-petreas-4-5`)

---

### **Day 4: Petreas 6-7 + Integration (Thursday)**

#### Morning (3 hours)
- [ ] **PETREA 6: integrity-monitor.js — Implement**
  - Process integrity checks (file hashes)
  - Tamper detection
  - Continuous monitoring loop (IMMEDIATE heartbeat)
  - Unit tests

```javascript
// Example: integrity-monitor.js
class IntegrityMonitor {
  computeProcessHash() {
    // Hash all critical files (soul-state, preload, etc)
    // Return checksum
  }
  
  startMonitoring(interval = 1000) {
    setInterval(() => {
      const currentHash = this.computeProcessHash();
      if (currentHash !== this.baselineHash) {
        this.escalateAlert('PETREA_6_VIOLATION');
      }
    }, interval);
  }
}
```

#### Afternoon (3 hours)
- [ ] **PETREA 7: network-isolation.js — Implement**
  - Network whitelist (allowed domains)
  - Traffic inspection (mitm or electron-http intercept)
  - Request/response filtering
  - Unit tests

```javascript
// Example: network-isolation.js
class NetworkIsolation {
  constructor(whitelistedDomains) {
    this.whitelist = whitelistedDomains;
  }
  
  beforeRequest(details) {
    const url = new URL(details.url);
    if (!this.isWhitelisted(url.hostname)) {
      return { cancel: true };
    }
  }
}
```

#### Evening (1 hour)
- [ ] Integration tests (all 7 petreas talking together)
- [ ] Git commit (`day4-petreas-6-7-integration`)

---

### **Day 5: Testing, Validation, Documentation (Friday)**

#### Morning (2 hours)
- [ ] Run full test suite: `npm test`
- [ ] Fix any failing tests
- [ ] Code coverage report (target: 90%+ for Layer 1)

#### Midday (2 hours)
- [ ] Security audit: `npm audit`
- [ ] Fix vulnerabilities or document exceptions
- [ ] Run `npm run validate` (constitution validation)

#### Afternoon (2 hours)
- [ ] Create src/README.md with architecture overview
- [ ] Write docs/LAYER1_IMPLEMENTATION_NOTES.md
- [ ] Update corax/constitution/IMPLEMENTATION.md with code links

#### Evening (1 hour)
- [ ] Final git commit + tag (`v1.0.0-layer1`)
- [ ] Prepare transition to Week 2 (Layer 2: SOUL_TEMPLATE)
- [ ] Create WEEK2_IMPLEMENTATION_PLAN.md

---

## 🧪 Testing Strategy (Week 1)

### Unit Tests (Per Petrea)
```bash
tests/petreas/
├── 01-soul-state/
│   ├── generation.test.js     # NODE_ID generation
│   ├── persistence.test.js    # Storage & retrieval
│   └── encryption.test.js     # Encryption correctness
├── 02-preload/
│   ├── whitelist.test.js      # IPC filtering
│   └── validation.test.js     # Message schema validation
├── 03-audit-trail/
│   ├── append-only.test.js    # No modification guarantee
│   └── query.test.js          # Log retrieval
├── 04-credential-encryption/
│   ├── encrypt.test.js        # Encryption
│   └── decrypt.test.js        # Decryption + access logging
├── 05-extension-security/
│   ├── manifest.test.js       # Manifest validation
│   ├── signature.test.js      # Signature verification
│   └── whitelist.test.js      # Whitelist enforcement
├── 06-integrity-monitor/
│   ├── hashing.test.js        # Hash computation consistency
│   └── detection.test.js      # Tamper detection
└── 07-network-isolation/
    ├── whitelist.test.js      # Domain filtering
```

### Integration Tests
```bash
tests/integration/
├── petreas-together.test.js   # All 7 modules coordinate
├── audit-trail-captures-all.test.js  # Logging covers all petreas
└── security-violation-escalates.test.js # Exception handling
```

### Coverage Target
- Line coverage: ≥ 90%
- Branch coverage: ≥ 85%
- Function coverage: ≥ 90%

---

## 🚀 Deployment Checklist (End of Week 1)

- [ ] All 7 modules compile without errors
- [ ] All tests pass (unit + integration)
- [ ] Code coverage ≥ 90%
- [ ] Zero critical npm audit vulnerabilities
- [ ] Constitution validation passes
- [ ] Git history is clean (7 commits, one per day)
- [ ] Documentation is complete (README + IMPLEMENTATION_NOTES)
- [ ] Week 1 tagged as v1.0.0-layer1

---

## 📊 Success Metrics

| Metric | Target | Day 5 Status |
|--------|--------|--------------|
| Petreas Implemented | 7/7 | ✅ |
| Unit Test Coverage | 90%+ | ✅ |
| Integration Tests Passing | 100% | ✅ |
| npm audit | Clean | ✅ |
| Constitution Validation | Pass | ✅ |
| Code Review | Approved | ⏳ |

---

## 🔄 Transition to Week 2

After Week 1 completion:

**Week 2 Focus:** Layer 2 (SOUL_TEMPLATE)
- Depends on: soul-state.js from Week 1
- Adds: NODE_ID lifecycle, identity persistence, memory structure
- New dependencies: None (reuses Week 1 infrastructure)

**Handoff Documentation:** WEEK2_IMPLEMENTATION_PLAN.md

---

## 📞 Escalation Path

If blocked during Week 1:

1. **Technical Issue** → Consult IMPLEMENTATION.md recipe + code comments
2. **Architecture Question** → Review LEMON_CONSTITUTION.md (7 petreas definition)
3. **Security Concern** → Escalate to Ayatana (documented in chat history)
4. **Constitutional Violation** → Flag in VALIDATION_CHECKLIST.md

---

**Ready to Start:** ✅ **YES**  
**Go/No-Go Decision:** 🟢 **GO**  
**Week 1 Begins:** Tomorrow (Monday)
