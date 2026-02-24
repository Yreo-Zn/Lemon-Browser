# Lemon Browser — Agent Card Constitucional
> Nodo soberano del Swarm CoRax · Constitución v0 · Art. 10 (A2A Agent Card)

---

## Identidad

| Campo | Valor |
|-------|-------|
| **Nombre** | Lemon Browser |
| **Versión** | 1.3.0 |
| **Tipo** | Nodo soberano de infraestructura (Capa 12 — Canal Adaptador) |
| **Runtime** | Electron 40.4.1 (Chromium 144) |
| **Autor** | Denis Soler Bais (@deniskooslr) |
| **Constitución** | CoRax v0 (Febrero 2026) |

## Declaración de capacidades

Lemon Browser es simultáneamente:

1. **Canal Adaptador** (Capa 12): Interfaz de usuario para navegación web, extensiones, y configuración
2. **Nodo MCP** (Capa 5): Expone herramientas de testing/debugging via MCP Server
3. **Host de Skills** (Capa 13): Contiene skills soberanas que gobiernan sus subsistemas

## Capas constitucionales activas

| # | Capa | Módulo en Lemon Browser | Estado |
|---|------|-------------------------|--------|
| 5 | Tool Design + MCP | `corax/mcp-servers/browser-tools/` | ✓ Operativo |
| 9 | Observabilidad | `main/logger.js` + CDP error collection | ✓ Operativo |
| 12 | Canal Adaptador | `renderer/` + `main/` (Electron) | ✓ Operativo |
| 13 | Skill Registry | `corax/skills/` + `corax/CATALOG.md` | ✓ Operativo |

## MCP Servers desplegados

| Server | Puerto/Transporte | Tools | Estado |
|--------|-------------------|-------|--------|
| `browser-tools` | stdio (NDJSON) | 5 (launch, stop, eval, logs, errors) | ✓ |

## Skills soberanas

| Skill | Tipo | Subsistema |
|-------|------|------------|
| `browser-testing` | infraestructura | CDP + MCP bridge |
| `settings-mgr` | dominio | Panel de ajustes (webview IPC) |
| `extension-mgr` | dominio | Extensiones Chrome/Edge (CRX) |
| `tab-mgr` | dominio | Pestañas, navegación, historial |
| `ghost-mode` | dominio + seguridad | Modo privado sin rastro |

## Permisos declarados (Art. 17sexies §3)

- `fs.read` — Lectura de archivos locales (settings, logs, extensiones)
- `fs.write` — Escritura de settings y datos de usuario
- `net.local` — CDP via localhost:9222
- `net.external` — Navegación web (a través de webviews aislados)
- `process.spawn` — Lanzar Electron (solo desde MCP server)
- `ipc.renderer-main` — Comunicación bidireccional Electron IPC

## Restricciones constitucionales

- Todo webview opera con `contextIsolation: true` y `nodeIntegration: false`
- CSP activo para páginas `file://`: `script-src 'self'`
- Preloads usan allowlist de canales IPC (nunca `any`)
- Extensions ejecutan en sandbox de Electron
- Datos de usuario en `~/Documents/Your_Lemon_Data/` (nunca en repo)

---

*Ref: Art. 2.1 (MCP-First), Art. 2.2 (A2A-Ready), Art. 5ter (Skills), Art. 10 (Agent Card), Art. 13bis (Canales), Art. 17sexies (Aislamiento)*
