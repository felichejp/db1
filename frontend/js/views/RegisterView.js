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
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 0;">
        <div class="card" style="width: 100%; max-width: 600px;">
          <div class="card__header text-center" style="border-bottom: none; padding-bottom: 0;">
            <h2 class="card__title" style="font-size: 2rem; margin-bottom: 0.5rem;">Crear Cuenta</h2>
            <p class="text-muted">Únete a nuestra comunidad de aprendizaje</p>
          </div>
          
          <div class="card__body">
            <form id="register-form">
              <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0;">
                <div class="form-group">
                  <label class="form-label" for="reg-nombre">Nombre Completo</label>
                  <input type="text" id="reg-nombre" class="form-input" placeholder="Juan Pérez" required>
                </div>

                <div class="form-group">
                  <label class="form-label" for="reg-telefono">Teléfono</label>
                  <input type="tel" id="reg-telefono" class="form-input" placeholder="555-123-4567">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-email">Correo Institucional</label>
                <input type="email" id="reg-email" class="form-input" placeholder="usuario@institucion.edu" required>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="reg-password">Contraseña</label>
                <input type="password" id="reg-password" class="form-input" placeholder="••••••••" required>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="reg-carrera">Carrera</label>
                <input type="text" id="reg-carrera" class="form-input" placeholder="Ingeniería en Sistemas">
              </div>

              <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                  <label class="form-label" for="reg-role">Rol</label>
                  <select id="reg-role" class="form-select" required>
                    <option value="">Seleccionar...</option>
                    <option value="Estudiante">Estudiante</option>
                    <option value="Tutor">Tutor</option>
                    <option value="Profesor">Profesor</option>
                  </select>
                </div>
                
                <div>
                  <label class="form-label" for="reg-grado">Grado/Semestre</label>
                  <input type="number" id="reg-grado" class="form-input" min="1" placeholder="Ej: 5">
                </div>
              </div>
              
              <button type="submit" class="btn btn-primary w-full" style="margin-top: 0.5rem;">
                Registrarse
              </button>
            </form>
            
            <div class="text-center mt-3">
              <p class="text-muted" style="font-size: 0.9rem;">
                ¿Ya tienes cuenta? <a href="#/login" style="font-weight: 600;">Inicia sesión aquí</a>
              </p>
            </div>
          </div>
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
        grado: document.getElementById('reg-grado').value || null,
        telefono: document.getElementById('reg-telefono').value || null,
        carrera: document.getElementById('reg-carrera').value || null
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



