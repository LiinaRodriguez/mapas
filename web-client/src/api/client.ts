import axios from 'axios';
import type { User, Project, Layer, TokenResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export async function registerUser(data: {
  nombre: string;
  email: string;
  password: string;
  es_licenciado: boolean;
  numero_licencia?: string;
}): Promise<TokenResponse> {
  const res = await api.post('/auth/register', data);
  return res.data;
}

export async function loginUser(email: string, password: string): Promise<TokenResponse> {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function updateMe(data: Partial<User>): Promise<User> {
  const res = await api.patch('/auth/me', data);
  return res.data;
}

export async function getProyectos(): Promise<Project[]> {
  const res = await api.get('/proyectos');
  return res.data;
}

export async function createProyecto(nombre: string, descripcion?: string): Promise<Project> {
  const res = await api.post('/proyectos', { nombre, descripcion });
  return res.data;
}

export async function updateProyecto(id: number, data: Partial<Project>): Promise<Project> {
  const res = await api.patch(`/proyectos/${id}`, data);
  return res.data;
}

export async function deleteProyecto(id: number): Promise<void> {
  await api.delete(`/proyectos/${id}`);
}


export async function getLibraryCapas(): Promise<Layer[]> {
  const res = await api.get('/capas');
  return res.data;
}

export async function getProyectoCapas(proyectoId: number): Promise<Layer[]> {
  const res = await api.get(`/proyectos/${proyectoId}/capas`);
  return res.data;
}

export async function uploadCapa(
  file: File,
  proyectoId?: number | null,
  onProgress?: (pct: number) => void
): Promise<Layer> {
  const formData = new FormData();
  formData.append('file', file);

  let url = '/capas';
  if (proyectoId) {
    url += `?proyecto_id=${proyectoId}`;
  }

  const res = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data;
}

export async function linkCapaToProyecto(proyectoId: number, capaId: number): Promise<Layer> {
  const res = await api.post(`/proyectos/${proyectoId}/capas/${capaId}`);
  return res.data;
}

export async function unlinkCapaFromProyecto(proyectoId: number, capaId: number): Promise<void> {
  await api.delete(`/proyectos/${proyectoId}/capas/${capaId}`);
}

export async function updateCapa(
  id: number,
  data: { nombre_personalizado?: string; color?: string }
): Promise<Layer> {
  const res = await api.patch(`/capas/${id}`, data);
  return res.data;
}

export async function deleteCapaPermanently(id: number): Promise<void> {
  await api.delete(`/capas/${id}`);
}

export async function getCapaGeoJson(id: number): Promise<any> {
  const res = await api.get(`/capas/${id}/geojson`);
  return res.data;
}

export default api;
