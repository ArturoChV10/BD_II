const { dishDao, menuDao } = require('../daos/factory');

const getDishesByMenu = async (req, res) => {
  try {
    const { menuId } = req.params;
    const menu = await menuModel.getMenuById(menuId);
    if (!menu) {
      return res.status(404).json({ error: 'Menú no encontrado' });
    }
    const dishes = await dishDao.getDishesByMenuId(menuId);
    res.json({ message: 'Platos obtenidos', dishes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getDishById = async (req, res) => {
  try {
    const { id } = req.params;
    const dish = await dishDao.getDishById(id);
    if (!dish) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }
    res.json({ message: 'Plato encontrado', dish });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createDish = async (req, res) => {
  try {
    const { menuId } = req.params;
    let { name, description, price } = req.body;
    name = name?.trim();
    description = description?.trim();

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    // Verificar que el menú existe
    const menu = await menuModel.getMenuById(menuId);
    if (!menu) {
      return res.status(404).json({ error: 'Menú no encontrado' });
    }

    // Autorización: solo admin del restaurante propietario
    if (!req.user || req.user.role !== 'admin' || req.user.restaurantId !== menu.restaurant_id) {
      return res.status(403).json({ error: 'No autorizado para agregar platos a este menú' });
    }

    const newDish = await dishDao.createDish(name, description, parseFloat(price), menuId);
    res.status(201).json({ message: 'Plato creado', dish: newDish });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateDish = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    const existingDish = await dishDao.getDishById(id);
    if (!existingDish) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }

    // Obtener el menú para verificar restaurante
    const menu = await menuModel.getMenuById(existingDish.menu_id);
    if (!req.user || req.user.role !== 'admin' || req.user.restaurantId !== menu.restaurant_id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este plato' });
    }

    const fields = {};
    if (name) fields.name = name;
    if (description !== undefined) fields.description = description;
    if (price !== undefined) fields.price = parseFloat(price);

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const updatedDish = await dishDao.updateDish(id, fields);
    res.json({ message: 'Plato actualizado', dish: updatedDish });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteDish = async (req, res) => {
  try {
    const { id } = req.params;

    const existingDish = await dishDao.getDishById(id);
    if (!existingDish) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }

    const menu = await menuModel.getMenuById(existingDish.menu_id);
    if (!req.user || req.user.role !== 'admin' || req.user.restaurantId !== menu.restaurant_id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este plato' });
    }

    await dishDao.deleteDish(id);
    res.json({ message: 'Plato eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getDishesByMenu,
  getDishById,
  createDish,
  updateDish,
  deleteDish
};