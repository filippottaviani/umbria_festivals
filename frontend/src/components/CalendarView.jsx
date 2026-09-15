import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CATS } from '../constants';
import { getImageUrl } from '../services/api';
import ForkRating from './ForkRating';
import CalendarExport from './CalendarExport';

const CAT_ICONS = {
    tartufo: 'psychiatry',
    carne:   'outdoor_grill',
    pesce:   'set_meal',
    pasta:   'ramen_dining',
    orto:    'eco',
    grano:   'grain',
    storica: 'museum',
    popolare:'festival',
};

const TOWN_FALLBACKS = {
    'Perugia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg',
    'Assisi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/AssisiDec122023_03.jpg/1280px-AssisiDec122023_03.jpg',
    'Gubbio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg',
    'Foligno': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Foligno_Piazza_della_Repubblica.jpg/1280px-Foligno_Piazza_della_Repubblica.jpg',
    'Spoleto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Spoleto_Piazza_del_Duomo.jpg/1280px-Spoleto_Piazza_del_Duomo.jpg',
    'Norcia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Norcia_piazza_San_Benedetto.jpg/1280px-Norcia_piazza_San_Benedetto.jpg',
    'Orvieto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Duomo_Orvieto.jpg/1280px-Duomo_Orvieto.jpg',
    'Narni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1280px-Ponte_di_Augusto_a_Narni.jpg',
    'Todi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Piazza_del_Popolo_Todi.jpg/1280px-Piazza_del_Popolo_Todi.jpg',
    'Castiglione del Lago': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Castiglione_del_lago_01.jpg/1280px-Castiglione_del_lago_01.jpg',
    'Spello': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Spello_Panorama.jpg/1280px-Spello_Panorama.jpg',
    'Montefalco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Montefalco_view.jpg/1280px-Montefalco_view.jpg',
    'Bevagna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Bevagna_Piazza_Silvestri.jpg/1280px-Bevagna_Piazza_Silvestri.jpg',
    'Terni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Cascata_delle_Marmore_Terni.jpg/1280px-Cascata_delle_Marmore_Terni.jpg',
};

// ── DATE HELPER UTILITIES ──
const formatISODate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseISODate = (str) => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
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

const ITALIAN_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const ITALIAN_DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const ITALIAN_MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const ITALIAN_MONTHS_SHORT = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

const fmtDateRange = (startStr, endStr) => {
    if (!startStr) return '—';
    const s = parseISODate(startStr);
    const sDay = s.getDate();
    const sMonth = ITALIAN_MONTHS_SHORT[s.getMonth()];

    if (!endStr || startStr === endStr) {
        return `${sDay} ${sMonth} ${s.getFullYear()}`;
    }

    const e = parseISODate(endStr);
    const eDay = e.getDate();
    const eMonth = ITALIAN_MONTHS_SHORT[e.getMonth()];

    if (s.getFullYear() === e.getFullYear()) {
        if (s.getMonth() === e.getMonth()) {
            return `${sDay} – ${eDay} ${sMonth} ${s.getFullYear()}`;
        }
        return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${s.getFullYear()}`;
    }
    return `${sDay} ${sMonth} ${s.getFullYear()} – ${eDay} ${eMonth} ${e.getFullYear()}`;
};

// Check if festival is open on a specific YYYY-MM-DD
const isFestivalActiveOnDate = (festival, isoDate) => {
    if (!festival || !festival.start_date || !isoDate) return false;
    const start = festival.start_date;
    const end = festival.end_date || festival.start_date;
    return isoDate >= start && isoDate <= end;
};

export default function CalendarView({ festivals = [], onEventSelect }) {
    // Current reference date (defaults to today)
    const [currentDate, setCurrentDate] = useState(() => new Date());
    // Mode: 'week' (default) or 'month'
    const [viewMode, setViewMode] = useState('week');
    // In week mode, selectedDay: 'all' | 'weekend' | 'YYYY-MM-DD'
    const [selectedDay, setSelectedDay] = useState('all');
    // In month mode, selectedDay: 'YYYY-MM-DD'
    const [selectedMonthDay, setSelectedMonthDay] = useState(() => formatISODate(new Date()));

    const todayIso = useMemo(() => formatISODate(new Date()), []);

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
                dayName: ITALIAN_DAYS[i],
                shortName: ITALIAN_DAYS_SHORT[i],
                monthName: ITALIAN_MONTHS_SHORT[d.getMonth()],
                year: d.getFullYear(),
                isToday: iso === todayIso,
                isWeekend: i >= 4, // Ven (4), Sab (5), Dom (6)
            };
        });
    }, [currentDate, todayIso]);

    const mondayIso = weekDays[0].iso;
    const sundayIso = weekDays[6].iso;

    // Week title, e.g. "14 – 20 Settembre 2026"
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

    // ── FESTIVALS ACTIVE IN THIS WEEK ──
    const festivalsInWeek = useMemo(() => {
        return festivals.filter(f => {
            const start = f.start_date;
            const end = f.end_date || f.start_date;
            // Overlaps if festival starts on/before Sunday and ends on/after Monday
            return start <= sundayIso && end >= mondayIso;
        });
    }, [festivals, mondayIso, sundayIso]);

    // Festivals count for each day of the week
    const festivalsByDay = useMemo(() => {
        const map = {};
        weekDays.forEach(day => {
            map[day.iso] = festivals.filter(f => isFestivalActiveOnDate(f, day.iso));
        });
        return map;
    }, [festivals, weekDays]);

    // Weekend festivals (Friday, Saturday, Sunday)
    const weekendFestivals = useMemo(() => {
        const weekendDates = [weekDays[4].iso, weekDays[5].iso, weekDays[6].iso];
        return festivals.filter(f => weekendDates.some(iso => isFestivalActiveOnDate(f, iso)));
    }, [festivals, weekDays]);

    // Festivals to display based on selectedDay filter
    const displayedWeeklyFestivals = useMemo(() => {
        let list = [];
        if (selectedDay === 'all') {
            list = [...festivalsInWeek];
        } else if (selectedDay === 'weekend') {
            list = [...weekendFestivals];
        } else {
            list = festivalsByDay[selectedDay] || [];
        }

        // Sort: active today first, then by earliest start date
        return list.sort((a, b) => {
            const aToday = isFestivalActiveOnDate(a, todayIso);
            const bToday = isFestivalActiveOnDate(b, todayIso);
            if (aToday && !bToday) return -1;
            if (!aToday && bToday) return 1;
            return a.name.localeCompare(b.name, 'it');
        });
    }, [festivalsInWeek, weekendFestivals, festivalsByDay, selectedDay, todayIso]);

    // ── NAVIGATION HANDLERS ──
    const handlePrevWeek = () => {
        const prev = new Date(currentDate);
        prev.setDate(prev.getDate() - 7);
        setCurrentDate(prev);
    };

    const handleNextWeek = () => {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + 7);
        setCurrentDate(next);
    };

    const handleJumpToToday = () => {
        setCurrentDate(new Date());
        setSelectedDay('all');
    };

    const handleDateInputChange = (e) => {
        const val = e.target.value;
        if (val) {
            const d = parseISODate(val);
            setCurrentDate(d);
            setSelectedDay(val);
            setSelectedMonthDay(val);
        }
    };

    // ── SMART NEXT WEEK LOCATOR (when 0 events) ──
    const nextActiveFestival = useMemo(() => {
        if (festivalsInWeek.length > 0) return null;
        // Find closest festival starting after this week
        const future = festivals
            .filter(f => f.start_date > sundayIso)
            .sort((a, b) => a.start_date.localeCompare(b.start_date));
        if (future.length > 0) return future[0];

        // Or closest in past
        const past = festivals
            .filter(f => (f.end_date || f.start_date) < mondayIso)
            .sort((a, b) => (b.end_date || b.start_date).localeCompare(a.end_date || a.start_date));
        if (past.length > 0) return past[0];

        return null;
    }, [festivalsInWeek, festivals, sundayIso, mondayIso]);

    // ── MONTH VIEW LOGIC ──
    const monthYearTitle = useMemo(() => {
        return `${ITALIAN_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }, [currentDate]);

    const monthDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        // Leading padding days (Monday = 1, Sunday = 0)
        let firstDayIndex = firstDay.getDay(); // 0 is Sun
        const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

        for (let i = startOffset; i > 0; i--) {
            const padDate = new Date(year, month, 1 - i);
            days.push({
                date: padDate,
                iso: formatISODate(padDate),
                dayNumber: padDate.getDate(),
                isCurrentMonth: false,
                isToday: formatISODate(padDate) === todayIso,
            });
        }

        // Days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            const iso = formatISODate(d);
            days.push({
                date: d,
                iso,
                dayNumber: i,
                isCurrentMonth: true,
                isToday: iso === todayIso,
            });
        }

        // Trailing padding to fill 35 or 42 cells (multiple of 7)
        const remainder = days.length % 7;
        if (remainder !== 0) {
            const trailingCount = 7 - remainder;
            for (let i = 1; i <= trailingCount; i++) {
                const padDate = new Date(year, month + 1, i);
                days.push({
                    date: padDate,
                    iso: formatISODate(padDate),
                    dayNumber: padDate.getDate(),
                    isCurrentMonth: false,
                    isToday: formatISODate(padDate) === todayIso,
                });
            }
        }

        return days;
    }, [currentDate, todayIso]);

    const handlePrevMonth = () => {
        const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        setCurrentDate(prev);
    };

    const handleNextMonth = () => {
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        setCurrentDate(next);
    };

    const monthDayFestivals = useMemo(() => {
        if (!selectedMonthDay) return [];
        return festivals.filter(f => isFestivalActiveOnDate(f, selectedMonthDay));
    }, [festivals, selectedMonthDay]);

    return (
        <div className="calendar-weekly-container">
            {/* ── TOP CONTROL BAR: VIEW SELECTOR & NAVIGATION ── */}
            <div className="cal-top-toolbar">
                {/* View Switcher: Week vs Month */}
                <div className="cal-view-toggle" role="group" aria-label="Modalità calendario">
                    <button
                        type="button"
                        className={`cal-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
                        onClick={() => setViewMode('week')}
                        aria-pressed={viewMode === 'week'}
                    >
                        <span className="material-symbols-rounded">view_week</span>
                        <span>Vista Settimana</span>
                    </button>
                    <button
                        type="button"
                        className={`cal-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
                        onClick={() => setViewMode('month')}
                        aria-pressed={viewMode === 'month'}
                    >
                        <span className="material-symbols-rounded">calendar_month</span>
                        <span>Vista Mese</span>
                    </button>
                </div>

                {/* Week / Month Navigator */}
                <div className="cal-nav-navigator">
                    <button
                        type="button"
                        className="cal-nav-arrow-btn"
                        onClick={viewMode === 'week' ? handlePrevWeek : handlePrevMonth}
                        aria-label={viewMode === 'week' ? 'Settimana precedente' : 'Mese precedente'}
                        title={viewMode === 'week' ? 'Settimana precedente' : 'Mese precedente'}
                    >
                        <span className="material-symbols-rounded">chevron_left</span>
                    </button>

                    <div className="cal-current-label">
                        <h2>{viewMode === 'week' ? weekTitle : monthYearTitle}</h2>
                        {viewMode === 'week' && isCurrentWeek && (
                            <span className="cal-current-week-tag">
                                <span className="live-dot" />
                                Questa settimana
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        className="cal-nav-arrow-btn"
                        onClick={viewMode === 'week' ? handleNextWeek : handleNextMonth}
                        aria-label={viewMode === 'week' ? 'Settimana successiva' : 'Mese successivo'}
                        title={viewMode === 'week' ? 'Settimana successiva' : 'Mese successivo'}
                    >
                        <span className="material-symbols-rounded">chevron_right</span>
                    </button>
                </div>

                {/* Right utility: "Oggi" & Jump to date */}
                <div className="cal-actions-cluster">
                    <button
                        type="button"
                        className={`cal-today-action-btn ${isCurrentWeek && selectedDay === 'all' ? 'current' : ''}`}
                        onClick={handleJumpToToday}
                        title="Torna alla data di oggi"
                    >
                        <span className="material-symbols-rounded">today</span>
                        <span>Oggi</span>
                    </button>

                    <div className="cal-jump-date-picker" title="Scegli una data specifica sul calendario">
                        <span className="material-symbols-rounded cal-jump-icon">event</span>
                        <input
                            type="date"
                            className="cal-jump-input"
                            aria-label="Scegli data calendario"
                            value={selectedDay !== 'all' && selectedDay !== 'weekend' ? selectedDay : formatISODate(currentDate)}
                            onChange={handleDateInputChange}
                        />
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               VISTA SETTIMANALE (DEFAULT & INTUITIVE)
            ══════════════════════════════════════════════════ */}
            {viewMode === 'week' && (
                <div className="cal-weekly-view animate-fade-in">
                    {/* DAY-BY-DAY SELECTOR STRIP */}
                    <div className="cal-days-strip-container">
                        <div className="cal-days-strip" role="tablist" aria-label="Filtra per giorno della settimana">
                            {/* ALL WEEK PILL */}
                            <button
                                type="button"
                                className={`day-pill day-pill-all ${selectedDay === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedDay('all')}
                                role="tab"
                                aria-selected={selectedDay === 'all'}
                            >
                                <span className="day-pill-top">Tutta la settimana</span>
                                <span className="day-pill-sub">Tutti i 7 giorni</span>
                                <span className="day-pill-count">{festivalsInWeek.length}</span>
                            </button>

                            {/* WEEKEND SHORTCUT PILL */}
                            <button
                                type="button"
                                className={`day-pill day-pill-weekend ${selectedDay === 'weekend' ? 'active' : ''}`}
                                onClick={() => setSelectedDay('weekend')}
                                role="tab"
                                aria-selected={selectedDay === 'weekend'}
                            >
                                <span className="day-pill-top">
                                    <span className="material-symbols-rounded pill-sparkle-icon">weekend</span>
                                    Weekend
                                </span>
                                <span className="day-pill-sub">Ven – Dom</span>
                                <span className="day-pill-count">{weekendFestivals.length}</span>
                            </button>

                            {/* 7 DAYS OF THE WEEK */}
                            {weekDays.map(day => {
                                const count = (festivalsByDay[day.iso] || []).length;
                                const isSelected = selectedDay === day.iso;
                                return (
                                    <button
                                        key={day.iso}
                                        type="button"
                                        className={`day-pill ${isSelected ? 'active' : ''} ${day.isToday ? 'is-today' : ''} ${day.isWeekend ? 'is-weekend' : ''}`}
                                        onClick={() => setSelectedDay(day.iso)}
                                        role="tab"
                                        aria-selected={isSelected}
                                    >
                                        <span className="day-pill-dayname">{day.shortName}</span>
                                        <span className="day-pill-daynum">{day.dayNumber}</span>
                                        {day.isToday && <span className="day-pill-today-dot" title="Oggi">OGGI</span>}
                                        <span className={`day-pill-count ${count === 0 ? 'zero' : ''}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* CURRENT SELECTION SUMMARY BANNER */}
                    <div className="cal-selection-banner">
                        <div className="cal-banner-left">
                            <span className="material-symbols-rounded cal-banner-icon">
                                {selectedDay === 'all' ? 'date_range' : selectedDay === 'weekend' ? 'weekend' : 'event'}
                            </span>
                            <div className="cal-banner-text">
                                <span className="cal-banner-headline">
                                    {selectedDay === 'all' && `Sagre in programma questa settimana (${festivalsInWeek.length})`}
                                    {selectedDay === 'weekend' && `Sagre del Weekend: Venerdì – Domenica (${weekendFestivals.length})`}
                                    {selectedDay !== 'all' && selectedDay !== 'weekend' && (
                                        <>
                                            Sagre attive {ITALIAN_DAYS[weekDays.findIndex(d => d.iso === selectedDay)] || ''} {parseISODate(selectedDay).getDate()} {ITALIAN_MONTHS[parseISODate(selectedDay).getMonth()]} ({displayedWeeklyFestivals.length})
                                        </>
                                    )}
                                </span>
                                <span className="cal-banner-sub">
                                    {selectedDay === 'all' && 'Clicca su un giorno specifico sopra o sul Weekend per isolare le serate'}
                                    {selectedDay === 'weekend' && 'Focus sugli appuntamenti da venerdì sera a domenica'}
                                    {selectedDay !== 'all' && selectedDay !== 'weekend' && 'Visualizzazione filtrata per questa singola data'}
                                </span>
                            </div>
                        </div>

                        {selectedDay !== 'all' && (
                            <button
                                type="button"
                                className="cal-reset-selection-btn"
                                onClick={() => setSelectedDay('all')}
                            >
                                <span className="material-symbols-rounded">restart_alt</span>
                                Mostra tutta la settimana
                            </button>
                        )}
                    </div>

                    {/* ── FESTIVAL CARDS LIST ── */}
                    {displayedWeeklyFestivals.length === 0 ? (
                        <div className="cal-empty-week-card">
                            <div className="cal-empty-icon-wrap">
                                <span className="material-symbols-rounded">event_busy</span>
                            </div>
                            <h3>Nessuna sagra trovata</h3>
                            <p>
                                Non ci sono eventi registrati in questa selezione con i filtri attuali.
                            </p>
                            
                            {nextActiveFestival && (
                                <div className="cal-empty-suggestion">
                                    <span>Suggerimento:</span>
                                    <button
                                        type="button"
                                        className="cal-suggestion-btn"
                                        onClick={() => {
                                            const d = parseISODate(nextActiveFestival.start_date);
                                            setCurrentDate(d);
                                            setSelectedDay('all');
                                        }}
                                    >
                                        <span className="material-symbols-rounded">arrow_forward</span>
                                        Salta a <strong>{nextActiveFestival.name}</strong> ({fmtDateRange(nextActiveFestival.start_date, nextActiveFestival.end_date)})
                                    </button>
                                </div>
                            )}

                            <div className="cal-empty-actions">
                                <button
                                    type="button"
                                    className="cal-action-pill"
                                    onClick={handleJumpToToday}
                                >
                                    Torna a questa settimana
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="cal-cards-feed">
                            {displayedWeeklyFestivals.map(festival => (
                                <WeeklyFestivalCard
                                    key={festival.id}
                                    festival={festival}
                                    weekDays={weekDays}
                                    todayIso={todayIso}
                                    selectedDay={selectedDay}
                                    onSelect={() => {
                                        if (onEventSelect) onEventSelect(festival);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════
               VISTA MENSILE (CLEAN, READABLE & ACCESSIBLE)
            ══════════════════════════════════════════════════ */}
            {viewMode === 'month' && (
                <div className="cal-month-view animate-fade-in">
                    <div className="month-grid-wrapper">
                        {/* 7 WEEKDAY HEADERS */}
                        <div className="month-weekday-row">
                            {ITALIAN_DAYS_SHORT.map(name => (
                                <div key={name} className="month-weekday-cell">{name}</div>
                            ))}
                        </div>

                        {/* MONTH DAYS GRID */}
                        <div className="month-days-grid">
                            {monthDays.map((dayItem, idx) => {
                                const dayFestivals = festivals.filter(f => isFestivalActiveOnDate(f, dayItem.iso));
                                const count = dayFestivals.length;
                                const isSelected = selectedMonthDay === dayItem.iso;

                                return (
                                    <button
                                        key={`${dayItem.iso}-${idx}`}
                                        type="button"
                                        className={`month-day-cell ${!dayItem.isCurrentMonth ? 'padding-day' : ''} ${dayItem.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                                        onClick={() => setSelectedMonthDay(dayItem.iso)}
                                        aria-label={`${dayItem.dayNumber} ${ITALIAN_MONTHS[dayItem.date.getMonth()]}: ${count} sagre`}
                                    >
                                        <div className="month-day-header">
                                            <span className="month-day-number">{dayItem.dayNumber}</span>
                                            {count > 0 && (
                                                <span className="month-day-count-badge">{count}</span>
                                            )}
                                        </div>

                                        {/* EVENT INDICATOR DOTS / PILLS */}
                                        {count > 0 && (
                                            <div className="month-day-dots">
                                                {dayFestivals.slice(0, 3).map(f => {
                                                    const catInfo = CATS[f.cat] || CATS['popolare'];
                                                    return (
                                                        <span
                                                            key={f.id}
                                                            className="month-dot"
                                                            style={{ backgroundColor: catInfo.hex || '#2A4B3C' }}
                                                            title={`${f.name} (${f.city})`}
                                                        />
                                                    );
                                                })}
                                                {count > 3 && (
                                                    <span className="month-dot-plus">+{count - 3}</span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* MONTH SELECTED DAY DETAIL PANEL */}
                    <div className="month-day-detail-panel">
                        <div className="month-panel-header">
                            <div className="month-panel-title">
                                <span className="material-symbols-rounded">event</span>
                                <div>
                                    <h3>
                                        {parseISODate(selectedMonthDay).getDate()} {ITALIAN_MONTHS[parseISODate(selectedMonthDay).getMonth()]} {parseISODate(selectedMonthDay).getFullYear()}
                                    </h3>
                                    <p>{monthDayFestivals.length} sagr{monthDayFestivals.length === 1 ? 'a attiva' : 'e attive'} in questa data</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="cal-switch-to-week-btn"
                                onClick={() => {
                                    setCurrentDate(parseISODate(selectedMonthDay));
                                    setSelectedDay(selectedMonthDay);
                                    setViewMode('week');
                                }}
                            >
                                <span className="material-symbols-rounded">view_week</span>
                                Apri vista settimanale di questa data
                            </button>
                        </div>

                        {monthDayFestivals.length === 0 ? (
                            <div className="month-panel-empty">
                                <p>Nessun evento in programma per questo giorno.</p>
                            </div>
                        ) : (
                            <div className="cal-cards-feed">
                                {monthDayFestivals.map(festival => (
                                    <WeeklyFestivalCard
                                        key={festival.id}
                                        festival={festival}
                                        weekDays={weekDays}
                                        todayIso={todayIso}
                                        selectedDay={selectedMonthDay}
                                        onSelect={() => {
                                            if (onEventSelect) onEventSelect(festival);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── HIGH READABILITY WEEKLY FESTIVAL CARD COMPONENT ──
function WeeklyFestivalCard({ festival: f, weekDays, todayIso, selectedDay, onSelect }) {
    const cat = CATS[f.cat] || CATS['popolare'];
    const catIcon = CAT_ICONS[f.cat] || 'restaurant';
    const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
    const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

    // Is active today
    const activeToday = isFestivalActiveOnDate(f, todayIso);

    // Opening status in this week
    const openDaysInWeek = weekDays.filter(d => isFestivalActiveOnDate(f, d.iso));
    const allWeekOpen = openDaysInWeek.length === 7;
    const weekendOnly = openDaysInWeek.length <= 3 && openDaysInWeek.every(d => d.isWeekend);

    return (
        <article className="weekly-card animate-fade-in">
            {/* THUMBNAIL & BADGES */}
            <div className="weekly-card-media">
                <img
                    src={imgSrc}
                    alt={f.name}
                    loading="lazy"
                    onError={(e) => {
                        if (e.target.src !== fallbackPhoto) {
                            e.target.src = fallbackPhoto;
                        }
                    }}
                />
                <div className="weekly-media-overlay">
                    {activeToday ? (
                        <span className="status-badge status-today">
                            <span className="live-dot" />
                            Aperto Oggi
                        </span>
                    ) : weekendOnly ? (
                        <span className="status-badge status-weekend">
                            <span className="material-symbols-rounded" style={{ fontSize: 13 }}>weekend</span>
                            Weekend
                        </span>
                    ) : allWeekOpen ? (
                        <span className="status-badge status-allweek">
                            Tutta la settimana
                        </span>
                    ) : null}
                </div>
            </div>

            {/* MAIN CARD CONTENT */}
            <div className="weekly-card-body">
                {/* CATEGORY & PROVINCE HEADER */}
                <div className="weekly-card-tags-row">
                    <span className="cat-chip" style={{ backgroundColor: `${cat.hex}18`, color: cat.hex, borderColor: `${cat.hex}35` }}>
                        <span className="material-symbols-rounded">{catIcon}</span>
                        {cat.label}
                    </span>
                    <span className="province-badge">
                        {f.province || 'PG'}
                    </span>
                    {f.average_rating ? (
                        <div className="weekly-rating-chip">
                            <ForkRating rating={f.average_rating} size={14} activeColor="#F59E0B" />
                            <span className="rating-score">{f.average_rating.toFixed(1)}</span>
                            <span className="rating-count">({f.review_count || 0})</span>
                        </div>
                    ) : (
                        <span className="weekly-no-rating-chip">Novità</span>
                    )}
                </div>

                {/* FESTIVAL TITLE & LOCATION */}
                <h3 className="weekly-card-title">
                    <Link to={`/festival/${f.id}`} className="title-link">
                        {f.name}
                    </Link>
                </h3>

                <div className="weekly-card-meta">
                    <span className="meta-item">
                        <span className="material-symbols-rounded">location_on</span>
                        <strong>{f.city}</strong> ({f.province})
                    </span>
                    <span className="meta-separator">•</span>
                    <span className="meta-item">
                        <span className="material-symbols-rounded">calendar_month</span>
                        {fmtDateRange(f.start_date, f.end_date)}
                    </span>
                </div>

                {/* DISH / MENU PREVIEW */}
                {(f.dish_info || f.description) && (
                    <p className="weekly-card-desc">
                        {f.dish_info ? `🍽️ Piatti tipici: ${f.dish_info}` : f.description}
                    </p>
                )}

                {/* ── 7-DAY APERTURE TIMELINE MATRIX ── */}
                <div className="weekly-aperture-row" aria-label="Apertura della sagra nei giorni di questa settimana">
                    <span className="aperture-label">Apertura questa settimana:</span>
                    <div className="aperture-matrix">
                        {weekDays.map(day => {
                            const isOpen = isFestivalActiveOnDate(f, day.iso);
                            const isFocused = selectedDay === day.iso;
                            return (
                                <div
                                    key={day.iso}
                                    className={`aperture-day-node ${isOpen ? 'open' : 'closed'} ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today' : ''} ${isFocused ? 'focused' : ''}`}
                                    title={`${day.dayName} ${day.dayNumber}: ${isOpen ? 'Aperto' : 'Chiuso'}`}
                                >
                                    <span className="aperture-letter">{day.shortName[0]}</span>
                                    <span className="aperture-status-dot" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* CARD ACTIONS */}
                <div className="weekly-card-actions">
                    <Link to={`/festival/${f.id}`} className="card-btn card-btn-primary">
                        <span>Scheda Sagra</span>
                        <span className="material-symbols-rounded">arrow_forward</span>
                    </Link>

                    <Link to={`/mappa?id=${f.id}`} className="card-btn card-btn-secondary" title="Vedi posizione sulla mappa">
                        <span className="material-symbols-rounded">map</span>
                        <span>Mappa</span>
                    </Link>

                    <CalendarExport
                        festival={f}
                        buttonClassName="card-btn card-btn-secondary"
                        placement="top"
                    />
                </div>
            </div>
        </article>
    );
}