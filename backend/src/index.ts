import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import dotenv  from 'dotenv';

dotenv.config();

// ── Importar logger PRIMERO — antes que cualquier otro módulo ──
// Así los logs de startup ya salen en formato correcto
import { startupLogger, logger } from './config/logger';

import authRoutes    from './routes/auth.routes';
import scriptsRoutes from './routes/scripts.routes';
import { setupSwagger }          from './config/swagger';
import { errorHandler }          from './middlewares/error.middleware';
import { httpLoggerMiddleware }  from './middlewares/httpLogger.middleware';
import { checkDatabaseHealth }  from './config/database';
import { cache }                from './config/cache';
import { authenticate, authorize } from './middlewares/auth.middleware';

// ── Validación de variables de entorno obligatorias ──────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnv   = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  startupLogger.fatal({ missingEnv }, 'Variables de entorno obligatorias faltantes');
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares de seguridad ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',').map(o => o.trim()).filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── HTTP Logger — registra cada request/response automáticamente ─────────────
// Posicionado ANTES de las rutas para capturar todo el tráfico
app.use(httpLoggerMiddleware);

// ── Documentación ─────────────────────────────────────────────────────────────
setupSwagger(app);

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/scripts', scriptsRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const dbOk       = await checkDatabaseHealth();
  const cacheStats = cache.getStats();

  res.status(dbOk ? 200 : 503).json({
    status:    dbOk ? 'ok' : 'degraded',
    version:   '9.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'error',
      cache: {
        size:    cacheStats.size,
        hitRate: `${cacheStats.hitRate}%`,
        hits:    cacheStats.hits,
        misses:  cacheStats.misses,
      }
    }
  });
});

// ── Admin: flush de caché — protegido por JWT + rol admin ────────────────────
app.post('/api/admin/cache/flush', authenticate, authorize('admin'), (_req, res) => {
  cache.flush();
  logger.info('Caché vaciada por admin');
  res.json({ success: true, message: 'Caché vaciada' });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn({ method: req.method, url: req.url }, 'Ruta no encontrada');
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ── Error handler global ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Arrancar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  startupLogger.info(
    {
      port:    PORT,
      env:     process.env.NODE_ENV || 'development',
      swagger: `http://localhost:${PORT}/api/docs`,
      health:  `http://localhost:${PORT}/api/health`,
    },
    `🚀 Servidor CallScript AI arriba`
  );
});

// ── Manejo de señales de cierre limpio ───────────────────────────────────────
const shutdown = (signal: string) => {
  startupLogger.info({ signal }, 'Señal de cierre recibida — apagando servidor');
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;
