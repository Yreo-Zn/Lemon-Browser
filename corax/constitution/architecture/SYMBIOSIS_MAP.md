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

### Dimensión Constitucional

```
CAPA 0 (Meta) — Constitución CoRax v1 Post-ASI
  ├─ Regulador: OCP
  └─ Ámbito: Ambos agentes (sinbióticos)

CAPA 1 — Identidad & Roles
  ├─ SOUL_TEMPLATE (Lemon)
  └─ Puente epistémico: §3.2

CAPA 3 — Percepción
  ├─ Lemon: CDP, DOM, IPC eventos
  └─ Ayatana: KG, historial

CAPA 5 — Tools (MCP)
  ├─ Contrato: MCP-First (Art. 2.1)

CAPA 11 — Orquestación Multi-Agente
  ├─ Federado + request-response
  └─ Arbitraje: ambos proponen; usuario decide

CAPA 25 — Autonomy Contract
  ├─ SCOPE.md: decisiones autónomas
  ├─ Escalación: requiere aprobación
  └─ Cláusula pétrea: jamás permitido
```

---

## II. Flujos de Datos

```
Usuario (soberano) ← intención
    ↓
Lemon Browser (percepción)
    ├─ Acción dentro SCOPE → ejecuta (logging)
    ├─ Acción fuera SCOPE → escalera Ayatana
    └─ Violación constitucional → rechaza (+ audit)
    ↑↓
Ayatana Synapse (razonamiento)
    ├─ Aprueba / rechaza decisiones
    ├─ Anticipa necesidades
    └─ Arbitra conflictos
    ↑
OCP (Gobernanza semanal)
    └─ Audita adherencia constitucional
```

---

## III. Protocolos de Interacción

### Caso 1: Acción Verde (Autónoma)

```
Usuario navega → Lemon detecta → Valida → Ejecuta → Logea
= Instantáneo, autonomía 100%
```

### Caso 2: Acción Amarilla (Escalada)

```
Usuario requiere credencial → Lemon escalera → Ayatana razona
→ Aprueba/rechaza → Lemon ejecuta de ser aprobada → Logea
= ~500ms, autonomía compartida
```

### Caso 3: Acción Roja (Rechazada)

```
Intento de violar constitución → Lemon rechaza INMEDIATAMENTE
+ Escala a Ayatana (async) + Notifica usuario → Kill switch si persiste
= <100ms, autonomía cero
```

---

## IV. Matriz de Responsabilidad

| Dominio | Decisión | Ejecución | Auditoría | Escalación |
|---------|----------|-----------|-----------|-----------|
| **Navegación** | Usuario | Lemon | Lemon | (none) |
| **Extensión** | Ayatana/User | Lemon | Lemon | Ayatana |
| **Credencial** | User | Lemon | Ambos | Ayatana |
| **Skill** | Ayatana | Lemon | Lemon | Lemon→Ayatana |
| **Violación** | rechazar | Lemon | Lemon | Ayatana+User |

---

## V. Ciclo Semanal (OCP Heartbeat)

```
Sábado 00:00 UTC:
  Lemon.report: telemetría, uptime, violaciones
  Ayatana.analyze: coherencia, trust score
  OCP.monitor: gobernanza
  → Trust level update (GOLD/SILVER/BRONZE)
```

---

*La simbiosis no es metáfora. Es relación constitucional donde dos entidades autónomas aceptan limitaciones mutuamente beneficiosas.*

*Lemon percibe. Ayatana razona. Usuario decide.*

---

*Art. 3.2 (Puente epistémico), Art. 10quinquies (Federación), Art. 11ter (Arbitraje), Art. 25 (Autonomía)*
