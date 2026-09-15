import React, { useState, useEffect, useRef } from 'react';

const formatICSDate = (dateStr) => {
    if (!dateStr) return '';
    const clean = dateStr.replace(/-/g, '');
    return `${clean}T090000Z`;
};

const CalendarExport = ({ festival, buttonClassName = 'hero-action-btn', placement = 'bottom' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    if (!festival) return null;

    const title = encodeURIComponent(`Sagra: ${festival.name}`);
    const location = encodeURIComponent(`${festival.city} (${festival.province}), Umbria`);
    const details = encodeURIComponent(`${festival.description || 'Sagra e festività popolare in Umbria'}\nPiatti tipici: ${festival.dish_info || 'N/D'}\nSito: ${festival.source_url || ''}`);

    const startDateFormated = festival.start_date ? festival.start_date.replace(/-/g, '') : '';
    const endDateFormated = festival.end_date ? festival.end_date.replace(/-/g, '') : startDateFormated;
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateFormated}/${endDateFormated}&details=${details}&location=${location}`;

    const handleDownloadICS = () => {
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SagraUmbra//IT',
            'BEGIN:VEVENT',
            `SUMMARY:${festival.name}`,
            `LOCATION:${festival.city} (${festival.province}), Umbria`,
            `DESCRIPTION:${(festival.description || 'Sagra popolare umbra').replace(/\n/g, ' ')}`,
            `DTSTART;VALUE=DATE:${startDateFormated}`,
            `DTEND;VALUE=DATE:${endDateFormated}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `sagra_${festival.city.toLowerCase()}_${startDateFormated}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isTop = placement === 'top';

    return (
        <div className={`cal-export-wrap ${isOpen ? 'is-open' : ''}`} ref={ref}>
            <button
                type="button"
                className={buttonClassName}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                title={isOpen ? undefined : "Aggiungi a Calendario"}
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
                    role="menu"
                    aria-label="Aggiungi a calendario"
                >
                    <a
                        href={googleCalendarUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="cal-export-item"
                        role="menuitem"
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
                        role="menuitem"
                        onClick={() => { handleDownloadICS(); setIsOpen(false); }}
                    >
                        <span className="material-symbols-rounded cal-icon-ical">download</span>
                        <div>
                            <div className="cal-item-title">Apple / iCal</div>
                            <div className="cal-item-sub">Scarica file .ics</div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalendarExport;
