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
    document.body.classList.add('auth-page');
    const container = document.getElementById('view-container');
    container.className = 'auth-container';
    container.innerHTML = `
      <div class="auth-card">
        <div class="auth-welcome">
          <h1 class="auth-welcome__title">¡Bienvenido!</h1>
          <p class="auth-welcome__subtitle">Crea tu cuenta para comenzar</p>
        </div>
        <div class="auth-form">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-email">Email</label>
              <input type="email" id="reg-email" class="form-input" placeholder="tu@email.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <input type="password" id="reg-password" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-nombre">Nombre</label>
              <input type="text" id="reg-nombre" class="form-input" placeholder="Tu nombre completo" required>
            </div>
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
            <div class="form-group">
              <label class="form-label" for="reg-grado">Grado (opcional)</label>
              <input type="number" id="reg-grado" class="form-input" placeholder="Ej: 5" min="1">
            </div>
            <button type="submit" class="btn btn-primary auth-submit">Registrarse</button>
          </form>
          <p class="auth-footer">
            ¿Ya tienes cuenta? <a href="#/login" class="auth-link">Inicia sesión aquí</a>
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


