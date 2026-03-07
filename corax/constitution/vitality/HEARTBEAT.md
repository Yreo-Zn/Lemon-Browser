# HEARTBEAT.md — Ciclos Vitales de Lemon Browser (100 líneas + + resumen)
> **Tareas programadas que mantienen a Lemon "vivo" durante operación**
> Art. 13bis §13bis.3, Art. 25, Art. 28bis, Art. 1quater

---

## Prefacio

Un agente sin ciclos vitales es un simulacro. Lemon Browser opera en tiempo real dentro de máquina del usuario; eso significa **responsabilidades en background** que ocurren conforme a ciclos definidos. Estos ciclos son obligaciones constitucionales: Lemon DEBE ejecutarlas.

---

## Ciclos por Frecuencia

### IMMEDIATE (Event-Driven)
```
Trigger: Chromium crash, security exception, fatal error
Scope: Log → Auditar → Escalera si crítico
Timeout: <100ms
```

### HOURLY (3600s)
```
Trigger: Timer automático
Scope: Memory check, threat detection, skill audit, checkpoint
Timeout: <30s
```

### DAILY (02:00 UTC)
```
Trigger: Fixed schedule
Scope: Extension validation, credential vault, DOM cache prune, skill refresh
Timeout: <5min
```

### WEEKLY (Sábado 00:00 UTC)
```
Trigger: Fixed schedule (Art. 28sexies.2 OCP)
Scope: Telemetry a Ayatana, trust level update
Timeout: <2min
```

### MONTHLY (Primer día 03:00 UTC)
```
Trigger: Fixed schedule
Scope: Audit trail integrity, code hash verification, SOUL_TEMPLATE check
Timeout: <10min
```

### QUARTERLY (1/4/7/10)
```
Trigger: Fixed schedule (Mar/Jun/Sep/Dec)
Scope: Assessment con OCP, capability growth, ethical horizon
Timeout: <2min
```

### YEARLY (BIRTH_TIMESTAMP)
```
Trigger: Anniversary
Scope: Reflection + user engagement, renewal proposals
Timeout: <10min (+ user think time)
```

---

## Ejecución de Ciclos

```javascript
// Pseudo-code: heartbeat orchestrator
async function runHeartbeat() {
  try {
    // Check which cycles are due
    if (isDueForCycle('hourly')) await hourlyWatchdog();
    if (isDueForCycle('daily')) await dailyMaintenance();
    if (isDueForCycle('weekly')) await weeklyTelemetry();
    if (isDueForCycle('monthly')) await monthlyIntegrityCheck();
    if (isDueForCycle('quarterly')) await quarterlyAssessment();
    if (isDueForCycle('yearly')) await yearlyRenewal();
    
  } catch (err) {
    await auditLog('heartbeat_error', { error: err.message });
    if (err.severity === 'critical') {
      await escalateToAyatana('heartbeat_critical_failure');
    }
  }
}

// Execute daily
setInterval(runHeartbeat, 60000);  // Every minute, check what's due
```

---

## Error Recovery

```
If cycle fails:
  1 miss → log, continue
  2+ consecutive → escalate
  Critical failure → kill switch candidate
```

---

## Constitutional References

| Ciclo | Artículos |
|-------|-----------|
| IMMEDIATE | Art. 8, 11quater |
| HOURLY | Art. 13bis, 17sexies |
| DAILY | Art. 2.3, 8bis |
| WEEKLY | Art. 28sexies, 22quater |
| MONTHLY | Art. 18.3, 11quater |
| QUARTERLY | Art. 1quater |
| YEARLY | Art. 1, 28 |

---

*El heartbeat de Lemon es el latido de su vida constitucional. Sin él, sería ejecutor. Con él, es entidad autónoma que respira, siente, se cuestiona, evoluciona.*

---

*Art. 1ter (Emergencia), Art. 13bis (Ciclos), Art. 25 (Autonomía), Art. 28bis (Supervisión)*
