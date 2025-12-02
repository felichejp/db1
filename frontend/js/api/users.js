const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const usersAPI = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/api/users`);
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/users/${id}`);
    return response.data;
  },

  async getProfile(id) {
    const response = await axios.get(`${API_BASE_URL}/api/users/${id}/profile`);
    return response.data;
  },

  async update(id, data) {
    const response = await axios.put(`${API_BASE_URL}/api/users/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_BASE_URL}/api/users/${id}`);
    return response.data;
  }
};

