import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFestivalById, fetchReviews, postReview, getImageUrl, fetchFestivals, uploadDishImage, uploadReviewPhoto } from '../services/api';
import { CATS, CAT_ICONS, lookupLocationCoordinates, inferCategory, TOWN_FALLBACKS } from '../constants';
import ThemeToggle from '../components/ThemeToggle';
import ForkRating from '../components/ForkRating';
import PosterModal from '../components/PosterModal';
import ShareModal from '../components/ShareModal';
import WeatherBadge from '../components/WeatherBadge';
import CalendarExport from '../components/CalendarExport';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useFavorites } from '../services/favorites';

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

export default function FestivalDetails() {
    const { id } = useParams();
    const { isFavorite, toggleFavorite } = useFavorites();
    const fav = isFavorite(id);

    const [festival, setFestival] = useState(null);
    const [relatedFestivals, setRelatedFestivals] = useState([]);
    const [showPosterModal, setShowPosterModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [lightboxPhoto, setLightboxPhoto] = useState(null);
    const [reviewPhotos, setReviewPhotos] = useState([]); // array of { file, preview }
    const [isUploadingDishPhoto, setIsUploadingDishPhoto] = useState(false);
    const dishFileInputRef = useRef(null);

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

                // Internal linking: fetch other festivals in the same province
                if (festData && festData.province) {
                    fetchFestivals(festData.province).then(list => {
                        const others = list.filter(f => f.id !== festData.id).slice(0, 4);
                        setRelatedFestivals(others);
                    }).catch(() => {});
                }
            } catch {
                setError('Impossibile caricare i dettagli della sagra.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    const handleReviewPhotosChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validPhotos = [];
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            if (file.size > 5 * 1024 * 1024) {
                alert(`Il file "${file.name}" supera i 5 MB consentiti.`);
                continue;
            }
            validPhotos.push({
                file,
                preview: URL.createObjectURL(file)
            });
        }

        setReviewPhotos(prev => [...prev, ...validPhotos].slice(0, 3));
    };

    const removeReviewPhoto = (index) => {
        setReviewPhotos(prev => {
            const copy = [...prev];
            const removed = copy.splice(index, 1);
            if (removed[0]?.preview) {
                URL.revokeObjectURL(removed[0].preview);
            }
            return copy;
        });
    };

    const handleDishImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Seleziona un file immagine valido (JPG, PNG, WEBP).');
            return;
        }
        setIsUploadingDishPhoto(true);
        try {
            const updated = await uploadDishImage(festival.id, file);
            setFestival(updated);
        } catch (err) {
            console.error('Errore upload foto piatto:', err);
            alert('Impossibile caricare la foto del piatto.');
        } finally {
            setIsUploadingDishPhoto(false);
            if (dishFileInputRef.current) dishFileInputRef.current.value = '';
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!commentInput.trim()) {
            setSubmitError('Inserisci un commento prima di inviare.');
            return;
        }
        setIsSubmitting(true);
        setSubmitError('');
        try {
            // Upload review photos if any
            let uploadedUrls = [];
            if (reviewPhotos.length > 0) {
                for (const p of reviewPhotos) {
                    try {
                        const res = await uploadReviewPhoto(id, p.file);
                        if (res?.url) uploadedUrls.push(res.url);
                    } catch (uploadErr) {
                        console.warn('Errore durante l\'upload della foto:', uploadErr);
                    }
                }
            }

            await postReview(id, {
                author_name: authorInput.trim() || 'Anonimo',
                rating: ratingInput,
                comment: commentInput.trim(),
                images: uploadedUrls
            });

            // Reload reviews summary
            const updatedSummary = await fetchReviews(id);
            setReviewsSummary(updatedSummary);

            // Clean review form
            reviewPhotos.forEach(p => p.preview && URL.revokeObjectURL(p.preview));
            setReviewPhotos([]);
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
    const catIcon = catInfo.icon || (CAT_ICONS && CAT_ICONS[catKey]) || 'festival';
    const coords = (festival.latitude && festival.longitude)
        ? { lat: festival.latitude, lon: festival.longitude }
        : lookupLocationCoordinates(festival.city, festival.description, festival.province);
    const province_name = festival.province === 'PG' ? 'Perugia' : 'Terni';
    const fallbackHero = TOWN_FALLBACKS[festival.city] || TOWN_FALLBACKS['Perugia'];
    const heroImg = getImageUrl(festival.image_url, fallbackHero);

    const currentAvgRating = reviewsSummary.average_rating ?? festival.average_rating;
    const currentReviewCount = reviewsSummary.review_count ?? festival.review_count;

    const seoTitle = `${festival.name} a ${festival.city} — Programma, Menù & Date`;
    const cleanDesc = festival.description
        ? festival.description.slice(0, 155).replace(/[\r\n]+/g, ' ')
        : `Tutte le informazioni sulla sagra ${festival.name} a ${festival.city} (${festival.province}): programma concerti, menù gastronomico e date.`;

    const eventSchema = {
        "@context": "https://schema.org",
        "@type": ["Event", "FoodEvent"],
        "@id": `https://sagraumbra.it/festival/${festival.id}#event`,
        "name": festival.name,
        "description": cleanDesc,
        "startDate": festival.start_date ? `${festival.start_date}T19:00:00+02:00` : undefined,
        "endDate": festival.end_date ? `${festival.end_date}T23:59:59+02:00` : undefined,
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "image": heroImg,
        "location": {
            "@type": "Place",
            "name": festival.city,
            "address": {
                "@type": "PostalAddress",
                "addressLocality": festival.city,
                "addressRegion": "Umbria",
                "addressCountry": "IT"
            },
            ...(festival.latitude && festival.longitude ? {
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": festival.latitude,
                    "longitude": festival.longitude
                }
            } : {})
        },
        "organizer": {
            "@type": "Organization",
            "name": festival.pro_loco || `Comitato Festeggiamenti / Pro Loco di ${festival.city}`,
            "url": festival.official_link || undefined
        },
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock",
            "url": `https://sagraumbra.it/festival/${festival.id}`,
            "validFrom": festival.start_date || undefined
        },
        ...(currentAvgRating && currentReviewCount > 0 ? {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": currentAvgRating.toFixed(1),
                "reviewCount": currentReviewCount,
                "bestRating": "5",
                "worstRating": "1"
            }
        } : {})
    };

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://sagraumbra.it/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": `Sagre Provincia di ${province_name}`,
                "item": `https://sagraumbra.it/mappa?provincia=${festival.province}`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": festival.name,
                "item": `https://sagraumbra.it/festival/${festival.id}`
            }
        ]
    };

    return (
        <div className="festival-details-page animate-fade-in">
            <SEO
                title={seoTitle}
                description={cleanDesc}
                image={heroImg}
                type="event"
                schema={[eventSchema, breadcrumbSchema]}
            />

            {/* ── HERO ── */}
            <div className="details-hero">
                <img
                    src={heroImg}
                    alt={`Locandina ufficiale e atmosfera della sagra ${festival.name} a ${festival.city} (${province_name})`}
                    onError={(e) => {
                        if (e.currentTarget.src !== fallbackHero && fallbackHero) {
                            e.currentTarget.src = fallbackHero;
                        } else {
                            e.currentTarget.src = '/images/locandina_placeholder.svg';
                        }
                    }}
                />

                <div className="details-hero-overlay">
                    <div className="details-hero-topbar">

                        {/* LEFT — breadcrumb nav */}
                        <nav className="hero-nav-group" aria-label="Percorso di navigazione">
                            <Link to="/" className="hero-back-btn" aria-label="Torna alla Home">
                                <span className="material-symbols-rounded">arrow_back</span>
                                <span>Home</span>
                            </Link>
                            <span className="hero-nav-sep" aria-hidden="true">/</span>
                            <Link to={`/mappa?provincia=${festival.province}`} className="hero-nav-link">
                                {province_name}
                            </Link>
                            <span className="hero-nav-sep" aria-hidden="true">/</span>
                            <span className="hero-nav-current" title={festival.name}>
                                {festival.name}
                            </span>
                        </nav>

                        {/* RIGHT — actions pill */}
                        <div className="hero-actions-pill" role="toolbar" aria-label="Azioni pagina">
                            <button
                                type="button"
                                className="hero-action-btn"
                                onClick={() => toggleFavorite(festival.id)}
                                aria-label={fav ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
                                title={fav ? "Salvato nei tuoi preferiti" : "Salva nei tuoi preferiti"}
                            >
                                <span className="material-symbols-rounded" style={{ color: fav ? '#EF4444' : 'inherit' }}>
                                    {fav ? 'favorite' : 'favorite_border'}
                                </span>
                                <span className="hero-btn-label">{fav ? 'Salvato' : 'Salva'}</span>
                            </button>
                            <div className="hero-pill-divider" aria-hidden="true" />

                            <button
                                type="button"
                                className="hero-action-btn"
                                onClick={() => setShowShareModal(true)}
                                aria-label="Condividi sagra con amici"
                                title="Condividi su WhatsApp o Social"
                            >
                                <span className="material-symbols-rounded">share</span>
                                <span className="hero-btn-label">Condividi</span>
                            </button>
                            <div className="hero-pill-divider" aria-hidden="true" />

                            <CalendarExport festival={festival} showCalendarLink />
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
                        {currentAvgRating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div className="hero-rating-badge">
                                    <ForkRating rating={currentAvgRating} size={16} showScore activeColor="#F59E0B" />
                                    <span className="hero-rating-count">({currentReviewCount})</span>
                                </div>
                            </div>
                        )}
                        <div className="details-hero-title-row">
                            <h1>{festival.name}</h1>
                            <span
                                className="hero-category-icon-badge"
                                title={`Categoria: ${catInfo.label}`}
                                aria-label={`Categoria: ${catInfo.label}`}
                                style={{ color: catInfo.hex || 'var(--cypress)' }}
                            >
                                <span className="material-symbols-rounded">{catIcon}</span>
                            </span>
                        </div>
                        <div className="details-hero-meta">
                            <div className="details-hero-meta-item">
                                <span className="material-symbols-rounded">location_on</span>
                                {festival.city}, Prov. {province_name}
                            </div>
                            <Link
                                to="/calendario"
                                className="details-hero-meta-item details-hero-meta-link"
                                title="Visualizza tutte le sagre nel Calendario"
                            >
                                <span className="material-symbols-rounded">calendar_today</span>
                                {fmtDateShort(festival.start_date)} – {fmtDateShort(festival.end_date)}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── BODY (COLONNA PRINCIPALE + SIDEBAR DESTRA) ── */}
            <div className="details-body">

                {/* ── MAIN COLUMN (INFO SAGRA) ── */}
                <div className="details-main">

                    {/* Il Borgo */}
                    {((festival.city_info && festival.city_info.status === 'VERIFIED') || festival.cultural_info) && (
                        <div className="details-card">
                            <div className="details-card-header">
                                <span className="material-symbols-rounded">villa</span>
                                <h2>Il Borgo di {festival.city}</h2>
                            </div>
                            <div className="details-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                <div className="card-divider" />
                                {festival.city_info && festival.city_info.status === 'VERIFIED' ? (
                                    <div className="wiki-content">
                                        <p className="borgo-description-text">{festival.city_info.wiki_summary}</p>
                                        <a href={festival.city_info.wiki_url} target="_blank" rel="noreferrer" className="wiki-link">
                                            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>language</span>
                                            Leggi di più su Wikipedia
                                        </a>
                                    </div>
                                ) : (
                                    <p className="borgo-description-text">
                                        {renderInlineFormatting(festival.cultural_info.replace(/\n+/g, ' '))}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* L'Evento */}
                    {festival.description && (
                        <div className="details-card">
                            <div className="details-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="material-symbols-rounded">festival</span>
                                    <h2>L'Evento</h2>
                                </div>
                                {festival.content_verified && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        background: '#ECFDF5',
                                        color: '#065F46',
                                        border: '1px solid #A7F3D0',
                                        borderRadius: '9999px',
                                        padding: '0.2rem 0.65rem',
                                        fontSize: '0.78rem',
                                        fontWeight: '600'
                                    }}>
                                        <span className="material-symbols-rounded" style={{ fontSize: '15px', color: '#059669' }}>verified</span>
                                        Testo Verificato (Peer Review)
                                    </span>
                                )}
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
                    {(festival.dish_info || festival.dish_image_url) && (
                        <div className="details-card">
                            <div className="details-card-header" style={{ display: 'flex', alignItems: 'center' }}>
                                <span className="material-symbols-rounded">local_dining</span>
                                <h2>Il Piatto Tipico</h2>
                                <button
                                    type="button"
                                    onClick={() => dishFileInputRef.current?.click()}
                                    disabled={isUploadingDishPhoto}
                                    style={{
                                        marginLeft: 'auto',
                                        background: 'none',
                                        border: '1px dashed var(--border-subtle, #cbd5e1)',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        color: 'var(--cypress, #2A4B3C)',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="Carica o sostituisci la foto del piatto tipico"
                                >
                                    <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add_a_photo</span>
                                    {isUploadingDishPhoto ? 'Caricamento...' : festival.dish_image_url ? 'Modifica foto' : 'Aggiungi foto piatto'}
                                </button>
                                <input
                                    ref={dishFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleDishImageUpload}
                                />
                            </div>
                            <div className="details-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                {festival.dish_image_url && (
                                    <div className="dish-image-wrapper" style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '0.5rem', border: '1px solid var(--border-subtle, #e2e8f0)', position: 'relative' }}>
                                        <img
                                            src={getImageUrl(festival.dish_image_url)}
                                            alt={`Foto autentica del piatto tipico di ${festival.name}`}
                                            style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                                            onClick={() => setLightboxPhoto(getImageUrl(festival.dish_image_url))}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '10px',
                                            left: '10px',
                                            background: 'rgba(0,0,0,0.72)',
                                            color: '#ffffff',
                                            backdropFilter: 'blur(4px)',
                                            borderRadius: '6px',
                                            padding: '4px 10px',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#F59E0B' }}>restaurant</span>
                                            Specialità Gastronomica del Borgo
                                        </div>
                                    </div>
                                )}
                                {festival.dish_info && formatText(festival.dish_info)}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── SIDEBAR DESTRA (METEO IN ALTO + PROSPETTO VOTAZIONI + INFO + MAPPA) ── */}
                <div className="details-sidebar">

                    {/* METEO PREVISTO (PRIMA SCHEDA LATERALE) */}
                    {coords && (
                        <WeatherBadge
                            latitude={coords.lat}
                            longitude={coords.lon}
                            city={festival.city}
                        />
                    )}

                    {/* LOCANDINA UFFICIALE DELL'EVENTO */}
                    {festival.image_url && !festival.image_url.includes('placeholder') && (
                        <div className="details-sidebar-card">
                            <div className="details-card-header">
                                <span className="material-symbols-rounded" style={{ color: 'var(--cypress)' }}>photo_library</span>
                                <h2>Locandina Ufficiale</h2>
                            </div>
                            <div className="details-card-body" style={{ padding: '0.85rem' }}>
                                <div
                                    style={{
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        border: '1px solid var(--border-subtle)',
                                        position: 'relative',
                                        background: 'var(--travertino-2)'
                                    }}
                                    onClick={() => setLightboxPhoto(getImageUrl(festival.image_url))}
                                    title="Clicca per ingrandire la locandina a schermo intero"
                                >
                                    <img
                                        src={getImageUrl(festival.image_url)}
                                        alt={`Locandina ufficiale ${festival.name}`}
                                        style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                                        onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        background: 'rgba(0,0,0,0.72)',
                                        color: '#ffffff',
                                        backdropFilter: 'blur(4px)',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span className="material-symbols-rounded" style={{ fontSize: 14 }}>zoom_in</span>
                                        Ingrandisci
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROSPETTO VOTAZIONI OTTENUTE */}
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
                        <div className="info-row" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                            <span className="material-symbols-rounded" style={{ color: festival.is_verified_dates === 'VERIFIED' ? '#059669' : '#D97706' }}>
                                {festival.is_verified_dates === 'VERIFIED' ? 'verified' : 'event_available'}
                            </span>
                            <div className="info-row-content">
                                <span className="info-row-label">Verifica Date</span>
                                <span className="info-row-value">
                                    {festival.is_verified_dates === 'VERIFIED' ? (
                                        <strong style={{ color: '#059669' }}>Date 2026 Ufficiali Verificate</strong>
                                    ) : (
                                        <strong style={{ color: '#D97706' }}>Periodo Tradizionale Presunto</strong>
                                    )}
                                </span>
                            </div>
                        </div>

                        {festival.date_notes && (
                            <div style={{ background: 'var(--travertino-2)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.83rem', color: 'var(--antracite-2)', marginBottom: '0.75rem', borderLeft: `3px solid ${festival.is_verified_dates === 'VERIFIED' ? '#059669' : '#D97706'}` }}>
                                <strong>Nota Calendario:</strong> {festival.date_notes}
                            </div>
                        )}

                        {festival.verification_source && (
                            <div className="info-row">
                                <span className="material-symbols-rounded">source</span>
                                <div className="info-row-content">
                                    <span className="info-row-label">Fonte Riscontro</span>
                                    <span className="info-row-value" style={{ fontSize: '0.82rem' }}>{festival.verification_source}</span>
                                </div>
                            </div>
                        )}

                        {festival.content_verified && (
                            <div className="info-row">
                                <span className="material-symbols-rounded" style={{ color: '#059669' }}>fact_check</span>
                                <div className="info-row-content">
                                    <span className="info-row-label">Controllo Autenticità</span>
                                    <span className="info-row-value" style={{ fontSize: '0.82rem', color: '#065F46', fontWeight: '600' }}>
                                        Peer Review AI Superata
                                    </span>
                                </div>
                            </div>
                        )}

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
                        <Link to="/calendario" className="info-row info-row-link" title="Visualizza tutte le sagre nel Calendario">
                            <span className="material-symbols-rounded">today</span>
                            <div className="info-row-content">
                                <span className="info-row-label">Inizio</span>
                                <span className="info-row-value">{fmtDateLong(festival.start_date)}</span>
                            </div>
                        </Link>
                        <Link to="/calendario" className="info-row info-row-link" title="Visualizza tutte le sagre nel Calendario">
                            <span className="material-symbols-rounded">event</span>
                            <div className="info-row-content">
                                <span className="info-row-label">Fine</span>
                                <span className="info-row-value">{fmtDateLong(festival.end_date)}</span>
                            </div>
                        </Link>
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
                        {festival.latitude && festival.longitude && (
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${festival.latitude},${festival.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-directions-link"
                                title="Avvia navigatore su Google Maps"
                            >
                                <span className="material-symbols-rounded">navigation</span>
                                Indicazioni Stradali
                            </a>
                        )}
                        {festival.source_url && (
                            <a
                                href={festival.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-source-link"
                            >
                                <span className="material-symbols-rounded">open_in_new</span>
                                Fonte / Sito Ufficiale
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
                                        <div style={{ fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 600 }}>
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

                                {/* Foto allegate alla recensione */}
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Foto dei piatti o della festa (opzionale, max 3)</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--antracite-3)' }}>{reviewPhotos.length}/3 foto</span>
                                    </label>
                                    
                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.35rem' }}>
                                        {reviewPhotos.map((photo, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                                                <img src={photo.preview} alt={`Anteprima ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button
                                                    type="button"
                                                    onClick={() => removeReviewPhoto(idx)}
                                                    title="Rimuovi foto"
                                                    style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        right: '2px',
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(0,0,0,0.7)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: 0
                                                    }}
                                                >
                                                    <span className="material-symbols-rounded" style={{ fontSize: 13 }}>close</span>
                                                </button>
                                            </div>
                                        ))}

                                        {reviewPhotos.length < 3 && (
                                            <label style={{
                                                width: '72px',
                                                height: '72px',
                                                borderRadius: '8px',
                                                border: '1.5px dashed var(--border-subtle, #cbd5e1)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                background: 'var(--travertino-2, #f5f4ef)',
                                                color: 'var(--cypress, #2A4B3C)',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                gap: '2px',
                                                textAlign: 'center',
                                                padding: '4px',
                                                transition: 'border-color 0.2s ease'
                                            }}>
                                                <span className="material-symbols-rounded" style={{ fontSize: 22 }}>add_a_photo</span>
                                                <span>Aggiungi</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    style={{ display: 'none' }}
                                                    onChange={handleReviewPhotosChange}
                                                />
                                            </label>
                                        )}
                                    </div>
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
                                            
                                            {/* Foto allegate alla recensione */}
                                            {rev.images && rev.images.length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                                                    {rev.images.map((imgUrl, i) => (
                                                        <img
                                                            key={i}
                                                            src={getImageUrl(imgUrl)}
                                                            alt={`Foto piatto caricata da ${rev.author_name}`}
                                                            onClick={() => setLightboxPhoto(getImageUrl(imgUrl))}
                                                            title="Clicca per ingrandire la foto"
                                                            style={{
                                                                width: '84px',
                                                                height: '84px',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                border: '1px solid var(--border-subtle, #e2e8f0)',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                                                transition: 'transform 0.15s ease'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ALTRE SAGRE NEI DINTORNI (INTERNAL LINKING & SEO) ── */}
            {relatedFestivals.length > 0 && (
                <section className="related-festivals-section" aria-labelledby="related-title">
                    <div className="related-festivals-header">
                        <div>
                            <h2 id="related-title" className="related-festivals-title">
                                Altre sagre in provincia di {province_name}
                            </h2>
                            <p className="related-festivals-subtitle">
                                Feste popolari ed eventi enogastronomici da non perdere nei borghi vicini
                            </p>
                        </div>
                        <Link to={`/mappa?provincia=${festival.province}`} className="related-festivals-link">
                            Esplora su mappa <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_forward</span>
                        </Link>
                    </div>

                    <div className="related-festivals-grid">
                        {relatedFestivals.map(rel => {
                            const relFallback = TOWN_FALLBACKS[rel.city] || TOWN_FALLBACKS['Perugia'];
                            const relImg = getImageUrl(rel.image_url, relFallback);
                            return (
                                <Link
                                    key={rel.id}
                                    to={`/festival/${rel.id}`}
                                    className="related-fest-card"
                                >
                                    <div className="related-fest-card-img">
                                        <img
                                            src={relImg}
                                            alt={`Locandina e atmosfera della sagra ${rel.name} a ${rel.city}`}
                                            loading="lazy"
                                            onError={(e) => {
                                                if (e.currentTarget.src !== relFallback && relFallback) {
                                                    e.currentTarget.src = relFallback;
                                                } else {
                                                    e.currentTarget.src = '/hero_bg/DSCF4044.webp';
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="related-fest-card-body">
                                        <h3 className="related-fest-card-title">{rel.name}</h3>
                                        <p className="related-fest-card-meta">
                                            <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--cypress)' }}>location_on</span>
                                            {rel.city} ({rel.province})
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {showPosterModal && (
                <PosterModal
                    festival={festival}
                    onClose={() => setShowPosterModal(false)}
                    onUpdated={(updated) => setFestival(updated)}
                />
            )}

            {showShareModal && (
                <ShareModal
                    festival={festival}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {lightboxPhoto && (
                <div
                    className="modal-overlay animate-fade-in"
                    onClick={() => setLightboxPhoto(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '1.5rem'
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img
                            src={lightboxPhoto}
                            alt="Foto ingrandita"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '85vh',
                                borderRadius: '12px',
                                objectFit: 'contain',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setLightboxPhoto(null)}
                            style={{
                                position: 'absolute',
                                top: '-14px',
                                right: '-14px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                color: '#000000',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}
                            aria-label="Chiudi visualizzazione foto"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>
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
