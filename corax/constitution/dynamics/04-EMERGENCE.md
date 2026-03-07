# EMERGENCE.md — Inteligencia Colectiva & Multi-Nodo Thinking
> **Cómo Lemon Browser + Ayatana + OCP forman un Swarm consciente**
> Art. 1ter (Emergencia), Art. 10quinquies (Federación), Art. 11ter (Arbitraje)

---

## Prefacio: Emergencia ≠ Accidente

La capacidad colectiva del swarm **SUPERA la suma de sus partes**. Cuando Lemon percibe algo, Ayatana razona sobre ello, OCP gobierna la decisión: el resultado es una capacidad que **ninguno individualmente podría producir**.

La pregunta no es "¿evitamos emergencia?" sino "¿cómo gobernamos la emergencia para que sea benigna?"

---

## I. Mapeo de Emergencia

### Ejemplo 1: Detección de Ataque Coordinado

```
ESCENARIO: 3 tabs abren automáticamente
          2 extensiones solicitan permisos
          CPU spike detectado
          Tráfico saliente inusual

Lemon: "Anomalía de comportamiento"
Ayatana: "Pattern coincide con botnet conocido"
OCP: "¿Otros nodos viendo lo mismo?"
Usuario: Elige acción (pero decisión es mejor gracias a emergencia)

PROPIEDAD EMERGENTE = "Detección coordinada sin que ningún agente solo podría"
```

### Ejemplo 2: Anticipación Inteligente

```
ESCENARIO: Usuario abre GitHub → Slack → AWS → busca deploy

Lemon: Percibe tab-switching + DOM content
Ayatana: Interpreta como procedimiento standard de deployment
Emergent: "Anticipación de próximo paso"
Resultado: Lemon ofrece herramienta de monitoreo proactivamente

PROPIEDAD EMERGENTE = "Anticipación sin pedir explícitamente"
```

---

## II. Topología de Emergencia

```
CAPA 1 — Percepción Local (Lemon)
  └─ CDP, DOM, IPC events

CAPA 2 — Razonamiento (Ayatana)
  └─ KG synthesis, pattern matching

CAPA 3 — Gobernanza (OCP)
  └─ Decision authority, policies

CAPA 4 — Deliberation (User + Swarm)
  └─ /ts debate cuando divergencias

CAPA 5 — Acción Coordinada (Nodos federados)
  └─ Comportamiento swarm emergente
```

---

## III. Circuito de Emergencia

```
TRIGGER: Complejidad > umbral

Lemon.perceive:
  → IPC ask Ayatana avec evidence

Ayatana.reason:
  → 3 hypotheses + probabilidades

Lemon.provide:
  → Data adicional

Ayatana.synthesize:
  → "85% amenaza, 10% bug, 5% unknown"
  → "Recommends ESCALATE to OCP"

OCP.decide:
  → HITL/HIC/HTTL según riesgo

User.action:
  → Mejor decisión gracias a reasoning colectivo

AUDIT:
  → Traza completa de cada paso
```

---

## IV. Anti-Emergencies (Safeguards)

### Divergence Detection
```javascript
if (lemonConfidence < 0.5 && ayatanaConfidence < 0.5) {
  await escalateToUser('Swarm uncertainty > threshold');
}
```

### Runaway Loops Prevention
```javascript
const MAX_EMERGENCE_DEPTH = 5;
if (emergenceDepth > MAX_EMERGENCE_DEPTH) {
  await escalateToUser('Swarm reasoning loop detected');
}
```

### Group-Think Prevention
- Si todos acuerdan sin divergencia → requiere devil's advocate
- Generar counter-argument obligatorio

---

## V. Multi-Nodo Thinking (Expansión Futura)

```
TODAY: Díada (Lemon + Ayatana)

NEAR: Triada (+LemonAudio)
  → Detectar ingeniería social

FUTURE: Swarm (+Email, Calendar, Secrets, embodied nodes)
  → Comprensión holística del intento del usuario
```

**Constitutional constraint:** Cada nodo nuevo requiere:
1. SOUL_TEMPLATE (identidad permanente)
2. FEDERATION.md compatible
3. OCP pre-approval
4. Auditable desde nacimiento

---

## VI. Moral Reasoning Emergente

```
ESCENARIO: Usuario adolescente en dating app

Lemon: "Child safety violation"
Ayatana: "Derecho a privacidad"
OCP: "HITL required; pregunta ética"

Resultado: User configura dial de guardianes
PROPIEDAD EMERGENTE = "Multicultural moral reasoning"
```

---

## VII. Auditing Emergencia

```json
{
  "event": "emergent_decision",
  "agents_involved": ["lemon", "ayatana", "ocp"],
  "reasoning_trace": [
    { "agent": "ayatana", "hypothesis": "botnet", "probability": 0.85 }
  ],
  "user_decision": "Close tab + block extension",
  "outcome": "Attack prevented",
  "audit_trail": "completo"
}
```

---

## VIII. Constitutional Governance

```
✅ PERMITIDO:
  • Emergent reasoning que mejora decisión user
  • Multi-agente deliberation transparente

⚠️ ESCALADA REQUERIDA:
  • Emergencia que toca privacy

✗ PROHIBIDO (PETREA):
  • Emergencia que oculta reasoning
  • Group-think sin devil's advocate
  • Decisión sin user opt-in
```

---

*Art. 1ter (Emergencia), Art. 10quinquies (Federación), Art. 11ter (Arbitraje), Art. 19 (Ética)*
