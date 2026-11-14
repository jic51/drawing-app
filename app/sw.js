const CACHE = 'sketchsend-v4';
const STATIC = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting();
});

/* Recibir mensaje SKIP_WAITING desde la página cuando hay actualización */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Never intercept Firebase real-time / auth endpoints
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit') ||
      url.includes('firebaseauth') ||
      url.includes('googleapis.com/google.firestore')) return;

  // HTML pages: network-first, bypass HTTP cache so GitHub Pages max-age is ignored
  if (url.includes('.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    );
    return;
  }

  // PostHog, FCM endpoints: skip cache
  if (url.includes('posthog.com') || url.includes('fcmregistrations')) return;

  // Static assets (fonts, Firebase SDK): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

/* ── FCM Push Notifications ── */
self.addEventListener('push', e => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch(_) { return; }
  /* Dos formatos posibles: el mensaje solo-datos que manda nuestra
     función (campos en la raíz) y el clásico con bloque 'notification',
     por si queda algún envío viejo en camino. */
  const notification = data.notification || data;
  const extra = data.data || data;
  const quien = extra.fromName || '';

  /* Una etiqueta por remitente. Con una fija, cada aviso borraba el
     anterior y solo se veía el último. Así cada persona tiene el suyo, y
     varios dibujos de la misma se juntan en uno que lleva la cuenta. */
  const tag = quien ? 'ss-de-' + quien : 'ss-sketch';

  e.waitUntil((async () => {
    const previas = await self.registration.getNotifications({ tag });
    const n = (previas.reduce((t, p) => t + ((p.data && p.data.cuantos) || 1), 0)) + 1;

    const es = (self.navigator.language || '').toLowerCase().startsWith('es');
    let title = notification.title || 'SketchSend';
    let body  = notification.body || 'Tienes un nuevo dibujo ✏️';
    if (n > 1 && quien) {
      title = es ? `${quien} te envió ${n} dibujos ✏️`
                 : `${quien} sent you ${n} drawings ✏️`;
      body  = es ? 'Tócalos para verlos antes de que desaparezcan'
                 : 'Tap to see them before they disappear';
    }

    await self.registration.showNotification(title, {
      body,
      /* Icono cuadrado: og-preview es un banner de 1200x630 y salía
         aplastado e irreconocible en el aviso. */
      icon: '../icon-192.png',
      badge: '../icon-192.png',
      tag,
      renotify: true,
      data: Object.assign({}, extra, { cuantos: n })
    });

    /* El numerito sobre el icono de la app, como las apps nativas.
       Solo funciona si está INSTALADA (añadida a la pantalla de inicio): en
       una pestaña del navegador no hay icono donde ponerlo. En Android y
       escritorio va; en iOS todavía no, así que si no existe no pasa nada.

       Se cuenta el total de avisos pendientes de TODAS las personas, no solo
       de esta: el icono es uno. */
    try {
      if (self.navigator.setAppBadge) {
        const todas = await self.registration.getNotifications();
        const total = todas.reduce((t, p) => t + ((p.data && p.data.cuantos) || 1), 0);
        await self.navigator.setAppBadge(total || 1);
      }
    } catch (_) { /* el navegador no lo admite: no es un fallo */ }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  /* Al abrir desde el aviso, el numerito se va. */
  try { self.navigator.clearAppBadge && self.navigator.clearAppBadge(); } catch (_) {}
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});
