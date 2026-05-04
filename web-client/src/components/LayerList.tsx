import { useState, useRef } from 'react';
import { useLayers } from '../hooks/useLayers';
import { Eye, EyeOff, Edit2, X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export function LayerList() {
  const {
    layers, visibleLayerIds, toggleLayerVisibility,
    unlinkFromProject, rename, changeColor, loading,
  } = useLayers();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [unlinkId, setUnlinkId] = useState<number | null>(null);
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
      <div className="sidebar-section-content" style={{ marginTop: '12px' }}>
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="layer-item"
          >
            <div className="layer-color-picker-wrapper">
              <input 
                type="color" 
                className="layer-color-input"
                value={layer.color}
                onChange={(e) => changeColor(layer.id, e.target.value)}
              />
              <div
                className="layer-color-dot"
                style={{ backgroundColor: layer.color }}
              />
            </div>

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                className={`btn btn-ghost btn-icon btn-sm ${visibleLayerIds.has(layer.id) ? 'active' : ''}`}
                onClick={() => toggleLayerVisibility(layer.id)}
                title={visibleLayerIds.has(layer.id) ? 'Ocultar' : 'Mostrar'}
              >
                {visibleLayerIds.has(layer.id) ? <Eye size={14} /> : <EyeOff size={14} color="var(--text-tertiary)" />}
              </button>

              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => startEdit(layer.id, layer.nombre_personalizado)}
              >
                <Edit2 size={14} />
              </button>
              
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setUnlinkId(layer.id)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
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
