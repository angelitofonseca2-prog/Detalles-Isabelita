// /public/js/authGuard.js

export async function verificarAdmin() {
  const token = localStorage.getItem("token");

  // ❌ No hay sesión
  if (!token) return null;

  try {
    const res = await fetch("/api/auth/verify", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (!data.usuario || data.usuario.rol !== "admin") {
      return null;
    }

    return data.usuario;

  } catch (err) {
    console.warn("AuthGuard:", err.message);
    return null;
  }
}

function cerrarSesion(mensaje = "Sesión finalizada") {
  // 1️⃣ Limpiar sesión
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  localStorage.removeItem("nombre");
  localStorage.removeItem("usuario_id");

  // 2️⃣ Mostrar mensaje (opcional)
  alert(mensaje);

  // 3️⃣ Redirigir (OBLIGATORIO)
  window.location.href = "/login.html";
}
