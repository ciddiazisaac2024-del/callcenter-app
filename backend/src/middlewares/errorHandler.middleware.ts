import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// ── Tipos de errores conocidos ──────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError  extends AppError { constructor(msg: string)       { super(400, msg); } }
export class NotFoundError     extends AppError { constructor(r = 'Recurso')     { super(404, `${r} no encontrado`); } }
export class UnauthorizedError extends AppError { constructor(msg = 'No autorizado') { super(401, msg); } }
export class ForbiddenError    extends AppError { constructor(msg = 'Sin permisos suficientes') { super(403, msg); } }

// ── Manejo de errores de PostgreSQL ─────────────────────────────────────────
interface PgError extends Error { code?: string; constraint?: string; detail?: string; }

const handlePgError = (error: PgError): AppError => {
  switch (error.code) {
    case '23505': return new AppError(409, 'Ya existe un registro con esos datos');
    case '23503': return new AppError(400, 'Referencia a un recurso que no existe');
    case '22P02': return new AppError(400, 'ID con formato inválido');
    case '23502': return new AppError(400, 'Faltan campos obligatorios');
    default:      return new AppError(500, 'Error en la base de datos');
  }
};

// ── Middleware global de errores ─────────────────────────────────────────────
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = process.env.NODE_ENV === 'development';

  // Errores de PostgreSQL
  const pgError = error as PgError;
  if (pgError.code?.match(/^\d{5}$/)) {
    const appError = handlePgError(pgError);
    // PG errors son operacionales — level warn, no error
    logger.warn(
      { pgCode: pgError.code, constraint: pgError.constraint, req: { method: req.method, url: req.url } },
      `Error de BD: ${appError.message}`
    );
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message,
      ...(isDev && { detail: pgError.detail }),
    });
    return;
  }

  // Errores operacionales conocidos (AppError y sus subclases)
  if (error instanceof AppError) {
    // 4xx → warn, 5xx → error
    const logFn = error.statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    logFn(
      { statusCode: error.statusCode, req: { method: req.method, url: req.url } },
      error.message
    );
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Error completamente inesperado — nivel error con stack completo
  logger.error(
    { err: error, req: { method: req.method, url: req.url } },
    'Error inesperado no controlado'
  );

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(isDev && { debug: { message: error.message, stack: error.stack } }),
  });
};

// ── Wrapper async — elimina try/catch repetitivo en controllers ──────────────
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
