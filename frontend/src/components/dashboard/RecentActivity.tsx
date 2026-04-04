import { Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HistoryEntry { id: string; title: string; usedAt: string; }

export default function RecentActivity() {
  const navigate = useNavigate();
  const history: HistoryEntry[] = JSON.parse(localStorage.getItem('usage_history') || '[]').slice(0, 4);
  if (history.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-slate-500" />
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Usados recientemente</h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {history.map((h, i) => (
          <button key={i} onClick={() => navigate(`/scripts/${h.id}`)}
            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl px-3 py-2.5 transition-all text-left group">
            <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-300 text-xs truncate group-hover:text-white transition-colors">{h.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
