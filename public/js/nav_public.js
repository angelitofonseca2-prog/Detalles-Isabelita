/* ---------------------------------------------------------
   NAVBAR GLOBAL PARA PÁGINAS PÚBLICAS (index, carrito, login)
   Se adapta según estado de login y rol
----------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    const nombre = localStorage.getItem("nombre");

    let adminLinks = "";

    // Si es ADMIN → mostrar todo el menú de administración
    if (token && rol === "admin") {
        adminLinks = `
            <li><a href="/clientes.html" class="hover:underline">Administrar Clientes</a></li>
            <li><a href="/productos.html" class="hover:underline">Administrar Productos</a></li>
            <li><a href="/pedidos_admin.html" class="hover:underline">Administrar Pedidos</a></li>
            <li><a href="/admin/descuentos_admin.html" class="hover:underline">Administrar Descuentos</a></li>
            <li><a href="/mensajes_admin.html" class="hover:underline">Administrar mensajes</a></li>
            <li><a href="/usuarios_admin.html" class="hover:underline">Administrar usuarios</a></li>
        `;
    }

    // Botones login / logout
    let authButton = "";

    if (!token) {
        // Usuario no logueado: mostrar acceso para administradores (evitar confusión con clientes)
        authButton = `
            <button id="loginBtn"
                class="bg-white text-pink-600 px-3 py-1 rounded hover:bg-gray-200 font-semibold"
                title="Para personal de la tienda">
                Iniciar sesión administrador
            </button>
        `;
    } else {
        // Cliente o Admin logueado
        authButton = `
            <span>👤 ${nombre} (${rol === "admin" ? "Administrador" : "Cliente"})</span>
            <button id="logoutBtn"
                class="bg-white text-pink-600 px-3 py-1 rounded hover:bg-gray-200 font-semibold">
                Cerrar sesión
            </button>
        `;
    }

    // Navbar HTML
    const navbar = `
    <nav class="site-nav bg-pink-600 p-4 text-white shadow-md flex flex-wrap justify-between items-center gap-2">

        <!-- IZQUIERDA: Logo + Hamburguesa (móvil) -->
        <div class="flex items-center gap-3">
            <button type="button" class="site-nav-burger" aria-label="Abrir menú">
                ☰
            </button>
            <a href="/index.html" class="flex items-center gap-2 shrink-0">
                <img src="/resources/logo.png" alt="Isabel, Detalles Eternos" class="h-10 sm:h-12 w-auto max-h-12 object-contain">
            </a>
        </div>

        <!-- CENTRO + DERECHA: Menú colapsable en móvil -->
        <div class="site-nav-wrap flex-1 flex flex-wrap justify-between items-center gap-4">
            <ul class="site-nav-menu flex gap-4 sm:gap-6 items-center font-semibold">

                <li><a href="/index.html" class="hover:underline">Inicio</a></li>
                <li><a href="/contacto.html" class="hover:underline">Contacto</a></li>

                <li>
                    <a href="/carrito.html" class="hover:underline">
                        🛒 Carrito <span id="contadorCarrito"
                        class="bg-white text-pink-600 px-2 py-0.5 rounded-full">0</span>
                    </a>
                </li>

                ${adminLinks}
            </ul>

            <div class="site-nav-actions flex items-center gap-2 sm:gap-4">
                ${authButton}
            </div>
        </div>
    </nav>
    `;

    // Insertarlo al inicio del body
    document.body.insertAdjacentHTML("afterbegin", navbar);

    // Toggle menú hamburguesa (móvil)
    const burgerBtn = document.querySelector(".site-nav-burger");
    const navWrap = document.querySelector(".site-nav-wrap");
    if (burgerBtn && navWrap) {
        burgerBtn.addEventListener("click", () => navWrap.classList.toggle("open"));
    }

    // Botón flotante de carrito para móviles
    const floatingCart = `
      <a id="floatingCart" href="/carrito.html" class="floating-cart" aria-label="Ver carrito">
        🛒 <span id="floatingCartCount" class="floating-cart-count">0</span>
      </a>
    `;
    document.body.insertAdjacentHTML("beforeend", floatingCart);

    // Eventos login y logout
    if (document.getElementById("loginBtn")) {
        document.getElementById("loginBtn").addEventListener("click", () => {
            window.location.href = "/login.html";
        });
    }

    if (document.getElementById("logoutBtn")) {
        document.getElementById("logoutBtn").addEventListener("click", () => {
            localStorage.clear();
            Swal.fire({
                icon: "success",
                title: "Sesión cerrada",
                timer: 1200,
                showConfirmButton: false
            });
            setTimeout(() => {
                window.location.href = "/index.html";
            }, 1200);
        });
    }
});

/* -----------------------------------------
   ACTUALIZAR CONTADOR DEL CARRITO
------------------------------------------ */

function actualizarContadorCarrito() {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    // Sumar cantidades
    let total = carrito.reduce((acum, item) => acum + Number(item.cantidad), 0);

    const span = document.getElementById("contadorCarrito");
    if (span) span.textContent = total;

    const floatSpan = document.getElementById("floatingCartCount");
    if (floatSpan) floatSpan.textContent = total;
}

// Ejecutar cuando cargue el DOM
document.addEventListener("DOMContentLoaded", actualizarContadorCarrito);

// Escuchar cambios del carrito desde otras páginas
window.addEventListener("storage", actualizarContadorCarrito);
