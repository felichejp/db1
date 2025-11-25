import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { usersAPI } from '../api/users.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';

/**
 * Vista de Administración para Admin
 */
class AdminView {
  constructor() {
    this.selectedEstudiantes = [];
    this.selectedProfesores = [];
    this.selectedTutores = [];
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'Admin') {
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="admin-tabs">
        <div class="admin-tabs__header">
          <button class="admin-tab-btn active" data-tab="create">Crear Grupo</button>
          <button class="admin-tab-btn" data-tab="manage">Gestionar Grupos</button>
        </div>
        <div class="admin-tabs__content">
          <div class="admin-tab-panel active" id="tab-create">
            <div class="card">
              <div class="card__header">
                <h1 class="card__title">Crear Nuevo Grupo</h1>
              </div>
              <div class="card__body">
                <form id="create-group-form" class="form">
            <div class="form__group">
              <label class="form__label" for="group-nombre">Nombre del Grupo *</label>
              <input 
                type="text" 
                id="group-nombre" 
                name="nombre" 
                class="form__input" 
                required
                placeholder="Ej: Matemáticas Avanzadas"
              />
            </div>

            <div class="form__group">
              <label class="form__label" for="group-descripcion">Descripción</label>
              <textarea 
                id="group-descripcion" 
                name="descripcion" 
                class="form__input" 
                rows="3"
                placeholder="Descripción del grupo..."
              ></textarea>
            </div>

            <div class="form__group">
              <label class="form__label">Asignar Profesor</label>
              <select id="group-profesor" name="profesorId" class="form__input">
                <option value="">Seleccionar profesor...</option>
              </select>
            </div>

            <div class="form__group">
              <label class="form__label">Asignar Estudiantes (máximo 5)</label>
              <div id="estudiantes-container" class="multi-select-container">
                <div class="spinner"></div>
              </div>
              <div id="selected-estudiantes" class="selected-items">
                <p class="text-muted">Ningún estudiante seleccionado</p>
              </div>
            </div>

            <div class="form__group">
              <label class="form__label">Asignar Tutores/Asesores</label>
              <div id="tutores-container" class="multi-select-container">
                <div class="spinner"></div>
              </div>
              <div id="selected-tutores" class="selected-items">
                <p class="text-muted">Ningún tutor seleccionado</p>
              </div>
              <small class="text-muted">Nota: Los tutores se asignan a través de sesiones después de crear el grupo</small>
            </div>

            <div class="form__actions">
              <button type="submit" class="btn btn-primary">
                Crear Grupo
              </button>
              <button type="button" class="btn btn-secondary" onclick="window.location.hash='#/dashboard'">
                Cancelar
              </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="admin-tab-panel" id="tab-manage">
          <div class="card">
            <div class="card__header">
              <h1 class="card__title">Gestionar Grupos Existentes</h1>
            </div>
            <div class="card__body">
              <div id="manage-groups-content">
                <div class="spinner"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;

    try {
      Loading.show();
      await this.loadFormData();
      await this.loadManageGroups();
      this.attachEventListeners();
      this.attachTabListeners();
    } catch (error) {
      Notification.error('Error al cargar datos del formulario');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  attachTabListeners() {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        // Actualizar botones
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Actualizar paneles
        document.querySelectorAll('.admin-tab-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');
      });
    });
  }

  async loadManageGroups() {
    const content = document.getElementById('manage-groups-content');
    
    try {
      const response = await groupsAPI.getAll();
      if (!response.success) {
        throw new Error(response.message || 'Error al obtener grupos');
      }

      const groups = response.data || [];
      
      if (groups.length === 0) {
        content.innerHTML = '<p class="text-muted">No hay grupos disponibles</p>';
        return;
      }

      content.innerHTML = `
        <div class="manage-groups-list">
          ${groups.map(group => `
            <div class="manage-group-item" data-group-id="${group.id}">
              <div class="manage-group-header">
                <div class="manage-group-info">
                  <h3>${group.nombre}</h3>
                  <p class="text-muted">${group.descripcion || 'Sin descripción'}</p>
                  <span class="badge badge--${group.estado === 'activo' ? 'success' : 'warning'}">
                    ${group.estado}
                  </span>
                </div>
                <button class="btn btn-primary btn-sm add-members-btn" data-group-id="${group.id}">
                  Agregar Miembros
                </button>
              </div>
              <div class="manage-group-members-panel" id="members-panel-${group.id}" style="display: none;">
                <div class="manage-group-members-content">
                  <div class="spinner"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Attach event listeners
      document.querySelectorAll('.add-members-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const groupId = parseInt(e.target.getAttribute('data-group-id'), 10);
          await this.showAddMembersPanel(groupId);
        });
      });
    } catch (error) {
      console.error('Error al cargar grupos:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
    }
  }

  async showAddMembersPanel(groupId) {
    const panel = document.getElementById(`members-panel-${groupId}`);
    const content = panel.querySelector('.manage-group-members-content');
    
    // Toggle panel
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      
      try {
        Loading.show();
        
        // Cargar miembros actuales
        const membersResponse = await groupsAPI.getMembers(groupId);
        const currentMembers = membersResponse.success ? membersResponse.data : [];
        const currentMemberIds = currentMembers.map(m => m.id);

        // Cargar usuarios disponibles
        const [profesoresRes, estudiantesRes, tutoresRes] = await Promise.allSettled([
          usersAPI.getByRole('Profesor'),
          usersAPI.getByRole('Estudiante'),
          usersAPI.getByRole('Tutor')
        ]);

        const profesores = profesoresRes.status === 'fulfilled' && profesoresRes.value.success 
          ? profesoresRes.value.data.filter(p => !currentMemberIds.includes(p.id))
          : [];
        const estudiantes = estudiantesRes.status === 'fulfilled' && estudiantesRes.value.success 
          ? estudiantesRes.value.data.filter(e => !currentMemberIds.includes(e.id))
          : [];
        const tutores = tutoresRes.status === 'fulfilled' && tutoresRes.value.success 
          ? tutoresRes.value.data.filter(t => !currentMemberIds.includes(t.id))
          : [];

        content.innerHTML = `
          <div class="add-members-form">
            <h4>Miembros Actuales</h4>
            <div class="current-members-list">
              ${currentMembers.length > 0 ? currentMembers.map(m => `
                <div class="current-member-item">
                  <span>${m.nombre} (${m.role})</span>
                  ${m.role !== 'Profesor' ? `
                    <button class="btn btn-danger btn-sm remove-member-btn" 
                            data-group-id="${groupId}" 
                            data-user-id="${m.id}">
                      Eliminar
                    </button>
                  ` : ''}
                </div>
              `).join('') : '<p class="text-muted">No hay miembros</p>'}
            </div>

            <h4 class="mt-3">Agregar Nuevos Miembros</h4>
            
            <div class="form__group">
              <label class="form__label">Profesores</label>
              <div class="multi-select-container">
                ${profesores.length > 0 ? `
                  <div class="checkbox-list">
                    ${profesores.map(p => `
                      <label class="checkbox-item">
                        <input type="checkbox" value="${p.id}" data-nombre="${p.nombre}" class="add-profesor-checkbox" />
                        <span>${p.nombre} (${p.email})</span>
                      </label>
                    `).join('')}
                  </div>
                ` : '<p class="text-muted">No hay profesores disponibles</p>'}
              </div>
            </div>

            <div class="form__group">
              <label class="form__label">Estudiantes (máximo 5 en total)</label>
              <div class="multi-select-container">
                ${estudiantes.length > 0 ? `
                  <div class="checkbox-list">
                    ${estudiantes.map(e => `
                      <label class="checkbox-item">
                        <input type="checkbox" value="${e.id}" data-nombre="${e.nombre}" class="add-estudiante-checkbox" />
                        <span>${e.nombre} (${e.email})</span>
                      </label>
                    `).join('')}
                  </div>
                ` : '<p class="text-muted">No hay estudiantes disponibles</p>'}
              </div>
            </div>

            <div class="form__group">
              <label class="form__label">Tutores</label>
              <div class="multi-select-container">
                ${tutores.length > 0 ? `
                  <div class="checkbox-list">
                    ${tutores.map(t => `
                      <label class="checkbox-item">
                        <input type="checkbox" value="${t.id}" data-nombre="${t.nombre}" class="add-tutor-checkbox" />
                        <span>${t.nombre} (${t.email})</span>
                      </label>
                    `).join('')}
                  </div>
                ` : '<p class="text-muted">No hay tutores disponibles</p>'}
              </div>
            </div>

            <div class="form__actions">
              <button class="btn btn-primary" onclick="window.adminViewInstance.addMembersToGroup(${groupId})">
                Agregar Seleccionados
              </button>
              <button class="btn btn-secondary" onclick="document.getElementById('members-panel-${groupId}').style.display='none'">
                Cerrar
              </button>
            </div>
          </div>
        `;

        // Attach remove member listeners
        content.querySelectorAll('.remove-member-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const userId = parseInt(e.target.getAttribute('data-user-id'), 10);
            await this.removeMemberFromGroup(groupId, userId);
          });
        });
      } catch (error) {
        console.error('Error al cargar panel:', error);
        content.innerHTML = '<p class="text-muted">Error al cargar información</p>';
      } finally {
        Loading.hide();
      }
    } else {
      panel.style.display = 'none';
    }
  }

  async addMembersToGroup(groupId) {
    const profesores = Array.from(document.querySelectorAll(`#members-panel-${groupId} .add-profesor-checkbox:checked`))
      .map(cb => parseInt(cb.value, 10));
    const estudiantes = Array.from(document.querySelectorAll(`#members-panel-${groupId} .add-estudiante-checkbox:checked`))
      .map(cb => parseInt(cb.value, 10));
    const tutores = Array.from(document.querySelectorAll(`#members-panel-${groupId} .add-tutor-checkbox:checked`))
      .map(cb => parseInt(cb.value, 10));

    const allUserIds = [...profesores, ...estudiantes, ...tutores];

    if (allUserIds.length === 0) {
      Notification.error('Debe seleccionar al menos un usuario');
      return;
    }

    try {
      Loading.show();

      // Verificar límite de estudiantes
      const membersResponse = await groupsAPI.getMembers(groupId);
      const currentMembers = membersResponse.success ? membersResponse.data : [];
      const currentEstudiantes = currentMembers.filter(m => m.role === 'Estudiante').length;
      const newEstudiantes = estudiantes.length;

      if (currentEstudiantes + newEstudiantes > 5) {
        Notification.error(`Un grupo no puede tener más de 5 estudiantes. Actual: ${currentEstudiantes}, intentando agregar: ${newEstudiantes}`);
        Loading.hide();
        return;
      }

      // Agregar miembros usando bulk endpoint
      try {
        const bulkResponse = await axios.post(
          `${window.API_BASE_URL || 'http://localhost:3000'}/api/groups/${groupId}/members/bulk`,
          { userIds: allUserIds }
        );

        if (!bulkResponse.data.success) {
          throw new Error(bulkResponse.data.message || 'Error al agregar miembros');
        }

        Notification.success(`${allUserIds.length} miembro(s) agregado(s) exitosamente`);
        
        // Recargar panel
        await this.showAddMembersPanel(groupId);
      } catch (bulkError) {
        // Si falla bulk, agregar uno por uno
        console.warn('Bulk add failed, adding one by one:', bulkError);
        for (const userId of allUserIds) {
          await groupsAPI.addMember(groupId, userId);
        }
        Notification.success(`${allUserIds.length} miembro(s) agregado(s) exitosamente`);
        await this.showAddMembersPanel(groupId);
      }
    } catch (error) {
      console.error('Error al agregar miembros:', error);
      Notification.error(error.response?.data?.message || error.message || 'Error al agregar miembros');
    } finally {
      Loading.hide();
    }
  }

  async removeMemberFromGroup(groupId, userId) {
    if (!confirm('¿Está seguro de que desea eliminar este miembro del grupo?')) {
      return;
    }

    try {
      Loading.show();
      await groupsAPI.removeMember(groupId, userId);
      Notification.success('Miembro eliminado exitosamente');
      await this.showAddMembersPanel(groupId);
    } catch (error) {
      console.error('Error al eliminar miembro:', error);
      Notification.error(error.response?.data?.message || 'Error al eliminar miembro');
    } finally {
      Loading.hide();
    }
  }

  async loadFormData() {
    try {
      const [profesoresRes, estudiantesRes, tutoresRes] = await Promise.allSettled([
        usersAPI.getByRole('Profesor'),
        usersAPI.getByRole('Estudiante'),
        usersAPI.getByRole('Tutor')
      ]);

      const profesores = profesoresRes.status === 'fulfilled' && profesoresRes.value.success 
        ? profesoresRes.value.data 
        : [];
      const estudiantes = estudiantesRes.status === 'fulfilled' && estudiantesRes.value.success 
        ? estudiantesRes.value.data 
        : [];
      const tutores = tutoresRes.status === 'fulfilled' && tutoresRes.value.success 
        ? tutoresRes.value.data 
        : [];

      // Llenar select de profesores
      const profesorSelect = document.getElementById('group-profesor');
      profesorSelect.innerHTML = '<option value="">Seleccionar profesor...</option>';
      profesores.forEach(profesor => {
        const option = document.createElement('option');
        option.value = profesor.id;
        option.textContent = `${profesor.nombre} (${profesor.email})`;
        profesorSelect.appendChild(option);
      });

      // Renderizar lista de estudiantes
      this.renderEstudiantesList(estudiantes);

      // Renderizar lista de tutores
      this.renderTutoresList(tutores);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      throw error;
    }
  }

  renderEstudiantesList(estudiantes) {
    const container = document.getElementById('estudiantes-container');
    
    if (estudiantes.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay estudiantes disponibles</p>';
      return;
    }

    container.innerHTML = `
      <div class="checkbox-list">
        ${estudiantes.map(estudiante => `
          <label class="checkbox-item">
            <input 
              type="checkbox" 
              value="${estudiante.id}" 
              data-nombre="${estudiante.nombre}"
              class="estudiante-checkbox"
            />
            <span>${estudiante.nombre} (${estudiante.email})</span>
          </label>
        `).join('')}
      </div>
    `;

    // Attach event listeners
    const checkboxes = container.querySelectorAll('.estudiante-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateSelectedEstudiantes();
      });
    });
  }

  renderTutoresList(tutores) {
    const container = document.getElementById('tutores-container');
    
    if (tutores.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay tutores disponibles</p>';
      return;
    }

    container.innerHTML = `
      <div class="checkbox-list">
        ${tutores.map(tutor => `
          <label class="checkbox-item">
            <input 
              type="checkbox" 
              value="${tutor.id}" 
              data-nombre="${tutor.nombre}"
              class="tutor-checkbox"
            />
            <span>${tutor.nombre} (${tutor.email})</span>
          </label>
        `).join('')}
      </div>
    `;

    // Attach event listeners
    const checkboxes = container.querySelectorAll('.tutor-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateSelectedTutores();
      });
    });
  }

  updateSelectedEstudiantes() {
    const checkboxes = document.querySelectorAll('.estudiante-checkbox:checked');
    this.selectedEstudiantes = Array.from(checkboxes).map(cb => ({
      id: parseInt(cb.value, 10),
      nombre: cb.getAttribute('data-nombre')
    }));

    const container = document.getElementById('selected-estudiantes');
    
    if (this.selectedEstudiantes.length === 0) {
      container.innerHTML = '<p class="text-muted">Ningún estudiante seleccionado</p>';
    } else {
      container.innerHTML = `
        <div class="selected-items-list">
          ${this.selectedEstudiantes.map(e => `
            <span class="selected-item">
              ${e.nombre}
              <button type="button" class="selected-item-remove" data-id="${e.id}">×</button>
            </span>
          `).join('')}
        </div>
        <small class="text-muted">Seleccionados: ${this.selectedEstudiantes.length}/5</small>
      `;

      // Attach remove buttons
      container.querySelectorAll('.selected-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = parseInt(e.target.getAttribute('data-id'), 10);
          const checkbox = document.querySelector(`.estudiante-checkbox[value="${id}"]`);
          if (checkbox) {
            checkbox.checked = false;
            this.updateSelectedEstudiantes();
          }
        });
      });
    }
  }

  updateSelectedTutores() {
    const checkboxes = document.querySelectorAll('.tutor-checkbox:checked');
    this.selectedTutores = Array.from(checkboxes).map(cb => ({
      id: parseInt(cb.value, 10),
      nombre: cb.getAttribute('data-nombre')
    }));

    const container = document.getElementById('selected-tutores');
    
    if (this.selectedTutores.length === 0) {
      container.innerHTML = '<p class="text-muted">Ningún tutor seleccionado</p>';
    } else {
      container.innerHTML = `
        <div class="selected-items-list">
          ${this.selectedTutores.map(t => `
            <span class="selected-item">
              ${t.nombre}
              <button type="button" class="selected-item-remove" data-id="${t.id}">×</button>
            </span>
          `).join('')}
        </div>
      `;

      // Attach remove buttons
      container.querySelectorAll('.selected-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = parseInt(e.target.getAttribute('data-id'), 10);
          const checkbox = document.querySelector(`.tutor-checkbox[value="${id}"]`);
          if (checkbox) {
            checkbox.checked = false;
            this.updateSelectedTutores();
          }
        });
      });
    }
  }

  attachEventListeners() {
    const form = document.getElementById('create-group-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  async handleSubmit() {
    const form = document.getElementById('create-group-form');
    const formData = new FormData(form);
    
    const grupoData = {
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion') || null,
      profesorId: formData.get('profesorId') || null
    };

    // Validaciones
    if (!grupoData.nombre) {
      Notification.error('El nombre del grupo es requerido');
      return;
    }

    if (this.selectedEstudiantes.length === 0) {
      Notification.error('Debe seleccionar al menos un estudiante');
      return;
    }

    if (this.selectedEstudiantes.length > 5) {
      Notification.error('Un grupo no puede tener más de 5 estudiantes');
      return;
    }

    try {
      Loading.show();
      
      // Crear el grupo
      const createResponse = await groupsAPI.create(grupoData);
      
      if (!createResponse.success) {
        throw new Error(createResponse.message || 'Error al crear grupo');
      }

      const grupoId = createResponse.data.id;

      // Agregar estudiantes al grupo
      const estudianteIds = this.selectedEstudiantes.map(e => e.id);
      
      try {
        // Intentar usar el endpoint bulk si existe, sino agregar uno por uno
        const bulkResponse = await axios.post(
          `${window.API_BASE_URL || 'http://localhost:3000'}/api/groups/${grupoId}/members/bulk`,
          { userIds: estudianteIds }
        );

        if (!bulkResponse.data.success) {
          throw new Error('Error al agregar miembros');
        }
      } catch (bulkError) {
        // Si falla el bulk, agregar uno por uno
        console.warn('Bulk add failed, adding one by one:', bulkError);
        for (const estudianteId of estudianteIds) {
          await groupsAPI.addMember(grupoId, estudianteId);
        }
      }

      Notification.success('Grupo creado exitosamente');
      
      // Redirigir después de un momento
      setTimeout(() => {
        window.location.hash = '#/groups';
      }, 1500);
      
    } catch (error) {
      console.error('Error al crear grupo:', error);
      Notification.error(error.response?.data?.message || error.message || 'Error al crear grupo');
    } finally {
      Loading.hide();
    }
  }
}

const adminViewInstance = new AdminView();
window.adminViewInstance = adminViewInstance;
export default adminViewInstance;

