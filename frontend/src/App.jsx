import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Lazy loading route components for code splitting & faster initial load
const Home = lazy(() => import('./pages/Home'));
const MapPage = lazy(() => import('./pages/MapPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const FestivalDetails = lazy(() => import('./pages/FestivalDetails'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const SubmitFestival = lazy(() => import('./pages/SubmitFestival'));
import BottomNav from './components/BottomNav';
import InstallAppBanner from './components/InstallAppBanner';

const PageLoader = () => (
    <div className="page-loader">
        <div className="spinner" />
        <span>Caricamento in corso...</span>
    </div>
);


const App = () => {
    useEffect(() => {
        // Dynamically initialize Capacitor StatusBar plugins only if running in a native Capacitor shell
        if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
            if (window.Capacitor?.Plugins?.StatusBar) {
                try {
                    window.Capacitor.Plugins.StatusBar.setStyle({ style: 'DARK' });
                    window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#2A4B3C' });
                } catch (e) {}
            } else {
                const pkgName = '@capacitor/status-bar';
                import(/* @vite-ignore */ pkgName)
                    .then(({ StatusBar, Style }) => {
                        StatusBar.setStyle({ style: Style?.Dark || 'DARK' }).catch(() => {});
                        StatusBar.setBackgroundColor({ color: '#2A4B3C' }).catch(() => {});
                    })
                    .catch(() => {});
            }
        }
    }, []);

    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/mappa" element={<MapPage />} />
                    <Route path="/calendario" element={<CalendarPage />} />
                    <Route path="/archivio" element={<ArchivePage />} />
                    <Route path="/festival/:id" element={<FestivalDetails />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/segnala-sagra" element={<SubmitFestival />} />
                </Routes>
            </Suspense>
            <InstallAppBanner />
            <BottomNav />
        </BrowserRouter>
    );
};

export default App;