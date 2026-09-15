import React, { useEffect, useState } from 'react';
import { CATS } from '../constants';
import { fetchFestivals, fetchNearbyFestivals, getImageUrl } from '../services/api';
import { Link } from 'react-router-dom';
import ForkRating from '../components/ForkRating';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { HERO_IMAGES } from '../heroImages';


const CAT_ICONS = {
    tartufo: 'psychiatry',
    carne:   'outdoor_grill',
    pesce:   'set_meal',
    pasta:   'ramen_dining',
    orto:    'eco',
    grano:   'grain',
    storica: 'museum',
    popolare:'festival',
};

const inferCategory = (f) => {
    const h = `${f.name || ''} ${f.description || ''} ${f.menu_info || ''} ${f.city || ''}`.toLowerCase();
    if (/(tartufo|truffle)/.test(h)) return 'tartufo';
    if (/(pesce|baccalà|lago|giacchio)/.test(h)) return 'pesce';
    if (/(gnocchi|pasta|spaghetto|ciriola|umbrichell|tagliatella|ravioli|primi)/.test(h)) return 'pasta';
    if (/(porchetta|carne|griglia|salsiccia|prosciutto|salumi|arrosticini|maiale|oca|cinghiale)/.test(h)) return 'carne';
    if (/(salumi|norcina)/.test(h)) return 'salumi';
    if (/(orto|frutta|verdura|cipolla|patata|castagna|mela|asparagi|fungo|ortolano)/.test(h)) return 'orto';
    if (/(grano|pane|farro|focaccia|bruschetta|pizza|frittella|torta al testo)/.test(h)) return 'grano';
    if (/(storica|rievocazione|palio|medieval|gaite|duca|carbone)/.test(h)) return 'storica';
    return 'popolare';
};

const normalize = (f) => ({ ...f, cat: f.cat || inferCategory(f) });

const isOngoing = (f) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(f.start_date);
    const end   = new Date(f.end_date); end.setHours(23,59,59,999);
    return start <= today && today <= end;
};

const fmtDate = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day:'2-digit', month:'short' }) : '—';

const FILTER_DEFS = [
    { key: '__all__', label: 'Tutti', icon: 'apps' },
    ...Object.entries(CATS).map(([k, v]) => ({ key: k, label: v.label, icon: CAT_ICONS[k] || 'local_dining' })),
];

const DISH_TAGS = [
    { label: 'Tutti i Piatti', query: '' },
    { label: '🍄 Tartufo', query: 'tartufo' },
    { label: '🫓 Torta al Testo', query: 'torta al testo' },
    { label: '🐗 Cinghiale', query: 'cinghiale' },
    { label: '🍝 Strangozzi / Pasta', query: 'strangozzi' },
    { label: '🍢 Arrosticini / Grigliata', query: 'arrosticini' },
    { label: '🫓 Frittella', query: 'frittella' },
    { label: '🪿 Oca', query: 'oca' },
    { label: '🍕 Pizza', query: 'pizza' },
    { label: '🍷 Vino & Sagrantino', query: 'vino' }
];

export default function Home() {
    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [search, setSearch]             = useState('');
    const [provincia, setProvincia]       = useState('');
    const [activeCat, setActiveCat]       = useState('__all__');
    const [activeDish, setActiveDish]     = useState('');
    const [dateFilter, setDateFilter]     = useState('all');
    const [bgIndex, setBgIndex]           = useState(() => (HERO_IMAGES && HERO_IMAGES.length > 0) ? Math.floor(Math.random() * HERO_IMAGES.length) : 0);
    const [prevBgIndex, setPrevBgIndex]   = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Preload next image and handle smooth cross-fade slideshow
    useEffect(() => {
        if (!HERO_IMAGES || HERO_IMAGES.length <= 1) return;

        // Preload upcoming image
        const nextIndex = (bgIndex + 1) % HERO_IMAGES.length;
        const img = new Image();
        img.src = HERO_IMAGES[nextIndex];

        const interval = setInterval(() => {
            setPrevBgIndex(bgIndex);
            setIsTransitioning(true);
            const next = (bgIndex + 1) % HERO_IMAGES.length;
            setBgIndex(next);

            // Preload the one after next
            const futureIndex = (next + 1) % HERO_IMAGES.length;
            const futureImg = new Image();
            futureImg.src = HERO_IMAGES[futureIndex];

            setTimeout(() => {
                setIsTransitioning(false);
            }, 1200);
        }, 6500);

        return () => clearInterval(interval);
    }, [bgIndex]);

    const [isLocating, setIsLocating]     = useState(false);
    const [gpsActive, setGpsActive]       = useState(false);

    useEffect(() => {
        let live = true;
        (async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals(provincia);
                if (live) setAllFestivals((Array.isArray(data) ? data : []).map(normalize));
            } catch { if (live) setAllFestivals([]); }
            finally  { if (live) setIsLoading(false); }
        })();
        return () => { live = false; };
    }, [provincia]);

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
                    setAllFestivals((Array.isArray(nearby) ? nearby : []).map(normalize));
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

    const filtered = allFestivals.filter((f) => {
        if (activeCat !== '__all__' && f.cat !== activeCat) return false;
        if (activeDish) {
            const text = `${f.name} ${f.dish_info || ''} ${f.menu_info || ''} ${f.description || ''}`.toLowerCase();
            if (!text.includes(activeDish.toLowerCase())) return false;
        }
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

    const ongoing  = filtered.filter(isOngoing);
    const upcoming = filtered.filter(f => !isOngoing(f));
    const totalFestivals = allFestivals.length;
    const ongoingTotal = allFestivals.filter(isOngoing).length;

    return (
        <div className="app-shell animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

            <Navbar search={search} setSearch={setSearch} showSearch={true} />

            {/* ── HERO SECTION ── */}
            <div className="home-hero">
                {/* Background Layer 1: Previous image fading out */}
                {prevBgIndex !== null && (
                    <div
                        className={`home-hero-bg ${isTransitioning ? 'fade-out' : 'hidden'}`}
                        style={{ backgroundImage: `url(${HERO_IMAGES[prevBgIndex]})` }}
                        aria-hidden="true"
                    />
                )}

                {/* Background Layer 2: Current active image */}
                <div
                    className={`home-hero-bg ${isTransitioning ? 'fade-in' : 'active'}`}
                    style={{ backgroundImage: (HERO_IMAGES && HERO_IMAGES.length > 0) ? `url(${HERO_IMAGES[bgIndex]})` : 'none' }}
                    aria-hidden="true"
                />

                <div className="home-hero-overlay" aria-hidden="true"></div>
                <div className="home-hero-inner">
                    <h1>
                        Sagre & Tradizioni<br />
                        <em>dei Borghi Umbri</em>
                    </h1>
                    <p>
                        Scopri gli eventi enogastronomici autentici dell'Umbria —
                        Estate {new Date().getFullYear()}
                    </p>

                    {!isLoading && (
                        <div className="home-hero-stats">
                            <div className="hero-stat">
                                <span className="hero-stat-num">{totalFestivals}</span>
                                <span className="hero-stat-label">Sagre</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-num">{ongoingTotal}</span>
                                <span className="hero-stat-label">In corso</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-num">2</span>
                                <span className="hero-stat-label">Province</span>
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
                                    : 'Sagre Vicine a me'}
                        </button>

                        {gpsActive && (
                            <button
                                type="button"
                                className="gps-reset-btn"
                                onClick={() => {
                                    setGpsActive(false);
                                    setProvincia('');
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

            {/* ── COSA MANGIARE STASERA (DISH TAGS) ── */}
            <div className="dish-section">
                <div className="dish-section-label">
                    <span className="material-symbols-rounded">restaurant</span>
                    Cosa vuoi mangiare stasera?
                </div>
                <div className="dish-tag-strip" role="group" aria-label="Filtra per tipo di piatto">
                    {DISH_TAGS.map(tag => (
                        <button
                            key={tag.label}
                            type="button"
                            className={`dish-tag ${activeDish === tag.query ? 'active' : ''}`}
                            onClick={() => setActiveDish(tag.query)}
                            aria-pressed={activeDish === tag.query}
                        >
                            {tag.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── CATEGORY FILTERS ── */}
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

            {/* ── MAIN CONTENT ── */}
            <main style={{ paddingBottom: '4rem', flex: 1 }}>
                {isLoading ? (
                    <div className="status-container"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <h2>Nessun evento trovato</h2>
                        <p>Prova a modificare i filtri o la ricerca.</p>
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
                                <div className="section-label" style={{ marginTop: ongoing.length > 0 ? '2rem' : undefined }}>
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
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}

const TOWN_FALLBACKS = {
    'Perugia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg',
    'Assisi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/AssisiDec122023_03.jpg/1280px-AssisiDec122023_03.jpg',
    'Gubbio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg',
    'Foligno': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Foligno_Piazza_della_Repubblica.jpg/1280px-Foligno_Piazza_della_Repubblica.jpg',
    'Spoleto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Spoleto_Piazza_del_Duomo.jpg/1280px-Spoleto_Piazza_del_Duomo.jpg',
    'Norcia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Norcia_piazza_San_Benedetto.jpg/1280px-Norcia_piazza_San_Benedetto.jpg',
    'Orvieto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Duomo_Orvieto.jpg/1280px-Duomo_Orvieto.jpg',
    'Narni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1280px-Ponte_di_Augusto_a_Narni.jpg',
};

function FestivalCard({ festival: f, ongoing }) {
    const icon = CAT_ICONS[f.cat] || 'local_dining';
    const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
    const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

    return (
        <Link to={`/festival/${f.id}`} className="festival-card">
            <div className="festival-card-img">
                <img
                    src={imgSrc}
                    alt={f.city}
                    loading="lazy"
                    onError={(e) => {
                        if (e.target.src !== fallbackPhoto) {
                            e.target.src = fallbackPhoto;
                        }
                    }}
                />
                {ongoing && <span className="card-badge">Oggi</span>}
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
                    {fmtDate(f.start_date)} – {fmtDate(f.end_date)}
                </p>
                
                <div className="card-rating-preview-row" style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {f.average_rating ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <ForkRating rating={f.average_rating} size={15} activeColor="#D97706" />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--antracite)' }}>{f.average_rating.toFixed(1)}</span>
                            <span style={{ fontSize: '0.73rem', color: 'var(--antracite-3)' }}>({f.review_count})</span>
                        </div>
                    ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <ForkRating rating={0} size={14} />
                            <span style={{ fontSize: '0.73rem', color: 'var(--antracite-3)', fontWeight: 500 }}>Vota per primo</span>
                        </div>
                    )}
                    <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--cypress-light)' }}>chevron_right</span>
                </div>
            </div>
        </Link>
    );
}
