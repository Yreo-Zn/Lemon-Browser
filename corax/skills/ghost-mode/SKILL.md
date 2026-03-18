---
name: ghost-mode
description: "Skill de dominio y seguridad para el modo fantasma (ghost mode) de Lemon Browser. Controla transparencia, click-through, idle detection, y visibilidad de controles."
risk: "safe"
tags:
  - domain
  - security
  - ghost-mode
  - privacy
  - ui-behavior
triggers:
  - ghost mode
  - modo fantasma
  - click through
  - transparency
  - idle detection
---

# Ghost Mode — Modo Fantasma de Lemon Browser

## Overview

El modo fantasma es una característica única de Lemon Browser que hace la ventana transparente y click-through cuando no se está usando activamente. Permite ver contenido web mientras se trabaja en otras aplicaciones — la ventana se "desvanece" y los clicks pasan a través de ella.

## Cuándo usar esta skill

- Cuando trabajes con la lógica de transparencia/click-through
- Cuando modifiques el comportamiento de idle detection
- Cuando debugues problemas de interactividad (la ventana no responde a clicks)
- Cuando trabajes con la visibilidad de controles en diferentes modos

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `renderer/ghost-mode.js` | Core: `setInteractive()`, `updateControlsMode()`, `resetSearchIdleTimer()`, `setupGhostMode()` |
| `renderer/state.js` | `state.isInteractive`, `state.searchIdleTimer` |
| `preload.js` | `setIgnoreMouseEvents(ignore, options)` — bridge al main process |

## Funciones principales

### `setInteractive(value: boolean)`
Controla si la ventana responde a eventos de mouse.
```javascript
// value = true  → ventana normal, recibe clicks
// value = false → clicks pasan a través (ghost mode activo)
window.electronAPI.setIgnoreMouseEvents(!value, { forward: true });
```
- `{ forward: true }` permite que eventos de mouse se reenvíen para hover detection
- Solo actualiza si el valor cambió (guard: `state.isInteractive === value`)

### `updateControlsMode(isHome: boolean, hideControls?: boolean)`
Ajusta la posición y visibilidad de los controles de ventana según el contexto:
- **isHome = true**: Controles dentro del wrapper, pill oculto, class `on-bar`
- **isHome = false**: Controles en `document.body`, pill visible, class `pages-open`
- **hideControls = true**: Oculta los controles completamente (ej: settings abierto)

### `resetSearchIdleTimer()`
Timer de 7 segundos de inactividad en la search bar:
- Si la search bar está visible y vacía y hay páginas abiertas → oculta el wrapper
- Restaura interactividad de la pestaña activa

### `setupGhostMode()`
Configura todos los listeners de mouse/teclado para el ciclo ghost:
- `mouseenter`/`mouseleave` en el wrapper (search bar area)
- `focus`/`blur` en la search bar
- Listeners en controles de ventana, tabs, etc.

## Ciclo de vida del ghost mode

```
Estado inicial
    │
    ▼
Ventana visible, interactiva
    │
    ├── Usuario abre pestaña → modo browser
    │   │
    │   ├── Mouse sale del wrapper → ghost mode (transparent, click-through)
    │   │   │
    │   │   └── Mouse entra al wrapper → interactivo de nuevo
    │   │
    │   └── Search bar idle 7s → oculta wrapper, pestaña interactiva
    │
    └── Home (sin pestañas) → siempre interactivo
```

## Bug histórico resuelto

**Ghost mode regression (B-series):** `setupGhostMode()` usaba una closure que capturaba referencias stale al DOM. Se resolvió usando las referencias reactivas de `state.js` y `dom` en lugar de variables locales.

## Interacción con otros subsistemas

- **Settings:** `openSettings()` llama `setInteractive(true)` y `updateControlsMode(false, true)` para asegurar que el panel sea usable
- **Tabs:** Crear/cerrar pestañas actualiza el modo (home vs browser)
- **Search:** El idle timer es parte del flujo ghost

## MCP Tools (browser-tools server)

| Tool | Descripción |
|------|-------------|
| `lemon_ghost_mode` | Activar/desactivar ghost mode |
| `lemon_window` | Minimizar, maximizar, restaurar, o consultar estado de ventana |

## Restricciones

- `setIgnoreMouseEvents` es una API de Electron a nivel de ventana — afecta toda la ventana
- `{ forward: true }` es necesario para que CSS `:hover` funcione en ghost mode
- El ghost mode no aplica cuando la ventana está en home (sin pestañas abiertas)

---

*Ref: Lemon Browser es Capa 12 (Canal Adaptador) — ghost mode es una propiedad del canal que afecta la supervisión: si la ventana es click-through, HITL no es posible en ese estado*
