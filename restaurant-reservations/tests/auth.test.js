jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const { userDao, restaurantDao } = require("./mocks/daos");

describe("Auth endpoints", () => {
  test("POST /auth/register crea un cliente correctamente", async () => {
    userDao.findByEmail.mockResolvedValue(null);
    userDao.create.mockResolvedValue({
      id: 1,
      name: "Dario",
      email: "dario@test.com",
      role: "client",
      restaurant_id: null
    });

    const res = await request(app)
      .post("/auth/register")
      .send({
        name: " Dario ",
        email: "DARIO@Test.com",
        password: "12345678"
      });

    expect(res.statusCode).toBe(201);
    expect(userDao.findByEmail).toHaveBeenCalledWith("dario@test.com");
    expect(userDao.create).toHaveBeenCalledWith(
      "Dario",
      "dario@test.com",
      "12345678",
      "client",
      null
    );
    expect(res.body.user.email).toBe("dario@test.com");
    expect(res.body.token).toBeTruthy();
  });

  test("POST /auth/register devuelve 400 si faltan datos", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "dario@test.com", password: "12345678" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/obligatorios/i);
  });

  test("POST /auth/register devuelve 400 si la contraseña es muy corta", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Dario", email: "dario@test.com", password: "123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/8 caracteres/i);
  });

  test("POST /auth/register devuelve 400 si el rol no es válido", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Dario",
        email: "dario@test.com",
        password: "12345678",
        role: "owner"
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/rol/i);
  });

  test("POST /auth/register devuelve 400 si el email ya existe", async () => {
    userDao.findByEmail.mockResolvedValue({ id: 99, email: "dario@test.com" });

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Dario", email: "dario@test.com", password: "12345678" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/registrado/i);
  });

  test("POST /auth/register devuelve 404 si el admin indica un restaurante inexistente", async () => {
    userDao.findByEmail.mockResolvedValue(null);
    restaurantDao.findRestaurantByName.mockResolvedValue(null);

    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Admin",
        email: "admin@test.com",
        password: "12345678",
        role: "admin",
        restaurantName: "Local Fantasma",
        restaurantCode: "codigo123"
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/local/i);
  });

  test("POST /auth/register devuelve 401 si el código del restaurante es incorrecto", async () => {
    userDao.findByEmail.mockResolvedValue(null);
    restaurantDao.findRestaurantByName.mockResolvedValue({
      id: 10,
      name: "Soda TEC",
      admin_code_hash: "hash-del-codigo"
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Admin",
        email: "admin@test.com",
        password: "12345678",
        role: "admin",
        restaurantName: "Soda TEC",
        restaurantCode: "codigo-malo"
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/incorrecto/i);
  });

  test("POST /auth/register crea un administrador si el código del restaurante coincide", async () => {
    userDao.findByEmail.mockResolvedValue(null);
    restaurantDao.findRestaurantByName.mockResolvedValue({
      id: 10,
      name: "Soda TEC",
      admin_code_hash: "hash-del-codigo"
    });
    bcrypt.compare.mockResolvedValue(true);
    userDao.findAdminByRestaurantId.mockResolvedValue(null);
    userDao.create.mockResolvedValue({
      id: 2,
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
      restaurant_id: 10
    });

    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Admin",
        email: "admin@test.com",
        password: "12345678",
        role: "admin",
        restaurantName: "Soda TEC",
        restaurantCode: "codigo123"
      });

    expect(res.statusCode).toBe(201);
    expect(userDao.create).toHaveBeenCalledWith(
      "Admin",
      "admin@test.com",
      "12345678",
      "admin",
      10
    );
    expect(res.body.user.restaurantId).toBe(10);
  });

  test("POST /auth/login devuelve 400 si faltan datos", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "dario@test.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/obligatorios/i);
  });

  test("POST /auth/login devuelve 401 si las credenciales son incorrectas", async () => {
    userDao.findByEmail.mockResolvedValue({
      id: 1,
      name: "Dario",
      email: "dario@test.com",
      role: "client",
      restaurant_id: null,
      password_hash: "hash-falso"
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "dario@test.com", password: "incorrecta" });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/credenciales inválidas/i);
  });

  test("POST /auth/login devuelve token si las credenciales son correctas", async () => {
    userDao.findByEmail.mockResolvedValue({
      id: 1,
      name: "Dario",
      email: "dario@test.com",
      role: "client",
      restaurant_id: null,
      password_hash: "hash-falso"
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "dario@test.com", password: "12345678" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/login exitoso/i);
    expect(res.body.user.email).toBe("dario@test.com");
    expect(res.body.token).toBeTruthy();
  });
});
