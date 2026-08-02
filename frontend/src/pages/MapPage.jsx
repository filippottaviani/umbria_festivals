import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { fetchFestivals } from '../services/api';
import { CATS } from '../constants';
import { Link } from 'react-router-dom';
import ForkRating from '../components/ForkRating';

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
    { key: '__all__', label: 'Tutti i generi', icon: 'apps' },
    ...Object.entries(CATS).map(([k, v]) => ({ key: k, label: v.label, icon: CAT_ICONS[k] || 'local_dining' })),
];

export default function MapPage() {
    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [provinciaFilter, setProvinciaFilter] = useState('');
    const [activeCat, setActiveCat] = useState('__all__');
    const [selectedFestival, setSelectedFestival] = useState(null);

    useEffect(() => {
        let live = true;
        (async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals('');
                if (live) setAllFestivals((Array.isArray(data) ? data : []).map(normalize));
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

    const ongoingCount = filtered.filter(isOngoing).length;

    return (
        <div className="app-shell animate-fade-in map-page-layout">
            <Navbar search={search} setSearch={setSearch} showSearch={true} />

            <div className="map-page-header">
                <div className="map-header-title">
                    <h1>Mappa delle Sagre in Umbria</h1>
                    <p>Esplora le sagre e le tradizioni enogastronomiche posizionate su ciascun borgo umbro</p>
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
            <div className="filters-row map-filters-row">
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

            {/* SPLIT CONTENT: SIDEBAR + MAP */}
            <div className="map-page-main">
                <aside className="map-sidebar">
                    <div className="map-sidebar-header">
                        <span className="map-sidebar-count">
                            <strong>{filtered.length}</strong> sagre individuate
                        </span>
                        {ongoingCount > 0 && (
                            <span className="map-live-badge">
                                <span className="live-dot" /> {ongoingCount} in corso
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="status-container" style={{ padding: '3rem 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                            <p>Nessuna sagra trovata con questi filtri.</p>
                        </div>
                    ) : (
                        <div className="map-sidebar-list">
                            {filtered.map(f => {
                                const ongoing = isOngoing(f);
                                const isSelected = selectedFestival?.id === f.id;
                                return (
                                    <div
                                        key={f.id}
                                        className={`map-sidebar-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedFestival(f)}
                                    >
                                        <div className="sidebar-item-header">
                                            <h4>{f.name}</h4>
                                            {ongoing && <span className="item-live-dot" title="In corso oggi" />}
                                        </div>
                                        <p className="sidebar-item-sub">
                                            <span className="material-symbols-rounded">location_on</span>
                                            {f.city} ({f.province})
                                        </p>
                                        <p className="sidebar-item-date">
                                            <span className="material-symbols-rounded">calendar_today</span>
                                            {fmtDate(f.start_date)} - {fmtDate(f.end_date)}
                                        </p>
                                        
                                        <div className="sidebar-item-footer">
                                            {f.average_rating ? (
                                                <div className="sidebar-rating">
                                                    <ForkRating rating={f.average_rating} size={13} activeColor="#F59E0B" />
                                                    <span>{f.average_rating.toFixed(1)}</span>
                                                </div>
                                            ) : (
                                                <span className="no-rating-txt">Nessun voto</span>
                                            )}

                                            <Link to={`/festival/${f.id}`} className="sidebar-details-link" onClick={e => e.stopPropagation()}>
                                                Dettagli &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </aside>

                <main className="map-viewport-container">
                    <MapView
                        festivals={filtered}
                        selectedFestival={selectedFestival}
                        onSelectFestival={(f) => setSelectedFestival(f)}
                    />
                </main>
            </div>
        </div>
    );
}
