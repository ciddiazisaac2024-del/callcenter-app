-- ============================================================
-- CallScript AI — Esquema completo + índices de escalabilidad
-- Ejecutar en orden en psql
-- ============================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tablas ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'supervisor', 'agent')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS script_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(7) DEFAULT '#3B82F6',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scripts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  category_id  UUID REFERENCES script_categories(id) ON DELETE SET NULL,
  description  TEXT,
  base_content TEXT NOT NULL,
  variables    JSONB DEFAULT '[]',
  tags         VARCHAR(50)[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS script_customizations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id        UUID REFERENCES scripts(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  custom_content   TEXT NOT NULL,
  variables_values JSONB DEFAULT '{}',
  name             VARCHAR(255),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  action        VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   UUID,
  metadata      JSONB DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── Índices de escalabilidad ─────────────────────────────────
-- Evitan full table scans en las queries más frecuentes

-- Scripts: filtros más comunes
CREATE INDEX IF NOT EXISTS idx_scripts_is_active
  ON scripts(is_active);

CREATE INDEX IF NOT EXISTS idx_scripts_category_id
  ON scripts(category_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scripts_created_at
  ON scripts(created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scripts_created_by
  ON scripts(created_by)
  WHERE is_active = true;

-- Búsqueda full-text (título + descripción) — reemplaza ILIKE
CREATE INDEX IF NOT EXISTS idx_scripts_fts
  ON scripts
  USING GIN(to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, '')))
  WHERE is_active = true;

-- Tags array — acelera búsqueda por tag
CREATE INDEX IF NOT EXISTS idx_scripts_tags
  ON scripts USING GIN(tags)
  WHERE is_active = true;

-- Logs: las métricas filtran siempre por action + created_at
CREATE INDEX IF NOT EXISTS idx_logs_action_created
  ON user_activity_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_user_id
  ON user_activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_resource
  ON user_activity_logs(resource_id, action)
  WHERE resource_id IS NOT NULL;

-- Users: login siempre busca por email
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email)
  WHERE is_active = true;

-- Customizations: el agente consulta sus personalizaciones
CREATE INDEX IF NOT EXISTS idx_customizations_user_script
  ON script_customizations(user_id, script_id);

-- ── Categorías por defecto ───────────────────────────────────
INSERT INTO script_categories (name, description, color) VALUES
  ('Bienvenida',      'Scripts de apertura de llamada',        '#10B981'),
  ('Ventas',          'Scripts para proceso de ventas',         '#3B82F6'),
  ('Soporte Técnico', 'Scripts para resolución de problemas',  '#F59E0B'),
  ('Retención',       'Scripts para retener clientes',          '#EF4444'),
  ('Cierre',          'Scripts para finalizar llamadas',        '#8B5CF6')
ON CONFLICT DO NOTHING;
