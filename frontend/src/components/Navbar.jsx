import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import UmbriaLogo from './UmbriaLogo';
import { useFavorites } from '../services/favorites';

const Navbar = ({ search, setSearch, showSearch = false }) => {
    const location = useLocation();
    const currentPath = location.pathname;
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const { count: favoritesCount } = useFavorites();

    const isActive = (path) => {
        if (path === '/') return currentPath === '/';
        return currentPath.startsWith(path);
    };

    return (
        <header className="navbar-wrapper">
            <nav className="navbar" aria-label="Navigazione principale">
                <div className="navbar-inner">
                    <Link to="/" className="navbar-brand">
                        <UmbriaLogo size={28} color="#FFFFFF" />
                        <span>Sagra<strong>Umbra</strong></span>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="navbar-nav-links">
                        <Link to="/" className={`nav-tab-link ${isActive('/') ? 'active' : ''}`}>
                            <span className="material-symbols-rounded">grid_view</span>
                            <span className="nav-tab-text">Sagre</span>
                        </Link>
                        <Link to="/mappa" className={`nav-tab-link ${isActive('/mappa') ? 'active' : ''}`}>
                            <span className="material-symbols-rounded">map</span>
                            <span className="nav-tab-text">Mappa</span>
                        </Link>
                        <Link to="/calendario" className={`nav-tab-link ${isActive('/calendario') ? 'active' : ''}`}>
                            <span className="material-symbols-rounded">calendar_month</span>
                            <span className="nav-tab-text">Calendario</span>
                        </Link>
                        <Link to="/archivio" className={`nav-tab-link ${isActive('/archivio') ? 'active' : ''}`}>
                            <span className="material-symbols-rounded">history_edu</span>
                            <span className="nav-tab-text">Archivio</span>
                        </Link>
                        <Link to="/preferiti" className={`nav-tab-link ${isActive('/preferiti') ? 'active' : ''}`} style={{ position: 'relative' }}>
                            <span className="material-symbols-rounded" style={{ color: favoritesCount > 0 ? '#EF4444' : 'inherit' }}>
                                {favoritesCount > 0 ? 'favorite' : 'favorite_border'}
                            </span>
                            <span className="nav-tab-text">Preferiti</span>
                            {favoritesCount > 0 && (
                                <span style={{
                                    marginLeft: '3px',
                                    background: '#EF4444',
                                    color: '#fff',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    lineHeight: '1.2'
                                }}>
                                    {favoritesCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Desktop Search */}
                    {showSearch && (
                        <div className="navbar-search desktop-only-search">
                            <span className="material-symbols-rounded">search</span>
                            <input
                                type="text"
                                placeholder="Cerca sagra o borgo..."
                                value={search || ''}
                                onChange={e => setSearch && setSearch(e.target.value)}
                                aria-label="Cerca sagra o borgo"
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="search-clear-btn"
                                    onClick={() => setSearch && setSearch('')}
                                    aria-label="Cancella ricerca"
                                >
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="navbar-actions">
                        {/* Mobile Search Toggle Button */}
                        {showSearch && (
                            <button
                                type="button"
                                className={`mobile-search-toggle-btn ${mobileSearchOpen ? 'active' : ''}`}
                                onClick={() => setMobileSearchOpen(prev => !prev)}
                                aria-label={mobileSearchOpen ? "Chiudi ricerca" : "Cerca sagra"}
                            >
                                <span className="material-symbols-rounded">
                                    {mobileSearchOpen ? 'close' : 'search'}
                                </span>
                            </button>
                        )}

                        <ThemeToggle />

                        <Link to="/segnala-sagra" className={`nav-submit-btn ${isActive('/segnala-sagra') ? 'active' : ''}`}>
                            <span className="material-symbols-rounded">campaign</span>
                            <span className="action-btn-text">Segnala Sagra</span>
                        </Link>

                        <Link to="/admin" className={`admin-link-btn ${isActive('/admin') ? 'active' : ''}`} title="Pannello Amministrazione">
                            <span className="material-symbols-rounded">settings</span>
                            <span className="action-btn-text">Admin</span>
                        </Link>
                    </div>
                </div>

                {/* Mobile Search Bar Dropdown */}
                {showSearch && mobileSearchOpen && (
                    <div className="mobile-search-bar animate-slide-down">
                        <div className="mobile-search-inner">
                            <span className="material-symbols-rounded search-icon">search</span>
                            <input
                                type="text"
                                placeholder="Cerca sagra, piatto, borgo..."
                                value={search || ''}
                                onChange={e => setSearch && setSearch(e.target.value)}
                                autoFocus
                                aria-label="Cerca sagra o borgo su mobile"
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="search-clear-btn"
                                    onClick={() => setSearch && setSearch('')}
                                    aria-label="Cancella testo ricerca"
                                >
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Navbar;
