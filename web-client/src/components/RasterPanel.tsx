import { useRef, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Globe, X, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { loadGeoTiff } from '../utils/loadGeoTiff';
import { wmsTileUrl } from '../utils/mapLayers';

type Kind = 'wms' | 'xyz';

const newRasterId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function RasterPanel() {
  const rasterLayers = useStore((s) => s.rasterLayers);
  const addRasterLayer = useStore((s) => s.addRasterLayer);
  const updateRasterLayer = useStore((s) => s.updateRasterLayer);
  const removeRasterLayer = useStore((s) => s.removeRasterLayer);

  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<Kind>('wms');
  const [url, setUrl] = useState('');
  const [wmsLayers, setWmsLayers] = useState('');
  const [name, setName] = useState('');
  const [loadingTiff, setLoadingTiff] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canAdd = url.trim() && (kind === 'xyz' ? url.includes('{z}') : wmsLayers.trim());

  const addService = () => {
    if (!canAdd) return;
    const tiles = [kind === 'wms' ? wmsTileUrl(url.trim(), wmsLayers.trim()) : url.trim()];
    addRasterLayer({
      id: newRasterId(),
      name: name.trim() || (kind === 'wms' ? wmsLayers.trim() : 'Teselas WMTS/XYZ'),
      kind,
      visible: true,
      opacity: 1,
      tiles,
    });
    setUrl('');
    setWmsLayers('');
    setName('');
    setShowForm(false);
  };

  const addGeoTiff = async (file: File) => {
    setLoadingTiff(true);
    try {
      const overlay = await loadGeoTiff(file);
      addRasterLayer({
        id: newRasterId(),
        name: file.name,
        kind: 'geotiff',
        visible: true,
        opacity: 1,
        ...overlay,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo leer el GeoTIFF');
    } finally {
      setLoadingTiff(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="raster-panel">
      <div className="raster-panel-header">
        <span className="sidebar-section-title">Raster y servicios</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-ghost btn-icon btn-sm" title="Agregar WMS / WMTS" onClick={() => setShowForm((v) => !v)}>
            <Globe size={14} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            title="Cargar GeoTIFF (solo en esta sesión)"
            onClick={() => fileRef.current?.click()}
            disabled={loadingTiff}
          >
            {loadingTiff ? <Loader2 size={14} className="spinner" /> : <ImagePlus size={14} />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".tif,.tiff"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addGeoTiff(file);
            }}
          />
        </div>
      </div>

      {showForm && (
        <div className="raster-form">
          <select className="input input-sm" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="wms">WMS</option>
            <option value="xyz">WMTS / XYZ (plantilla {'{z}/{x}/{y}'})</option>
          </select>
          <input
            className="input input-sm"
            placeholder={kind === 'wms' ? 'URL del servicio WMS' : 'https://.../{z}/{x}/{y}.png'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {kind === 'wms' && (
            <input
              className="input input-sm"
              placeholder="Capas (LAYERS), separadas por coma"
              value={wmsLayers}
              onChange={(e) => setWmsLayers(e.target.value)}
            />
          )}
          <input className="input input-sm" placeholder="Nombre (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={!canAdd} onClick={addService}>Agregar</button>
        </div>
      )}

      {rasterLayers.map((r) => (
        <div key={r.id} className="raster-item">
          <span className="layer-name" title={r.name}>{r.name}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(r.opacity * 100)}
            onChange={(e) => updateRasterLayer(r.id, { opacity: Number(e.target.value) / 100 })}
            aria-label="Opacidad"
          />
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => updateRasterLayer(r.id, { visible: !r.visible })}
            title={r.visible ? 'Ocultar' : 'Mostrar'}
          >
            {r.visible ? <Eye size={14} /> : <EyeOff size={14} color="var(--text-tertiary)" />}
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeRasterLayer(r.id)} title="Quitar">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
