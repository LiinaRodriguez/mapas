import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { FileText, Map as MapIcon, X, Check, Loader2 } from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const { user } = useAuth();
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projects = useStore((s) => s.projects);
  const layers = useStore((s) => s.layers);
  const visibleLayerIds = useStore((s) => s.visibleLayerIds);
  
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const [title, setTitle] = useState(activeProject?.nombre || 'Plano Cartográfico');
  const [description, setDescription] = useState(activeProject?.descripcion || '');
  const [authorName, setAuthorName] = useState(user?.nombre || '');
  const [format, setFormat] = useState<'pdf' | 'geotiff'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const handleComplete = () => {
      setIsExporting(false);
      onClose();
    };
    window.addEventListener('export-complete', handleComplete);
    return () => window.removeEventListener('export-complete', handleComplete);
  }, [onClose]);

  const handleExport = () => {
    setIsExporting(true);
    const visibleLayers = layers.filter((l) => visibleLayerIds.has(l.id));
    
    window.dispatchEvent(new CustomEvent('request-pdf-export', { 
      detail: {
        projectName: title,
        projectDescription: description,
        elaboratorName: authorName,
        layers: visibleLayers,
        user,
        format
      }
    }));
  };

  return createPortal(
    <div className="modal-overlay" onClick={!isExporting ? onClose : undefined}>
      <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="modal-title" style={{ fontSize: '24px' }}>Exportar Mapa</h2>
              <p className="modal-text">Configura los metadatos y el formato del archivo de salida.</p>
            </div>
            {!isExporting && (
              <button className="btn btn-ghost btn-icon" onClick={onClose}>
                <X size={20} />
              </button>
            )}
          </div>
        </header>

        <div className="modal-content" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-group">
            <label className="label">Título del Plano</label>
            <input 
              className="input" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              disabled={isExporting}
            />
          </div>

          <div className="form-group">
            <label className="label">Descripción o Subtítulo</label>
            <textarea 
              className="input" 
              style={{ height: '80px', resize: 'none' }}
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              disabled={isExporting}
            />
          </div>

          <div className="form-group">
            <label className="label">Elaborado por</label>
            <input 
              className="input" 
              value={authorName} 
              onChange={(e) => setAuthorName(e.target.value)}
              disabled={isExporting}
            />
          </div>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="label">Formato de Salida</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div 
                className={`selection-item ${format === 'pdf' ? 'selected' : ''}`}
                style={{ padding: '16px', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', height: '120px', justifyContent: 'center' }}
                onClick={() => !isExporting && setFormat('pdf')}
              >
                <FileText size={32} color={format === 'pdf' ? 'var(--accent)' : 'var(--text-tertiary)'} style={{ marginBottom: '8px' }} />
                <span style={{ fontWeight: 600 }}>Plano PDF</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Para imprimir o presentar.</span>
                <div className="selection-item-check" style={{ top: '8px', right: '8px' }}>
                  {format === 'pdf' && <Check size={16} />}
                </div>
              </div>

              <div 
                className={`selection-item ${format === 'geotiff' ? 'selected' : ''}`}
                style={{ padding: '16px', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', height: '120px', justifyContent: 'center' }}
                onClick={() => !isExporting && setFormat('geotiff')}
              >
                <MapIcon size={32} color={format === 'geotiff' ? 'var(--accent)' : 'var(--text-tertiary)'} style={{ marginBottom: '8px' }} />
                <span style={{ fontWeight: 600 }}>GeoTIFF (Avenza)</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Georeferenciado para GPS móvil.</span>
                <div className="selection-item-check" style={{ top: '8px', right: '8px' }}>
                  {format === 'geotiff' && <Check size={16} />}
                </div>
              </div>
            </div>
          </div>

        </div>

        <footer className="modal-footer" style={{ marginTop: '32px' }}>
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
