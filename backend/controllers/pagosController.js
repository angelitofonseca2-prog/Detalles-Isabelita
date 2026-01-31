
import db from "../db/db.js";

export const confirmarPagoPaypal = async (req, res) => {
    try {
        const { id_pedido, paypal_transaction_id, total } = req.body;

        if (!id_pedido || !paypal_transaction_id) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        await db.query(
            `UPDATE pedidos 
             SET estado = ?, 
                 metodo_pago = ?, 
                 fecha_pago = NOW(),
                 paypal_transaction_id = ?, 
                 total = ?
             WHERE id = ?`,
            ["pagado", "paypal", paypal_transaction_id, total, id_pedido]
        );

        return res.json({ mensaje: "Pago registrado correctamente" });

    } catch (error) {
        console.error("Error registrando pago PayPal:", error);
        return res.status(500).json({ error: "Error interno al registrar el pago" });
    }
};
