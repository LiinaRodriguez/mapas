import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, LogOut, User as UserIcon, Book } from 'lucide-react';

export function Header() {
  const user = useStore((s) => s.user);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projects = useStore((s) => s.projects);
  const setActiveProjectId = useStore((s) => s.setActiveProjectId);
  const { logout } = useAuth();

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <>
      <header className="header">
        <div className="header-brand">
          <img src="/favicon.svg" alt="Mapas Logo" style={{ width: 24, height: 24 }} />
          <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>MAPAS</span>
          {activeProjectId && (
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveProjectId(null)}
            >
              <ChevronLeft size={16} />
              Volver
            </button>
          )}
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => window.location.hash = 'docs'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
          >
            <Book size={16} />
            Doc
          </button>

          {activeProject && (
            <div className="header-project-name" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {activeProject.nombre}
            </div>
          )}

          <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon size={16} color="var(--text-tertiary)" />
            <span>{user?.nombre}</span>
            {user?.es_licenciado && <span className="header-user-badge">PRO</span>}
          </div>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>
    </>
  );
}
