import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { fetchFestivals, getImageUrl } from '../services/api';
import { CATS, CAT_ICONS, TOWN_FALLBACKS, normalizeFestival, isOngoing, fmtDate } from '../constants';
import ForkRating from '../components/ForkRating';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const MAP_BREADCRUMB_SCHEMA = {
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
            "name": "Mappa Sagre Umbria",
            "item": "https://sagraumbra.it/mappa"
        }
    ]
};

// Format ISO date (YYYY-MM-DD)
const formatISODate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Returns Monday of the week for given date
const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

const ITALIAN_DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const ITALIAN_DAYS_LETTER = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const ITALIAN_MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const ITALIAN_MONTHS_SHORT = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

const isFestivalActiveOnDate = (festival, isoDate) => {
    if (!festival || !festival.start_date || !isoDate) return false;
    const start = festival.start_date;
    const end = festival.end_date || festival.start_date;
    return isoDate >= start && isoDate <= end;
};

// Haversine distance in km
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
};

const FILTER_DEFS = [
    { key: '__all__', label: 'Tutti i generi', icon: 'apps' },
    ...Object.entries(CATS).map(([k, v]) => ({ key: k, label: v.label, icon: CAT_ICONS[k] || 'local_dining' })),
];

export default function MapPage() {
    const [searchParams] = useSearchParams();
    const targetFestivalId = searchParams.get('id');

    const [allFestivals, setAllFestivals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [provinciaFilter, setProvinciaFilter] = useState('');
    const [activeCat, setActiveCat] = useState('__all__');
    const [selectedFestival, setSelectedFestival] = useState(null);

    // Temporal navigation state
    const [currentDate, setCurrentDate] = useState(() => new Date());
    // timePreset: 'weekend' | 'today' | 'week' | 'all'
    const [timePreset, setTimePreset] = useState('weekend');
    // selectedDay: 'all' | 'YYYY-MM-DD'
    const [selectedDay, setSelectedDay] = useState('all');

    // Geolocation state
    const [userCoords, setUserCoords] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [sortByDistance, setSortByDistance] = useState(false);

    // Mobile view: 'map' (map + bottom cards) | 'list' (full vertical list)
    const [mobileView, setMobileView] = useState('map');

    // Refs for auto-scrolling sidebar & mobile carousel items
    const sidebarItemRefs = useRef({});
    const mobileCarouselItemRefs = useRef({});

    const todayIso = useMemo(() => formatISODate(new Date()), []);

    // ── FETCH INITIAL FESTIVALS ──
    useEffect(() => {
        let live = true;
        (async () => {
            setIsLoading(true);
            try {
                const data = await fetchFestivals('');
                if (live) {
                    const normalized = (Array.isArray(data) ? data : []).map(normalizeFestival);
                    setAllFestivals(normalized);

                    // If URL contains ?id=..., pre-select that festival
                    if (targetFestivalId) {
                        const target = normalized.find(f => String(f.id) === String(targetFestivalId));
                        if (target) {
                            setSelectedFestival(target);
                            // Set time preset to 'all' so target isn't filtered out by date
                            setTimePreset('all');
                        }
                    }
                }
            } catch {
                if (live) setAllFestivals([]);
            } finally {
                if (live) setIsLoading(false);
            }
        })();
        return () => { live = false; };
    }, [targetFestivalId]);

    // ── WEEK DAYS COMPUTATION ──
    const weekDays = useMemo(() => {
        const monday = getMonday(currentDate);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const iso = formatISODate(d);
            return {
                date: d,
                iso,
                dayNumber: d.getDate(),
                shortName: ITALIAN_DAYS_SHORT[i],
                letter: ITALIAN_DAYS_LETTER[i],
                monthName: ITALIAN_MONTHS_SHORT[d.getMonth()],
                year: d.getFullYear(),
                isToday: iso === todayIso,
                isWeekend: i >= 4, // Ven (4), Sab (5), Dom (6)
            };
        });
    }, [currentDate, todayIso]);

    const mondayIso = weekDays[0].iso;
    const sundayIso = weekDays[6].iso;
    const weekendDates = useMemo(() => [weekDays[4].iso, weekDays[5].iso, weekDays[6].iso], [weekDays]);

    // Human-readable week range
    const weekTitle = useMemo(() => {
        const m = weekDays[0];
        const s = weekDays[6];
        if (m.year === s.year) {
            if (m.date.getMonth() === s.date.getMonth()) {
                return `${m.dayNumber} – ${s.dayNumber} ${ITALIAN_MONTHS[m.date.getMonth()]} ${m.year}`;
            }
            return `${m.dayNumber} ${m.monthName} – ${s.dayNumber} ${s.monthName} ${m.year}`;
        }
        return `${m.dayNumber} ${m.monthName} ${m.year} – ${s.dayNumber} ${s.monthName} ${s.year}`;
    }, [weekDays]);

    const isCurrentWeek = useMemo(() => {
        return todayIso >= mondayIso && todayIso <= sundayIso;
    }, [todayIso, mondayIso, sundayIso]);

    // ── WEEK NAVIGATION HANDLERS ──
    const handlePrevWeek = () => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 7);
            return d;
        });
        setSelectedDay('all');
    };

    const handleNextWeek = () => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 7);
            return d;
        });
        setSelectedDay('all');
    };

    const handleTodayWeek = () => {
        setCurrentDate(new Date());
        setSelectedDay('all');
    };

    const handleDateInputChange = (e) => {
        if (!e.target.value) return;
        const [y, m, d] = e.target.value.split('-').map(Number);
        setCurrentDate(new Date(y, m - 1, d));
        setSelectedDay('all');
    };

    // ── GEOLOCATION HANDLER ──
    const handleLocateUser = () => {
        if (!navigator.geolocation) {
            alert('Geolocalizzazione non supportata dal tuo browser');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserCoords({ latitude, longitude });
                setSortByDistance(true);
                setIsLocating(false);
            },
            () => {
                alert('Permesso di geolocalizzazione negato o non disponibile.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    // ── FESTIVALS COMPUTATION BY DAY ──
    const festivalsByDay = useMemo(() => {
        const map = {};
        weekDays.forEach(day => {
            map[day.iso] = allFestivals.filter(f => isFestivalActiveOnDate(f, day.iso));
        });
        return map;
    }, [allFestivals, weekDays]);

    // Total active in week
    const festivalsInWeekCount = useMemo(() => {
        return allFestivals.filter(f => {
            const start = f.start_date;
            const end = f.end_date || f.start_date;
            return start <= sundayIso && end >= mondayIso;
        }).length;
    }, [allFestivals, mondayIso, sundayIso]);

    // Total active this weekend
    const festivalsInWeekendCount = useMemo(() => {
        return allFestivals.filter(f => weekendDates.some(iso => isFestivalActiveOnDate(f, iso))).length;
    }, [allFestivals, weekendDates]);

    // Total active today
    const festivalsTodayCount = useMemo(() => {
        return allFestivals.filter(isOngoing).length;
    }, [allFestivals]);

    // ── FILTERING PIPELINE ──
    const filteredFestivals = useMemo(() => {
        return allFestivals
            .map(f => {
                const dist = userCoords
                    ? calculateDistanceKm(userCoords.latitude, userCoords.longitude, f.latitude, f.longitude)
                    : null;
                return { ...f, distance_km: dist };
            })
            .filter(f => {
                // 1. Province filter
                if (provinciaFilter && f.province?.toUpperCase() !== provinciaFilter.toUpperCase()) {
                    return false;
                }

                // 2. Category filter
                if (activeCat !== '__all__' && f.cat !== activeCat) {
                    return false;
                }

                // 3. Search query filter
                if (search.trim()) {
                    const q = search.toLowerCase();
                    const text = `${f.name || ''} ${f.city || ''} ${f.menu_info || ''} ${f.dish_info || ''} ${f.description || ''}`.toLowerCase();
                    if (!text.includes(q)) return false;
                }

                // 4. Temporal filter
                if (timePreset === 'today') {
                    return isOngoing(f);
                }

                if (timePreset === 'weekend') {
                    return weekendDates.some(iso => isFestivalActiveOnDate(f, iso));
                }

                if (timePreset === 'week') {
                    if (selectedDay !== 'all') {
                        return isFestivalActiveOnDate(f, selectedDay);
                    }
                    const start = f.start_date;
                    const end = f.end_date || f.start_date;
                    return start <= sundayIso && end >= mondayIso;
                }

                // timePreset === 'all': no date filter
                return true;
            })
            .sort((a, b) => {
                if (sortByDistance && a.distance_km != null && b.distance_km != null) {
                    return a.distance_km - b.distance_km;
                }
                // Ongoing festivals first, then by date
                const aLive = isOngoing(a);
                const bLive = isOngoing(b);
                if (aLive && !bLive) return -1;
                if (!aLive && bLive) return 1;
                return (a.start_date || '').localeCompare(b.start_date || '');
            });
    }, [
        allFestivals,
        provinciaFilter,
        activeCat,
        search,
        timePreset,
        selectedDay,
        weekendDates,
        mondayIso,
        sundayIso,
        userCoords,
        sortByDistance
    ]);

    // Handle festival selection from Map or List
    const handleSelectFestival = (festival) => {
        setSelectedFestival(festival);
        // Scroll corresponding sidebar item into view
        if (festival && sidebarItemRefs.current[festival.id]) {
            sidebarItemRefs.current[festival.id].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
        // Scroll mobile carousel into view
        if (festival && mobileCarouselItemRefs.current[festival.id]) {
            mobileCarouselItemRefs.current[festival.id].scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    };

    const hasActiveFilters = Boolean(
        search ||
        provinciaFilter ||
        activeCat !== '__all__' ||
        timePreset !== 'weekend' ||
        selectedDay !== 'all'
    );

    const resetAllFilters = () => {
        setSearch('');
        setProvinciaFilter('');
        setActiveCat('__all__');
        setTimePreset('weekend');
        setSelectedDay('all');
        setSelectedFestival(null);
    };

    return (
        <div className="app-shell animate-fade-in map-page-layout">
            <SEO
                title="Mappa Sagre Umbria 2026 — Feste e Borghi Gastronomici"
                description="Mappa geografica interattiva delle sagre e feste popolari nei borghi dell'Umbria: trova dove mangiare stasera e nel weekend tra Perugia e Terni."
                canonical="https://sagraumbra.it/mappa"
                schema={MAP_BREADCRUMB_SCHEMA}
            />
            <Navbar search={search} setSearch={setSearch} showSearch={true} />

            {/* ═══════════════════════════════════════════
                MAP PAGE HERO & HEADER
            ═══════════════════════════════════════════ */}
            <div className="map-page-header">
                <div className="map-header-title">
                    <div className="map-header-badge">
                        <span className="material-symbols-rounded">map</span>
                        <span>Mappa Interattiva & Territorio</span>
                    </div>
                    <h1>Esplora le Sagre nei Borghi Umbri</h1>
                    <p>Mappa interattiva delle sagre e degli stand gastronomici aperti nei borghi di Perugia e Terni.</p>
                </div>

                {/* PROVINCIA FILTER CHIPS */}
                <div className="map-provincia-selector" role="group" aria-label="Filtra per provincia">
                    <button
                        type="button"
                        className={`provincia-chip ${provinciaFilter === '' ? 'active' : ''}`}
                        onClick={() => setProvinciaFilter('')}
                    >
                        Tutta l'Umbria
                    </button>
                    <button
                        type="button"
                        className={`provincia-chip ${provinciaFilter === 'PG' ? 'active' : ''}`}
                        onClick={() => setProvinciaFilter('PG')}
                    >
                        Perugia (PG)
                    </button>
                    <button
                        type="button"
                        className={`provincia-chip ${provinciaFilter === 'TR' ? 'active' : ''}`}
                        onClick={() => setProvinciaFilter('TR')}
                    >
                        Terni (TR)
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                TEMPORAL NAVIGATION TOOLBAR (WEEKLY BASE)
            ═══════════════════════════════════════════ */}
            <section className="map-temporal-toolbar" aria-label="Navigazione temporale sagre">
                {/* PRIMARY TIME PRESETS */}
                <div className="map-time-presets">
                    <button
                        type="button"
                        className={`time-preset-btn highlight-weekend ${timePreset === 'weekend' ? 'active' : ''}`}
                        onClick={() => {
                            setTimePreset('weekend');
                            setSelectedDay('all');
                        }}
                    >
                        <span className="material-symbols-rounded">local_fire_department</span>
                        <span>Questo Weekend</span>
                        <span className="preset-count">{festivalsInWeekendCount}</span>
                    </button>

                    <button
                        type="button"
                        className={`time-preset-btn ${timePreset === 'today' ? 'active' : ''}`}
                        onClick={() => {
                            setTimePreset('today');
                            setSelectedDay('all');
                        }}
                    >
                        <span className="live-dot" />
                        <span>In corso Oggi</span>
                        <span className="preset-count">{festivalsTodayCount}</span>
                    </button>

                    <button
                        type="button"
                        className={`time-preset-btn ${timePreset === 'week' ? 'active' : ''}`}
                        onClick={() => {
                            setTimePreset('week');
                            setSelectedDay('all');
                        }}
                    >
                        <span className="material-symbols-rounded">date_range</span>
                        <span>Questa Settimana</span>
                        <span className="preset-count">{festivalsInWeekCount}</span>
                    </button>

                    <button
                        type="button"
                        className={`time-preset-btn ${timePreset === 'all' ? 'active' : ''}`}
                        onClick={() => {
                            setTimePreset('all');
                            setSelectedDay('all');
                        }}
                    >
                        <span className="material-symbols-rounded">all_inclusive</span>
                        <span>Tutte le Sagre</span>
                        <span className="preset-count">{allFestivals.length}</span>
                    </button>
                </div>

                {/* WEEK STEPPER & DAY PILLS (VISIBLE IN 'week' OR 'weekend' PRESET) */}
                {(timePreset === 'week' || timePreset === 'weekend') && (
                    <div className="map-week-navigator-row animate-fade-in">
                        <div className="map-week-stepper">
                            <button
                                type="button"
                                className="week-nav-btn"
                                onClick={handlePrevWeek}
                                title="Settimana precedente"
                                aria-label="Settimana precedente"
                            >
                                <span className="material-symbols-rounded">chevron_left</span>
                                <span className="btn-label-desktop">Prec</span>
                            </button>

                            <div className="week-current-display">
                                <span className="material-symbols-rounded week-calendar-icon">calendar_month</span>
                                <strong>{weekTitle}</strong>
                                {isCurrentWeek && <span className="current-week-tag">In corso</span>}
                            </div>

                            <button
                                type="button"
                                className="week-nav-btn"
                                onClick={handleNextWeek}
                                title="Settimana successiva"
                                aria-label="Settimana successiva"
                            >
                                <span className="btn-label-desktop">Succ</span>
                                <span className="material-symbols-rounded">chevron_right</span>
                            </button>

                            {!isCurrentWeek && (
                                <button
                                    type="button"
                                    className="week-today-jump-btn"
                                    onClick={handleTodayWeek}
                                    title="Torna alla settimana corrente"
                                >
                                    Oggi
                                </button>
                            )}

                            <label className="week-jump-input-label" title="Scegli una data precisa">
                                <span className="material-symbols-rounded">event</span>
                                <input
                                    type="date"
                                    className="week-native-date-input"
                                    onChange={handleDateInputChange}
                                    aria-label="Salta a una settimana specifica"
                                />
                            </label>
                        </div>

                        {/* 7 DAY PILLS FOR THE ACTIVE WEEK */}
                        <div className="map-day-pills-scroll">
                            <button
                                type="button"
                                className={`map-day-pill ${selectedDay === 'all' ? 'active' : ''}`}
                                onClick={() => {
                                    setTimePreset('week');
                                    setSelectedDay('all');
                                }}
                            >
                                <span className="pill-day-name">Tutta</span>
                                <span className="pill-day-count">{festivalsInWeekCount}</span>
                            </button>

                            {weekDays.map(d => {
                                const count = (festivalsByDay[d.iso] || []).length;
                                const isSelected = selectedDay === d.iso;
                                return (
                                    <button
                                        key={d.iso}
                                        type="button"
                                        className={`map-day-pill ${isSelected ? 'active' : ''} ${d.isToday ? 'today' : ''} ${d.isWeekend ? 'weekend' : ''}`}
                                        onClick={() => {
                                            setTimePreset('week');
                                            setSelectedDay(d.iso);
                                        }}
                                        title={`${d.shortName} ${d.dayNumber} ${d.monthName}: ${count} sagre`}
                                    >
                                        <div className="pill-day-header">
                                            <span className="pill-day-name">{d.shortName}</span>
                                            <span className="pill-day-num">{d.dayNumber}</span>
                                        </div>
                                        <span className={`pill-day-count ${count > 0 ? 'has-festivals' : 'empty'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* ═══════════════════════════════════════════
                SECONDARY CATEGORY FILTERS & STATUS BAR
            ═══════════════════════════════════════════ */}
            <div className="map-subfilters-bar">
                <div className="filters-row map-filters-row">
                    {FILTER_DEFS.map(f => (
                        <button
                            key={f.key}
                            type="button"
                            className={`filter-btn ${activeCat === f.key ? 'active' : ''}`}
                            onClick={() => setActiveCat(f.key)}
                        >
                            <span className="material-symbols-rounded">{f.icon}</span>
                            <span>{f.label}</span>
                        </button>
                    ))}
                </div>

                {hasActiveFilters && (
                    <button
                        type="button"
                        className="map-clear-filters-btn"
                        onClick={resetAllFilters}
                        title="Reimposta tutti i filtri"
                    >
                        <span className="material-symbols-rounded">restart_alt</span>
                        <span>Azzera filtri</span>
                    </button>
                )}
            </div>

            {/* ═══════════════════════════════════════════
                MOBILE VIEW TOGGLE: MAPPA / ELENCO
            ═══════════════════════════════════════════ */}
            <div className="mobile-view-toggle-bar">
                <button
                    type="button"
                    className={`mobile-toggle-btn ${mobileView === 'map' ? 'active' : ''}`}
                    onClick={() => setMobileView('map')}
                    aria-label="Visualizza mappa con carosello"
                >
                    <span className="material-symbols-rounded">map</span>
                    <span>Mappa ({filteredFestivals.length})</span>
                </button>
                <button
                    type="button"
                    className={`mobile-toggle-btn ${mobileView === 'list' ? 'active' : ''}`}
                    onClick={() => setMobileView('list')}
                    aria-label="Visualizza elenco completo sagre"
                >
                    <span className="material-symbols-rounded">format_list_bulleted</span>
                    <span>Elenco ({filteredFestivals.length})</span>
                </button>
            </div>

            {/* ═══════════════════════════════════════════
                MAIN SPLIT: SIDEBAR CARDS + MAP VIEWPORT
            ═══════════════════════════════════════════ */}
            <div className={`map-page-main mobile-view-${mobileView}`}>
                {/* ── LEFT DESKTOP SIDEBAR ── */}
                <aside className={`map-sidebar ${mobileView === 'list' ? 'mobile-show' : 'mobile-hide'}`}>
                    <div className="map-sidebar-header">
                        <div className="map-sidebar-count">
                            <strong>{filteredFestivals.length}</strong> sagre individuate
                        </div>

                        <div className="sidebar-header-actions">
                            {sortByDistance && (
                                <span className="sidebar-gps-badge" title="Ordinate per distanza da te">
                                    <span className="material-symbols-rounded">near_me</span>
                                    Vicine
                                </span>
                            )}
                            {festivalsTodayCount > 0 && timePreset !== 'today' && (
                                <button
                                    type="button"
                                    className="map-live-badge-btn"
                                    onClick={() => setTimePreset('today')}
                                    title="Mostra solo le sagre aperte oggi"
                                >
                                    <span className="live-dot" /> {festivalsTodayCount} oggi
                                </button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="status-container" style={{ padding: '3rem 0' }}>
                            <div className="spinner" />
                            <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--antracite-2)' }}>
                                Caricamento sagre in corso...
                            </p>
                        </div>
                    ) : filteredFestivals.length === 0 ? (
                        <div className="empty-state map-empty-state">
                            <span className="material-symbols-rounded empty-icon">search_off</span>
                            <h4>Nessuna sagra con questi criteri</h4>
                            <p>Prova a selezionare una data diversa, allargare i filtri o esplorare tutta l'Umbria.</p>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={resetAllFilters}
                                style={{ marginTop: '1rem' }}
                            >
                                Mostra tutte le sagre
                            </button>
                        </div>
                    ) : (
                        <div className="map-sidebar-list">
                            {filteredFestivals.map(f => {
                                const ongoing = isOngoing(f);
                                const isSelected = selectedFestival?.id === f.id;
                                const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
                                const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

                                return (
                                    <div
                                        key={f.id}
                                        ref={(el) => { sidebarItemRefs.current[f.id] = el; }}
                                        className={`map-sidebar-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelectFestival(f)}
                                    >
                                        <div className="sidebar-card-thumbnail">
                                            <img src={imgSrc} alt={f.name} loading="lazy" />
                                            {ongoing && <span className="card-badge live">Oggi</span>}
                                            {f.province && (
                                                <span className="card-badge province">{f.province}</span>
                                            )}
                                        </div>

                                        <div className="sidebar-card-content">
                                            <div className="sidebar-card-top">
                                                <span className="sidebar-card-category">
                                                    <span className="material-symbols-rounded">{CAT_ICONS[f.cat] || 'restaurant'}</span>
                                                    {f.cat || 'Sagra'}
                                                </span>
                                                {f.distance_km != null && (
                                                    <span className="sidebar-distance-pill">
                                                        <span className="material-symbols-rounded">near_me</span>
                                                        {f.distance_km} km
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="sidebar-card-title">{f.name}</h4>

                                            <div className="sidebar-card-meta">
                                                <span className="sidebar-meta-item">
                                                    <span className="material-symbols-rounded">location_on</span>
                                                    {f.city}
                                                </span>
                                                <span className="sidebar-meta-item">
                                                    <span className="material-symbols-rounded">calendar_today</span>
                                                    {fmtDate(f.start_date)} – {fmtDate(f.end_date)}
                                                </span>
                                            </div>

                                            {/* 7-DAY APERTURE MATRIX FOR CURRENT WEEK */}
                                            <div className="sidebar-aperture-matrix" title="Apertura nei giorni di questa settimana">
                                                {weekDays.map(d => {
                                                    const active = isFestivalActiveOnDate(f, d.iso);
                                                    return (
                                                        <span
                                                            key={d.iso}
                                                            className={`matrix-dot ${active ? 'active' : ''} ${d.isToday ? 'today' : ''}`}
                                                            title={`${d.shortName} ${d.dayNumber}: ${active ? 'Aperto' : 'Chiuso'}`}
                                                        >
                                                            {d.letter}
                                                        </span>
                                                    );
                                                })}
                                            </div>

                                            <div className="sidebar-card-footer">
                                                {f.average_rating ? (
                                                    <div className="sidebar-rating">
                                                        <ForkRating rating={f.average_rating} size={13} activeColor="#F59E0B" />
                                                        <span>{f.average_rating.toFixed(1)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="sidebar-no-rating">Da scoprire</span>
                                                )}

                                                <div className="sidebar-card-actions">
                                                    <button
                                                        type="button"
                                                        className="sidebar-pin-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectFestival(f);
                                                            setMobileView('map');
                                                        }}
                                                        title="Mostra e centra su mappa"
                                                    >
                                                        <span className="material-symbols-rounded">near_me</span>
                                                        <span>Mappa</span>
                                                    </button>
                                                    <Link
                                                        to={`/festival/${f.id}`}
                                                        className="sidebar-details-btn"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        Scheda &rarr;
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </aside>

                {/* ── RIGHT MAP VIEWPORT CONTAINER ── */}
                <main className={`map-viewport-container ${mobileView === 'map' ? 'mobile-show' : 'mobile-hide'}`}>
                    <MapView
                        festivals={filteredFestivals}
                        selectedFestival={selectedFestival}
                        onSelectFestival={handleSelectFestival}
                        userCoords={userCoords}
                        onLocateUser={handleLocateUser}
                        isLocating={isLocating}
                    />

                    {/* ═══════════════════════════════════════════
                        MOBILE BOTTOM FLOATING CAROUSEL (<= 900px)
                    ═══════════════════════════════════════════ */}
                    {filteredFestivals.length > 0 && (
                        <div className="mobile-bottom-carousel-container" aria-label="Sagre visualizzate sulla mappa">
                            <div className="mobile-bottom-carousel-scroll">
                                {filteredFestivals.map(f => {
                                    const isSelected = selectedFestival?.id === f.id;
                                    const ongoing = isOngoing(f);
                                    const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
                                    const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

                                    return (
                                        <div
                                            key={f.id}
                                            ref={(el) => { mobileCarouselItemRefs.current[f.id] = el; }}
                                            className={`mobile-carousel-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleSelectFestival(f)}
                                        >
                                            <div className="carousel-card-img">
                                                <img src={imgSrc} alt={f.name} loading="lazy" />
                                                {ongoing && <span className="carousel-tag live">Oggi</span>}
                                                {f.province && <span className="carousel-tag prov">{f.province}</span>}
                                            </div>

                                            <div className="carousel-card-body">
                                                <h4>{f.name}</h4>
                                                <p className="carousel-loc">
                                                    <span className="material-symbols-rounded">location_on</span>
                                                    {f.city}
                                                    {f.distance_km != null && <strong>· {f.distance_km} km</strong>}
                                                </p>
                                                <p className="carousel-dates">
                                                    <span className="material-symbols-rounded">calendar_today</span>
                                                    {fmtDate(f.start_date)} – {fmtDate(f.end_date)}
                                                </p>

                                                <div className="carousel-card-bottom">
                                                    {f.average_rating ? (
                                                        <div className="sidebar-rating">
                                                            <ForkRating rating={f.average_rating} size={12} activeColor="#F59E0B" />
                                                            <span>{f.average_rating.toFixed(1)}</span>
                                                        </div>
                                                    ) : <span className="sidebar-no-rating">Nuova</span>}

                                                    <Link
                                                        to={`/festival/${f.id}`}
                                                        className="carousel-link-btn"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Dettagli &rarr;
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <Footer />
        </div>
    );
}
