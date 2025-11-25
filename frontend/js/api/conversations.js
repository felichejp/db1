const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const conversationsAPI = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/api/messages/conversations`);
    return response.data;
  },

  async getMessages(userId) {
    const response = await axios.get(`${API_BASE_URL}/api/messages/private/${userId}`);
    return response.data;
  },

  async sendMessage(recipientId, content) {
    const response = await axios.post(`${API_BASE_URL}/api/messages`, {
      recipientId,
      content,
      tipo: 'texto'
    });
    return response.data;
  }
};

