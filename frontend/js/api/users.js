const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const usersAPI = {
  async getChatUsers() {
    const response = await axios.get(`${API_BASE_URL}/api/users/chat/list`);
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/users/${id}`);
    return response.data;
  }
};

