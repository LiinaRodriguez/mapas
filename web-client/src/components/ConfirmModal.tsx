import { AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmModalProps) {
  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <AlertTriangle size={20} color={isDestructive ? 'var(--accent)' : 'var(--primary)'} />
            </div>
            <h2 className="modal-title" style={{ fontSize: '18px' }}>{title}</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-content" style={{ padding: '20px 0' }}>
          <p className="modal-text" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
        </div>

        <footer className="modal-footer" style={{ gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn ${isDestructive ? 'btn-primary' : 'btn-primary'}`}
            style={{ 
              backgroundColor: isDestructive ? 'var(--accent)' : 'var(--primary)',
              borderColor: isDestructive ? 'var(--accent)' : 'var(--primary)'
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
