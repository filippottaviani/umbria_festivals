import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { fetchFestivals, getImageUrl } from '../services/api';
import { CATS } from '../constants';
import { Link } from 'react-router-dom';
import ForkRating from '../components/ForkRating';
import Footer from '../components/Footer';

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
    const [mobileView, setMobileView] = useState('map'); // 'map' | 'list'

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

            {/* MOBILE VIEW TOGGLE: MAPPA / ELENCO */}
            <div className="mobile-view-toggle-bar">
                <button
                    type="button"
                    className={`mobile-toggle-btn ${mobileView === 'map' ? 'active' : ''}`}
                    onClick={() => setMobileView('map')}
                    aria-label="Visualizza mappa"
                >
                    <span className="material-symbols-rounded">map</span>
                    Mappa ({filtered.length})
                </button>
                <button
                    type="button"
                    className={`mobile-toggle-btn ${mobileView === 'list' ? 'active' : ''}`}
                    onClick={() => setMobileView('list')}
                    aria-label="Visualizza elenco sagre"
                >
                    <span className="material-symbols-rounded">format_list_bulleted</span>
                    Elenco ({filtered.length})
                </button>
            </div>

            {/* SPLIT CONTENT: SIDEBAR + MAP */}
            <div className={`map-page-main mobile-view-${mobileView}`}>
                <aside className={`map-sidebar ${mobileView === 'list' ? 'mobile-show' : 'mobile-hide'}`}>
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
                                        onClick={() => {
                                            setSelectedFestival(f);
                                            // On mobile, clicking an item in list can also switch to map or keep user informed
                                        }}
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

                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="sidebar-locate-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFestival(f);
                                                        setMobileView('map');
                                                    }}
                                                    title="Mostra sulla mappa"
                                                >
                                                    <span className="material-symbols-rounded">near_me</span>
                                                </button>
                                                <Link to={`/festival/${f.id}`} className="sidebar-details-link" onClick={e => e.stopPropagation()}>
                                                    Dettagli &rarr;
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </aside>

                <main className={`map-viewport-container ${mobileView === 'map' ? 'mobile-show' : 'mobile-hide'}`}>
                    <MapView
                        festivals={filtered}
                        selectedFestival={selectedFestival}
                        onSelectFestival={(f) => setSelectedFestival(f)}
                    />

                    {/* Mobile Floating Quick Preview Card when a pin is selected */}
                    {selectedFestival && (
                        <div className="mobile-map-preview-card animate-slide-down">
                            <button
                                type="button"
                                className="preview-close-btn"
                                onClick={() => setSelectedFestival(null)}
                                aria-label="Chiudi anteprima"
                            >
                                <span className="material-symbols-rounded">close</span>
                            </button>
                            <div className="preview-inner">
                                <div className="preview-img-wrap">
                                    <img
                                        src={getImageUrl(selectedFestival.image_url, TOWN_FALLBACKS[selectedFestival.city] || TOWN_FALLBACKS['Perugia'])}
                                        alt={selectedFestival.name}
                                    />
                                    {isOngoing(selectedFestival) && (
                                        <span className="card-badge live">Oggi</span>
                                    )}
                                </div>
                                <div className="preview-info">
                                    <h4>{selectedFestival.name}</h4>
                                    <p className="preview-location">
                                        <span className="material-symbols-rounded">location_on</span>
                                        {selectedFestival.city} ({selectedFestival.province})
                                    </p>
                                    <p className="preview-dates">
                                        <span className="material-symbols-rounded">calendar_today</span>
                                        {fmtDate(selectedFestival.start_date)} - {fmtDate(selectedFestival.end_date)}
                                    </p>
                                    <div className="preview-actions">
                                        {selectedFestival.average_rating ? (
                                            <div className="sidebar-rating">
                                                <ForkRating rating={selectedFestival.average_rating} size={13} activeColor="#F59E0B" />
                                                <span>{selectedFestival.average_rating.toFixed(1)}</span>
                                            </div>
                                        ) : null}
                                        <Link to={`/festival/${selectedFestival.id}`} className="btn-preview-details">
                                            Vedi Sagra &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            <Footer />
        </div>
    );
}
