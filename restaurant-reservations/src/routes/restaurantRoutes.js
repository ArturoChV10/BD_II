const express = require('express');
const { getRestaurants, createRestaurant } = require('../controllers/restaurantController');
const { optionalAuth } = require('../middlewares/authMiddleware'); // cambia aquí

const router = express.Router();

router.get('/', getRestaurants);                    // publico
router.post('/', optionalAuth, createRestaurant);   // protegido

module.exports = router;