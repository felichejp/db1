import authService from './services/authService.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import DashboardView from './views/DashboardView.js';
<<<<<<< HEAD
<<<<<<< HEAD
import SessionsView from './views/SessionsView.js';
import GroupsView from './views/GroupsView.js';
import ProfileView from './views/ProfileView.js';
=======
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
<<<<<<< HEAD
    this.routes.set('#/sessions', { view: SessionsView, protected: true });
    this.routes.set('#/groups', { view: GroupsView, protected: true });
    this.routes.set('#/profile', { view: ProfileView, protected: true });
=======
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
    // TODO: Agregar más rutas cuando se implementen las vistas

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => this.handleRoute());
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> origin/Juan_Nambo
=======
    
>>>>>>> origin/Juan_Nambo
    // Manejar ruta inicial
    this.handleRoute();
  }

<<<<<<< HEAD
<<<<<<< HEAD
  handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    console.log('Navigating to:', hash);
=======
  async handleRoute() {
    const hash = window.location.hash || '#/dashboard';
>>>>>>> origin/Juan_Nambo
=======
  async handleRoute() {
    const hash = window.location.hash || '#/dashboard';
>>>>>>> origin/Juan_Nambo
    const route = this.routes.get(hash);

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
<<<<<<< HEAD
<<<<<<< HEAD
    if (route.protected && !authService.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
=======
=======
>>>>>>> origin/Juan_Nambo
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
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
    }

    // Si está en login/register y ya está autenticado, redirigir a dashboard
    if (!route.protected && authService.isAuthenticated()) {
<<<<<<< HEAD
<<<<<<< HEAD
      window.location.hash = '#/dashboard';
      return;
=======
=======
>>>>>>> origin/Juan_Nambo
      const isValid = await authService.verifyToken();
      if (isValid) {
        window.location.hash = '#/dashboard';
        return;
      } else {
        authService.logout();
      }
<<<<<<< HEAD
>>>>>>> origin/Juan_Nambo
=======
>>>>>>> origin/Juan_Nambo
    }

    // Renderizar vista
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


