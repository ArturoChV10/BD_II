const bcrypt = require("bcrypt");
const { getCollection } = require("../../config/mongoDb");
const { getNextId, now, removeMongoId, toNumber } = require("./utils");

const create = async (name, email, password, role = "client", restaurantId = null) => {
  const users = await getCollection("users");
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = now();

  const user = {
    id: await getNextId("users"),
    name,
    email,
    password_hash: passwordHash,
    role,
    restaurant_id: restaurantId === null ? null : toNumber(restaurantId),
    created_at: createdAt,
    updated_at: createdAt
  };

  await users.insertOne(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurant_id: user.restaurant_id
  };
};

const findByEmail = async (email) => {
  const users = await getCollection("users");
  const user = await users.findOne({ email });
  return removeMongoId(user);
};

const findById = async (id) => {
  const users = await getCollection("users");
  const user = await users.findOne({ id: toNumber(id) });
  return removeMongoId(user);
};

const update = async (id, fields) => {
  if (!fields || Object.keys(fields).length === 0) {
    return null;
  }

  const users = await getCollection("users");
  const updateFields = { ...fields, updated_at: now() };

  if (updateFields.restaurant_id !== undefined && updateFields.restaurant_id !== null) {
    updateFields.restaurant_id = toNumber(updateFields.restaurant_id);
  }

  const result = await users.findOneAndUpdate(
    { id: toNumber(id) },
    { $set: updateFields },
    { returnDocument: "after", projection: { _id: 0 } }
  );

  return result.value || result;
};

const deleteUser = async (id) => {
  const users = await getCollection("users");
  const user = await users.findOneAndDelete(
    { id: toNumber(id) },
    { projection: { _id: 0, id: 1 } }
  );

  return user.value || user;
};

const findAll = async () => {
  const users = await getCollection("users");
  const result = await users
    .find({}, { projection: { _id: 0, password_hash: 0 } })
    .sort({ id: 1 })
    .toArray();

  return result;
};

const findRestaurantByName = async (restaurantName) => {
  const restaurants = await getCollection("restaurants");
  const restaurant = await restaurants.findOne({ name: restaurantName });
  return removeMongoId(restaurant);
};

const findAdminByRestaurantId = async (restaurantId) => {
  const users = await getCollection("users");
  const user = await users.findOne({
    restaurant_id: toNumber(restaurantId),
    role: "admin"
  });

  return removeMongoId(user);
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
