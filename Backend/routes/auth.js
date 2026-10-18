const { Router } = require("express");
const {
  login,
  register,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  getUserData,
} = require("../controllers/authController");
const { validarJWT } = require("../middlewares/verificartoken");

const router = Router();

// Rutas públicas (no requieren autenticación)
router.post("/login", login);
router.post("/register", register);

// Rutas para restablecimiento de contraseña
router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-reset-token", verifyResetToken);
router.post("/reset-password", resetPassword);

// Rutas protegidas (requieren autenticación)
router.get("/user", validarJWT, getUserData); // 🔥 Agregar middleware

module.exports = router;
