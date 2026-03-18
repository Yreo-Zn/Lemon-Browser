---
name: extension-mgr
description: "Skill de dominio para la gestión de extensiones Chrome/Edge en Lemon Browser. CRX parsing, instalación, drag-drop, Chrome Web Store y Edge Add-ons integration."
risk: "risk"
tags:
  - domain
  - extensions
  - crx
  - chrome-web-store
  - security
triggers:
  - install extension
  - chrome extension
  - edge addon
  - crx file
  - extension management
---

# Extension Manager — Gestión de Extensiones de Lemon Browser

## Overview

Gestiona el ciclo de vida completo de extensiones del browser: instalación desde archivos CRX/ZIP, descarga e instalación desde Chrome Web Store y Microsoft Edge Add-ons, persistencia, carga al inicio, y eliminación. Incluye integración con uBlock Origin como adblock built-in.

## Cuándo usar esta skill

- Cuando trabajes con instalación o eliminación de extensiones
- Cuando debugues problemas de carga de extensiones al inicio
- Cuando modifiques el menú contextual de tiendas de extensiones
- Cuando trabajes con el adblock (uBlock Origin)
- Cuando modifiques el UI de extensiones en el panel de settings

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `main/extensions.js` | Core: CRX→ZIP conversion, install, download, remove, adblock, persistence |
| `main/security.js` | Menú contextual para Chrome Web Store / Edge Add-ons |
| `preload-settings.js` | APIs: `installExtension`, `downloadAndInstallCrx`, `getExtensionsList`, etc. |
| `settings.js` | UI: drag-drop zone, extension cards, delete/configure buttons |
| `settings.html` | Sección "Extensiones" con drop zone y lista |

## Flujo de instalación

### Desde archivo (drag & drop)
```
settings.html (drop zone) → settings.js (drop handler)
  → electronAPI.installExtension(file.path)
    → ipcRenderer.invoke('install-extension', filePath)
      → main/extensions.js: installExtensionInternal(filePath)
        → convertCrxToZip() si es .crx
        → extract-zip al directorio de extensiones
        → session.defaultSession.loadExtension(extDir)
        → return { success, name, version }
```

### Desde Chrome Web Store (context menu)
```
webview (chromewebstore.google.com) → context-menu event
  → main/security.js: detecta URL pattern /detail/[name]/[id]
    → IPC 'trigger-extension-install' al renderer
      → renderer → settings webview: electronAPI.onTriggerExtensionInstall
        → confirm dialog → electronAPI.downloadAndInstallCrx(extensionId)
          → main: download CRX from Chrome API → installExtensionInternal
```

### Desde Edge Add-ons
```
Mismo flujo que Chrome Web Store pero con:
  - URL pattern: microsoftedge.microsoft.com/addons
  - IPC channel: 'trigger-edge-extension-install'
  - API: downloadAndInstallEdgeCrx(extensionId)
```

## Formato CRX

```
Bytes 0-3:   Magic number 0x34327243 ("Cr24")
Bytes 4-7:   Version (2 o 3)

CRX v2:
  Bytes 8-11:  Public key length
  Bytes 12-15: Signature length
  Header = 16 + pubKeyLen + sigLen

CRX v3:
  Bytes 8-11:  Header length
  Header = 12 + headerLen

Después del header: ZIP estándar
```

## Directorios

- **Extensiones de usuario:** `~/Documents/Your_Lemon_Data/extensions/`
- **Extensiones temporales:** `os.tmpdir()` para extracción
- **uBlock Origin:** bundleado o descargado, cargado automáticamente si adblock está habilitado

## UI en Settings

La sección de extensiones tiene:
1. **Drop zone** — Arrastra archivos .crx o .zip
2. **Botón Chrome Web Store** — Abre la Web Store en nueva pestaña
3. **Lista de extensiones** — Cards con nombre, versión, botones Configurar/Eliminar
4. Iconos via `<ion-icon>` (cloud-upload-outline, settings-outline, trash-outline)

## MCP Tools (browser-tools server)

| Tool | Descripción |
|------|-------------|
| `lemon_install_extension` | Instalar extensión desde CRX URL o Chrome/Edge/Opera store |
| `lemon_list_extensions` | Listar extensiones instaladas |
| `lemon_remove_extension` | Eliminar extensión por ID |
| `lemon_extension_options` | Abrir página de opciones de una extensión |
| `lemon_adblock` | Activar/desactivar adblock (uBlock Origin) |

## Restricciones de seguridad

- Las extensiones se ejecutan en el sandbox de Electron (session.defaultSession)
- No hay acceso directo al main process desde extensiones
- El análisis CRX solo procesa el header para extraer el ZIP — no ejecuta código del CRX
- Los archivos temporales se limpian después de la instalación

---

*Ref: Art. 17quater (Supply-chain — extensiones como dependencias externas), Art. 17sexies §3 (sandbox)*
