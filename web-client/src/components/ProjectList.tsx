import { useState, type FormEvent } from 'react';
import { useProjects } from '../hooks/useProjects';

export function ProjectList() {
  const { projects, activeProjectId, setActiveProjectId, create, remove, loading } = useProjects();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await create(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const handleDelete = async (id: number) => {
    await remove(id);
    setConfirmDelete(null);
  };

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-header">
        <span className="sidebar-section-title">Proyectos</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowCreate(!showCreate)}
          id="new-project-btn"
        >
          {showCreate ? '✕' : '＋'}
        </button>
      </div>

      {showCreate && (
        <form
          className="animate-fade-in"
          style={{ padding: '0 8px 8px' }}
          onSubmit={handleCreate}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="input"
              placeholder="Nombre del proyecto"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              style={{ padding: '6px 10px', fontSize: 13 }}
              id="new-project-input"
            />
            <button className="btn btn-primary btn-sm" type="submit" id="create-project-btn">
              Crear
            </button>
          </div>
        </form>
      )}

      <div className="sidebar-section-content">
        {loading && projects.length === 0 ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-text">No hay proyectos</div>
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className={`list-item ${p.id === activeProjectId ? 'active' : ''}`}
              onClick={() => setActiveProjectId(p.id)}
              id={`project-${p.id}`}
            >
              <span style={{ fontSize: 14 }}>📋</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.nombre}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {p.capas_count} capas
              </span>
              <div className="list-item-actions">
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(p.id);
                  }}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete !== null && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">¿Eliminar proyecto?</h3>
            <p className="modal-text">
              Se eliminarán todas las capas del proyecto. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmDelete)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
