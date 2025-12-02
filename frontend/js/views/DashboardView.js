import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import { adminAPI } from '../api/admin.js';
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
        html = await this.renderAdminDashboard(groups, sessions);
      } else if (user.role === 'Profesor') {
        html = await this.renderProfesorDashboard(groups, sessions);
      } else if (user.role === 'Tutor') {
        html = await this.renderTutorDashboard(groups, sessions);
      } else {
        html = await this.renderEstudianteDashboard(groups, sessions);
      }

      content.innerHTML = html;
      
      // Configurar funciones globales
      this.setupGlobalFunctions();
      
      // Configurar event listeners según el rol
      this.setupEventListeners(user.role);
    } catch (error) {
      content.innerHTML = '<p class="text-muted">Error al cargar datos</p>';
    }
  }

  setupGlobalFunctions() {
    // Funciones globales para botones onclick
    window.verTemario = (materia) => {
      Notification.info(`Temario de ${materia} - Próximamente`);
      // TODO: Implementar vista de temario
    };

    window.tomarAlumno = (groupId) => {
      if (confirm('¿Deseas tomar este alumno/grupo como tutor?')) {
        Notification.info(`Tomando grupo ${groupId} - Próximamente`);
        // TODO: Implementar API para asignar tutor a grupo
      }
    };
  }

  setupEventListeners(role) {
    // Estudiante: Solicitar asesoría
    const btnSolicitar = document.getElementById('btn-solicitar-asesoria');
    if (btnSolicitar) {
      btnSolicitar.addEventListener('click', () => {
        this.showSolicitarAsesoriaModal();
      });
    }

    // Profesor: Agregar materia
    const btnAgregarMateria = document.getElementById('btn-agregar-materia');
    if (btnAgregarMateria) {
      btnAgregarMateria.addEventListener('click', () => {
        this.showAgregarMateriaModal();
      });
    }

    // Admin: Agregar grupo
    const btnAgregarGrupo = document.getElementById('btn-agregar-grupo');
    if (btnAgregarGrupo) {
      btnAgregarGrupo.addEventListener('click', () => {
        this.showAgregarGrupoModal();
      });
    }

    // Admin: Asignar asesor
    const btnAsignarAsesor = document.getElementById('btn-asignar-asesor');
    if (btnAsignarAsesor) {
      btnAsignarAsesor.addEventListener('click', () => {
        this.showAsignarAsesorModal();
      });
    }

    // Admin: Asignar alumno
    const btnAsignarAlumno = document.getElementById('btn-asignar-alumno');
    if (btnAsignarAlumno) {
      btnAsignarAlumno.addEventListener('click', () => {
        this.showAsignarAlumnoModal();
      });
    }

    // Admin: Gestionar usuarios
    const btnGestionarUsuarios = document.getElementById('btn-gestionar-usuarios');
    if (btnGestionarUsuarios) {
      btnGestionarUsuarios.addEventListener('click', () => {
        window.location.hash = '#/admin/users';
      });
    }
  }

  showSolicitarAsesoriaModal() {
    Notification.info('Funcionalidad de solicitar asesoría - Próximamente');
    // TODO: Implementar modal para solicitar asesoría
  }

  showAgregarMateriaModal() {
    const materia = prompt('Ingresa el nombre de la materia:');
    if (materia) {
      Notification.info(`Materia "${materia}" agregada - Próximamente`);
      // TODO: Implementar API para agregar materia al profesor
    }
  }

  showAgregarGrupoModal() {
    const nombre = prompt('Nombre del grupo:');
    if (nombre) {
      const descripcion = prompt('Descripción (opcional):');
      groupsAPI.create({ nombre, descripcion: descripcion || null })
        .then(res => {
          if (res.success) {
            Notification.success('Grupo creado exitosamente');
            this.render(); // Recargar vista
          } else {
            Notification.error(res.message || 'Error al crear grupo');
          }
        })
        .catch(error => {
          Notification.error('Error al crear grupo');
          console.error(error);
        });
    }
  }

  showAsignarAsesorModal() {
    Notification.info('Funcionalidad de asignar asesor - Próximamente');
    // TODO: Implementar modal para asignar asesor a grupo
  }

  showAsignarAlumnoModal() {
    Notification.info('Funcionalidad de asignar alumno - Próximamente');
    // TODO: Implementar modal para asignar alumno a grupo
  }

  async renderAdminDashboard(groups, sessions) {
    // Obtener estadísticas del admin
    let stats = { users: 0, groups: groups.length, sessions: sessions.length, tutors: 0 };
    let reports = { topTutors: [], sessionsByMonth: [] };
    
    try {
      const statsRes = await adminAPI.getStats();
      if (statsRes.success) {
        stats = statsRes.data;
      }
      const reportsRes = await adminAPI.getReports();
      if (reportsRes.success) {
        reports = reportsRes.data;
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }

    return `
      <div class="dashboard-admin">
        <div class="dashboard-grid">
          <div class="stat-card">
            <h3><i class="fas fa-users"></i> Usuarios</h3>
            <p class="stat-number">${stats.users}</p>
          </div>
          <div class="stat-card">
            <h3><i class="fas fa-user-friends"></i> Grupos</h3>
            <p class="stat-number">${stats.groups}</p>
          </div>
          <div class="stat-card">
            <h3><i class="fas fa-calendar"></i> Sesiones</h3>
            <p class="stat-number">${stats.sessions}</p>
          </div>
          <div class="stat-card">
            <h3><i class="fas fa-chalkboard-teacher"></i> Tutores</h3>
            <p class="stat-number">${stats.tutors}</p>
          </div>
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-chart-line"></i> Gráficas y Estadísticas</h3>
          <div class="charts-container">
            <div class="chart-card">
              <h4>Sesiones por Mes</h4>
              <div id="chart-sessions" class="chart-placeholder">
                <canvas id="sessionsChart"></canvas>
              </div>
            </div>
            <div class="chart-card">
              <h4>Top Tutores</h4>
              <div id="chart-tutors" class="chart-placeholder">
                ${reports.topTutors.length > 0 
                  ? `<ul class="list-group">${reports.topTutors.slice(0, 5).map(t => `
                      <li class="list-item">
                        ${t.nombre} - Rating: ${t.ratingPromedio || 0}/5
                      </li>
                    `).join('')}</ul>`
                  : '<p class="text-muted">No hay datos disponibles</p>'
                }
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-cog"></i> Gestión del Sistema</h3>
          <div class="admin-actions">
            <button id="btn-agregar-grupo" class="btn btn-primary">
              <i class="fas fa-plus"></i> Agregar Grupo
            </button>
            <button id="btn-asignar-asesor" class="btn btn-primary">
              <i class="fas fa-user-tie"></i> Asignar Asesor
            </button>
            <button id="btn-asignar-alumno" class="btn btn-primary">
              <i class="fas fa-user-plus"></i> Asignar Alumno
            </button>
            <button id="btn-gestionar-usuarios" class="btn btn-secondary">
              <i class="fas fa-users-cog"></i> Gestionar Usuarios
            </button>
          </div>
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-list"></i> Actividad Reciente</h3>
          <div class="activity-list">
            <p><strong>Grupos activos:</strong> ${groups.filter(g => g.estado === 'activo').length}</p>
            <p><strong>Sesiones programadas:</strong> ${sessions.filter(s => s.estado === 'programada').length}</p>
            <p><strong>Sesiones en curso:</strong> ${sessions.filter(s => s.estado === 'en_curso').length}</p>
          </div>
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-table"></i> Todos los Grupos</h3>
          ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No hay grupos registrados</p>'}
        </div>
      </div>
    `;
  }

  async renderProfesorDashboard(groups, sessions) {
    // Obtener materias del profesor (desde grupos)
    const materias = [...new Set(groups.map(g => g.nombre).filter(Boolean))];
    const MAX_MATERIAS = 5; // Límite de materias

    return `
      <div class="dashboard-profesor">
        <div class="dashboard-card">
          <h3><i class="fas fa-book-open"></i> Elegir Materias para Impartir</h3>
          <p class="text-muted mb-3">Selecciona las materias que deseas impartir (Máximo: ${MAX_MATERIAS})</p>
          <div class="materias-seleccionadas mb-3">
            <p><strong>Materias actuales:</strong> ${materias.length} / ${MAX_MATERIAS}</p>
            ${materias.length > 0 
              ? `<ul class="list-group">${materias.map(m => `<li class="list-item">${m}</li>`).join('')}</ul>`
              : '<p class="text-muted">No has seleccionado materias aún</p>'
            }
          </div>
          <button id="btn-agregar-materia" class="btn btn-primary" ${materias.length >= MAX_MATERIAS ? 'disabled' : ''}>
            <i class="fas fa-plus"></i> Agregar Materia
          </button>
          ${materias.length >= MAX_MATERIAS ? '<p class="text-warning mt-2"><i class="fas fa-exclamation-triangle"></i> Has alcanzado el límite de materias</p>' : ''}
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-list-alt"></i> Temarios de las Materias</h3>
          ${materias.length > 0 
            ? `<div class="temarios-list">${materias.map(materia => `
                <div class="temario-card">
                  <h4>${materia}</h4>
                  <button class="btn btn-secondary btn-sm" onclick="verTemario('${materia}')">
                    <i class="fas fa-eye"></i> Ver Temario
                  </button>
                </div>
              `).join('')}</div>`
            : '<p class="text-muted">Selecciona materias para ver sus temarios</p>'
          }
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-users"></i> Mis Grupos (${groups.length})</h3>
          ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No tienes grupos asignados</p>'}
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-calendar"></i> Próximas Sesiones</h3>
          ${sessions.length > 0 ? this.renderSessionsList(sessions.slice(0, 5)) : '<p class="text-muted">No hay sesiones programadas</p>'}
        </div>
      </div>
    `;
  }

  async renderTutorDashboard(groups, sessions) {
    // Obtener grupos que solicitan tutor (sesiones sin tutor asignado)
    const gruposSinTutor = groups.filter(g => {
      const groupSessions = sessions.filter(s => s.groupId === g.id);
      return groupSessions.some(s => !s.tutorId);
    });

    return `
      <div class="dashboard-tutor">
        <div class="dashboard-card">
          <h3><i class="fas fa-user-graduate"></i> Alumnos que Solicitan Tutor</h3>
          ${gruposSinTutor.length > 0 
            ? `<div class="solicitudes-list">${gruposSinTutor.map(grupo => {
                const solicitudes = sessions.filter(s => s.groupId === grupo.id && !s.tutorId);
                return `
                  <div class="solicitud-card">
                    <h4>${grupo.nombre}</h4>
                    <p class="text-muted">${grupo.descripcion || 'Sin descripción'}</p>
                    <p><strong>Solicitudes pendientes:</strong> ${solicitudes.length}</p>
                    <button class="btn btn-primary btn-sm" onclick="tomarAlumno(${grupo.id})">
                      <i class="fas fa-hand-paper"></i> Tomar Alumno
                    </button>
                  </div>
                `;
              }).join('')}</div>`
            : '<p class="text-muted">No hay solicitudes de tutoría pendientes</p>'
          }
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-calendar-check"></i> Mis Sesiones Asignadas (${sessions.length})</h3>
          ${sessions.length > 0 
            ? this.renderSessionsList(sessions)
            : '<p class="text-muted">No tienes sesiones asignadas</p>'
          }
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-users"></i> Mis Grupos</h3>
          ${groups.length > 0 ? this.renderGroupsList(groups) : '<p class="text-muted">No estás asignado a ningún grupo</p>'}
        </div>
      </div>
    `;
  }

  async renderEstudianteDashboard(groups, sessions) {
    // Obtener información detallada de grupos con materias y horarios
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        try {
          const membersRes = await groupsAPI.getMembers(group.id);
          const groupSessions = sessions.filter(s => s.groupId === group.id);
          return {
            ...group,
            members: membersRes.success ? membersRes.data : [],
            sessions: groupSessions
          };
        } catch (error) {
          return { ...group, members: [], sessions: [] };
        }
      })
    );

    // Extraer materias únicas de las sesiones
    const materias = [...new Set(sessions.map(s => s.tema).filter(Boolean))];

    return `
      <div class="dashboard-estudiante">
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3><i class="fas fa-book"></i> Mis Materias</h3>
            ${materias.length > 0 
              ? `<ul class="list-group">${materias.map(m => `<li class="list-item">${m}</li>`).join('')}</ul>`
              : '<p class="text-muted">No tienes materias asignadas</p>'
            }
          </div>

          <div class="dashboard-card">
            <h3><i class="fas fa-users"></i> Mis Grupos (${groups.length})</h3>
            ${groups.length > 0 
              ? `<div class="groups-grid">${groupsWithDetails.map(g => `
                  <div class="group-card">
                    <h4>${g.nombre}</h4>
                    <p class="text-muted">${g.descripcion || 'Sin descripción'}</p>
                    <p><strong>Miembros:</strong> ${g.members.length}</p>
                    <p><strong>Sesiones:</strong> ${g.sessions.length}</p>
                    <a href="#/groups/${g.id}" class="btn btn-secondary btn-sm mt-2">Ver Detalles</a>
                  </div>
                `).join('')}</div>`
              : '<p class="text-muted">No estás en ningún grupo</p>'
            }
          </div>
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-calendar-alt"></i> Horario de Materias</h3>
          ${sessions.length > 0 
            ? this.renderScheduleTable(sessions)
            : '<p class="text-muted">No hay sesiones programadas</p>'
          }
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-chalkboard-teacher"></i> Solicitar Asesoría</h3>
          <p class="text-muted mb-3">Solicita una sesión de asesoría para tu grupo</p>
          <button id="btn-solicitar-asesoria" class="btn btn-primary">
            <i class="fas fa-plus"></i> Nueva Solicitud de Asesoría
          </button>
        </div>

        <div class="dashboard-card mt-3">
          <h3><i class="fas fa-clock"></i> Próximas Sesiones</h3>
          ${sessions.length > 0 
            ? this.renderSessionsList(sessions.slice(0, 5))
            : '<p class="text-muted">No hay sesiones programadas</p>'
          }
        </div>
      </div>
    `;
  }

  renderScheduleTable(sessions) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const scheduleByDay = {};
    
    sessions.forEach(session => {
      const date = new Date(session.fecha);
      const dayName = days[date.getDay()];
      if (!scheduleByDay[dayName]) {
        scheduleByDay[dayName] = [];
      }
      scheduleByDay[dayName].push(session);
    });

    return `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Hora</th>
              <th>Materia/Tema</th>
              <th>Tutor/Profesor</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(scheduleByDay).map(([day, daySessions]) =>
              daySessions.map((session, idx) => `
                <tr>
                  ${idx === 0 ? `<td rowspan="${daySessions.length}">${day}</td>` : ''}
                  <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                  <td>${session.tema || '-'}</td>
                  <td>${session.tutorName || 'Por asignar'}</td>
                  <td><span class="badge badge--${getStatusColor(session.estado)}">${getStatusName(session.estado)}</span></td>
                </tr>
              `).join('')
            ).join('')}
          </tbody>
        </table>
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
}

// Funciones globales para botones onclick - se definen después de que el módulo se carga
// Estas funciones se asignan cuando se renderiza el dashboard

export default new DashboardView();


