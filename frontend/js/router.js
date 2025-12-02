import authService from './services/authService.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import DashboardView from './views/DashboardView.js';
import GroupDetailView from './views/GroupDetailView.js';
import ProfileView from './views/ProfileView.js';
import NotFoundView from './views/NotFoundView.js';
import Header from './components/Header.js';
import Sidebar from './components/Sidebar.js';

/**
 * Router hash-based
 */
class Router {
  constructor() {
    this.routes = new Map();
    this.currentView = null;
    this.init();
  }

  init() {
    // Definir rutas
    this.routes.set('#/login', { view: LoginView, protected: false });
    this.routes.set('#/register', { view: RegisterView, protected: false });
    this.routes.set('#/dashboard', { view: DashboardView, protected: true });
    this.routes.set('#/profile', { view: ProfileView, protected: true });
    
    // Ruta dinámica para detalles de grupo
    // TODO: Agregar más rutas cuando se implementen las vistas

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Manejar ruta inicial cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.handleRoute());
    } else {
      // DOM ya está listo
      this.handleRoute();
    }
  }

  async handleRoute() {
    // Si no hay hash, determinar la ruta inicial
    let hash = window.location.hash;
    if (!hash) {
      // Si no está autenticado, ir a login; si está autenticado, ir a dashboard
      hash = authService.isAuthenticated() ? '#/dashboard' : '#/login';
      window.location.hash = hash;
    }
    
    let route = this.routes.get(hash);

    // Manejar rutas dinámicas
    if (!route) {
      // Ruta de detalles de grupo: #/group/:id
      const groupMatch = hash.match(/^#\/group\/(\d+)$/);
      if (groupMatch) {
        route = { view: GroupDetailView, protected: true };
      }
    }

    // Si no hay ruta, mostrar 404
    if (!route) {
      NotFoundView.render();
      if (authService.isAuthenticated()) {
        Header.render();
        Sidebar.render();
      }
      return;
    }

    // Verificar autenticación para rutas protegidas
    if (route.protected) {
      if (!authService.isAuthenticated()) {
        window.location.hash = '#/login';
        return;
      }
      
      // Verificar que el token sea válido antes de renderizar
      const isValid = await authService.verifyToken();
      if (!isValid) {
        authService.logout();
        window.location.hash = '#/login';
        return;
      }
    }

    // Si está en login/register y ya está autenticado, redirigir a dashboard
    if (!route.protected && authService.isAuthenticated()) {
      const isValid = await authService.verifyToken();
      if (isValid) {
        window.location.hash = '#/dashboard';
        return;
      } else {
        authService.logout();
      }
    }

    // Renderizar vista
    try {
      route.view.render();
    } catch (error) {
      console.error('Error renderizando vista:', error);
      const container = document.getElementById('view-container');
      if (container) {
        container.innerHTML = `
          <div class="card" style="max-width: 600px; margin: 2rem auto;">
            <div class="card__body">
              <p class="text-muted">Error al cargar la vista. Por favor, recarga la página.</p>
              <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: var(--spacing-md);">
                Recargar página
              </button>
            </div>
          </div>
        `;
      }
      return;
    }

    // Renderizar header y sidebar si está autenticado
    if (authService.isAuthenticated()) {
      Header.render();
      // Mostrar sidebar siempre cuando está autenticado
      Sidebar.render();
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        // Ajustar margin solo si no estamos en dashboard (el dashboard maneja su propio layout)
        if (hash === '#/dashboard') {
          // El dashboard tiene su propio layout, pero necesitamos espacio para el sidebar
          mainContent.style.marginLeft = '250px';
        } else {
          mainContent.style.marginLeft = '250px';
        }
      }
    } else {
      if (Header.container) {
        Header.container.innerHTML = '';
      }
      if (Sidebar.container) {
        Sidebar.container.innerHTML = '';
      }
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export default new Router();


