const dbType = (process.env.DATABASE_TYPE || "postgres").toLowerCase();

if (["postgres", "postgresql", "pg"].includes(dbType)) {
  module.exports = {
    userDao: require("./postgres/userDaoPg"),
    restaurantDao: require("./postgres/restaurantDaoPg"),
    menuDao: require("./postgres/menuDaoPg"),
    dishDao: require("./postgres/dishDaoPg"),
    reservationDao: require("./postgres/reservationDaoPg"),
    orderDao: require("./postgres/orderDaoPg")
  };
} else if (["mongodb", "mongo"].includes(dbType)) {
  module.exports = {
    userDao: require("./mongodb/userDaoMongo"),
    restaurantDao: require("./mongodb/restaurantDaoMongo"),
    menuDao: require("./mongodb/menuDaoMongo"),
    dishDao: require("./mongodb/dishDaoMongo"),
    reservationDao: require("./mongodb/reservationDaoMongo"),
    orderDao: require("./mongodb/orderDaoMongo")
  };
} else {
  throw new Error(`Base de datos desconocida: ${dbType}`);
}
