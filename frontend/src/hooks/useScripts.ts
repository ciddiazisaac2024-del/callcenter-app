import { useState, useEffect, useCallback } from 'react';
import { scriptsService } from '../services/api';
import { Script, Category } from '../types';
import toast from 'react-hot-toast';

export function useScripts(search: string, category: string) {
  const [scripts, setScripts]       = useState<Script[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search)   params.search   = search;
      if (category) params.category = category;
      const [s, c] = await Promise.all([
        scriptsService.getAll(params),
        scriptsService.getCategories()
      ]);
      setScripts(s.data.data);
      setCategories(c.data.data);
    } catch {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { load(); }, [load]);

  return { scripts, categories, loading };
}
