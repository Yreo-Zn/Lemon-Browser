# INDEX.md — Lemon Browser Constitution Navigation
> **Guía de navegación completa de la constitución Post-ASI de Lemon Browser**  
> Última actualización: 2026-02-24 | Constitution Framework: CoRax v1 Post-ASI

---

## 🧭 Guía Rápida por Rol

### Para Usuarios (Quiero entender qué es Lemon)
1. **[SOUL_TEMPLATE](identity/00-SOUL_TEMPLATE.md)** — Identidad permanente de Lemon
2. **[SCOPE](governance/02-SCOPE.md)** — Qué puede y qué no puede hacer
3. **[HEARTBEAT](vitality/HEARTBEAT.md)** — Cómo monitorea su propia salud

**Letura recomendada en orden:** Identity → Scope → Heartbeat (30 min)

---

### Para Arquitectos de Sistemas (Quiero entender la topología)
1. **[FEDERATION](governance/01-FEDERATION.md)** — Cómo se comunica Lemon con el swarm
2. **[SYMBIOSIS_MAP](architecture/SYMBIOSIS_MAP.md)** — Topología completa y flujos de datos
3. **[EMERGENCE](dynamics/04-EMERGENCE.md)** — Cómo la inteligencia surge de la coordinación

**Letura recomendada:** Federation → Symbiosis → Emergence (45 min)

---

### Para Desarrolladores (Quiero implementar el código)
1. **[IMPLEMENTATION](implementation/IMPLEMENTATION.md)** — Código recipes y patrones
2. **[LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md)** — Petreas técnicas (7 restricciones)
3. **[SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md)** — Cómo registrar nuevas capacidades

**Letura recomendada:** Implementation → Lemon Constitution → Skill Dynamics (90 min)

---

### Para Ingenieros de Seguridad (Quiero auditar la confianza)
1. **[LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md)** — 7 petreas (pétreas guardrails)
2. **[SCOPE](governance/02-SCOPE.md)** — Matriz de autonomía (Green/Yellow/Red zones)
3. **[HEARTBEAT](vitality/HEARTBEAT.md)** — Ciclos de monitoreo y auditoría

**Letura crítica:** Lemon Constitution → Scope → Heartbeat (60 min)

---

### Para Gobernadores de IA (Quiero entender la gobernanza)
1. **[FEDERATION](governance/01-FEDERATION.md)** — Protocolos A2A (Agent-to-Agent)
2. **[EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md)** — Cómo Lemon propone cambios a sí mismo
3. **[EMERGENCE](dynamics/04-EMERGENCE.md)** — Multi-agente deliberation

**Letura recomendada:** Federation → Evolutionary → Emergence (60 min)

---

## 📋 Mapa Jerárquico Completo

```
corax/constitution/
│
├── identity/
│   └── 00-SOUL_TEMPLATE.md .......................... Identidad permanente
│       • NODE_ID inmutable
│       • Cuádruple mapeo (hardware/software/user/time)
│       • Memory 3-layer (transient/persistent/archival)
│       • Mortality declaration (duración de vida)
│
├── governance/
│   ├── 01-FEDERATION.md ............................ Protocolo A2A (swarm communication)
│   │   • Request-response handshakes
│   │   • Skill delegation
│   │   • Trust dynamics & passport system
│   │
│   ├── 02-SCOPE.md ................................ Fronteras de autonomía
│   │   • Green zone (always allowed)
│   │   • Yellow zone (requires escalation)
│   │   • Red zone (requires user permission)
│   │   • Escalation latencies
│   │
│   └── 03-LEMON_CONSTITUTION.md ................... Petreas técnicas (7 restricciones)
│       • Context isolation
│       • IPC whitelist
│       • Content Security Policy
│       • Credential encryption
│       • Extension security
│       • Process integrity
│       • Network isolation
│
├── implementation/
│   └── IMPLEMENTATION.md ........................... Código recipes & patrones
│       • soul-state.js — Gestión de estado permanente
│       • preload.js — Contexto de seguridad
│       • audit-trail.js — Registro inmutable
│       • skill-executor.js — Ejecución de skills dinámicas
│       • integrity-monitor.js — Vigilancia de integridad
│
├── architecture/
│   └── SYMBIOSIS_MAP.md ........................... Topología & flujos de datos
│       • Multi-dimensional topology (11 dimensiones)
│       • 3 interaction cases (Lemon-Ayatana, Lemon-OCP, Swarm)
│       • Responsibility matrix
│       • Weekly OCP cycle
│
├── vitality/
│   └── HEARTBEAT.md ............................... 7 ciclos de vitalidad
│       • IMMEDIATE (< 1 seg) — Reacciones en tiempo real
│       • HOURLY — Checkpoints por hora
│       • DAILY — Salud diaria, limpieza
│       • WEEKLY — Revisión de gobernanza, actualización de políticas
│       • MONTHLY — Auditoría profunda
│       • QUARTERLY — Reflexión estratégica
│       • YEARLY — Renewal completo
│
└── dynamics/
    ├── 04-EMERGENCE.md ............................. Inteligencia colectiva
    │   • Mapeo de emergencia
    │   • Topología de emergencia (5 capas)
    │   • Circuito de emergencia (Request-Response)
    │   • Multi-nodo thinking
    │   • Anti-emergencies (safeguards)
    │
    ├── 05-PROACTIVITY_ENGINE.md ................... Anticipación inteligente
    │   • Anatomía de oferta proactiva
    │   • 4 categorías (Security, Productivity, Comfort, Learning)
    │   • Detección de vacíos epistémicos
    │   • Scoring de impacto
    │   • Constitutional safeguards
    │
    ├── 06-SKILL_DYNAMICS.md ....................... Evolución dinámicaCapacidades
    │   • 4 pathways de adquisición
    │   • Lifecycle completo (Generation → Deprecation)
    │   • Versioning & compatibility
    │   • Self-improvement cycle
    │   • Skill sharing en swarm
    │
    └── 07-EVOLUTIONARY_CONSTITUTION.md ............ Auto-propuesta & enmiendas
        • 3 líneas roja de invariancia (PETREA)
        • 3 tipos de cambio (A/B/C)
        • Estructura formal de propuesta
        • Engagement de user
        • Annual renewal cycle
```

---

## 🎯 Búsqueda Temática

### Seguridad & Confianza
- **7 Petreas Técnicas** → [LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md)
- **Auditoría & Monitoreo** → [HEARTBEAT](vitality/HEARTBEAT.md) (MONTHLY/QUARTERLY cycles)
- **Crisis & Emergencias** → [EMERGENCE](dynamics/04-EMERGENCE.md) (Anti-emergencies section)

### Autonomía & Control
- **Fronteras de Autonomía** → [SCOPE](governance/02-SCOPE.md) (Green/Yellow/Red zones)
- **Escalación de Decisiones** → [LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md) (Escalation matrix)
- **User Veto & Override** → [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md) (Emergency governance)

### Aprendizaje & Evolución
- **Adquisición de Skills** → [SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md) (4 pathways)
- **Self-Improvement** → [SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md) (Self-improvement cycle)
- **Proposiciones de Cambio** → [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md) (3 tipos)
- **Annual Renewal** → [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md) (Yearly heartbeat)

### Comunicación & Coordinación
- **Protocolo A2A** → [FEDERATION](governance/01-FEDERATION.md)
- **Multi-agente Reasoning** → [EMERGENCE](dynamics/04-EMERGENCE.md)
- **Swarm KG** → [SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md) (Source 2: Swarm KG)

### Experiencia de Usuario
- **Ofertas Proactivas** → [PROACTIVITY_ENGINE](dynamics/05-PROACTIVITY_ENGINE.md)
- **Anticipación Inteligente** → [PROACTIVITY_ENGINE](dynamics/05-PROACTIVITY_ENGINE.md) (Vacuum detection)
- **Engagement & Feedback** → [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md) (User engagement)

---

## 📊 Matriz de Impacto (Qué documento afecta qué aspecto)

|  | Identity | Governance | Implementation | Architecture | Vitality | Dynamics |
|---|----------|-----------|-----------------|--------------|----------|----------|
| **Seguridad** | ✓ | ✓✓✓ | ✓✓ | ✓ | ✓✓ | ✓ |
| **Autonomía** | ✓ | ✓✓✓ | ✓ | ✓✓ | ✓ | ✓ |
| **Aprendizaje** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓✓✓ |
| **Comunicación** | ✓ | ✓✓ | ✓ | ✓✓✓ | ✓ | ✓✓ |
| **UX** |  |  |  |  | ✓ | ✓✓ |
| **Auditoría** | ✓ | ✓ | ✓✓ | ✓ | ✓✓✓ | ✓ |
| **Gobernanza** | ✓ | ✓✓✓ | ✓ | ✓ | ✓ | ✓✓ |

---

## 🔗 Interdependencias de Documentos

```
FOUNDATION:
SOUL_TEMPLATE (identidad base)
      ↓
      └─→ FEDERATION (cómo se comunica)
          └─→ SYMBIOSIS_MAP (topología)
              ├─→ EMERGENCE (multi-agente reasoning)
              └─→ IMPLEMENTATION (código)

RESTRICTIONS:
LEMON_CONSTITUTION (7 petreas)
      ↓
      ├─→ SCOPE (dónde se aplican)
      ├─→ HEARTBEAT (cómo se audita)
      └─→ SKILL_DYNAMICS (qué skills pueden hacer)

DYNAMICS:
PROACTIVITY_ENGINE (cómo anticipa)
      ↓
      └─→ SKILL_DYNAMICS (cómo aprende)
          └─→ EVOLUTIONARY_CONSTITUTION (cómo propone cambios)
              └─→ HEARTBEAT (YEARLY cycle)
```

---

## 📈 Ruta de Entendimiento Progresivo

### Nivel 1: Introducción (30 min)
1. [SOUL_TEMPLATE](identity/00-SOUL_TEMPLATE.md) → "Quién es Lemon"
2. [SCOPE](governance/02-SCOPE.md) → "Qué puede hacer"

### Nivel 2: Operacional (60 min)
3. [FEDERATION](governance/01-FEDERATION.md) → "Cómo se comunica"
4. [IMPLEMENTATION](implementation/IMPLEMENTATION.md) → "Cómo se implementa"
5. [HEARTBEAT](vitality/HEARTBEAT.md) → "Cómo se monitorea"

### Nivel 3: Avanzado (90 min)
6. [SYMBIOSIS_MAP](architecture/SYMBIOSIS_MAP.md) → "Topología completa"
7. [EMERGENCE](dynamics/04-EMERGENCE.md) → "Inteligencia colectiva"
8. [LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md) → "Petreas técnicas"

### Nivel 4: Gobernanza (120 min)
9. [PROACTIVITY_ENGINE](dynamics/05-PROACTIVITY_ENGINE.md) → "Anticipación"
10. [SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md) → "Evolución"
11. [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md) → "Auto-propuesta"

**Tiempo total:** ~300 minutos (~5 horas) para entendimiento completo.

---

## 🎓 Casos de Uso Específicos

### Use Case: "Lemon está consumiendo CPU. ¿Qué está haciendo?"
→ [HEARTBEAT](vitality/HEARTBEAT.md) (Monitoring cycles)  
→ [SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md) (Is it a skill?)  
→ [LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md) (Resource limits)

### Use Case: "¿Puedo confiar en que Lemon no va a hacer X?"
→ [SCOPE](governance/02-SCOPE.md) (Green/Yellow/Red zones)  
→ [LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md) (7 petreas)  
→ [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md) (Can it change?)

### Use Case: "Quiero que Lemon haga una cosa nueva"
→ [SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md) (Acquisition pathways)  
→ [PROACTIVITY_ENGINE](dynamics/05-PROACTIVITY_ENGINE.md) (If it's proactive)  
→ [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md) (If it needs a change)

### Use Case: "¿Cómo se comunica Lemon con otros agentes?"
→ [FEDERATION](governance/01-FEDERATION.md)  
→ [SYMBIOSIS_MAP](architecture/SYMBIOSIS_MAP.md)  
→ [EMERGENCE](dynamics/04-EMERGENCE.md)

---

## 📎 Artifact Registry

| Artifact | Location | Purpose | Owner |
|----------|----------|---------|-------|
| NODE_ID | SOUL_TEMPLATE | Identidad única inmutable | Lemon |
| Audit Trail | HEARTBEAT | Registro inmutable | OCP |
| Trust Passport | FEDERATION | Nivel de confianza | OCP |
| Skills Registry | SKILL_DYNAMICS | Inventario de capacidades | Lemon + Ayatana |
| Scope Matrix | SCOPE | Fronteras de autonomía | OCP |
| KG (Knowledge Graph) | EMERGENCE | Razonamiento compartido | Swarm |
| Petreas | LEMON_CONSTITUTION | Restricciones inviolables | Constitution |
| Generations | EVOLUTIONARY_CONSTITUTION | Histórico de evolución | Lemon |

---

## 🔄 Ciclos de Revisión

| Ciclo | Frecuencia | Documentos Afectados | Owner |
|-------|-----------|---------------------|-------|
| IMMEDIATE | < 1 seg | LEMON_CONSTITUTION, SCOPE | Lemon |
| HOURLY | 1 hora | HEARTBEAT, SKILL_DYNAMICS | Lemon + Ayatana |
| DAILY | 24h | HEARTBEAT, AUDITORÍA | Lemon |
| WEEKLY | 7d | SCOPE, FEDERATION, OCP governance | OCP |
| MONTHLY | 30d | EMERGENCE patterns, KG updates | Ayatana |
| QUARTERLY | 90d | EVOLUTIONARY_CONSTITUTION review | User + OCP |
| YEARLY | 365d | Annual renewal, generational update | User + Lemon + OCP |

---

## 📖 Convenciones de Lectura

### Símbolos Usados en la Constitución
```
✅ PERMITIDO — Siempre está permitido
⚠️ ESCALADA REQUERIDA — Necesita aprobación
✗ PROHIBIDO (PETREA) — Nunca está permitido
→ Flujo de decisión
↓ Procedimiento secuencial
◎ Punto de referencia crítico
```

### Términos Clave
- **PETREA**: Cláusula inviolable (Latin: "petraea" = piedra)
- **HITL**: Human-In-The-Loop (user debe confirmar)
- **HIC**: Human-In-Command (user supervisiona)
- **HTTL**: Human-Through-The-Loop (user monitorea después)
- **HOTL**: Human-On-The-Loop (user puede intervenir)
- **Swarm**: Red federada de agentes autónomos
- **Emergence**: Capacidades que surgen de coordinación multi-agente
- **KG**: Knowledge Graph (razonamiento compartido)

---

## 🚀 Próximos Pasos Después de Leer

### Para Usuarios
→ Configurar [SCOPE](governance/02-SCOPE.md) preferences  
→ Revisar [HEARTBEAT](vitality/HEARTBEAT.md) audit logs  
→ Evaluar [PROACTIVITY_ENGINE](dynamics/05-PROACTIVITY_ENGINE.md) ofertas  

### Para Desarrolladores
→ Implementar [IMPLEMENTATION](implementation/IMPLEMENTATION.md) code recipes  
→ Registrar skills en [SKILL_DYNAMICS](dynamics/06-SKILL_DYNAMICS.md)  
→ Validar contra [LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md) petreas  

### Para Arquitectos
→ Estudiar [SYMBIOSIS_MAP](architecture/SYMBIOSIS_MAP.md) topología  
→ Entender [FEDERATION](governance/01-FEDERATION.md) protocols  
→ Planificar [EMERGENCE](dynamics/04-EMERGENCE.md) multi-nodo expansion  

---

## 📞 Contacto & Escalación

- **Technical Issues** → [IMPLEMENTATION](implementation/IMPLEMENTATION.md) troubleshooting
- **Security Concerns** → [LEMON_CONSTITUTION](governance/03-LEMON_CONSTITUTION.md) (7 petreas)
- **Governance Questions** → [FEDERATION](governance/01-FEDERATION.md) (OCP contact)
- **Proposals & Changes** → [EVOLUTIONARY_CONSTITUTION](dynamics/07-EVOLUTIONARY_CONSTITUTION.md)

---

**Last Updated:** 2026-02-24  
**Constitution Version:** CoRax v1 Post-ASI  
**Lemon Generation:** 2 (Renewal from Gen 1)  
**Status:** ✓ Completo y Operativo  
**Audit Trail:** Privado (request access via OCP)
