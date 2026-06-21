import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import MapView from './components/MapView';
import ListView from './components/ListView';
import { fetchFestivals } from './services/api';
import { CATS } from './constants';
import './index.css';

const App = () => {
    const [allFestivals, setAllFestivals] = useState([]);
    const [view, setView] = useState('map');
    
    // Gestione Stato Filtri
    const [filters, setFilters] = useState({
        q: "",
        provincia: "",
        weekend: false,
        cats: new Set(Object.keys(CATS))
    });

    useEffect(() => {
        const loadFestivals = async () => {
            // Se le API non sono ancora pronte, usa dati di test
            // const data = await fetchFestivals();
            const data = [
                { id: "1", name: "Sagra del Tartufo", city: "Spoleto", province: "PG", latitude: 42.73, longitude: 12.73, start_date: "2026-07-15", end_date: "2026-07-20", cat: "tartufo", desc: "La vera essenza del tartufo spoletino." },
                { id: "2", name: "Festa della Cipolla", city: "Cannara", province: "PG", latitude: 42.99, longitude: 12.58, start_date: "2026-09-02", end_date: "2026-09-11", cat: "orto", desc: "L'oro di Cannara in tutte le sue sfumature." },
            ];
            setAllFestivals(data);
        };
        loadFestivals();
    }, []);

    const toggleCat = (key) => {
        const newCats = new Set(filters.cats);
        if (newCats.has(key)) newCats.delete(key);
        else newCats.add(key);
        setFilters({ ...filters, cats: newCats });
    };

    // Logica di filtraggio
    const filteredFestivals = allFestivals.filter(s => {
        if (filters.provincia && s.province !== filters.provincia) return false;
        if (!filters.cats.has(s.cat)) return false;
        if (filters.q) {
            const searchStr = `${s.name} ${s.city}`.toLowerCase();
            if (!searchStr.includes(filters.q.toLowerCase())) return false;
        }
        return true;
    });

    return (
        <div>
            <header>
                <div className="bunting">
                    <span></span><span></span><span></span><span></span><span></span><span></span>
                </div>
                <p className="eyebrow">Il Portale Unificato</p>
                <h1>Sagre d'Umbria</h1>
                <p className="sub">Tutte le sagre e feste popolari della regione in un unico posto.</p>
                <div className="searchwrap">
                    <input 
                        id="search" 
                        type="text" 
                        placeholder="Cerca per nome o comune..." 
                        onChange={(e) => setFilters({...filters, q: e.target.value})}
                    />
                </div>
            </header>

            <div className="controls">
                <div className="row">
                    <div className="viewToggle">
                        <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>Mappa</button>
                        <button className={view === 'cal' ? 'active' : ''} onClick={() => setView('cal')}>Calendario</button>
                    </div>
                    <select onChange={(e) => setFilters({...filters, provincia: e.target.value})}>
                        <option value="">Tutte le province</option>
                        <option value="PG">Perugia</option>
                        <option value="TR">Terni</option>
                    </select>
                    <span className="count">{filteredFestivals.length} sagre trovate</span>
                </div>
                <div className="row">
                    {Object.entries(CATS).map(([key, cat]) => (
                        <div 
                            key={key} 
                            className={`chip ${filters.cats.has(key) ? 'active' : ''}`}
                            onClick={() => toggleCat(key)}
                        >
                            <span className="dot" style={{ background: cat.hex }}></span>
                            {cat.label}
                        </div>
                    ))}
                </div>
            </div>

            <main>
                <div style={{ display: view === 'map' ? 'block' : 'none' }}>
                    <MapView festivals={filteredFestivals} />
                </div>
                <div style={{ display: view === 'cal' ? 'block' : 'none' }}>
                    <ListView festivals={filteredFestivals} />
                </div>
            </main>
        </div>
    );
};

export default App;