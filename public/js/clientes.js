const API_URL = "/api/clientes";

/* =====================================================
   🔐 Helpers
===================================================== */
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
  return {
    Authorization: "Bearer " + getToken(),
    ...extra
  };
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
   📦 DataTable
===================================================== */
let dataTableClientes = null;

/* =====================================================
   📌 DOM
===================================================== */
const formCliente = document.getElementById("clienteForm");
const cedula = document.getElementById("cedula");
const nombre = document.getElementById("nombre");
const correo = document.getElementById("correo");
const telefono = document.getElementById("telefono");
const direccion = document.getElementById("direccion");
const btnRegistrar = document.querySelector("#clienteForm button[type='submit']");

const tbodyClientes = document.getElementById("clientesBody");

// Modal edición
const modalEditarCliente = document.getElementById("modalEditarCliente");
const formEditar = document.getElementById("formEditarCliente");
const btnCancelarEditar = document.getElementById("btnCancelarEditarCliente"); // ✅ requiere el id en HTML
const editCedula = document.getElementById("editCedula");
const editNombre = document.getElementById("editNombre");
const editCorreo = document.getElementById("editCorreo");
const editTelefono = document.getElementById("editTelefono");
const editDireccion = document.getElementById("editDireccion");

/* =====================================================
   ✅ Cargar clientes + DataTable (estable)
===================================================== */
async function cargarClientes() {
  const res = await fetch(API_URL, { headers: getAuthHeaders() });
  if (handle401(res) || !res.ok) return;

  const clientes = await res.json();

  if (!dataTableClientes) {
    dataTableClientes = $("#tablaClientes").DataTable({
      pageLength: 5,
      order: [[1, "asc"]],
      autoWidth: false,
      scrollX: true, // ✅ tabla más ancha

      columnDefs: [
        {
          targets: "_all",          // ✅ todo alineado a la izquierda
          className: "text-left"
        },
        {
          targets: 1,               // Nombre
          width: "25%",
          createdCell: td => {
            td.style.whiteSpace = "nowrap";
          }
        },
        {
          targets: 2,               // Correo
          width: "20%",
          createdCell: td => {
            td.style.whiteSpace = "nowrap";
            td.style.overflow = "hidden";
            td.style.textOverflow = "ellipsis";
            td.title = td.innerText;
          }
        },
        {
          targets: 3,               // Teléfono
          width: "10%"
        },
        {
          targets: 4,               // Dirección
          width: "20%"
        },
        {
          targets: 5,               // Acciones
          width: "70px",            // 👈 ancho real fijo
          orderable: false,
          createdCell: td => {
            td.style.whiteSpace = "nowrap";
          }
        }
      ],

      language: {
        search: "Buscar:",
        lengthMenu: "Mostrar _MENU_ registros",
        paginate: {
          next: "Siguiente",
          previous: "Anterior"
        }
      }
    });
  }

  // 🔁 Limpieza y recarga segura
  dataTableClientes.clear();

  clientes.forEach(c => {
    dataTableClientes.row.add([
      c.cedula,
      c.nombre,
      c.correo,
      c.telefono,
      c.direccion,
      `
        <button type="button" class="btn-editar" data-cedula="${c.cedula}">✏️</button>
        <button type="button" class="btn-eliminar" data-cedula="${c.cedula}">🗑️</button>
      `
    ]);
  });

  dataTableClientes.draw();
}


/* =====================================================
   🖱️ Delegación de eventos (única y estable)
===================================================== */
tbodyClientes.addEventListener("click", (e) => {
  const btnEditar = e.target.closest(".btn-editar");
  const btnEliminar = e.target.closest(".btn-eliminar");

  if (btnEditar) {
    abrirEditarCliente(btnEditar.dataset.cedula);
    return;
  }
  if (btnEliminar) {
    confirmarEliminarCliente(btnEliminar.dataset.cedula);
    return;
  }
});

/* =====================================================
   🔎 Verificar existencia por cédula (auth)
===================================================== */
async function verificarCedulaExiste(ced) {
  const res = await fetch(`/api/clientes/publico/${ced}`);
  return res.ok;
}


/* =====================================================
   ⚡ Validar cédula al salir del campo (tu UX original)
===================================================== */
if (cedula) {
  cedula.addEventListener("blur", async () => {
    const valor = cedula.value.trim();
    if (!valor) return;

    if (!/^[0-9]{10}$/.test(valor)) {
      Swal.fire("Error", "La cédula debe tener exactamente 10 dígitos.", "error");
      if (btnRegistrar) btnRegistrar.disabled = true;
      return;
    }

    try {
      const existe = await verificarCedulaExiste(valor);
      if (existe) {
        Swal.fire({
          icon: "info",
          title: "Cédula registrada",
          text: "El cliente ya existe y se muestra en el listado."
        });
        dataTableClientes?.search(valor).draw();
        if (btnRegistrar) btnRegistrar.disabled = true;
        return;
      }
      if (btnRegistrar) btnRegistrar.disabled = false;
    } catch (err) {
      console.error(err);
      if (btnRegistrar) btnRegistrar.disabled = false;
    }
  });
}

/* =====================================================
   🧾 Registrar cliente (mantiene tu validación + precheck)
===================================================== */
if (formCliente) {
  formCliente.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      cedula: cedula.value.trim(),
      nombre: nombre.value.trim().toUpperCase(),
      correo: correo.value.trim().toUpperCase(),
      telefono: telefono.value.trim(),
      direccion: direccion.value.trim().toUpperCase()
    };

    if (!/^[0-9]{10}$/.test(data.cedula)) {
      Swal.fire("Error", "La cédula debe tener exactamente 10 dígitos.", "error");
      return;
    }

    btnRegistrar.disabled = true;

    // ✅ Mantener tu verificación previa (UX)
    const existe = await verificarCedulaExiste(data.cedula);
    if (existe) {
      Swal.fire("Cédula registrada", "Ya existe un cliente con esta cédula.", "warning");
      btnRegistrar.disabled = false;
      return;
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data)
    });

    if (handle401(res)) return;

    if (!res.ok) {
      // ✅ Mensaje más exacto si backend devuelve 409
      if (res.status === 409) {
        const msg = await safeReadError(res);
        Swal.fire("Duplicado", msg || "La cédula o el correo ya están registrados.", "warning");
      } else {
        Swal.fire("Error", "No se pudo registrar el cliente.", "error");
      }
      btnRegistrar.disabled = false;
      return;
    }

    Swal.fire("Éxito", "Cliente registrado correctamente.", "success");
    e.target.reset();
    btnRegistrar.disabled = false;
    await cargarClientes();
    dataTableClientes?.search("").draw();
  });
}

async function safeReadError(res) {
  try {
    const j = await res.json();
    return j?.error || j?.mensaje || "";
  } catch {
    return "";
  }
}

/* =====================================================
   ✏️ Abrir edición
===================================================== */
async function abrirEditarCliente(cedulaVal) {
  const res = await fetch(`${API_URL}/${cedulaVal}`, { headers: getAuthHeaders() });
  if (handle401(res)) return;

  if (!res.ok) {
    Swal.fire("Error", "No se pudo obtener el cliente", "error");
    return;
  }

  const cliente = await res.json();

  editCedula.value = cliente.cedula ?? "";
  editNombre.value = cliente.nombre ?? "";
  editCorreo.value = cliente.correo ?? "";
  editTelefono.value = cliente.telefono ?? "";
  editDireccion.value = cliente.direccion ?? "";

  // Guardamos la cédula original para saber a cuál actualizar
  document.getElementById("editIdCliente").value = cliente.cedula;

  // Habilitamos o deshabilitamos? El requerimiento dice que se debe poder corregir.
  editCedula.disabled = false;
  modalEditarCliente.classList.remove("hidden");
}

/* =====================================================
   ✅ Cerrar modal (sin onclick)
===================================================== */
function cerrarModalEditarCliente() {
  modalEditarCliente.classList.add("hidden");
  editCedula.disabled = false;
}

btnCancelarEditar?.addEventListener("click", cerrarModalEditarCliente);

/* =====================================================
   💾 Confirmar edición
===================================================== */
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
      nuevaCedula: nuevaCedula,
      nombre: editNombre.value.trim().toUpperCase(),
      correo: editCorreo.value.trim().toUpperCase(),
      telefono: editTelefono.value.trim(),
      direccion: editDireccion.value.trim().toUpperCase()
    })
  });

  if (handle401(res)) return;

  if (!res.ok) {
    if (res.status === 409) {
      const msg = await safeReadError(res);
      Swal.fire("Duplicado", msg || "El correo ya está registrado.", "warning");
    } else {
      Swal.fire("Error", "No se pudo actualizar el cliente", "error");
    }
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Guardado con éxito",
    text: "Los datos del cliente fueron actualizados correctamente."
  });

  cerrarModalEditarCliente();
  await cargarClientes();

  // ✅ Mantener tu limpieza de filtro
  dataTableClientes?.search("").draw();
});

/* =====================================================
   ❌ Eliminar (SweetAlert2, sin confirm())
===================================================== */
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

  const res = await fetch(`${API_URL}/${ced}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  if (handle401(res)) return;

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const mensajeError = errorData.error || "No se pudo eliminar el cliente";

    Swal.fire("No se pudo eliminar", mensajeError, "error");
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Eliminado",
    timer: 900,
    showConfirmButton: false
  });

  await cargarClientes();
  dataTableClientes?.search("").draw();
}

/* =====================================================
   🚀 Init
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  cargarClientes();
});
