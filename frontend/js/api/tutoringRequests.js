const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const tutoringRequestsAPI = {
  async create(data) {
    const response = await axios.post(`${API_BASE_URL}/api/tutoring-requests`, data);
    return response.data;
  },

  async getAvailableGroups() {
    const response = await axios.get(`${API_BASE_URL}/api/tutoring-requests/available-groups`);
    return response.data;
  },

  async getTutorRequests() {
    const response = await axios.get(`${API_BASE_URL}/api/tutoring-requests/tutor`);
    return response.data;
  },

  async acceptRequest(id) {
    const response = await axios.put(`${API_BASE_URL}/api/tutoring-requests/${id}/accept`);
    return response.data;
  },

  async rejectRequest(id, motivoRechazo) {
    const response = await axios.put(`${API_BASE_URL}/api/tutoring-requests/${id}/reject`, { motivoRechazo });
    return response.data;
  }
};

