import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// Inicializa o banco de dados de forma segura
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
    databaseURL: "https://cla-kame-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // O Mercado Pago sempre manda requisições do tipo POST
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    // 🔔 RADAR 1: Imprime no log da Vercel tudo o que o Mercado Pago enviou
    console.log("🔔 Webhook Recebido! Dados:", JSON.stringify(req.body));
    
    // O MP pode enviar 'type' ou 'topic' dependendo da configuração
    const type = req.body.type || req.query.topic || req.body.action;
    const dataId = req.body.data?.id || req.query.id;

    // Verifica se a notificação é sobre um pagamento e se tem um ID válido
    if ((type === 'payment' || type === 'payment.updated' || type === 'payment.created') && dataId) {
      console.log(`🔎 Buscando detalhes do pagamento ID: ${dataId}`);
      
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const paymentData = new Payment(client);
      const paymentInfo = await paymentData.get({ id: dataId });

      console.log(`💵 Status do Pagamento no Banco: ${paymentInfo.status}`);

      // Se o status for "Aprovado", depositamos as moedas
      if (paymentInfo.status === 'approved') {
        const userId = paymentInfo.metadata?.user_id;
        const coinsToAdd = paymentInfo.metadata?.package_coins;
        const paymentId = String(paymentInfo.id);

        if (!userId || !coinsToAdd) {
            console.error("❌ ERRO: Metadados (userId ou coins) não vieram no recibo!", paymentInfo.metadata);
            return res.status(200).send('Faltam metadados, mas OK');
        }

        console.log(`✅ APROVADO! Preparando para adicionar ${coinsToAdd} BK para o usuário ${userId}...`);

        const appId = 'cla-kame-oficial'; 
        const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('predictions').doc(`dep_${paymentId}`);
        const docSnap = await docRef.get();

        // Evita depositar duas vezes se o MP mandar o recibo em duplicidade
        if (!docSnap.exists) {
           const userRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('users').doc(userId);
           
           await db.runTransaction(async (transaction) => {
             const userSnap = await transaction.get(userRef);
             
             if (!userSnap.exists) {
                 console.error(`❌ ERRO: Usuário ${userId} não encontrado no banco.`);
                 return;
             }
             
             const currentCoins = userSnap.data().kameCoins || 0;
             transaction.update(userRef, { kameCoins: currentCoins + Number(coinsToAdd) });
             
             transaction.set(docRef, {
               id: `dep_${paymentId}`,
               userId: userId,
               type: 'deposit',
               amount: Number(coinsToAdd),
               timestamp: Date.now(),
               status: 'approved'
             });
           });
           
           console.log("🎉 SUCESSO TOTAL! Moedas depositadas no Firebase.");
        } else {
           console.log("⚠️ AVISO: Este PIX já havia sido depositado antes. Ignorando.");
        }
      }
    } else {
       console.log("⚠️ Notificação ignorada (não é pagamento ou não tem ID).");
    }
    
    // Responde 200 OK rápido para o Mercado Pago parar de tentar enviar o mesmo recibo
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ ERRO CRÍTICO DE SISTEMA no Webhook:', error);
    res.status(500).send('Erro interno');
  }
}
