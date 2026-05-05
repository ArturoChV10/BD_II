const express = require("express");
const { search, reindex } = require("../controllers/searchController");
const { authenticateToken, authorizeRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// Búsqueda pública
router.get("/", search);

// Reindexación protegida para administradores
router.post("/reindex", authenticateToken, authorizeRole(["admin"]), reindex);

module.exports = router;
