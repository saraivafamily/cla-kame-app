// Trocamos o 'import' pelo 'require' para evitar conflitos no Node.js da Vercel
const { MercadoPagoConfig, Payment } = require('mercadopago');

export default async function handler(req, res) {
  // 1. Segurança: Só aceita requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 🛡️ BLINDAGEM: Verifica se a chave secreta realmente está lá!
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'ERRO: A chave secreta (Token) não foi encontrada na Vercel.' });
    }

    // 2. Recebe os dados do App (valor, email do usuário, etc)
    const { transaction_amount, description, email, userId } = req.body;

    // 3. Configura o Mercado Pago com a sua chave secreta da Vercel
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    // 4. Cria a cobrança PIX
    const paymentData = {
      transaction_amount: Number(transaction_amount),
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: email || 'cliente@clakame.com',
      },
      // O Webhook que avisa quando foi pago
      notification_url: `https://cla-kame.vercel.app/api/webhook`, 
      metadata: {
        user_id: userId 
      }
    };

    const result = await payment.create({ body: paymentData });

    // 5. Devolve o código PIX Copia e Cola para o App mostrar na tela
    return res.status(200).json({
      id: result.id,
      qr_code: result.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
    });

  } catch (error) {
    console.error("Erro interno ao gerar PIX:", error);
    // Agora ele devolve o erro real do Mercado Pago (se houver) de forma estruturada
    return res.status(500).json({ error: error.message || 'Falha ao gerar o pagamento PIX no Mercado Pago' });
  }
}
