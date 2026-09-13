import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFestivalById, fetchReviews, postReview, getImageUrl } from '../services/api';
import { CATS } from '../constants';
import ThemeToggle from '../components/ThemeToggle';
import ForkRating from '../components/ForkRating';
import PosterModal from '../components/PosterModal';
import WeatherBadge from '../components/WeatherBadge';
import CalendarExport from '../components/CalendarExport';
import Footer from '../components/Footer';

const fmtDateLong = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }) : '—';

const fmtDateShort = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric'
    }) : '—';

const fmtReviewDate = (d) =>
    d ? new Date(d).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
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
    const [showPosterModal, setShowPosterModal] = useState(false);
    const [reviewsSummary, setReviewsSummary] = useState({
        average_rating: null,
        review_count: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviews: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state
    const [ratingInput, setRatingInput] = useState(5);
    const [authorInput, setAuthorInput] = useState('');
    const [commentInput, setCommentInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [festData, revSummary] = await Promise.all([
                    fetchFestivalById(id),
                    fetchReviews(id).catch(() => ({ average_rating: null, review_count: 0, rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, reviews: [] }))
                ]);
                setFestival(festData);
                setReviewsSummary(revSummary);
            } catch {
                setError('Impossibile caricare i dettagli della sagra.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!commentInput.trim()) {
            setSubmitError('Inserisci un commento prima di inviare.');
            return;
        }
        setIsSubmitting(true);
        setSubmitError('');
        try {
            await postReview(id, {
                author_name: authorInput.trim() || 'Anonimo',
                rating: ratingInput,
                comment: commentInput.trim()
            });

            // Reload reviews summary
            const updatedSummary = await fetchReviews(id);
            setReviewsSummary(updatedSummary);

            setCommentInput('');
            setAuthorInput('');
            setRatingInput(5);
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 4000);
        } catch {
            setSubmitError('Errore durante l\'invio della recensione. Riprova più tardi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const scrollToForm = () => {
        const el = document.getElementById('voting-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    if (isLoading) return (
        <div className="festival-details-page">
            <div className="status-container"><div className="spinner" /></div>
        </div>
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
    const heroImg = getImageUrl(festival.image_url, fallbackHero);

    const currentAvgRating = reviewsSummary.average_rating ?? festival.average_rating;
    const currentReviewCount = reviewsSummary.review_count ?? festival.review_count;

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

                        {/* LEFT — breadcrumb nav */}
                        <nav className="hero-nav-group" aria-label="Navigazione">
                            <Link to="/" className="hero-back-btn" aria-label="Torna alle sagre">
                                <span className="material-symbols-rounded">arrow_back</span>
                                <span>Sagre</span>
                            </Link>
                            <span className="hero-nav-sep" aria-hidden="true">/</span>
                            <Link to="/mappa" className="hero-nav-link">
                                <span className="material-symbols-rounded" style={{ fontSize: 15 }}>map</span>
                                Mappa
                            </Link>
                            <span className="hero-nav-sep" aria-hidden="true">/</span>
                            <Link to="/calendario" className="hero-nav-link">
                                <span className="material-symbols-rounded" style={{ fontSize: 15 }}>calendar_month</span>
                                Calendario
                            </Link>
                        </nav>

                        {/* RIGHT — actions pill */}
                        <div className="hero-actions-pill" role="toolbar" aria-label="Azioni pagina">
                            <CalendarExport festival={festival} />
                            <div className="hero-pill-divider" aria-hidden="true" />
                            <button
                                type="button"
                                className="hero-action-btn"
                                onClick={() => setShowPosterModal(true)}
                                aria-label="Modifica locandina"
                                title="Modifica Locandina"
                            >
                                <span className="material-symbols-rounded">add_photo_alternate</span>
                                <span className="hero-btn-label">Locandina</span>
                            </button>
                            <div className="hero-pill-divider" aria-hidden="true" />
                            <ThemeToggle />
                        </div>

                    </div>


                    <div className="details-hero-inner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span className="details-hero-badge">{catInfo.label}</span>
                            {festival.latitude && festival.longitude && (
                                <WeatherBadge latitude={festival.latitude} longitude={festival.longitude} />
                            )}
                            {currentAvgRating && (
                                <div className="hero-rating-badge">
                                    <ForkRating rating={currentAvgRating} size={16} showScore activeColor="#F59E0B" />
                                    <span className="hero-rating-count">({currentReviewCount})</span>
                                </div>
                            )}
                        </div>
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

            {/* ── BODY (COLONNA PRINCIPALE + SIDEBAR DESTRA) ── */}
            <div className="details-body">

                {/* ── MAIN COLUMN (INFO SAGRA) ── */}
                <div className="details-main">

                    {/* Il Borgo */}
                    <div className="details-card">
                        <div className="details-card-header">
                            <span className="material-symbols-rounded">villa</span>
                            <h2>Il Borgo di {festival.city}</h2>
                        </div>
                        <div className="details-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
                            <div className="card-divider" />
                            {festival.city_info && festival.city_info.status === 'VERIFIED' ? (
                                <div className="wiki-content">
                                    <p>{festival.city_info.wiki_summary}</p>
                                    <a href={festival.city_info.wiki_url} target="_blank" rel="noreferrer" className="wiki-link">
                                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>language</span>
                                        Leggi di più su Wikipedia
                                    </a>
                                </div>
                            ) : (
                                formatText(festival.cultural_info || `${festival.city} è un incantevole borgo dell'Umbria, ricco di storia e tradizioni millenarie, immerso nella natura del territorio umbro.`)
                            )}
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

                    {/* Programma & Concerti Giorno per Giorno */}
                    {festival.program_info && (
                        <div className="details-card">
                            <div className="details-card-header">
                                <span className="material-symbols-rounded" style={{ color: 'var(--fork-active, #D97706)' }}>music_note</span>
                                <h2>Programma & Concerti Giorno per Giorno</h2>
                            </div>
                            <div className="details-card-body" style={{ paddingTop: '1.25rem' }}>
                                <ProgramRenderer text={festival.program_info} />
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

                {/* ── SIDEBAR DESTRA (PROSPETTO VOTAZIONI IN ALTO + INFO + MAPPA) ── */}
                <div className="details-sidebar">

                    {/* PROSPETTO VOTAZIONI OTTENUTE (IN ALTO A DESTRA) */}
                    <div className="details-sidebar-card sidebar-prospetto-card">
                        <div className="details-card-header">
                            <span className="material-symbols-rounded" style={{ color: 'var(--fork-active, #D97706)' }}>restaurant</span>
                            <h2>Prospetto Votazioni</h2>
                        </div>
                        <div className="details-card-body" style={{ padding: '1.25rem' }}>
                            <div className="sidebar-score-header">
                                <div className="big-score">
                                    {currentAvgRating ? currentAvgRating.toFixed(1) : '—'}
                                    <span className="max-score">/ 5</span>
                                </div>
                                <ForkRating rating={currentAvgRating || 0} size={22} activeColor="#D97706" />
                                <div className="total-reviews-count">
                                    {currentReviewCount === 0 ? 'Nessuna recensione finora' : `${currentReviewCount} valutazion${currentReviewCount === 1 ? 'e' : 'i'} in forchette`}
                                </div>
                            </div>

                            <div className="reviews-distribution" style={{ marginTop: '1.25rem' }}>
                                {[5, 4, 3, 2, 1].map((stars) => {
                                    const count = reviewsSummary.rating_breakdown[stars] || 0;
                                    const percent = currentReviewCount > 0 ? (count / currentReviewCount) * 100 : 0;
                                    return (
                                        <div key={stars} className="dist-row">
                                            <span className="dist-label">{stars} 🍴</span>
                                            <div className="dist-bar-track">
                                                <div className="dist-bar-fill" style={{ width: `${percent}%` }} />
                                            </div>
                                            <span className="dist-count">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                className="btn-vote-shortcut"
                                onClick={scrollToForm}
                            >
                                <span className="material-symbols-rounded">rate_review</span>
                                Vota questa sagra
                            </button>
                        </div>
                    </div>

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
                        {currentAvgRating && (
                            <div className="info-row">
                                <span className="material-symbols-rounded">restaurant</span>
                                <div className="info-row-content">
                                    <span className="info-row-label">Media Forchette</span>
                                    <span className="info-row-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <ForkRating rating={currentAvgRating} size={15} showScore activeColor="#D97706" />
                                    </span>
                                </div>
                            </div>
                        )}
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
                    {festival.latitude && festival.longitude && (
                        <div className="details-map-card">
                            <MapContainer
                                center={[festival.latitude, festival.longitude]}
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
                                    center={[festival.latitude, festival.longitude]}
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
                    )}
                </div>
            </div>

            {/* ── SEZIONE VOTAZIONE E RECENSIONI (IN FONDO ALLA PAGINA) ── */}
            <div id="voting-section" className="bottom-voting-container">
                <div className="details-card reviews-card">
                    <div className="details-card-header">
                        <span className="material-symbols-rounded" style={{ color: 'var(--sagrantino)' }}>rate_review</span>
                        <h2>Vota la Sagra ed Esprimi il tuo Giudizio ({currentReviewCount})</h2>
                    </div>
                    <div className="details-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Form inserimento recensione */}
                        <div className="review-form-card">
                            <h3>Lascia il tuo voto in forchette a {festival.name}</h3>
                            <p style={{ fontSize: '0.88rem', color: 'var(--antracite-2)', marginBottom: '1.25rem' }}>
                                Hai partecipato a questa sagra? Esprimi la tua opinione assegnando da 1 a 5 forchette a 3 punte!
                            </p>

                            {submitSuccess && (
                                <div className="alert-success-box">
                                    <span className="material-symbols-rounded">check_circle</span>
                                    Grazie! La tua recensione a forchette è stata pubblicata con successo.
                                </div>
                            )}

                            {submitError && (
                                <div className="alert-error-box">
                                    <span className="material-symbols-rounded">error</span>
                                    {submitError}
                                </div>
                            )}

                            <form onSubmit={handleSubmitReview} className="review-form">
                                <div className="form-group">
                                    <label className="form-label">Seleziona il voto (1 - 5 forchette)</label>
                                    <div className="picker-wrapper">
                                        <ForkRating
                                            rating={ratingInput}
                                            size={36}
                                            interactive
                                            onRatingChange={(val) => setRatingInput(val)}
                                            activeColor="#D97706"
                                        />
                                        <span className="picker-hint">{ratingInput} su 5 forchette</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="authorName" className="form-label">Il tuo Nome o Soprannome (opzionale)</label>
                                    <input
                                        id="authorName"
                                        type="text"
                                        className="form-input"
                                        placeholder="Es. Marco da Perugia"
                                        value={authorInput}
                                        onChange={(e) => setAuthorInput(e.target.value)}
                                        maxLength={50}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="commentText" className="form-label">La tua Recensione *</label>
                                    <textarea
                                        id="commentText"
                                        className="form-textarea"
                                        placeholder="Racconta la tua esperienza: la qualità del cibo, l'atmosfera del borgo, l'organizzazione dei tavoli..."
                                        rows={4}
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        required
                                        maxLength={1500}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-submit-review"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-sm" />
                                            Invio in corso...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-rounded">send</span>
                                            Pubblica Recensione
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Reviews list */}
                        <div className="reviews-list-section">
                            <h3>Recensioni inviate dai visitatori ({reviewsSummary.reviews.length})</h3>
                            {reviewsSummary.reviews.length === 0 ? (
                                <div className="empty-reviews-state">
                                    <span className="material-symbols-rounded" style={{ fontSize: 36, color: 'var(--antracite-3)' }}>flatware</span>
                                    <p>Ancora nessuna recensione pubblicata. Sii il primo a esprimere un giudizio per questa sagra!</p>
                                </div>
                            ) : (
                                <div className="reviews-feed">
                                    {reviewsSummary.reviews.map((rev) => (
                                        <div key={rev.id} className="review-feed-item">
                                            <div className="review-feed-header">
                                                <div className="author-info">
                                                    <div className="author-avatar">
                                                        {rev.author_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="author-name">{rev.author_name}</div>
                                                        <div className="review-date">{fmtReviewDate(rev.created_at)}</div>
                                                    </div>
                                                </div>
                                                <ForkRating rating={rev.rating} size={18} activeColor="#D97706" />
                                            </div>
                                            <p className="review-comment-text">{rev.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showPosterModal && (
                <PosterModal
                    festival={festival}
                    onClose={() => setShowPosterModal(false)}
                    onUpdated={(updated) => setFestival(updated)}
                />
            )}

            <Footer />
        </div>
    );
}

function renderInlineFormatting(str) {
    if (!str) return null;
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}

function formatText(text) {
    if (!text) return null;
    const paragraphs = text.split('\n').filter(p => p.trim());
    return paragraphs.map((p, i) => (
        <p key={i} style={{ margin: 0, marginBottom: i < paragraphs.length - 1 ? '0.65rem' : 0 }}>
            {renderInlineFormatting(p.trim())}
        </p>
    ));
}



/** Parse and render menu text with section headers */
function MenuRenderer({ text }) {
    if (!text) return null;

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

/** Parse and render day-by-day program and concerts */
function ProgramRenderer({ text }) {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {lines.map((line, i) => {
                const trimmed = line.trim();
                const isDayHeader = /(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|\b\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))\b/i.test(trimmed) || (trimmed.endsWith(':') && trimmed.length < 55);

                if (isDayHeader) return (
                    <div key={i} className="program-day-title" style={{ fontWeight: 700, color: 'var(--cypress)', marginTop: i > 0 ? '0.85rem' : 0, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--fork-active, #D97706)' }}>event</span>
                        {trimmed.replace(/:$/, '')}
                    </div>
                );

                const isConcert = /(concerto|live|musica|orchestra|dj|band|spettacolo|serata|pirotecnico|fuochi)/i.test(trimmed);

                return (
                    <div key={i} className="program-item" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: isConcert ? 'var(--travertino-2)' : 'transparent', padding: isConcert ? '0.5rem 0.75rem' : '0.2rem 0', borderRadius: 'var(--radius-sm)' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px', color: isConcert ? 'var(--sagrantino)' : 'var(--cypress-light)', marginTop: '1px' }}>
                            {isConcert ? 'music_note' : 'schedule'}
                        </span>
                        <span style={{ fontSize: '0.95rem', color: 'var(--antracite)', lineHeight: '1.6' }}>
                            {trimmed.replace(/^[-•]\s*/, '')}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
