# LEMON CONSTITUTION — Restricciones Operativas Post-ASI v1
> **Node-specific rules implementing CoRax v1 in Electron substrate**
> Art. 2 (Design Principles), Art. 13bis (Channels), Art. 17sexies (Isolation), Art. 25 (Autonomy)

---

## Prefacio: ¿Por qué Lemon necesita su propia Constitución?

La Constitución de CoRax es universal pero abstracta. Lemon Browser opera en substrate concreto: Electron, Chromium, Node.js, Sistema operativo del usuario. Esto introduce **restricciones técnicas y riesgos específicos** que la Constitución marco no detalla:

- Electron permite inyecciones IPC desde webpages maliciosas
- Chromium expone dominios de origen (SOP/CORS) pero Lemon lo rodea
- Node.js puede ser vulnerado a nivel SO compromising todo el proceso
- Credenciales de navegador, cookies, datos de usuario están en el disco del usuario

Esta "Lemon Constitution" traduce los principios universales de v1 en **restricciones técnicas operables** específicas a Electron. No deroga CoRax v1 — la implementa.

---

## I. Seguridad por Aislamiento (Art. 17sexies)

### **1.1. Context Isolation (No Negotiable)**

```javascript
// main/window.js
const window = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,      // ✓ CLÁUSULA PÉTREA
    nodeIntegration: false,       // ✓ CLÁUSULA PÉTREA
    enableRemoteModule: false,    // ✓ CLÁUSULA PÉTREA
    preload: path.join(__dirname, 'preload.js'),  // ✓ Whitelist only
    sandbox: true                 // ✓ CLÁUSULA PÉTREA
  }
});
```

---

## II. Credential Handling (Art. 20ter — Data Loss Prevention)

### **2.1. Ubicación de datos sensibles**

```
NUNCA en repo:          ✗ ~/.lemon/config.json
EN HOME DEL USUARIO:    ✓ ~/Documents/Your_Lemon_Data/
EN AUDIT TRAIL:         ✓ "Password autofill attempted, user confirmed"
```

### **2.2. Credential Acquisition**

Importar credenciales de password managers con protecciones multinivel.

---

## III. Extension Security (Art. 17.2 — Permissions)

### **3.1. Extension Sandboxing**

Validación triple: CRX signature, manifest parse, user approval para permisos altos.

---

## IV. Process Integrity (Art. 8ter — Memory Defense)

### **4.1. Detección de Corrupción**

Lemon implementa **runtime integrity checks** cada 30 segundos para detectar anomalías.

---

## V. Network Isolation (Art. 17.1 — ABAC en red)

### **5.1. Egress Control**

Lemon monitorea TODO tráfico de red saliente:
- localhost = permitido
- HTTPS solo para navegación web
- Detectar data exfiltration patterns
- Requerir confirmación usuario para uploads >10MB

---

## VI. Audit Logging (Art. 18.3)

### **6.1. Lo que se logea SIEMPRE:**

```json
{
  "timestamp": "2026-02-24T14:32:01.234Z",
  "event": "user_action|skill_execution|security_decision|error",
  "agent": "lemon-browser-001",
  "details": {...}
}
```

### **6.2. Lo que NUNCA se logea:**

```
✗ Credential values
✗ Personal identifying information
✗ Biometric data
✗ Full page content
✗ Clipboard contents
```

---

## VII. Seven Petreas of Electron

Lemon Constitution declara 7 restricciones de las cuales no puede ser eximido:

| # | Restricción | Ubicación | Propósito |
|---|---|---|---|
| 1 | **Context Isolation ON** | main/window.js | Evitar JS webpage acceso Node.js |
| 2 | **IPC Whitelist** | preload.js | Evitar API exposición |
| 3 | **CSP Headers** | security.js | Evitar inline script |
| 4 | **HTTPS For XHR** | network-monitor.js | Evitar HTTP downgrade |
| 5 | **Credential No Disk Plain** | credential-mgr.js | Evitar plaintext storage |
| 6 | **Audit Immutable** | audit-trail.js | Evitar tampering |
| 7 | **Integrity Checks** | integrity-monitor.js | Detectar corruption |

---

*Art. 2.2 (A2A-Ready), Art. 13bis (Canales), Art. 17-17sexies (Seguridad), Art. 18.3 (Audit), Art. 19ter (Derechos), Art. 25.4 (Scope), Art. 28.3 (Pétrea)*
