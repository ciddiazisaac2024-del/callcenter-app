import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  label:  string;
  value:  number | string;
  icon:   LucideIcon;
  color:  string;
  trend?: { value: number; label: string };
}

export default function KpiCard({ label, value, icon: Icon, color, trend }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend.value > 0 ? 'text-emerald-400' : trend.value < 0 ? 'text-red-400' : 'text-slate-500'}`}>
            {trend.value > 0 ? <TrendingUp className="w-3 h-3" /> :
             trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <p className="text-white font-bold text-2xl mb-1">{value}</p>
      <p className="text-slate-500 text-xs">{label}</p>
      {trend && <p className="text-slate-600 text-xs mt-1">{trend.label}</p>}
    </div>
  );
}
