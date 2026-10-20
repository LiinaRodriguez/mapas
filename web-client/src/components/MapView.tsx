import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { useLayers } from '../hooks/useLayers';
import { useBoxZoomTool, useMeasureTool } from '../hooks/useMapTools';
import { setMapInstance } from '../utils/mapInstance';
import {
  INITIAL_VIEW, applyBasemap, baseStyle, syncRasterLayers, syncVectorLayers, vectorLayerIds,
} from '../utils/mapLayers';
import { MapToolbar } from './MapToolbar';
import { CoordinateBar } from './CoordinateBar';
import { MeasurePanel } from './MeasurePanel';
import { AttributeTable } from './AttributeTable';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [styleReady, setStyleReady] = useState(false);
  const layers = useStore((s) => s.layers);
  const rasterLayers = useStore((s) => s.rasterLayers);
  const basemap = useStore((s) => s.basemap);
  const attributeFilters = useStore((s) => s.attributeFilters);
  const attributeLayerId = useStore((s) => s.attributeLayerId);
  const { fetchLayerGeoJson, loading: layersLoading } = useLayers();

  const measurement = useMeasureTool(map);
  useBoxZoomTool(map);

  useEffect(() => {
    if (!mapContainer.current) return;

    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: baseStyle(useStore.getState().basemap),
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    instance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    instance.addControl(new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }), 'bottom-left');

    instance.on('click', (e) => {
      if (useStore.getState().activeTool !== 'none') return;
      const features = instance.queryRenderedFeatures(e.point, { layers: vectorLayerIds(instance) });
      const feature = features[0];
      if (!feature) return;

      const layerId = Number(String(feature.source).replace('layer-', ''));
      const layer = useStore.getState().layers.find((l) => l.id === layerId);
      const props = feature.properties ?? {};

      let html = `<div class="popup-title">${escapeHtml(layer?.nombre_personalizado ?? 'Atributos')}</div>`;
      html += '<table class="popup-table">';
      for (const [key, value] of Object.entries(props)) {
        html += `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`;
      }
      if (Object.keys(props).length === 0) html += '<tr><td>Sin atributos</td></tr>';
      html += '</table>';

      new maplibregl.Popup({ maxWidth: '320px' }).setLngLat(e.lngLat).setHTML(html).addTo(instance);
    });

    instance.on('mousemove', (e) => {
      if (useStore.getState().activeTool !== 'none') return;
      const hit = instance.queryRenderedFeatures(e.point, { layers: vectorLayerIds(instance) }).length > 0;
      instance.getCanvas().style.cursor = hit ? 'pointer' : '';
    });

    // 'load' waits for every basemap tile; project layers only need the style.
    instance.once('style.load', () => setStyleReady(true));
    setMap(instance);
    setMapInstance(instance);

    return () => {
      setMapInstance(null);
      instance.remove();
      setMap(null);
      setStyleReady(false);
    };
  }, []);

  useEffect(() => {
    if (!map || !styleReady) return;
    for (const layer of layers) {
      if (layer.visible !== false && !layer.datos_geojson) {
        fetchLayerGeoJson(layer.id).catch(() => {});
      }
    }
    syncVectorLayers(map, layers, attributeFilters);
  }, [map, styleReady, layers, attributeFilters, fetchLayerGeoJson]);

  useEffect(() => {
    if (map && styleReady) syncRasterLayers(map, rasterLayers);
  }, [map, styleReady, rasterLayers, layers]);

  useEffect(() => {
    if (map && styleReady) applyBasemap(map, basemap);
  }, [map, styleReady, basemap]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" id="map-view" />

      <MapToolbar map={map} />
      <CoordinateBar map={map} />
      {measurement && <MeasurePanel measurement={measurement} />}
      {attributeLayerId !== null && <AttributeTable map={map} />}

      {layersLoading && (
        <div className="map-loading">
          <div className="spinner" style={{ width: '40px', height: '40px' }} />
          <div className="map-loading-text">Cargando datos del proyecto...</div>
        </div>
      )}
    </div>
  );
}
