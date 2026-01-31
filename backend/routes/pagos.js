// ===============================================
// RUTAS DE PAGOS (PAYPAL)
// ===============================================

import express from "express";
import { confirmarPagoPaypal } from "../controllers/pagosController.js";

const router = express.Router();


// ---------------------------
// PAYPAL - CONFIRMAR PAGO
// ---------------------------
router.post("/paypal/confirmar", confirmarPagoPaypal);

export default router;
