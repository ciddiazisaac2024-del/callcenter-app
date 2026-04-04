import { Response } from 'express';
import { body }     from 'express-validator';
import { AuthRequest } from '../middlewares/auth.middleware';
import { scriptService, ScriptNotFoundError, CategoryHasScriptsError } from '../services/script.service';

// Validaciones — se exportan para usarse en las rutas
export const scriptValidation = [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Título entre 3 y 255 caracteres'),
  body('base_content').trim().isLength({ min: 10, max: 50000 }).withMessage('Contenido entre 10 y 50.000 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  body('variables').optional().isArray()
];

// ── Helper: parsear paginación desde query ──
const parsePagination = (query: Record<string, unknown>) => ({
  page:  Math.max(1, parseInt(String(query.page  ?? '1'))),
  limit: Math.min(50, Math.max(1, parseInt(String(query.limit ?? '20'))))
});

export const getAllScripts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters    = { category: req.query.category as string, search: req.query.search as string, tag: req.query.tag as string };
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const result     = await scriptService.list(filters, pagination);
    res.json({ success: true, ...result });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener scripts' });
  }
};

export const getScriptById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const script = await scriptService.getById(req.params.id, req.user!.id);
    res.json({ success: true, data: script });
  } catch (err) {
    if (err instanceof ScriptNotFoundError) { res.status(404).json({ success: false, message: err.message }); return; }
    res.status(500).json({ success: false, message: 'Error al obtener script' });
  }
};

export const createScript = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, category_id, description, base_content, variables, tags } = req.body;
    const script = await scriptService.create({
      title: title.trim(), description: (description || '').trim(),
      base_content: base_content.trim(), category_id: category_id || null,
      variables: variables || [], tags: tags || [],
      created_by: req.user!.id
    });
    res.status(201).json({ success: true, data: script });
  } catch {
    res.status(500).json({ success: false, message: 'Error al crear script' });
  }
};

export const updateScript = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, category_id, description, base_content, variables, tags } = req.body;
    const script = await scriptService.update(req.params.id, {
      title: title.trim(), description: (description || '').trim(),
      base_content: base_content.trim(), category_id: category_id || null,
      variables: variables || [], tags: tags || []
    }, req.user!.id);
    res.json({ success: true, data: script });
  } catch (err) {
    if (err instanceof ScriptNotFoundError) { res.status(404).json({ success: false, message: err.message }); return; }
    res.status(500).json({ success: false, message: 'Error al actualizar script' });
  }
};

export const deleteScript = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await scriptService.remove(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Script eliminado correctamente' });
  } catch (err) {
    if (err instanceof ScriptNotFoundError) { res.status(404).json({ success: false, message: err.message }); return; }
    res.status(500).json({ success: false, message: 'Error al eliminar script' });
  }
};

export const generateScript = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const script  = await scriptService.getById(req.params.id, req.user!.id);
    const content = scriptService.generate(script, req.body.variables_values || {}, req.user!.id);
    res.json({ success: true, data: { ...script, generated_content: content, variables_used: req.body.variables_values } });
  } catch (err) {
    if (err instanceof ScriptNotFoundError) { res.status(404).json({ success: false, message: err.message }); return; }
    res.status(500).json({ success: false, message: 'Error al generar script' });
  }
};

export const saveCustomization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { custom_content, variables_values, name } = req.body;
    if (!custom_content?.trim()) {
      res.status(400).json({ success: false, message: 'custom_content es requerido' });
      return;
    }
    if (custom_content.length > 50000) {
      res.status(400).json({ success: false, message: 'custom_content excede el límite de 50.000 caracteres' });
      return;
    }
    const result = await scriptService.saveCustomization(
      id, req.user!.id, custom_content.trim(), variables_values || {}, name
    );
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof ScriptNotFoundError) { res.status(404).json({ success: false, message: err.message }); return; }
    res.status(500).json({ success: false, message: 'Error al guardar personalización' });
  }
};

export const getCategories = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await scriptService.listCategories();
    res.json({ success: true, data: categories });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, color } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, message: 'Nombre es requerido' }); return; }
    const category = await scriptService.createCategory({
      name: name.trim(), description: (description || '').trim(), color: color || '#3B82F6'
    });
    res.status(201).json({ success: true, data: category });
  } catch {
    res.status(500).json({ success: false, message: 'Error al crear categoría' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await scriptService.removeCategory(req.params.id);
    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (err) {
    if (err instanceof CategoryHasScriptsError) { res.status(400).json({ success: false, message: err.message }); return; }
    res.status(500).json({ success: false, message: 'Error al eliminar categoría' });
  }
};

export const getMetrics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const metrics = await scriptService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener métricas' });
  }
};
