// ===============================
// 📦 CONFIGURACIÓN DE CONEXIÓN MYSQL
// ===============================
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la carpeta backend (mismo que server.js)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// ✅ Crear pool de conexiones (password vacío si no se define DB_PASS)
// En Windows, usar 127.0.0.1 evita timeouts si "localhost" se resuelve por IPv6
const dbHost = process.env.DB_HOST || "localhost";
const pool = mysql.createPool({
  host: dbHost === "localhost" ? "127.0.0.1" : dbHost,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : "root",
  database: process.env.DB_NAME || "floreria_db",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  connectTimeout: 15000,
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
    console.error("❌ Error al conectar a MySQL:", err.message || err);
    if (err.code === "ETIMEDOUT" || err.errno === "ETIMEDOUT") {
      console.error("   → Comprueba que MySQL esté ejecutándose (Servicios de Windows o MySQL Workbench).");
    }
  });

// Exportar como default
export default pool;
