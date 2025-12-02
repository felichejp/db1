import authService from '../services/authService.js';
import { authAPI } from '../api/auth.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { validateForm } from '../utils/validators.js';

/**
 * Vista de Perfil del Usuario
 */
class ProfileView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Mi Perfil</h1>
        </div>
        <div class="card__body">
          <form id="profile-form">
            <div class="form-group">
              <label class="form-label" for="profile-nombre">Nombre</label>
              <input type="text" id="profile-nombre" class="form-input" value="${this.escapeHtml(user.nombre || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="profile-email">Correo</label>
              <input type="email" id="profile-email" class="form-input" value="${this.escapeHtml(user.email || '')}" disabled>
              <small class="form-text text-muted">El correo no se puede modificar</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="profile-role">Rol</label>
              <input type="text" id="profile-role" class="form-input" value="${this.escapeHtml(user.role || '')}" disabled>
            </div>
            ${user.grado ? `
              <div class="form-group">
                <label class="form-label" for="profile-grado">Grado</label>
                <input type="number" id="profile-grado" class="form-input" value="${user.grado}" min="1" max="10">
              </div>
            ` : ''}
            <div class="form-group">
              <label class="form-label" for="profile-password">Nueva Contraseña (dejar vacío para no cambiar)</label>
              <input type="password" id="profile-password" class="form-input" minlength="8">
              <small class="form-text text-muted">Mínimo 8 caracteres</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="profile-password-confirm">Confirmar Nueva Contraseña</label>
              <input type="password" id="profile-password-confirm" class="form-input" minlength="8">
            </div>
            <button type="submit" class="btn btn-primary">Actualizar Perfil</button>
          </form>
        </div>
      </div>
    `;

    this.setupForm();
  }

  setupForm() {
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nombre = document.getElementById('profile-nombre').value.trim();
      const password = document.getElementById('profile-password').value;
      const passwordConfirm = document.getElementById('profile-password-confirm').value;
      const grado = document.getElementById('profile-grado')?.value;

      // Validar contraseña si se proporciona
      if (password) {
        if (password.length < 8) {
          Notification.error('La contraseña debe tener al menos 8 caracteres');
          return;
        }
        if (password !== passwordConfirm) {
          Notification.error('Las contraseñas no coinciden');
          return;
        }
      }

      if (!nombre) {
        Notification.error('El nombre es obligatorio');
        return;
      }

      const updateData = {
        nombre: nombre
      };

      if (password) {
        updateData.password = password;
      }

      if (grado) {
        updateData.grado = parseInt(grado);
      }

      try {
        Loading.show();
        // Nota: Necesitarás implementar el endpoint PUT /api/users/:id en el backend
        // Por ahora, intentamos actualizar usando authAPI si está disponible
        const user = authService.getCurrentUser();
        const response = await axios.put(`${window.API_BASE_URL || 'http://localhost:3000'}/api/users/${user.id}`, updateData, {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        });

        if (response.data.success) {
          // Actualizar usuario en el servicio de autenticación
          const updatedUser = { ...user, ...updateData };
          authService.setAuth(authService.getToken(), updatedUser);
          Notification.success('Perfil actualizado correctamente');
          // Recargar la vista
          this.render();
        } else {
          Notification.error(response.data.message || 'Error al actualizar perfil');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Error al actualizar perfil';
        Notification.error(errorMessage);
      } finally {
        Loading.hide();
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new ProfileView();

