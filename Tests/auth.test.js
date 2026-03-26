process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/models/userModel', () => ({
  findUserByEmail: jest.fn(),
  findRestaurantByName: jest.fn(),
  findAdminByRestaurantId: jest.fn(),
  createUser: jest.fn()
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const userModel = require('../src/models/userModel');
const bcrypt = require('bcrypt');

describe('Auth endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /auth/register crea un cliente correctamente', async () => {
    userModel.findUserByEmail.mockResolvedValue(null);
    userModel.createUser.mockResolvedValue({
      id: 1,
      name: 'Dario',
      email: 'dario@test.com',
      role: 'client',
      restaurant_id: null
    });

    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Dario',
        email: 'DARIO@Test.com',
        password: '12345678'
      });

    expect(res.statusCode).toBe(201);
    expect(userModel.findUserByEmail).toHaveBeenCalledWith('dario@test.com');
    expect(userModel.createUser).toHaveBeenCalledWith(
      'Dario',
      'dario@test.com',
      '12345678',
      'client',
      null
    );
    expect(res.body.user.email).toBe('dario@test.com');
    expect(res.body.token).toBeTruthy();
  });

  test('POST /auth/register devuelve 400 si el email ya existe', async () => {
    userModel.findUserByEmail.mockResolvedValue({ id: 99, email: 'dario@test.com' });

    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Dario',
        email: 'dario@test.com',
        password: '12345678'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/registrado/i);
  });

  test('POST /auth/login devuelve 400 si faltan datos', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'dario@test.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/obligatorios/i);
  });

  test('POST /auth/login devuelve 401 si la contraseña es incorrecta', async () => {
    userModel.findUserByEmail.mockResolvedValue({
      id: 1,
      name: 'Dario',
      email: 'dario@test.com',
      role: 'client',
      restaurant_id: null,
      password_hash: 'hash-falso'
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'dario@test.com',
        password: 'incorrecta'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/credenciales inválidas/i);
  });

  test('POST /auth/login devuelve token si las credenciales son correctas', async () => {
    userModel.findUserByEmail.mockResolvedValue({
      id: 1,
      name: 'Dario',
      email: 'dario@test.com',
      role: 'client',
      restaurant_id: null,
      password_hash: 'hash-falso'
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'dario@test.com',
        password: '12345678'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/login exitoso/i);
    expect(res.body.user.email).toBe('dario@test.com');
    expect(res.body.token).toBeTruthy();
  });
});
