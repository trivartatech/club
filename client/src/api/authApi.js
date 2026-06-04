import api from './axiosInstance';
export const login = (data) => api.post('/auth/login', data);
export const me = () => api.get('/auth/me');
export const changePassword = (data) => api.post('/auth/change-password', data);
