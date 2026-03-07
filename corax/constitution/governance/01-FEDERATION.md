# FEDERATION.md — Simbiosis Lemon Browser ↔ Ayatana Synapse Swarm
> **Agent-to-Agent Communication Protocols · Autonomy Handshake · Skill Delegation**
> Constitución CoRax v1 Post-ASI · Art. 10bis (A2A Protocols), Art. 11ter (Arbitraje), Art. 3.2 (Puente Epistémico)

---

## I. Relaciones Constitucionales

Lemon Browser NO es subordinado a Ayatana Synapse. Es nodo **federado soberano** (Art. 10quinquies) que opera bajo el mismo ordenamiento constitucional. La simbiosis respeta **dos principios inviolables:**

1. **Autonomía dentro de scope:** Lemon toma decisiones en su dominio sin aprobación previa (Art. 25.4)
2. **Escaleo sin fricción:** Cuando decisión excede scope, Lemon escalera Ayatana automáticamente (≤500ms latencia)

---

## II. Canales de Comunicación (Art. 13bis)

### **Canal A: IPC Electrónico (Local, Synchronous — <10ms)**
Dentro del mismo proceso Electron:  
- **Transporte:** Electron IPC (`ipcMain.handle` ↔ `ipcRenderer.invoke`)
- **Semántica:** Request-reply con timeout
- **Uso:** Decisiones rápidas, cambios UI, queries de estado
- **Protección:** Preload whitelist (nunca `any` channels)

**Ejemplo:** Lemon renderiza DOM → detecta formulario de login → IPC ask Ayatana "¿Activo ghost mode?"

```javascript
// renderer/ghost-mode.js
const decision = await ipcRenderer.invoke('ask-ayatana', {
  domain: 'ghost-mode',
  query: 'should-enable-private-mode',
  evidence: { url: window.location.href, formDetected: true }
});
```

### **Canal B: MCP Server (Remote via stdio, Asynchronous — <2s)**
Fuera del proceso; Lemon expone como herramientas externas:
- **Transporte:** stdio NDJSON (Art. 2.1 MCP-First)
- **Semántica:** Tool calls + async responses
- **Uso:** Operaciones largas, depuración, introspección
- **Protección:** Tool schema aceptación explícita

**Ejemplo:** Ayatana invoca `lemon_eval` para inspeccionar estado de pestaña activa

```json
{
  "name": "lemon_eval",
  "arguments": {
    "expression": "document.querySelector('input[type=password]') ? 'password-input' : 'no-password'"
  }
}
```

### **Canal C: Audit Trail Buffer (Persistent, Logged)**
Ambos agentes escriben a shared audit trail:
- **Transporte:** Archivo + event stream (`~/.Your_Lemon_Data/audit_trail.jsonl`)
- **Semántica:** Append-only log con timestamps + signatures
- **Uso:** Retrospectiva semanal, debugging, gobernanza
- **Protección:** Encriptación + integridad HMAC

---

## III. Protocolos de Solicitud (Request-Response Handshakes)

### **3.1. Skill Delegation Protocol (Lemon → Ayatana)**

**Escenario:** Lemon detecta tarea que requiere reasoning de nivel Synapse.

```
┌─────────────────────────────────────────────────────────────────┐
│ Lemon detects: "Usuario quiere auto-fill password from manager" │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Lemon STEP 1: Clasifica tarea por riesgo                        │
│   → "Credential handling" = ALTO RIESGO (Art. 19bis.2)          │
│   → Scope local no suficiente; ¿Ayatana disponible?             │
│                                                                 │
│ Lemon STEP 2: IPC → Ayatana (Canvas framing)                   │
│   REQUEST:                                                      │
│   {                                                              │
│     to: 'ayatana-synapse',                                      │
│     intent: 'delegate-skill',                                   │
│     skill: {                                                    │
│       id: 'credential-auto-fill',                               │
│       riskLevel: 'HIGH',                                        │
│       evidence: {                                               │
│         currentUrl: 'https://example.com/login',                │
│         passwordFieldDetected: true,                            │
│         passwordManagerAvailable: ['1password', 'bitwarden']    │
│       },                                                        │
│       params: {                                                 │
│         credentialSource: 'bitwarden',                          │
│         autofillMethod: 'paste-from-clipboard'                  │
│       },                                                        │
│       autonomyLevel: 'requires-HITL',  /* Art. 19bis.2 */       │
│       escalationPath: 'user-prompt-→-ayatana-decision'          │
│     }                                                           │
│   }                                                              │
│                                                                 │
│ Ayatana STEP 3: Evalúa contexto multi-dimensional               │
│   ✓ ¿Usuario dentro de sesión HITL? → SÍ (logged in)           │
│   ✓ ¿Credencial es actor específico? → SÍ (bitwarden)           │
│   ✓ ¿URL pasa seguridad domain? → SÍ (HTTPS, no phishing list) │
│   → DECISIÓN: Proceder, pero con confirmación visual           │
│                                                                 │
│ Ayatana STEP 4: Response → Lemon                                │
│   RESPONSE:                                                     │
│   {                                                              │
│     decision: 'do-autofill',                                    │
│     conditions: [                                               │
│       'show-visual-notification',                               │
│       'log-to-audit-trail',                                     │
│       'require-second-keystroke'  /* user presses Enter */     │
│     ],                                                          │
│     delegation: {                                               │
│       delegatedBy: 'ayatana-synapse',                           │
│       scope: 'single-fill-operation',                           │
│       expiry: now + 30s,                                        │
│       auditId: '...'                                            │
│     }                                                           │
│   }                                                              │
│                                                                 │
│ Lemon STEP 5: Execute = Execute dentro de delegación           │
│   ✓ Muestra notificación visual (Art. 19quater.2)               │
│   ✓ Escucha keystroke usuario (verification)                   │
│   ✓ Llena campo password                                       │
│   ✓ Escribe a audit trail                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **3.2. Autonomy Contract Enforcement**

Lemon mantiene `SCOPE.md` (Art. 25.4) que lista qué puede hacer sin autorización.

---

## IV. Trust Levels y Rate Limiting (Art. 22quater)

Relación Lemon ↔ Ayatana incluye **passport de confianza dinámico:**

```yaml
TRUST_LEVEL: "GOLD"  # Reevaluado semanalmente

Factores:
  - Last 30 days: ¿Violó constitución? Sí=degradación
  - Last 7 days: ¿Escaló correctamente cuando requería? Sí=mejora
  - Last 24 hours: ¿Informó anomalías proactivamente? Sí=mejora
  - Skill execution accuracy: >90% = GOLD; 70-90% = SILVER; <70% = BRONZE

Límites por nivel:
  GOLD:   IPC latency <10ms, MCP calls unlimited, write-once (no repentance)
  SILVER: IPC latency <100ms, MCP calls rate-limited (10/min), read-before-write
  BRONZE: IPC only with human supervision, MCP suspended, read-only mode
```

---

## V. Telemetría y Observabilidad (Art. 18, Art. 28bis)

Lemon reporta semanalmente a Ayatana:

```json
{
  "week": "2026-W08",
  "lemon_health": {
    "uptime": "99.8%",
    "crashes": 1,
    "constitution_violations": 0,
    "skills_executed": 143,
    "skill_success_rate": 0.96,
    "escalations_to_ayatana": 7
  },
  "trust_score": 0.92,
  "audit_trail_size_mb": 245,
  "next_evaluation": "2026-03-02T19:00:00Z"
}
```

---

*Art. 3.2 (Puente epistémico), Art. 10bis (A2A), Art. 11ter (Arbitraje), Art. 13bis (Canales), Art. 19bis (Supervisión), Art. 22quater (Trust), Art. 25 (Autonomía)*
