import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import CalendarView from '../components/CalendarView';
import { fetchFestivals, getImageUrl } from '../services/api';
import { CATS, CAT_ICONS, normalizeFestival, isOngoing, fmtDate, TOWN_FALLBACKS } from '../constants';
import { Link } from 'react-router-dom';
import ForkRating from '../components/ForkRating';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const CALENDAR_BREADCRUMB_SCHEMA = {
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
            "name": "Calendario Sagre Umbria",
            "item": "https://sagraumbra.it/calendario"
        }
    ]
};

const FILTER_DEFS = [
    { key: '__all__', label: 'Tutti i generi', icon: 'apps' },
    ...Object.entries(CATS).map(([k, v]) => ({ key: k, label: v.label, icon: CAT_ICONS[k] || 'local_dining' })),
];

export default function CalendarPage() {
    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [provinciaFilter, setProvinciaFilter] = useState('');
    const [activeCat, setActiveCat] = useState('__all__');
    const [modalFestival, setModalFestival] = useState(null);

    useEffect(() => {
        let live = true;
        (async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals('');
                if (live) setAllFestivals((Array.isArray(data) ? data : []).map(normalizeFestival));
            } catch {
                if (live) setAllFestivals([]);
            } finally {
                if (live) setIsLoading(false);
            }
        })();
        return () => { live = false; };
    }, []);

    const filtered = allFestivals.filter((f) => {
        if (provinciaFilter && f.province?.toUpperCase() !== provinciaFilter.toUpperCase()) return false;
        if (activeCat !== '__all__' && f.cat !== activeCat) return false;
        if (search) {
            const hay = `${f.name} ${f.city}`.toLowerCase();
            if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
    });

    const hasActiveFilters = provinciaFilter !== '' || activeCat !== '__all__' || search !== '';
    const resetAllFilters = () => {
        setProvinciaFilter('');
        setActiveCat('__all__');
        setSearch('');
    };

    return (
        <div className="app-shell animate-fade-in calendar-page-layout">
            <SEO
                title="Calendario Sagre Umbria 2026 — Date & Weekend nei Borghi"
                description="Calendario aggiornato delle sagre e feste enogastronomiche dell'Umbria: scopri gli eventi di oggi, del weekend e dei prossimi mesi."
                canonical="https://sagraumbra.it/calendario"
                schema={CALENDAR_BREADCRUMB_SCHEMA}
            />
            <Navbar search={search} setSearch={setSearch} showSearch={true} />

            <div className="calendar-page-header">
                <div className="calendar-header-title">
                    <div className="calendar-badge-top">
                        <span className="material-symbols-rounded">calendar_today</span>
                        <span>Programma Completo</span>
                    </div>
                    <h1>Calendario delle Sagre Umbre</h1>
                    <p>Il programma completo delle sagre umbre suddiviso per settimana, fine settimana o singola data.</p>
                </div>

                <div className="map-provincia-selector">
                    <button
                        className={`provincia-chip ${provinciaFilter === '' ? 'active' : ''}`}
                        onClick={() => setProvinciaFilter('')}
                    >
                        Tutta l'Umbria
                    </button>
                    <button
                        className={`provincia-chip ${provinciaFilter === 'PG' ? 'active' : ''}`}
                        onClick={() => setProvinciaFilter('PG')}
                    >
                        Perugia (PG)
                    </button>
                    <button
                        className={`provincia-chip ${provinciaFilter === 'TR' ? 'active' : ''}`}
                        onClick={() => setProvinciaFilter('TR')}
                    >
                        Terni (TR)
                    </button>
                </div>
            </div>

            {/* CATEGORY FILTERS */}
            <div className="filters-container">
                <div className="filters-row calendar-filters-row" role="group" aria-label="Filtra per genere o categoria">
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

                    {hasActiveFilters && (
                        <button
                            type="button"
                            className="filter-reset-quick-btn"
                            onClick={resetAllFilters}
                            aria-label="Azzera filtri"
                        >
                            <span className="material-symbols-rounded">close</span>
                            Tutti
                        </button>
                    )}
                </div>
            </div>

            {/* MAIN CALENDAR CONTAINER */}
            <main className="calendar-main-content">
                {isLoading ? (
                    <div className="status-container" style={{ padding: '4rem 0' }}>
                        <div className="spinner" />
                    </div>
                ) : (
                    <CalendarView
                        festivals={filtered}
                        onEventSelect={(f) => setModalFestival(f)}
                    />
                )}
            </main>

            {/* FESTIVAL PREVIEW MODAL */}
            {modalFestival && (
                <div className="modal-overlay" onClick={() => setModalFestival(null)}>
                    <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setModalFestival(null)}>
                            <span className="material-symbols-rounded">close</span>
                        </button>
                        
                        <div className="modal-img">
                            <img
                                src={getImageUrl(modalFestival.image_url, TOWN_FALLBACKS[modalFestival.city] || TOWN_FALLBACKS['Perugia'])}
                                alt={modalFestival.name}
                                onError={(e) => {
                                    e.currentTarget.src = TOWN_FALLBACKS[modalFestival.city] || TOWN_FALLBACKS['Perugia'];
                                }}
                            />
                            {isOngoing(modalFestival) && <span className="card-badge">Oggi in corso</span>}
                        </div>

                        <div className="modal-body">
                            <h3>{modalFestival.name}</h3>
                            <p className="modal-location">
                                <span className="material-symbols-rounded">location_on</span>
                                {modalFestival.city} ({modalFestival.province})
                            </p>
                            <p className="modal-dates">
                                <span className="material-symbols-rounded">calendar_today</span>
                                {fmtDate(modalFestival.start_date)} - {fmtDate(modalFestival.end_date)}
                            </p>
                            
                            {modalFestival.description && (
                                <p className="modal-desc">{modalFestival.description}</p>
                            )}

                            {modalFestival.average_rating && (
                                <div className="modal-rating">
                                    <ForkRating rating={modalFestival.average_rating} size={18} activeColor="#F59E0B" />
                                    <span className="modal-rating-score">{modalFestival.average_rating.toFixed(1)} / 5</span>
                                    <span className="modal-rating-count">({modalFestival.review_count} recensioni)</span>
                                </div>
                            )}

                            <div className="modal-actions">
                                <Link to={`/festival/${modalFestival.id}`} className="modal-primary-btn">
                                    Vai alla Pagina Sagra
                                    <span className="material-symbols-rounded">arrow_forward</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}
