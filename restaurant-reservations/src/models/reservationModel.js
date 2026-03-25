const pool = require('../config/db');

const createReservation = async (userId, restaurantId, date, time, numPeople) => {
  const result = await pool.query(
    `INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, num_people, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [userId, restaurantId, date, time, numPeople]
  );
  return result.rows[0];
};

const cancelReservation = async (id) => {
  const result = await pool.query(
    `UPDATE reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};

const getReservationById = async (id) => {
  const result = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
  return result.rows[0];
};

module.exports = {
  createReservation,
  cancelReservation,
  getReservationById
};