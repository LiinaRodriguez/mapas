import type { Layer, LayerStyle, StyleRule } from '../types';
import { buildCategoricalRule, buildGraduatedRule, isNumericField, layerFields } from '../utils/geo';

interface StyleEditorProps {
  layer: Layer;
  onChange: (style: LayerStyle) => void;
}

type RuleMode = 'single' | 'categorical' | 'graduated';

export function StyleEditor({ layer, onChange }: StyleEditorProps) {
  const style = layer.estilo;
  const fc = layer.datos_geojson;
  const fields = layerFields(fc);
  const mode: RuleMode = style.rule?.type ?? 'single';

  const set = (patch: Partial<LayerStyle>) => onChange({ ...style, ...patch });

  const buildRule = (type: RuleMode, field: string | undefined): StyleRule | null => {
    if (type === 'single' || !fc || !field) return null;
    return type === 'categorical' ? buildCategoricalRule(fc, field) : buildGraduatedRule(fc, field);
  };

  const fieldsFor = (type: RuleMode) =>
    type === 'graduated' ? fields.filter((f) => isNumericField(fc, f)) : fields;

  const changeMode = (type: RuleMode) => {
    const candidates = fieldsFor(type);
    const field = candidates.includes(style.rule?.field ?? '') ? style.rule?.field : candidates[0];
    set({ rule: buildRule(type, field) });
  };

  const changeClassColor = (index: number, color: string) => {
    if (!style.rule) return;
    const classes = style.rule.classes.map((c, i) => (i === index ? { ...c, color } : c));
    set({ rule: { ...style.rule, classes } });
  };

  return (
    <div className="style-editor">
      <div className="style-row">
        <label>Relleno</label>
        <input type="color" value={style.fillColor} onChange={(e) => set({ fillColor: e.target.value })} />
        <label>Borde</label>
        <input type="color" value={style.strokeColor} onChange={(e) => set({ strokeColor: e.target.value })} />
      </div>

      <div className="style-row">
        <label>Grosor de línea</label>
        <input
          type="range" min={0} max={10} step={0.5}
          value={style.strokeWidth}
          onChange={(e) => set({ strokeWidth: Number(e.target.value) })}
        />
        <span className="style-value">{style.strokeWidth}px</span>
      </div>

      <div className="style-row">
        <label>Opacidad del relleno</label>
        <input
          type="range" min={0} max={1} step={0.05}
          value={style.fillOpacity}
          onChange={(e) => set({ fillOpacity: Number(e.target.value) })}
        />
        <span className="style-value">{Math.round(style.fillOpacity * 100)}%</span>
      </div>

      <div className="style-row">
        <label>Estilo</label>
        <select className="input input-sm" value={mode} onChange={(e) => changeMode(e.target.value as RuleMode)} disabled={!fc}>
          <option value="single">Símbolo único</option>
          <option value="categorical" disabled={fields.length === 0}>Por categorías</option>
          <option value="graduated" disabled={fieldsFor('graduated').length === 0}>Graduado (numérico)</option>
        </select>
      </div>

      {style.rule && (
        <>
          <div className="style-row">
            <label>Campo</label>
            <select
              className="input input-sm"
              value={style.rule.field}
              onChange={(e) => set({ rule: buildRule(mode, e.target.value) })}
            >
              {fieldsFor(mode).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="style-classes">
            {style.rule.classes.map((c, i) => (
              <div key={i} className="style-class">
                <input type="color" value={c.color} onChange={(e) => changeClassColor(i, e.target.value)} />
                <span title={c.label ?? ''}>{c.label}</span>
              </div>
            ))}
            {style.rule.classes.length === 0 && <span className="style-value">Sin valores en este campo</span>}
          </div>
        </>
      )}
    </div>
  );
}
