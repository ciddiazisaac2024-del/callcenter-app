import { MemoryCache } from '../../src/config/cache';

// Necesitamos exportar la clase — la importamos directamente
// Si no está exportada como clase, re-instanciamos para tests

describe('MemoryCache', () => {
  let cache: MemoryCache;
  beforeEach(() => { cache = new MemoryCache(); });

  describe('set() y get()', () => {
    it('almacena y recupera un valor', () => {
      cache.set('key1', { data: 42 });
      expect(cache.get('key1')).toEqual({ data: 42 });
    });

    it('retorna null para clave inexistente', () => {
      expect(cache.get('no-existe')).toBeNull();
    });

    it('retorna null después de que el TTL expira', async () => {
      cache.set('expiring', 'value', 0.001); // TTL = 1ms
      await new Promise(r => setTimeout(r, 5));
      expect(cache.get('expiring')).toBeNull();
    });

    it('no expira antes del TTL', async () => {
      cache.set('fresh', 'value', 60);
      await new Promise(r => setTimeout(r, 5));
      expect(cache.get('fresh')).toBe('value');
    });

    it('sobreescribe un valor existente', () => {
      cache.set('key', 'v1');
      cache.set('key', 'v2');
      expect(cache.get('key')).toBe('v2');
    });
  });

  describe('invalidate()', () => {
    it('elimina claves que coinciden con el prefijo', () => {
      cache.set('scripts:list:1', 'a');
      cache.set('scripts:list:2', 'b');
      cache.set('categories:all', 'c');

      cache.invalidate('scripts:list:');

      expect(cache.get('scripts:list:1')).toBeNull();
      expect(cache.get('scripts:list:2')).toBeNull();
      expect(cache.get('categories:all')).toBe('c'); // no afectada
    });

    it('no lanza error si no hay claves con ese prefijo', () => {
      expect(() => cache.invalidate('no-existe:')).not.toThrow();
    });
  });

  describe('flush()', () => {
    it('elimina todas las entradas', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.flush();

      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('cuenta hits y misses correctamente', () => {
      cache.set('k', 'v');
      cache.get('k');     // hit
      cache.get('k');     // hit
      cache.get('miss');  // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('calcula hitRate como porcentaje', () => {
      cache.set('k', 'v');
      cache.get('k');    // hit
      cache.get('miss'); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(50);
    });

    it('hitRate es 0 cuando no hay operaciones', () => {
      expect(cache.getStats().hitRate).toBe(0);
    });

    it('reporta el tamaño correcto', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('prune()', () => {
    it('elimina solo entradas expiradas', async () => {
      cache.set('fresh',    'v', 60);
      cache.set('expired1', 'v', 0.001);
      cache.set('expired2', 'v', 0.001);

      await new Promise(r => setTimeout(r, 5));
      const pruned = cache.prune();

      expect(pruned).toBe(2);
      expect(cache.get('fresh')).toBe('v');
      expect(cache.getStats().size).toBe(1);
    });
  });
});
