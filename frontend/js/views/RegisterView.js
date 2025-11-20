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
              <select id="reg-role" class="form-select" required>
                <option value="Estudiante">Estudiante</option>
              </select>
            </div>
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
      
      const roleValue = document.getElementById('reg-role').value;
      const gradoValue = document.getElementById('reg-grado').value;

      // Validar que el rol sea Estudiante
      if (roleValue !== 'Estudiante') {
        Notification.error('Solo puedes registrarte como estudiante');
        return;
      }

      // Validar que el grado no exceda 10
      if (gradoValue && (parseInt(gradoValue) < 1 || parseInt(gradoValue) > 10)) {
        Notification.error('El grado no puede exceder a 10');
        return;
      }
      
      const data = {
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        nombre: document.getElementById('reg-nombre').value,
        role: roleValue,
        grado: gradoValue || null
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
        // Manejar errores específicos del backend
        const errorMessage = error.response?.data?.message || error.message || 'Error al registrarse';
        
        // Mostrar mensajes específicos según el error
        if (errorMessage.includes('Solo se puede registrar como Estudiante') || 
            errorMessage.includes('Solo puedes registrarte como estudiante')) {
          Notification.error('Solo puedes registrarte como estudiante');
        } else if (errorMessage.includes('grado') && errorMessage.includes('10')) {
          Notification.error('El grado no puede exceder a 10');
        } else {
          Notification.error(errorMessage);
        }
      } finally {
        Loading.hide();
      }
    });

    // Validación en tiempo real para el campo de grado
    const gradoInput = document.getElementById('reg-grado');
    gradoInput.addEventListener('blur', () => {
      const gradoValue = gradoInput.value;
      if (gradoValue && (parseInt(gradoValue) < 1 || parseInt(gradoValue) > 10)) {
        Notification.error('El grado no puede exceder a 10');
        gradoInput.focus();
      }
    });

    gradoInput.addEventListener('input', () => {
      const gradoValue = gradoInput.value;
      if (gradoValue && parseInt(gradoValue) > 10) {
        Notification.error('El grado no puede exceder a 10');
        gradoInput.value = 10;
      }
    });

    // Validación en tiempo real para el campo de rol (por si alguien manipula el DOM)
    const roleSelect = document.getElementById('reg-role');
    roleSelect.addEventListener('change', () => {
      if (roleSelect.value !== 'Estudiante') {
        Notification.error('Solo puedes registrarte como estudiante');
        roleSelect.value = 'Estudiante';
      }
    });
  }
}

export default new RegisterView();


