const API_MENSAJES = "/api/contacto";

let mensajesGlobal = [];
let paginaActual = 1;
const registrosPorPagina = 10;

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
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.status === 401) {
            Swal.fire("Sesión expirada", "Por favor inicia sesión de nuevo.", "error");
            location.href = "/login.html";
            return;
        }

        const mensajes = await res.json();
        mensajesGlobal = Array.isArray(mensajes) ? mensajes : [];
        paginaActual = 1;
        renderMensajes(mensajesGlobal);
    } catch (error) {
        console.error("Error al cargar mensajes:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500 font-bold">Error al conectar con el servidor.</td></tr>`;
    }
}

function renderMensajes(lista) {
    const tbody = document.getElementById("listaMensajes");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">No hay mensajes recibidos aún.</td></tr>`;
        renderPaginacion(0);
        return;
    }

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const itemsPagina = lista.slice(inicio, fin);

    itemsPagina.forEach(m => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition-colors border-b border-gray-100";
        const fecha = new Date(m.fecha).toLocaleString("es-EC", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
        tr.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-gray-500">${fecha}</td>
            <td class="px-4 py-3 font-semibold text-gray-900">${m.nombre}</td>
            <td class="px-4 py-3"><a href="mailto:${m.email}" class="text-pink-600 hover:underline">${m.email}</a></td>
            <td class="px-4 py-3 text-gray-600">${m.telefono || "-"}</td>
            <td class="px-4 py-3 text-gray-600 max-w-xs truncate" title="${(m.mensaje || "").replace(/"/g, '&quot;')}">${m.mensaje || ""}</td>
            <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                    <button class="btn-accion-editar btn-ver" data-nombre="${(m.nombre || "").replace(/"/g, '&quot;')}" data-mensaje="${(m.mensaje || "").replace(/"/g, '&quot;')}" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-accion-editar btn-responder p-2 text-green-600 hover:text-green-900" data-id="${m.id}" data-nombre="${(m.nombre || "").replace(/"/g, '&quot;')}" title="Enviar respuesta automática">
                        <i class="fas fa-reply"></i>
                    </button>
                    <button class="btn-accion-eliminar btn-eliminar" data-id="${m.id}" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPaginacion(lista.length);
}

function renderPaginacion(totalItems) {
    const container = document.getElementById("paginacionMensajes");
    if (!container) return;
    container.innerHTML = "";
    container.className = "paginacion-flechas";

    const totalPaginas = Math.ceil(totalItems / registrosPorPagina);
    if (totalPaginas <= 1) return;

    const inicio = (paginaActual - 1) * registrosPorPagina + 1;
    const fin = Math.min(paginaActual * registrosPorPagina, totalItems);

    const creaBtn = (icono, disabled, fn) => {
        const btn = document.createElement("button");
        btn.innerHTML = `<i class="fas fa-${icono}"></i>`;
        btn.disabled = disabled;
        btn.onclick = () => { fn(); };
        return btn;
    };

    container.appendChild(creaBtn("angle-double-left", paginaActual === 1, () => { paginaActual = 1; renderMensajes(mensajesGlobal); }));
    container.appendChild(creaBtn("angle-left", paginaActual === 1, () => { if (paginaActual > 1) { paginaActual--; renderMensajes(mensajesGlobal); } }));

    const info = document.createElement("span");
    info.className = "paginacion-info";
    info.textContent = `${inicio}-${fin} de ${totalItems}`;
    container.appendChild(info);

    container.appendChild(creaBtn("angle-right", paginaActual === totalPaginas, () => { if (paginaActual < totalPaginas) { paginaActual++; renderMensajes(mensajesGlobal); } }));
    container.appendChild(creaBtn("angle-double-right", paginaActual === totalPaginas, () => { paginaActual = totalPaginas; renderMensajes(mensajesGlobal); }));
}

function configurarDelegacionEventos() {
    document.getElementById("listaMensajes")?.addEventListener("click", (e) => {
        const btnVer = e.target.closest(".btn-ver");
        const btnResponder = e.target.closest(".btn-responder");
        const btnEliminar = e.target.closest(".btn-eliminar");
        if (btnVer) {
            verDetalle(btnVer.getAttribute("data-nombre") || "", btnVer.getAttribute("data-mensaje") || "");
        }
        if (btnResponder) {
            enviarRespuestaAutomatica(btnResponder.getAttribute("data-id"), btnResponder.getAttribute("data-nombre"));
        }
        if (btnEliminar) {
            confirmarEliminar(btnEliminar.getAttribute("data-id"));
        }
    });
}

async function enviarRespuestaAutomatica(id, nombre) {
    const result = await Swal.fire({
        title: "¿Enviar respuesta automática?",
        html: `Se enviará un correo a <strong>${nombre || "el contacto"}</strong> con un mensaje de agradecimiento.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#16a34a",
        cancelButtonColor: "#9ca3af",
        confirmButtonText: "Sí, enviar",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_MENSAJES}/${id}/responder`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            Swal.fire("Enviado", "La respuesta se envió correctamente.", "success");
        } else {
            Swal.fire(
                "Error",
                data.error || "No se pudo enviar el correo.",
                "error"
            );
        }
    } catch (error) {
        console.error("Error enviando respuesta:", error);
        Swal.fire("Error", "Error de red al intentar enviar.", "error");
    }
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
                mensajesGlobal = mensajesGlobal.filter(x => x.id != id);
                renderMensajes(mensajesGlobal);
            } else {
                Swal.fire("Error", "No se pudo eliminar el mensaje.", "error");
            }
        } catch (error) {
            Swal.fire("Error", "Error de red al intentar eliminar.", "error");
        }
    }
}
