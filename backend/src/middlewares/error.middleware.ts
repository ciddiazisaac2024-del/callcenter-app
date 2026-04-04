import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = process.env.NODE_ENV === 'development';

  // Log estructurado: incluye el error completo (con stack) y contexto del request
  logger.error(
    {
      err,
      req: { method: req.method, url: req.url },
    },
    'Error interno no controlado'
  );

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(isDev && { detail: err.message }),
  });
};
