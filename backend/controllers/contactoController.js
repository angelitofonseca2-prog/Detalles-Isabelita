// backend/controllers/contactoController.js
import db from "../db/db.js";
import nodemailer from "nodemailer";

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

// 4. Enviar respuesta automática por correo (Admin)
export const enviarRespuesta = async (req, res) => {
    const { id } = req.params;
    const { asunto, cuerpo } = req.body || {};

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        return res.status(503).json({
            error: "Correo no configurado. Agrega EMAIL_USER y EMAIL_PASS en el servidor (Gmail: usa Contraseña de aplicación)."
        });
    }

    try {
        const [rows] = await db.query(
            "SELECT id, nombre, email, mensaje FROM mensajes_contacto WHERE id = ?",
            [id]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Mensaje no encontrado." });
        }

        const msg = rows[0];
        const subject = asunto || "Respuesta - Detalles Isabelita";
        const text = cuerpo || `Hola ${msg.nombre},\n\nGracias por contactarnos. Hemos recibido tu mensaje y te responderemos a la brevedad.\n\nCon cariño,\nDetalles Isabelita 🌸`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        await transporter.sendMail({
            from: `"Detalles Isabelita" <${emailUser}>`,
            to: msg.email,
            subject,
            text,
        });

        res.json({ mensaje: "Respuesta enviada correctamente." });
    } catch (error) {
        console.error("Error enviando respuesta:", error);
        if (error.code === "EAUTH") {
            return res.status(503).json({
                error: "Error de autenticación del correo. Verifica EMAIL_USER y EMAIL_PASS (usa Contraseña de aplicación de Gmail)."
            });
        }
        res.status(500).json({
            error: error.message || "No se pudo enviar el correo. Intenta más tarde."
        });
    }
};
