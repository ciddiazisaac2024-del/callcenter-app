import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// ── Utilidad para obtener IP real detrás de proxies ──
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

// ── Rate limit para login: 5 intentos cada 15 minutos ──
export const loginRateLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,   // 15 minutos
  max:              5,                  // máximo 5 intentos
  standardHeaders:  true,
  legacyHeaders:    false,
  keyGenerator:     (req: Request) => {
    // Limita por IP + email juntos para más precisión
    const email = req.body?.email || 'unknown';
    return `${getClientIp(req)}_${email}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  },
  skip: (req: Request) => {
    // Saltar en tests
    return process.env.NODE_ENV === 'test';
  }
});

// ── Rate limit para registro: 3 registros por hora por IP ──
export const registerRateLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,   // 1 hora
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req: Request) => getClientIp(req),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Demasiados registros desde esta IP. Intenta en 1 hora.',
      retryAfter: '1 hora'
    });
  },
  skip: () => process.env.NODE_ENV === 'test'
});

// ── Rate limit general para la API: 100 requests por minuto ──
export const apiRateLimiter = rateLimit({
  windowMs:        60 * 1000,         // 1 minuto
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req: Request) => getClientIp(req),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Reduce la frecuencia.',
      retryAfter: '1 minuto'
    });
  },
  skip: () => process.env.NODE_ENV === 'test'
});
