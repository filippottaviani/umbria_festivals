import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useNavigate } from 'react-router-dom';

const CAT_COLORS = {
    tartufo: '#7A2E39',  // Sagrantino deep burgundy
    carne:   '#DC2626',  // Warm Red
    pesce:   '#0284C7',  // Ocean Blue
    pasta:   '#D97706',  // Amber
    orto:    '#16A34A',  // Green
    grano:   '#CA8A04',  // Golden Wheat
    storica: '#4F46E5',  // Indigo
    popolare:'#2A4B3C',  // Cypress
};

const isOngoing = (f) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(f.start_date);
    const end   = new Date(f.end_date); end.setHours(23,59,59,999);
    return start <= today && today <= end;
};

const CalendarView = ({ festivals = [], onEventSelect }) => {
    const navigate = useNavigate();

    const calendarEvents = festivals.map((f) => {
        const ongoing = isOngoing(f);
        const color = CAT_COLORS[f.cat] || '#2A4B3C';

        // Add 1 day to end_date because FullCalendar end is exclusive for allDay events
        let endDate = f.end_date;
        if (f.end_date) {
            const d = new Date(f.end_date);
            d.setDate(d.getDate() + 1);
            endDate = d.toISOString().split('T')[0];
        }

        return {
            id: f.id,
            title: `${f.name} (${f.city})`,
            start: f.start_date,
            end: endDate,
            allDay: true,
            backgroundColor: color,
            borderColor: ongoing ? '#F59E0B' : color,
            textColor: '#FFFFFF',
            extendedProps: {
                festival: f,
                city: f.city,
                province: f.province,
                cat: f.cat,
                ongoing: ongoing,
            },
        };
    });

    const handleEventClick = (info) => {
        if (onEventSelect) {
            onEventSelect(info.event.extendedProps.festival);
        } else {
            navigate(`/festival/${info.event.id}`);
        }
    };

    return (
        <div className="calendar-container-wrapper">
            <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={calendarEvents}
                height="auto"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek',
                }}
                buttonText={{
                    today: 'Oggi',
                    month: 'Mese',
                    week: 'Settimana',
                }}
                eventDisplay="block"
                dayMaxEvents={3}
                eventClick={handleEventClick}
            />
        </div>
    );
};

export default CalendarView;