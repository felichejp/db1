const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const messagesAPI = {
  async getByGroup(groupId) {
    const response = await axios.get(`${API_BASE_URL}/api/messages/group/${groupId}`);
    return response.data;
  },

  async create(data) {
    const response = await axios.post(`${API_BASE_URL}/api/messages`, data);
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_BASE_URL}/api/messages/${id}`);
    return response.data;
  }
};

