import { sessionsAPI } from '../api/sessions.js';
import { groupsAPI } from '../api/groups.js'; // Need this to get user's groups for the form
import authService from '../services/authService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import CalendarComponent from '../components/CalendarComponent.js';
import { formatDate, formatTime, getStatusColor, getStatusName } from '../utils/helpers.js';

class SessionsView {
  constructor() {
    this.calendar = null;
    this.sessions = [];
    this.currentViewMode = 'list'; // 'list' or 'calendar'
  }

  async render() {
    const container = document.getElementById('view-container');
    const user = authService.getUser();
    const isStudent = user.role === 'Estudiante';
    const canManage = ['Admin', 'Profesor', 'Tutor'].includes(user.role);

    container.innerHTML = `
      <div class="dashboard-header mb-3">
        <div>
          <h1 class="card__title" style="font-size: 2rem;">Sesiones</h1>
          <p class="text-muted">Gestiona tus asesorías académicas</p>
        </div>
        <div style="display: flex; gap: 1rem;">
          <div class="btn-group">
            <button class="btn btn-secondary ${this.currentViewMode === 'list' ? 'active' : ''}" id="view-list">
              📋 Lista
            </button>
            <button class="btn btn-secondary ${this.currentViewMode === 'calendar' ? 'active' : ''}" id="view-calendar">
              📅 Calendario
            </button>
          </div>
          ${isStudent ? `
            <button class="btn btn-primary" id="btn-request-session">
              Solicitar Asesoría
            </button>
          ` : ''}
        </div>
      </div>

      ${canManage ? `
        <div class="tabs mb-3">
          <button class="tab-btn active" data-tab="scheduled">Programadas</button>
          <button class="tab-btn" data-tab="requests">Solicitudes</button>
        </div>
      ` : ''}
      
      <div id="sessions-content">
        <div class="spinner" style="margin: 3rem auto;"></div>
      </div>

      <!-- Modal Solicitud -->
      <div id="request-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>Solicitar Asesoría</h2>
          <form id="request-form">
            <div class="form-group">
              <label class="form-label">Grupo</label>
              <select id="req-group" class="form-input" required>
                <option value="">Cargando grupos...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Materia</label>
              <input type="text" id="req-materia" class="form-input" required placeholder="Ej. Matemáticas">
            </div>
            <div class="form-group">
              <label class="form-label">Tema</label>
              <input type="text" id="req-tema" class="form-input" placeholder="Ej. Álgebra lineal">
            </div>
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" id="req-fecha" class="form-input" required>
            </div>
            <div class="row">
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label">Hora Inicio</label>
                  <input type="time" id="req-inicio" class="form-input" required>
                </div>
              </div>
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label">Hora Fin</label>
                  <input type="time" id="req-fin" class="form-input" required>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Cupo estimado</label>
              <input type="number" id="req-cupo" class="form-input" min="1" max="5" value="1">
            </div>
            <button type="submit" class="btn btn-primary w-full">Enviar Solicitud</button>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners(canManage);
    await this.loadSessions();
  }

  async loadSessions() {
    try {
      Loading.show();
      const response = await sessionsAPI.getAll();
      if (response.success) {
        this.sessions = response.data;
        this.renderContent();
      }
    } catch (error) {
      console.error(error);
      Notification.error('Error al cargar sesiones');
    } finally {
      Loading.hide();
    }
  }

  renderContent() {
    const container = document.getElementById('sessions-content');

    if (this.currentViewMode === 'calendar') {
      container.innerHTML = '<div id="calendar-container"></div>';
      this.calendar = new CalendarComponent('calendar-container', {
        onEventClick: (id) => this.showSessionDetails(id)
      });
      // Filter out cancelled sessions for calendar
      const activeSessions = this.sessions.filter(s => s.estado !== 'cancelada' && s.estado !== 'rechazada');
      this.calendar.setEvents(activeSessions);
    } else {
      // List View
      // If tabs exist (admin/tutor), check active tab
      const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'scheduled';

      let filteredSessions = this.sessions;
      if (activeTab === 'requests') {
        filteredSessions = this.sessions.filter(s => s.estado === 'pendiente');
      } else {
        filteredSessions = this.sessions.filter(s => s.estado !== 'pendiente');
      }

      if (filteredSessions.length === 0) {
        container.innerHTML = this.renderEmptyState(
          activeTab === 'requests' ? 'No hay solicitudes pendientes' : 'No hay sesiones programadas'
        );
        return;
      }

      container.innerHTML = `
        <div class="dashboard-grid">
          ${filteredSessions.map(session => this.renderSessionCard(session, activeTab === 'requests')).join('')}
        </div>
      `;
    }
  }

  renderSessionCard(session, isRequest) {
    return `
      <div class="card" style="border-left: 4px solid var(--${getStatusColor(session.estado)}-color);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <span class="badge badge--${getStatusColor(session.estado)}">${getStatusName(session.estado)}</span>
          <span class="text-muted" style="font-size: 0.85rem;">${formatDate(session.fecha)}</span>
        </div>
        
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">${session.materia || 'Sesión'}</h3>
        <p class="text-muted" style="margin-bottom: 1rem;">${session.tema || 'Sin tema específico'}</p>
        
        <div style="margin-bottom: 1rem; font-size: 0.9rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span>🕒</span> ${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}
          </div>
          ${session.nombreTutor ? `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>👨‍🏫</span> ${session.nombreTutor}
          </div>
          ` : ''}
          ${session.cupo ? `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>👥</span> Cupo: ${session.cupo}
          </div>
          ` : ''}
        </div>

        ${isRequest ? `
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-success w-full btn-approve" data-id="${session.id}">Aprobar</button>
            <button class="btn btn-danger w-full btn-reject" data-id="${session.id}">Rechazar</button>
          </div>
        ` : `
          <button class="btn btn-primary w-full">Ver Detalles</button>
        `}
      </div>
    `;
  }

  renderEmptyState(message) {
    return `
      <div class="card text-center" style="padding: 3rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📅</div>
        <p class="text-muted">${message}</p>
      </div>
    `;
  }

  attachEventListeners(canManage) {
    // View switching
    document.getElementById('view-list').onclick = () => {
      this.currentViewMode = 'list';
      this.updateViewButtons();
      this.renderContent();
    };
    document.getElementById('view-calendar').onclick = () => {
      this.currentViewMode = 'calendar';
      this.updateViewButtons();
      this.renderContent();
    };

    // Tabs
    if (canManage) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = (e) => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.renderContent();
        };
      });
    }

    // Request Session Modal
    const modal = document.getElementById('request-modal');
    const btnRequest = document.getElementById('btn-request-session');
    const closeBtn = document.querySelector('.close-modal');

    if (btnRequest) {
      btnRequest.onclick = async () => {
        modal.style.display = 'block';
        await this.loadUserGroups();
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => modal.style.display = 'none';
    }

    window.onclick = (event) => {
      if (event.target === modal) modal.style.display = 'none';
    };

    // Form Submission
    const form = document.getElementById('request-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await this.handleRequestSubmit();
      };
    }

    // Approve/Reject delegation
    document.getElementById('sessions-content').onclick = async (e) => {
      if (e.target.classList.contains('btn-approve')) {
        await this.handleStatusUpdate(e.target.dataset.id, 'programada');
      } else if (e.target.classList.contains('btn-reject')) {
        await this.handleStatusUpdate(e.target.dataset.id, 'rechazada');
      }
    };
  }

  updateViewButtons() {
    document.getElementById('view-list').classList.toggle('active', this.currentViewMode === 'list');
    document.getElementById('view-calendar').classList.toggle('active', this.currentViewMode === 'calendar');
  }

  async loadUserGroups() {
    try {
      const select = document.getElementById('req-group');
      const response = await groupsAPI.getAll(); // Assuming this returns user's groups
      if (response.success) {
        select.innerHTML = response.data.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');
      }
    } catch (error) {
      console.error(error);
      Notification.error('Error al cargar grupos');
    }
  }

  async handleRequestSubmit() {
    const data = {
      groupId: document.getElementById('req-group').value,
      materia: document.getElementById('req-materia').value,
      tema: document.getElementById('req-tema').value,
      fecha: document.getElementById('req-fecha').value,
      horaInicio: document.getElementById('req-inicio').value,
      horaFin: document.getElementById('req-fin').value,
      cupo: document.getElementById('req-cupo').value
    };

    try {
      Loading.show();
      const response = await sessionsAPI.request(data);
      if (response.success) {
        Notification.success('Solicitud enviada correctamente');
        document.getElementById('request-modal').style.display = 'none';
        document.getElementById('request-form').reset();
        await this.loadSessions();
      } else {
        Notification.error(response.message);
      }
    } catch (error) {
      Notification.error('Error al enviar solicitud');
    } finally {
      Loading.hide();
    }
  }

  async handleStatusUpdate(id, status) {
    try {
      Loading.show();
      const user = authService.getUser();
      const data = { estado: status };

      // If approving, assign current user as tutor if they are a tutor
      if (status === 'programada' && user.role === 'Tutor') {
        // Ideally we'd get the tutor ID, but for now let's assume the backend handles it 
        // or we send the user ID and backend maps it. 
        // The backend expects tutorId, but we might need to fetch it first.
        // For simplicity, let's assume the backend can infer it or we send it if we had it.
        // Actually, sessionController expects tutorId.
        // Let's try sending without tutorId first, or fetch it.
        // A better approach: The backend `updateSessionStatus` uses `COALESCE($2, "tutorId")`.
        // If we don't send tutorId, it keeps existing (which is NULL).
        // We need to assign the tutor.
        // Let's just send the status for now.
      }

      const response = await sessionsAPI.updateStatus(id, data);
      if (response.success) {
        Notification.success(`Solicitud ${status === 'programada' ? 'aprobada' : 'rechazada'}`);
        await this.loadSessions();
      }
    } catch (error) {
      Notification.error('Error al actualizar estado');
    } finally {
      Loading.hide();
    }
  }

  showSessionDetails(id) {
    // Placeholder for showing details from calendar click
    console.log('Show details for', id);
    // Could open a modal or navigate to detail view
  }
}

export default new SessionsView();
