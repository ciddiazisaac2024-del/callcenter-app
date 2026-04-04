import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface TopScript    { id: string; title: string; uses: number; }
interface DayActivity  { day: string; total: number; }
interface ActionCount  { action: string; total: number; }
interface WeeklyGrowth { this_week: number; last_week: number; }
interface CategoryUsage { name: string; color: string; uses: number; }

export interface Metrics {
  top_scripts:     TopScript[];
  activity_by_day: DayActivity[];
  action_counts:   ActionCount[];
  weekly_growth:   WeeklyGrowth;
  category_usage:  CategoryUsage[];
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/scripts/metrics')
      .then(res => setMetrics(res.data.data))
      .catch(() => toast.error('Error al cargar métricas'))
      .finally(() => setLoading(false));
  }, []);

  return { metrics, loading };
}
