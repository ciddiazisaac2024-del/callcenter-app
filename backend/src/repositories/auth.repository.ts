import { query } from '../config/database';
import { User } from '../types';

export class AuthRepository {

  async findByEmail(email: string): Promise<User & { password_hash: string } | null> {
    const result = await query(
      'SELECT * FROM users WHERE email=$1 AND is_active=true', [email]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await query(
      'SELECT id, email, name, role, created_at FROM users WHERE id=$1', [id]
    );
    return result.rows[0] ?? null;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await query('SELECT 1 FROM users WHERE email=$1', [email]);
    return result.rows.length > 0;
  }

  async create(
    email: string, passwordHash: string, name: string, role: string
  ): Promise<User> {
    const result = await query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role',
      [email, passwordHash, name, role]
    );
    return result.rows[0];
  }

  async logActivity(userId: string, action: string): Promise<void> {
    query(
      'INSERT INTO user_activity_logs (user_id, action, resource_type) VALUES ($1,$2,$3)',
      [userId, action, 'auth']
    ).catch(() => {});
  }
}

export const authRepository = new AuthRepository();
