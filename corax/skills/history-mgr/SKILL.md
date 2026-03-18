---
name: history-mgr
description: "Skill de dominio para la gestión del historial de navegación persistente en Lemon Browser."
risk: "safe"
tags:
  - domain
  - history
  - browsing
  - navigation
triggers:
  - browsing history
  - historial
  - history search
  - lemon_history
---

# History Manager — Gestión del Historial de Navegación

## Overview

Gestiona el historial de navegación persistente: registro automático de cada página visitada, búsqueda por URL/título, y limpieza. Los datos se almacenan en `~/Documents/Your_Lemon_Data/history.json` con un límite de 10,000 entradas (FIFO). El usuario accede al historial con Ctrl+H (overlay en el renderer).

## Cuándo usar esta skill

- Cuando trabajes con el historial de navegación (buscar, listar, limpiar)
- Cuando debugues problemas de persistencia del historial
- Cuando modifiques el overlay de historial (Ctrl+H)
- Cuando trabajes con la caché de historial en memoria

## MCP Tool

| Tool | Descripción |
|------|-------------|
| `lemon_history` | Buscar/listar historial (`query`, `limit`) o limpiar todo (`clear: true`) |

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `main/corax-bridge.js` | IPC handlers: `history-add`, `history-search`, `history-clear` |
| `preload.js` | Bridge: `historyAdd()`, `historySearch()`, `historyClear()` |
| `renderer/ui.js` | Overlay de historial (Ctrl+H), renderizado de entradas |
| `corax/mcp-servers/browser-tools/server.js` | Tool `lemon_history` — lectura directa de history.json |

## Modelo de datos

### Entrada de historial
```javascript
{
  url: string,       // URL visitada
  title: string,     // Título de la página
  timestamp: number  // Date.now() al momento de la visita
}
```

### Almacenamiento
- **Archivo:** `~/Documents/Your_Lemon_Data/history.json`
- **Formato:** Array JSON de entradas
- **Límite:** 10,000 entradas (las más antiguas se descartan)
- **Escritura:** Debounced (2s) para evitar I/O excesivo
- **Caché:** `historyCache` en memoria para acceso rápido

## Flujo IPC

```
Webview (did-navigate) → renderer/ui.js
  → window.electronAPI.historyAdd({ url, title })
    → ipcRenderer.invoke('history-add', entry)
      → main/corax-bridge.js: push a historyCache, debounced writeHistory()

Ctrl+H → renderer/ui.js (overlay)
  → window.electronAPI.historySearch(query, limit)
    → ipcRenderer.invoke('history-search', query, limit)
      → main/corax-bridge.js: filter historyCache, return slice
```

## Operaciones

| Operación | Canal IPC | Descripción |
|-----------|-----------|-------------|
| Agregar | `history-add` | Registra URL+título+timestamp, cap 10k |
| Buscar | `history-search` | Filtra por query en url/title, devuelve `limit` más recientes |
| Limpiar | `history-clear` | Vacía historyCache y history.json |

---

*Ref: Art. 5ter (Skill Registry) · Art. 2.1 (MCP-First)*
