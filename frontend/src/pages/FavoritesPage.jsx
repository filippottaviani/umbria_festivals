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
            <div className="page-hero-banner">
                <div className="page-hero-inner">
                    <div className="page-hero-badge" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#EF4444' }}>favorite</span>
                        I Miei Preferiti (Offline)
                    </div>
                    <h1>La tua Raccolta Personale</h1>
                    <p>
                        I tuoi eventi salvati per consultare date, luoghi e menù anche senza connessione internet.
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
                                    fontFamily: 'inherit',
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
                                    fontFamily: 'inherit',
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
                    <div className="empty-state-bento">
                        <div className="empty-state-icon-wrap" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 32 }}>favorite_border</span>
                        </div>
                        <h2>Nessuna sagra salvata nei preferiti</h2>
                        <p>
                            Tocca l'icona del cuore sulle schede degli eventi per salvarli qui e ritrovarli rapidamente anche offline.
                        </p>
                        <Link
                            to="/"
                            className="empty-state-reset-btn"
                            style={{ textDecoration: 'none' }}
                        >
                            <span className="material-symbols-rounded">search</span>
                            Esplora le sagre dell'Umbria
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
                                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--antracite-2)' }}>history</span>
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
        <Link to={`/festival/${f.id}`} className="festival-card">
            <div className="festival-card-img" style={{ position: 'relative' }}>
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
                        top: '10px',
                        right: '10px',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#EF4444',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        zIndex: 3,
                        transition: 'transform 0.15s ease'
                    }}
                >
                    <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                        favorite
                    </span>
                </button>
                {ongoing && <span className="card-badge">Oggi</span>}
                {past && (
                    <span className="card-badge" style={{ background: 'var(--antracite-3)', color: '#fff' }}>
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
    );
}
