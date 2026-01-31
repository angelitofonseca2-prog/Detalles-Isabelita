/* =====================================================
   🌸 CONTACTO - LÓGICA DE FORMULARIO
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formContacto");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Obtener valores
        const nombre = document.getElementById("nombre").value.trim();
        const email = document.getElementById("email").value.trim();
        const telefono = document.getElementById("telefono").value.trim();
        const mensaje = document.getElementById("mensaje").value.trim();

        // 2. Validaciones básicas
        if (!nombre || !email || !mensaje) {
            Swal.fire({
                icon: "error",
                title: "Campos obligatorios",
                text: "Por favor, completa todos los campos marcados con asterisco (*)",
                confirmButtonColor: "#db2777" // pink-600
            });
            return;
        }

        // 3. Envío real al Backend
        Swal.fire({
            title: "Enviando mensaje...",
            text: "Por favor espera un momento",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch("/api/contacto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email, telefono, mensaje })
            });

            const data = await res.json();

            if (res.ok) {
                Swal.fire({
                    icon: "success",
                    title: "¡Mensaje Enviado!",
                    text: `Gracias ${nombre}, nos pondremos en contacto contigo pronto.`,
                    confirmButtonColor: "#db2777"
                });
                form.reset();
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error al enviar",
                    text: data.error || "Hubo un problema al procesar tu mensaje.",
                    confirmButtonColor: "#db2777"
                });
            }
        } catch (error) {
            console.error("Error envío contacto:", error);
            Swal.fire({
                icon: "error",
                title: "Error de red",
                text: "No pudimos conectar con el servidor. Inténtalo más tarde.",
                confirmButtonColor: "#db2777"
            });
        }
    });
});
