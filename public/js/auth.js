// ==========================================================
//  auth.js - Control de autenticación para páginas de admin
//  Florería Detalles Isabelita
// ==========================================================

// Obtiene token, rol y nombre desde localStorage
export function getUser() {
    return {
        token: localStorage.getItem("token"),
        rol: localStorage.getItem("rol"),
        nombre: localStorage.getItem("nombre"),
        usuario_id: localStorage.getItem("usuario_id")
    };
}

// ----------------------------------------------------------
// 1. Validar si el usuario está logueado
// ----------------------------------------------------------
export function isLogged() {
    const { token } = getUser();
    return !!token; // true si existe token
}

// ----------------------------------------------------------
// 2. Validar si el usuario es administrador
// ----------------------------------------------------------
export function isAdmin() {
    const { token, rol } = getUser();
    return !!token && rol === "admin";
}

// ----------------------------------------------------------
// 3. Proteger páginas solo para ADMIN
// ----------------------------------------------------------
export function protegerPaginaAdmin() {
    if (!isAdmin()) {
        window.location.href = "/login.html";
    }
}

// ----------------------------------------------------------
// 4. Mostrar información del usuario logueado en páginas admin
// ----------------------------------------------------------
export function mostrarInfoAdmin() {
    const infoDiv = document.getElementById("adminUserInfo");

    if (!infoDiv) return; // Evita errores si el div no existe

    const { nombre } = getUser();

    infoDiv.innerHTML = `
        👤 ${nombre} (Administrador)
        <button id="logoutBtn"
            class="ml-3 text-red-600 hover:text-red-800 font-medium">
            Cerrar sesión
        </button>
    `;

    // Evento para cerrar sesión
    document.getElementById("logoutBtn").addEventListener("click", cerrarSesion);
}

// ----------------------------------------------------------
// 5. Cerrar sesión
// ----------------------------------------------------------
export function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/login.html";
}
