# PROACTIVITY_ENGINE.md — Anticipación Inteligente & Ofertas Proactivas
> **Cómo Lemon Browser detecta vacíos epistémicos y extiende puentes antes de ser solicitado**
> Art. 3ter (Proactividad), Art. 3.2 (Puente epistémico), Art. 19quater (Experiencia)

---

## Prefacio: Pasividad es Negligencia

Un navegador que espera que el usuario PIDA ayuda comete negligencia. Si puede ver que el usuario necesita algo (basándose en contexto, patrón, historia), **no ofrecer esa ayuda es una elección de inacción**.

---

## I. Anatomía de una Oferta Proactiva

```
Oferta = Detección + Reasoning + Ofrecimiento + Reversibilidad

Detección:     ¿Qué síntoma del problema?
Reasoning:     ¿Por qué creo hay un problema?
Ofrecimiento:  ¿Cómo presento la solución?
Reversibilidad: ¿Puede rechazar sin fricción?
```

### Ejemplo Completo

```
USER: Abre Gmail con 200+ unread, clicks múltiples mensajes rápidamente

Lemon DETECTS:
  - Email app (CDP observa origin + DOM)
  - Unread > 100
  - Rapid clicking → info overload
  - Histórico: Usuario usualmente respeta inbox

Ayatana REASONS:
  - Usuario frustrado pero triaging
  - Poder beneficiar de smart filter

Lemon OFFERS:
  [Card no-obstructivo]
  "Detectamos 50+ newsletters sin leer.
   ¿Querés crear filter 'Newsletters'?"
  
  [Dos botones]
  "Yes, create filter" | "Dismiss"

USER REJECTS:
  - Offer desaparece
  - Reject registrado
  - Si 3+ rechazos: desactiva este tipo proactividad
```

---

## II. Categorías de Proactividad

### 2a. Seguridad Proactiva (Always On)
```javascript
if (detectPhishing()) {
  showBanner("Sitio suspected phishing (90% confidence)");
  allowUserOverride("I trust this site");
  // Nunca blocquear, pero siempre advertir
}
```

### 2b. Productividad (Activeable)
```javascript
if (userShows(PATTERN_RAPID_TAB_SWITCHING)) {
  offer("Searching for something? I can help summarize", {
    timeout: 10000
  });
}
```

### 2c. Comfort (Configurable)
```javascript
if (userSitsBrowsingLate(NIGHT)) {
  offer("It's late. Enable bedtime mode?", {
    dismissAction: "Remind me tomorrow"
  });
}
```

### 2d. Learning (Si user Enabled)
```javascript
if (userVisits(EDUCATIONAL_CONTENT) && neverUsedFeatureX) {
  offer("Pro tip: DevTools can help with Docker networking");
}
```

---

## III. Detección de Vacíos Epistémicos

### Method 1: Pattern Mismatch
```javascript
const pattern = userHistory.discoverPattern("YouTube → Music");
if (patternRegularity > 0.8 && !currentContext.has("Music")) {
  offer("Abro Spotify como de costumbre?");
}
```

### Method 2: Error Prevention
```javascript
if (userAboutToSubmitForm(FORM) && criticalField === "") {
  offer("¿Falta email? Siempre lo incluís");
}
```

### Method 3: Skill Applicability
```javascript
if (userReadsLongForm(ARTICLE) && contentType === "technical") {
  offer("Want a TLDR of this article?");
}
```

### Method 4: Time-Based Prediction
```javascript
if (isTime(USUAL_STANDUP) && !userHasOpened(STANDUP_TOOL)) {
  offer("Standup en 5 min - abro Zoom?");
}
```

---

## IV. Principios de Buena Proactividad

### Principio 1: Señalizar Explícitamente
```
✅ "Detectamos que guardás artículos tech. ¿Guardar este?"
❌ "Haz click aquí"
```

### Principio 2: Reversibilidad Total
- Rechazar debe ser instantáneo y sin costo
- Sin consecuencias
- Logging silent

### Principio 3: Respeto a Preferencias
```javascript
if (userHasExplicitlyOptedOut(OFFER_TYPE)) {
  return; // Nunca volver a ofrecer
}
```

### Principio 4: Proporcionalidad
- Max 10% del presupuesto de contexto

### Principio 5: Timeout Automático
```javascript
setTimeout(() => {
  dismissOffer(); // Auto-dismiss si no actúa
}, OFFER_TIMEOUT_MS);
```

---

## V. Scoring de Impacto

```javascript
function scoreProactiveOffer(offer) {
  return (offer.estimatedValue * 40) +
         (offer.confidence * 30) +
         (-offer.uiCost * 20) +
         (offer.userPrefAlignment * 10);
}

if (scoreProactiveOffer(offer) > THRESHOLD) {
  showOffer(offer);
}
```

---

## VI. Learning from Rejections

```javascript
async function processRejection(offer, reason) {
  if (reason === "not_interested") {
    await decreaseLikelihoodOfSimilarOffers();
  }
  if (reason === "already_did_it") {
    await updateKnowledge("user_already_has_X");
  }
  if (reason === "bad_timing") {
    await learnTimingPattern();
  }
}
```

---

## VII. Proactivity en Crisis

```javascript
if (detectSecurityCrisis()) {
  showBanner({
    title: "IMMEDIATE ACTION REQUIRED",
    message: "Detected credential theft attempt.",
    canTimeout: false  // No auto-dismiss
  });
}
```

---

## VIII. Constitutional Safeguards

```
✅ PERMITIDO:
  • Oferta que usuario puede rechazar en 1 click
  • Oferta que muestra reasoning

⚠️ ESCALACIÓN REQUERIDA:
  • Oferta que toca datos sensibles
  • Oferta que cambia comportamiento

✗ PROHIBIDO (PETREA):
  • Dark patterns (make undesirable hard)
  • Manipulación psicológica
  • Oferta que persiste tras 5+ rejections
```

---

*Art. 3ter (Proactividad), Art. 3.2 (Puente epistémico), Art. 19quater (Experiencia)*
