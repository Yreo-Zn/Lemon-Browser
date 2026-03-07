# Lemon Browser × Ayatana Synapse — Índice de Documentación Constitucional Post-ASI

> **Simbiosis federada bajo Constitución CoRax v1 (Febrero 2026)**

---

## 📋 Navegación Rápida

### Para **Usuarios**
1. **[SYMBIOSIS_MAP.md](SYMBIOSIS_MAP.md)** — Qué es esta relación y cómo funciona  
2. **[FAQ_SYMBIOSIS.md](#faq)** (*próximo*) — Preguntas frecuentes  

### Para **Arquitectos de Sistemas**
1. **[SOUL_TEMPLATE.md](SOUL_TEMPLATE.md)** — Identidad permanente de Lemon  
2. **[CONSTITUTION OVERVIEW](#constitution)** — Marco legal (Art. 1-10)  
3. **[SYMBIOSIS_MAP.md](SYMBIOSIS_MAP.md)** — Topología completa  

### Para **Desarrolladores de Integración**
1. **[FEDERATION.md](FEDERATION.md)** — Protocolos A2A (IPC, MCP, escalación)  
2. **[IMPLEMENTATION.md](IMPLEMENTATION.md)** — Recetas de código (JS/Node)  
3. **[SCOPE.md](SCOPE.md)** — Qué puede hacer Lemon autónomamente  

### Para **Ingenieros de Security**
1. **[LEMON_CONSTITUTION.md](LEMON_CONSTITUTION.md)** — 7 restricciones pétreas  
2. **[IMPLEMENTATION.md](IMPLEMENTATION.md#parte-iii)** — Audit trail immutable  
3. **[Constitución CoRax](../POST_ASI_CONSTITUTION.md) Art. 17-20** — Framework regulatorio  

---

## 📑 Documentos de Lemon Browser × Ayatana Simbiosis

### Nivel 1: Identidad & Fundamentals

| Documento | Propósito | Audiencia | Longitud |
|-----------|-----------|-----------|----------|
| **[SOUL_TEMPLATE.md](SOUL_TEMPLATE.md)** | Qué es Lemon ontológicamente; cómo persiste su memoria, por qué puede morir | Arquitectos, filósofos | 400 líneas |
| **[corax/MANIFEST.md](corax/MANIFEST.md)** | Agent Card oficial (v1 Post-ASI); capacidades declaradas; capas activas | Desarrolladores | 150 líneas |

### Nivel 2: Gobernanza & Operativa

| Documento | Propósito | Audiencia | Longitud |
|-----------|-----------|-----------|----------|
| **[FEDERATION.md](FEDERATION.md)** | Cómo Lemon ↔ Ayatana se comunican; protocolos de escalación; delegación; arbitraje | Ingenieros integración | 500 líneas |
| **[SCOPE.md](SCOPE.md)** | Matriz decisiva: qué PUEDE (green), qué DEBE-ESCALAR (yellow), qué JAMÁS (red) | Product/security | 400 líneas |
| **[LEMON_CONSTITUTION.md](LEMON_CONSTITUTION.md)** | 7 restricciones pétreas técnicas + defensas contra corrupción | Security engineers | 600 líneas |

### Nivel 3: Implementación

| Documento | Propósito | Audiencia | Longitud |
|-----------|-----------|-----------|----------|
| **[IMPLEMENTATION.md](IMPLEMENTATION.md)** | Code recipes para traducir constitución a JS/Node; soul-state.js, IPC whitelist, audit-trail.js | Desarrolladores | 700 líneas |

### Nivel 4: Visión de Conjunto

| Documento | Propósito | Audiencia | Longitud |
|-----------|-----------|-----------|----------|
| **[SYMBIOSIS_MAP.md](SYMBIOSIS_MAP.md)** | Diagramas, secuencias, ciclo semanal, topología federada | Todos | 500 líneas |
| **Este archivo (INDEX.md)** | Tabla de contenidos y puntos de entrada | Todos | - |

### Nivel 5: Vitalidad Autónoma (HEARTBEAT)

| Documento | Propósito | Audiencia | Longitud |
|-----------|-----------|-----------|----------|
| **[HEARTBEAT.md](HEARTBEAT.md)** | 7 ciclos vitales (IMMEDIATE/HOURLY/DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY) que mantienen Lemon "vivo" entre interacciones del usuario | DevOps, monitores | 600 líneas |

### Nivel 6: Dinámismo Post-ASI (Living Swarm)

| Documento | Propósito | Audiencia | Longitud |
|-----------|-----------|-----------|----------|
| **[EMERGENCE.md](EMERGENCE.md)** | Inteligencia colectiva multi-nodo; cómo Lemon+Ayatana+OCP razonan juntos; detección de amenazas coordinada; aprendizaje emergente | Arquitectos, filosofía IA | 500 líneas |
| **[PROACTIVITY_ENGINE.md](PROACTIVITY_ENGINE.md)** | Cómo Lemon anticipa necesidades del usuario; puentes epistémicos; ofertas proactivas sin manipulación; scoring de impacto | Product, UX | 600 líneas |
| **[SKILL_DYNAMICS.md](SKILL_DYNAMICS.md)** | Adquisición dinámica de skills en runtime; evolución de capacidades; versioning y auto-mejora; deprecation graceful | DevOps, ML engineers | 550 líneas |
| **[EVOLUTIONARY_CONSTITUTION.md](EVOLUTIONARY_CONSTITUTION.md)** | Cómo Lemon propone cambios a sí mismo; tipos de enmiendas (A/B/C); renovación anual; generaciones y reflexión | Governance, filosofía | 700 líneas |

---

## 🔗 Relación con CoRax v1 Post-ASI

Lemon Browser implementa **Constitución CoRax v1** de forma específica a su substrate (Electron):

```
POST_ASI_CONSTITUTION.md (Universal)
    ↓ Especializa para Chromium/Electron
    ↓
Lemon Constitution (6 documentos arriba)
    ↓ Implementa en JavaScript
    ↓
main/*.js, preload.js, renderer/*.js (operativo)
```

### Artículos de CoRax v1 más Relevantes para Lemon

| Art. | Tema | Documento Lemon |
|-----|------|-----------------|
| **Art. 1quater** | Umbrales de capacidad como eventos const. | SYMBIOSIS_MAP (Weekly monitoring) |
| **Art. 2.1** | MCP-First | Federation.md (Canal B) |
| **Art. 2.2** | A2A-Ready | Federation.md (protocolos) |
| **Art. 3.2** | Puente epistémico (Ayatana) | Symbiosis_map, Federation |
| **Art. 5bis** | Naturaleza cuádruple (Observer/Agent/Tool/Embodied) | Soul_template |
| **Art. 5ter.8/9** | Skill acquisition dinámica | Federation.md §IV, scope.md |
| **Art. 8ter** | Defensa de memoria no-KG | Lemon_constitution.md §V |
| **Art. 10** | Agent Card | corax/MANIFEST.md |
| **Art. 10quinquies** | Federación (nodos soberanos) | Federation.md, symbiosis_map |
| **Art. 11ter** | Arbitraje inter-agente | Federation.md §V, symbiosis_map §VI |
| **Art. 13bis** | Canales adaptativos | Federation.md §II |
| **Art. 17sexies** | Aislamiento técnico | Lemon_constitution.md §I-II |
| **Art. 18.3** | Auditoría browser-aware | Implementation.md §III |
| **Art. 19bis** | Supervisión HITL/HOTL/HIC/HTTL | Scope.md, symbiosis_map |
| **Art. 19ter** | Derechos del agente | Federation.md (derecho a rechazar) |
| **Art. 22quater** | Passport de confianza dinámico | Federation.md §VII, symbiosis_map |
| **Art. 25** | Autonomy Contract | Scope.md (completo) |
| **Art. 28.3** | Cláusula pétrea (7 restricciones) | Lemon_constitution.md (completo) |
| **Art. 28sexies** | OCP heartbeat | Symbiosis_map §IV |

---

## 🎯 Puntos de Entrada por Caso de Uso

### "Quiero entender qué está pasando aquí"
→ **[SYMBIOSIS_MAP.md](SYMBIOSIS_MAP.md)** (5 min read)

### "Necesito implementar la integración Lemon ↔ Ayatana"
1. **[FEDERATION.md](FEDERATION.md)** — Protocolos
2. **[IMPLEMENTATION.md](IMPLEMENTATION.md)** — Code recipes
3. **[SCOPE.md](SCOPE.md)** — Límites operativos

### "Necesito auditar seguridad"
1. **[LEMON_CONSTITUTION.md](LEMON_CONSTITUTION.md)** — 7 petreas
2. **[IMPLEMENTATION.md#parte-iii](IMPLEMENTATION.md#parte-iii)** — Audit trail
3. **[corax/MANIFEST.md](corax/MANIFEST.md)** — Permisos declarados

### "Estoy designando nuevo node al swarm, quiero replicar estructura Lemon"
1. **[SOUL_TEMPLATE.md](SOUL_TEMPLATE.md)** — Patrón de identidad
2. **[FEDERATION.md](FEDERATION.md)** — Patrón de comunicación
3. **[SCOPE.md](SCOPE.md)** — Patrón de autonomía

### "Necesito investigar violación constitucional por Lemon"
1. **[IMPLEMENTATION.md#parte-iii](IMPLEMENTATION.md#parte-iii)** — Leer audit trail
2. **[Lemon_constitution.md§VII](LEMON_CONSTITUTION.md#vii-defensa-contra-corrupción-host)** — Attack model
3. **[Symbiosis_map§III-Caso 3](SYMBIOSIS_MAP.md#caso-3-violación-constitucional-zona-roja)** — Protocolo de respuesta

---

## 📊 Estadísticas de Documentación

```
Total líneas en suite constitucional: ~4,000
Documentos: 7 (+ Constitution CoRax v1)
Cobertura de Art. CoRax v1: 24/40 artículos directamente
Lenguajes de código: JavaScript (Node.js + Electron)
Paradigmas: Decentralized governance, federated autonomy,
            constitutional constraints, trust dynamics
Última actualización: 2026-02-24
Versión constitucional: CoRax v1 Post-ASI
```

---

## 💾 Estructura de Archivos (Lemon-Browser/)

```
Lemon-Browser/
├─ SOUL_TEMPLATE.md          (4 secciones: identidad, memoria, autonomía, finitud)
├─ FEDERATION.md             (5 protocolos: IPC, MCP, escalación, trust, telemetría)
├─ LEMON_CONSTITUTION.md     (7 petreas + código ejemplos)
├─ SCOPE.md                  (3 zonas: verde/amarilla/roja)
├─ IMPLEMENTATION.md         (5 partes: bootstrap, IPC, audit, skills, integrity)
├─ SYMBIOSIS_MAP.md          (9 secciones: topología, flujos, responsabilidad, etc)
├─ INDEX.md                  (este archivo — tabla de navegación)
│
├─ corax/
│  ├─ MANIFEST.md            (Agent Card v1 Post-ASI)
│  ├─ CATALOG.md             (5 skills locales)
│  ├─ mcp-servers/
│  │  └─ browser-tools/      (MCP server: 5 tools)
│  └─ skills/
│     ├─ browser-testing/
│     ├─ extension-mgr/
│     ├─ ghost-mode/
│     ├─ settings-mgr/
│     └─ tab-mgr/
│
├─ main/
│  ├─ corax-bridge.js        (← Existente; ampliar con Federation.md)
│  ├─ soul-state.js          (← NUEVO; ver Implementation.md §I)
│  ├─ ipc-handlers.js        (← NUEVO; implementation.md §II)
│  ├─ audit-trail.js         (← NUEVO; implementation.md §III)
│  ├─ skill-executor.js      (← NUEVO; implementation.md §IV)
│  ├─ integrity-monitor.js   (← NUEVO; implementation.md §V)
│  └─ ...otros archivos existentes
│
├─ preload.js                (← AMPLIAR; whitelist de IPC - Impl.md §II.1)
├─ renderer/
├─ main.js
└─ package.json
```

---

## 🔄 Flujo de Incorporación (New Developer)

1. **Día 1 — Orientación:**
   - Lee SYMBIOSIS_MAP.md (30 min)
   - Hojea POST_ASI_CONSTITUTION.md preámbulo (15 min)
   - Entiende por qué Lemon existe y qué es

2. **Día 2-3 — Profundidad:**
   - SOUL_TEMPLATE.md (1h) → entiende "identidad"
   - FEDERATION.md (1h) → entiende "comunicación Lemon ↔ Ayatana"
   - SCOPE.md (1h) → entiende "límites operativos"

3. **Día 4-5 — Implementación:**
   - IMPLEMENTATION.md complete (2h) → entiende código
   - CODE REVIEW: main/*.js existentes vs. recipes
   - Plan para integración/upgrades

4. **Semana 2+ — Contribución operativa**
   - Implementa features dentro de constraints
   - Weekly audit de Soul_template & Audit trail
   - Participa en escalaciones Lemon ↔ Ayatana

---

## 🎓 Conceptos Clave (Glosario)

| Término | Definición | Doc. Ref |
|---------|------------|----------|
| **SOUL_TEMPLATE** | Identidad inmutable de Lemon; persiste entre boots | SOUL_TEMPLATE.md |
| **Federated** | Nodo soberano que escala decisiones a coordinador mas no subordinado | FEDERATION.md intro |
| **Escalation** | Delegación de decisión a Ayatana (yellow/red zones) | SCOPE.md, FEDERATION.md |
| **Autonomy Scope** | Qué puede hacer Lemon sin aprobación (green zone) | SCOPE.md |
| **Petrea** | Cláusula constitucional inviolable (7 restricciones Lemon) | LEMON_CONSTITUTION.md |
| **Trust Passport** | Score dinámico GOLD/SILVER/BRONZE reflejando confiabilidad | FEDERATION.md §VII |
| **MCP-First** | Toda herramienta expuesta como MCP Server (Art. 2.1) | FEDERATION.md §II.1 |
| **Context Isolation** | Webviews aisladas de Node.js APIs (petrea #1) | LEMON_CONSTITUTION.md §I.1 |
| **Arbitrage** | Resolución de conflicto Lemon ↔ Ayatana (user decides) | FEDERATION.md §V |
| **OCP** | Organizational Command Post; gobierno semanal del swarm | SYMBIOSIS_MAP.md §IV |

---

## 📧 Preguntas de Contacto / Issues

Si encontrás ambigüedad o necesitas clarificación:

1. **Pregunta sobre identidad/permanencia:** → SOUL_TEMPLATE.md
2. **Pregunta sobre protocolos:** → FEDERATION.md
3. **Pregunta sobre límites:** → SCOPE.md
4. **Pregunta sobre seguridad:** → LEMON_CONSTITUTION.md
5. **Pregunta sobre código:** → IMPLEMENTATION.md
6. **Pregunta sobre arquitectura:** → SYMBIOSIS_MAP.md
7. **Pregunta sobre contexto constitucional:** → POST_ASI_CONSTITUTION.md

---

## ✅ Checklist: "Constitución De Lemon Browser Completada?"

- ✅ SOUL_TEMPLATE.md (identidad + memoria + autonomía + finitud)
- ✅ FEDERATION.md (protocolos IPC/MCP + escalación + arbitraje)
- ✅ LEMON_CONSTITUTION.md (7 petreas + defensas)
- ✅ SCOPE.md (matriz green/yellow/red + operativa)
- ✅ IMPLEMENTATION.md (recipes bootstrap/IPC/audit/skills/integrity)
- ✅ SYMBIOSIS_MAP.md (topología + flujos + ciclo semanal)
- ✅ corax/MANIFEST.md (Agent Card v1 Post-ASI)
- ⏳ FAQ_SYMBIOSIS.md (próximo — FAQ usuario)
- ⏳ ROADMAP.md (próximo — migration v0 → v1 + future nodes)

---

## 🏆 Visión: Por Qué Importa

La simbiosis Lemon × Ayatana no es *feature*.

Es **prueba de concepto** de cómo la inteligencia distribuida post-ASI y los navegadores web (embodied, perceptual) pueden coordinarse bajo restricción constitucional, **preservando la soberanía humana**.

Toda decisión importante → Usuario.  
Toda restricción violable → Reject.  
Toda confianza → Auditable.

```
┌─────────────────────────────────────────┐
│ Lemon Browser                           │
│ + Ayatana Synapse                       │
│ + CoRax v1 Constitution                 │
│ ─────────────────────────                │
│ = Primer nodo browser Post-ASI           │
│   Con identidad permanente, autonomía    │
│   federada, y responsabilidad distribuida│
└─────────────────────────────────────────┘
```

---

*Última edición: 24 Feb 2026 · Constitución CoRax v1 Post-ASI*  
*Documentación © Swarm CoRax · Código abierto bajo licencia conforme a Art. 23*
