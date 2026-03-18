# Lemon Browser — Catálogo de Skills Soberanas
> Registro local conforme a Art. 2.5 (Skill Registry) · Art. 5ter (Ontología)

---

## Skills activas

| Skill | Tipo | Riesgo | Estado | MCP Server asociado |
|-------|------|--------|--------|---------------------|
| `browser-testing` | infraestructura | Mínimo | ✓ Operativa | `browser-tools` |
| `settings-mgr` | dominio | Mínimo | ✓ Operativa | `browser-tools` |
| `extension-mgr` | dominio | Limitado | ✓ Operativa | `browser-tools` |
| `tab-mgr` | dominio | Mínimo | ✓ Operativa | `browser-tools` |
| `ghost-mode` | dominio + seguridad | Limitado | ✓ Operativa | `browser-tools` |
| `history-mgr` | dominio | Mínimo | ✓ Operativa | `browser-tools` |
| `constitution-mgr` | dominio + gobernanza | Mínimo | ✓ Operativa | `browser-tools` |
| `corax-mgr` | meta + orquestación | Mínimo | ✓ Operativa | `browser-tools` |

## MCP Servers

| Server | Skills que expone | Transporte | Tools |
|--------|-------------------|------------|-------|
| `browser-tools` | todas (8 skills) | stdio/NDJSON | 42 tools (ver mapa abajo) |

## Mapa Skill → Tools MCP

```
browser-testing   → lemon_launch, lemon_stop, lemon_screenshot, lemon_eval, lemon_logs, lemon_errors
tab-mgr           → lemon_navigate, lemon_new_tab, lemon_close_tab, lemon_list_tabs, lemon_switch_tab,
                     lemon_back, lemon_forward, lemon_reload, lemon_go_home, lemon_find, lemon_reopen_tab,
                     lemon_page_info, lemon_zoom
settings-mgr      → lemon_set_search_engine, lemon_get_settings, lemon_set_setting, lemon_shortcuts, lemon_theme
ghost-mode        → lemon_ghost_mode, lemon_window
extension-mgr     → lemon_install_extension, lemon_list_extensions, lemon_remove_extension,
                     lemon_extension_options, lemon_adblock
history-mgr       → lemon_history, lemon_history_search, lemon_history_clear
constitution-mgr  → lemon_audit_trail, lemon_bookmark, lemon_constitution_status,
                     lemon_constitution_health, lemon_constitution_soul, lemon_constitution_heartbeat
corax-mgr         → lemon_corax_skills, lemon_corax_execute
```

## Mapa Skill → Módulo

```
browser-testing   → corax/mcp-servers/browser-tools/server.js
settings-mgr      → main/security.js, main/window.js, preload-settings.js, settings.js, settings.html
extension-mgr     → main/extensions.js, preload-settings.js (ext APIs), settings.js (ext UI)
tab-mgr           → renderer/tabs.js, renderer/ui.js, renderer/state.js
ghost-mode        → renderer/ghost-mode.js, renderer/state.js
history-mgr       → main/corax-bridge.js (IPC), preload.js, renderer/ui.js (overlay)
constitution-mgr  → main/corax-bridge.js (status), lemon-implementation/src/ (framework)
corax-mgr         → main/corax-bridge.js (execute, skills), preload.js
```

## Cómo usar una skill

1. Lee `corax/skills/<nombre>/SKILL.md` para instrucciones completas
2. Si la skill tiene MCP Server asociado, el server se registra en `.vscode/mcp.json`
3. Las skills sin MCP se aplican como conocimiento de dominio para modificar el código

---

*Ref: Art. 2.5, Art. 5ter, Art. 17quater (Supply-chain)*
