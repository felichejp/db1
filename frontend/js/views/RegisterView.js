import { authAPI } from '../api/auth.js';
import authService from '../services/authService.js';
import Notification from '../components/Notification.js';
import Loading from '../components/Loading.js';
import { validateForm } from '../utils/validators.js';

/**
 * Vista de Registro
 */
class RegisterView {
  render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card" style="max-width: 500px; margin: 2rem auto;">
        <div class="card__header">
          <h2 class="card__title">Registro de Usuario</h2>
          <p class="text-muted">Crea tu cuenta para acceder al sistema de asesorías</p>
        </div>
        <div class="card__body">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-nombre">
                <i class="fas fa-user"></i> Nombre Completo
              </label>
              <input type="text" id="reg-nombre" class="form-input" placeholder="Juan Pérez García" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">
                <i class="fas fa-envelope"></i> Email
              </label>
              <input type="email" id="reg-email" class="form-input" placeholder="tu@email.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">
                <i class="fas fa-lock"></i> Contraseña
              </label>
              <input type="password" id="reg-password" class="form-input" placeholder="Mínimo 8 caracteres" required>
              <small class="form-text text-muted">Debe contener letras, números y caracteres especiales</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-role">
                <i class="fas fa-user-tag"></i> Rol
              </label>
              <select id="reg-role" class="form-select" required>
                <option value="">Selecciona un rol</option>
                <option value="Estudiante">Estudiante</option>
                <option value="Tutor">Tutor</option>
                <option value="Profesor">Profesor</option>
                <option value="Admin">Administrador</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-grado">
                <i class="fas fa-graduation-cap"></i> Grado (opcional)
              </label>
              <input type="number" id="reg-grado" class="form-input" min="1" max="12" placeholder="Ej: 1, 2, 3...">
              <small class="form-text text-muted">Solo para estudiantes</small>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
              <i class="fas fa-user-plus"></i> Registrarse
            </button>
          </form>
          <p class="text-center mt-3">
            ¿Ya tienes cuenta? <a href="#/login" style="color: var(--primary-color);">Inicia sesión aquí</a>
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById('register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const data = {
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        nombre: document.getElementById('reg-nombre').value,
        role: document.getElementById('reg-role').value,
        grado: document.getElementById('reg-grado').value || null
      };

      const validation = validateForm(data, {
        email: { required: true, email: true },
        password: { required: true, password: true },
        nombre: { required: true },
        role: { required: true }
      });

      if (!validation.isValid) {
        Notification.error(Object.values(validation.errors)[0]);
        return;
      }

      try {
        Loading.show();
        const response = await authAPI.register(data);
        
        if (response.success) {
          authService.setAuth(response.data.token, response.data.user);
          Notification.success('Registro exitoso');
          window.location.hash = '#/dashboard';
        } else {
          Notification.error(response.message || 'Error al registrarse');
        }
      } catch (error) {
        Notification.error(error.response?.data?.message || 'Error al registrarse');
      } finally {
        Loading.hide();
      }
    });
  }
}

export default new RegisterView();


