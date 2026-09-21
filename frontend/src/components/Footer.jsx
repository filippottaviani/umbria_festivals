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
                <div className="footer-links-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                    <nav className="footer-links-col" aria-label="Navigazione principale">
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '0.6rem' }}>
                            Esplora
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <Link to="/" className="footer-link">Tutte le Sagre</Link>
                            <Link to="/mappa" className="footer-link">Mappa Interattiva</Link>
                            <Link to="/calendario" className="footer-link">Calendario Weekend</Link>
                            <Link to="/archivio" className="footer-link">Archivio Storico</Link>
                            <Link to="/segnala-sagra" className="footer-link">Segnala una Sagra</Link>
                        </div>
                    </nav>

                    <nav className="footer-links-col" aria-label="Sagre per territorio">
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '0.6rem' }}>
                            Territorio
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <Link to="/mappa?provincia=PG" className="footer-link">Sagre a Perugia</Link>
                            <Link to="/mappa?provincia=TR" className="footer-link">Sagre a Terni</Link>
                        </div>
                    </nav>

                    <nav className="footer-links-col" aria-label="Specialità enogastronomiche">
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '0.6rem' }}>
                            Sapori Tipici
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <Link to="/" className="footer-link">Tartufo e Norcineria</Link>
                            <Link to="/" className="footer-link">Torta al Testo</Link>
                            <Link to="/" className="footer-link">Strangozzi &amp; Primi</Link>
                            <Link to="/" className="footer-link">Feste Medievali</Link>
                        </div>
                    </nav>
                </div>
            </div>

            <hr className="footer-divider" />

            <div className="footer-bottom">
                <span>© {currentYear} SagraUmbra — Tutti i diritti riservati</span>
                <span>Fatto con ❤️ per i borghi dell'Umbria</span>
            </div>
        </footer>
    );
}
