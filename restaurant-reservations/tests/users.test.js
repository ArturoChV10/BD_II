jest.mock("bcrypt", () => ({
  hash: jest.fn()
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const { userDao } = require("./mocks/daos");

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("User endpoints", () => {
  test("GET /users/me devuelve 401 sin token", async () => {
    const res = await request(app).get("/users/me");

    expect(res.statusCode).toBe(401);
  });

  test("GET /users/me devuelve el perfil sin password_hash", async () => {
    const token = makeToken({ id: 5, role: "client" });
    userDao.findById.mockResolvedValue({
      id: 5,
      name: "Dario",
      email: "dario@test.com",
      role: "client",
      password_hash: "hash-secreto"
    });

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe("dario@test.com");
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test("GET /users devuelve 403 si el usuario no es admin", async () => {
    const token = makeToken({ id: 5, role: "client" });

    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  test("GET /users lista usuarios si es admin", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    userDao.findAll.mockResolvedValue([
      { id: 1, name: "Admin", email: "admin@test.com", role: "admin" },
      { id: 2, name: "Cliente", email: "cliente@test.com", role: "client" }
    ]);

    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.users).toHaveLength(2);
  });

  test("GET /users/:id devuelve 404 si el usuario no existe", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    userDao.findById.mockResolvedValue(null);

    const res = await request(app)
      .get("/users/99")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  test("GET /users/:id devuelve usuario si es admin", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    userDao.findById.mockResolvedValue({
      id: 2,
      name: "Cliente",
      email: "cliente@test.com",
      role: "client",
      password_hash: "hash"
    });

    const res = await request(app)
      .get("/users/2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test("PUT /users/:id devuelve 403 si intenta modificar otro usuario sin ser admin", async () => {
    const token = makeToken({ id: 5, role: "client" });
    userDao.findById.mockResolvedValue({ id: 6, email: "otro@test.com", role: "client" });

    const res = await request(app)
      .put("/users/6")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nuevo" });

    expect(res.statusCode).toBe(403);
  });

  test("PUT /users/:id devuelve 400 si el email ya está en uso", async () => {
    const token = makeToken({ id: 5, role: "client" });
    userDao.findById.mockResolvedValue({ id: 5, email: "dario@test.com", role: "client" });
    userDao.findByEmail.mockResolvedValue({ id: 99, email: "repetido@test.com" });

    const res = await request(app)
      .put("/users/5")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "repetido@test.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test("PUT /users/:id devuelve 400 si no hay campos para actualizar", async () => {
    const token = makeToken({ id: 5, role: "client" });
    userDao.findById.mockResolvedValue({ id: 5, email: "dario@test.com", role: "client" });

    const res = await request(app)
      .put("/users/5")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test("PUT /users/:id actualiza datos propios", async () => {
    const token = makeToken({ id: 5, role: "client" });
    userDao.findById.mockResolvedValue({ id: 5, email: "dario@test.com", role: "client" });
    userDao.update.mockResolvedValue({
      id: 5,
      name: "Dario Actualizado",
      email: "dario@test.com",
      role: "client",
      password_hash: "hash"
    });

    const res = await request(app)
      .put("/users/5")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dario Actualizado" });

    expect(res.statusCode).toBe(200);
    expect(userDao.update).toHaveBeenCalledWith("5", { name: "Dario Actualizado" });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test("PUT /users/:id permite que admin cambie rol y restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    userDao.findById.mockResolvedValue({ id: 5, email: "dario@test.com", role: "client" });
    userDao.update.mockResolvedValue({
      id: 5,
      name: "Dario",
      email: "dario@test.com",
      role: "admin",
      restaurant_id: 10,
      password_hash: "hash"
    });

    const res = await request(app)
      .put("/users/5")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin", restaurantId: 10 });

    expect(res.statusCode).toBe(200);
    expect(userDao.update).toHaveBeenCalledWith("5", {
      role: "admin",
      restaurant_id: 10
    });
  });

  test("PUT /users/:id actualiza contraseña con hash", async () => {
    const token = makeToken({ id: 5, role: "client" });
    userDao.findById.mockResolvedValue({ id: 5, email: "dario@test.com", role: "client" });
    bcrypt.hash.mockResolvedValue("hash-nuevo");
    userDao.update.mockResolvedValue({
      id: 5,
      name: "Dario",
      email: "dario@test.com",
      role: "client",
      password_hash: "hash-nuevo"
    });

    const res = await request(app)
      .put("/users/5")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "nuevaClave123" });

    expect(res.statusCode).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith("nuevaClave123", 10);
    expect(userDao.update).toHaveBeenCalledWith("5", { password_hash: "hash-nuevo" });
  });

  test("DELETE /users/:id devuelve 403 si no es admin", async () => {
    const token = makeToken({ id: 5, role: "client" });

    const res = await request(app)
      .delete("/users/5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  test("DELETE /users/:id devuelve 404 si el usuario no existe", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    userDao.deleteUser.mockResolvedValue(null);

    const res = await request(app)
      .delete("/users/99")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  test("DELETE /users/:id elimina usuario si es admin", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    userDao.deleteUser.mockResolvedValue({ id: 5 });

    const res = await request(app)
      .delete("/users/5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });
});
