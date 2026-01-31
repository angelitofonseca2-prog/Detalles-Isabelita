// public/js/mi_cuenta.js
const API_PERFIL = "/api/usuarios/perfil";

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosPerfil();

    const form = document.getElementById("formMiCuenta");
    if (form) {
        form.addEventListener("submit", gestionarEnvio);
    }
});

async function cargarDatosPerfil() {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(API_PERFIL, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById("nombre").value = data.nombre;
            document.getElementById("email").value = data.email;
        } else {
            console.error("No se pudo cargar el perfil");
        }
    } catch (error) {
        console.error("Error cargando perfil:", error);
    }
}

async function gestionarEnvio(e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // 1. Validar claves si el usuario quiere cambiarla
    if (password !== "" || confirmPassword !== "") {
        if (password !== confirmPassword) {
            Swal.fire({
                icon: "error",
                title: "Contraseñas no coinciden",
                text: "Asegúrate de que ambas contraseñas escritas sean iguales.",
                confirmButtonColor: "#db2777"
            });
            return;
        }
        if (password.length < 4) {
            Swal.fire({
                icon: "warning",
                title: "Clave muy corta",
                text: "La contraseña debe tener al menos 4 caracteres.",
                confirmButtonColor: "#db2777"
            });
            return;
        }
    }

    // 2. Enviar al servidor
    Swal.fire({
        title: "Guardando cambios...",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(API_PERFIL, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, email, password })
        });

        const result = await res.json();

        if (res.ok) {
            // Actualizar localstorage para que el navbar se refresque
            localStorage.setItem("nombre", nombre);

            Swal.fire({
                icon: "success",
                title: "¡Éxito!",
                text: "Tu información ha sido actualizada correctamente. Volviendo al panel...",
                confirmButtonColor: "#db2777",
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "/pedidos_admin.html";
            });
        } else {
            Swal.fire("Error", result.error || "No se pudo actualizar.", "error");
        }
    } catch (error) {
        console.error("Error actualización:", error);
        Swal.fire("Error", "Error de red al intentar guardar.", "error");
    }
}
