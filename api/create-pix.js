// Arquivo: api/create-pix.js
import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // Segurança: Só aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 🛡️ BLINDAGEM: Verifica a chave secreta
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'ERRO: A chave secreta (Token) não foi encontrada na Vercel.' });
    }

    const { transaction_amount, description, email, userId } = req.body;

    // Configura o Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    const paymentData = {
      transaction_amount: Number(transaction_amount),
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: email || 'cliente@clakame.com',
      },
      notification_url: `https://cla-kame.vercel.app/api/webhook`, 
      metadata: {
        user_id: userId 
      }
    };

    const result = await payment.create({ body: paymentData });

    // Devolve o PIX para o App
    return res.status(200).json({
      id: result.id,
      qr_code: result.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
    });

  } catch (error) {
    console.error("Erro interno:", error);
    return res.status(500).json({ error: error.message || 'Falha ao gerar o PIX no Mercado Pago' });
  }
}
