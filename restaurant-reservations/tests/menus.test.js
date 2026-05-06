const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { menuDao } = require("./mocks/daos");

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("Menu endpoints", () => {
  test("GET /menus devuelve la lista filtrada por restaurante", async () => {
    menuDao.getAllMenus.mockResolvedValue([
      { id: 1, name: "Desayunos", restaurant_id: 10 }
    ]);

    const res = await request(app).get("/menus?restaurantId=10");

    expect(res.statusCode).toBe(200);
    expect(menuDao.getAllMenus).toHaveBeenCalledWith("10");
    expect(res.body.menus).toHaveLength(1);
  });

  test("GET /menus/:id devuelve 404 si el menú no existe", async () => {
    menuDao.getMenuById.mockResolvedValue(null);

    const res = await request(app).get("/menus/99");

    expect(res.statusCode).toBe(404);
  });

  test("GET /menus/:id devuelve un menú", async () => {
    menuDao.getMenuById.mockResolvedValue({ id: 1, name: "Almuerzos", restaurant_id: 10 });

    const res = await request(app).get("/menus/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.menu.name).toBe("Almuerzos");
  });

  test("POST /menus devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/menus")
      .send({ name: "Ejecutivo" });

    expect(res.statusCode).toBe(401);
  });

  test("POST /menus devuelve 403 si el usuario no es admin", async () => {
    const token = makeToken({ id: 2, role: "client", restaurantId: null });

    const res = await request(app)
      .post("/menus")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ejecutivo" });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/no autorizado/i);
  });

  test("POST /menus devuelve 403 si el admin intenta crear para otro restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });

    const res = await request(app)
      .post("/menus")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ejecutivo", restaurantId: 99 });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/otros restaurantes/i);
  });

  test("POST /menus crea menú si el admin pertenece al restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    menuDao.createMenu.mockResolvedValue({
      id: 5,
      name: "Ejecutivo",
      description: "Menú del día",
      restaurant_id: 10
    });

    const res = await request(app)
      .post("/menus")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: " Ejecutivo ", description: " Menú del día " });

    expect(res.statusCode).toBe(201);
    expect(menuDao.createMenu).toHaveBeenCalledWith("Ejecutivo", "Menú del día", 10);
  });

  test("PUT /menus/:id devuelve 404 si el menú no existe", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    menuDao.getMenuById.mockResolvedValue(null);

    const res = await request(app)
      .put("/menus/99")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nuevo nombre" });

    expect(res.statusCode).toBe(404);
  });

  test("PUT /menus/:id devuelve 400 si no hay campos para actualizar", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    menuDao.getMenuById.mockResolvedValue({ id: 5, name: "Ejecutivo", restaurant_id: 10 });

    const res = await request(app)
      .put("/menus/5")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test("PUT /menus/:id actualiza si el admin pertenece al restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    menuDao.getMenuById.mockResolvedValue({ id: 5, name: "Ejecutivo", restaurant_id: 10 });
    menuDao.updateMenu.mockResolvedValue({ id: 5, name: "Nuevo", restaurant_id: 10 });

    const res = await request(app)
      .put("/menus/5")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nuevo" });

    expect(res.statusCode).toBe(200);
    expect(menuDao.updateMenu).toHaveBeenCalledWith("5", { name: "Nuevo" });
  });

  test("DELETE /menus/:id devuelve 403 si el admin no pertenece al restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 99 });
    menuDao.getMenuById.mockResolvedValue({ id: 5, name: "Ejecutivo", restaurant_id: 10 });

    const res = await request(app)
      .delete("/menus/5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  test("DELETE /menus/:id elimina si el admin pertenece al restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    menuDao.getMenuById.mockResolvedValue({ id: 5, name: "Ejecutivo", restaurant_id: 10 });
    menuDao.deleteMenu.mockResolvedValue({ id: 5 });

    const res = await request(app)
      .delete("/menus/5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(menuDao.deleteMenu).toHaveBeenCalledWith("5");
  });
});
