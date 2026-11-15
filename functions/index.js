const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
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

/* ══════════════════════════════════════════════════════
   "VIERON TU DIBUJO"
   ────────────────────────────────────────────────────
   Cuando el destinatario abre el dibujo, se le avisa a quien lo mandó.
   Hasta ahora el dibujo salía y ahí se acababa: quien enviaba no sabía si
   había llegado, si lo habían visto ni nada. Eso es lo que cierra el
   bucle y hace que alguien conteste.

   Va en el servidor y NO en el navegador a propósito. Desde el cliente,
   escuchar los dibujos que uno envió significa descargarlos enteros, y un
   dibujo pesa cientos de kilobytes porque los trazos viven en el mismo
   documento que el estado. Quien enviara diez dibujos al día se bajaría
   varios megas solo para enterarse de un "visto". Aquí el servidor ya
   tiene el documento delante y no cuesta nada.
══════════════════════════════════════════════════════ */
exports.notifySketchViewed = onDocumentUpdated('sketches/{sketchId}', async (event) => {
  const antes = event.data.before.data();
  const ahora = event.data.after.data();
  if (!antes || !ahora) return;

  /* Solo el momento exacto en que pasa de no visto a visto. Cualquier otra
     actualización del documento no es noticia. */
  if (antes.viewed === true || ahora.viewed !== true) return;

  const autor = ahora.from;
  const destinatario = ahora.to;
  if (!autor || autor === destinatario) return;   /* verse uno mismo no avisa */

  const db = getFirestore();
  const [autorDoc, quienDoc] = await Promise.all([
    db.collection('users').doc(autor).get(),
    destinatario ? db.collection('users').doc(destinatario).get() : Promise.resolve(null),
  ]);
  if (!autorDoc.exists) return;

  const { fcmToken } = autorDoc.data();
  if (!fcmToken) return;

  const quien = (quienDoc && quienDoc.exists &&
                (quienDoc.data().username || quienDoc.data().displayName)) || 'Alguien';

  try {
    await getMessaging().send({
      token: fcmToken,
      /* Igual que el otro: solo datos, y el service worker decide cómo se
         pinta y cómo se agrupa. */
      data: {
        title: `${quien} vio tu dibujo 👀`,
        body: 'Mándale otro antes de que este desaparezca',
        tipo: 'visto',
        quien: String(quien),
        sketchId: String(event.params.sketchId || '')
      },
      webpush: { fcmOptions: { link: 'https://sketch-send.com/app/' } }
    });
  } catch (e) {
    if (e.code === 'messaging/registration-token-not-registered') {
      await db.collection('users').doc(autor).update({ fcmToken: null });
    }
    console.error('FCM send error (visto):', e.code, e.message);
  }
});
