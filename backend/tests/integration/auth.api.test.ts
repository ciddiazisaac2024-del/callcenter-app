import request from 'supertest';
import app     from '../../src/index';

const unique = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe('Auth API — POST /api/auth/register', () => {
  it('201 — registra usuario con datos válidos', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `${unique()}@callcenter.cl`,
      password: 'Password123!',
      name: 'Agente Test'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('400 — rechaza email duplicado', async () => {
    const email = `${unique()}@callcenter.cl`;
    await request(app).post('/api/auth/register').send({ email, password: 'Pass123!', name: 'User' });
    const res = await request(app).post('/api/auth/register').send({ email, password: 'Pass123!', name: 'User' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 — rechaza password sin mayúsculas', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `${unique()}@x.cl`, password: 'password1!', name: 'Test'
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('400 — rechaza password menor a 8 caracteres', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `${unique()}@x.cl`, password: 'Pa1!', name: 'Test'
    });
    expect(res.status).toBe(400);
  });

  it('400 — rechaza email inválido', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'no-es-email', password: 'Password1!', name: 'Test'
    });
    expect(res.status).toBe(400);
  });

  it('400 — rechaza nombre vacío', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `${unique()}@x.cl`, password: 'Password1!', name: ''
    });
    expect(res.status).toBe(400);
  });
});

describe('Auth API — POST /api/auth/login', () => {
  const user = { email: `${unique()}@callcenter.cl`, password: 'Password123!', name: 'Login Test' };

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(user);
  });

  it('200 — login con credenciales válidas', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: user.email, password: user.password
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('401 — rechaza contraseña incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: user.email, password: 'WrongPass1!'
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 — rechaza email inexistente', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'noexiste@x.cl', password: 'Password1!'
    });
    expect(res.status).toBe(401);
  });

  it('400 — rechaza body vacío', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('Auth API — GET /api/auth/me', () => {
  let token = '';

  beforeAll(async () => {
    const email = `${unique()}@callcenter.cl`;
    await request(app).post('/api/auth/register').send({ email, password: 'Pass123!A', name: 'Me Test' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Pass123!A' });
    token = res.body?.data?.token || '';
  });

  it('200 — retorna perfil con token válido', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('email');
    expect(res.body.data).toHaveProperty('role');
  });

  it('401 — rechaza sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 — rechaza token malformado', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-falso');
    expect(res.status).toBe(401);
  });
});
