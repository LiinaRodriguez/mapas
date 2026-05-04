import { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useLayers } from '../hooks/useLayers';
import { useStore } from '../store/useStore';
import { Plus, Folder, Trash2, Library, Check, ChevronRight } from 'lucide-react';
import { LayerLibrary } from './LayerLibrary';
import { ConfirmModal } from './ConfirmModal';

export function ProjectDashboard() {
  const { projects, create, remove, refresh } = useProjects();
  const { libraryLayers, linkToProject } = useLayers();
  const setActiveProjectId = useStore((s) => s.setActiveProjectId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [newProject, setNewProject] = useState({ nombre: '', descripcion: '' });
  const [selectedLayerIds, setSelectedLayerIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreateProject = async () => {
    if (!newProject.nombre.trim()) return;

    const project = await create(newProject.nombre, newProject.descripcion);
    if (project) {
      for (const layerId of Array.from(selectedLayerIds)) {
        await linkToProject(layerId, project.id);
      }
      
      setActiveProjectId(project.id);
      
      setIsModalOpen(false);
      setStep(1);
      setNewProject({ nombre: '', descripcion: '' });
      setSelectedLayerIds(new Set());
    }
  };

  const handleDeleteProject = async () => {
    if (deleteId) {
      await remove(deleteId);
      setDeleteId(null);
    }
  };

  const toggleLayerSelection = (id: number) => {
    const next = new Set(selectedLayerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLayerIds(next);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="dashboard-title">Espacios de Trabajo</h1>
          <p className="dashboard-subtitle">
            Selecciona un proyecto o gestiona tu biblioteca global.
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setIsLibraryOpen(true)}
        >
          <Library size={18} />
          Biblioteca de Capas
        </button>
      </header>

      <div className="project-grid">
        <div className="project-card project-card-new" onClick={() => setIsModalOpen(true)}>
          <Plus size={32} />
          <div className="project-card-title">Nuevo Proyecto</div>
        </div>

        {projects.map((project) => (
          <div key={project.id} className="project-card" onClick={() => setActiveProjectId(project.id)}>
            <button 
              className="btn btn-ghost btn-icon project-card-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(project.id);
              }}
            >
              <Trash2 size={16} />
            </button>
            <Folder size={24} className="project-card-icon" color="var(--text-tertiary)" />
            <div className="project-card-title">{project.nombre}</div>
            <div className="project-card-desc">
              {project.descripcion || 'Sin descripción'}
            </div>
            <div className="project-card-footer">
              <span>{project.capas_count} capas</span>
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {deleteId !== null && (
        <ConfirmModal 
          title="¿Eliminar Proyecto?"
          message="Esta acción no se puede deshacer. Se eliminarán todas las capas vinculadas de este espacio de trabajo (pero permanecerán en tu biblioteca global)."
          confirmText="Eliminar permanentemente"
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 className="modal-title">
                {step === 1 ? 'Detalles del Proyecto' : 'Configuración Inicial'}
              </h2>
              <div className="modal-step-indicator">Paso {step} de 2</div>
            </header>

            <div className="modal-content" style={{ padding: '24px 0' }}>
              {step === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label className="label">Nombre</label>
                    <input
                      className="input"
                      placeholder="Nombre del espacio de trabajo"
                      autoFocus
                      value={newProject.nombre}
                      onChange={(e) => setNewProject({ ...newProject, nombre: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Descripción</label>
                    <textarea
                      className="input"
                      placeholder="Propósito del proyecto..."
                      style={{ resize: 'none', height: '100px' }}
                      value={newProject.descripcion}
                      onChange={(e) => setNewProject({ ...newProject, descripcion: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="layer-selection-list">
                  <p className="modal-text" style={{ marginBottom: '16px' }}>
                    Selecciona capas de tu biblioteca para este proyecto:
                  </p>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {libraryLayers.length === 0 ? (
                      <div className="empty-state-subtext" style={{ textAlign: 'center', padding: '40px' }}>
                        No tienes capas guardadas aún.
                      </div>
                    ) : (
                      libraryLayers.map((layer) => (
                        <div 
                          key={layer.id} 
                          className={`selection-item ${selectedLayerIds.has(layer.id) ? 'selected' : ''}`}
                          onClick={() => toggleLayerSelection(layer.id)}
                        >
                          <div className="selection-item-color" style={{ backgroundColor: layer.color }} />
                          <span className="selection-item-name">{layer.nombre_personalizado}</span>
                          <div className="selection-item-check">
                            {selectedLayerIds.has(layer.id) && <Check size={16} />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <footer className="modal-footer" style={{ gap: '12px' }}>
              {step === 1 ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button 
                    className="btn btn-primary" 
                    disabled={!newProject.nombre.trim()}
                    onClick={() => setStep(2)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    Siguiente <ChevronRight size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>Atrás</button>
                  <button className="btn btn-primary" onClick={handleCreateProject}>
                    Finalizar y Abrir Mapa
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}

      {isLibraryOpen && (
        <LayerLibrary onClose={() => setIsLibraryOpen(false)} />
      )}
    </div>
  );
}
