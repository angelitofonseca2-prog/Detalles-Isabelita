// backend/routes/contacto.js
import express from "express";
const router = express.Router();
import {
    guardarMensaje,
    obtenerMensajes,
    eliminarMensaje
} from "../controllers/contactoController.js";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";

// Ruta pública para enviar mensajes
router.post("/", guardarMensaje);

// Rutas privadas para administración
router.get("/", auth, adminOnly, obtenerMensajes);
router.delete("/:id", auth, adminOnly, eliminarMensaje);

export default router;
