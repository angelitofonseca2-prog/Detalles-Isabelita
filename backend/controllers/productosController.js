import db from "../db/db.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================================================
   🖼️ Utilidad: normalizar URL de imagen
===================================================== */
function buildImageURL(nombreImagen) {
  if (!nombreImagen) return "/imagenes/no-image.png";

  if (
    nombreImagen.startsWith("http://") ||
    nombreImagen.startsWith("https://")
  ) {
    return nombreImagen;
  }

  return `/imagenes/${nombreImagen.trim().replace(/^\/+/, "")}`;
}

/* =====================================================
   🔍 Utilidad: validaciones de producto
===================================================== */
function validarProducto({ nombre, descripcion, precio, stock, categoria_id }) {
  if (!nombre || !descripcion || precio === undefined || stock === undefined || !categoria_id) {
    return "Todos los campos son obligatorios";
  }

  if (isNaN(precio) || Number(precio) <= 0) {
    return "El precio debe ser un número mayor a 0";
  }

  if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return "El stock debe ser un entero mayor o igual a 0";
  }

  if (!Number.isInteger(Number(categoria_id)) || Number(categoria_id) <= 0) {
    return "La categoría es inválida";
  }

  return null;
}

/* =====================================================
   📋 Listar productos (con filtros)
===================================================== */
export const listarProductos = async (req, res) => {
  try {
    let sql = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.imagen,
        p.categoria_id,
        COALESCE(pd.porcentaje, 0) AS descuento_producto
      FROM productos p
      LEFT JOIN productos_descuento pd ON p.id = pd.id_producto
    `;

    const params = [];

    if (req.query.soloDisponibles === "true") {
      sql += " WHERE p.stock > 0";
    }

    if (req.query.categoria) {
      sql += req.query.soloDisponibles === "true" ? " AND" : " WHERE";
      sql += " p.categoria_id = ?";
      params.push(req.query.categoria);
    }

    sql += " ORDER BY p.nombre ASC";

    const [rows] = await db.query(sql, params);

    const productos = rows.map(p => ({
      ...p,
      imagen: buildImageURL(p.imagen)
    }));

    res.json(productos);
  } catch (error) {
    console.error("Error al listar productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
};

/* =====================================================
   📌 Obtener producto por ID
===================================================== */
export const obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT id, nombre, descripcion, precio, stock, imagen, categoria_id
      FROM productos
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const producto = rows[0];
    producto.imagen = buildImageURL(producto.imagen);

    res.json(producto);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ error: "Error al obtener producto" });
  }
};

/* =====================================================
   ➕ Crear producto (imagen obligatoria)
===================================================== */
export const crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria_id } = req.body;

    const errorValidacion = validarProducto({
      nombre,
      descripcion,
      precio,
      stock,
      categoria_id
    });

    if (errorValidacion) {
      return res.status(400).json({ error: errorValidacion });
    }

    if (!req.file) {
      return res.status(400).json({ error: "La imagen del producto es obligatoria" });
    }

    const imagen = req.file.path; // URL Cloudinary

    const [result] = await db.query(
      `
      INSERT INTO productos
      (nombre, descripcion, precio, stock, categoria_id, imagen)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [nombre.trim(), descripcion.trim(), precio, stock, categoria_id, imagen]
    );

    res.status(201).json({
      id: result.insertId,
      mensaje: "Producto creado correctamente",
      imagen
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
};

/* =====================================================
   ✏️ Actualizar producto
===================================================== */
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, categoria_id } = req.body;

    const errorValidacion = validarProducto({
      nombre,
      descripcion,
      precio,
      stock,
      categoria_id
    });

    if (errorValidacion) {
      return res.status(400).json({ error: errorValidacion });
    }

    // Verificar existencia
    const [existe] = await db.query(
      "SELECT imagen FROM productos WHERE id = ?",
      [id]
    );

    if (existe.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    let imagen = existe[0].imagen;

    if (req.file) {
      imagen = req.file.path; // nueva imagen Cloudinary
    }

    const [result] = await db.query(
      `
      UPDATE productos
      SET nombre = ?, descripcion = ?, precio = ?, stock = ?, categoria_id = ?, imagen = ?
      WHERE id = ?
      `,
      [nombre.trim(), descripcion.trim(), precio, stock, categoria_id, imagen, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ mensaje: "Producto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
};

/* =====================================================
   ❌ Eliminar producto
===================================================== */
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM productos WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);

    // 🔒 Manejo de clave foránea (producto en pedidos)
    if (error.errno === 1451) {
      return res.status(409).json({
        error: "No se puede eliminar este producto porque está asociado a pedidos existentes. Considere dejar su stock en 0 para ocultarlo."
      });
    }

    res.status(500).json({ error: "Error interno del servidor al eliminar producto" });
  }
};
