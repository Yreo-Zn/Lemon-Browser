---
name: browser-testing
description: "Skill de infraestructura para testing y debugging de Lemon Browser via CDP y MCP. Expone 5 herramientas para control remoto del browser."
risk: "safe"
tags:
  - infrastructure
  - mcp-server
  - testing
  - cdp
triggers:
  - lemon browser testing
  - debug browser
  - cdp eval
  - mcp browser tools
---

# Browser Testing — MCP Bridge para Lemon Browser

## Overview

Skill de infraestructura que expone un MCP Server (`browser-tools`) con 5 herramientas para testing y debugging remoto de Lemon Browser via Chrome DevTools Protocol (CDP). Es la Capa 5 (Tool Design + MCP) del nodo soberano.

## Cuándo usar esta skill

- Cuando necesites probar el DOM, estado, o IPC del browser sin interacción manual
- Cuando debugues bugs en webviews, settings, extensiones, o ghost mode
- Cuando necesites recopilar errores de runtime del renderer
- Cuando necesites evaluar JavaScript arbitrario en el contexto del renderer

## MCP Server: `browser-tools`

**Ubicación:** `corax/mcp-servers/browser-tools/server.js`
**Transporte:** stdio (NDJSON framing — newline-delimited JSON)
**SDK:** `@modelcontextprotocol/sdk` v1.12+ (importar desde `/types.js`)
**Registro:** `.vscode/mcp.json` → `lemon-browser`

### Herramientas disponibles

| Tool | Descripción |
|------|-------------|
| `lemon_launch` | Lanza Electron con CDP en port 9222. Auto-conecta si ya corre. |
| `lemon_stop` | Detiene el proceso de Electron gestionado. |
| `lemon_eval` | Evalúa JS en el renderer via `Runtime.evaluate`. Soporta `awaitPromise`. |
| `lemon_logs` | Lee el archivo de log del main process (`lemon.log`). |
| `lemon_errors` | Devuelve errores de runtime (excepciones + console.error) recopilados via CDP. |

### Flujo de uso típico

```
1. lemon_launch          → Arranca o conecta al browser
2. lemon_eval            → Ejecuta código para probar funcionalidad
3. lemon_errors          → Verifica que no haya errores nuevos
4. lemon_eval (más)      → Interacciona con DOM, settings, tabs
5. lemon_stop            → Cierra cuando termines
```

### Patrones de evaluación

**Acceder al DOM:**
```javascript
document.getElementById('settings-btn').click()
```

**Acceder al estado de la app:**
```javascript
import("./renderer/state.js").then(m => JSON.stringify(m.state.openPages.length))
```

**Evaluar dentro de un webview:**
```javascript
(async () => {
  const swv = document.getElementById('settings-webview');
  const result = await swv.executeJavaScript('JSON.stringify(window.electronAPI ? Object.keys(window.electronAPI) : "no API")');
  return result;
})()
```

**Verificar IPC sendToHost:**
```javascript
(async () => {
  const swv = document.getElementById('settings-webview');
  await swv.executeJavaScript('window.electronAPI.sendToHost("close-settings")');
  await new Promise(r => setTimeout(r, 300));
  return document.getElementById('settings-container').classList.contains('hidden');
})()
```

## Arquitectura del servidor

```
server.js
├── CDP Helpers (cdpHttpGet, cdpConnect, cdpSend)
├── Process Management (launchBrowser, stopBrowser, waitForCdp)
├── Log Reader (readLogs)
└── MCP Server (ListToolsRequestSchema, CallToolRequestSchema handlers)
```

- **CDP Port:** 9222 (hardcoded)
- **WebSocket:** Node 22 nativo (no necesita `ws`)
- **Error collection:** `Runtime.exceptionThrown` + `Runtime.consoleAPICalled` (error/warning)
- **Auto-reconnect:** `lemon_eval` re-conecta CDP si la conexión se perdió

## Bug conocido: launch desde MCP

`lemon_launch` que spawna `electron.cmd` puede fallar con `app.getPath('documents')` error porque `main/config.js` ejecuta `require('electron').app` a nivel de módulo. **Workaround:** lanzar Electron manualmente primero con `npx electron . --remote-debugging-port=9222`, luego `lemon_launch` auto-conecta via `connected_existing`.

## Restricciones constitucionales

- El MCP server solo accede al browser via CDP localhost (Art. 17sexies — aislamiento)
- No tiene acceso directo al filesystem del usuario excepto lectura de logs
- Outputs de `lemon_eval` se tratan como datos potencialmente no confiables (Art. 17 — input sanitization)

---

*Ref: Art. 2.1 (MCP-First), Art. 15.1 (Circuit breaker), Art. 17 (Seguridad), Art. 25bis (Testing constitucional)*
