export interface User {
  id: string; email: string; name: string;
  role: 'admin' | 'supervisor' | 'agent';
  is_active: boolean; created_at: Date;
}

export interface Script {
  id: string; title: string; description: string;
  base_content: string; variables: Variable[]; tags: string[];
  category_id: string | null; category_name: string; category_color: string;
  created_by: string; is_active: boolean; created_at: Date; updated_at: Date;
}

export interface Variable {
  key: string; label: string; type: 'text' | 'select' | 'number';
  options?: string[]; placeholder?: string; required?: boolean;
}

export interface Category {
  id: string; name: string; description: string; color: string; created_at: Date;
}

export interface PaginationParams { page: number; limit: number; }

export interface ScriptFilters { category?: string; search?: string; tag?: string; }

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number; };
}

export interface CreateScriptDto {
  title: string; description: string; base_content: string;
  category_id: string | null; variables: Variable[]; tags: string[]; created_by: string;
}

export interface UpdateScriptDto {
  title: string; description: string; base_content: string;
  category_id: string | null; variables: Variable[]; tags: string[];
}

export interface CreateCategoryDto { name: string; description: string; color: string; }

export interface Metrics {
  top_scripts:     { id: string; title: string; uses: number }[];
  activity_by_day: { day: string; total: number }[];
  action_counts:   { action: string; total: number }[];
  weekly_growth:   { this_week: number; last_week: number };
  category_usage:  { name: string; color: string; uses: number }[];
}
