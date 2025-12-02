import authService from './services/authService.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import DashboardView from './views/DashboardView.js';
import GroupView from './views/GroupView.js';
import GroupDetailsView from './views/GroupDetailsView.js';
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

    // Definir rutas dinámicas (patrones)
    this.dynamicRoutes = [
      { pattern: /^#\/groups\/(\d+)$/, view: GroupView, protected: true },
      { pattern: /^#\/groups\/(\d+)\/details$/, view: GroupDetailsView, protected: true }
    ];

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Manejar ruta inicial
    this.handleRoute();
  }

  handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    
    // Primero intentar con rutas estáticas
    let route = this.routes.get(hash);

    // Si no hay ruta estática, buscar en rutas dinámicas
    if (!route) {
      for (const dynamicRoute of this.dynamicRoutes) {
        const match = hash.match(dynamicRoute.pattern);
        if (match) {
          route = { 
            view: dynamicRoute.view, 
            protected: dynamicRoute.protected,
            params: match.slice(1) // Capturar parámetros
          };
          break;
        }
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
    if (route.protected && !authService.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }

    // Si está en login/register y ya está autenticado, redirigir a dashboard
    if (!route.protected && authService.isAuthenticated()) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Limpiar vista anterior si tiene método cleanup
    if (this.currentView && typeof this.currentView.cleanup === 'function') {
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


