/* Kyvo service worker — cache static shell only; never pin API JSON forever */
/* v8.4: with push on, OneSignalSDKWorker.js loads OneSignal's worker and then this file (one SW for the app folder (/ on kyvo-app.github.io)).
   Then OneSignal handles 'push'/'notificationclick' for its messages; our generic push handler stays off. */
const PUSH = !!self.KYVO_ONESIGNAL;
const C = 'kyvo-v8-43';   // v8.43 👤 bystevenr buys in Runner; v8.42 🔥 Trend in Runner / Runner 2.0; v8.41 faster pushes (server side); v8.40 🎯 zaznaczony / 📈 szczyt MC on flagged coins
const A = [
  './', 'index.html', 'compat.js', 'i18n.js', 'app.js', 'insights.js', 'chart.js', 'evm.js', 'profile.js', 'launch.js', 'auth.js', 'auth-config.js', 'premium-config.js', 'contact-config.js', 'push-config.js', 'notify.js', 'gold-rules.js', 'gold.js', 'pairs.js', 'coinpage.js', 'tracker.js', 'journal.js', 'journal.css', 'theme.css', 'fx.js', 'share.js', 'pnlcard.js', 'gta.js', 'fonts/inter-latin-wght-normal.woff2', 'fonts/inter-latin-ext-wght-normal.woff2', 'fonts/space-grotesk-latin-wght-normal.woff2', 'fonts/space-grotesk-latin-ext-wght-normal.woff2',
  'vendor/lightweight-charts/lightweight-charts.standalone.production.js', 'vendor/kyvo-crypto/kyvo-crypto.min.js', 'manifest.json',
  'kyvo_mark.svg', 'kyvo_logo.svg', 'OneSignalSDKWorker.js', 'privacy.html',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'data/x_viral.json', 'data/smart_money.json', 'data/leaderboard.json'
];
// v8.5: precache with cache:'reload' — v8.4 and older used addAll(), which could take 10-min-old files from the HTTP cache
// and then serve them cache-first until the NEXT release (that is how desktop browsers kept showing an old Kyvo).
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.all(A.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => { if (r.ok) return c.put(u, r); }).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // v8.6: reload open pages ONLY on an upgrade (an older kyvo-* cache existed). v8.5 also reloaded on the very first
  // install, so every first visit restarted ~10 s in (after the coins had loaded).
  e.waitUntil(caches.keys().then(ks => { const old = ks.filter(k => k !== C); return Promise.all(old.map(k => caches.delete(k))).then(() => old.some(k => /^kyvo-/.test(k))); })
    .then(upgrade => self.clients.claim().then(() => upgrade))
    .then(upgrade => upgrade ? self.clients.matchAll({ type: 'window' }).then(cs => Promise.all(cs.map(c => { try { return c.navigate(c.url); } catch (err) { return null; } }))) : null).catch(() => {}));
});
self.addEventListener('message', e => { if (e.data === 'kyvo-skip-waiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const isApi = /dexscreener\.com|geckoterminal\.com|solana\.com|publicnode\.com|binance|blxrbdn\.com|48\.club|bnbchain\.org|blockscout\.com|robinhood\.com|rugcheck\.xyz|gopluslabs\.io/.test(u.hostname)
    || /\/data\/(x_viral|x_live|kol_live|gold|smart_money|leaderboard|track_record)\.json/.test(u.pathname) || /version\.json$/.test(u.pathname)
    || /(auth|premium|contact|push)-config\.js$/.test(u.pathname) || /gstatic\.com|googleapis\.com|firebaseapp\.com/.test(u.hostname);
  if (isApi) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // v8.9: vendor libraries (chart library ~160 kB) = CACHE-FIRST. Network-first with a 5-s abort could leave a slow first
  // visit without the chart library, so every chart fell back to the DexScreener embed. They change only with a new cache name.
  // v8.15 pass 3: art in img/ is NOT precached (loaded lazily on the screens that show it), then cache-first — files are
  // width-suffixed and never change in place.
  // v8.15 pass 7: video (welcome 3D model loop) goes straight to the network so the browser's Range requests work (Safari).
  if (/\.(mp4|webm)$/.test(u.pathname)) return;
  if (/jasoncameron\.dev$/.test(u.hostname)) return; // pass 9: visitor counter — never cached
  if (u.origin === self.location.origin && /\/(vendor|img)\//.test(u.pathname)) {
    e.respondWith(caches.open(C).then((cache) => cache.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => { if (r && r.ok) cache.put(e.request, r.clone()); return r; }))));
    return;
  }
  // v8.5: app shell = NETWORK-FIRST with revalidation (ETag → tiny 304), cache only as offline fallback.
  if (u.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(C);
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 5000);
        const r = await fetch(e.request, { cache: 'no-cache', signal: ctl.signal });
        clearTimeout(t);
        if (r && r.ok) cache.put(e.request, r.clone());
        return r;
      } catch (err) {
        return (await cache.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? cache.match('index.html') : Response.error());
      }
    })());
    return;
  }
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
self.addEventListener('notificationclick', e => {
  if (PUSH && !(e.notification.data && e.notification.data.kyvo)) return; // OneSignal handles its own clicks
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.navigate && c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});

/* v8.2: generic Web Push (FCM / VAPID) — only fires if a push subscription exists (none until KYVO_PUSH_CONFIG.enabled). */
if (!PUSH) self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const n = d.notification || d;
  e.waitUntil(self.registration.showNotification(n.title || 'Kyvo', {
    body: n.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-96.png', tag: n.tag || 'kyvo-push',
    data: { url: n.url || (d.data && d.data.url) || './' },
  }));
});
