import { scriptsLogger } from '../config/logger';
import { query } from '../config/database';
import { cache, TTL, CacheKeys } from '../config/cache';
import {
  Script, Category,
  CreateScriptDto, UpdateScriptDto, CreateCategoryDto,
  ScriptFilters, PaginationParams, PaginatedResult, Metrics
} from '../types';

export class ScriptRepository {

  async findAll(
    filters: ScriptFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Script>> {
    const { page, limit } = pagination;
    const offset           = (page - 1) * limit;

    // Clave de caché única por combinación de filtros + página
    const filterKey  = JSON.stringify(filters);
    const cacheKey   = CacheKeys.scriptsList(filterKey, page);
    const cached     = cache.get<PaginatedResult<Script>>(cacheKey);
    if (cached) return cached;

    // ── Query principal ──
    // Usa full-text search con tsvector si hay término de búsqueda
    // y ILIKE como fallback para compatibilidad
    let sql = `
      SELECT s.id, s.title, s.description, s.tags, s.variables,
             s.created_at, s.updated_at,
             sc.name  AS category_name,
             sc.color AS category_color,
             u.name   AS created_by_name
      FROM scripts s
      LEFT JOIN script_categories sc ON s.category_id = sc.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.is_active = true
    `;
    let countSql = `
      SELECT COUNT(*) FROM scripts s
      LEFT JOIN script_categories sc ON s.category_id = sc.id
      WHERE s.is_active = true
    `;

    const params: unknown[] = [];
    let idx = 1;

    if (filters.category) {
      const c = ` AND sc.name ILIKE $${idx++}`;
      sql += c; countSql += c;
      params.push(`%${filters.category}%`);
    }

    if (filters.search) {
      // Full-text search con tsvector — usa el índice idx_scripts_fts
      const c = ` AND to_tsvector('spanish', coalesce(s.title,'') || ' ' || coalesce(s.description,''))
                  @@ plainto_tsquery('spanish', $${idx++})`;
      sql += c; countSql += c;
      params.push(filters.search);
    }

    if (filters.tag) {
      // Usa el índice GIN idx_scripts_tags
      const c = ` AND $${idx++} = ANY(s.tags)`;
      sql += c; countSql += c;
      params.push(filters.tag);
    }

    sql += ` ORDER BY s.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;

    const [result, countResult] = await Promise.all([
      query(sql, [...params, limit, offset]),
      query(countSql, params)
    ]);

    const total  = parseInt(countResult.rows[0].count);
    const output = {
      data: result.rows,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    };

    cache.set(cacheKey, output, TTL.SCRIPTS_LIST);
    return output;
  }

  async findById(id: string): Promise<Script | null> {
    const cacheKey = CacheKeys.script(id);
    const cached   = cache.get<Script>(cacheKey);
    if (cached) return cached;

    const result = await query(
      `SELECT s.*, sc.name AS category_name, sc.color AS category_color
       FROM scripts s
       LEFT JOIN script_categories sc ON s.category_id = sc.id
       WHERE s.id = $1 AND s.is_active = true`, [id]
    );

    const script = result.rows[0] ?? null;
    if (script) cache.set(cacheKey, script, TTL.SCRIPT_DETAIL);
    return script;
  }

  async create(dto: CreateScriptDto): Promise<Script> {
    const result = await query(
      `INSERT INTO scripts (title, category_id, description, base_content, variables, tags, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [dto.title, dto.category_id, dto.description, dto.base_content,
       JSON.stringify(dto.variables), dto.tags, dto.created_by]
    );
    // Invalidar lista para que aparezca el nuevo script
    cache.invalidate('scripts:list:');
    return result.rows[0];
  }

  async update(id: string, dto: UpdateScriptDto): Promise<Script | null> {
    const result = await query(
      `UPDATE scripts
       SET title=$1, category_id=$2, description=$3, base_content=$4,
           variables=$5, tags=$6, updated_at=NOW()
       WHERE id=$7 AND is_active=true RETURNING *`,
      [dto.title, dto.category_id, dto.description, dto.base_content,
       JSON.stringify(dto.variables), dto.tags, id]
    );
    if (result.rows.length === 0) return null;
    cache.invalidate(`scripts:${id}`);
    cache.invalidate('scripts:list:');
    return result.rows[0];
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE scripts SET is_active=false, updated_at=NOW() WHERE id=$1 AND is_active=true RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return false;
    cache.invalidate(`scripts:${id}`);
    cache.invalidate('scripts:list:');
    return true;
  }

  async exists(id: string): Promise<boolean> {
    // Primero revisar caché antes de ir a la BD
    const cached = cache.get<Script>(CacheKeys.script(id));
    if (cached) return true;
    const result = await query('SELECT 1 FROM scripts WHERE id=$1 AND is_active=true', [id]);
    return result.rows.length > 0;
  }

  // ── Categorías ──────────────────────────────────────────────
  async findAllCategories(): Promise<Category[]> {
    const cacheKey = CacheKeys.categories();
    const cached   = cache.get<Category[]>(cacheKey);
    if (cached) return cached;

    const result = await query('SELECT * FROM script_categories ORDER BY name');
    cache.set(cacheKey, result.rows, TTL.CATEGORIES);
    return result.rows;
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const result = await query(
      'INSERT INTO script_categories (name, description, color) VALUES ($1,$2,$3) RETURNING *',
      [dto.name, dto.description, dto.color]
    );
    cache.invalidate('categories:');
    return result.rows[0];
  }

  async countScriptsByCategory(categoryId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) FROM scripts WHERE category_id=$1 AND is_active=true', [categoryId]
    );
    return parseInt(result.rows[0].count);
  }

  async deleteCategory(id: string): Promise<void> {
    await query('DELETE FROM script_categories WHERE id=$1', [id]);
    cache.invalidate('categories:');
    cache.invalidate('scripts:list:'); // listas que incluyen category_name
  }

  // ── Métricas ────────────────────────────────────────────────
  async getMetrics(): Promise<Metrics> {
    const cacheKey = CacheKeys.metrics();
    const cached   = cache.get<Metrics>(cacheKey);
    if (cached) return cached;

    const [topScripts, activityByDay, actionCounts, weeklyGrowth, categoryUsage] = await Promise.all([
      query(`
        SELECT s.title, s.id, COUNT(*) AS uses
        FROM user_activity_logs l
        JOIN scripts s ON l.resource_id = s.id
        WHERE l.action = 'GENERATE_SCRIPT'
          AND l.created_at > NOW() - INTERVAL '30 days'
        GROUP BY s.id, s.title
        ORDER BY uses DESC LIMIT 5
      `),
      query(`
        SELECT DATE(created_at) AS day, COUNT(*) AS total
        FROM user_activity_logs
        WHERE created_at > NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day
      `),
      query(`
        SELECT action, COUNT(*) AS total
        FROM user_activity_logs
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY action ORDER BY total DESC
      `),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')  AS this_week,
          COUNT(*) FILTER (WHERE created_at BETWEEN NOW() - INTERVAL '14 days'
                                               AND NOW() - INTERVAL '7 days') AS last_week
        FROM user_activity_logs WHERE action = 'GENERATE_SCRIPT'
      `),
      query(`
        SELECT sc.name, sc.color, COUNT(*) AS uses
        FROM user_activity_logs l
        JOIN scripts s  ON l.resource_id = s.id
        JOIN script_categories sc ON s.category_id = sc.id
        WHERE l.action = 'GENERATE_SCRIPT'
          AND l.created_at > NOW() - INTERVAL '30 days'
        GROUP BY sc.name, sc.color
        ORDER BY uses DESC
      `)
    ]);

    const metrics: Metrics = {
      top_scripts:     topScripts.rows,
      activity_by_day: activityByDay.rows,
      action_counts:   actionCounts.rows,
      weekly_growth:   weeklyGrowth.rows[0],
      category_usage:  categoryUsage.rows
    };

    cache.set(cacheKey, metrics, TTL.METRICS);
    return metrics;
  }

  // ── Personalizaciones ───────────────────────────────────────
  async saveCustomization(
    scriptId: string, userId: string,
    customContent: string, variablesValues: Record<string, string>, name: string
  ) {
    const result = await query(
      `INSERT INTO script_customizations (script_id, user_id, custom_content, variables_values, name)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [scriptId, userId, customContent, JSON.stringify(variablesValues || {}), name ?? null]
    );
    return result.rows[0];
  }

  // ── Auditoría — fire-and-forget ─────────────────────────────
  logActivity(
    userId: string, action: string,
    resourceType: string, resourceId?: string,
    metadata?: Record<string, unknown>
  ): void {
    query(
      `INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, action, resourceType, resourceId ?? null,
       metadata ? JSON.stringify(metadata) : null]
    ).catch((err: Error) => { scriptsLogger.warn({ err }, 'audit log failed'); });
  }
}

export const scriptRepository = new ScriptRepository();
