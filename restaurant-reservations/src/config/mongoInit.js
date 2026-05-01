const { connectMongo } = require("./mongoDb");

const initMongo = async () => {
  const db = await connectMongo();

  // Restaurantes
  await db.collection("restaurants").createIndex({ id: 1 }, { unique: true });
  await db.collection("restaurants").createIndex({ name: 1 }, { unique: true });

  // Usuarios
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ restaurant_id: 1 });

  // Menus
  await db.collection("menus").createIndex({ id: 1 }, { unique: true });
  await db.collection("menus").createIndex({ restaurant_id: 1 });

  // Platos
  // Los platos están separados de menus para que puedan escalar mejor en MongoDB.
  await db.collection("dishes").createIndex({ id: 1 });
  await db.collection("dishes").createIndex({ menu_id: 1 });
  await db.collection("dishes").createIndex({ restaurant_id: 1 });
  await db.collection("dishes").createIndex({ restaurant_id: 1, menu_id: 1 });

  // Reservaciones
  await db.collection("reservations").createIndex({ id: 1 });
  await db.collection("reservations").createIndex({ user_id: 1 });
  await db.collection("reservations").createIndex({ restaurant_id: 1 });
  await db.collection("reservations").createIndex({ restaurant_id: 1, user_id: 1 });

  // ordenes
  await db.collection("orders").createIndex({ id: 1 }, { unique: true });
  await db.collection("orders").createIndex({ user_id: 1 });
  await db.collection("orders").createIndex({ restaurant_id: 1 });
  await db.collection("orders").createIndex({ restaurant_id: 1, user_id: 1 });
};

module.exports = initMongo;
