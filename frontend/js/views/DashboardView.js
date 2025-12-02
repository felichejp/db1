import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';
import { joinGroupRooms } from '../utils/socketHelpers.js';

/**
 * Vista de Dashboard
 */
class DashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Bienvenido, ${user.nombre}</h1>
          <p class="text-muted">Rol: ${user.role}</p>
        </div>
        <div class="card__body">
          <div id="dashboard-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadDashboardContent(user);
    } catch (error) {
      Notification.error('Error al cargar el dashboard');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadDashboardContent(user) {
    const content = document.getElementById('dashboard-content');
    
    try {
      const [groupsRes, sessionsRes] = await Promise.allSettled([
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

      // Manejar resultados (pueden ser errores 401)
      const groups = groupsRes.status === 'fulfilled' && groupsRes.value.success 
        ? groupsRes.value.data 
        : [];
      const sessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.success 
        ? sessionsRes.value.data 
        : [];

      // Si hay errores 401, redirigir a login
      if (groupsRes.status === 'rejected' && groupsRes.reason?.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }

      // Unirse automáticamente a rooms de grupos para recibir eventos en tiempo real
      if (groups.length > 0) {
        await joinGroupRooms(groups);
      }

      let html = '';

      if (user.role === 'Admin') {
        html = this.renderAdminDashboard(groups, sessions);
      } else if (user.role === 'Profesor') {
        html = await this.renderProfesorDashboard(groups, sessions);
      } else if (user.role === 'Tutor') {
        html = await this.renderTutorDashboard(groups, sessions);
      } else {
        html = await this.renderEstudianteDashboard(groups, sessions);
      }

      content.innerHTML = html;
      
      // Configurar eventos después de renderizar
      if (user.role === 'Estudiante') {
        this.setupStudentDashboardEvents();
      } else if (user.role === 'Tutor') {
        this.setupTutorDashboardEvents();
      } else if (user.role === 'Profesor') {
        this.setupProfesorDashboardEvents();
      }
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar datos</p>';
    }
  }

  renderAdminDashboard(groups, sessions) {
    // Calcular estadísticas básicas
    const totalGroups = groups.length;
    const totalSessions = sessions.length;
    const activeGroups = groups.filter(g => g.estado === 'activo').length;
    const completedSessions = sessions.filter(s => s.estado === 'completada').length;

    return `
      <div>
        <h2>Estadísticas Generales</h2>
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
          <div class="stat-card" style="padding: 1.5rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div class="stat-card__value" style="font-size: 2rem; font-weight: bold; color: var(--accent-color);">${totalGroups}</div>
            <div class="stat-card__label" style="margin-top: 0.5rem; color: var(--text-secondary);">Total Grupos</div>
          </div>
          <div class="stat-card" style="padding: 1.5rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div class="stat-card__value" style="font-size: 2rem; font-weight: bold; color: var(--success-color);">${activeGroups}</div>
            <div class="stat-card__label" style="margin-top: 0.5rem; color: var(--text-secondary);">Grupos Activos</div>
          </div>
          <div class="stat-card" style="padding: 1.5rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div class="stat-card__value" style="font-size: 2rem; font-weight: bold; color: var(--accent-color);">${totalSessions}</div>
            <div class="stat-card__label" style="margin-top: 0.5rem; color: var(--text-secondary);">Total Sesiones</div>
          </div>
          <div class="stat-card" style="padding: 1.5rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div class="stat-card__value" style="font-size: 2rem; font-weight: bold; color: var(--success-color);">${completedSessions}</div>
            <div class="stat-card__label" style="margin-top: 0.5rem; color: var(--text-secondary);">Sesiones Completadas</div>
          </div>
        </div>
        <p class="text-muted" style="margin-top: 2rem; font-style: italic;">
          Nota: Para gráficas más detalladas, se recomienda integrar una librería de gráficas como Chart.js
        </p>
      </div>
    `;
  }

  async renderProfesorDashboard(groups, sessions) {
    // Obtener historial de solicitudes aceptadas/rechazadas por asesores
    let requestHistory = [];
    try {
      // Filtrar sesiones de los grupos del profesor
      const profesorGroupIds = groups.map(g => g.id);
      const groupSessions = sessions.filter(s => profesorGroupIds.includes(s.groupId));
      
      // Separar por estado
      requestHistory = groupSessions.map(s => ({
        ...s,
        group: groups.find(g => g.id === s.groupId)
      }));
    } catch (error) {
      console.error('Error obteniendo historial:', error);
    }

    return `
      <div>
        <h2>Historial de Solicitudes</h2>
        ${requestHistory.length > 0 ? this.renderRequestHistory(requestHistory) : '<p class="text-muted">No hay solicitudes registradas</p>'}
      </div>
    `;
  }

  async renderTutorDashboard(groups, sessions) {
    // Filtrar grupos donde es asesor (máximo 3)
    const tutorGroups = groups.slice(0, 3);
    
    // Obtener solicitudes de sesión pendientes
    let sessionRequests = [];
    try {
      // Nota: Necesitarás implementar un endpoint para obtener solicitudes de sesión
      // Por ahora, filtramos sesiones pendientes
      const pendingSessions = sessions.filter(s => s.estado === 'pendiente' && tutorGroups.some(g => g.id === s.groupId));
      sessionRequests = pendingSessions;
    } catch (error) {
      console.error('Error obteniendo solicitudes:', error);
    }

    return `
      <div class="dashboard-layout" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div>
          <h2>Mis Cursos (Máximo 3)</h2>
          ${tutorGroups.length > 0 ? this.renderGroupsCards(tutorGroups) : '<p class="text-muted">No eres asesor de ningún curso</p>'}
        </div>
        <div>
          <h2>Solicitudes de Asesoría</h2>
          ${sessionRequests.length > 0 ? this.renderSessionRequests(sessionRequests) : '<p class="text-muted">No hay solicitudes pendientes</p>'}
        </div>
      </div>
    `;
  }

  async renderEstudianteDashboard(groups, sessions) {
    // Obtener grupos disponibles para unirse
    let availableGroups = [];
    try {
      // Nota: Necesitarás implementar un endpoint para obtener grupos disponibles
      // Por ahora, asumimos que todos los grupos son disponibles si no estás inscrito
      const allGroupsRes = await groupsAPI.getAll();
      if (allGroupsRes.success) {
        const allGroups = allGroupsRes.data || [];
        const enrolledGroupIds = groups.map(g => g.id);
        availableGroups = allGroups.filter(g => !enrolledGroupIds.includes(g.id));
      }
    } catch (error) {
      console.error('Error obteniendo grupos disponibles:', error);
    }

    return `
      <div class="dashboard-layout" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div>
          <h2>Mis Grupos Inscritos</h2>
          ${groups.length > 0 ? this.renderGroupsCards(groups) : '<p class="text-muted">No estás inscrito en ningún grupo</p>'}
        </div>
        <div>
          <h2>Grupos Disponibles</h2>
          ${availableGroups.length > 0 ? this.renderAvailableGroupsCards(availableGroups) : '<p class="text-muted">No hay grupos disponibles para unirse</p>'}
        </div>
      </div>
    `;
  }

  renderGroupsList(groups) {
    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(group => `
              <tr>
                <td>${group.nombre}</td>
                <td><span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span></td>
                <td><a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">Ver</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderGroupsCards(groups) {
    return `
      <div class="groups-cards" style="display: grid; gap: 1rem; margin-top: 1rem;">
        ${groups.map(group => `
          <div class="group-card" style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer;" onclick="window.location.hash='#/groups/${group.id}'">
            <h3 style="margin: 0 0 0.5rem 0;">${this.escapeHtml(group.nombre)}</h3>
            ${group.descripcion ? `<p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">${this.escapeHtml(group.descripcion.substring(0, 100))}${group.descripcion.length > 100 ? '...' : ''}</p>` : ''}
            <div style="margin-top: 0.5rem;">
              <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderAvailableGroupsCards(groups) {
    return `
      <div class="groups-cards" style="display: grid; gap: 1rem; margin-top: 1rem;">
        ${groups.map(group => `
          <div class="group-card" style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <h3 style="margin: 0 0 0.5rem 0;">${this.escapeHtml(group.nombre)}</h3>
            ${group.descripcion ? `<p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">${this.escapeHtml(group.descripcion.substring(0, 100))}${group.descripcion.length > 100 ? '...' : ''}</p>` : ''}
            <button class="btn btn-primary btn-sm join-group-btn" data-group-id="${group.id}" style="margin-top: 0.5rem;">Unirse</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderSessionRequests(requests) {
    return `
      <div class="session-requests" style="display: grid; gap: 1rem; margin-top: 1rem;">
        ${requests.map(request => `
          <div class="request-card" style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="margin-bottom: 0.5rem;">
              <strong>Materia:</strong> ${this.escapeHtml(request.group?.nombre || 'N/A')}
            </div>
            <div style="margin-bottom: 0.5rem;">
              <strong>Fecha:</strong> ${formatDate(request.fecha)}
            </div>
            <div style="margin-bottom: 0.5rem;">
              <strong>Tema:</strong> ${this.escapeHtml(request.tema || '-')}
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn btn-success btn-sm accept-request-btn" data-request-id="${request.id}">Aceptar</button>
              <button class="btn btn-error btn-sm reject-request-btn" data-request-id="${request.id}">Rechazar</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderRequestHistory(history) {
    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Grupo/Materia</th>
              <th>Fecha</th>
              <th>Tema</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(item => `
              <tr>
                <td>${this.escapeHtml(item.group?.nombre || 'N/A')}</td>
                <td>${formatDate(item.fecha)}</td>
                <td>${this.escapeHtml(item.tema || '-')}</td>
                <td>
                  <span class="badge badge--${getStatusColor(item.estado)}">
                    ${getStatusName(item.estado)}
                  </span>
                </td>
                <td>
                  ${item.estado === 'rechazada' ? `
                    <button class="btn btn-secondary btn-sm contact-advisor-btn" data-tutor-id="${item.tutorId}">
                      Contactar a Asesor
                    </button>
                  ` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderSessionsList(sessions) {
    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Tema</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(session => `
              <tr>
                <td>${formatDate(session.fecha)}</td>
                <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                <td>${session.tema || '-'}</td>
                <td><span class="badge badge--${getStatusColor(session.estado)}">${getStatusName(session.estado)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  setupStudentDashboardEvents() {
    // Configurar eventos para unirse a grupos
    const joinButtons = document.querySelectorAll('.join-group-btn');
    joinButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const groupId = parseInt(btn.dataset.groupId);
        try {
          Loading.show();
          const response = await groupsAPI.addMember(groupId, authService.getCurrentUser().id);
          if (response.success) {
            Notification.success('Te has unido al grupo exitosamente');
            // Recargar dashboard
            await this.loadDashboardContent(authService.getCurrentUser());
          } else {
            Notification.error(response.message || 'Error al unirse al grupo');
          }
        } catch (error) {
          Notification.error('Error al unirse al grupo');
        } finally {
          Loading.hide();
        }
      });
    });
  }

  setupTutorDashboardEvents() {
    // Configurar eventos para aceptar/rechazar solicitudes
    const acceptButtons = document.querySelectorAll('.accept-request-btn');
    const rejectButtons = document.querySelectorAll('.reject-request-btn');
    
    acceptButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sessionId = parseInt(btn.dataset.requestId);
        try {
          Loading.show();
          const response = await sessionsAPI.update(sessionId, { estado: 'aceptada' });
          if (response.success) {
            Notification.success('Solicitud aceptada');
            await this.loadDashboardContent(authService.getCurrentUser());
          } else {
            Notification.error('Error al aceptar solicitud');
          }
        } catch (error) {
          Notification.error('Error al aceptar solicitud');
        } finally {
          Loading.hide();
        }
      });
    });

    rejectButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sessionId = parseInt(btn.dataset.requestId);
        try {
          Loading.show();
          const response = await sessionsAPI.update(sessionId, { estado: 'rechazada' });
          if (response.success) {
            Notification.success('Solicitud rechazada');
            await this.loadDashboardContent(authService.getCurrentUser());
          } else {
            Notification.error('Error al rechazar solicitud');
          }
        } catch (error) {
          Notification.error('Error al rechazar solicitud');
        } finally {
          Loading.hide();
        }
      });
    });
  }

  setupProfesorDashboardEvents() {
    // Configurar eventos para contactar asesor
    const contactButtons = document.querySelectorAll('.contact-advisor-btn');
    contactButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tutorId = parseInt(btn.dataset.tutorId);
        // Redirigir a mensajes del grupo o mostrar modal
        Notification.info('Funcionalidad de contacto con asesor - por implementar');
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new DashboardView();


