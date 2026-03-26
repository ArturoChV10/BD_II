process.env.JWT_SECRET = 'test-secret';
process.env.RESTAURANT_SETUP_KEY = 'clave-setup';

jest.mock('../src/models/restaurantModel', () => ({
  getAllRestaurants: jest.fn(),
  findRestaurantByName: jest.fn(),
  createRestaurant: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const restaurantModel = require('../src/models/restaurantModel');

describe('Restaurant endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /restaurants lista restaurantes', async () => {
    restaurantModel.getAllRestaurants.mockResolvedValue([
      { id: 1, name: 'Soda TEC' },
      { id: 2, name: 'Pizza CR' }
    ]);

    const res = await request(app).get('/restaurants');

    expect(res.statusCode).toBe(200);
    expect(res.body.restaurants).toHaveLength(2);
  });

  test('POST /restaurants devuelve 403 si no hay autorización', async () => {
    const res = await request(app)
      .post('/restaurants')
      .send({ name: 'Nuevo Local', adminCode: '123456' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/no autorizado/i);
  });

  test('POST /restaurants devuelve 409 si el nombre ya existe', async () => {
    restaurantModel.findRestaurantByName.mockResolvedValue({ id: 1, name: 'Nuevo Local' });

    const res = await request(app)
      .post('/restaurants')
      .set('x-setup-key', 'clave-setup')
      .send({ name: 'Nuevo Local', adminCode: '123456' });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/ya existe/i);
  });

  test('POST /restaurants crea restaurante con setup key', async () => {
    restaurantModel.findRestaurantByName.mockResolvedValue(null);
    restaurantModel.createRestaurant.mockResolvedValue({
      id: 3,
      name: 'Nuevo Local',
      created_at: '2026-03-25T00:00:00.000Z'
    });

    const res = await request(app)
      .post('/restaurants')
      .set('x-setup-key', 'clave-setup')
      .send({ name: 'Nuevo Local', adminCode: '123456' });

    expect(res.statusCode).toBe(201);
    expect(restaurantModel.createRestaurant).toHaveBeenCalledWith('Nuevo Local', '123456');
    expect(res.body.restaurant.name).toBe('Nuevo Local');
  });
});
