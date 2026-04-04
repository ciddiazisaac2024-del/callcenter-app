import bcrypt    from 'bcryptjs';
import jwt       from 'jsonwebtoken';
import { authRepository } from '../repositories/auth.repository';
import { User } from '../types';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('El email ya está registrado');
    this.name = 'EmailAlreadyExistsError';
  }
}

export interface AuthResult {
  user:  Omit<User, 'is_active'>;
  token: string;
}

export class AuthService {

  private signToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }

  async register(
    email: string, password: string, name: string, role = 'agent'
  ): Promise<AuthResult> {
    const alreadyExists = await authRepository.emailExists(email);
    if (alreadyExists) throw new EmailAlreadyExistsError();

    const validRoles  = ['admin', 'agent', 'supervisor'];
    const safeRole    = validRoles.includes(role) ? role : 'agent';
    const passwordHash = await bcrypt.hash(password, 12);

    const user  = await authRepository.create(email, passwordHash, name.trim(), safeRole);
    const token = this.signToken(user);

    return { user, token };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await authRepository.findByEmail(email);

    // Mismo mensaje para no revelar si el email existe
    if (!user) throw new InvalidCredentialsError();

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new InvalidCredentialsError();

    authRepository.logActivity(user.id, 'LOGIN');

    const token = this.signToken(user);
    const { password_hash: _, ...safeUser } = user;

    return { user: safeUser, token };
  }

  async getProfile(userId: string): Promise<User> {
    const user = await authRepository.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');
    return user;
  }
}

export const authService = new AuthService();
