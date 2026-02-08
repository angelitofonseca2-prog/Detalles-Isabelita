import db from "../db/db.js";

/* =====================================================
   📋 OBTENER TODOS LOS PEDIDOS (ADMIN)
===================================================== */
export const obtenerPedidos = async (req, res) => {
  try {
    const { desde, hasta, estado } = req.query;

    let query = `
      SELECT
        p.id,
        p.cedula_cliente,
        c.nombre AS nombre_cliente,
        p.fecha,
        p.total,
        p.estado,
        p.metodo_pago,
        p.fecha_pago,
        p.comprobante,
        p.paypal_transaction_id,
        p.descuento
      FROM pedidos p
      LEFT JOIN clientes c ON p.cedula_cliente = c.cedula
      WHERE 1=1
    `;

    const values = [];

    if (desde) {
      query += ` AND fecha >= ?`;
      values.push(`${desde} 00:00:00`);
    }

    if (hasta) {
      query += ` AND fecha <= ?`;
      values.push(`${hasta} 23:59:59`);
    }

    if (estado && estado !== "todos") {
      query += ` AND estado = ?`;
      values.push(estado);
    }

    query += ` ORDER BY fecha DESC`;

    const [rows] = await db.query(query, values);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
};

/* =====================================================
   🧾 CREAR PEDIDO (TRANSFERENCIA / EFECTIVO)
   ✅ SIN HARD-CODING: precios desde BD + descuento mayor
   ✅ SIN pedidos huérfanos: valida stock antes de insertar
===================================================== */
export const crearPedido = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      cedula_cliente,
      items,
      detalles,
      metodo_pago: metodoPagoBody,
      metodoPago,
    } = req.body;

    // Aceptar ambos nombres: items (antiguo) o detalles (frontend actual)
    const lineas = Array.isArray(items) && items.length ? items : (Array.isArray(detalles) ? detalles : []);

    // Aceptar ambos nombres: metodo_pago o metodoPago
    const metodo_pago = (metodoPagoBody || metodoPago || "").toString().trim().toLowerCase();

    if (!cedula_cliente || !Array.isArray(lineas) || lineas.length === 0) {
      return res.status(400).json({ ok: false, error: "Datos incompletos del pedido" });
    }

    // Métodos permitidos en este endpoint (PayPal tiene su flujo propio)
    const METODOS_PERMITIDOS = new Set(["transferencia", "efectivo"]);
    if (!METODOS_PERMITIDOS.has(metodo_pago)) {
      return res.status(400).json({ ok: false, error: "Método de pago inválido" });
    }

    await conn.beginTransaction();

    /* ======================================================
       1) VALIDAR STOCK + CALCULAR TOTALES (SIN HARD-CODING)
       - Precio siempre desde BD (producción)
       - Descuento: mayor entre (monto, cantidad, producto)
    ====================================================== */
    let totalBruto = 0;
    let cantidadTotal = 0;
    let descuentoProductoTotal = 0;

    // Normalizar lineas y validar estructura
    const lineasNorm = [];

    for (const raw of lineas) {
      const producto_id = Number(raw.producto_id ?? raw.id);
      const cantidad = Number(raw.cantidad);

      if (!Number.isFinite(producto_id) || !Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error("Datos incompletos del pedido");
      }

      // Lock de stock (evita pedidos huérfanos)
      const [prodRows] = await conn.query(
        `SELECT id, precio, stock, descuento_producto
         FROM productos
         WHERE id = ?
         FOR UPDATE`,
        [producto_id]
      );

      if (!prodRows.length) {
        throw new Error("Producto no existe");
      }

      const prod = prodRows[0];
      const stockBD = Number(prod.stock);
      const precioBD = Number(prod.precio);

      if (!Number.isFinite(stockBD) || !Number.isFinite(precioBD)) {
        throw new Error("Datos inválidos del producto");
      }

      if (cantidad > stockBD) {
        // Importante: rollback (no debe quedar pedido creado)
        await conn.rollback();
        return res.status(400).json({
          ok: false,
          error: `Stock insuficiente para el producto ${producto_id} (disponible: ${stockBD})`,
        });
      }

      const subtotal = cantidad * precioBD;
      totalBruto += subtotal;
      cantidadTotal += cantidad;

      const porcentajeProducto = Number(prod.descuento_producto || 0);
      if (porcentajeProducto > 0) {
        descuentoProductoTotal += subtotal * (porcentajeProducto / 100);
      }

      lineasNorm.push({
        producto_id,
        cantidad,
        precio_unitario: precioBD,
        subtotal,
      });
    }

    // Regla descuento por monto
    let porcentajeMonto = 0;
    if (totalBruto >= 200) porcentajeMonto = 15;
    else if (totalBruto >= 100) porcentajeMonto = 8;
    else if (totalBruto >= 50) porcentajeMonto = 5;

    const descuentoMonto = totalBruto * (porcentajeMonto / 100);

    // Regla descuento por cantidad (total de items)
    let porcentajeCantidad = 0;
    if (cantidadTotal > 20) porcentajeCantidad = 15;
    else if (cantidadTotal > 10) porcentajeCantidad = 10;
    else if (cantidadTotal > 5) porcentajeCantidad = 5;

    const descuentoCantidad = totalBruto * (porcentajeCantidad / 100);

    // Elegir el mayor descuento
    const candidatos = [
      { tipo: "producto", valor: descuentoProductoTotal },
      { tipo: "monto", valor: descuentoMonto },
      { tipo: "cantidad", valor: descuentoCantidad },
    ].filter(d => Number.isFinite(d.valor) && d.valor > 0);

    const mejor = candidatos.sort((a, b) => b.valor - a.valor)[0] || { tipo: "ninguno", valor: 0 };

    const descuentoAplicado = Number(mejor.valor.toFixed(2));
    const totalFinal = Number((totalBruto - descuentoAplicado).toFixed(2));

    /* ======================================================
       2) CREAR PEDIDO (estado según método)
       - transferencia: pendiente_validacion
       - efectivo: pagado + fecha_pago NOW()
    ====================================================== */
    /* ======================================================
       2) CREAR PEDIDO (estado según método)
       - transferencia: pendiente_validacion
       - efectivo: pagado directamente (ATÓMICO)
    ====================================================== */
    const estado =
      metodo_pago === "transferencia"
        ? "pendiente_validacion"
        : "pagado";

    const [pedidoResult] = await conn.query(
      `
      INSERT INTO pedidos
      (cedula_cliente, total, estado, metodo_pago, descuento, fecha, fecha_pago)
      VALUES (?, ?, ?, ?, ?, NOW(), ${metodo_pago === "efectivo" ? "NOW()" : "NULL"})
      `,
      [cedula_cliente, totalFinal, estado, metodo_pago, descuentoAplicado]
    );

    const pedidoId = pedidoResult.insertId;

    /* ======================================================
       3) INSERTAR DETALLE + DESCONTAR STOCK
    ====================================================== */
    for (const item of lineasNorm) {
      await conn.query(
        `
        INSERT INTO detalle_pedido
        (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
        `,
        [pedidoId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]
      );

      await conn.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [item.cantidad, item.producto_id]
      );
    }

    await conn.commit();

    // Respuesta compatible con frontend viejo y nuevo
    return res.status(201).json({
      ok: true,
      mensaje: "Pedido creado correctamente",
      pedidoId,
      pedido_id: pedidoId,
      totalFinal,
      descuentoAplicado,
      tipoDescuento: mejor.tipo,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error al crear pedido:", error);
    return res.status(500).json({ ok: false, error: error.message || "No se pudo crear el pedido. Intente nuevamente." });
  } finally {
    conn.release();
  }
};

/* =====================================================
   🧾 CREAR PEDIDO PAYPAL (CLIENTE)
===================================================== */
/* =====================================================
   🧾 CREAR PEDIDO PAYPAL (CLIENTE)
===================================================== */
export const crearPedidoPaypal = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { cedula_cliente, items, paypal_transaction_id } = req.body;

    // 1) Validaciones duras
    if (!cedula_cliente || !items || items.length === 0) {
      return res.status(400).json({ ok: false, error: "Datos incompletos del pedido" });
    }
    if (!paypal_transaction_id) {
      return res.status(400).json({ ok: false, error: "paypal_transaction_id es requerido" });
    }

    await conn.beginTransaction();

    let totalBruto = 0;
    let cantidadTotal = 0;
    let descuentoProductoTotal = 0;

    // 2) Calcular totales y validar stock (bloqueo FOR UPDATE)
    for (const item of items) {
      const [productoRows] = await conn.query(
        "SELECT precio, descuento_producto, stock FROM productos WHERE id = ? FOR UPDATE",
        [item.id]
      );

      if (productoRows.length === 0) throw new Error("Producto no encontrado");

      const producto = productoRows[0];
      if (producto.stock < item.cantidad) throw new Error("Stock insuficiente");

      const subtotal = item.cantidad * producto.precio;
      totalBruto += subtotal;
      cantidadTotal += item.cantidad;

      if (producto.descuento_producto > 0) {
        descuentoProductoTotal += subtotal * (producto.descuento_producto / 100);
      }
    }

    // 3) Descuento por monto
    let porcentajeMonto = 0;
    if (totalBruto >= 200) porcentajeMonto = 15;
    else if (totalBruto >= 100) porcentajeMonto = 8;
    else if (totalBruto >= 50) porcentajeMonto = 5;

    const descuentoMonto = totalBruto * (porcentajeMonto / 100);

    // 4) Descuento por cantidad
    let porcentajeCantidad = 0;
    if (cantidadTotal > 20) porcentajeCantidad = 15;
    else if (cantidadTotal > 10) porcentajeCantidad = 10;
    else if (cantidadTotal > 5) porcentajeCantidad = 5;

    const descuentoCantidad = totalBruto * (porcentajeCantidad / 100);

    // 5) Elegir mejor descuento
    const descuentos = [
      { tipo: "producto", valor: descuentoProductoTotal },
      { tipo: "monto", valor: descuentoMonto },
      { tipo: "cantidad", valor: descuentoCantidad }
    ];
    const mejorDescuento = descuentos.sort((a, b) => b.valor - a.valor)[0];
    const totalFinal = totalBruto - mejorDescuento.valor;

    // 6) Insertar pedido (CON fecha_pago y paypal_transaction_id)
    const [pedidoResult] = await conn.query(
      `
      INSERT INTO pedidos (
        cedula_cliente,
        total,
        estado,
        metodo_pago,
        fecha,
        fecha_pago,
        paypal_transaction_id,
        descuento
      )
      VALUES (?, ?, 'pagado', 'paypal', NOW(), NOW(), ?, ?)
      `,
      [cedula_cliente, totalFinal, paypal_transaction_id, mejorDescuento.valor]
    );

    const pedidoId = pedidoResult.insertId;

    // 7) Insertar detalle + actualizar stock
    for (const item of items) {
      const [productoRows] = await conn.query(
        "SELECT precio, stock FROM productos WHERE id = ? FOR UPDATE",
        [item.id]
      );

      const producto = productoRows[0];

      await conn.query(
        `
        INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
        `,
        [pedidoId, item.id, item.cantidad, producto.precio, item.cantidad * producto.precio]
      );

      await conn.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [item.cantidad, item.id]
      );
    }

    // 8) Commit (recién aquí)
    await conn.commit();

    // 9) Responder AL FINAL (con lo que necesita el frontend)
    return res.status(201).json({
      ok: true,
      id: pedidoId,
      pedidoId,
      totalFinal,
      paypal_transaction_id,
      descuentoAplicado: mejorDescuento.valor,
      tipoDescuento: mejorDescuento.tipo
    });

  } catch (error) {
    await conn.rollback();
    console.error("Error al crear pedido PayPal:", error);
    return res.status(500).json({ ok: false, error: error.message || "No se pudo crear el pedido" });
  } finally {
    conn.release();
  }
};


/* =====================================================
   ✅ VALIDAR PAGO (ADMIN)
===================================================== */
export const validarPago = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE pedidos
      SET estado = 'pagado', fecha_pago = NOW()
      WHERE id = ? AND estado IN ('pendiente_pago', 'pendiente_validacion')
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "El pedido no está en un estado válido para ser validado (o no existe)." });
    }

    res.json({ mensaje: "Pago validado correctamente" });
  } catch (error) {
    console.error("Error al validar pago:", error);
    res.status(500).json({ error: "Error al validar pago" });
  }
};

/* =====================================================
    PAGAR PEDIDO (CON COMPROBANTE SUBIDO POR CLIENTE)
===================================================== */
export const pagarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "ID requerido" });

    const comprobanteUrl = req.file?.secure_url || req.file?.url || req.file?.path || null;

    if (!comprobanteUrl) {
      return res.status(400).json({ error: "Comprobante requerido" });
    }

    const [result] = await db.query(
      `
      UPDATE pedidos
      SET
        comprobante = ?,
        fecha_pago = NOW(),
        metodo_pago = 'transferencia',
        estado = 'pendiente_validacion'
      WHERE id = ?
        AND estado IN ('pendiente_pago','pendiente_validacion')
      `,
      [comprobanteUrl, id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Pedido no válido para subir comprobante" });
    }

    return res.json({ ok: true, mensaje: "Comprobante registrado. Pendiente de validación." });
  } catch (error) {
    console.error("Error en pagarPedido:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


/* =====================================================
   ❌ CANCELAR PEDIDO (ADMIN)
===================================================== */
export const cancelarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE pedidos
      SET estado = 'cancelado'
      WHERE id = ? AND estado NOT IN ('pagado', 'cancelado')
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "No se puede cancelar este pedido. Verifique que no esté ya pagado o cancelado." });
    }

    res.json({ mensaje: "Pedido cancelado correctamente" });
  } catch (error) {
    console.error("Error al cancelar pedido:", error);
    res.status(500).json({ error: "Error al cancelar pedido" });
  }
};

/* =====================================================
   💵 PAGO EN EFECTIVO (ADMIN)
===================================================== */
export const pagarEnEfectivo = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE pedidos
      SET estado = 'pagado', metodo_pago = 'efectivo', fecha_pago = IFNULL(fecha_pago, NOW())
      WHERE id = ? AND estado IN ('pendiente_pago', 'pendiente_validacion', 'pagado')
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Pedido no válido para efectivo" });
    }

    res.json({ mensaje: "Pedido marcado como pagado en efectivo" });
  } catch (error) {
    console.error("Error pago efectivo:", error);
    res.status(500).json({ error: "Error al procesar efectivo" });
  }
};

export const obtenerPedidoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID de pedido requerido" });
    }

    // 1) Obtener cabecera del pedido e información del cliente
    const [pedidoRows] = await db.query(
      `
      SELECT 
        p.id,
        p.cedula_cliente,
        c.nombre AS nombre_cliente,
        p.fecha,
        p.total,
        p.estado,
        p.metodo_pago,
        p.fecha_pago,
        p.comprobante,
        p.descuento
      FROM pedidos p
      LEFT JOIN clientes c ON p.cedula_cliente = c.cedula
      WHERE p.id = ?
      `,
      [id]
    );

    if (pedidoRows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // 2) Obtener detalles del pedido (productos)
    const [detalleRows] = await db.query(
      `
      SELECT 
        dp.cantidad,
        dp.precio_unitario,
        dp.subtotal,
        pr.nombre AS nombre_producto
      FROM detalle_pedido dp
      JOIN productos pr ON dp.producto_id = pr.id
      WHERE dp.pedido_id = ?
      `,
      [id]
    );

    res.json({
      ...pedidoRows[0],
      detalles: detalleRows
    });

  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
