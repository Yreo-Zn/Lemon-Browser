/**
 * LEMON BROWSER — Constitutional Violation Notifications (Renderer)
 * ==================================================================
 * Toast notification system for Petrea violations and security events.
 */

let container = null;

const SEVERITY_STYLES = {
  CRITICAL: { icon: '\u26a0', color: '#ff4444', label: 'Crítico' },
  WARNING:  { icon: '\u25ce', color: '#ffaa00', label: 'Advertencia' },
  INFO:     { icon: '\u25cb', color: 'var(--accent-color, #6496ff)', label: 'Info' },
};

export function setupNotifications() {
  // Create toast container
  container = document.createElement('div');
  container.id = 'lemon-toast-container';
  document.body.appendChild(container);

  // Listen for constitutional violations from main process
  window.electronAPI.onConstitutionViolation((violation) => {
    showToast(violation);
  });
}

export function showToast(violation) {
  if (!container) return;

  const style = SEVERITY_STYLES[violation.severity] || SEVERITY_STYLES.INFO;

  const toast = document.createElement('div');
  toast.className = `lemon-toast severity-${(violation.severity || 'INFO').toLowerCase()}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = style.icon;

  const body = document.createElement('div');
  body.className = 'toast-body';

  const title = document.createElement('div');
  title.className = 'toast-title';
  title.textContent = violation.petrea
    ? `${style.label} \u00b7 ${violation.petrea}`
    : style.label;

  const msg = document.createElement('div');
  msg.className = 'toast-message';
  msg.textContent = violation.message;

  body.appendChild(title);
  body.appendChild(msg);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.onclick = () => dismissToast(toast);

  toast.appendChild(icon);
  toast.appendChild(body);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));

  // Auto-dismiss after 8s (critical stays 12s)
  const duration = violation.severity === 'CRITICAL' ? 12000 : 8000;
  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.add('hiding');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  // Fallback removal
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
}
