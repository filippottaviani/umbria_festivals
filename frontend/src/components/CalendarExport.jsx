import React, { useState } from 'react';

const formatICSDate = (dateStr) => {
    if (!dateStr) return '';
    const clean = dateStr.replace(/-/g, '');
    return `${clean}T090000Z`;
};

const CalendarExport = ({ festival }) => {
    const [isOpen, setIsOpen] = useState(false);

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
            'PRODID:-//Umbria Festivals//IT',
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

    return (
        <div className="calendar-export-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
            <button
                type="button"
                className="details-hero-back"
                style={{
                    background: 'rgba(255,255,255,0.22)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="material-symbols-rounded">edit_calendar</span>
                Aggiungi a Calendario
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    background: '#ffffff',
                    color: '#1E2320',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    padding: '0.5rem',
                    minWidth: '220px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem'
                }}>
                    <a
                        href={googleCalendarUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 0.8rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#1E2320',
                            borderRadius: '6px',
                            textDecoration: 'none'
                        }}
                        onClick={() => setIsOpen(false)}
                    >
                        <span className="material-symbols-rounded" style={{ color: '#4285F4' }}>event</span>
                        Google Calendar
                    </a>

                    <button
                        type="button"
                        onClick={() => {
                            handleDownloadICS();
                            setIsOpen(false);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 0.8rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#1E2320',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <span className="material-symbols-rounded" style={{ color: '#8b0000' }}>download</span>
                        Apple / iCal (.ics)
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalendarExport;
