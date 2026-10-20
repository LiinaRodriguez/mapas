import { useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection, Position } from 'geojson';
import { useStore } from '../store/useStore';
import { lineLengthMeters, polygonAreaSqMeters } from '../utils/geo';
import { bringOverlaysToFront } from '../utils/mapLayers';

const MEASURE_SOURCE = 'measure';

export interface Measurement {
  mode: 'measure-distance' | 'measure-area';
  points: Position[];
  done: boolean;
  distance: number;
  area: number;
}

function measureGeoJson(points: Position[], cursor: Position | null, area: boolean): FeatureCollection {
  const all = cursor ? [...points, cursor] : points;
  const features: Feature[] = points.map((p) => ({
    type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p },
  }));
  if (all.length >= 2) {
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: area ? [...all, all[0]] : all } });
  }
  if (area && all.length >= 3) {
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...all, all[0]]] } });
  }
  return { type: 'FeatureCollection', features };
}

function ensureMeasureLayers(map: maplibregl.Map) {
  if (map.getSource(MEASURE_SOURCE)) return;
  map.addSource(MEASURE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'measure-fill', type: 'fill', source: MEASURE_SOURCE,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': '#facc15', 'fill-opacity': 0.2 },
  });
  map.addLayer({
    id: 'measure-line', type: 'line', source: MEASURE_SOURCE,
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#facc15', 'line-width': 2.5, 'line-dasharray': [2, 1] },
  });
  map.addLayer({
    id: 'measure-points', type: 'circle', source: MEASURE_SOURCE,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': 4, 'circle-color': '#ffffff', 'circle-stroke-color': '#a16207', 'circle-stroke-width': 2 },
  });
  bringOverlaysToFront(map);
}

/** Distance / area measurement: click to add vertices, double click to finish. */
export function useMeasureTool(map: maplibregl.Map | null) {
  const activeTool = useStore((s) => s.activeTool);
  const isMeasuring = activeTool === 'measure-distance' || activeTool === 'measure-area';
  const [measurement, setMeasurement] = useState<Measurement | null>(null);

  useEffect(() => {
    if (!map || !isMeasuring) return;
    const isArea = activeTool === 'measure-area';
    let points: Position[] = [];
    let done = false;

    const render = (cursor: Position | null) => {
      ensureMeasureLayers(map);
      (map.getSource(MEASURE_SOURCE) as maplibregl.GeoJSONSource).setData(measureGeoJson(points, cursor, isArea));
      const pts = cursor && !done ? [...points, cursor] : points;
      setMeasurement({
        mode: activeTool,
        points: [...points],
        done,
        distance: lineLengthMeters(isArea && pts.length > 2 ? [...pts, pts[0]] : pts),
        area: isArea ? polygonAreaSqMeters(pts) : 0,
      });
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (done) {
        points = [];
        done = false;
      }
      points.push([e.lngLat.lng, e.lngLat.lat]);
      render(null);
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!done && points.length > 0) render([e.lngLat.lng, e.lngLat.lat]);
    };
    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      // The double click also fired two clicks: drop the duplicate vertex.
      if (points.length > 1) points.pop();
      done = true;
      render(null);
    };

    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', onClick);
    map.on('mousemove', onMove);
    map.on('dblclick', onDblClick);
    render(null);

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMove);
      map.off('dblclick', onDblClick);
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
      const src = map.getSource(MEASURE_SOURCE) as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: [] });
      setMeasurement(null);
    };
  }, [map, isMeasuring, activeTool]);

  return measurement;
}

/** Zoom to a rectangle drawn with the mouse, without holding Shift. */
export function useBoxZoomTool(map: maplibregl.Map | null) {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);

  useEffect(() => {
    if (!map || activeTool !== 'zoom-box') return;
    const canvas = map.getCanvasContainer();
    let start: maplibregl.Point | null = null;
    let box: HTMLDivElement | null = null;

    const pos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return new maplibregl.Point(e.clientX - rect.left, e.clientY - rect.top);
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      start = pos(e);
      box = document.createElement('div');
      box.className = 'zoom-box';
      canvas.appendChild(box);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    const onMove = (e: MouseEvent) => {
      if (!start || !box) return;
      const p = pos(e);
      box.style.left = `${Math.min(start.x, p.x)}px`;
      box.style.top = `${Math.min(start.y, p.y)}px`;
      box.style.width = `${Math.abs(p.x - start.x)}px`;
      box.style.height = `${Math.abs(p.y - start.y)}px`;
    };
    const onUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      box?.remove();
      box = null;
      if (!start) return;
      const end = pos(e);
      if (Math.abs(end.x - start.x) > 5 && Math.abs(end.y - start.y) > 5) {
        const bounds = new maplibregl.LngLatBounds(map.unproject(start), map.unproject(start));
        bounds.extend(map.unproject(end));
        map.fitBounds(bounds, { duration: 600 });
        setActiveTool('none');
      }
      start = null;
    };

    map.dragPan.disable();
    map.getCanvas().style.cursor = 'crosshair';
    canvas.addEventListener('mousedown', onDown);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      box?.remove();
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
    };
  }, [map, activeTool, setActiveTool]);
}
