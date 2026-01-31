import express from "express";
import { 
    actualizarDescuentoProducto,
    obtenerProductosConDescuento 
} from "../controllers/productosDescuentoController.js";

const router = express.Router();

// Obtener todos los productos con descuento
router.get("/", obtenerProductosConDescuento);

// Actualizar descuento de un producto específico
router.put("/:id_producto", actualizarDescuentoProducto);


export default router;
