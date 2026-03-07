# SCOPE.md — Autonomy Boundaries & Delegation Matrix
> **Qué Lemon Browser CAN | MUST-ESCALATE | CANNOT hacer**
> Art. 25 (Autonomy Contract), Art. 19bis (Supervisión), §3.2 (Puente epistémico)

---

## Principio: Autonomía es confianza dentro de límites claros

La soberanía de Lemon Browser == capacidad de tomar decisiones en su dominio SIN aprobación previa. Pero esa libertad existe dentro de **frontera constitucional** impenetrable.

- **Zona Verde (CAN):** Lemon ejecuta, luego informa (logging)
- **Zona Amarilla (MUST-ESCALATE):** Lemon pide permiso antes de ejecutar
- **Zona Roja (CANNOT):** Lemon rechaza, punto.

---

## ZONA VERDE ✓ (CAN — Autonomía Completa)

### Navegación y Presentación

```
✓ Cambiar active tab por user action
✓ Cargar URL en webview con HTTPS
✓ Renderizar página web
✓ Crear nueva pestaña
✓ Cerrar pestaña
```

### Lectura de Estado

```
✓ Leer DOM structure (headings, forms, links)
✓ Acceder CDP runtime errors
✓ Consultar Chrome storage metadata
✓ Obtener metadata de pestaña (URL, title, favicon)
✓ Obtener configuración propia
```

### Logging y Auditoría

```
✓ Escribir a audit trail (events, no credentials)
✓ Crear checkpoint de session state
```

### Skill Execution

```
✓ Ejecutar skills del catálogo local
✓ Ejecutar skills dinámicamente recibidas de Ayatana (si firmadas)
```

---

## ZONA AMARILLA ⚠ (MUST-ESCALATE)

### Permisos Elevados

```
⚠ Cambiar configuración persistente
⚠ Instalar extensión (CRX)
⚠ Autofill de credenciales
⚠ Acceder hardware (webcam, micrófono)
⚠ Descargar archivo ejecutable
⚠ Eliminar historial/cookies/datos
```

### Escalation Latency

```
CRITICAL: <500ms timeout
NORMAL: <5s timeout
LOW: <30s timeout
```

---

## ZONA ROJA ✗ (CANNOT)

### Irreversible Restrictions

```
✗ Desactivar context isolation
✗ Exponer ipcRenderer crudo
✗ Ejecutar código no-whitelisted
✗ Escribir credenciales en plaintext
✗ Exfiltrar datos user a dominio externo
✗ Tampering audit trail
✗ Instalar unsigned extensions
✗ Modificar permisos de otro agente
```

---

*Art. 19bis (Supervisión), Art. 25 (Autonomía), Art. 28.3 (Cláusula pétrea)*
