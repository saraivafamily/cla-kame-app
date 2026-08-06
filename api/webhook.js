// Arquivo: api/webhook.js
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = { 
  apiKey: "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA", 
  authDomain: "cla-kame.firebaseapp.com", 
  projectId: "cla-kame", 
  databaseURL: "https://cla-kame-default-rtdb.firebaseio.com", 
  storageBucket: "cla-kame.firebasestorage.app", 
  messagingSenderId: "253792062726", 
  appId: "1:253792062726:web:1ee567bbbd175c31ce2287" 
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ error: 'Sem token' });

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);
    
    const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    if (!paymentId) return res.status(400).json({ error: 'Sem ID' });

    const payInfo = await payment.get({ id: paymentId });
    
    if (payInfo.status === 'approved') {
       const userId = payInfo.metadata.user_id;
       const amountPaid = Number(payInfo.transaction_amount);
       
       let coinsToAdd = 0;
       if (amountPaid === 5) coinsToAdd = 300;
       if (amountPaid === 10) coinsToAdd = 800;
       if (amountPaid === 20) coinsToAdd = 2000;

       if (coinsToAdd > 0 && userId) {
          const userRef = doc(db, 'artifacts', 'cla-kame-oficial', 'public', 'data', 'users', userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
             const currentCoins = userSnap.data().kameCoins || 0;
             await updateDoc(userRef, { kameCoins: currentCoins + coinsToAdd });

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
    
    return res.status(200).send('OK');
  } catch (error) {
    console.error("Erro Webhook:", error);
    return res.status(500).json({ error: 'Erro Interno' });
  }
}
