// ===============================
// 📦 CONFIGURACIÓN DE CONEXIÓN MYSQL
// ===============================
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Cargar variables de entorno (.env)
dotenv.config();

// Rutas base
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root",
  database: process.env.DB_NAME || "floreria_db",
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ⏰ Fijar zona horaria de la sesión (Ecuador UTC-5)
pool.on("connection", (conn) => {
  conn.promise()
    .query("SET time_zone = '-05:00'")
    .catch((err) => {
      console.error("❌ Error configurando zona horaria MySQL:", err);
    });
});

// Mensaje de confirmación
pool
  .getConnection()
  .then(() => {
    console.log("✅ Conexión a MySQL establecida correctamente.");
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MySQL:", err);
  });

// Exportar como default
export default pool;
