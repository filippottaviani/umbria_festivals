import React, { useState } from 'react';

const fmtDateShort = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '';

export default function ShareModal({ festival, onClose }) {
    const [copied, setCopied] = useState(false);

    if (!festival) return null;

    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://sagraumbra.it/festival/${festival.id}`;
    const datesStr = `${fmtDateShort(festival.start_date)} – ${fmtDateShort(festival.end_date)}`;
    
    // Rich message text customized for Umbrian food festival invitations
    const shareTitle = `🍷 Andiamo a ${festival.name} a ${festival.city}?`;
    const shareText = `Andiamo alla sagra "${festival.name}" a ${festival.city} (${festival.province})? Date: ${datesStr}. Guarda il menù tipico e il programma completo qui:`;
    const fullMessage = `${shareTitle}\n\n${shareText}\n${shareUrl}`;

    // Share URLs
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle + ' (' + datesStr + ')')}`;

    const handleCopy = async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                const input = document.createElement('input');
                input.value = shareUrl;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            setCopied(false);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${festival.name} — Sagra Umbra`,
                    text: shareText,
                    url: shareUrl
                });
                onClose();
            } catch (err) {
                // User dismissed or share error
            }
        }
    };

    const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    return (
        <div
            className="modal-overlay animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem'
            }}
        >
            <div
                className="modal-card animate-slide-up"
                style={{
                    background: 'var(--card-bg, #ffffff)',
                    color: 'var(--antracite, #1e2320)',
                    borderRadius: '16px',
                    maxWidth: '460px',
                    width: '100%',
                    padding: '1.5rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cypress, #2A4B3C)' }}>
                        <span className="material-symbols-rounded">share</span>
                        Condividi con gli amici
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Chiudi finestra di condivisione"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--antracite-3, #64748b)', padding: '4px', display: 'flex' }}
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div style={{ background: 'var(--travertino-2, #f5f4ef)', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.88rem', borderLeft: '3px solid var(--cypress, #2A4B3C)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--antracite, #1e2320)' }}>{festival.name}</div>
                    <div style={{ color: 'var(--antracite-2, #5c6661)', fontSize: '0.82rem', marginTop: '2px' }}>
                        📍 {festival.city} ({festival.province}) &bull; 📅 {datesStr}
                    </div>
                </div>

                {/* Social Share Buttons Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {/* WhatsApp */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-btn-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.8rem 1rem',
                            borderRadius: '10px',
                            background: '#25D366',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            boxShadow: '0 2px 6px rgba(37,211,102,0.25)',
                            transition: 'transform 0.15s ease'
                        }}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: 22 }}>chat</span>
                        WhatsApp
                    </a>

                    {/* Facebook */}
                    <a
                        href={facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-btn-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.8rem 1rem',
                            borderRadius: '10px',
                            background: '#1877F2',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            boxShadow: '0 2px 6px rgba(24,119,242,0.25)',
                            transition: 'transform 0.15s ease'
                        }}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: 22 }}>public</span>
                        Facebook
                    </a>

                    {/* Telegram */}
                    <a
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-btn-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.8rem 1rem',
                            borderRadius: '10px',
                            background: '#229ED9',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            boxShadow: '0 2px 6px rgba(34,158,217,0.25)',
                            transition: 'transform 0.15s ease'
                        }}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: 22 }}>send</span>
                        Telegram
                    </a>

                    {/* Native Web Share API (Instagram, Stories, AirDrop, etc.) */}
                    {supportsNativeShare && (
                        <button
                            type="button"
                            onClick={handleNativeShare}
                            className="share-btn-item"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                padding: '0.8rem 1rem',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                boxShadow: '0 2px 6px rgba(131,58,180,0.3)',
                                transition: 'transform 0.15s ease'
                            }}
                        >
                            <span className="material-symbols-rounded" style={{ fontSize: 22 }}>ios_share</span>
                            Altro / Storie
                        </button>
                    )}
                </div>

                {/* Copy Link Section */}
                <div style={{ marginTop: '0.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--antracite-2, #5c6661)', marginBottom: '0.35rem' }}>
                        Oppure copia il link diretto:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            style={{
                                flex: 1,
                                padding: '0.6rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                background: 'var(--travertino, #fafaf8)',
                                color: 'var(--antracite, #1e2320)',
                                fontSize: '0.82rem',
                                textOverflow: 'ellipsis'
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: copied ? '#059669' : 'var(--cypress, #2A4B3C)',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                                {copied ? 'check' : 'content_copy'}
                            </span>
                            {copied ? 'Copiato!' : 'Copia'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
