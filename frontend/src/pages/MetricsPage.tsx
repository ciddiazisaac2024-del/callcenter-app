import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMetrics } from '../hooks/useMetrics';
import PageHeader     from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import KpiCard        from '../components/metrics/KpiCard';
import ActivityChart  from '../components/metrics/ActivityChart';
import HorizontalBar  from '../components/metrics/HorizontalBar';
import {
  Zap, Eye, Plus, Copy,
  TrendingUp, TrendingDown, Minus,
  Award, Activity, BarChart2, Tag,
  Pencil, Trash2, LogIn
} from 'lucide-react';

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  GENERATE_SCRIPT: { label: 'Scripts generados', icon: Zap,     color: 'text-blue-400'   },
  VIEW_SCRIPT:     { label: 'Scripts vistos',     icon: Eye,     color: 'text-slate-400'  },
  LOGIN:           { label: 'Inicios de sesión',  icon: LogIn,   color: 'text-emerald-400'},
  CREATE_SCRIPT:   { label: 'Scripts creados',    icon: Plus,    color: 'text-purple-400' },
  UPDATE_SCRIPT:   { label: 'Scripts editados',   icon: Pencil,  color: 'text-amber-400'  },
  DELETE_SCRIPT:   { label: 'Scripts eliminados', icon: Trash2,  color: 'text-red-400'    },
};

export default function MetricsPage() {
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');
  const { user }            = useAuth();
  const navigate            = useNavigate();
  const { metrics, loading } = useMetrics();

  if (user?.role === 'agent') { navigate('/dashboard'); return null; }
  if (loading) return (
    <div className="min-h-screen bg-slate-950">
      <PageHeader title="Panel de Métricas" subtitle="Actividad del equipo" backTo="/dashboard" />
      <LoadingSpinner message="Cargando métricas..." />
    </div>
  );
  if (!metrics) return null;

  const totalGenerados = metrics.action_counts.find(a => a.action === 'GENERATE_SCRIPT')?.total ?? 0;
  const totalVistos    = metrics.action_counts.find(a => a.action === 'VIEW_SCRIPT')?.total ?? 0;
  const totalCreados   = metrics.action_counts.find(a => a.action === 'CREATE_SCRIPT')?.total ?? 0;
  const thisWeek       = parseInt(String(metrics.weekly_growth?.this_week  ?? 0));
  const lastWeek       = parseInt(String(metrics.weekly_growth?.last_week  ?? 0));
  const weekPct        = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
  const maxDay         = Math.max(...metrics.activity_by_day.map(d => parseInt(String(d.total))), 1);
  const maxUses        = Math.max(...metrics.top_scripts.map(s => parseInt(String(s.uses))), 1);
  const maxCat         = Math.max(...metrics.category_usage.map(c => parseInt(String(c.uses))), 1);
  const maxAct         = Math.max(...metrics.action_counts.map(a => parseInt(String(a.total))), 1);

  return (
    <div className="min-h-screen bg-slate-950">
      <PageHeader
        title="Panel de Métricas"
        subtitle="Actividad del equipo de call center"
        backTo="/dashboard"
        actions={
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {(['7d', '30d'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {p === '7d' ? '7 días' : '30 días'}
              </button>
            ))}
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Scripts generados" value={totalGenerados} icon={Zap} color="text-blue-400"
            trend={{ value: weekPct, label: `${thisWeek} esta semana vs ${lastWeek} anterior` }} />
          <KpiCard label="Scripts vistos"    value={totalVistos}    icon={Eye}  color="text-slate-400" />
          <KpiCard label="Scripts creados"   value={totalCreados}   icon={Plus} color="text-purple-400" />
          <KpiCard label="Copiados esta semana" value={thisWeek}    icon={Copy} color="text-emerald-400" />
        </div>

        {/* Gráfico + Top */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-white font-semibold">Actividad diaria</h2>
              </div>
              <span className="text-slate-600 text-xs">últimos 14 días</span>
            </div>
            <ActivityChart data={metrics.activity_by_day} maxValue={maxDay} />
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500/70" /><span className="text-slate-500 text-xs">Anteriores</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span className="text-slate-500 text-xs">Hoy</span></div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-white font-semibold">Top scripts</h2>
              <span className="text-slate-600 text-xs ml-auto">30 días</span>
            </div>
            {metrics.top_scripts.length === 0 ? (
              <div className="text-center py-8"><p className="text-slate-500 text-sm">Sin datos aún</p></div>
            ) : (
              <div className="space-y-4">
                {metrics.top_scripts.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-500/20 text-slate-400' :
                      i === 2 ? 'bg-orange-700/20 text-orange-600' : 'bg-slate-800 text-slate-600'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs font-medium truncate">{s.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(parseInt(String(s.uses)) / maxUses) * 100}%` }} />
                        </div>
                        <span className="text-slate-500 text-xs shrink-0">{s.uses}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categorías + Acciones */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Tag className="w-4 h-4 text-blue-400" />
              <h2 className="text-white font-semibold">Uso por categoría</h2>
            </div>
            {metrics.category_usage.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">Sin datos aún</p>
            ) : (
              <div className="space-y-4">
                {metrics.category_usage.map(cat => (
                  <HorizontalBar key={cat.name} label={cat.name}
                    value={parseInt(String(cat.uses))} max={maxCat} color={cat.color}
                    sublabel={`${Math.round((parseInt(String(cat.uses)) / maxCat) * 100)}% del total`} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <h2 className="text-white font-semibold">Acciones del equipo</h2>
            </div>
            <div className="space-y-3">
              {metrics.action_counts.map(ac => {
                const meta  = ACTION_META[ac.action];
                const Icon  = meta?.icon ?? Zap;
                const total = parseInt(String(ac.total));
                return (
                  <div key={ac.action} className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${meta?.color ?? 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 text-xs">{meta?.label ?? ac.action}</span>
                        <span className="text-white text-xs font-semibold">{total}</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-slate-600" style={{ width: `${(total / maxAct) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Crecimiento semanal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-white font-semibold">Resumen semanal — Scripts generados</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center"><p className="text-slate-500 text-xs mb-2">Esta semana</p><p className="text-white font-bold text-3xl">{thisWeek}</p></div>
            <div className="text-center flex flex-col items-center justify-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${weekPct > 0 ? 'bg-emerald-500/10 text-emerald-400' : weekPct < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                {weekPct > 0 ? <TrendingUp className="w-4 h-4" /> : weekPct < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                <span className="font-bold text-lg">{weekPct > 0 ? '+' : ''}{weekPct}%</span>
              </div>
              <p className="text-slate-600 text-xs mt-2">vs semana anterior</p>
            </div>
            <div className="text-center"><p className="text-slate-500 text-xs mb-2">Semana anterior</p><p className="text-white font-bold text-3xl">{lastWeek}</p></div>
          </div>
        </div>
      </main>
    </div>
  );
}
