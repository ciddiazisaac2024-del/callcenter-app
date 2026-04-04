interface Props { label: string; value: number; max: number; color: string; sublabel?: string; }

export default function HorizontalBar({ label, value, max, color, sublabel }: Props) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 mr-3">
          <p className="text-slate-300 text-sm truncate">{label}</p>
          {sublabel && <p className="text-slate-600 text-xs">{sublabel}</p>}
        </div>
        <span className="text-white font-semibold text-sm shrink-0">{value}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color || '#3b82f6' }} />
      </div>
    </div>
  );
}
