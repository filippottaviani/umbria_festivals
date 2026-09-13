import React from 'react';
import { Link } from 'react-router-dom';
import UmbriaLogo from './UmbriaLogo';

const currentYear = new Date().getFullYear();

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                {/* Brand + tagline */}
                <div>
                    <div className="footer-brand">
                        <UmbriaLogo size={22} color="rgba(255,255,255,0.85)" />
                        <span className="footer-brand-name">SagraUmbra</span>
                    </div>
                    <p className="footer-tagline">
                        Il portale delle sagre, feste popolari e tradizioni enogastronomiche
                        dei borghi umbri — da Perugia a Terni.
                    </p>
                </div>

                {/* Nav links */}
                <nav className="footer-links" aria-label="Footer navigation">
                    <Link to="/" className="footer-link">Sagre</Link>
                    <Link to="/mappa" className="footer-link">Mappa</Link>
                    <Link to="/calendario" className="footer-link">Calendario</Link>
                    <Link to="/segnala-sagra" className="footer-link">Segnala Sagra</Link>
                </nav>
            </div>

            <hr className="footer-divider" />

            <div className="footer-bottom">
                <span>© {currentYear} SagraUmbra — Tutti i diritti riservati</span>
                <span>Fatto con ❤️ per i borghi dell'Umbria</span>
            </div>
        </footer>
    );
}
