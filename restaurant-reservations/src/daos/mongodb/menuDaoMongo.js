const { getCollection } = require("../../config/mongoDb");
const { getNextId, now, removeMongoId, toNumber } = require("./utils");

const addRestaurantName = async (menu) => {
  if (!menu) {
    return null;
  }

  const restaurants = await getCollection("restaurants");
  const restaurant = await restaurants.findOne({ id: menu.restaurant_id });

  return {
    ...removeMongoId(menu),
    restaurant_name: restaurant ? restaurant.name : null
  };
};

const getAllMenus = async (restaurantId = null) => {
  const menus = await getCollection("menus");
  const query = restaurantId ? { restaurant_id: toNumber(restaurantId) } : {};
  const result = await menus.find(query).sort({ id: 1 }).toArray();

  const response = [];
  for (const menu of result) {
    response.push(await addRestaurantName(menu));
  }

  return response;
};

const getMenuById = async (id) => {
  const menus = await getCollection("menus");
  const menu = await menus.findOne({ id: toNumber(id) });
  return addRestaurantName(menu);
};

const createMenu = async (name, description, restaurantId) => {
  const menus = await getCollection("menus");
  const createdAt = now();

  const menu = {
    id: await getNextId("menus"),
    name,
    description: description || null,
    restaurant_id: toNumber(restaurantId),
    // dishes: [],  <- se elimina para sharding
    created_at: createdAt,
    updated_at: createdAt
  };

  await menus.insertOne(menu);

  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    restaurant_id: menu.restaurant_id,
    created_at: menu.created_at,
    updated_at: menu.updated_at
  };
};

const updateMenu = async (id, fields) => {
  if (!fields || Object.keys(fields).length === 0) {
    return null;
  }

  const menus = await getCollection("menus");
  const result = await menus.findOneAndUpdate(
    { id: toNumber(id) },
    { $set: { ...fields, updated_at: now() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );

  const menu = result.value || result;
  if (!menu) {
    return null;
  }

  delete menu.dishes;
  return menu;
};

const deleteMenu = async (id) => {
  const menus = await getCollection("menus");
  const result = await menus.findOneAndDelete(
    { id: toNumber(id) },
    { projection: { _id: 0, id: 1 } }
  );

  return result.value || result;
};

module.exports = {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
};
