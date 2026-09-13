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

const PageLoader = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        fontFamily: 'sans-serif',
        color: '#8b0000'
    }}>
        <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #8b0000',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '16px', fontWeight: 'bold' }}>Caricamento in corso...</p>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
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
        </BrowserRouter>
    );
};

export default App;