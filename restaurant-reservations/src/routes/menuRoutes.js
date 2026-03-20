const express = require("express");
const { getMenu } = require("../controllers/menuController");
const { authenticateToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// Ruta para devolver el menú según el usuario autenticado
router.get("/", authenticateToken, getMenu);

module.exports = router;
