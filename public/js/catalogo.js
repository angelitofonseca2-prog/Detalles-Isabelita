/* actualizarContadorCarrito está definida en nav_public.js y se usa al agregar al carrito */

/* ============================================
   INICIO
=============================================== */
document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo();
});

/* ============================================
   CARGAR PRODUCTOS
=============================================== */
/* ============================================
   VARIABLES GLOBALES
=============================================== */
let productosGlobal = [];
const buscadorInput = document.getElementById("buscadorCatalogo");
const filtroPrecioMin = document.getElementById("filtroPrecioMin");
const filtroPrecioMax = document.getElementById("filtroPrecioMax");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

/* ============================================
   CARGAR PRODUCTOS
=============================================== */
async function cargarCatalogo() {
  try {

    const res = await fetch("/api/productos?soloDisponibles=true");
    const productos = await res.json();

    productosGlobal = productos || []; // Guardar copia global
    renderCatalogo(productosGlobal);

    // Iniciar listeners de filtros
    if (buscadorInput) buscadorInput.addEventListener("input", filtrarCatalogo);
    if (filtroPrecioMin) filtroPrecioMin.addEventListener("input", filtrarCatalogo);
    if (filtroPrecioMax) filtroPrecioMax.addEventListener("input", filtrarCatalogo);

    // Botón borrar
    if (btnLimpiarFiltros) {
      btnLimpiarFiltros.addEventListener("click", () => {
        if (buscadorInput) buscadorInput.value = "";
        if (filtroPrecioMin) filtroPrecioMin.value = "";
        if (filtroPrecioMax) filtroPrecioMax.value = "";
        renderCatalogo(productosGlobal);
      });
    }

  } catch (error) {
    console.error("Error cargando catálogo:", error);
    Swal.fire("Error", "No se pudo cargar el catálogo", "error");
  }
}

/* ============================================
   FILTRAR CATÁLOGO
=============================================== */
function filtrarCatalogo() {
  const termino = buscadorInput ? buscadorInput.value.toLowerCase().trim() : "";
  const min = filtroPrecioMin && filtroPrecioMin.value ? parseFloat(filtroPrecioMin.value) : 0;
  const max = filtroPrecioMax && filtroPrecioMax.value ? parseFloat(filtroPrecioMax.value) : Infinity;

  const filtrados = productosGlobal.filter(producto => {
    const coincideNombre = producto.nombre.toLowerCase().includes(termino);
    const precio = parseFloat(producto.precio);
    const coincidePrecio = precio >= min && precio <= max;
    return coincideNombre && coincidePrecio;
  });

  renderCatalogo(filtrados);
}

/* ============================================
   RENDER CATÁLOGO
=============================================== */
function renderCatalogo(productos) {
  const contenedor = document.getElementById("gridProductos");
  contenedor.innerHTML = "";

  productos.forEach(producto => {
    const card = document.createElement("div");
    card.className = "bg-white shadow-lg p-4 rounded-lg flex flex-col items-center";

    card.innerHTML = `
      <img src="${producto.imagen}"
           alt="${producto.nombre}"
           loading="lazy"
           decoding="async"
           class="w-full h-48 object-cover rounded-md mb-4">

      <h3 class="text-lg font-bold text-pink-700">${producto.nombre}</h3>
      <p class="text-gray-700 text-sm mb-2">${producto.descripcion}</p>
      <p class="text-xl font-semibold text-pink-600 mb-3">$${producto.precio}</p>

      <button
        class="btn-agregar-al-carrito bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full"
        data-id="${producto.id}"
        data-nombre="${producto.nombre}"
        data-precio="${producto.precio}"
        data-imagen="${producto.imagen}">
        Agregar al carrito
      </button>
    `;

    contenedor.appendChild(card);
  });

  bindBotonesCarrito();
}

/* ============================================
   BIND BOTONES
=============================================== */
function bindBotonesCarrito() {
  const botones = document.querySelectorAll(".btn-agregar-al-carrito");


  botones.forEach(btn => {
    btn.addEventListener("click", () => {
      const producto = {
        id: Number(btn.dataset.id),
        nombre: btn.dataset.nombre,
        precio: Number(btn.dataset.precio),
        imagen: btn.dataset.imagen
      };


      agregarAlCarrito(producto);
    });
  });
}

/* ============================================
   AGREGAR AL CARRITO
=============================================== */
function agregarAlCarrito(producto) {


  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  let item = carrito.find(p => p.id === producto.id);

  if (item) {
    item.cantidad++;
    item.subtotal = item.precio_unitario * item.cantidad;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      precio_unitario: producto.precio,
      imagen: producto.imagen,
      cantidad: 1,
      subtotal: producto.precio,
      descuentoProducto: 0,
      descuentoCantidad: 0,
      descuentoMonto: 0
    });
  }

  localStorage.setItem("carrito", JSON.stringify(carrito));

  // Actualizar contador (función de nav_public) y disparar evento para redundancia
  if (typeof window.actualizarContadorCarrito === "function") {
    window.actualizarContadorCarrito();
  }
  window.dispatchEvent(new CustomEvent("carritoActualizado"));

  Swal.fire({
    icon: "success",
    title: "Añadido",
    text: `${producto.nombre} fue agregado al carrito.`,
    timer: 1200,
    showConfirmButton: false
  });
}
