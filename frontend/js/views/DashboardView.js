import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Chat from '../components/Chat.js'; //Sacamos nuevas funciones en este caso seria el chat
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';
import { joinGroupRooms } from '../utils/socketHelpers.js';

/**
 * Vista de Dashboard
 */
class DashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Bienvenido, ${user.nombre}</h1>
          <p class="text-muted">Rol: ${user.role}</p>
        </div>
        <div class="card__body">
          <div id="dashboard-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadDashboardContent(user);
    } catch (error) {
      Notification.error('Error al cargar el dashboard');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadDashboardContent(user) {
    const content = document.getElementById('dashboard-content');
    
    try {
      const [groupsRes, sessionsRes] = await Promise.allSettled([
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

      // Manejar resultados (pueden ser errores 401)
      const groups = groupsRes.status === 'fulfilled' && groupsRes.value.success 
        ? groupsRes.value.data 
        : [];
      const sessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.success 
        ? sessionsRes.value.data 
        : [];

      // Si hay errores 401, redirigir a login
      if (groupsRes.status === 'rejected' && groupsRes.reason?.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }

      // Unirse automáticamente a rooms de grupos para recibir eventos en tiempo real
      if (groups.length > 0) {
        await joinGroupRooms(groups);
      }

      let html = '';

      if (user.role === 'Admin') {
        html = this.renderAdminDashboard(groups, sessions);
      } else if (user.role === 'Profesor') {
        html = this.renderProfesorDashboard(groups, sessions);
      } else if (user.role === 'Tutor') {
        html = this.renderTutorDashboard(groups, sessions);
      } else {
        html = this.renderEstudianteDashboard(groups, sessions);
      }

      content.innerHTML = html;

      // Renderizar el chat si el usuario tiene grupos (para estudiantes, profesores y tutores)
      if (groups.length > 0 && (user.role === 'Estudiante' || user.role === 'Profesor' || user.role === 'Tutor')) {
        // Esperar un momento para que el DOM se actualice
        setTimeout(async () => {
          await Chat.render(groups, 'chat-container');
        }, 100);
      }

    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar datos</p>';
    }
  }

  renderAdminDashboard(groups, sessions) {
    return `
      <div>
        <h2>Estadísticas</h2>
        <p>Grupos: ${groups.length}</p>
        <p>Sesiones: ${sessions.length}</p>
      </div>
    `;
  }

  renderProfesorDashboard(groups, sessions) {
    return `
      <div>
        <!-- Sección superior: Grupos y Sesiones -->
        <div>
          <h2>Mis Grupos (${groups.length})</h2>
          ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No tienes grupos asignados</p>'}
          <h2 class="mt-3">Próximas Sesiones</h2>
          ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
        </div>
        
        <!-- Sección inferior: Chat -->
        <div class="mt-4">
          <h2>Chat del Grupo</h2>
          <div id="chat-container"></div>
        </div>
      </div>
    `;
  }

  renderTutorDashboard(groups, sessions) {
    return `
      <div>
        <h2>Mis Sesiones (${sessions.length})</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No tienes sesiones asignadas</p>'}
      </div>
    `;
  }

  renderEstudianteDashboard(groups, sessions) {
    return `
      <div>
        <!-- Sección superior: Grupos y Sesiones -->
        <div>
          <h2>Mis Grupos (${groups.length})</h2>
          ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No estás en ningún grupo</p>'}
          <h2 class="mt-3">Próximas Sesiones</h2>
          ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
        </div>
        
        <!-- Sección inferior: Chat -->
        <div class="mt-4">
          <h2>Chat del Grupo</h2>
          <div id="chat-container"></div>
        </div>
      </div>
    `;
  }

  renderGroupsList(groups) {
    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(group => `
              <tr>
                <td>${group.nombre}</td>
                <td><span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span></td>
                <td><a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">Ver</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderSessionsList(sessions) {
    return `
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
            ${sessions.map(session => `
              <tr>
                <td>${formatDate(session.fecha)}</td>
                <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                <td>${session.tema || '-'}</td>
                <td><span class="badge badge--${getStatusColor(session.estado)}">${getStatusName(session.estado)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

export default new DashboardView();


