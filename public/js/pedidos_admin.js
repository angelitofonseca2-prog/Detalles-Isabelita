/* =====================================================
   🌸 PEDIDOS – ADMIN (PRODUCCIÓN FINAL)
   - Compatible con pedidos_admin.html (IDs reales)
   - Filtros + búsqueda + acciones + modal + export PDF/Excel
   - Totales globales
   - Colores por estado
   - UI: sin columna ID, header cliente oculto, alineación izquierda
===================================================== */

const API_PEDIDOS = "/api/pedidos";

/* =========================
   Helpers / Seguridad
========================= */
const getToken = () => localStorage.getItem("token") || "";

const getAuthHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getToken(),
  ...extra
});

function cerrarSesion(msg = "Sesión expirada. Inicia sesión nuevamente.") {
  localStorage.removeItem("token");
  alert(msg);
  location.href = "/login.html";
}

/* =========================
   Estado global
========================= */
let pedidosGlobal = [];
let pedidosVista = []; // lo que se está renderizando (por filtros/búsqueda)

// PAGINACIÓN
let paginaActual = 1;
const registrosPorPagina = 10;

/* =========================
   Utilitarias
========================= */
function toNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function formatISODateOnly(d) {
  // YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizarTexto(v) {
  return String(v || "").toLowerCase().trim();
}

function estadoNormalizado(e) {
  return normalizarTexto(e).replace(/\s+/g, "_");
}

function formatFechaEcuador(iso) {
  if (!iso) return "N/A";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(d).replace(",", "");
  } catch (e) {
    return iso;
  }
}

/* =========================
   UI Helpers (sin tocar HTML)
========================= */
function inyectarEstilosEstados() {
  // Inyecta CSS mínimo para estado-* + botones 3D + alineación izquierda
  const style = document.createElement("style");
  style.innerHTML = `
    /* Alineación izquierda tabla */
    table thead th, table tbody td { text-align: left !important; }

    /* Botones 3D/pro */
    .btn-3d {
      padding: 6px 10px;
      border-radius: 8px;
      font-weight: 600;
      box-shadow: 0 6px 0 rgba(0,0,0,0.12);
      transform: translateY(0);
      transition: transform .08s ease, box-shadow .08s ease, opacity .08s ease;
    }
    .btn-3d:active {
      transform: translateY(3px);
      box-shadow: 0 3px 0 rgba(0,0,0,0.10);
    }
    .btn-3d[disabled] {
      opacity: .45;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    /* Colores por estado (ajusta si quieres) */
    tr.estado-pagado { background: #e8f5e9; }               /* verde suave */
    tr.estado-cancelado { background: #eeeeee; }            /* gris */
    tr.estado-pendiente_pago { background: #e3f2fd; }       /* azul suave */
    tr.estado-pendiente_validacion { background: #fff8e1; } /* amarillo suave */
    tr.estado-rechazado { background: #ffebee; }            /* rojo suave */
  `;
  document.head.appendChild(style);
}

function ocultarColumnaID_y_HeaderCliente() {
  // Ya eliminamos CLIENTE desde el HTML, este helper solo se asegura
  // de que no queden rastros si el HTML llegara a cambiar.
  const ths = document.querySelectorAll("table thead th");
  ths.forEach(th => {
    if (th.textContent.trim().toUpperCase() === "ID") th.style.display = "none";
  });
}

/* =========================
   Fechas por defecto (últimos 30 días)
========================= */
function setFechasPorDefectoUltimos30Dias() {
  const desdeEl = document.getElementById("fechaDesde");
  const hastaEl = document.getElementById("fechaHasta");
  if (!desdeEl || !hastaEl) return;

  const hoy = new Date();
  const hace30 = new Date();
  hace30.setDate(hoy.getDate() - 30);

  const desde = formatISODateOnly(hace30);
  const hasta = formatISODateOnly(hoy);

  // Si usan <input type="date"> funciona directo
  desdeEl.value = desde;
  hastaEl.value = hasta;

  // Si existe flatpickr (tu HTML lo incluye) :contentReference[oaicite:4]{index=4}
  // lo inicializamos sin romper type="date"
  if (window.flatpickr && desdeEl.type !== "date") {
    window.flatpickr.localize(window.flatpickr.l10ns.es);
    window.flatpickr(desdeEl, { dateFormat: "Y-m-d", defaultDate: desde });
    window.flatpickr(hastaEl, { dateFormat: "Y-m-d", defaultDate: hasta });
  }
}

/* =========================
   Backend: cargar pedidos
========================= */
async function cargarPedidos(filtros = {}) {
  const params = new URLSearchParams(filtros).toString();

  const res = await fetch(`${API_PEDIDOS}?${params}`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401) return cerrarSesion();
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo cargar pedidos");
  }

  const data = await res.json();
  pedidosGlobal = Array.isArray(data) ? data : [];
  pedidosVista = [...pedidosGlobal];

  renderTabla(pedidosVista);
  renderTotales(pedidosVista);
}

/* =========================
   Filtros + búsqueda
========================= */
function getFiltrosDesdeUI() {
  const rawDesde = document.getElementById("fechaDesde")?.value || "";
  const rawHasta = document.getElementById("fechaHasta")?.value || "";
  const estadoRaw = document.getElementById("filtroEstado")?.value || "todos";

  const normalizarFecha = (valor) => {
    if (!valor) return "";
    // Si viene en formato dd/mm/yyyy lo convertimos a yyyy-mm-dd
    if (valor.includes("/")) {
      const partes = valor.split("/");
      if (partes.length === 3) {
        const [dd, mm, yyyy] = partes;
        if (yyyy && mm && dd) {
          return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        }
      }
    }
    return valor; // yyyy-mm-dd esperado
  };

  const desde = normalizarFecha(rawDesde);
  const hasta = normalizarFecha(rawHasta);
  const estado = estadoRaw.toString().trim().toLowerCase();

  // Backend suele esperar desde/hasta/estado como query params
  const filtros = {};
  if (desde) filtros.desde = desde;
  if (hasta) filtros.hasta = hasta;
  if (estado && estado !== "todos") filtros.estado = estado;

  return filtros;
}

async function aplicarFiltros() {
  const filtros = getFiltrosDesdeUI();
  await cargarPedidos(filtros);
  // si hay texto en buscador, re-aplicamos búsqueda local
  filtrarPedidosLocal();
}

function filtrarPedidosLocal() {
  const q = normalizarTexto(document.getElementById("buscar")?.value);

  if (!q) {
    pedidosVista = [...pedidosGlobal];
  } else {
    pedidosVista = pedidosGlobal.filter(p => {
      const ced = String(p.cedula_cliente || "");
      const nom = normalizarTexto(p.cliente);
      return ced.includes(q) || nom.includes(q);
    });
  }

  paginaActual = 1; // Reiniciar página al filtrar o buscar
  renderTabla(pedidosVista);
  renderTotales(pedidosVista);
}

/* =========================
   Render tabla
========================= */
function renderTabla(lista = []) {
  const tbody = document.getElementById("tablaPedidos");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="py-4">Sin resultados</td></tr>`;
    renderPaginacion(0);
    return;
  }

  // Lógica de Paginación para Vista
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const itemsPagina = lista.slice(inicio, fin);

  for (const p of itemsPagina) {
    const tr = document.createElement("tr");
    const estadoN = estadoNormalizado(p.estado);
    const esPendienteValidacion = estadoN === "pendiente_validacion";

    const btnValidar = esPendienteValidacion
      ? `<button class="btn-3d btn-validar" data-id="${p.id}" title="Validar pago">✓</button>`
      : "";

    const btnCancelar = esPendienteValidacion
      ? `<button class="btn-3d btn-cancelar" data-id="${p.id}" title="Cancelar pedido">✕</button>`
      : "";

    const btnVer = `
      <button class="btn-3d btn-ver bg-blue-500 hover:bg-blue-600 text-white" data-id="${p.id}" title="Ver detalles">Ver</button>
    `;

    const comprobanteLink = p.comprobante
      ? `<a href="${p.comprobante}" target="_blank" title="Abrir comprobante">📄</a>`
      : "";

    const montoNeto = toNumber(p.total);
    const montoBruto = montoNeto + toNumber(p.descuento);

    tr.innerHTML = `
      <td class="px-4 py-2 text-left">${p.nombre_cliente || "N/A"}</td>
      <td class="px-4 py-2 text-left">${p.cedula_cliente || ""}</td>
      <td class="px-4 py-2 text-left">${montoNeto.toFixed(2)}</td>
      <td class="px-4 py-2 text-left">${toNumber(p.descuento).toFixed(2)}</td>
      <td class="px-4 py-2 text-left">${montoBruto.toFixed(2)}</td>
      <td class="px-4 py-2 text-left">${formatFechaEcuador(p.fecha)}</td>
      <td class="px-4 py-2 text-left">${p.estado || ""}</td>
      <td class="px-4 py-2 text-left">${p.metodo_pago || ""}</td>
      <td class="px-4 py-2 text-left">${comprobanteLink}</td>
      <td class="px-4 py-2 flex gap-2">
        ${btnVer} ${btnValidar} ${btnCancelar}
      </td>
    `;
    tbody.appendChild(tr);
  }

  renderPaginacion(lista.length);
}

function renderPaginacion(totalItems) {
  const container = document.getElementById("paginacionControls");
  if (!container) return;
  container.innerHTML = "";

  const totalPaginas = Math.ceil(totalItems / registrosPorPagina);
  if (totalPaginas <= 1) return;

  // Botón Anterior
  const btnPrev = document.createElement("button");
  btnPrev.innerText = "Anterior";
  btnPrev.disabled = paginaActual === 1;
  btnPrev.className = `px-3 py-1 border rounded ${paginaActual === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-white hover:bg-pink-100'}`;
  btnPrev.onclick = () => {
    if (paginaActual > 1) {
      paginaActual--;
      renderTabla(pedidosVista);
    }
  };
  container.appendChild(btnPrev);

  // Páginas numeradas (Limitado para no saturar)
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.className = `px-3 py-1 border rounded ${paginaActual === i ? 'bg-pink-600 text-white' : 'bg-white hover:bg-pink-100'}`;
    btn.onclick = () => {
      paginaActual = i;
      renderTabla(pedidosVista);
    };
    container.appendChild(btn);
  }

  // Botón Siguiente
  const btnNext = document.createElement("button");
  btnNext.innerText = "Siguiente";
  btnNext.disabled = paginaActual === totalPaginas;
  btnNext.className = `px-3 py-1 border rounded ${paginaActual === totalPaginas ? 'bg-gray-200 cursor-not-allowed' : 'bg-white hover:bg-pink-100'}`;
  btnNext.onclick = () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      renderTabla(pedidosVista);
    }
  };
  container.appendChild(btnNext);
}

/* =========================
   Totales globales
========================= */
function renderTotales(lista = []) {
  const elSubtotal = document.getElementById("subtotalGeneralPantalla");
  const elTotal = document.getElementById("totalGeneralPantalla");
  const elDesc = document.getElementById("descuentoGeneralPantalla");

  if (!elTotal || !elDesc || !elSubtotal) {
    console.error("❌ No se encontraron elementos de totales");
    return;
  }

  let subtotalAcum = 0; // Neto (pagado)
  let totalAcum = 0;    // Bruto (original)
  let descuentoAcum = 0;

  // Excluir cancelados (y rechazados si existieran)
  const EXCLUIR = new Set(["cancelado", "rechazado"]);

  for (const p of lista) {
    const est = estadoNormalizado(p.estado);
    if (EXCLUIR.has(est)) continue;

    const neto = toNumber(p.total);
    const bruto = neto + toNumber(p.descuento);

    subtotalAcum += neto;
    totalAcum += bruto;
    descuentoAcum += toNumber(p.descuento);
  }

  elSubtotal.innerText = `$${subtotalAcum.toFixed(2)}`;
  elTotal.innerText = `$${totalAcum.toFixed(2)}`;
  elDesc.innerText = `$${descuentoAcum.toFixed(2)}`;
}

/* =========================
   Acciones: validar / cancelar
========================= */
async function validarPedido(id) {
  const ok = await Swal.fire({
    title: "Validar pago",
    text: "¿Confirmar este pago?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí",
    cancelButtonText: "No"
  });

  if (!ok.isConfirmed) return;

  const res = await fetch(`${API_PEDIDOS}/${id}/validar`, {
    method: "PUT",
    headers: getAuthHeaders()
  });

  if (res.status === 401) return cerrarSesion();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return Swal.fire("Error", data.error || "No se pudo validar", "error");

  await Swal.fire("Éxito", "Pago validado", "success");
  await aplicarFiltros();
}

async function cancelarPedido(id) {
  const ok = await Swal.fire({
    title: "Cancelar pedido",
    text: "¿Cancelar este pedido?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí",
    cancelButtonText: "No"
  });

  if (!ok.isConfirmed) return;

  const res = await fetch(`${API_PEDIDOS}/${id}/cancelar`, {
    method: "PUT",
    headers: getAuthHeaders()
  });

  if (res.status === 401) return cerrarSesion();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return Swal.fire("Error", data.error || "No se pudo cancelar", "error");

  await Swal.fire("OK", "Pedido cancelado", "info");
  await aplicarFiltros();
}

/* =========================
   Export PDF (VERSIÓN FINAL ESTABLE)
========================= */
function exportarPDF() {
  if (!Array.isArray(pedidosVista) || pedidosVista.length === 0) {
    Swal.fire("Atención", "No hay datos para exportar", "warning");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "letter");

  const fechaGenerado = formatFechaEcuador(new Date().toISOString());
  const fechaDesde = document.getElementById("fechaDesde")?.value || "";
  const fechaHasta = document.getElementById("fechaHasta")?.value || "";
  const estado = document.getElementById("filtroEstado")?.value || "todos";

  doc.setFontSize(16);
  doc.text("REPORTE DE PEDIDOS - DETALLES ISABELITA", 40, 40);
  doc.setFontSize(10);
  doc.text(`Generado: ${fechaGenerado}`, 40, 60);
  doc.text(`Desde: ${fechaDesde}`, 40, 78);
  doc.text(`Hasta: ${fechaHasta}`, 200, 78);
  doc.text(`Estado: ${estado}`, 360, 78);

  const head = [[
    "CLIENTE",
    "CÉDULA",
    "SUBTOTAL",
    "DESCUENTO",
    "TOTAL",
    "FECHA",
    "ESTADO",
    "MÉTODO PAGO"
  ]];

  const body = pedidosVista.map(p => {
    const neto = Number(p.total ?? 0);
    const desc = Number(p.descuento ?? 0);
    const bruto = neto + desc;
    return [
      p.nombre_cliente || "N/A",
      p.cedula_cliente || "",
      `$${neto.toFixed(2)}`,
      `$${desc.toFixed(2)}`,
      `$${bruto.toFixed(2)}`,
      formatFechaEcuador(p.fecha),
      p.estado || "N/A",
      p.metodo_pago || "N/A"
    ];
  });

  doc.autoTable({
    startY: 95,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [219, 39, 119] }
  });

  let totalSub = 0;
  let totalDesc = 0;
  let totalTotal = 0;
  const EXCLUIR = new Set(["cancelado", "rechazado"]);

  pedidosVista.forEach(p => {
    if (EXCLUIR.has(estadoNormalizado(p.estado))) return;
    const n = Number(p.total ?? 0);
    const d = Number(p.descuento ?? 0);
    totalSub += n;
    totalDesc += d;
    totalTotal += (n + d);
  });

  const finalY = doc.lastAutoTable?.finalY || 100;
  doc.setFontSize(11);
  doc.text(`Subtotal general (Neto): $${totalSub.toFixed(2)}`, 40, finalY + 25);
  doc.text(`Descuento total: $${totalDesc.toFixed(2)}`, 40, finalY + 40);
  doc.text(`Total general (Bruto): $${totalTotal.toFixed(2)}`, 40, finalY + 55);

  const nombrePdf = `reporte_pedidos_${new Date().toISOString().slice(0, 10)}.pdf`;

  try {
    const pdfDataUri = doc.output('datauristring');
    const link = document.createElement("a");
    link.href = pdfDataUri;
    link.download = nombrePdf;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 200);
  } catch (err) {
    console.error("ERROR CRÍTICO EN EXPORTACIÓN PDF:", err);
    doc.save(nombrePdf);
  }
}

/* =========================
   Export Excel
 ========================= */
function exportarExcel() {
  if (!Array.isArray(pedidosVista) || pedidosVista.length === 0) {
    Swal.fire("Atención", "No hay datos para exportar", "warning");
    return;
  }

  const fechaDesde = document.getElementById("fechaDesde")?.value || "N/A";
  const fechaHasta = document.getElementById("fechaHasta")?.value || "N/A";
  const estadoFiltro = document.getElementById("filtroEstado")?.value || "Todos";

  const data = [
    ["REPORTE DE PEDIDOS - DETALLES ISABELITA"],
    ["Generado:", formatFechaEcuador(new Date().toISOString())],
    ["Periodo:", `${fechaDesde} al ${fechaHasta}`],
    ["Estado:", estadoFiltro],
    [],
    ["CLIENTE", "CÉDULA", "SUBTOTAL", "DESCUENTO", "TOTAL", "FECHA", "ESTADO", "MÉTODO PAGO"]
  ];

  let totalSub = 0;
  let totalDesc = 0;
  let totalTotal = 0;
  const EXCLUIR = new Set(["cancelado", "rechazado"]);

  pedidosVista.forEach(p => {
    const neto = Number(p.total ?? 0);
    const desc = Number(p.descuento ?? 0);
    const bruto = neto + desc;

    data.push([
      p.nombre_cliente || "N/A",
      p.cedula_cliente || "",
      neto.toFixed(2),
      desc.toFixed(2),
      bruto.toFixed(2),
      formatFechaEcuador(p.fecha),
      p.estado || "",
      p.metodo_pago || ""
    ]);

    if (!EXCLUIR.has(estadoNormalizado(p.estado))) {
      totalSub += neto;
      totalDesc += desc;
      totalTotal += bruto;
    }
  });

  data.push([]);
  data.push([
    "TOTALES (Filtrados)",
    "",
    totalSub.toFixed(2),
    totalDesc.toFixed(2),
    totalTotal.toFixed(2),
    "",
    "",
    ""
  ]);

  // --- MÉTODO BASE64 REFORZADO (PLAN V6) ---
  try {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

    const nombreExcel = `reporte_pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const excelDataUri = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + wbout;
    const link = document.createElement("a");
    link.href = excelDataUri;
    link.download = nombreExcel;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 200);
  } catch (err) {
    console.error("ERROR CRÍTICO EN EXPORTACIÓN EXCEL:", err);
    XLSX.writeFile(wb, nombreExcel); // Fallback final
  }
}

/* =========================
   Modal comprobante (si lo usas)
========================= */
function initModalComprobante() {
  const modal = document.getElementById("modalComprobante");
  const img = document.getElementById("imgComprobante");
  const btnCerrar = document.getElementById("btnCerrarModal");
  if (!modal || !img || !btnCerrar) return;

  let scale = 1;

  // Zoom con scroll
  img.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.min(Math.max(1, scale * factor), 4);
    img.style.transform = `scale(${scale})`;
  });

  // Cerrar modal
  btnCerrar.addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  });
  modal.addEventListener("click", (e) => {
    if (e.target.id === "modalComprobante") {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  });

  // Exponer función por si luego quieres usar "verComprobante(url)"
  window.verComprobante = (url) => {
    img.src = url;
    scale = 1;
    img.style.transform = "scale(1)";
    modal.classList.add("flex");
    modal.classList.remove("hidden");
  };
}

/* =========================
   Modal de Detalles de Pedido
========================= */
function initModalDetalle() {
  const modal = document.getElementById("modalDetallePedido");
  const btnCerrar = document.getElementById("cerrarModalDetalle");
  const btnAceptar = document.getElementById("btnCerrarAceptar");

  if (!modal) return;

  const cerrar = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };
  btnCerrar?.addEventListener("click", cerrar);
  btnAceptar?.addEventListener("click", cerrar);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cerrar();
  });

  window.verDetallePedido = async (id) => {
    try {
      const res = await fetch(`${API_PEDIDOS}/${id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("No se pudo cargar el detalle");
      const pedido = await res.json();

      // Cabecera
      document.getElementById("detPedidoId").textContent = pedido.id;
      document.getElementById("detClienteNombre").textContent = pedido.nombre_cliente || "N/A";
      document.getElementById("detClienteCedula").textContent = pedido.cedula_cliente || "N/A";
      document.getElementById("detPedidoFecha").textContent = formatFechaEcuador(pedido.fecha);

      const elEstado = document.getElementById("detPedidoEstado");
      elEstado.textContent = pedido.estado || "N/A";
      elEstado.className = `px-2 py-0.5 rounded-full text-xs font-bold uppercase ${pedido.estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`;

      // Tabla Productos
      const tbody = document.getElementById("detTablaProductos");
      tbody.innerHTML = "";

      if (pedido.detalles && pedido.detalles.length) {
        pedido.detalles.forEach(d => {
          const tr = document.createElement("tr");
          tr.className = "border-b hover:bg-gray-50 transition-colors";
          tr.innerHTML = `
            <td class="px-4 py-3 text-gray-700 font-medium">${d.nombre_producto}</td>
            <td class="px-4 py-3 text-center text-gray-600">${d.cantidad}</td>
            <td class="px-4 py-3 text-right text-gray-600">$${toNumber(d.precio_unitario).toFixed(2)}</td>
            <td class="px-4 py-3 text-right text-gray-800 font-bold">$${toNumber(d.subtotal).toFixed(2)}</td>
          `;
          tbody.appendChild(tr);
        });
      }

      // Totales
      document.getElementById("detDescuento").textContent = `-$${toNumber(pedido.descuento).toFixed(2)}`;
      document.getElementById("detTotal").textContent = `$${toNumber(pedido.total).toFixed(2)}`;

      modal.classList.add("flex");
      modal.classList.remove("hidden");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", e.message, "error");
    }
  };
}

/* =========================
   Init (DOM Ready)
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  inyectarEstilosEstados();
  setFechasPorDefectoUltimos30Dias();
  initModalComprobante();
  initModalDetalle();

  // Botón filtrar
  const btnFiltrar = document.getElementById("btnFiltrar");
  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", async () => {
      try {
        btnFiltrar.disabled = true;
        btnFiltrar.innerText = "Filtrando...";
        await aplicarFiltros();
      } catch (e) {
        console.error(e);
        Swal.fire("Error", e.message || "No se pudo filtrar", "error");
      } finally {
        btnFiltrar.disabled = false;
        btnFiltrar.innerText = "Filtrar";
      }
    });
  }

  // Buscador local
  document.getElementById("buscar")?.addEventListener("input", filtrarPedidosLocal);

  // Export
  document.getElementById("btnExportPDF")?.addEventListener("click", exportarPDF);
  document.getElementById("btnExportExcel")?.addEventListener("click", exportarExcel);

  // Delegación acciones (click en tbody)
  document.getElementById("tablaPedidos")?.addEventListener("click", async (e) => {
    const btnValidar = e.target.closest(".btn-validar");
    const btnCancelar = e.target.closest(".btn-cancelar");
    const btnVer = e.target.closest(".btn-ver");

    if (btnVer) {
      window.verDetallePedido(btnVer.dataset.id);
    }
    if (btnValidar && !btnValidar.disabled) {
      await validarPedido(btnValidar.dataset.id);
    }
    if (btnCancelar && !btnCancelar.disabled) {
      await cancelarPedido(btnCancelar.dataset.id);
    }
  });

  // Carga inicial (últimos 30 días por defecto)
  try {
    await aplicarFiltros();
  } catch (e) {
    console.error(e);
    Swal.fire("Error", e.message || "No se pudo cargar pedidos", "error");
  }
});
