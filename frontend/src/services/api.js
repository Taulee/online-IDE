import axios from 'axios';

const TOKEN_KEY = 'online_ide_token';
const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000
});

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return Boolean(getToken());
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export async function login(username, password) {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}

// Execute code
export async function executeCode(code, language, stdin = '') {
  const response = await api.post('/execute', { code, language, stdin });
  return response.data;
}

// File operations
export async function getFiles() {
  const response = await api.get('/files');
  return response.data;
}

export async function getFile(id) {
  const response = await api.get(`/files/${id}`);
  return response.data;
}

export async function saveFile({ id, name, content, language }) {
  if (id) {
    const response = await api.put(`/files/${id}`, { name, content, language });
    return response.data;
  }

  const response = await api.post('/files', { name, content, language });
  return response.data;
}

export async function deleteFile(id) {
  const response = await api.delete(`/files/${id}`);
  return response.data;
}

// Users (teacher)
export async function getUsers() {
  const response = await api.get('/users');
  return response.data;
}

export async function createUser(payload) {
  const response = await api.post('/users', payload);
  return response.data;
}

export async function updateUser(userId, payload) {
  const response = await api.put(`/users/${userId}`, payload);
  return response.data;
}

export async function removeUser(userId) {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
}

// Submissions
export async function getTeachers() {
  const response = await api.get('/submissions/teachers');
  return response.data;
}

export async function submitCode(payload) {
  const response = await api.post('/submissions', payload);
  return response.data;
}

export async function getMySubmissions() {
  const response = await api.get('/submissions/mine');
  return response.data;
}

export async function getReceivedSubmissions() {
  const response = await api.get('/submissions/received');
  return response.data;
}

export default api;
