const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

exports.sendSketchNotification = onDocumentCreated('sketches/{sketchId}', async (event) => {
  const sketch = event.data.data();
  const { to, fromName } = sketch;
  if (!to) return;

  const db = getFirestore();
  const userDoc = await db.collection('users').doc(to).get();
  if (!userDoc.exists) return;

  const { fcmToken } = userDoc.data();
  if (!fcmToken) return;

  const message = {
    token: fcmToken,
    /* Sin bloque 'notification': si va, el navegador pinta el aviso por su
       cuenta y nunca llega al service worker, que es quien agrupa por
       remitente y lleva la cuenta. Solo datos, y el SW decide. */
    data: {
      title: `${fromName || 'Alguien'} te envió un dibujo ✏️`,
      body: 'Toca para verlo antes de que desaparezca',
      fromName: String(fromName || ''),
      sketchId: String(event.params.sketchId || '')
    },
    webpush: {
      fcmOptions: { link: 'https://sketch-send.com/app/' }
    }
  };

  try {
    await getMessaging().send(message);
  } catch (e) {
    if (e.code === 'messaging/registration-token-not-registered') {
      await db.collection('users').doc(to).update({ fcmToken: null });
    }
    console.error('FCM send error:', e.code, e.message);
  }
});
