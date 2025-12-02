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
        </div>
        <div class="card__body">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-nombre">Nombre</label>
              <input type="text" id="reg-nombre" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-apellido">Apellido</label>
              <input type="text" id="reg-apellido" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Correo de la Institución</label>
              <input type="email" id="reg-email" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <input type="password" id="reg-password" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-role">Tipo de Usuario</label>
              <select id="reg-role" class="form-select" required>
                <option value="">Selecciona un tipo</option>
                <option value="Estudiante">Alumno</option>
                <option value="Tutor">Asesor</option>
                <option value="Profesor">Profesor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-grado">Grado (opcional)</label>
              <input type="number" id="reg-grado" class="form-input" min="1" max="10" placeholder="Ej: 1-10">
            </div>
            <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
              <button type="submit" class="btn btn-primary" style="flex: 1;">Registrar</button>
              <button type="button" id="cancel-btn" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
            </div>
          </form>
          <p class="text-center mt-2">
            ¿Ya tienes cuenta? <a href="#/login">Inicia sesión aquí</a>
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById('register-form');
    const cancelBtn = document.getElementById('cancel-btn');
    
    cancelBtn.addEventListener('click', () => {
      window.location.hash = '#/login';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const role = document.getElementById('reg-role').value;
      if (!role) {
        Notification.error('Debes seleccionar un tipo de usuario');
        return;
      }

      const gradoV = document.getElementById('reg-grado').value.trim();
      
      let grado = null;
      if (gradoV) {
        const gradoNum = parseInt(gradoV, 10);
        if (isNaN(gradoNum) || gradoNum < 1 || gradoNum > 10) {
          Notification.error('Grado inválido, debe estar entre 1 y 10');
          return;
        }
        grado = gradoNum;
      }

      const nombre = document.getElementById('reg-nombre').value.trim();
      const apellido = document.getElementById('reg-apellido').value.trim();
      
      if (!nombre || !apellido) {
        Notification.error('Nombre y apellido son requeridos');
        return;
      }
      
      const data = {
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
        nombre: `${nombre} ${apellido}`.trim(),
        role: role,
        grado: grado
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


