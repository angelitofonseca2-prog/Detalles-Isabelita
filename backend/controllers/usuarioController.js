// backend/controllers/usuarioController.js
import db from "../db/db.js";
import bcrypt from "bcrypt";

// 1. Obtener datos del perfil actual
export const obtenerPerfil = async (req, res) => {
    try {
        const idUsuario = req.user.id; // Extraído del token por el middleware

        const [rows] = await db.query(
            "SELECT id, nombre, email, rol, cedula FROM usuarios WHERE id = ?",
            [idUsuario]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error en obtenerPerfil:", error);
        res.status(500).json({ error: "Error al obtener datos del perfil." });
    }
};

// 2. Actualizar perfil (con hashing automático si hay nueva clave)
export const actualizarPerfil = async (req, res) => {
    const idUsuario = req.user.id;
    const { nombre, email, password } = req.body;

    if (!nombre || !email) {
        return res.status(400).json({ error: "Nombre y email son obligatorios." });
    }

    try {
        let sql = "UPDATE usuarios SET nombre = ?, email = ?";
        let params = [nombre, email];

        // 🛡️ HASHING AUTOMÁTICO: Solo si el usuario envió una nueva contraseña
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            sql += ", password_hash = ?";
            params.push(hash);
            console.log("🔐 Nueva contraseña detectada: Generando hash automáticamente...");
        }

        sql += " WHERE id = ?";
        params.push(idUsuario);

        const [result] = await db.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "No se pudo actualizar el perfil." });
        }

        res.json({
            mensaje: "Perfil actualizado correctamente.",
            nombre: nombre // Lo devolvemos para actualizar la UI
        });
    } catch (error) {
        console.error("Error en actualizarPerfil:", error);
        res.status(500).json({ error: "Error interno al actualizar perfil." });
    }
};

// 3. Listar todos los usuarios (Solo Admin)
export const listarUsuarios = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, nombre, email, rol, cedula, activo, creado_en FROM usuarios ORDER BY creado_en DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error en listarUsuarios:", error);
        res.status(500).json({ error: "Error al obtener la lista de usuarios." });
    }
};

// 4. Crear nuevo usuario (Solo Admin)
export const crearUsuario = async (req, res) => {
    const { nombre, email, password, rol, cedula } = req.body;

    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ error: "Nombre, email, password y rol son obligatorios." });
    }

    try {
        // Verificar si el email ya existe
        const [existe] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
        if (existe.length > 0) {
            return res.status(400).json({ error: "El correo electrónico ya está registrado." });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            "INSERT INTO usuarios (nombre, email, password_hash, rol, cedula, activo) VALUES (?, ?, ?, ?, ?, 1)",
            [nombre, email, hash, rol, cedula || null]
        );

        res.status(201).json({
            mensaje: "Usuario creado correctamente.",
            id: result.insertId
        });
    } catch (error) {
        console.error("Error en crearUsuario:", error);
        res.status(500).json({ error: "Error interno al crear usuario." });
    }
};

// 5. Actualizar usuario como Admin (Incluye cambio de estado)
export const actualizarUsuarioAdmin = async (req, res) => {
    const { id } = req.params;
    const { nombre, email, rol, activo, password } = req.body;

    try {
        let sql = "UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ?";
        let params = [nombre, email, rol, activo];

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            sql += ", password_hash = ?";
            params.push(hash);
        }

        sql += " WHERE id = ?";
        params.push(id);

        await db.query(sql, params);
        res.json({ mensaje: "Usuario actualizado correctamente." });
    } catch (error) {
        console.error("Error en actualizarUsuarioAdmin:", error);
        res.status(500).json({ error: "Error al actualizar la información del usuario." });
    }
};

// 6. Eliminar usuario (Solo Admin)
export const eliminarUsuario = async (req, res) => {
    const { id } = req.params;
    const idAdminLogueado = req.user.id;

    if (parseInt(id) === idAdminLogueado) {
        return res.status(400).json({ error: "No puedes eliminar tu propia cuenta de administrador." });
    }

    try {
        await db.query("DELETE FROM usuarios WHERE id = ?", [id]);
        res.json({ mensaje: "Usuario eliminado correctamente." });
    } catch (error) {
        console.error("Error en eliminarUsuario:", error);

        // 🔒 Manejo de clave foránea (usuario tiene registros asociados)
        if (error.errno === 1451) {
            return res.status(409).json({
                error: "No se puede eliminar el usuario porque tiene registros dependientes (ej. Gestión de pedidos). Considere desactivarlo."
            });
        }

        res.status(500).json({ error: "Error al eliminar el usuario." });
    }
};
