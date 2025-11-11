import { authAPI } from '../api/auth.js';
import authService from '../services/authService.js';
import Notification from '../components/Notification.js';
import Loading from '../components/Loading.js';
import { validateForm } from '../utils/validators.js';

/**
 * Vista de Login
 */
class LoginView {
  render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card" style="max-width: 400px; margin: 2rem auto;">
        <div class="card__header">
          <h2 class="card__title">Iniciar Sesión</h2>
        </div>
        <div class="card__body">
          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="email">Email</label>
              <input type="email" id="email" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input type="password" id="password" class="form-input" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Iniciar Sesión</button>
          </form>
          <p class="text-center mt-2">
            ¿No tienes cuenta? <a href="#/register">Regístrate aquí</a>
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const validation = validateForm({ email, password }, {
        email: { required: true, email: true },
        password: { required: true }
      });

      if (!validation.isValid) {
        Notification.error(Object.values(validation.errors)[0]);
        return;
      }

      try {
        Loading.show();
        const response = await authAPI.login({ email, password });
        
        if (response.success) {
          authService.setAuth(response.data.token, response.data.user);
          Notification.success('Sesión iniciada correctamente');
          window.location.hash = '#/dashboard';
        } else {
          Notification.error(response.message || 'Error al iniciar sesión');
        }
      } catch (error) {
        Notification.error(error.response?.data?.message || 'Error al iniciar sesión');
      } finally {
        Loading.hide();
      }
    });
  }
}

export default new LoginView();

