const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");
const cors = require("cors")({ origin: true });

initializeApp();
const db = getFirestore();

// 🛑 COPIE E COLE A SUA CHAVE DO MERCADO PAGO AQUI:
const MP_ACCESS_TOKEN = "APP_USR-959af3ed-912d-4ffa-8ef0-48f560ce3769"; 

const dataPath = db.collection("artifacts").doc("cla-kame-oficial").collection("public").doc("data");

// 1️⃣ FUNÇÃO: Criar Pagamento PIX (App -> Mercado Pago)
exports.createPixPayment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId, packageId, price, coins, bonus } = req.body || {};

      if (!userId || !price) {
        return res.status(400).send({ error: "Dados incompletos" });
      }

      const paymentData = {
        transaction_amount: Number(price),
        description: `KameBank - Pacote de ${coins} KC`,
        payment_method_id: "pix",
        payer: {
          email: "clakame@kamebank.com",
          first_name: "Técnico",
          last_name: "Kame"
        }
      };

      const response = await axios.post("https://api.mercadopago.com/v1/payments", paymentData, {
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
          "X-Idempotency-Key": `${userId}-${Date.now()}`
        }
      });

      const pixInfo = response.data.point_of_interaction.transaction_data;
      const paymentId = response.data.id;

      await dataPath.collection("pending_payments").doc(String(paymentId)).set({
        userId, packageId, coins: Number(coins) + Number(bonus),
        status: "pending", createdAt: FieldValue.serverTimestamp()
      });

      return res.status(200).send({
        qr_code: pixInfo.qr_code,
        qr_code_base64: pixInfo.qr_code_base64,
        paymentId: paymentId
      });

    } catch (error) {
      console.error("Erro MP:", error.response?.data || error.message);
      return res.status(500).send({ error: "Falha ao gerar PIX" });
    }
  });
});

// 2️⃣ FUNÇÃO: Webhook (Mercado Pago -> Servidor)
exports.mpWebhook = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Responde 200 OK na hora para o Mercado Pago e para os testes do Google
    res.status(200).send("OK");

    const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    if (!paymentId) return;

    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
      });

      if (response.data.status === "approved") {
        const paymentRef = dataPath.collection("pending_payments").doc(String(paymentId));
        const doc = await paymentRef.get();

        if (doc.exists && doc.data().status === "pending") {
          const paymentInfo = doc.data();
          const userRef = dataPath.collection("users").doc(paymentInfo.userId);
          const userDoc = await userRef.get();

          if (userDoc.exists) {
            const currentCoins = userDoc.data().kameCoins || 0;
            await userRef.update({ kameCoins: currentCoins + paymentInfo.coins });
            await paymentRef.update({ status: "approved" });
          }
        }
      }
    } catch (err) {
      console.error("Erro Webhook:", err.message);
    }
  });
});