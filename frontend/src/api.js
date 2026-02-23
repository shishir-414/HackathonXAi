import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
};

// Video API
export const videoAPI = {
  generate: (data) => api.post('/api/videos/generate', data),
  list: (params) => api.get('/api/videos/', { params }),
  feed: (params) => api.get('/api/videos/feed', { params }),
  get: (id) => api.get(`/api/videos/${id}`),
  delete: (id) => api.delete(`/api/videos/${id}`),
  streamUrl: (id) => `${API_BASE}/api/videos/${id}/stream`,
  thumbnailUrl: (id) => `${API_BASE}/api/videos/${id}/thumbnail`,
};

// Document API
export const documentAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => api.get('/api/documents/'),
  get: (id) => api.get(`/api/documents/${id}`),
  getQuestions: (id) => api.get(`/api/documents/${id}/questions`),
  generateVideo: (docId, questionIndex) =>
    api.post(`/api/documents/${docId}/generate-video?question_index=${questionIndex}`),
};

export default api;
