const orderModel = require('../models/orderModel');
const dishModel = require('../models/dishModel');
const restaurantModel = require('../models/restaurantModel');

const createOrder = async (req, res) => {
  try {
    const { restaurantId, orderType, items } = req.body; // items: [{ dishId, quantity }]
    const userId = req.user.id;

    if (!restaurantId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar restaurante
    const restaurant = await restaurantModel.findRestaurantById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    // Crear el pedido
    const order = await orderModel.createOrder(userId, restaurantId, orderType || 'pickup');

    let total = 0;
    for (const item of items) {
      const dish = await dishModel.getDishById(item.dishId);
      if (!dish) {
        // Opcional: hacer rollback? Mejor devolver error.
        return res.status(400).json({ error: `Plato con id ${item.dishId} no encontrado` });
      }
      const unitPrice = parseFloat(dish.price);
      await orderModel.addOrderItem(order.id, item.dishId, item.quantity, unitPrice);
      total += item.quantity * unitPrice;
    }

    // Actualizar total del pedido
    const updatedOrder = await orderModel.updateOrderTotal(order.id);

    res.status(201).json({ message: 'Pedido creado', order: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Solo el dueño del pedido o admin pueden verlo
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const items = await orderModel.getOrderItems(id);
    res.json({ message: 'Detalles del pedido', order, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { createOrder, getOrderDetails };