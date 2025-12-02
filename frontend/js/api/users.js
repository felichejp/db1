import authService from '../services/authService.js';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Función helper para obtener headers con token
function getAuthHeaders() {
  const token = authService.getToken();
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
}

export const usersAPI = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/api/users`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/users/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async update(id, data) {
    const response = await axios.put(`${API_BASE_URL}/api/users/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_BASE_URL}/api/users/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

