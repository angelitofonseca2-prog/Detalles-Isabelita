// backend/routes/usuarios.js
import express from "express";
const router = express.Router();
import {
    obtenerPerfil,
    actualizarPerfil,
    listarUsuarios,
    crearUsuario,
    actualizarUsuarioAdmin,
    eliminarUsuario
} from "../controllers/usuarioController.js";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";

// Ruta para perfil propio (cualquier usuario logueado)
router.get("/perfil", auth, obtenerPerfil);
router.put("/perfil", auth, actualizarPerfil);

// Rutas de administración (Solo Admin)
router.get("/", auth, adminOnly, listarUsuarios);
router.post("/", auth, adminOnly, crearUsuario);
router.put("/:id", auth, adminOnly, actualizarUsuarioAdmin);
router.delete("/:id", auth, adminOnly, eliminarUsuario);

export default router;
