import proj4 from 'proj4';
import type { FeatureCollection, Geometry, Position } from 'geojson';
import type { Bounds, CoordinateFormat, Layer, LayerStyle, LegendItem, StyleClass, StyleRule } from '../types';

proj4.defs(
  'EPSG:9377',
  '+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);
proj4.defs(
  'EPSG:3116',
  '+proj=tmerc +lat_0=4.596200416666666 +lon_0=-74.07750791666666 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

export const CRS_NAMES: Record<string, string> = {
  'EPSG:4326': 'WGS 84',
  'EPSG:9377': 'CTM12 (EPSG:9377)',
  'EPSG:3116': 'Bogotá (EPSG:3116)',
};

export function toProjected(crs: 'EPSG:9377' | 'EPSG:3116' | 'EPSG:3857', lng: number, lat: number): [number, number] {
  return proj4('EPSG:4326', crs, [lng, lat]) as [number, number];
}

export function toWgs84(crs: string, x: number, y: number): [number, number] {
  return proj4(crs, 'EPSG:4326', [x, y]) as [number, number];
}

export function isKnownCrs(crs: string): boolean {
  try {
    return Boolean(proj4.defs(crs));
  } catch {
    return false;
  }
}

export function formatDms(value: number, isLat: boolean): string {
  const hemi = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const abs = Math.abs(value);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = ((abs - d) * 60 - m) * 60;
  if (s >= 59.995) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  return `${d}°${String(m).padStart(2, '0')}'${s.toFixed(2).padStart(5, '0')}"${hemi}`;
}

const thousands = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function formatCoordinate(format: CoordinateFormat, lng: number, lat: number): string {
  switch (format) {
    case 'decimal':
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    case 'dms':
      return `${formatDms(lat, true)}  ${formatDms(lng, false)}`;
    default: {
      const [x, y] = toProjected(format, lng, lat);
      return `E ${thousands.format(x)}  N ${thousands.format(y)}`;
    }
  }
}

// --- Measurement (spherical earth, same radius as turf.js) ------------------

const EARTH_RADIUS = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceMeters(a: Position, b: Position): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lineLengthMeters(points: Position[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceMeters(points[i - 1], points[i]);
  return total;
}

/** Area of a closed or open ring on the sphere (Chamberlain & Duquette). */
export function polygonAreaSqMeters(ring: Position[]): number {
  const n = ring.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % n];
    total += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1])));
  }
  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

const num = (v: number, digits = 2) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(v);

export function formatDistance(m: number): string {
  return m >= 1000 ? `${num(m / 1000, 3)} km` : `${num(m)} m`;
}

export function formatArea(m2: number): string {
  return `${num(m2)} m²  ·  ${num(m2 / 10000, 4)} ha`;
}

// --- Bounds -----------------------------------------------------------------

function eachPosition(geom: Geometry | null, fn: (p: Position) => void) {
  if (!geom) return;
  switch (geom.type) {
    case 'Point': fn(geom.coordinates); break;
    case 'MultiPoint':
    case 'LineString': geom.coordinates.forEach(fn); break;
    case 'MultiLineString':
    case 'Polygon': geom.coordinates.forEach((r) => r.forEach(fn)); break;
    case 'MultiPolygon': geom.coordinates.forEach((p) => p.forEach((r) => r.forEach(fn))); break;
    case 'GeometryCollection': geom.geometries.forEach((g) => eachPosition(g, fn)); break;
  }
}

export function geojsonBounds(fc: FeatureCollection | Geometry | null | undefined): Bounds | null {
  if (!fc) return null;
  const b: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const extend = (p: Position) => {
    b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]);
    b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]);
  };
  if (fc.type === 'FeatureCollection') fc.features.forEach((f) => eachPosition(f.geometry, extend));
  else eachPosition(fc, extend);
  return Number.isFinite(b[0]) ? b : null;
}

export function layerBounds(layer: Layer): Bounds | null {
  return layer.bounds ?? geojsonBounds(layer.datos_geojson);
}

export function unionBounds(list: (Bounds | null)[]): Bounds | null {
  const valid = list.filter((b): b is Bounds => b !== null);
  if (valid.length === 0) return null;
  return [
    Math.min(...valid.map((b) => b[0])),
    Math.min(...valid.map((b) => b[1])),
    Math.max(...valid.map((b) => b[2])),
    Math.max(...valid.map((b) => b[3])),
  ];
}

// --- Attributes & styling ---------------------------------------------------

export function layerFields(fc: FeatureCollection | null | undefined): string[] {
  const fields = new Set<string>();
  for (const f of fc?.features.slice(0, 200) ?? []) {
    Object.keys(f.properties ?? {}).forEach((k) => fields.add(k));
  }
  return [...fields];
}

export function geometryKind(fc: FeatureCollection | null | undefined): LegendItem['geometryType'] {
  const type = fc?.features.find((f) => f.geometry)?.geometry?.type ?? 'Polygon';
  if (type.includes('Point')) return 'point';
  if (type.includes('LineString')) return 'line';
  return 'polygon';
}

const CATEGORY_PALETTE = [
  '#2E7D32', '#1565C0', '#F9A825', '#C62828', '#6A1B9A', '#00838F',
  '#EF6C00', '#558B2F', '#AD1457', '#4E342E', '#283593', '#9E9D24',
];

const RAMP = ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'];

export function buildCategoricalRule(fc: FeatureCollection, field: string): StyleRule {
  const values: (string | number)[] = [];
  for (const f of fc.features) {
    const v = f.properties?.[field];
    if (v === null || v === undefined) continue;
    if (!values.includes(v)) values.push(v);
    if (values.length >= CATEGORY_PALETTE.length) break;
  }
  return {
    type: 'categorical',
    field,
    classes: values.map((value, i) => ({ value, color: CATEGORY_PALETTE[i], label: String(value) })),
  };
}

export function buildGraduatedRule(fc: FeatureCollection, field: string, count = 5): StyleRule {
  const nums = fc.features
    .map((f) => Number(f.properties?.[field]))
    .filter((v) => Number.isFinite(v));
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 0;
  const step = (max - min) / count || 1;
  const classes: StyleClass[] = Array.from({ length: count }, (_, i) => {
    const lo = min + step * i;
    const hi = i === count - 1 ? max : min + step * (i + 1);
    return { min: lo, max: hi, color: RAMP[i % RAMP.length], label: `${num(lo)} – ${num(hi)}` };
  });
  return { type: 'graduated', field, classes };
}

export function isNumericField(fc: FeatureCollection | null | undefined, field: string): boolean {
  const sample = (fc?.features ?? []).slice(0, 50).map((f) => f.properties?.[field]).filter((v) => v !== null && v !== undefined && v !== '');
  return sample.length > 0 && sample.every((v) => Number.isFinite(Number(v)));
}

/** MapLibre expression for the colour of a feature under a style. */
export function colorExpression(style: LayerStyle, fallback: string): unknown {
  const rule = style.rule;
  if (!rule || rule.classes.length === 0) return fallback;
  if (rule.type === 'categorical') {
    const pairs = rule.classes.flatMap((c) => [String(c.value), c.color]);
    return ['match', ['to-string', ['get', rule.field]], ...pairs, fallback];
  }
  const sorted = [...rule.classes].sort((a, b) => (a.min ?? 0) - (b.min ?? 0));
  const stops = sorted.slice(1).flatMap((c) => [c.min ?? 0, c.color]);
  return ['step', ['to-number', ['get', rule.field], 0], sorted[0].color, ...stops];
}

export function legendForLayer(layer: Layer): LegendItem {
  const s = layer.estilo;
  return {
    label: layer.nombre_personalizado,
    geometryType: geometryKind(layer.datos_geojson),
    fillColor: s.fillColor,
    strokeColor: s.strokeColor,
    fillOpacity: s.fillOpacity,
    strokeWidth: s.strokeWidth,
    classes: [
      ...(s.rule?.classes ?? []).map((c) => ({
        label: c.label || String(c.value ?? ''),
        color: c.color,
      })),
      // Features matching no category keep the base fill colour.
      ...(s.rule?.type === 'categorical' ? [{ label: 'Otros valores', color: s.fillColor }] : []),
    ],
  };
}

export function matchesFilter(value: unknown, term: string): boolean {
  return String(value ?? '').toLowerCase().includes(term.toLowerCase());
}
