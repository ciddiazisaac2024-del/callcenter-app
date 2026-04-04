import { useState } from 'react';
import { X, Save, ChevronDown, Loader2 } from 'lucide-react';
import { Script, Category, Variable } from '../../types';
import VariablesEditor from './VariablesEditor';
import toast from 'react-hot-toast';

export interface ScriptForm {
  title:        string;
  description:  string;
  base_content: string;
  category_id:  string;
  tags:         string;
  variables:    Variable[];
}

export const emptyForm: ScriptForm = {
  title: '', description: '', base_content: '',
  category_id: '', tags: '', variables: []
};

interface Props {
  script:     Script | null;
  categories: Category[];
  onSave:     (form: ScriptForm, id?: string) => Promise<void>;
  onClose:    () => void;
}

export default function ScriptModal({ script, categories, onSave, onClose }: Props) {
  const [form, setForm] = useState<ScriptForm>(() =>
    script ? {
      title:        script.title,
      description:  script.description || '',
      base_content: script.base_content,
      category_id:  categories.find(c => c.name === script.category_name)?.id || '',
      tags:         script.tags?.join(', ') || '',
      variables:    script.variables || []
    } : emptyForm
  );
  const [saving, setSaving] = useState(false);

  const set = (field: keyof ScriptForm, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim())        { toast.error('El título es obligatorio');    return; }
    if (!form.base_content.trim()) { toast.error('El contenido es obligatorio'); return; }
    setSaving(true);
    try { await onSave(form, script?.id); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">
            {script ? '✏️ Editar script' : '➕ Nuevo script'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2 block">Título *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ej: Gestión de Incumplimiento de Pago"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2 block">Categoría</label>
              <div className="relative">
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 appearance-none transition-colors">
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2 block">Tags (separados por coma)</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)}
                placeholder="incumplimiento, cobranza, pago"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2 block">Descripción</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Breve descripción del propósito del script"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2 block">
              Contenido *
              <span className="text-slate-600 font-normal normal-case tracking-normal ml-2">
                — usa {`{{variable}}`} para campos dinámicos
              </span>
            </label>
            <textarea value={form.base_content} onChange={e => set('base_content', e.target.value)}
              rows={10} placeholder={`Buenos días, ¿me comunico con {{cliente}}?\n\nMi nombre es [AGENTE]...`}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm resize-none" />
          </div>

          <VariablesEditor variables={form.variables} onChange={vars => set('variables', vars)} />
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} type="button"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving} type="button"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : script ? 'Guardar cambios' : 'Crear script'}
          </button>
        </div>
      </div>
    </div>
  );
}
