/**
 * Servicio para manejar localStorage y sessionStorage
 */
class StorageService {
  /**
   * Guarda un valor en localStorage
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
      return false;
    }
  }

  /**
   * Obtiene un valor de localStorage
   */
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error leyendo de localStorage:', error);
      return null;
    }
  }

  /**
   * Elimina un valor de localStorage
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error eliminando de localStorage:', error);
      return false;
    }
  }

  /**
   * Limpia todo el localStorage
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error limpiando localStorage:', error);
      return false;
    }
  }

  /**
   * Guarda en sessionStorage
   */
  setSessionItem(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error guardando en sessionStorage:', error);
      return false;
    }
  }

  /**
   * Obtiene de sessionStorage
   */
  getSessionItem(key) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error leyendo de sessionStorage:', error);
      return null;
    }
  }

  /**
   * Elimina de sessionStorage
   */
  removeSessionItem(key) {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error eliminando de sessionStorage:', error);
      return false;
    }
  }
}

export default new StorageService();

