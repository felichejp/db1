import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { adminAPI } from '../api/admin.js';
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
      if (user.role === 'Admin') {
        const statsRes = await adminAPI.getStats();
        const stats = statsRes.success ? statsRes.data : {};
        const [groupsRes, sessionsRes] = await Promise.all([
          groupsAPI.getAll(),
          sessionsAPI.getAll()
        ]);
        const groups = groupsRes.success ? groupsRes.data : [];
        const sessions = sessionsRes.success ? sessionsRes.data : [];
        content.innerHTML = this.renderAdminDashboard(stats, groups, sessions);
      } else {
        const [groupsRes, sessionsRes] = await Promise.all([
          groupsAPI.getAll(),
          sessionsAPI.getAll()
        ]);

        const groups = groupsRes.success ? groupsRes.data : [];
        const sessions = sessionsRes.success ? sessionsRes.data : [];

        let html = '';

        if (user.role === 'Profesor') {
          html = this.renderProfesorDashboard(groups, sessions);
        } else if (user.role === 'Tutor') {
          html = this.renderTutorDashboard(groups, sessions);
        } else {
          html = this.renderEstudianteDashboard(groups, sessions);
        }

        content.innerHTML = html;
      }
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar datos</p>';
    }
  }

  renderAdminDashboard(stats, groups, sessions) {
    return `
      <div class="admin-dashboard">
        <div class="admin-stats-grid">
          <div class="stat-card">
            <div class="stat-card__icon">👥</div>
            <div class="stat-card__content">
              <h3 class="stat-card__value">${stats.estudiantes || 0}</h3>
              <p class="stat-card__label">Estudiantes</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">🎓</div>
            <div class="stat-card__content">
              <h3 class="stat-card__value">${stats.tutors || 0}</h3>
              <p class="stat-card__label">Asesores</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">👨‍🏫</div>
            <div class="stat-card__content">
              <h3 class="stat-card__value">${stats.profesores || 0}</h3>
              <p class="stat-card__label">Responsables</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">👨‍👩‍👧‍👦</div>
            <div class="stat-card__content">
              <h3 class="stat-card__value">${stats.groups || 0}</h3>
              <p class="stat-card__label">Grupos</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">📚</div>
            <div class="stat-card__content">
              <h3 class="stat-card__value">${stats.topSubject?.materia || 'N/A'}</h3>
              <p class="stat-card__label">Materia más popular</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">📊</div>
            <div class="stat-card__content">
              <h3 class="stat-card__value">${stats.topGroup?.count || 0}</h3>
              <p class="stat-card__label">Mayor cant. alumnos (${stats.topGroup?.nombre || 'N/A'})</p>
            </div>
          </div>
        </div>

        <div class="admin-actions-section">
          <h2>Gestión</h2>
          <div class="admin-actions-grid">
            <a href="#/groups" class="admin-action-card">
              <div class="admin-action-card__icon">👨‍👩‍👧‍👦</div>
              <h3>Gestionar Grupos</h3>
              <p>Crear, editar y asignar grupos</p>
            </a>
            <a href="#/users" class="admin-action-card">
              <div class="admin-action-card__icon">👥</div>
              <h3>Gestionar Usuarios</h3>
              <p>Ver y administrar usuarios</p>
            </a>
            <a href="#/sessions" class="admin-action-card">
              <div class="admin-action-card__icon">📅</div>
              <h3>Gestionar Sesiones</h3>
              <p>Ver y administrar sesiones</p>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  renderProfesorDashboard(groups, sessions) {
    return `
      <div>
        <h2>Mis Grupos (${groups.length})</h2>
        ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No tienes grupos asignados</p>'}
        <h2 class="mt-3">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
      </div>
    `;
  }

  renderTutorDashboard(groups, sessions) {
    return `
      <div>
        <h2>Mis Grupos (${groups.length})</h2>
        ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No estás en ningún grupo</p>'}
        <h2 class="mt-3">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
      </div>
    `;
  }

  renderEstudianteDashboard(groups, sessions) {
    return `
      <div>
        <h2>Mis Grupos (${groups.length})</h2>
        ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No estás en ningún grupo</p>'}
        <h2 class="mt-3">Próximas Sesiones</h2>
        ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
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

