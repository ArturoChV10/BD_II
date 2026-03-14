const express = require('express');
const dotenv = require('dotenv'); // Carga las variables de entorno 

dotenv.config();

const app = express();
app.use(express.json()); // Middleware para parsear JSON

app.get('/', (req, res) => {
  res.json({ message: 'API de Reserva de Restaurantes' }); // Endpoint para verificar que la API está funcionando
});

module.exports = app;