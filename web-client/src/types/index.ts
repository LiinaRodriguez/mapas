import type { FeatureCollection } from 'geojson';

export interface User {
  id: number;
  nombre: string;
  email: string;
  es_licenciado: boolean;
  numero_licencia: string | null;
}

export interface Project {
  id: number;
  nombre: string;
  descripcion: string | null;
  created_at: string;
  updated_at: string | null;
  capas_count: number;
}

export interface Layer {
  id: number;
  usuario_id: number;
  nombre_personalizado: string;
  nombre_original: string;
  tipo_archivo: string | null;
  color: string;
  created_at: string;
  datos_geojson?: FeatureCollection | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
