// controllers/categoriasController.js
import db from "../db/db.js";

export const obtenerCategorias = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre FROM categorias ORDER BY nombre"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error obtenerCategorias:", error);
    res.status(500).json({ mensaje: "Error al obtener categorías" });
  }
};
