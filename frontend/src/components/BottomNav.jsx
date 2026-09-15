import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
    const location = useLocation();
    const currentPath = location.pathname;

    const isActive = (path) => {
        if (path === '/') return currentPath === '/';
        return currentPath.startsWith(path);
    };

    return (
        <nav className="mobile-bottom-nav" aria-label="Navigazione rapida mobile">
            <Link 
                to="/" 
                className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
                aria-label="Sagre"
            >
                <div className="bottom-nav-icon-wrap">
                    <span className="material-symbols-rounded">grid_view</span>
                </div>
                <span className="bottom-nav-label">Sagre</span>
            </Link>

            <Link 
                to="/mappa" 
                className={`bottom-nav-item ${isActive('/mappa') ? 'active' : ''}`}
                aria-label="Mappa"
            >
                <div className="bottom-nav-icon-wrap">
                    <span className="material-symbols-rounded">map</span>
                </div>
                <span className="bottom-nav-label">Mappa</span>
            </Link>

            <Link 
                to="/calendario" 
                className={`bottom-nav-item ${isActive('/calendario') ? 'active' : ''}`}
                aria-label="Calendario"
            >
                <div className="bottom-nav-icon-wrap">
                    <span className="material-symbols-rounded">calendar_month</span>
                </div>
                <span className="bottom-nav-label">Calendario</span>
            </Link>

            <Link 
                to="/segnala-sagra" 
                className={`bottom-nav-item ${isActive('/segnala-sagra') ? 'active' : ''}`}
                aria-label="Segnala Sagra"
            >
                <div className="bottom-nav-icon-wrap highlight">
                    <span className="material-symbols-rounded">campaign</span>
                </div>
                <span className="bottom-nav-label">Segnala</span>
            </Link>
        </nav>
    );
}
