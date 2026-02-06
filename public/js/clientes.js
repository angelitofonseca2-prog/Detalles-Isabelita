const API_URL = "/api/clientes";

function getToken() {
  return localStorage.getItem("token") || "";
}

function validarCedulaEcuatoriana(cedula) {
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

function getAuthHeaders(extra = {}) {
  return { Authorization: "Bearer " + getToken(), ...extra };
}

function handle401(res) {
  if (res.status === 401) {
    Swal.fire("Sesión expirada", "Inicia sesión nuevamente", "warning");
    localStorage.clear();
    window.location.href = "/login.html";
    return true;
  }
  return false;
}

/* =====================================================
   Estado y Paginación
===================================================== */
let clientesGlobal = [];
let clientesVista = [];
let paginaActual = 1;
const registrosPorPagina = 10;

/* =====================================================
   DOM
===================================================== */
const tbodyClientes = document.getElementById("clientesBody");
const modalEditarCliente = document.getElementById("modalEditarCliente");
const formEditar = document.getElementById("formEditarCliente");
const btnCancelarEditar = document.getElementById("btnCancelarEditarCliente");
const editCedula = document.getElementById("editCedula");
const editNombre = document.getElementById("editNombre");
const editCorreo = document.getElementById("editCorreo");
const editTelefono = document.getElementById("editTelefono");
const editDireccion = document.getElementById("editDireccion");

/* =====================================================
   Cargar clientes
===================================================== */
async function cargarClientes() {
  const res = await fetch(API_URL, { headers: getAuthHeaders() });
  if (handle401(res) || !res.ok) return;

  const clientes = await res.json();
  clientesGlobal = Array.isArray(clientes) ? clientes : [];
  clientesVista = [...clientesGlobal].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  paginaActual = 1;
  filtrarClientes();
}

function normalizarTexto(v) {
  return String(v || "").toLowerCase().trim();
}

function filtrarClientes() {
  const q = normalizarTexto(document.getElementById("buscar")?.value);
  if (!q) {
    clientesVista = [...clientesGlobal].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  } else {
    clientesVista = clientesGlobal.filter(c => {
      const ced = String(c.cedula || "");
      const nom = normalizarTexto(c.nombre);
      return ced.includes(q) || nom.includes(q);
    });
  }
  paginaActual = 1;
  renderTabla(clientesVista);
}

function renderTabla(lista = []) {
  if (!tbodyClientes) return;
  tbodyClientes.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    tbodyClientes.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">Sin resultados</td></tr>`;
    renderPaginacion(0);
    return;
  }

  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const itemsPagina = lista.slice(inicio, fin);

  itemsPagina.forEach(c => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 transition-colors border-b border-gray-100";
    tr.innerHTML = `
      <td class="px-4 py-3 text-left">${c.cedula || ""}</td>
      <td class="px-4 py-3 text-left font-semibold">${c.nombre || ""}</td>
      <td class="px-4 py-3 text-left text-pink-600"><a href="mailto:${c.correo || ''}">${c.correo || ""}</a></td>
      <td class="px-4 py-3 text-left">${c.telefono || ""}</td>
      <td class="px-4 py-3 text-left">${c.direccion || ""}</td>
      <td class="px-4 py-3 text-right">
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-accion-editar btn-editar" data-cedula="${c.cedula}" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="btn-accion-eliminar btn-eliminar" data-cedula="${c.cedula}" title="Eliminar">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    `;
    tbodyClientes.appendChild(tr);
  });

  renderPaginacion(lista.length);
}

function renderPaginacion(totalItems) {
  const container = document.getElementById("paginacionControls");
  if (!container) return;
  container.innerHTML = "";
  container.className = "paginacion-flechas";

  const totalPaginas = Math.ceil(totalItems / registrosPorPagina);
  if (totalPaginas <= 1) return;

  const inicio = (paginaActual - 1) * registrosPorPagina + 1;
  const fin = Math.min(paginaActual * registrosPorPagina, totalItems);

  const creaBoton = (icono, title, disabled, onClick) => {
    const btn = document.createElement("button");
    btn.innerHTML = `<i class="fas fa-${icono}"></i>`;
    btn.title = title;
    btn.disabled = disabled;
    btn.onclick = onClick;
    return btn;
  };

  container.appendChild(creaBoton("angle-double-left", "Primera página", paginaActual === 1, () => { paginaActual = 1; renderTabla(clientesVista); }));
  container.appendChild(creaBoton("angle-left", "Anterior", paginaActual === 1, () => { if (paginaActual > 1) { paginaActual--; renderTabla(clientesVista); } }));

  const info = document.createElement("span");
  info.className = "paginacion-info";
  info.textContent = `${inicio}-${fin} de ${totalItems}`;
  container.appendChild(info);

  container.appendChild(creaBoton("angle-right", "Siguiente", paginaActual === totalPaginas, () => { if (paginaActual < totalPaginas) { paginaActual++; renderTabla(clientesVista); } }));
  container.appendChild(creaBoton("angle-double-right", "Última página", paginaActual === totalPaginas, () => { paginaActual = totalPaginas; renderTabla(clientesVista); }));
}

/* =====================================================
   Delegación de eventos
===================================================== */
tbodyClientes.addEventListener("click", (e) => {
  const btnEditar = e.target.closest(".btn-editar");
  const btnEliminar = e.target.closest(".btn-eliminar");
  if (btnEditar) { abrirEditarCliente(btnEditar.dataset.cedula); return; }
  if (btnEliminar) { confirmarEliminarCliente(btnEliminar.dataset.cedula); return; }
});

document.getElementById("buscar")?.addEventListener("input", filtrarClientes);

/* =====================================================
   Editar / Eliminar
===================================================== */
async function abrirEditarCliente(cedulaVal) {
  const res = await fetch(`${API_URL}/${cedulaVal}`, { headers: getAuthHeaders() });
  if (handle401(res)) return;
  if (!res.ok) { Swal.fire("Error", "No se pudo obtener el cliente", "error"); return; }

  const cliente = await res.json();
  editCedula.value = cliente.cedula ?? "";
  editNombre.value = cliente.nombre ?? "";
  editCorreo.value = cliente.correo ?? "";
  editTelefono.value = cliente.telefono ?? "";
  editDireccion.value = cliente.direccion ?? "";
  document.getElementById("editIdCliente").value = cliente.cedula;
  modalEditarCliente.classList.add("flex");
  modalEditarCliente.classList.remove("hidden");
}

function cerrarModalEditarCliente() {
  modalEditarCliente.classList.add("hidden");
  modalEditarCliente.classList.remove("flex");
}
btnCancelarEditar?.addEventListener("click", cerrarModalEditarCliente);

formEditar.addEventListener("submit", async (e) => {
  e.preventDefault();
  const cedulaOriginal = document.getElementById("editIdCliente").value;
  const nuevaCedula = editCedula.value.trim();

  if (!validarCedulaEcuatoriana(nuevaCedula)) {
    Swal.fire("Error", "La cédula ingresada no es válida (Ecuador).", "error");
    return;
  }

  const res = await fetch(`${API_URL}/${cedulaOriginal}`, {
    method: "PUT",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      nuevaCedula,
      nombre: editNombre.value.trim().toUpperCase(),
      correo: editCorreo.value.trim().toUpperCase(),
      telefono: editTelefono.value.trim(),
      direccion: editDireccion.value.trim().toUpperCase()
    })
  });

  if (handle401(res)) return;
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    Swal.fire("Error", msg.error || msg.mensaje || "No se pudo actualizar", "error");
    return;
  }

  Swal.fire("Éxito", "Cliente actualizado correctamente.", "success");
  cerrarModalEditarCliente();
  await cargarClientes();
});

async function confirmarEliminarCliente(ced) {
  const { isConfirmed } = await Swal.fire({
    title: "¿Eliminar este cliente?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!isConfirmed) return;

  const res = await fetch(`${API_URL}/${ced}`, { method: "DELETE", headers: getAuthHeaders() });
  if (handle401(res)) return;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    Swal.fire("Error", err.error || "No se pudo eliminar", "error");
    return;
  }

  Swal.fire("Eliminado", "Cliente eliminado.", "success");
  await cargarClientes();
}

document.addEventListener("DOMContentLoaded", () => cargarClientes());
