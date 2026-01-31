import db from "../db/db.js";

// =====================================================
// OBTENER PRODUCTOS CON SU DESCUENTO REAL
// =====================================================
export const obtenerProductosConDescuento = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                p.id,
                p.nombre,
                p.precio,
                COALESCE(d.porcentaje, 0) AS descuento
             FROM productos p
             LEFT JOIN productos_descuento d 
                ON p.id = d.id_producto
             ORDER BY p.id`
        );

        res.json(rows);

    } catch (error) {
        console.error("Error obteniendo productos con descuento:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};


//// =====================================================
// ACTUALIZAR o CREAR DESCUENTO DE UN PRODUCTO
// =====================================================
export const actualizarDescuentoProducto = async (req, res) => {
    const { id_producto } = req.params;
    const { porcentaje } = req.body;

    console.log("REQ PARAMS =>", req.params);
    console.log("REQ BODY   =>", req.body);

    if (porcentaje === undefined) {
        return res.status(400).json({ error: "El campo porcentaje es obligatorio." });
    }

    try {
        // 1) Verificar si ya existe descuento para este producto
        const [existe] = await db.query(
            `SELECT id FROM productos_descuento WHERE id_producto = ?`,
            [id_producto]
        );

        if (existe.length === 0) {
            // 2) Si NO existe → crear nuevo descuento
            await db.query(
                `INSERT INTO productos_descuento (id_producto, porcentaje)
                 VALUES (?, ?)`,
                [id_producto, porcentaje]
            );

            return res.json({ mensaje: "Descuento creado correctamente." });
        }

        // 3) Si existe → actualizar
        await db.query(
            `UPDATE productos_descuento
             SET porcentaje = ?
             WHERE id_producto = ?`,
            [porcentaje, id_producto]
        );

        return res.json({ mensaje: "Descuento actualizado correctamente." });

    } catch (error) {
        console.error("Error al actualizar descuento del producto:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};
