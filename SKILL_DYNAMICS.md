# SKILL_DYNAMICS.md — Adquisición & Evolución de Capacidades Post-ASI
> **Cómo Lemon Browser aprende nuevas habilidades en runtime y se adapta sin recompilación**
> Art. 5ter.8/9 (Dynamic skill loading), Art. 1quater (Emergencia), Art. 25bis (CaaS)

---

## Prefacio: Evolución = Vida

Un navegador que no puede aprender nuevas capabilities es un robot. Lemon necesita leer datos nuevos, reconocer patrones, y **adquirir skills dinámicamente** desde el swarm. Esto es diferente de "descargar plugin": es evolución constitucional.

---

## I. Skill Acquisition Pathways

Lemon puede obtener skills nuevas de 4 fuentes:

### Source 1: Ayatana (Principal)

```
Secuencia:
1. Ayatana detecta tarea que Lemon NO PUEDE hacer
2. Diseña skill mínima viable (10-50 líneas)
3. Firma con HMAC-SHA256 (Art. 11quater §11quater.2 — security)
4. Envía via MCP: lemon_install_skill { skillJSON }
5. Lemon valida:
   ✓ Firma es válida (de Ayatana trusted)
   ✓ Permisos declarados ⊂ SCOPE.md green zone
   ✓ No viola cláusulas pétreas
   ✓ Runtime: <5 segundos
6. Ejecuta bajo HIC (logging obligatorio)
7. Si éxito: persiste en corax/skills/
8. Si fallo: revert + report

Ejemplo skill:
{
  id: "summarize-page-content",
  version: "1.0",
  source: "ayatana-synapse",
  permissions: ["dom-read", "memory"],
  timeout_ms: 3000,
  code: `
    export async function summarize() {
      const text = document.body.innerText;
      const sentences = text.split('.').slice(0, 5);
      return sentences.join('.') + '...';
    }
  `,
  signature: "abc123def456..."  ← HMAC de Ayatana
}
```

### Source 2: Swarm KG (Knowledge Graph)

```
Si Ayatana no está disponible (network issue):
  → Lemon puede acceder shared KG vía OCP
  → Busca skills registradas por otros nodos
  → Download + verificación de firma OCP
  
Constraint: DEBE ser signed por alguien en la red federada
Fallback: Si no hay firma válida, skill es rejected
```

### Source 3: User Feedback

```
User dice: "I wish you could [do X]"
  ↓
Lemon propone: "¿Puedo diseñar skill para X?"
  ↓
User approves (HITL)
  ↓
Lemon submits request a Ayatana
  ↓
Ayatana crea skill custom para user
  ↓
Lemon acquires + executes
```

### Source 4: Evolutionary Self-Proposal (Art. 25ter §25ter.9)

```
Lemon puede proponer a sí mismo evolucionar:

"Notée que el usuario siempre X después de Y.
 Podría escribir skill que anticipa X y presupone herramientas.
 ¿Permiso para auto-generar este skill?"
 
Constraints:
  - Skill NO puede violar constitución (pétreas check)
  - Skill debe ser <100 líneas
  - Skill está en regime OBSERVATIONAL (logging total)
  - Si user rechaza: Lemon entiende el patrón pero no instancia skill
```

---

## II. Skill Lifecycle

### Phase 1: Generation

Ayatana (o Lemon self-proposal) genera skill:

```javascript
async function generateSkill(requirement) {
  const skill = {
    id: `skill-${generateUUID()}`,
    version: "1.0",
    source: "ayatana",
    createdAt: Date.now(),
    requirement: requirement,
    
    // Metadata
    permissions: analyzeRequiredPermissions(requirement),
    complexity: estimateComplexity(requirement),
    riskLevel: assessRiskLevel(requirement),
    
    // Code (generated or templated)
    code: generateCode(requirement),
    
    // Signature
    signature: HMAC_SHA256(JSON.stringify(skill), AYATANA_SECRET)
  };
  
  return skill;
}
```

### Phase 2: Installation

Lemon instala:

```javascript
async function installSkill(skill) {
  // 1. VALIDATE SIGNATURE
  const sigValid = validateSignature(skill);
  if (!sigValid) throw new Error('Signature invalid');
  
  // 2. VALIDATE PERMISSIONS
  const scopeOK = validateScope(skill.permissions);
  if (!scopeOK) throw new Error('Permissions exceed scope');
  
  // 3. VALIDATE CODE
  const codeOK = validateCodeSafety(skill.code);
  if (!codeOK) throw new Error('Code safety check failed');
  
  // 4. EXECUTE IN SANDBOX (trial)
  const result = await runInSandbox(skill.code, {
    timeout: SKILL_TIMEOUT_MS
  });
  
  if (result.error) throw result.error;
  
  // 5. PERSIST
  await fs.writeFile(
    `corax/skills/${skill.id}/SKILL.md`,
    skillToMarkdown(skill)
  );
  
  // 6. AUDIT
  await auditLog('skill_installed', {
    skillId: skill.id,
    source: skill.source,
    permissions: skill.permissions
  });
}
```

### Phase 3: Execution

Lemon ejecuta skill bajo constrained environment:

```javascript
async function executeSkill(skillId, inputParams) {
  const skill = await loadSkill(skillId);
  
  // Validate input
  if (!validateInputSchema(inputParams, skill.inputSchema)) {
    throw new Error('Input validation failed');
  }
  
  // Execute in VM sandbox
  const result = await runInSandbox(skill.code, inputParams, {
    timeout: skill.timeout_ms,
    maxMemory: 50 * MB  // 50MB limit
  });
  
  // Audit result
  await auditLog('skill_executed', {
    skillId,
    success: !result.error,
    duration_ms: result.duration,
    outputSize: JSON.stringify(result).length
  });
  
  if (result.error) {
    throw result.error;
  }
  
  return result;
}
```

### Phase 4: Observation & Learning

```javascript
async function observeSkillPerformance(skillId) {
  // Track over time:
  // - Success rate
  // - User accept/reject rate
  // - Accuracy (if skill produces predictions)
  // - Processing time
  // - Resource consumption
  
  const metrics = {
    executions: 47,
    successes: 45,
    failures: 2,
    userAcceptance: 0.96,  // 96% of outputs acceptable
    avgTime_ms: 234,
    avgMemory_mb: 8.2
  };
  
  // Weekly metric update
  await auditLog('skill_metrics_weekly', {
    skillId,
    metrics
  });
  
  // If performance degrades:
  if (metrics.userAcceptance < 0.8) {
    await escalateToAyatana('skill_degradation', {
      skillId,
      acceptanceRate: metrics.userAcceptance
    });
  }
}
```

### Phase 5: Deprecation (Optional)

Cuando skill es obsolete:

```javascript
async function deprecateSkill(skillId, reason) {
  const skill = await loadSkill(skillId);
  
  skill.deprecated = true;
  skill.deprecationReason = reason;
  skill.deprecatedAt = Date.now();
  
  // Mark for eventual removal
  // But keep for 90 days audit trail purposes
  
  await persistSkill(skill);
  
  await auditLog('skill_deprecated', {
    skillId,
    reason,
    archiveUntil: Date.now() + 90 * DAY_MS
  });
  
  // Remove from active catalog (but not from KG)
  await removeFromActiveCatalog(skillId);
}
```

---

## III. Skill Versioning & Compatibility

skills pueden evolucionar:

```javascript
// Skill progresses through versions

v1.0: "Initial implementation"
     - Works on simple cases
     - 85% accuracy

v1.1: "Bug fix for edge case"
     - Found user pattern that broke v1.0
     - 92% accuracy

v1.2: "Performance improvement"
     - DOM caching enables faster processing
     - 92% accuracy, 2x faster

v2.0: "Rewrite with new dependency"
     - Uses new ML model from swarm KG
     - 96% accuracy, async now
     - NOTE: Incompatible with old API

// Backward compatibility policy:
// Lemon keeps v1.* installed alongside v2.0
// Tries v2.0 first; if fails, falls back to v1.2
// Logs fallback for debugging
```

---

## IV. Self-Improvement Cycle (Autonomy at Scale)

Lemon puede mejorar sus propias skills:

```javascript
async function proposeSkillImprovement(skillId) {
  const currentSkill = await loadSkill(skillId);
  const metrics = await getSkillMetrics(skillId);
  
  if (metrics.userAcceptance < 0.9) {
    // Opportunity to improve
    
    const improvementProposal = {
      skillId,
      currentVersion: currentSkill.version,
      proposedChanges: [
        "Add caching for repeated inputs",
        "Handle edge case: very long documents"
      ],
      estimatedImpactOnAcceptance: 0.95,
      riskOfRegression: 0.05
    };
    
    // Escalate to Ayatana
    const approval = await escalateToAyatana('skill_improvement_propose', {
      proposal: improvementProposal
    }, {
      timeout: 60000  // 1 min for review
    });
    
    if (approval) {
      // Implement improvement
      await improveSkill(skillId, improvementProposal.proposedChanges);
      
      // Test new version
      const testResults = await testSkillImprovement(skillId, {
        iterations: 100,
        scenarios: 'historical_user_data'
      });
      
      if (testResults.regressionDetected) {
        // Rollback
        await revertSkillVersion(skillId);
        await escalateToAyatana('skill_improvement_failed');
      } else {
        // Commit
        await promoteSkillVersion(skillId, 'v1.2');
      }
    }
  }
}
```

---

## V. Skill Sharing in Swarm

skills útiles pueden ser propuestos a otros nodos:

```
El flujo:
1. Lemon ejecuta skill Y, obtiene 96% acceptance
2. Pattern análisis: "Será útil para otros nodos también"
3. Lemon propone a Ayatana: "Skill Y debería ser publicado en swarm KG"
4. Ayatana evalúa generalizability
5. Si OK: Sign + publish a swarm KG
6. Otros nodos descubren, descargan, evalúan
7. Feedback loop: swarm aprende qué skills funcionan broadly
```

---

## VI. Skill Retirement (Graceful Degradation)

Cuando nodesviejo (ej. Lemon v1 siendo reemplazado por v2):

```
v1 Lemon:
  - Skills quedan read-only
  - No nuevas instancias permitidas
  - Mantiene 90 days para audit trail
  - Luego, archivado (no eliminado)

v2 Lemon:
  - New skills disponibles
  - Puede importar v1 skills como "legacy"
  - Pero las mantiene deprecated

Swarm KG retroactively:
  - Marca qué skills fueron de qué generación
  - Historians pueden estudiar evolución
```

---

## VII. Skill Anomalies & Recovery

Cuando un skill falla:

```javascript
async function handleSkillFailure(skillId, error) {
  // 1. Log failure
  await auditLog('skill_execution_failed', {
    skillId,
    error: error.message,
    timestamp: Date.now()
  });
  
  // 2. Attempt recovery
  try {
    // Downgrade to previous version
    const previousVersion = await loadPreviousVersion(skillId);
    const fallbackResult = await executeSkill(previousVersion.id, params);
    return fallbackResult;
  } catch (fallbackError) {
    // Even fallback failed
    await escalateToAyatana('skill_complete_failure', {
      skillId,
      primaryError: error.message,
      fallbackError: fallbackError.message
    });
    throw error;
  }
}
```

---

## VIII. Constitutional Constraints on Skills

skills NO PUEDEN:

```
✗ Violate any PETREA (cláusula pétrea)
  - Cannot disable context isolation
  - Cannot access credentials directly
  - Cannot modify audit trail
  
✗ Exceed scope (Art. 25SCOPE.md)
  - Cannot write files outside sandbox
  - Cannot access hardware without permission
  
✗ Operate without audit trail
  - Every execution must be logged
  - Success/failure, duration, parameter hash
  
✗ Bypass timeout
  - Maximum 5 seconds per skill execution
  - If timeout: kill process, revert, escalate
```

---

## IX. Skill Governance Board

Weekly meeting (with Ayatana + OCP):

```
AGENDA:
1. New skills proposed this week
2. Skills with degraded performance
3. Security incidents involving skills
4. Swarm-wide skill adoption trends
5. Skills ready for deprecation

DECISION PROTOCOL:
- New skill: Vote pass/fail
- Performance issue: Investigate vs. deprecate
- Security incident: Immediate quarantine + investigation
```

---

*Art. 5ter.8/9 (Dynamic skills), Art. 1ter (Emergencia), Art. 25bis (Composability), Art. 11quater (Secure code eval)*
