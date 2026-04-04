import { ChevronRight, Star, Zap } from 'lucide-react';
import { Script } from '../../types';

interface HistoryEntry { id: string; }

interface Props {
  script:     Script;
  isFavorite: boolean;
  onClick:    () => void;
}

export default function ScriptCard({ script, isFavorite, onClick }: Props) {
  const history: HistoryEntry[] = JSON.parse(localStorage.getItem('usage_history') || '[]');
  const usageCount = history.filter(h => h.id === script.id).length;

  return (
    <div onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-black/30 group relative">
      {isFavorite && (
        <div className="absolute top-3 right-3">
          <Star className="w-4 h-4 text-amber-400 fill-current" />
        </div>
      )}
      <div className="flex items-start justify-between mb-3 pr-6">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${script.category_color}20`, color: script.category_color }}>
          {script.category_name || 'Sin categoría'}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 mt-0.5" />
      </div>
      <h3 className="text-white font-semibold mb-2 line-clamp-2 leading-snug">{script.title}</h3>
      <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">{script.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {script.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded">#{tag}</span>
          ))}
        </div>
        {usageCount > 0 && (
          <div className="flex items-center gap-1 text-slate-600 text-xs">
            <Zap className="w-3 h-3" />{usageCount}x
          </div>
        )}
      </div>
    </div>
  );
}
