import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { useStore } from '../store/useStore';
import type { CoordinateFormat } from '../types';
import { formatCoordinate } from '../utils/geo';

const FORMATS: { id: CoordinateFormat; label: string }[] = [
  { id: 'decimal', label: 'WGS84 decimal' },
  { id: 'dms', label: 'WGS84 GMS' },
  { id: 'EPSG:9377', label: 'CTM12 (EPSG:9377)' },
  { id: 'EPSG:3116', label: 'Bogotá (EPSG:3116)' },
];

export function CoordinateBar({ map }: { map: maplibregl.Map | null }) {
  const format = useStore((s) => s.coordinateFormat);
  const setFormat = useStore((s) => s.setCoordinateFormat);
  const [lngLat, setLngLat] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    let frame = 0;
    const onMove = (e: maplibregl.MapMouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLngLat({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
    };
    const onOut = () => setLngLat(null);
    map.on('mousemove', onMove);
    map.on('mouseout', onOut);
    return () => {
      cancelAnimationFrame(frame);
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
    };
  }, [map]);

  return (
    <div className="coordinate-bar">
      <select
        className="coordinate-select"
        value={format}
        onChange={(e) => setFormat(e.target.value as CoordinateFormat)}
        aria-label="Sistema de coordenadas"
      >
        {FORMATS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>
      <span className="coordinate-value">
        {lngLat ? formatCoordinate(format, lngLat.lng, lngLat.lat) : 'Mueva el cursor sobre el mapa'}
      </span>
    </div>
  );
}
