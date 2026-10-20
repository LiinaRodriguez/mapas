import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { FileText, Map as MapIcon, X, Check, Loader2 } from 'lucide-react';
import * as api from '../api/client';
import type { Bounds, GridCrs, Orientation, PaperSize } from '../types';
import { getMapInstance } from '../utils/mapInstance';
import { captureMap } from '../utils/printMap';
import { exportGeoTiff } from '../utils/exportGeoTiff';
import { layerBounds, legendForLayer, unionBounds } from '../utils/geo';
import { downloadBlob, slugify } from '../utils/download';

interface ExportModalProps {
  onClose: () => void;
}

type Extent = 'view' | 'layers';

export function ExportModal({ onClose }: ExportModalProps) {
  const { user } = useAuth();
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projects = useStore((s) => s.projects);
  const layers = useStore((s) => s.layers);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const [title, setTitle] = useState(activeProject?.nombre || 'Plano Cartográfico');
  const [subtitle, setSubtitle] = useState(activeProject?.descripcion || '');
  const [notes, setNotes] = useState('');
  const [authorName, setAuthorName] = useState(user?.nombre || '');
  const [format, setFormat] = useState<'pdf' | 'geotiff'>('pdf');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [dpi, setDpi] = useState(300);
  const [extent, setExtent] = useState<Extent>('view');
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeGrid, setIncludeGrid] = useState(true);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true);
  const [includeScale, setIncludeScale] = useState(true);
  const [gridCrs, setGridCrs] = useState<GridCrs>('EPSG:4326');
  const [georeferenced, setGeoreferenced] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const visibleLayers = layers.filter((l) => l.visible !== false);

  const targetBounds = (map: NonNullable<ReturnType<typeof getMapInstance>>): Bounds => {
    if (extent === 'layers') {
      const b = unionBounds(visibleLayers.map(layerBounds));
      if (b) return b;
    }
    const v = map.getBounds();
    return [v.getWest(), v.getSouth(), v.getEast(), v.getNorth()];
  };

  const handleExport = async () => {
    const map = getMapInstance();
    if (!map) return;
    setIsExporting(true);
    setError('');
    try {
      const frame = await api.getMapFrame(paperSize, orientation, dpi);
      const { image, bbox } = await captureMap(map, { ...frame, dpi, bbox: targetBounds(map) });

      if (format === 'geotiff') {
        await exportGeoTiff({ projectName: title, mapImage: image, bbox });
      } else {
        const blob = await api.exportPdf({
          title,
          subtitle: subtitle || undefined,
          notes: notes || undefined,
          author: authorName || undefined,
          license: user?.es_licenciado ? user.numero_licencia || 'Licenciado' : undefined,
          paperSize,
          orientation,
          dpi,
          bbox,
          includeLegend,
          includeGrid,
          includeNorthArrow,
          includeScale,
          gridCrs,
          georeferenced,
          layers: visibleLayers.map((l) => l.id),
          legend: visibleLayers.map(legendForLayer),
          mapImage: image,
        });
        downloadBlob(blob, `${slugify(title)}.pdf`);
      }
      onClose();
    } catch (e) {
      console.error('Export error:', e);
      setError('No se pudo generar la exportación. Verifique la conexión e intente de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const check = (label: string, value: boolean, set: (v: boolean) => void) => (
    <label className="export-check">
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} disabled={isExporting} />
      {label}
    </label>
  );

  return createPortal(
    <div className="modal-overlay" onClick={!isExporting ? onClose : undefined}>
      <div className="modal-card export-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="modal-title" style={{ fontSize: '24px' }}>Exportar Mapa</h2>
              <p className="modal-text">Configura el diseño, los elementos cartográficos y el formato de salida.</p>
            </div>
            {!isExporting && (
              <button className="btn btn-ghost btn-icon" onClick={onClose}>
                <X size={20} />
              </button>
            )}
          </div>
        </header>

        <div className="modal-content export-modal-content">
          <div className="form-group">
            <label className="label">Formato de Salida</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {([
                ['pdf', FileText, 'Plano PDF', 'Para imprimir o presentar.'],
                ['geotiff', MapIcon, 'GeoTIFF (Avenza)', 'Georreferenciado para GPS móvil.'],
              ] as const).map(([id, Icon, name, desc]) => (
                <div
                  key={id}
                  className={`selection-item ${format === id ? 'selected' : ''}`}
                  style={{ padding: '12px', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', justifyContent: 'center' }}
                  onClick={() => !isExporting && setFormat(id)}
                >
                  <Icon size={24} color={format === id ? 'var(--accent)' : 'var(--text-tertiary)'} style={{ marginBottom: '6px' }} />
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{desc}</span>
                  <div className="selection-item-check" style={{ top: '8px', right: '8px' }}>
                    {format === id && <Check size={16} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="export-grid">
            <div className="form-group">
              <label className="label">Papel</label>
              <select className="input" value={paperSize} onChange={(e) => setPaperSize(e.target.value as PaperSize)} disabled={isExporting}>
                <option value="Carta">Carta</option>
                <option value="A4">A4</option>
                <option value="A3">A3</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Orientación</label>
              <select className="input" value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)} disabled={isExporting}>
                <option value="landscape">Horizontal</option>
                <option value="portrait">Vertical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Resolución</label>
              <select className="input" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} disabled={isExporting}>
                <option value={150}>150 DPI</option>
                <option value={300}>300 DPI</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Área</label>
              <select className="input" value={extent} onChange={(e) => setExtent(e.target.value as Extent)} disabled={isExporting}>
                <option value="view">Vista actual</option>
                <option value="layers">Extensión de capas visibles</option>
              </select>
            </div>
          </div>

          {format === 'pdf' && (
            <>
              <div className="form-group">
                <label className="label">Título del Plano</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isExporting} />
              </div>
              <div className="form-group">
                <label className="label">Subtítulo</label>
                <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} disabled={isExporting} />
              </div>
              <div className="export-grid">
                <div className="form-group">
                  <label className="label">Elaborado por</label>
                  <input className="input" value={authorName} onChange={(e) => setAuthorName(e.target.value)} disabled={isExporting} />
                </div>
                <div className="form-group">
                  <label className="label">Grilla de coordenadas</label>
                  <select className="input" value={gridCrs} onChange={(e) => setGridCrs(e.target.value as GridCrs)} disabled={isExporting || !includeGrid}>
                    <option value="EPSG:4326">WGS84 (grados)</option>
                    <option value="EPSG:9377">CTM12 (EPSG:9377)</option>
                    <option value="EPSG:3116">Bogotá (EPSG:3116)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Notas</label>
                <textarea
                  className="input"
                  style={{ height: '64px', resize: 'none' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isExporting}
                />
              </div>
              <div className="export-checks">
                {check('Leyenda', includeLegend, setIncludeLegend)}
                {check('Grilla', includeGrid, setIncludeGrid)}
                {check('Flecha de norte', includeNorthArrow, setIncludeNorthArrow)}
                {check('Escala', includeScale, setIncludeScale)}
                {check('PDF georreferenciado', georeferenced, setGeoreferenced)}
              </div>
            </>
          )}

          {format === 'geotiff' && (
            <div className="form-group">
              <label className="label">Nombre del archivo</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isExporting} />
            </div>
          )}

          {error && <div className="export-error">{error}</div>}
        </div>

        <footer className="modal-footer" style={{ marginTop: '24px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isExporting}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || !title.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isExporting ? <Loader2 className="spinner" size={18} /> : (format === 'pdf' ? <FileText size={18} /> : <MapIcon size={18} />)}
            {isExporting ? 'Procesando mapa...' : 'Generar Exportación'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
