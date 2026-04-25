const dbType = process.env.DATABASE_TYPE || 'postgres';

if (dbType === 'postgres') {
  module.exports = {
    userDao: require('./postgres/userDaoPg'),
    restaurantDao: require('./postgres/restaurantDaoPg'),
    // Más adelante agregaremos restaurantDao, menuDao, etc.
  };
} else if (dbType === 'mongodb') {
  // Por ahora lanzamos un error (lo implementaremos después)
  throw new Error('Aquí se implementaría Mongo');
} else {
  throw new Error(`Base de datos desconocida: ${dbType}`);
}