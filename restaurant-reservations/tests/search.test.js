const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const searchService = require("../src/services/searchService");

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("Search endpoints", () => {
  test("GET /search devuelve 400 si el tipo no es válido", async () => {
    const res = await request(app).get("/search?q=pizza&type=usuario");

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/tipo de búsqueda/i);
  });

  test("GET /search devuelve 503 si Elasticsearch no está disponible", async () => {
    searchService.searchDocuments.mockResolvedValue({ available: false, results: [] });

    const res = await request(app).get("/search?q=pizza&type=dish");

    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/elasticsearch/i);
  });

  test("GET /search devuelve resultados correctamente", async () => {
    searchService.searchDocuments.mockResolvedValue({
      available: true,
      results: [
        {
          type: "dish",
          entity_id: 10,
          name: "Pizza Suprema",
          restaurant_id: 1,
          price: 4500
        }
      ]
    });

    const res = await request(app).get("/search?q=pizza&type=dish&restaurantId=1&limit=5");

    expect(res.statusCode).toBe(200);
    expect(searchService.searchDocuments).toHaveBeenCalledWith({
      q: "pizza",
      type: "dish",
      restaurantId: "1",
      limit: "5"
    });
    expect(res.body.results).toHaveLength(1);
  });

  test("POST /search/reindex devuelve 401 sin token", async () => {
    const res = await request(app).post("/search/reindex");

    expect(res.statusCode).toBe(401);
  });

  test("POST /search/reindex devuelve 403 si no es admin", async () => {
    const token = makeToken({ id: 5, role: "client" });

    const res = await request(app)
      .post("/search/reindex")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  test("POST /search/reindex devuelve 503 si Elasticsearch no está disponible", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    searchService.reindexAll.mockResolvedValue({ available: false, indexed: 0 });

    const res = await request(app)
      .post("/search/reindex")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/elasticsearch/i);
  });

  test("POST /search/reindex reindexa si el usuario es admin", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    searchService.reindexAll.mockResolvedValue({ available: true, indexed: 8 });

    const res = await request(app)
      .post("/search/reindex")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.indexed).toBe(8);
  });
});
