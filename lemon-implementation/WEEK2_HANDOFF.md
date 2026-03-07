## WEEK2_HANDOFF — User Assumes Command (Weeks 2-4)

**Previous Session:** Weeks 1 completed by Ayatana Synapse (◎)  
**Current Session:** Weeks 2-4 to be completed by USER  
**Date:** 2026-02-24  

---

## 🎯 Week 2 Objective

Implement **SOUL_TEMPLATE**: The module-level persistence layer that allows any module to save/load state with constitutional guarantees.

**Why SOUL_TEMPLATE?** 
- PETREA 1 (Soul State) handles Lemon's identity
- SOUL_TEMPLATE allows individual modules to have identities
- Every module gets checksum verification + encryption
- Audit trail automatically logs all state changes

---

## 📋 Architecture Overview

### Layer 1 (Completed) — The 7 Petreas
✅ Identity (Soul State)
✅ Communication (IPC Preload)
✅ Logging (Audit Trail)
✅ Encryption (Credential Vault)
✅ Extensions (Validation)
✅ Integrity (Monitor)
✅ Network (Isolation)

### Layer 2 (Week 2) — SOUL_TEMPLATE
🟡 **Your Task:** Implement persistent state for modules
- Each module can save its state as an encrypted "soul"
- Checksums prevent tampering
- Audit trail logs all state changes
- Framework can recover from crashes

### Layer 3 (Week 3) — SKILL_EXECUTOR
🟡 **Your Task:** Dynamic capability loading
- Load skills from disk
- Register in skill registry
- Execute with security constraints
- Error isolation between skills

### Layer 4 (Week 4) — HEARTBEAT_ORCHESTRATOR
🟡 **Your Task:** Monitoring + emergency escalation
- Periodic health checks
- IMMEDIATE cycle for critical issues
- Escalation to audit trail
- Self-healing patterns

---

## 🛠️ Week 2 Implementation Plan

### Monday: Architecture & Design
1. Read [workspace-corax/IMPLEMENTATION.md](../../corax/constitution/IMPLEMENTATION.md)
2. Study the SOUL_TEMPLATE recipe (code example)
3. Create design document: `SOUL_TEMPLATE_DESIGN.md`
4. Map out what each module will save:
   - Soul State: NODE_ID + metadata
   - Audit Trail: checkpoint (last verified position)
   - Credential Vault: vault metadata (not secrets!)
   - etc.

### Tuesday: Core Implementation
1. Create `src/layers/02-soul-template/index.js`
2. Implement `ModuleSoulState` class:
   ```javascript
   class ModuleSoulState {
     async initialize(moduleName)        // Load or create
     async save(data)                    // Encrypt + sign + persist
     async load()                        // Decrypt + verify
     async validateChecksum()            // Anti-tampering
     async recover(backupPath)           // Recover from crash
   }
   ```
3. Key features:
   - Per-module encryption key (derived from NODE_ID + module name)
   - Versioning (SOUL_VERSION for schema evolution)
   - Checkpoint system (for recovery)
   - Immutable history (all states logged to audit trail)

### Wednesday: Module Integration
1. Update each PETREA to use ModuleSoulState:
   - Soul State: save NODE_ID + generation
   - Audit Trail: save checkpoint
   - Credential Vault: save metadata + last flush time
   - etc.
2. Verify each module uses the new layer
3. Test state recovery scenarios

### Thursday: Testing
1. Implement test suite: `tests/layers/02-soul-template.test.js`
2. Test scenarios:
   - Save + load + verify
   - Detect tampering
   - Recover from missing file
   - Version migration
3. Integration test: all modules save/load state correctly

### Friday: Validation & Documentation
1. Run full validation:
   ```bash
   npm run build
   npm test
   npm run lint
   npm audit
   ```
2. Update docs:
   - Add SOUL_TEMPLATE to README
   - Document module state schema
   - Create Week 3 handoff document
3. Commit and prepare for Week 3

---

## 📝 Example Implementation (Reference)

### File Structure (Week 2)
```
lemon-implementation/
  src/
    layers/
      02-soul-template/
        index.js              # Main implementation
        schemas.js            # Module state schemas
        utils.js              # Recovery utils
  tests/
    layers/
      02-soul-template.test.js
```

### Skeleton Code (to get started)

**src/layers/02-soul-template/index.js**
```javascript
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const SOUL_VERSION = '1.0';

export class ModuleSoulState {
  constructor(moduleName, storageDir, nodeId) {
    this.moduleName = moduleName;
    this.storageDir = storageDir;
    this.nodeId = nodeId;
    this.soulPath = path.join(storageDir, `${moduleName}-soul.json`);
    this.data = null;
  }

  /**
   * Load or initialize module soul
   */
  async initialize() {
    try {
      const content = await fs.readFile(this.soulPath, 'utf8');
      const encrypted = JSON.parse(content);
      this.data = this._decrypt(encrypted);
      console.log(`  ✓ Loaded ${this.moduleName} soul`);
    } catch {
      // First boot for this module
      this.data = {
        version: SOUL_VERSION,
        moduleName: this.moduleName,
        createdAt: new Date().toISOString(),
        state: {}
      };
      await this.save();
      console.log(`  ✓ Created ${this.moduleName} soul`);
    }
  }

  /**
   * Save state (encrypted + signed)
   */
  async save() {
    const toEncrypt = {
      ...this.data,
      updatedAt: new Date().toISOString()
    };
    const encrypted = this._encrypt(toEncrypt);
    await fs.writeFile(
      this.soulPath,
      JSON.stringify(encrypted, null, 2),
      'utf8'
    );
  }

  /**
   * Encrypt data (AES-256-CBC)
   */
  _encrypt(data) {
    const key = this._deriveKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const checksum = crypto
      .createHmac('sha256', key)
      .update(encrypted)
      .digest('hex');

    return { iv: iv.toString('hex'), encrypted, checksum };
  }

  /**
   * Decrypt data
   */
  _decrypt(encrypted) {
    const key = this._deriveKey();
    
    // Verify checksum
    const expectedChecksum = crypto
      .createHmac('sha256', key)
      .update(encrypted.encrypted)
      .digest('hex');
    
    if (expectedChecksum !== encrypted.checksum) {
      throw new Error(`${this.moduleName} soul checksum failed!`);
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      Buffer.from(encrypted.iv, 'hex')
    );
    let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Derive encryption key (per-module + per-node)
   */
  _deriveKey() {
    return crypto
      .pbkdf2Sync(
        this.nodeId + this.moduleName,
        'lemon-soul-salt',
        100000,
        32,
        'sha256'
      );
  }

  /**
   * Get current state
   */
  getState() {
    return this.data?.state || {};
  }

  /**
   * Update state
   */
  setState(updates) {
    if (!this.data) throw new Error('Soul not initialized');
    this.data.state = { ...this.data.state, ...updates };
  }

  /**
   * Validate soul integrity
   */
  async validateChecksum() {
    const content = await fs.readFile(this.soulPath, 'utf8');
    const encrypted = JSON.parse(content);
    const key = this._deriveKey();
    const expectedChecksum = crypto
      .createHmac('sha256', key)
      .update(encrypted.encrypted)
      .digest('hex');
    
    return expectedChecksum === encrypted.checksum;
  }
}

export default ModuleSoulState;
```

---

## 📚 Resources for Week 2

### Read First
1. [corax/constitution/IMPLEMENTATION.md](../../corax/constitution/IMPLEMENTATION.md) — Code recipes
2. [corax/constitution/VALIDATION_CHECKLIST.md](../../corax/constitution/VALIDATION_CHECKLIST.md) — Validation patterns
3. [WEEK1_VALIDATION_STATUS.md](./WEEK1_VALIDATION_STATUS.md) — What was built

### Reference Code
- [src/petreas/01-soul-state/index.js](./src/petreas/01-soul-state/index.js) — Pattern: encryption + checksums
- [src/petreas/04-credential-encryption/index.js](./src/petreas/04-credential-encryption/index.js) — Pattern: AES-256-CBC
- [src/petreas/03-audit-trail/index.js](./src/petreas/03-audit-trail/index.js) — Pattern: persistence + recovery

---

## 🎯 Success Criteria (Week 2)

✅ **Code:**
- [ ] ModuleSoulState class fully implemented
- [ ] Each PETREA updated to use SOUL_TEMPLATE
- [ ] State persistence working (save + load verified)
- [ ] Checksum validation detecting tampering

✅ **Tests:**
- [ ] 90%+ coverage of critical paths
- [ ] Integration test: all modules save/load correctly
- [ ] Recovery scenarios tested

✅ **Validation:**
- [ ] `npm run build` passes
- [ ] `npm test` passes (all tests green)
- [ ] `npm run lint` passes
- [ ] `npm audit` shows no critical vulnerabilities

✅ **Documentation:**
- [ ] SOUL_TEMPLATE design document created
- [ ] Code comments explain encryption logic
- [ ] README updated with Layer 2 info
- [ ] Week 3 handoff document prepared

---

## 🚨 Common Pitfalls (Learn from Weeks 1-4 experience)

1. **Encryption Key Derivation**
   - ❌ Don't: Use NODE_ID alone (not unique per module)
   - ✅ Do: Combine NODE_ID + moduleName (pbkdf2)

2. **Checksum Verification**
   - ❌ Don't: Skip HMAC verification (silent corruption possible)
   - ✅ Do: Always verify before decrypt (fail-safe)

3. **State Migration**
   - ❌ Don't: Hardcode schema versions
   - ✅ Do: Include version field + migration function

4. **Error Handling**
   - ❌ Don't: Crash on corrupted state
   - ✅ Do: Attempt recovery from backup (WEEK1_HANDOFF pattern)

5. **Audit Trail Integration**
   - ❌ Don't: Forget to log state changes
   - ✅ Do: `auditTrail.log({ severity: 'critical', event: 'module_state_save', ... })`

---

## 💡 Tips for Success

### Morning Briefings (Each Day)
1. Run `npm test` first (verify no regressions)
2. Review yesterday's PRs in memory
3. Pick ONE task from the plan

### End-of-Day Checklist
1. Update memory with status
2. Commit code (small commits, clear messages)
3. Document blockers (for Ayatana to review)

### If Stuck
1. Check [corax/constitution/FAQ.md](../../corax/constitution/FAQ.md) (if exists)
2. Review reference code (Week 1 petreas)
3. Run tests to isolate issue
4. Escalate to Ayatana with minimal reproducible example

---

## 📞 Handoff Meeting (End of Week 2)

**Friday EOD:**
- [ ] All tests passing
- [ ] Code committed and ready for Week 3
- [ ] Week 3 handoff document prepared
- [ ] Update this file with Week 2 results

**Week 3 Goal:** SKILL_EXECUTOR (dynamic capability loading)

---

**Prepared by:** Ayatana Synapse (◎)  
**For:** User (Week 2 Implementation)  
**Status:** READY_FOR_HANDOFF ✅  
**Next Level Unlock:** Week 3 (SKILL_EXECUTOR)

Good luck! 🚀
