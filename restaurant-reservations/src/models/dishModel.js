const pool = require('../config/db');

const getDishesByMenuId = async (menuId) => {
  const query = 'SELECT * FROM dishes WHERE menu_id = $1 ORDER BY id';
  const result = await pool.query(query, [menuId]);
  return result.rows;
};

const getDishById = async (id) => {
  const query = 'SELECT * FROM dishes WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const createDish = async (name, description, price, menuId) => {
  const result = await pool.query(
    `INSERT INTO dishes (name, description, price, menu_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, description, price, menu_id, created_at, updated_at`,
    [name, description, price, menuId]
  );
  return result.rows[0];
};

const updateDish = async (id, fields) => {
  const setClauses = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = $${index}`);
    values.push(value);
    index++;
  }
  if (setClauses.length === 0) return null;
  values.push(id);
  const query = `UPDATE dishes SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index} RETURNING id, name, description, price, menu_id, created_at, updated_at`;
  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteDish = async (id) => {
  const result = await pool.query('DELETE FROM dishes WHERE id = $1 RETURNING id', [id]);
  return result.rows[0];
};

module.exports = {
  getDishesByMenuId,
  getDishById,
  createDish,
  updateDish,
  deleteDish
};