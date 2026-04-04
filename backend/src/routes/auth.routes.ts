import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, loginValidation, registerValidation } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

// Rate limit: máx 10 intentos por IP cada 15 minutos en login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit: máx 5 registros por IP por hora
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Límite de registros alcanzado. Intenta más tarde.' }
});

router.post('/login',    loginLimiter,    validate(loginValidation),    login);
router.post('/register', registerLimiter, validate(registerValidation), register);
router.get('/me',        authenticate, me);

export default router;
