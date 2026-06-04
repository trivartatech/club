import api from './axiosInstance';
export const getMembers = (params) => api.get('/members', { params });
export const getNextMemberNumber = () => api.get('/members/next-number');
export const checkPhone = (phone, exclude) => api.get('/members/check-phone', { params: { phone, exclude } });
export const bulkImportMembers = (members) => api.post('/members/bulk', { members });
export const getMemberNumberConfig = () => api.get('/member-number-config');
export const updateMemberNumberConfig = (data) => api.put('/member-number-config', data);
export const getMember = (id) => api.get(`/members/${id}`);
export const createMember = (data) => api.post('/members', data);
export const updateMember = (id, data) => api.put(`/members/${id}`, data);
export const deleteMember = (id) => api.delete(`/members/${id}`);
export const upgradeToGeneral = (id) => api.post(`/members/${id}/upgrade-general`);
export const upgradeToLifetime = (id) => api.post(`/members/${id}/upgrade-lifetime`);
export const uploadPhoto = (id, formData) =>
  api.post(`/members/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
