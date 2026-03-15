const pool = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async (name, email, password, role = 'client', restaurantId = null) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(`INSERT INTO users (name, email, password_hash, role, restaurant_id)VALUES ($1, $2, $3, $4, $5)RETURNING id, name, email, role, restaurant_id`,[name, email, passwordHash, role, restaurantId]);
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

const findRestaurantByName = async (restaurantName) => {
  const result = await pool.query('SELECT * FROM restaurants WHERE name = $1',[restaurantName]);
  return result.rows[0];
};

const findAdminByRestaurantId = async (restaurantId) => {
  const result = await pool.query('SELECT * FROM users WHERE restaurant_id = $1 AND role = $2',[restaurantId, 'admin']);
  return result.rows[0];
};

module.exports = {findUserByEmail,findRestaurantByName,findAdminByRestaurantId,createUser};
