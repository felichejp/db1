import authService from '../services/authService.js';
import { groupsAPI } from '../api/groups.js';
import { sessionsAPI } from '../api/sessions.js';
import { usersAPI } from '../api/users.js';
import { tutorsAPI } from '../api/tutors.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';
import { formatDate, formatTime } from '../utils/helpers.js';

/**
 * Dashboard del Administrador
 * Incluye funciones de gestión y métricas
 */
class AdminDashboardView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-title">Dashboard del Administrador</h1>
          <p class="dashboard-subtitle">Panel de control y gestión</p>
        </div>
        <div class="dashboard-actions">
          <button class="btn btn-primary" id="add-group-btn">
            ➕ Agregar Grupo
          </button>
        </div>
      </div>

      <div class="dashboard-content">
        <div class="metrics-section">
          <h2 class="section-title">Métricas del Sistema</h2>
          <div id="metrics-grid" class="metrics-grid">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">⚙️</span>
              Gestión Rápida
            </h2>
          </div>
          <div class="management-cards">
            <div class="management-card" onclick="window.location.hash='#/admin/users'">
              <div class="management-card__icon">👥</div>
              <div class="management-card__title">Gestionar Usuarios</div>
              <div class="management-card__description">Asignar roles, crear usuarios</div>
            </div>
            <div class="management-card" onclick="window.location.hash='#/admin/groups'">
              <div class="management-card__icon">👨‍👩‍👧‍👦</div>
              <div class="management-card__title">Gestionar Grupos</div>
              <div class="management-card__description">Crear y asignar grupos</div>
            </div>
            <div class="management-card" onclick="window.location.hash='#/admin/tutors'">
              <div class="management-card__icon">🎓</div>
              <div class="management-card__title">Gestionar Asesores</div>
              <div class="management-card__description">Asignar asesores y materias</div>
            </div>
            <div class="management-card" onclick="window.location.hash='#/admin/sessions'">
              <div class="management-card__icon">📅</div>
              <div class="management-card__title">Gestionar Sesiones</div>
              <div class="management-card__description">Ver y administrar asesorías</div>
            </div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">📊</span>
              Estadísticas Detalladas
            </h2>
          </div>
          <div id="detailed-stats" class="stats-container">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadData();
      
      // Event listener para agregar grupo
      document.getElementById('add-group-btn')?.addEventListener('click', () => {
        this.showAddGroupModal();
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
      // Obtener todos los datos necesarios
      const [groupsRes, sessionsRes, tutorsRes] = await Promise.allSettled([
        groupsAPI.getAll(),
        sessionsAPI.getAll(),
        tutorsAPI.getAll()
      ]);

      const groups = groupsRes.status === 'fulfilled' && groupsRes.value.success 
        ? groupsRes.value.data 
        : [];
      const sessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.success 
        ? sessionsRes.value.data 
        : [];
      const tutors = tutorsRes.status === 'fulfilled' && tutorsRes.value.success 
        ? tutorsRes.value.data 
        : [];

      // Calcular métricas
      const metrics = this.calculateMetrics(groups, sessions, tutors);
      
      // Renderizar
      this.renderMetrics(metrics);
      this.renderDetailedStats(groups, sessions, tutors);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  calculateMetrics(groups, sessions, tutors) {
    // Contar usuarios por rol (aproximado desde grupos y sesiones)
    const students = new Set();
    const profesores = new Set();
    const tutores = new Set();

    groups.forEach(group => {
      if (group.profesorId) profesores.add(group.profesorId);
      if (group.members) {
        group.members.forEach(member => {
          if (member.role === 'Estudiante') students.add(member.id);
        });
      }
    });

    sessions.forEach(session => {
      if (session.tutorId) tutores.add(session.tutorId);
    });

    // Contar asesorías por asesor
    const sessionsByTutor = {};
    sessions.forEach(session => {
      if (session.tutorId) {
        sessionsByTutor[session.tutorId] = (sessionsByTutor[session.tutorId] || 0) + 1;
      }
    });

    // Contar materias con más alumnos
    const studentsBySubject = {};
    groups.forEach(group => {
      const subject = group.nombre; // Asumiendo que el nombre del grupo es la materia
      const count = group.members?.length || 0;
      studentsBySubject[subject] = (studentsBySubject[subject] || 0) + count;
    });

    // Contar materias con más asesorías
    const sessionsBySubject = {};
    sessions.forEach(session => {
      const subject = session.tema || session.grupo?.nombre || 'Sin materia';
      sessionsBySubject[subject] = (sessionsBySubject[subject] || 0) + 1;
    });

    return {
      totalAlumnos: students.size,
      totalAsesores: tutores.size,
      totalResponsables: profesores.size,
      asesoriasImpartidas: sessions.length,
      asesoriasPorAsesor: sessionsByTutor,
      materiasConMasAlumnos: studentsBySubject,
      materiasConMasAsesorias: sessionsBySubject
    };
  }

  renderMetrics(metrics) {
    const container = document.getElementById('metrics-grid');
    
    container.innerHTML = `
      <div class="metric-card">
        <div class="metric-card__icon">👥</div>
        <div class="metric-card__value">${metrics.totalAlumnos}</div>
        <div class="metric-card__label">Alumnos</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__icon">🎓</div>
        <div class="metric-card__value">${metrics.totalAsesores}</div>
        <div class="metric-card__label">Asesores</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__icon">👨‍🏫</div>
        <div class="metric-card__value">${metrics.totalResponsables}</div>
        <div class="metric-card__label">Responsables</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__icon">📚</div>
        <div class="metric-card__value">${metrics.asesoriasImpartidas}</div>
        <div class="metric-card__label">Asesorías Impartidas</div>
      </div>
    `;
  }

  renderDetailedStats(groups, sessions, tutors) {
    const container = document.getElementById('detailed-stats');
    
    // Top 5 materias con más alumnos
    const topSubjectsByStudents = Object.entries(this.calculateMetrics(groups, sessions, tutors).materiasConMasAlumnos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top 5 materias con más asesorías
    const topSubjectsBySessions = Object.entries(this.calculateMetrics(groups, sessions, tutors).materiasConMasAsesorias)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top 5 asesores por número de asesorías
    const topTutors = Object.entries(this.calculateMetrics(groups, sessions, tutors).asesoriasPorAsesor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stats-card">
          <h3 class="stats-card__title">Materias con Más Alumnos</h3>
          <div class="stats-list">
            ${topSubjectsByStudents.length > 0 ? topSubjectsByStudents.map(([subject, count]) => `
              <div class="stats-item">
                <span class="stats-item__label">${subject}</span>
                <span class="stats-item__value">${count} alumno${count !== 1 ? 's' : ''}</span>
              </div>
            `).join('') : '<p class="text-muted">No hay datos disponibles</p>'}
          </div>
        </div>
        <div class="stats-card">
          <h3 class="stats-card__title">Materias con Más Asesorías</h3>
          <div class="stats-list">
            ${topSubjectsBySessions.length > 0 ? topSubjectsBySessions.map(([subject, count]) => `
              <div class="stats-item">
                <span class="stats-item__label">${subject}</span>
                <span class="stats-item__value">${count} asesoría${count !== 1 ? 's' : ''}</span>
              </div>
            `).join('') : '<p class="text-muted">No hay datos disponibles</p>'}
          </div>
        </div>
        <div class="stats-card">
          <h3 class="stats-card__title">Asesorías por Asesor</h3>
          <div class="stats-list">
            ${topTutors.length > 0 ? topTutors.map(([tutorId, count]) => {
              const tutor = tutors.find(t => t.id === parseInt(tutorId) || t.userId === parseInt(tutorId));
              return `
                <div class="stats-item">
                  <span class="stats-item__label">${tutor?.nombre || `Asesor ${tutorId}`}</span>
                  <span class="stats-item__value">${count} asesoría${count !== 1 ? 's' : ''}</span>
                </div>
              `;
            }).join('') : '<p class="text-muted">No hay datos disponibles</p>'}
          </div>
        </div>
      </div>
    `;
  }

  showAddGroupModal() {
    const content = `
      <div class="add-group-form">
        <div class="form-group">
          <label class="form-label">Nombre del Grupo <span class="required">*</span></label>
          <input type="text" id="group-name" class="form-input" placeholder="Ej: Grupo de Álgebra" required>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea id="group-description" class="form-textarea" rows="3" placeholder="Descripción del grupo"></textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
      <button class="btn btn-primary" data-action="submit">Crear Grupo</button>
    `;

    Modal.show({
      title: 'Agregar Nuevo Grupo',
      content: content,
      footer: footer,
      onAction: async (action) => {
        if (action === 'submit') {
          const nombre = document.getElementById('group-name').value.trim();
          const descripcion = document.getElementById('group-description').value.trim();

          if (!nombre) {
            Notification.error('El nombre del grupo es requerido');
            return;
          }

          try {
            Loading.show();
            const response = await groupsAPI.create({
              nombre,
              descripcion: descripcion || null
            });

            if (response.success) {
              Notification.success('Grupo creado correctamente');
              Modal.close();
              await this.loadData();
            } else {
              Notification.error(response.message || 'Error al crear el grupo');
            }
          } catch (error) {
            Notification.error('Error al crear el grupo');
            console.error(error);
          } finally {
            Loading.hide();
          }
        }
      }
    });
  }
}

export default new AdminDashboardView();

