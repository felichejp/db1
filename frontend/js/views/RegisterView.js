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
            <div class="form-group">
              <label class="form-label" for="reg-role">Rol</label>
              <input type="text" id="reg-role" class="form-input" value="Estudiante" readonly style="background-color: #2a2a2a; cursor: not-allowed;">
              <small class="form-help">Solo puedes registrarte como Estudiante. Los demás roles deben ser asignados por un administrador.</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-grado">Grado (opcional, máximo 10)</label>
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
      
      const gradoValue = document.getElementById('reg-grado').value;
      const grado = gradoValue ? parseInt(gradoValue, 10) : null;

      // Validar grado máximo
      if (grado !== null && (isNaN(grado) || grado < 1 || grado > 10)) {
        Notification.error('El grado debe ser un número entre 1 y 10');
        return;
      }

      const data = {
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        nombre: document.getElementById('reg-nombre').value,
        role: 'Estudiante', // Siempre Estudiante
        grado: grado
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


