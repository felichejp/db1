import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { joinGroupRooms } from '../utils/socketHelpers.js';
import ChatComponent from '../components/ChatComponent.js';
>>>>>>> origin/Juan_Nambo
=======
import { joinGroupRooms } from '../utils/socketHelpers.js';
import ChatComponent from '../components/ChatComponent.js';
>>>>>>> origin/Juan_Nambo

/**
 * Vista de Dashboard
 */
class DashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
<<<<<<< HEAD
<<<<<<< HEAD
      <div class="dashboard-header mb-3" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 class="card__title" style="font-size: 2.5rem;">Hola, ${user.nombre}</h1>
          <p class="text-muted">Bienvenido a tu panel de ${user.role}</p>
        </div>
        <a href="#/sessions" class="btn btn-primary">Ver Sesiones Disponibles</a>
      </div>
      
      <div id="dashboard-content">
        <div class="spinner" style="margin: 3rem auto;"></div>
=======
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
<<<<<<< HEAD
      const [groupsRes, sessionsRes] = await Promise.all([
=======
      const [groupsRes, sessionsRes] = await Promise.allSettled([
>>>>>>> origin/Juan_Nambo
=======
      const [groupsRes, sessionsRes] = await Promise.allSettled([
>>>>>>> origin/Juan_Nambo
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

<<<<<<< HEAD
<<<<<<< HEAD
      const groups = groupsRes.success ? groupsRes.data : [];
      const sessions = sessionsRes.success ? sessionsRes.data : [];
=======
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo

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
<<<<<<< HEAD
<<<<<<< HEAD
    } catch (error) {
      content.innerHTML = '<p class="text-muted text-center">Error al cargar datos</p>';
=======
=======
>>>>>>> origin/Juan_Nambo

      // Inicializar Chat si existe el contenedor
      if (document.getElementById('chat-container')) {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.innerHTML = ChatComponent.render();
        ChatComponent.attachEvents();
      }
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar datos</p>';
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
    }
  }

  renderAdminDashboard(groups, sessions) {
    return `
<<<<<<< HEAD
<<<<<<< HEAD
      <div class="dashboard-grid">
        <div class="stat-card">
          <h3 class="text-muted">Grupos Activos</h3>
          <div class="stat-value">${groups.length}</div>
        </div>
        <div class="stat-card">
          <h3 class="text-muted">Sesiones Totales</h3>
          <div class="stat-value">${sessions.length}</div>
        </div>
=======
=======
>>>>>>> origin/Juan_Nambo
      <div>
        <h2>Estadísticas</h2>
        <p>Grupos: ${groups.length}</p>
        <p>Sesiones: ${sessions.length}</p>
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
      </div>
    `;
  }

  renderProfesorDashboard(groups, sessions) {
    return `
<<<<<<< HEAD
<<<<<<< HEAD
      <div class="mb-3">
        <div class="card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <h2 class="card__title" style="font-size: 1.5rem;">Mis Grupos</h2>
          <button class="btn btn-primary btn-sm">Crear Grupo</button>
        </div>
        ${groups.length > 0 ? this.renderGroupsGrid(groups) : this.renderEmptyState('No tienes grupos asignados')}
      </div>

      <div class="mt-3">
        <h2 class="card__title mb-2" style="font-size: 1.5rem;">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsGrid(sessions.slice(0, 4)) : this.renderEmptyState('No hay sesiones programadas')}
=======
=======
>>>>>>> origin/Juan_Nambo
      <div>
        <h2>Mis Grupos (${groups.length})</h2>
        ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No tienes grupos asignados</p>'}
        <h2 class="mt-3">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
        <div id="chat-container"></div>
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
      </div>
    `;
  }

  renderTutorDashboard(groups, sessions) {
    return `
<<<<<<< HEAD
<<<<<<< HEAD
      <div class="dashboard-grid mb-3">
        <div class="stat-card">
          <h3 class="text-muted">Mis Sesiones</h3>
          <div class="stat-value">${sessions.length}</div>
        </div>
        <div class="stat-card">
          <h3 class="text-muted">Rating Promedio</h3>
          <div class="stat-value">4.8</div>
        </div>
      </div>

      <div>
        <h2 class="card__title mb-2" style="font-size: 1.5rem;">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsGrid(sessions) : this.renderEmptyState('No tienes sesiones asignadas')}
=======
      <div>
        <h2>Mis Sesiones (${sessions.length})</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No tienes sesiones asignadas</p>'}
>>>>>>> origin/Juan_Nambo
=======
      <div>
        <h2>Mis Sesiones (${sessions.length})</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No tienes sesiones asignadas</p>'}
>>>>>>> origin/Juan_Nambo
      </div>
    `;
  }

  renderEstudianteDashboard(groups, sessions) {
    return `
<<<<<<< HEAD
<<<<<<< HEAD
      <div class="mb-3">
        <h2 class="card__title mb-2" style="font-size: 1.5rem;">Mis Grupos</h2>
        ${groups.length > 0 ? this.renderGroupsGrid(groups) : this.renderEmptyState('No estás inscrito en ningún grupo')}
      </div>

      <div class="mt-3">
        <h2 class="card__title mb-2" style="font-size: 1.5rem;">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsGrid(sessions.slice(0, 4)) : this.renderEmptyState('No tienes sesiones programadas')}
=======
=======
>>>>>>> origin/Juan_Nambo
      <div>
        <h2>Mis Grupos (${groups.length})</h2>
        ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No estás en ningún grupo</p>'}
        <h2 class="mt-3">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
        <div id="chat-container"></div>
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
      </div>
    `;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  renderGroupsGrid(groups) {
    return `
      <div class="dashboard-grid">
        ${groups.map(group => `
          <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
              <h3 style="font-size: 1.25rem; font-weight: 600;">${group.nombre}</h3>
              <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
            </div>
            <p class="text-muted" style="margin-bottom: 1.5rem; font-size: 0.9rem;">
              ${group.descripcion || 'Sin descripción'}
            </p>
            <a href="#/groups/${group.id}" class="btn btn-secondary w-full">Ver Detalles</a>
          </div>
        `).join('')}
=======
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
      </div>
    `;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  renderSessionsGrid(sessions) {
    return `
      <div class="dashboard-grid">
        ${sessions.map(session => `
          <div class="card" style="padding: 1.5rem; border-left: 4px solid var(--accent-color);">
            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge--${getStatusColor(session.estado)}">${getStatusName(session.estado)}</span>
            </div>
            <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">${session.tema || 'Sesión de Asesoría'}</h3>
            <div class="text-muted" style="font-size: 0.9rem; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span>📅</span> ${formatDate(session.fecha)}
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>⏰</span> ${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}
              </div>
            </div>
            <button class="btn btn-primary btn-sm w-full">Unirse a la Sesión</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderEmptyState(message) {
    return `
      <div class="card text-center" style="padding: 3rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📭</div>
        <p class="text-muted">${message}</p>
=======
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
      </div>
    `;
  }
}

export default new DashboardView();


<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
