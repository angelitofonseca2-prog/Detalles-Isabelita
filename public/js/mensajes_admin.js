// public/js/mensajes_admin.js
const API_MENSAJES = "/api/contacto";

document.addEventListener("DOMContentLoaded", () => {
    cargarMensajes();
    configurarDelegacionEventos();
});

async function cargarMensajes() {
    const tbody = document.getElementById("listaMensajes");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500">Cargando mensajes...</td></tr>`;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(API_MENSAJES, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            Swal.fire("Sesión expirada", "Por favor inicia sesión de nuevo.", "error");
            location.href = "/login.html";
            return;
        }

        const mensajes = await res.json();

        if (mensajes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500">No hay mensajes recibidos aún.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        mensajes.forEach(m => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50 transition-colors border-b border-gray-100";

            const fecha = new Date(m.fecha).toLocaleString("es-EC", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            // Usamos data attributes en lugar de onclick para cumplir con la CSP
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">${fecha}</td>
                <td class="px-6 py-4 font-semibold text-gray-900">${m.nombre}</td>
                <td class="px-6 py-4 text-pink-600 underline"><a href="mailto:${m.email}">${m.email}</a></td>
                <td class="px-6 py-4 text-gray-600">${m.telefono || "-"}</td>
                <td class="px-6 py-4 text-gray-600 max-w-xs truncate" title="${m.mensaje}">${m.mensaje}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button class="btn-ver text-blue-600 hover:text-blue-900 font-bold" 
                            data-nombre="${m.nombre}" data-mensaje="${m.mensaje}">Ver</button>
                    
                    <a href="mailto:${m.email}?subject=Respuesta a su consulta - Detalles Isabelita&body=Hola ${m.nombre},%0D%0A%0D%0AGracias por contactarnos..." 
                       class="text-green-600 hover:text-green-900 font-bold">Responder</a>
                    
                    <button class="btn-eliminar text-red-600 hover:text-red-900 font-bold" 
                            data-id="${m.id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error al cargar mensajes:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500 font-bold">Error al conectar con el servidor.</td></tr>`;
    }
}

function configurarDelegacionEventos() {
    const tbody = document.getElementById("listaMensajes");
    if (!tbody) return;

    tbody.addEventListener("click", (e) => {
        // Botón Ver
        if (e.target.classList.contains("btn-ver")) {
            const nombre = e.target.getAttribute("data-nombre");
            const mensaje = e.target.getAttribute("data-mensaje");
            verDetalle(nombre, mensaje);
        }

        // Botón Eliminar
        if (e.target.classList.contains("btn-eliminar")) {
            const id = e.target.getAttribute("data-id");
            confirmarEliminar(id);
        }
    });
}

function verDetalle(nombre, mensaje) {
    Swal.fire({
        title: `Mensaje de ${nombre}`,
        text: mensaje,
        confirmButtonText: "Cerrar",
        confirmButtonColor: "#db2777"
    });
}

async function confirmarEliminar(id) {
    const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "Esta acción eliminará el mensaje permanentemente.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#db2777",
        cancelButtonColor: "#9ca3af",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_MENSAJES}/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                Swal.fire("Eliminado", "El mensaje ha sido borrado.", "success");
                cargarMensajes();
            } else {
                Swal.fire("Error", "No se pudo eliminar el mensaje.", "error");
            }
        } catch (error) {
            Swal.fire("Error", "Error de red al intentar eliminar.", "error");
        }
    }
}
