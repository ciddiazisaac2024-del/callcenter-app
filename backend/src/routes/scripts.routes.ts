import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate }                from '../middlewares/validate.middleware';
import { validateUUID }            from '../middlewares/validate.middleware';
import {
  getAllScripts, getScriptById, createScript, updateScript, deleteScript,
  generateScript, saveCustomization,
  getCategories, createCategory, deleteCategory,
  getMetrics, scriptValidation
} from '../controllers/scripts.controller';

const router   = Router();
const canManage = authorize('admin', 'supervisor');

router.use(authenticate);

// Métricas — solo supervisores y admins
router.get('/metrics',        canManage, getMetrics);

// Categorías — antes de /:id para no confundirse
router.get('/categories',        getCategories);
router.post('/categories',       canManage, createCategory);
router.delete('/categories/:id', canManage, validateUUID, deleteCategory);

// Scripts — lectura (todos los roles)
router.get('/',               getAllScripts);
router.get('/:id',            validateUUID, getScriptById);
router.post('/:id/generate',  validateUUID, generateScript);
router.post('/:id/customize', validateUUID, saveCustomization);

// Scripts — escritura (solo admin y supervisor)
router.post('/',      canManage, validate(scriptValidation), createScript);
router.put('/:id',    canManage, validateUUID, validate(scriptValidation), updateScript);
router.delete('/:id', canManage, validateUUID, deleteScript);

export default router;
