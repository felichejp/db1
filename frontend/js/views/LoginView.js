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
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
        <div class="card" style="width: 100%; max-width: 420px;">
          <div class="card__header text-center" style="border-bottom: none; padding-bottom: 0;">
            <h2 class="card__title" style="font-size: 2rem; margin-bottom: 0.5rem;">Bienvenido</h2>
            <p class="text-muted">Inicia sesión para continuar</p>
          </div>
          
          <div class="card__body">
            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="email">Correo Electrónico</label>
                <input type="email" id="email" class="form-input" placeholder="ejemplo@correo.com" required>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="password">Contraseña</label>
                <input type="password" id="password" class="form-input" placeholder="••••••••" required>
              </div>
              
              <button type="submit" class="btn btn-primary w-full" style="margin-top: 1rem;">
                Iniciar Sesión
              </button>
            </form>
            
            <div class="text-center mt-3">
              <p class="text-muted" style="font-size: 0.9rem;">
                ¿No tienes cuenta? <a href="#/register" style="font-weight: 600;">Regístrate aquí</a>
              </p>
            </div>
          </div>
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



