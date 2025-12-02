import authService from '../services/authService.js';
import { sessionsAPI } from '../api/sessions.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista de Próximas Sesiones
 */
class SessionsView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Próximas Sesiones</h1>
        </div>
        <div class="card__body">
          <div id="sessions-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadSessions();
    } catch (error) {
      console.error('Error cargando sesiones:', error);
      Notification.error('Error al cargar sesiones');
    } finally {
      Loading.hide();
    }
  }

  async loadSessions() {
    const content = document.getElementById('sessions-content');
    const user = authService.getCurrentUser();

    try {
      // Obtener grupos del usuario para filtrar sesiones
      const groupsResponse = await groupsAPI.getAll();
      const groups = groupsResponse.success ? groupsResponse.data : [];
      const groupIds = groups.map(g => g.id);

      // Obtener todas las sesiones
      const sessionsResponse = await sessionsAPI.getAll();
      
      if (!sessionsResponse.success) {
        content.innerHTML = '<p class="text-muted">Error al cargar sesiones</p>';
        return;
      }

      let sessions = sessionsResponse.data || [];

      // Si es estudiante, filtrar solo sesiones de sus grupos
      if (user.role === 'Estudiante' && groupIds.length > 0) {
        sessions = sessions.filter(s => groupIds.includes(s.groupId));
      }

      // Filtrar solo sesiones futuras o próximas
      const now = new Date();
      sessions = sessions.filter(s => {
        const sessionDate = new Date(`${s.fecha}T${s.horaInicio}`);
        return sessionDate >= now;
      });

      // Ordenar por fecha
      sessions.sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.horaInicio}`);
        const dateB = new Date(`${b.fecha}T${b.horaInicio}`);
        return dateA - dateB;
      });

      if (sessions.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">📅</div>
            <div class="empty-state__message">No hay sesiones programadas</div>
          </div>
        `;
        return;
      }

      // Agrupar sesiones por grupo/materia
      const sessionsByGroup = {};
      for (const session of sessions) {
        const groupId = session.groupId;
        if (!sessionsByGroup[groupId]) {
          // Obtener información del grupo
          const groupInfo = groups.find(g => g.id === groupId);
          sessionsByGroup[groupId] = {
            group: groupInfo,
            sessions: []
          };
        }
        sessionsByGroup[groupId].sessions.push(session);
      }

      // Renderizar sesiones agrupadas
      let html = '';
      for (const groupId in sessionsByGroup) {
        const { group, sessions: groupSessions } = sessionsByGroup[groupId];
        html += `
          <div class="sessions-group" style="margin-bottom: 2rem;">
            <h2 class="sessions-group__title">${this.escapeHtml(group?.nombre || 'Grupo ' + groupId)}</h2>
            <div class="table-container">
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
                  ${groupSessions.map(session => `
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
          </div>
        `;
      }

      content.innerHTML = html;
    } catch (error) {
      console.error('Error en loadSessions:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar sesiones</p>';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new SessionsView();

