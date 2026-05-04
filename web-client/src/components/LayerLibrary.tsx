import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLayers } from '../hooks/useLayers';
import { Trash2, Check, Play, Edit3, Database, ArrowLeft, Search, Loader2 } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { ConfirmModal } from './ConfirmModal';

interface LayerLibraryProps {
  onClose: () => void;
}

export function LayerLibrary({ onClose }: LayerLibraryProps) {
  const {
    libraryLayers, layers, linkToProject, unlinkFromProject, deletePermanently, rename,
    activeProjectId
  } = useLayers();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentProjectLayerIds = new Set(layers.map((l) => l.id));

  const filteredLayers = libraryLayers.filter(l =>
    l.nombre_personalizado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleLayer = async (layerId: number) => {
    if (linkingId) return;
    setLinkingId(layerId);
    try {
      if (currentProjectLayerIds.has(layerId)) {
        await unlinkFromProject(layerId);
      } else {
        await linkToProject(layerId);
      }
    } finally {
      setLinkingId(null);
    }
  };

  const startEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditName(name);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await rename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleDeleteLayer = async () => {
    if (deletingId) {
      try {
        await deletePermanently(deletingId);
      } catch {
        alert('Error al eliminar');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ background: 'var(--bg-primary)' }}>
      <div className="modal-card modal-lg">
        <header className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="btn btn-ghost btn-icon" onClick={onClose} title="Volver al inicio">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="modal-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Biblioteca de Capas</h2>
              <p className="modal-text" style={{ fontSize: '14px' }}>Gestiona tu inventario cartográfico global</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '600px', marginLeft: '60px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                placeholder="Buscar capas..."
                style={{ paddingLeft: '40px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ width: '220px' }}>
              <FileUpload />
            </div>
          </div>
        </header>

        <div className="library-content" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="library-grid" style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            maxHeight: '100%',
            paddingBottom: '40px'
          }}>
            {filteredLayers.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '100px' }}>
                <Database size={64} color="var(--border-default)" style={{ marginBottom: '24px' }} />
                <div className="empty-state-text" style={{ fontSize: '20px' }}>
                  {searchTerm ? 'No se encontraron resultados' : 'Tu biblioteca está vacía'}
                </div>
              </div>
            ) : (
              filteredLayers.map((layer) => {
                const isActive = currentProjectLayerIds.has(layer.id);
                const isProcessing = linkingId === layer.id;
                return (
                  <div key={layer.id} className={`library-item ${isActive ? 'active' : ''}`} style={{ padding: '24px', gap: '20px' }}>
                    <div className="library-item-header">
                      <div
                        className="library-item-color"
                        style={{ backgroundColor: layer.color, width: '40px', height: '6px', borderRadius: '3px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => startEdit(layer.id, layer.nombre_personalizado)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => setDeletingId(layer.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="library-item-info">
                      {editingId === layer.id ? (
                        <input
                          ref={inputRef}
                          className="input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        />
                      ) : (
                        <div className="library-item-name" style={{ fontSize: '18px', fontWeight: 600 }}>{layer.nombre_personalizado}</div>
                      )}
                      <div className="library-item-meta" style={{ marginTop: '4px', fontSize: '12px' }}>
                        Formato: {layer.tipo_archivo?.toUpperCase()} • Subido el {new Date(layer.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {activeProjectId && (
                      <button
                        className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleToggleLayer(layer.id)}
                        disabled={isProcessing}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '44px' }}
                      >
                        {isProcessing ? (
                          <Loader2 size={18} className="spinner" />
                        ) : (
                          isActive ? <><Check size={18} /> Activa en el Proyecto</> : <><Play size={18} /> Activar</>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <footer className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
          <button className="btn btn-secondary btn-lg" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ArrowLeft size={20} /> Volver al Inicio
          </button>
        </footer>
      </div>

      {deletingId !== null && (
        <ConfirmModal
          title="¿Eliminar Capa de la Biblioteca?"
          message="Esta acción eliminará la capa permanentemente de tu inventario global y de TODOS los proyectos donde esté vinculada. Esta acción no se puede deshacer."
          confirmText="Eliminar permanentemente"
          onConfirm={handleDeleteLayer}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>,
    document.body
  );
}
