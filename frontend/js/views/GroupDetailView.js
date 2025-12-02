import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Vista de Detalles del Grupo/Materia
 */
class GroupDetailView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    // Obtener ID del grupo de la URL
    const hash = window.location.hash;
    const match = hash.match(/#\/group\/(\d+)/);
    if (!match) {
      Notification.error('ID de grupo inválido');
      window.location.hash = '#/dashboard';
      return;
    }

    const groupId = parseInt(match[1]);
    const container = document.getElementById('view-container');

    container.innerHTML = `
      <div class="group-detail-container">
        <div class="group-detail-header">
          <button class="btn btn-secondary" id="back-btn">← Volver</button>
          <h1>Detalles de la Materia</h1>
        </div>
        
        <div id="group-detail-content" class="group-detail-content">
          <div class="spinner"></div>
        </div>
      </div>
    `;

    // Event listener para botón volver
    document.getElementById('back-btn').addEventListener('click', () => {
      window.location.hash = '#/dashboard';
    });

    try {
      Loading.show();
      await this.loadGroupDetails(groupId);
    } catch (error) {
      Notification.error('Error al cargar los detalles del grupo');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadGroupDetails(groupId) {
    const content = document.getElementById('group-detail-content');
    const user = authService.getCurrentUser();

    try {
      // Obtener información del grupo
      const groupRes = await groupsAPI.getById(parseInt(groupId));
      console.log('Respuesta del grupo:', groupRes);
      
      if (!groupRes || (!groupRes.success && !groupRes.data)) {
        throw new Error(groupRes?.message || 'Error al cargar el grupo');
      }

      const group = groupRes.data || groupRes;
      const materia = group.nombre || `Materia id ${groupId}`;

      // Obtener sesiones del grupo
      const sessionsRes = await sessionsAPI.getAll();
      console.log('Sesiones obtenidas:', sessionsRes);
      
      let allSessions = [];
      if (sessionsRes.success && sessionsRes.data) {
        allSessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      } else if (Array.isArray(sessionsRes)) {
        allSessions = sessionsRes;
      } else if (sessionsRes.data && Array.isArray(sessionsRes.data)) {
        allSessions = sessionsRes.data;
      }
      
      const groupSessions = allSessions.filter(s => {
        // Asegurarse de que el groupId coincida (puede venir como número o string)
        const sessionGroupId = parseInt(s.groupId || s.group_id || 0);
        const targetGroupId = parseInt(groupId);
        return sessionGroupId === targetGroupId;
      });
      
      console.log('Sesiones del grupo filtradas:', groupSessions);

      // Obtener información adicional
      const profesor = group.profesor || { nombre: 'Sin asignar' };
      const salon = group.salon || 'Sin asignar'; // Campo que puede no existir en BD
      
      // Obtener horario (puede venir del grupo o calcularse desde las sesiones)
      const horario = this.extractHorario(groupSessions);

      content.innerHTML = `
        <div class="group-detail-card">
          <!-- Detalles -->
          <section class="detail-section">
            <h2 class="detail-section__title">Detalles</h2>
            <div class="detail-section__content">
              <div class="detail-field">
                <label class="detail-label">Nombre de la materia:</label>
                <div class="detail-value">${materia}</div>
              </div>
            </div>
          </section>

          <!-- Salón -->
          <section class="detail-section">
            <h2 class="detail-section__title">Salón</h2>
            <div class="detail-section__content">
              <div class="detail-value">${salon}</div>
            </div>
          </section>

          <!-- Horario -->
          <section class="detail-section">
            <h2 class="detail-section__title">Horario</h2>
            <div class="detail-section__content">
              <table class="horario-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  ${horario.map(h => `
                    <tr>
                      <td>${h.dia}</td>
                      <td>${h.hora}</td>
                    </tr>
                  `).join('')}
                  ${horario.length === 0 ? '<tr><td colspan="2" class="text-muted">No hay horario asignado</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </section>

          <!-- Sesiones -->
          <section class="detail-section">
            <h2 class="detail-section__title">Sesión</h2>
            <div class="detail-section__content">
              <div class="sessions-list" id="sessions-list">
                ${this.renderSessionsList(groupSessions, user)}
              </div>
            </div>
          </section>
        </div>
      `;

      // Agregar event listeners a los checkboxes
      if (user) {
        this.setupSessionCheckboxes(groupSessions, user);
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
      console.error('Error completo:', error.stack);
      content.innerHTML = `
        <div class="card">
          <div class="card__body">
            <p class="text-muted">Error al cargar los detalles del grupo</p>
            <p class="text-muted" style="font-size: 0.9rem; margin-top: var(--spacing-sm);">
              ${error.message || 'Error desconocido'}
            </p>
            <button class="btn btn-primary" onclick="window.location.hash='#/dashboard'" style="margin-top: var(--spacing-md);">
              Volver al Dashboard
            </button>
          </div>
        </div>
      `;
    }
  }

  extractHorario(sessions) {
    // Extraer horarios únicos de las sesiones programadas
    const horariosMap = new Map();
    
    sessions.forEach(session => {
      const fecha = new Date(session.fecha);
      const diaSemana = fecha.getDay();
      const diaNombre = this.getDiaNombre(diaSemana);
      const hora = `${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}`;
      
      const key = `${diaSemana}-${hora}`;
      if (!horariosMap.has(key)) {
        horariosMap.set(key, { dia: diaNombre, hora: hora });
      }
    });

    return Array.from(horariosMap.values());
  }

  getDiaNombre(diaSemana) {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[diaSemana];
  }

  renderSessionsList(sessions, user) {
    if (sessions.length === 0) {
      return '<p class="text-muted">No hay sesiones registradas</p>';
    }

    // Ordenar sesiones por fecha (más recientes primero)
    const sortedSessions = [...sessions].sort((a, b) => {
      const dateA = new Date(a.fecha);
      const dateB = new Date(b.fecha);
      return dateB - dateA;
    });

    return sortedSessions.map(session => {
      const fecha = new Date(session.fecha);
      const fechaStr = this.formatFechaCorta(fecha);
      const estado = session.estado || 'programada';
      const isCompleted = estado === 'completada';
      const notas = session.notas || '';
      
      // Determinar si el usuario puede marcar la sesión (solo tutores o profesores)
      const canMark = user.role === 'Tutor' || user.role === 'Profesor' || user.role === 'Admin';

      return `
        <div class="session-item">
          <div class="session-item__info">
            <div class="session-item__date">${fechaStr}</div>
            <div class="session-item__status">
              ${isCompleted ? '✓ Asistió' : '○ No asistió'}
              ${notas ? ` - ${notas}` : ''}
            </div>
          </div>
          ${canMark ? `
            <label class="session-checkbox">
              <input 
                type="checkbox" 
                data-session-id="${session.id}"
                ${isCompleted ? 'checked' : ''}
                class="session-checkbox__input"
              />
              <span class="session-checkbox__label">Ejecutada</span>
            </label>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  formatFechaCorta(fecha) {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    return `${mes}${dia}`;
  }

  formatFechaCompleta(fecha) {
    // Formato: "sep4", "sep7", "sep15"
    return this.formatFechaCorta(fecha);
  }

  setupSessionCheckboxes(sessions, user) {
    // Solo tutores, profesores y admins pueden marcar sesiones
    if (user.role !== 'Tutor' && user.role !== 'Profesor' && user.role !== 'Admin') {
      return;
    }

    const checkboxes = document.querySelectorAll('.session-checkbox__input');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const sessionId = parseInt(e.target.dataset.sessionId);
        const isChecked = e.target.checked;

        try {
          Loading.show();
          
          if (isChecked) {
            // Marcar como completada
            await sessionsAPI.complete(sessionId);
            Notification.success('Sesión marcada como ejecutada');
          } else {
            // Marcar como programada nuevamente
            await sessionsAPI.update(sessionId, { estado: 'programada' });
            Notification.success('Sesión desmarcada');
          }

          // Recargar la vista
          await this.loadGroupDetails(parseInt(window.location.hash.match(/#\/group\/(\d+)/)[1]));
        } catch (error) {
          console.error('Error actualizando sesión:', error);
          Notification.error('Error al actualizar la sesión');
          // Revertir el checkbox
          e.target.checked = !isChecked;
        } finally {
          Loading.hide();
        }
      });
    });
  }
}

export default new GroupDetailView();

