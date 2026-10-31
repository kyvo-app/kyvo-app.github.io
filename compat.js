/* Kyvo v8.15 — tiny polyfills for older desktop/mobile browsers + forced update check (version.json, no-store). */
(function () {
  if (!Object.fromEntries) Object.fromEntries = function (it) { var o = {}; Array.from(it).forEach(function (p) { o[p[0]] = p[1]; }); return o; };
  if (!Array.prototype.flat) Object.defineProperty(Array.prototype, 'flat', { configurable: true, writable: true, value: function (d) { d = d === undefined ? 1 : d; return this.reduce(function (a, x) { return a.concat(Array.isArray(x) && d > 0 ? x.flat(d - 1) : x); }, []); } });
  if (!Array.prototype.flatMap) Object.defineProperty(Array.prototype, 'flatMap', { configurable: true, writable: true, value: function (f, t) { return this.map(f, t).flat(); } });
  if (typeof globalThis === 'undefined') window.globalThis = window;
  if (window.Promise && !Promise.allSettled) Promise.allSettled = function (ps) { return Promise.all(Array.from(ps).map(function (p) { return Promise.resolve(p).then(function (v) { return { status: 'fulfilled', value: v }; }, function (r) { return { status: 'rejected', reason: r }; }); })); };

  var APP_VERSION = '8.15';
  window.KYVO_VERSION = APP_VERSION;
  // drop logo caches written by older versions (could hold the Kyvo mascot or pump.fun placeholder URLs)
  try { ['kyvo_img_v1'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  function check() {
    if (!window.fetch) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (v) {
      if (!v || !v.version || v.version === APP_VERSION) return;
      var key = 'kyvo_upd_' + v.version;
      try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (e) {}
      // newer release online than the code running here → clear SW caches and reload once
      var jobs = [];
      if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^kyvo-/.test(k); }).map(function (k) { return caches.delete(k); })); }));
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); })); }));
      Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
    }).catch(function () {});
  }
  check();
  setInterval(check, 15 * 60e3);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
/* v8.15 art: responsive <picture> for Kyvo's own cinematic assets (img/*.avif|webp, generated for Kyvo). Lazy by default. */
(function () {

  var WS = { 'scr-desk-pulse-pl': [640, 1060], 'scr-desk-pulse-en': [640, 1060], chrome: [480, 720], cliff: [800, 1280], arc: [800, 1280], emblem: [320, 640, 1024], 'shot-pulse': [360], 'shot-runner': [360], 'shot-journal': [360], 'scr-runner-pl': [420, 780], 'scr-runner-en': [420, 780], 'scr-coin-pl': [420, 780], 'scr-coin-en': [420, 780], 'scr-journal-pl': [420, 780], 'scr-journal-en': [420, 780], 'scr-pnl-pl': [360, 640], 'scr-pnl-en': [360, 640], 'kyvo-model': [380, 760] };
  var DIM = { 'scr-desk-pulse-pl': [1060, 790], 'scr-desk-pulse-en': [1060, 790], chrome: [720, 1280], cliff: [1280, 720], arc: [1280, 720], emblem: [1024, 1024], 'shot-pulse': [360, 780], 'shot-runner': [360, 780], 'shot-journal': [360, 780], 'scr-runner-pl': [780, 1691], 'scr-runner-en': [780, 1691], 'scr-coin-pl': [780, 1691], 'scr-coin-en': [780, 1691], 'scr-journal-pl': [780, 1691], 'scr-journal-en': [780, 1691], 'scr-pnl-pl': [640, 1138], 'scr-pnl-en': [640, 1138], 'kyvo-model': [760, 760] };
  function set(n, ext) { return WS[n].map(function (w) { return 'img/' + n + '-' + w + '.' + ext + ' ' + w + 'w'; }).join(', '); }
  window.KyvoArt = {
    pic: function (n, sizes, o) {
      o = o || {};
      if (!WS[n]) return '';
      var ws = WS[n], d = DIM[n];
      return '<picture class="ky-pic ' + (o.cls || '') + '"' + (o.alt ? '' : ' aria-hidden="true"') + '>' +
        '<source type="image/avif" srcset="' + set(n, 'avif') + '" sizes="' + sizes + '">' +
        '<source type="image/webp" srcset="' + set(n, 'webp') + '" sizes="' + sizes + '">' +
        '<img src="img/' + n + '-' + ws[ws.length - 1] + '.webp" alt="' + (o.alt || '') + '" width="' + d[0] + '" height="' + d[1] + '" decoding="async"' + (o.eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' draggable="false"></picture>';
    },
  };

})();
