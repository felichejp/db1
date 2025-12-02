import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Vista de Profesor Responsable
 */
class ProfesorView {
  constructor() {
    this.groups = [];
    this.sessions = [];
    this.currentGroupDetails = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'Profesor') {
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Bienvenido, ${user.nombre}</h1>
          <p class="text-muted">Matrícula: ${user.id} | Rol: Profesor Responsable</p>
        </div>
        <div class="card__body">
          <div id="profesor-content">
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
    const content = document.getElementById('profesor-content');
    
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
          
          // Obtener tutor del grupo
          let tutor = null;
          if (groupSessions.length > 0 && groupSessions[0].tutorId) {
            try {
              const tutorRes = await tutorsAPI.getById(groupSessions[0].tutorId);
              if (tutorRes.success) {
                tutor = tutorRes.data;
              }
            } catch (e) {
              console.warn('No se pudo obtener tutor:', e);
            }
          }

          return {
            ...groupDetails,
            members,
            tutor,
            sessions: groupSessions
          };
        } catch (error) {
          console.error(`Error obteniendo detalles del grupo ${group.id}:`, error);
          return { ...group, members: [], tutor: null, sessions: [] };
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
    const tutor = group.tutor;

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
              <span class="info-value">Tú</span>
            </div>
            <div class="info-item">
              <span class="info-label">Asesor:</span>
              <span class="info-value">${tutor ? this.escapeHtml(tutor.nombre || 'Sin nombre') : 'Sin asignar'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cantidad de Alumnos:</span>
              <span class="info-value">${members.filter(m => m.role === 'Estudiante').length}</span>
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
    const members = group.members || [];
    const tutor = group.tutor;

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
              <span class="group-info__value">Tú</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Asesor:</span>
              <span class="group-info__value">${tutor ? this.escapeHtml(tutor.nombre || 'Sin nombre') : 'Sin asignar'}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Cantidad de Alumnos:</span>
              <span class="group-info__value">${members.filter(m => m.role === 'Estudiante').length}</span>
            </div>
            <div class="group-info__item group-info__item--full">
              <span class="group-info__label">Nombres de Alumnos:</span>
              <span class="group-info__value">${members.filter(m => m.role === 'Estudiante').map(m => this.escapeHtml(m.nombre)).join(', ') || 'Ninguno'}</span>
            </div>
          </div>
        </div>

        <div class="group-details__section">
          <h3>Calendario de Sesiones</h3>
          <div id="sessions-calendar">
            ${this.renderSessionsCalendar(groupSessions)}
          </div>
        </div>

        <div class="group-details__section">
          <h3>Comunicación con Asesor</h3>
          <p class="text-muted">Puedes comunicarte con el asesor sobre temas de la asesoría.</p>
          <div class="form-group">
            <label class="form-label">Mensaje para el Asesor</label>
            <textarea id="message-to-tutor" class="form-textarea" placeholder="Escribe un mensaje al asesor sobre el tema a tratar..."></textarea>
          </div>
          <button id="send-message-tutor-btn" class="btn btn-primary">Enviar Mensaje</button>
        </div>
      </div>
    `;

    Modal.show('Detalles del Grupo - Supervisión', modalContent, () => {
      this.setupDetailsModalEvents(group);
    });
  }

  renderSessionsCalendar(sessions) {
    if (sessions.length === 0) {
      return '<p class="text-muted">No hay sesiones programadas aún.</p>';
    }

    const activeSessions = sessions.filter(s => s.estado !== 'cancelada');

    return `
      <div class="calendar-sessions">
        ${activeSessions.map(session => `
          <div class="calendar-item">
            <div class="calendar-date">
              <strong>${formatDate(session.fecha)}</strong>
            </div>
            <div class="calendar-time">
              ${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}
            </div>
            <div class="calendar-status">
              <span class="badge badge--${session.estado === 'programada' ? 'info' : session.estado === 'en_curso' ? 'warning' : 'success'}">
                ${session.estado}
              </span>
            </div>
            ${session.tema ? `<div class="calendar-topic">${this.escapeHtml(session.tema)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  setupDetailsModalEvents(group) {
    // Enviar mensaje al tutor (esto podría usar el sistema de mensajes del grupo)
    const sendMessageBtn = document.getElementById('send-message-tutor-btn');
    if (sendMessageBtn) {
      sendMessageBtn.addEventListener('click', () => {
        const message = document.getElementById('message-to-tutor').value;
        if (!message || message.trim() === '') {
          Notification.error('Por favor escribe un mensaje');
          return;
        }
        // Aquí podrías implementar el envío de mensaje al tutor
        Notification.success('Mensaje enviado al asesor');
        document.getElementById('message-to-tutor').value = '';
      });
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new ProfesorView();

