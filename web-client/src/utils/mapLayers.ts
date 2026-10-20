import type maplibregl from 'maplibre-gl';
import type { FilterSpecification, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { AttributeFilter, BasemapId, Layer, RasterLayer } from '../types';
import { colorExpression, layerFields } from './geo';

export const INITIAL_VIEW = { center: [-73.2458, 3.7125] as [number, number], zoom: 12 };

export const BASEMAPS: { id: BasemapId; name: string }[] = [
  { id: 'satellite', name: 'Satélite' },
  { id: 'osm', name: 'OpenStreetMap' },
  { id: 'light', name: 'Claro' },
  { id: 'none', name: 'Sin mapa base' },
];

export function baseStyle(basemap: BasemapId): StyleSpecification {
  const raster = (tiles: string[], attribution: string, maxzoom = 19) => ({
    type: 'raster' as const,
    tiles,
    tileSize: 256,
    attribution,
    maxzoom,
  });
  return {
    version: 8,
    sources: {
      'basemap-satellite': raster(['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], '© Google Maps', 22),
      'basemap-osm': raster(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], '© OpenStreetMap contributors'),
      'basemap-light': raster(
        ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', 'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
        '© OpenStreetMap contributors © CARTO'
      ),
    },
    layers: [
      { id: 'basemap-background', type: 'background', paint: { 'background-color': '#f1f5f9' } },
      ...(['satellite', 'osm', 'light'] as const).map((id) => ({
        id: `basemap-${id}`,
        type: 'raster' as const,
        source: `basemap-${id}`,
        layout: { visibility: (id === basemap ? 'visible' : 'none') as 'visible' | 'none' },
      })),
    ],
  };
}

export function applyBasemap(map: maplibregl.Map, basemap: BasemapId) {
  for (const { id } of BASEMAPS) {
    if (id === 'none') continue;
    const layerId = `basemap-${id}`;
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', id === basemap ? 'visible' : 'none');
  }
}

// --- Vector layers -----------------------------------------------------------

const SUBLAYERS = ['fill', 'outline', 'line', 'circle'] as const;
type Sublayer = (typeof SUBLAYERS)[number];

const GEOMETRY_FILTERS: Record<Sublayer, FilterSpecification> = {
  fill: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
  outline: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
  line: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
  circle: ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
};

export const sourceId = (layerId: number) => `layer-${layerId}`;
export const sublayerIds = (layerId: number) => SUBLAYERS.map((s) => `${sourceId(layerId)}-${s}`);

const sourceData = new WeakMap<maplibregl.Map, Map<string, FeatureCollection>>();

function searchExpression(filter: AttributeFilter | undefined, fc: FeatureCollection): FilterSpecification | null {
  if (!filter || !filter.applyToMap || !filter.term.trim()) return null;
  const term = filter.term.trim().toLowerCase();
  const fields = filter.field ? [filter.field] : layerFields(fc);
  if (fields.length === 0) return null;
  const tests = fields.map((f) => ['in', term, ['downcase', ['to-string', ['get', f]]]]);
  return (tests.length === 1 ? tests[0] : ['any', ...tests]) as FilterSpecification;
}

function ensureLayer(map: maplibregl.Map, layer: Layer, fc: FeatureCollection) {
  const src = sourceId(layer.id);
  let known = sourceData.get(map);
  if (!known) {
    known = new Map();
    sourceData.set(map, known);
  }

  const existing = map.getSource(src) as maplibregl.GeoJSONSource | undefined;
  if (!existing) {
    map.addSource(src, { type: 'geojson', data: fc });
    known.set(src, fc);
  } else if (known.get(src) !== fc) {
    existing.setData(fc);
    known.set(src, fc);
  }

  for (const sub of SUBLAYERS) {
    const id = `${src}-${sub}`;
    if (map.getLayer(id)) continue;
    const type = sub === 'outline' ? 'line' : sub;
    map.addLayer({ id, type, source: src, filter: GEOMETRY_FILTERS[sub] } as maplibregl.AddLayerObject);
  }
}

function applyPaint(map: maplibregl.Map, layer: Layer, filter: FilterSpecification | null) {
  const src = sourceId(layer.id);
  const style = layer.estilo;
  const opacity = layer.opacidad ?? 1;
  const visibility = layer.visible === false ? 'none' : 'visible';
  const color = colorExpression(style, style.fillColor);
  const lineColor = style.rule ? colorExpression(style, style.strokeColor) : style.strokeColor;

  const paint: Record<Sublayer, Record<string, unknown>> = {
    fill: { 'fill-color': color, 'fill-opacity': style.fillOpacity * opacity },
    outline: { 'line-color': style.strokeColor, 'line-width': style.strokeWidth, 'line-opacity': opacity },
    line: { 'line-color': lineColor, 'line-width': Math.max(style.strokeWidth, 1), 'line-opacity': opacity },
    circle: {
      'circle-color': color,
      'circle-radius': 5,
      'circle-opacity': opacity,
      'circle-stroke-color': style.strokeColor,
      'circle-stroke-width': Math.max(1, style.strokeWidth / 2),
      'circle-stroke-opacity': opacity,
    },
  };

  for (const sub of SUBLAYERS) {
    const id = `${src}-${sub}`;
    map.setLayoutProperty(id, 'visibility', visibility);
    for (const [prop, value] of Object.entries(paint[sub])) {
      map.setPaintProperty(id, prop, value);
    }
    map.setFilter(id, filter ? ['all', GEOMETRY_FILTERS[sub], filter] as FilterSpecification : GEOMETRY_FILTERS[sub]);
  }
}

/** Adds, updates, orders and removes project layers. layers[0] ends on top. */
export function syncVectorLayers(
  map: maplibregl.Map,
  layers: Layer[],
  filters: Record<number, AttributeFilter>
) {
  const wanted = new Set<string>();

  for (const layer of layers) {
    const fc = layer.datos_geojson;
    if (!fc) continue;
    wanted.add(sourceId(layer.id));
    ensureLayer(map, layer, fc);
    applyPaint(map, layer, searchExpression(filters[layer.id], fc));
  }

  for (let i = layers.length - 1; i >= 0; i--) {
    if (!wanted.has(sourceId(layers[i].id))) continue;
    for (const id of sublayerIds(layers[i].id)) map.moveLayer(id);
  }

  for (const src of Object.keys(map.getStyle().sources)) {
    if (!src.startsWith('layer-') || wanted.has(src)) continue;
    for (const sub of SUBLAYERS) {
      if (map.getLayer(`${src}-${sub}`)) map.removeLayer(`${src}-${sub}`);
    }
    map.removeSource(src);
    sourceData.get(map)?.delete(src);
  }

  bringOverlaysToFront(map);
}

export function vectorLayerIds(map: maplibregl.Map): string[] {
  return map.getStyle().layers.filter((l) => l.id.startsWith('layer-')).map((l) => l.id);
}

// --- Session raster layers (WMS, WMTS/XYZ, GeoTIFF) ---------------------------

const rasterId = (id: string) => `raster-${id}`;

export function syncRasterLayers(map: maplibregl.Map, rasters: RasterLayer[]) {
  const wanted = new Set(rasters.map((r) => rasterId(r.id)));

  for (const r of rasters) {
    const id = rasterId(r.id);
    if (!map.getSource(id)) {
      if (r.kind === 'geotiff' && r.image && r.coordinates) {
        map.addSource(id, { type: 'image', url: r.image, coordinates: r.coordinates });
      } else if (r.tiles) {
        map.addSource(id, { type: 'raster', tiles: r.tiles, tileSize: 256 });
      } else {
        continue;
      }
      map.addLayer({ id, type: 'raster', source: id });
    }
    map.setPaintProperty(id, 'raster-opacity', r.opacity);
    map.setLayoutProperty(id, 'visibility', r.visible ? 'visible' : 'none');
  }

  // Rasters sit above the basemap and below every vector layer; rasters[0] on top.
  const firstVector = map.getStyle().layers.find((l) => l.id.startsWith('layer-') || l.id.startsWith('measure-'))?.id;
  for (let i = rasters.length - 1; i >= 0; i--) {
    const id = rasterId(rasters[i].id);
    if (map.getLayer(id)) map.moveLayer(id, firstVector);
  }

  for (const src of Object.keys(map.getStyle().sources)) {
    if (!src.startsWith('raster-') || wanted.has(src)) continue;
    if (map.getLayer(src)) map.removeLayer(src);
    map.removeSource(src);
  }
}

export function bringOverlaysToFront(map: maplibregl.Map) {
  for (const l of map.getStyle().layers) {
    if (l.id.startsWith('measure-')) map.moveLayer(l.id);
  }
}

export function wmsTileUrl(baseUrl: string, layers: string): string {
  const sep = baseUrl.includes('?') ? '&' : '?';
  const params = [
    'SERVICE=WMS', 'VERSION=1.1.1', 'REQUEST=GetMap', 'FORMAT=image/png', 'TRANSPARENT=true',
    `LAYERS=${encodeURIComponent(layers)}`, 'STYLES=', 'SRS=EPSG:3857', 'WIDTH=256', 'HEIGHT=256',
    'BBOX={bbox-epsg-3857}',
  ];
  return `${baseUrl}${sep}${params.join('&')}`;
}
