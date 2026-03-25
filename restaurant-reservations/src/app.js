const express = require('express');
const dotenv = require('dotenv'); // Carga las variables de entorno 
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const dishRoutes = require('./routes/dishRoutes');

dotenv.config();

const app = express();
app.use(express.json()); // Middleware para parsear JSON

app.get('/', (req, res) => {
  res.json({ message: 'API de Reserva de Restaurantes' }); // Endpoint para verificar que la API está funcionando
});

app.use('/auth', authRoutes);
app.use('/restaurants', restaurantRoutes);
app.use('/users', userRoutes);
app.use('/menus', menuRoutes);
app.use('/menus/:menuId/dishes', dishRoutes); // Rutas de platos anidadas bajo menús  
module.exports = app;
