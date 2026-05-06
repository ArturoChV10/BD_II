const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { restaurantDao } = require("./mocks/daos");

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("Restaurant endpoints", () => {
  test("GET /restaurants lista restaurantes", async () => {
    restaurantDao.getAllRestaurants.mockResolvedValue([
      { id: 1, name: "Soda TEC" },
      { id: 2, name: "Pizza CR" }
    ]);

    const res = await request(app).get("/restaurants");

    expect(res.statusCode).toBe(200);
    expect(res.body.restaurants).toHaveLength(2);
  });

  test("POST /restaurants devuelve 400 si faltan datos", async () => {
    const res = await request(app)
      .post("/restaurants")
      .send({ name: "Nuevo Local" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/obligatorios/i);
  });

  test("POST /restaurants devuelve 400 si el código es muy corto", async () => {
    const res = await request(app)
      .post("/restaurants")
      .send({ name: "Nuevo Local", adminCode: "123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/6 caracteres/i);
  });

  test("POST /restaurants devuelve 403 si no hay autorización", async () => {
    const res = await request(app)
      .post("/restaurants")
      .send({ name: "Nuevo Local", adminCode: "123456" });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/no autorizado/i);
  });

  test("POST /restaurants devuelve 409 si el nombre ya existe", async () => {
    restaurantDao.findRestaurantByName.mockResolvedValue({ id: 1, name: "Nuevo Local" });

    const res = await request(app)
      .post("/restaurants")
      .set("x-setup-key", "clave-setup")
      .send({ name: "Nuevo Local", adminCode: "123456" });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/ya existe/i);
  });

  test("POST /restaurants crea restaurante con setup key", async () => {
    restaurantDao.findRestaurantByName.mockResolvedValue(null);
    restaurantDao.createRestaurant.mockResolvedValue({
      id: 3,
      name: "Nuevo Local",
      created_at: "2026-03-25T00:00:00.000Z"
    });

    const res = await request(app)
      .post("/restaurants")
      .set("x-setup-key", "clave-setup")
      .send({ name: "Nuevo Local", adminCode: "123456" });

    expect(res.statusCode).toBe(201);
    expect(restaurantDao.createRestaurant).toHaveBeenCalledWith("Nuevo Local", "123456");
    expect(res.body.restaurant.name).toBe("Nuevo Local");
  });

  test("POST /restaurants permite crear si viene un admin autenticado", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    restaurantDao.findRestaurantByName.mockResolvedValue(null);
    restaurantDao.createRestaurant.mockResolvedValue({ id: 4, name: "Café Central" });

    const res = await request(app)
      .post("/restaurants")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Café Central", adminCode: "abcdef" });

    expect(res.statusCode).toBe(201);
    expect(res.body.restaurant.name).toBe("Café Central");
  });
});
