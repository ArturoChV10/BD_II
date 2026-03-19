const restaurantModel = require('../models/restaurantModel');

const getRestaurants = async (req, res) => {
  try {
    const restaurants = await restaurantModel.getAllRestaurants();
    res.json({ message: 'Restaurantes obtenidos correctamente', restaurants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createRestaurant = async (req, res) => {
  try {
    let { name, adminCode, setupKey } = req.body;
    name = name?.trim();
    adminCode = adminCode?.trim();

    // Validaciones básicas
    if (!name || !adminCode) {
      return res.status(400).json({ error: 'Nombre del local y código de seguridad son obligatorios' });
    }
    if (adminCode.length < 6) {
      return res.status(400).json({ error: 'El código del local debe tener al menos 6 caracteres' });
    }

    // --- Verificación de autorización ---
    let authorized = false;
    // Opción 1: Usuario autenticado con rol admin
    if (req.user && req.user.role === 'admin') {
      authorized = true;
    }
    // Opción 2: Clave de setup (para bootstrap)
    const providedSetupKey = req.headers['x-setup-key'] || setupKey;
    if (!authorized && process.env.RESTAURANT_SETUP_KEY && providedSetupKey === process.env.RESTAURANT_SETUP_KEY) {
      authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ error: 'No autorizado para crear restaurantes' });
    }

    // Verificar si ya existe un restaurante con ese nombre
    const existingRestaurant = await restaurantModel.findRestaurantByName(name);
    if (existingRestaurant) {
      return res.status(409).json({ error: 'Ya existe un restaurante con ese nombre' });
    }

    // Crear el restaurante
    const newRestaurant = await restaurantModel.createRestaurant(name, adminCode);

    res.status(201).json({
      message: 'Restaurante creado exitosamente',
      restaurant: newRestaurant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getRestaurants, createRestaurant };