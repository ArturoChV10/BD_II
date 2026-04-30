const { getCollection } = require("../../config/mongoDb");
const { getNextId, now, toNumber } = require("./utils");

const getDishesByMenuId = async (menuId) => {
  const dishes = await getCollection("dishes");
  return await dishes.find({ menu_id: toNumber(menuId) }).sort({ id: 1 }).toArray();
};

const getDishById = async (id) => {
  const dishes = await getCollection("dishes");
  return await dishes.findOne({ id: toNumber(id) });
};

const createDish = async (name, description, price, menuId) => {
  const dishes = await getCollection("dishes");
  const menus = await getCollection("menus");
  const createdAt = now();

  // Verificar que el menú existe
  const menu = await menus.findOne({ id: toNumber(menuId) });
  if (!menu) {
    return null;
  }

  const dish = {
    id: await getNextId("dishes"),
    name,
    description: description || null,
    price: Number(price),
    menu_id: toNumber(menuId),
    restaurant_id: menu.restaurant_id,  // <- importante para sharding
    created_at: createdAt,
    updated_at: createdAt
  };

  await dishes.insertOne(dish);
  return dish;
};

const updateDish = async (id, fields) => {
  if (!fields || Object.keys(fields).length === 0) return null;

  const dishes = await getCollection("dishes");
  const updateFields = {};
  
  for (const [key, value] of Object.entries(fields)) {
    updateFields[key] = key === "price" ? Number(value) : value;
  }
  updateFields.updated_at = now();

  const result = await dishes.findOneAndUpdate(
    { id: toNumber(id) },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  return result.value || result;
};

const deleteDish = async (id) => {
  const dishes = await getCollection("dishes");
  const result = await dishes.findOneAndDelete({ id: toNumber(id) });
  return result.value || result;
};

module.exports = {
  getDishesByMenuId,
  getDishById,
  createDish,
  updateDish,
  deleteDish
};