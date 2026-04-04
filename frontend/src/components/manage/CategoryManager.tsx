import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Category, Script } from '../../types';

interface Props {
  categories: Category[];
  scripts:    Script[];
  onAdd:      (name: string, color: string) => Promise<void>;
  onDelete:   (cat: Category) => Promise<void>;
}

export default function CategoryManager({ categories, scripts, onAdd, onDelete }: Props) {
  const [name, setName]       = useState('');
  const [color, setColor]     = useState('#3B82F6');
  const [adding, setAdding]   = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try { await onAdd(name.trim(), color); setName(''); setColor('#3B82F6'); }
    finally { setAdding(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Nueva categoría</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nombre de la categoría"
            className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-sm" />
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs whitespace-nowrap">Color:</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-0.5" />
          </div>
          <button onClick={handleAdd} disabled={adding}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Añadir
          </button>
        </div>
      </div>

      <div>
        <p className="text-slate-500 text-sm mb-3">{categories.length} categorías</p>
        <div className="space-y-2">
          {categories.map(cat => {
            const count = scripts.filter(s => s.category_name === cat.name).length;
            return (
              <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-white font-medium">{cat.name}</span>
                  <span className="text-slate-600 text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                    {count} script{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <button onClick={() => onDelete(cat)} disabled={count > 0}
                  title={count > 0 ? 'Elimina los scripts primero' : 'Eliminar'}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
