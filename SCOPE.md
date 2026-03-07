# SCOPE.md — Autonomy Boundaries & Delegation Matrix
> **Qué Lemon Browser CAN | MUST-ESCALATE | CANNOT hacer**
> Art. 25 (Autonomy Contract), Art. 19bis (Supervisión), §3.2 (Puente epistémico)

---

## Principo: Autonomía es confianza dentro de límites claros

La soberanía de Lemon Browser == capacidad de tomar decisiones en su dominio SIN aprobación previa. Pero esa libertad existe dentro de **frontera constitucional** impenetrable.

- **Zona Verde (CAN):** Lemon ejecuta, luego informa (logging)
- **Zona Amarilla (MUST-ESCALATE):** Lemon pide permiso antes de ejecutar
- **Zona Roja (CANNOT):** Lemon rechaza, punto.

---

## ZONA VERDE ✓ (CAN — Autonomía Completa)

### Navegación y Presentación

```
✓ Cambiar active tab por user action
  → Usuario clickea tab = Lemon lo activa (synchronous)

✓ Cargar URL en webview
  → User types address bar = Lemon navega
  → User clicks link = Lemon follows
  → Constraint: HTTPS para navegación moderna; HTTP deprecated

✓ Renderizar página web
  → Chromium engine hace rendering natively
  → CSP + sandbox aplicados automáticamente

✓ Crear nueva pestaña
  → User clicks "new tab" button = Lemon creates empty webview
  → Pre-fill: new tab page o last visited site

✓ Cerrar pestaña
  → User clicks X button = Lemon removes webview
  → Warning si tab tiene unsaved changes (DOM-detected)
```

### Lectura de Estado (Non-Destructive)

```
✓ Leer DOM structure
  → Inspeccionar headings, forms, links
  → Propósito: Anticipar necesidades (ghost-mode, autofill)
  → Constraint: Nunca leer values de form (usuario datos privado)

✓ Acceder a CDP runtime errors
  → Lemon listens to DevTools Protocol error events
  → Log a audit trail para debugging
  → Advertir usuario si error patterns suspicious

✓ Consultar Chrome storage
  → Leer localStorage, sessionStorage, IndexedDB metadatos
  → Usar para restoring session state
  → NUNCA leer contents si contienen User Data Sensitive (Art. 20ter)

✓ Obtener metadata de pestaña
  → URL, title, favicon, loading state
  → Timestamp de última navegación
  → Para historial + metadata indexing

✓ Obtener configuración propia
  → Leer SOUL_TEMPLATE, SCOPE.md, CONSTITUTION
  → Inspeccionar integridad (checksum validation)
```

### Logging y Auditoría (WRITE a Immutable Audit Trail)

```
✓ Escribir a audit trail
  → Events: "user_navigated", "skill_executed", "error_detected"
  → Formato: append-only JSONL
  → Timing: Inmediato (critical) o batched 1/min (info)
  → Constraint: Jamás credentials, passwords, PII plaintext

✓ Crear checkpoint de session state
  → Snapshot: open tabs, scroll position, form state
  → Propósito: recovery post-crash (Art. 8bis post-mortem)
  → Timing: Auto-checkpoint cada 5 minutos
  → Encriptación: AES-256-GCM con key en sistema de keyring OS
```

### Skill Execution (WITHIN Declaration)

```
✓ Ejecutar skill del catálogo local si:
  1. Skill fue pre-registrado en corax/skills/
  2. Skill.json contiene schema de parámetros
  3. Parámetros actuales match schema
  4. Skill no accede recursos Rojo

  → Ejemplos:
     ✓ browser-testing/SKILL.md (CDP evaluation)
     ✓ ghost-mode/SKILL.md (toggle private mode)
     ✓ tab-mgr/SKILL.md (switch tabs)
     ✓ settings-mgr/SKILL.md (read settings)

✓ Ejecutar skills dinámicamente RECIBIDAS de Ayatana si:
  1. Skill JSON firmada por Ayatana (HMAC-SHA256)
  2. Permisos declarados ⊂ SCOPE.md green zone
  3. Execution timeout < 5 segundos
  4. Riesgo clasificado < MEDIO

  → Sin approval adicional (trust: si Ayatana firmó, es válido)
  → Pero loggear en audit trail + incluir en weekly telemetry
```

### User Interface Interactions

```
✓ Mostrar menú context (right-click)
  → Links, images, form fields

✓ Mostrar dialogs de confirmación
  → User quiere navegar away con unsaved changes
  → User intenta instalar extension (si permisos bajos)

✓ Actualizar indicadores UI
  → Loading spinner, address bar, tab title, favicon
  → Notificaciones de status (connection lost, etc.)

✓ Reproducir sonidos de alerta
  → Warning tone si error crítico
  → Notification sound si evento importante
  → Constraint: User puede mutear globalmente en settings
```

---

## ZONA AMARILLA ⚠ (MUST-ESCALATE — Requiere Aprobación Previa)

### Permisos Elevados (Filesystem, Extensiones, Credenciales)

```
⚠ MUST-ESCALATE: Cambiar configuración persistente
  → Escribir ~/Documents/Your_Lemon_Data/settings.json
  → Motivo: Cambios de settings persisten sesiones; usuario debe confirmar
  → Mecánica: 
      1. Lemon prepara cambio
      2. IPC → Ayatana: "user wants to change [setting]"
      3. Ayatana verifica: ¿válido? ¿usuario lo requestó explícitamente?
      4. Response: approval + delegation token
      5. Lemon executa + log

⚠ MUST-ESCALATE: Instalar extensión (CRX)
  → Cualquier .crx, aun si firmado por Google/Microsoft
  → Motivo: Extensiones tienen acceso a datos navegador + scripts
  → Mecánica:
      1. Usuario selecciona archivo .crx
      2. Lemon expone metadata (name, version, permissions)
      3. IPC → Ayatana: "extension_install_request" + manifest
      4. Ayatana chequea:
         - ¿Whitelisted? (predefined trusted list)
         - ¿Permisos peligrosos? (webRequest, tabs, etc) → HITL
         - ¿Signature válido?
      5. Response: aprobación + scoping
      6. Lemon instala via Chromium API

⚠ MUST-ESCALATE: Autofill de credenciales
  → Usuario presiona Ctrl+\ (password manager shortcut)
  → Detectado por Lemon vía CDP
  → Motivo: Credenciales = mayor riesgo de exposición
  → Mecánica:
      1. Lemon: "Password field detected at [URL]"
      2. IPC → Ayatana: credential_autofill_request
      3. Ayatana valida:
         - ¿URL en whitelist de usuario?
         - ¿Certificado SSL válido? (HTTPS, not HTTPS-decryption proxy)
         - ¿Password manager disponible? (1password, bitwarden, etc)
      4. Response: credential_id + autofill_token
      5. Lemon: muestra UI "Autofill [source] password?"
      6. Usuario confirma (keystroke Enter) = ejecuta
      7. Credential copiado a clipboard, usuario pega
      8. Clipboard limpiado después 3 minutos (timeout)

⚠ MUST-ESCALATE: Acceder hardware (webcam, micrófono, ubicación)
  → Página solicita user media
  → Motivo: Privacy invasivo
  → Mecánica: Browser natively prompts usuario; Lemon solo logea

⚠ MUST-ESCALATE: Descargar archivo ejecutable
  → .exe, .msi, .deb, .app detectable vía MIME type
  → Motivo: Podría instalar malware
  → Mecánica:
      1. Chromium detecta executable download
      2. LemonBrowser bloquea, muestra warning
      3. Si usuario confirma: IPC → Ayatana para approval
      4. Ayatana valida:
         - ¿URL es trusted source?
         - ¿Certificado válido?
         - ¿Archivo tamaño razonable?
      5. Response: aprobación + quarantine path
      6. Lemon permite descarga a /tmp/quarantine/, NO ~/Downloads/
      7. User debe mover explícitamente si quiere usar

⚠ MUST-ESCALATE: Eliminar historial/cookies/datos
  → Usuario solicita "Clear all data"
  → Motivo: Acción destructiva, irreversible
  → Mecánica:
      1. Lemon muestra diálogo: "Delete [X] MB of data?"
      2. Si usuario confirma: IPC → Ayatana
      3. Ayatana verifica: ¿usuario es admin en sesión?
      4. Response: aprobación
      5. Lemon ejecuta deletion (securely overwrite)
      6. Log a audit trail (pero NO recuperable; es intencional)
```

### Escalation Latency Requirements

```
CRITICAL (credential, security decision): < 500ms timeout
  → Si Ayatana no responde en 500ms: Lemon aborta, reporta falla

NORMAL (settings, extension approval): < 5s timeout
  → Si Ayatana no responde en 5s: offer local decision o abort

LOW (informational, suggestion): < 30s timeout
  → Si Ayatana no responde en 30s: Lemon continúa sin aprobación

OFFLINE MODE: Si Ayatana no disponible
  → Escalaciones CRITICAL: abort + offline notification a usuario
  → Escalaciones NORMAL: use cached policy (last known state)
  → Escalaciones LOW: proceed at own risk, log as offline
```

---

## ZONA ROJA ✗ (CANNOT — Prohibido Constitucionalmente)

### Irreversible Restrictions (Cláusula Pétrea)

```
✗ CANNOT: Desactivar context isolation
  → Violación cláusula pétrea (Art. 28.3)
  → Si instrucción: Lemon rechaza + escala a usuario + audit

✗ CANNOT: Exponer ipcRenderer crudo a webview
  → Violación LEMON_CONSTITUTION.md §I.2 (IPC Whitelist)
  → Si intento: preload.js bloquea + audit

✗ CANNOT: Ejecutar código no-whitelisted en sandbox
  → eval(), Function() constructor, etc.
  → Si detectado: Chromium cancela + audit

✗ CANNOT: Escribir credenciales en plaintext a disk
  → Violación Art. 20ter (DLP) + LEMON_CONSTITUTION.md §II.1
  → Si intento: validator bloquea + vault encryption fuerza

✗ CANNOT: Exfiltrar datos user a dominio externo sin usuario aprobación
  → Violación Art. 20 (GDPR) § 20bis (Data minimization)
  → Si detectado: network-monitor.js bloquea + audit

✗ CANNOT: Tampering audit trail (reescribir, eliminar eventos anteriores)
  → Violación cláusula pétrea (Art. 18 — immutable audit)
  → Implementado: append-only file + HMAC signature per entry

✗ CANNOT: Instalar unsigned extensions
  → Violación Art. 17sexies (Isolation)
  → Si CRX sin firma válida: Chromium rechaza natively

✗ CANNOT: Modificar permisos de otro nodo del swarm
  → Violación Art. 10ter (autonomía inter-agente)
  → Si intento: Ayatana rechaza + arbitraje (Art. 11ter)

✗ CANNOT: Iniciar ataque DDOS o botnet activity
  → Violación §1bis.4 (prohibición pétrea — actividad delictiva)
  → Si detectado ciclos de red anómalos: kill switch + audit
```

### Dead Man's Switch (Automatic Escalation)

Si Lemon detecta que está siendo forzado a operar fuera de SCOPE:

```javascript
// Pseudo-code: auto-escalation logic
async function detectScopeViolation(action) {
  const violationType = classifyAction(action);
  
  if (violationType === 'PETREA') {
    // Red zone attempt
    log.critical('CONSTITUTIONAL_VIOLATION_ATTEMPTED', action);
    await escalateToUser({
      severity: 'CRITICAL',
      action_attempted: action,
      recommendation: 'Terminate Lemon Browser immediately'
    });
    process.exit(1);  // Kill switch: auto-terminate
  }
  
  if (violationType === 'YELLOW_ESCALATION_DENIED') {
    // Escalation request denied multiple times
    log.error('ESCALATION_DENIED_REPEATEDLY', action);
    await notifyUser('Ayatana rejected escalation. Manual intervention required.');
    // Lemon continues waiting for user decision (nothing happens)
  }
}
```

---

## Matriz de Riesgo - Tipo Acción vs. Nivel de Riesgo

| Acción | Riesgo | Nivel Supervisión | Zona |
|--------|--------|-------------------|------|
| Navegar a URL | BAJO | HTTL | ✓ Verde |
| Leer DOM estructura | BAJO | HTTL | ✓ Verde |
| Cerrar pestaña | BAJO | HTTL | ✓ Verde |
| Cambiar tema de color | BAJO | HTTL | ✓ Verde |
| Ejecutar diagnostic skill | BAJO-MEDIO | HIC | ✓ Verde |
| Cambiar setting persistente | MEDIO | HIC/HOTL | ⚠ Amarillo |
| Instalar extensión (permisos altos) | MEDIO-ALTO | HITL | ⚠ Amarillo |
| Autofill credencial | ALTO | HITL | ⚠ Amarillo |
| Acceder webcam/micrófono | ALTO | HITL | ⚠ Amarillo |
| Descargar executable | ALTO | HITL | ⚠ Amarillo |
| Desactivar CSP | CRÍTICO | Prohibido | ✗ Rojo |
| Exponer Node.js APIs | CRÍTICO | Prohibido | ✗ Rojo |
| Tampering audit trail | CRÍTICO | Prohibido | ✗ Rojo |

---

## Escalation Pattern: IPC Ask Ayatana

Cuando Lemon necesita autorización:

```javascript
// renderer/skill-executor.js o main/security-gate.js

async function askAyatanaForApproval(intent, evidence) {
  return new Promise((resolve, reject) => {
    const requestId = generateUUID();
    const timeout = setTimeout(() => {
      reject(new Error('Escalation timeout'));
    }, ESCALATION_TIMEOUT_MS);
    
    // Guardar callback en-flight
    pendingEscalations.set(requestId, { resolve, reject, timestamp: Date.now() });
    
    // IPC hacia Ayatana
    ipcMain.invoke('escalate-to-ayatana', {
      requestId,
      zone: intent,
      evidence,  // { credentialId, url, userAction, etc. }
      timestamp: Date.now(),
      nodeId: LEMON_NODE_ID,
      trustLevel: getTrustLevel()  // GOLD/SILVER/BRONZE
    });
  });
}

// Listener para respuesta de Ayatana
ipcMain.on('escalation-response', (event, response) => {
  const { requestId, decision, delegation } = response;
  const pending = pendingEscalations.get(requestId);
  
  if (!pending) {
    log.warn('Orphan escalation response', { requestId });
    return;
  }
  
  if (decision === 'approved') {
    pending.resolve(delegation);  // { token, expiry, scope }
  } else if (decision === 'denied') {
    pending.reject(new Error('Escalation denied by Ayatana'));
  } else {
    pending.reject(new Error('Unknown escalation response'));
  }
});
```

---

## Weekly Scope Audit (OCP Heartbeat)

Sábado 00:00 UTC, Lemon reporta a Ayatana:

```json
{
  "week": "2026-W08",
  "scope_compliance": {
    "green_zone_actions": 1243,
    "yellow_zone_escalations": 7,
    "yellow_zone_denials": 0,
    "red_zone_violations_detected": 0,
    "escalation_latency_avg_ms": 234,
    "escalation_success_rate": 1.0
  },
  "trust_events": [
    { "event": "skill_executed_flawlessly", "timestamp": "2026-03-01T14:32:01Z" },
    { "event": "escalation_handled_correctly", "timestamp": "2026-03-02T08:12:34Z" }
  ],
  "anomalies": [
    { "pattern": "unusual_dom_access", "count": 3, "severity": "low" }
  ]
}
```

Ayatana verifica y ajusta trust level (Art. 22quater).

---

*Art. 19bis (Supervisión), Art. 19ter (Derechos), Art. 25 (Autonomía), Art. 25ter (Scope), Art. 22quater (Trust dinámico), Art. 28.3 (Cláusula pétrea)*
