import { authAPI } from '../api/auth.js';
import authService from '../services/authService.js';
import Notification from '../components/Notification.js';
import Loading from '../components/Loading.js';
import { validateForm } from '../utils/validators.js';

/**
 * Vista de Registro de Alumno - Diseño moderno con todos los campos requeridos
 */
class RegisterView {
  render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="register-container">
        <div class="register-card">
          <div class="register-header">
            <h1 class="register-title">Registro de Nuevo Usuario</h1>
            <p class="register-subtitle">Completa tus datos para crear tu cuenta</p>
          </div>
          <form id="register-form" class="register-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="reg-nombre">
                  <span class="form-label-icon">👤</span>
                  Nombre <span class="required">*</span>
                </label>
                <input 
                  type="text" 
                  id="reg-nombre" 
                  class="form-input" 
                  placeholder="Ingresa tu nombre"
                  required
                  autocomplete="given-name"
                >
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-apellido">
                  <span class="form-label-icon">👤</span>
                  Apellido <span class="required">*</span>
                </label>
                <input 
                  type="text" 
                  id="reg-apellido" 
                  class="form-input" 
                  placeholder="Ingresa tu apellido"
                  required
                  autocomplete="family-name"
                >
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">
                <span class="form-label-icon">📧</span>
                Correo Institucional <span class="required">*</span>
              </label>
              <input 
                type="email" 
                id="reg-email" 
                class="form-input" 
                placeholder="usuario@institucion.edu"
                required
                autocomplete="email"
              >
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">
                <span class="form-label-icon">🔒</span>
                Contraseña <span class="required">*</span>
              </label>
              <input 
                type="password" 
                id="reg-password" 
                class="form-input" 
                placeholder="Mínimo 8 caracteres"
                required
                autocomplete="new-password"
                minlength="8"
              >
              <small class="form-help">Mínimo 8 caracteres</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-telefono">
                <span class="form-label-icon">📱</span>
                Teléfono <span class="required">*</span>
              </label>
              <input 
                type="tel" 
                id="reg-telefono" 
                class="form-input" 
                placeholder="1234567890"
                required
                autocomplete="tel"
              >
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-carrera">
                <span class="form-label-icon">🎓</span>
                Carrera <span class="required">*</span>
              </label>
              <select id="reg-carrera" class="form-select" required>
                <option value="">Selecciona una carrera</option>
                <option value="Ingeniería en Computación">Ingeniería en Computación</option>
                <option value="Ingeniería en Electrónica">Ingeniería en Electrónica</option>
                <option value="Ingeniería en Eléctrica">Ingeniería en Eléctrica</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-grado">
                <span class="form-label-icon">📚</span>
                Grado (opcional)
              </label>
              <input 
                type="number" 
                id="reg-grado" 
                class="form-input" 
                placeholder="1-10"
                min="1" 
                max="10"
              >
              <small class="form-help">Grado académico (1-10)</small>
            </div>
            <div class="register-actions">
              <button type="button" class="btn btn-secondary" id="cancel-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">Aceptar</button>
            </div>
          </form>
          <div class="register-footer">
            <p class="register-footer-text">
              ¿Ya tienes cuenta? <a href="#/login" class="register-link">Inicia sesión aquí</a>
            </p>
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById('register-form');
    const cancelBtn = document.getElementById('cancel-btn');
    
    // Botón cancelar
    cancelBtn?.addEventListener('click', () => {
      window.location.hash = '#/login';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nombre = document.getElementById('reg-nombre').value.trim();
      const apellido = document.getElementById('reg-apellido').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const telefono = document.getElementById('reg-telefono').value.trim();
      const carrera = document.getElementById('reg-carrera').value;
      const gradoValue = document.getElementById('reg-grado').value;
      const grado = gradoValue ? parseInt(gradoValue, 10) : null;

      // Validaciones
      if (!nombre || !apellido || !email || !password || !telefono || !carrera) {
        Notification.error('Por favor completa todos los campos requeridos');
        return;
      }

      // Validar grado si se proporciona
      if (grado !== null && (isNaN(grado) || grado < 1 || grado > 10)) {
        Notification.error('El grado debe ser un número entre 1 y 10');
        return;
      }

      // Validar teléfono (básico)
      if (telefono.length < 10) {
        Notification.error('El teléfono debe tener al menos 10 dígitos');
        return;
      }

      // Combinar nombre y apellido para el campo nombre del backend
      const nombreCompleto = `${nombre} ${apellido}`;

      const data = {
        email: email,
        password: password,
        nombre: nombreCompleto,
        role: 'Estudiante', // Siempre Estudiante
        grado: grado,
        // Nota: telefono y carrera no están en el backend actual, 
        // pero los guardamos para futuras implementaciones
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
          Notification.success('Registro exitoso. Bienvenido al sistema');
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


