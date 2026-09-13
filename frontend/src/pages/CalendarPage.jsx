import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import CalendarView from '../components/CalendarView';
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

const CAT_COLORS = {
    tartufo: '#7A2E39',
    carne:   '#DC2626',
    pesce:   '#0284C7',
    pasta:   '#D97706',
    orto:    '#16A34A',
    grano:   '#CA8A04',
    storica: '#4F46E5',
    popolare:'#2A4B3C',
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
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const FILTER_DEFS = [
    { key: '__all__', label: 'Tutti i generi', icon: 'apps' },
    ...Object.entries(CATS).map(([k, v]) => ({ key: k, label: v.label, icon: CAT_ICONS[k] || 'local_dining' })),
];

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

    return (
        <div className="app-shell animate-fade-in calendar-page-layout">
            <Navbar search={search} setSearch={setSearch} showSearch={true} />

            <div className="calendar-page-header">
                <div className="calendar-header-title">
                    <h1>Calendario delle Sagre Umbre</h1>
                    <p>Pianifica le tue serate e scopri tutte le date degli eventi gastronomici in Umbria</p>
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
            <div className="filters-row calendar-filters-row">
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

            {/* CATEGORY LEGEND */}
            <div className="calendar-legend-bar">
                <span className="legend-title">Legenda Categorie:</span>
                <div className="legend-items">
                    {Object.entries(CATS).map(([k, v]) => (
                        <div key={k} className="legend-item">
                            <span className="legend-color-dot" style={{ backgroundColor: CAT_COLORS[k] || '#2A4B3C' }} />
                            <span className="legend-label">{v.label}</span>
                        </div>
                    ))}
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
