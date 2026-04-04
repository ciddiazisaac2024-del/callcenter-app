import { Request, Response } from 'express';
import { body }    from 'express-validator';
import { authService, InvalidCredentialsError, EmailAlreadyExistsError } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

// Validaciones — se exportan para usarse en las rutas
export const loginValidation = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Password es requerido')
];

export const registerValidation = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe tener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('Debe tener al menos un número'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre entre 2 y 100 caracteres')
];

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;
    const result = await authService.register(email, password, name, role);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
      res.status(400).json({ success: false, message: err.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ success: false, message: err.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al iniciar sesión' });
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener perfil' });
  }
};
