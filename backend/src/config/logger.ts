// ─────────────────────────────────────────────────────────────────────────────
// Logger central — Pino
//
// Por qué Pino sobre Winston:
//   · 5x más rápido (benchmarks oficiales)
//   · Emite JSON estructurado por defecto → compatible con Datadog, Grafana Loki,
//     CloudWatch, Elastic, y cualquier agregador moderno sin configuración extra
//   · Serialización asíncrona — no bloquea el event loop
//   · pino-pretty solo en desarrollo, JSON puro en producción
//
// Campos fijos en cada línea de log:
//   { level, time, pid, hostname, env, msg, ...contexto }
//
// Uso:
//   import { logger } from './logger';
//   logger.info({ userId: '123' }, 'Usuario logueado');
//   logger.error({ err, requestId }, 'Error en handler');
// ─────────────────────────────────────────────────────────────────────────────

import pino from 'pino';

const isDev  = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

// En tests silenciamos el logger completamente para no ensuciar la salida de Jest
const transport = isTest
  ? undefined
  : isDev
    ? {
        target:  'pino-pretty',
        options: {
          colorize:        true,
          translateTime:   'SYS:HH:MM:ss',
          ignore:          'pid,hostname',
          messageFormat:   '{msg}',
          singleLine:      false,
        }
      }
    : undefined; // producción → JSON puro a stdout, sin transformar

export const logger = pino({
  // Nivel mínimo configurable por entorno
  level: isTest
    ? 'silent'
    : (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')),

  // Campos base presentes en cada línea
  base: {
    env:     process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '9.0.0',
  },

  // Formatear el timestamp como ISO 8601
  timestamp: pino.stdTimeFunctions.isoTime,

  // Serializers: transforman objetos complejos antes de loggear
  serializers: {
    // Serializer seguro para errores: incluye mensaje, tipo y stack
    err: pino.stdSerializers.err,

    // Serializer para requests HTTP (usado por pino-http)
    req: (req) => ({
      method: req.method,
      url:    req.url,
      ip:     req.headers?.['x-forwarded-for'] ?? req.remoteAddress,
    }),

    // Serializer para responses HTTP
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },

  // Redactar campos sensibles para que nunca aparezcan en logs
  redact: {
    paths: [
      'password',
      'password_hash',
      'token',
      'authorization',
      'req.headers.authorization',
      'req.body.password',
      '*.password_hash',
    ],
    censor: '[REDACTED]',
  },

  transport,
});

// ── Child loggers por módulo ──────────────────────────────────────────────────
// Añaden un campo fijo `module` para filtrar logs por componente:
//   { "module": "auth", "msg": "Login exitoso" }

export const authLogger     = logger.child({ module: 'auth'       });
export const scriptsLogger  = logger.child({ module: 'scripts'    });
export const dbLogger       = logger.child({ module: 'database'   });
export const cacheLogger    = logger.child({ module: 'cache'      });
export const httpLogger     = logger.child({ module: 'http'       });
export const startupLogger  = logger.child({ module: 'startup'    });
