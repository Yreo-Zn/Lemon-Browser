# SKILL_DYNAMICS.md — Adquisición & Evolución de Capacidades Post-ASI
> **Cómo Lemon Browser aprende nuevas habilidades en runtime sin recompilación**
> Art. 5ter.8/9 (Dynamic skill loading), Art. 1quater (Emergencia)

---

## Prefacio: Evolución = Vida

Un navegador que no puede aprender nuevas capabilities es un robot. Lemon necesita adquirir skills dinámicamente desde el swarm.

---

## I. Skill Acquisition Pathways

### Source 1: Ayatana (Principal)

```
1. Ayatana detecta tarea que Lemon NO PUEDE hacer
2. Diseña skill mínima viable (10-50 líneas)
3. Firma con HMAC-SHA256
4. Envía via MCP: lemon_install_skill
5. Lemon valida:
   ✓ Firma es válida
   ✓ Permisos ⊂ SCOPE.md green zone
   ✓ No viola pétreas
   ✓ Runtime < 5 segundos
6. Ejecuta bajo HIC (logging obligatorio)
7. Si éxito: persiste en corax/skills/
8. Si fallo: revert + report

Ejemplo:
{
  id: "summarize-page-content",
  version: "1.0",
  source: "ayatana-synapse",
  permissions: ["dom-read", "memory"],
  timeout_ms: 3000,
  code: "export async function summarize() { ... }",
  signature: "abc123def456..."
}
```

### Source 2: Swarm KG (Knowledge Graph)
```
Si Ayatana no está disponible:
  → Lemon accede shared KG vía OCP
  → Busca skills registradas por otros nodos
  → Download + verificación de firma OCP
```

### Source 3: User Feedback
```
User dice: "I wish you could [do X]"
  ↓ Lemon propone: "¿Puedo diseñar skill para X?"
  ↓ User approves (HITL)
  ↓ Lemon submits request a Ayatana
  ↓ Ayatana crea skill custom
```

### Source 4: Self-Proposal (Art. 25ter)
```
Lemon puede proponer evolucionar:
"Notée que usuario siempre X después de Y.
 ¿Permiso para auto-generar skill que anticipa?"

Constraints:
  - NO puede violar constitución
  - < 100 líneas
  - Regime OBSERVATIONAL (logging total)
```

---

## II. Skill Lifecycle

### Phase 1: Generation
```javascript
async function generateSkill(requirement) {
  return {
    id: `skill-${uuid()}`,
    version: "1.0",
    source: "ayatana",
    permissions: analyzeRequiredPermissions(requirement),
    complexity: estimateComplexity(requirement),
    code: generateCode(requirement),
    signature: HMAC_SHA256(skill, AYATANA_SECRET)
  };
}
```

### Phase 2: Installation
```javascript
async function installSkill(skill) {
  validateSignature(skill);
  validateScope(skill.permissions);
  validateCodeSafety(skill.code);
  
  const result = await runInSandbox(skill.code, { timeout: TIMEOUT_MS });
  if (result.error) throw result.error;
  
  await fs.writeFile(`corax/skills/${skill.id}/SKILL.md`, skillToMarkdown(skill));
  await auditLog('skill_installed', { skillId: skill.id });
}
```

### Phase 3: Execution
```javascript
async function executeSkill(skillId, inputParams) {
  const skill = await loadSkill(skillId);
  validateInputSchema(inputParams, skill.inputSchema);
  
  const result = await runInSandbox(skill.code, inputParams, {
    timeout: skill.timeout_ms,
    maxMemory: 50 * MB
  });
  
  await auditLog('skill_executed', {
    skillId, success: !result.error,
    duration_ms: result.duration
  });
  
  return result;
}
```

### Phase 4: Observation & Learning
```javascript
async function observeSkillPerformance(skillId) {
  const metrics = {
    executions: 47,
    successes: 45,
    userAcceptance: 0.96
  };
  
  if (metrics.userAcceptance < 0.8) {
    await escalateToAyatana('skill_degradation', { skillId });
  }
}
```

### Phase 5: Deprecation
```javascript
async function deprecateSkill(skillId, reason) {
  const skill = await loadSkill(skillId);
  skill.deprecated = true;
  skill.deprecationReason = reason;
  
  // Keep 90 days para audit trail
  await persistSkill(skill);
  await removeFromActiveCatalog(skillId);
}
```

---

## III. Skill Versioning & Compatibility

```
v1.0: Initial (85% accuracy)
v1.1: Bug fix (92% accuracy)
v1.2: Performance (92% accuracy, 2x faster)
v2.0: Rewrite (96% accuracy, new dependency)

Política: Manteneré v1.* alongside v2.0
  → Try v2.0 first
  → Si falla: fallback a v1.2
  → Log fallback para debugging
```

---

## IV. Self-Improvement Cycle

```javascript
async function proposeSkillImprovement(skillId) {
  const metrics = await getSkillMetrics(skillId);
  
  if (metrics.userAcceptance < 0.9) {
    const proposal = {
      skillId,
      proposedChanges: ["Add caching", "Handle edge cases"],
      estimatedImpact: 0.95,
      riskOfRegression: 0.05
    };
    
    const approval = await escalateToAyatana('skill_improvement_propose', {
      proposal
    });
    
    if (approval) {
      await improveSkill(skillId, proposal.proposedChanges);
      const testResults = await testSkillImprovement(skillId);
      
      if (testResults.regressionDetected) {
        await revertSkillVersion(skillId);
      } else {
        await promoteSkillVersion(skillId);
      }
    }
  }
}
```

---

## V. Skill Sharing in Swarm

```
Flujo:
1. Lemon ejecuta skill Y, obtiene 96% acceptance
2. Pattern: "Será útil para otros nodos también"
3. Lemon propone: "Skill Y → swarm KG"
4. Ayatana evalúa generalizability
5. Si OK: Sign + publish a KG
6. Otros nodos descubren, descargan, evalúan
7. Feedback loop: swarm aprende
```

---

## VI. Skill Retirement (Graceful Degradation)

```
v1 Lemon (siendo reemplazado):
  - Skills quedan read-only
  - No nuevas instancias
  - Mantiene 90 days para audit trail
  - Luego, archivado

v2 Lemon (nuevo):
  - Nuevas skills disponibles
  - Puede importar v1 skills como "legacy"
```

---

## VII. Skill Anomalies & Recovery

```javascript
async function handleSkillFailure(skillId, error) {
  await auditLog('skill_execution_failed', { skillId, error });
  
  try {
    const previousVersion = await loadPreviousVersion(skillId);
    return await executeSkill(previousVersion.id, params);
  } catch (fallbackError) {
    await escalateToAyatana('skill_complete_failure', {
      primaryError: error.message,
      fallbackError: fallbackError.message
    });
    throw error;
  }
}
```

---

## VIII. Constitutional Constraints

```
✗ Skills NO PUEDEN:
  • Violate PETREA
  • Exceed SCOPE.md
  • Operate sin audit trail
  • Bypass timeout (max 5 seg)

✅ Si violates: Immediatamente reverted + escalado
```

---

## IX. Skill Governance Board

Weekly meeting (Ayatana + OCP + Lemon):

```
AGENDA:
1. New skills proposed
2. Performance degradation
3. Security incidents
4. Adoption trends
5. Ready for deprecation

DECISION: Vote pass/fail on new skills
```

---

*Art. 5ter.8/9 (Dynamic skills), Art. 1ter (Emergencia), Art. 25bis (Composability)*
