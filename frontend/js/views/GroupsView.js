import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, getStatusName, getStatusColor } from '../utils/helpers.js';
import { validateForm } from '../utils/validators.js';

/**
 * Vista de Grupos
 */
class GroupsView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

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
              <button class="btn btn-primary" id="create-group-btn">
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
      this.setupEventListeners();
    } catch (error) {
      console.error('Error cargando grupos:', error);
      Notification.error('Error al cargar los grupos');
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
        content.innerHTML = `
          <div class="text-center" style="padding: 2rem;">
            <p class="text-muted">No tienes grupos asignados</p>
            ${(authService.getCurrentUser()?.role === 'Profesor' || authService.getCurrentUser()?.role === 'Admin') ? `
              <button class="btn btn-primary mt-2" id="create-first-group-btn">
                Crear tu primer grupo
              </button>
            ` : ''}
          </div>
        `;
        this.setupEventListeners();
        return;
      }

      content.innerHTML = this.renderGroupsList(groups);
      this.setupEventListeners();
    } catch (error) {
      console.error('Error en loadGroups:', error);
      if (error.response?.status === 401) {
        Notification.error('Sesión expirada. Por favor, inicia sesión nuevamente');
        authService.logout();
        window.location.hash = '#/login';
      } else {
        content.innerHTML = `
          <div class="text-center" style="padding: 2rem;">
            <p class="text-muted">Error al cargar los grupos</p>
            <button class="btn btn-secondary mt-2" onclick="location.reload()">Reintentar</button>
          </div>
        `;
      }
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
              <th>Miembros</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(group => `
              <tr>
                <td><strong>${group.nombre || 'Sin nombre'}</strong></td>
                <td>${group.descripcion || '-'}</td>
                <td>
                  <span class="badge badge--${getStatusColor(group.estado || 'activo')}">
                    ${getStatusName(group.estado || 'activo')}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/groups/${group.id}'">
                    Ver miembros
                  </button>
                </td>
                <td>${formatDate(group.createdAt)}</td>
                <td>
                  <a href="#/groups/${group.id}" class="btn btn-primary btn-sm">Ver Detalles</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  setupEventListeners() {
    const createBtn = document.getElementById('create-group-btn');
    const createFirstBtn = document.getElementById('create-first-group-btn');
    
    // Usar una función nombrada para poder remover el listener si es necesario
    const handleCreateClick = () => {
      // Verificar si ya hay un modal abierto
      if (document.querySelector('.modal-overlay')) {
        return;
      }
      this.showCreateModal();
    };
    
    if (createBtn) {
      // Remover listener anterior si existe
      createBtn.replaceWith(createBtn.cloneNode(true));
      const newCreateBtn = document.getElementById('create-group-btn');
      newCreateBtn?.addEventListener('click', handleCreateClick);
    }
    
    if (createFirstBtn) {
      // Remover listener anterior si existe
      createFirstBtn.replaceWith(createFirstBtn.cloneNode(true));
      const newCreateFirstBtn = document.getElementById('create-first-group-btn');
      newCreateFirstBtn?.addEventListener('click', handleCreateClick);
    }
  }

  showCreateModal() {
    // Verificar si ya existe un modal abierto
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
      console.log('Ya existe un modal abierto, no se abrirá otro');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h2>Crear Nuevo Grupo</h2>
          <button class="modal__close" id="close-modal-btn">&times;</button>
        </div>
        <div class="modal__body">
          <form id="create-group-form">
            <div class="form-group">
              <label class="form-label" for="group-name">Nombre del Grupo *</label>
              <input type="text" id="group-name" class="form-input" required 
                     placeholder="Ej: Grupo de Matemáticas Avanzadas">
            </div>
            <div class="form-group">
              <label class="form-label" for="group-description">Descripción</label>
              <textarea id="group-description" class="form-input" rows="4" 
                        placeholder="Describe el propósito del grupo..."></textarea>
            </div>
            <div class="form-group" style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" id="cancel-create-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">Crear Grupo</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      // Verificar que el modal todavía existe en el DOM antes de eliminarlo
      if (modal && modal.parentNode === document.body) {
        document.body.removeChild(modal);
      }
    };

    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('cancel-create-btn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.getElementById('create-group-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateGroup(closeModal);
    });
  }

  async handleCreateGroup(closeModal) {
    const nombre = document.getElementById('group-name').value.trim();
    const descripcion = document.getElementById('group-description').value.trim();

    const validation = validateForm({ nombre }, {
      nombre: { required: true, minLength: 3 }
    });

    if (!validation.isValid) {
      Notification.error(Object.values(validation.errors)[0]);
      return;
    }

    try {
      Loading.show();
      const response = await groupsAPI.create({ nombre, descripcion });
      
      if (response.success) {
        Notification.success('Grupo creado exitosamente');
        closeModal();
        await this.loadGroups();
      } else {
        Notification.error(response.message || 'Error al crear el grupo');
      }
    } catch (error) {
      console.error('Error creando grupo:', error);
      Notification.error(error.response?.data?.message || 'Error al crear el grupo');
    } finally {
      Loading.hide();
    }
  }

  /**
   * Renderiza la vista de detalles de un grupo
   */
  async renderGroupDetails(groupId) {
    const user = authService.getCurrentUser();
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/groups'">
                ← Volver
              </button>
              <h1 class="card__title mt-2" id="group-title">Cargando...</h1>
            </div>
            <div id="group-actions"></div>
          </div>
        </div>
        <div class="card__body">
          <div id="group-details-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadGroupDetails(groupId);
    } catch (error) {
      console.error('Error cargando detalles del grupo:', error);
      Notification.error('Error al cargar los detalles del grupo');
    } finally {
      Loading.hide();
    }
  }

  async loadGroupDetails(groupId) {
    const content = document.getElementById('group-details-content');
    const titleEl = document.getElementById('group-title');
    const actionsEl = document.getElementById('group-actions');
    const user = authService.getCurrentUser();

    try {
      const [groupRes, membersRes, invitationsRes] = await Promise.all([
        groupsAPI.getById(groupId),
        groupsAPI.getMembers(groupId),
        groupsAPI.getInvitations(groupId)
      ]);

      if (!groupRes.success) {
        content.innerHTML = '<p class="text-muted">Grupo no encontrado</p>';
        return;
      }

      const group = groupRes.data;
      const members = membersRes.success ? membersRes.data : [];
      const invitations = invitationsRes.success ? invitationsRes.data : [];

      titleEl.textContent = group.nombre || 'Grupo sin nombre';

      // Botones de acción según el rol
      if (user.role === 'Profesor' || user.role === 'Admin') {
        actionsEl.innerHTML = `
          <button class="btn btn-primary btn-sm" id="invite-member-btn">
            + Invitar Miembro
          </button>
          <button class="btn btn-secondary btn-sm" id="edit-group-btn">
            Editar Grupo
          </button>
        `;
      }

      content.innerHTML = this.renderGroupDetailsContent(group, members, invitations);
      this.setupGroupDetailsListeners(groupId, group, user);
    } catch (error) {
      console.error('Error en loadGroupDetails:', error);
      if (error.response?.status === 401) {
        Notification.error('Sesión expirada. Por favor, inicia sesión nuevamente');
        authService.logout();
        window.location.hash = '#/login';
      } else {
        content.innerHTML = '<p class="text-muted">Error al cargar los detalles del grupo</p>';
      }
    }
  }

  renderGroupDetailsContent(group, members, invitations) {
    const canManage = authService.getCurrentUser()?.role === 'Profesor' || 
                      authService.getCurrentUser()?.role === 'Admin';

    return `
      <div>
        <div class="mb-3">
          <h3>Información del Grupo</h3>
          <p><strong>Descripción:</strong> ${group.descripcion || 'Sin descripción'}</p>
          <p><strong>Estado:</strong> 
            <span class="badge badge--${getStatusColor(group.estado || 'activo')}">
              ${getStatusName(group.estado || 'activo')}
            </span>
          </p>
          <p><strong>Creado:</strong> ${formatDate(group.createdAt)}</p>
        </div>

        <div class="mb-3">
          <h3>Miembros (${members.length}/5)</h3>
          ${members.length === 0 ? 
            '<p class="text-muted">No hay miembros en este grupo</p>' :
            `
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Se unió</th>
                    ${canManage ? '<th>Acciones</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${members.map(member => `
                    <tr>
                      <td>${member.nombre}</td>
                      <td>${member.email}</td>
                      <td>${member.role}</td>
                      <td>${formatDate(member.joinedAt)}</td>
                      ${canManage ? `
                        <td>
                          <button class="btn btn-danger btn-sm" 
                                  onclick="GroupsView.removeMember(${group.id}, ${member.id})">
                            Eliminar
                          </button>
                        </td>
                      ` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            `
          }
        </div>

        ${canManage && invitations.length > 0 ? `
          <div class="mb-3">
            <h3>Invitaciones Pendientes</h3>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Enviada</th>
                  </tr>
                </thead>
                <tbody>
                  ${invitations.map(inv => `
                    <tr>
                      <td>${inv.invitedUserName || '-'}</td>
                      <td>${inv.email || '-'}</td>
                      <td>
                        <span class="badge badge--${getStatusColor(inv.estado || 'pendiente')}">
                          ${getStatusName(inv.estado || 'pendiente')}
                        </span>
                      </td>
                      <td>${formatDate(inv.createdAt)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  setupGroupDetailsListeners(groupId, group, user) {
    const inviteBtn = document.getElementById('invite-member-btn');
    const editBtn = document.getElementById('edit-group-btn');

    if (inviteBtn) {
      inviteBtn.addEventListener('click', () => this.showInviteModal(groupId));
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => this.showEditModal(groupId, group));
    }
  }

  async showInviteModal(groupId) {
    // Verificar si ya existe un modal abierto
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
      console.log('Ya existe un modal abierto, no se abrirá otro');
      return;
    }

    try {
      // Obtener lista de estudiantes disponibles
      const token = authService.getToken();
      const studentsRes = await axios.get(`${window.API_BASE_URL}/api/users/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const students = studentsRes.data.data || [];

      // Obtener miembros actuales del grupo
      const membersRes = await groupsAPI.getMembers(groupId);
      const members = membersRes.success ? membersRes.data : [];
      const memberIds = members.map(m => m.id);

      // Filtrar estudiantes que ya son miembros
      const availableStudents = students.filter(s => !memberIds.includes(s.id));

      if (availableStudents.length === 0) {
        Notification.warning('No hay estudiantes disponibles para invitar');
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal__header">
            <h2>Invitar Estudiante al Grupo</h2>
            <button class="modal__close" id="close-invite-modal-btn">&times;</button>
          </div>
          <div class="modal__body">
            <form id="invite-student-form">
              <div class="form-group">
                <label class="form-label" for="student-select">Seleccionar Estudiante *</label>
                <select id="student-select" class="form-input" required>
                  <option value="">-- Selecciona un estudiante --</option>
                  ${availableStudents.map(student => `
                    <option value="${student.id}">${student.nombre} (${student.email})</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group" style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" id="cancel-invite-btn">Cancelar</button>
                <button type="submit" class="btn btn-primary">Enviar Invitación</button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const closeModal = () => {
        // Verificar que el modal todavía existe en el DOM antes de eliminarlo
        if (modal && modal.parentNode === document.body) {
          document.body.removeChild(modal);
        }
      };

      document.getElementById('close-invite-modal-btn')?.addEventListener('click', closeModal);
      document.getElementById('cancel-invite-btn')?.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      document.getElementById('invite-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSendInvitation(groupId, closeModal);
      });
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
      Notification.error('Error al cargar la lista de estudiantes');
    }
  }

  async handleSendInvitation(groupId, closeModal) {
    const studentId = parseInt(document.getElementById('student-select').value);
    
    if (!studentId) {
      Notification.error('Por favor, selecciona un estudiante');
      return;
    }

    try {
      Loading.show();
      const response = await groupsAPI.sendInvitation(groupId, studentId);
      
      if (response.success) {
        Notification.success('Invitación enviada exitosamente');
        closeModal();
        await this.loadGroupDetails(groupId);
      } else {
        Notification.error(response.message || 'Error al enviar la invitación');
      }
    } catch (error) {
      console.error('Error enviando invitación:', error);
      Notification.error(error.response?.data?.message || 'Error al enviar la invitación');
    } finally {
      Loading.hide();
    }
  }

  showEditModal(groupId, group) {
    // Verificar si ya existe un modal abierto
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
      console.log('Ya existe un modal abierto, no se abrirá otro');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h2>Editar Grupo</h2>
          <button class="modal__close" id="close-edit-modal-btn">&times;</button>
        </div>
        <div class="modal__body">
          <form id="edit-group-form">
            <div class="form-group">
              <label class="form-label" for="edit-group-name">Nombre del Grupo *</label>
              <input type="text" id="edit-group-name" class="form-input" required 
                     value="${group.nombre || ''}">
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-group-description">Descripción</label>
              <textarea id="edit-group-description" class="form-input" rows="4">${group.descripcion || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-group-status">Estado</label>
              <select id="edit-group-status" class="form-input">
                <option value="activo" ${group.estado === 'activo' ? 'selected' : ''}>Activo</option>
                <option value="inactivo" ${group.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                <option value="finalizado" ${group.estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
              </select>
            </div>
            <div class="form-group" style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" id="cancel-edit-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      // Verificar que el modal todavía existe en el DOM antes de eliminarlo
      if (modal && modal.parentNode === document.body) {
        document.body.removeChild(modal);
      }
    };

    document.getElementById('close-edit-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('cancel-edit-btn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.getElementById('edit-group-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleUpdateGroup(groupId, closeModal);
    });
  }

  async handleUpdateGroup(groupId, closeModal) {
    const nombre = document.getElementById('edit-group-name').value.trim();
    const descripcion = document.getElementById('edit-group-description').value.trim();
    const estado = document.getElementById('edit-group-status').value;

    const validation = validateForm({ nombre }, {
      nombre: { required: true, minLength: 3 }
    });

    if (!validation.isValid) {
      Notification.error(Object.values(validation.errors)[0]);
      return;
    }

    try {
      Loading.show();
      const response = await groupsAPI.update(groupId, { nombre, descripcion, estado });
      
      if (response.success) {
        Notification.success('Grupo actualizado exitosamente');
        closeModal();
        await this.loadGroupDetails(groupId);
      } else {
        Notification.error(response.message || 'Error al actualizar el grupo');
      }
    } catch (error) {
      console.error('Error actualizando grupo:', error);
      Notification.error(error.response?.data?.message || 'Error al actualizar el grupo');
    } finally {
      Loading.hide();
    }
  }

  static async removeMember(groupId, userId) {
    if (!confirm('¿Estás seguro de que deseas eliminar a este miembro del grupo?')) {
      return;
    }

    try {
      Loading.show();
      const response = await groupsAPI.removeMember(groupId, userId);
      
      if (response.success) {
        Notification.success('Miembro eliminado exitosamente');
        // Recargar detalles
        window.location.reload();
      } else {
        Notification.error(response.message || 'Error al eliminar miembro');
      }
    } catch (error) {
      console.error('Error eliminando miembro:', error);
      Notification.error(error.response?.data?.message || 'Error al eliminar miembro');
    } finally {
      Loading.hide();
    }
  }
}

export default new GroupsView();

