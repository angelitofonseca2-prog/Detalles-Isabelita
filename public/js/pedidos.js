/* =====================================================
   🌸 PEDIDOS – CLIENTE (PRODUCCIÓN)
===================================================== */

const API_PEDIDOS = "/api/pedidos";

/* ================= Helpers ================= */
function swalError(msg) {
  Swal.fire("Error", msg, "error");
}
function swalOk(msg) {
  Swal.fire("Éxito", msg, "success");
}

/* ================= Carrito ================= */
let carrito = [];

function renderCarrito() {
  const tbody = document.getElementById("tablaCarritoBody");
  tbody.innerHTML = "";

  if (carrito.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="5" class="text-center">Carrito vacío</td></tr>`;
    return;
  }

  carrito.forEach((item, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.precio.toFixed(2)}</td>
      <td>${item.cantidad}</td>
      <td>${(item.precio * item.cantidad).toFixed(2)}</td>
      <td>
        <button class="btn-quitar" data-index="${i}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document
  .getElementById("tablaCarritoBody")
  .addEventListener("click", e => {
    const btn = e.target.closest(".btn-quitar");
    if (!btn) return;
    carrito.splice(btn.dataset.index, 1);
    renderCarrito();
  });

/* ================= Crear pedido ================= */
document
  .getElementById("btnConfirmarPedido")
  .addEventListener("click", async () => {

    if (carrito.length === 0)
      return swalError("El carrito está vacío.");

    const cedula_cliente =
      document.getElementById("cedula_cliente").value.trim();
    const metodo_pago =
      document.querySelector("input[name='metodo_pago']:checked")?.value;

    if (!cedula_cliente || !metodo_pago)
      return swalError("Complete los datos del pedido.");

    const items = carrito.map(i => ({
      producto_id: i.id,
      cantidad: i.cantidad,
      precio_unitario: i.precio
    }));

    const total = items.reduce(
      (s, i) => s + i.precio_unitario * i.cantidad,
      0
    );

    try {
      const res = await fetch(API_PEDIDOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula_cliente,
          metodo_pago,
          total,
          items
        })
      });

      const data = await res.json();
      if (!res.ok) return swalError(data.error);

      swalOk("Pedido registrado correctamente.");
      carrito = [];
      renderCarrito();

      if (metodo_pago === "transferencia") {
        document.getElementById("pedido_id").value = data.pedido_id;
        document.getElementById("modalComprobante").classList.remove("hidden");
      }

    } catch (err) {
      swalError("Error al registrar el pedido.");
    }
  });

/* ================= Subir comprobante ================= */
document
  .getElementById("formComprobante")
  .addEventListener("submit", async e => {
    e.preventDefault();

    const pedidoId = document.getElementById("pedido_id").value;
    const formData = new FormData(e.target);

    try {
      const res = await fetch(
        `${API_PEDIDOS}/${pedidoId}/comprobante`,
        { method: "POST", body: formData }
      );

      const data = await res.json();
      if (!res.ok) return swalError(data.error);

      swalOk("Comprobante enviado correctamente.");
      e.target.reset();
      document.getElementById("modalComprobante").classList.add("hidden");

    } catch {
      swalError("Error al subir comprobante.");
    }
  });
