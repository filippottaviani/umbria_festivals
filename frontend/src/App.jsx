import React, { useEffect, useState } from 'react';
import MapView from './components/MapView';
import CalendarView from './components/CalendarView';
import { CATS } from './constants';
import './index.css';

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
        const loadFestivals = async () => {
            setIsLoading(true);
            // Se le API non sono ancora pronte, usa dati di test
            // const data = await fetchFestivals();
            const data = [
                { id: '1', name: 'Sagra del Tartufo', city: 'Spoleto', province: 'PG', latitude: 42.73, longitude: 12.73, start_date: '2026-07-15', end_date: '2026-07-20', cat: 'tartufo', desc: 'La vera essenza del tartufo spoletino.' },
                { id: '2', name: 'Festa della Cipolla', city: 'Cannara', province: 'PG', latitude: 42.99, longitude: 12.58, start_date: '2026-09-02', end_date: '2026-09-11', cat: 'orto', desc: "L'oro di Cannara in tutte le sue sfumature." },
                { id: '3', name: 'Rievocazione del Palio', city: 'Gubbio', province: 'PG', latitude: 43.35, longitude: 12.57, start_date: '2026-06-20', end_date: '2026-06-22', cat: 'storica', desc: 'Una festa di piazza che racconta il cuore antico della città.' },
            ];
            setAllFestivals(data);
            setIsLoading(false);
        };
        loadFestivals();
    }, []);

    const toggleCat = (key) => {
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
            <header className="hero-card">
                <div className="bunting" aria-hidden="true">
                    <span className="flag flag-green"></span>
                    <span className="flag flag-gold"></span>
                    <span className="flag flag-wine"></span>
                    <span className="flag flag-green"></span>
                    <span className="flag flag-gold"></span>
                    <span className="flag flag-wine"></span>
                    <span className="flag flag-green"></span>
                    <span className="flag flag-gold"></span>
                    <span className="flag flag-wine"></span>
                    <span className="flag flag-green"></span>
                </div>
                <p className="eyebrow">Portale estivo dell'Umbria</p>
                <h1>Sagre d'Umbria</h1>
                <p className="sub">Tra borghi in pietra, tavole all'aperto e serate di paese.</p>
                <label className="searchwrap" htmlFor="festival-search">
                    <span className="search-icon" aria-hidden="true">⌕</span>
                    <input
                        id="festival-search"
                        type="text"
                        placeholder="Cerca per nome o comune..."
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    />
                </label>
            </header>

            <section className="controls-card" aria-label="Controlli della vista">
                <div className="controls-row">
                    <div className="viewToggle" role="tablist" aria-label="Seleziona vista">
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
                    <label className="select-field">
                        <span className="sr-only">Filtra per provincia</span>
                        <select value={filters.provincia} onChange={(e) => setFilters({ ...filters, provincia: e.target.value })}>
                            <option value="">Tutte le province</option>
                            <option value="PG">Perugia</option>
                            <option value="TR">Terni</option>
                        </select>
                    </label>
                    <span className="count-pill">{filteredFestivals.length} sagre trovate</span>
                </div>
                <div className="chip-row">
                    {Object.entries(CATS).map(([key, cat]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={filters.cats.has(key)}
                            className={`chip ${filters.cats.has(key) ? 'active' : ''}`}
                            onClick={() => toggleCat(key)}
                        >
                            <span className="dot" style={{ background: cat.hex }}></span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            <main className="main-panel">
                {isLoading ? (
                    <div className="state-card loading-state" role="status" aria-live="polite">
                        <div className="skeleton-line long"></div>
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line short"></div>
                    </div>
                ) : filteredFestivals.length === 0 ? (
                    <div className="state-card empty-state">
                        <h2>Nessuna sagra da mostrare, per il momento.</h2>
                        <p>Prova a cambiare filtri o a cercare un altro borgo: le feste dell'Umbria hanno ancora molto da raccontare.</p>
                    </div>
                ) : (
                    <>
                        <div className={`view-panel ${view === 'map' ? 'is-active' : ''}`} hidden={view !== 'map'}>
                            <MapView festivals={filteredFestivals} />
                        </div>
                        <div className={`view-panel ${view === 'cal' ? 'is-active' : ''}`} hidden={view !== 'cal'}>
                            <CalendarView festivals={filteredFestivals} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default App;