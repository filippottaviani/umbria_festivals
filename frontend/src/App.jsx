import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import CalendarPage from './pages/CalendarPage';
import FestivalDetails from './pages/FestivalDetails';
import AdminPanel from './pages/AdminPanel';
import SubmitFestival from './pages/SubmitFestival';
import './index.css';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/mappa" element={<MapPage />} />
                <Route path="/calendario" element={<CalendarPage />} />
                <Route path="/festival/:id" element={<FestivalDetails />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/segnala-sagra" element={<SubmitFestival />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;