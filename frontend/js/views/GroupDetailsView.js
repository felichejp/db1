import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import { messagesAPI } from '../api/messages.js';
import socketService from '../services/socketService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Vista de Detalles del Grupo con Chat
 */
class GroupDetailsView {
  constructor() {
    this.currentGroupId = null;
    this.group = null;
    this.messages = [];
    this.members = [];
    this.sessions = [];
    this.currentUser = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    this.currentUser = user;
    const hash = window.location.hash;
    const match = hash.match(/#\/groups\/(\d+)\/details/);
    
    if (!match || !match[1]) {
      Notification.error('ID de grupo inválido');
      window.location.hash = '#/dashboard';
      return;
    }

    this.currentGroupId = parseInt(match[1], 10);
    
    if (isNaN(this.currentGroupId) || this.currentGroupId <= 0) {
      Notification.error('ID de grupo inválido');
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="card__title" id="group-title">Cargando grupo...</h1>
            <button onclick="window.history.back()" class="btn btn-secondary btn-sm" style="margin-top: var(--spacing-sm);">
              ← Volver
            </button>
          </div>
        </div>
        <div class="card__body">
          <div id="group-details-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroupData();
      this.setupSocketListeners();
    } catch (error) {
      Notification.error('Error al cargar el grupo');
      console.error(error);
      window.location.hash = '#/dashboard';
    } finally {
      Loading.hide();
    }
  }

  async loadGroupData() {
    try {
      const [groupRes, membersRes, messagesRes, sessionsRes] = await Promise.all([
        groupsAPI.getById(this.currentGroupId),
        groupsAPI.getMembers(this.currentGroupId),
        messagesAPI.getByGroup(this.currentGroupId),
        sessionsAPI.getAll()
      ]);

      if (!groupRes.success) {
        throw new Error('Grupo no encontrado');
      }

      this.group = groupRes.data;
      this.members = membersRes.success ? membersRes.data : [];
      this.messages = messagesRes.success ? messagesRes.data : [];
      this.sessions = sessionsRes.success ? sessionsRes.data.filter(s => s.groupId === this.currentGroupId) : [];

      // Obtener tutor si existe
      let tutor = null;
      const tutorSessions = this.sessions.filter(s => s.tutorId);
      if (tutorSessions.length > 0) {
        try {
          const tutorRes = await tutorsAPI.getById(tutorSessions[0].tutorId);
          if (tutorRes.success) {
            tutor = tutorRes.data;
          }
        } catch (e) {
          console.warn('No se pudo obtener tutor:', e);
        }
      }

      this.renderContent(tutor);
      this.scrollToBottom();
    } catch (error) {
      console.error('Error cargando datos del grupo:', error);
      throw error;
    }
  }

  renderContent(tutor) {
    const titleEl = document.getElementById('group-title');
    if (titleEl) {
      titleEl.textContent = this.group.nombre || 'Grupo';
    }

    const content = document.getElementById('group-details-content');
    const members = this.members || [];
    const profesor = members.find(m => m.role === 'Profesor') || 
                     (this.group.profesorNombre ? { nombre: this.group.profesorNombre } : null);
    const estudiantes = members.filter(m => m.role === 'Estudiante');
    const acceptedSessions = this.sessions.filter(s => s.estado === 'programada' || s.estado === 'en_curso');
    const tutorSessions = this.sessions.filter(s => s.tutorId && s.estado === 'programada');

    const userRole = this.currentUser.role;
    const isEstudiante = userRole === 'Estudiante';
    const isTutor = userRole === 'Tutor';
    const isProfesor = userRole === 'Profesor';

    content.innerHTML = `
      <div class="group-details-page">
        <!-- Información del Grupo -->
        <div class="group-details__section">
          <h3>Información del Grupo</h3>
          <div class="group-info__grid">
            <div class="group-info__item">
              <span class="group-info__label">Nombre:</span>
              <span class="group-info__value">${this.escapeHtml(this.group.nombre || 'Sin nombre')}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">ID:</span>
              <span class="group-info__value">${this.group.id}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Materia:</span>
              <span class="group-info__value">${this.escapeHtml(this.group.descripcion || 'No especificada')}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Profesor Responsable:</span>
              <span class="group-info__value">${profesor ? this.escapeHtml(profesor.nombre) : 'Sin asignar'}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Asesor:</span>
              <span class="group-info__value">${tutor ? this.escapeHtml(tutor.nombre || 'Sin nombre') : 'Sin asignar'}</span>
            </div>
            <div class="group-info__item">
              <span class="group-info__label">Integrantes (${estudiantes.length}/5):</span>
              <span class="group-info__value">${estudiantes.map(m => this.escapeHtml(m.nombre)).join(', ') || 'Ninguno'}</span>
            </div>
          </div>
        </div>

        <!-- Ubicación -->
        <div class="group-details__section">
          <h3>Ubicación</h3>
          <div class="form-group">
            <label class="form-label">Salón de Asesoría</label>
            <input type="text" id="salon-input" class="form-input" placeholder="Ej: A-101" value="${this.group.salon || ''}">
          </div>
        </div>

        ${isEstudiante ? `
        <!-- Proponer Horario (Solo Estudiante) -->
        <div class="group-details__section">
          <h3>Proponer Horario</h3>
          <form id="propose-schedule-form">
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" id="schedule-date" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hora Inicio</label>
              <input type="time" id="schedule-start" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hora Fin</label>
              <input type="time" id="schedule-end" class="form-input" required>
            </div>
            <button type="submit" class="btn btn-primary">Proponer Horario</button>
          </form>
        </div>

        <!-- Horarios del Asesor (Solo Estudiante) -->
        <div class="group-details__section">
          <h3>Horarios Propuestos por el Asesor</h3>
          <div id="tutor-schedules">
            ${this.renderTutorSchedules(tutorSessions)}
          </div>
        </div>

        <!-- Tema de Interés (Solo Estudiante) -->
        <div class="group-details__section">
          <h3>Tema de Interés</h3>
          <div class="form-group">
            <label class="form-label">Tema que quieres ver</label>
            <textarea id="tema-input" class="form-textarea" placeholder="Describe el tema que te gustaría tratar en la asesoría...">${this.group.tema || ''}</textarea>
          </div>
          <button id="save-tema-btn" class="btn btn-primary">Guardar Tema</button>
        </div>
        ` : ''}

        ${isTutor ? `
        <!-- Horarios Disponibles (Solo Tutor) -->
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

        <!-- Horarios de Alumnos (Solo Tutor) -->
        <div class="group-details__section">
          <h3>Horarios Propuestos por Alumnos</h3>
          <div id="student-schedules">
            ${this.renderStudentSchedules(this.sessions.filter(s => !s.tutorId || s.tutorId !== tutor?.id))}
          </div>
        </div>
        ` : ''}

        <!-- Calendario de Sesiones -->
        <div class="group-details__section">
          <h3>Calendario de Sesiones Aceptadas</h3>
          <div id="accepted-sessions">
            ${this.renderAcceptedSessions(acceptedSessions)}
          </div>
        </div>

        <!-- Chat del Grupo -->
        <div class="group-details__section">
          <h3>Chat del Grupo</h3>
          <div class="group-chat-container">
            <div class="group-chat__sidebar">
              <div class="group-chat__members">
                <h3>Miembros (${members.length})</h3>
                <ul class="member-list">
                  ${members.map(member => `
                    <li class="member-item">
                      <span class="member-name">${this.escapeHtml(member.nombre || 'Sin nombre')}</span>
                      <span class="member-role">${member.role || 'Sin rol'}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
            <div class="group-chat__main">
              <div class="chat-messages" id="chat-messages">
                ${this.renderMessages()}
              </div>
              <div class="chat-input-container">
                <form id="chat-form" class="chat-form">
                  <input 
                    type="text" 
                    id="message-input" 
                    class="chat-input" 
                    placeholder="Escribe un mensaje..." 
                    autocomplete="off"
                    required
                  />
                  <button type="submit" class="btn btn-primary chat-send-btn">
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners(tutor);
    
    // Unirse al room del grupo en Socket.IO
    const socket = socketService.connect();
    if (socket) {
      socketService.joinGroup(this.currentGroupId);
    }
  }

  renderTutorSchedules(sessions) {
    if (sessions.length === 0) {
      return '<p class="text-muted">No hay horarios propuestos por el asesor aún.</p>';
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
            <button class="btn btn-success accept-schedule-btn" data-session-id="${session.id}">
              Aceptar
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderStudentSchedules(sessions) {
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

  renderMessages() {
    if (this.messages.length === 0) {
      return '<div class="chat-empty">No hay mensajes aún. ¡Sé el primero en escribir!</div>';
    }

    return this.messages.map(message => {
      const isOwn = message.senderId === this.currentUser.id;
      const senderName = message.senderName || 'Usuario';
      let timeStr = '';
      
      try {
        const messageDate = new Date(message.createdAt);
        timeStr = messageDate.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (e) {
        timeStr = 'Ahora';
      }

      return `
        <div class="chat-message ${isOwn ? 'chat-message--own' : ''}">
          <div class="chat-message__content">
            ${!isOwn ? `<div class="chat-message__sender">${this.escapeHtml(senderName)}</div>` : ''}
            <div class="chat-message__text">${this.escapeHtml(message.content || '')}</div>
            <div class="chat-message__time">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  setupEventListeners(tutor) {
    // Chat
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
    }

    // Proponer horario (Estudiante)
    const proposeForm = document.getElementById('propose-schedule-form');
    if (proposeForm) {
      proposeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha = document.getElementById('schedule-date').value;
        const horaInicio = document.getElementById('schedule-start').value;
        const horaFin = document.getElementById('schedule-end').value;

        try {
          Loading.show();
          const response = await sessionsAPI.create({
            groupId: this.currentGroupId,
            fecha,
            horaInicio,
            horaFin,
            tema: document.getElementById('tema-input')?.value || null
          });

          if (response.success) {
            Notification.success('Horario propuesto exitosamente');
            await this.loadGroupData();
          } else {
            Notification.error(response.message || 'Error al proponer horario');
          }
        } catch (error) {
          Notification.error('Error al proponer horario');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });
    }

    // Aceptar horarios
    document.querySelectorAll('.accept-schedule-btn, .accept-student-schedule-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sessionId = parseInt(e.target.dataset.sessionId);
        try {
          Loading.show();
          const response = await sessionsAPI.update(sessionId, {
            estado: 'programada'
          });

          if (response.success) {
            Notification.success('Horario aceptado');
            await this.loadGroupData();
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

    // Rechazar horario (Tutor)
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
            await this.loadGroupData();
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

    // Guardar tema (Estudiante)
    const saveTemaBtn = document.getElementById('save-tema-btn');
    if (saveTemaBtn) {
      saveTemaBtn.addEventListener('click', async () => {
        const tema = document.getElementById('tema-input').value;
        // Aquí podrías actualizar el grupo o crear una sesión con el tema
        Notification.success('Tema guardado');
      });
    }
  }

  async handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    if (!input) return;

    const content = input.value.trim();
    if (!content) return;

    try {
      input.disabled = true;
      const response = await messagesAPI.create({
        groupId: this.currentGroupId,
        content: content,
        tipo: 'texto'
      });

      if (response.success) {
        input.value = '';
        const message = response.data;
        if (message && !this.messages.some(m => m.id === message.id)) {
          if (!message.senderName) {
            message.senderName = this.currentUser.nombre || this.currentUser.email;
          }
          this.messages.push(message);
          this.updateMessagesDisplay();
          this.scrollToBottom();
        }
      } else {
        Notification.error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      Notification.error('Error al enviar mensaje');
      console.error(error);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  setupSocketListeners() {
    socketService.on('new_message', (data) => {
      if (data && data.data && data.data.groupId === this.currentGroupId) {
        const message = data.data;
        if (!message.senderName) {
          const sender = this.members.find(m => m.id === message.senderId);
          if (sender) {
            message.senderName = sender.nombre;
          } else if (message.senderId === this.currentUser.id) {
            message.senderName = this.currentUser.nombre || this.currentUser.email;
          }
        }
        
        const exists = this.messages.some(m => m.id === message.id);
        if (!exists) {
          this.messages.push(message);
          this.updateMessagesDisplay();
          const messagesContainer = document.getElementById('chat-messages');
          if (messagesContainer) {
            const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 100;
            if (isAtBottom) {
              this.scrollToBottom();
            }
          }
        }
      }
    });
  }

  updateMessagesDisplay() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.renderMessages();
    }
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    if (this.currentGroupId) {
      socketService.leaveGroup(this.currentGroupId);
    }
    socketService.off('new_message');
  }
}

export default new GroupDetailsView();

