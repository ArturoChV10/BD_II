const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { dishDao, menuDao } = require("./mocks/daos");

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("Dish endpoints", () => {
  test("GET /menus/:menuId/dishes devuelve 404 si el menú no existe", async () => {
    menuDao.getMenuById.mockResolvedValue(null);

    const res = await request(app).get("/menus/99/dishes");

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/menú no encontrado/i);
  });

  test("GET /menus/:menuId/dishes lista platos del menú", async () => {
    menuDao.getMenuById.mockResolvedValue({ id: 1, name: "Almuerzos", restaurant_id: 10 });
    dishDao.getDishesByMenuId.mockResolvedValue([
      { id: 2, name: "Casado", menu_id: 1, price: "3500.00" }
    ]);

    const res = await request(app).get("/menus/1/dishes");

    expect(res.statusCode).toBe(200);
    expect(dishDao.getDishesByMenuId).toHaveBeenCalledWith("1");
    expect(res.body.dishes).toHaveLength(1);
  });

  test("GET /menus/:menuId/dishes/:id devuelve 404 si el plato no existe", async () => {
    dishDao.getDishById.mockResolvedValue(null);

    const res = await request(app).get("/menus/1/dishes/99");

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/plato no encontrado/i);
  });

  test("GET /menus/:menuId/dishes/:id devuelve el plato", async () => {
    dishDao.getDishById.mockResolvedValue({ id: 2, name: "Casado", menu_id: 1 });

    const res = await request(app).get("/menus/1/dishes/2");

    expect(res.statusCode).toBe(200);
    expect(res.body.dish.name).toBe("Casado");
  });

  test("POST /menus/:menuId/dishes devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/menus/1/dishes")
      .send({ name: "Casado", price: 3500 });

    expect(res.statusCode).toBe(401);
  });

  test("POST /menus/:menuId/dishes devuelve 400 si faltan datos", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });

    const res = await request(app)
      .post("/menus/1/dishes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Casado" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/precio/i);
  });

  test("POST /menus/:menuId/dishes devuelve 404 si el menú no existe", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    menuDao.getMenuById.mockResolvedValue(null);

    const res = await request(app)
      .post("/menus/99/dishes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Casado", price: 3500 });

    expect(res.statusCode).toBe(404);
  });

  test("POST /menus/:menuId/dishes devuelve 403 si el admin no pertenece al restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 99 });
    menuDao.getMenuById.mockResolvedValue({ id: 1, name: "Almuerzos", restaurant_id: 10 });

    const res = await request(app)
      .post("/menus/1/dishes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Casado", price: 3500 });

    expect(res.statusCode).toBe(403);
  });

  test("POST /menus/:menuId/dishes crea plato si el admin pertenece al restaurante", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    menuDao.getMenuById.mockResolvedValue({ id: 1, name: "Almuerzos", restaurant_id: 10 });
    dishDao.createDish.mockResolvedValue({
      id: 2,
      name: "Casado",
      description: "Con fresco natural",
      price: 3500,
      menu_id: 1
    });

    const res = await request(app)
      .post("/menus/1/dishes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: " Casado ", description: " Con fresco natural ", price: "3500" });

    expect(res.statusCode).toBe(201);
    expect(dishDao.createDish).toHaveBeenCalledWith(
      "Casado",
      "Con fresco natural",
      3500,
      "1"
    );
  });

  test("PUT /menus/:menuId/dishes/:id devuelve 400 si no hay campos", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    dishDao.getDishById.mockResolvedValue({ id: 2, name: "Casado", menu_id: 1 });
    menuDao.getMenuById.mockResolvedValue({ id: 1, restaurant_id: 10 });

    const res = await request(app)
      .put("/menus/1/dishes/2")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test("PUT /menus/:menuId/dishes/:id actualiza plato", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    dishDao.getDishById.mockResolvedValue({ id: 2, name: "Casado", menu_id: 1 });
    menuDao.getMenuById.mockResolvedValue({ id: 1, restaurant_id: 10 });
    dishDao.updateDish.mockResolvedValue({ id: 2, name: "Casado grande", menu_id: 1 });

    const res = await request(app)
      .put("/menus/1/dishes/2")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Casado grande", price: "4200" });

    expect(res.statusCode).toBe(200);
    expect(dishDao.updateDish).toHaveBeenCalledWith("2", {
      name: "Casado grande",
      price: 4200
    });
  });

  test("DELETE /menus/:menuId/dishes/:id elimina plato", async () => {
    const token = makeToken({ id: 1, role: "admin", restaurantId: 10 });
    dishDao.getDishById.mockResolvedValue({ id: 2, name: "Casado", menu_id: 1 });
    menuDao.getMenuById.mockResolvedValue({ id: 1, restaurant_id: 10 });
    dishDao.deleteDish.mockResolvedValue({ id: 2 });

    const res = await request(app)
      .delete("/menus/1/dishes/2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(dishDao.deleteDish).toHaveBeenCalledWith("2");
  });
});
