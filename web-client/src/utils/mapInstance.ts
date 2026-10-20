import type maplibregl from 'maplibre-gl';

// The interactive map lives in MapView; export and tools elsewhere read it from here.
let current: maplibregl.Map | null = null;

export function setMapInstance(map: maplibregl.Map | null) {
  current = map;
}

export function getMapInstance(): maplibregl.Map | null {
  return current;
}
