const { Router } = require("express");
const { catalogoPublico } = require("../controllers/servicio");

// Rutas públicas de solo lectura (sin sesión): la carta de servicios que muestra la landing
const router = Router();

router.get("/", catalogoPublico);

module.exports = router;
