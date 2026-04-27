const dbType = process.env.DATABASE_TYPE || 'postgres';

if (dbType === 'postgres') {
  module.exports = {
    userDao: require('./postgres/userDaoPg'),
    restaurantDao: require('./postgres/restaurantDaoPg'),
    menuDao: require('./postgres/menuDaoPg'),
    dishDao: require('./postgres/dishDaoPg'),
    reservationDao: require('./postgres/reservationDaoPg'),
    orderDao: require('./postgres/orderDaoPg')
    // Más adelante agregaremos restaurantDao, menuDao, etc.
  };
} else if (dbType === 'mongodb') {
  // Por ahora lanzamos un error (lo implementaremos después)
  throw new Error('Aquí se implementaría Mongo');
} else {
  throw new Error(`Base de datos desconocida: ${dbType}`);
}