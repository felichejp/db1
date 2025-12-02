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
          <h2 class="card__title">Registro de Nuevo Usuario</h2>
        </div>
        <div class="card__body">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-nombre">Nombre</label>
              <input type="text" id="reg-nombre" class="form-input" required placeholder="Ingresa tu nombre">
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-apellido">Apellido</label>
              <input type="text" id="reg-apellido" class="form-input" required placeholder="Ingresa tu apellido">
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Correo Institucional</label>
              <input type="email" id="reg-email" class="form-input" required placeholder="usuario@institucion.edu">
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <input type="password" id="reg-password" class="form-input" required placeholder="Mínimo 8 caracteres">
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-telefono">Teléfono</label>
              <input type="tel" id="reg-telefono" class="form-input" required placeholder="Ingresa tu número de teléfono">
            </div>
            <!-- Campo de rol eliminado - Solo se permiten estudiantes en el registro
            <div class="form-group">
              <label class="form-label" for="reg-carrera">Carrera</label>
              <select id="reg-carrera" class="form-select" required>
                <option value="">Selecciona una carrera</option>
                <option value="Ingeniería Eléctrica">Ingeniería Eléctrica</option>
                <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
                <option value="Ingeniería en Computación">Ingeniería en Computación</option>
              </select>
            </div>
            -->
            <div class="form-group">
              <label class="form-label" for="reg-grado">Grado (opcional)</label>
              <input type="number" id="reg-grado" class="form-input" min="1" max="10">
            </div>
            <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
              <button type="submit" class="btn btn-primary" style="flex: 1;">Aceptar</button>
              <button type="button" id="cancel-btn" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('register-form');
    const cancelBtn = document.getElementById('cancel-btn');

    // Manejar cancelar
    cancelBtn.addEventListener('click', () => {
      window.location.hash = '#/login';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const data = {
        nombre: document.getElementById('reg-nombre').value.trim() + ' ' + document.getElementById('reg-apellido').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
        telefono: document.getElementById('reg-telefono').value.trim(),
        carrera: document.getElementById('reg-carrera')?.value || null,
        role: 'Estudiante', // Solo se permiten estudiantes en el registro
        grado: document.getElementById('reg-grado')?.value || null
      };

      const validation = validateForm(data, {
        nombre: { required: true },
        email: { required: true, email: true },
        password: { required: true, password: true },
        telefono: { required: true },
        carrera: { required: false }
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


