import { useState, useEffect } from 'react';

/**
 * Shows an "Install App" banner when the browser fires the beforeinstallprompt event.
 * On iOS (Safari) it shows manual instructions since iOS doesn't support the event.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('pwa_install_dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 3s
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!showBanner || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'linear-gradient(135deg, #1E293B, #0F172A)',
      borderTop: '1px solid #334155',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
    }}>
      <img src="/icon-72.png" alt="HRMS" style={{ width: 48, height: 48, borderRadius: 10 }} />

      <div style={{ flex: 1 }}>
        <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>
          HRMS App Install Karo
        </div>
        {isIOS ? (
          <div style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>
            Safari mein <strong style={{ color: '#60A5FA' }}>Share</strong> button tap karo → <strong style={{ color: '#60A5FA' }}>Add to Home Screen</strong>
          </div>
        ) : (
          <div style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>
            Home screen pe add karo — bilkul app jaisa experience
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {!isIOS && (
          <button
            onClick={handleInstall}
            style={{
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: '#64748B',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
