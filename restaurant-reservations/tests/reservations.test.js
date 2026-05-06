const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { reservationDao } = require("./mocks/daos");

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("Reservation endpoints", () => {
  test("POST /reservations devuelve 401 sin token", async () => {
    const res = await request(app)
      .post("/reservations")
      .send({ restaurantId: 1, date: "2026-03-30", time: "18:00", numPeople: 2 });

    expect(res.statusCode).toBe(401);
  });

  test("POST /reservations devuelve 400 si faltan datos", async () => {
    const token = makeToken({ id: 7, role: "client" });

    const res = await request(app)
      .post("/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ restaurantId: 1, date: "2026-03-30" });

    expect(res.statusCode).toBe(400);
  });

  test("POST /reservations crea una reserva", async () => {
    const token = makeToken({ id: 7, role: "client" });
    reservationDao.createReservation.mockResolvedValue({
      id: 3,
      user_id: 7,
      restaurant_id: 1,
      reservation_date: "2026-03-30",
      reservation_time: "18:00",
      num_people: 2,
      status: "pending"
    });

    const res = await request(app)
      .post("/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        restaurantId: 1,
        date: "2026-03-30",
        time: "18:00",
        numPeople: 2
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.reservation.status).toBe("pending");
    expect(reservationDao.createReservation).toHaveBeenCalledWith(
      7,
      1,
      "2026-03-30",
      "18:00",
      2
    );
  });

  test("DELETE /reservations/:id devuelve 404 si no existe", async () => {
    const token = makeToken({ id: 7, role: "client" });
    reservationDao.getReservationById.mockResolvedValue(null);

    const res = await request(app)
      .delete("/reservations/55")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  test("DELETE /reservations/:id devuelve 403 si no es dueño ni admin", async () => {
    const token = makeToken({ id: 7, role: "client" });
    reservationDao.getReservationById.mockResolvedValue({ id: 2, user_id: 99, status: "pending" });

    const res = await request(app)
      .delete("/reservations/2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  test("DELETE /reservations/:id cancela la reserva si es el dueño", async () => {
    const token = makeToken({ id: 7, role: "client" });
    reservationDao.getReservationById.mockResolvedValue({ id: 2, user_id: 7, status: "pending" });
    reservationDao.cancelReservation.mockResolvedValue({ id: 2, user_id: 7, status: "cancelled" });

    const res = await request(app)
      .delete("/reservations/2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.reservation.status).toBe("cancelled");
  });

  test("DELETE /reservations/:id permite cancelar si es admin", async () => {
    const token = makeToken({ id: 1, role: "admin" });
    reservationDao.getReservationById.mockResolvedValue({ id: 2, user_id: 99, status: "pending" });
    reservationDao.cancelReservation.mockResolvedValue({ id: 2, user_id: 99, status: "cancelled" });

    const res = await request(app)
      .delete("/reservations/2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });
});
