# PROACTIVITY_ENGINE.md — Anticipación Inteligente & Ofertas Proactivas
> **Cómo Lemon Browser detecta vacíos epistémicos y extiende puentes antes de ser solicitado**
> Art. 3ter (Proactividad), Art. 3.2 (Puente epistémico), Art. 19quater (Experiencia), §32bis (Políticas declarativas)

---

## Prefacio: Pasividad es Negligencia

Un navegador que espera que el usuario PIDA ayuda comete negligencia. Si puede ver que el usuario necesita algo (basándose en contexto, patrón, historia), **no ofrecer esa ayuda es una elección de inacción**, no de respeto.

La proactividad es el puente epistémico materializado: Ayatana ve qué el usuario necesita; Lemon lo percibe; ambos ofrecen el camino antes de que el usuario lo pida.

---

## I. Anatomía de una Oferta Proactiva

### Componentes Mínimos

```
Oferta proactiva = Detección + Reasoning + Ofrecimiento + Reversibilidad

Detección:     ¿Qué sintoma del problema?
Reasoning:     ¿Por qué creo que hay un problema?
Ofrecimiento:  ¿Cómo presento la solución?
Reversibilidad: ¿Puede el usuario rechazar sin fricción?
```

### Ejemplo Completo

```
USER: Abre Gmail con 200+ unread emails
      Clicks múltiples mensajes, lee subject lines rápidamente

Lemon DETECTS:
  - Email app (CDP observa origin + DOM structure)
  - Unread count > 100 (reads DOM element)
  - Focused scroll pattern (rapid clicks) → indiador de info overload
  - User hasn't cleared inbox in weeks (historical data)

Ayatana REASONS:
  - KG: "Este usuario usually respeta inbox; no tiene filter for newsletters"
  - Pattern: "Usuario frustrado (rapid clicking) pero intentando triage"
  - Inference: "Usuario podría beneficiar de smart label/filter"

Lemon OFFERS:
  [Card que aparece en esquina inferior right, no obstructivo]
  "Detectamos 50+ newsletters sin leer.
   ¿Querés crear filter 'Newsletters' para futuros?"
  
  [Dos botones grandes]
  "Yes, create filter" | "Dismiss"
  
  [Dismiss-and-hide option]
  "Don't show again" ("No me molestes con esto")

USER REJECTS (clicks "Dismiss"):
  - Offer desaparece
  - Reject registrado en audit trail
  - Ayatana: "Usuario prefiere lidiar manualmente"
  - Para Lemon: "Si usuario rechaza 3+ veces este tipo de oferta,
                 desactiva proactividad tipo-newsletter esta sesión"

USER ACCEPTS:
  - Filter creado
  - Lemon: "Monitoreando para validar que ayudó"
  - Ayatana: "+1 trust score para Lemon"
```

---

## II. Categorías de Proactividad

### 2a. Seguridad Proactiva

```javascript
// CATEGORIA: SECURITY
// Nivel: Always on, nunca puede ser desactivado

if (detectPhishing()) {
  // No pedir permiso para warning
  // Mostrar banner: "Sitio suspected phishing (90% confidence)"
  // Pero permitir user override: "I trust this site"
  
  // Nunca blocquear, pero advertir
  // Nunca silencioso
}
```

### 2b. Productividad Proactiva

```javascript
// CATEGORIA: PRODUCTIVITY
// Nivel: Activeable en settings, rechazable por sesión

if (userShows(PATTERN_CONTEXT_SWITCH)) {
  // Ejemplo: User cambia entre 5 tabs muy rápido
  // Inference: puede estar buscando algo
  
  offer("Searching for something? I can help summarize", {
    action: "summarize-tabs",
    timeout: 10000  // 10 sec timeout antes de auto-dismiss
  });
}
```

### 2c. Comfort Proactiva

```javascript
// CATEGORIA: COMFORT
// Nivel: Configurable, y user puede deshabilitar globally

if (userSitsBrowsingLate(NIGHT_HOUR_THRESHOLD)) {
  // Bedroom mode: colores warm, reduced brightness
  offer("It's late. Enable bedtime mode?", {
    dismissAction: "Remind me tomorrow",
    acceptAction: "Enable"
  });
}
```

### 2d. Learning Proactiva

```javascript
// CATEGORIA: LEARNING
// Nivel: Only if user has enabled "smart suggestions"

if (userVisits(EDUCATIONAL_CONTENT) && neverUsedFeatureX) {
  // User leyendo sobre Docker pero nunca usó DevTools
  offer("Pro tip: DevTools can help you inspect Docker networking", {
    action: "show-devtools-tutorial"
  });
}
```

---

## III. Detección de Vacíos Epistémicos (El Core del Puente)

Lemon detecta qué el usuario NO SABE que necesita vía:

### Detection Method 1: Pattern Mismatch

```javascript
async function detectPatternMismatch() {
  const userHistory = getUserBrowsingHistory();
  const currentContext = getCurrentSession();
  
  // Ejemplo: User siempre abre YouTube → Music después
  const pattern = userHistory.discoverPattern("YouTube → Music");
  const patternRegularity = 0.92;  // 92% de veces
  
  if (!currentContext.has("Music") && patternRegularity > 0.8) {
    // El usuario probablemente QUIERE Music pero no la pidió
    offer("Abro Spotify como de costumbre?", {
      action: "open-music-app"
    });
  }
}
```

### Detection Method 2: Error Prevention

```javascript
async function detectPotentialError() {
  // User está a punto de hacer algo que data indica que NO quiere
  
  if (userIsAboutToSubmit(FORM) && fieldX: "") {
    // Campo crítico vacío; usuarioUser nunca deja esto blank
    // (histórico validation!)
    
    offer("¿Falta email? Siempre lo incluís", {
      action: "highlight-field",
      canIgnore: true
    });
  }
}
```

### Detection Method 3: Skill Application

```javascript
async function detectSkillApplicability() {
  // User está en contexto donde una skill podría ayudarlo
  
  if (userIsReadingLongForm(ARTICLE) && contentType: "technical") {
    // Lemon tiene skill: "markdown-summarizer"
    offer("Want a TLDR of this article?", {
      action: "summarize-article",
      canIgnore: true
    });
  }
}
```

### Detection Method 4: Time-Based Prediction

```javascript
async function detectTimingPattern() {
  // User siempre hace X acción a la misma hora
  
  if (isTime(USUAL_STANDUP_TIME) && !userHasOpened(STANDUP_TOOL)) {
    // Standup en 5 min; user nunca late
    offer("Standup en 5 min - abro Zoom?", {
      action: "open-standup",
      dismissTiming: "Remind in 2 min",
      canIgnore: true
    });
  }
}
```

---

## IV. Principios de Buena Proactividad (Anti-Dark Patterns)

### Principio 1: Señalizar Explícitamente

Toda oferta proactiva declara **POR QUÉ** se hace:

```
❌ BAD:
  "Haz click aquí"

✅ GOOD:
  "Detectamos que historicamente guardas artículos de tech.
   Ese es uno. ¿Querés guardarlo?"
```

### Principio 2: Reversibilidad Total

Rechazar una oferta proactiva debe ser instantáneo y sin costo:

```
✅ GOOD:
  User clicks "Dismiss"
  → Offer desaparece inmediatamente
  → Sin consecuencias
  → Logging silent
  
❌ BAD:
  Require user to explain why they reject
  Make it harder to dismiss than accept
```

### Principio 3: Respeto a Preferencias Explícitas

User dice "No me molestes con X" → Lemon respeta 100%:

```javascript
if (userHasExplicitlyOptedOut(OFFER_TYPE)) {
  // NUNCA volver a ofrecer, hasta que user opt-back-in
  return; // Skip
}
```

### Principio 4: Proporcionality

Oferta proactiva no puede consumir >10% del presupuesto de contexto:

```javascript
const PROACTIVITY_BUDGET = 0.10;  // 10% max
const contextTokensUsed = currentOffer.tokens;

if (contextTokensUsed / totalContextBudget > PROACTIVITY_BUDGET) {
  // Too expensive; skip this proactive offer
  return;
}
```

### Principio 5: Timeout Automático

Toda oferta proactiva desaparece sin acción del usuario:

```javascript
setTimeout(() => {
  // Auto-dismiss después de timeout
  // No fue lo bastante importante para que user acted
  dismissOffer();
}, OFFER_TIMEOUT_MS);
```

---

## V. Scoring del Impacto: ¿Esta Proactividad Vale?

Ayatana + Lemon deben estimar si vale hacer una oferta:

```javascript
function scoreProactiveOffer(offer) {
  // Score(0-100) que determina si hacer la oferta
  
  const score =
    // Beneficio estimado al usuario
    (offer.estimatedValue * 40) +
    
    // Confidence en que user QUIERE esto
    (offer.confidence * 30) +
    
    // Costo en UX (tokens, popup, etc)
    (-offer.uiCost * 20) +
    
    // Alignment con user preferences
    (offer.userPrefAlignmentScore * 10);
  
  return score;
}

if (scoreProactiveOffer(offer) > THRESHOLD) {
  // Make the offer
  showOffer(offer);
} else {
  // Skip; not worth it
  return;
}
```

---

## VI. Learning from Rejections

Cada rechazo de usuario alimenta inteligencia futura:

```javascript
async function processRejection(offer, rejectionReason) {
  // Categorize rejection
  if (rejectionReason === "not_interested") {
    // User doesn't want this type of offer
    await decreaseLikelihoodOfSimilarOffers();
  }
  
  if (rejectionReason === "already_did_it") {
    // Lemon didn't know user ya lo hizo
    await updateKnowledge("user_already_has_X");
  }
  
  if (rejectionReason === "bad_timing") {
    // Lemon ofreció en momento no-oportuno
    await learnTimingPattern();
  }
  
  // Trust score impacts
  if (offer.wasBadOffer) {
    // Lemon hizo mala inferencia
    await decreaseTrustInLemonProactivity(0.01);
  }
}
```

---

## VII. Proactivity in Crisis (§3ter.1 Edge Case)

Cuando la situación es crítica, proactividad se vuelve más agresiva:

```javascript
if (detectSecurityCrisis()) {
  // En crisis, NO wait para user action
  // Ofrecimiento se vuelve recomendación más fuerte
  
  showBanner({
    title: "IMMEDIATE ACTION REQUIRED",
    message: "Detected credential theft attempt.",
    actions: [
      { label: "Change password NOW", isPrimary: true },
      { label: "Review account activity", isSecondary: true },
      { label: "Ignore (not recommended)", isDangerous: true }
    ],
    canTimeout: false  // No auto-dismiss en crisis
  });
}
```

---

## VIII. Dashboard: Proactivity Metrics

User puede ver qué está pasando:

```
🧠 PROACTIVITY DASHBOARD
─────────────────────────
Proactivity enabled: Yes ✓
Level: Medium (can change)

This week:
  • Offers made: 7
  • Accepted: 5 (71%)
  • Rejected: 2
  • Security alerts: 1 (non-negotiable)

Most useful offers:
  ✓ Article summarization (saved 15 min)
  ✓ Password manager reminder (saved 2 min)

Least useful offers:
  ✗ "Did you know about tabs?" (dismissed)

Feedback:
  "Good job on the security warning"
  "Please don't suggest extensions so often"

Reset preferences at any time.
```

---

## IX. Constitutional Safeguards

Proactividad sin restricción = manipulation. Restricciones pétreas:

```
✅ PERMITIDO:
  • Oferta que usuario puede rechazar en 1 click
  • Oferta que muestra reasoning
  • Oferta que respeta opt-out

⚠️ ESCALACIÓN REQUERIDA:
  • Oferta que toca datos sensibles
  • Oferta que cambia comportamiento del navegador
  • Oferta que requiere nueva permisos

✗ PROHIBIDO (§1bis.4):
  • Dark pattern (make undesirable option hard)
  • Manipulación psicológica (exploit vulnerabilities)
  • Oferta que persiste después de 5+ rejections
```

---

*Art. 3ter (Proactividad), Art. 3.2 (Puente epistémico), Art. 19quater (Experiencia), §1bis.4 (Prohibiciones pétreas)*
