import { createPortal } from 'react-dom';
import { Loader2, FileUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface UploadModalProps {
  progress: number;
  fileName: string;
  status: 'uploading' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  onClose?: () => void;
}

export function UploadModal({ progress, fileName, status, errorMessage, onClose }: UploadModalProps) {
  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px', border: '1px solid var(--border-default)' }} onClick={(e) => e.stopPropagation()}>

        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          {status === 'uploading' || status === 'processing' ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={64} className="spinner" color="var(--accent)" />
              <FileUp size={24} color="var(--accent)" style={{ position: 'absolute' }} />
            </div>
          ) : status === 'success' ? (
            <CheckCircle2 size={64} color="var(--success)" />
          ) : (
            <AlertCircle size={64} color="var(--danger)" />
          )}
        </div>

        <h2 className="modal-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
          {status === 'uploading' ? 'Subiendo archivo...' :
            status === 'processing' ? 'Cargando archivos...' :
              status === 'success' ? '¡Carga completa!' : 'Error en la carga'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', wordBreak: 'break-all' }}>
          {fileName}
        </p>

        {(status === 'uploading' || status === 'processing') && (
          <div style={{ width: '100%' }}>
            <div style={{
              height: '6px',
              width: '100%',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: 'var(--accent)',
                transition: 'width 0.3s ease',
                boxShadow: '0 0 10px var(--accent-glow)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              <span>{status === 'uploading' ? 'Cargando datos' : 'Generando geometrías'}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '24px' }}>
            {errorMessage || 'Ocurrió un error inesperado al procesar el archivo.'}
          </p>
        )}

        {(status === 'success' || status === 'error') && (
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={onClose}>
            {status === 'success' ? 'Continuar' : 'Cerrar'}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
