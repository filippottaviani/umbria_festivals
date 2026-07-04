import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CATS } from '../constants';

const CalendarView = ({ festivals }) => {
    const events = festivals.map((festival) => {
        const cat = CATS[festival.cat] || CATS.popolare;
        return {
            id: festival.id,
            title: festival.name,
            start: festival.start_date,
            end: festival.end_date,
            allDay: true,
            backgroundColor: cat.color,
            borderColor: cat.color,
            textColor: '#fff',
            extendedProps: {
                city: festival.city,
                province: festival.province,
            },
        };
    });

    return (
        <div className="map-card">
            <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={events}
                height="auto"
                headerToolbar={{
                    left: 'prev,next',
                    center: 'title',
                    right: 'today',
                }}
                eventDisplay="block"
                dayMaxEvents={3}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
            />
        </div>
    );
};

export default CalendarView;
