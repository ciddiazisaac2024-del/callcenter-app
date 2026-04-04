import { Plus, X } from 'lucide-react';
import { Variable } from '../../types';

interface Props {
  variables: Variable[];
  onChange:  (v: Variable[]) => void;
}

export default function VariablesEditor({ variables, onChange }: Props) {
  const add    = () => onChange([...variables, { key: '', label: '', type: 'text', placeholder: '' }]);
  const remove = (i: number) => onChange(variables.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, value: unknown) =>
    onChange(variables.map((v, idx) => idx === i ? { ...v, [field]: value } : v));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold tracking-widest uppercase text-slate-500">
          Variables dinámicas
        </label>
        <button onClick={add} type="button"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 px-2.5 py-1 rounded-lg transition-colors">
          <Plus className="w-3 h-3" /> Añadir variable
        </button>
      </div>

      {variables.length === 0 && (
        <p className="text-slate-600 text-xs py-3 border border-dashed border-slate-800 rounded-xl text-center">
          Usa <code className="text-slate-500">{`{{nombre}}`}</code> en el contenido y define la variable aquí.
        </p>
      )}

      <div className="space-y-3">
        {variables.map((v, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">{`{{${v.key || '?'}}}`}</span>
              <button onClick={() => remove(i)} type="button"
                className="text-slate-600 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Clave *</label>
                <input value={v.key}
                  onChange={e => update(i, 'key', e.target.value.replace(/\s/g, '_'))}
                  placeholder="ej: cliente"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Etiqueta *</label>
                <input value={v.label}
                  onChange={e => update(i, 'label', e.target.value)}
                  placeholder="ej: Nombre del cliente"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Tipo</label>
                <select value={v.type} onChange={e => update(i, 'type', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 appearance-none transition-colors">
                  <option value="text">Texto libre</option>
                  <option value="select">Desplegable</option>
                  <option value="number">Número</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Placeholder</label>
                <input value={v.placeholder || ''}
                  onChange={e => update(i, 'placeholder', e.target.value)}
                  placeholder="ej: Ej: Sr. García"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>

            {v.type === 'select' && (
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Opciones (separadas por coma)</label>
                <input
                  value={Array.isArray(v.options) ? v.options.join(', ') : ''}
                  onChange={e => update(i, 'options', e.target.value.split(',').map((o: string) => o.trim()).filter(Boolean))}
                  placeholder="Opción 1, Opción 2"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
