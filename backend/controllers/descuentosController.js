import pool from "../db/db.js";

// ======================================================
// OBTENER TODOS LOS DESCUENTOS
// ======================================================
export const obtenerDescuentos = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM descuentos ORDER BY tipo ASC, minimo ASC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener descuentos:", error);
        res.status(500).json({ error: "Error al obtener descuentos" });
    }
};

// ======================================================
// CREAR DESCUENTO
// ======================================================
export const crearDescuento = async (req, res) => {
    const { tipo, minimo, porcentaje } = req.body;

    if (!tipo || minimo === undefined || porcentaje === undefined) {
        return res.status(400).json({
            error: "Todos los campos son obligatorios."
        });
    }

    try {
        await pool.query(
            "INSERT INTO descuentos (tipo, minimo, porcentaje) VALUES (?, ?, ?)",
            [tipo, minimo, porcentaje]
        );

        res.json({ mensaje: "Descuento agregado correctamente." });
    } catch (error) {
        console.error("Error al agregar descuento:", error);
        res.status(500).json({ error: "Error al agregar descuento" });
    }
};

// ======================================================
// ACTUALIZAR DESCUENTO
// ======================================================
export const actualizarDescuento = async (req, res) => {
    const { id } = req.params;
    const { minimo, porcentaje } = req.body;

    if (minimo === undefined || porcentaje === undefined) {
        return res.status(400).json({
            error: "Todos los campos son obligatorios."
        });
    }

    try {
        await pool.query(
            "UPDATE descuentos SET minimo = ?, porcentaje = ? WHERE id = ?",
            [minimo, porcentaje, id]
        );

        res.json({ mensaje: "Descuento actualizado correctamente." });
    } catch (error) {
        console.error("Error al actualizar descuento:", error);
        res.status(500).json({ error: "Error al actualizar descuento" });
    }
};

// ======================================================
// ELIMINAR DESCUENTO
// ======================================================
export const eliminarDescuento = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            "DELETE FROM descuentos WHERE id = ?",
            [id]
        );

        res.json({ mensaje: "Descuento eliminado correctamente." });
    } catch (error) {
        console.error("Error al eliminar descuento:", error);
        res.status(500).json({ error: "Error al eliminar descuento" });
    }
};

// ======================================================
// OBTENER DESCUENTOS POR MONTO
// ======================================================
export const obtenerDescuentosMonto = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT minimo, porcentaje FROM descuentos WHERE tipo = 'monto' ORDER BY minimo ASC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo descuentos por monto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// ======================================================
// OBTENER DESCUENTOS POR CANTIDAD
// ======================================================
export const obtenerDescuentosCantidad = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT minimo, porcentaje FROM descuentos WHERE tipo = 'cantidad' ORDER BY minimo ASC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo descuentos por cantidad:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// ======================================================
// OBTENER DESCUENTOS POR PRODUCTO
// ======================================================
export const obtenerDescuentosProducto = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id_producto, porcentaje FROM productos_descuento"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo descuentos por producto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
