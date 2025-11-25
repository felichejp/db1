import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, getStatusName, getStatusColor, capitalize } from '../utils/helpers.js';
import { joinGroupRooms } from '../utils/socketHelpers.js';

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
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 class="card__title">Grupos</h1>
              <p class="text-muted">Gestiona tus grupos de estudio</p>
            </div>
            ${user.role === 'Profesor' || user.role === 'Admin' ? `
              <button class="btn btn-primary" id="btn-create-group">
                <span>➕</span> Crear Grupo
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
      this.attachEventListeners();
    } catch (error) {
      Notification.error('Error al cargar los grupos');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadGroups() {
    const content = document.getElementById('groups-content');
    
    try {
      const response = await groupsAPI.getAll();
      
      if (!response.success) {
        content.innerHTML = '<p class="text-muted">Error al cargar los grupos</p>';
        return;
      }

      const groups = response.data || [];
      
      // Unirse a rooms de grupos para eventos en tiempo real
      if (groups.length > 0) {
        await joinGroupRooms(groups);
      }

      if (groups.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <p class="text-muted">No hay grupos disponibles</p>
            ${authService.getCurrentUser().role === 'Profesor' || authService.getCurrentUser().role === 'Admin' ? `
              <button class="btn btn-primary mt-2" id="btn-create-group-empty">Crear mi primer grupo</button>
            ` : ''}
          </div>
        `;
        this.attachEventListeners();
        return;
      }

      content.innerHTML = this.renderGroupsList(groups);
      this.attachEventListeners();
    } catch (error) {
      if (error.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }
      content.innerHTML = '<p class="text-muted">Error al cargar los grupos</p>';
      console.error(error);
    }
  }

  renderGroupsList(groups) {
    const user = authService.getCurrentUser();
    
    return `
      <div class="groups-grid">
        ${groups.map(group => `
          <div class="card card--hover" data-group-id="${group.id}">
            <div class="card__header">
              <h3 class="card__title">${group.nombre}</h3>
              <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
            </div>
            <div class="card__body">
              ${group.descripcion ? `<p class="text-muted">${group.descripcion}</p>` : ''}
              <div class="group-info mt-2">
                <div class="info-item">
                  <span class="info-label">Miembros:</span>
                  <span class="info-value">${group.miembrosCount || 0}</span>
                </div>
                ${group.profesor ? `
                  <div class="info-item">
                    <span class="info-label">Profesor:</span>
                    <span class="info-value">${group.profesor.nombre || group.profesor}</span>
                  </div>
                ` : ''}
                ${group.fechaCreacion ? `
                  <div class="info-item">
                    <span class="info-label">Creado:</span>
                    <span class="info-value">${formatDate(group.fechaCreacion)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="card__footer">
              <a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">Ver Detalles</a>
              ${(user.role === 'Profesor' || user.role === 'Admin') && (group.profesorId === user.id || user.role === 'Admin') ? `
                <button class="btn btn-danger btn-sm" data-action="delete" data-group-id="${group.id}" type="button">Eliminar</button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  attachEventListeners() {
    const user = authService.getCurrentUser();
    const self = this; // Guardar referencia a this
    
    // Botón crear grupo (botón principal en el header)
    const createBtn = document.getElementById('btn-create-group');
    if (createBtn && (user.role === 'Profesor' || user.role === 'Admin')) {
      createBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        self.showCreateGroupModal();
      };
    }

    // Botón crear grupo (botón en estado vacío)
    const createEmptyBtn = document.getElementById('btn-create-group-empty');
    if (createEmptyBtn && (user.role === 'Profesor' || user.role === 'Admin')) {
      createEmptyBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        self.showCreateGroupModal();
      };
    }

    // Botones eliminar grupo
    const deleteButtons = document.querySelectorAll('[data-action="delete"]');
    console.log('Botones de eliminar encontrados:', deleteButtons.length);
    
    deleteButtons.forEach((btn, index) => {
      const groupId = btn.getAttribute('data-group-id');
      console.log(`Botón ${index}: groupId = ${groupId}`);
      
      // Remover cualquier listener anterior
      btn.onclick = null;
      
      btn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const btnGroupId = this.getAttribute('data-group-id') || this.dataset.groupId;
        console.log('Intentando eliminar grupo con ID:', btnGroupId);
        
        if (!btnGroupId) {
          console.error('No se encontró el ID del grupo');
          Notification.error('Error: No se pudo identificar el grupo a eliminar');
          return;
        }
        
        if (confirm('¿Estás seguro de que deseas eliminar este grupo?')) {
          console.log('Confirmado, eliminando grupo:', btnGroupId);
          await self.deleteGroup(parseInt(btnGroupId));
        }
      };
    });

    // Click en tarjetas para ver detalles
    document.querySelectorAll('.card--hover[data-group-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        // No navegar si se hizo click en un botón o en un enlace
        if (e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'A' ||
            e.target.closest('button') || 
            e.target.closest('a')) {
          return;
        }
        const groupId = card.dataset.groupId;
        window.location.hash = `#/groups/${groupId}`;
      });
    });
  }

  showCreateGroupModal() {
    const modalContent = `
      <form id="create-group-form">
        <div class="form-group">
          <label for="group-name">Nombre del Grupo *</label>
          <input type="text" id="group-name" name="nombre" class="form-control" required>
        </div>
        <div class="form-group">
          <label for="group-description">Descripción</label>
          <textarea id="group-description" name="descripcion" class="form-control" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="group-estado">Estado</label>
          <select id="group-estado" name="estado" class="form-control">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </form>
    `;

    const modalFooter = `
      <button class="btn btn-secondary" id="btn-cancel-group">Cancelar</button>
      <button class="btn btn-primary" id="btn-submit-group">Crear Grupo</button>
    `;

    Modal.show('Crear Nuevo Grupo', modalContent, modalFooter);

    // Attach event listeners
    document.getElementById('btn-cancel-group').addEventListener('click', () => {
      Modal.hide();
    });

    document.getElementById('btn-submit-group').addEventListener('click', async () => {
      await this.handleCreateGroup();
    });
  }

  async handleCreateGroup() {
    const form = document.getElementById('create-group-form');
    const formData = new FormData(form);
    
    const groupData = {
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion') || null,
      estado: formData.get('estado') || 'activo'
    };

    if (!groupData.nombre) {
      Notification.error('El nombre del grupo es requerido');
      return;
    }

    try {
      Loading.show();
      const response = await groupsAPI.create(groupData);
      
      if (response.success) {
        Notification.success('Grupo creado exitosamente');
        Modal.hide();
        await this.loadGroups();
      } else {
        Notification.error(response.message || 'Error al crear el grupo');
      }
    } catch (error) {
      Notification.error('Error al crear el grupo');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async deleteGroup(groupId) {
    try {
      Loading.show();
      const response = await groupsAPI.delete(groupId);
      
      if (response.success) {
        Notification.success('Grupo eliminado exitosamente');
        await this.loadGroups();
      } else {
        Notification.error(response.message || 'Error al eliminar el grupo');
      }
    } catch (error) {
      console.error('Error al eliminar el grupo:', error);
      if (error.response) {
        Notification.error(error.response.data?.message || `Error ${error.response.status}: No se pudo eliminar el grupo`);
      } else {
        Notification.error('Error al eliminar el grupo. Verifica tu conexión.');
      }
    } finally {
      Loading.hide();
    }
  }
}

export default new GroupsView();

