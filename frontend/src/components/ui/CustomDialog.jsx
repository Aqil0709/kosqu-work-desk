import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/* Usage (imperative, works from anywhere):
 *   import { dialog } from '../components/ui/CustomDialog';
 *   await dialog.alert('Something went wrong');
 *   const ok = await dialog.confirm('Delete this item?');
 *   const ok = await dialog.danger('This will permanently delete it');
 */

let _resolve = null;

const DEFAULT_STATE = { open: false, type: 'alert', title: '', message: '' };

export function CustomDialogMount() {
  const [state, setState] = useState(DEFAULT_STATE);

  useEffect(() => {
    window.__customDialogState   = state;
    window.__customDialogSetState = setState;
    return () => { window.__customDialogSetState = null; };
  }, [state]);

  return state.open
    ? createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) _close(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            animation: 'cdFadeIn .15s ease',
          }}
        >
          <div style={{
            background: 'var(--card-bg,#fff)', borderRadius: 14, width: 400, maxWidth: '90vw',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)', padding: '28px 28px 24px',
            border: '1px solid var(--card-border,#e5e7eb)',
            animation: 'cdSlideIn .15s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: state.type === 'confirm' ? 'rgba(245,158,11,0.12)' : state.type === 'danger' ? 'rgba(220,38,38,0.12)' : 'rgba(37,99,235,0.12)',
                fontSize: 18,
              }}>
                {state.type === 'confirm' ? '⚠️' : state.type === 'danger' ? '🗑️' : 'ℹ️'}
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--theme-text,#1e293b)' }}>
                  {state.title || (state.type === 'confirm' || state.type === 'danger' ? 'Confirm' : 'Notice')}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--theme-text-muted,#64748b)', lineHeight: 1.5 }}>
                  {state.message}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {(state.type === 'confirm' || state.type === 'danger') && (
                <button
                  onClick={() => _close(false)}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: '1.5px solid var(--card-border,#e5e7eb)',
                    background: 'transparent', fontSize: 13, fontWeight: 600,
                    color: 'var(--theme-text-muted,#64748b)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => _close(true)}
                style={{
                  padding: '8px 22px', borderRadius: 8, border: 'none',
                  background: state.type === 'danger' ? '#ef4444' : 'var(--color-primary,#6366f1)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {state.type === 'danger' ? 'Delete' : 'OK'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes cdFadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes cdSlideIn { from { opacity:0;transform:scale(.95) translateY(-8px) } to { opacity:1;transform:scale(1) translateY(0) } }
          `}</style>
        </div>,
        document.body
      )
    : null;
}

function _close(result) {
  if (window.__customDialogSetState) {
    window.__customDialogState = DEFAULT_STATE;
    window.__customDialogSetState({ ...DEFAULT_STATE });
  }
  if (_resolve) { _resolve(result); _resolve = null; }
}

function _open(type, message, title = '') {
  return new Promise((res) => {
    _resolve = res;
    const next = { open: true, type, message, title };
    window.__customDialogState = next;
    if (window.__customDialogSetState) window.__customDialogSetState({ ...next });
    else {
      // Fallback when provider not mounted yet
      if (type === 'alert') { res(true); }
      else res(window.confirm(message));
    }
  });
}

export const dialog = {
  alert:   (message, title)  => _open('alert',   message, title),
  confirm: (message, title)  => _open('confirm',  message, title),
  danger:  (message, title)  => _open('danger',   message, title),
};
