interface DayActivity { day: string; total: number; }

interface Props { data: DayActivity[]; maxValue: number; }

export default function ActivityChart({ data, maxValue }: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-600 text-sm">Sin actividad reciente</div>;
  }
  return (
    <div className="flex items-end gap-1 h-32 pt-2">
      {data.map(d => {
        const pct     = maxValue > 0 ? (parseInt(String(d.total)) / maxValue) * 100 : 0;
        const height  = Math.max(4, (pct / 100) * 112);
        const date    = new Date(d.day);
        const isToday = new Date().toDateString() === date.toDateString();
        const label   = date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {d.total} acciones
            </div>
            <div
              className={`w-full rounded-t transition-all duration-500 cursor-default ${isToday ? 'bg-blue-500 hover:bg-blue-400' : 'bg-emerald-500/70 hover:bg-emerald-400'}`}
              style={{ height: `${height}px` }}
            />
            <span className="text-[9px] text-slate-600 hidden sm:block">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
