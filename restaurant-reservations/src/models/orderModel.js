const pool = require('../config/db');

const getOrderById = async (id) => {
  const result = await pool.query(`
    SELECT o.*, u.name as user_name, r.name as restaurant_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.id = $1
  `, [id]);
  return result.rows[0];
};

const getOrderItems = async (orderId) => {
  const result = await pool.query(`
    SELECT oi.*, d.name as dish_name
    FROM order_items oi
    JOIN dishes d ON oi.dish_id = d.id
    WHERE oi.order_id = $1
  `, [orderId]);
  return result.rows;
};

const createOrder = async (userId, restaurantId, orderType) => {
  const result = await pool.query(
    `INSERT INTO orders (user_id, restaurant_id, order_type, status, total)
     VALUES ($1, $2, $3, 'pending', 0)
     RETURNING *`,
    [userId, restaurantId, orderType]
  );
  return result.rows[0];
};

const addOrderItem = async (orderId, dishId, quantity, unitPrice) => {
  const subtotal = quantity * unitPrice;
  const result = await pool.query(
    `INSERT INTO order_items (order_id, dish_id, quantity, unit_price, subtotal)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orderId, dishId, quantity, unitPrice, subtotal]
  );
  return result.rows[0];
};

const updateOrderTotal = async (orderId) => {
  const result = await pool.query(
    `UPDATE orders SET total = (SELECT SUM(subtotal) FROM order_items WHERE order_id = $1) WHERE id = $1 RETURNING *`,
    [orderId]
  );
  return result.rows[0];
};

const updateOrderStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
};

module.exports = {
  getOrderById,
  getOrderItems,
  createOrder,
  addOrderItem,
  updateOrderTotal,
  updateOrderStatus
};