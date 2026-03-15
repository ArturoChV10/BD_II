const restaurantModel = require('../models/restaurantModel');

const getRestaurants = async (req, res) => {
  try {
    const restaurants = await restaurantModel.getAllRestaurants();
    res.json({message: 'Restaurantes obtenidos correctamente', restaurants
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Error interno del servidor'
    });
  }
};

const createRestaurant = async (req, res) => {
  try {
    let { name, adminCode, setupKey } = req.body;

    name = name?.trim();
    adminCode = adminCode?.trim();

    if (!name || !adminCode) {
      return res.status(400).json({error: 'Nombre del local y código de seguridad son obligatorios'
      });
    }

    if (adminCode.length < 6) {
      return res.status(400).json({error: 'El código del local debe tener al menos 6 caracteres'
      });
    }

    // Protección temporal mientras no tengan middleware
    const providedSetupKey = req.headers['x-setup-key'] || setupKey;

    if (
      process.env.RESTAURANT_SETUP_KEY &&
      providedSetupKey !== process.env.RESTAURANT_SETUP_KEY
    ) {
      return res.status(403).json({error: 'No autorizado para crear restaurantes'
      });
    }

    const existingRestaurant = await restaurantModel.findRestaurantByName(name);

    if (existingRestaurant) {
      return res.status(409).json({error: 'Ya existe un restaurante con ese nombre'
      });
    }

    const newRestaurant = await restaurantModel.createRestaurant(name, adminCode);

    res.status(201).json({message: 'Restaurante creado exitosamente',restaurant: newRestaurant});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getRestaurants,
  createRestaurant
};
