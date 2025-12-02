import { authAPI } from '../api/auth.js';
import authService from '../services/authService.js';
import Notification from '../components/Notification.js';
import Loading from '../components/Loading.js';
import { validateForm, validateEmail } from '../utils/validators.js';

/**
 * Vista de Registro
 */
class RegisterView {
  render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card" style="max-width: 500px; margin: 2rem auto;">
        <div class="card__header">
          <h2 class="card__title">Registro</h2>
        </div>
        <div class="card__body">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-nombre">Nombre *</label>
              <input type="text" id="reg-nombre" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-apellidos">Apellidos *</label>
              <input type="text" id="reg-apellidos" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Correo *</label>
              <input type="email" id="reg-email" class="form-input" placeholder="usuario@ejemplo.com" required>
              <small class="form-text text-muted">Solo se permite un usuario por correo</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña *</label>
              <input type="password" id="reg-password" class="form-input" minlength="8" required>
              <small class="form-text text-muted">Mínimo 8 caracteres</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-telefono">Teléfono *</label>
              <input type="tel" id="reg-telefono" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-carrera">Carrera *</label>
              <select id="reg-carrera" class="form-select" required>
                <option value="">Selecciona una carrera</option>
                <option value="Ingenieria en Computacion">Ingeniería en Computación</option>
                <option value="Ingenieria Electrica">Ingeniería Eléctrica</option>
                <option value="Ingenieria Electronica">Ingeniería Electrónica</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Registrarse</button>
          </form>
          <p class="text-center mt-2">
            ¿Ya tienes cuenta? <a href="#/login">Inicia Sesión</a>
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
      const apellidos = document.getElementById('reg-apellidos').value.trim();
      const telefono = document.getElementById('reg-telefono').value.trim();
      const carrera = document.getElementById('reg-carrera').value;

      // Validar email básico
      if (!email || !email.includes('@')) {
        Notification.error('El correo debe ser válido');
        return;
      }

      // Validar contraseña
      if (password.length < 8) {
        Notification.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }

      // Validar campos requeridos
      if (!nombre || !apellidos || !telefono || !carrera) {
        Notification.error('Todos los campos son obligatorios');
        return;
      }

      // Combinar nombre y apellidos para el campo nombre en la BD
      const nombreCompleto = `${nombre} ${apellidos}`.trim();
      
      const data = {
        email: email,
        password: password,
        nombre: nombreCompleto,
        role: 'Estudiante',
        apellidos: apellidos,
        telefono: telefono,
        carrera: carrera
      };

      const validation = validateForm(data, {
        email: { required: true, email: true },
        password: { required: true, password: true },
        nombre: { required: true }
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
        const errorMessage = error.response?.data?.message || error.message || 'Error al registrarse';
        Notification.error(errorMessage);
      } finally {
        Loading.hide();
      }
    });

    // Validación en tiempo real del correo (solo formato básico)
    const emailInput = document.getElementById('reg-email');
    emailInput.addEventListener('blur', () => {
      const email = emailInput.value.trim();
      if (email && !email.includes('@')) {
        Notification.error('El correo debe tener un formato válido');
      }
    });

    // Validación en tiempo real de la contraseña
    const passwordInput = document.getElementById('reg-password');
    passwordInput.addEventListener('input', () => {
      const password = passwordInput.value;
      if (password.length > 0 && password.length < 8) {
        // Mostrar indicador visual pero no error hasta que intente enviar
      }
    });
  }
}

export default new RegisterView();


