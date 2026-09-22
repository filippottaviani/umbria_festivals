import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFavorites } from '../services/favorites';

export default function BottomNav() {
    const location = useLocation();
    const currentPath = location.pathname;
    const { count: favoritesCount } = useFavorites();

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
                to="/preferiti" 
                className={`bottom-nav-item ${isActive('/preferiti') ? 'active' : ''}`}
                aria-label="Preferiti"
            >
                <div className="bottom-nav-icon-wrap" style={{ position: 'relative' }}>
                    <span className="material-symbols-rounded" style={{ color: favoritesCount > 0 ? '#EF4444' : 'inherit' }}>
                        {favoritesCount > 0 ? 'favorite' : 'favorite_border'}
                    </span>
                    {favoritesCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-6px',
                            background: '#EF4444',
                            color: '#fff',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            borderRadius: '10px',
                            padding: '1px 5px',
                            lineHeight: 1
                        }}>
                            {favoritesCount}
                        </span>
                    )}
                </div>
                <span className="bottom-nav-label">Preferiti</span>
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
