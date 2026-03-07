/**
 * LEMON BROWSER — Redimensionado de Ventana (Renderer)
 * =====================================================
 * Maneja el redimensionado custom para ventanas frameless + transparent,
 * que no tienen bordes nativos de resize en Windows.
 * Usa divs invisibles en los bordes de la ventana con pointer capture.
 */

let resizing = false;

export function setupResize() {
  const handles = document.querySelectorAll('.resize-handle');
  handles.forEach(handle => {
    handle.addEventListener('pointerdown', onResizeStart);
  });
}

function onResizeStart(e) {
  // No resize when maximized
  if (document.body.classList.contains('is-maximized')) return;

  const edge = e.currentTarget.dataset.edge;
  if (!edge) return;

  e.preventDefault();
  e.stopPropagation();
  resizing = true;

  const handle = e.currentTarget;
  handle.setPointerCapture(e.pointerId);

  window.electronAPI.windowResizeStart({
    edge,
    screenX: e.screenX,
    screenY: e.screenY
  });

  const onMove = (ev) => {
    if (!resizing) return;
    window.electronAPI.windowResizeMove({
      screenX: ev.screenX,
      screenY: ev.screenY
    });
  };

  const onUp = (ev) => {
    if (!resizing) return;
    resizing = false;
    handle.releasePointerCapture(ev.pointerId);
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
    window.electronAPI.windowResizeEnd();
  };

  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
}
