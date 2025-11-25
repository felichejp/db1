import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, getStatusName, getStatusColor } from '../utils/helpers.js';
import { joinGroupRoom, leaveGroupRoom } from '../utils/socketHelpers.js';

/**
 * Vista de Grupos
 */
class GroupsView {
  constructor() {
    this.currentGroupId = null;
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const hash = window.location.hash;
    const match = hash.match(/#\/groups\/(\d+)/);
    
    if (match) {
      // Vista de detalle de grupo
      await this.renderGroupDetail(parseInt(match[1], 10));
    } else {
      // Vista de listado de grupos
      await this.renderGroupsList();
    }
  }

  async renderGroupsList() {
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
            ${(user.role === 'Profesor' || user.role === 'Admin') ? `
              <button id="create-group-btn" class="btn btn-primary">
                + Crear Grupo
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

    // Event listener para crear grupo
    const createBtn = document.getElementById('create-group-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateGroupModal());
    }
  }

  async loadGroups() {
    const content = document.getElementById('groups-content');
    
    try {
      const response = await groupsAPI.getAll();
      
      if (!response.success) {
        if (response.status === 401) {
          authService.logout();
          window.location.hash = '#/login';
          return;
        }
        throw new Error(response.message || 'Error al cargar grupos');
      }

      const groups = response.data || [];
      
      if (groups.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">👨‍👩‍👧‍👦</div>
            <div class="empty-state__message">No hay grupos disponibles</div>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="groups-grid">
          ${groups.map(group => this.renderGroupCard(group)).join('')}
        </div>
      `;

      // Agregar event listeners a las tarjetas
      groups.forEach(group => {
        const card = document.getElementById(`group-card-${group.id}`);
        if (card) {
          card.addEventListener('click', () => {
            window.location.hash = `#/groups/${group.id}`;
          });
        }
      });
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
      console.error(error);
    }
  }

  renderGroupCard(group) {
    return `
      <div id="group-card-${group.id}" class="group-card" style="cursor: pointer;">
        <div class="group-card__header">
          <h3 class="group-card__title">${group.nombre}</h3>
          <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
        </div>
        <div class="group-card__body">
          ${group.descripcion ? `<p class="text-muted">${group.descripcion}</p>` : ''}
          <div class="group-card__meta">
            <span>📅 Creado: ${formatDate(group.createdAt)}</span>
          </div>
        </div>
        <div class="group-card__footer">
          <a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">Ver Detalles</a>
        </div>
      </div>
    `;
  }

  async renderGroupDetail(groupId) {
    const user = authService.getCurrentUser();
    if (!user) return;

    this.currentGroupId = groupId;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <button id="back-btn" class="btn btn-secondary btn-sm" style="margin-bottom: 0.5rem;">
                ← Volver
              </button>
              <h1 class="card__title" id="group-title">Cargando...</h1>
            </div>
          </div>
        </div>
        <div class="card__body">
          <div id="group-detail-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    // Event listener para volver
    document.getElementById('back-btn').addEventListener('click', () => {
      window.location.hash = '#/groups';
    });

    try {
      Loading.show();
      await this.loadGroupDetail(groupId);
    } catch (error) {
      Notification.error('Error al cargar el grupo');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadGroupDetail(groupId) {
    const content = document.getElementById('group-detail-content');
    const title = document.getElementById('group-title');
    
    try {
      const [groupRes, membersRes] = await Promise.allSettled([
        groupsAPI.getById(groupId),
        groupsAPI.getMembers(groupId)
      ]);

      if (groupRes.status === 'rejected' || !groupRes.value.success) {
        if (groupRes.value?.status === 401) {
          authService.logout();
          window.location.hash = '#/login';
          return;
        }
        throw new Error('Error al cargar el grupo');
      }

      const group = groupRes.value.data;
      const members = membersRes.status === 'fulfilled' && membersRes.value.success 
        ? membersRes.value.data 
        : [];

      title.textContent = group.nombre;

      // Unirse al room del grupo para recibir eventos
      joinGroupRoom(groupId);

      content.innerHTML = `
        <div class="group-detail">
          <div class="group-detail__info">
            <div class="info-section">
              <h3>Información del Grupo</h3>
              <p><strong>Estado:</strong> <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span></p>
              ${group.descripcion ? `<p><strong>Descripción:</strong> ${group.descripcion}</p>` : ''}
              <p><strong>Creado:</strong> ${formatDate(group.createdAt)}</p>
            </div>

            <div class="info-section">
              <h3>Miembros (${members.length})</h3>
              ${members.length > 0 ? `
                <div class="members-list">
                  ${members.map(member => `
                    <div class="member-item">
                      <div>
                        <strong>${member.nombre}</strong>
                        <span class="text-muted">(${member.email})</span>
                      </div>
                      <span class="badge badge--info">${member.role}</span>
                    </div>
                  `).join('')}
                </div>
              ` : '<p class="text-muted">No hay miembros en este grupo</p>'}
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar el grupo</p>';
      console.error(error);
    }
  }

  showCreateGroupModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h2 class="modal__title">Crear Nuevo Grupo</h2>
          <button class="modal__close" id="close-modal">&times;</button>
        </div>
        <div class="modal__body">
          <form id="create-group-form">
            <div class="form-group">
              <label class="form-label" for="group-name">Nombre del Grupo *</label>
              <input type="text" id="group-name" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="group-description">Descripción</label>
              <textarea id="group-description" class="form-textarea" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="cancel-create">Cancelar</button>
          <button class="btn btn-primary" id="submit-create">Crear</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    modal.querySelector('#close-modal').addEventListener('click', closeModal);
    modal.querySelector('#cancel-create').addEventListener('click', closeModal);
    modal.querySelector('#submit-create').addEventListener('click', async () => {
      const name = document.getElementById('group-name').value.trim();
      const description = document.getElementById('group-description').value.trim();

      if (!name) {
        Notification.error('El nombre del grupo es requerido');
        return;
      }

      try {
        Loading.show();
        const response = await groupsAPI.create({ nombre: name, descripcion: description });
        
        if (response.success) {
          Notification.success('Grupo creado exitosamente');
          closeModal();
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
    });

    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

export default new GroupsView();

