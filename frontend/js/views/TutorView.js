import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Vista de Tutor (Asesor)
 */
class TutorView {
  constructor() {
    this.groups = [];
    this.sessions = [];
    this.tutorId = null;
    this.currentGroupDetails = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'Tutor') {
      window.location.hash = '#/dashboard';
      return;
    }

    // Obtener tutorId
    try {
      const tutorsRes = await tutorsAPI.getAll();
      if (tutorsRes.success) {
        const tutor = tutorsRes.data.find(t => t.userId === user.id);
        if (tutor) {
          this.tutorId = tutor.id;
        }
      }
    } catch (error) {
      console.error('Error obteniendo tutorId:', error);
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Bienvenido, ${user.nombre}</h1>
          <p class="text-muted">Matrícula: ${user.id} | Rol: Asesor</p>
        </div>
        <div class="card__body">
          <div id="tutor-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadData();
    } catch (error) {
      Notification.error('Error al cargar datos');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadData() {
    try {
      const [groupsRes, sessionsRes] = await Promise.all([
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

      this.groups = groupsRes.success ? groupsRes.data : [];
      this.sessions = sessionsRes.success ? sessionsRes.data : [];

      this.renderContent();
    } catch (error) {
      console.error('Error cargando datos:', error);
      throw error;
    }
  }

  async renderContent() {
    const content = document.getElementById('tutor-content');
    
    if (this.groups.length === 0) {
      content.innerHTML = '<p class="text-muted">No tienes grupos asignados aún.</p>';
      return;
    }

    // Obtener información detallada de cada grupo
    const groupsWithDetails = await Promise.all(
      this.groups.map(async (group) => {
        try {
          const [groupDetailsRes, membersRes] = await Promise.all([
            groupsAPI.getById(group.id),
            groupsAPI.getMembers(group.id)
          ]);

          const groupDetails = groupDetailsRes.success ? groupDetailsRes.data : group;
          const members = membersRes.success ? membersRes.data : [];
          const groupSessions = this.sessions.filter(s => s.groupId === group.id);

          return {
            ...groupDetails,
            members,
            sessions: groupSessions
          };
        } catch (error) {
          console.error(`Error obteniendo detalles del grupo ${group.id}:`, error);
          return { ...group, members: [], sessions: [] };
        }
      })
    );

    content.innerHTML = `
      <div class="groups-grid">
        ${groupsWithDetails.map(group => this.renderGroupCard(group)).join('')}
      </div>
    `;

    // Los botones ahora son enlaces que navegan directamente
  }

  renderGroupCard(group) {
    const members = group.members || [];
    const profesor = members.find(m => m.role === 'Profesor') || 
                     (group.profesorNombre ? { nombre: group.profesorNombre } : null);

    return `
      <div class="group-card">
        <div class="group-card__header">
          <h3 class="group-card__title">${this.escapeHtml(group.nombre || 'Sin nombre')}</h3>
          <span class="badge badge--info">ID: ${group.id}</span>
        </div>
        <div class="group-card__body">
          <div class="group-card__info">
            <div class="info-item">
              <span class="info-label">Materia:</span>
              <span class="info-value">${group.descripcion || 'No especificada'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Profesor:</span>
              <span class="info-value">${profesor ? this.escapeHtml(profesor.nombre) : 'Sin asignar'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Asesor:</span>
              <span class="info-value">Tú</span>
            </div>
            <div class="info-item">
              <span class="info-label">Integrantes:</span>
              <span class="info-value">${members.filter(m => m.role === 'Estudiante').length} / 5</span>
            </div>
            <div class="info-item">
              <span class="info-label">Nombres:</span>
              <span class="info-value">${members.filter(m => m.role === 'Estudiante').map(m => m.nombre).join(', ') || 'Ninguno'}</span>
            </div>
          </div>
          <a href="#/groups/${group.id}/details" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-md); display: block; text-align: center;">
            Ver Detalles
          </a>
        </div>
      </div>
    `;
  }

  async showGroupDetails(group) {
    this.currentGroupDetails = group;
    
    const groupSessions = this.sessions.filter(s => s.groupId === group.id);
    const studentProposedSessions = groupSessions.filter(s => !s.tutorId || s.tutorId !== this.tutorId);
    const acceptedSessions = groupSessions.filter(s => s.estado === 'programada' || s.estado === 'en_curso');

    const members = group.members || [];
    const profesor = members.find(m => m.role === 'Profesor') || 
                     (group.profesorNombre ? { nombre: group.profesorNombre } : null);

    const modalContent = `
      <div class="group-details">
        <div class="group-details__section">
          <h3>Información del Grupo</h3>
          <div class="group-info__grid">
            <div class="group-info__item">
              <span class="group-info__label">Nombre:</span>
              <span class="group-info__value">${this.escapeHtml(group.nombre || 'Sin nombre')}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">ID:</span>
              <span class="group-info__value">${group.id}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Materia:</span>
              <span class="group-info__value">${this.escapeHtml(group.descripcion || 'No especificada')}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Profesor Responsable:</span>
              <span class="group-info__value">${profesor ? this.escapeHtml(profesor.nombre) : 'Sin asignar'}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Asesor:</span>
              <span class="group-info__value">Tú</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Integrantes (${members.filter(m => m.role === 'Estudiante').length}/5):</span>
              <span class="group-info__value">${members.filter(m => m.role === 'Estudiante').map(m => this.escapeHtml(m.nombre)).join(', ') || 'Ninguno'}</span>
            </div>
          </div>
        </div>

        <div class="group-details__section">
          <h3>Ubicación</h3>
          <div class="form-group">
            <label class="form-label">Salón de Asesoría</label>
            <input type="text" id="salon-input" class="form-input" placeholder="Ej: A-101" value="${group.salon || ''}">
          </div>
        </div>

        <div class="group-details__section">
          <h3>Horarios Disponibles</h3>
          <form id="availability-form">
            <div class="form-group">
              <label class="form-label">Día de la Semana</label>
              <select id="availability-day" class="form-select" required>
                <option value="">Selecciona un día</option>
                <option value="0">Domingo</option>
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Hora Inicio</label>
              <input type="time" id="availability-start" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hora Fin</label>
              <input type="time" id="availability-end" class="form-input" required>
            </div>
            <button type="submit" class="btn btn-primary">Agregar Disponibilidad</button>
          </form>
        </div>

        <div class="group-details__section">
          <h3>Horarios Propuestos por Alumnos</h3>
          <div id="student-schedules">
            ${this.renderStudentSchedules(studentProposedSessions, group)}
          </div>
        </div>

        <div class="group-details__section">
          <h3>Calendario de Sesiones Aceptadas</h3>
          <div id="accepted-sessions">
            ${this.renderAcceptedSessions(acceptedSessions)}
          </div>
        </div>

        <div class="group-details__section">
          <h3>Tema de Interés del Alumno</h3>
          <div id="student-topic">
            ${this.renderStudentTopic(groupSessions)}
          </div>
        </div>
      </div>
    `;

    Modal.show('Detalles del Grupo', modalContent, () => {
      this.setupDetailsModalEvents(group);
    });
  }

  renderStudentSchedules(sessions, group) {
    if (sessions.length === 0) {
      return '<p class="text-muted">No hay horarios propuestos por alumnos aún.</p>';
    }

    return `
      <div class="schedules-list">
        ${sessions.map(session => `
          <div class="schedule-item">
            <div class="schedule-info">
              <strong>${formatDate(session.fecha)}</strong>
              <span>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</span>
              ${session.tema ? `<p class="text-muted">Tema: ${this.escapeHtml(session.tema)}</p>` : ''}
            </div>
            <div style="display: flex; gap: var(--spacing-sm);">
              <button class="btn btn-success accept-student-schedule-btn" data-session-id="${session.id}">
                Aceptar
              </button>
              <button class="btn btn-danger reject-schedule-btn" data-session-id="${session.id}">
                Rechazar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderAcceptedSessions(sessions) {
    if (sessions.length === 0) {
      return '<p class="text-muted">No hay sesiones aceptadas aún.</p>';
    }

    return `
      <div class="calendar-sessions">
        ${sessions.map(session => `
          <div class="calendar-item">
            <div class="calendar-date">
              <strong>${formatDate(session.fecha)}</strong>
            </div>
            <div class="calendar-time">
              ${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}
            </div>
            ${session.tema ? `<div class="calendar-topic">${this.escapeHtml(session.tema)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderStudentTopic(sessions) {
    const sessionWithTopic = sessions.find(s => s.tema);
    if (!sessionWithTopic || !sessionWithTopic.tema) {
      return '<p class="text-muted">No hay tema de interés especificado aún.</p>';
    }

    return `
      <div class="topic-display">
        <p><strong>Tema:</strong> ${this.escapeHtml(sessionWithTopic.tema)}</p>
      </div>
    `;
  }

  setupDetailsModalEvents(group) {
    // Agregar disponibilidad
    const availabilityForm = document.getElementById('availability-form');
    if (availabilityForm && this.tutorId) {
      availabilityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const diaSemana = parseInt(document.getElementById('availability-day').value);
        const horaInicio = document.getElementById('availability-start').value;
        const horaFin = document.getElementById('availability-end').value;

        if (diaSemana === null || !horaInicio || !horaFin) {
          Notification.error('Por favor completa todos los campos');
          return;
        }

        try {
          Loading.show();
          const response = await tutorsAPI.createAvailability(this.tutorId, {
            diaSemana,
            horaInicio,
            horaFin
          });

          if (response.success) {
            Notification.success('Disponibilidad agregada exitosamente');
            // También crear una sesión con esta disponibilidad
            const today = new Date();
            const dayOfWeek = today.getDay();
            let daysToAdd = (diaSemana - dayOfWeek + 7) % 7;
            if (daysToAdd === 0) daysToAdd = 7; // Si es hoy, programar para la próxima semana
            const fecha = new Date(today);
            fecha.setDate(today.getDate() + daysToAdd);

            await sessionsAPI.create({
              groupId: group.id,
              tutorId: this.tutorId,
              fecha: fecha.toISOString().split('T')[0],
              horaInicio,
              horaFin
            });
          } else {
            Notification.error(response.message || 'Error al agregar disponibilidad');
          }
        } catch (error) {
          Notification.error('Error al agregar disponibilidad');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });
    }

    // Aceptar horario de alumno
    document.querySelectorAll('.accept-student-schedule-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sessionId = parseInt(e.target.dataset.sessionId);
        try {
          Loading.show();
          const response = await sessionsAPI.update(sessionId, {
            tutorId: this.tutorId,
            estado: 'programada'
          });

          if (response.success) {
            Notification.success('Horario aceptado');
            await this.loadData();
            Modal.hide();
            this.showGroupDetails(group);
          } else {
            Notification.error(response.message || 'Error al aceptar horario');
          }
        } catch (error) {
          Notification.error('Error al aceptar horario');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });
    });

    // Rechazar horario (con justificación)
    document.querySelectorAll('.reject-schedule-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sessionId = parseInt(e.target.dataset.sessionId);
        const justificacion = prompt('Por favor, proporciona una justificación para rechazar esta asesoría:');
        
        if (!justificacion || justificacion.trim() === '') {
          Notification.error('Debes proporcionar una justificación');
          return;
        }

        try {
          Loading.show();
          const response = await sessionsAPI.update(sessionId, {
            estado: 'cancelada',
            notas: `Rechazado por asesor. Justificación: ${justificacion}`
          });

          if (response.success) {
            Notification.success('Asesoría rechazada');
            await this.loadData();
            Modal.hide();
            this.showGroupDetails(group);
          } else {
            Notification.error(response.message || 'Error al rechazar asesoría');
          }
        } catch (error) {
          Notification.error('Error al rechazar asesoría');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });
    });
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new TutorView();

