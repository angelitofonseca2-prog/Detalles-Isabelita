import express from "express";
import {
  crearPedido,
  obtenerPedidos,
  obtenerPedidoPorId,
  pagarPedido,
  validarPago,
  cancelarPedido,
  crearPedidoPaypal,
  pagarEnEfectivo
} from "../controllers/pedidosController.js";

import uploadComprobante from "../middleware/uploadComprobante.js";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";

const router = express.Router();


// ======================================================
// RUTAS PÚBLICAS (CLIENTE)
// ======================================================
router.post("/", crearPedido);
router.get("/:id", obtenerPedidoPorId);

// Subir comprobante (cliente)
router.put("/:id/comprobante", (req, res, next) => {
  uploadComprobante.single("comprobante")(req, res, function (err) {
    if (err) {
      console.error("🔥 ERROR MULTER/CLOUDINARY:", err);
      return res.status(500).json({ error: err.message });
    }
    next();
  });
}, pagarPedido);

// PayPal
router.post("/paypal", crearPedidoPaypal);


// ======================================================
// RUTAS ADMIN (PROTEGIDAS)
// ======================================================
router.get("/", auth, adminOnly, obtenerPedidos);

router.put("/:id/validar", auth, adminOnly, validarPago);

router.put("/:id/cancelar", auth, adminOnly, cancelarPedido);

router.put("/:id/efectivo", auth, adminOnly, pagarEnEfectivo);


export default router;
