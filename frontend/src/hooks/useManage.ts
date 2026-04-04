import { useState, useEffect } from 'react';
import { scriptsService } from '../services/api';
import { Script, Category } from '../types';
import toast from 'react-hot-toast';
import { ScriptForm } from '../components/manage/ScriptModal';

export function useManage() {
  const [scripts, setScripts]     = useState<Script[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]     = useState(true);

  const loadData = async () => {
    try {
      const [s, c] = await Promise.all([
        scriptsService.getAll(),
        scriptsService.getCategories()
      ]);
      setScripts(s.data.data);
      setCategories(c.data.data);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveScript = async (form: ScriptForm, id?: string) => {
    const payload = {
      title:        form.title.trim(),
      description:  form.description.trim(),
      base_content: form.base_content.trim(),
      category_id:  form.category_id || null,
      tags:         form.tags.split(',').map(t => t.trim()).filter(Boolean),
      variables:    form.variables
    };
    try {
      if (id) {
        await scriptsService.update(id, payload);
        toast.success('Script actualizado');
      } else {
        await scriptsService.create(payload);
        toast.success('Script creado');
      }
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Error al guardar el script');
      throw err; // re-lanzar para que el modal pueda reaccionar
    }
  };

  const deleteScript = async (script: Script) => {
    try {
      await scriptsService.remove(script.id);
      toast.success(`"${script.title}" eliminado`);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || `Error al eliminar "${script.title}"`);
    }
  };

  const addCategory = async (name: string, color: string) => {
    await scriptsService.createCategory({ name, color });
    toast.success('Categoría creada');
    await loadData();
  };

  const deleteCategory = async (cat: Category) => {
    try {
      await scriptsService.removeCategory(cat.id);
      toast.success(`"${cat.name}" eliminada`);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'No se puede eliminar esta categoría');
    }
  };

  return { scripts, categories, loading, saveScript, deleteScript, addCategory, deleteCategory };
}
