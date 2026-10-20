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

export interface StyleClass {
  value?: string | number | null;
  min?: number | null;
  max?: number | null;
  color: string;
  label?: string | null;
}

export interface StyleRule {
  type: 'categorical' | 'graduated';
  field: string;
  classes: StyleClass[];
}

export interface LayerStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  rule?: StyleRule | null;
}

export type Bounds = [number, number, number, number];

/** LayerConfig: a library layer plus its configuration inside the active project. */
export interface Layer {
  id: number;
  usuario_id: number;
  nombre_personalizado: string;
  nombre_original: string;
  tipo_archivo: string | null;
  color: string;
  estilo: LayerStyle;
  bounds: Bounds | null;
  created_at: string;
  visible?: boolean;
  opacidad?: number;
  orden?: number;
  datos_geojson?: FeatureCollection | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type BasemapId = 'satellite' | 'osm' | 'light' | 'none';

export type MapTool = 'none' | 'zoom-box' | 'measure-distance' | 'measure-area';

export type CoordinateFormat = 'decimal' | 'dms' | 'EPSG:9377' | 'EPSG:3116';

export interface RasterLayer {
  id: string;
  name: string;
  kind: 'wms' | 'xyz' | 'geotiff';
  visible: boolean;
  opacity: number;
  tiles?: string[];
  image?: string;
  coordinates?: [[number, number], [number, number], [number, number], [number, number]];
}

export interface AttributeFilter {
  field: string | null;
  term: string;
  applyToMap: boolean;
}

export type PaperSize = 'Carta' | 'A4' | 'A3';
export type Orientation = 'landscape' | 'portrait';
export type GridCrs = 'EPSG:4326' | 'EPSG:9377' | 'EPSG:3116';

export interface LegendItem {
  label: string;
  geometryType: 'polygon' | 'line' | 'point';
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeWidth: number;
  classes: { label: string; color: string }[];
}

export interface PDFExportPayload {
  title: string;
  subtitle?: string;
  notes?: string;
  author?: string;
  license?: string;
  paperSize: PaperSize;
  orientation: Orientation;
  dpi: number;
  bbox: Bounds;
  includeLegend: boolean;
  includeGrid: boolean;
  includeNorthArrow: boolean;
  includeScale: boolean;
  gridCrs: GridCrs;
  georeferenced: boolean;
  layers: number[];
  legend: LegendItem[];
  mapImage: string;
}

export interface MapFrame {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}
