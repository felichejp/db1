import authService from '../services/authService.js';
import { usersAPI } from '../api/users.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, getRoleName } from '../utils/helpers.js';

/**
 * Vista de Usuarios (Admin)
 */
class UsersView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    if (user.role !== 'Admin') {
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Usuarios</h1>
          <p class="text-muted">Gestiona todos los usuarios del sistema</p>
        </div>
        <div class="card__body">
          <div id="users-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadUsers();
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      Notification.error('Error al cargar los usuarios');
    } finally {
      Loading.hide();
    }
  }

  async loadUsers() {
    const content = document.getElementById('users-content');

    try {
      const res = await usersAPI.getAll();
      
      if (!res.success) {
        content.innerHTML = '<p class="text-muted">Error al cargar usuarios</p>';
        return;
      }

      const users = res.data || [];
      content.innerHTML = this.renderUsersTable(users);
    } catch (error) {
      console.error('Error en loadUsers:', error);
      if (error.response?.status === 401) {
        Notification.error('Sesión expirada. Por favor, inicia sesión nuevamente');
        authService.logout();
        window.location.hash = '#/login';
      } else {
        content.innerHTML = '<p class="text-muted">Error al cargar los usuarios</p>';
      }
    }
  }

  renderUsersTable(users) {
    if (users.length === 0) {
      return '<p class="text-muted">No hay usuarios registrados</p>';
    }

    return `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Grado</th>
              <th>Fecha de Registro</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td>${user.id}</td>
                <td>${user.nombre || 'Sin nombre'}</td>
                <td>${user.email}</td>
                <td>
                  <span class="badge badge--${this.getRoleBadgeColor(user.role)}">
                    ${getRoleName(user.role)}
                  </span>
                </td>
                <td>${user.grado || '-'}</td>
                <td>${formatDate(user.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  getRoleBadgeColor(role) {
    const colors = {
      'Admin': 'success',
      'Profesor': 'info',
      'Tutor': 'warning',
      'Estudiante': 'primary'
    };
    return colors[role] || 'secondary';
  }
}

export default new UsersView();

