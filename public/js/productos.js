/* ================================================
   🌸 Florería Detalles Isabelita – Productos (Admin)
================================================ */

const API_URL = "/api/productos";
const API_CATS = "/api/categorias";

/* =================================================
   🔐 Helpers de seguridad
================================================= */
function getToken() {
  return localStorage.getItem("token") || "";
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

/* =================================================
   📌 DOM
================================================= */
const listaProductos = document.getElementById("listaProductos");

// Filtros
const filtroNombre = document.getElementById("filtroNombre");
const filtroPrecioMin = document.getElementById("filtroPrecioMin");
const filtroPrecioMax = document.getElementById("filtroPrecioMax");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

let productosGlobal = [];

// Modal nuevo
const btnNuevo = document.getElementById("btnNuevo");
const modalNuevo = document.getElementById("modalNuevo");
const cancelarNuevo = document.getElementById("cancelarNuevo");
const formNuevo = document.getElementById("formNuevo");

// Modal editar
const modalEditar = document.getElementById("modalEditar");
const formEditar = document.getElementById("formEditar");
const btnCancelarEditar = document.querySelector("#modalEditar button[type='button']");

const editId = document.getElementById("editId");
const editNombre = document.getElementById("editNombre");
const editDescripcion = document.getElementById("editDescripcion");
const editPrecio = document.getElementById("editPrecio");
const editStock = document.getElementById("editStock");
const editCategoria = document.getElementById("editCategoria");

/* =================================================
   🔹 Cargar categorías
================================================= */
async function cargarCategorias(selectId) {
  try {
    const res = await fetch(API_CATS);
    const categorias = await res.json();
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione categoría</option>';

    categorias.forEach(c => {
      const op = document.createElement("option");
      op.value = c.id;
      op.textContent = c.nombre;
      select.appendChild(op);
    });
  } catch (error) {
    console.error("Error al cargar categorías:", error);
  }
}

/* =================================================
   📦 Mostrar productos
================================================= */
async function mostrarProductos() {
  if (listaProductos) listaProductos.innerHTML = `<p class="col-span-full text-center text-gray-500 py-12 animate-pulse">Cargando productos…</p>`;
  try {
    const res = await fetch(API_URL);
    const productos = await res.json();

    productosGlobal = productos || [];
    renderizarProductos(productosGlobal);
  } catch (error) {
    console.error("Error al mostrar productos:", error);
  }
}

function renderizarProductos(productos) {
  listaProductos.innerHTML = "";

  if (!productos || productos.length === 0) {
    listaProductos.innerHTML = `<p class="col-span-full text-center text-gray-500 py-12">No hay productos que coincidan. Ajusta los filtros o haz clic en &quot;Nuevo Producto&quot; para agregar uno.</p>`;
    return;
  }

  productos.forEach(p => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow";

    card.innerHTML = `
        <img src="${p.imagen}" class="w-full h-48 object-cover rounded-t-xl" alt="${p.nombre}">
        <div class="p-4">
          <h3 class="text-lg font-bold text-pink-600">${p.nombre}</h3>
          <p class="text-gray-600 text-sm truncate">${(p.descripcion || "").slice(0, 60)}${(p.descripcion || "").length > 60 ? "…" : ""}</p>
          <p class="font-bold text-pink-600 mt-2">$${p.precio}</p>
          <p class="text-xs text-gray-500">Stock: ${p.stock}</p>
          <div class="mt-4 flex justify-center gap-2">
            <button class="btn-editar bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold" data-id="${p.id}"><i class="fas fa-edit mr-1"></i> Editar</button>
            <button class="btn-eliminar bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold" data-id="${p.id}"><i class="fas fa-trash-alt mr-1"></i> Eliminar</button>
          </div>
        </div>
      `;

    listaProductos.appendChild(card);
  });
}

function filtrarProductos() {
  const texto = filtroNombre.value.toLowerCase().trim();
  const min = parseFloat(filtroPrecioMin.value) || 0;
  const max = parseFloat(filtroPrecioMax.value) || Infinity;

  const filtrados = productosGlobal.filter(p => {
    const cumpleNombre = p.nombre.toLowerCase().includes(texto);
    const precio = parseFloat(p.precio);
    const cumplePrecio = precio >= min && precio <= max;
    return cumpleNombre && cumplePrecio;
  });

  renderizarProductos(filtrados);
}

// Event Listeners Filtros
filtroNombre.addEventListener("input", filtrarProductos);
filtroPrecioMin.addEventListener("input", filtrarProductos);
filtroPrecioMax.addEventListener("input", filtrarProductos);

btnLimpiarFiltros.addEventListener("click", () => {
  filtroNombre.value = "";
  filtroPrecioMin.value = "";
  filtroPrecioMax.value = "";
  renderizarProductos(productosGlobal);
});

/* =================================================
   🖱️ Delegación de eventos (editar / eliminar)
================================================= */
listaProductos.addEventListener("click", e => {
  const editar = e.target.closest(".btn-editar");
  const eliminar = e.target.closest(".btn-eliminar");

  if (editar) abrirEditarProducto(editar.dataset.id);
  if (eliminar) confirmarEliminarProducto(eliminar.dataset.id);
});

/* =================================================
   ✏️ Editar producto
================================================= */
async function abrirEditarProducto(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) {
      Swal.fire("Error", "Producto no encontrado", "error");
      return;
    }

    const p = await res.json();

    editId.value = p.id;
    editNombre.value = p.nombre;
    editDescripcion.value = p.descripcion;
    editPrecio.value = p.precio;
    editStock.value = p.stock;

    await cargarCategorias("editCategoria");
    editCategoria.value = p.categoria_id;

    modalEditar.classList.add("flex");
    modalEditar.classList.remove("hidden");
  } catch (error) {
    console.error("Error al cargar producto:", error);
  }
}

/* =================================================
   💾 Guardar edición
================================================= */
formEditar.addEventListener("submit", async e => {
  e.preventDefault();

  const id = editId.value;
  const formData = new FormData(formEditar);

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: formData
    });

    if (handle401(res)) return;

    if (!res.ok) {
      const msg = await res.json();
      Swal.fire("Error", msg.error || "No se pudo actualizar", "error");
      return;
    }

    Swal.fire("Actualizado", "Producto actualizado correctamente", "success");
    cerrarModalEditar();
    mostrarProductos();
  } catch (error) {
    console.error("Error al actualizar:", error);
  }
});

/* =================================================
   ❌ Eliminar producto
================================================= */
async function confirmarEliminarProducto(id) {
  const { isConfirmed } = await Swal.fire({
    title: "¿Eliminar producto?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!isConfirmed) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    if (handle401(res)) return;

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const mensajeError = errorData.error || "No se pudo eliminar el producto";
      Swal.fire("No se pudo eliminar", mensajeError, "error");
      return;
    }

    Swal.fire("Eliminado", "Producto eliminado correctamente", "success");
    mostrarProductos();
  } catch (error) {
    console.error("Error al eliminar:", error);
  }
}

/* =================================================
   ➕ Nuevo producto
================================================= */
btnNuevo.addEventListener("click", async () => {
  formNuevo.reset();
  await cargarCategorias("nuevoCategoria");
  modalNuevo.classList.add("flex");
  modalNuevo.classList.remove("hidden");
});

cancelarNuevo.addEventListener("click", () => {
  modalNuevo.classList.add("hidden");
  modalNuevo.classList.remove("flex");
});

formNuevo.addEventListener("submit", async e => {
  e.preventDefault();

  const formData = new FormData(formNuevo);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData
    });

    if (handle401(res)) return;

    if (!res.ok) {
      const msg = await res.json();
      Swal.fire("Error", msg.error || "No se pudo crear el producto", "error");
      return;
    }

    Swal.fire("Creado", "Producto creado correctamente", "success");
    modalNuevo.classList.add("hidden");
    modalNuevo.classList.remove("flex");
    mostrarProductos();
  } catch (error) {
    console.error("Error al crear producto:", error);
  }
});

/* =================================================
   ❎ Cerrar modal editar
================================================= */
function cerrarModalEditar() {
  modalEditar.classList.add("hidden");
  modalEditar.classList.remove("flex");
  formEditar.reset();
}

btnCancelarEditar.addEventListener("click", cerrarModalEditar);
document.getElementById("btnCerrarModalEditar")?.addEventListener("click", cerrarModalEditar);

document.getElementById("btnCerrarModalNuevo")?.addEventListener("click", () => {
  modalNuevo.classList.add("hidden");
  modalNuevo.classList.remove("flex");
});

/* =================================================
   🚀 Init
================================================= */
document.addEventListener("DOMContentLoaded", mostrarProductos);
