// Arquivo: api/create-pix.js

export default async function handler(req, res) {
  // Segurança: Só aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // 🛡️ BLINDAGEM: Verifica a chave secreta
  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'ERRO: A chave secreta não foi encontrada na Vercel.' });
  }

  try {
    const { transaction_amount, description, email, userId } = req.body;

    // 🚀 MÁGICA: Comunicação DIRETA com o Mercado Pago (sem usar bibliotecas)
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${Date.now()}-${userId}` // Evita cobrança duplicada
      },
      body: JSON.stringify({
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
      })
    });

    const data = await response.json();

    // Se o Mercado Pago recusar, devolvemos o erro exato deles
    if (!response.ok) {
      throw new Error(data.message || 'A API do Mercado Pago recusou o pagamento.');
    }

    // Devolve o PIX oficial para o App
    return res.status(200).json({
      id: data.id,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    });

  } catch (error) {
    console.error("Erro interno:", error);
    return res.status(500).json({ error: error.message || 'Falha ao gerar o PIX.' });
  }
}
