/* ---------------------------------------------------------
   NAVBAR GLOBAL PARA TODAS LAS PÁGINAS ADMIN
----------------------------------------------------------- */

import { verificarAdmin } from "./authGuard.js";

let usuario = null; // ✅ declarar en scope global

document.addEventListener("DOMContentLoaded", async () => {
  // Detectar móvil/tablet y marcar body para forzar menú hamburguesa
  const esMovil = () => window.innerWidth <= 1024;
  if (esMovil()) document.body.classList.add("nav-mobile");
  window.addEventListener("resize", () => {
    document.body.classList.toggle("nav-mobile", esMovil());
  });

  // 🔐 Verificar sesión ADMIN (UNA SOLA VEZ)
  usuario = await verificarAdmin();
  if (!usuario) {
    localStorage.clear();
    window.location.href = "/login.html";
    return;
  }


  // Construimos el menú SOLO si es admin válido
  const navbar = `
    <nav class="site-nav bg-pink-600 p-4 text-white shadow-md flex flex-wrap justify-between items-center gap-2 w-full max-w-full overflow-x-hidden">

      <!-- IZQUIERDA: Hamburguesa (móvil) + Logo -->
      <div class="flex items-center gap-3">
          <button type="button" class="site-nav-burger" aria-label="Abrir menú">☰</button>
          <a href="/index.html" class="flex items-center shrink-0">
              <img src="/resources/logo.png" alt="Isabel, Detalles Eternos" class="site-nav-logo">
          </a>
      </div>

      <!-- CENTRO + DERECHA: Menú colapsable en móvil -->
      <div class="site-nav-wrap flex-1 flex flex-wrap justify-between items-center gap-4">
          <ul class="site-nav-menu flex gap-4 sm:gap-6 items-center font-semibold">
              <li><a href="/index.html" class="hover:underline">Inicio</a></li>
              <li>
                  <a href="/carrito.html" class="hover:underline">
                      🛒 Carrito <span id="contadorCarrito" class="bg-white text-pink-600 px-2 py-0.5 rounded-full">0</span>
                  </a>
              </li>
              <li><a href="/clientes.html" class="hover:underline">Administrar Clientes</a></li>
              <li><a href="/productos.html" class="hover:underline">Administrar Productos</a></li>
              <li><a href="/pedidos_admin.html" class="hover:underline">Administrar Pedidos</a></li>
              <li><a href="/admin/descuentos_admin.html" class="hover:underline">Administrar Descuentos</a></li>
              <li><a href="/mensajes_admin.html" class="hover:underline">Administrar mensajes</a></li>
              <li><a href="/usuarios_admin.html" class="hover:underline">Administrar usuarios</a></li>
          </ul>
          <div class="site-nav-actions flex items-center gap-2 sm:gap-4">
              <a href="/mi_cuenta.html" class="flex items-center gap-2 hover:bg-pink-700 p-2 rounded transition-all group" title="Mi Cuenta">
                  <span class="text-xl">⚙️</span>
                  <span id="adminNombre" class="font-bold hidden sm:inline">${usuario.nombre}</span>
              </a>
              <button id="logoutBtn" class="bg-white text-pink-600 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-100 font-bold text-sm sm:text-base transition-all active:scale-95">
                  Cerrar sesión
              </button>
          </div>
      </div>
    </nav>
  `;

  // Insertar el menú al inicio del <body>
  document.body.insertAdjacentHTML("afterbegin", navbar);

  // Toggle menú hamburguesa (móvil)
  const burgerBtn = document.querySelector(".site-nav-burger");
  const navWrap = document.querySelector(".site-nav-wrap");
  if (burgerBtn && navWrap) {
    burgerBtn.addEventListener("click", () => navWrap.classList.toggle("open"));
    // En móvil: ocultar menú al cargar (por si CSS falla)
    if (esMovil()) navWrap.classList.remove("open");
  }

  // Botón cerrar sesión
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();

    // ✅ FIX: SweetAlert opcional (no rompe si no existe)
    if (window.Swal) {
      Swal.fire({
        icon: "success",
        title: "Sesión cerrada",
        timer: 1200,
        showConfirmButton: false
      });
    }

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  });

});
