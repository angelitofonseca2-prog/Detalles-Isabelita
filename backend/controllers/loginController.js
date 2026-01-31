import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../db/db.js";

export const loginAdmin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ? AND rol = 'admin'",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    const admin = rows[0];

    // 🔒 Verificar si la cuenta está activa
    if (admin.activo === 0) {
      return res.status(403).json({ mensaje: "Tu cuenta ha sido desactivada. Contacta al administrador." });
    }
    const valido = await bcrypt.compare(password, admin.password_hash);

    if (!valido) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    console.log("JWT_SECRET EN LOGIN:", process.env.JWT_SECRET);

    const token = jwt.sign(
      {
        id: admin.id,
        rol: admin.rol,
        nombre: admin.nombre   // ✅ CORRECTO
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "2h",
        issuer: "floreria-isabelita"
      }
    );

    //    res.json({ token });
    res.json({
      token,
      usuario: {
        id: admin.id,
        nombre: admin.nombre,   // ✅ CORRECTO
        rol: admin.rol
      }
    });


  } catch (error) {
    next(error); // 👈 error técnico → middleware global
  }
};
