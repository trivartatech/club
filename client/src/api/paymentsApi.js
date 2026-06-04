import api from './axiosInstance';
export const getPayments = (params) => api.get('/payments', { params });
export const getMemberPayments = (memberId) => api.get(`/payments/member/${memberId}`);
export const recordPayment = (data) => api.post('/payments', data);
export const getReceipt = (id) => api.get(`/payments/receipt/${id}`);
export const getFeeConfig = () => api.get('/fee-config');
export const updateFeeConfig = (data) => api.put('/fee-config', data);
