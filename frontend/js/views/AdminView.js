import authService from '../services/authService.js';
import { adminAPI } from '../api/admin.js';
import { groupsAPI } from '../api/groups.js';
import { tutorsAPI } from '../api/tutors.js';
import { authAPI } from '../api/auth.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import Modal from '../components/Modal.js';

/**
 * Vista de Admin
 */
class AdminView {
  constructor() {
    this.stats = null;
    this.users = [];
    this.groups = [];
    this.tutors = [];
    this.charts = {};
  }

  async render() {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'Admin') {
      window.location.hash = '#/dashboard';
      return;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="admin-view">
        <div class="card">
          <div class="card__header">
            <h1 class="card__title">Panel de Administración</h1>
            <p class="text-muted">Bienvenido, ${user.nombre}</p>
          </div>
          <div class="card__body">
            <div id="admin-content">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadData();
    } catch (error) {
      Notification.error('Error al cargar datos');
      console.error(error);
    } finally {
      Loading.hide();
    }
  }

  async loadData() {
    try {
      const [statsRes, usersRes, groupsRes, tutorsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getGroups(),
        tutorsAPI.getAll()
      ]);

      this.stats = statsRes.success ? statsRes.data : {};
      this.users = usersRes.success ? usersRes.data : [];
      this.groups = groupsRes.success ? groupsRes.data : [];
      this.tutors = tutorsRes.success ? tutorsRes.data : [];

      this.renderContent();
      this.renderCharts();
    } catch (error) {
      console.error('Error cargando datos:', error);
      throw error;
    }
  }

  renderContent() {
    const content = document.getElementById('admin-content');
    
    const estudiantes = this.users.filter(u => u.role === 'Estudiante');
    const profesores = this.users.filter(u => u.role === 'Profesor');
    const tutores = this.users.filter(u => u.role === 'Tutor');
    const sessionsCount = this.stats.sessions || 0;

    content.innerHTML = `
      <div class="admin-tabs">
        <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
        <button class="tab-btn" data-tab="groups">Grupos</button>
        <button class="tab-btn" data-tab="assignments">Asignaciones</button>
      </div>

      <div id="tab-dashboard" class="tab-content active">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>No. Alumnos</h3>
            <p class="stat-value">${estudiantes.length}</p>
          </div>
          <div class="stat-card">
            <h3>No. Asesores</h3>
            <p class="stat-value">${tutores.length}</p>
          </div>
          <div class="stat-card">
            <h3>No. Responsables</h3>
            <p class="stat-value">${profesores.length}</p>
          </div>
          <div class="stat-card">
            <h3>Asesorías Impartidas</h3>
            <p class="stat-value">${sessionsCount}</p>
          </div>
        </div>

        <div class="charts-container">
          <div class="chart-card">
            <h3>Asesorías por Asesor</h3>
            <canvas id="sessions-by-tutor-chart"></canvas>
          </div>
          <div class="chart-card">
            <h3>Cantidad de Materias</h3>
            <canvas id="subjects-chart"></canvas>
          </div>
          <div class="chart-card">
            <h3>Mayor Cantidad de Alumnos por Materia</h3>
            <canvas id="students-by-subject-chart"></canvas>
          </div>
        </div>
      </div>

      <div id="tab-groups" class="tab-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
          <h2>Grupos</h2>
          <button id="create-group-btn" class="btn btn-primary">Agregar Grupo</button>
        </div>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Profesor</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this.groups.map(group => `
                <tr>
                  <td>${group.id}</td>
                  <td>${this.escapeHtml(group.nombre || 'Sin nombre')}</td>
                  <td>${this.escapeHtml(group.profesorName || 'Sin asignar')}</td>
                  <td><span class="badge badge--${group.estado === 'activo' ? 'success' : 'warning'}">${group.estado}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm assign-btn" data-group-id="${group.id}">Asignar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="tab-assignments" class="tab-content">
        <h2>Asignaciones</h2>
        <p class="text-muted">Selecciona un grupo para realizar asignaciones</p>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
      });
    });

    // Crear grupo
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
      createGroupBtn.addEventListener('click', () => this.showCreateGroupModal());
    }

    // Asignar a grupos
    document.querySelectorAll('.assign-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const groupId = parseInt(e.target.dataset.groupId);
        this.showAssignModal(groupId);
      });
    });
  }

  renderCharts() {
    // Asesorías por Asesor
    const sessionsByTutor = this.calculateSessionsByTutor();
    this.renderChart('sessions-by-tutor-chart', {
      type: 'bar',
      data: {
        labels: sessionsByTutor.map(item => item.nombre),
        datasets: [{
          label: 'Asesorías',
          data: sessionsByTutor.map(item => item.count),
          backgroundColor: 'rgba(91, 155, 213, 0.6)',
          borderColor: 'rgba(91, 155, 213, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // Cantidad de materias (simplificado - contar grupos únicos)
    const subjectsCount = this.groups.length;
    this.renderChart('subjects-chart', {
      type: 'doughnut',
      data: {
        labels: ['Grupos/Materias'],
        datasets: [{
          data: [subjectsCount],
          backgroundColor: ['rgba(108, 191, 108, 0.6)'],
          borderColor: ['rgba(108, 191, 108, 1)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true
      }
    });

    // Alumnos por materia (simplificado)
    const studentsByGroup = this.groups.map(g => ({
      nombre: g.nombre,
      count: 0 // Se necesitaría obtener miembros de cada grupo
    }));
    this.renderChart('students-by-subject-chart', {
      type: 'bar',
      data: {
        labels: studentsByGroup.map(item => item.nombre),
        datasets: [{
          label: 'Alumnos',
          data: studentsByGroup.map(item => item.count),
          backgroundColor: 'rgba(255, 183, 77, 0.6)',
          borderColor: 'rgba(255, 183, 77, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  renderChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destruir chart anterior si existe
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    this.charts[canvasId] = new Chart(canvas, config);
  }

  calculateSessionsByTutor() {
    // Esto es una aproximación - necesitarías obtener sesiones reales
    return this.tutors.map(tutor => ({
      nombre: tutor.nombre || 'Sin nombre',
      count: tutor.totalSesiones || 0
    }));
  }

  showCreateGroupModal() {
    const modalContent = `
      <form id="create-group-form">
        <div class="form-group">
          <label class="form-label">Nombre del Grupo</label>
          <input type="text" id="group-name" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción/Materia</label>
          <textarea id="group-desc" class="form-textarea"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Profesor Responsable (opcional)</label>
          <select id="group-profesor" class="form-select">
            <option value="">Sin asignar</option>
            ${this.users.filter(u => u.role === 'Profesor').map(p => `
              <option value="${p.id}">${this.escapeHtml(p.nombre)}</option>
            `).join('')}
          </select>
        </div>
        <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
          <button type="submit" class="btn btn-primary" style="flex: 1;">Crear</button>
          <button type="button" class="btn btn-secondary" onclick="window.currentModal?.hide()" style="flex: 1;">Cancelar</button>
        </div>
      </form>
    `;

    Modal.show('Agregar Grupo', modalContent, () => {
      const form = document.getElementById('create-group-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('group-name').value;
        const descripcion = document.getElementById('group-desc').value;
        const profesorId = document.getElementById('group-profesor').value;

        try {
          Loading.show();
          const response = await groupsAPI.create({
            nombre,
            descripcion,
            profesorId: profesorId || null
          });

          if (response.success) {
            Notification.success('Grupo creado exitosamente');
            Modal.hide();
            await this.loadData();
          } else {
            Notification.error(response.message || 'Error al crear grupo');
          }
        } catch (error) {
          Notification.error('Error al crear grupo');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });
    });
  }

  async showAssignModal(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) {
      Notification.error('Grupo no encontrado');
      return;
    }

    const modalContent = `
      <div class="assign-modal">
        <h3>Asignar a: ${this.escapeHtml(group.nombre)}</h3>
        
        <div class="assign-section">
          <h4>Asignar Profesor Responsable</h4>
          <select id="assign-profesor" class="form-select">
            <option value="">Sin asignar</option>
            ${this.users.filter(u => u.role === 'Profesor').map(p => `
              <option value="${p.id}" ${group.profesorId === p.id ? 'selected' : ''}>${this.escapeHtml(p.nombre)}</option>
            `).join('')}
          </select>
          <button id="save-profesor-btn" class="btn btn-primary" style="margin-top: var(--spacing-sm);">Asignar Profesor</button>
        </div>

        <div class="assign-section">
          <h4>Asignar Asesor</h4>
          <select id="assign-tutor" class="form-select">
            <option value="">Sin asignar</option>
            ${this.tutors.map(t => `
              <option value="${t.id}">${this.escapeHtml(t.nombre || 'Sin nombre')}</option>
            `).join('')}
          </select>
          <button id="save-tutor-btn" class="btn btn-primary" style="margin-top: var(--spacing-sm);">Asignar Asesor</button>
        </div>

        <div class="assign-section">
          <h4>Asignar Alumnos</h4>
          <select id="assign-alumno" class="form-select">
            <option value="">Selecciona un alumno</option>
            ${this.users.filter(u => u.role === 'Estudiante').map(e => `
              <option value="${e.id}">${this.escapeHtml(e.nombre)}</option>
            `).join('')}
          </select>
          <button id="save-alumno-btn" class="btn btn-primary" style="margin-top: var(--spacing-sm);">Asignar Alumno</button>
        </div>
      </div>
    `;

    Modal.show('Asignaciones', modalContent, () => {
      // Asignar profesor
      document.getElementById('save-profesor-btn').addEventListener('click', async () => {
        const profesorId = document.getElementById('assign-profesor').value;
        if (!profesorId) {
          Notification.error('Selecciona un profesor');
          return;
        }

        try {
          Loading.show();
          const response = await adminAPI.assignProfesorToGroup(groupId, parseInt(profesorId));
          if (response.success) {
            Notification.success('Profesor asignado exitosamente');
            await this.loadData();
          } else {
            Notification.error(response.message || 'Error al asignar profesor');
          }
        } catch (error) {
          Notification.error('Error al asignar profesor');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });

      // Asignar tutor
      document.getElementById('save-tutor-btn').addEventListener('click', async () => {
        const tutorId = document.getElementById('assign-tutor').value;
        if (!tutorId) {
          Notification.error('Selecciona un asesor');
          return;
        }

        try {
          Loading.show();
          const response = await adminAPI.assignTutorToGroup(groupId, parseInt(tutorId));
          if (response.success) {
            Notification.success('Asesor asignado exitosamente');
            await this.loadData();
          } else {
            Notification.error(response.message || 'Error al asignar asesor');
          }
        } catch (error) {
          Notification.error('Error al asignar asesor');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });

      // Asignar alumno
      document.getElementById('save-alumno-btn').addEventListener('click', async () => {
        const userId = document.getElementById('assign-alumno').value;
        if (!userId) {
          Notification.error('Selecciona un alumno');
          return;
        }

        try {
          Loading.show();
          const response = await adminAPI.assignAlumnoToGroup(groupId, parseInt(userId));
          if (response.success) {
            Notification.success('Alumno asignado exitosamente');
            await this.loadData();
          } else {
            Notification.error(response.message || 'Error al asignar alumno');
          }
        } catch (error) {
          Notification.error('Error al asignar alumno');
          console.error(error);
        } finally {
          Loading.hide();
        }
      });
    });
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new AdminView();

