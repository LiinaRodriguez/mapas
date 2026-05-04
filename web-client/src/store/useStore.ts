import { create } from 'zustand';
import type { User, Project, Layer } from '../types';

interface AppState {
  user: User | null;
  token: string | null;

  projects: Project[];
  activeProjectId: number | null;

  layers: Layer[];
  visibleLayerIds: Set<number>;

  libraryLayers: Layer[];

  authView: 'login' | 'register';
  isUploading: boolean;
  uploadProgress: number;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setAuthView: (view: 'login' | 'register') => void;

  setProjects: (projects: Project[]) => void;
  setActiveProjectId: (id: number | null) => void;
  addProject: (project: Project) => void;
  removeProject: (id: number) => void;
  updateProject: (project: Project) => void;

  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  removeLayer: (id: number) => void;
  updateLayer: (layer: Layer) => void;
  toggleLayerVisibility: (id: number) => void;
  setAllVisible: () => void;

  setLibraryLayers: (layers: Layer[]) => void;
  addToLibrary: (layer: Layer) => void;
  removeFromLibrary: (id: number) => void;

  setIsUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;
}

export const useStore = create<AppState>((set, _get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  projects: [],
  activeProjectId: (() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#proyecto-')) {
      const id = parseInt(hash.replace('#proyecto-', ''));
      return isNaN(id) ? null : id;
    }
    return null;
  })(),
  layers: [],
  visibleLayerIds: new Set(),
  libraryLayers: [],
  authView: 'login',
  isUploading: false,
  uploadProgress: 0,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      token: null,
      projects: [],
      activeProjectId: null,
      layers: [],
      visibleLayerIds: new Set(),
      libraryLayers: [],
    });
  },
  setAuthView: (authView) => set({ authView }),

  setProjects: (projects) => set({ projects }),
  setActiveProjectId: (id) => set({ activeProjectId: id, layers: [], visibleLayerIds: new Set() }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  removeProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
      layers: s.activeProjectId === id ? [] : s.layers,
    })),
  updateProject: (project) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === project.id ? project : p)),
    })),

  setLayers: (layers) => {
    const ids = new Set(layers.map((l) => l.id));
    set({ layers, visibleLayerIds: ids });
  },
  addLayer: (layer) =>
    set((s) => {
      if (s.layers.some((l) => l.id === layer.id)) return s;

      const newVisible = new Set(s.visibleLayerIds);
      newVisible.add(layer.id);
      const inLibrary = s.libraryLayers.some(l => l.id === layer.id);
      return { 
        layers: [...s.layers, layer], 
        visibleLayerIds: newVisible,
        libraryLayers: inLibrary ? s.libraryLayers : [layer, ...s.libraryLayers]
      };
    }),
  removeLayer: (id) =>
    set((s) => {
      const newVisible = new Set(s.visibleLayerIds);
      newVisible.delete(id);
      return {
        layers: s.layers.filter((l) => l.id !== id),
        visibleLayerIds: newVisible,
      };
    }),
  updateLayer: (layer) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === layer.id ? { ...l, ...layer } : l)),
      libraryLayers: s.libraryLayers.map((l) => (l.id === layer.id ? { ...l, ...layer } : l)),
    })),
  toggleLayerVisibility: (id) =>
    set((s) => {
      const newVisible = new Set(s.visibleLayerIds);
      if (newVisible.has(id)) {
        newVisible.delete(id);
      } else {
        newVisible.add(id);
      }
      return { visibleLayerIds: newVisible };
    }),
  setAllVisible: () =>
    set((s) => ({
      visibleLayerIds: new Set(s.layers.map((l) => l.id)),
    })),

  setLibraryLayers: (libraryLayers) => set({ libraryLayers }),
  addToLibrary: (layer) => set((s) => ({ libraryLayers: [layer, ...s.libraryLayers] })),
  removeFromLibrary: (id) =>
    set((s) => ({
      libraryLayers: s.libraryLayers.filter((l) => l.id !== id),
      layers: s.layers.filter((l) => l.id !== id),
    })),

  setIsUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
}));
