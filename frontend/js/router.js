import authService from './services/authService.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import DashboardView from './views/DashboardView.js';
import GroupsView from './views/GroupsView.js';
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
    this.routes.set('#/groups', { view: GroupsView, protected: true });
    // TODO: Agregar más rutas cuando se implementen las vistas

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Manejar ruta inicial
    this.handleRoute();
  }

  async handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    let route = this.routes.get(hash);
    let params = {};

    // Si no hay ruta exacta, intentar buscar rutas con parámetros
    if (!route) {
      // Verificar si es una ruta de grupos con ID: #/groups/:id
      const groupsMatch = hash.match(/^#\/groups\/(\d+)$/);
      if (groupsMatch) {
        route = this.routes.get('#/groups');
        params = { groupId: parseInt(groupsMatch[1], 10) };
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

    // Limpiar vista anterior si tiene método cleanup
    if (this.currentView && typeof this.currentView.cleanup === 'function') {
      this.currentView.cleanup();
    }

    // Renderizar vista con parámetros si los hay
    if (Object.keys(params).length > 0) {
      route.view.render(params);
    } else {
      route.view.render();
    }
    this.currentView = route.view;

    // Renderizar header y sidebar si está autenticado
    if (authService.isAuthenticated()) {
      Header.render();
      Sidebar.render();
    } else {
      Header.container.innerHTML = '';
      Sidebar.container.innerHTML = '';
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export default new Router();


