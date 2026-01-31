import express from "express";
import {
    obtenerDescuentos,
    crearDescuento,
    actualizarDescuento,
    eliminarDescuento,
    obtenerDescuentosMonto,
    obtenerDescuentosCantidad,
    obtenerDescuentosProducto
} from "../controllers/descuentosController.js";

import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";

const router = express.Router();

/* ======================================================
   🔓 RUTAS PÚBLICAS (CARRITO / CLIENTE)
   ====================================================== */
router.get("/monto", obtenerDescuentosMonto);
router.get("/cantidad", obtenerDescuentosCantidad);
router.get("/productos", obtenerDescuentosProducto);
router.get("/", obtenerDescuentos);

/* ======================================================
   🔐 RUTAS ADMINISTRADOR
   ====================================================== */
router.post("/", auth, adminOnly, crearDescuento);
router.put("/:id", auth, adminOnly, actualizarDescuento);
router.delete("/:id", auth, adminOnly, eliminarDescuento);

export default router;
