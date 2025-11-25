const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const messagesAPI = {
  async getByGroup(groupId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/messages/group/${groupId}`);
      return response.data;
    } catch (error) {
      console.error('messagesAPI.getByGroup error:', error);
      // Re-lanzar el error para que el componente lo maneje
      throw error;
    }
  },

  async create(data) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/messages`, data);
      return response.data;
    } catch (error) {
      console.error('messagesAPI.create error:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/messages/${id}`);
      return response.data;
    } catch (error) {
      console.error('messagesAPI.delete error:', error);
      throw error;
    }
  }
};

