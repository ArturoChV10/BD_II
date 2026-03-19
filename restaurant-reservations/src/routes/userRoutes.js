const express = require('express');
const {
  getProfile,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Rutas que usan authenticateToken
router.get('/me', authenticateToken, getProfile);
router.put('/:id', authenticateToken, updateUser);

// Rutas solo para admin
router.get('/', authenticateToken, authorizeRole(['admin']), getAllUsers);
router.get('/:id', authenticateToken, authorizeRole(['admin']), getUserById);
router.delete('/:id', authenticateToken, authorizeRole(['admin']), deleteUser);

module.exports = router;