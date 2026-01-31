import express from "express";
import { loginAdmin } from "../controllers/loginController.js";
import { loginLimiter } from "../middleware/loginLimiter.js";
import { verificarJWT } from "../middleware/authJWT.js";

const router = express.Router();

// ⬇️ ESTE ES EL ENDPOINT CLAVE
router.get("/verify", verificarJWT, (req, res) => {
  if (String(req.usuario.rol).toLowerCase() !== "admin") {
    return res.status(403).json({ message: "No autorizado" });
  }

  return res.json({
    usuario: {
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      rol: req.usuario.rol
    }
  });
});



// 🔐 LOGIN ADMIN protegido
router.post("/login", loginLimiter, loginAdmin);

export default router;
