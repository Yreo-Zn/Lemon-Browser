---
name: tab-mgr
description: "Skill de dominio para la gestión de pestañas, navegación, recientes, marcadores e hibernación en Lemon Browser."
risk: "safe"
tags:
  - domain
  - tabs
  - navigation
  - bookmarks
triggers:
  - tab management
  - pestañas lemon
  - navigation
  - bookmarks
  - marcadores
---

# Tab Manager — Gestión de Pestañas de Lemon Browser

## Overview

Gestiona pestañas (webviews dinámicos), navegación, sitios recientes, páginas guardadas (marcadores), y persistencia de estado de páginas abiertas. Es el subsistema core del browser — cada pestaña es un `<webview>` inyectado dinámicamente en el DOM.

## Cuándo usar esta skill

- Cuando trabajes con creación, cierre, o switching de pestañas
- Cuando modifiques la navegación (URL bar, motores de búsqueda)
- Cuando trabajes con recientes o marcadores
- Cuando debugues problemas de webview lifecycle

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `renderer/tabs.js` | Core: recientes, marcadores, estado de páginas, creación/cierre de webviews |
| `renderer/ui.js` | UI: setup de listeners, navegación, bar de búsqueda, context menu |
| `renderer/state.js` | Estado compartido: `openPages[]`, `activePageIndex`, `savedPages[]`, `recentSites[]` |
| `renderer/search.js` | Búsqueda, sugerencias, preview de resultados |
| `renderer/config.js` | User agents, shortcuts por defecto, motores de búsqueda |
| `renderer/settings-manager.js` | `saveGlobalSettings()`, CSS de scrollbar |

## Modelo de datos

### Estado (renderer/state.js)
```javascript
state = {
  openPages: [],          // Array de { webview, name, url, favicon, tab }
  activePageIndex: -1,    // Índice de pestaña activa
  savedPages: [],         // Marcadores: { name, url, icon }
  recentSites: [],        // Sitios recientes: { name, url, icon, date }
  globalSettings: {},     // Configuración persistida
  currentEngine: 'google',
  currentShortcuts: {...},
  isInteractive: null,    // Ghost mode
}
```

### Página abierta
```javascript
{
  webview: HTMLWebViewElement,  // <webview> inyectado en DOM
  name: string,                // Título de la página
  url: string,                 // URL actual
  favicon: string,             // URL del favicon
  tab: HTMLElement              // Referencia al tab en la UI
}
```

## Operaciones principales

### Crear pestaña
1. Crear elemento `<webview>` con user agent desktop
2. Configurar event listeners (`did-navigate`, `page-title-updated`, `page-favicon-updated`)
3. Inyectar en `#main-browser-container`
4. Actualizar `state.openPages` y `state.activePageIndex`
5. Actualizar UI de tabs en `#active-searches-container`

### Cerrar pestaña
1. Remover webview del DOM
2. Remover de `state.openPages`
3. Si era la activa, activar la siguiente/anterior
4. Si no quedan pestañas, volver a home (`returnToHome()`)
5. Guardar estado si `remember-pages` está activo

### Guardar estado de páginas
`saveOpenPagesState()` serializa las URLs abiertas a `globalSettings['lastOpenPages']` para restaurar al reinicio.

### Recientes
`saveRecentSite(site)` mantiene una cola FIFO con límite configurable (`recent-sites-limit` en settings, default 5). Límite 0 = desactivado.

### Marcadores
`savePage(page)` guarda en `state.savedPages`. UI en panel lateral desplegable.

## Navegación

La navegación se maneja desde `renderer/ui.js`:
- `navigateTo(url)` — Navega la pestaña activa o crea una nueva
- Search bar con motores: Google, DuckDuckGo, Bing, etc.
- Shortcuts de teclado configurables (Ctrl+Arrow para nav, Alt+Arrow para tabs)

## Restricciones

- Cada webview tiene user agent desktop (`DESKTOP_UA` de config.js)
- `setWindowOpenHandler` en `main/security.js` intercepta popups y los redirige como nuevas pestañas
- Los webviews de páginas no tienen preload — operan como browser estándar con sandbox

---

*Ref: Art. 13bis (Canales — el browser como canal adaptador), Art. 17sexies §3 (sandbox de webviews)*
