import request from 'supertest';
import app from '../../src/index';

const unique = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@callcenter.cl`;

describe('POST /api/auth/register', () => {
  it('registra usuario con datos válidos → 201 + token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: unique(), password: 'Password123!', name: 'Test User'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('rechaza email duplicado → 400', async () => {
    const email = unique();
    await request(app).post('/api/auth/register').send({ email, password: 'Pass123!', name: 'User' });
    const res = await request(app).post('/api/auth/register').send({ email, password: 'Pass123!', name: 'User' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rechaza email inválido → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email', password: 'Pass123!', name: 'User'
    });
    expect(res.status).toBe(400);
  });

  it('rechaza password sin mayúscula → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: unique(), password: 'password123', name: 'User'
    });
    expect(res.status).toBe(400);
  });

  it('rechaza password menor a 8 chars → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: unique(), password: 'P1!', name: 'User'
    });
    expect(res.status).toBe(400);
  });

  it('rechaza nombre vacío → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: unique(), password: 'Pass123!', name: ''
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const email    = unique();
  const password = 'Password123!';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ email, password, name: 'Test' });
  });

  it('login exitoso → 200 + token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(email);
  });

  it('rechaza password incorrecto → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rechaza email inexistente → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'noexiste@x.cl', password });
    expect(res.status).toBe(401);
  });

  it('mismo mensaje de error para ambos casos (anti-enumeration)', async () => {
    const r1 = await request(app).post('/api/auth/login').send({ email: 'no@x.cl', password: 'any' });
    const r2 = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
    expect(r1.body.message).toBe(r2.body.message);
  });
});

describe('GET /api/auth/me', () => {
  let token = '';
  const email = unique();

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ email, password: 'Pass123!', name: 'Me Test' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Pass123!' });
    token = res.body.data.token;
  });

  it('retorna perfil con token válido → 200', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  it('rechaza sin token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rechaza token inválido → 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token.falso.123');
    expect(res.status).toBe(401);
  });
});
