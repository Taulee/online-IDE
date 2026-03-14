import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000 // 60 seconds for code execution
});

// Execute code
export const executeCode = async (code, language, stdin = '') => {
  const response = await api.post('/execute', { code, language, stdin });
  return response.data;
};

// File operations
export const getFiles = async () => {
  const response = await api.get('/files');
  return response.data;
};

export const getFile = async (id) => {
  const response = await api.get(`/files/${id}`);
  return response.data;
};

export const saveFile = async ({ id, name, content, language }) => {
  if (id) {
    const response = await api.put(`/files/${id}`, { name, content, language });
    return response.data;
  } else {
    const response = await api.post('/files', { name, content, language });
    return response.data;
  }
};

export const deleteFile = async (id) => {
  const response = await api.delete(`/files/${id}`);
  return response.data;
};

export default api;
