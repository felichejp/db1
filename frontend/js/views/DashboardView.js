import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { messagesAPI } from '../api/messages.js';
import { tutoringRequestsAPI } from '../api/tutoringRequests.js';
import { tutorRequestsAPI } from '../api/tutorRequests.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';
import { joinGroupRooms, joinGroupRoom, leaveGroupRoom } from '../utils/socketHelpers.js';
import socketService from '../services/socketService.js';

/**
 * Vista de Dashboard
 */
class DashboardView {
  constructor() {
    this.currentChatGroupId = null;
    this.messages = [];
    this.socketListeners = new Map();
    this.currentView = 'dashboard'; // 'dashboard', 'request-tutoring', 'request-subject'
    this.currentGroupId = null;
  }
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div id="dashboard-content">
        <div class="spinner"></div>
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
    
    // Si estamos en una vista de formulario, mostrarla
    if (this.currentView === 'request-tutoring' && this.currentGroupId) {
      content.innerHTML = await this.renderRequestTutoringForm(user, this.currentGroupId);
      this.setupRequestTutoringForm(user, this.currentGroupId);
      return;
    }
    
    if (this.currentView === 'request-subject') {
      content.innerHTML = this.renderRequestSubjectForm(user);
      this.setupRequestSubjectForm(user);
      return;
    }
    
    // Vista normal del dashboard
    this.currentView = 'dashboard';
    
    try {
      const promises = [groupsAPI.getAll(), sessionsAPI.getAll()];
      
      // Cargar datos adicionales según el rol
      if (user.role === 'Estudiante') {
        promises.push(tutoringRequestsAPI.getAvailableGroups());
      } else if (user.role === 'Tutor') {
        promises.push(tutoringRequestsAPI.getTutorRequests());
      } else if (user.role === 'Profesor') {
        promises.push(tutorRequestsAPI.getTeacherSupportRequests());
      } else if (user.role === 'Admin') {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
        promises.push(
          axios.get(`${API_BASE_URL}/api/admin/stats`).then(r => r.data),
          tutorRequestsAPI.getSubjectRequests()
        );
      }

      const results = await Promise.allSettled(promises);

      // Manejar resultados
      const groups = results[0].status === 'fulfilled' && results[0].value.success 
        ? results[0].value.data 
        : [];
      const sessions = results[1].status === 'fulfilled' && results[1].value.success 
        ? results[1].value.data 
        : [];

      // Si hay errores 401, redirigir a login
      if (results[0].status === 'rejected' && results[0].reason?.response?.status === 401) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }

      // Unirse automáticamente a rooms de grupos para recibir eventos en tiempo real
      if (groups.length > 0) {
        await joinGroupRooms(groups);
      }

      let html = '';
      let additionalData = {};

      if (user.role === 'Estudiante') {
        additionalData.availableGroups = results[2]?.status === 'fulfilled' && results[2].value.success 
          ? results[2].value.data 
          : [];
        html = this.renderEstudianteDashboard(user, groups, sessions, additionalData);
      } else if (user.role === 'Profesor') {
        additionalData.supportRequests = results[2]?.status === 'fulfilled' && results[2].value.success 
          ? results[2].value.data 
          : [];
        html = this.renderProfesorDashboard(user, groups, sessions, additionalData);
      } else if (user.role === 'Tutor') {
        additionalData.tutoringRequests = results[2]?.status === 'fulfilled' && results[2].value.success 
          ? results[2].value.data 
          : [];
        html = this.renderTutorDashboard(user, groups, sessions, additionalData);
      } else if (user.role === 'Admin') {
        additionalData.stats = results[2]?.status === 'fulfilled' && results[2].value.success 
          ? results[2].value.data 
          : {};
        additionalData.subjectRequests = results[3]?.status === 'fulfilled' && results[3].value.success 
          ? results[3].value.data 
          : [];
        html = this.renderAdminDashboard(user, groups, sessions, additionalData);
      }

      content.innerHTML = html;
      
      // Configurar event listeners después de renderizar
      this.setupEventListeners(user.role);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar datos</p>';
    }
  }

  renderAdminDashboard(user, groups, sessions, data) {
    const stats = data.stats || {};
    const subjectRequests = data.subjectRequests || [];

    return `
      <div class="dashboard-admin">
        <!-- Header -->
        <div class="dashboard-header">
          <div>
            <h2>${this.escapeHtml(user.nombre)}</h2>
            <p class="text-muted">Rol: ${user.role}</p>
          </div>
          <button class="btn btn-primary" onclick="dashboardView.showCreateGroupModal()">
            Crear Nuevo Grupo
          </button>
        </div>

        <!-- Layout dividido -->
        <div class="dashboard-layout-split">
          <!-- Parte izquierda: Todos los grupos -->
          <div class="dashboard-left">
            <div class="card">
              <div class="card__header">
                <h3>Todos los Grupos (${groups.length})</h3>
              </div>
              <div class="card__body">
                ${groups.length > 0 ? this.renderAdminGroupsList(groups) : '<p class="text-muted">No hay grupos</p>'}
              </div>
            </div>
          </div>

          <!-- Parte derecha: Métricas y solicitudes -->
          <div class="dashboard-right">
            <!-- Métricas -->
            <div class="card mb-3">
              <div class="card__header">
                <h3>Métricas Generales</h3>
              </div>
              <div class="card__body">
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-value">${stats.totalUsuarios || 0}</div>
                    <div class="stat-label">Total Usuarios</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${stats.totalEstudiantes || 0}</div>
                    <div class="stat-label">Estudiantes</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${stats.totalTutores || 0}</div>
                    <div class="stat-label">Tutores</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${stats.totalProfesores || 0}</div>
                    <div class="stat-label">Profesores</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${stats.totalGrupos || 0}</div>
                    <div class="stat-label">Grupos</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">${stats.sesionesCompletadas || 0}</div>
                    <div class="stat-label">Sesiones Completadas</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Solicitudes de materia -->
            <div class="card">
              <div class="card__header">
                <h3>Solicitudes de Materia (${subjectRequests.length})</h3>
              </div>
              <div class="card__body">
                ${subjectRequests.length > 0 ? this.renderSubjectRequestsList(subjectRequests) : '<p class="text-muted">No hay solicitudes pendientes</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderAdminGroupsList(groups) {
    return `
      <div class="groups-list">
        ${groups.map(group => `
          <div class="group-card">
            <div class="group-card__header">
              <h4>${this.escapeHtml(group.nombre)}</h4>
              <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span>
            </div>
            <div class="group-card__body">
              <div class="group-info">
                <p><strong>Profesor:</strong> ${this.escapeHtml(group.profesorNombre || 'No asignado')}</p>
                <p><strong>Asesor:</strong> ${this.escapeHtml(group.tutorNombre || 'No asignado')}</p>
                <p><strong>Integrantes:</strong> ${group.numIntegrantes || 0}</p>
              </div>
              <div class="group-card__actions">
                <a href="#/groups/${group.id}" class="btn btn-primary btn-sm">Ver Detalles</a>
                <button class="btn btn-secondary btn-sm" onclick="dashboardView.showAssignGroupModal(${group.id})">
                  Asignar
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderSubjectRequestsList(requests) {
    return `
      <div class="requests-list">
        ${requests.map(request => `
          <div class="request-card">
            <div class="request-card__header">
              <h5>${this.escapeHtml(request.materia)}</h5>
              <span class="badge badge--warning">Pendiente</span>
            </div>
            <div class="request-card__body">
              <p><strong>Tutor:</strong> ${this.escapeHtml(request.tutorName || 'N/A')}</p>
              <p><strong>Nivel:</strong> ${this.escapeHtml(request.nivel || 'N/A')}</p>
              ${request.requisitos ? `<p><strong>Requisitos:</strong> ${this.escapeHtml(request.requisitos)}</p>` : ''}
              <div class="request-card__actions">
                <button class="btn btn-success btn-sm" onclick="dashboardView.acceptSubjectRequest(${request.id})">
                  Aceptar
                </button>
                <button class="btn btn-danger btn-sm" onclick="dashboardView.rejectSubjectRequest(${request.id})">
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderProfesorDashboard(user, groups, sessions, data) {
    const supportRequests = data.supportRequests || [];
    const profesorGroups = groups.slice(0, 6); // Limitar a 6 grupos

    return `
      <div class="dashboard-profesor">
        <!-- Header -->
        <div class="dashboard-header">
          <div>
            <h2>${this.escapeHtml(user.nombre)}</h2>
            <p class="text-muted">Rol: ${user.role} | Grupos asignados: ${groups.length}${groups.length >= 6 ? ' (Límite alcanzado)' : ''}</p>
          </div>
        </div>

        <!-- Layout dividido -->
        <div class="dashboard-layout-split">
          <!-- Parte izquierda: Mis Grupos -->
          <div class="dashboard-left">
            <div class="card">
              <div class="card__header">
                <h3>Mis Grupos (${profesorGroups.length}/6)</h3>
              </div>
              <div class="card__body">
                ${profesorGroups.length > 0 ? this.renderProfesorGroupsList(profesorGroups) : '<p class="text-muted">No tienes grupos asignados</p>'}
              </div>
            </div>
          </div>

          <!-- Parte derecha: Solicitudes de apoyo -->
          <div class="dashboard-right">
            <div class="card">
              <div class="card__header">
                <h3>Solicitudes de Apoyo de Tutores</h3>
              </div>
              <div class="card__body">
                ${supportRequests.length > 0 ? this.renderSupportRequestsList(supportRequests) : '<p class="text-muted">No hay solicitudes pendientes</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderProfesorGroupsList(groups) {
    return `
      <div class="groups-list">
        ${groups.map(group => `
          <div class="group-card">
            <div class="group-card__header">
              <h4>${this.escapeHtml(group.nombre)}</h4>
            </div>
            <div class="group-card__body">
              <div class="group-info">
                <p><strong>Asesor:</strong> ${this.escapeHtml(group.tutorNombre || 'No asignado')}</p>
                <p><strong>Integrantes:</strong> ${group.numIntegrantes || 0}</p>
                <p><strong>Estado:</strong> <span class="badge badge--${getStatusColor(group.estado)}">${getStatusName(group.estado)}</span></p>
              </div>
              <div class="group-card__actions">
                <a href="#/groups/${group.id}" class="btn btn-primary btn-sm">Ver Detalles</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderSupportRequestsList(requests) {
    return `
      <div class="requests-list">
        ${requests.map(request => `
          <div class="request-card">
            <div class="request-card__header">
              <h5>${this.escapeHtml(request.groupName || 'Grupo')}</h5>
              <span class="badge badge--warning">Pendiente</span>
            </div>
            <div class="request-card__body">
              <p><strong>Tutor:</strong> ${this.escapeHtml(request.tutorName || 'N/A')}</p>
              <p><strong>Tema:</strong> ${this.escapeHtml(request.tema)}</p>
              <p><strong>Fecha propuesta:</strong> ${formatDate(request.fechaPropuesta)}</p>
              <p><strong>Hora:</strong> ${formatTime(request.horaInicioPropuesta)} - ${formatTime(request.horaFinPropuesta)}</p>
              <div class="request-card__actions">
                <button class="btn btn-success btn-sm" onclick="dashboardView.acceptTeacherSupportRequest(${request.id})">
                  Aceptar
                </button>
                <button class="btn btn-danger btn-sm" onclick="dashboardView.rejectTeacherSupportRequest(${request.id})">
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderTutorDashboard(user, groups, sessions, data) {
    const tutoringRequests = data.tutoringRequests || [];
    const tutorGroups = groups.slice(0, 3); // Limitar a 3 grupos

    return `
      <div class="dashboard-tutor">
        <!-- Header -->
        <div class="dashboard-header">
          <div>
            <h2>${this.escapeHtml(user.nombre)}</h2>
            <p class="text-muted">Rol: ${user.role} | Grupos asignados: ${groups.length}</p>
          </div>
        </div>

        <!-- Layout dividido -->
        <div class="dashboard-layout-split">
          <!-- Parte izquierda: Mis Grupos -->
          <div class="dashboard-left">
            <div class="card">
              <div class="card__header">
                <h3>Mis Grupos (${tutorGroups.length}/3)</h3>
              </div>
              <div class="card__body">
                ${tutorGroups.length > 0 ? this.renderTutorGroupsList(tutorGroups) : '<p class="text-muted">No tienes grupos asignados</p>'}
                ${groups.length < 3 ? `
                  <button class="btn btn-primary mt-2" onclick="dashboardView.showSubjectRequestModal()">
                    Solicitar Asesorar Materia
                  </button>
                ` : '<p class="text-muted"><small>Has alcanzado el límite de grupos (3)</small></p>'}
              </div>
            </div>
          </div>

          <!-- Parte derecha: Solicitudes de asesoría -->
          <div class="dashboard-right">
            <div class="card">
              <div class="card__header">
                <h3>Solicitudes de Asesoría</h3>
              </div>
              <div class="card__body">
                ${tutoringRequests.length > 0 ? this.renderTutoringRequestsList(tutoringRequests) : '<p class="text-muted">No hay solicitudes pendientes</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTutorGroupsList(groups) {
    return `
      <div class="groups-list">
        ${groups.map(group => `
          <div class="group-card">
            <div class="group-card__header">
              <h4>${this.escapeHtml(group.nombre)}</h4>
            </div>
            <div class="group-card__body">
              <div class="group-info">
                <p><strong>Profesor:</strong> ${this.escapeHtml(group.profesorNombre || 'No asignado')}</p>
                <p><strong>Integrantes:</strong> ${group.numIntegrantes || 0}</p>
              </div>
              <div class="group-card__actions">
                <a href="#/groups/${group.id}" class="btn btn-primary btn-sm">Detalles</a>
                <button class="btn btn-secondary btn-sm" onclick="dashboardView.showTeacherSupportModal(${group.id})">
                  Solicitar Apoyo Profesor
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderTutoringRequestsList(requests) {
    return `
      <div class="requests-list">
        ${requests.map(request => `
          <div class="request-card">
            <div class="request-card__header">
              <h5>${this.escapeHtml(request.groupName || 'Grupo')}</h5>
              <span class="badge badge--warning">Pendiente</span>
            </div>
            <div class="request-card__body">
              <p><strong>Estudiante:</strong> ${this.escapeHtml(request.studentName || 'N/A')}</p>
              <p><strong>Tema:</strong> ${this.escapeHtml(request.tema)}</p>
              <p><strong>Fecha propuesta:</strong> ${formatDate(request.fechaPropuesta)}</p>
              <p><strong>Hora:</strong> ${formatTime(request.horaInicioPropuesta)} - ${formatTime(request.horaFinPropuesta)}</p>
              <div class="request-card__actions">
                <button class="btn btn-success btn-sm" onclick="dashboardView.acceptTutoringRequest(${request.id})">
                  Aceptar
                </button>
                <button class="btn btn-danger btn-sm" onclick="dashboardView.rejectTutoringRequest(${request.id})">
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderEstudianteDashboard(user, groups, sessions, data) {
    const availableGroups = data.availableGroups || [];
    const upcomingSessions = sessions.filter(s => {
      const sessionDate = new Date(`${s.fecha}T${s.horaInicio}`);
      return sessionDate >= new Date() && s.estado !== 'cancelada';
    }).sort((a, b) => {
      const dateA = new Date(`${a.fecha}T${a.horaInicio}`);
      const dateB = new Date(`${b.fecha}T${b.horaInicio}`);
      return dateA - dateB;
    });

    return `
      <div class="dashboard-estudiante">
        <!-- Header -->
        <div class="dashboard-header">
          <div>
            <h2>${this.escapeHtml(user.nombre)}</h2>
            <p class="text-muted">Rol: ${user.role} | Grado: ${user.grado || 'N/A'}</p>
          </div>
        </div>

        <!-- Layout dividido -->
        <div class="dashboard-layout-split">
          <!-- Parte izquierda: Mis Grupos -->
          <div class="dashboard-left">
            <div class="card">
              <div class="card__header">
                <h3>Mis Grupos</h3>
              </div>
              <div class="card__body">
                ${groups.length > 0 ? this.renderEstudianteGroupsList(groups) : '<p class="text-muted">No estás en ningún grupo</p>'}
              </div>
            </div>
          </div>

          <!-- Parte derecha: Grupos disponibles y calendario -->
          <div class="dashboard-right">
            <!-- Grupos disponibles -->
            <div class="card mb-3">
              <div class="card__header">
                <h3>Grupos Disponibles</h3>
              </div>
              <div class="card__body">
                ${availableGroups.length > 0 ? this.renderAvailableGroupsList(availableGroups) : '<p class="text-muted">No hay grupos disponibles</p>'}
              </div>
            </div>

            <!-- Calendario -->
            <div class="card">
              <div class="card__header">
                <h3>Próximas Sesiones</h3>
              </div>
              <div class="card__body">
                ${upcomingSessions.length > 0 ? this.renderSessionsCalendar(upcomingSessions) : '<p class="text-muted">No hay sesiones programadas</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEstudianteGroupsList(groups) {
    return `
      <div class="groups-list">
        ${groups.map(group => `
          <div class="group-card">
            <div class="group-card__header">
              <h4>${this.escapeHtml(group.nombre)}</h4>
              <span class="badge badge--info">ID: ${group.id}</span>
            </div>
            <div class="group-card__body">
              <div class="group-info">
                <p><strong>Profesor:</strong> ${this.escapeHtml(group.profesorNombre || 'No asignado')}</p>
                <p><strong>Asesor:</strong> ${this.escapeHtml(group.tutorNombre || 'No asignado')}</p>
                <p><strong>Integrantes:</strong> ${group.numIntegrantes || 0}</p>
              </div>
              <div class="group-card__actions">
                <a href="#/groups/${group.id}" class="btn btn-primary btn-sm">Detalles</a>
                <button class="btn btn-secondary btn-sm" onclick="dashboardView.showRequestTutoringModal(${group.id})">
                  Solicitar Asesoría
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderAvailableGroupsList(groups) {
    return `
      <div class="available-groups-list">
        ${groups.slice(0, 5).map(group => {
          const numIntegrantes = parseInt(group.numIntegrantes || 0, 10);
          const cupoDisponible = Math.max(0, 5 - numIntegrantes);
          return `
          <div class="available-group-item">
            <h5>${this.escapeHtml(group.nombre)}</h5>
            <p class="text-muted"><small>Profesor: ${this.escapeHtml(group.profesorNombre || 'No asignado')}</small></p>
            <p class="text-muted"><small>Asesor: ${this.escapeHtml(group.tutorNombre || 'No asignado')}</small></p>
            <p class="text-muted"><small>Cupo disponible: ${cupoDisponible}</small></p>
          </div>
        `;
        }).join('')}
      </div>
    `;
  }

  renderSessionsCalendar(sessions) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Agrupar sesiones por mes
    const sessionsByMonth = {};
    sessions.forEach(session => {
      const sessionDate = new Date(`${session.fecha}T${session.horaInicio}`);
      const monthKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}`;
      if (!sessionsByMonth[monthKey]) {
        sessionsByMonth[monthKey] = [];
      }
      sessionsByMonth[monthKey].push(session);
    });

    return `
      <div class="sessions-calendar">
        ${Object.keys(sessionsByMonth).slice(0, 1).map(monthKey => {
          const monthSessions = sessionsByMonth[monthKey];
          const firstSession = monthSessions[0];
          const sessionDate = new Date(`${firstSession.fecha}T${firstSession.horaInicio}`);
          const monthName = sessionDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
          
          return `
            <div class="calendar-month">
              <h4>${monthName}</h4>
              <div class="calendar-sessions">
                ${monthSessions.slice(0, 10).map(session => `
                  <div class="calendar-session-item">
                    <div class="calendar-date">${formatDate(session.fecha)}</div>
                    <div class="calendar-time">${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</div>
                    <div class="calendar-topic">${this.escapeHtml(session.tema || 'Sin tema')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
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
                <td>
                  <div style="display: flex; gap: 0.5rem;">
                    <a href="#/groups/${group.id}" class="btn btn-secondary btn-sm">
                      Ver
                    </a>
                    <button 
                      class="btn btn-secondary btn-sm" 
                      onclick="dashboardView.openGroupChat(${group.id}, '${group.nombre.replace(/'/g, "\\'")}')"
                    >
                      Abrir Chat
                    </button>
                  </div>
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

  // Método para abrir el chat de un grupo
  async openGroupChat(groupId, groupName) {
    this.currentChatGroupId = groupId;
    
    // Limpiar listeners anteriores si hay un chat abierto
    this.cleanupChatListeners();
    
    // Renderizar el chat
    await this.renderGroupChat(groupId, groupName);
    
    // Cargar mensajes
    await this.loadChatMessages(groupId);
    
    // Configurar Socket.IO
    this.setupChatSocketListeners(groupId);
    
    // Unirse al room del grupo
    joinGroupRoom(groupId);
  }

  // Renderizar el componente de chat
  async renderGroupChat(groupId, groupName) {
    const content = document.getElementById('dashboard-content');
    
    // Crear contenedor del chat si no existe
    let chatContainer = document.getElementById('group-chat-container');
    if (!chatContainer) {
      chatContainer = document.createElement('div');
      chatContainer.id = 'group-chat-container';
      content.appendChild(chatContainer);
    }
    
    chatContainer.innerHTML = `
      <div class="chat-wrapper">
        <div class="chat-header">
          <div class="chat-header__info">
            <h3>Chat: ${this.escapeHtml(groupName)}</h3>
            <span class="chat-group-id">Grupo #${groupId}</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="dashboardView.closeGroupChat()">
            Cerrar Chat
          </button>
        </div>
        
        <div class="chat-messages" id="chat-messages-${groupId}">
          <div class="chat-loading">
            <div class="spinner"></div>
            <p>Cargando mensajes...</p>
          </div>
        </div>
        
        <div class="chat-input-container">
          <div class="chat-input-wrapper">
            <textarea 
              id="chat-input-${groupId}" 
              class="chat-input" 
              placeholder="Escribe un mensaje..."
              rows="2"
            ></textarea>
            <button 
              class="btn btn-primary chat-send-btn" 
              onclick="dashboardView.sendChatMessage(${groupId})"
              id="chat-send-btn-${groupId}"
            >
              <i class="fas fa-paper-plane"></i> Enviar
            </button>
          </div>
          <div class="chat-input-hint">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </div>
        </div>
      </div>
    `;
    
    // Configurar eventos del input
    this.setupChatInputEvents(groupId);
    
    // Scroll al final
    setTimeout(() => {
      this.scrollChatToBottom(groupId);
    }, 100);
  }

  // Cargar mensajes del grupo
  async loadChatMessages(groupId) {
    try {
      const response = await messagesAPI.getByGroup(groupId);
      
      if (response.success && response.data) {
        this.messages = response.data;
        this.renderMessages(groupId, this.messages);
      } else {
        this.messages = [];
        this.renderMessages(groupId, []);
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      Notification.error('Error al cargar mensajes del chat');
      this.messages = [];
      this.renderMessages(groupId, []);
    }
  }

  // Renderizar mensajes
  renderMessages(groupId, messages) {
    const messagesContainer = document.getElementById(`chat-messages-${groupId}`);
    if (!messagesContainer) return;
    
    const user = authService.getCurrentUser();
    if (!user) return;
    
    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="chat-empty">
          <i class="fas fa-comments"></i>
          <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
        </div>
      `;
      return;
    }
    
    messagesContainer.innerHTML = messages.map(message => {
      const isOwnMessage = message.senderId === user.userId || message.senderId === user.id;
      const messageTime = this.formatMessageTime(message.createdAt);
      const messageDate = this.formatMessageDate(message.createdAt);
      
      return `
        <div class="message ${isOwnMessage ? 'message--own' : 'message--other'}" data-message-id="${message.id}">
          <div class="message__content">
            <div class="message__header">
              <span class="message__sender">${this.escapeHtml(message.senderName || message.senderEmail || 'Usuario')}</span>
              <span class="message__time" title="${messageDate}">${messageTime}</span>
            </div>
            <div class="message__text">${this.escapeHtml(message.content)}</div>
          </div>
          ${isOwnMessage ? `
            <button 
              class="message__delete" 
              onclick="dashboardView.deleteMessage(${message.id}, ${groupId})"
              title="Eliminar mensaje"
            >
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
    
    // Scroll al final
    this.scrollChatToBottom(groupId);
  }

  // Enviar mensaje
  async sendChatMessage(groupId) {
    const input = document.getElementById(`chat-input-${groupId}`);
    const sendBtn = document.getElementById(`chat-send-btn-${groupId}`);
    
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) {
      Notification.warning('El mensaje no puede estar vacío');
      return;
    }
    
    // Deshabilitar botón e input mientras se envía
    sendBtn.disabled = true;
    input.disabled = true;
    
    try {
      const response = await messagesAPI.create({
        groupId: groupId,
        content: content,
        tipo: 'texto'
      });
      
      if (response.success) {
        // Limpiar input
        input.value = '';
        input.style.height = 'auto';
        
        // El mensaje se agregará automáticamente vía Socket.IO
        // Pero también lo agregamos localmente para feedback inmediato
        const newMessage = response.data;
        if (newMessage) {
          this.messages.push(newMessage);
          this.renderMessages(groupId, this.messages);
        }
      } else {
        Notification.error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Notification.error('Error al enviar mensaje. Intenta nuevamente.');
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  // Eliminar mensaje
  async deleteMessage(messageId, groupId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      return;
    }
    
    try {
      const response = await messagesAPI.delete(messageId);
      
      if (response.success) {
        // Remover mensaje de la lista local
        this.messages = this.messages.filter(m => m.id !== messageId);
        this.renderMessages(groupId, this.messages);
        Notification.success('Mensaje eliminado');
      } else {
        Notification.error(response.message || 'Error al eliminar mensaje');
      }
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      Notification.error('Error al eliminar mensaje');
    }
  }

  // Configurar listeners de Socket.IO
  setupChatSocketListeners(groupId) {
    // Listener para nuevos mensajes
    const newMessageHandler = (message) => {
      if (message.groupId === groupId) {
        // Verificar si el mensaje ya existe (para evitar duplicados)
        const exists = this.messages.some(m => m.id === message.id);
        if (!exists) {
          this.messages.push(message);
          this.renderMessages(groupId, this.messages);
        }
      }
    };
    
    // Listener para mensajes eliminados
    const deletedMessageHandler = (data) => {
      if (data.groupId === groupId || this.messages.some(m => m.id === data.messageId)) {
        this.messages = this.messages.filter(m => m.id !== data.messageId);
        this.renderMessages(groupId, this.messages);
      }
    };
    
    // Registrar listeners
    socketService.on('new_message', newMessageHandler);
    socketService.on('message_deleted', deletedMessageHandler);
    
    // Guardar referencias para poder limpiarlos después
    this.socketListeners.set('new_message', newMessageHandler);
    this.socketListeners.set('message_deleted', deletedMessageHandler);
  }

  // Limpiar listeners de Socket.IO
  cleanupChatListeners() {
    this.socketListeners.forEach((handler, event) => {
      socketService.off(event);
    });
    this.socketListeners.clear();
  }

  // Cerrar chat
  closeGroupChat() {
    const chatContainer = document.getElementById('group-chat-container');
    if (chatContainer) {
      chatContainer.remove();
    }
    
    // Limpiar listeners
    this.cleanupChatListeners();
    
    // Salir del room
    if (this.currentChatGroupId) {
      leaveGroupRoom(this.currentChatGroupId);
      this.currentChatGroupId = null;
    }
    
    this.messages = [];
    
    // Recargar dashboard
    const user = authService.getCurrentUser();
    if (user) {
      this.loadDashboardContent(user);
    }
  }

  // Configurar eventos del input de chat
  setupChatInputEvents(groupId) {
    const input = document.getElementById(`chat-input-${groupId}`);
    if (!input) return;
    
    // Enviar con Enter (Shift+Enter para nueva línea)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage(groupId);
      }
    });
    
    // Auto-resize del textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    });
    
    // Focus automático
    input.focus();
  }

  // Scroll al final del chat
  scrollChatToBottom(groupId) {
    const messagesContainer = document.getElementById(`chat-messages-${groupId}`);
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Formatear hora del mensaje
  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Si es hoy, mostrar solo la hora
    if (diffDays === 0) {
      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Si es ayer
    if (diffDays === 1) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Si es esta semana
    if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }
    
    // Más de una semana
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Formatear fecha completa del mensaje
  formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Escapar HTML para prevenir XSS
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Configurar event listeners según el rol
  setupEventListeners(role) {
    // Los event listeners se configuran mediante onclick en los botones
    // para mantener la compatibilidad con el código existente
  }

  // Renderizar formulario de solicitar asesoría (Estudiante)
  async renderRequestTutoringForm(user, groupId) {
    const tutorsRes = await tutorsAPI.getAll();
    const tutors = tutorsRes.success ? tutorsRes.data : [];
    const groupRes = await groupsAPI.getById(groupId);
    const group = groupRes.success ? groupRes.data : null;

    return `
      <div class="dashboard-form-container">
        <div class="card">
          <div class="card__header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2>Solicitar Asesoría</h2>
                ${group ? `<p class="text-muted">Grupo: ${this.escapeHtml(group.nombre)}</p>` : ''}
              </div>
              <button class="btn btn-secondary" onclick="dashboardView.goBackToDashboard()">
                <i class="fas fa-arrow-left"></i> Volver
              </button>
            </div>
          </div>
          <div class="card__body">
            <form id="tutoring-request-form" class="dashboard-form">
              <div class="form-group">
                <label class="form-label">Tema</label>
                <input type="text" id="request-tema" class="form-input" required placeholder="Ej: Álgebra lineal, Cálculo diferencial...">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha propuesta</label>
                <input type="date" id="request-fecha" class="form-input" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Hora inicio</label>
                  <input type="time" id="request-hora-inicio" class="form-input" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Hora fin</label>
                  <input type="time" id="request-hora-fin" class="form-input" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Tutor (opcional)</label>
                <select id="request-tutor" class="form-select">
                  <option value="">Seleccionar tutor</option>
                  ${tutors.map(t => `<option value="${t.id}">${this.escapeHtml(t.nombre)}</option>`).join('')}
                </select>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="dashboardView.goBackToDashboard()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Enviar Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // Configurar formulario de solicitar asesoría
  setupRequestTutoringForm(user, groupId) {
    const form = document.getElementById('tutoring-request-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        Loading.show();
        const response = await tutoringRequestsAPI.create({
          groupId,
          tema: document.getElementById('request-tema').value,
          fechaPropuesta: document.getElementById('request-fecha').value,
          horaInicioPropuesta: document.getElementById('request-hora-inicio').value,
          horaFinPropuesta: document.getElementById('request-hora-fin').value,
          tutorId: document.getElementById('request-tutor').value || null
        });
        if (response.success) {
          Notification.success('Solicitud enviada exitosamente');
          this.goBackToDashboard();
        } else {
          Notification.error(response.message || 'Error al enviar solicitud');
        }
      } catch (error) {
        Notification.error('Error al enviar solicitud');
      } finally {
        Loading.hide();
      }
    });
  }

  // Mostrar formulario de solicitar asesoría (Estudiante)
  async showRequestTutoringModal(groupId) {
    const user = authService.getCurrentUser();
    if (!user) return;
    
    this.currentView = 'request-tutoring';
    this.currentGroupId = groupId;
    await this.loadDashboardContent(user);
  }

  // Volver al dashboard
  goBackToDashboard() {
    this.currentView = 'dashboard';
    this.currentGroupId = null;
    const user = authService.getCurrentUser();
    if (user) {
      this.loadDashboardContent(user);
    }
  }

  // Aceptar solicitud de asesoría (Tutor)
  async acceptTutoringRequest(requestId) {
    if (!confirm('¿Aceptar esta solicitud de asesoría?')) return;
    try {
      Loading.show();
      const response = await tutoringRequestsAPI.acceptRequest(requestId);
      if (response.success) {
        Notification.success('Solicitud aceptada');
        this.render();
      } else {
        Notification.error(response.message || 'Error al aceptar solicitud');
      }
    } catch (error) {
      Notification.error('Error al aceptar solicitud');
    } finally {
      Loading.hide();
    }
  }

  // Rechazar solicitud de asesoría (Tutor)
  async rejectTutoringRequest(requestId) {
    const motivo = prompt('Motivo del rechazo (opcional):');
    try {
      Loading.show();
      const response = await tutoringRequestsAPI.rejectRequest(requestId, motivo);
      if (response.success) {
        Notification.success('Solicitud rechazada');
        this.render();
      } else {
        Notification.error(response.message || 'Error al rechazar solicitud');
      }
    } catch (error) {
      Notification.error('Error al rechazar solicitud');
    } finally {
      Loading.hide();
    }
  }

  // Renderizar formulario de solicitar asesorar materia (Tutor)
  renderRequestSubjectForm(user) {
    return `
      <div class="dashboard-form-container">
        <div class="card">
          <div class="card__header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2>Solicitar Asesorar Materia</h2>
                <p class="text-muted">Completa el formulario para solicitar asesorar una nueva materia</p>
              </div>
              <button class="btn btn-secondary" onclick="dashboardView.goBackToDashboard()">
                <i class="fas fa-arrow-left"></i> Volver
              </button>
            </div>
          </div>
          <div class="card__body">
            <form id="subject-request-form" class="dashboard-form">
              <div class="form-group">
                <label class="form-label">Materia</label>
                <input type="text" id="subject-materia" class="form-input" required placeholder="Ej: Matemáticas, Física, Química...">
              </div>
              <div class="form-group">
                <label class="form-label">Nivel</label>
                <input type="text" id="subject-nivel" class="form-input" placeholder="Ej: Básico, Intermedio, Avanzado">
              </div>
              <div class="form-group">
                <label class="form-label">Requisitos que cumples</label>
                <textarea id="subject-requisitos" class="form-input" rows="4" placeholder="Lista los requisitos que cumples para asesorar esta materia..."></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="dashboardView.goBackToDashboard()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Enviar Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // Configurar formulario de solicitar asesorar materia
  setupRequestSubjectForm(user) {
    const form = document.getElementById('subject-request-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        Loading.show();
        const response = await tutorRequestsAPI.createSubjectRequest({
          materia: document.getElementById('subject-materia').value,
          nivel: document.getElementById('subject-nivel').value || null,
          requisitos: document.getElementById('subject-requisitos').value || null
        });
        if (response.success) {
          Notification.success('Solicitud enviada exitosamente');
          this.goBackToDashboard();
        } else {
          Notification.error(response.message || 'Error al enviar solicitud');
        }
      } catch (error) {
        Notification.error('Error al enviar solicitud');
      } finally {
        Loading.hide();
      }
    });
  }

  // Mostrar formulario de solicitar asesorar materia (Tutor)
  async showSubjectRequestModal() {
    const user = authService.getCurrentUser();
    if (!user) return;
    
    this.currentView = 'request-subject';
    await this.loadDashboardContent(user);
  }

  // Mostrar modal para solicitar apoyo del profesor (Tutor)
  async showTeacherSupportModal(groupId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Solicitar Apoyo del Profesor</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="teacher-support-form">
            <div class="form-group">
              <label>Tema</label>
              <input type="text" id="support-tema" class="form-input" required>
            </div>
            <div class="form-group">
              <label>Fecha propuesta</label>
              <input type="date" id="support-fecha" class="form-input" required>
            </div>
            <div class="form-group">
              <label>Hora inicio</label>
              <input type="time" id="support-hora-inicio" class="form-input" required>
            </div>
            <div class="form-group">
              <label>Hora fin</label>
              <input type="time" id="support-hora-fin" class="form-input" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Enviar Solicitud</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('teacher-support-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        Loading.show();
        const response = await tutorRequestsAPI.createTeacherSupportRequest({
          groupId,
          tema: document.getElementById('support-tema').value,
          fechaPropuesta: document.getElementById('support-fecha').value,
          horaInicioPropuesta: document.getElementById('support-hora-inicio').value,
          horaFinPropuesta: document.getElementById('support-hora-fin').value
        });
        if (response.success) {
          Notification.success('Solicitud enviada exitosamente');
          modal.remove();
          this.render();
        } else {
          Notification.error(response.message || 'Error al enviar solicitud');
        }
      } catch (error) {
        Notification.error('Error al enviar solicitud');
      } finally {
        Loading.hide();
      }
    });
  }

  // Aceptar solicitud de apoyo (Profesor)
  async acceptTeacherSupportRequest(requestId) {
    if (!confirm('¿Aceptar esta solicitud de apoyo?')) return;
    try {
      Loading.show();
      const response = await tutorRequestsAPI.acceptTeacherSupportRequest(requestId);
      if (response.success) {
        Notification.success('Solicitud aceptada');
        this.render();
      } else {
        Notification.error(response.message || 'Error al aceptar solicitud');
      }
    } catch (error) {
      Notification.error('Error al aceptar solicitud');
    } finally {
      Loading.hide();
    }
  }

  // Rechazar solicitud de apoyo (Profesor)
  async rejectTeacherSupportRequest(requestId) {
    const motivo = prompt('Motivo del rechazo (opcional):');
    try {
      Loading.show();
      const response = await tutorRequestsAPI.rejectTeacherSupportRequest(requestId, motivo);
      if (response.success) {
        Notification.success('Solicitud rechazada');
        this.render();
      } else {
        Notification.error(response.message || 'Error al rechazar solicitud');
      }
    } catch (error) {
      Notification.error('Error al rechazar solicitud');
    } finally {
      Loading.hide();
    }
  }

  // Aceptar solicitud de materia (Admin)
  async acceptSubjectRequest(requestId) {
    if (!confirm('¿Aceptar esta solicitud de materia?')) return;
    try {
      Loading.show();
      const response = await tutorRequestsAPI.acceptSubjectRequest(requestId);
      if (response.success) {
        Notification.success('Solicitud aceptada');
        this.render();
      } else {
        Notification.error(response.message || 'Error al aceptar solicitud');
      }
    } catch (error) {
      Notification.error('Error al aceptar solicitud');
    } finally {
      Loading.hide();
    }
  }

  // Rechazar solicitud de materia (Admin)
  async rejectSubjectRequest(requestId) {
    const motivo = prompt('Motivo del rechazo (opcional):');
    try {
      Loading.show();
      const response = await tutorRequestsAPI.rejectSubjectRequest(requestId, motivo);
      if (response.success) {
        Notification.success('Solicitud rechazada');
        this.render();
      } else {
        Notification.error(response.message || 'Error al rechazar solicitud');
      }
    } catch (error) {
      Notification.error('Error al rechazar solicitud');
    } finally {
      Loading.hide();
    }
  }

  // Mostrar modal para crear grupo (Admin)
  showCreateGroupModal() {
    Notification.info('Funcionalidad de crear grupo: usar el endpoint /api/groups POST');
  }

  // Mostrar modal para asignar grupo (Admin)
  showAssignGroupModal(groupId) {
    Notification.info('Funcionalidad de asignar grupo: usar los endpoints de miembros y tutores');
  }
}

const dashboardView = new DashboardView();
// Hacer dashboardView disponible globalmente para los onclick
window.dashboardView = dashboardView;

export default dashboardView;


