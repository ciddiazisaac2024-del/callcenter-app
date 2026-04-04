-- Tabla para blacklist de tokens revocados
CREATE TABLE IF NOT EXISTS token_blacklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_jti   VARCHAR(255) UNIQUE NOT NULL,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  revoked_at  TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP NOT NULL
);

-- Index para búsqueda rápida por jti
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);

-- Index para limpiar tokens expirados
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Tabla para rastrear intentos de login fallidos (rate limit en BD)
CREATE TABLE IF NOT EXISTS login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) NOT NULL,
  ip_address   INET,
  success      BOOLEAN DEFAULT false,
  attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time  ON login_attempts(attempted_at);
