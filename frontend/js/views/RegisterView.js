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
                <option value="">Selecciona un rol</option>
                <option value="Estudiante">Estudiante</option>
                <option value="Tutor">Tutor</option>
                <option value="Profesor">Profesor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-grado">Grado (opcional)</label>
              <input type="number" id="reg-grado" class="form-input" min="1">
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
      
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const nombre = document.getElementById('reg-nombre').value.trim();
      const role = document.getElementById('reg-role').value;
      const gradoValue = document.getElementById('reg-grado').value.trim();

      const data = {
        email,
        password,
        nombre,
        role,
        grado: gradoValue ? parseInt(gradoValue, 10) : undefined
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

      // Remover grado si está vacío o undefined
      if (!data.grado || isNaN(data.grado)) {
        delete data.grado;
      }

      try {
        Loading.show();
        const response = await authAPI.register(data);
        
        if (response.success) {
          authService.setAuth(response.data.token, response.data.user);
          Notification.success('Registro exitoso');
          window.location.hash = '#/dashboard';
        } else {
          // Manejar errores de validación del backend
          let errorMessage = response.message || 'Error al registrarse';
          if (response.details && Array.isArray(response.details)) {
            // Si hay detalles de validación, mostrar el primer error
            errorMessage = response.details[0]?.msg || response.details[0]?.message || errorMessage;
          }
          Notification.error(errorMessage);
        }
      } catch (error) {
        // Manejar errores de red y validación
        let errorMessage = 'Error al registrarse';
        
        if (error.response) {
          const errorData = error.response.data;
          if (errorData) {
            if (errorData.details && Array.isArray(errorData.details)) {
              // Errores de validación de express-validator
              errorMessage = errorData.details[0]?.msg || errorData.details[0]?.message || errorData.message || errorMessage;
            } else {
              errorMessage = errorData.message || errorMessage;
            }
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        Notification.error(errorMessage);
        console.error('Error en registro:', error);
      } finally {
        Loading.hide();
      }
    });
  }
}

export default new RegisterView();

