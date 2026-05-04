import { useAuth } from './hooks/useAuth';
import { useStore } from './store/useStore';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { ProjectDashboard } from './components/ProjectDashboard';
import { Documentation } from './components/Documentation';
import './index.css';

import { useEffect, useState } from 'react';

function App() {
  const { isAuthenticated, isLoading, authView } = useAuth();
  const activeProjectId = useStore((s) => s.activeProjectId);
  const setActiveProjectId = useStore((s) => s.setActiveProjectId);
  const [isDocs, setIsDocs] = useState(window.location.hash.startsWith('#docs'));

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      setIsDocs(hash.startsWith('#docs'));

      if (isAuthenticated) {
        let newId: number | null = null;
        if (hash.startsWith('#proyecto-')) {
          const id = parseInt(hash.replace('#proyecto-', ''));
          if (!isNaN(id)) newId = id;
        }
        if (newId !== activeProjectId) {
          setActiveProjectId(newId);
        }
      }
    };

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isAuthenticated, activeProjectId, setActiveProjectId]);

  useEffect(() => {
    if (!isAuthenticated || isDocs) return;

    const currentHash = window.location.hash;
    const targetHash = activeProjectId ? `#proyecto-${activeProjectId}` : '';
    
    if (currentHash !== targetHash && !currentHash.startsWith('#docs')) {
      window.location.hash = targetHash.replace('#', '');
    }
  }, [isAuthenticated, activeProjectId, isDocs]);

  if (isDocs) {
    return <Documentation />;
  }

  if (isLoading) {
    return (
      <div className="auth-page">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? <LoginForm /> : <RegisterForm />;
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="app-main">
        {activeProjectId ? (
          <>
            <Sidebar />
            <MapView />
          </>
        ) : (
          <ProjectDashboard />
        )}
      </div>
    </div>
  );
}

export default App;
