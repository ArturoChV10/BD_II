const pool = require('../config/db');
const bcrypt = require('bcrypt');

const findRestaurantByName = async (name) => {
  const result = await pool.query('SELECT * FROM restaurants WHERE name = $1',[name]);
  return result.rows[0];
};

const getAllRestaurants = async () => {
  const result = await pool.query('SELECT id, name, created_at FROM restaurants ORDER BY id ASC');
  return result.rows;
};

const createRestaurant = async (name, adminCode) => {
  const adminCodeHash = await bcrypt.hash(adminCode, 10);
  const result = await pool.query(`INSERT INTO restaurants (name, admin_code_hash)VALUES ($1, $2) RETURNING id, name, created_at`,[name, adminCodeHash]);
  return result.rows[0];
};

const findRestaurantById = async (id) => {
  const result = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
  return result.rows[0];
};

module.exports = {
  findRestaurantByName,
  getAllRestaurants,
  createRestaurant,
  findRestaurantById
};
