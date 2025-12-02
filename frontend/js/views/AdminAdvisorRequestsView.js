import authService from '../services/authService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate } from '../utils/helpers.js';

/**
 * Vista de Solicitudes de Asesores para Administrador
 */
class AdminAdvisorRequestsView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'Admin') {
      Notification.error('No tienes permisos para acceder a esta vista');
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Solicitudes de Asesores</h1>
        </div>
        <div class="card__body">
          <div id="advisor-requests-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadRequests();
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      Notification.error('Error al cargar solicitudes');
    } finally {
      Loading.hide();
    }
  }

  async loadRequests() {
    const content = document.getElementById('advisor-requests-content');

    try {
      // Nota: Necesitarás implementar el endpoint GET /api/admin/advisor-requests
      // Por ahora, obtenemos las solicitudes del localStorage
      const requests = this.getRequestsFromStorage();

      if (requests.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">📋</div>
            <div class="empty-state__message">No hay solicitudes pendientes</div>
          </div>
        `;
        return;
      }

      // Filtrar solo solicitudes pendientes
      const pendingRequests = requests.filter(r => r.status === 'pendiente');

      if (pendingRequests.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">✅</div>
            <div class="empty-state__message">No hay solicitudes pendientes</div>
          </div>
        `;
        return;
      }

      let html = '<div class="requests-list">';
      
      pendingRequests.forEach((request, index) => {
        html += `
          <div class="request-card" data-request-id="${request.userId}" style="margin-bottom: 1.5rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div class="request-card__header" style="margin-bottom: 1rem;">
              <h3 style="margin: 0;">Solicitud de ${this.escapeHtml(request.userName || 'Usuario ' + request.userId)}</h3>
              <small class="text-muted">${formatDate(request.createdAt)}</small>
            </div>
            
            <div class="request-card__criteria" style="margin-bottom: 1rem;">
              <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem;">Criterios:</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 0.25rem;">
                  Disponibilidad: <span class="badge ${request.criteria.availability === 'cumplo' ? 'badge--success' : 'badge--error'}">
                    ${request.criteria.availability === 'cumplo' ? 'Lo Cumplo' : 'No lo Cumplo'}
                  </span>
                </li>
                <li style="margin-bottom: 0.25rem;">
                  Interés: <span class="badge ${request.criteria.interest === 'cumplo' ? 'badge--success' : 'badge--error'}">
                    ${request.criteria.interest === 'cumplo' ? 'Lo Cumplo' : 'No lo Cumplo'}
                  </span>
                </li>
                <li style="margin-bottom: 0.25rem;">
                  Capacidad: <span class="badge ${request.criteria.capacity === 'cumplo' ? 'badge--success' : 'badge--error'}">
                    ${request.criteria.capacity === 'cumplo' ? 'Lo Cumplo' : 'No lo Cumplo'}
                  </span>
                </li>
                <li style="margin-bottom: 0.25rem;">
                  Conocimiento: <span class="badge ${request.criteria.knowledge === 'cumplo' ? 'badge--success' : 'badge--error'}">
                    ${request.criteria.knowledge === 'cumplo' ? 'Lo Cumplo' : 'No lo Cumplo'}
                  </span>
                </li>
                <li style="margin-bottom: 0.25rem;">
                  Compromiso: <span class="badge ${request.criteria.commitment === 'cumplo' ? 'badge--success' : 'badge--error'}">
                    ${request.criteria.commitment === 'cumplo' ? 'Lo Cumplo' : 'No lo Cumplo'}
                  </span>
                </li>
              </ul>
            </div>

            <div class="request-card__message" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
              <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem;">Motivación:</h4>
              <p style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(request.message)}</p>
            </div>

            <div class="request-card__actions" style="display: flex; gap: 0.5rem;">
              <button class="btn btn-success approve-btn" data-request-id="${request.userId}">
                Aprobar
              </button>
              <button class="btn btn-error reject-btn" data-request-id="${request.userId}">
                Rechazar
              </button>
            </div>
          </div>
        `;
      });

      html += '</div>';
      content.innerHTML = html;

      // Configurar eventos de aprobación/rechazo
      this.setupActions();
    } catch (error) {
      console.error('Error en loadRequests:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar solicitudes</p>';
    }
  }

  getRequestsFromStorage() {
    const requests = [];
    // Obtener todas las solicitudes del localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('advisor_request_')) {
        try {
          const request = JSON.parse(localStorage.getItem(key));
          // Obtener nombre de usuario si es posible
          // Nota: En producción, esto vendría del backend
          request.userName = `Usuario ${request.userId}`;
          requests.push(request);
        } catch (e) {
          console.error('Error parseando solicitud:', e);
        }
      }
    }
    return requests;
  }

  setupActions() {
    const approveButtons = document.querySelectorAll('.approve-btn');
    const rejectButtons = document.querySelectorAll('.reject-btn');

    approveButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const requestId = btn.dataset.requestId;
        await this.handleRequest(requestId, 'aprobada');
      });
    });

    rejectButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const requestId = btn.dataset.requestId;
        await this.handleRequest(requestId, 'rechazada');
      });
    });
  }

  async handleRequest(userId, status) {
    try {
      Loading.show();

      // Nota: Necesitarás implementar el endpoint PUT /api/admin/advisor-requests/:id
      // Por ahora, actualizamos en localStorage
      const requestKey = `advisor_request_${userId}`;
      const request = JSON.parse(localStorage.getItem(requestKey));
      
      if (!request) {
        Notification.error('Solicitud no encontrada');
        return;
      }

      request.status = status;
      request.processedAt = new Date().toISOString();
      localStorage.setItem(requestKey, JSON.stringify(request));

      // Intentar actualizar en el backend si existe el endpoint
      try {
        const response = await axios.put(
          `${window.API_BASE_URL || 'http://localhost:3000'}/api/admin/advisor-requests/${userId}`,
          { status },
          {
            headers: {
              'Authorization': `Bearer ${authService.getToken()}`
            }
          }
        );

        if (response.data.success) {
          Notification.success(`Solicitud ${status === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`);
          // Si se aprobó, actualizar el rol del usuario a Tutor
          if (status === 'aprobada') {
            // Nota: Necesitarás implementar la lógica para actualizar el rol del usuario
            Notification.info('El usuario ahora es un asesor');
          }
        }
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          Notification.success(`Solicitud ${status === 'aprobada' ? 'aprobada' : 'rechazada'} localmente`);
        } else {
          throw apiError;
        }
      }

      // Recargar la vista
      await this.loadRequests();
    } catch (error) {
      console.error('Error procesando solicitud:', error);
      Notification.error('Error al procesar solicitud');
    } finally {
      Loading.hide();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new AdminAdvisorRequestsView();

