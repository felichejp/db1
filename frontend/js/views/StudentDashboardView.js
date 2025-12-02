import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Dashboard del Alumno (Estudiante)
 * Muestra materias disponibles, materias inscritas y opción de solicitar asesoría
 */
class StudentDashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-title">Dashboard del Alumno</h1>
          <p class="dashboard-subtitle">Bienvenido, ${user.nombre}</p>
        </div>
      </div>

      <div class="dashboard-content">
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">📅</span>
              Mi Horario Actual
            </h2>
          </div>
          <div id="student-schedule" class="schedule-container">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">📚</span>
              Materias Disponibles
            </h2>
          </div>
          <div id="available-subjects" class="subjects-grid">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">✅</span>
              Materias en las que estoy inscrito
            </h2>
          </div>
          <div id="enrolled-subjects" class="subjects-grid">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">ℹ️</span>
              Información Relevante
            </h2>
          </div>
          <div id="student-info" class="info-container">
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
      // Obtener grupos (materias) del estudiante
      const groupsRes = await groupsAPI.getAll();
      const groups = groupsRes.success ? groupsRes.data : [];

      // Obtener sesiones del estudiante
      const sessionsRes = await sessionsAPI.getAll();
      const sessions = sessionsRes.success ? sessionsRes.data : [];

      // Obtener todas las materias disponibles (a través de tutores)
      const tutorsRes = await tutorsAPI.getAll();
      const tutors = tutorsRes.success ? tutorsRes.data : [];

      // Extraer materias únicas de los tutores
      const availableSubjects = new Set();
      tutors.forEach(tutor => {
        if (tutor.subjects && Array.isArray(tutor.subjects)) {
          tutor.subjects.forEach(subject => {
            availableSubjects.add(subject.materia);
          });
        }
      });

      // Renderizar horario del estudiante
      this.renderStudentSchedule(sessions, groups);
      
      // Renderizar materias disponibles
      this.renderAvailableSubjects(Array.from(availableSubjects), tutors);
      
      // Renderizar materias inscritas (grupos)
      this.renderEnrolledSubjects(groups);

      // Renderizar información relevante
      this.renderStudentInfo(groups, sessions);

      // Renderizar información relevante
      this.renderStudentInfo(groups, sessions);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  renderAvailableSubjects(subjects, tutors) {
    const container = document.getElementById('available-subjects');
    
    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <p class="empty-state__message">No hay materias disponibles en este momento</p>
        </div>
      `;
      return;
    }

    container.innerHTML = subjects.map(subject => {
      // Encontrar tutores que enseñan esta materia
      const subjectTutors = tutors.filter(tutor => 
        tutor.subjects?.some(s => s.materia === subject)
      );

      return `
        <div class="subject-card">
          <div class="subject-card__header">
            <h3 class="subject-card__title">${subject}</h3>
            <span class="badge badge--info">${subjectTutors.length} asesor${subjectTutors.length !== 1 ? 'es' : ''}</span>
          </div>
          <div class="subject-card__body">
            <div class="subject-card__info">
              <span class="info-item">
                <span class="info-icon">👥</span>
                ${subjectTutors.length} asesor${subjectTutors.length !== 1 ? 'es' : ''} disponible${subjectTutors.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div class="subject-card__footer">
            <button class="btn btn-primary btn-sm" onclick="window.studentDashboard?.viewSubjectDetails('${subject}')">
              Ver Detalles
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.studentDashboard?.requestTutoring('${subject}')">
              Solicitar Asesoría
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Exponer métodos globalmente para los onclick
    window.studentDashboard = this;
  }

  renderStudentSchedule(sessions, groups) {
    const container = document.getElementById('student-schedule');
    
    // Filtrar sesiones futuras y ordenarlas por fecha
    const now = new Date();
    const upcomingSessions = sessions
      .filter(session => {
        if (!session.fecha) return false;
        const sessionDate = new Date(`${session.fecha}T${session.horaInicio || '00:00'}`);
        return sessionDate >= now && (session.estado === 'programada' || session.estado === 'aceptada');
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.horaInicio || '00:00'}`);
        const dateB = new Date(`${b.fecha}T${b.horaInicio || '00:00'}`);
        return dateA - dateB;
      })
      .slice(0, 10); // Mostrar solo las próximas 10

    if (upcomingSessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📅</div>
          <p class="empty-state__message">No tienes sesiones programadas</p>
        </div>
      `;
      return;
    }

    // Agrupar por fecha
    const sessionsByDate = {};
    upcomingSessions.forEach(session => {
      const date = session.fecha;
      if (!sessionsByDate[date]) {
        sessionsByDate[date] = [];
      }
      sessionsByDate[date].push(session);
    });

    container.innerHTML = Object.entries(sessionsByDate).map(([date, dateSessions]) => `
      <div class="schedule-day">
        <h3 class="schedule-day__title">
          <span class="schedule-date">${formatDate(date)}</span>
        </h3>
        <div class="schedule-list">
          ${dateSessions.map(session => `
            <div class="schedule-item session-item">
              <div class="session-item__time">
                <span class="schedule-time">${formatTime(session.horaInicio)} - ${formatTime(session.horaFin)}</span>
              </div>
              <div class="session-item__details">
                <span class="session-item__topic">${session.tema || 'Sin tema'}</span>
                <span class="session-item__group">${session.grupo?.nombre || 'Sin grupo'}</span>
              </div>
              <div class="session-item__status">
                <span class="badge badge--${session.estado === 'programada' ? 'info' : session.estado === 'aceptada' ? 'success' : 'warning'}">
                  ${session.estado === 'programada' ? 'Programada' : session.estado === 'aceptada' ? 'Aceptada' : session.estado}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  renderStudentInfo(groups, sessions) {
    const container = document.getElementById('student-info');
    const user = authService.getCurrentUser();
    
    // Calcular estadísticas
    const totalGroups = groups.length;
    const activeGroups = groups.filter(g => g.estado === 'activo').length;
    const upcomingSessions = sessions.filter(s => {
      if (!s.fecha) return false;
      const sessionDate = new Date(`${s.fecha}T${s.horaInicio || '00:00'}`);
      return sessionDate >= new Date() && (s.estado === 'programada' || s.estado === 'aceptada');
    }).length;
    const completedSessions = sessions.filter(s => s.estado === 'completada').length;

    container.innerHTML = `
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card__icon">👥</div>
          <div class="info-card__content">
            <div class="info-card__value">${totalGroups}</div>
            <div class="info-card__label">Grupos Totales</div>
            <div class="info-card__subtext">${activeGroups} activos</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-card__icon">📅</div>
          <div class="info-card__content">
            <div class="info-card__value">${upcomingSessions}</div>
            <div class="info-card__label">Próximas Sesiones</div>
            <div class="info-card__subtext">Programadas</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-card__icon">✅</div>
          <div class="info-card__content">
            <div class="info-card__value">${completedSessions}</div>
            <div class="info-card__label">Sesiones Completadas</div>
            <div class="info-card__subtext">Historial</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-card__icon">🎓</div>
          <div class="info-card__content">
            <div class="info-card__value">${user.grado || 'N/A'}</div>
            <div class="info-card__label">Grado Académico</div>
            <div class="info-card__subtext">Nivel actual</div>
          </div>
        </div>
      </div>
    `;
  }

  renderEnrolledSubjects(groups) {
    const container = document.getElementById('enrolled-subjects');
    
    if (groups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📝</div>
          <p class="empty-state__message">No estás inscrito en ninguna materia</p>
        </div>
      `;
      return;
    }

    container.innerHTML = groups.map(group => {
      const profesor = group.profesor ? group.profesor.nombre : 'Sin asignar';
      const miembros = group.members?.length || 0;

      return `
        <div class="subject-card enrolled">
          <div class="subject-card__header">
            <h3 class="subject-card__title">${group.nombre}</h3>
            <span class="badge badge--${group.estado === 'activo' ? 'success' : 'warning'}">${group.estado}</span>
          </div>
          <div class="subject-card__body">
            <div class="subject-card__info">
              <span class="info-item">
                <span class="info-icon">👨‍🏫</span>
                Responsable: ${profesor}
              </span>
              <span class="info-item">
                <span class="info-icon">👥</span>
                ${miembros} miembro${miembros !== 1 ? 's' : ''}
              </span>
            </div>
            ${group.descripcion ? `<p class="subject-card__description">${group.descripcion}</p>` : ''}
          </div>
          <div class="subject-card__footer">
            <a href="#/groups/${group.id}" class="btn btn-primary btn-sm">Ver Grupo</a>
          </div>
        </div>
      `;
    }).join('');
  }

  viewSubjectDetails(subjectName) {
    window.location.hash = `#/subjects/${encodeURIComponent(subjectName)}`;
  }

  async requestTutoring(subjectName) {
    try {
      // Obtener tutores disponibles para esta materia
      const tutorsRes = await tutorsAPI.getAll();
      const tutors = tutorsRes.success ? tutorsRes.data : [];
      const subjectTutors = tutors.filter(tutor => 
        tutor.subjects?.some(s => s.materia === subjectName)
      );

      if (subjectTutors.length === 0) {
        Notification.warning('No hay asesores disponibles para esta materia');
        return;
      }

      // Mostrar modal para seleccionar fecha y horario
      this.showTutoringRequestModal(subjectName, subjectTutors);
    } catch (error) {
      Notification.error('Error al solicitar asesoría');
      console.error(error);
    }
  }

  showTutoringRequestModal(subjectName, tutors) {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 días en el futuro

    const content = `
      <div class="tutoring-request-form">
        <div class="form-group">
          <label class="form-label">Materia</label>
          <input type="text" class="form-input" value="${subjectName}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Asesoría <span class="required">*</span></label>
          <input 
            type="date" 
            id="tutoring-date" 
            class="form-input" 
            min="${today.toISOString().split('T')[0]}"
            max="${maxDate.toISOString().split('T')[0]}"
            required
          >
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Hora Inicio <span class="required">*</span></label>
            <input type="time" id="tutoring-start" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Hora Fin <span class="required">*</span></label>
            <input type="time" id="tutoring-end" class="form-input" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tema / Descripción</label>
          <textarea 
            id="tutoring-topic" 
            class="form-textarea" 
            placeholder="Describe el tema que necesitas asesorar"
            rows="3"
          ></textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
      <button class="btn btn-primary" data-action="submit">Solicitar Asesoría</button>
    `;

    Modal.show({
      title: `Solicitar Asesoría - ${subjectName}`,
      content: content,
      footer: footer,
      onAction: async (action) => {
        if (action === 'submit') {
          const fecha = document.getElementById('tutoring-date').value;
          const horaInicio = document.getElementById('tutoring-start').value;
          const horaFin = document.getElementById('tutoring-end').value;
          const tema = document.getElementById('tutoring-topic').value;

          if (!fecha || !horaInicio || !horaFin) {
            Notification.error('Por favor completa todos los campos requeridos');
            return;
          }

          try {
            Loading.show();
            // Aquí se crearía la sesión de asesoría
            // Por ahora, notificamos que la funcionalidad está en desarrollo
            Notification.info('Funcionalidad de solicitud de asesoría en desarrollo');
            Modal.close();
          } catch (error) {
            Notification.error('Error al solicitar asesoría');
          } finally {
            Loading.hide();
          }
        }
      }
    });
  }
}

export default new StudentDashboardView();

