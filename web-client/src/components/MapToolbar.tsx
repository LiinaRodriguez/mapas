import { useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { Expand, Map as MapIcon, Ruler, Spline, SquareDashed } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { MapTool } from '../types';
import { layerBounds, unionBounds } from '../utils/geo';
import { BASEMAPS, INITIAL_VIEW } from '../utils/mapLayers';

const TOOLS: { id: MapTool; title: string; icon: typeof Ruler }[] = [
  { id: 'zoom-box', title: 'Zoom por rectángulo', icon: SquareDashed },
  { id: 'measure-distance', title: 'Medir distancia', icon: Ruler },
  { id: 'measure-area', title: 'Medir área', icon: Spline },
];

export function MapToolbar({ map }: { map: maplibregl.Map | null }) {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const basemap = useStore((s) => s.basemap);
  const setBasemap = useStore((s) => s.setBasemap);
  const [showBasemaps, setShowBasemaps] = useState(false);

  const resetExtent = () => {
    if (!map) return;
    const layers = useStore.getState().layers.filter((l) => l.visible !== false);
    const bounds = unionBounds(layers.map(layerBounds));
    map.easeTo({ bearing: 0, pitch: 0, duration: 0 });
    if (bounds) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 800 });
    } else {
      map.flyTo({ center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom });
    }
  };

  return (
    <div className="map-toolbar">
      <div className="map-toolbar-group">
        {TOOLS.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            className={`map-tool-btn ${activeTool === id ? 'active' : ''}`}
            title={title}
            aria-pressed={activeTool === id}
            onClick={() => setActiveTool(activeTool === id ? 'none' : id)}
          >
            <Icon size={16} />
          </button>
        ))}
        <button className="map-tool-btn" title="Restablecer vista inicial" onClick={resetExtent}>
          <Expand size={16} />
        </button>
      </div>

      <div className="map-toolbar-group" style={{ position: 'relative' }}>
        <button
          className={`map-tool-btn ${showBasemaps ? 'active' : ''}`}
          title="Mapa base"
          onClick={() => setShowBasemaps((v) => !v)}
        >
          <MapIcon size={16} />
        </button>
        {showBasemaps && (
          <div className="map-popover">
            <div className="map-popover-title">Mapa base</div>
            {BASEMAPS.map((b) => (
              <label key={b.id} className="map-popover-option">
                <input
                  type="radio"
                  name="basemap"
                  checked={basemap === b.id}
                  onChange={() => setBasemap(b.id)}
                />
                {b.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
