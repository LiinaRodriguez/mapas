import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getProyectos, createProyecto, deleteProyecto, updateProyecto } from '../api/client';

export function useProjects() {
  const {
    projects, setProjects, activeProjectId, setActiveProjectId,
    addProject, removeProject, updateProject,
  } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProyectos();
      setProjects(data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const create = useCallback(async (nombre: string, descripcion?: string) => {
    const p = await createProyecto(nombre, descripcion);
    addProject(p);
    setActiveProjectId(p.id);
    return p;
  }, [addProject, setActiveProjectId]);

  const remove = useCallback(async (id: number) => {
    await deleteProyecto(id);
    removeProject(id);
  }, [removeProject]);

  const update = useCallback(async (id: number, data: { nombre?: string; descripcion?: string }) => {
    const p = await updateProyecto(id, data);
    updateProject(p);
    return p;
  }, [updateProject]);

  return {
    projects,
    activeProjectId,
    setActiveProjectId,
    loading,
    error,
    create,
    remove,
    update,
    refresh: fetchProjects,
  };
}
