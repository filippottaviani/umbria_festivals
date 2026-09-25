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
                        <UmbriaLogo size={28} negative />
                        <span className="footer-brand-name">SagraUmbra</span>
                    </div>
                    <p className="footer-tagline">
                        Il portale delle sagre, feste popolari e tradizioni enogastronomiche
                        dei borghi umbri, tra Perugia e Terni.
                    </p>
                </div>

                {/* Nav links */}
                <div className="footer-links-group">
                    <nav className="footer-links-col" aria-label="Navigazione principale">
                        <span className="footer-section-title">
                            Esplora
                        </span>
                        <div className="footer-links-list">
                            <Link to="/" className="footer-link">Tutte le Sagre</Link>
                            <Link to="/mappa" className="footer-link">Mappa Interattiva</Link>
                            <Link to="/calendario" className="footer-link">Calendario Weekend</Link>
                            <Link to="/archivio" className="footer-link">Archivio Storico</Link>
                            <Link to="/segnala-sagra" className="footer-link">Segnala una Sagra</Link>
                        </div>
                    </nav>

                    <nav className="footer-links-col" aria-label="Sagre per territorio">
                        <span className="footer-section-title">
                            Territorio
                        </span>
                        <div className="footer-links-list">
                            <Link to="/mappa?provincia=PG" className="footer-link">Sagre a Perugia</Link>
                            <Link to="/mappa?provincia=TR" className="footer-link">Sagre a Terni</Link>
                        </div>
                    </nav>

                    <nav className="footer-links-col" aria-label="Specialità enogastronomiche">
                        <span className="footer-section-title">
                            Sapori Tipici
                        </span>
                        <div className="footer-links-list">
                            <Link to="/?search=tartufo" className="footer-link">Tartufo e Norcineria</Link>
                            <Link to="/?search=torta+al+testo" className="footer-link">Torta al Testo</Link>
                            <Link to="/?search=strangozzi" className="footer-link">Strangozzi &amp; Primi</Link>
                            <Link to="/?search=rievocazione" className="footer-link">Feste Medievali</Link>
                        </div>
                    </nav>
                </div>
            </div>

            <hr className="footer-divider" />

            <div className="footer-bottom">
                <span>© {currentYear} SagraUmbra. Tutti i diritti riservati.</span>
                <span>Fatto con passione per i borghi dell'Umbria</span>
            </div>
        </footer>
    );
}
