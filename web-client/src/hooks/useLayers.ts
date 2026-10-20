import { useCallback, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';
import { useStore } from '../store/useStore';
import * as api from '../api/client';
import type { LayerStyle } from '../types';
import { downloadBlob } from '../utils/download';

const pendingGeoJson = new Map<number, Promise<FeatureCollection>>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debounce(key: string, fn: () => void, wait = 400) {
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(key, setTimeout(() => {
    debounceTimers.delete(key);
    fn();
  }, wait));
}

/** Loads the library and the active project's layers. Mount once. */
export function useLayerLoader(enabled: boolean) {
  const activeProjectId = useStore((s) => s.activeProjectId);
  const setLayers = useStore((s) => s.setLayers);
  const setLibraryLayers = useStore((s) => s.setLibraryLayers);
  const setLayersLoading = useStore((s) => s.setLayersLoading);

  useEffect(() => {
    if (!enabled) return;
    api.getLibraryCapas().then(setLibraryLayers).catch(() => {});
  }, [enabled, setLibraryLayers]);

  useEffect(() => {
    if (!enabled || !activeProjectId) return;
    let cancelled = false;
    setLayersLoading(true);
    api.getProyectoCapas(activeProjectId)
      .then((data) => { if (!cancelled) setLayers(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLayersLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, activeProjectId, setLayers, setLayersLoading]);
}

export function useLayers() {
  const {
    layers, setLayers,
    libraryLayers, setLibraryLayers, addToLibrary, removeFromLibrary,
    activeProjectId, addLayer, removeLayer, updateLayer, patchLayer, reorderLayers,
    isUploading, uploadProgress, setIsUploading, setUploadProgress,
    layersLoading: loading,
  } = useStore();

  const fetchProjectLayers = useCallback(async () => {
    if (!activeProjectId) return;
    const data = await api.getProyectoCapas(activeProjectId);
    setLayers(data);
  }, [activeProjectId, setLayers]);

  const fetchLibrary = useCallback(async () => {
    const data = await api.getLibraryCapas();
    setLibraryLayers(data);
  }, [setLibraryLayers]);

  const upload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const newLayer = await api.uploadCapa(file, activeProjectId, (pct) => setUploadProgress(pct));
      addToLibrary(newLayer);
      if (activeProjectId) {
        addLayer(newLayer);
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      throw new Error(typeof detail === 'string' ? detail : 'Error al subir archivo', { cause: e });
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
    } catch {
      setLayers(previousLayers);
      alert('Error al quitar capa. Intente de nuevo.');
    }
  }, [activeProjectId, removeLayer, setLayers]);

  const rename = useCallback(async (id: number, nombre: string) => {
    const updated = await api.updateCapa(id, { nombre_personalizado: nombre });
    updateLayer(updated);
  }, [updateLayer]);

  const changeStyle = useCallback((id: number, estilo: LayerStyle) => {
    patchLayer(id, { estilo, color: estilo.fillColor });
    debounce(`style-${id}`, () => {
      api.updateCapa(id, { estilo }).then(updateLayer).catch(() => {
        alert('No se pudo guardar el estilo de la capa.');
      });
    });
  }, [patchLayer, updateLayer]);

  const toggleLayerVisibility = useCallback((id: number) => {
    const layer = useStore.getState().layers.find((l) => l.id === id);
    if (!layer || !activeProjectId) return;
    const visible = !(layer.visible ?? true);
    patchLayer(id, { visible });
    api.updateProyectoCapa(activeProjectId, id, { visible }).catch(() => patchLayer(id, { visible: !visible }));
  }, [activeProjectId, patchLayer]);

  const setOpacity = useCallback((id: number, opacidad: number) => {
    if (!activeProjectId) return;
    patchLayer(id, { opacidad });
    debounce(`opacity-${id}`, () => {
      api.updateProyectoCapa(activeProjectId, id, { opacidad }).catch(() => {});
    });
  }, [activeProjectId, patchLayer]);

  const reorder = useCallback(async (ids: number[]) => {
    if (!activeProjectId) return;
    const previous = useStore.getState().layers;
    reorderLayers(ids);
    try {
      await api.reorderProyectoCapas(activeProjectId, ids);
    } catch {
      setLayers(previous);
      alert('No se pudo guardar el nuevo orden de las capas.');
    }
  }, [activeProjectId, reorderLayers, setLayers]);

  const download = useCallback(async (id: number, formato: 'geojson' | 'kml' | 'shp') => {
    const layer = useStore.getState().layers.find((l) => l.id === id)
      ?? useStore.getState().libraryLayers.find((l) => l.id === id);
    const blob = await api.downloadCapa(id, formato);
    const ext = formato === 'shp' ? 'zip' : formato;
    downloadBlob(blob, `${layer?.nombre_personalizado || 'capa'}.${ext}`);
  }, []);

  const deletePermanently = useCallback(async (id: number) => {
    await api.deleteCapaPermanently(id);
    removeFromLibrary(id);
    removeLayer(id);
  }, [removeFromLibrary, removeLayer]);

  const fetchLayerGeoJson = useCallback(async (id: number) => {
    let pending = pendingGeoJson.get(id);
    if (!pending) {
      pending = api.getCapaGeoJson(id).finally(() => pendingGeoJson.delete(id));
      pendingGeoJson.set(id, pending);
    }
    const geojson = await pending;
    patchLayer(id, { datos_geojson: geojson });
    return geojson;
  }, [patchLayer]);

  return {
    layers,
    libraryLayers,
    loading,
    activeProjectId,
    toggleLayerVisibility,
    setOpacity,
    reorder,
    changeStyle,
    download,
    upload,
    linkToProject,
    unlinkFromProject,
    rename,
    deletePermanently,
    fetchLayerGeoJson,
    refreshProject: fetchProjectLayers,
    refreshLibrary: fetchLibrary,
    isUploading,
    uploadProgress,
  };
}
