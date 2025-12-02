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
      <div class="card" style="max-width: 400px; margin: 2rem auto;">
        <div class="card__header">
          <h2 class="card__title">Iniciar Sesión</h2>
        </div>
        <div class="card__body">
          <form id="login-form">
            <div id="login-error" class="alert alert-error" style="display: none; margin-bottom: 1rem;"></div>
            <div class="form-group">
              <label class="form-label" for="email">Usuario (Nombre o Correo)</label>
              <input type="text" id="email" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input type="password" id="password" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="role">Rol</label>
              <select id="role" class="form-select" required>
                <option value="">Selecciona un rol</option>
                <option value="Estudiante">Alumno</option>
                <option value="Tutor">Asesor</option>
                <option value="Profesor">Profesor</option>
                <option value="Admin">Administrador</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Iniciar Sesión</button>
          </form>
          <p class="text-center mt-2">
            ¿No tienes cuenta? <a href="#/register">Regístrate</a>
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userInput = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;

      // Validar campos obligatorios
      if (!userInput) {
        this.showError('Campo Usuario es obligatorio');
        return;
      }

      if (!password) {
        this.showError('Campo Contraseña es obligatorio');
        return;
      }

      if (!role) {
        this.showError('Campo Rol es obligatorio');
        return;
      }

      // Determinar si el input es email o nombre
      const isEmail = userInput.includes('@');
      const loginData = isEmail 
        ? { email: userInput, password }
        : { nombre: userInput, password };

      try {
        Loading.show();
        this.hideError();
        
        const response = await authAPI.login(loginData);
        
        if (response.success) {
          // Verificar que el usuario tenga el rol seleccionado
          const user = response.data.user;
          if (user.role !== role) {
            this.showError('No estás registrado como ' + this.getRoleName(role));
            Loading.hide();
            return;
          }

          authService.setAuth(response.data.token, user);
          Notification.success('Sesión iniciada correctamente');
          window.location.hash = '#/dashboard';
        } else {
          this.showError(response.message || 'Usuario y/o contraseña no coinciden');
        }
      } catch (error) {
        console.error('Error en login:', error);
        let errorMessage = 'Error al iniciar sesión';
        
        if (error.response) {
          // Error de respuesta del servidor
          const status = error.response.status;
          const data = error.response.data;
          
          if (status === 401) {
            errorMessage = 'Usuario y/o contraseña no coinciden';
          } else if (status === 400) {
            errorMessage = data?.message || 'Datos inválidos';
          } else if (status === 500) {
            errorMessage = 'Error del servidor. Por favor intenta más tarde';
          } else {
            errorMessage = data?.message || `Error ${status}`;
          }
        } else if (error.request) {
          // Error de red
          errorMessage = 'Error de conexión. Verifica tu conexión a internet';
        } else {
          // Otro error
          errorMessage = error.message || 'Error desconocido';
        }
        
        this.showError(errorMessage);
      } finally {
        Loading.hide();
      }
    });
  }

  showError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    } else {
      Notification.error(message);
    }
  }

  hideError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  getRoleName(role) {
    const roleNames = {
      'Estudiante': 'Alumno',
      'Tutor': 'Asesor',
      'Profesor': 'Profesor',
      'Admin': 'Administrador'
    };
    return roleNames[role] || role;
  }
}

export default new LoginView();


