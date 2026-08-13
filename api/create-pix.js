import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { transaction_amount, description, email, userId, packageCoins } = req.body;

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    const requestOptions = {
      transaction_amount: Number(transaction_amount),
      description: description,
      payment_method_id: 'pix',
      payer: { email: email },
      metadata: {
        user_id: userId,
        package_coins: Number(packageCoins)
      }
    };

    const result = await payment.create({ body: requestOptions });

    res.status(200).json({
      id: result.id,
      qr_code: result.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64
    });

  } catch (error) {
    console.error("Erro ao gerar PIX:", error);
    res.status(500).json({ error: 'Falha ao processar pagamento com o Mercado Pago' });
  }
}
