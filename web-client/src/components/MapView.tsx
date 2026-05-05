import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store/useStore';
import { useLayers } from '../hooks/useLayers';
import { exportMapToPdf } from '../utils/exportPdf';
import { exportGeoTiff } from '../utils/exportGeoTiff';


export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layers = useStore((s) => s.layers);
  const visibleLayerIds = useStore((s) => s.visibleLayerIds);
  const { fetchLayerGeoJson, loading: layersLoading } = useLayers();

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'google-satellite': {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
            tileSize: 256,
            attribution: '© Google Maps',
            minzoom: 5,
            maxzoom: 22
          }
        },
        layers: [
          {
            id: 'google-layer',
            type: 'raster',
            source: 'google-satellite',
            paint: { 'raster-opacity': 1 }
          }
        ]
      },
      center: [-73.2458, 3.7125],
      zoom: 12,
      preserveDrawingBuffer: true,
    } as any);

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }),
      'bottom-left'
    );

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      const geoFeature = features.find((f) => f.source?.startsWith('layer-'));
      if (!geoFeature) return;

      const props = geoFeature.properties;
      if (!props || Object.keys(props).length === 0) return;

      let html = '<table class="popup-table">';
      for (const [key, value] of Object.entries(props)) {
        html += `<tr><th>${key}</th><td>${value ?? ''}</td></tr>`;
      }
      html += '</table>';

      new maplibregl.Popup({ maxWidth: '300px' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    map.on('mousemove', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      const hasGeo = features.some((f) => f.source?.startsWith('layer-'));
      map.getCanvas().style.cursor = hasGeo ? 'pointer' : '';
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);


  const syncLayers = useCallback(async (map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;

    const existingSources = new Set<string>();
    const style = map.getStyle();
    if (style?.sources) {
      for (const key of Object.keys(style.sources)) {
        if (key.startsWith('layer-')) existingSources.add(key);
      }
    }

    for (const layer of layers) {
      const sourceId = `layer-${layer.id}`;
      const isVisible = visibleLayerIds.has(layer.id);

      if (isVisible && !layer.datos_geojson) {
        fetchLayerGeoJson(layer.id);
        continue;
      }

      const geojson = layer.datos_geojson;
      if (!geojson) continue;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson as any,
        });

        map.addLayer({
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': layer.color,
            'fill-opacity': 0.25,
          },
        });

        map.addLayer({
          id: `${sourceId}-fill-multi`,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'MultiPolygon'],
          paint: {
            'fill-color': layer.color,
            'fill-opacity': 0.25,
          },
        });

        map.addLayer({
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': layer.color,
            'line-width': 2,
          },
        });

        map.addLayer({
          id: `${sourceId}-circle`,
          type: 'circle',
          source: sourceId,
          filter: ['any',
            ['==', ['geometry-type'], 'Point'],
            ['==', ['geometry-type'], 'MultiPoint'],
          ],
          paint: {
            'circle-color': layer.color,
            'circle-radius': 5,
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 1.5,
          },
        });
      }

      existingSources.delete(sourceId);

      const visibility = isVisible ? 'visible' : 'none';
      const subLayers = [`${sourceId}-fill`, `${sourceId}-fill-multi`, `${sourceId}-line`, `${sourceId}-circle`];
      for (const lid of subLayers) {
        if (map.getLayer(lid)) {
          map.setLayoutProperty(lid, 'visibility', visibility);
        }
      }
    }

    for (const staleSource of existingSources) {
      const subLayers = [`${staleSource}-fill`, `${staleSource}-fill-multi`, `${staleSource}-line`, `${staleSource}-circle`];
      for (const lid of subLayers) {
        if (map.getLayer(lid)) map.removeLayer(lid);
      }
      if (map.getSource(staleSource)) map.removeSource(staleSource);
    }
  }, [layers, visibleLayerIds, fetchLayerGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!map.isStyleLoaded()) {
      const handler = () => syncLayers(map);
      map.once('style.load', handler);
      return;
    }
    syncLayers(map);
  }, [layers, visibleLayerIds, syncLayers]);

  useEffect(() => {
    const handlePdfRequest = (e: any) => {
      const map = mapRef.current;
      if (!map) return;

      const { layers, format } = e.detail;

      const bounds = new maplibregl.LngLatBounds();
      let hasBounds = false;

      for (const layer of layers) {
        if (layer.datos_geojson) {
          try {
            const fc = layer.datos_geojson;
            for (const feature of fc.features) {
              const geom = feature.geometry;
              if (!geom) continue;
              const coords = extractCoords(geom);
              for (const c of coords) {
                bounds.extend(c as [number, number]);
                hasBounds = true;
              }
            }
          } catch {
          }
        }
      }

      const captureAndExport = () => {
        map.once('render', () => {
          try {
            const mapImage = map.getCanvas().toDataURL('image/png');
            const mapBounds = map.getBounds();

            window.dispatchEvent(new CustomEvent('export-complete'));

            if (format === 'pdf') {
              exportMapToPdf({ ...e.detail, mapImage });
            } else if (format === 'geotiff') {
              exportGeoTiff({
                projectName: e.detail.projectName,
                mapImage,
                mapBounds
              });
            }
          } catch (err) {
            console.error("Failed to capture map canvas:", err);
            alert("Error capturando el lienzo del mapa.");
            window.dispatchEvent(new CustomEvent('export-complete'));
          }
        });
        map.triggerRepaint();
      };

      if (hasBounds) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
        map.once('moveend', captureAndExport);
      } else {
        captureAndExport();
      }
    };

    window.addEventListener('request-pdf-export', handlePdfRequest);
    return () => window.removeEventListener('request-pdf-export', handlePdfRequest);
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, height: '100%', display: 'flex' }}>
      <div ref={mapContainer} className="map-container" id="map-view" style={{ height: '100%', width: '100%' }} />


      {layersLoading && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          gap: '16px'
        }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }} />
          <div style={{
            color: 'var(--text-primary)',
            fontWeight: 600,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: '14px'
          }}>
            Cargando datos del proyecto...
          </div>
        </div>
      )}
    </div>
  );
}


function extractCoords(geometry: any): number[][] {
  if (!geometry) return [];
  const { type, coordinates } = geometry;
  if (type === 'Point') return [coordinates];
  if (type === 'MultiPoint' || type === 'LineString') return coordinates;
  if (type === 'MultiLineString' || type === 'Polygon') return coordinates.flat();
  if (type === 'MultiPolygon') return coordinates.flat(2);
  if (type === 'GeometryCollection') {
    return (geometry.geometries || []).flatMap(extractCoords);
  }
  return [];
}

