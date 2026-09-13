import React, { useEffect, useState } from 'react';
import { CATS } from '../constants';
import { fetchFestivals, getImageUrl } from '../services/api';
import { Link } from 'react-router-dom';
import ForkRating from '../components/ForkRating';
import Navbar from '../components/Navbar';


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
    const [dateFilter, setDateFilter]     = useState('all'); // all, today, weekend
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

    return (
        <div className="app-shell animate-fade-in">

            <Navbar search={search} setSearch={setSearch} showSearch={true} />


            {/* ── PAGE HEADER ── */}
            <div className="page-header" style={{ position: 'relative' }}>
                <h1>Sagra Umbra</h1>
                <p>Sagre, tradizioni e sapori dei borghi umbri — Estate 2026</p>

                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleGPSLocate}
                        disabled={isLocating}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.6rem 1.1rem',
                            background: gpsActive ? '#10B981' : '#8b0000',
                            color: '#ffffff',
                            borderRadius: '100px',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                    >
                        <span className="material-symbols-rounded">near_me</span>
                        {isLocating ? 'Ricerca GPS...' : (gpsActive ? 'Vicine a te (GPS Attivo)' : 'Sagre Vicine a me')}
                    </button>

                    {gpsActive && (
                        <button
                            type="button"
                            onClick={() => {
                                setGpsActive(false);
                                setProvincia('');
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.6rem 1rem',
                                background: 'var(--travertino-2)',
                                color: 'var(--antracite)',
                                borderRadius: '100px',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer'
                            }}
                        >
                            <span className="material-symbols-rounded">close</span>
                            Tutte le Sagre
                        </button>
                    )}
                </div>
            </div>

            {/* ── COSA MANGIARE STASERA (TAGS CULINARI) ── */}
            <div style={{ maxWidth: '1200px', margin: '0 auto 1rem', padding: '0 1rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--antracite-2)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#D97706' }}>restaurant</span>
                    Cosa vuoi mangiare stasera?
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                    {DISH_TAGS.map(tag => (
                        <button
                            key={tag.label}
                            type="button"
                            onClick={() => setActiveDish(tag.query)}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '0.4rem 0.85rem',
                                borderRadius: '100px',
                                fontSize: '0.82rem',
                                fontWeight: activeDish === tag.query ? 700 : 500,
                                background: activeDish === tag.query ? 'var(--cypress)' : 'var(--card-bg, #ffffff)',
                                color: activeDish === tag.query ? '#ffffff' : 'var(--antracite)',
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer'
                            }}
                        >
                            {tag.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── CATEGORY FILTERS ── */}
            <div className="filters-row">
                {FILTER_DEFS.map(f => (
                    <button
                        key={f.key}
                        type="button"
                        className={`filter-btn ${activeCat === f.key ? 'active' : ''}`}
                        onClick={() => setActiveCat(f.key)}
                    >
                        <span className="material-symbols-rounded">{f.icon}</span>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── MAIN CONTENT ── */}
            <main style={{ paddingBottom: '4rem' }}>
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

