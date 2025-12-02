import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { authAPI } from '../api/auth.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';

/**
 * Vista de Creación de Grupos para Administrador
 */
class AdminGroupCreationView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'Admin') {
      Notification.error('No tienes permisos para acceder a esta vista');
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Crear Grupo</h1>
        </div>
        <div class="card__body">
          <form id="create-group-form">
            <div class="form-group">
              <label class="form-label" for="group-name">Nombre del Grupo/Materia *</label>
              <input type="text" id="group-name" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="group-description">Descripción</label>
              <textarea id="group-description" class="form-input" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="group-profesor">Profesor *</label>
              <select id="group-profesor" class="form-select" required>
                <option value="">Selecciona un profesor</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="group-asesor">Asesor *</label>
              <select id="group-asesor" class="form-select" required>
                <option value="">Selecciona un asesor</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Crear Grupo</button>
          </form>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadUsers();
      this.setupForm();
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      Notification.error('Error al cargar usuarios');
    } finally {
      Loading.hide();
    }
  }

  async loadUsers() {
    try {
      // Obtener profesores y asesores
      const response = await axios.get(
        `${window.API_BASE_URL || 'http://localhost:3000'}/api/users`,
        {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        }
      );

      if (response.data.success) {
        const users = response.data.data || [];
        const profesores = users.filter(u => u.role === 'Profesor');
        const asesores = users.filter(u => u.role === 'Tutor');

        const profesorSelect = document.getElementById('group-profesor');
        const asesorSelect = document.getElementById('group-asesor');

        // Llenar select de profesores
        profesores.forEach(profesor => {
          const option = document.createElement('option');
          option.value = profesor.id;
          option.textContent = profesor.nombre || profesor.email;
          profesorSelect.appendChild(option);
        });

        // Llenar select de asesores
        asesores.forEach(asesor => {
          const option = document.createElement('option');
          option.value = asesor.id;
          option.textContent = asesor.nombre || asesor.email;
          asesorSelect.appendChild(option);
        });
      } else {
        Notification.error('Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error en loadUsers:', error);
      // Si el endpoint no existe, mostrar mensaje
      if (error.response?.status === 404) {
        Notification.warning('El endpoint de usuarios no está disponible. Por favor, implementa GET /api/users');
      } else {
        Notification.error('Error al cargar usuarios');
      }
    }
  }

  setupForm() {
    const form = document.getElementById('create-group-form');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nombre = document.getElementById('group-name').value.trim();
      const descripcion = document.getElementById('group-description').value.trim();
      const profesorId = parseInt(document.getElementById('group-profesor').value);
      const asesorId = parseInt(document.getElementById('group-asesor').value);

      if (!nombre) {
        Notification.error('El nombre del grupo es obligatorio');
        return;
      }

      if (!profesorId) {
        Notification.error('Debes seleccionar un profesor');
        return;
      }

      if (!asesorId) {
        Notification.error('Debes seleccionar un asesor');
        return;
      }

      try {
        Loading.show();
        
        const groupData = {
          nombre: nombre,
          descripcion: descripcion || null,
          profesorId: profesorId
        };

        const response = await groupsAPI.create(groupData);

        if (response.success) {
          const groupId = response.data.id;
          
          // Agregar el asesor como miembro del grupo
          try {
            await groupsAPI.addMember(groupId, asesorId);
            Notification.success('Grupo creado exitosamente');
            // Limpiar formulario
            form.reset();
            // Opcional: redirigir a la vista del grupo
            // window.location.hash = `#/groups/${groupId}`;
          } catch (memberError) {
            Notification.warning('Grupo creado pero hubo un error al asignar el asesor');
            console.error('Error agregando asesor:', memberError);
          }
        } else {
          Notification.error(response.message || 'Error al crear grupo');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Error al crear grupo';
        Notification.error(errorMessage);
      } finally {
        Loading.hide();
      }
    });
  }
}

export default new AdminGroupCreationView();

