'use client';

import { useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventReceiveArg } from '@fullcalendar/interaction';

export default function MainCalendar() {
  const handleEventReceive = (info: EventReceiveArg) => {
    console.log('Event received:', info.event.title);
    console.log('Event start:', info.event.start);
    console.log('Event end:', info.event.end);
  };

  useEffect(() => {
    // Apply Apple-style customizations to FullCalendar
    const style = document.createElement('style');
    style.textContent = `
      .fc {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .fc-header-toolbar {
        padding: 1.5rem 2rem;
        margin-bottom: 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      .fc-toolbar-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1d1d1f;
      }
      .fc-button {
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.1);
        color: #1d1d1f;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-weight: 500;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      .fc-button:hover {
        background: #f5f5f7;
        border-color: rgba(0, 0, 0, 0.15);
      }
      .fc-button:active {
        background: #e8e8ed;
      }
      .fc-button-primary:not(:disabled):active,
      .fc-button-primary:not(:disabled).fc-button-active {
        background: #007AFF;
        border-color: #007AFF;
        color: white;
      }
      .fc-daygrid-day {
        border-color: rgba(0, 0, 0, 0.05);
      }
      .fc-daygrid-day-top {
        padding: 0.75rem;
      }
      .fc-daygrid-day-number {
        color: #1d1d1f;
        font-weight: 500;
        padding: 0.5rem;
      }
      .fc-day-today {
        background: rgba(0, 122, 255, 0.05) !important;
      }
      .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
        background: #007AFF;
        color: white;
        border-radius: 50%;
        width: 1.75rem;
        height: 1.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .fc-event {
        border-radius: 6px;
        border: none;
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        background: #007AFF;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
      }
      .fc-event:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
      }
      .fc-daygrid-event {
        margin: 2px 4px;
      }
      .fc-col-header-cell {
        padding: 0.75rem 0;
        border-color: rgba(0, 0, 0, 0.05);
      }
      .fc-col-header-cell-cushion {
        color: #86868b;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .fc-timegrid-slot {
        border-color: rgba(0, 0, 0, 0.05);
      }
      .fc-timegrid-col {
        border-color: rgba(0, 0, 0, 0.05);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={{ height: '100%', background: '#ffffff' }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        }}
        height="100%"
        droppable={true}
        editable={true}
        eventReceive={handleEventReceive}
      />
    </div>
  );
}
