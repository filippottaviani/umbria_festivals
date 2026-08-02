import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import UmbriaLogo from './UmbriaLogo';

const Navbar = ({ search, setSearch, showSearch = false }) => {
    const location = useLocation();
    const currentPath = location.pathname;

    const isActive = (path) => {
        if (path === '/') return currentPath === '/';
        return currentPath.startsWith(path);
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand">
                    <UmbriaLogo size={28} color="#FFFFFF" />
                    <span>Sagra<strong>Umbra</strong></span>
                </Link>

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
                </div>

                {showSearch && (
                    <div className="navbar-search">
                        <span className="material-symbols-rounded">search</span>
                        <input
                            type="text"
                            placeholder="Cerca sagra o borgo..."
                            value={search || ''}
                            onChange={e => setSearch && setSearch(e.target.value)}
                        />
                    </div>
                )}

                <div className="navbar-actions">
                    <ThemeToggle />

                    <Link to="/segnala-sagra" className={`nav-submit-btn ${isActive('/segnala-sagra') ? 'active' : ''}`}>
                        <span className="material-symbols-rounded">campaign</span>
                        <span className="action-btn-text">Segnala Sagra</span>
                    </Link>

                    <Link to="/admin" className={`admin-link-btn ${isActive('/admin') ? 'active' : ''}`}>
                        <span className="material-symbols-rounded">settings</span>
                        <span className="action-btn-text">Admin</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
