---
name: settings-mgr
description: "Skill de dominio para el panel de settings de Lemon Browser. Cubre webview IPC, preload bridge, CSP, persistencia de configuración, y todos los controles UI."
risk: "safe"
tags:
  - domain
  - settings
  - webview-ipc
  - electron-security
triggers:
  - settings panel
  - configuración lemon
  - webview preload
  - accent color
  - browser shortcuts
---

# Settings Manager — Panel de Configuración de Lemon Browser

## Overview

Gestiona el panel de settings implementado como un `<webview>` con preload aislado, comunicación IPC bidireccional via `sendToHost`, y persistencia de configuración en archivo local.

## Cuándo usar esta skill

- Cuando modifiques o depures el panel de settings
- Cuando agregues nuevas opciones de configuración
- Cuando trabajes con la seguridad del webview (CSP, preload, contextIsolation)
- Cuando debugues problemas de IPC entre settings y el renderer principal

## Arquitectura

```
┌─────────────────────────┐
│   Renderer (index.html) │
│   └── <webview>         │──── ipc-message ────┐
│       id=settings-webview│                     │
└─────────────────────────┘                     ▼
                                    ┌─────────────────────┐
┌─────────────────────────┐         │ renderer/ui.js       │
│   settings.html         │         │ channelHandlers {}   │
│   + settings.js         │         │  close-settings      │
│   + settings.css        │         │  accent-color-changed│
│   + preload-settings.js │         │  shortcuts-changed   │
│   (window.electronAPI)  │         │  theme-changed       │
└─────────────────────────┘         │  remember-pages      │
                                    │  adblock-changed     │
┌─────────────────────────┐         │  animation-settings  │
│   Main Process          │         │  open-url            │
│   main/security.js      │         └─────────────────────┘
│   will-attach-webview   │
│   → inyecta preload     │
│   main/window.js        │
│   → IPC: get-settings,  │
│     save-settings, etc. │
└─────────────────────────┘
```

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `settings.html` | UI del panel (secciones: General, Apariencia, Privacidad, Atajos, Extensiones, Info) |
| `settings.js` | Lógica del panel (~490 líneas). Toggles, color picker, shortcuts, extensiones |
| `settings.css` | Estilos del panel |
| `preload-settings.js` | Security bridge — expone `window.electronAPI` con allowlist de canales |
| `main/security.js` | Inyecta preload via `will-attach-webview`, configura CSP |
| `main/window.js` | IPC handlers: `get-settings`, `save-settings`, `get-settings-url` |
| `renderer/ui.js` | `openSettings()`, `channelHandlers{}` para ipc-message |

## electronAPI expuesta en settings webview

```javascript
window.electronAPI = {
  // Persistencia
  getSettings()                    → invoke('get-settings')
  saveSettings(settings)           → send('save-settings', settings)

  // Filesystem
  openDataFolder()                 → send('open-data-folder')

  // Extensiones
  installExtension(filePath)       → invoke('install-extension', filePath)
  downloadAndInstallCrx(id)        → invoke('download-and-install-crx', id)
  downloadAndInstallEdgeCrx(id)    → invoke('download-and-install-edge-crx', id)
  getExtensionsList()              → invoke('get-extensions-list')
  removeExtension(id)              → invoke('remove-extension', id)
  openExtensionOptions(id)         → send('open-extension-options', id)

  // Comunicación al host renderer (via sendToHost con allowlist)
  sendToHost(channel, ...args)     → ipcRenderer.sendToHost(channel, ...args)
    Canales permitidos:
      close-settings, accent-color-changed, shortcuts-changed,
      theme-changed, remember-pages-changed, adblock-changed,
      animation-settings-changed, open-url

  // Eventos desde host
  onTriggerExtensionInstall(cb)
  onTriggerEdgeExtensionInstall(cb)
}
```

## Bugs históricos resueltos

1. **Preload no se inyectaba** — `will-attach-webview` filtraba por `params.src.includes('settings.html')` pero el webview adjuntaba con `src="about:blank"`. **Fix:** siempre inyectar preload (solo existe un webview interno).

2. **CSP bloqueaba Ionicons** — CDN `unpkg.com` bloqueado por `script-src 'self'`. **Fix:** bundlear Ionicons localmente desde `node_modules/`.

3. **ID mismatch** — `settings.js` buscaba `#open-data-folder`, HTML tenía `#open-data-folder-btn`. **Fix:** corregir el selector.

## Agregar nueva configuración

1. Agregar HTML en la sección correspondiente de `settings.html`
2. Agregar handler en `settings.js` (dentro del `DOMContentLoaded`)
3. Si necesita comunicar al renderer: agregar canal al allowlist en `preload-settings.js` y handler en `channelHandlers` de `renderer/ui.js`
4. Persistir via `globalSettings[key]` + `saveSettings()`

## Restricciones

- El webview de settings opera con `contextIsolation: true` siempre
- Solo canales en el allowlist pueden enviarse via `sendToHost`
- CSP `script-src 'self'` — solo scripts locales (no CDN)
- Ionicons se cargan desde `node_modules/ionicons/dist/` (local)

---

*Ref: Art. 17sexies §3 (aislamiento de contexto), Art. 2.1 (MCP-First para herramientas externas)*
