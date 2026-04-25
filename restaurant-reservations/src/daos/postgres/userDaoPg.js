const pool = require('../../config/db');
const bcrypt = require('bcrypt');

// Crear usuario
const create = async (name, email, password, role = 'client', restaurantId = null) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, restaurant_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, restaurant_id`,
    [name, email, passwordHash, role, restaurantId]
  );
  return result.rows[0];
};

// Buscar por email
const findByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

// Buscar por ID
const findById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

// Actualizar usuario (campos dinámicos)
const update = async (id, fields) => {
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
  const query = `UPDATE users SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index} RETURNING id, name, email, role, restaurant_id, created_at, updated_at`;
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Eliminar usuario
const deleteUser = async (id) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return result.rows[0];
};

// Obtener todos los usuarios (solo admin)
const findAll = async () => {
  const result = await pool.query('SELECT id, name, email, role, restaurant_id, created_at, updated_at FROM users ORDER BY id');
  return result.rows;
};

// Funciones auxiliares para autenticación (encuentran restaurante por nombre y admin por restaurantId)
const findRestaurantByName = async (restaurantName) => {
  const result = await pool.query('SELECT * FROM restaurants WHERE name = $1', [restaurantName]);
  return result.rows[0];
};

const findAdminByRestaurantId = async (restaurantId) => {
  const result = await pool.query('SELECT * FROM users WHERE restaurant_id = $1 AND role = $2', [restaurantId, 'admin']);
  return result.rows[0];
};

module.exports = {
  create,
  findByEmail,
  findById,
  update,
  deleteUser,
  findAll,
  findRestaurantByName,
  findAdminByRestaurantId
};