import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import * as api from '../api/client';

export function useLayers() {
  const {
    layers, setLayers, 
    libraryLayers, setLibraryLayers, addToLibrary, removeFromLibrary,
    activeProjectId, addLayer, removeLayer, updateLayer,
    visibleLayerIds, toggleLayerVisibility, setAllVisible,
    isUploading, uploadProgress, setIsUploading, setUploadProgress,
  } = useStore();

  const [loading, setLoading] = useState(false);

  const fetchProjectLayers = useCallback(async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const data = await api.getProyectoCapas(activeProjectId);
      setLayers(data);
    } catch {
      
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, setLayers]);

  const fetchLibrary = useCallback(async () => {
    try {
      const data = await api.getLibraryCapas();
      setLibraryLayers(data);
    } catch {

    }
  }, [setLibraryLayers]);

  useEffect(() => {
    if (activeProjectId) fetchProjectLayers();
    fetchLibrary();
  }, [activeProjectId, fetchProjectLayers, fetchLibrary]);

  const upload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const newLayer = await api.uploadCapa(file, activeProjectId, (pct) => setUploadProgress(pct));
      addToLibrary(newLayer);
      if (activeProjectId) {
        addLayer(newLayer);
      }
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Error al subir archivo');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [activeProjectId, addToLibrary, addLayer, setIsUploading, setUploadProgress]);

  const linkToProject = useCallback(async (capaId: number, overrideProjectId?: number) => {
    const targetId = overrideProjectId || activeProjectId;
    if (!targetId) return;
    const linked = await api.linkCapaToProyecto(targetId, capaId);
    if (targetId === activeProjectId) {
      addLayer(linked);
    }
  }, [activeProjectId, addLayer]);

  const unlinkFromProject = useCallback(async (capaId: number) => {
    if (!activeProjectId) return;
    
    const previousLayers = useStore.getState().layers;
    
    removeLayer(capaId);
    
    try {
      await api.unlinkCapaFromProyecto(activeProjectId, capaId);
    } catch (e) {
      setLayers(previousLayers);
      alert('Error al quitar capa. Intente de nuevo.');
    }
  }, [activeProjectId, removeLayer, setLayers]);

  const rename = useCallback(async (id: number, nombre: string) => {
    const updated = await api.updateCapa(id, { nombre_personalizado: nombre });
    updateLayer(updated);
  }, [updateLayer]);

  const changeColor = useCallback(async (id: number, color: string) => {
    const updated = await api.updateCapa(id, { color });
    updateLayer(updated);
  }, [updateLayer]);

  const deletePermanently = useCallback(async (id: number) => {
    await api.deleteCapaPermanently(id);
    removeFromLibrary(id);
    removeLayer(id);
  }, [removeFromLibrary, removeLayer]);

  const fetchLayerGeoJson = useCallback(async (id: number) => {
    const geojson = await api.getCapaGeoJson(id);
    const layer = layers.find(l => l.id === id);
    if (layer) {
      updateLayer({ ...layer, datos_geojson: geojson });
    }
    return geojson;
  }, [layers, updateLayer]);

  return {
    layers,
    libraryLayers,
    loading,
    visibleLayerIds,
    activeProjectId,
    toggleLayerVisibility,
    setAllVisible,
    upload,
    linkToProject,
    unlinkFromProject,
    rename,
    changeColor,
    deletePermanently,
    fetchLayerGeoJson,
    refreshProject: fetchProjectLayers,
    refreshLibrary: fetchLibrary,
    isUploading,
    uploadProgress,
  };
}
