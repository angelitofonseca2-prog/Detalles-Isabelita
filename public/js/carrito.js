/*******************************************************
 *  CARRITO.JS – VERSIÓN FINAL (BLOQUE 1 DE 4)
 *  — Render del carrito
 *  — CRUD del carrito
 *  — Validación de stock
 *  — Subtotales (SIN descuentos, esos van en backend)
 *******************************************************/

let pedidoYaCreado = false; // Evitar duplicados en creación de pedido

let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let currentOrderId = null;
let totalConDescuento = 0;
let descuentoAplicado = 0;

/* ======================================================
   GUARDAR CARRITO EN LOCALSTORAGE
====================================================== */
function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    if (typeof window.actualizarContadorCarrito === "function") {
        window.actualizarContadorCarrito();
    }
    window.dispatchEvent(new CustomEvent("carritoActualizado"));
}

/* ======================================================
   AGREGAR PRODUCTO AL CARRITO  ✅ (FALTABA)
====================================================== */
function agregarAlCarrito(producto) {

    const existente = carrito.find(p => p.id === producto.id);

    if (existente) {
        existente.cantidad++;
        existente.subtotal = existente.cantidad * existente.precio;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            cantidad: 1,
            subtotal: Number(producto.precio)
        });
    }

    guardarCarrito();
    renderCarrito();

    Swal.fire({
        icon: "success",
        title: "Producto agregado",
        timer: 900,
        showConfirmButton: false
    });
}

/* ======================================================
   ELIMINAR PRODUCTO DEL CARRITO
====================================================== */
function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    guardarCarrito();
    renderCarrito();
}

/* ======================================================
  CONFIRMAR ELIMINACIÓN DEL CARRITO
====================================================== */
async function confirmarEliminarDelCarrito(id) {
    const item = carrito.find(p => p.id === id);
    const { isConfirmed } = await Swal.fire({
        title: `¿Eliminar ${item?.nombre ?? "este producto"}?`,
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });

    if (!isConfirmed) return;
    eliminarDelCarrito(id);
}

/* ======================================================
   AUMENTAR CANTIDAD
====================================================== */
function aumentarCantidad(id) {
    const item = carrito.find(p => p.id === id);
    if (!item) return;

    item.cantidad++;
    item.subtotal = item.cantidad * Number(item.precio_unitario ?? item.precio);

    guardarCarrito();
    renderCarrito();
}


/* ======================================================
   REDUCIR CANTIDAD
====================================================== */
function reducirCantidad(id) {
    const item = carrito.find(p => p.id === id);
    if (!item) return;

    if (item.cantidad > 1) {
        item.cantidad--;
        item.subtotal = item.cantidad * Number(item.precio_unitario ?? item.precio);
    }

    guardarCarrito();
    renderCarrito();
}


/* ======================================================
   RE-CALCULAR SUBTOTALES + DESCUENTOS
====================================================== */
async function recalcularTotales() {

    // 1) Calcular subtotal bruto
    let total = 0;
    carrito.forEach(item => {
        const precio = Number(item.precio_unitario ?? item.precio);
        item.subtotal = item.cantidad * precio;
        total += item.subtotal;
    });

    // 2) Aplicar descuentos
    const totalFinal = await aplicarDescuentos(total);

    // 3) Mostrar total final
    document.getElementById("totalCarrito").innerText = `$${totalFinal.toFixed(2)}`;

    return totalFinal;
}

/* ======================================================
   CALCULAR DESCUENTOS (VERSIÓN PRODUCCIÓN)
====================================================== */
async function aplicarDescuentos(totalBruto) {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

    let maxDescuento = 0;

    // Variables para el mejor descuento de cada tipo (para fines de depuración/lógica interna)
    let bestGlobalMonto = 0;
    let bestGlobalCantidad = 0;
    let bestProductDiscountTotal = 0; // Total ahorrado por descuentos específicos de producto

    try {
        /* ----------------------------------------------
           OBTENER TODOS LOS DESCUENTOS EN PARALELO
        ---------------------------------------------- */
        const [resDescuentos, resProductosDesc] = await Promise.all([
            fetch("/api/descuentos"),
            fetch("/api/productos_descuento")
        ]);

        if (!resDescuentos.ok || !resProductosDesc.ok) {
            throw new Error("Error obteniendo configuraciones de descuentos");
        }

        const descuentosGenerales = await resDescuentos.json();
        const descuentosProductos = await resProductosDesc.json();

        /* ----------------------------------------------
           1) Descuentos por MONTO (Global)
        ---------------------------------------------- */
        descuentosGenerales
            .filter(d => d.tipo === "monto")
            .forEach(regla => {
                if (totalBruto >= regla.minimo) {
                    bestGlobalMonto = Math.max(bestGlobalMonto, regla.porcentaje);
                }
            });

        /* ----------------------------------------------
           2) Descuentos por CANTIDAD (Global)
        ---------------------------------------------- */
        descuentosGenerales
            .filter(d => d.tipo === "cantidad")
            .forEach(regla => {
                if (totalItems >= regla.minimo) {
                    bestGlobalCantidad = Math.max(bestGlobalCantidad, regla.porcentaje);
                }
            });

        /* ----------------------------------------------
           3) Descuentos por PRODUCTO (Específico)
           Nota: Este descuento se suma por ítem, no es un porcentaje global directo.
           Calculamos cuánto ahorra el usuario con estos descuentos y luego convertimos
           ese ahorro a un "porcentaje efectivo" sobre el total para compararlo con los otros.
        ---------------------------------------------- */
        let ahorroProductos = 0;

        carrito.forEach(item => {
            // Buscamos si este producto tiene descuento específico en la lista devuelta por la API
            // La API devuelve: { id, nombre, precio, descuento }
            const regla = descuentosProductos.find(d => String(d.id) === String(item.id));

            if (regla && regla.descuento > 0) {
                // El descuento aplica sobre el precio unitario de este producto
                const precioTotalItem = item.cantidad * item.precio;
                // regla.descuento es el porcentaje (ej: 10)
                const ahorroItem = (precioTotalItem * regla.descuento) / 100;
                ahorroProductos += ahorroItem;

                // Para depuración
                console.log(`Producto ${item.nombre}: Descuento detectado ${regla.descuento}% (Ahorro: $${ahorroItem})`);
            }
        });

        // Convertimos el ahorro neto en un porcentaje del total bruto para poder comparar
        let porcentajeEfectivoProductos = 0;
        if (totalBruto > 0 && ahorroProductos > 0) {
            porcentajeEfectivoProductos = (ahorroProductos / totalBruto) * 100;
        }


        /* ----------------------------------------------
           4) TOMAR EL MEJOR DESCUENTO
           Comparamos el porcentaje global de monto, cantidad y el "efectivo" de productos.
        ---------------------------------------------- */
        const mejorPorcentaje = Math.max(
            bestGlobalMonto,
            bestGlobalCantidad,
            porcentajeEfectivoProductos
        );

        // Si el ganador es el de productos, el cálculo real es directo (ahorroProductos).
        // Si es global, calculamos sobre el total.

        let valorDescuento = 0;

        if (mejorPorcentaje === porcentajeEfectivoProductos && porcentajeEfectivoProductos > 0) {
            // Ganó el descuento por productos (o empate)
            valorDescuento = ahorroProductos;
            maxDescuento = porcentajeEfectivoProductos; // Guardamos el % efectivo para mostrar
        } else {
            // Ganó un descuento global
            valorDescuento = (totalBruto * mejorPorcentaje) / 100;
            maxDescuento = mejorPorcentaje;
        }


        // Calculamos total final
        let totalConDesc = totalBruto - valorDescuento;

        /* ----------------------------------------------
           5) MENSAJE AL CLIENTE
        ---------------------------------------------- */
        const mensaje = document.getElementById("mensajeDescuento");

        if (valorDescuento > 0) {
            // Mostramos el porcentaje real si es global, o un promedio si es mixto/producto
            // Para UX, si es por productos, podemos decir "Descuentos por productos aplicados"
            let msgTexto = "";
            if (mejorPorcentaje === porcentajeEfectivoProductos) {
                msgTexto = `¡Ahorraste $${valorDescuento.toFixed(2)} con descuentos especiales en productos!`;
            } else {
                msgTexto = `Se aplicó un descuento global del ${maxDescuento}% (-$${valorDescuento.toFixed(2)})`;
            }

            mensaje.innerText = msgTexto;
            mensaje.style.color = "green";
            mensaje.classList.remove("hidden");
        } else {
            mensaje.innerText = "";
            mensaje.classList.add("hidden");
        }

        // Exportar resultados de variables globales
        descuentoAplicado = maxDescuento; // Este será referencial si es por producto
        // descuentoValor se usaba antes? Lo redefinimos por si acaso en el scope global si existía
        // window.descuentoValor = valorDescuento; 

        // Ajustamos la variable global para el pedido
        totalConDescuento = totalConDesc;

        return totalConDesc;

    } catch (err) {
        console.error("Error calculando descuentos:", err);
        // En caso de error, no aplicamos descuento pero dejamos comprar
        document.getElementById("mensajeDescuento").innerText = "";
        return totalBruto;
    }
}

/* ======================================================
   RENDERIZAR CARRITO
====================================================== */
function renderCarrito() {
    const tbody = document.getElementById("tbodyCarrito");
    tbody.innerHTML = "";

    carrito.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
        <td class="p-2 border">${item.nombre}</td>

        <td class="p-2 border">
            $${Number(item.precio_unitario ?? item.precio).toFixed(2)}
        </td>

        <td class="p-2 border text-center">
            <button 
                class="btn-cantidad btn-menos px-2 bg-gray-300 rounded"
                data-id="${item.id}">
                −
            </button>

            <input
                type="number"
                min="1"
                step="1"
                class="input-cantidad mx-2 w-16 text-center border rounded px-2 py-1"
                value="${item.cantidad}"
                data-id="${item.id}"
            />

            <button 
                class="btn-cantidad btn-mas px-2 bg-gray-300 rounded"
                data-id="${item.id}">
                +
            </button>
        </td>

        <td class="p-2 border">
            <span class="subtotal-carrito" data-id="${item.id}">
                $${(item.cantidad * Number(item.precio_unitario ?? item.precio)).toFixed(2)}
            </span>
        </td>

        <td class="p-2 border text-center">
            <button 
                class="btn-eliminar px-3 bg-red-500 text-white rounded"
                data-id="${item.id}">
                🗑
            </button>
        </td>
    `;


        tbody.appendChild(row);
    });

    recalcularTotales();
    actualizarEstadoContinuarCompra();
}

/* ======================================================
  HABILITAR/DESHABILITAR CONTINUAR COMPRA
====================================================== */
function actualizarEstadoContinuarCompra() {
    const btn = document.getElementById("btnContinuar");
    if (!btn) return;

    const sinProductos = carrito.length === 0;
    btn.disabled = sinProductos;
    btn.setAttribute("aria-disabled", sinProductos ? "true" : "false");
    btn.classList.toggle("opacity-50", sinProductos);
    btn.classList.toggle("cursor-not-allowed", sinProductos);

    const seccionCliente = document.getElementById("seccionCliente");
    const seccionPago = document.getElementById("seccionPago");
    if (sinProductos) {
        seccionCliente?.classList.add("hidden");
        seccionPago?.classList.add("hidden");
    }

    const mensajeVacio = document.getElementById("mensajeCarritoVacio");
    mensajeVacio?.classList.toggle("hidden", !sinProductos);
}

/* ======================================================
  ACTUALIZAR CANTIDAD MANUALMENTE
====================================================== */
function actualizarCantidadManual(id, valor, { forzar = false } = {}) {
    const item = carrito.find(p => p.id === id);
    if (!item) return;

    if (valor === "" || valor === null || valor === undefined) {
        if (!forzar) return;
    }

    let cantidad = parseInt(valor, 10);
    if (Number.isNaN(cantidad) || cantidad < 1) {
        cantidad = 1;
    }

    item.cantidad = cantidad;
    item.subtotal = item.cantidad * Number(item.precio_unitario ?? item.precio);

    guardarCarrito();
    actualizarFilaCarrito(id, item.cantidad, item.subtotal);
    recalcularTotales();
}

function actualizarFilaCarrito(id, cantidad, subtotal) {
    const input = document.querySelector(`.input-cantidad[data-id="${id}"]`);
    if (input) input.value = cantidad;

    const subtotalEl = document.querySelector(`.subtotal-carrito[data-id="${id}"]`);
    if (subtotalEl) subtotalEl.innerText = `$${Number(subtotal).toFixed(2)}`;
}


document.addEventListener("DOMContentLoaded", () => {

    // ======================================================
    // 🔐 OCULTAR MÉTODOS EXCLUSIVOS DE ADMINISTRADOR
    // ======================================================
    const rol = localStorage.getItem("rol");

    // Eliminar opción "Efectivo" si el usuario NO es admin
    if (rol !== "admin") {
        $(".metodo-admin").remove();
    }

    // Renderizar carrito al cargar la página
    renderCarrito();
});


/*******************************************************
 *  BLOQUE 2 — FLUJO DEL CLIENTE
 *  — Buscar cliente
 *  — Validar cédula
 *  — Registrar nuevo cliente
 *  — Mostrar formulario
 *  — Avanzar a método de pago
 *******************************************************/

/* ======================================================
   VALIDAR CÉDULA ECUATORIANA
====================================================== */
function validarCedulaEcuatoriana(cedula) {
    if (!/^\d{10}$/.test(cedula)) return false;

    const digitoVerificador = parseInt(cedula[9]);
    let suma = 0;

    for (let i = 0; i < 9; i++) {
        let num = parseInt(cedula[i]);
        if (i % 2 === 0) {
            num *= 2;
            if (num > 9) num -= 9;
        }
        suma += num;
    }

    const val = (10 - (suma % 10)) % 10;
    return val === digitoVerificador;
}

/* ======================================================
   LIMPIAR FORMULARIO DE CLIENTE
====================================================== */
function limpiarFormularioCliente(mantenerCedula = false) {
    if (!mantenerCedula) $("#cedula").val("");
    $("#nombre").val("");
    $("#telefono").val("");
    $("#correo").val("");
    $("#direccion").val("");

    // Habilitar campos para edición (por si estaban bloqueados)
    $("#cedula, #nombre, #telefono, #correo, #direccion").prop("readonly", false).removeClass("bg-gray-100");

    // Resetear estados de UI
    $("#btnGuardarCliente").removeClass("hidden");
    $("#seccionPago").addClass("hidden");
    currentOrderId = null;
}

/* ======================================================
   BUSCAR CLIENTE POR NOMBRE O CÉDULA (NUEVO BUSCADOR)
====================================================== */
const sugerenciasDiv = document.getElementById("sugerenciasClientes");
const cedulaInput = document.getElementById("cedula");
const buscadorClienteInput = document.getElementById("buscadorCliente");
const btnGuardarCliente = document.getElementById("btnGuardarCliente");

function poblarCamposCliente(data) {
    $("#cedula").val(data.cedula ?? "").prop("readonly", true).addClass("bg-gray-100");
    $("#nombre").val(data.nombre ?? "").prop("readonly", true).addClass("bg-gray-100");
    $("#telefono").val(data.telefono ?? "").prop("readonly", true).addClass("bg-gray-100");
    $("#correo").val(data.correo ?? "").prop("readonly", true).addClass("bg-gray-100");
    $("#direccion").val(data.direccion ?? "").prop("readonly", true).addClass("bg-gray-100");

    $("#btnGuardarCliente").addClass("hidden");
    const seccionPago = document.getElementById("seccionPago");
    if (seccionPago) seccionPago.classList.remove("hidden");

    Swal.fire({
        icon: "success",
        title: "Cliente seleccionado",
        timer: 900,
        showConfirmButton: false
    });

    sugerenciasDiv?.classList.add("hidden");
    if (buscadorClienteInput) buscadorClienteInput.value = "";
}

async function buscarClientes(termino) {
    if (!termino || termino.length < 3) {
        sugerenciasDiv.classList.add("hidden");
        // Si el usuario borra la búsqueda, dejamos el formulario en paz
        // para que pueda escribir manualmente si quiere.
        return;
    }

    try {
        const resp = await fetch(`/api/clientes/publico/busqueda/${termino}`);
        const data = await resp.json();

        if (!resp.ok || !data.length) {
            // 🚩 Limpiar el formulario si no hay coincidencias (aquí sí limpiamos todo)
            limpiarFormularioCliente(false);

            sugerenciasDiv.innerHTML = `
                <div class="p-3 text-sm text-gray-500 italic">
                    No se encontraron coincidencias. 
                    <button type="button" class="text-sky-600 font-bold hover:underline ml-1" 
                        onclick="document.getElementById('nombre').focus();">
                        Registrar nuevo cliente
                    </button>
                </div>
            `;
            sugerenciasDiv.classList.remove("hidden");
            return;
        }

        sugerenciasDiv.innerHTML = "";
        data.forEach(cliente => {
            const item = document.createElement("div");
            item.className = "p-3 hover:bg-sky-50 cursor-pointer border-b text-sm transition-colors";
            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold text-sky-900">${cliente.nombre}</span><br>
                        <small class="text-gray-500">Cédula: ${cliente.cedula}</small>
                    </div>
                    <span class="text-xs font-semibold text-sky-600">Seleccionar</span>
                </div>
            `;
            item.onclick = () => poblarCamposCliente(cliente);
            sugerenciasDiv.appendChild(item);
        });
        sugerenciasDiv.classList.remove("hidden");

    } catch (err) {
        console.error("Error buscando clientes:", err);
    }
}

// ⌨️ Evento para el buscador dedicado
if (buscadorClienteInput) {
    buscadorClienteInput.addEventListener("input", function () {
        const valor = this.value.trim();
        buscarClientes(valor);
    });
}

// Evento para el campo de Cédula
if (cedulaInput) {
    cedulaInput.addEventListener("input", function () {
        let ced = this.value.trim();
        if (!/^\d*$/.test(ced)) {
            this.value = ced.replace(/\D/g, "");
            return;
        }
        if (ced.length > 10) {
            this.value = ced.substring(0, 10);
        }
        // Si borra, mostrar botón de guardar por si es nuevo
        if (ced.length < 10) {
            btnGuardarCliente?.classList.remove("hidden");
        }
    });

    // Búsqueda automática al completar 10 dígitos (blur)
    cedulaInput.addEventListener("blur", async function () {
        const ced = this.value.trim();
        if (ced.length === 10) {
            // 👮 VALIDACIÓN DE ALGORITMO (Dígito Verificador)
            if (!validarCedulaEcuatoriana(ced)) {
                Swal.fire({
                    icon: "error",
                    title: "Cédula Inválida",
                    text: "El número de cédula ingresado no es válido en Ecuador.",
                    confirmButtonText: "Corregir"
                });
                return;
            }

            try {
                const resp = await fetch(`/api/clientes/publico/${ced}`);
                const data = await resp.json();

                if (resp.ok && data && !data.error) {
                    poblarCamposCliente({ ...data, cedula: ced });
                } else {
                    // 🚩 CLIENTE NO ENCONTRADO
                    // Mantenemos la cédula actual para que el usuario registre con ella
                    limpiarFormularioCliente(true);

                    Swal.fire({
                        icon: "info",
                        title: "Cliente no encontrado",
                        text: "Por favor, complete los datos para registrar al nuevo cliente.",
                        confirmButtonText: "Entendido"
                    });

                    document.getElementById("nombre").focus();
                }
            } catch (e) { }
        }
    });
}


// Cerrar sugerencias al hacer clic fuera
document.addEventListener("click", (e) => {
    if (e.target.id !== "buscadorCliente" && !sugerenciasDiv?.contains(e.target)) {
        sugerenciasDiv?.classList.add("hidden");
    }
});

/* ======================================================
   GUARDAR NUEVO CLIENTE
====================================================== */
document.getElementById("btnGuardarCliente").addEventListener("click", async () => {
    const cedula = $("#cedula").val().trim();
    const nombre = $("#nombre").val().trim();
    const telefono = $("#telefono").val().trim();
    const correo = $("#correo").val().trim();
    const direccion = $("#direccion").val().trim();

    if (!cedula || !nombre || !telefono || !correo || !direccion) {
        Swal.fire("Error", "Complete todos los campos.", "error");
        return;
    }

    // 👮 ÚLTIMA VALIDACIÓN DE CÉDULA ANTES DE GUARDAR
    if (!validarCedulaEcuatoriana(cedula)) {
        Swal.fire("Error", "La cédula ingresada es inválida.", "error");
        return;
    }

    try {
        const res = await fetch("/api/clientes/publico", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cedula, nombre, telefono, correo, direccion })
        });

        const data = await res.json();

        if (!res.ok) {
            Swal.fire("Error", data.error || "No se pudo registrar el cliente.", "error");
            return;
        }

        Swal.fire({
            icon: "success",
            title: "Cliente registrado",
            timer: 1200,
            showConfirmButton: false
        });
        // 🔥 Mostrar la sección de pago automáticamente después de registrar al cliente
        document.getElementById("seccionPago").classList.remove("hidden");
        document.getElementById("metodoPago").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        $("#btnGuardarCliente").addClass("hidden");

    } catch (err) {
        console.error("Error guardando cliente:", err);
        Swal.fire("Error", "No se pudo registrar el cliente.", "error");
    }
});

/* ======================================================
   MOSTRAR MÉTODO DE PAGO (AVANZAR)
====================================================== */
document.getElementById("btnContinuar").addEventListener("click", async () => {
    if (carrito.length === 0) {
        Swal.fire({
            icon: "info",
            title: "Carrito vacío",
            text: "Agrega productos para continuar con la compra.",
            confirmButtonText: "Entendido"
        });
        return;
    }

    // 🔴 LITERAL C — VALIDAR STOCK ANTES DE CONTINUAR
    const stockOk = await validarStockAntesDeContinuar();
    if (!stockOk) {
        return; // ⛔ DETIENE TODO EL FLUJO AQUÍ
    }

    document.getElementById("seccionCliente").classList.remove("hidden");
    document.getElementById("seccionCliente").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

/*******************************************************
 *  BLOQUE 3 — NUEVA LÓGICA DE DESCUENTOS + CREAR PEDIDO
 *  — Ya NO calcula descuentos en frontend
 *  — Envia solo cedula + productos + cantidades
 *  — Backend devuelve totales reales
 *  — Se muestra mensaje de ahorro al usuario
 *******************************************************/

/* ===============================================================
   GENERAR DETALLES PARA EL BACKEND (SOLO ID Y CANTIDAD)
=============================================================== */
function construirDetallesParaBackend() {
    return carrito.map(item => ({
        producto_id: Number(item.id),
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio)
    }));
}

/* ===============================================================
   VALIDAR STOCK ANTES DE CONTINUAR COMPRA
=============================================================== */
async function validarStockAntesDeContinuar() {
    for (const item of carrito) {
        const res = await fetch(`/api/productos/${item.id}`);
        const producto = await res.json();

        if (!res.ok || producto.stock === undefined) {
            Swal.fire("Error", "No se pudo validar el stock del producto.", "error");
            return false;
        }

        if (item.cantidad > producto.stock) {
            Swal.fire(
                "Stock insuficiente",
                `El producto "${item.nombre}" solo tiene ${producto.stock} unidades disponibles.`,
                "error"
            );
            return false;
        }
    }
    return true;
}


/* ===============================================================
   NUEVA FUNCIÓN — CREAR PEDIDO AUTOMÁTICAMENTE (VERSIÓN FINAL)
=============================================================== */
async function crearPedidoAutomatico() {
    if (pedidoYaCreado) {
        console.warn("Pedido ya creado, se evita duplicación");
        return false;
    }

    // 🛑 NO permitir crear pedido si el método de pago es PayPal
    const metodoSeleccionado = $("#metodoPago").val();
    if (metodoSeleccionado === "paypal") {
        console.warn("Intento de crear pedido automático para PayPal — BLOQUEADO.");
        return false;
    }

    // Solo recalcula SUBTOTALES, ya NO descuentos
    await recalcularTotales();

    const cedula = $("#cedula").val().trim();

    if (!cedula || !validarCedulaEcuatoriana(cedula)) {
        Swal.fire("Error", "Cédula inválida o incompleta.", "error");
        return false;
    }


    // 2️⃣ PREPARAR DETALLES
    const detalles = construirDetallesParaBackend();

    try {
        // 3️⃣ CREAR PEDIDO EN BACKEND
        const payload = {
            cedula_cliente: cedula,
            detalles
        };

        console.log("📦 Payload pedido:", payload);

        const metodo_pago = $("#metodoPago").val();
        const res = await fetch("/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cedula_cliente: cedula,
                detalles,
                metodo_pago
            })
        });

        const raw = await res.text();
        console.log("STATUS /api/pedidos:", res.status);
        console.log("RESP /api/pedidos:", raw);

        let data = {};
        try { data = JSON.parse(raw); } catch { }


        if (!res.ok) {

            Swal.fire("Error", data.error || "No se pudo crear el pedido.", "error");
            return false;
        }


        currentOrderId = data.pedidoId || data.pedido_id;

        // 4️⃣ GUARDAR RESULTADOS REALES
        totalConDescuento = data.totalFinal;
        descuentoAplicado = data.descuentoAplicado;

        // 5️⃣ MENSAJES
        if (data.descuentoAplicado > 0) {
            Swal.fire({
                icon: "success",
                title: "Descuento aplicado",
                html: `
                    <p>${data.mensaje}</p>
                    <p><strong>Total final: $${data.totalFinal.toFixed(2)}</strong></p>
                `,
                timer: 2300,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                icon: "success",
                title: "Pedido generado",
                text: "Ahora selecciona el método de pago.",
                timer: 1200,
                showConfirmButton: false
            });
        }

        return true;

    } catch (err) {
        console.error("Error creando pedido automáticamente:", err);
        Swal.fire("Error", "No se pudo crear el pedido.", "error");
        return false;
    }
}

/*******************************************************
 *  BLOQUE 4 — MÉTODOS DE PAGO + FINALIZACIÓN DEL PEDIDO
 *  — Pago en efectivo
 *  — Pago por transferencia con comprobante
 *  — Pago PayPal
 *  — Redirección final
 *******************************************************/

/* ======================================================
   CAMBIO DE MÉTODO DE PAGO (JS PURO)
====================================================== */

const metodoPagoSelect = document.getElementById("metodoPago");
let paypalSdkLoadingPromise = null;
let avisoPopupMostrado = false;

function ensurePayPalRedirectButton() {
    const container = document.getElementById("paypal-button-container");
    if (!container) return;

    let btn = document.getElementById("paypal-redirect-btn");
    if (btn) return;

    btn = document.createElement("button");
    btn.id = "paypal-redirect-btn";
    btn.type = "button";
    btn.className = "mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700";
    btn.textContent = "Abrir PayPal en esta pestaña";
    btn.addEventListener("click", redirectPayPalInSameTab);
    container.parentElement?.appendChild(btn);
}

async function redirectPayPalInSameTab() {
    const cedula = $("#cedula").val().trim();
    if (!cedula || !validarCedulaEcuatoriana(cedula)) {
        Swal.fire("Error", "Debe ingresar una cédula válida antes de pagar.", "error");
        return;
    }

    await recalcularTotales();

    localStorage.setItem("checkout_cedula", cedula);

    try {
        const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: totalConDescuento.toFixed(2) })
        });

        const data = await res.json();
        const links = data?.links || [];
        const approve = links.find(l => l.rel === "approve");
        if (!approve?.href) {
            throw new Error("No se pudo obtener el enlace de aprobación de PayPal");
        }

        window.location.href = approve.href;
    } catch (err) {
        console.error("Error redirigiendo a PayPal:", err);
        Swal.fire("Error", "No se pudo abrir PayPal. Intente nuevamente.", "error");
    }
}

if (metodoPagoSelect) {
    metodoPagoSelect.addEventListener("change", async function () {
        const metodo = this.value;

        document.getElementById("paypal-button-container")?.classList.add("hidden");
        document.getElementById("comprobanteContainer")?.classList.add("hidden");
        document.getElementById("btnFinalizar")?.classList.add("hidden");


        // PAYPAL
        if (metodo === "paypal") {
            // Ocultar otros métodos
            document.getElementById("comprobanteContainer")?.classList.add("hidden");
            document.getElementById("btnFinalizar")?.classList.add("hidden");

            // Limpiar y renderizar PayPal
            const paypalContainer = document.getElementById("paypal-button-container");
            paypalContainer.innerHTML = "";
            paypalContainer.style.display = "block";

            if (!avisoPopupMostrado) {
                Swal.fire({
                    icon: "info",
                    title: "Pago con PayPal",
                    text: "Si se abre una ventana en blanco, habilita pop-ups para este sitio y vuelve a intentar.",
                    timer: 3500,
                    showConfirmButton: false
                });
                avisoPopupMostrado = true;
            }

            try {
                await loadPayPalSdk();
                renderPaypalButton();
                ensurePayPalRedirectButton();
            } catch (err) {
                console.error("Error cargando PayPal SDK:", err);
                Swal.fire("Error", "No se pudo cargar PayPal. Intente más tarde.", "error");
            }
        }


        // TRANSFERENCIA
        if (metodo === "transferencia") {
            document.getElementById("comprobanteContainer")?.classList.remove("hidden");
            document.getElementById("btnFinalizar")?.classList.remove("hidden");
        }

        // EFECTIVO (solo admin)
        if (metodo === "efectivo") {
            const rol = localStorage.getItem("rol");

            if (rol !== "admin") {
                Swal.fire(
                    "Método no disponible",
                    "Solo el administrador puede utilizar pagos en efectivo.",
                    "warning"
                );
                return;
            }

            document.getElementById("btnFinalizar")?.classList.remove("hidden");
        }
    });
}


/* ======================================================
   FINALIZAR PAGO (BOTÓN PRINCIPAL)
====================================================== */
const btnFinalizar = document.getElementById("btnFinalizar");
if (btnFinalizar) {
    btnFinalizar.addEventListener("click", async () => {
        const metodo = document.getElementById("metodoPago").value;

        // ⚠️ Crear pedido si aún no existe
        // NO crear pedido automáticamente aquí
        // Solo permitir crear pedido en la sección de pago
        if (!currentOrderId) {

            const cedula = $("#cedula").val().trim();

            // Validar que el formulario de cliente fue completado ANTES del pago
            if (!cedula || !validarCedulaEcuatoriana(cedula)) {
                Swal.fire("Error", "Debe ingresar primero una cédula válida en el formulario de cliente.", "error");
                return;
            }

            // Crear pedido recien ahora
            const creado = await crearPedidoAutomatico();
            if (!creado) return;
        }


        /* ===============================
           🟩 PAGO EN EFECTIVO
           =============================== */
        if (metodo === "efectivo") {
            // En efectivo, crearPedido ya lo deja marcado como pagado (ATÓMICO en backend)
            const creado = await crearPedidoAutomatico();
            if (!creado) return;

            localStorage.removeItem("carrito");

            Swal.fire({
                icon: "success",
                title: "Pedido registrado",
                text: "El pedido ha sido procesado correctamente.",
                timer: 1500,
                showConfirmButton: false
            });

            window.location.href = `/exito.html?id=${currentOrderId}&total=${totalConDescuento}&metodo=efectivo`;
            return;
        }

        /* ===============================
           🟦 PAGO POR TRANSFERENCIA
           =============================== */
        if (metodo === "transferencia") {
            const archivo = document.getElementById("comprobante").files[0];

            if (!archivo) {
                Swal.fire("Error", "Debe subir un comprobante.", "error");
                return;
            }

            let formData = new FormData();
            formData.append("comprobante", archivo);
            formData.append("metodo_pago", "transferencia");
            formData.append("total", totalConDescuento);

            const res = await fetch(`/api/pedidos/${currentOrderId}/comprobante`, {
                method: "PUT",
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                Swal.fire("Error", data.error || "No se pudo subir el comprobante.", "error");
                return;
            }

            localStorage.removeItem("carrito");

            Swal.fire({
                icon: "success",
                title: "Comprobante enviado",
                text: "Tu pedido quedó pendiente de validación.",
                timer: 1500,
                showConfirmButton: false
            });

            window.location.href = `/exito.html?id=${currentOrderId}&total=${totalConDescuento}&metodo=transferencia`;
            return;
        }
    });
}

/* ======================================================
  🟨 CARGAR SDK PAYPAL + BOTÓN
====================================================== */
function loadPayPalSdk() {
    if (window.paypal) return Promise.resolve(true);
    if (paypalSdkLoadingPromise) return paypalSdkLoadingPromise;

    paypalSdkLoadingPromise = new Promise(async (resolve, reject) => {
        try {
            const res = await fetch("/api/config");
            const config = await res.json();
            const clientId = (config.paypalClientId || "").trim();
            const currency = (config.paypalCurrency || "USD").trim();

            if (!clientId) {
                reject(new Error("PayPal client ID no configurado"));
                return;
            }

            const script = document.createElement("script");
            script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}`;
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error("No se pudo cargar el SDK de PayPal"));
            document.head.appendChild(script);
        } catch (err) {
            reject(err);
        }
    });

    return paypalSdkLoadingPromise;
}

/* ======================================================
  🟨 BOTÓN PAYPAL (VERSIÓN FINAL)
====================================================== */
function renderPaypalButton() {
    if (!window.paypal) {
        Swal.fire("Error", "PayPal no está disponible todavía.", "error");
        return;
    }

    const mostrarAvisoPopup = () => {
        Swal.fire({
            icon: "warning",
            title: "Permite ventanas emergentes",
            text: "Para pagar con PayPal debes permitir pop-ups en este sitio y volver a intentarlo.",
        });
    };

    paypal.Buttons({
        createOrder: function (data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: totalConDescuento.toFixed(2)
                    }
                }]
            });
        },

        onApprove: async function (data, actions) {
            const details = await actions.order.capture();
            const paypal_transaction_id = details?.id; // ESTE es el ID de transacción
            if (!paypal_transaction_id) {
                Swal.fire("Error", "No se obtuvo el ID de transacción de PayPal", "error");
                return;
            }


            const response = await fetch("/api/pedidos/paypal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cedula_cliente: $("#cedula").val().trim(),
                    items: carrito.map(item => ({
                        id: item.id,
                        cantidad: item.cantidad
                    })),
                    paypal_transaction_id
                })
            });

            if (!response.ok) {
                Swal.fire("Error", "No se pudo guardar el pedido", "error");
                return;
            }

            const dataResp = await response.json();

            window.location.href =
                `/exito.html?id=${dataResp.id}&total=${totalConDescuento}&metodo=paypal&txn=${paypal_transaction_id}`;
        },

        onCancel: function () {
            // El usuario o el sandbox cerró el popup → NO es error
            console.warn("Pago PayPal cancelado o popup cerrado");
        },

        onError: function (err) {
            // Solo log, NO alertar al usuario
            console.error("PayPal Sandbox error:", err);
            const msg = String(err || "");
            if (msg.toLowerCase().includes("popup") || msg.toLowerCase().includes("window")) {
                mostrarAvisoPopup();
            }
        }

    }).render("#paypal-button-container");
}

/* ======================================================
   EVENT DELEGATION – BOTONES DEL CARRITO (CSP SAFE)
====================================================== */
document.addEventListener("click", (e) => {

    // ➕ Aumentar cantidad
    if (e.target.classList.contains("btn-mas")) {
        const id = parseInt(e.target.dataset.id);
        aumentarCantidad(id);
    }

    // ➖ Reducir cantidad
    if (e.target.classList.contains("btn-menos")) {
        const id = parseInt(e.target.dataset.id);
        reducirCantidad(id);
    }

    // 🗑 Eliminar producto
    if (e.target.classList.contains("btn-eliminar")) {
        const id = parseInt(e.target.dataset.id);
        confirmarEliminarDelCarrito(id);
    }

});

document.addEventListener("change", (e) => {
    if (e.target.classList.contains("input-cantidad")) {
        const id = parseInt(e.target.dataset.id);
        actualizarCantidadManual(id, e.target.value, { forzar: true });
    }
});

document.addEventListener("blur", (e) => {
    if (e.target.classList.contains("input-cantidad")) {
        const id = parseInt(e.target.dataset.id);
        actualizarCantidadManual(id, e.target.value, { forzar: true });
    }
}, true);
