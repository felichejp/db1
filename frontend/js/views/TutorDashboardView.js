import authService from '../services/authService.js';
import { sessionsAPI } from '../api/sessions.js';
import { groupsAPI } from '../api/groups.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime, getStatusName, getStatusColor } from '../utils/helpers.js';

/**
 * Dashboard del Asesor (Tutor)
 * Muestra solicitudes de asesoría, grupos asignados y horario disponible
 */
class TutorDashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-title">Dashboard del Asesor</h1>
          <p class="dashboard-subtitle">Bienvenido, ${user.nombre}</p>
        </div>
      </div>

      <div class="dashboard-content">
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">📋</span>
              Solicitudes de Asesoría
            </h2>
          </div>
          <div id="tutoring-requests" class="requests-container">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">👥</span>
              Grupos Asignados
            </h2>
          </div>
          <div id="assigned-groups" class="groups-container">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">📅</span>
              Horario Disponible
            </h2>
            <button class="btn btn-secondary btn-sm" id="manage-availability-btn">
              Gestionar Horario
            </button>
          </div>
          <div id="availability-schedule" class="schedule-container">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadData();
      
      // Event listener para gestionar disponibilidad
      document.getElementById('manage-availability-btn')?.addEventListener('click', () => {
        this.manageAvailability();
      });
    } catch (error) {
      Notification.error('Error al cargar el dashboard');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadData() {
    try {
      // Obtener sesiones donde el usuario es tutor
      const sessionsRes = await sessionsAPI.getAll();
      const sessions = sessionsRes.success ? sessionsRes.data : [];
      
      // Filtrar sesiones pendientes (solicitudes)
      const pendingSessions = sessions.filter(s => 
        s.estado === 'pendiente' || s.estado === 'programada'
      );

      // Obtener grupos
      const groupsRes = await groupsAPI.getAll();
      const groups = groupsRes.success ? groupsRes.data : [];

      // Obtener disponibilidad del tutor
      const tutorId = await this.getTutorId();
      let availability = [];
      if (tutorId) {
        try {
          const availRes = await tutorsAPI.getAvailability(tutorId);
          availability = availRes.success ? availRes.data : [];
        } catch (error) {
          console.error('Error loading availability:', error);
        }
      }

      // Renderizar
      this.renderTutoringRequests(pendingSessions);
      this.renderAssignedGroups(groups);
      this.renderAvailability(availability);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  async getTutorId() {
    // Obtener el ID del tutor desde el perfil del usuario
    const user = authService.getCurrentUser();
    if (!user) return null;

    try {
      // Buscar el tutor asociado al usuario
      const tutorsRes = await tutorsAPI.getAll();
      const tutors = tutorsRes.success ? tutorsRes.data : [];
      const tutor = tutors.find(t => t.userId === user.id || t.email === user.email);
      return tutor ? tutor.id : null;
    } catch (error) {
      console.error('Error getting tutor ID:', error);
      return null;
    }
  }

  renderTutoringRequests(sessions) {
    const container = document.getElementById('tutoring-requests');
    
    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <p class="empty-state__message">No hay solicitudes de asesoría pendientes</p>
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
              <th>Grupo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(session => `
              <tr>
                <td>${formatDate(session.fecha)}</td>
                <td>${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</td>
                <td>${session.tema || '-'}</td>
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
                      onclick="window.tutorDashboard?.acceptRequest(${session.id})"
                      ${session.estado !== 'pendiente' ? 'disabled' : ''}
                    >
                      ✓ Aceptar
                    </button>
                    <button 
                      class="btn btn-danger btn-sm" 
                      onclick="window.tutorDashboard?.rejectRequest(${session.id})"
                      ${session.estado !== 'pendiente' ? 'disabled' : ''}
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

    window.tutorDashboard = this;
  }

  renderAssignedGroups(groups) {
    const container = document.getElementById('assigned-groups');
    
    if (groups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">👥</div>
          <p class="empty-state__message">No tienes grupos asignados</p>
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
          </div>
        </div>
        <div class="group-card__footer">
          <a href="#/groups/${group.id}" class="btn btn-primary btn-sm">Ver Grupo</a>
        </div>
      </div>
    `).join('');
  }

  renderAvailability(availability) {
    const container = document.getElementById('availability-schedule');
    
    if (availability.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📅</div>
          <p class="empty-state__message">No hay horarios disponibles registrados</p>
          <button class="btn btn-primary mt-2" onclick="window.tutorDashboard?.manageAvailability()">
            Agregar Horario
          </button>
        </div>
      `;
      return;
    }

    // Agrupar por día
    const byDay = {};
    availability.forEach(avail => {
      const day = avail.dia || 'No especificado';
      if (!byDay[day]) {
        byDay[day] = [];
      }
      byDay[day].push(avail);
    });

    container.innerHTML = Object.entries(byDay).map(([day, schedules]) => `
      <div class="schedule-day">
        <h3 class="schedule-day__title">${day}</h3>
        <div class="schedule-list">
          ${schedules.map(schedule => `
            <div class="schedule-item">
              <span class="schedule-time">
                ${formatTime(schedule.horaInicio)} - ${formatTime(schedule.horaFin)}
              </span>
              <button 
                class="btn btn-danger btn-xs" 
                onclick="window.tutorDashboard?.deleteAvailability(${schedule.id})"
              >
                Eliminar
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  async acceptRequest(sessionId) {
    try {
      Loading.show();
      const response = await sessionsAPI.update(sessionId, { estado: 'aceptada' });
      
      if (response.success) {
        Notification.success('Solicitud aceptada');
        await this.loadData();
      } else {
        Notification.error(response.message || 'Error al aceptar la solicitud');
      }
    } catch (error) {
      Notification.error('Error al aceptar la solicitud');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async rejectRequest(sessionId) {
    try {
      Loading.show();
      const response = await sessionsAPI.update(sessionId, { estado: 'rechazada' });
      
      if (response.success) {
        Notification.success('Solicitud rechazada');
        await this.loadData();
      } else {
        Notification.error(response.message || 'Error al rechazar la solicitud');
      }
    } catch (error) {
      Notification.error('Error al rechazar la solicitud');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async manageAvailability() {
    const tutorId = await this.getTutorId();
    if (!tutorId) {
      Notification.error('No se pudo identificar tu perfil de tutor');
      return;
    }

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    const content = `
      <div class="availability-form">
        <div class="form-group">
          <label class="form-label">Día de la Semana <span class="required">*</span></label>
          <select id="availability-day" class="form-select" required>
            <option value="">Selecciona un día</option>
            ${days.map(day => `<option value="${day}">${day}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Hora Inicio <span class="required">*</span></label>
            <input type="time" id="availability-start" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Hora Fin <span class="required">*</span></label>
            <input type="time" id="availability-end" class="form-input" required>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
      <button class="btn btn-primary" data-action="submit">Agregar Horario</button>
    `;

    Modal.show({
      title: 'Agregar Horario Disponible',
      content: content,
      footer: footer,
      onAction: async (action) => {
        if (action === 'submit') {
          const dia = document.getElementById('availability-day').value;
          const horaInicio = document.getElementById('availability-start').value;
          const horaFin = document.getElementById('availability-end').value;

          if (!dia || !horaInicio || !horaFin) {
            Notification.error('Por favor completa todos los campos');
            return;
          }

          if (horaInicio >= horaFin) {
            Notification.error('La hora de inicio debe ser anterior a la hora de fin');
            return;
          }

          try {
            Loading.show();
            const response = await tutorsAPI.createAvailability(tutorId, {
              dia,
              horaInicio,
              horaFin
            });

            if (response.success) {
              Notification.success('Horario agregado correctamente');
              Modal.close();
              await this.loadData();
            } else {
              Notification.error(response.message || 'Error al agregar horario');
            }
          } catch (error) {
            Notification.error('Error al agregar horario');
            console.error(error);
          } finally {
            Loading.hide();
          }
        }
      }
    });
  }

  async deleteAvailability(availabilityId) {
    if (!confirm('¿Estás seguro de eliminar este horario?')) {
      return;
    }

    try {
      Loading.show();
      const tutorId = await this.getTutorId();
      if (!tutorId) {
        Notification.error('No se pudo identificar tu perfil de tutor');
        return;
      }

      const response = await tutorsAPI.deleteAvailability(tutorId, availabilityId);
      
      if (response.success) {
        Notification.success('Horario eliminado');
        await this.loadData();
      } else {
        Notification.error(response.message || 'Error al eliminar horario');
      }
    } catch (error) {
      Notification.error('Error al eliminar horario');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }
}

export default new TutorDashboardView();

