import React, { useEffect, useState, useMemo } from 'react';
import { CATS, CAT_ICONS, normalizeFestival, isOngoing, isPast, fmtDate, TOWN_FALLBACKS } from '../constants';
import { fetchFestivals, fetchNearbyFestivals, getImageUrl } from '../services/api';
import { Link } from 'react-router-dom';
import ForkRating from '../components/ForkRating';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { HERO_IMAGES } from '../heroImages';
import { useFavorites } from '../services/favorites';

const FAQ_ITEMS = [
    {
        q: "Quali sono le sagre più note dell'Umbria?",
        a: "Tra le manifestazioni storiche dell'Umbria ci sono la Sagra del Tartufo a Norcia e Pietralunga, la Sagra della Porchetta a Costano (Bastia Umbra), la Festa della Cipolla a Cannara, la Sagra della Patata Rossa a Colfiorito, e rievocazioni come il Mercato delle Gaite a Bevagna e la Quintana di Foligno."
    },
    {
        q: "Come verificare se una sagra è aperta oggi o nel fine settimana?",
        a: "Su Sagra Umbra puoi usare il filtro 'Oggi' per trovare gli stand attivi stasera. La sezione Calendario consente di selezionare singole date o il weekend (da venerdì a domenica) per organizzare le tue serate."
    },
    {
        q: "Quali piatti tipici si trovano agli stand gastronomici umbri?",
        a: "I menù delle sagre propongono specialità della tradizione locale: torta al testo cotta su pietra con prosciutto nostrano e salumi, strangozzi e umbricelli al tartufo o al ragù di cinghiale, gnocchi al sugo d'oca, carni alla brace e vini tipici tra cui Montefalco Sagrantino, Grechetto e Ciliegiolo."
    },
    {
        q: "Come segnalare una sagra o aggiornare il programma?",
        a: "Gli organizzatori, le Pro Loco e i visitatori possono cliccare su 'Segnala Sagra' nel menù per inviare date, locandina, menù e programma musicale. Le informazioni vengono verificate e pubblicate sul portale."
    }
];

const HOME_SCHEMAS = [
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://sagraumbra.it/#website",
        "name": "Sagra Umbra",
        "url": "https://sagraumbra.it/",
        "description": "Portale delle sagre, feste popolari e tradizioni enogastronomiche nei borghi dell'Umbria",
        "inLanguage": "it-IT",
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://sagraumbra.it/?search={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    },
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://sagraumbra.it/#organization",
        "name": "Sagra Umbra",
        "url": "https://sagraumbra.it/",
        "logo": "https://sagraumbra.it/icon.svg",
        "description": "Guida ufficiale e comunitaria alle sagre nei borghi medievali dell'Umbria",
        "areaServed": {
            "@type": "AdministrativeArea",
            "name": "Umbria, Italia"
        }
    },
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map(item => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a
            }
        }))
    }
];

const FILTER_DEFS = [
    { key: '__all__', label: 'Tutti', icon: 'apps' },
    ...Object.entries(CATS).map(([k, v]) => ({ key: k, label: v.label, icon: CAT_ICONS[k] || 'local_dining' })),
];

export default function Home() {
    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [search, setSearch]             = useState('');
    const [activeCat, setActiveCat]       = useState('__all__');
    const [dateFilter, setDateFilter]     = useState('all');
    const [bgImage] = useState(() => {
        if (Array.isArray(HERO_IMAGES) && HERO_IMAGES.length > 0) {
            const randomIndex = Math.floor(Math.random() * HERO_IMAGES.length);
            return HERO_IMAGES[randomIndex];
        }
        return '/hero_bg/DSCF4044.webp';
    });

    const [isLocating, setIsLocating]     = useState(false);
    const [gpsActive, setGpsActive]       = useState(false);

    useEffect(() => {
        let live = true;
        (async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals();
                if (live) setAllFestivals((Array.isArray(data) ? data : []).map(normalizeFestival));
            } catch { if (live) setAllFestivals([]); }
            finally  { if (live) setIsLoading(false); }
        })();
        return () => { live = false; };
    }, []);

    const handleGPSLocate = () => {
        if (!navigator.geolocation) {
            alert('Geolocalizzazione non supportata dal tuo browser');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const nearby = await fetchNearbyFestivals(latitude, longitude, 35);
                    setAllFestivals((Array.isArray(nearby) ? nearby : []).map(normalizeFestival));
                    setGpsActive(true);
                } catch {
                    alert('Impossibile trovare le sagre vicine al momento.');
                } finally {
                    setIsLocating(false);
                }
            },
            () => {
                alert('Permesso di geolocalizzazione negato.');
                setIsLocating(false);
            }
        );
    };

    const filtered = useMemo(() => {
        return allFestivals.filter((f) => {
            if (activeCat !== '__all__' && f.cat !== activeCat) return false;
            if (search) {
                const hay = `${f.name} ${f.city}`.toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            if (dateFilter === 'today') {
                return isOngoing(f);
            }
            if (dateFilter === 'weekend') {
                const start = new Date(f.start_date);
                const day = start.getDay();
                return isOngoing(f) || day === 0 || day === 5 || day === 6;
            }
            return true;
        });
    }, [allFestivals, activeCat, search, dateFilter]);

    const isRecentPast = (f) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const end = new Date(f.end_date); end.setHours(23,59,59,999);
        if (end >= today) return false;
        const diffDays = Math.floor((today - end) / (1000 * 60 * 60 * 24));
        return diffDays <= 14;
    };

    const ongoing      = useMemo(() => filtered.filter(isOngoing), [filtered]);
    const upcoming     = useMemo(() => filtered.filter(f => !isOngoing(f) && !isPast(f)), [filtered]);
    const recentPast   = useMemo(() => filtered.filter(isRecentPast), [filtered]);
    const totalFestivals = allFestivals.length;
    const ongoingTotal   = useMemo(() => allFestivals.filter(isOngoing).length, [allFestivals]);
    const archiveTotal   = useMemo(() => allFestivals.filter(isPast).length, [allFestivals]);

    return (
        <div className="app-shell animate-fade-in">
            <SEO
                title="Sagre & Feste dell'Umbria 2026 — Tradizioni nei Borghi"
                description="Guida ufficiale e comunitaria alle sagre e feste enogastronomiche nei borghi dell'Umbria: tartufo, porchetta, strangozzi, calendari, mappe e menù."
                schema={HOME_SCHEMAS}
            />

            <Navbar search={search} setSearch={setSearch} showSearch={true} />

            {/* ── HERO SECTION ── */}
            <div className="home-hero">
                {bgImage && (
                    <div
                        className="home-hero-bg"
                        style={{ backgroundImage: `url(${bgImage})` }}
                        aria-hidden="true"
                    />
                )}

                <div className="home-hero-overlay" aria-hidden="true"></div>
                <div className="home-hero-inner">
                    <h1>
                        Sagre &amp; Feste Popolari<br />
                        <em>dei Borghi dell'Umbria {new Date().getFullYear()}</em>
                    </h1>
                    <p>
                        Tutte le sagre, feste paesane e stand gastronomici nei borghi dell'Umbria. Date aggiornate, menù tipici e programmi delle serate.
                    </p>

                    {!isLoading && (
                        <div className="home-hero-stats">
                            <div className="hero-stat">
                                <span className="hero-stat-num">{totalFestivals}</span>
                                <span className="hero-stat-label">Sagre Totali</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-num">{ongoingTotal}</span>
                                <span className="hero-stat-label">In corso</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-num">92</span>
                                <span className="hero-stat-label">Comuni Umbri</span>
                            </div>
                        </div>
                    )}

                    {/* GPS CTA */}
                    <div className="home-cta-strip">
                        <button
                            type="button"
                            className={`gps-btn ${gpsActive ? 'active' : ''}`}
                            onClick={handleGPSLocate}
                            disabled={isLocating}
                            aria-label="Trova sagre vicine a me tramite GPS"
                        >
                            <span className="material-symbols-rounded">near_me</span>
                            {isLocating
                                ? 'Ricerca GPS...'
                                : gpsActive
                                    ? 'Vicine a te (GPS Attivo)'
                                    : 'Sagre vicine a me'}
                        </button>

                        {gpsActive && (
                            <button
                                type="button"
                                className="gps-reset-btn"
                                onClick={() => {
                                    setGpsActive(false);
                                    fetchFestivals().then(data => setAllFestivals((Array.isArray(data) ? data : []).map(normalizeFestival)));
                                }}
                                aria-label="Mostra tutte le sagre"
                            >
                                <span className="material-symbols-rounded">close</span>
                                Tutte le Sagre
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── FILTERS BAR (CATEGORIE) ── */}
            <div className="filters-container">
                <div className="filters-row" role="group" aria-label="Filtra per categoria">

                    {FILTER_DEFS.map(f => (
                        <button
                            key={f.key}
                            type="button"
                            className={`filter-btn ${activeCat === f.key ? 'active' : ''}`}
                            onClick={() => setActiveCat(f.key)}
                            aria-pressed={activeCat === f.key}
                        >
                            <span className="material-symbols-rounded">{f.icon}</span>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            {/* ── MAIN CONTENT ── */}
            <main className="home-main">
                {isLoading ? (
                    <div className="status-container"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state-bento animate-fade-in">
                        <div className="empty-state-icon-wrap">
                            <span className="material-symbols-rounded" style={{ fontSize: 32 }}>search_off</span>
                        </div>
                        <h2>Nessuna sagra trovata con questi filtri</h2>
                        <p>
                            Non ci sono eventi corrispondenti ai criteri selezionati. Prova a cambiare categoria, azzerare la ricerca o esplorare tutta la regione.
                        </p>
                        <button
                            type="button"
                            className="empty-state-reset-btn"
                            onClick={() => {
                                setSearch('');
                                setActiveCat('__all__');
                                setGpsActive(false);
                            }}
                        >
                            <span className="material-symbols-rounded">restart_alt</span>
                            Mostra tutte le sagre
                        </button>
                    </div>
                ) : (
                    <>
                        {/* IN CORSO */}
                        {ongoing.length > 0 && (
                            <>
                                <div className="section-label">
                                    <div className="section-label-text">
                                        <span className="live-dot" />
                                        In corso ora
                                    </div>
                                    <span className="section-count">{ongoing.length} event{ongoing.length !== 1 ? 'i' : 'o'}</span>
                                </div>
                                <div className="festival-grid">
                                    {ongoing.map(f => <FestivalCard key={f.id} festival={f} ongoing />)}
                                </div>
                            </>
                        )}

                        {/* UPCOMING */}
                        {upcoming.length > 0 && (
                            <>
                                <div className={`section-label ${ongoing.length > 0 ? 'section-label--spaced' : ''}`}>
                                    <div className="section-label-text">
                                        <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--antracite-3)' }}>event</span>
                                        Prossimi eventi
                                    </div>
                                    <span className="section-count">{upcoming.length} eventi</span>
                                </div>
                                <div className="festival-grid">
                                    {upcoming.map(f => <FestivalCard key={f.id} festival={f} />)}
                                </div>
                            </>
                        )}

                        {/* CONCLUSE DI RECENTE */}
                        {recentPast.length > 0 && (
                            <>
                                <div className="section-label section-label--spaced-lg">
                                    <div className="section-label-text">
                                        <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#78350F' }}>history</span>
                                        Concluse di recente
                                    </div>
                                    <span className="section-count">{recentPast.length} sagre recenti</span>
                                </div>
                                <div className="festival-grid">
                                    {recentPast.map(f => <FestivalCard key={f.id} festival={f} isRecent />)}
                                </div>
                            </>
                        )}

                        {/* ── ARCHIVE CTA BANNER (With subtle olive watermark) ── */}
                        <div className="home-archive-cta">
                            <div className="card-negative-watermark" style={{ opacity: 0.07 }} aria-hidden="true" />
                            <div className="home-archive-cta-inner">
                                <div className="home-archive-cta-label">
                                    <span className="material-symbols-rounded">history_edu</span>
                                    Archivio Storico Enogastronomico
                                </div>
                                <h3 className="home-archive-cta-title">
                                    Edizioni passate e locandine d'archivio
                                </h3>
                                <p className="home-archive-cta-desc">
                                    Consulta la raccolta con <strong>{archiveTotal}</strong> sagre ed eventi storici svolti nei borghi umbri, suddivisi per anno, provincia e menù tipici.
                                </p>
                                <Link to="/archivio" className="home-cta-link">
                                    <span className="material-symbols-rounded">menu_book</span>
                                    Esplora l'Archivio ({archiveTotal} sagre)
                                </Link>
                            </div>
                        </div>
                    </>
                )}

                {/* ── FAQ SECTION (SEO & USER VALUE) ── */}
                <section className="home-faq-section" aria-labelledby="faq-title">
                    <div className="home-faq-header">
                        <h2 id="faq-title">
                            Domande Frequenti sulle Sagre dell'Umbria
                        </h2>
                        <p>
                            Tutto quello che devi sapere per vivere al meglio la tradizione gastronomica umbra
                        </p>
                    </div>

                    <div className="faq-list">
                        {FAQ_ITEMS.map((item, idx) => (
                            <details key={idx} className="faq-item">
                                <summary className="faq-summary">
                                    <span>{item.q}</span>
                                    <span className="material-symbols-rounded faq-icon">expand_more</span>
                                </summary>
                                <p className="faq-answer">
                                    {item.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

function FestivalCard({ festival: f, ongoing, isRecent }) {
    const icon = CAT_ICONS[f.cat] || 'local_dining';
    const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
    const imgSrc = getImageUrl(f.image_url, fallbackPhoto);
    const { isFavorite, toggleFavorite } = useFavorites();
    const fav = isFavorite(f.id);

    return (
        <Link to={`/festival/${f.id}`} className="festival-card">
            <div className="festival-card-img">
                <img
                    src={imgSrc}
                    alt={`Locandina e specialità tipiche della sagra ${f.name} a ${f.city} (${f.province})`}
                    loading="lazy"
                    onError={(e) => {
                        if (e.target.src !== fallbackPhoto) {
                            e.target.src = fallbackPhoto;
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(f.id);
                    }}
                    title={fav ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
                    aria-label={fav ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
                    className={`card-fav-btn ${fav ? 'is-fav' : ''}`}
                >
                    <span className="material-symbols-rounded">
                        {fav ? 'favorite' : 'favorite_border'}
                    </span>
                </button>
                {ongoing && <span className="card-badge">Oggi</span>}
                {!ongoing && isRecent && (
                    <span className="card-badge card-badge--recent">
                        Conclusa di recente
                    </span>
                )}
                {!ongoing && !isRecent && isPast(f) && (
                    <span className="card-badge card-badge--archive">
                        Archivio
                    </span>
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
                    {f.is_verified_dates === 'VERIFIED' && (
                        <span className="material-symbols-rounded card-verified-badge" title="Date verificate da fonte ufficiale">
                            verified
                        </span>
                    )}
                </p>
                
                <div className="card-rating-preview-row">
                    {f.average_rating ? (
                        <div className="card-rating-group">
                            <ForkRating rating={f.average_rating} size={15} activeColor="#D97706" />
                            <span className="card-rating-score">{f.average_rating.toFixed(1)}</span>
                            <span className="card-rating-reviews">({f.review_count})</span>
                        </div>
                    ) : (
                        <div className="card-rating-empty">
                            <ForkRating rating={0} size={14} />
                            <span className="card-rating-empty-text">Vota per primo</span>
                        </div>
                    )}
                    <span className="material-symbols-rounded card-chevron">chevron_right</span>
                </div>
            </div>
        </Link>
    );
}
