const bcrypt = require("bcrypt");
const { getCollection } = require("../../config/mongoDb");
const { getNextId, now, removeMongoId, toNumber } = require("./utils");

const findRestaurantByName = async (name) => {
  const restaurants = await getCollection("restaurants");
  const restaurant = await restaurants.findOne({ name });
  return removeMongoId(restaurant);
};

const getAllRestaurants = async () => {
  const restaurants = await getCollection("restaurants");
  const result = await restaurants
    .find({}, { projection: { _id: 0, id: 1, name: 1, created_at: 1 } })
    .sort({ id: 1 })
    .toArray();

  return result;
};

const createRestaurant = async (name, adminCode) => {
  const restaurants = await getCollection("restaurants");
  const adminCodeHash = await bcrypt.hash(adminCode, 10);
  const createdAt = now();

  const restaurant = {
    id: await getNextId("restaurants"),
    name,
    admin_code_hash: adminCodeHash,
    created_at: createdAt
  };

  await restaurants.insertOne(restaurant);

  return {
    id: restaurant.id,
    name: restaurant.name,
    created_at: restaurant.created_at
  };
};

const findRestaurantById = async (id) => {
  const restaurants = await getCollection("restaurants");
  const restaurant = await restaurants.findOne({ id: toNumber(id) });
  return removeMongoId(restaurant);
};

module.exports = {
  findRestaurantByName,
  getAllRestaurants,
  createRestaurant,
  findRestaurantById
};
