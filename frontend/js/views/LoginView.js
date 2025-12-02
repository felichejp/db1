import { authAPI } from '../api/auth.js';
import authService from '../services/authService.js';
import Notification from '../components/Notification.js';
import Loading from '../components/Loading.js';
import { validateForm } from '../utils/validators.js';

/**
 * Vista de Login - Diseño moderno y centrado
 */
class LoginView {
  render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-title">Sistema de Asesorías</h1>
            <p class="login-subtitle">Inicia sesión con tu cuenta</p>
          </div>
          <form id="login-form" class="login-form">
            <div class="form-group">
              <label class="form-label" for="email">
                <span class="form-label-icon">📧</span>
                Usuario / Correo Institucional
              </label>
              <input 
                type="email" 
                id="email" 
                class="form-input" 
                placeholder="usuario@institucion.edu"
                required
                autocomplete="email"
              >
            </div>
            <div class="form-group">
              <label class="form-label" for="password">
                <span class="form-label-icon">🔒</span>
                Contraseña
              </label>
              <input 
                type="password" 
                id="password" 
                class="form-input" 
                placeholder="Ingresa tu contraseña"
                required
                autocomplete="current-password"
              >
            </div>
            <button type="submit" class="btn btn-primary btn-block">
              <span>Iniciar Sesión</span>
            </button>
          </form>
          <div class="login-footer">
            <p class="login-footer-text">
              ¿Nuevo usuario? <a href="#/register" class="login-link">Regístrate aquí</a>
            </p>
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


