const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const tutorRequestsAPI = {
  async createSubjectRequest(data) {
    const response = await axios.post(`${API_BASE_URL}/api/tutor-requests/subject-request`, data);
    return response.data;
  },

  async createTeacherSupportRequest(data) {
    const response = await axios.post(`${API_BASE_URL}/api/tutor-requests/teacher-support`, data);
    return response.data;
  },

  async getTeacherSupportRequests() {
    const response = await axios.get(`${API_BASE_URL}/api/tutor-requests/teacher-support`);
    return response.data;
  },

  async acceptTeacherSupportRequest(id) {
    const response = await axios.put(`${API_BASE_URL}/api/tutor-requests/teacher-support/${id}/accept`);
    return response.data;
  },

  async rejectTeacherSupportRequest(id, motivoRechazo) {
    const response = await axios.put(`${API_BASE_URL}/api/tutor-requests/teacher-support/${id}/reject`, { motivoRechazo });
    return response.data;
  },

  async getSubjectRequests() {
    const response = await axios.get(`${API_BASE_URL}/api/tutor-requests/subject-requests`);
    return response.data;
  },

  async acceptSubjectRequest(id) {
    const response = await axios.put(`${API_BASE_URL}/api/tutor-requests/subject-requests/${id}/accept`);
    return response.data;
  },

  async rejectSubjectRequest(id, motivoRechazo) {
    const response = await axios.put(`${API_BASE_URL}/api/tutor-requests/subject-requests/${id}/reject`, { motivoRechazo });
    return response.data;
  }
};

