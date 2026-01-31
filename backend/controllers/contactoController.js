// backend/controllers/contactoController.js
import db from "../db/db.js";

// 1. Guardar mensaje enviado desde el formulario público
export const guardarMensaje = async (req, res) => {
    const { nombre, email, telefono, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ error: "Nombre, email y mensaje son obligatorios." });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO mensajes_contacto (nombre, email, telefono, mensaje) VALUES (?, ?, ?, ?)",
            [nombre, email, telefono || null, mensaje]
        );

        res.status(201).json({
            mensaje: "Mensaje guardado correctamente.",
            id: result.insertId
        });
    } catch (error) {
        console.error("Error en guardarMensaje:", error);
        res.status(500).json({ error: "Error interno al guardar el mensaje." });
    }
};

// 2. Obtener todos los mensajes (solo para Admin)
export const obtenerMensajes = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM mensajes_contacto ORDER BY fecha DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error en obtenerMensajes:", error);
        res.status(500).json({ error: "Error al obtener la lista de mensajes." });
    }
};

// 3. Eliminar un mensaje (Opcional, para limpieza del admin)
export const eliminarMensaje = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM mensajes_contacto WHERE id = ?", [id]);
        res.json({ mensaje: "Mensaje eliminado." });
    } catch (error) {
        console.error("Error en eliminarMensaje:", error);
        res.status(500).json({ error: "Error al eliminar el mensaje." });
    }
};
