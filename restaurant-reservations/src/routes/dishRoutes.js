const express = require('express');
const {
  getDishesByMenu,
  getDishById,
  createDish,
  updateDish,
  deleteDish
} = require('../controllers/dishController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router({ mergeParams: true });

// Ruta para listar platos de un menú específico
router.get('/', getDishesByMenu);
router.get('/:id', getDishById);

// Rutas protegidas (solo admin del restaurante)
router.post('/', authenticateToken, createDish);
router.put('/:id', authenticateToken, updateDish);
router.delete('/:id', authenticateToken, deleteDish);

module.exports = router;