import React, { useEffect, useState } from 'react';
import { CATS } from '../constants';
import { fetchFestivals, fetchNearbyFestivals, getImageUrl } from '../services/api';
import { Link } from 'react-router-dom';
import ForkRating from '../components/ForkRating';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { HERO_IMAGES } from '../heroImages';

const FAQ_ITEMS = [
    {
        q: "Quali sono le sagre più famose e imperdibili dell'Umbria?",
        a: "Tra le feste popolari ed enogastronomiche più celebri dell'Umbria spiccano la Sagra del Tartufo a Norcia e Pietralunga, la storica Sagra della Porchetta a Costano (Bastia Umbra), la Festa della Cipolla a Cannara, la Sagra della Patata Rossa a Colfiorito, e rievocazioni storiche come il Mercato delle Gaite a Bevagna e la Quintana di Foligno."
    },
    {
        q: "Come posso sapere se una sagra è aperta oggi o nel weekend?",
        a: "Su Sagra Umbra puoi cliccare direttamente sul filtro 'Oggi' o 'In corso ora' per verificare gli stand gastronomici aperti stasera. Inoltre la sezione Calendario consente di selezionare ogni singolo giorno o fine settimana per organizzare il tuo tour nei borghi umbri."
    },
    {
        q: "Cosa si mangia tipicamente alle sagre dei borghi umbri?",
        a: "La cucina delle sagre celebra l'autenticità rurale: la classica torta al testo farcita con prosciutto nostrano, salsicce cotte alla brace ed erba campagnola, strangozzi tirati a mano al tartufo o al ragù di lepre e cinghiale, gnocchi col sugo d'oca, arrosticini e i pregiati vini del territorio come il Montefalco Sagrantino e il Grechetto."
    },
    {
        q: "Come possono le Pro Loco o gli organizzatori inserire la propria sagra?",
        a: "I volontari, le Pro Loco e i comitati festeggiamenti possono utilizzare il pulsante 'Segnala Sagra' nel menù principale per inviare gratuitamente date, locandina, menù e programma dei concerti musicali per la pubblicazione immediata sul portale."
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

const isPast = (f) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const end   = new Date(f.end_date); end.setHours(23,59,59,999);
    return end < today;
};

const fmtDate = (d) => {
    if (!d) return '—';
    const dateObj = new Date(d + 'T00:00:00');
    const isCurrentYear = dateObj.getFullYear() === new Date().getFullYear();
    return dateObj.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        ...(isCurrentYear ? {} : { year: 'numeric' })
    });
};

const FILTER_DEFS = [
    { key: '__all__', label: 'Tutti', icon: 'apps' },
    ...Object.entries(CATS).map(([k, v]) => ({ key: k, label: v.label, icon: CAT_ICONS[k] || 'local_dining' })),
];

export default function Home() {
    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [search, setSearch]             = useState('');
    const [provincia, setProvincia]       = useState('');
    const [activeCat, setActiveCat]       = useState('__all__');
    const [dateFilter, setDateFilter]     = useState('all');
    const [bgImage] = useState(() => {
        if (Array.isArray(HERO_IMAGES) && HERO_IMAGES.length > 0) {
            const randomIndex = Math.floor(Math.random() * HERO_IMAGES.length);
            return HERO_IMAGES[randomIndex];
        }
        return '';
    });

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
    const upcoming = filtered.filter(f => !isOngoing(f) && !isPast(f));
    const past     = filtered.filter(isPast);
    const totalFestivals = allFestivals.length;
    const ongoingTotal = allFestivals.filter(isOngoing).length;
    const archiveTotal = allFestivals.filter(isPast).length;

    return (
        <div className="app-shell animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'clip' }}>
            <SEO
                title="Sagre &amp; Feste dell'Umbria 2026 — Tradizioni nei Borghi"
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
                        Scopri gli eventi enogastronomici autentici nei borghi medievali umbri —
                        Tradizione, sapori contadini e musica dal vivo.
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
                                <span className="hero-stat-num">{archiveTotal}</span>
                                <span className="hero-stat-label">In archivio</span>
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

            {/* ── CATEGORY FILTERS ── */}
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

                        {/* ARCHIVIO STAGIONE */}
                        {past.length > 0 && (
                            <>
                                <div className="section-label" style={{ marginTop: '2.5rem' }}>
                                    <div className="section-label-text">
                                        <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--antracite-3)' }}>history_edu</span>
                                        Archivio Sagre della Stagione
                                    </div>
                                    <span className="section-count">{past.length} sagre archiviate</span>
                                </div>
                                <div className="festival-grid">
                                    {past.map(f => <FestivalCard key={f.id} festival={f} />)}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ── FAQ SECTION (SEO & USER VALUE) ── */}
                <section className="home-faq-section" style={{ maxWidth: '960px', margin: '4rem auto 1rem', padding: '0 1rem' }} aria-labelledby="faq-title">
                    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                        <h2 id="faq-title" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cypress)', margin: 0 }}>
                            Domande Frequenti sulle Sagre dell'Umbria
                        </h2>
                        <p style={{ fontSize: '0.95rem', color: 'var(--antracite-3)', marginTop: '0.4rem' }}>
                            Tutto quello che devi sapere per vivere al meglio la tradizione gastronomica umbra
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {FAQ_ITEMS.map((item, idx) => (
                            <details
                                key={idx}
                                style={{
                                    background: 'var(--travertino-2)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1.1rem 1.35rem',
                                    border: '1px solid var(--border-subtle)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <summary style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--antracite)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>{item.q}</span>
                                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--cypress)' }}>expand_more</span>
                                </summary>
                                <p style={{ margin: '0.85rem 0 0', color: 'var(--antracite-2)', lineHeight: '1.65', fontSize: '0.95rem' }}>
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
                    alt={`Locandina e specialità tipiche della sagra ${f.name} a ${f.city} (${f.province})`}
                    loading="lazy"
                    onError={(e) => {
                        if (e.target.src !== fallbackPhoto) {
                            e.target.src = fallbackPhoto;
                        }
                    }}
                />
                {ongoing && <span className="card-badge">Oggi</span>}
                {!ongoing && isPast(f) && <span className="card-badge" style={{ background: 'var(--antracite-3)', color: '#fff' }}>Archivio</span>}
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
