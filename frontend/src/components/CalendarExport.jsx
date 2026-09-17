import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const getInclusiveGoogleEndDate = (endDateStr) => {
    if (!endDateStr) return '';
    const parts = endDateStr.split('-');
    if (parts.length !== 3) return endDateStr.replace(/-/g, '');
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    d.setUTCDate(d.getUTCDate() + 1);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const CalendarExport = ({
    festival,
    buttonClassName = 'hero-action-btn',
    placement = 'bottom',
    showCalendarLink = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close on click outside or Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!festival) return null;

    const hasDates = Boolean(festival.start_date);
    const startDateFormatted = festival.start_date ? festival.start_date.replace(/-/g, '') : '';
    const endDateExclusiveFormatted = festival.end_date
        ? getInclusiveGoogleEndDate(festival.end_date)
        : (festival.start_date ? getInclusiveGoogleEndDate(festival.start_date) : '');

    const title = encodeURIComponent(`Sagra: ${festival.name}`);
    const location = encodeURIComponent(`${festival.city || ''} (${festival.province || ''}), Umbria`);
    const details = encodeURIComponent(
        `${festival.description || 'Sagra e festività tipica in Umbria'}\nPiatti tipici: ${festival.dish_info || festival.menu_info || 'Specialità umbre'}\nSito: ${festival.source_url || 'https://sagraumbra.it'}`
    );

    const googleCalendarUrl = hasDates
        ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateFormatted}/${endDateExclusiveFormatted}&details=${details}&location=${location}`
        : '#';

    const handleDownloadICS = () => {
        if (!hasDates) return;

        const nowFormatted = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const uid = `festival-${festival.id || Date.now()}@sagraumbra.it`;

        // Escape special characters per RFC 5545
        const escapeICS = (str) => (str || '')
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\r?\n/g, '\\n');

        const summary = escapeICS(festival.name);
        const locationStr = escapeICS(`${festival.city || ''} (${festival.province || ''}), Umbria`);
        const descStr = escapeICS(
            `${festival.description || 'Sagra popolare umbra'}\nPiatti tipici: ${festival.dish_info || festival.menu_info || 'Specialità umbre'}\nSito: ${festival.source_url || 'https://sagraumbra.it'}`
        );

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SagraUmbra//IT',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${nowFormatted}`,
            `SUMMARY:${summary}`,
            `LOCATION:${locationStr}`,
            `DESCRIPTION:${descStr}`,
            `DTSTART;VALUE=DATE:${startDateFormatted}`,
            `DTEND;VALUE=DATE:${endDateExclusiveFormatted}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const citySlug = (festival.city || 'umbria').toLowerCase().replace(/\s+/g, '_');
        link.setAttribute('download', `sagra_${citySlug}_${startDateFormatted}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const isTop = placement === 'top';

    return (
        <div className={`cal-export-wrap ${isOpen ? 'is-open' : ''}`} ref={ref}>
            <button
                type="button"
                className={buttonClassName}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                title={isOpen ? 'Chiudi opzioni calendario' : 'Opzioni calendario'}
            >
                <span className="material-symbols-rounded">edit_calendar</span>
                <span className="hero-btn-label">Calendario</span>
                <span className="material-symbols-rounded cal-chevron" style={{ fontSize: 15, opacity: 0.7 }}>
                    {isTop ? (isOpen ? 'expand_more' : 'expand_less') : (isOpen ? 'expand_less' : 'expand_more')}
                </span>
            </button>

            {isOpen && (
                <div
                    className={`cal-export-dropdown cal-export-dropdown-${placement} animate-slide-down`}
                    aria-label="Opzioni calendario"
                >
                    {hasDates ? (
                        <>
                            <a
                                href={googleCalendarUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="cal-export-item"
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="material-symbols-rounded cal-icon-google">event</span>
                                <div>
                                    <div className="cal-item-title">Google Calendar</div>
                                    <div className="cal-item-sub">Apri nel browser</div>
                                </div>
                            </a>

                            <button
                                type="button"
                                className="cal-export-item"
                                onClick={() => { handleDownloadICS(); setIsOpen(false); }}
                            >
                                <span className="material-symbols-rounded cal-icon-ical">download</span>
                                <div>
                                    <div className="cal-item-title">Apple / iCal / Outlook</div>
                                    <div className="cal-item-sub">Scarica promemoria .ics</div>
                                </div>
                            </button>
                        </>
                    ) : (
                        <div className="cal-export-nodate" style={{ padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: 'var(--antracite-2)' }}>
                            Date non ancora annunciate
                        </div>
                    )}

                    {showCalendarLink && (
                        <Link
                            to="/calendario"
                            className="cal-export-item"
                            onClick={() => setIsOpen(false)}
                        >
                            <span className="material-symbols-rounded cal-icon-view">calendar_month</span>
                            <div>
                                <div className="cal-item-title">Calendario Sagre</div>
                                <div className="cal-item-sub">Vedi tutte le sagre dell'Umbria</div>
                            </div>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default CalendarExport;
