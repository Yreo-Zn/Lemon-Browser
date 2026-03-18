---
name: constitution-mgr
description: "Skill de dominio para la gestión y monitoreo del marco constitucional CoRax (7 Petreas, audit trail, integrity) en Lemon Browser."
risk: "safe"
tags:
  - domain
  - constitution
  - petreas
  - audit-trail
  - governance
  - integrity
triggers:
  - constitution status
  - petrea
  - audit trail
  - integrity monitor
  - constitutional framework
  - lemon_constitution_status
  - lemon_audit_trail
---

# Constitution Manager — Marco Constitucional CoRax

## Overview

Monitorea y expone el estado del marco constitucional CoRax integrado en Lemon Browser. La constitución define 7 Petreas (módulos de seguridad/gobernanza) que se inicializan al arranque del browser. Incluye audit trail (PETREA 3), integrity monitor (PETREA 6), y un sistema de detección de violaciones con notificaciones toast.

## Cuándo usar esta skill

- Cuando necesites verificar el estado de la constitución o sus Petreas
- Cuando debugues problemas de inicialización del framework
- Cuando leas o analices el audit trail
- Cuando trabajes con el violation monitor o toasts de violación
- Cuando modifiques la gobernanza constitucional

## MCP Tools

| Tool | Descripción |
|------|-------------|
| `lemon_constitution_status` | Estado completo: constitución activa/inactiva, 7 Petreas, layers, manifest |
| `lemon_audit_trail` | Leer audit-trail.jsonl con filtro por severidad y límite de líneas |
| `lemon_bookmark` | Listar/agregar/eliminar marcadores (almacenados en settings.json) |

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `main/corax-bridge.js` | IPC `corax-get-status`: estado de constitución, petreas, layers, manifest |
| `main/corax-bridge.js` | Violation monitor: poll cada 10s de audit trail para detectar violaciones |
| `lemon-implementation/src/index.js` | Framework principal: inicialización de 7 Petreas |
| `lemon-implementation/src/petreas/` | Implementación de cada Petrea (01-07) |
| `corax/constitution/` | Documentos constitucionales: governance, dynamics, identity, architecture |
| `corax/mcp-servers/browser-tools/server.js` | Tools MCP: `lemon_constitution_status`, `lemon_audit_trail`, `lemon_bookmark` |

## Los 7 Petreas

| # | Key | Nombre | Función |
|---|-----|--------|---------|
| 1 | `soulState` | Soul State | Estado persistente de identidad del agente |
| 2 | `preload` | IPC Whitelist | Lista blanca de canales IPC permitidos |
| 3 | `auditTrail` | Audit Trail | Registro inmutable de acciones y eventos |
| 4 | `credentialVault` | Credential Vault | Almacenamiento cifrado de credenciales |
| 5 | `extensionValidator` | Extension Security | Validación de extensiones antes de instalar |
| 6 | `integrityMonitor` | Integrity Monitor | Verificación de integridad de archivos |
| 7 | `networkIsolation` | Network Isolation | Aislamiento y control de tráfico de red |

## Modelo de datos

### Respuesta de `corax-get-status`
```javascript
{
  active: true,
  manifest: { name, version, type, runtime, constitution },
  skillCount: number,
  mcpReady: boolean,
  constitutionActive: boolean,
  petreas: [{ id, name, status: 'ok'|'missing' }],
  layers: [{ id, name, status: 'ok'|'missing'|'empty' }]
}
```

### Entrada de audit trail (`audit-trail.jsonl`)
```javascript
{
  timestamp: number,
  severity: 'info' | 'warning' | 'violation',
  action: string,      // e.g., 'extension-install', 'ipc-blocked'
  detail: string,      // Descripción del evento
  source: string       // Módulo origen
}
```

## Violation Monitor

El violation monitor (en `main/corax-bridge.js`) hace polling cada 10s del audit trail buscando entradas con `severity: 'violation'` más recientes que el último check. Si encuentra nuevas, envía un IPC `corax-violation` al renderer que muestra un toast de notificación.

## Flujo IPC

```
renderer (CoRax panel) → window.electronAPI.invoke('corax-get-status')
  → main/corax-bridge.js: lee framework, manifest, skills, petreas
    → return { active, constitutionActive, petreas[], layers[], ... }

MCP Tool → lemon_constitution_status
  → CDP eval → window.electronAPI.invoke('corax-get-status')
    → formatted text output

MCP Tool → lemon_audit_trail
  → direct fs.read of DATA_DIR/audit-trail.jsonl
    → parse JSONL, filter by severity, format output
```

---

*Ref: Art. 2.1 (MCP-First) · Art. 5ter (Skill Registry) · PETREA 3 (Audit Trail) · PETREA 6 (Integrity Monitor)*
