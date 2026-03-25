const express = require('express');
const { createReservation, cancelReservation } = require('../controllers/reservationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, createReservation);
router.delete('/:id', authenticateToken, cancelReservation);

module.exports = router;