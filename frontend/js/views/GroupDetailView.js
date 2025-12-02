import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista de Detalle de Grupo
 */
class GroupDetailView {
  async render(params = {}) {
    const user = authService.getCurrentUser();
    if (!user) return;

    const groupId = params.groupId || parseInt(window.location.hash.split('/').pop());
    if (!groupId) {
      Notification.error('ID de grupo no válido');
      window.location.hash = '#/groups';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Información de Grupo</h1>
        </div>
        <div class="card__body">
          <div id="group-detail-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroupDetail(groupId, user);
    } catch (error) {
      console.error('Error cargando detalle del grupo:', error);
      Notification.error('Error al cargar información del grupo');
    } finally {
      Loading.hide();
    }
  }

  async loadGroupDetail(groupId, user) {
    const content = document.getElementById('group-detail-content');

    try {
      const [groupResponse, membersResponse, sessionsResponse] = await Promise.all([
        groupsAPI.getById(groupId),
        groupsAPI.getMembers(groupId),
        sessionsAPI.getAll()
      ]);

      if (!groupResponse.success) {
        content.innerHTML = '<p class="text-muted">Error al cargar información del grupo</p>';
        return;
      }

      const group = groupResponse.data;
      const members = membersResponse.success ? membersResponse.data : [];
      const allSessions = sessionsResponse.success ? sessionsResponse.data : [];
      
      // Filtrar sesiones de este grupo
      const groupSessions = allSessions.filter(s => s.groupId === groupId);
      
      // Filtrar sesiones futuras
      const now = new Date();
      const upcomingSessions = groupSessions
        .filter(s => {
          const sessionDate = new Date(`${s.fecha}T${s.horaInicio}`);
          return sessionDate >= now;
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.fecha}T${a.horaInicio}`);
          const dateB = new Date(`${b.fecha}T${b.horaInicio}`);
          return dateA - dateB;
        });

      // Encontrar profesor y asesor
      const profesor = members.find(m => m.role === 'Profesor');
      const asesor = members.find(m => m.role === 'Tutor');

      let html = `
        <div class="group-detail">
          <div class="group-detail__header">
            <h2>${this.escapeHtml(group.nombre)}</h2>
            <span class="badge badge--${getStatusColor(group.estado)}">
              ${getStatusName(group.estado)}
            </span>
          </div>

          ${group.descripcion ? `
            <div class="group-detail__section">
              <h3>Descripción</h3>
              <p>${this.escapeHtml(group.descripcion)}</p>
            </div>
          ` : ''}

          <div class="group-detail__section">
            <h3>Información del Grupo</h3>
            <div class="group-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
              ${profesor ? `
                <div class="info-card">
                  <div class="info-card__label">Profesor</div>
                  <div class="info-card__value">${this.escapeHtml(profesor.nombre)}</div>
                </div>
              ` : ''}
              ${asesor ? `
                <div class="info-card">
                  <div class="info-card__label">Asesor</div>
                  <div class="info-card__value">${this.escapeHtml(asesor.nombre)}</div>
                </div>
              ` : ''}
              <div class="info-card">
                <div class="info-card__label">Miembros</div>
                <div class="info-card__value">${members.length}</div>
              </div>
            </div>
          </div>
      `;

      // Si es estudiante, mostrar botón para solicitar asesoría
      if (user.role === 'Estudiante' && asesor) {
        html += `
          <div class="group-detail__section">
            <h3>Solicitar Asesoría</h3>
            <button id="request-session-btn" class="btn btn-primary">Solicitar Asesoría</button>
            <div id="session-request-form" style="display: none; margin-top: 1rem;">
              <div class="form-group">
                <label class="form-label" for="session-date">Fecha Disponible</label>
                <input type="date" id="session-date" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="session-topic">Tema de la Asesoría</label>
                <textarea id="session-topic" class="form-input" rows="3" placeholder="Describe el tema sobre el que necesitas asesoría..." required></textarea>
              </div>
              <button id="submit-session-request" class="btn btn-primary">Enviar Solicitud</button>
              <button id="cancel-session-request" class="btn btn-secondary" style="margin-left: 0.5rem;">Cancelar</button>
            </div>
          </div>
        `;
      }

      // Mostrar próximas sesiones
      html += `
          <div class="group-detail__section">
            <h3>Próximas Sesiones</h3>
            ${upcomingSessions.length > 0 ? `
              <div class="table-container mt-2">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Tema</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${upcomingSessions.map(session => `
                      <tr>
                        <td>${formatDate(session.fecha)}</td>
                        <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                        <td>${this.escapeHtml(session.tema || '-')}</td>
                        <td>
                          <span class="badge badge--${getStatusColor(session.estado)}">
                            ${getStatusName(session.estado)}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="text-muted">No hay sesiones programadas</p>'}
          </div>
        </div>
      `;

      content.innerHTML = html;

      // Configurar eventos para solicitud de sesión
      if (user.role === 'Estudiante' && asesor) {
        this.setupSessionRequest(groupId, asesor.id);
      }
    } catch (error) {
      console.error('Error en loadGroupDetail:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar información del grupo</p>';
    }
  }

  setupSessionRequest(groupId, tutorId) {
    const requestBtn = document.getElementById('request-session-btn');
    const requestForm = document.getElementById('session-request-form');
    const submitBtn = document.getElementById('submit-session-request');
    const cancelBtn = document.getElementById('cancel-session-request');

    if (!requestBtn || !requestForm) return;

    requestBtn.addEventListener('click', () => {
      requestForm.style.display = 'block';
      requestBtn.style.display = 'none';
      
      // Establecer fecha mínima como hoy
      const dateInput = document.getElementById('session-date');
      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
      }
    });

    cancelBtn?.addEventListener('click', () => {
      requestForm.style.display = 'none';
      requestBtn.style.display = 'block';
    });

    submitBtn?.addEventListener('click', async () => {
      const date = document.getElementById('session-date').value;
      const topic = document.getElementById('session-topic').value.trim();

      if (!date || !topic) {
        Notification.error('Por favor completa todos los campos');
        return;
      }

      try {
        Loading.show();
        // Nota: Necesitarás implementar un endpoint para solicitudes de sesión
        // Por ahora, creamos una sesión pendiente
        const response = await sessionsAPI.create({
          groupId: groupId,
          tutorId: tutorId,
          fecha: date,
          tema: topic,
          estado: 'pendiente'
        });

        if (response.success) {
          Notification.success('Solicitud de asesoría enviada al asesor');
          requestForm.style.display = 'none';
          requestBtn.style.display = 'block';
          document.getElementById('session-date').value = '';
          document.getElementById('session-topic').value = '';
          // Recargar la vista
          this.render({ groupId });
        } else {
          Notification.error(response.message || 'Error al enviar solicitud');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Error al enviar solicitud';
        Notification.error(errorMessage);
      } finally {
        Loading.hide();
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new GroupDetailView();

