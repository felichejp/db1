const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

export const tutorsAPI = {
  async getAll() {
    const response = await axios.get(`${API_BASE_URL}/api/tutors`);
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_BASE_URL}/api/tutors/${id}`);
    return response.data;
  },

  async getProfile(id) {
    const response = await axios.get(`${API_BASE_URL}/api/tutors/${id}/profile`);
    return response.data;
  },

  async getAvailability(id) {
    const response = await axios.get(`${API_BASE_URL}/api/tutors/${id}/availability`);
    return response.data;
  },

  async createAvailability(id, data) {
    const response = await axios.post(`${API_BASE_URL}/api/tutors/${id}/availability`, data);
    return response.data;
  },

  async deleteAvailability(id, availabilityId) {
    const response = await axios.delete(`${API_BASE_URL}/api/tutors/${id}/availability/${availabilityId}`);
    return response.data;
  },

  async getSubjects(id) {
    const response = await axios.get(`${API_BASE_URL}/api/tutors/${id}/subjects`);
    return response.data;
  },

  async addSubject(id, data) {
    const response = await axios.post(`${API_BASE_URL}/api/tutors/${id}/subjects`, data);
    return response.data;
  },

  async deleteSubject(id, subjectId) {
    const response = await axios.delete(`${API_BASE_URL}/api/tutors/${id}/subjects/${subjectId}`);
    return response.data;
  },

  async getMatching(params) {
    const response = await axios.get(`${API_BASE_URL}/api/tutors/matching`, { params });
    return response.data;
  }
};

