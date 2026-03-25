const pool = require('../config/db');

const getAllMenus = async (restaurantId = null) => {
  let query = `
    SELECT m.id, m.name, m.description, m.restaurant_id, 
           r.name as restaurant_name, m.created_at, m.updated_at
    FROM menus m
    JOIN restaurants r ON m.restaurant_id = r.id
  `;
  const values = [];
  if (restaurantId) {
    query += ' WHERE m.restaurant_id = $1';
    values.push(restaurantId);
  }
  query += ' ORDER BY m.id';
  const result = await pool.query(query, values);
  return result.rows;
};

const getMenuById = async (id) => {
  const query = `
    SELECT m.id, m.name, m.description, m.restaurant_id, 
           r.name as restaurant_name, m.created_at, m.updated_at
    FROM menus m
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const createMenu = async (name, description, restaurantId) => {
  const result = await pool.query(
    `INSERT INTO menus (name, description, restaurant_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, restaurant_id, created_at, updated_at`,
    [name, description, restaurantId]
  );
  return result.rows[0];
};

const updateMenu = async (id, fields) => {
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
  const query = `UPDATE menus SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index} RETURNING id, name, description, restaurant_id, created_at, updated_at`;
  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteMenu = async (id) => {
  const result = await pool.query('DELETE FROM menus WHERE id = $1 RETURNING id', [id]);
  return result.rows[0];
};

module.exports = {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
};