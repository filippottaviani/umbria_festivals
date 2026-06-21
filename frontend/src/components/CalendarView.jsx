import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const CalendarView = ({ festivals }) => {
    const events = festivals.map(festival => ({
        id: festival.id,
        title: `${festival.name} - ${festival.city}`,
        start: festival.start_date,
        end: festival.end_date,
        url: festival.source_url
    }));

    return (
        <div style={{ height: '600px', margin: '20px 0' }}>
            <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={events}
            />
        </div>
    );
};

export default CalendarView;