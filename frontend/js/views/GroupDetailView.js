import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import Chat from '../components/Chat.js';
import { formatDate, getStatusName, getStatusColor, getRoleName } from '../utils/helpers.js';
import router from '../router.js';

/**
 * Vista de Detalle de Grupo
 */
class GroupDetailView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    // Obtener ID del grupo de la URL
    const hash = window.location.hash;
    const match = hash.match(/#\/groups\/(\d+)/);
    
    if (!match) {
      Notification.error('ID de grupo inválido');
      router.navigate('#/groups');
      return;
    }

    const groupId = parseInt(match[1]);
    const container = document.getElementById('view-container');
    
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <button class="btn btn-secondary btn-sm" id="btn-back">← Volver</button>
              <h1 class="card__title mt-2" id="group-title">Cargando...</h1>
            </div>
            <div id="group-actions"></div>
          </div>
        </div>
        <div class="card__body">
          <div id="group-detail-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    // Event listener para botón volver
    document.getElementById('btn-back').addEventListener('click', () => {
      Chat.cleanup();
      router.navigate('#/groups');
    });

    try {
      Loading.show();
      await this.loadGroupDetail(groupId, user);
      this.attachEventListeners(groupId, user);
    } catch (error) {
      Notification.error('Error al cargar el grupo');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadGroupDetail(groupId, user) {
    const content = document.getElementById('group-detail-content');
    const title = document.getElementById('group-title');
    const actions = document.getElementById('group-actions');

    try {
      const [groupRes, membersRes] = await Promise.allSettled([
        groupsAPI.getById(groupId),
        groupsAPI.getMembers(groupId)
      ]);

      if (groupRes.status === 'rejected' || !groupRes.value.success) {
        if (groupRes.reason?.response?.status === 401) {
          authService.logout();
          window.location.hash = '#/login';
          return;
        }
        Notification.error('Grupo no encontrado');
        router.navigate('#/groups');
        return;
      }

      const group = groupRes.value.data;
      const members = membersRes.status === 'fulfilled' && membersRes.value.success
        ? membersRes.value.data
        : [];

      title.textContent = group.nombre;

      // Renderizar acciones según el rol
      if (user.role === 'Profesor' || user.role === 'Admin') {
        if (group.profesorId === user.id || user.role === 'Admin') {
          actions.innerHTML = `
            <button class="btn btn-primary btn-sm" id="btn-edit-group">Editar</button>
            <button class="btn btn-success btn-sm" id="btn-add-member">Agregar Miembro</button>
            <button class="btn btn-danger btn-sm" id="btn-delete-group">Eliminar</button>
          `;
        }
      }

      // Renderizar contenido
      content.innerHTML = this.renderGroupDetail(group, members, user);
      
      // Inicializar chat después de renderizar
      setTimeout(() => {
        Chat.init('group-chat-container', groupId);
      }, 100);
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar el grupo</p>';
      console.error(error);
    }
  }

  renderGroupDetail(group, members, user) {
    const isProfesor = user.role === 'Profesor' || user.role === 'Admin';
    const canManage = isProfesor && (group.profesorId === user.id || user.role === 'Admin');

    return `
      <div class="group-detail">
        <div class="group-info-section">
          <h2>Información del Grupo</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Estado:</span>
              <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
            </div>
            ${group.descripcion ? `
              <div class="info-item">
                <span class="info-label">Descripción:</span>
                <span class="info-value">${group.descripcion}</span>
              </div>
            ` : ''}
            ${group.profesor ? `
              <div class="info-item">
                <span class="info-label">Profesor:</span>
                <span class="info-value">${group.profesor.nombre || group.profesor}</span>
              </div>
            ` : ''}
            ${group.fechaCreacion ? `
              <div class="info-item">
                <span class="info-label">Fecha de Creación:</span>
                <span class="info-value">${formatDate(group.fechaCreacion)}</span>
              </div>
            ` : ''}
            <div class="info-item">
              <span class="info-label">Total de Miembros:</span>
              <span class="info-value">${members.length}</span>
            </div>
          </div>
        </div>

        <div class="members-section mt-4">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2>Miembros del Grupo</h2>
            ${canManage ? `
              <button class="btn btn-success btn-sm" id="btn-invite-member">Enviar Invitación</button>
            ` : ''}
          </div>
          
          ${members.length > 0 ? `
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Email</th>
                    ${canManage ? '<th>Acciones</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${members.map(member => `
                    <tr>
                      <td>${member.nombre || member.usuario?.nombre || 'N/A'}</td>
                      <td><span class="badge badge--info">${getRoleName(member.rol || member.usuario?.rol || 'Estudiante')}</span></td>
                      <td>${member.email || member.usuario?.email || 'N/A'}</td>
                      ${canManage && member.id !== user.id ? `
                        <td>
                          <button class="btn btn-danger btn-sm" data-action="remove-member" data-user-id="${member.id || member.usuarioId}">
                            Eliminar
                          </button>
                        </td>
                      ` : '<td></td>'}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <p class="text-muted">No hay miembros en este grupo</p>
          `}
        </div>

        <div class="chat-section mt-4">
          <h2>Chat del Grupo</h2>
          <div id="group-chat-container"></div>
        </div>
      </div>
    `;
  }

  attachEventListeners(groupId, user) {
    // Botón editar
    const editBtn = document.getElementById('btn-edit-group');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.showEditGroupModal(groupId));
    }

    // Botón agregar miembro
    const addMemberBtn = document.getElementById('btn-add-member');
    if (addMemberBtn) {
      addMemberBtn.addEventListener('click', () => this.showAddMemberModal(groupId));
    }

    // Botón eliminar grupo
    const deleteBtn = document.getElementById('btn-delete-group');
    if (deleteBtn) {
      const self = this;
      deleteBtn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.')) {
          await self.deleteGroup(groupId);
        }
      };
    }

    // Botón enviar invitación
    const inviteBtn = document.getElementById('btn-invite-member');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', () => this.showInviteModal(groupId));
    }

    // Botones eliminar miembro
    document.querySelectorAll('[data-action="remove-member"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = e.target.dataset.userId;
        if (confirm('¿Estás seguro de que deseas eliminar a este miembro del grupo?')) {
          await this.removeMember(groupId, userId);
        }
      });
    });
  }

  showEditGroupModal(groupId) {
    // Cargar datos del grupo primero
    groupsAPI.getById(groupId).then(response => {
      if (!response.success) {
        Notification.error('Error al cargar datos del grupo');
        return;
      }

      const group = response.data;
      const modalContent = `
        <form id="edit-group-form">
          <div class="form-group">
            <label for="edit-group-name">Nombre del Grupo *</label>
            <input type="text" id="edit-group-name" name="nombre" class="form-control" value="${group.nombre}" required>
          </div>
          <div class="form-group">
            <label for="edit-group-description">Descripción</label>
            <textarea id="edit-group-description" name="descripcion" class="form-control" rows="3">${group.descripcion || ''}</textarea>
          </div>
          <div class="form-group">
            <label for="edit-group-estado">Estado</label>
            <select id="edit-group-estado" name="estado" class="form-control">
              <option value="activo" ${group.estado === 'activo' ? 'selected' : ''}>Activo</option>
              <option value="inactivo" ${group.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </form>
      `;

      const modalFooter = `
        <button class="btn btn-secondary" onclick="window.currentModal?.hide()">Cancelar</button>
        <button class="btn btn-primary" id="btn-submit-edit-group">Guardar Cambios</button>
      `;

      Modal.show('Editar Grupo', modalContent, modalFooter);

      document.getElementById('btn-submit-edit-group').addEventListener('click', async () => {
        await this.handleUpdateGroup(groupId);
      });
    });
  }

  async handleUpdateGroup(groupId) {
    const form = document.getElementById('edit-group-form');
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
      const response = await groupsAPI.update(groupId, groupData);
      
      if (response.success) {
        Notification.success('Grupo actualizado exitosamente');
        Modal.hide();
        await this.render(); // Recargar la vista
      } else {
        Notification.error(response.message || 'Error al actualizar el grupo');
      }
    } catch (error) {
      Notification.error('Error al actualizar el grupo');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  showAddMemberModal(groupId) {
    const modalContent = `
      <form id="add-member-form">
        <div class="form-group">
          <label for="member-user-id">ID de Usuario</label>
          <input type="number" id="member-user-id" name="userId" class="form-control" required placeholder="Ingresa el ID del usuario">
          <small class="text-muted">Ingresa el ID numérico del usuario que deseas agregar</small>
        </div>
      </form>
    `;

    const modalFooter = `
      <button class="btn btn-secondary" onclick="window.currentModal?.hide()">Cancelar</button>
      <button class="btn btn-primary" id="btn-submit-add-member">Agregar</button>
    `;

    Modal.show('Agregar Miembro al Grupo', modalContent, modalFooter);

    document.getElementById('btn-submit-add-member').addEventListener('click', async () => {
      await this.handleAddMember(groupId);
    });
  }

  async handleAddMember(groupId) {
    const form = document.getElementById('add-member-form');
    const formData = new FormData(form);
    const userId = parseInt(formData.get('userId'));

    if (!userId || isNaN(userId)) {
      Notification.error('ID de usuario inválido');
      return;
    }

    try {
      Loading.show();
      const response = await groupsAPI.addMember(groupId, userId);
      
      if (response.success) {
        Notification.success('Miembro agregado exitosamente');
        Modal.hide();
        await this.render(); // Recargar la vista
      } else {
        Notification.error(response.message || 'Error al agregar el miembro');
      }
    } catch (error) {
      Notification.error('Error al agregar el miembro');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  showInviteModal(groupId) {
    const modalContent = `
      <form id="invite-member-form">
        <div class="form-group">
          <label for="invite-user-id">ID de Usuario a Invitar</label>
          <input type="number" id="invite-user-id" name="invitedUserId" class="form-control" required placeholder="Ingresa el ID del usuario">
          <small class="text-muted">Se enviará una invitación al usuario</small>
        </div>
      </form>
    `;

    const modalFooter = `
      <button class="btn btn-secondary" onclick="window.currentModal?.hide()">Cancelar</button>
      <button class="btn btn-primary" id="btn-submit-invite">Enviar Invitación</button>
    `;

    Modal.show('Enviar Invitación', modalContent, modalFooter);

    document.getElementById('btn-submit-invite').addEventListener('click', async () => {
      await this.handleSendInvitation(groupId);
    });
  }

  async handleSendInvitation(groupId) {
    const form = document.getElementById('invite-member-form');
    const formData = new FormData(form);
    const invitedUserId = parseInt(formData.get('invitedUserId'));

    if (!invitedUserId || isNaN(invitedUserId)) {
      Notification.error('ID de usuario inválido');
      return;
    }

    try {
      Loading.show();
      const response = await groupsAPI.sendInvitation(groupId, invitedUserId);
      
      if (response.success) {
        Notification.success('Invitación enviada exitosamente');
        Modal.hide();
      } else {
        Notification.error(response.message || 'Error al enviar la invitación');
      }
    } catch (error) {
      Notification.error('Error al enviar la invitación');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async removeMember(groupId, userId) {
    try {
      Loading.show();
      const response = await groupsAPI.removeMember(groupId, userId);
      
      if (response.success) {
        Notification.success('Miembro eliminado exitosamente');
        await this.render(); // Recargar la vista
      } else {
        Notification.error(response.message || 'Error al eliminar el miembro');
      }
    } catch (error) {
      Notification.error('Error al eliminar el miembro');
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
        router.navigate('#/groups');
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

export default new GroupDetailView();

