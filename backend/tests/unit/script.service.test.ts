import { ScriptService, ScriptNotFoundError, CategoryHasScriptsError } from '../../src/services/script.service';
import { scriptRepository } from '../../src/repositories/script.repository';
import { Script, Category } from '../../src/types';

jest.mock('../../src/repositories/script.repository');
jest.mock('../../src/config/database');

const mockRepo = scriptRepository as jest.Mocked<typeof scriptRepository>;

const fakeScript: Script = {
  id:             'script-uuid-1',
  title:          'Script de prueba',
  description:    'Descripción de prueba',
  base_content:   'Hola {{cliente}}, le llamo por {{motivo}}.',
  variables:      [
    { key: 'cliente', label: 'Cliente', type: 'text' },
    { key: 'motivo',  label: 'Motivo',  type: 'text' }
  ],
  tags:           ['test', 'prueba'],
  category_id:    'cat-uuid-1',
  category_name:  'Ventas',
  category_color: '#3B82F6',
  created_by:     'user-uuid-1',
  is_active:      true,
  created_at:     new Date(),
  updated_at:     new Date()
};

const fakeCategory: Category = {
  id:          'cat-uuid-1',
  name:        'Ventas',
  description: 'Scripts de ventas',
  color:       '#3B82F6',
  created_at:  new Date()
};

describe('ScriptService — list()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); });

  it('delega al repository con filtros y paginación', async () => {
    const expected = { data: [fakeScript], meta: { total: 1, page: 1, limit: 20, pages: 1 } };
    mockRepo.findAll.mockResolvedValue(expected);

    const result = await service.list({ search: 'prueba' }, { page: 1, limit: 20 });

    expect(mockRepo.findAll).toHaveBeenCalledWith({ search: 'prueba' }, { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

describe('ScriptService — getById()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); });

  it('retorna el script y registra VIEW_SCRIPT', async () => {
    mockRepo.findById.mockResolvedValue(fakeScript);
    mockRepo.logActivity.mockReturnValue(undefined);

    const result = await service.getById('script-uuid-1', 'user-uuid-1');

    expect(result).toEqual(fakeScript);
    expect(mockRepo.logActivity).toHaveBeenCalledWith('user-uuid-1', 'VIEW_SCRIPT', 'script', 'script-uuid-1');
  });

  it('lanza ScriptNotFoundError si no existe', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.getById('no-existe', 'user-1')).rejects.toThrow(ScriptNotFoundError);
  });
});

describe('ScriptService — create()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); });

  it('crea el script y registra CREATE_SCRIPT', async () => {
    mockRepo.create.mockResolvedValue(fakeScript);
    mockRepo.logActivity.mockReturnValue(undefined);

    const dto = {
      title: 'Nuevo', description: '', base_content: 'Hola',
      category_id: null, variables: [], tags: [], created_by: 'user-1'
    };
    const result = await service.create(dto);

    expect(result).toEqual(fakeScript);
    expect(mockRepo.logActivity).toHaveBeenCalledWith('user-1', 'CREATE_SCRIPT', 'script', fakeScript.id);
  });
});

describe('ScriptService — update()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); });

  it('actualiza script existente y registra UPDATE_SCRIPT', async () => {
    mockRepo.exists.mockResolvedValue(true);
    mockRepo.update.mockResolvedValue({ ...fakeScript, title: 'Actualizado' });
    mockRepo.logActivity.mockReturnValue(undefined);

    const dto = { title: 'Actualizado', description: '', base_content: 'x', category_id: null, variables: [], tags: [] };
    const result = await service.update('script-uuid-1', dto, 'user-1');

    expect(result.title).toBe('Actualizado');
    expect(mockRepo.logActivity).toHaveBeenCalledWith('user-1', 'UPDATE_SCRIPT', 'script', 'script-uuid-1');
  });

  it('lanza ScriptNotFoundError si no existe', async () => {
    mockRepo.exists.mockResolvedValue(false);
    const dto = { title: 'X', description: '', base_content: 'x', category_id: null, variables: [], tags: [] };
    await expect(service.update('no-existe', dto, 'user-1')).rejects.toThrow(ScriptNotFoundError);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});

describe('ScriptService — remove()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); });

  it('hace soft delete y registra DELETE_SCRIPT', async () => {
    mockRepo.exists.mockResolvedValue(true);
    mockRepo.softDelete.mockResolvedValue(undefined);
    mockRepo.logActivity.mockReturnValue(undefined);

    await service.remove('script-uuid-1', 'user-1');

    expect(mockRepo.softDelete).toHaveBeenCalledWith('script-uuid-1');
    expect(mockRepo.logActivity).toHaveBeenCalledWith('user-1', 'DELETE_SCRIPT', 'script', 'script-uuid-1');
  });

  it('lanza ScriptNotFoundError si no existe', async () => {
    mockRepo.exists.mockResolvedValue(false);
    await expect(service.remove('no-existe', 'user-1')).rejects.toThrow(ScriptNotFoundError);
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });
});

describe('ScriptService — generate()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); mockRepo.logActivity.mockReturnValue(undefined); });

  it('reemplaza variables correctamente', () => {
    const result = service.generate(fakeScript, { cliente: 'Sr. García', motivo: 'cobranza' }, 'user-1');
    expect(result).toBe('Hola Sr. García, le llamo por cobranza.');
  });

  it('deja variables sin reemplazar si no se proveen valores', () => {
    const result = service.generate(fakeScript, {}, 'user-1');
    expect(result).toBe('Hola {{cliente}}, le llamo por {{motivo}}.');
  });

  it('ignora claves con caracteres especiales (previene regex injection)', () => {
    const result = service.generate(fakeScript, { 'cliente))((?': 'hack' }, 'user-1');
    // La clave inválida no produce output
    expect(result).toContain('{{cliente}}');
  });

  it('trunca valores mayores a 500 caracteres', () => {
    const largeValue = 'x'.repeat(600);
    const result = service.generate(fakeScript, { cliente: largeValue }, 'user-1');
    expect(result).toContain('x'.repeat(500));
    expect(result).not.toContain('x'.repeat(501));
  });

  it('registra GENERATE_SCRIPT', () => {
    service.generate(fakeScript, { cliente: 'X', motivo: 'Y' }, 'user-1');
    expect(mockRepo.logActivity).toHaveBeenCalledWith('user-1', 'GENERATE_SCRIPT', 'script', fakeScript.id, expect.any(Object));
  });
});

describe('ScriptService — removeCategory()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); });

  it('elimina categoría vacía', async () => {
    mockRepo.countScriptsByCategory.mockResolvedValue(0);
    mockRepo.deleteCategory.mockResolvedValue(undefined);

    await service.removeCategory('cat-uuid-1');
    expect(mockRepo.deleteCategory).toHaveBeenCalledWith('cat-uuid-1');
  });

  it('lanza CategoryHasScriptsError si tiene scripts asociados', async () => {
    mockRepo.countScriptsByCategory.mockResolvedValue(3);

    await expect(service.removeCategory('cat-uuid-1')).rejects.toThrow(CategoryHasScriptsError);
    expect(mockRepo.deleteCategory).not.toHaveBeenCalled();
  });

  it('el mensaje de error incluye la cantidad de scripts', async () => {
    mockRepo.countScriptsByCategory.mockResolvedValue(5);

    await expect(service.removeCategory('cat-uuid-1')).rejects.toThrow('5 script(s)');
  });
});

describe('ScriptService — listCategories()', () => {
  let service: ScriptService;
  beforeEach(() => { service = new ScriptService(); jest.clearAllMocks(); });

  it('retorna categorías del repository', async () => {
    mockRepo.findAllCategories.mockResolvedValue([fakeCategory]);
    const result = await service.listCategories();
    expect(result).toEqual([fakeCategory]);
  });
});
