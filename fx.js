/* Kyvo v8.15 design layer (fx.js): a small line-icon set (inline SVG, crisp on retina), section enter motion and
   count-up numbers, header control row, heading icons, clamped helper text. No dependencies, ~9 KB. Everything is skipped with prefers-reduced-motion. */
(function () {
  'use strict';
  var S = function (p, extra) { return '<svg class="kyi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + p + '</svg>'; };
  var I = {
    pulse: S('<path d="M3 12h3.5l2.5-6 4 12 2.5-6H21"/>'),
    runner: S('<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>'),
    gold: S('<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z"/>'),
    viral: S('<path d="M4 4l16 16M20 4L4 20"/>', ' stroke-width="2.1"'),
    rank: S('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3"/>'),
    search: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    profil: S('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    j_dash: S('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
    j_log: S('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19M9 8h6M9 12h4"/>'),
    j_stats: S('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
    j_coach: S('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
    j_plan: S('<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="M8.5 10l1.5 1.5 3-3"/><path d="M8.5 16l1.5 1.5 3-3"/><path d="M15 11h1.5M15 17h1.5"/>'),
    share: S('<path d="M12 15V3.5"/><path d="M7.5 8L12 3.5 16.5 8"/><path d="M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5"/>'),
    pin: S('<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.5l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>'),
    lock: S('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    book: S('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19"/>'),
    tweet: S('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z"/><path d="M8 8h8M8 11.5h5"/>'),
    bars: S('<path d="M5 20v-6M10 20V9M15 20v-9M20 20V5"/>'),
    star: S('<path d="M12 3.5l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>'),
    flame: S('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.1 2.2-5.2 3.6-7 .4 1.9 1.4 3 2.5 3.4C11.4 7.6 12.6 5 15 3c-.2 2.6.9 4.3 2.1 6 1 1.4 1.4 2.8 1.4 4.6C18.5 18 15.9 21 12 21z"/>'),
    eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    bell: S('<path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>'),
    users: S('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 14.4A6.5 6.5 0 0 1 21.5 20"/>'),
    tag: S('<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.3"/>'),
    clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    shield_alert: S('<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M12 8.2v4.6"/><path d="M12 15.9h.01"/>'),
    shield: S('<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.3-4.4"/>'),
    check: S('<path d="M5 12.5l4.2 4.2L19 7"/>', ' stroke-width="2.2"'),
    trend: S('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
    gem: S('<path d="M6.5 4h11L21 9l-9 11L3 9z"/><path d="M3 9h18M9.5 4 12 9l2.5-5M12 9v11"/>'),
    sliders: S('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
    skull: S('<path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>'),
    trophy: S('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3"/>'),
    bot: S('<rect x="4" y="7" width="16" height="12" rx="3.5"/><path d="M12 3.5V7M9 12.5v1M15 12.5v1M2 12v3M22 12v3"/>'),
  };
  window.KyvoIcons = I;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function dockIcons() {
    var map = { hot: 'pulse', runner: 'runner', gold: 'gold', viral: 'viral', rank: 'rank', search: 'search', profil: 'profil' };
    document.querySelectorAll('.tb button[data-tab]').forEach(function (b) {
      var k = map[b.dataset.tab], sp = b.querySelector('span');
      if (k && sp && !sp.querySelector('svg')) sp.innerHTML = I[k];
    });
  }

  /* section enter: when a .scr becomes visible, replay a short staggered fade/slide of its blocks */
  function watchSections() {
    if (RM) return;
    var mo = new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        var el = m.target;
        if (el.classList && el.classList.contains('scr') && el.classList.contains('on') && !(m.oldValue || '').split(' ').includes('on')) {
          el.classList.remove('ky-enter'); void el.offsetWidth; el.classList.add('ky-enter');
          clearTimeout(el._kyT); el._kyT = setTimeout(function () { el.classList.remove('ky-enter'); }, 900);
        }
      });
    });
    document.querySelectorAll('main .scr').forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }); });
  }

  /* count-up: big chrome numbers count from their previous value (first view: from 0). A re-render with the same
     text does nothing, so the 15 s live refresh never "re-counts". */
  var SEL = '.kh-s b, .jr-big, .jr-st b, .jr-sv b, .pf-ch b';
  var last = new Map();
  function parse(t) {
    var m = /^([^\d]*?)([\d][\d\s.,\u00a0\u202f]*)(.*)$/.exec(t);
    if (!m) return null;
    var num = m[2].replace(/[\s\u00a0\u202f]+$/, ''), tail = m[2].slice(num.length) + m[3];
    var dm = /[.,](\d{1,2})$/.exec(num), dec = dm && !/[.,]\d{3}$/.test(num) ? dm[1].length : 0;
    var dch = dec ? num.charAt(num.length - dec - 1) : '';
    var intPart = dec ? num.slice(0, num.length - dec - 1) : num;
    var sep = (/[^\d]/.exec(intPart) || [''])[0];
    var v = parseFloat(intPart.replace(/[^\d]/g, '') + (dec ? '.' + num.slice(-dec) : ''));
    if (!isFinite(v)) return null;
    return { pre: m[1], v: v, dec: dec, dch: dch, sep: sep, post: tail };
  }
  function fmt(p, v) {
    var s = v.toFixed(p.dec), i = s.split('.')[0], d = s.split('.')[1];
    if (p.sep) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, p.sep);
    return p.pre + i + (d ? p.dch + d : '') + p.post;
  }
  function keyOf(el) {
    var sec = el.closest('section,.kyhero-slot,.pmpop') || document.body;
    var all = sec.querySelectorAll(SEL), i = Array.prototype.indexOf.call(all, el);
    return (sec.id || sec.className) + '|' + i;
  }
  function count(el) {
    if (el._kyCounting || el.children.length) return;
    var t = (el.textContent || '').trim(), k = keyOf(el), prev = last.get(k);
    last.set(k, t);
    if (prev === t || t.length > 24) return;
    var p = parse(t); if (!p || p.v === 0) return;
    var q = prev != null ? parse(prev) : null;
    var from = q && q.pre === p.pre && q.post === p.post ? q.v : 0;
    if (from === p.v) return;
    var t0 = performance.now(), dur = 750;
    el._kyCounting = true;
    (function step(now) {
      var x = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - x, 3);
      if (!el.isConnected) { el._kyCounting = false; return; }
      el.textContent = x < 1 ? fmt(p, from + (p.v - from) * e) : t;
      if (x < 1) requestAnimationFrame(step); else el._kyCounting = false;
    })(t0);
  }
  function watchNumbers() {
    if (RM || !window.MutationObserver) return;
    var pend = false;
    var run = function () { pend = false; document.querySelectorAll(SEL).forEach(function (el) { if (el.offsetParent !== null) count(el); }); };
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length && !(ms[i].target._kyCounting || (ms[i].target.parentNode && ms[i].target.parentNode._kyCounting))) { if (!pend) { pend = true; requestAnimationFrame(run); } return; }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { setTimeout(run, 60); });
    run();
  }
  /* seg pills: <i class="sgi" data-i="…"> slots → inline SVG */
  function segIcons() {
    document.querySelectorAll('i.sgi[data-i]').forEach(function (i) { if (!i.firstChild && I[i.dataset.i]) i.innerHTML = I[i.dataset.i]; });
  }
  /* header: one compact control row = chain segmented control + filter button (same nodes, same listeners) */
  function headerRow() {
    var ch = document.getElementById('chainSwitch'), fb = document.getElementById('filtBar'), seg = document.getElementById('seg');
    if (!ch || !fb || !seg || ch.parentNode.classList.contains('ky-ctl')) return;
    var row = document.createElement('div'); row.className = 'ky-ctl';
    seg.parentNode.insertBefore(row, seg.nextSibling);
    row.appendChild(ch); row.appendChild(fb);
    var t = document.getElementById('filtToggle'); if (t && !t.querySelector('svg')) t.insertAdjacentHTML('afterbegin', I.sliders);
  }
  /* section titles: a leading emoji in a heading becomes a matching line icon (same meaning, consistent look).
     Runs after i18n (its observer is registered first), only touches the first text node of a heading. */
  var EMO = { '🏃': 'runner', '🥇': 'gold', '🏆': 'trophy', '👀': 'eye', '🔔': 'bell', '🔎': 'search', '🐦': 'tweet', '📊': 'bars', '⭐': 'star', '🔥': 'flame', '🏷️': 'tag', '🏷': 'tag', '🕐': 'clock', '📈': 'trend', '👥': 'users', '📓': 'book', '💀': 'skull', '🤖': 'bot', '🛡️': 'shield', '🛡': 'shield', '✦': 'gem', '⏰': 'clock', '🧠': 'j_coach' };
  var HSEL = '.pg .h, .g-sh, .trk-h, .jr-an > b, .g-hero h2, .jr-bwc > small, .pf-h, .rk-h, .rk-seg button, .trk-tabs button, .trk-clt > b, .pl-name';
  function iconize(el) {
    if (el._kyHi) return; el._kyHi = 1;
    var n = el.firstChild;
    while (n && n.nodeType === 3 && !n.data.trim()) n = n.nextSibling;
    if (!n || n.nodeType !== 3) return;
    var t = n.data.replace(/^\s+/, ''), hit = null;
    for (var k in EMO) if (t.indexOf(k) === 0) { hit = k; break; }
    if (!hit) return;
    n.data = t.slice(hit.length).replace(/^\s+/, '');
    var sp = document.createElement('span'); sp.className = 'hic hic-' + EMO[hit]; sp.innerHTML = I[EMO[hit]];
    el.insertBefore(sp, n);
  }
  /* helper paragraphs: long ones are clamped to 2 lines, tap to expand (less clutter, nothing removed) */
  var CSEL = '.pg > .sub, .g-hero > p.mut, .g-left';
  function clampHelp(el) {
    if (el._kyCl) return; el._kyCl = 1;
    if ((el.textContent || '').length < 90) return;
    el.classList.add('ky-clamp'); el.setAttribute('role', 'button'); el.tabIndex = 0;
    var tog = function () { el.classList.toggle('open'); };
    el.addEventListener('click', tog);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
  }
  /* plan feature lists: leading emoji → one consistent check mark */
  function checkLi(li) {
    if (li._kyCk) return; li._kyCk = 1;
    var n = li.firstChild; if (!n || n.nodeType !== 3) return;
    n.data = n.data.replace(/^[\u2726\u2728\uFE0F\u200D\s]+/, '').replace(/^(?:\p{Extended_Pictographic}[\uFE0F\u200D\s]*)+/u, '');
    n.data = n.data.replace(/\p{Extended_Pictographic}[\uFE0F\u200D]*\s?/gu, '');
    var sp = document.createElement('span'); sp.className = 'ck'; sp.innerHTML = I.check; li.insertBefore(sp, n);
  }
  function watchDecor() {
    var pend = false;
    var run = function () { pend = false; segIcons(); document.querySelectorAll(HSEL).forEach(iconize); document.querySelectorAll(CSEL).forEach(clampHelp); document.querySelectorAll('.pl-li li').forEach(checkLi); };
    run();
    if (!window.MutationObserver) return;
    new MutationObserver(function () { if (!pend) { pend = true; requestAnimationFrame(run); } }).observe(document.body, { childList: true, subtree: true });
  }
  /* detail views (coin, trader, journal, premium, profile…) don't need the chain/filter row */
  function viewAttr() {
    var v = (location.hash || '').replace(/^#/, '').split('/')[0] || 'pulse';
    document.body.setAttribute('data-ky-view', v);
  }
  /* 3D feel: depth layers ([data-ky-par] > [data-depth]) drift with scroll + pointer / device tilt; cards tilt under the pointer.
     Gyro only where the browser gives it without a permission prompt (Android); iOS & desktop fall back to pointer/scroll.
     Fully off with prefers-reduced-motion. Transform-only → compositor, no layout. */
  function depth3d() {
    if (!window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var tx = 0, ty = 0, pend = false;
    function frame() {
      pend = false;
      var vh = innerHeight || 1;
      document.querySelectorAll('[data-ky-par]').forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) return;
        var py = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh));
        c.style.setProperty('--py', py.toFixed(3)); c.style.setProperty('--tx', tx.toFixed(3)); c.style.setProperty('--ty', ty.toFixed(3));
        c.querySelectorAll('[data-depth]').forEach(function (d) { if (!d._kyD) { d._kyD = 1; d.style.setProperty('--d', d.getAttribute('data-depth')); } });
      });
    }
    function req() { if (!pend) { pend = true; requestAnimationFrame(frame); } }
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req, { passive: true });
    document.addEventListener('scroll', req, { passive: true, capture: true });
    var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (fine) addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; req(); }, { passive: true });
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); req();
      }, { passive: true });
    }
    if (fine) {
      document.addEventListener('pointermove', function (e) {
        var t = e.target && e.target.closest && e.target.closest('.ky-tilt, .pl-card, .ob-ph, .ks-ph');
        if (!t) return;
        var r = t.getBoundingClientRect();
        t.style.setProperty('--rx', (((e.clientY - r.top) / r.height - 0.5) * -6).toFixed(2) + 'deg');
        t.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2) + 'deg');
        t.classList.add('ky-tilting');
      }, { passive: true });
      document.addEventListener('pointerout', function (e) {
        var t = e.target && e.target.closest && e.target.closest('.ky-tilt, .pl-card, .ob-ph, .ks-ph');
        if (t && !t.contains(e.relatedTarget)) { t.style.removeProperty('--rx'); t.style.removeProperty('--ry'); t.classList.remove('ky-tilting'); }
      }, { passive: true });
    }
    if (window.MutationObserver) new MutationObserver(req).observe(document.body, { childList: true, subtree: true });
    req();
  }
  function init() { viewAttr(); depth3d(); window.addEventListener('hashchange', viewAttr); dockIcons(); headerRow(); watchDecor(); watchSections(); watchNumbers(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
