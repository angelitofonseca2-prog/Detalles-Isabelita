import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            mensaje: "Token requerido"
        });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            mensaje: "Formato de token inválido"
        });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Payload seguro
        req.user = {
            id: decoded.id,
            rol: decoded.rol,
            nombre: decoded.nombre
        };

        next();

    } catch (error) {

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                mensaje: "Token expirado"
            });
        }

        return res.status(401).json({
            mensaje: "Token inválido"
        });
    }
};
