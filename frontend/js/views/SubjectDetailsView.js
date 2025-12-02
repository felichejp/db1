import authService from '../services/authService.js';
import { tutorsAPI } from '../api/tutors.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Vista de Detalles de Materia
 * Muestra información completa de la materia, horarios y calendario de asesorías
 */
class SubjectDetailsView {
  async render() {
    const hash = window.location.hash;
    const match = hash.match(/#\/subjects\/(.+)/);
    
    if (!match) {
      Notification.error('Materia no especificada');
      window.location.hash = '#/dashboard';
      return;
    }

    const subjectName = decodeURIComponent(match[1]);
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="subject-details-header">
        <button class="btn btn-secondary" onclick="window.location.hash='#/dashboard'">
          ← Volver
        </button>
        <div>
          <h1 class="subject-details-title">${subjectName}</h1>
          <p class="subject-details-subtitle">Información y asesorías disponibles</p>
        </div>
      </div>

      <div class="subject-details-content">
        <div class="subject-info-card card">
          <div class="card__header">
            <h2 class="card__title">Información de la Materia</h2>
          </div>
          <div class="card__body" id="subject-info">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="subject-schedule-card card">
          <div class="card__header">
            <h2 class="card__title">Horarios Disponibles</h2>
          </div>
          <div class="card__body" id="subject-schedule">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="subject-calendar-card card">
          <div class="card__header">
            <h2 class="card__title">Calendario de Asesorías</h2>
          </div>
          <div class="card__body" id="subject-calendar">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="subject-actions">
          <button class="btn btn-primary btn-lg" id="request-tutoring-btn">
            📅 Solicitar Asesoría
          </button>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadSubjectData(subjectName);
      
      // Event listener para solicitar asesoría
      document.getElementById('request-tutoring-btn')?.addEventListener('click', () => {
        this.requestTutoring(subjectName);
      });
    } catch (error) {
      Notification.error('Error al cargar los detalles de la materia');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadSubjectData(subjectName) {
    try {
      // Obtener tutores que enseñan esta materia
      const tutorsRes = await tutorsAPI.getAll();
      const tutors = tutorsRes.success ? tutorsRes.data : [];
      const subjectTutors = tutors.filter(tutor => 
        tutor.subjects?.some(s => s.materia === subjectName)
      );

      // Obtener sesiones relacionadas con esta materia
      const sessionsRes = await sessionsAPI.getAll();
      const sessions = sessionsRes.success ? sessionsRes.data : [];
      const subjectSessions = sessions.filter(session => 
        session.tema?.toLowerCase().includes(subjectName.toLowerCase()) ||
        session.grupo?.nombre?.toLowerCase().includes(subjectName.toLowerCase())
      );

      // Renderizar información
      this.renderSubjectInfo(subjectName, subjectTutors);
      this.renderSchedule(subjectTutors);
      this.renderCalendar(subjectSessions);
    } catch (error) {
      console.error('Error loading subject data:', error);
      throw error;
    }
  }

  renderSubjectInfo(subjectName, tutors) {
    const container = document.getElementById('subject-info');
    
    const uniqueLevels = new Set();
    tutors.forEach(tutor => {
      tutor.subjects?.forEach(subject => {
        if (subject.materia === subjectName && subject.nivel) {
          uniqueLevels.add(subject.nivel);
        }
      });
    });

    container.innerHTML = `
      <div class="info-grid">
        <div class="info-item-large">
          <span class="info-label">Nombre de la Materia</span>
          <span class="info-value">${subjectName}</span>
        </div>
        <div class="info-item-large">
          <span class="info-label">Asesores Disponibles</span>
          <span class="info-value">${tutors.length}</span>
        </div>
        <div class="info-item-large">
          <span class="info-label">Niveles Disponibles</span>
          <span class="info-value">${uniqueLevels.size > 0 ? Array.from(uniqueLevels).join(', ') : 'Todos'}</span>
        </div>
      </div>
    `;
  }

  renderSchedule(tutors) {
    const container = document.getElementById('subject-schedule');
    
    if (tutors.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state__message">No hay horarios disponibles</p>
        </div>
      `;
      return;
    }

    // Agrupar disponibilidad por día
    const scheduleByDay = {};
    
    tutors.forEach(tutor => {
      if (tutor.availability && Array.isArray(tutor.availability)) {
        tutor.availability.forEach(avail => {
          const day = avail.dia || 'No especificado';
          if (!scheduleByDay[day]) {
            scheduleByDay[day] = [];
          }
          scheduleByDay[day].push({
            horaInicio: avail.horaInicio,
            horaFin: avail.horaFin,
            tutor: tutor.nombre || 'Asesor'
          });
        });
      }
    });

    if (Object.keys(scheduleByDay).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state__message">No hay horarios registrados</p>
        </div>
      `;
      return;
    }

    container.innerHTML = Object.entries(scheduleByDay).map(([day, schedules]) => `
      <div class="schedule-day">
        <h3 class="schedule-day__title">${day}</h3>
        <div class="schedule-list">
          ${schedules.map(schedule => `
            <div class="schedule-item">
              <span class="schedule-time">${formatTime(schedule.horaInicio)} - ${formatTime(schedule.horaFin)}</span>
              <span class="schedule-tutor">${schedule.tutor}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  renderCalendar(sessions) {
    const container = document.getElementById('subject-calendar');
    
    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state__message">No hay asesorías programadas</p>
        </div>
      `;
      return;
    }

    // Agrupar sesiones por fecha
    const sessionsByDate = {};
    sessions.forEach(session => {
      const date = session.fecha || 'Sin fecha';
      if (!sessionsByDate[date]) {
        sessionsByDate[date] = [];
      }
      sessionsByDate[date].push(session);
    });

    container.innerHTML = Object.entries(sessionsByDate).map(([date, dateSessions]) => `
      <div class="calendar-day">
        <h3 class="calendar-day__title">${formatDate(date)}</h3>
        <div class="calendar-sessions">
          ${dateSessions.map(session => `
            <div class="calendar-session">
              <div class="calendar-session__time">
                ${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}
              </div>
              <div class="calendar-session__info">
                <span class="calendar-session__topic">${session.tema || 'Sin tema'}</span>
                <span class="calendar-session__status badge badge--${session.estado === 'programada' ? 'info' : session.estado === 'completada' ? 'success' : 'warning'}">
                  ${session.estado}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  async requestTutoring(subjectName) {
    try {
      const tutorsRes = await tutorsAPI.getAll();
      const tutors = tutorsRes.success ? tutorsRes.data : [];
      const subjectTutors = tutors.filter(tutor => 
        tutor.subjects?.some(s => s.materia === subjectName)
      );

      if (subjectTutors.length === 0) {
        Notification.warning('No hay asesores disponibles para esta materia');
        return;
      }

      this.showTutoringRequestModal(subjectName, subjectTutors);
    } catch (error) {
      Notification.error('Error al solicitar asesoría');
      console.error(error);
    }
  }

  showTutoringRequestModal(subjectName, tutors) {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    const content = `
      <div class="tutoring-request-form">
        <div class="form-group">
          <label class="form-label">Materia</label>
          <input type="text" class="form-input" value="${subjectName}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Asesoría <span class="required">*</span></label>
          <input 
            type="date" 
            id="tutoring-date" 
            class="form-input" 
            min="${today.toISOString().split('T')[0]}"
            max="${maxDate.toISOString().split('T')[0]}"
            required
          >
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Hora Inicio <span class="required">*</span></label>
            <input type="time" id="tutoring-start" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Hora Fin <span class="required">*</span></label>
            <input type="time" id="tutoring-end" class="form-input" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tema / Descripción</label>
          <textarea 
            id="tutoring-topic" 
            class="form-textarea" 
            placeholder="Describe el tema que necesitas asesorar"
            rows="3"
          ></textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
      <button class="btn btn-primary" data-action="submit">Solicitar Asesoría</button>
    `;

    Modal.show({
      title: `Solicitar Asesoría - ${subjectName}`,
      content: content,
      footer: footer,
      onAction: async (action) => {
        if (action === 'submit') {
          const fecha = document.getElementById('tutoring-date').value;
          const horaInicio = document.getElementById('tutoring-start').value;
          const horaFin = document.getElementById('tutoring-end').value;
          const tema = document.getElementById('tutoring-topic').value;

          if (!fecha || !horaInicio || !horaFin) {
            Notification.error('Por favor completa todos los campos requeridos');
            return;
          }

          try {
            Loading.show();
            Notification.info('Funcionalidad de solicitud de asesoría en desarrollo');
            Modal.close();
          } catch (error) {
            Notification.error('Error al solicitar asesoría');
          } finally {
            Loading.hide();
          }
        }
      }
    });
  }
}

export default new SubjectDetailsView();

