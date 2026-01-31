// ===============================================================
//  UTILIDAD – OBTENER HEADERS CON TOKEN ADMIN
// ===============================================================
function getAuthHeaders(extra = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        Swal.fire("Sesión expirada", "Vuelve a iniciar sesión", "warning");
        //window.location.href = "/login.html";
        throw new Error("Token no encontrado");
    }

    return {
        "Authorization": "Bearer " + token,
        ...extra
    };
}


// ===============================================================
//  GESTIÓN DE PESTAÑAS
// ===============================================================
document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabSections = document.querySelectorAll(".tab-section");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;

            tabButtons.forEach(b => {
                b.classList.remove("bg-pink-600", "text-white", "shadow-lg");
                b.classList.add("text-gray-500", "hover:bg-pink-50", "hover:text-pink-600");
            });

            btn.classList.remove("text-gray-500", "hover:bg-pink-50", "hover:text-pink-600");
            btn.classList.add("bg-pink-600", "text-white", "shadow-lg");

            tabSections.forEach(section => {
                section.classList.add("hidden");
            });

            document.getElementById(tab).classList.remove("hidden");
        });
    });

    cargarDescuentos();
    cargarProductos();
});


// ===============================================================
//  CARGAR TODOS LOS DESCUENTOS (MONTO + CANTIDAD)
// ===============================================================
async function cargarDescuentos() {
    const res = await fetch("/api/descuentos", {
        headers: getAuthHeaders()
    });

    if (!res.ok) {
        throw new Error("No autorizado");
    }

    const descuentos = await res.json();

    cargarDescuentosMonto(descuentos.filter(d => d.tipo === "monto"));
    cargarDescuentosCantidad(descuentos.filter(d => d.tipo === "cantidad"));
}


// ===============================================================
//  TABLA — DESCUENTOS POR MONTO
// ===============================================================
function cargarDescuentosMonto(descuentos) {
    const tbody = document.querySelector("#tabla-monto tbody");
    tbody.innerHTML = "";

    descuentos.forEach(desc => {
        const row = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-bold text-gray-900">$${desc.minimo}</td>
                <td class="px-6 py-4">
                    <span class="bg-pink-100 text-pink-700 px-3 py-1 rounded-full font-bold">${desc.porcentaje}%</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                        <button class="btn-editar-descuento p-2 text-blue-600 hover:text-blue-900 transition-colors" 
                            title="Editar"
                            data-id="${desc.id}"
                            data-tipo="${desc.tipo}"
                            data-minimo="${desc.minimo}"
                            data-porcentaje="${desc.porcentaje}">
                            <i class="fas fa-edit"></i>
                        </button>

                        <button class="btn-eliminar-descuento p-2 text-red-600 hover:text-red-900 transition-colors" 
                            title="Eliminar"
                            data-id="${desc.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
    });
}


// ===============================================================
//  TABLA — DESCUENTOS POR CANTIDAD
// ===============================================================
function cargarDescuentosCantidad(descuentos) {
    const tbody = document.querySelector("#tabla-cantidad tbody");
    tbody.innerHTML = "";

    descuentos.forEach(desc => {
        const row = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-bold text-gray-900">${desc.minimo} productos</td>
                <td class="px-6 py-4">
                    <span class="bg-pink-100 text-pink-700 px-3 py-1 rounded-full font-bold">${desc.porcentaje}%</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                         <button class="btn-editar-descuento p-2 text-blue-600 hover:text-blue-900 transition-colors" 
                            title="Editar"
                            data-id="${desc.id}"
                            data-tipo="${desc.tipo}"
                            data-minimo="${desc.minimo}"
                            data-porcentaje="${desc.porcentaje}">
                            <i class="fas fa-edit"></i>
                        </button>

                        <button class="btn-eliminar-descuento p-2 text-red-600 hover:text-red-900 transition-colors" 
                            title="Eliminar"
                            data-id="${desc.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
    });
}


// ===============================================================
//  AGREGAR NUEVO DESCUENTO (MONTO / CANTIDAD)
// ===============================================================
document.querySelector("#btn-agregar-monto").addEventListener("click", async () => {
    const minimo = document.getElementById("monto-minimo").value;
    const porcentaje = document.getElementById("monto-porcentaje").value;

    if (!minimo || !porcentaje)
        return Swal.fire("Error", "Completa todos los campos", "error");

    await fetch("/api/descuentos", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tipo: "monto", minimo, porcentaje })
    });

    Swal.fire("OK", "Descuento agregado", "success");
    cargarDescuentos();
});


document.querySelector("#btn-agregar-cantidad").addEventListener("click", async () => {
    const minimo = document.getElementById("cantidad-minimo").value;
    const porcentaje = document.getElementById("cantidad-porcentaje").value;

    if (!minimo || !porcentaje)
        return Swal.fire("Error", "Completa todos los campos", "error");

    await fetch("/api/descuentos", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tipo: "cantidad", minimo, porcentaje })
    });

    Swal.fire("OK", "Descuento agregado", "success");
    cargarDescuentos();
});


// ===============================================================
//  EDITAR DESCUENTO
// ===============================================================
function editarDescuento(id, tipo, minimo, porcentaje) {
    Swal.fire({
        title: "Editar descuento",
        html: `
            <div class="mb-4 text-left">
                <label class="block text-gray-700 font-bold mb-2">Mínimo (Monto $ o Cantidad)</label>
                <input id="edit-minimo" type="number" step="0.01" value="${minimo}" placeholder="Ej: 50.00"
                       class="swal2-input m-0 w-full">
            </div>
            <div class="text-left">
                <label class="block text-gray-700 font-bold mb-2">Porcentaje de Descuento (%)</label>
                <input id="edit-porcentaje" type="number" step="0.01" value="${porcentaje}" placeholder="Ej: 10"
                       class="swal2-input m-0 w-full">
            </div>
        `,
        confirmButtonText: "Guardar cambios",
        preConfirm: () => ({
            minimo: document.getElementById("edit-minimo").value,
            porcentaje: document.getElementById("edit-porcentaje").value
        })
    }).then(async r => {
        if (!r.value) return;

        await fetch(`/api/descuentos/${id}`, {
            method: "PUT",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(r.value)
        });

        Swal.fire("OK", "Descuento actualizado", "success");
        cargarDescuentos();
    });
}


// ===============================================================
//  ELIMINAR DESCUENTO
// ===============================================================
async function eliminarDescuento(id) {
    Swal.fire({
        title: "¿Eliminar descuento?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar"
    }).then(async r => {
        if (r.isConfirmed) {
            await fetch(`/api/descuentos/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            Swal.fire("Eliminado", "Descuento eliminado", "success");
            cargarDescuentos();
        }
    });
}


// ===============================================================
//  CARGAR PRODUCTOS (PÚBLICO)
// ===============================================================
async function cargarProductos() {
    const res = await fetch("/api/productos");
    const productos = await res.json();

    const tbody = document.querySelector("#tabla-productos tbody");
    tbody.innerHTML = "";

    productos.forEach(p => {
        const row = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                    <img src="${p.imagen}" class="w-12 h-12 rounded-xl object-cover mx-auto shadow-sm border border-gray-100">
                </td>
                <td class="px-6 py-4 font-bold text-gray-900">${p.nombre}</td>
                <td class="px-6 py-4 italic text-gray-500">$${p.precio}</td>
                <td class="px-6 py-4">
                    <input type="number" min="0" step="0.01" 
                        id="prod-desc-${p.id}"
                        value="${p.descuento_producto}"
                        class="w-24 border-gray-200 border bg-gray-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 outline-none text-center font-bold text-pink-600">
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="btn-guardar-producto bg-pink-600 hover:bg-pink-700 text-white rounded-lg px-4 py-2 font-bold shadow-md transition-all active:scale-95 text-xs"
                        data-id="${p.id}">
                        GUARDAR 💾
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
    });
}


// ===============================================================
//  ACTUALIZAR DESCUENTO DE PRODUCTO (ADMIN)
// ===============================================================
async function guardarDescuentoProducto(id) {
    const valor = document.getElementById(`prod-desc-${id}`).value;

    await fetch(`/api/productos_descuento/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ porcentaje: valor })
    });

    Swal.fire("OK", "Descuento actualizado", "success");
}

/* ===============================================================
   DELEGACIÓN DE EVENTOS (Reemplazo de onclick)
=============================================================== */
document.addEventListener("click", (e) => {
    // 1. Editar Descuento Global
    const btnEditar = e.target.closest(".btn-editar-descuento");
    if (btnEditar) {
        const { id, tipo, minimo, porcentaje } = btnEditar.dataset;
        editarDescuento(id, tipo, minimo, porcentaje);
        return;
    }

    // 2. Eliminar Descuento Global
    const btnEliminar = e.target.closest(".btn-eliminar-descuento");
    if (btnEliminar) {
        const { id } = btnEliminar.dataset;
        eliminarDescuento(id);
        return;
    }

    // 3. Guardar Descuento Producto Individual
    const btnGuardarProd = e.target.closest(".btn-guardar-producto");
    if (btnGuardarProd) {
        const { id } = btnGuardarProd.dataset;
        guardarDescuentoProducto(id);
        return;
    }
});
