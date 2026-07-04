import React, { useEffect, useState } from 'react';
import MapView from './components/MapView';
import CalendarView from './components/CalendarView';
import { CATS } from './constants';
import { fetchFestivals } from './services/api';
import './index.css';

const inferCategory = (festival) => {
    const haystack = `${festival.name || ''} ${festival.city || ''}`.toLowerCase();
    if (/(tartufo|truffle)/.test(haystack)) return 'tartufo';
    if (/(porchetta|carne|griglia|salsiccia|prosciutto|salumi|ciauscolo|cotechino)/.test(haystack)) return 'carne';
    if (/(pesce|baccalà|lago|laghetto)/.test(haystack)) return 'pesce';
    if (/(pasta|gnocchi|ravioli|tagliatelle)/.test(haystack)) return 'pasta';
    if (/(orto|frutta|verdura|cipolla|patata|castagna|mela)/.test(haystack)) return 'orto';
    if (/(grano|pane|farro|focaccia)/.test(haystack)) return 'grano';
    if (/(storica|rievocazione|palio|medieval)/.test(haystack)) return 'storica';
    return 'popolare';
};

const normalizeFestivalData = (festival) => ({
    ...festival,
    cat: festival.cat || inferCategory(festival),
    desc: festival.desc || `Manifestazione tradizionale a ${festival.city || 'Umbria'}.`,
});

const App = () => {
    const [allFestivals, setAllFestivals] = useState([]);
    const [view, setView] = useState('map');
    const [isLoading, setIsLoading] = useState(true);

    const [filters, setFilters] = useState({
        q: '',
        provincia: '',
        weekend: false,
        cats: new Set(Object.keys(CATS))
    });

    useEffect(() => {
        let isMounted = true;
        const loadFestivals = async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals(filters.provincia);
                if (isMounted) {
                    const normalized = (Array.isArray(data) ? data : []).map(normalizeFestivalData);
                    setAllFestivals(normalized);
                }
            } catch (error) {
                console.error(error);
                if (isMounted) setAllFestivals([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        loadFestivals();
        return () => {
            isMounted = false;
        };
    }, [filters.provincia]);

    const toggleCategory = (key) => {
        const newCats = new Set(filters.cats);
        if (newCats.has(key)) newCats.delete(key);
        else newCats.add(key);
        setFilters({ ...filters, cats: newCats });
    };

    const filteredFestivals = allFestivals.filter((s) => {
        if (filters.provincia && s.province !== filters.provincia) return false;
        if (!filters.cats.has(s.cat)) return false;
        if (filters.q) {
            const searchStr = `${s.name} ${s.city}`.toLowerCase();
            if (!searchStr.includes(filters.q.toLowerCase())) return false;
        }
        return true;
    });

    return (
        <div className="app-shell">
            <header className="hero-section">
                <div className="bunting" aria-hidden="true">
                    {[...Array(12)].map((_, i) => (
                        <span key={i} className={`flag flag-${i % 3 === 0 ? 'green' : i % 3 === 1 ? 'gold' : 'wine'}`}></span>
                    ))}
                </div>
                <h1>Sagre d'Umbria</h1>
                <p className="sub">Eventi, tradizioni e sapori estivi nei borghi umbri.</p>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Cerca per nome o comune..."
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    />
                </div>
            </header>

            <section className="controls-section">
                <div className="controls-row">
                    <div className="view-toggle" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === 'map'}
                            className={view === 'map' ? 'active' : ''}
                            onClick={() => setView('map')}
                        >
                            Mappa
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === 'cal'}
                            className={view === 'cal' ? 'active' : ''}
                            onClick={() => setView('cal')}
                        >
                            Calendario
                        </button>
                    </div>
                    <select value={filters.provincia} onChange={(e) => setFilters({ ...filters, provincia: e.target.value })}>
                        <option value="">Tutte le province</option>
                        <option value="PG">Perugia</option>
                        <option value="TR">Terni</option>
                    </select>
                </div>
                <div className="chip-row">
                    {Object.entries(CATS).map(([key, cat]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={filters.cats.has(key)}
                            className={`chip ${filters.cats.has(key) ? 'active' : ''}`}
                            onClick={() => toggleCategory(key)}
                        >
                            <span className="dot" style={{ background: cat.hex }}></span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            <main className="main-content">
                {isLoading ? (
                    <div className="status-container">
                        <div className="spinner"></div>
                    </div>
                ) : filteredFestivals.length === 0 ? (
                    <div className="status-container">
                        <h2>Nessun evento trovato</h2>
                        <p>Modifica i filtri di ricerca per visualizzare altre sagre.</p>
                    </div>
                ) : (
                    <>
                        <div className="view-panel" hidden={view !== 'map'}>
                            <MapView festivals={filteredFestivals} />
                        </div>
                        <div className="view-panel" hidden={view !== 'cal'}>
                            <CalendarView festivals={filteredFestivals} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default App;