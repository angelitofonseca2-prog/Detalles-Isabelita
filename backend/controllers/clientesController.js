import db from "../db/db.js";

/* ===============================
   🔍 VALIDAR FORMATO DE CÉDULA
================================ */
/* ===============================
   🔍 VALIDAR FORMATO DE CÉDULA ECUATORIANA
================================ */
function validarCedula(cedula) {
  if (!cedula || cedula.length !== 10) return false;
  const digits = cedula.split('').map(Number);
  const prov = digits[0] * 10 + digits[1];
  if (prov < 1 || prov > 24) return false;
  if (digits[2] > 5) return false;

  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = digits[i] * coef[i];
    if (val >= 10) val -= 9;
    suma += val;
  }
  const digitoVerificador = digits[9];
  const decenaSuperior = Math.ceil(suma / 10) * 10;
  let resultado = decenaSuperior - suma;
  if (resultado === 10) resultado = 0;

  return resultado === digitoVerificador;
}


/* ===============================
   📋 OBTENER TODOS LOS CLIENTES
   (ruta publica) checkout
================================ */
// =====================================================
// 🔓 OBTENER CLIENTE PÚBLICO POR CÉDULA (SIN AUTH)
// =====================================================
export const obtenerClientePublico = async (req, res) => {
  try {
    const { cedula } = req.params;

    if (!cedula) {
      return res.status(400).json({ error: "Cédula requerida" });
    }

    const [rows] = await db.query(
      `
      SELECT
        nombre,
        telefono,
        correo,
        direccion
      FROM clientes
      WHERE cedula = ?
      LIMIT 1
      `,
      [cedula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("❌ Error obtenerClientePublico:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};



/* ===============================
   📋 OBTENER TODOS LOS CLIENTES
   (SELECT explícito – producción)
================================ */
export const obtenerClientes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cedula, nombre, correo, telefono, direccion
      FROM clientes
      ORDER BY nombre ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/* ===============================
   📌 OBTENER CLIENTE POR CÉDULA
================================ */
export const obtenerClientePorCedula = async (req, res) => {
  try {
    const { cedula } = req.params;

    // Permitimos consultar aunque sea invalida, solo validamos longitud para evitar querys absurdos
    if (!cedula) {
      return res.status(400).json({ error: "Cédula inválida" });
    }

    const [rows] = await db.query(
      `SELECT cedula, nombre, correo, telefono, direccion
       FROM clientes
       WHERE cedula = ?`,
      [cedula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/* ===============================
   🧾 CREAR NUEVO CLIENTE
================================ */
export const crearCliente = async (req, res) => {
  try {
    let { cedula, nombre, correo, telefono, direccion } = req.body;

    // 🔒 Normalización
    cedula = cedula?.trim();
    nombre = nombre?.trim().toUpperCase();
    correo = correo?.trim().toUpperCase();
    telefono = telefono?.trim();
    direccion = direccion?.trim().toUpperCase();

    // 🔒 Validaciones obligatorias
    if (!cedula || !nombre || !correo || !telefono || !direccion) {
      return res.status(400).json({ error: "Campos incompletos" });
    }

    if (!validarCedula(cedula)) {
      return res.status(400).json({ error: "Cédula Ecuatoriana inválida" });
    }

    // 🔒 Validar duplicados (cédula o correo)
    const [existe] = await db.query(
      `SELECT cedula FROM clientes WHERE cedula = ? OR correo = ?`,
      [cedula, correo]
    );

    if (existe.length > 0) {
      return res.status(409).json({
        error: "La cédula o el correo ya están registrados"
      });
    }

    await db.query(
      `INSERT INTO clientes (cedula, nombre, correo, telefono, direccion)
       VALUES (?, ?, ?, ?, ?)`,
      [cedula, nombre, correo, telefono, direccion]
    );

    res.status(201).json({ mensaje: "Cliente registrado con éxito" });
  } catch (error) {
    console.error("Error al registrar cliente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/* ===============================
   ✏️ ACTUALIZAR CLIENTE (Con cambio de cédula y transacción)
================================ */
export const actualizarCliente = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { cedula } = req.params; // Cédula anterior
    let { nuevaCedula, nombre, correo, telefono, direccion } = req.body;

    // Si no envían nuevaCedula, asumimos que es la misma
    if (!nuevaCedula) nuevaCedula = cedula;

    // 🔒 Normalización
    nuevaCedula = nuevaCedula?.trim();
    nombre = nombre?.trim().toUpperCase();
    correo = correo?.trim().toUpperCase();
    telefono = telefono?.trim();
    direccion = direccion?.trim().toUpperCase();

    if (!validarCedula(nuevaCedula)) {
      return res.status(400).json({ error: "La nueva cédula es inválida" });
    }

    if (!nombre || !correo || !telefono || !direccion) {
      return res.status(400).json({ error: "Campos incompletos" });
    }

    await conn.beginTransaction();

    // 1. Verificar existencia del cliente original
    const [original] = await conn.query(
      `SELECT cedula FROM clientes WHERE cedula = ? FOR UPDATE`,
      [cedula]
    );

    if (original.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    // 2. Si la cédula cambia, verificar que la nueva no exista ya
    if (nuevaCedula !== cedula) {
      const [duplicado] = await conn.query(
        `SELECT cedula FROM clientes WHERE cedula = ?`,
        [nuevaCedula]
      );
      if (duplicado.length > 0) {
        await conn.rollback();
        return res.status(409).json({ error: "La nueva cédula ya está registrada por otro cliente" });
      }
    }

    // 3. Validar correo duplicado (excluyendo al cliente actual: 'cedula' o 'nuevaCedula' da igual pq validamos arriba)
    // Pero ojo: si cambio la cédula, el registro con 'cedula' dejará de existir.
    // Lo importante es que no choque con *otros*
    const [correoDuplicado] = await conn.query(
      `SELECT cedula FROM clientes WHERE correo = ? AND cedula <> ?`,
      [correo, cedula]
    );

    if (correoDuplicado.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: "El correo ya está registrado" });
    }

    // 4. Actualizar datos.
    // Si cambia la cédula, debemos actualizar pedidos también.
    // Usamos SET foreign_key_checks=0 para evitar bloqueos si no hay ON UPDATE CASCADE
    if (nuevaCedula !== cedula) {
      await conn.query(`SET foreign_key_checks = 0`);

      // Actualizar cliente
      await conn.query(
        `UPDATE clientes
         SET cedula = ?, nombre = ?, correo = ?, telefono = ?, direccion = ?
         WHERE cedula = ?`,
        [nuevaCedula, nombre, correo, telefono, direccion, cedula]
      );

      // Actualizar referencias en pedidos
      await conn.query(
        `UPDATE pedidos SET cedula_cliente = ? WHERE cedula_cliente = ?`,
        [nuevaCedula, cedula]
      );

      await conn.query(`SET foreign_key_checks = 1`);

    } else {
      // Solo actualizar campos normales
      await conn.query(
        `UPDATE clientes
         SET nombre = ?, correo = ?, telefono = ?, direccion = ?
         WHERE cedula = ?`,
        [nombre, correo, telefono, direccion, cedula]
      );
    }

    await conn.commit();
    res.json({ mensaje: "Cliente actualizado correctamente" });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   ❌ ELIMINAR CLIENTE
================================ */
export const eliminarCliente = async (req, res) => {
  try {
    const { cedula } = req.params;

    // Permitir eliminar aunque la cédula sea inválida (corrección de datos antiguos)
    if (!cedula) {
      return res.status(400).json({ error: "Cédula requerida" });
    }

    const [result] = await db.query(
      `DELETE FROM clientes WHERE cedula = ?`,
      [cedula]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json({ mensaje: "Cliente eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);

    // 🔒 Manejo de clave foránea (cliente tiene pedidos)
    if (error.errno === 1451) {
      return res.status(409).json({
        error: "No se puede eliminar el cliente porque tiene registros asociados (ej. Pedidos). Intente cambiar su estado o eliminar primero los registros dependientes."
      });
    }

    res.status(500).json({ error: "Error interno del servidor al eliminar cliente" });
  }
};

/* ===============================
   🔍 VERIFICAR CLIENTE EXISTENTE
================================ */
export const verificarCliente = async (req, res) => {
  try {
    const { cedula } = req.params;

    if (!validarCedula(cedula)) {
      return res.status(400).json({ error: "Cédula inválida" });
    }

    const [rows] = await db.query(
      `SELECT nombre, correo, telefono, direccion
       FROM clientes
       WHERE cedula = ?`,
      [cedula]
    );

    if (rows.length > 0) {
      res.json({ existe: true, ...rows[0] });
    } else {
      res.json({ existe: false });
    }
  } catch (error) {
    console.error("Error al verificar cliente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/* =====================================================
   🔍 BUSCAR CLIENTES POR NOMBRE O CÉDULA (PÚBLICO)
===================================================== */
export const buscarClientesPublico = async (req, res) => {
  try {
    const { termino } = req.params;

    if (!termino || termino.trim().length < 3) {
      return res.status(400).json({ error: "Término de búsqueda muy corto" });
    }

    const [rows] = await db.query(
      `
      SELECT
        cedula,
        nombre,
        telefono,
        correo,
        direccion
      FROM clientes
      WHERE nombre LIKE ? OR cedula LIKE ?
      LIMIT 10
      `,
      [`%${termino}%`, `%${termino}%`]
    );

    res.json(rows);

  } catch (error) {
    console.error("❌ Error buscarClientesPublico:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
