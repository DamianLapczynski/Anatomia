// Prosty cache offline: modele i dane „cache-first", reszta „network-first".
const C = 'anatomia-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const heavy = /\/(models|data)\//.test(u.pathname) || /\/assets\//.test(u.pathname);
  e.respondWith(caches.open(C).then(async (cache) => {
    const hit = await cache.match(e.request);
    if (heavy && hit) return hit;
    try { const res = await fetch(e.request); if (res.ok) cache.put(e.request, res.clone()); return res; }
    catch (err) { if (hit) return hit; throw err; }
  }));
});
