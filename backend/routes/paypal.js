import express from "express";
import axios from "axios";
import qs from "qs";

const router = express.Router();

// ========================
// GENERAR ACCESS TOKEN
// ========================
async function getAccessToken() {

  // 🔥 Cargar SIEMPRE las variables recién en la ejecución
  const {
    PAYPAL_CLIENT_ID,
    PAYPAL_SECRET,
    PAYPAL_MODE
  } = process.env;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    console.error("❌ Faltan credenciales PayPal en process.env");
    console.error("PAYPAL_CLIENT_ID:", PAYPAL_CLIENT_ID);
    console.error("PAYPAL_SECRET:", PAYPAL_SECRET);
    throw new Error("Credenciales PayPal no definidas");
  }

  const cleanClient = PAYPAL_CLIENT_ID.trim();
  const cleanSecret = PAYPAL_SECRET.trim();

  console.log("CLIENT_ID length:", cleanClient.length);
  console.log("SECRET length:", cleanSecret.length);

  const API_BASE =
    PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const auth = Buffer.from(`${cleanClient}:${cleanSecret}`).toString("base64");

  try {
    const { data } = await axios.post(
      `${API_BASE}/v1/oauth2/token`,
      qs.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    return data.access_token;

  } catch (error) {
    console.error("❌ Error PayPal OAuth:", error.response?.data || error.message);
    throw new Error("No se pudo obtener Access Token de PayPal");
  }
}

// =========================
// CREAR ORDEN
// =========================
router.post("/create-order", async (req, res) => {
  try {
    console.log("ENV RAW CLIENT:", process.env.PAYPAL_CLIENT_ID);
    console.log("ENV RAW SECRET:", process.env.PAYPAL_SECRET);

    const access_token = await getAccessToken();

    const amount = req.body.amount;

if (!amount) {
  return res.status(400).json({ error: "Falta el total del pedido" });
}


    const API_BASE =
      process.env.PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    const order = await axios.post(
      `${API_BASE}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount

            }
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(order.data);

  } catch (error) {
    console.error("❌ Error creando orden PayPal:", error.response?.data || error.message);
    return res.status(500).json({ error: "Error al crear orden PayPal" });
  }
});

// =========================
// CAPTURAR ORDEN
// =========================
router.post("/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: "Falta orderID" });
    }

    const access_token = await getAccessToken();

    const API_BASE =
      process.env.PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    const response = await axios.post(
      `${API_BASE}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(response.data);

  } catch (error) {
    console.error("❌ Error capturando orden PayPal:", error.response?.data || error.message);
    return res.status(500).json({ error: "Error al capturar orden PayPal" });
  }
});

export default router;
