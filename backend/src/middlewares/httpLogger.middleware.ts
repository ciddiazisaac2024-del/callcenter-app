// ─────────────────────────────────────────────────────────────────────────────
// Middleware HTTP — pino-http
//
// Loggea automáticamente cada request/response con:
//   { method, url, statusCode, responseTime, ip, userAgent }
//
// Ejemplo de log en producción (JSON):
//   { "level":30, "msg":"request completed", "req":{"method":"GET","url":"/api/scripts"},
//     "res":{"statusCode":200}, "responseTime":12 }
// ─────────────────────────────────────────────────────────────────────────────

import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

export const httpLoggerMiddleware = pinoHttp({
  logger,

  // No loggear el health check — generaría demasiado ruido en producción
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },

  // Nivel por código de respuesta
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400)        return 'warn';
    return 'info';
  },

  // Mensaje legible en lugar del genérico "request completed"
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,

  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode} | ${err.message}`,

  // Campos adicionales en cada log de request
  customAttributeKeys: {
    req:          'request',
    res:          'response',
    err:          'error',
    responseTime: 'ms',
  },

  // Serializar solo los campos útiles
  serializers: {
    req: (req) => ({
      method:    req.method,
      url:       req.url,
      ip:        req.headers?.['x-forwarded-for'] ?? req.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
