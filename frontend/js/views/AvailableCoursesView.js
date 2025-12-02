import authService from '../services/authService.js';
import Loading from '../components/Loading.js';
import Notification from '../components/Notification.js';
import { groupsAPI } from '../api/groups.js';

/**
 * Vista de Cursos disponibles (solo Estudiante)
 * Nota: actualmente el backend no expone un endpoint para listar
 * todos los grupos para estudiantes no miembros; esta vista se centra
 * en el layout y en aprovechar, cuando sea posible, la información de grupos.
 */
class AvailableCoursesView {
  async render() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h1 class="card__title">Cursos disponibles</h1>
          <p class="text-muted">Explora los cursos y solicita unirte a grupos con cupo disponible.</p>
        </div>
        <div class="card__body">
          <div id="courses-content">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    try {
      Loading.show();
      await this.loadCourses(user);
    } catch (error) {
      console.error(error);
      Notification.error('Error al cargar cursos disponibles');
    } finally {
      Loading.hide();
    }
  }

  async loadCourses(user) {
    const content = document.getElementById('courses-content');

    // Por ahora, intentamos reutilizar la información de grupos si el usuario
    // tiene rol distinto o si más adelante se agrega un endpoint específico.
    // Si no es posible, mostramos un mensaje informativo.
    try {
      // Intento básico: reutilizar /api/admin/groups cuando el usuario sea Admin,
      // o simplemente mostrar mensaje cuando es Estudiante.
      if (user.role !== 'Estudiante') {
        content.innerHTML = '<p class="text-muted">La vista de cursos disponibles está pensada para estudiantes.</p>';
        return;
      }

      // Sin endpoint específico para "todos los grupos", dejamos una tabla vacía
      // preparada para cuando exista la integración.
      content.innerHTML = `
        <div class="alert alert-info">
          Aún no hay integración de backend para listar todos los cursos disponibles.
          Esta vista muestra el diseño esperado y está lista para conectarse cuando exista el endpoint.
        </div>
        <div class="table-container mt-2">
          <table class="table">
            <thead>
              <tr>
                <th>Materia</th>
                <th>Horario</th>
                <th>Asesor</th>
                <th>Cupo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="courses-table-body">
              <tr>
                <td colspan="5" class="text-muted">
                  No se encontraron cursos porque aún no existe un servicio de backend para listarlos.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      console.error('Error al cargar cursos:', error);
      content.innerHTML = '<p class="text-muted">Error al cargar cursos disponibles</p>';
    }
  }
}

export default new AvailableCoursesView();


