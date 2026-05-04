const { menuDao } = require('../daos/factory');
const cache = require('../utils/cache');

const getMenus = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const menus = await menuDao.getAllMenus(restaurantId);
    res.json({ message: 'Menús obtenidos correctamente', menus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await menuDao.getMenuById(id);
    if (!menu) {
      return res.status(404).json({ error: 'Menú no encontrado' });
    }
    res.json({ message: 'Menú encontrado', menu });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createMenu = async (req, res) => {
  try {
    let { name, description, restaurantId } = req.body;
    name = name?.trim();
    description = description?.trim();

    // Validación
    if (!name) {
      return res.status(400).json({ error: 'El nombre del menú es obligatorio' });
    }

    // El usuario debe ser admin y pertenecer al restaurante
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado para crear menús' });
    }

    // Si no se envía restaurantId, usar el del usuario (admin)
    const targetRestaurantId = restaurantId || req.user.restaurantId;
    if (!targetRestaurantId || parseInt(targetRestaurantId) !== req.user.restaurantId) {
      return res.status(403).json({ error: 'No puedes crear menús para otros restaurantes' });
    }

    const newMenu = await menuDao.createMenu(name, description, targetRestaurantId);
    await cache.del('cache:/menus*');
    res.status(201).json({ message: 'Menú creado exitosamente', menu: newMenu });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Verificar que el menú existe
    const existingMenu = await menuDao.getMenuById(id);
    if (!existingMenu) {
      return res.status(404).json({ error: 'Menú no encontrado' });
    }

    // Autorización: solo admin del restaurante propietario
    if (!req.user || req.user.role !== 'admin' || req.user.restaurantId !== existingMenu.restaurant_id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este menú' });
    }

    const fields = {};
    if (name) fields.name = name;
    if (description !== undefined) fields.description = description;

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const updatedMenu = await menuDao.updateMenu(id, fields);
    await cache.del('cache:/menus*');
    res.json({ message: 'Menú actualizado', menu: updatedMenu });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    const existingMenu = await menuDao.getMenuById(id);
    if (!existingMenu) {
      return res.status(404).json({ error: 'Menú no encontrado' });
    }

    if (!req.user || req.user.role !== 'admin' || req.user.restaurantId !== existingMenu.restaurant_id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este menú' });
    }

    await menuDao.deleteMenu(id);
    await cache.del('cache:/menus*');
    res.json({ message: 'Menú eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
};