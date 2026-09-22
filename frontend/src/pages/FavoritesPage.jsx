import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import ForkRating from '../components/ForkRating';
import { useFavorites } from '../services/favorites';
import { fetchFestivals, getImageUrl } from '../services/api';
import { TOWN_FALLBACKS, fmtDate, isOngoing, isPast } from '../constants';

export default function FavoritesPage() {
    const { favorites, toggleFavorite, clearFavorites } = useFavorites();
    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let live = true;
        (async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals('');
                if (live) setAllFestivals(Array.isArray(data) ? data : []);
            } catch {
                if (live) setAllFestivals([]);
            } finally {
                if (live) setIsLoading(false);
            }
        })();
        return () => { live = false; };
    }, []);

    const favoriteFestivals = useMemo(
        () => allFestivals.filter(f => favorites.includes(String(f.id))),
        [allFestivals, favorites]
    );
    const ongoingFavorites = useMemo(() => favoriteFestivals.filter(isOngoing), [favoriteFestivals]);
    const upcomingFavorites = useMemo(() => favoriteFestivals.filter(f => !isOngoing(f) && !isPast(f)), [favoriteFestivals]);
    const pastFavorites = useMemo(() => favoriteFestivals.filter(isPast), [favoriteFestivals]);

    const handleExportAllToIcs = () => {
        if (favoriteFestivals.length === 0) return;

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Sagra Umbra//I Miei Preferiti//IT',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        favoriteFestivals.forEach(f => {
            const startClean = (f.start_date || '').replace(/-/g, '');
            const endClean = (f.end_date || f.start_date || '').replace(/-/g, '');
            const uid = `fav-${f.id}@sagraumbra.it`;
            const summary = f.name;
            const location = `${f.city} (${f.province}), Umbria`;
            const description = `${f.description || ''}\\nMenù: ${f.menu_info || 'Tipico umbro'}\\nInfo: https://sagraumbra.it/festival/${f.id}`;

            icsContent.push('BEGIN:VEVENT');
            icsContent.push(`UID:${uid}`);
            icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
            icsContent.push(`DTSTART;VALUE=DATE:${startClean}`);
            icsContent.push(`DTEND;VALUE=DATE:${endClean}`);
            icsContent.push(`SUMMARY:${summary}`);
            icsContent.push(`LOCATION:${location}`);
            icsContent.push(`DESCRIPTION:${description.replace(/\n/g, '\\n')}`);
            icsContent.push('END:VEVENT');
        });

        icsContent.push('END:VCALENDAR');
        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `sagre_preferite_umbria_${new Date().getFullYear()}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="app-shell animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
            <SEO
                title="I Miei Preferiti — Sagre e Feste dell'Umbria Salvate"
                description="Consulta la tua selezione offline di sagre ed eventi enogastronomici preferiti nei borghi dell'Umbria. Esporta il calendario ed organizza il tuo tour."
                canonical="https://sagraumbra.it/preferiti"
                robots="noindex, follow"
            />

            <Navbar showSearch={false} />

            {/* Header Banner */}
            <div style={{ background: 'linear-gradient(135deg, #1C3328 0%, #2A4B3C 100%)', color: '#fff', padding: '2.75rem 1.25rem 2.25rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#FCA5A5' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#EF4444' }}>favorite</span>
                        I Miei Preferiti (Offline)
                    </div>
                    <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'serif' }}>
                        La tua Raccolta Personale
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', margin: '0 auto 1.5rem', maxWidth: '620px', lineHeight: '1.6' }}>
                        Tutte le sagre che hai salvato per non perdere neanche una serata di sapori, musica e tradizioni nei borghi umbri.
                    </p>

                    {favoriteFestivals.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={handleExportAllToIcs}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '10px',
                                    background: '#D97706',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
                                }}
                            >
                                <span className="material-symbols-rounded">calendar_month</span>
                                Esporta Tutto in Calendario (.ics)
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Vuoi rimuovere tutte le sagre dai tuoi preferiti?')) {
                                        clearFavorites();
                                    }
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.15)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    fontWeight: 600,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <span className="material-symbols-rounded">delete_sweep</span>
                                Svuota Lista
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <main style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '2rem 1rem 5rem', flex: 1 }}>
                {isLoading ? (
                    <div className="status-container"><div className="spinner" /></div>
                ) : favoriteFestivals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'var(--travertino-2, #f5f4ef)', borderRadius: '16px', border: '1px solid var(--border-subtle, #e2e8f0)', maxWidth: '580px', margin: '2rem auto' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 36, color: '#EF4444' }}>favorite_border</span>
                        </div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--antracite, #1e2320)' }}>
                            Nessuna sagra salvata nei preferiti
                        </h2>
                        <p style={{ color: 'var(--antracite-2, #5c6661)', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 1.75rem' }}>
                            Quando trovi una sagra che ti ispira, tocca l'icona del cuore sulla scheda o nei dettagli per salvarla qui e consultarla anche offline.
                        </p>
                        <Link
                            to="/"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.8rem 1.75rem',
                                background: 'var(--cypress, #2A4B3C)',
                                color: '#ffffff',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                boxShadow: '0 4px 12px rgba(42,75,60,0.25)'
                            }}
                        >
                            <span className="material-symbols-rounded">search</span>
                            Esplora le Sagre dell'Umbria
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* IN CORSO */}
                        {ongoingFavorites.length > 0 && (
                            <section style={{ marginBottom: '2.5rem' }}>
                                <div className="section-label" style={{ marginBottom: '1rem' }}>
                                    <div className="section-label-text">
                                        <span className="live-dot" />
                                        In corso adesso ({ongoingFavorites.length})
                                    </div>
                                </div>
                                <div className="festival-grid">
                                    {ongoingFavorites.map(f => (
                                        <FavoriteCard key={f.id} festival={f} onRemove={() => toggleFavorite(f.id)} isOngoing />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* PROSSIMI */}
                        {upcomingFavorites.length > 0 && (
                            <section style={{ marginBottom: '2.5rem' }}>
                                <div className="section-label" style={{ marginBottom: '1rem' }}>
                                    <div className="section-label-text">
                                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--cypress, #2A4B3C)' }}>event</span>
                                        Prossimi appuntamenti salvati ({upcomingFavorites.length})
                                    </div>
                                </div>
                                <div className="festival-grid">
                                    {upcomingFavorites.map(f => (
                                        <FavoriteCard key={f.id} festival={f} onRemove={() => toggleFavorite(f.id)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* CONCLUSE */}
                        {pastFavorites.length > 0 && (
                            <section style={{ marginBottom: '2.5rem' }}>
                                <div className="section-label" style={{ marginBottom: '1rem' }}>
                                    <div className="section-label-text">
                                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#78350F' }}>history</span>
                                        Edizioni concluse ({pastFavorites.length})
                                    </div>
                                </div>
                                <div className="festival-grid">
                                    {pastFavorites.map(f => (
                                        <FavoriteCard key={f.id} festival={f} onRemove={() => toggleFavorite(f.id)} isPast />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}

function FavoriteCard({ festival: f, onRemove, isOngoing: ongoing, isPast: past }) {
    const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
    const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

    return (
        <div className="festival-card" style={{ position: 'relative' }}>
            <Link to={`/festival/${f.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="festival-card-img">
                    <img
                        src={imgSrc}
                        alt={`Sagra ${f.name} a ${f.city}`}
                        loading="lazy"
                        onError={(e) => {
                            if (e.target.src !== fallbackPhoto) {
                                e.target.src = fallbackPhoto;
                            }
                        }}
                    />
                    {ongoing && <span className="card-badge">Oggi</span>}
                    {past && (
                        <span className="card-badge" style={{ background: 'var(--antracite-3, #64748b)', color: '#fff' }}>
                            Conclusa
                        </span>
                    )}
                    {f.average_rating && (
                        <div className="card-rating-badge">
                            <ForkRating rating={f.average_rating} size={14} activeColor="#F59E0B" />
                            <span className="card-rating-num">{f.average_rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <div className="festival-card-content">
                    <h3>{f.name}</h3>
                    <p className="festival-location">
                        <span className="material-symbols-rounded">location_on</span>
                        {f.city} ({f.province})
                    </p>
                    <p className="festival-dates">
                        <span className="material-symbols-rounded">calendar_today</span>
                        <span>{fmtDate(f.start_date)} – {fmtDate(f.end_date)}</span>
                    </p>
                </div>
            </Link>

            {/* Remove from Favorites button */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                title="Rimuovi dai preferiti"
                aria-label="Rimuovi dai preferiti"
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#EF4444',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.15s ease'
                }}
            >
                <span className="material-symbols-rounded" style={{ fontSize: 20 }}>delete</span>
            </button>
        </div>
    );
}
