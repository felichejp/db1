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
    if (!container) {
      console.error('view-container no encontrado en LoginView');
      return;
    }
    
    container.innerHTML = `
      <div style="display: flex; gap: var(--spacing-xl); max-width: 1200px; margin: 2rem auto; align-items: flex-start;">
        <!-- Formulario de Login -->
        <div class="card" style="flex: 1; max-width: 400px;">
          <div class="card__header">
            <h2 class="card__title">Iniciar Sesión</h2>
          </div>
          <div class="card__body">
            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="email">Correo Electrónico</label>
                <input type="email" id="email" class="form-input" required placeholder="Ingresa tu correo electrónico">
              </div>
              <div class="form-group">
                <label class="form-label" for="password">Contraseña</label>
                <input type="password" id="password" class="form-input" required placeholder="Ingresa tu contraseña">
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-md);">Iniciar Sesión</button>
            </form>
            <p class="text-center" style="margin-top: var(--spacing-lg);">
              ¿No estás registrado? <a href="#/register" style="color: var(--accent-color);">Nuevo usuario</a>
            </p>
          </div>
        </div>

        <!-- Información de Asesores -->
        <div class="card" style="flex: 1; max-width: 400px;">
          <div class="card__header">
            <h2 class="card__title">Asesores Disponibles</h2>
          </div>
          <div class="card__body">
            <div class="advisors-info">
              <p class="text-muted" style="margin-bottom: var(--spacing-md);">
                Nuestros asesores están disponibles para ayudarte en tus estudios.
              </p>
              <div class="advisors-accordion">
                <!-- Sección 1: Asesoría Personalizada -->
                <div class="accordion-item">
                  <button class="accordion-header" type="button" data-accordion="advisor-1">
                    <div class="accordion-header__content">
                      <div class="advisor-item__icon">🎓</div>
                      <span class="accordion-header__title">Asesoría Personalizada</span>
                    </div>
                    <span class="accordion-arrow">▼</span>
                  </button>
                  <div class="accordion-content" id="advisor-1">
                    <div class="accordion-content__body">
                      <p class="text-muted" style="font-size: 0.9rem;">
                        Sesiones individuales o grupales adaptadas a tus necesidades específicas. 
                        Recibe atención personalizada de nuestros asesores expertos.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Sección 2: Múltiples Materias -->
                <div class="accordion-item">
                  <button class="accordion-header" type="button" data-accordion="advisor-2">
                    <div class="accordion-header__content">
                      <div class="advisor-item__icon">📚</div>
                      <span class="accordion-header__title">Múltiples Materias</span>
                    </div>
                    <span class="accordion-arrow">▼</span>
                  </button>
                  <div class="accordion-content" id="advisor-2">
                    <div class="accordion-content__body">
                      <p class="text-muted" style="font-size: 0.9rem;">
                        Apoyo en diferentes áreas de estudio. Encuentra asesores especializados 
                        en las materias que necesitas reforzar.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Sección 3: Horarios Flexibles -->
                <div class="accordion-item">
                  <button class="accordion-header" type="button" data-accordion="advisor-3">
                    <div class="accordion-header__content">
                      <div class="advisor-item__icon">⏰</div>
                      <span class="accordion-header__title">Horarios Flexibles</span>
                    </div>
                    <span class="accordion-arrow">▼</span>
                  </button>
                  <div class="accordion-content" id="advisor-3">
                    <div class="accordion-content__body">
                      <p class="text-muted" style="font-size: 0.9rem;">
                        Adaptado a tu disponibilidad. Programa tus sesiones de asesoría 
                        en los horarios que mejor se ajusten a tu rutina.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div style="margin-top: var(--spacing-lg); padding-top: var(--spacing-lg); border-top: 1px solid var(--border-color);">
                <p class="text-center text-muted" style="font-size: 0.9rem;">
                  Inicia sesión para acceder a tus grupos y asesorías
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Configurar acordeones
    this.setupAccordions();

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
        
        // El backend puede devolver directamente { token, user } o { success: true, data: { token, user } }
        if (response.success) {
          // Formato: { success: true, data: { token, user } }
          authService.setAuth(response.data.token, response.data.user);
          Notification.success('Sesión iniciada correctamente');
          window.location.hash = '#/dashboard';
        } else if (response.token && response.user) {
          // Formato: { token, user }
          authService.setAuth(response.token, response.user);
          Notification.success('Sesión iniciada correctamente');
          window.location.hash = '#/dashboard';
        } else {
          // Error del backend
          const errorMessage = response.message || response.error || 'Error al iniciar sesión';
          Notification.error(errorMessage);
          console.error('Error en login:', response);
        }
      } catch (error) {
        console.error('Error completo en login:', error);
        
        // Manejar diferentes tipos de errores
        if (error.response) {
          // El servidor respondió con un código de error
          const status = error.response.status;
          const errorData = error.response.data;
          
          if (status === 401) {
            Notification.error('Credenciales incorrectas. Verifica tu correo y contraseña');
          } else if (status === 400) {
            Notification.error(errorData?.message || errorData?.error || 'Datos inválidos');
          } else if (status === 500) {
            Notification.error('Error del servidor. Por favor, intenta más tarde');
          } else {
            Notification.error(errorData?.message || errorData?.error || `Error ${status}: No se pudo iniciar sesión`);
          }
        } else if (error.request) {
          // La petición se hizo pero no hubo respuesta
          Notification.error('No se pudo conectar al servidor. Verifica que el backend esté corriendo');
          console.error('Backend no disponible. URL:', window.API_BASE_URL);
        } else {
          // Error al configurar la petición
          Notification.error('Error al procesar la solicitud');
          console.error('Error de configuración:', error.message);
        }
      } finally {
        Loading.hide();
      }
    });
  }

  setupAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.getAttribute('data-accordion');
        const content = document.getElementById(targetId);
        const arrow = header.querySelector('.accordion-arrow');
        
        if (!content) return;

        // Toggle del contenido
        const isOpen = content.classList.contains('active');
        
        // Cerrar todos los acordeones
        document.querySelectorAll('.accordion-content').forEach(acc => {
          acc.classList.remove('active');
        });
        document.querySelectorAll('.accordion-arrow').forEach(arr => {
          arr.textContent = '▼';
        });

        // Abrir el seleccionado si estaba cerrado
        if (!isOpen) {
          content.classList.add('active');
          arrow.textContent = '▲';
        }
      });
    });
  }
}

export default new LoginView();


