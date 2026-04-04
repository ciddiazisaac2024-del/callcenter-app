import { scriptRepository } from '../repositories/script.repository';
import {
  Script, Category, Metrics,
  CreateScriptDto, UpdateScriptDto, CreateCategoryDto,
  ScriptFilters, PaginationParams, PaginatedResult
} from '../types';

export class ScriptNotFoundError extends Error {
  constructor(id: string) { super(`Script "${id}" no encontrado`); this.name = 'ScriptNotFoundError'; }
}
export class CategoryHasScriptsError extends Error {
  constructor(count: number) { super(`No se puede eliminar: tiene ${count} script(s) asociados`); this.name = 'CategoryHasScriptsError'; }
}

export class ScriptService {
  async list(filters: ScriptFilters, pagination: PaginationParams): Promise<PaginatedResult<Script>> {
    return scriptRepository.findAll(filters, pagination);
  }

  async getById(id: string, userId: string): Promise<Script> {
    const script = await scriptRepository.findById(id);
    if (!script) throw new ScriptNotFoundError(id);
    scriptRepository.logActivity(userId, 'VIEW_SCRIPT', 'script', id);
    return script;
  }

  async create(dto: CreateScriptDto): Promise<Script> {
    const script = await scriptRepository.create(dto);
    scriptRepository.logActivity(dto.created_by, 'CREATE_SCRIPT', 'script', script.id);
    return script;
  }

  async update(id: string, dto: UpdateScriptDto, userId: string): Promise<Script> {
    // UPDATE devuelve null si no existe — una sola query, sin race condition
    const script = await scriptRepository.update(id, dto);
    if (!script) throw new ScriptNotFoundError(id);
    scriptRepository.logActivity(userId, 'UPDATE_SCRIPT', 'script', id);
    return script;
  }

  async remove(id: string, userId: string): Promise<void> {
    // softDelete devuelve false si no encontró el registro
    const deleted = await scriptRepository.softDelete(id);
    if (!deleted) throw new ScriptNotFoundError(id);
    scriptRepository.logActivity(userId, 'DELETE_SCRIPT', 'script', id);
  }

  generate(script: Script, variablesValues: Record<string, string>, userId: string): string {
    let content = script.base_content;
    Object.entries(variablesValues).forEach(([key, value]) => {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!safeKey) return;
      content = content.replace(new RegExp(`\\{\\{${safeKey}\\}\\}`, 'g'), String(value).substring(0, 500));
    });
    scriptRepository.logActivity(userId, 'GENERATE_SCRIPT', 'script', script.id, { variablesValues });
    return content;
  }

  async listCategories(): Promise<Category[]> { return scriptRepository.findAllCategories(); }

  async createCategory(dto: CreateCategoryDto): Promise<Category> { return scriptRepository.createCategory(dto); }

  async removeCategory(id: string): Promise<void> {
    const count = await scriptRepository.countScriptsByCategory(id);
    if (count > 0) throw new CategoryHasScriptsError(count);
    await scriptRepository.deleteCategory(id);
  }

  async saveCustomization(
    scriptId: string, userId: string,
    customContent: string, variablesValues: Record<string, string>, name: string
  ) {
    if (!await scriptRepository.exists(scriptId)) throw new ScriptNotFoundError(scriptId);
    return scriptRepository.saveCustomization(scriptId, userId, customContent, variablesValues, name);
  }

  async getMetrics(): Promise<Metrics> { return scriptRepository.getMetrics(); }
}

export const scriptService = new ScriptService();
