import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const CalendarView = ({ festivals }) => {
    const calendarEvents = festivals.map((festival) => {
        return {
            id: festival.id,
            title: festival.name,
            start: festival.start_date,
            end: festival.end_date,
            allDay: true,
            extendedProps: {
                city: festival.city,
                province: festival.province,
                cat: festival.cat
            },
        };
    });

    return (
        <div className="calendar-container-wrapper">
            <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={calendarEvents}
                height="auto"
                headerToolbar={{
                    left: 'prev,next',
                    center: 'title',
                    right: 'today',
                }}
                eventDisplay="block"
                dayMaxEvents={3}
            />
        </div>
    );
};

export default CalendarView;