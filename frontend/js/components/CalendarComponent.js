import { formatDate } from '../utils/helpers.js';

export default class CalendarComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            onDateClick: options.onDateClick || (() => { }),
            onEventClick: options.onEventClick || (() => { }),
            ...options
        };
        this.currentDate = new Date();
        this.events = [];
    }

    setEvents(events) {
        this.events = events;
        this.render();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startingDay = firstDay.getDay(); // 0 = Sunday
        const totalDays = lastDay.getDate();

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        let html = `
      <div class="calendar">
        <div class="calendar-header">
          <button class="btn btn-sm btn-secondary" id="prev-month">&lt;</button>
          <h3>${monthNames[month]} ${year}</h3>
          <button class="btn btn-sm btn-secondary" id="next-month">&gt;</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-day-header">Dom</div>
          <div class="calendar-day-header">Lun</div>
          <div class="calendar-day-header">Mar</div>
          <div class="calendar-day-header">Mié</div>
          <div class="calendar-day-header">Jue</div>
          <div class="calendar-day-header">Vie</div>
          <div class="calendar-day-header">Sáb</div>
    `;

        // Empty cells for days before start of month
        for (let i = 0; i < startingDay; i++) {
            html += `<div class="calendar-day empty"></div>`;
        }

        // Days of the month
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = this.events.filter(e => e.fecha.startsWith(dateStr));

            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            html += `
        <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <span class="day-number">${day}</span>
          <div class="day-events">
            ${dayEvents.map(event => `
              <div class="calendar-event status-${event.estado}" data-id="${event.id}" title="${event.materia || 'Sesión'}">
                ${event.horaInicio.substring(0, 5)} ${event.materia || 'Sesión'}
              </div>
            `).join('')}
          </div>
        </div>
      `;
        }

        html += `
        </div>
      </div>
    `;

        container.innerHTML = html;
        this.attachEventListeners();
    }

    attachEventListeners() {
        document.getElementById('prev-month').onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        };

        document.getElementById('next-month').onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        };

        document.querySelectorAll('.calendar-day').forEach(el => {
            el.onclick = (e) => {
                if (e.target.closest('.calendar-event')) return;
                this.options.onDateClick(el.dataset.date);
            };
        });

        document.querySelectorAll('.calendar-event').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                this.options.onEventClick(el.dataset.id);
            };
        });
    }
}
