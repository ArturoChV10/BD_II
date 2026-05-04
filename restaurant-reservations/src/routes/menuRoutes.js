const express = require('express');
const cacheMiddleware = require('../middlewares/cacheMiddleware');

const {
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
} = require('../controllers/menuController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Rutas públicas (listar y obtener por id)
router.get('/', cacheMiddleware(60), getMenus);
router.get('/:id', cacheMiddleware(60), getMenuById);

// Rutas protegidas (solo admin del restaurante)
router.post('/', authenticateToken, createMenu);
router.put('/:id', authenticateToken, updateMenu);
router.delete('/:id', authenticateToken, deleteMenu);

module.exports = router;