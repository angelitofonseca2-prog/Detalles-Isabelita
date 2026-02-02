async function procesarRetornoPaypal() {
    const params = new URLSearchParams(window.location.search);
    const orderID = params.get("token") || params.get("orderID");

    if (!orderID) {
        Swal.fire("Error", "No se encontró el token de PayPal.", "error");
        return;
    }

    const cedula = localStorage.getItem("checkout_cedula") || "";
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    if (!cedula || carrito.length === 0) {
        Swal.fire("Error", "No se encontró información del pedido.", "error");
        return;
    }

    try {
        const captureRes = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID })
        });
        const captureData = await captureRes.json();
        if (!captureRes.ok) {
            throw new Error(captureData?.error || "No se pudo capturar el pago");
        }

        const paypal_transaction_id = captureData?.id || orderID;

        const pedidoRes = await fetch("/api/pedidos/paypal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cedula_cliente: cedula,
                items: carrito.map(item => ({
                    id: item.id,
                    cantidad: item.cantidad
                })),
                paypal_transaction_id
            })
        });
        const pedidoData = await pedidoRes.json();
        if (!pedidoRes.ok) {
            throw new Error(pedidoData?.error || "No se pudo guardar el pedido");
        }

        localStorage.removeItem("carrito");
        localStorage.removeItem("checkout_cedula");

        const total = pedidoData.totalFinal ?? "";
        window.location.href = `/exito.html?id=${pedidoData.id}&total=${total}&metodo=paypal&txn=${paypal_transaction_id}`;
    } catch (err) {
        console.error("Error procesando retorno PayPal:", err);
        Swal.fire("Error", "No se pudo completar el pago. Intente nuevamente.", "error");
    }
}

procesarRetornoPaypal();
