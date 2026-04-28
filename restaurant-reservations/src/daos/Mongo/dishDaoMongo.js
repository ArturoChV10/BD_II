const { getCollection } = require("../../config/mongoDb");
const { getNextId, now, toNumber } = require("./utils");

const getDishesByMenuId = async (menuId) => {
  const menus = await getCollection("menus");
  const menu = await menus.findOne({ id: toNumber(menuId) });

  if (!menu || !menu.dishes) {
    return [];
  }

  return menu.dishes.sort((a, b) => a.id - b.id);
};

const getDishById = async (id) => {
  const menus = await getCollection("menus");
  const menu = await menus.findOne({ "dishes.id": toNumber(id) });

  if (!menu) {
    return null;
  }

  return menu.dishes.find((dish) => dish.id === toNumber(id)) || null;
};

const createDish = async (name, description, price, menuId) => {
  const menus = await getCollection("menus");
  const createdAt = now();

  const dish = {
    id: await getNextId("dishes"),
    name,
    description: description || null,
    price: Number(price),
    menu_id: toNumber(menuId),
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await menus.updateOne(
    { id: toNumber(menuId) },
    {
      $push: { dishes: dish },
      $set: { updated_at: createdAt }
    }
  );

  if (result.matchedCount === 0) {
    return null;
  }

  return dish;
};

const updateDish = async (id, fields) => {
  if (!fields || Object.keys(fields).length === 0) {
    return null;
  }

  const menus = await getCollection("menus");
  const updateFields = {};

  for (const [key, value] of Object.entries(fields)) {
    updateFields[`dishes.$[dish].${key}`] = key === "price" ? Number(value) : value;
  }

  updateFields["dishes.$[dish].updated_at"] = now();
  updateFields.updated_at = now();

  await menus.updateOne(
    { "dishes.id": toNumber(id) },
    { $set: updateFields },
    { arrayFilters: [{ "dish.id": toNumber(id) }] }
  );

  return getDishById(id);
};

const deleteDish = async (id) => {
  const menus = await getCollection("menus");
  const result = await menus.updateOne(
    { "dishes.id": toNumber(id) },
    {
      $pull: { dishes: { id: toNumber(id) } },
      $set: { updated_at: now() }
    }
  );

  if (result.modifiedCount === 0) {
    return null;
  }

  return { id: toNumber(id) };
};

module.exports = {
  getDishesByMenuId,
  getDishById,
  createDish,
  updateDish,
  deleteDish
};
