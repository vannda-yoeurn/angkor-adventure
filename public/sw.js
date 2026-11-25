/* sw.js — Service Worker៖ រក្សាទុកឯកសារហ្គេម ដើម្បីបើកលឿន និងលេងបានពេលគ្មានអ៊ីនធឺណិត
 * (ពហុអ្នកលេង នៅតែត្រូវការអ៊ីនធឺណិត ឬ LAN) */
const CACHE = 'angkor-v1';
const CORE = ['./', 'index.html', 'style.css', 'main.js', 'game.js', 'multiplayer.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// ឯកសារហ្គេម៖ យកថ្មីពីអ៊ីនធឺណិតជាមុន (បើមាន) បើគ្មាន → ប្រើពី cache
// បណ្ណាល័យ និងពុម្ពអក្សរ៖ ប្រើពី cache ជាមុន
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('/socket.io/')) return;
  const url = new URL(req.url);
  const isLib = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (isLib) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  } else if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; }).catch(() => caches.match(req).then(h => h || caches.match('index.html'))));
  }
});
