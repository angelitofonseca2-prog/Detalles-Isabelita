// routes/categorias.js
import express from "express";
import { obtenerCategorias } from "../controllers/categoriasController.js";

const router = express.Router();
router.get("/", obtenerCategorias);

export default router;
