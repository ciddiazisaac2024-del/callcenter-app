// Tests de scripts originales — mantenidos por compatibilidad
// Los tests completos están en tests/integration/scripts.routes.test.ts

import request from 'supertest';
import app from '../src/index';

let token = '';

beforeAll(async () => {
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'agente1@callcenter.cl', password: 'Agent123!' });
  token = res.body?.data?.token || '';
});

describe('Scripts básico (compatibilidad)', () => {
  it('GET /api/scripts requiere auth → 401', async () => {
    const res = await request(app).get('/api/scripts');
    expect(res.status).toBe(401);
  });

  it('GET /api/scripts con token → 200', async () => {
    if (!token) return;
    const res = await request(app).get('/api/scripts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
