import express from "express";
import {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto
} from "../controllers/productosController.js";

import uploadProducto from "../middleware/uploadProducto.js";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";

const router = express.Router();

// ✅ Orden correcto y sin duplicados
router.get("/", listarProductos);             // Listar todos
router.get("/:id", obtenerProducto);          // Obtener por ID

// ✅ Crear producto
router.post(
    "/",
    auth,
    adminOnly,
    uploadProducto.single("imagen"),
    crearProducto
);

// ✅ Actualizar producto
router.put(
    "/:id",
    auth,
    adminOnly,
    uploadProducto.single("imagen"),
    actualizarProducto
);

// ✅ Eliminar producto
router.delete(
    "/:id",
    auth,
    adminOnly,
    eliminarProducto
);

export default router;
