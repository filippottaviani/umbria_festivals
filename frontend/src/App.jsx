import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Lazy loading route components for code splitting & faster initial load
const Home = lazy(() => import('./pages/Home'));
const MapPage = lazy(() => import('./pages/MapPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const FestivalDetails = lazy(() => import('./pages/FestivalDetails'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const SubmitFestival = lazy(() => import('./pages/SubmitFestival'));
import BottomNav from './components/BottomNav';

const PageLoader = () => (
    <div className="page-loader">
        <div className="spinner" />
        <span>Caricamento in corso...</span>
    </div>
);


const App = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/mappa" element={<MapPage />} />
                    <Route path="/calendario" element={<CalendarPage />} />
                    <Route path="/festival/:id" element={<FestivalDetails />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/segnala-sagra" element={<SubmitFestival />} />
                </Routes>
            </Suspense>
            <BottomNav />
        </BrowserRouter>
    );
};

export default App;