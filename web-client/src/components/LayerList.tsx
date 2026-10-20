import { useState, useRef } from 'react';
import { useLayers } from '../hooks/useLayers';
import { useStore } from '../store/useStore';
import {
  Eye, EyeOff, Edit2, X, GripVertical, Palette, Table2, LocateFixed, Download,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { StyleEditor } from './StyleEditor';
import { getMapInstance } from '../utils/mapInstance';
import { geojsonBounds, layerBounds } from '../utils/geo';

type Formato = 'geojson' | 'kml' | 'shp';

export function LayerList() {
  const {
    layers, toggleLayerVisibility, setOpacity, reorder, changeStyle, download,
    unlinkFromProject, rename, loading, fetchLayerGeoJson,
  } = useLayers();
  const attributeLayerId = useStore((s) => s.attributeLayerId);
  const setAttributeLayerId = useStore((s) => s.setAttributeLayerId);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [unlinkId, setUnlinkId] = useState<number | null>(null);
  const [styleId, setStyleId] = useState<number | null>(null);
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const finishEdit = async () => {
    if (editingId !== null && editName.trim()) {
      await rename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleDrop = (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const ids = layers.map((l) => l.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    reorder(ids);
  };

  const zoomToLayer = async (id: number) => {
    const map = getMapInstance();
    const layer = layers.find((l) => l.id === id);
    if (!map || !layer) return;
    const bounds = layerBounds(layer) ?? geojsonBounds(await fetchLayerGeoJson(id));
    if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 800 });
  };

  const openAttributes = (id: number) => {
    const layer = layers.find((l) => l.id === id);
    if (layer && !layer.datos_geojson) fetchLayerGeoJson(id).catch(() => {});
    setAttributeLayerId(attributeLayerId === id ? null : id);
  };

  const handleDownload = async (id: number, formato: Formato) => {
    setDownloadId(null);
    try {
      await download(id, formato);
    } catch {
      alert('No se pudo descargar la capa en ese formato.');
    }
  };

  if (loading && layers.length === 0) {
    return (
      <div className="empty-state">
        <div className="spinner" />
      </div>
    );
  }

  if (layers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-text" style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          Sin capas activas
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-section-content layer-tree" style={{ marginTop: '12px' }}>
        <div className="layer-tree-hint">Arrastre para cambiar el orden. La primera capa se dibuja encima.</div>
        {layers.map((layer) => {
          const visible = layer.visible !== false;
          const opacity = layer.opacidad ?? 1;
          return (
            <div
              key={layer.id}
              className={`layer-item-wrapper ${dragId === layer.id ? 'dragging' : ''} ${dropTarget === layer.id && dragId !== layer.id ? 'drop-target' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTarget(layer.id);
              }}
              onDragLeave={() => setDropTarget((t) => (t === layer.id ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(layer.id);
                setDragId(null);
                setDropTarget(null);
              }}
            >
              <div className="layer-item">
                <span
                  className="layer-drag-handle"
                  draggable
                  onDragStart={(e) => {
                    setDragId(layer.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropTarget(null);
                  }}
                  title="Arrastrar para reordenar"
                >
                  <GripVertical size={14} />
                </span>

                <div
                  className="layer-color-dot"
                  style={{ backgroundColor: layer.estilo.fillColor, borderColor: layer.estilo.strokeColor }}
                />

                {editingId === layer.id ? (
                  <input
                    ref={inputRef}
                    className="layer-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={finishEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className="layer-name"
                    onDoubleClick={() => startEdit(layer.id, layer.nombre_personalizado)}
                    title={layer.nombre_personalizado}
                  >
                    {layer.nombre_personalizado}
                  </span>
                )}

                <button
                  className={`btn btn-ghost btn-icon btn-sm ${visible ? 'active' : ''}`}
                  onClick={() => toggleLayerVisibility(layer.id)}
                  title={visible ? 'Ocultar' : 'Mostrar'}
                >
                  {visible ? <Eye size={14} /> : <EyeOff size={14} color="var(--text-tertiary)" />}
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setUnlinkId(layer.id)}
                  title="Quitar del proyecto"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="layer-item-controls">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(layer.id, Number(e.target.value) / 100)}
                  aria-label="Opacidad"
                  title="Opacidad de la capa"
                />
                <span className="layer-opacity-value">{Math.round(opacity * 100)}%</span>
                <button
                  className={`btn btn-ghost btn-icon btn-sm ${styleId === layer.id ? 'active' : ''}`}
                  onClick={() => {
                    if (!layer.datos_geojson) fetchLayerGeoJson(layer.id).catch(() => {});
                    setStyleId(styleId === layer.id ? null : layer.id);
                  }}
                  title="Simbología"
                >
                  <Palette size={14} />
                </button>
                <button
                  className={`btn btn-ghost btn-icon btn-sm ${attributeLayerId === layer.id ? 'active' : ''}`}
                  onClick={() => openAttributes(layer.id)}
                  title="Tabla de atributos"
                >
                  <Table2 size={14} />
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => zoomToLayer(layer.id)} title="Acercar a la capa">
                  <LocateFixed size={14} />
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => startEdit(layer.id, layer.nombre_personalizado)}
                  title="Renombrar"
                >
                  <Edit2 size={14} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    className={`btn btn-ghost btn-icon btn-sm ${downloadId === layer.id ? 'active' : ''}`}
                    onClick={() => setDownloadId(downloadId === layer.id ? null : layer.id)}
                    title="Descargar"
                  >
                    <Download size={14} />
                  </button>
                  {downloadId === layer.id && (
                    <div className="layer-menu">
                      <button onClick={() => handleDownload(layer.id, 'geojson')}>GeoJSON</button>
                      <button onClick={() => handleDownload(layer.id, 'kml')}>KML</button>
                      <button onClick={() => handleDownload(layer.id, 'shp')}>Shapefile (.zip)</button>
                    </div>
                  )}
                </div>
              </div>

              {styleId === layer.id && (
                <StyleEditor layer={layer} onChange={(estilo) => changeStyle(layer.id, estilo)} />
              )}
            </div>
          );
        })}
      </div>

      {unlinkId !== null && (
        <ConfirmModal
          title="¿Quitar Capa?"
          message="La capa se desvinculará de este proyecto, pero se mantendrá segura en tu biblioteca global para usos futuros."
          confirmText="Confirmar"
          onConfirm={() => {
            if (unlinkId) unlinkFromProject(unlinkId);
            setUnlinkId(null);
          }}
          onCancel={() => setUnlinkId(null)}
        />
      )}
    </>
  );
}
