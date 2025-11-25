import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { Modal as ModalClass } from '../components/Modal.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista de Grupos
 */
class GroupsView {
  constructor() {
    this.groups = [];
    this.selectedGroup = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 class="card__title">Grupos</h1>
              <p class="text-muted">Gestiona tus grupos de asesoría</p>
            </div>
            ${user.role === 'Admin' ? `
              <button class="btn btn-primary" id="btn-create-group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Crear Grupo
              </button>
            ` : ''}
          </div>
        </div>
        <div class="card__body">
          <div id="groups-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

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
    try {
      const response = await groupsAPI.getAll();
      if (response.success) {
        this.groups = response.data || [];
        this.renderGroups();
      }
    } catch (error) {
      console.error('Error cargando grupos:', error);
      const content = document.getElementById('groups-content');
      if (content) {
        content.innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
      }
    }
  }

  renderGroups() {
    const content = document.getElementById('groups-content');
    if (!content) return;

    const user = authService.getCurrentUser();

    if (this.groups.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📚</div>
          <div class="empty-state__message">No tienes grupos asignados</div>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="groups-grid">
        ${this.groups.map(group => this.renderGroupCard(group, user)).join('')}
      </div>
    `;

    // Agregar event listeners
    this.groups.forEach(group => {
      const card = document.getElementById(`group-card-${group.id}`);
      if (card) {
        card.addEventListener('click', () => this.viewGroupDetails(group.id));
      }

      const editBtn = document.getElementById(`btn-edit-group-${group.id}`);
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.editGroup(group);
        });
      }

      const deleteBtn = document.getElementById(`btn-delete-group-${group.id}`);
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteGroup(group.id);
        });
      }
    });

    // Botón crear grupo
    const createBtn = document.getElementById('btn-create-group');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateGroupModal());
    }
  }

  renderGroupCard(group, user) {
    const canEdit = user.role === 'Admin' || (user.role === 'Profesor' && group.profesorId === user.id);
    const canDelete = user.role === 'Admin'; // Solo Admin puede eliminar
    
    return `
      <div class="group-card" id="group-card-${group.id}">
        <div class="group-card__header">
          <h3 class="group-card__title">${group.nombre}</h3>
          <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
        </div>
        <div class="group-card__body">
          ${group.descripcion ? `<p class="group-card__description">${group.descripcion}</p>` : ''}
          <div class="group-card__info">
            <span>ID: ${group.id}</span>
            <span>•</span>
            <span>Creado: ${formatDate(group.createdAt)}</span>
          </div>
        </div>
        <div class="group-card__footer">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.location.hash='#/groups/${group.id}'">
            Ver Detalles
          </button>
          ${canEdit ? `
            <button class="btn btn-secondary btn-sm" id="btn-edit-group-${group.id}">
              Editar
            </button>
          ` : ''}
          ${canDelete ? `
            <button class="btn btn-danger btn-sm" id="btn-delete-group-${group.id}">
              Eliminar
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  async viewGroupDetails(groupId) {
    window.location.hash = `#/groups/${groupId}`;
  }

  showCreateGroupModal() {
    const modal = new ModalClass({
      title: 'Crear Nuevo Grupo',
      content: `
        <form id="create-group-form">
          <div class="form-group">
            <label class="form-label">Nombre del Grupo</label>
            <input type="text" class="form-input" id="group-name" required maxlength="255">
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea class="form-textarea" id="group-description" rows="3" maxlength="1000"></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
        <button class="btn btn-primary" data-action="submit">Crear Grupo</button>
      `,
      onAction: async (action) => {
        if (action === 'submit') {
          await this.createGroup();
        }
      }
    });

    modal.show();
  }

  async createGroup() {
    const nameInput = document.getElementById('group-name');
    const descInput = document.getElementById('group-description');

    if (!nameInput || !nameInput.value.trim()) {
      Notification.error('El nombre del grupo es requerido');
      return;
    }

    try {
      const response = await groupsAPI.create({
        nombre: nameInput.value.trim(),
        descripcion: descInput?.value.trim() || null
      });

      if (response.success) {
        Notification.success('Grupo creado exitosamente');
        await this.loadGroups();
        if (window.currentModal) {
          window.currentModal.hide();
        }
      } else {
        Notification.error(response.message || 'Error al crear grupo');
      }
    } catch (error) {
      console.error('Error creando grupo:', error);
      Notification.error('Error al crear grupo');
    }
  }

  async editGroup(group) {
    const modal = new ModalClass({
      title: 'Editar Grupo',
      content: `
        <form id="edit-group-form">
          <div class="form-group">
            <label class="form-label">Nombre del Grupo</label>
            <input type="text" class="form-input" id="edit-group-name" value="${group.nombre}" required maxlength="255">
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea class="form-textarea" id="edit-group-description" rows="3" maxlength="1000">${group.descripcion || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-select" id="edit-group-status">
              <option value="activo" ${group.estado === 'activo' ? 'selected' : ''}>Activo</option>
              <option value="inactivo" ${group.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
              <option value="completado" ${group.estado === 'completado' ? 'selected' : ''}>Completado</option>
            </select>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
        <button class="btn btn-primary" data-action="submit">Guardar Cambios</button>
      `,
      onAction: async (action) => {
        if (action === 'submit') {
          await this.updateGroup(group.id);
        }
      }
    });

    modal.show();
  }

  async updateGroup(groupId) {
    const nameInput = document.getElementById('edit-group-name');
    const descInput = document.getElementById('edit-group-description');
    const statusInput = document.getElementById('edit-group-status');

    if (!nameInput || !nameInput.value.trim()) {
      Notification.error('El nombre del grupo es requerido');
      return;
    }

    try {
      const response = await groupsAPI.update(groupId, {
        nombre: nameInput.value.trim(),
        descripcion: descInput?.value.trim() || null,
        estado: statusInput?.value || 'activo'
      });

      if (response.success) {
        Notification.success('Grupo actualizado exitosamente');
        await this.loadGroups();
        if (window.currentModal) {
          window.currentModal.hide();
        }
      } else {
        Notification.error(response.message || 'Error al actualizar grupo');
      }
    } catch (error) {
      console.error('Error actualizando grupo:', error);
      Notification.error('Error al actualizar grupo');
    }
  }

  async deleteGroup(groupId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await groupsAPI.delete(groupId);
      if (response.success) {
        Notification.success('Grupo eliminado exitosamente');
        await this.loadGroups();
      } else {
        Notification.error(response.message || 'Error al eliminar grupo');
      }
    } catch (error) {
      console.error('Error eliminando grupo:', error);
      Notification.error('Error al eliminar grupo');
    }
  }
}

export default new GroupsView();

