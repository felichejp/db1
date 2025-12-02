const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const sessionsAPI = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/api/sessions`);
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/sessions/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await axios.post(`${API_BASE_URL}/api/sessions`, data);
    return response.data;
  },

  async update(id, data) {
    const response = await axios.put(`${API_BASE_URL}/api/sessions/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_BASE_URL}/api/sessions/${id}`);
    return response.data;
  },

  async start(id) {
    const response = await axios.put(`${API_BASE_URL}/api/sessions/${id}/start`);
    return response.data;
  },

  async complete(id) {
    const response = await axios.put(`${API_BASE_URL}/api/sessions/${id}/complete`);
    return response.data;
  },

  async getCalendar(startDate, endDate) {
    const response = await axios.get(`${API_BASE_URL}/api/sessions/calendar`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  async request(data) {
    const response = await axios.post(`${API_BASE_URL}/api/sessions/request`, data);
    return response.data;
  },

  async updateStatus(id, data) {
    const response = await axios.put(`${API_BASE_URL}/api/sessions/${id}/status`, data);
    return response.data;
  }
};

