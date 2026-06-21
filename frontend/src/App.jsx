import React, { useEffect, useState } from 'react';
import MapView from './components/MapView';
import CalendarView from './components/CalendarView';
import { fetchFestivals } from './services/api';

const App = () => {
    const [festivals, setFestivals] = useState([]);
    const [view, setView] = useState('map');

    useEffect(() => {
        const loadFestivals = async () => {
            const data = await fetchFestivals();
            setFestivals(data);
        };
        loadFestivals();
    }, []);

    return (
        <div className="container">
            <header>
                <h1>Umbria Summer Festivals</h1>
                <nav>
                    <button onClick={() => setView('map')}>Map View</button>
                    <button onClick={() => setView('calendar')}>Calendar View</button>
                </nav>
            </header>
            <main>
                {view === 'map' ? (
                    <MapView festivals={festivals} />
                ) : (
                    <CalendarView festivals={festivals} />
                )}
            </main>
        </div>
    );
};

export default App;