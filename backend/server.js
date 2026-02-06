import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar SIEMPRE backend/.env sin importar desde dónde se ejecute el proyecto
dotenv.config({
  path: path.join(__dirname, ".env")
});


// --- ESM server.js ---
import express from "express";
import cors from "cors";
const app = express();
import rateLimit from "express-rate-limit";
import compression from "compression";

// 🚦 Railway/Proxy: confiar en X-Forwarded-For
app.set("trust proxy", 1);
//✅ CSP CORRECTA PARA PAYPAL (sandbox + prod)
import helmet from "helmet";


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                 // 10 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensaje: "Demasiados intentos de login. Intente nuevamente en 15 minutos."
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000,                // 1000 requests por IP (aumentado para evitar bloqueos en cargas de imágenes/assets)
  standardHeaders: true,
  legacyHeaders: false
});

// 🔒 Aplica a TODAS las rutas de API (se mueve abajo para excluir static)
// app.use(generalLimiter);


// 🟩 NECESARIOS PARA QUE req.body FUNCIONE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚡ Compresión para acelerar respuestas
app.use(compression());
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim()).filter(Boolean)
  : [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
    // producción:
    // "https://tudominio.com"
  ];

app.use(cors({
  origin: (origin, callback) => {
    // Permite Postman / curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS: origen no permitido"));
  },
  credentials: true
}));


app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "data:", "blob:"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://code.jquery.com",
          "https://www.paypal.com",
          "https://www.paypalobjects.com",
          "https://cdn.datatables.net"
        ],
        scriptSrcAttr: ["'unsafe-inline'"], // 🔓 Necesario para eventos onclick inline

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://cdn.datatables.net",
          "https://fonts.googleapis.com"
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://www.paypalobjects.com"
        ],


        connectSrc: [
          "'self'",
          "data:",
          "blob:",
          "http://localhost:3000",

          // PayPal (sandbox + prod)
          "https://www.sandbox.paypal.com",
          "https://api.sandbox.paypal.com",
          "https://www.paypal.com",
          "https://api.paypal.com",

          // CDNs
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net"
        ],

        frameSrc: [
          "'self'",
          "https://www.google.com",
          "https://www.paypal.com",
          "https://www.sandbox.paypal.com"
        ],


        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com"
        ]
      }
    }
  })
);



// Rutas API (también en ESM)
import productosRoutes from "./routes/productos.js";
import categoriasRoutes from "./routes/categorias.js";
import clientesRoutes from "./routes/clientes.js";
import pedidosRoutes from "./routes/pedidos.js";
import pagosRoutes from "./routes/pagos.js";
import paypalRoutes from "./routes/paypal.js";
import descuentosRoutes from "./routes/descuentos.js";
import productosDescuentoRoutes from "./routes/productos_descuento.js";
import contactoRoutes from "./routes/contacto.js";
import usuarioRoutes from "./routes/usuarios.js";


// --------- ESTÁTICOS ---------
const staticOptions = {
  maxAge: "7d",
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache");
    }
    // CSS y JS: permitir cache pero validar con servidor (evita caché vieja en deploys)
    if (filePath.endsWith(".css") || filePath.endsWith(".js")) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    }
  }
};

// 1) Frontend /public (css, js, index.html, etc.)
app.use(express.static(path.join(__dirname, "../public"), staticOptions));

// 3) Comprobantes
app.use(
  "/uploads/comprobantes",
  express.static(path.join(__dirname, "uploads/comprobantes"), { maxAge: "7d", etag: true })
);

// 🔒 Rate Limiting para API solamente (excluye imágenes y estáticos)
app.use("/api", generalLimiter);

import authRoutes from "./routes/auth.js";
app.use("/api/auth", authRoutes);

// --------- API ---------
app.use("/api/productos", productosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/descuentos", descuentosRoutes);
app.use("/api/productos_descuento", productosDescuentoRoutes);
app.use("/api/contacto", contactoRoutes);
app.use("/api/usuarios", usuarioRoutes);



// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// Config pública para frontend (no incluir secretos)
app.get("/api/config", (_req, res) => {
  res.json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
    paypalCurrency: process.env.PAYPAL_CURRENCY || "USD"
  });
});

// Debug de rutas resueltas (útil para verificar paths)
app.get("/debug/paths", (_req, res) => {
  res.json({
    __dirname,
    public: path.join(__dirname, "../public"),
    comprobantes: path.join(__dirname, "uploads/comprobantes"),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
});

import { errorHandler } from "./middleware/errorHandler.js";

// ⬇️ siempre al final
app.use(errorHandler);

console.log("NODE_ENV =", process.env.NODE_ENV);
