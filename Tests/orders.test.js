process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/models/orderModel', () => ({
  createOrder: jest.fn(),
  addOrderItem: jest.fn(),
  updateOrderTotal: jest.fn(),
  getOrderById: jest.fn(),
  getOrderItems: jest.fn()
}));

jest.mock('../src/models/dishModel', () => ({
  getDishById: jest.fn()
}));

jest.mock('../src/models/restaurantModel', () => ({
  findRestaurantById: jest.fn()
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const orderModel = require('../src/models/orderModel');
const dishModel = require('../src/models/dishModel');
const restaurantModel = require('../src/models/restaurantModel');

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('Order endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /orders devuelve 400 si faltan datos', async () => {
    const token = makeToken({ id: 4, role: 'client' });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurantId: 1, items: [] });

    expect(res.statusCode).toBe(400);
  });

  test('POST /orders devuelve 404 si el restaurante no existe', async () => {
    const token = makeToken({ id: 4, role: 'client' });
    restaurantModel.findRestaurantById.mockResolvedValue(null);

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurantId: 1,
        items: [{ dishId: 10, quantity: 2 }]
      });

    expect(res.statusCode).toBe(404);
  });

  test('POST /orders devuelve 400 si un plato no existe', async () => {
    const token = makeToken({ id: 4, role: 'client' });
    restaurantModel.findRestaurantById.mockResolvedValue({ id: 1, name: 'Pizza CR' });
    orderModel.createOrder.mockResolvedValue({ id: 77, user_id: 4, restaurant_id: 1, total: 0 });
    dishModel.getDishById.mockResolvedValue(null);

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurantId: 1,
        items: [{ dishId: 10, quantity: 2 }]
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  test('POST /orders crea el pedido correctamente', async () => {
    const token = makeToken({ id: 4, role: 'client' });
    restaurantModel.findRestaurantById.mockResolvedValue({ id: 1, name: 'Pizza CR' });
    orderModel.createOrder.mockResolvedValue({ id: 77, user_id: 4, restaurant_id: 1, total: 0 });
    dishModel.getDishById.mockResolvedValue({ id: 10, name: 'Pizza', price: '3500.00' });
    orderModel.addOrderItem.mockResolvedValue({ id: 1, order_id: 77, dish_id: 10, quantity: 2 });
    orderModel.updateOrderTotal.mockResolvedValue({ id: 77, user_id: 4, restaurant_id: 1, total: '7000.00' });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurantId: 1,
        orderType: 'pickup',
        items: [{ dishId: 10, quantity: 2 }]
      });

    expect(res.statusCode).toBe(201);
    expect(orderModel.addOrderItem).toHaveBeenCalledWith(77, 10, 2, 3500);
    expect(res.body.order.total).toBe('7000.00');
  });

  test('GET /orders/:id devuelve 404 si no existe', async () => {
    const token = makeToken({ id: 4, role: 'client' });
    orderModel.getOrderById.mockResolvedValue(null);

    const res = await request(app)
      .get('/orders/88')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  test('GET /orders/:id devuelve 403 si no es dueño ni admin', async () => {
    const token = makeToken({ id: 4, role: 'client' });
    orderModel.getOrderById.mockResolvedValue({ id: 88, user_id: 99, restaurant_id: 1 });

    const res = await request(app)
      .get('/orders/88')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  test('GET /orders/:id devuelve el pedido si es el dueño', async () => {
    const token = makeToken({ id: 4, role: 'client' });
    orderModel.getOrderById.mockResolvedValue({ id: 88, user_id: 4, restaurant_id: 1, total: '7000.00' });
    orderModel.getOrderItems.mockResolvedValue([
      { id: 1, dish_id: 10, quantity: 2, subtotal: '7000.00' }
    ]);

    const res = await request(app)
      .get('/orders/88')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});
