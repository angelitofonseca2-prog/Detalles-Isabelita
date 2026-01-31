import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

export const loginLimiter = rateLimit({
  windowMs: isProd
    ? 15 * 60 * 1000   // 15 min producción
    : 30 * 1000,       // 30 segundos desarrollo

  max: isProd
    ? 10               // producción
    : 5,               // desarrollo

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    mensaje: isProd
      ? "Demasiados intentos de login. Intente nuevamente en 15 minutos."
      : "Demasiados intentos. Espere 30 segundos (modo desarrollo)."
  }
});
