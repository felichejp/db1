import authService from './services/authService.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import DashboardView from './views/DashboardView.js';
import GroupsView from './views/GroupsView.js';
import GroupDetailView from './views/GroupDetailView.js';
import NotFoundView from './views/NotFoundView.js';
import Header from './components/Header.js';
import Sidebar from './components/Sidebar.js';

/**
 * Router hash-based
 */
class Router {
  constructor() {
    this.routes = new Map();
    this.dynamicRoutes = [];
    this.currentView = null;
    this.init();
  }

  init() {
    // Definir rutas estáticas
    this.routes.set('#/login', { view: LoginView, protected: false });
    this.routes.set('#/register', { view: RegisterView, protected: false });
    this.routes.set('#/dashboard', { view: DashboardView, protected: true });
    this.routes.set('#/groups', { view: GroupsView, protected: true });

    // Definir rutas dinámicas
    this.dynamicRoutes = [
      { pattern: /^#\/groups\/(\d+)$/, view: GroupDetailView, protected: true }
    ];

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Manejar ruta inicial
    this.handleRoute();
  }

  findRoute(hash) {
    // Buscar primero en rutas estáticas
    if (this.routes.has(hash)) {
      return this.routes.get(hash);
    }

    // Buscar en rutas dinámicas
    for (const route of this.dynamicRoutes) {
      const match = hash.match(route.pattern);
      if (match) {
        return { ...route, params: match.slice(1) };
      }
    }

    return null;
  }

  handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    const route = this.findRoute(hash);

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
        // Si no hay token en localStorage, redirigir a login
        window.location.hash = '#/login';
        return;
      }
      // Si hay token, continuar (la verificación se hace en main.js)
    }

    // Si está en login/register y ya está autenticado, redirigir a dashboard
    if (!route.protected && authService.isAuthenticated()) {
      // Solo redirigir si realmente está autenticado (tiene token válido)
      // La verificación del token se hace en main.js, aquí solo verificamos que exista
      const currentHash = window.location.hash;
      if (currentHash === '#/login' || currentHash === '#/register') {
        window.location.hash = '#/dashboard';
        return;
      }
    }

    // Limpiar vista anterior si tiene método cleanup
    if (this.currentView && this.currentView !== route.view && typeof this.currentView.cleanup === 'function') {
      this.currentView.cleanup();
    }

    // Renderizar vista
    this.currentView = route.view;
    route.view.render();

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

