import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Vista de Sesiones
 * - Estudiante: registro de sesiones por grupo, detalles y calendario básico
 * - Tutor: listado de grupos y panel para solicitudes (solo layout, sin backend aún)
 * - Profesor: vista de sesiones por grupo (layout de control, sin backend específico)
 */
class SessionsView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Sesiones</h1>
          <p class="text-muted">Gestiona y revisa tus sesiones de asesoría.</p>
        </div>
        <div class="card__body">
          <div id="sessions-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadSessions(user);
    } catch (error) {
      console.error(error);
      Notification.error('Error al cargar sesiones');
    } finally {
      Loading.hide();
    }
  }

  async loadSessions(user) {
    const content = document.getElementById('sessions-content');

    try {
      const [groupsRes, sessionsRes] = await Promise.allSettled([
        groupsAPI.getAll(),
        sessionsAPI.getAll()
      ]);

      const groups = groupsRes.status === 'fulfilled' && groupsRes.value.success
        ? groupsRes.value.data
        : [];
      const sessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.success
        ? sessionsRes.value.data
        : [];

      if (user.role === 'Estudiante') {
        content.innerHTML = this.renderStudentSessions(groups, sessions);
        this.attachStudentListeners(groups, sessions);
      } else if (user.role === 'Tutor') {
        content.innerHTML = this.renderTutorSessions(groups, sessions);
        this.attachTutorListeners(groups, sessions);
      } else if (user.role === 'Profesor') {
        content.innerHTML = this.renderProfessorSessions(groups, sessions);
      } else {
        content.innerHTML = `
          <p class="text-muted">La vista de sesiones detalladas está pensada para Estudiantes, Tutores y Profesores.</p>
        `;
      }
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar sesiones</p>';
    }
  }

  // ===== Estudiante =====

  renderStudentSessions(groups, sessions) {
    if (!groups.length) {
      return '<p class="text-muted">No perteneces a ningún grupo aún.</p>';
    }

    const sessionsByGroup = groups.map(group => {
      const groupSessions = sessions.filter(s => s.groupId === group.id);
      return { group, sessions: groupSessions };
    });

    const groupsHTML = sessionsByGroup.map(({ group, sessions }) => `
      <div class="group-card" data-group-id="${group.id}">
        <div class="group-card__header">
          <div class="group-card__info">
            <h3>${group.nombre}</h3>
            <span class="text-muted">Profesor: ${group.profesorName || 'Sin asignar'}</span>
          </div>
          <button class="btn btn-secondary btn-sm toggle-details-btn" data-group-id="${group.id}">
            <span class="toggle-text">Detalles</span>
            <span class="toggle-icon">▼</span>
          </button>
        </div>
        <div class="group-card__details-panel" id="details-panel-${group.id}" style="display: none;">
          <div class="group-card__details-content">
            ${this.renderStudentGroupDetails(group, sessions)}
          </div>
        </div>
      </div>
    `).join('');

    const calendarHTML = this.renderStudentCalendar(sessionsByGroup);

    return `
      <div class="sessions-student">
        <h2 class="mt-1">Sesiones por grupo</h2>
        <div class="groups-list mt-2">
          ${groupsHTML}
        </div>
        <h2 class="mt-3">Calendario de sesiones agendadas</h2>
        ${calendarHTML}
      </div>
    `;
  }

  renderStudentGroupDetails(group, sessions) {
    const upcomingSessions = sessions; // En el futuro se puede filtrar por estado/fecha

    const scheduleTable = `
      <h4>Horario de asesorías</h4>
      <p class="text-muted">
        El detalle de días/horarios por disponibilidad del tutor se configurará cuando se integre con el backend.
      </p>
      <div class="table-container mt-1">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora inicio</th>
              <th>Hora fin</th>
              <th>Tema</th>
            </tr>
          </thead>
          <tbody>
            ${upcomingSessions.length ? upcomingSessions.map(s => `
              <tr>
                <td>${formatDate(s.fecha)}</td>
                <td>${formatTime(s.horaInicio)}</td>
                <td>${formatTime(s.horaFin)}</td>
                <td>${s.tema || '-'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" class="text-muted">No hay sesiones programadas para este grupo.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;

    const requestForm = `
      <h4 class="mt-2">Solicitar asesoría</h4>
      <p class="text-muted">
        Completa el formulario para solicitar una asesoría al tutor del grupo. 
        La solicitud será enviada para aprobación (pendiente integración con backend).
      </p>
      <form class="request-session-form" data-group-id="${group.id}">
        <div class="form-group">
          <label class="form-label">Tema de la asesoría</label>
          <input type="text" class="form-input" name="tema" required>
        </div>
        <div class="form-group">
          <label class="form-label">Horario deseado</label>
          <input type="datetime-local" class="form-input" name="fechaHora" required>
          <small class="form-text text-muted">
            Debe coincidir con un horario válido de asesorías según la disponibilidad del tutor.
          </small>
        </div>
        <button type="submit" class="btn btn-primary btn-sm">Solicitar asesoría</button>
      </form>
    `;

    const historyTable = `
      <h4 class="mt-2">Historial de asesorías</h4>
      <p class="text-muted">
        Se mostrarán aquí las asesorías aprobadas para este grupo (checklist pendiente de integración con backend).
      </p>
      <div class="table-container mt-1">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Tema</th>
              <th>Asistió</th>
            </tr>
          </thead>
          <tbody>
            ${upcomingSessions.length ? upcomingSessions.map(s => `
              <tr>
                <td>${formatDate(s.fecha)}</td>
                <td>${formatTime(s.horaInicio)} - ${formatTime(s.horaFin)}</td>
                <td>${s.tema || '-'}</td>
                <td>
                  <input type="checkbox" disabled>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" class="text-muted">Aún no hay asesorías registradas para este grupo.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;

    return `
      <div class="group-details">
        <h4>Ubicación</h4>
        <p class="text-muted">
          La ubicación de las asesorías (por ejemplo, "Salón 4") se configurará cuando exista el campo correspondiente en la base de datos.
        </p>
        ${scheduleTable}
        ${requestForm}
        ${historyTable}
      </div>
    `;
  }

  renderStudentCalendar(sessionsByGroup) {
    const allSessions = sessionsByGroup.flatMap(({ group, sessions }) =>
      sessions.map(s => ({ ...s, groupNombre: group.nombre }))
    );

    if (!allSessions.length) {
      return '<p class="text-muted">No tienes sesiones agendadas aún.</p>';
    }

    return `
      <div class="table-container mt-2">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Grupo</th>
              <th>Tema</th>
            </tr>
          </thead>
          <tbody>
            ${allSessions.map(s => `
              <tr>
                <td>${formatDate(s.fecha)}</td>
                <td>${formatTime(s.horaInicio)} - ${formatTime(s.horaFin)}</td>
                <td>${s.groupNombre}</td>
                <td>${s.tema || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  attachStudentListeners(groups, sessions) {
    const toggleButtons = document.querySelectorAll('.toggle-details-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const groupId = parseInt(e.currentTarget.getAttribute('data-group-id'), 10);
        this.toggleDetailsPanel(groupId);
      });
    });

    // Formularios de solicitud (solo UI, sin backend aún)
    const forms = document.querySelectorAll('.request-session-form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const groupId = form.getAttribute('data-group-id');
        const formData = new FormData(form);
        const tema = formData.get('tema');
        const fechaHora = formData.get('fechaHora');

        Notification.info(
          `Solicitud de asesoría enviada (demo): Tema "${tema}" para el grupo ${groupId} en ${fechaHora}.`
        );
      });
    });
  }

  toggleDetailsPanel(groupId) {
    const panel = document.getElementById(`details-panel-${groupId}`);
    const button = document.querySelector(`.toggle-details-btn[data-group-id="${groupId}"]`);
    if (!panel || !button) return;

    const text = button.querySelector('.toggle-text');
    const icon = button.querySelector('.toggle-icon');

    if (panel.style.display === 'none' || panel.style.display === '') {
      panel.style.display = 'block';
      if (text) text.textContent = 'Ocultar';
      if (icon) icon.textContent = '▲';
    } else {
      panel.style.display = 'none';
      if (text) text.textContent = 'Detalles';
      if (icon) icon.textContent = '▼';
    }
  }

  // ===== Tutor =====

  renderTutorSessions(groups, sessions) {
    return `
      <div class="sessions-tutor">
        <h2>Mis grupos</h2>
        <p class="text-muted">
          Selecciona un grupo para ver las solicitudes de asesoría recibidas.
          La integración con backend para solicitudes aún está pendiente; esta vista muestra el diseño esperado.
        </p>
        <div class="table-container mt-2">
          <table class="table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${groups.length ? groups.map(g => `
                <tr>
                  <td>${g.nombre}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm open-tutor-group" data-group-id="${g.id}">
                      Ver solicitudes
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="2" class="text-muted">No tienes grupos asignados.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
        <div id="tutor-group-panel" class="mt-3" style="display:none;"></div>
      </div>
    `;
  }

  attachTutorListeners(groups, sessions) {
    const buttons = document.querySelectorAll('.open-tutor-group');
    const panel = document.getElementById('tutor-group-panel');

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const groupId = parseInt(e.currentTarget.getAttribute('data-group-id'), 10);
        const group = groups.find(g => g.id === groupId);
        if (!group || !panel) return;

        panel.style.display = 'block';
        panel.innerHTML = this.renderTutorGroupPanel(group);
        this.attachTutorPanelListeners(group);
      });
    });
  }

  renderTutorGroupPanel(group) {
    return `
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Solicitudes de asesoría - ${group.nombre}</h3>
        </div>
        <div class="card__body">
          <p class="text-muted">
            Aquí se listarán las solicitudes de asesoría de los estudiantes de este grupo.
            Cada fila mostrará el estudiante, horario y tema, con botones para aceptar o rechazar.
          </p>
          <div class="table-container mt-2">
            <table class="table">
              <thead>
                <tr>
                  <th>Estudiante / Grupo</th>
                  <th>Horario solicitado</th>
                  <th>Tema</th>
                  <th>Aceptar</th>
                  <th>Rechazar</th>
                </tr>
              </thead>
              <tbody id="tutor-requests-body">
                <tr>
                  <td colspan="5" class="text-muted">
                    Aún no hay solicitudes registradas (backend pendiente).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  attachTutorPanelListeners(group) {
    // Lugar para conectar en el futuro las acciones de aceptar/rechazar con el backend.
  }

  // ===== Profesor =====

  renderProfessorSessions(groups, sessions) {
    const rows = sessions.map(s => {
      const group = groups.find(g => g.id === s.groupId);
      return {
        ...s,
        groupNombre: group ? group.nombre : `Grupo #${s.groupId}`
      };
    });

    return `
      <div class="sessions-professor">
        <h2>Sesiones por grupo</h2>
        <p class="text-muted">
          Control de sesiones programadas y estatus de aceptación del tutor.
          Los detalles de justificación y contacto se integrarán con el backend más adelante.
        </p>
        <div class="table-container mt-2">
          <table class="table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Tema</th>
                <th>Tutor / Estado</th>
                <th>Justificación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(s => `
                <tr>
                  <td>${s.groupNombre}</td>
                  <td>${formatDate(s.fecha)}</td>
                  <td>${formatTime(s.horaInicio)} - ${formatTime(s.horaFin)}</td>
                  <td>${s.tema || '-'}</td>
                  <td>
                    <span class="text-muted">Tutor asignado (pendiente de integración)</span>
                  </td>
                  <td>
                    <span class="text-muted">Justificación (si la hay)</span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" disabled>
                      Contactar tutor
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" class="text-muted">No hay sesiones registradas.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

export default new SessionsView();


