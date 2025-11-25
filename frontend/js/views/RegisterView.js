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
      <div class="card" style="max-width: 400px; margin: 2rem auto;">
        <div class="card__header">
          <h2 class="card__title">Registro</h2>
        </div>
        <div class="card__body">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-email">Email</label>
              <input type="email" id="reg-email" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <input type="password" id="reg-password" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-nombre">Nombre</label>
              <input type="text" id="reg-nombre" class="form-input" required>
            </div>
            <!-- Campo de rol eliminado - Solo se permiten estudiantes en el registro
            <div class="form-group">
              <label class="form-label" for="reg-role">Rol</label>
              <select id="reg-role" class="form-select" required>
                <option value="">Selecciona un rol</option>
                <option value="Estudiante">Estudiante</option>
                <option value="Tutor">Tutor</option>
                <option value="Profesor">Profesor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            -->
            <div class="form-group">
              <label class="form-label" for="reg-grado">Grado (opcional)</label>
              <input type="number" id="reg-grado" class="form-input" min="1" max="10">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Registrarse</button>
          </form>
          <p class="text-center mt-2">
            ¿Ya tienes cuenta? <a href="#/login">Inicia sesión aquí</a>
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
        role: 'Estudiante', // Solo se permiten estudiantes en el registro
        grado: document.getElementById('reg-grado').value || null
      };

      const validation = validateForm(data, {
        email: { required: true, email: true },
        password: { required: true, password: true },
        nombre: { required: true }
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


