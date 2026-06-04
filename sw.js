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
