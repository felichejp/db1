import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { getStatusName, getStatusColor, formatDate } from '../utils/helpers.js';

/**
 * Vista de Grupos
 */
class GroupsView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Grupos</h1>
          ${(user.role === 'Profesor' || user.role === 'Admin') ? 
            '<button id="btn-create-group" class="btn btn-primary">Crear Grupo</button>' : ''}
        </div>
        <div class="card__body">
          <div id="groups-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    // Event listener para crear grupo
    const createBtn = document.getElementById('btn-create-group');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateGroupModal());
    }

    try {
      Loading.show();
      await this.loadGroups();
    } catch (error) {
      Notification.error('Error al cargar grupos');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadGroups() {
    const content = document.getElementById('groups-content');
    
    try {
      const response = await groupsAPI.getAll();
      const groups = response.success ? response.data : [];

      if (groups.length === 0) {
        content.innerHTML = '<p class="text-muted">No hay grupos disponibles</p>';
        return;
      }

      content.innerHTML = this.renderGroupsList(groups);
      this.attachEventListeners();
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
      console.error(error);
    }
  }

  renderGroupsList(groups) {
    return `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(group => `
              <tr>
                <td><strong>${group.nombre || '-'}</strong></td>
                <td>${group.descripcion ? (group.descripcion.length > 50 ? group.descripcion.substring(0, 50) + '...' : group.descripcion) : '-'}</td>
                <td><span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span></td>
                <td>${group.createdAt ? formatDate(group.createdAt) : '-'}</td>
                <td>
                  <a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">Ver Detalles</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  attachEventListeners() {
    // Los enlaces ya están en el HTML, no necesitamos listeners adicionales
  }

  showCreateGroupModal() {
    const user = authService.getCurrentUser();
    const content = `
      <form id="create-group-form">
        <div class="form-group">
          <label for="group-nombre">Nombre del Grupo *</label>
          <input type="text" id="group-nombre" class="form-control" required placeholder="Ej: Grupo de Matemáticas">
        </div>
        <div class="form-group">
          <label for="group-descripcion">Descripción</label>
          <textarea id="group-descripcion" class="form-control" rows="3" placeholder="Descripción del grupo"></textarea>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="window.currentModal?.hide()">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-submit-group">Crear</button>
    `;

    Modal.show('Crear Nuevo Grupo', content, footer);

    const form = document.getElementById('create-group-form');
    const submitBtn = document.getElementById('btn-submit-group');

    submitBtn.addEventListener('click', async () => {
      const nombre = document.getElementById('group-nombre').value.trim();
      const descripcion = document.getElementById('group-descripcion').value.trim();

      if (!nombre) {
        Notification.error('El nombre del grupo es requerido');
        return;
      }

      try {
        Loading.show();
        const response = await groupsAPI.create({ nombre, descripcion });
        
        if (response.success) {
          Notification.success('Grupo creado exitosamente');
          Modal.hide();
          await this.loadGroups();
        } else {
          Notification.error(response.message || 'Error al crear grupo');
        }
      } catch (error) {
        Notification.error('Error al crear grupo');
        console.error(error);
      } finally {
        Loading.hide();
      }
    });
  }
}

export default new GroupsView();

