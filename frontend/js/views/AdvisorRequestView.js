import authService from '../services/authService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';

/**
 * Vista de Solicitud para Convertirse en Asesor
 */
class AdvisorRequestView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    // Solo estudiantes pueden solicitar ser asesores
    if (user.role !== 'Estudiante') {
      Notification.error('Solo los estudiantes pueden solicitar convertirse en asesores');
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Solicitud para Convertirse en Asesor</h1>
        </div>
        <div class="card__body">
          <div id="advisor-request-content">
            <p style="margin-bottom: 2rem; font-size: 1.1rem; line-height: 1.6;">
              ¿Te sientes con las habilidades necesarias para asesorar a otros de tus compañeros con dificultades en sus materias? 
              Pues entonces, prueba convertirte en asesor.
            </p>

            <form id="advisor-request-form">
              <div class="checklist-section" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">Criterios de Evaluación</h3>
                <div class="checklist-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: 500;">Disponibilidad de horario</label>
                    <select class="form-select" id="criterion-availability" required style="width: auto;">
                      <option value="">Selecciona</option>
                      <option value="cumplo">Lo Cumplo</option>
                      <option value="no-cumplo">No lo Cumplo</option>
                    </select>
                  </div>
                </div>
                <div class="checklist-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: 500;">Interés en ayudar a mis compañeros</label>
                    <select class="form-select" id="criterion-interest" required style="width: auto;">
                      <option value="">Selecciona</option>
                      <option value="cumplo">Lo Cumplo</option>
                      <option value="no-cumplo">No lo Cumplo</option>
                    </select>
                  </div>
                </div>
                <div class="checklist-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: 500;">Capacidad de resolver inquietudes a mis compañeros</label>
                    <select class="form-select" id="criterion-capacity" required style="width: auto;">
                      <option value="">Selecciona</option>
                      <option value="cumplo">Lo Cumplo</option>
                      <option value="no-cumplo">No lo Cumplo</option>
                    </select>
                  </div>
                </div>
                <div class="checklist-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: 500;">Conocimiento sólido en las materias que deseo asesorar</label>
                    <select class="form-select" id="criterion-knowledge" required style="width: auto;">
                      <option value="">Selecciona</option>
                      <option value="cumplo">Lo Cumplo</option>
                      <option value="no-cumplo">No lo Cumplo</option>
                    </select>
                  </div>
                </div>
                <div class="checklist-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: 500;">Compromiso y responsabilidad</label>
                    <select class="form-select" id="criterion-commitment" required style="width: auto;">
                      <option value="">Selecciona</option>
                      <option value="cumplo">Lo Cumplo</option>
                      <option value="no-cumplo">No lo Cumplo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="request-message">Motivación</label>
                <textarea 
                  id="request-message" 
                  class="form-input" 
                  rows="5" 
                  placeholder="Escribe un pequeño párrafo especificando por qué deseas convertirte en asesor..."
                  required
                ></textarea>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                Solicitar Convertirme en Asesor
              </button>
            </form>

            <div id="request-status" style="display: none; margin-top: 2rem; padding: 1rem; background: var(--info-color); border-radius: var(--radius-md);">
              <p style="margin: 0; color: var(--text-primary);">
                Tu solicitud ha sido enviada al administrador y la está analizando para ser aprobada.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupForm();
    this.checkExistingRequest();
  }

  async checkExistingRequest() {
    try {
      const user = authService.getCurrentUser();
      // Nota: Necesitarás implementar un endpoint para verificar si ya existe una solicitud pendiente
      // Por ahora, verificamos en localStorage
      const existingRequest = localStorage.getItem(`advisor_request_${user.id}`);
      if (existingRequest) {
        const requestData = JSON.parse(existingRequest);
        if (requestData.status === 'pendiente') {
          this.showRequestStatus();
        }
      }
    } catch (error) {
      console.error('Error verificando solicitud existente:', error);
    }
  }

  setupForm() {
    const form = document.getElementById('advisor-request-form');
    const statusDiv = document.getElementById('request-status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = authService.getCurrentUser();
      
      // Verificar si ya existe una solicitud pendiente
      const existingRequest = localStorage.getItem(`advisor_request_${user.id}`);
      if (existingRequest) {
        const requestData = JSON.parse(existingRequest);
        if (requestData.status === 'pendiente') {
          Notification.error('Ya tienes una solicitud pendiente. Espera a que el administrador la revise.');
          return;
        }
      }

      const criteria = {
        availability: document.getElementById('criterion-availability').value,
        interest: document.getElementById('criterion-interest').value,
        capacity: document.getElementById('criterion-capacity').value,
        knowledge: document.getElementById('criterion-knowledge').value,
        commitment: document.getElementById('criterion-commitment').value
      };

      const message = document.getElementById('request-message').value.trim();

      // Validar que todos los criterios estén completos
      for (const [key, value] of Object.entries(criteria)) {
        if (!value) {
          Notification.error('Por favor completa todos los criterios');
          return;
        }
      }

      if (!message) {
        Notification.error('Por favor escribe tu motivación');
        return;
      }

      try {
        Loading.show();
        
        // Nota: Necesitarás implementar el endpoint POST /api/admin/advisor-requests en el backend
        const requestData = {
          userId: user.id,
          criteria: criteria,
          message: message,
          status: 'pendiente',
          createdAt: new Date().toISOString()
        };

        // Guardar en localStorage temporalmente hasta que se implemente el backend
        localStorage.setItem(`advisor_request_${user.id}`, JSON.stringify(requestData));

        // Intentar enviar al backend si existe el endpoint
        try {
          const response = await axios.post(
            `${window.API_BASE_URL || 'http://localhost:3000'}/api/admin/advisor-requests`,
            requestData,
            {
              headers: {
                'Authorization': `Bearer ${authService.getToken()}`
              }
            }
          );

          if (response.data.success) {
            this.showRequestStatus();
            form.style.display = 'none';
            Notification.success('Solicitud enviada correctamente');
          } else {
            throw new Error(response.data.message || 'Error al enviar solicitud');
          }
        } catch (apiError) {
          // Si el endpoint no existe, solo mostrar el mensaje de éxito local
          if (apiError.response?.status === 404) {
            this.showRequestStatus();
            form.style.display = 'none';
            Notification.success('Solicitud guardada localmente. El administrador la revisará pronto.');
          } else {
            throw apiError;
          }
        }
      } catch (error) {
        console.error('Error enviando solicitud:', error);
        Notification.error('Error al enviar solicitud. Por favor intenta de nuevo.');
      } finally {
        Loading.hide();
      }
    });
  }

  showRequestStatus() {
    const statusDiv = document.getElementById('request-status');
    const form = document.getElementById('advisor-request-form');
    if (statusDiv) {
      statusDiv.style.display = 'block';
    }
    if (form) {
      form.style.display = 'none';
    }
  }
}

export default new AdvisorRequestView();

