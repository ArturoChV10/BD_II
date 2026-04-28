const { getCollection } = require("../../config/mongoDb");
const { getNextId, now, removeMongoId, toNumber } = require("./utils");

const getOrderById = async (id) => {
  const orders = await getCollection("orders");
  const users = await getCollection("users");
  const restaurants = await getCollection("restaurants");

  const order = await orders.findOne({ id: toNumber(id) });
  if (!order) {
    return null;
  }

  const user = await users.findOne({ id: order.user_id });
  const restaurant = await restaurants.findOne({ id: order.restaurant_id });

  return {
    ...removeMongoId(order),
    user_name: user ? user.name : null,
    restaurant_name: restaurant ? restaurant.name : null
  };
};

const getOrderItems = async (orderId) => {
  const orders = await getCollection("orders");
  const order = await orders.findOne({ id: toNumber(orderId) });

  if (!order || !order.items) {
    return [];
  }

  return order.items.sort((a, b) => a.id - b.id);
};

const createOrder = async (userId, restaurantId, orderType) => {
  const orders = await getCollection("orders");
  const createdAt = now();

  const order = {
    id: await getNextId("orders"),
    user_id: toNumber(userId),
    restaurant_id: toNumber(restaurantId),
    order_type: orderType || "pickup",
    status: "pending",
    total: 0,
    items: [],
    created_at: createdAt,
    updated_at: createdAt
  };

  await orders.insertOne(order);
  return order;
};

const addOrderItem = async (orderId, dishId, quantity, unitPrice) => {
  const orders = await getCollection("orders");
  const menus = await getCollection("menus");

  const menu = await menus.findOne({ "dishes.id": toNumber(dishId) });
  const dish = menu ? menu.dishes.find((item) => item.id === toNumber(dishId)) : null;

  const item = {
    id: await getNextId("order_items"),
    order_id: toNumber(orderId),
    dish_id: toNumber(dishId),
    dish_name: dish ? dish.name : null,
    quantity: toNumber(quantity),
    unit_price: Number(unitPrice),
    subtotal: toNumber(quantity) * Number(unitPrice)
  };

  await orders.updateOne(
    { id: toNumber(orderId) },
    {
      $push: { items: item },
      $set: { updated_at: now() }
    }
  );

  return item;
};

const updateOrderTotal = async (orderId) => {
  const orders = await getCollection("orders");
  const order = await orders.findOne({ id: toNumber(orderId) });

  if (!order) {
    return null;
  }

  const total = (order.items || []).reduce((sum, item) => sum + Number(item.subtotal), 0);

  const result = await orders.findOneAndUpdate(
    { id: toNumber(orderId) },
    { $set: { total, updated_at: now() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );

  return result.value || result;
};

const updateOrderStatus = async (id, status) => {
  const orders = await getCollection("orders");
  const result = await orders.findOneAndUpdate(
    { id: toNumber(id) },
    { $set: { status, updated_at: now() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );

  return result.value || result;
};

module.exports = {
  getOrderById,
  getOrderItems,
  createOrder,
  addOrderItem,
  updateOrderTotal,
  updateOrderStatus
};
