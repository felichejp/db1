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
    document.body.classList.add('auth-page');
    const container = document.getElementById('view-container');
    container.className = 'auth-container';
    container.innerHTML = `
      <div class="auth-card">
        <div class="auth-welcome">
          <h1 class="auth-welcome__title">¡Bienvenido!</h1>
          <p class="auth-welcome__subtitle">Inicia sesión para continuar</p>
        </div>
        <div class="auth-form">
          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="email">Email</label>
              <input type="email" id="email" class="form-input" placeholder="tu@email.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input type="password" id="password" class="form-input" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary auth-submit">Iniciar Sesión</button>
          </form>
          <p class="auth-footer">
            ¿No tienes cuenta? <a href="#/register" class="auth-link">Regístrate aquí</a>
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


