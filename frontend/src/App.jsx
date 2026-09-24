import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Lazy loading route components for code splitting & faster initial load
const Home = lazy(() => import('./pages/Home'));
const MapPage = lazy(() => import('./pages/MapPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const FestivalDetails = lazy(() => import('./pages/FestivalDetails'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
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
            const initStatusBar = async () => {
                try {
                    let StatusBar = window.Capacitor?.Plugins?.StatusBar;
                    let Style = { Dark: 'DARK' };
                    if (!StatusBar) {
                        const pkgName = '@capacitor/status-bar';
                        const mod = await import(/* @vite-ignore */ pkgName);
                        StatusBar = mod.StatusBar;
                        Style = mod.Style;
                    }
                    if (StatusBar) {
                        // Prevent status bar from overlapping webview content
                        await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
                        await StatusBar.setStyle({ style: Style?.Dark || 'DARK' }).catch(() => {});
                        await StatusBar.setBackgroundColor({ color: '#2A4B3C' }).catch(() => {});
                    }
                } catch (e) {
                    console.warn('StatusBar initialization error:', e);
                }
            };
            initStatusBar();
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
                    <Route path="/preferiti" element={<FavoritesPage />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/segnala-sagra" element={<SubmitFestival />} />
                </Routes>
            </Suspense>
            {/* Global Artistic Olive Branch Watermark (Filigrana - Tema Scuro) */}
            <div className="page-watermark" aria-hidden="true" />

            <InstallAppBanner />
            <BottomNav />
        </BrowserRouter>
    );
};

export default App;