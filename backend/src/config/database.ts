import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { dbLogger } from './logger';
dotenv.config();

const poolConfig: PoolConfig = {
  connectionString:        process.env.DATABASE_URL,
  ssl:                     process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max:                     20,
  min:                     2,
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle:         false,
};

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  dbLogger.debug('Nueva conexión al pool de PostgreSQL');
});

pool.on('error', (err) => {
  dbLogger.error({ err }, 'Error inesperado en cliente del pool');
  // No matar el proceso — el pool se recupera solo
});

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    dbLogger.error({ err }, 'Health check de BD fallido');
    return false;
  }
};

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
export const getPool = () => pool;
export default pool;
