import { AuthService, InvalidCredentialsError, EmailAlreadyExistsError } from '../../src/services/auth.service';
import { authRepository } from '../../src/repositories/auth.repository';
import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';

jest.mock('../../src/repositories/auth.repository');
jest.mock('../../src/config/database');

const mockRepo = authRepository as jest.Mocked<typeof authRepository>;

const fakeUser = {
  id:            'uuid-123',
  email:         'test@callcenter.cl',
  name:          'Test User',
  role:          'agent' as const,
  is_active:     true,
  created_at:    new Date(),
  password_hash: ''
};

describe('AuthService — register()', () => {
  let service: AuthService;
  beforeEach(() => { service = new AuthService(); jest.clearAllMocks(); });

  it('crea usuario y retorna token cuando el email no existe', async () => {
    mockRepo.emailExists.mockResolvedValue(false);
    mockRepo.create.mockResolvedValue({ ...fakeUser });
    mockRepo.logActivity.mockReturnValue(undefined);

    const result = await service.register('test@callcenter.cl', 'Password1!', 'Test User');

    expect(mockRepo.emailExists).toHaveBeenCalledWith('test@callcenter.cl');
    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('test@callcenter.cl');
  });

  it('lanza EmailAlreadyExistsError si el email existe', async () => {
    mockRepo.emailExists.mockResolvedValue(true);
    await expect(service.register('dup@x.cl', 'Pass1!', 'Dup')).rejects.toThrow(EmailAlreadyExistsError);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('normaliza role inválido a "agent"', async () => {
    mockRepo.emailExists.mockResolvedValue(false);
    mockRepo.create.mockResolvedValue({ ...fakeUser });
    mockRepo.logActivity.mockReturnValue(undefined);

    await service.register('x@x.cl', 'Pass1!', 'X', 'hacker');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(String), 'agent');
  });

  it('token JWT contiene id, email y role', async () => {
    mockRepo.emailExists.mockResolvedValue(false);
    mockRepo.create.mockResolvedValue({ ...fakeUser });
    mockRepo.logActivity.mockReturnValue(undefined);

    const { token } = await service.register('jwt@test.cl', 'Pass1!', 'JWT');
    const decoded   = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, string>;

    expect(decoded.id).toBe(fakeUser.id);
    expect(decoded.role).toBe(fakeUser.role);
  });
});

describe('AuthService — login()', () => {
  let service: AuthService;
  beforeEach(async () => {
    service = new AuthService();
    jest.clearAllMocks();
    fakeUser.password_hash = await bcrypt.hash('Password1!', 4);
  });

  it('retorna token con credenciales válidas', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser as typeof fakeUser & { password_hash: string });
    mockRepo.logActivity.mockReturnValue(undefined);

    const result = await service.login('test@callcenter.cl', 'Password1!');
    expect(result).toHaveProperty('token');
  });

  it('no expone password_hash en el resultado', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser as typeof fakeUser & { password_hash: string });
    mockRepo.logActivity.mockReturnValue(undefined);

    const result = await service.login('test@callcenter.cl', 'Password1!');
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('lanza InvalidCredentialsError si el email no existe', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    await expect(service.login('no@x.cl', 'Pass1!')).rejects.toThrow(InvalidCredentialsError);
  });

  it('lanza InvalidCredentialsError si la contraseña es incorrecta', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser as typeof fakeUser & { password_hash: string });
    await expect(service.login('test@callcenter.cl', 'WrongPass!')).rejects.toThrow(InvalidCredentialsError);
  });

  it('registra actividad de LOGIN', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser as typeof fakeUser & { password_hash: string });
    mockRepo.logActivity.mockReturnValue(undefined);

    await service.login('test@callcenter.cl', 'Password1!');
    expect(mockRepo.logActivity).toHaveBeenCalledWith(fakeUser.id, 'LOGIN');
  });
});

describe('AuthService — getProfile()', () => {
  let service: AuthService;
  beforeEach(() => { service = new AuthService(); jest.clearAllMocks(); });

  it('retorna usuario si existe', async () => {
    mockRepo.findById.mockResolvedValue(fakeUser);
    const result = await service.getProfile(fakeUser.id);
    expect(result).toEqual(fakeUser);
  });

  it('lanza error si no existe', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.getProfile('no-existe')).rejects.toThrow('Usuario no encontrado');
  });
});
