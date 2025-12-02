/**
 * Componente de Calendario Semanal (Lunes-Sábado, 9am-3pm)
 */
class ScheduleCalendar {
  constructor() {
    this.days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    this.hours = [9, 10, 11, 12, 13, 14, 15]; // 9am a 3pm
  }

  render(containerId, sessions = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Agrupar sesiones por día y hora
    const scheduleMap = this.buildScheduleMap(sessions);

    container.innerHTML = `
      <div class="schedule-calendar">
        <div class="schedule-calendar__header">
          <div class="schedule-calendar__time-header"></div>
          ${this.days.map(day => `
            <div class="schedule-calendar__day-header">${day}</div>
          `).join('')}
        </div>
        <div class="schedule-calendar__body">
          ${this.hours.map(hour => `
            <div class="schedule-calendar__row">
              <div class="schedule-calendar__time-cell">${hour}:00</div>
              ${this.days.map((day, dayIndex) => {
                const dayNumber = dayIndex + 1; // Lunes = 1, Sábado = 6
                const hasSession = scheduleMap[dayNumber]?.includes(hour);
                return `
                  <div class="schedule-calendar__cell ${hasSession ? 'schedule-calendar__cell--busy' : ''}">
                    ${hasSession ? '●' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  buildScheduleMap(sessions) {
    const map = {};
    
    sessions.forEach(session => {
      if (!session.fecha) return;
      
      const date = new Date(session.fecha);
      const dayOfWeek = date.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
      
      // Convertir a nuestro formato (1=Lunes, 6=Sábado)
      let dayNumber = dayOfWeek === 0 ? 6 : dayOfWeek; // Domingo = 6, pero no lo mostramos
      if (dayNumber === 0) dayNumber = 6; // Si es domingo, no lo incluimos
      
      // Solo procesar si es lunes-sábado
      if (dayNumber >= 1 && dayNumber <= 6) {
        const startHour = parseInt(session.horaInicio?.split(':')[0] || '9');
        const endHour = parseInt(session.horaFin?.split(':')[0] || '15');
        
        if (!map[dayNumber]) {
          map[dayNumber] = [];
        }
        
        // Agregar todas las horas en el rango
        for (let h = startHour; h < endHour; h++) {
          if (h >= 9 && h < 15 && !map[dayNumber].includes(h)) {
            map[dayNumber].push(h);
          }
        }
      }
    });
    
    return map;
  }
}

export default new ScheduleCalendar();

