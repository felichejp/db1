import authService from '../services/authService.js';
import { sessionsAPI } from '../api/sessions.js';
import { groupsAPI } from '../api/groups.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Vista del Responsable / Coordinador (Profesor)
 * Puede ver qué asesores aceptaron o rechazaron sesiones
 * Validar si una asesoría se habilita según disponibilidad
 * Confirmar grupos y horarios
 */
class CoordinatorDashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-title">Dashboard del Coordinador</h1>
          <p class="dashboard-subtitle">Bienvenido, ${user.nombre}</p>
        </div>
      </div>

      <div class="dashboard-content">
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">📊</span>
              Estado de Asesorías
            </h2>
          </div>
          <div id="sessions-status" class="status-container">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">✅</span>
              Validar Asesorías
            </h2>
          </div>
          <div id="sessions-to-validate" class="validation-container">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">👥</span>
              Confirmar Grupos y Horarios
            </h2>
          </div>
          <div id="groups-to-confirm" class="groups-container">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadData();
    } catch (error) {
      Notification.error('Error al cargar el dashboard');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadData() {
    try {
      // Obtener todas las sesiones
      const sessionsRes = await sessionsAPI.getAll();
      const sessions = sessionsRes.success ? sessionsRes.data : [];

      // Obtener grupos
      const groupsRes = await groupsAPI.getAll();
      const groups = groupsRes.success ? groupsRes.data : [];

      // Renderizar
      this.renderSessionsStatus(sessions);
      this.renderSessionsToValidate(sessions);
      this.renderGroupsToConfirm(groups);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  renderSessionsStatus(sessions) {
    const container = document.getElementById('sessions-status');
    
    // Agrupar por estado
    const byStatus = {
      aceptada: sessions.filter(s => s.estado === 'aceptada'),
      rechazada: sessions.filter(s => s.estado === 'rechazada'),
      pendiente: sessions.filter(s => s.estado === 'pendiente'),
      programada: sessions.filter(s => s.estado === 'programada'),
      completada: sessions.filter(s => s.estado === 'completada')
    };

    container.innerHTML = `
      <div class="status-grid">
        <div class="status-card">
          <div class="status-card__value">${byStatus.aceptada.length}</div>
          <div class="status-card__label">Aceptadas</div>
          <div class="status-card__badge badge badge--success"></div>
        </div>
        <div class="status-card">
          <div class="status-card__value">${byStatus.rechazada.length}</div>
          <div class="status-card__label">Rechazadas</div>
          <div class="status-card__badge badge badge--error"></div>
        </div>
        <div class="status-card">
          <div class="status-card__value">${byStatus.pendiente.length}</div>
          <div class="status-card__label">Pendientes</div>
          <div class="status-card__badge badge badge--warning"></div>
        </div>
        <div class="status-card">
          <div class="status-card__value">${byStatus.programada.length}</div>
          <div class="status-card__label">Programadas</div>
          <div class="status-card__badge badge badge--info"></div>
        </div>
        <div class="status-card">
          <div class="status-card__value">${byStatus.completada.length}</div>
          <div class="status-card__label">Completadas</div>
          <div class="status-card__badge badge badge--success"></div>
        </div>
      </div>
    `;
  }

  renderSessionsToValidate(sessions) {
    const container = document.getElementById('sessions-to-validate');
    
    // Sesiones que necesitan validación (aceptadas pero no validadas)
    const toValidate = sessions.filter(s => 
      s.estado === 'aceptada' || s.estado === 'programada'
    );

    if (toValidate.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">✅</div>
          <p class="empty-state__message">No hay asesorías pendientes de validar</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Tema</th>
              <th>Asesor</th>
              <th>Grupo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${toValidate.map(session => `
              <tr>
                <td>${formatDate(session.fecha)}</td>
                <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                <td>${session.tema || '-'}</td>
                <td>${session.tutor?.nombre || session.tutorId || '-'}</td>
                <td>${session.grupo?.nombre || '-'}</td>
                <td>
                  <span class="badge badge--${getStatusColor(session.estado)}">
                    ${getStatusName(session.estado)}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button 
                      class="btn btn-success btn-sm" 
                      onclick="window.coordinatorDashboard?.validateSession(${session.id}, true)"
                    >
                      ✓ Habilitar
                    </button>
                    <button 
                      class="btn btn-danger btn-sm" 
                      onclick="window.coordinatorDashboard?.validateSession(${session.id}, false)"
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    window.coordinatorDashboard = this;
  }

  renderGroupsToConfirm(groups) {
    const container = document.getElementById('groups-to-confirm');
    
    if (groups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">👥</div>
          <p class="empty-state__message">No hay grupos para confirmar</p>
        </div>
      `;
      return;
    }

    container.innerHTML = groups.map(group => `
      <div class="group-card">
        <div class="group-card__header">
          <h3 class="group-card__title">${group.nombre}</h3>
          <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
        </div>
        <div class="group-card__body">
          <p class="group-card__description">${group.descripcion || 'Sin descripción'}</p>
          <div class="group-card__info">
            <span class="info-item">
              <span class="info-icon">👥</span>
              ${group.members?.length || 0} miembro${(group.members?.length || 0) !== 1 ? 's' : ''}
            </span>
            <span class="info-item">
              <span class="info-icon">👨‍🏫</span>
              Responsable: ${group.profesor?.nombre || 'Sin asignar'}
            </span>
          </div>
        </div>
        <div class="group-card__footer">
          <button 
            class="btn btn-primary btn-sm" 
            onclick="window.coordinatorDashboard?.confirmGroup(${group.id})"
          >
            Confirmar Grupo
          </button>
          <a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">Ver Detalles</a>
        </div>
      </div>
    `).join('');
  }

  async validateSession(sessionId, enable) {
    try {
      Loading.show();
      const newStatus = enable ? 'programada' : 'rechazada';
      const response = await sessionsAPI.update(sessionId, { estado: newStatus });
      
      if (response.success) {
        Notification.success(enable ? 'Asesoría habilitada' : 'Asesoría rechazada');
        await this.loadData();
      } else {
        Notification.error(response.message || 'Error al validar la asesoría');
      }
    } catch (error) {
      Notification.error('Error al validar la asesoría');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async confirmGroup(groupId) {
    try {
      Loading.show();
      const response = await groupsAPI.update(groupId, { estado: 'activo' });
      
      if (response.success) {
        Notification.success('Grupo confirmado');
        await this.loadData();
      } else {
        Notification.error(response.message || 'Error al confirmar el grupo');
      }
    } catch (error) {
      Notification.error('Error al confirmar el grupo');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }
}

export default new CoordinatorDashboardView();

