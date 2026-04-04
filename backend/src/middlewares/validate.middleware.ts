import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

// Ejecuta cadenas de validación y responde con errores si los hay
export const validate = (chains: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const chain of chains) {
      await chain.run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg }))
      });
      return;
    }
    next();
  };
};

// Valida que un parámetro :id sea UUID válido
export const validateUUID = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (id && !uuidRegex.test(id)) {
    res.status(400).json({ success: false, message: 'ID inválido' });
    return;
  }
  next();
};
