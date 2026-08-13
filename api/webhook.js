import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: "https://cla-kame-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { action, data } = req.body;

    if (action === 'payment.updated' && data && data.id) {
      
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const paymentData = new Payment(client);
      const paymentInfo = await paymentData.get({ id: data.id });

      if (paymentInfo.status === 'approved') {
        const userId = paymentInfo.metadata.user_id;
        const coinsToAdd = paymentInfo.metadata.package_coins;
        const paymentId = String(paymentInfo.id);

        const appId = 'cla-kame-oficial'; 
        
        const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('predictions').doc(`dep_${paymentId}`);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
           const userRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('users').doc(userId);
           
           await db.runTransaction(async (transaction) => {
             const userSnap = await transaction.get(userRef);
             if (!userSnap.exists) return;
             
             const currentCoins = userSnap.data().kameCoins || 0;
             transaction.update(userRef, { kameCoins: currentCoins + coinsToAdd });
             
             transaction.set(docRef, {
               id: `dep_${paymentId}`,
               userId: userId,
               type: 'deposit',
               amount: coinsToAdd,
               timestamp: Date.now(),
               status: 'approved'
             });
           });
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no Webhook:', error);
    res.status(500).send('Erro interno');
  }
}
