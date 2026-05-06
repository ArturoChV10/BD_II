const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { orderDao, dishDao, restaurantDao } = require("./mocks/daos");

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("Order endpoints", () => {
  test("POST /orders devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/orders")
      .send({ restaurantId: 1, items: [{ dishId: 10, quantity: 2 }] });

    expect(res.statusCode).toBe(401);
  });

  test("POST /orders devuelve 400 si faltan datos", async () => {
    const token = makeToken({ id: 4, role: "client" });

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ restaurantId: 1, items: [] });

    expect(res.statusCode).toBe(400);
  });

  test("POST /orders devuelve 404 si el restaurante no existe", async () => {
    const token = makeToken({ id: 4, role: "client" });
    restaurantDao.findRestaurantById.mockResolvedValue(null);

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        restaurantId: 1,
        items: [{ dishId: 10, quantity: 2 }]
      });

    expect(res.statusCode).toBe(404);
  });

  test("POST /orders devuelve 400 si un plato no existe", async () => {
    const token = makeToken({ id: 4, role: "client" });
    restaurantDao.findRestaurantById.mockResolvedValue({ id: 1, name: "Pizza CR" });
    orderDao.createOrder.mockResolvedValue({ id: 77, user_id: 4, restaurant_id: 1, total: 0 });
    dishDao.getDishById.mockResolvedValue(null);

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        restaurantId: 1,
        items: [{ dishId: 10, quantity: 2 }]
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  test("POST /orders crea el pedido correctamente", async () => {
    const token = makeToken({ id: 4, role: "client" });
    restaurantDao.findRestaurantById.mockResolvedValue({ id: 1, name: "Pizza CR" });
    orderDao.createOrder.mockResolvedValue({ id: 77, user_id: 4, restaurant_id: 1, total: 0 });
    dishDao.getDishById.mockResolvedValue({ id: 10, name: "Pizza", price: "3500.00" });
    orderDao.addOrderItem.mockResolvedValue({ id: 1, order_id: 77, dish_id: 10, quantity: 2 });
    orderDao.updateOrderTotal.mockResolvedValue({ id: 77, user_id: 4, restaurant_id: 1, total: "7000.00" });

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        restaurantId: 1,
        orderType: "pickup",
        items: [{ dishId: 10, quantity: 2 }]
      });

    expect(res.statusCode).toBe(201);
    expect(orderDao.createOrder).toHaveBeenCalledWith(4, 1, "pickup");
    expect(orderDao.addOrderItem).toHaveBeenCalledWith(77, 10, 2, 3500);
    expect(res.body.order.total).toBe("7000.00");
  });

  test("GET /orders/:id devuelve 404 si no existe", async () => {
    const token = makeToken({ id: 4, role: "client" });
    orderDao.getOrderById.mockResolvedValue(null);

    const res = await request(app)
      .get("/orders/88")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  test("GET /orders/:id devuelve 403 si no es dueño ni admin", async () => {
    const token = makeToken({ id: 4, role: "client" });
    orderDao.getOrderById.mockResolvedValue({ id: 88, user_id: 99, restaurant_id: 1 });

    const res = await request(app)
      .get("/orders/88")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  test("GET /orders/:id devuelve el pedido si es el dueño", async () => {
    const token = makeToken({ id: 4, role: "client" });
    orderDao.getOrderById.mockResolvedValue({ id: 88, user_id: 4, restaurant_id: 1, total: "7000.00" });
    orderDao.getOrderItems.mockResolvedValue([
      { id: 1, dish_id: 10, quantity: 2, subtotal: "7000.00" }
    ]);

    const res = await request(app)
      .get("/orders/88")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  test("GET /orders/:id devuelve el pedido si es admin", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    orderDao.getOrderById.mockResolvedValue({ id: 88, user_id: 4, restaurant_id: 1, total: "7000.00" });
    orderDao.getOrderItems.mockResolvedValue([]);

    const res = await request(app)
      .get("/orders/88")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });
});
