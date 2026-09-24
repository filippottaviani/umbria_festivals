import React, { useEffect, useState } from 'react';
import { fetchFestivals, getImageUrl } from '../services/api';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import ForkRating from '../components/ForkRating';
import { CATS, CAT_ICONS, normalizeFestival, isPast, fmtDate, TOWN_FALLBACKS } from '../constants';

const ARCHIVE_BREADCRUMB_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://sagraumbra.it/"
        },
        {
            "@type": "ListItem",
            "position": 2,
            "name": "Archivio Storico Sagre Umbria",
            "item": "https://sagraumbra.it/archivio"
        }
    ]
};

export default function ArchivePage() {
    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [provincia, setProvincia] = useState('');
    const [activeCat, setActiveCat] = useState('__all__');
    const [selectedYear, setSelectedYear] = useState('all');

    useEffect(() => {
        let live = true;
        (async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals(provincia);
                const pastOnly = (Array.isArray(data) ? data : [])
                    .map(normalizeFestival)
                    .filter(isPast);
                if (live) setAllFestivals(pastOnly);
            } catch {
                if (live) setAllFestivals([]);
            } finally {
                if (live) setIsLoading(false);
            }
        })();
        return () => { live = false; };
    }, [provincia]);

    // Available years in archive
    const years = Array.from(new Set(allFestivals.map(f => new Date(f.start_date).getFullYear()))).sort((a, b) => b - a);

    const filtered = allFestivals.filter((f) => {
        if (activeCat !== '__all__' && f.cat !== activeCat) return false;
        if (selectedYear !== 'all' && new Date(f.start_date).getFullYear().toString() !== selectedYear) return false;
        if (search) {
            const hay = `${f.name} ${f.city}`.toLowerCase();
            if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
    });

    return (
        <div className="app-shell animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
            <SEO
                title="Archivio Storico Sagre dell'Umbria — Memoria Enogastronomica"
                description="Esplora la memoria storica delle sagre e feste popolari dei borghi umbri. Trova edizioni passate, locandine verificate, ricette e tradizioni."
                canonical="https://sagraumbra.it/archivio"
                schema={ARCHIVE_BREADCRUMB_SCHEMA}
            />

            <Navbar search={search} setSearch={setSearch} showSearch={true} />

            {/* Header Banner */}
            <div className="page-hero-banner">
                <div className="page-hero-inner">
                    <div className="page-hero-badge" style={{ background: 'rgba(255,255,255,0.14)', color: '#FFFFFF' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#FBBF24' }}>history_edu</span>
                        Archivio Storico Ufficiale
                    </div>
                    <h1>
                        Archivio delle Sagre e Feste Umbre
                    </h1>
                    <p>
                        Le edizioni passate, i menù storici e le locandine ufficiali archiviate per comune e anno.
                    </p>

                    {/* Stats Pill */}
                    {!isLoading && (
                        <div style={{ display: 'inline-flex', gap: '1.5rem', background: 'rgba(0,0,0,0.22)', padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <span><strong>{allFestivals.length}</strong> Sagre Archiviate</span>
                            <span><strong>{years.length}</strong> Anni di Storia</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters Row */}
            <div className="filters-container" style={{ background: 'var(--travertino)', borderBottom: '1px solid var(--border-subtle)', padding: '1rem 0' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Year Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--cypress)' }}>calendar_today</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="archive-filter-select"
                            aria-label="Filtra per anno"
                        >
                            <option value="all">Tutti gli anni</option>
                            {years.map(y => (
                                <option key={y} value={y.toString()}>Anno {y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Province Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--cypress)' }}>location_on</span>
                        <select
                            value={provincia}
                            onChange={(e) => setProvincia(e.target.value)}
                            className="archive-filter-select"
                            aria-label="Filtra per provincia"
                        >
                            <option value="">Tutta l'Umbria (PG &amp; TR)</option>
                            <option value="PG">Perugia (PG)</option>
                            <option value="TR">Terni (TR)</option>
                        </select>
                    </div>

                    {/* Category Buttons */}
                    <div className="filters-row" style={{ flex: 1, padding: 0 }}>
                        <button
                            type="button"
                            className={`filter-btn ${activeCat === '__all__' ? 'active' : ''}`}
                            onClick={() => setActiveCat('__all__')}
                        >
                            Tutte le Categorie
                        </button>
                        {Object.entries(CATS).map(([k, v]) => (
                            <button
                                key={k}
                                type="button"
                                className={`filter-btn ${activeCat === k ? 'active' : ''}`}
                                onClick={() => setActiveCat(k)}
                            >
                                <span className="material-symbols-rounded">{CAT_ICONS[k] || 'local_dining'}</span>
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Archive Content Grid */}
            <main style={{ padding: '2rem 1rem 4rem', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {isLoading ? (
                    <div className="status-container"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state-bento animate-fade-in">
                        <div className="empty-state-icon-wrap">
                            <span className="material-symbols-rounded" style={{ fontSize: 32 }}>history_toggle_off</span>
                        </div>
                        <h2>Nessuna sagra archiviata con questi filtri</h2>
                        <p>
                            Non ci sono edizioni storiche registrate corrispondenti alla ricerca o all'anno selezionato.
                        </p>
                        <button
                            type="button"
                            className="empty-state-reset-btn"
                            onClick={() => {
                                setSelectedYear('all');
                                setProvincia('');
                                setActiveCat('__all__');
                                setSearch('');
                            }}
                        >
                            <span className="material-symbols-rounded">restart_alt</span>
                            Mostra tutto l'archivio
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--antracite-2)' }}>
                                Mostrando {filtered.length} edizioni storiche
                            </span>
                        </div>

                        <div className="festival-grid">
                            {filtered.map(f => (
                                <ArchiveCard key={f.id} festival={f} />
                            ))}
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}

function ArchiveCard({ festival: f }) {
    const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
    const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

    return (
        <Link to={`/festival/${f.id}`} className="festival-card" style={{ opacity: 0.95 }}>
            <div className="festival-card-img">
                <img
                    src={imgSrc}
                    alt={`Edizione storica della sagra ${f.name} a ${f.city}`}
                    loading="lazy"
                    onError={(e) => { e.target.src = fallbackPhoto; }}
                />
                <span className="card-badge" style={{ background: 'var(--antracite-3)', color: '#fff' }}>
                    Archivio {new Date(f.start_date).getFullYear()}
                </span>
                {f.is_verified_dates === 'VERIFIED' && (
                    <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(42,75,60,0.92)', color: '#fff', padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 12, color: '#10B981' }}>verified</span>
                        Date Verificate
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
                    <span className="material-symbols-rounded">event_available</span>
                    Edizione: {fmtDate(f.start_date)} – {fmtDate(f.end_date)}
                </p>
                {f.verification_source && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--antracite-3)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 13 }}>source</span>
                        Fonte: {f.verification_source}
                    </p>
                )}
            </div>
        </Link>
    );
}
