export const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);

  // Error controlado
  if (err.status) {
    return res.status(err.status).json({
      mensaje: err.mensaje || "Error"
    });
  }

  // Error no controlado
  res.status(500).json({
    mensaje: "Error interno del servidor"
  });
};
