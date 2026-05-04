import { useState } from 'react';
import { LayerList } from './LayerList';
import { FileUpload } from './FileUpload';
import { LayerLibrary } from './LayerLibrary';
import { ExportModal } from './ExportModal';
import { useStore } from '../store/useStore';
import { Layers, Library, Share } from 'lucide-react';
import { useLayers } from '../hooks/useLayers';

export function Sidebar() {
  const activeProjectId = useStore((s) => s.activeProjectId);
  const layers = useStore((s) => s.layers);
  const { loading } = useLayers();
  const [showLibrary, setShowLibrary] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <>
      <aside className="sidebar">
        {activeProjectId && (
          <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar-section-header" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--text-tertiary)" />
                <span className="sidebar-section-title">Capas</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowLibrary(true)}
                  title="Biblioteca"
                >
                  <Library size={16} />
                </button>
                {layers.length > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsExportModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Share size={14} /> Exportar
                  </button>
                )}
              </div>
              
              {loading && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'var(--primary-subtle)',
                  overflow: 'hidden'
                }}>
                  <div className="loading-bar-animation" style={{
                    height: '100%',
                    width: '30%',
                    backgroundColor: 'var(--primary)',
                    borderRadius: '2px'
                  }} />
                </div>
              )}
            </div>

            <FileUpload />
            <LayerList />
          </div>
        )}
      </aside>

      {showLibrary && (
        <LayerLibrary onClose={() => setShowLibrary(false)} />
      )}
      
      {isExportModalOpen && (
        <ExportModal onClose={() => setIsExportModalOpen(false)} />
      )}
    </>
  );
}
