/* ---------------------------------------------------------
   NAVBAR GLOBAL PARA TODAS LAS PÁGINAS ADMIN
----------------------------------------------------------- */

import { verificarAdmin } from "./authGuard.js";

let usuario = null; // ✅ declarar en scope global

document.addEventListener("DOMContentLoaded", async () => {

  // 🔐 Verificar sesión ADMIN (UNA SOLA VEZ)
  usuario = await verificarAdmin();
  if (!usuario) {
    localStorage.clear();
    window.location.href = "/login.html";
    return;
  }


  // Construimos el menú SOLO si es admin válido
  const navbar = `
    <nav class="bg-pink-600 p-4 text-white shadow-md flex justify-between items-center">

      <!-- IZQUIERDA: Logo + Nombre -->
      <div class="flex items-center gap-2 text-lg font-bold">
          <span class="text-2xl">🌷</span>
          Florería Detalles Isabelita
      </div>

      <!-- MENÚ -->
      <ul class="flex gap-6 items-center font-semibold">

          <li><a href="/index.html" class="hover:underline">Inicio</a></li>

          <li>
              <a href="/carrito.html" class="hover:underline">
                  🛒 Carrito
                  <span id="contadorCarrito"
                        class="bg-white text-pink-600 px-2 py-0.5 rounded-full">0</span>
              </a>
          </li>

          <!-- SOLO ADMIN -->
          <li><a href="/clientes.html" class="hover:underline">Administrar Clientes</a></li>
          <li><a href="/productos.html" class="hover:underline">Administrar Productos</a></li>
          <li><a href="/pedidos_admin.html" class="hover:underline">Administrar Pedidos</a></li>
          <li><a href="/admin/descuentos_admin.html" class="hover:underline">Administrar Descuentos</a></li>
          <li><a href="/mensajes_admin.html" class="hover:underline">Administrar mensajes</a></li>
          <li><a href="/usuarios_admin.html" class="hover:underline">Administrar usuarios</a></li>
      </ul> 

      <!-- DERECHA: Usuario (Link a Mi Cuenta) + Logout -->
      <div class="flex items-center gap-6">
          <a href="/mi_cuenta.html" class="flex items-center gap-2 hover:bg-pink-700 p-2 rounded transition-all group" title="Configurar Mi Cuenta">
              <span class="text-xl group-hover:scale-110 transition-transform">⚙️</span>
              <div class="flex flex-col leading-none">
                <span id="adminNombre" class="font-bold border-b border-pink-400 pb-0.5">${usuario.nombre}</span>
                <span class="text-[10px] uppercase tracking-tighter opacity-80 mt-1">Mi Cuenta</span>
              </div>
          </a>
          <button id="logoutBtn"
              class="bg-white text-pink-600 px-4 py-2 rounded-lg hover:bg-gray-100 font-bold shadow-sm transition-all active:scale-95">
              Cerrar sesión
          </button>
      </div>

    </nav>
  `;

  // Insertar el menú al inicio del <body>
  document.body.insertAdjacentHTML("afterbegin", navbar);

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
