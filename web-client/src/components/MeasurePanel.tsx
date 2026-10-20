import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Measurement } from '../hooks/useMapTools';
import { formatArea, formatDistance } from '../utils/geo';

export function MeasurePanel({ measurement }: { measurement: Measurement }) {
  const setActiveTool = useStore((s) => s.setActiveTool);
  const isArea = measurement.mode === 'measure-area';

  return (
    <div className="measure-panel">
      <div className="measure-panel-header">
        <span>{isArea ? 'Medición de área' : 'Medición de distancia'}</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActiveTool('none')} title="Cerrar">
          <X size={14} />
        </button>
      </div>
      {measurement.points.length === 0 ? (
        <div className="measure-panel-hint">Haga clic en el mapa para agregar vértices y doble clic para terminar.</div>
      ) : (
        <>
          {isArea && <div className="measure-panel-value">{formatArea(measurement.area)}</div>}
          <div className={isArea ? 'measure-panel-sub' : 'measure-panel-value'}>
            {isArea ? 'Perímetro: ' : ''}{formatDistance(measurement.distance)}
          </div>
          <div className="measure-panel-hint">
            {measurement.done ? 'Haga clic para iniciar una nueva medición.' : 'Doble clic para terminar.'}
          </div>
        </>
      )}
    </div>
  );
}
