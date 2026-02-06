// public/js/usuarios_admin.js
const API_USUARIOS = "/api/usuarios";

document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarios();
    configurarEventosDOM();
});

function configurarEventosDOM() {
    const btnNuevo = document.getElementById("btnNuevoUsuario");
    const btnCerrar = document.getElementById("btnCerrarModal");
    const modal = document.getElementById("modalUsuario");
    const form = document.getElementById("formUsuario");

    if (btnNuevo) {
        btnNuevo.addEventListener("click", () => abrirModal());
    }

    if (btnCerrar) {
        btnCerrar.addEventListener("click", cerrarModal);
    }

    if (form) {
        form.addEventListener("submit", gestionarEnvio);
    }

    // Delegación de eventos para la tabla
    const tbody = document.getElementById("listaUsuarios");
    if (tbody) {
        tbody.addEventListener("click", e => {
            const btnEditar = e.target.closest(".btn-editar");
            const btnEliminar = e.target.closest(".btn-eliminar");
            if (btnEditar) {
                try {
                    const u = JSON.parse(btnEditar.dataset.usuario || "{}");
                    abrirModal(u);
                } catch (err) { console.error(err); }
            }
            if (btnEliminar) {
                confirmarEliminar(btnEliminar.dataset.id);
            }
        });
    }
}

let usuariosGlobal = [];
let paginaActual = 1;
const registrosPorPagina = 10;

async function cargarUsuarios() {
    const tbody = document.getElementById("listaUsuarios");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Cargando usuarios...</td></tr>`;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(API_USUARIOS, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Acceso denegado");

        const usuarios = await res.json();
        usuariosGlobal = Array.isArray(usuarios) ? usuarios : [];
        paginaActual = 1;
        renderUsuarios(usuariosGlobal);
    } catch (error) {
        console.error("Error cargando usuarios:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Error al conectar con la base de datos.</td></tr>`;
    }
}

function renderUsuarios(lista) {
    const tbody = document.getElementById("listaUsuarios");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-500">No hay usuarios.</td></tr>`;
        renderPaginacionUsuarios(0);
        return;
    }

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const itemsPagina = lista.slice(inicio, fin);

    itemsPagina.forEach(u => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition-colors border-b border-gray-100";

        const estadoBadge = u.activo === 1
            ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Activo</span>'
            : '<span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase">Inactivo</span>';

        const rolEmoji = u.rol === "admin" ? "🛡️" : "👤";
        const usuarioJson = JSON.stringify(u).replace(/'/g, "&#39;");

        tr.innerHTML = `
            <td class="px-4 py-3">
                <div class="flex flex-col">
                    <span class="font-bold text-gray-900">${u.nombre}</span>
                    <span class="text-xs text-gray-400 italic">${u.email}</span>
                </div>
            </td>
            <td class="px-4 py-3 uppercase font-bold text-xs">
                <span class="bg-gray-100 px-2 py-1 rounded text-gray-600">${rolEmoji} ${u.rol}</span>
            </td>
            <td class="px-4 py-3">${estadoBadge}</td>
            <td class="px-4 py-3 text-gray-400 text-xs">${new Date(u.creado_en).toLocaleDateString()}</td>
            <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                    <button class="btn-accion-editar btn-editar" data-usuario='${usuarioJson}' title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-accion-eliminar btn-eliminar" data-id="${u.id}" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPaginacionUsuarios(lista.length);
}

function renderPaginacionUsuarios(totalItems) {
    const container = document.getElementById("paginacionUsuarios");
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
        btn.onclick = fn;
        return btn;
    };

    container.appendChild(creaBtn("angle-double-left", paginaActual === 1, () => { paginaActual = 1; renderUsuarios(usuariosGlobal); }));
    container.appendChild(creaBtn("angle-left", paginaActual === 1, () => { if (paginaActual > 1) { paginaActual--; renderUsuarios(usuariosGlobal); } }));

    const info = document.createElement("span");
    info.className = "paginacion-info";
    info.textContent = `${inicio}-${fin} de ${totalItems}`;
    container.appendChild(info);

    container.appendChild(creaBtn("angle-right", paginaActual === totalPaginas, () => { if (paginaActual < totalPaginas) { paginaActual++; renderUsuarios(usuariosGlobal); } }));
    container.appendChild(creaBtn("angle-double-right", paginaActual === totalPaginas, () => { paginaActual = totalPaginas; renderUsuarios(usuariosGlobal); }));
}

function abrirModal(u = null) {
    const modal = document.getElementById("modalUsuario");
    const modalContent = document.getElementById("modalContent");
    const titulo = document.getElementById("modalTitulo");
    const passwordHint = document.getElementById("passwordHint");

    // Resetear form
    document.getElementById("formUsuario").reset();
    document.getElementById("usuarioId").value = u ? u.id : "";

    if (u) {
        titulo.innerText = "Editar Usuario";
        document.getElementById("nombre").value = u.nombre;
        document.getElementById("email").value = u.email;
        document.getElementById("rol").value = u.rol;
        document.getElementById("activo").value = u.activo;
        passwordHint.innerText = "Dejar en blanco para mantener clave actual.";
    } else {
        titulo.innerText = "Crear Nuevo Usuario";
        passwordHint.innerText = "Clave temporal para el primer acceso.";
    }

    modal.classList.add("flex");
    modal.classList.remove("hidden");
    setTimeout(() => {
        modalContent.classList.remove("scale-95", "opacity-0");
        modalContent.classList.add("scale-100", "opacity-100");
    }, 10);
}

function cerrarModal() {
    const modal = document.getElementById("modalUsuario");
    const modalContent = document.getElementById("modalContent");

    modalContent.classList.remove("scale-100", "opacity-100");
    modalContent.classList.add("scale-95", "opacity-0");

    setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }, 300);
}

async function gestionarEnvio(e) {
    e.preventDefault();

    const id = document.getElementById("usuarioId").value;
    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const rol = document.getElementById("rol").value;
    const activo = parseInt(document.getElementById("activo").value);
    const password = document.getElementById("password").value;

    const token = localStorage.getItem("token");
    const esEdicion = id !== "";

    // Validación básica para creación
    if (!esEdicion && password.length < 4) {
        Swal.fire("Error", "La contraseña es obligatoria para nuevos usuarios (mín. 4 caracteres).", "warning");
        return;
    }

    Swal.fire({ title: "Procesando...", allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    try {
        const url = esEdicion ? `${API_USUARIOS}/${id}` : API_USUARIOS;
        const method = esEdicion ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, email, rol, activo, password })
        });

        const result = await res.json();

        if (res.ok) {
            Swal.fire("¡Éxito!", result.mensaje, "success");
            cerrarModal();
            cargarUsuarios();
        } else {
            Swal.fire("Error", result.error || "No se pudo completar la acción", "error");
        }
    } catch (error) {
        console.error("Error envío usuario:", error);
        Swal.fire("Error", "Error de red al conectar con el servidor.", "error");
    }
}

async function confirmarEliminar(id) {
    const result = await Swal.fire({
        title: "¿Eliminar permanentemente?",
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#db2777",
        cancelButtonColor: "#9ca3af",
        confirmButtonText: "Sí, borrar"
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_USUARIOS}/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                Swal.fire("Borrado", "El usuario ha sido eliminado.", "success");
                usuariosGlobal = usuariosGlobal.filter(x => x.id != id);
                renderUsuarios(usuariosGlobal);
            } else {
                const d = await res.json();
                Swal.fire("Error", d.error || "No se pudo borrar.", "error");
            }
        } catch (error) {
            Swal.fire("Error", "Error de red.", "error");
        }
    }
}
