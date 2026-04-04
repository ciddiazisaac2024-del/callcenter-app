// Tests de integración originales — mantenidos por compatibilidad
// Los tests completos están en tests/integration/auth.routes.test.ts

import request from 'supertest';
import app from '../src/index';

const unique = () => `compat_${Date.now()}@callcenter.cl`;

describe('Auth básico (compatibilidad)', () => {
  it('GET /api/health → 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('registro + login completo', async () => {
    const email = unique();
    const reg = await request(app).post('/api/auth/register')
      .send({ email, password: 'Password123!', name: 'Compat Test' });
    expect(reg.status).toBe(201);

    const login = await request(app).post('/api/auth/login')
      .send({ email, password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.body.data).toHaveProperty('token');
  });
});
