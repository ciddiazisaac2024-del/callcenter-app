import request from 'supertest';
import app from '../../src/index';

// ── Helpers ──
const unique = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@callcenter.cl`;

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body?.data?.token || '';
}

async function registerAndLogin(role = 'agent'): Promise<string> {
  const email = unique();
  const password = 'Pass123!';
  // Registrar como agente primero
  await request(app).post('/api/auth/register').send({ email, password, name: 'Test', role });
  return loginAs(email, password);
}

// ── Tokens ──
let agentToken      = '';
let supervisorToken = '';

beforeAll(async () => {
  agentToken      = await loginAs('agente1@callcenter.cl',    'Agent123!');
  supervisorToken = await loginAs('supervisor@callcenter.cl', 'Agent123!');
});

// ─────────────────────────────────────────────
describe('GET /api/scripts', () => {
// ─────────────────────────────────────────────

  it('requiere autenticación → 401', async () => {
    const res = await request(app).get('/api/scripts');
    expect(res.status).toBe(401);
  });

  it('retorna lista paginada con token válido → 200', async () => {
    const res = await request(app).get('/api/scripts').set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
  });

  it('filtra por búsqueda → solo resultados relevantes', async () => {
    const res = await request(app)
      .get('/api/scripts?search=incumplimiento')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    // Si hay resultados, deben contener el término
    if (res.body.data.length > 0) {
      const titles = res.body.data.map((s: { title: string }) => s.title.toLowerCase());
      const found = titles.some((t: string) => t.includes('incumplimiento'));
      expect(found).toBe(true);
    }
  });

  it('paginación funciona correctamente', async () => {
    const res = await request(app)
      .get('/api/scripts?page=1&limit=2')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.meta.page).toBe(1);
  });

  it('limit máximo es 50', async () => {
    const res = await request(app)
      .get('/api/scripts?limit=999')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBeLessThanOrEqual(50);
  });
});

// ─────────────────────────────────────────────
describe('GET /api/scripts/categories', () => {
// ─────────────────────────────────────────────

  it('retorna categorías con token → 200', async () => {
    const res = await request(app)
      .get('/api/scripts/categories')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('cada categoría tiene id, name y color', async () => {
    const res = await request(app)
      .get('/api/scripts/categories')
      .set('Authorization', `Bearer ${agentToken}`);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('color');
    }
  });
});

// ─────────────────────────────────────────────
describe('GET /api/scripts/:id', () => {
// ─────────────────────────────────────────────

  let scriptId = '';

  beforeAll(async () => {
    const res = await request(app).get('/api/scripts').set('Authorization', `Bearer ${agentToken}`);
    scriptId = res.body.data[0]?.id || '';
  });

  it('retorna script válido por ID → 200', async () => {
    if (!scriptId) return;
    const res = await request(app)
      .get(`/api/scripts/${scriptId}`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(scriptId);
  });

  it('UUID inválido → 400', async () => {
    const res = await request(app)
      .get('/api/scripts/no-es-un-uuid')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(400);
  });

  it('UUID válido pero inexistente → 404', async () => {
    const res = await request(app)
      .get('/api/scripts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
describe('POST /api/scripts — control de roles', () => {
// ─────────────────────────────────────────────

  const validScript = {
    title: 'Script de test',
    base_content: 'Hola {{cliente}}, le llamo de parte de la empresa.',
    description: 'Test',
    tags: ['test'],
    variables: [{ key: 'cliente', label: 'Nombre', type: 'text' }]
  };

  it('agente NO puede crear scripts → 403', async () => {
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${agentToken}`)
      .send(validScript);
    expect(res.status).toBe(403);
  });

  it('supervisor SÍ puede crear scripts → 201', async () => {
    if (!supervisorToken) return;
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send(validScript);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('rechaza título vacío → 400', async () => {
    if (!supervisorToken) return;
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ ...validScript, title: '' });
    expect(res.status).toBe(400);
  });

  it('rechaza contenido muy corto → 400', async () => {
    if (!supervisorToken) return;
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ ...validScript, base_content: 'corto' });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
describe('POST /api/scripts/:id/generate', () => {
// ─────────────────────────────────────────────

  let scriptId = '';

  beforeAll(async () => {
    const res = await request(app).get('/api/scripts').set('Authorization', `Bearer ${agentToken}`);
    // Buscar un script que tenga variables
    const withVars = res.body.data.find((s: { variables: unknown[] }) => s.variables?.length > 0);
    scriptId = withVars?.id || res.body.data[0]?.id || '';
  });

  it('genera script con variables → 200', async () => {
    if (!scriptId) return;
    const res = await request(app)
      .post(`/api/scripts/${scriptId}/generate`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ variables_values: { cliente: 'Sr. García', monto: '$50.000', cuotas: '2', producto: 'Seguro', fecha_limite: 'enero' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('generated_content');
  });

  it('UUID inválido → 400', async () => {
    const res = await request(app)
      .post('/api/scripts/invalido/generate')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ variables_values: {} });
    expect(res.status).toBe(400);
  });

  it('sin autenticación → 401', async () => {
    if (!scriptId) return;
    const res = await request(app)
      .post(`/api/scripts/${scriptId}/generate`)
      .send({ variables_values: {} });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
describe('PUT + DELETE /api/scripts/:id', () => {
// ─────────────────────────────────────────────

  let createdId = '';

  beforeAll(async () => {
    if (!supervisorToken) return;
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        title: 'Script para editar/eliminar',
        base_content: 'Contenido de prueba para el test de edición.',
        description: 'Test', tags: [], variables: []
      });
    createdId = res.body.data?.id || '';
  });

  it('supervisor puede editar → 200', async () => {
    if (!createdId || !supervisorToken) return;
    const res = await request(app)
      .put(`/api/scripts/${createdId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        title: 'Título actualizado', base_content: 'Contenido actualizado para el test.',
        description: 'Actualizado', category_id: null, tags: [], variables: []
      });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Título actualizado');
  });

  it('agente NO puede editar → 403', async () => {
    if (!createdId) return;
    const res = await request(app)
      .put(`/api/scripts/${createdId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ title: 'Hack', base_content: 'x'.repeat(20), description: '', tags: [], variables: [] });
    expect(res.status).toBe(403);
  });

  it('supervisor puede eliminar → 200', async () => {
    if (!createdId || !supervisorToken) return;
    const res = await request(app)
      .delete(`/api/scripts/${createdId}`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('script eliminado ya no aparece → 404', async () => {
    if (!createdId) return;
    const res = await request(app)
      .get(`/api/scripts/${createdId}`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
describe('GET /api/health', () => {
// ─────────────────────────────────────────────

  it('retorna status ok con info de BD y caché', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services).toHaveProperty('database');
    expect(res.body.services).toHaveProperty('cache');
  });
});
