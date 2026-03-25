const express = require('express');
const { createOrder, getOrderDetails } = require('../controllers/orderController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, createOrder);
router.get('/:id', authenticateToken, getOrderDetails);

module.exports = router;