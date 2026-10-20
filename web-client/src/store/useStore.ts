import { create } from 'zustand';
import type {
  User, Project, Layer, BasemapId, MapTool, CoordinateFormat, RasterLayer, AttributeFilter,
} from '../types';

interface AppState {
  user: User | null;
  token: string | null;

  projects: Project[];
  activeProjectId: number | null;

  /** Project layers, index 0 is drawn on top. */
  layers: Layer[];

  libraryLayers: Layer[];
  layersLoading: boolean;

  basemap: BasemapId;
  activeTool: MapTool;
  coordinateFormat: CoordinateFormat;
  rasterLayers: RasterLayer[];
  attributeLayerId: number | null;
  attributeFilters: Record<number, AttributeFilter>;

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
  patchLayer: (id: number, patch: Partial<Layer>) => void;
  reorderLayers: (ids: number[]) => void;

  setLayersLoading: (v: boolean) => void;
  setLibraryLayers: (layers: Layer[]) => void;
  addToLibrary: (layer: Layer) => void;
  removeFromLibrary: (id: number) => void;

  setIsUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;

  setBasemap: (id: BasemapId) => void;
  setActiveTool: (tool: MapTool) => void;
  setCoordinateFormat: (format: CoordinateFormat) => void;
  addRasterLayer: (layer: RasterLayer) => void;
  updateRasterLayer: (id: string, patch: Partial<RasterLayer>) => void;
  removeRasterLayer: (id: string) => void;
  setAttributeLayerId: (id: number | null) => void;
  setAttributeFilter: (id: number, filter: AttributeFilter | null) => void;
}

const withProjectDefaults = (layer: Layer): Layer => ({ visible: true, opacidad: 1, ...layer });

export const useStore = create<AppState>((set) => ({
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
  libraryLayers: [],
  layersLoading: false,
  basemap: 'satellite',
  activeTool: 'none',
  coordinateFormat: 'decimal',
  rasterLayers: [],
  attributeLayerId: null,
  attributeFilters: {},
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
      libraryLayers: [],
      rasterLayers: [],
      attributeLayerId: null,
      attributeFilters: {},
    });
  },
  setAuthView: (authView) => set({ authView }),

  setProjects: (projects) => set({ projects }),
  setActiveProjectId: (id) =>
    set({
      activeProjectId: id,
      layers: [],
      rasterLayers: [],
      attributeLayerId: null,
      attributeFilters: {},
      activeTool: 'none',
    }),
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

  setLayers: (layers) => set({ layers: layers.map(withProjectDefaults) }),
  addLayer: (layer) =>
    set((s) => {
      if (s.layers.some((l) => l.id === layer.id)) return s;
      const inLibrary = s.libraryLayers.some((l) => l.id === layer.id);
      return {
        layers: [withProjectDefaults(layer), ...s.layers],
        libraryLayers: inLibrary ? s.libraryLayers : [layer, ...s.libraryLayers],
      };
    }),
  removeLayer: (id) =>
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== id),
      attributeLayerId: s.attributeLayerId === id ? null : s.attributeLayerId,
    })),
  updateLayer: (layer) =>
    set((s) => ({
      // Library responses carry no project fields (visible, opacidad): keep the local ones.
      layers: s.layers.map((l) =>
        l.id === layer.id
          ? { ...l, ...layer, visible: layer.visible ?? l.visible, opacidad: layer.opacidad ?? l.opacidad }
          : l
      ),
      libraryLayers: s.libraryLayers.map((l) => (l.id === layer.id ? { ...l, ...layer } : l)),
    })),
  patchLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  reorderLayers: (ids) =>
    set((s) => {
      const byId = new Map(s.layers.map((l) => [l.id, l]));
      const ordered = ids.flatMap((id, orden) => {
        const layer = byId.get(id);
        return layer ? [{ ...layer, orden }] : [];
      });
      return { layers: ordered };
    }),

  setLayersLoading: (layersLoading) => set({ layersLoading }),
  setLibraryLayers: (libraryLayers) => set({ libraryLayers }),
  addToLibrary: (layer) => set((s) => ({ libraryLayers: [layer, ...s.libraryLayers] })),
  removeFromLibrary: (id) =>
    set((s) => ({
      libraryLayers: s.libraryLayers.filter((l) => l.id !== id),
      layers: s.layers.filter((l) => l.id !== id),
    })),

  setIsUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),

  setBasemap: (basemap) => set({ basemap }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setCoordinateFormat: (coordinateFormat) => set({ coordinateFormat }),
  addRasterLayer: (layer) => set((s) => ({ rasterLayers: [layer, ...s.rasterLayers] })),
  updateRasterLayer: (id, patch) =>
    set((s) => ({ rasterLayers: s.rasterLayers.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
  removeRasterLayer: (id) => set((s) => ({ rasterLayers: s.rasterLayers.filter((r) => r.id !== id) })),
  setAttributeLayerId: (attributeLayerId) => set({ attributeLayerId }),
  setAttributeFilter: (id, filter) =>
    set((s) => {
      const next = { ...s.attributeFilters };
      if (filter) next[id] = filter;
      else delete next[id];
      return { attributeFilters: next };
    }),
}));
