const { getCollection } = require("../../config/mongoDb");
const { getNextId, now, removeMongoId, toNumber } = require("./utils");

const createReservation = async (userId, restaurantId, date, time, numPeople) => {
  const reservations = await getCollection("reservations");
  const createdAt = now();

  const reservation = {
    id: await getNextId("reservations"),
    user_id: toNumber(userId),
    restaurant_id: toNumber(restaurantId),
    reservation_date: date,
    reservation_time: time,
    num_people: toNumber(numPeople),
    status: "pending",
    created_at: createdAt,
    updated_at: createdAt
  };

  await reservations.insertOne(reservation);
  return reservation;
};

const cancelReservation = async (id) => {
  const reservations = await getCollection("reservations");
  const result = await reservations.findOneAndUpdate(
    { id: toNumber(id) },
    { $set: { status: "cancelled", updated_at: now() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );

  return result.value || result;
};

const getReservationById = async (id) => {
  const reservations = await getCollection("reservations");
  const reservation = await reservations.findOne({ id: toNumber(id) });
  return removeMongoId(reservation);
};

module.exports = {
  createReservation,
  cancelReservation,
  getReservationById
};
