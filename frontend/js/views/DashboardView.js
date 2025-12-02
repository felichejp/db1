import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista de Dashboard
 */
class DashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="dashboard-header mb-3" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 class="card__title" style="font-size: 2.5rem;">Hola, ${user.nombre}</h1>
          <p class="text-muted">Bienvenido a tu panel de ${user.role}</p>
        </div>
        <a href="#/sessions" class="btn btn-primary">Ver Sesiones Disponibles</a>
      </div>
      
      <div id="dashboard-content">
        <div class="spinner" style="margin: 3rem auto;"></div>
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
      const [groupsRes, sessionsRes] = await Promise.all([
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

      const groups = groupsRes.success ? groupsRes.data : [];
      const sessions = sessionsRes.success ? sessionsRes.data : [];

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
    } catch (error) {
      content.innerHTML = '<p class="text-muted text-center">Error al cargar datos</p>';
    }
  }

  renderAdminDashboard(groups, sessions) {
    return `
      <div class="dashboard-grid">
        <div class="stat-card">
          <h3 class="text-muted">Grupos Activos</h3>
          <div class="stat-value">${groups.length}</div>
        </div>
        <div class="stat-card">
          <h3 class="text-muted">Sesiones Totales</h3>
          <div class="stat-value">${sessions.length}</div>
        </div>
      </div>
    `;
  }

  renderProfesorDashboard(groups, sessions) {
    return `
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
      </div>
    `;
  }

  renderTutorDashboard(groups, sessions) {
    return `
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
      </div>
    `;
  }

  renderEstudianteDashboard(groups, sessions) {
    return `
      <div class="mb-3">
        <h2 class="card__title mb-2" style="font-size: 1.5rem;">Mis Grupos</h2>
        ${groups.length > 0 ? this.renderGroupsGrid(groups) : this.renderEmptyState('No estás inscrito en ningún grupo')}
      </div>

      <div class="mt-3">
        <h2 class="card__title mb-2" style="font-size: 1.5rem;">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsGrid(sessions.slice(0, 4)) : this.renderEmptyState('No tienes sesiones programadas')}
      </div>
    `;
  }

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
      </div>
    `;
  }

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
      </div>
    `;
  }
}

export default new DashboardView();



