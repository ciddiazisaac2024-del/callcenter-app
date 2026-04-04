import request from 'supertest';
import app     from '../../src/index';

const unique = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── Helpers ──
async function loginAs(role: 'admin' | 'supervisor' | 'agent') {
  const credentials: Record<string, { email: string; password: string }> = {
    admin:      { email: 'admin@callcenter.cl',      password: 'Admin123!' },
    supervisor: { email: 'supervisor@callcenter.cl', password: 'Agent123!' },
    agent:      { email: 'agente1@callcenter.cl',    password: 'Agent123!' },
  };
  const res = await request(app).post('/api/auth/login').send(credentials[role]);
  return res.body?.data?.token || '';
}

describe('Scripts API — GET /api/scripts', () => {
  let agentToken = '';

  beforeAll(async () => { agentToken = await loginAs('agent'); });

  it('200 — retorna lista paginada con token', async () => {
    const res = await request(app).get('/api/scripts').set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('pages');
  });

  it('401 — rechaza sin token', async () => {
    const res = await request(app).get('/api/scripts');
    expect(res.status).toBe(401);
  });

  it('200 — acepta parámetros de paginación', async () => {
    const res = await request(app)
      .get('/api/scripts?page=1&limit=5')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(5);
  });

  it('200 — filtra por búsqueda', async () => {
    const res = await request(app)
      .get('/api/scripts?search=incumplimiento')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Scripts API — GET /api/scripts/categories', () => {
  let token = '';
  beforeAll(async () => { token = await loginAs('agent'); });

  it('200 — retorna categorías', async () => {
    const res = await request(app).get('/api/scripts/categories').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('color');
    }
  });
});

describe('Scripts API — GET /api/scripts/:id', () => {
  let token  = '';
  let scriptId = '';

  beforeAll(async () => {
    token = await loginAs('agent');
    const list = await request(app).get('/api/scripts').set('Authorization', `Bearer ${token}`);
    scriptId = list.body.data[0]?.id || '';
  });

  it('200 — retorna script por ID válido', async () => {
    if (!scriptId) return;
    const res = await request(app).get(`/api/scripts/${scriptId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(scriptId);
    expect(res.body.data).toHaveProperty('base_content');
    expect(res.body.data).toHaveProperty('variables');
  });

  it('400 — rechaza UUID inválido', async () => {
    const res = await request(app).get('/api/scripts/no-es-uuid').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('404 — UUID válido pero script inexistente', async () => {
    const res = await request(app)
      .get('/api/scripts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Scripts API — POST /api/scripts (crear)', () => {
  let supervisorToken = '';
  let agentToken      = '';

  beforeAll(async () => {
    supervisorToken = await loginAs('supervisor');
    agentToken      = await loginAs('agent');
  });

  const validScript = {
    title:        `Script test ${unique()}`,
    description:  'Descripción de prueba',
    base_content: 'Hola {{cliente}}, le llamo de prueba.',
    tags:         ['test'],
    variables:    [{ key: 'cliente', label: 'Cliente', type: 'text' }]
  };

  it('201 — supervisor puede crear script', async () => {
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send(validScript);
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe(validScript.title);
  });

  it('403 — agente NO puede crear script', async () => {
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${agentToken}`)
      .send(validScript);
    expect(res.status).toBe(403);
  });

  it('400 — rechaza script sin título', async () => {
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ ...validScript, title: '' });
    expect(res.status).toBe(400);
  });

  it('400 — rechaza base_content menor a 10 caracteres', async () => {
    const res = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ ...validScript, base_content: 'corto' });
    expect(res.status).toBe(400);
  });
});

describe('Scripts API — POST /api/scripts/:id/generate', () => {
  let token    = '';
  let scriptId = '';

  beforeAll(async () => {
    token = await loginAs('agent');
    const list = await request(app).get('/api/scripts').set('Authorization', `Bearer ${token}`);
    scriptId = list.body.data[0]?.id || '';
  });

  it('200 — genera script con variables', async () => {
    if (!scriptId) return;
    const res = await request(app)
      .post(`/api/scripts/${scriptId}/generate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ variables_values: { cliente: 'Sr. García', monto: '$50.000' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('generated_content');
    expect(res.body.data.generated_content).not.toContain('{{cliente}}');
  });

  it('200 — funciona sin variables (script sin placeholders)', async () => {
    if (!scriptId) return;
    const res = await request(app)
      .post(`/api/scripts/${scriptId}/generate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ variables_values: {} });
    expect(res.status).toBe(200);
  });

  it('400 — rechaza UUID inválido', async () => {
    const res = await request(app)
      .post('/api/scripts/uuid-invalido/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ variables_values: {} });
    expect(res.status).toBe(400);
  });
});

describe('Scripts API — PUT /api/scripts/:id (editar)', () => {
  let supervisorToken = '';
  let scriptId        = '';

  beforeAll(async () => {
    supervisorToken = await loginAs('supervisor');
    // Crear un script para editar
    const created = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ title: `Edit test ${unique()}`, base_content: 'Contenido para editar', tags: [] });
    scriptId = created.body.data?.id || '';
  });

  it('200 — actualiza script existente', async () => {
    if (!scriptId) return;
    const res = await request(app)
      .put(`/api/scripts/${scriptId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ title: 'Título actualizado', base_content: 'Contenido actualizado', tags: ['update'] });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Título actualizado');
  });

  it('404 — UUID válido pero inexistente', async () => {
    const res = await request(app)
      .put('/api/scripts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ title: 'X', base_content: 'Contenido largo suficiente', tags: [] });
    expect(res.status).toBe(404);
  });
});

describe('Scripts API — DELETE /api/scripts/:id', () => {
  let supervisorToken = '';

  beforeAll(async () => { supervisorToken = await loginAs('supervisor'); });

  it('200 — elimina (soft delete) script existente', async () => {
    // Crear script para eliminar
    const created = await request(app)
      .post('/api/scripts')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ title: `Delete test ${unique()}`, base_content: 'Contenido para eliminar', tags: [] });

    const id = created.body.data?.id;
    if (!id) return;

    const res = await request(app)
      .delete(`/api/scripts/${id}`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('404 — intenta eliminar script inexistente', async () => {
    const res = await request(app)
      .delete('/api/scripts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(res.status).toBe(404);
  });
});

describe('Health Check', () => {
  it('200 — /api/health retorna estado ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('services');
  });
});
