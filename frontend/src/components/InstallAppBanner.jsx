import React, { useState, useEffect } from 'react';

/**
 * Premium PWA & Mobile App Installation Banner.
 * Captures `beforeinstallprompt` event and prompts users to install Sagra Umbra to their home screen.
 */
export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (isDismissed) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (iosDevice && !isStandalone) {
      setIsIOS(true);
      setShowBanner(true);
    }

    // Android / Chrome PWA install prompt handler
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('Utente ha installato l\'app Sagra Umbra');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '76px', // Above bottom navigation bar on mobile
      left: '16px',
      right: '16px',
      zIndex: 9999,
      backgroundColor: 'var(--color-bg-card, #FFFFFF)',
      color: 'var(--color-text-main, #1E2320)',
      borderRadius: '16px',
      padding: '16px',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0,0,0,0.08)',
      border: '1px solid var(--color-border, #E2E8F0)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        backgroundColor: '#2A4B3C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <span className="material-symbols-rounded" style={{ color: '#FFFFFF', fontSize: '26px' }}>
          smartphone
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--color-text-main, #1E2320)',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Installa Sagra Umbra
        </h4>
        <p style={{
          margin: '2px 0 0 0',
          fontSize: '12px',
          color: 'var(--color-text-muted, #5C6661)',
          lineHeight: '1.3'
        }}>
          {isIOS 
            ? 'Tocca "Condividi" e seleziona "Aggiungi a Home"'
            : 'Accedi rapidamente alle sagre anche offline!'}
        </p>
      </div>

      {!isIOS && deferredPrompt && (
        <button
          onClick={handleInstallClick}
          style={{
            backgroundColor: '#2A4B3C',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(42, 75, 60, 0.3)',
            flexShrink: 0
          }}
        >
          Installa
        </button>
      )}

      <button
        onClick={handleDismiss}
        aria-label="Chiudi"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted, #5C6661)',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
      </button>
    </div>
  );
}
