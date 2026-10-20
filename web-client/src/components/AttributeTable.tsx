import { useMemo } from 'react';
import type maplibregl from 'maplibre-gl';
import { Search, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { AttributeFilter } from '../types';
import { geojsonBounds, layerFields, matchesFilter } from '../utils/geo';

const MAX_ROWS = 500;
const EMPTY_FILTER: AttributeFilter = { field: null, term: '', applyToMap: true };

export function AttributeTable({ map }: { map: maplibregl.Map | null }) {
  const layerId = useStore((s) => s.attributeLayerId);
  const layer = useStore((s) => s.layers.find((l) => l.id === s.attributeLayerId));
  const filter = useStore((s) => (layerId !== null ? s.attributeFilters[layerId] : undefined)) ?? EMPTY_FILTER;
  const setAttributeFilter = useStore((s) => s.setAttributeFilter);
  const setAttributeLayerId = useStore((s) => s.setAttributeLayerId);

  const fc = layer?.datos_geojson;
  const fields = useMemo(() => layerFields(fc), [fc]);

  const rows = useMemo(() => {
    const features = fc?.features ?? [];
    const term = filter.term.trim();
    if (!term) return features;
    return features.filter((f) => {
      const props = f.properties ?? {};
      return filter.field
        ? matchesFilter(props[filter.field], term)
        : Object.values(props).some((v) => matchesFilter(v, term));
    });
  }, [fc, filter.term, filter.field]);

  if (layerId === null || !layer) return null;

  const update = (patch: Partial<AttributeFilter>) => setAttributeFilter(layerId, { ...filter, ...patch });

  const zoomTo = (index: number) => {
    const bounds = geojsonBounds(rows[index]?.geometry ?? null);
    if (map && bounds) map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 600 });
  };

  return (
    <div className="attribute-table">
      <div className="attribute-table-header">
        <div className="attribute-table-title">
          Atributos · {layer.nombre_personalizado}
          <span className="attribute-table-count">
            {rows.length} de {fc?.features.length ?? 0}
          </span>
        </div>
        <div className="attribute-table-controls">
          <select
            className="input input-sm"
            value={filter.field ?? ''}
            onChange={(e) => update({ field: e.target.value || null })}
          >
            <option value="">Todos los campos</option>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="attribute-search">
            <Search size={14} />
            <input
              className="input input-sm"
              placeholder="Buscar..."
              value={filter.term}
              onChange={(e) => update({ term: e.target.value })}
            />
          </div>
          <label className="attribute-check">
            <input
              type="checkbox"
              checked={filter.applyToMap}
              onChange={(e) => update({ applyToMap: e.target.checked })}
            />
            Filtrar en el mapa
          </label>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            title="Cerrar tabla"
            onClick={() => {
              setAttributeFilter(layerId, null);
              setAttributeLayerId(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="attribute-table-body">
        {!fc ? (
          <div className="attribute-table-empty">Active la capa para cargar sus atributos.</div>
        ) : fields.length === 0 ? (
          <div className="attribute-table-empty">La capa no tiene atributos.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                {fields.map((f) => <th key={f}>{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, MAX_ROWS).map((feature, i) => (
                <tr key={i} onClick={() => zoomTo(i)} title="Acercar a la geometría">
                  <td>{i + 1}</td>
                  {fields.map((f) => <td key={f}>{String(feature.properties?.[f] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length > MAX_ROWS && (
          <div className="attribute-table-empty">
            Mostrando {MAX_ROWS} de {rows.length} registros. Refine la búsqueda para ver más.
          </div>
        )}
      </div>
    </div>
  );
}
