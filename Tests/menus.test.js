process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/models/menuModel', () => ({
  getAllMenus: jest.fn(),
  getMenuById: jest.fn(),
  createMenu: jest.fn(),
  updateMenu: jest.fn(),
  deleteMenu: jest.fn()
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const menuModel = require('../src/models/menuModel');

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('Menu endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /menus devuelve la lista', async () => {
    menuModel.getAllMenus.mockResolvedValue([
      { id: 1, name: 'Desayunos', restaurant_id: 10 }
    ]);

    const res = await request(app).get('/menus');

    expect(res.statusCode).toBe(200);
    expect(res.body.menus).toHaveLength(1);
  });

  test('POST /menus devuelve 401 sin token', async () => {
    const res = await request(app)
      .post('/menus')
      .send({ name: 'Ejecutivo' });

    expect(res.statusCode).toBe(401);
  });

  test('POST /menus devuelve 403 si el usuario no es admin', async () => {
    const token = makeToken({ id: 2, role: 'client', restaurantId: null });

    const res = await request(app)
      .post('/menus')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ejecutivo' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/no autorizado/i);
  });

  test('POST /menus crea menú si el admin pertenece al restaurante', async () => {
    const token = makeToken({ id: 1, role: 'admin', restaurantId: 10 });
    menuModel.createMenu.mockResolvedValue({
      id: 5,
      name: 'Ejecutivo',
      description: 'Menú del día',
      restaurant_id: 10
    });

    const res = await request(app)
      .post('/menus')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ejecutivo', description: 'Menú del día' });

    expect(res.statusCode).toBe(201);
    expect(menuModel.createMenu).toHaveBeenCalledWith('Ejecutivo', 'Menú del día', 10);
  });

  test('PUT /menus/:id devuelve 404 si el menú no existe', async () => {
    const token = makeToken({ id: 1, role: 'admin', restaurantId: 10 });
    menuModel.getMenuById.mockResolvedValue(null);

    const res = await request(app)
      .put('/menus/99')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nuevo nombre' });

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /menus/:id devuelve 403 si el admin no pertenece al restaurante', async () => {
    const token = makeToken({ id: 1, role: 'admin', restaurantId: 99 });
    menuModel.getMenuById.mockResolvedValue({ id: 5, name: 'Ejecutivo', restaurant_id: 10 });

    const res = await request(app)
      .delete('/menus/5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });
});
