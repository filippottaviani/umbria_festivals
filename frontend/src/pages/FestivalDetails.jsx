import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFestivalById } from '../services/api';
import { CATS } from '../constants';
import ThemeToggle from '../components/ThemeToggle';

const fmtDateLong = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }) : '—';

const fmtDateShort = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric'
    }) : '—';

const inferCategory = (f) => {
    const text = `${f.name || ''} ${f.description || ''} ${f.menu_info || ''} ${f.city || ''}`.toLowerCase();
    if (/(tartufo|truffle)/.test(text)) return 'tartufo';
    if (/(pesce|baccalà|lago|giacchio)/.test(text)) return 'pesce';
    if (/(gnocchi|pasta|spaghetto|ciriola|umbrichell|tagliatella|ravioli|primi)/.test(text)) return 'pasta';
    if (/(cinghiale|carne|arrosticini|griglia|maiale|stramaialata|porchetta|oca)/.test(text)) return 'carne';
    if (/(salumi|prosciutto|norcina)/.test(text)) return 'salumi';
    if (/(cipolla|ortolano|asparagi|verdura|patata|fungo)/.test(text)) return 'orto';
    if (/(pane|grano|frittella|focaccia|bruschetta|pizza|torta al testo)/.test(text)) return 'grano';
    if (/(gaite|storica|rievocazione|palio|duca|carbone)/.test(text)) return 'storica';
    return 'popolare';
};

export default function FestivalDetails() {
    const { id } = useParams();
    const [festival, setFestival] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await fetchFestivalById(id);
                setFestival(data);
            } catch {
                setError('Impossibile caricare i dettagli della sagra.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    if (isLoading) return (
        <div className="status-container"><div className="spinner" /></div>
    );

    if (error || !festival) return (
        <div className="status-container">
            <p style={{ color: 'var(--antracite-2)', fontSize: '0.9rem' }}>
                {error || 'Sagra non trovata'}
            </p>
            <Link to="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.2rem', background: 'var(--cypress)', color: '#fff',
                borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600
            }}>
                Torna alla lista
            </Link>
        </div>
    );

    const catKey = festival.cat || festival.category || inferCategory(festival);
    const catInfo = CATS[catKey] || CATS['popolare'];
    const lat = festival.latitude  || 43.1107;
    const lon = festival.longitude || 12.3908;

    const province_name = festival.province === 'PG' ? 'Perugia' : 'Terni';

    const TOWN_FALLBACKS = {
        'Perugia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg',
        'Assisi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/AssisiDec122023_03.jpg/1280px-AssisiDec122023_03.jpg',
        'Gubbio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg',
        'Foligno': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Foligno_Piazza_della_Repubblica.jpg/1280px-Foligno_Piazza_della_Repubblica.jpg',
        'Spoleto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Spoleto_Piazza_del_Duomo.jpg/1280px-Spoleto_Piazza_del_Duomo.jpg',
        'Norcia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Norcia_piazza_San_Benedetto.jpg/1280px-Norcia_piazza_San_Benedetto.jpg',
        'Orvieto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Duomo_Orvieto.jpg/1280px-Duomo_Orvieto.jpg',
        'Narni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1280px-Ponte_di_Augusto_a_Narni.jpg',
    };
    const fallbackHero = TOWN_FALLBACKS[festival.city] || TOWN_FALLBACKS['Perugia'];
    const heroImg = festival.image_url || fallbackHero;

    return (
        <div className="festival-details-page animate-fade-in">

            {/* ── HERO ── */}
            <div className="details-hero">
                <img
                    src={heroImg}
                    alt={festival.city}
                    onError={(e) => {
                        if (e.target.src !== fallbackHero) {
                            e.target.src = fallbackHero;
                        }
                    }}
                />

                <div className="details-hero-overlay">
                    <div className="details-hero-topbar">
                        <Link to="/" className="details-hero-back">
                            <span className="material-symbols-rounded">arrow_back</span>
                            Lista eventi
                        </Link>
                        <ThemeToggle />
                    </div>

                    <div className="details-hero-inner">
                        <span className="details-hero-badge">{catInfo.label}</span>
                        <h1>{festival.name}</h1>
                        <div className="details-hero-meta">
                            <div className="details-hero-meta-item">
                                <span className="material-symbols-rounded">location_on</span>
                                {festival.city}, Prov. {province_name}
                            </div>
                            <div className="details-hero-meta-item">
                                <span className="material-symbols-rounded">calendar_today</span>
                                {fmtDateShort(festival.start_date)} – {fmtDateShort(festival.end_date)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="details-body">

                {/* ── MAIN COLUMN ── */}
                <div className="details-main">

                    {/* Il Borgo */}
                    <div className="details-card">
                        <div className="details-card-header">
                            <span className="material-symbols-rounded">villa</span>
                            <h2>Il Borgo di {festival.city}</h2>
                        </div>
                        <div className="details-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
                            {formatText(festival.cultural_info || `${festival.city} è un incantevole borgo dell'Umbria, ricco di storia e tradizioni millenarie, immerso nella natura del territorio umbro.`)}
                        </div>
                    </div>

                    {/* L'Evento */}
                    {festival.description && (
                        <div className="details-card">
                            <div className="details-card-header">
                                <span className="material-symbols-rounded">festival</span>
                                <h2>L'Evento</h2>
                            </div>
                            <div className="details-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                {formatText(festival.description)}
                            </div>
                        </div>
                    )}

                    {/* Menù */}
                    {festival.menu_info && (
                        <div className="details-card">
                            <div className="details-card-header">
                                <span className="material-symbols-rounded">restaurant_menu</span>
                                <h2>Menù e Gastronomia</h2>
                            </div>
                            <div className="details-card-body" style={{ paddingTop: '1.25rem' }}>
                                <MenuRenderer text={festival.menu_info} />
                            </div>
                        </div>
                    )}

                    {/* Il Piatto tipico */}
                    {festival.dish_info && (
                        <div className="details-card">
                            <div className="details-card-header">
                                <span className="material-symbols-rounded">local_dining</span>
                                <h2>Il Piatto Tipico</h2>
                            </div>
                            <div className="details-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                {formatText(festival.dish_info)}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── SIDEBAR ── */}
                <div className="details-sidebar">

                    {/* Info card */}
                    <div className="details-info-card">
                        <div className="info-row">
                            <span className="material-symbols-rounded">location_on</span>
                            <div className="info-row-content">
                                <span className="info-row-label">Comune</span>
                                <span className="info-row-value">{festival.city}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <span className="material-symbols-rounded">map</span>
                            <div className="info-row-content">
                                <span className="info-row-label">Provincia</span>
                                <span className="info-row-value">{province_name} ({festival.province})</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <span className="material-symbols-rounded">today</span>
                            <div className="info-row-content">
                                <span className="info-row-label">Inizio</span>
                                <span className="info-row-value">{fmtDateLong(festival.start_date)}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <span className="material-symbols-rounded">event</span>
                            <div className="info-row-content">
                                <span className="info-row-label">Fine</span>
                                <span className="info-row-value">{fmtDateLong(festival.end_date)}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <span className="material-symbols-rounded">category</span>
                            <div className="info-row-content">
                                <span className="info-row-label">Categoria</span>
                                <span className="info-row-value">{catInfo.label}</span>
                            </div>
                        </div>
                        {festival.source_url && (
                            <a
                                href={festival.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-source-link"
                            >
                                <span className="material-symbols-rounded">open_in_new</span>
                                Sito Ufficiale
                            </a>
                        )}
                    </div>

                    {/* Map card */}
                    <div className="details-map-card">
                        <MapContainer
                            center={[lat, lon]}
                            zoom={13}
                            scrollWheelZoom={false}
                            style={{ height: '240px', width: '100%' }}
                            zoomControl={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                            />
                            <CircleMarker
                                center={[lat, lon]}
                                radius={9}
                                pathOptions={{
                                    color: '#2A4B3C',
                                    fillColor: '#2A4B3C',
                                    fillOpacity: 0.9,
                                    weight: 2
                                }}
                            >
                                <Popup>
                                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.85rem', fontWeight: 600 }}>
                                        {festival.name}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#5C6661', marginTop: '2px' }}>
                                        {festival.city} ({festival.province})
                                    </div>
                                </Popup>
                            </CircleMarker>
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

const formatText = (text) => {
    if (!text) return null;
    return text.split('\n').filter(p => p.trim()).map((p, i) => (
        <p key={i} style={{ margin: 0 }}>{p.trim()}</p>
    ));
};

/** Parse and render menu text with section headers */
function MenuRenderer({ text }) {
    if (!text) return null;

    // Se il testo è troppo breve o è la frase generica di fallback, mostriamo un avviso
    const isGenericFallback = text.includes("Gli stand enogastronomici offriranno primi piatti") || text.trim().length < 25;

    if (isGenericFallback) {
        return (
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'var(--travertino-2)', borderRadius: 'var(--radius-md)', color: 'var(--antracite-2)' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--antracite-3)' }}>info</span>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>Il menù dettagliato con l'elenco dei piatti non è al momento disponibile per questa edizione. Ti consigliamo di consultare i canali ufficiali della sagra.</p>
            </div>
        );
    }

    const lines = text.split('\n').filter(l => l.trim());
    return (
        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {lines.map((line, i) => {
                const trimmed = line.trim();
                const isHeader = trimmed.endsWith(':') && !trimmed.startsWith('-') && trimmed.length < 60;
                
                if (isHeader) return (
                    <li key={i} className="menu-section-title" style={{ fontWeight: 600, color: 'var(--cypress)', marginTop: i > 0 ? '1rem' : 0, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem', fontSize: '1.05rem' }}>
                        {trimmed.replace(/:$/, '')}
                    </li>
                );
                
                return (
                    <li key={i} className="menu-item" style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--sagrantino)', marginTop: '2px' }}>restaurant</span>
                        <span style={{ fontSize: '0.95rem', color: 'var(--antracite)' }}>{trimmed.replace(/^[-•]\s*/, '')}</span>
                    </li>
                );
            })}
        </ul>
    );
}
