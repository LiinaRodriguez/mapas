import { useRef, useState } from 'react';
import { useLayers } from '../hooks/useLayers';
import { Upload } from 'lucide-react';
import { UploadModal } from './UploadModal';

export function FileUpload() {
  const { upload, isUploading, uploadProgress } = useLayers();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [status, setStatus] = useState<'uploading' | 'processing' | 'success' | 'error'>('uploading');
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurrentFile(file.name);
      setStatus('uploading');
      setShowModal(true);
      setError('');
      
      try {
        await upload(file);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Error al procesar el archivo');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayStatus = (isUploading && uploadProgress === 100) ? 'processing' : status;

  return (
    <div className="file-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip,.kml"
        style={{ display: 'none' }}
        id="file-input"
      />
      
      <button 
        className="btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        style={{ 
          width: '100%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '10px',
          height: '44px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-sm)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }}
      >
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          padding: '6px',
          borderRadius: '6px',
          display: 'flex'
        }}>
          <Upload size={16} color="var(--accent)" />
        </div>
        Subir SHP o KML
      </button>

      {showModal && (
        <UploadModal 
          progress={uploadProgress}
          fileName={currentFile}
          status={displayStatus}
          errorMessage={error}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
