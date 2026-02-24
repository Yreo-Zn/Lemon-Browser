# Lemon Browser — Catálogo de Skills Soberanas
> Registro local conforme a Art. 2.5 (Skill Registry) · Art. 5ter (Ontología)

---

## Skills activas

| Skill | Tipo | Riesgo | Estado | MCP Server asociado |
|-------|------|--------|--------|---------------------|
| `browser-testing` | infraestructura | Mínimo | ✓ Operativa | `browser-tools` |
| `settings-mgr` | dominio | Mínimo | ✓ Operativa | — |
| `extension-mgr` | dominio | Limitado | ✓ Operativa | — |
| `tab-mgr` | dominio | Mínimo | ✓ Operativa | — |
| `ghost-mode` | dominio + seguridad | Limitado | ✓ Operativa | — |

## MCP Servers

| Server | Skills que expone | Transporte | Tools |
|--------|-------------------|------------|-------|
| `browser-tools` | `browser-testing` | stdio/NDJSON | `lemon_launch`, `lemon_stop`, `lemon_eval`, `lemon_logs`, `lemon_errors` |

## Mapa Skill → Módulo

```
browser-testing  → corax/mcp-servers/browser-tools/server.js
settings-mgr     → main/security.js, main/window.js, preload-settings.js, settings.js, settings.html
extension-mgr    → main/extensions.js, preload-settings.js (ext APIs), settings.js (ext UI)
tab-mgr          → renderer/tabs.js, renderer/ui.js, renderer/state.js
ghost-mode       → renderer/ghost-mode.js, renderer/state.js
```

## Cómo usar una skill

1. Lee `corax/skills/<nombre>/SKILL.md` para instrucciones completas
2. Si la skill tiene MCP Server asociado, el server se registra en `.vscode/mcp.json`
3. Las skills sin MCP se aplican como conocimiento de dominio para modificar el código

---

*Ref: Art. 2.5, Art. 5ter, Art. 17quater (Supply-chain)*
