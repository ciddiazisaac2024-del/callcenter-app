import { Pencil, Trash2, FileText } from 'lucide-react';
import { Script } from '../../types';
import EmptyState from '../ui/EmptyState';

interface Props {
  scripts:   Script[];
  onEdit:    (script: Script) => void;
  onDelete:  (script: Script) => void;
  onCreate:  () => void;
}

export default function ScriptList({ scripts, onEdit, onDelete, onCreate }: Props) {
  if (scripts.length === 0) {
    return <EmptyState icon={FileText} title="No hay scripts todavía" action={{ label: 'Crear el primero', onClick: onCreate }} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-slate-500 text-sm">{scripts.length} scripts en total</p>
      {scripts.map(script => (
        <div key={script.id}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-5 py-4 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-4 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: script.category_color || '#64748b' }} />
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{script.title}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {script.category_name || 'Sin categoría'}
                {script.tags?.length > 0 && ` · ${script.tags.slice(0, 3).map(t => `#${t}`).join(' ')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onEdit(script)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={() => onDelete(script)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
