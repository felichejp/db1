import storageService from './storageService.js';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

/**
 * Servicio de autenticación
 */
class AuthService {
  /**
   * Guarda el token y usuario
   */
  setAuth(token, user) {
    storageService.setItem(AUTH_TOKEN_KEY, token);
    storageService.setItem(CURRENT_USER_KEY, user);
  }

  /**
   * Obtiene el token
   */
  getToken() {
    return storageService.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser() {
    return storageService.getItem(CURRENT_USER_KEY);
  }

  /**
   * Verifica si está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Cierra sesión
   */
  logout() {
    storageService.removeItem(AUTH_TOKEN_KEY);
    storageService.removeItem(CURRENT_USER_KEY);
  }

  /**
   * Verifica si el token es válido
   */
  async verifyToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success && response.data.data.valid) {
        // Actualizar información del usuario si está disponible
        if (response.data.data.user) {
          this.setAuth(token, response.data.data.user);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Error verificando token:', error);
      return false;
    }
  }

  /**
   * Refresca la información del usuario desde el servidor
   */
  async refreshUser() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success && response.data.data) {
        this.setAuth(token, response.data.data);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Error refrescando usuario:', error);
      return false;
    }
  }
}

export default new AuthService();

