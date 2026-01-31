// backend/middleware/authJWT.js
import jwt from "jsonwebtoken";

export function verificarJWT(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token requerido" });
  }

  const token = auth.split(" ")[1];

  try {
    const payload = jwt.verify(
      token, process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "floreria-isabelita"
      }
    );

    req.usuario = {
      id: payload.id,
      rol: payload.rol,
      nombre: payload.nombre // si existe en el payload
    };

    return next();

  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}
