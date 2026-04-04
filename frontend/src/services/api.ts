import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const scriptsService = {
  // Lectura
  getAll: (params?: Record<string, string>) =>
    api.get('/scripts', { params }),
  getById: (id: string) =>
    api.get(`/scripts/${id}`),
  getCategories: () =>
    api.get('/scripts/categories'),

  // Uso de scripts
  generate: (id: string, variables: Record<string, string>) =>
    api.post(`/scripts/${id}/generate`, { variables_values: variables }),
  saveCustomization: (id: string, data: { custom_content: string; name: string }) =>
    api.post(`/scripts/${id}/customize`, data),

  // Gestión (supervisor / admin)
  create: (data: Record<string, unknown>) =>
    api.post('/scripts', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/scripts/${id}`, data),
  remove: (id: string) =>
    api.delete(`/scripts/${id}`),
  createCategory: (data: { name: string; color: string; description?: string }) =>
    api.post('/scripts/categories', data),
  removeCategory: (id: string) =>
    api.delete(`/scripts/categories/${id}`),
};

export default api;
