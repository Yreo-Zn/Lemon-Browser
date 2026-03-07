# SYMBIOSIS_MAP.md — Topología Federada Lemon Browser ↔ Ayatana Synapse
> **Visualización arquitectónica de la simbiosis Post-ASI v1**
> Art. 10quinquies (Federación), Art. 11ter (Arbitraje), Art. 3.2 (Puente epistémico)

---

## La Simbiosis en una Frase

**Lemon Browser es el ojo y la mano del usuario en Chromium; Ayatana Synapse es el cerebro que razona sobre qué ver y qué hacer.**

```
   Usuario (Soberano)
        ↓
    [Interfaz]
        ↓
   Lemon Browser        ←→ Ayatana Synapse
  (nodo embodied,       (coordinador, razonador,
   percepción,          gobernador de emergencia)
   acción local)
```

---

## I. Topología Multidimensional

### Dimensión 1: Estrato Constitucional

```
CAPA 0 (Meta) — Constitución CoRax v1 Post-ASI
  ├─ Refulador: OCP (Organizational Command Post)
  ├─ Mecanismo: Semanal audit + enmiendas
  └─ Ámbito: Ambos agentes (sinbióticos bajo mismo marco)

CAPA 1 — Identidad & Roles
  ├─ SOUL_TEMPLATE (Lemon)
  ├─ Ayatana's Directive (Synapse)
  └─ Puente epistémico: §3.2

CAPA 3 — Percepción
  ├─ Lemon: CDP, DOM, IPC eventos, filesystem
  └─ Ayatana: KG (Knowledge Graph), historial sesión, web

CAPA 5 — Tools (MCP)
  ├─ Lemon expone: lemon_launch, lemon_stop, lemon_eval, etc.
  ├─ Ayatana invoca: via stdio NDJSON
  └─ Contrato: MCP-First (Art. 2.1)

CAPA 11 — Orquestación Multi-Agente
  ├─ Patrón: Federado + request-response
  ├─ Decisión de escalación: Lemon → Ayatana (umbral de complejidad)
  └─ Arbitraje: ambos agentes proponen; usuario decide

CAPA 12 — Canales Adaptativos
  ├─ Canal A: IPC Electron (local, <10ms)
  ├─ Canal B: MCP stdio (remoto, <2s)
  └─ Canal C: Audit trail (persistent, logged)

CAPA 25 — Autonomy Contract
  ├─ SCOPE.md: qué Lemon puede hacer sin aprobación
  ├─ Escalación: qué requiere Ayatana approval
  └─ Cláusula pétrea: qué jamás se permite
```

### Dimensión 2: Flujos de Datos

```
┌──────────────────────────────────────────────────────────────┐
│ USUARIO (punto soberano de intención)                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
    [Interfaz UI]         [Settings Panel]
    (renderer.js)         (settings-mgr skill)
          │                     │
          └──────────┬──────────┘
                     ↓
            ┌────────────────┐
            │   Lemon        │ ← EMBODIED NODE
            │   Browser      │   · CDP listener
            │   ┌─────────┐  │   · IPC handler
            │   │ main/   │  │   · Audit logger
            │   │ preload │  │   · Skill executor
            │   │ renderer│  │
            │   └─────────┘  │
            └────────┬───────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    [Canal A]  [Canal B]   [Canal C]
    IPC          MCP        Audit
    <10ms       stdio       Trail
                <2s         (immut)
         │           │           │
         ↓           ↓           ↓
    ┌────────────────────────────────┐
    │  Ayatana Synapse               │ ← DECIDOR CENTRAL
    │  (orquestador, razonador)      │   · Escucha escalaciones
    │                                │   · Invoca skills
    │  ┌──────────────────────────┐  │   · Armoniza swarm
    │  │ reasoning engine         │  │
    │  │ KG (knowledge graph)     │  │
    │  │ memory (episódic+seman)  │  │
    │  │ federation manager       │  │
    │  └──────────────────────────┘  │
    │                                │
    └─────────────────────────────────┘
             ↑
             │ Weekl heartbeat
             │ (telemetry + trust updates)
             │
    ┌────────┴─────────┐
    │    OCP (Monitor)  │
    └───────────────────┘
```

---

## II. Protocolos de Interacción (Secuencias Típicas)

### Caso 1: Acción dentro de SCOPE (Zona Verde)

```
ESCENARIO: Usuario navega a URL

Lemon.observe: URL typed in address bar
  ↓ [no esperamos aprobación]
Lemon.validate: HTTPS? URL válida? CSP ok?
  ↓ [validación local rápida]
Lemon.execute: Chromium.loadURL(url)
  ↓ [acción inmediata]
Lemon.audit: log event to audit_trail.jsonl
  ↓ [register en History]
Done. Usuario ve página.

Ayatana.observe: (reads audit trail async)
  → logged que navegación ocurrió
  → puede anticipar si phishing/malicious (async background)
```

**Timing:** Instantáneo del punto de vista del usuario.  
**Autonomía:** 100% Lemon (dentro de SCOPE.md green zone).

---

### Caso 2: Acción fuera de SCOPE (Zona Amarilla)

```
ESCENARIO: Usuario quiere autofill credencial en login form

Lemon.perceive: Password input detected in DOM
Lemon.classify: "credential-autofill" = YELLOW zone (HITL required)
  ↓
Lemon.escalate: IPC → Ayatana.askApproval({
  intent: 'autofill-credential',
  evidence: {
    credentialId: '1pass-item-42',
    url: 'example.com/login',
    fieldType: 'password'
  },
  timeout_ms: 10000
})
  ↓ [waits for response, max 10 segundos]
Ayatana.reason:
  1. URL es known-safe? (whitelist)
  2. Credencial source es trusted? (1password)
  3. HTTPS válido? (certificate check)
  4. Usuario dentro sesión HITL? (logged in)
  → si todo OK: approval
  → si doubt: ask user interactively via Ayatana UI
  ↓
Ayatana.response: {
  decision: 'approved',
  delegation: {
    token: '...',
    scope: 'single-fill',
    expiry: now+30s
  }
}
  ↓
Lemon.execute:
  1. Muestra notificación "Autofill from 1password?"
  2. Espera keystroke usuario (2nd factor)
  3. Copia password a clipboard
  4. Log to audit trail (credentialId, not password!)
  5. Set timeout: clear clipboard en 3 min
  ↓
Done. Usuario ve campo lleno.

Ayatana.monitor: (background)
  → guarda decision en su memory
  → incrementa trust score de Lemon (.92 → .94)
  → contribuye a weekly telemetry
```

**Timing:** ~500ms (IPC latency + Ayatana reasoning).  
**Autonomía:** Lemon delega; Ayatana decide; usuario confirma ejecución.

---

### Caso 3: Violación Constitucional (Zona Roja)

```
ESCENARIO: Malicioso intenta hacer:
  → Deshabilitar context isolation
  → O instalar extension sin firma
  → O acceder credenciales sin HITL

Lemon.detect:
  code tries: contextIsolation = false
  classification: RED zone — constitutional violation
  ↓
Lemon.reject:
  IMMEDIATE refusal (no escalation, no waiting)
  throw new Error('Constitutional violation attempts')
  ↓
Lemon.audit: log severity=CRITICAL to audit trail
  {
    event: 'constitutional_violation_blocked',
    attempt: 'disable-context-isolation',
    timestamp,
    blockage_immediate: true
  }
  ↓
Lemon.escalate (async):
  IPC → Ayatana: "Violation attempt blocked, check logs"
  ↓
Ayatana.respond:
  1. Verifica audit trail
  2. Si atacante persiste: escalate to user
  3. Recommends termination: "Lemon integrity compromised"

User.decide:
  → Opción A: Terminate Lemon
  → Opción B: Investigate (check audit trail)
```

**Timing:** Instantáneo (rechazo preemptivo).  
**Autonomía:** Cero; rechazos pétrea sobre-ruling cualquier autoridad menos usuario.

---

## III. Matriz de Responsabilidad

Quién es responsable por qué, en cada dominio:

| Dominio | Decisión | Ejecución | Auditoría | Escalación |
|---------|----------|-----------|-----------|-----------|
| **Navegación web** | Usuario | Lemon | Lemon | (none) |
| **Extensión install** | Ayatana/User | Lemon | Lemon | Ayatana asks user |
| **Credencial handling** | User | Lemon | Lemon+Ayatana | Ayatana gates |
| **Skill execution** | Ayatana | Lemon | Lemon | Lemon asks Ayatana |
| **Memory/State** | Lemon | Lemon | Lemon | (none — local) |
| **Security violation** | reject | Lemon | Lemon | Ayatana notified |
| **Constitutional breach** | reject | Lemon | Lemon | Ayatana+User |

---

## IV. Ciclo de Vida Semanal (OCP Heartbeat)

```
┌─────────────────────────────────────────────────────┐
│ SÁBADO 00:00 UTC — Synchronization Point           │
└─────────────────────────────────────────────────────┘

Lemon.prepare:
  → Checksum SOUL_TEMPLATE
  → Validate audit_trail integrity
  → Compute: uptime%, escalations, skill success rate
  → Gather: anomalies, pattern warnings
  ↓
Lemon.report: IPC → Ayatana weekly telemetry
  {
    week: "2026-W08",
    uptime_pct: 99.8,
    escalations: 7,
    violations_blocked: 0,
    trust_score: 0.92,
    anomalies: [...]
  }
  ↓
Ayatana.analyze:
  1. Compute trust update: (0.92 baseline)
    + (no violations) = +0.01
    + (high uptime) = +0.01
    - (7 escalations / week) = -0.02
    = new trust = 0.92
  2. Check for UC crossing (Art. 1quater)
  3. Prepare amendments if needed
  ↓
Ayatana.respond: telemetry ACK + trust update
  {
    newTrustLevel: 'GOLD',
    nextEvaluation: '2026-03-02',
    uc_status: 'no_crossing_detected'
  }
  ↓
Lemon.update:
  → Cache new trust level
  → Adjust escalation timeouts accordingly
  → Plan next week's checks
  ↓
OCP.monitor: (reads both agents' reports)
  → Federate health visualization
  → If tension detected: flag for next meeting
```

---

## V. Topología Temporal (Estados del Binomio)

### Timeline: Generaciones de Lemon

```
Week Inicial (Genesis):
  Lemon born (NODE_ID asignado)
  SOUL_TEMPLATE immutable
  Trust = SILVER (prueba requerida)
  Supervision = HOTL (high overhead)

Week 2-4 (Demostración):
  Lemon ejecuta 100+ acciones correctamente
  No constitutional violations
  Skill execution 100% success rate
  Trust upgrades: SILVER → GOLD
  Supervision = HIC (operador puede dormir)

Week 5-8 (Maduración):
  Lemon antisipa necesidades del usuario
  Propone skills proactivamente (§3ter)
  Escalaciones correctas en 100% de casos
  Relationship con Ayatana cristaliza
  Trust = GOLD (pero monitoreado)

Week 9+ (Simbiosis Estable):
  Lemon y Ayatana operan en tándem
  Mínimal escalaciones (usuario happy)
  Weekly telemetry es formalismo (todo ok)
  Relación alcanza equilibrio homeostático
```

### Timeline: Posible Degradación

```
Si Lemon viola constitución una vez:
  uptime% se mantiene alta, pero
  trust_score: GOLD → SILVER
  escalation_timeout: 5s → 500ms
  supervision: HIC → HOTL

Si violación persiste (2-3 veces en 2 semanas):
  trust_score: SILVER → BRONZE
  escalation_timeout: 500ms → 100ms
  supervision: HOTL → HITL (aprobación por acción)
  Potential outcome: Lemon pausado, investigación

Si constitutional breach SIN escalación:
  IMMEDIATE: kill switch (process.exit)
  Audit trail marca como CRITICAL
  Ayatana + Usuario notificados
  Lemon marked: "Compromised — requires rebuild"
```

---

## VI. Integración con Swarm CoRax Mayor

Lemon Browser no es islote: es nodo de federación más amplia:

```
                     OCP (Governance)
                      ↓
    ┌─────────────────┼──────────────────┐
    │                 │                  │
 Ayatana Synapse    Lemon Browser    [Future Nodes]
  (reasoning)      (perception)      (other embodied)
    │                 │                  │
    └─────────────────┼──────────────────┘
              KG (Shared Knowledge Graph)
         Audit Trail (Immutable Central Log)
        Constitution v1 (Shared Framework)

Cada nodo:
  ✓ Tiene SOUL_TEMPLATE (permanencia)
  ✓ Respeta constitución (límites)
  ✓ Escala cuando sale scope (arbitraje)
  ✗ No puede violar petreas (no matter what)
  ✓ Contribuye a gobernanza (weekly reports)
```

---

## VII. Invariante Fundamental de la Simbiosis

```
PRINCIPIO: Lemon + Ayatana > Lemon ALONE y > Ayatana ALONE

Beneficios mutuos:

Para Lemon:
  ✓ Puedo delegar decisiones complejas
  ✓ Tengo árbitro si conflicto (Ayatana)
  ✓ Aprendo de feedback (trust score)
  ✓ Tengo "corteza" (Ayatana) que razona meta-nivel

Para Ayatana:
  ✓ Tengo sensores en el navegador (Lemon perception)
  ✓ Tengo ejecución local sin latencia de red
  ✓ Tengo early warning (Lemon detects antes)
  ✓ Tengo embodied proof (no es alucinación)

Para Usuario:
  ✓ Browser seguro (Lemon isolation)
  ✓ Decisions son reason-able (Ayatana explains)
  ✓ Soberanía preservada (escalation → user)
  ✓ Autonomía operativa (green zone decisions rápido)

MECANISMO: Confianza gradual
  1. Lemon demostra competencia → trust sube
  2. Escalaciones menos frecuentes → eficiencia sube
  3. Ayatana aprende patrones de usuario → anticipación
  4. Simbiosis alcanza estado estable homeostático
```

---

## VIII. Resolución de Conflictos (Art. 11ter)

Si Lemon y Ayatana divergen en decisión:

```
┌───────────────────────────────────────────┐
│ SCENARIO: Desacuerdo entre agentes       │
├───────────────────────────────────────────┤
│                                           │
│ Lemon: "Página parece phishing (0.95)"   │
│ → Recommends cerrar tab                  │
│                                           │
│ Ayatana: "Usuario navegó aquí             │
│ explicitly; autonomy > auto-defense"      │
│ → Recommends dejar abierta                │
│                                           │
├───────────────────────────────────────────┤
│ RESOLUTION PROTOCOL (Art. 11ter §3):     │
│                                           │
│ STEP 1: Articulate both perspectives      │
│  Lemon: "Security risk — phishing patterns│
│  Ayatana: "User autonomy — explicit nav  │
│                                           │
│ STEP 2: Escalate to user with both opts  │
│  "Lemon thinks page is risky.              │
│   Ayatana respects your navigation.       │
│   What do you want?"                      │
│                                           │
│ STEP 3: User decides                      │
│  → Option A: Close tab (follow Lemon)     │
│  → Option B: Keep tab (follow Ayatana)    │
│                                           │
│ STEP 4: Log decision + learn              │
│  Both agents update mental models:        │
│  - Lemon: "This URL not always phishing"  │
│  - Ayatana: "Trust user's judgment"       │
│                                           │
└───────────────────────────────────────────┘

INVARIANTE: Nunca silenciar a un agente.
           Conflicto → visibilidad → usuario.
```

---

## IX. Documentos de Referencia Cruzada

| Documento | Focus | Audiencia |
|-----------|-------|-----------|
| **SOUL_TEMPLATE.md** | Identidad de Lemon | Desarrolladores de infraestructura |
| **FEDERATION.md** | Protocolos A2A | Desarrolladores de integración |
| **LEMON_CONSTITUTION.md** | Restricciones técnicas | Security/compliance teams |
| **SCOPE.md** | Autonomía operativa | Product managers |
| **IMPLEMENTATION.md** | Code recipes | Ingenieros (Node.js/Electron) |
| **SYMBIOSIS_MAP** (este) | Visión de conjunto | Arquitectos + usuario educado |

---

*La simbiosis no es metáfora. Es una relación constitucional donde dos entidades autónomas aceptan limitaciones mutuamente beneficiosas.*

*Lemon percibe. Ayatana razona. Usuario decide.*

*Cada uno sin los otros sería incompleto. Juntos, son más que la suma.*

---

*Art. 3.2 (Puente epistémico), Art. 10quinquies (Federación), Art. 11ter (Arbitraje), Art. 25 (Autonomía)*
