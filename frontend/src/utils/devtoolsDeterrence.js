/**
 * DevTools Deterrence — UX layer only. NOT a security measure.
 * Activated only in production builds (import.meta.env.PROD).
 * Does NOT affect localhost development.
 * Does NOT protect any data — backend APIs remain the real security boundary.
 */

export function initDevToolsDeterrence() {
  // Only run in production
  if (!import.meta.env.PROD) return;

  // ── Warning Modal ──────────────────────────────────────────────────────────
  function showWarningModal() {
    if (document.getElementById('__dt-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = '__dt-modal';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(0,0,0,0.85)', 'display:flex',
      'align-items:center', 'justify-content:center',
      'font-family:system-ui,sans-serif',
    ].join(';');

    overlay.innerHTML = `
      <div style="background:#1e1e2e;border:1px solid #ef4444;border-radius:12px;padding:40px;max-width:420px;text-align:center;color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.8)">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <h2 style="color:#ef4444;margin:0 0 12px;font-size:20px;font-weight:700">Access Restricted</h2>
        <p style="color:#94a3b8;margin:0 0 24px;line-height:1.6;font-size:14px">
          Developer tools are disabled in this environment.<br>
          Unauthorized inspection of this application is not permitted.
        </p>
        <button id="__dt-dismiss" style="background:#ef4444;color:#fff;border:none;padding:10px 28px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;letter-spacing:0.5px">
          Dismiss
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('__dt-dismiss')?.addEventListener('click', () => overlay.remove());
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;

    // F12
    if (key === 'F12') { e.preventDefault(); showWarningModal(); return; }

    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (ctrl && e.shiftKey && ['I','i','J','j','C','c'].includes(key)) {
      e.preventDefault(); showWarningModal(); return;
    }

    // Ctrl+U (view source)
    if (ctrl && ['U','u'].includes(key)) { e.preventDefault(); return; }

    // Ctrl+S (save page)
    if (ctrl && ['S','s'].includes(key)) { e.preventDefault(); return; }
  }, true);

  // ── Right-click context menu ───────────────────────────────────────────────
  document.addEventListener('contextmenu', (e) => { e.preventDefault(); }, true);

  // ── DevTools open detection (size heuristic) ───────────────────────────────
  const THRESHOLD = 160;
  let devtoolsOpen = false;

  function checkDevTools() {
    const widthDiff  = window.outerWidth  - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const isOpen = widthDiff > THRESHOLD || heightDiff > THRESHOLD;

    if (isOpen && !devtoolsOpen) {
      devtoolsOpen = true;
      showWarningModal();
    } else if (!isOpen && devtoolsOpen) {
      devtoolsOpen = false;
      document.getElementById('__dt-modal')?.remove();
    }
  }

  setInterval(checkDevTools, 1000);

  // ── Console warning message (intentional — not stripped) ──────────────────
  const warn = Function.prototype.bind.call(console.warn, console);
  setTimeout(() => {
    warn('%cStop! ', 'color:#ef4444;font-size:32px;font-weight:bold;');
    warn('%cThis browser feature is for developers only. If someone told you to copy-paste something here, it is a scam.', 'color:#94a3b8;font-size:14px;');
  }, 100);
}
