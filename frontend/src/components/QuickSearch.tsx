import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { scriptsService } from '../services/api';
import { Script } from '../types';
import { Search, Clock, Star, X, ArrowRight } from 'lucide-react';

interface Props { onClose: () => void; }

export default function QuickSearch({ onClose }: Props) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Script[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);
  const navigate              = useNavigate();

  const history   = JSON.parse(localStorage.getItem('usage_history') || '[]').slice(0, 5) as { id: string; title: string }[];
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]') as string[];

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await scriptsService.getAll({ search: query });
        setResults(res.data.data.slice(0, 6));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const goTo = (id: string) => { navigate(`/scripts/${id}`); onClose(); };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar script... Ej: incumplimiento, CNE, calidad"
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-base focus:outline-none"
          />
          <div className="flex items-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.trim() ? (
            results.length > 0 ? (
              <div className="p-2">
                <p className="text-xs text-slate-600 px-3 py-2 uppercase tracking-widest">{results.length} resultado(s)</p>
                {results.map(script => (
                  <button key={script.id} onClick={() => goTo(script.id)}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-800 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: script.category_color }} />
                      <div>
                        <p className="text-white text-sm font-medium">{script.title}</p>
                        <p className="text-slate-500 text-xs">{script.category_name}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm">No se encontraron scripts para "{query}"</div>
            )
          ) : (
            <div className="p-2">
              {history.length > 0 && (
                <div>
                  <p className="text-xs text-slate-600 px-3 py-2 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Usados recientemente
                  </p>
                  {history.map((h, i) => (
                    <button key={i} onClick={() => goTo(h.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-left"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="text-slate-300 text-sm truncate">{h.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {favorites.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-slate-600 px-3 py-2 uppercase tracking-widest flex items-center gap-1">
                    <Star className="w-3 h-3" /> Favoritos guardados
                  </p>
                  <p className="text-slate-600 text-xs px-3 pb-2">{favorites.length} script(s) marcado(s)</p>
                </div>
              )}
              <div className="px-3 py-3 border-t border-slate-800 mt-1">
                <p className="text-xs text-slate-600 mb-2">Búsquedas frecuentes:</p>
                <div className="flex flex-wrap gap-2">
                  {['incumplimiento', 'CNE', 'calidad', 'retención', 'bienvenida'].map(s => (
                    <button key={s} onClick={() => setQuery(s)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 px-5 py-3 flex justify-between text-xs text-slate-600">
          <span>Escribe para buscar</span>
          <span>Esc para cerrar</span>
        </div>
      </div>
    </div>
  );
}
