import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "admin123",
  database: "detalles_isabelita",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
