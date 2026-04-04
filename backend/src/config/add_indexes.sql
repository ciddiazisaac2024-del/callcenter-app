-- ============================================================
-- Ejecuta esto si ya tienes las tablas creadas
-- Solo agrega los índices de rendimiento
-- En psql: \i add_indexes.sql
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_scripts_is_active
  ON scripts(is_active);

CREATE INDEX IF NOT EXISTS idx_scripts_category_id
  ON scripts(category_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scripts_created_at
  ON scripts(created_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scripts_created_by
  ON scripts(created_by) WHERE is_active = true;

-- Full-text search en español
CREATE INDEX IF NOT EXISTS idx_scripts_fts
  ON scripts
  USING GIN(to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(description,'')))
  WHERE is_active = true;

-- Búsqueda por tag
CREATE INDEX IF NOT EXISTS idx_scripts_tags
  ON scripts USING GIN(tags) WHERE is_active = true;

-- Logs de métricas
CREATE INDEX IF NOT EXISTS idx_logs_action_created
  ON user_activity_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_user_id
  ON user_activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_resource
  ON user_activity_logs(resource_id, action)
  WHERE resource_id IS NOT NULL;

-- Login por email
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email) WHERE is_active = true;

-- Personalizaciones
CREATE INDEX IF NOT EXISTS idx_customizations_user_script
  ON script_customizations(user_id, script_id);

SELECT
  indexname,
  tablename,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
