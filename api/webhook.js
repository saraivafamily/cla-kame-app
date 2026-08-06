// Arquivo: api/webhook.js
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// Suas credenciais do Firebase (as mesmas do App)
const firebaseConfig = { 
  apiKey: "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA", 
  authDomain: "cla-kame.firebaseapp.com", 
  projectId: "cla-kame", 
  databaseURL: "https://cla-kame-default-rtdb.firebaseio.com", 
  storageBucket: "cla-kame.firebasestorage.app", 
  messagingSenderId: "253792062726", 
  appId: "1:253792062726:web:1ee567bbbd175c31ce2287" 
};

// Evita recriar o App do Firebase a cada requisição
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);
    
    // Pega o ID enviado pelo Mercado Pago
    const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    if (!paymentId) return res.status(400).json({ error: 'Sem ID' });

    // Consulta no Mercado Pago se o pagamento realmente caiu
    const payInfo = await payment.get({ id: paymentId });
    
    if (payInfo.status === 'approved') {
       const userId = payInfo.metadata.user_id;
       const amountPaid = Number(payInfo.transaction_amount);
       
       // Identifica o pacote pago
       let coinsToAdd = 0;
       if (amountPaid === 5) coinsToAdd = 300;
       if (amountPaid === 10) coinsToAdd = 800; // 700 + 100
       if (amountPaid === 20) coinsToAdd = 2000; // 1600 + 400

       // Se pagou direitinho, adiciona os BitKames!
       if (coinsToAdd > 0 && userId) {
          const userRef = doc(db, 'artifacts', 'cla-kame-oficial', 'public', 'data', 'users', userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
             const currentCoins = userSnap.data().kameCoins || 0;
             await updateDoc(userRef, { kameCoins: currentCoins + coinsToAdd });

             // Gera o extrato de depósito na conta do usuário
             const extractRef = doc(db, 'artifacts', 'cla-kame-oficial', 'public', 'data', 'predictions', `dep_${paymentId}`);
             await setDoc(extractRef, {
                id: `dep_${paymentId}`,
                userId: userId,
                type: 'deposit',
                amount: coinsToAdd,
                timestamp: Date.now(),
                status: 'approved'
             });
          }
       }
    }
    
    // Responde com OK para o Mercado Pago parar de tentar avisar
    return res.status(200).send('OK');
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return res.status(500).json({ error: 'Erro Interno' });
  }
}
