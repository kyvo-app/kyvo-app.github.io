/* Kyvo v8.2 — onboarding, "Jak korzystać", legal pages (Polish). Static, no tracking, no network calls. */
(function () {
  'use strict';
  const OB_KEY = 'kyvo_onboard_v8';
  const UPDATED = '31.10.2026';   // v8.25: Google sign-in via Supabase (EU), Phantom app login
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  /* v8.15 pass 6: "Kyvo stage" — real Kyvo screens (captured from the app at 3x) as 3D chrome devices on a green horizon,
     with edit-style motion (fly-in, focus punches, light sweeps, overlay chips). CSS-only motion; off with reduced motion. */
  function stage(l, mode, line) {
    const A = window.KyvoArt;
    if (!A) return '';
    const T = (pl, en) => (l === 'en' ? en : pl);
    const ph = (cls, n, sizes, depth, eager) => `<div class="ks-dev ${cls}" data-depth="${depth}"><div class="ks-in"><div class="ks-fx"><div class="ks-ph"><div class="ks-scr">${A.pic('scr-' + n + '-' + l, sizes, eager ? { eager: 1 } : {})}</div></div></div></div></div>`;
    const card = (cls, depth) => `<div class="ks-card ${cls}" data-depth="${depth}"><div class="ks-in"><div class="ks-cfx">${A.pic('scr-pnl-' + l, '(min-width:900px) 160px, 96px')}</div></div></div>`;
    const chip = (cls, dot, txt) => `<span class="ks-chip ${cls}"><i class="${dot}"></i>${txt}</span>`;
    const SZ = '(min-width:900px) 250px, 44vw', SS = '(min-width:900px) 210px, 36vw';
    let body = '';
    if (mode === 'hero') body = ph('ks-l', 'runner', SS, '0.45', 1) + ph('ks-r', 'coin', SS, '0.45', 1) + ph('ks-c', 'journal', SZ, '1', 1) + card('ks-k1', '1.4')
      + chip('ks-ch1', 'g', 'Runner · LIVE') + chip('ks-ch2', 'w', T('Wykres na żywo', 'Live chart')) + chip('ks-ch3', 'g', 'Journal · P&amp;L');
    else if (mode === 'duo') body = ph('ks-l', 'runner', SS, '0.5') + ph('ks-c', 'coin', SZ, '1') + chip('ks-ch4', 'g', 'Pulse · LIVE');
    else body = ph('ks-c', 'journal', SZ, '0.6') + card('ks-k2', '1.2') + chip('ks-ch5', 'g', T('Karta P&amp;L', 'P&amp;L card'));
    return `<div class="ks ks-${mode}" data-ky-par aria-hidden="true"><span class="ks-glow"></span><span class="ks-hz"></span><span class="ks-flash"></span>${body}${line ? `<div class="obh-line ks-line">${line}</div>` : ''}</div>`;
  }

  /* v8.15 pass 7: Liquid-style simplicity. One chrome 3D Kyvo mark (pre-rendered three.js loop, 760px, ~450 KB mp4,
     12 KB AVIF poster) on black with the chrome headline. The pass-6 phone stage stays behind STAGE. */
  const STAGE = false;
  function model(line) {
    const A = window.KyvoArt;
    const pic = A ? A.pic('kyvo-model', '(min-width:900px) 400px, 72vw', { eager: 1 }) : '';
    return `<div class="kym" aria-hidden="true"><span class="kym-glow"></span><div class="kym-obj">${pic}<video class="kym-vid" data-kym muted playsinline loop preload="none" disablepictureinpicture></video></div><div class="obh-line kym-line">${line}</div></div>`;
  }
  function solo(l, kind) {
    const A = window.KyvoArt;
    if (!A) return '';
    const inner = kind === 'pnl'
      ? `<div class="kso-dev ks-cfx">${A.pic('scr-pnl-' + l, '(min-width:900px) 180px, 40vw')}</div>`
      : `<div class="kso-dev"><div class="ks-ph"><div class="ks-scr">${A.pic('scr-' + kind + '-' + l, '(min-width:900px) 210px, 46vw')}</div></div></div>`;
    return `<div class="kso kso-${kind}" aria-hidden="true"><span class="kso-glow"></span>${inner}</div>`;
  }
  /* v8.15 pass 8 (ref: Alez 3_app_window): the real desktop Pulse inside a dark app window with grey callouts, on the horizon arc */
  function win(l) {
    const A = window.KyvoArt;
    if (!A) return '';
    const T2 = (pl, en) => (l === 'en' ? en : pl);
    return `<div class="kwin" aria-hidden="true"><span class="kwin-hz"></span><div class="kwin-w"><div class="kwin-bar"><i></i><i></i><i></i><span>kyvo · pulse</span></div>
      <div class="kwin-body"><div class="kwin-side"><b></b><b class="on"></b><b></b><b></b><b></b></div><div class="kwin-scr">${A.pic('scr-desk-pulse-' + l, '(min-width:900px) 520px, 86vw')}</div></div></div>
      <span class="kwin-tip t1">${T2('Zakładki: Pulse · Gold · Runner · Ranking', 'Tabs: Pulse · Gold · Runner · Leaderboard')}</span>
      <span class="kwin-tip t2">${T2('Runnery oznaczone dziś — na żywo', 'Runners flagged today — live')}</span>
      <span class="kwin-tip t3">${T2('New Pairs · Final Stretch · Migrated', 'New Pairs · Final Stretch · Migrated')}</span></div>`;
  }
  /* v8.15 pass 8 (ref: Alez 1_coach_panel): a static preview of the Journal coach panel */
  function coachArt(l) {
    const T2 = (pl, en) => (l === 'en' ? en : pl);
    const ic = (d) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const q = [[ic('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M12 8v5M12 16h.01"/>'), T2('Czy gram na tilcie?', 'Am I tilt trading?')], [ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'), T2('Który setup daje mi najwięcej?', 'Which setup pays me the most?')], [ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), T2('Oceń moją psychikę w tym tygodniu', 'Grade my psychology this week')]];
    return `<div class="kcoa" aria-hidden="true"><span class="kwin-hz"></span><div class="kcoa-p"><div class="kcoa-seg"><b class="on">Coach</b><b>${T2('Wskazówki', 'Tips')}</b><b>Tilt guard</b></div>
      <svg class="kcoa-mark" viewBox="0 0 399 406"><defs><linearGradient id="kcoaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#9aa0aa"/><stop offset="1" stop-color="#e9ebef"/></linearGradient></defs><polygon fill="url(#kcoaG)" points="0,145 164,0 164,182 0,322"/><polygon fill="url(#kcoaG)" points="165,182 399,0 399,88 215,222 215,406 165,406"/></svg>
      <div class="kcoa-t">${T2('O co chcesz zapytać?', 'What do you want to know?')}</div><div class="kcoa-s">${T2('Coach przeczytał każdy Twój trade.', 'Your coach has read every trade you logged.')}</div>
      <div class="kcoa-q">${q.map((x) => `<span>${x[0]}${x[1]}</span>`).join('')}</div>
      <div class="kcoa-in"><span>${T2('Zapytaj o swoje trade’y…', 'Ask about your trades…')}</span><em>${T2('Reguły · bez AI', 'Rules · no AI')}</em><i>↑</i></div></div></div>`;
  }
  /* v8.15 pass 9 (ref: Alez 2_big_counter): "Kyvo w liczbach" — one huge chrome number + a row of small stats, all computed
     at load time from the public data/ files (no made-up numbers; a missing file hides its stat), plus a slow "DANE Z / DATA FROM"
     strip of the platforms Kyvo really reads from or links to (greyscale favicons in img/brands/, not affiliated). */
  const KYN_BRANDS = [['pumpfun', 'pump.fun'], ['axiom', 'Axiom'], ['gmgn', 'GMGN'], ['kolscan', 'kolscan'], ['dexscreener', 'DEX Screener'], ['geckoterminal', 'GeckoTerminal'], ['solscan', 'Solscan'], ['rugcheck', 'RugCheck'], ['phantom', 'Phantom'], ['solana', 'Solana']];
  // Visitor counter: Abacus (free, no account, no key in the repo; CORS). One /hit per browser ever (= unique browsers, approx.),
  // only on the live site, shown only from VISITS.min up. Unavailable / blocked → the line stays hidden.
  const KYN_VISITS = { on: true, host: 'kyvo-app.github.io',   // v8.25 new home; ns stays the same so the shared count continues
    api: 'https://abacus.jasoncameron.dev', ns: 'alezrugla-max.github.io', key: 'kyvo-visits', min: 100 };
  const kynEN = () => !!(window.KyvoI18n && window.KyvoI18n.isEn());
  function kynStrip(mod) {
    const en = kynEN();
    const row = KYN_BRANDS.map((b) => `<span class="kyn-b"><img src="img/brands/${b[0]}.webp" width="20" height="20" alt="" loading="lazy" decoding="async">${b[1]}</span>`).join('');
    return `<div class="kyn-strip ${mod || ''}" translate="no"><div class="kyn-lbl">${en ? 'Data from' : 'Dane z'}</div><div class="kyn-mq" aria-label="${KYN_BRANDS.map((b) => b[1]).join(', ')}"><div class="kyn-track">${row}<span class="kyn-dup" aria-hidden="true">${row}</span></div></div><div class="kyn-aff">${en ? 'Kyvo is not affiliated with these platforms.' : 'Kyvo nie jest powiązane z tymi platformami.'}</div></div>`;
  }
  function kynArt(l) {
    const T2 = (pl, en) => (l === 'en' ? en : pl);
    const st = (k, lbl) => `<div class="kyn-s" data-kyn-s="${k}" hidden><b data-kyn="${k}">0</b><small>${lbl}</small></div>`;
    return `<div class="kyn" data-kyn-root translate="no">
      <div class="kyn-main" data-kyn-s="flag" hidden><b class="kyn-big" data-kyn="flag">0</b><small data-kyn-cap>${T2('coinów oznaczonych przez Kyvo', 'coins flagged by Kyvo')}</small></div>
      <div class="kyn-top" data-kyn-s="top" hidden>${T2('Największy znaleziony coin', 'Biggest coin found')} <b data-kyn="top">0</b> <span data-kyn-topsym></span></div>
      <div class="kyn-row">${st('run', T2('Runnerów', 'Runners'))}${st('x2', T2('doszło do 2x', 'reached 2x'))}${st('trd', T2('traderów w Rankingu', 'traders in Ranking'))}${st('wal', T2('portfeli śledzonych', 'wallets tracked'))}</div>
      <div class="kyn-vis" data-kyn-s="vis" hidden><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/></svg><b data-kyn="vis">0</b> ${T2('osób odwiedziło Kyvo', 'people have visited Kyvo')}</div>
      ${kynStrip('kyn-in')}</div>`;
  }
  let kynData = null;
  async function kynLoad() {
    if (kynData) return kynData;
    const j = async (u) => { try { const r = await fetch(u, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
    const h = Math.floor(Date.now() / 600000);
    const [tr, lb, tf] = await Promise.all([j('data/track_record.json?t=' + h), j('data/leaderboard.json?d=' + h), j('data/tracker_feed.json?t=' + h)]);
    const o = {};
    const it = (tr && tr.items) || [];
    if (it.length) {
      o.flag = it.length;
      o.since = Math.min(...it.map((e) => e.at || Date.now()));
      o.run = it.filter((e) => e.kinds && e.kinds.runner).length;
      // same sanity rule as the Runner hero: >50x = suspect price sample, skipped
      const KP = window.KyvoPairs, sane = (e) => !KP || !KP.entryCheck(e.px0, e.mc0, e.max, e.mc0 > 0 ? (e.mc0 * e.max) / e.px0 : null);   // v8.33 shared entry rule
      o.x2 = it.filter((e) => e.px0 > 0 && e.max > 0 && sane(e) && e.max / e.px0 >= 2 && e.max / e.px0 < 51).length;
      // v8.18: biggest move of a flagged coin (peak vs price at flag), same >50x sanity rule
      const ok = it.filter((e) => e.px0 > 0 && e.max > 0 && sane(e) && e.max / e.px0 < 51);
      if (ok.length) { const b = ok.reduce((m, e) => (e.max / e.px0 > m.max / m.px0 ? e : m)); const pct = (b.max / b.px0 - 1) * 100; if (pct >= 50) { o.top = Math.round(pct); o.topSym = b.sym || ''; } }
    }
    const nt = lb && (lb.wallets_count || (lb.leaders && lb.leaders.length));
    if (nt) o.trd = nt;
    if (tf && tf.wallets && tf.wallets.length) o.wal = tf.wallets.length;
    kynData = o;
    return o;
  }
  async function kynVisits() {
    const V = KYN_VISITS;
    if (!V.on || location.hostname !== V.host || !window.fetch) return null;
    let seen = false; try { seen = !!localStorage.getItem('kyvo_vc1'); } catch (e) {}
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(`${V.api}/${seen ? 'get' : 'hit'}/${V.ns}/${V.key}`, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      clearTimeout(t);
      if (!r.ok) return null;
      const d = await r.json();
      if (!seen) try { localStorage.setItem('kyvo_vc1', '1'); } catch (e) {}
      return d && typeof d.value === 'number' && d.value >= V.min ? d.value : null;
    } catch (e) { return null; }
  }
  const kynFmt0 = (n) => Math.round(n).toLocaleString(kynEN() ? 'en-US' : 'pl-PL');
  const kynFmt = (n, el) => (el && el.dataset.pre || '') + kynFmt0(n) + (el && el.dataset.suf || '');
  function kynCount(el, to) {
    const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm || to < 10) { el.textContent = kynFmt(to, el); return; }
    const t0 = performance.now(), dur = 1400;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = kynFmt(to * e, el); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  async function kynMount(root) {
    const box = root.querySelector('[data-kyn-root]'); if (!box) return;
    const o = await kynLoad();
    const en = kynEN();
    if (o.since) {
      const cap = box.querySelector('[data-kyn-cap]');
      const d = new Date(o.since), recent = Date.now() - o.since < 13.5 * 864e5;
      const ds = d.toLocaleDateString(en ? 'en-GB' : 'pl-PL', { day: 'numeric', month: 'short' });
      if (cap) cap.textContent = en ? `coins flagged by Kyvo ${recent ? 'since ' + ds : 'in the last 14 days'}` : `coinów oznaczonych przez Kyvo ${recent ? 'od ' + ds : 'w ostatnich 14 dniach'}`;
    }
    const show = (k, v) => { const s = box.querySelector(`[data-kyn-s="${k}"]`), b = box.querySelector(`[data-kyn="${k}"]`); if (!s || !b || v == null) return; s.hidden = false; b.dataset.to = v; b.textContent = kynFmt(v, b); };
    { const tb = box.querySelector('[data-kyn="top"]'), ts = box.querySelector('[data-kyn-topsym]'); if (tb && o.top != null) { tb.dataset.pre = '+'; tb.dataset.suf = '%'; if (ts && o.topSym) ts.textContent = '(' + o.topSym + ')'; } }
    ['flag', 'top', 'run', 'x2', 'trd', 'wal'].forEach((k) => show(k, o[k]));
    const go = () => box.querySelectorAll('[data-kyn]').forEach((b) => { if (b.dataset.to && !b.dataset.done) { b.dataset.done = '1'; kynCount(b, +b.dataset.to); } });
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { go(); io.disconnect(); } }, { threshold: 0.4 }); io.observe(box); } else go();
    kynVisits().then((v) => { if (v != null) { show('vis', v); const b = box.querySelector('[data-kyn="vis"]'); if (b) { b.dataset.done = '1'; } } });
  }
  window.KyvoNumbers = { strip: kynStrip, load: kynLoad };
  function hero(l, line) { return STAGE ? stage(l, 'hero', line) : model(line); }
  function art2(l) { return STAGE ? stage(l, 'duo') : win(l); }   // pass 8: app-window showcase (solo(l, 'coin') stays as fallback)
  function art4(l) { return STAGE ? stage(l, 'pnl') : solo(l, 'pnl'); }
  function kmMount(root) {
    const v = root.querySelector('video[data-kym]');
    if (!v) return;
    const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sd = navigator.connection && navigator.connection.saveData;
    if (rm || sd) { v.remove(); return; } // static poster only
    const start = () => {
      if (v.dataset.on || !v.isConnected) return;
      v.dataset.on = '1';
      v.innerHTML = '<source src="img/kyvo-model.mp4?v=8.15" type="video/mp4"><source src="img/kyvo-model.webm?v=8.15" type="video/webm">';
      v.addEventListener('playing', () => v.classList.add('on'), { once: true });
      v.load();
      const pr = v.play(); if (pr && pr.catch) pr.catch(() => {});
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 400)))(start, { timeout: 1500 });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!v.isConnected) { io.disconnect(); return; }
        if (!v.dataset.on) return;
        if (e.isIntersecting && !document.hidden) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } else v.pause();
      }, { threshold: 0.15 });
      io.observe(v);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden && v.isConnected) v.pause(); });
  }

  /* ---------------- Onboarding ---------------- */
  const CARDS_PL = [
    {
      art: hero('pl', 'Zobacz ruch, zanim zobaczy go tłum.'),
      t: 'Witaj w Kyvo',
      p: 'Smart money i viralowe memecoiny w jednym miejscu. Dane na żywo z Solany, BSC i Robinhood Chain.',
      li: ['Za darmo, logowanie opcjonalne', 'Kyvo nie trzyma Twoich pieniędzy', 'Nigdy nie prosimy o seed ani klucz prywatny'],
      lang: true,
    },
    {
      art: kynArt('pl'),
      t: 'Kyvo w liczbach',
      p: 'Prawdziwe liczby z publicznego logu Kyvo — liczone przy każdym otwarciu, bez zaokrąglania w górę.',
      li: [],
    },
    {
      art: art2('pl'),
      t: 'Pulse: coiny na żywo',
      p: 'Pulse pokazuje nowe pary, coiny blisko końca krzywej (Final Stretch) i te, które właśnie przeszły na DEX (Migrated). Good Coins to coiny po mocniejszych filtrach.',
      li: ['Przełącz sieć u góry: Solana · BSC · Robin · Wszystkie', '„Filtry” — ustaw MC, płynność, wolumen, wiek', '⏱ wiek coina i „na liście od” przy każdym wierszu'],
    },
    {
      art: '<div class="ob-art"><span>𝕏 Tematy → coiny</span><span>Tweety traderów</span><span>Ważne posty</span></div>',
      t: 'Viral z X',
      p: 'Popularne tematy z X i coiny, które do nich pasują. Gdy trader tweetuje o coinie, od razu masz link do jego strony w Kyvo.',
      li: ['Cytaty z linkiem do oryginału na X', 'Coiny dopasowane po adresie albo jednoznacznym $tickerze', 'Ten sam ticker może mieć kopie — sprawdzaj adres'],
    },
    {
      art: art4('pl'),
      t: 'Ranking i Twój Profil',
      p: 'Ranking traderów z publicznych transakcji on-chain: PnL, win rate, ostatnie trade’y. W Profilu wklejasz publiczny adres portfela i widzisz swój PnL, pozycje i kartę do udostępnienia.',
      li: ['Tylko publiczne adresy (Solana, BSC, Robinhood)', 'Dane zostają w Twojej przeglądarce', 'Do 8 portfeli naraz'],
    },
    {
      art: coachArt('pl'),
      t: 'Kyvo Coach w Journal',
      p: 'Zapytaj o swoje trade’y: czy grasz na tilcie, który setup daje Ci najwięcej, jak wygląda Twoja psychika w tym tygodniu. Odpowiedzi liczone z Twojego dziennika — na regułach, bez płatnego AI.',
      li: ['Journal i Coach — w Premium', 'Wystarczy publiczny adres portfela, nigdy klucz', 'To wskazówki, nie porada finansowa'],
    },
    {
      art: '<div class="ob-art ob-ios"><span>Safari</span><span>⬆︎ Udostępnij</span><span>➕ Do ekranu początk.</span></div>',
      t: 'Dodaj Kyvo na ekran',
      p: 'iPhone: otwórz Kyvo w Safari → przycisk Udostępnij ⬆︎ → „Do ekranu początkowego”. Android/Chrome: menu ⋮ → „Dodaj do ekranu głównego”.',
      li: ['To nie jest porada finansowa — DYOR', 'Memecoiny są bardzo ryzykowne, możesz stracić wszystko'],
      last: true,
    },
  ];
  function closeOnboard() {
    const el = document.getElementById('kyvoOb');
    if (!el) return;
    try { localStorage.setItem(OB_KEY, String(Date.now())); } catch (e) {}
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
    document.documentElement.classList.remove('ob-lock');
    if (typeof onboardDone === 'function') { const f = onboardDone; onboardDone = null; setTimeout(f, 60); }
  }
  let onboardDone = null;
  function openOnboard() {
    if (document.getElementById('kyvoOb')) return;
    const el = document.createElement('div');
    el.id = 'kyvoOb';
    el.className = 'ob';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Wprowadzenie do Kyvo');
    el.innerHTML = `
      <div class="ob-top"><span class="ob-step" id="obStep">1/${CARDS.length}</span>${window.KyvoI18n ? window.KyvoI18n.toggleHtml('ob-lang') : ''}<button type="button" class="ob-skip" id="obSkip">Pomiń</button></div>
      <div class="ob-track" id="obTrack">${CARDS.map((c, i) => `
        <section class="ob-card" data-i="${i}">
          <div class="ob-artwrap">${c.art}</div>
          <h2>${esc(c.t)}</h2>
          <p>${esc(c.p)}</p>
          <ul>${c.li.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          ${c.last ? `<div class="ob-legal">Korzystając z Kyvo akceptujesz <a href="#legal/regulamin" data-obclose="1">Regulamin</a> i <a href="#legal/prywatnosc" data-obclose="1">Politykę prywatności</a>.</div>` : ''}
        </section>`).join('')}
      </div>
      <div class="ob-bot">
        <div class="ob-dots" id="obDots">${CARDS.map((_, i) => `<button type="button" data-d="${i}" aria-label="Karta ${i + 1}" class="${i ? '' : 'on'}"></button>`).join('')}</div>
        <button type="button" class="ob-next" id="obNext">Dalej</button>
      </div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('ob-lock');
    kmMount(el);
    kynMount(el);
    const track = el.querySelector('#obTrack');
    const next = el.querySelector('#obNext');
    let idx = 0;
    const go = (i) => { track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); };
    const sync = () => {
      const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (i === idx && next.dataset.ready) return;
      idx = Math.max(0, Math.min(CARDS.length - 1, i));
      next.dataset.ready = '1';
      el.querySelector('#obStep').textContent = idx + 1 + '/' + CARDS.length;
      el.querySelectorAll('#obDots button').forEach((b, j) => b.classList.toggle('on', j === idx));
      next.textContent = idx === CARDS.length - 1 ? 'Zaczynamy' : 'Dalej';
    };
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    next.onclick = () => (idx >= CARDS.length - 1 ? closeOnboard() : go(idx + 1));
    el.querySelector('#obSkip').onclick = closeOnboard;
    el.querySelectorAll('#obDots button').forEach((b) => (b.onclick = () => go(+b.dataset.d)));
    el.querySelectorAll('[data-obclose]').forEach((a) => a.addEventListener('click', closeOnboard));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeOnboard();
      if (e.key === 'ArrowRight') go(Math.min(CARDS.length - 1, idx + 1));
      if (e.key === 'ArrowLeft') go(Math.max(0, idx - 1));
    });
    sync();
    setTimeout(() => next.focus({ preventScroll: true }), 50);
  }
  function maybeOnboard(after) {
    let seen = null;
    try { seen = localStorage.getItem(OB_KEY); } catch (e) {}
    const h = (location.hash || '').slice(1);
    if (seen || /^(legal|help|login|kontakt|premium)/.test(h) || /[?&]noonboard/.test(location.search)) return false;
    let lang = null;
    try { lang = localStorage.getItem('kyvo_lang'); } catch (e) {}
    if (!lang && !/[?&]lang=/.test(location.search)) { openLangPicker(); return true; } // v8.2: language first, then onboarding (after reload)
    onboardDone = after || null;
    openOnboard();
    return true;
  }

  /* ---------------- v8.2: first-launch language picker ---------------- */
  function openLangPicker() {
    if (document.getElementById('kyvoLang')) return;
    const cur = window.KyvoI18n ? window.KyvoI18n.lang : 'pl';
    const el = document.createElement('div');
    el.id = 'kyvoLang';
    el.className = 'ob langpick';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Język / Language');
    el.setAttribute('translate', 'no');
    el.innerHTML = `
      <div class="lp-in">
        <img src="icons/icon-192.png" width="88" height="88" alt="" class="lp-logo">
        <h2>Wybierz język<br><span>Choose your language</span></h2>
        <button type="button" class="lp-btn${cur === 'pl' ? ' sug' : ''}" data-pick="pl"><span class="lp-flag">🇵🇱</span><span><b>Polski</b><small>Kontynuuj po polsku</small></span></button>
        <button type="button" class="lp-btn${cur === 'en' ? ' sug' : ''}" data-pick="en"><span class="lp-flag">🇬🇧</span><span><b>English</b><small>Continue in English</small></span></button>
        <p class="lp-note">Zmienisz to później w Więcej → Język.<br>You can change it later in More → Language.</p>
      </div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('ob-lock');
    el.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => {
      const l = b.dataset.pick;
      try { localStorage.setItem('kyvo_lang', l); } catch (e) {}
      if (window.KyvoI18n) window.KyvoI18n.set(l); else location.reload();
    }));
    setTimeout(() => { const b = el.querySelector('.lp-btn.sug') || el.querySelector('.lp-btn'); if (b) b.focus({ preventScroll: true }); }, 50);
  }

  /* ---------------- v8.14.1: two paid tiers (Premium · 🏃 Runners), launch price -50 % ---------------- */
  function planCfg() {
    const C = Object.assign({ enabled: false, promoActive: true, promoPct: 50, period: 'mies.', trialDays: 3, freeRunnersPerDay: 1, popupAfterLogin: true }, window.KYVO_PREMIUM_CONFIG || {});
    const P = C.plans || {};
    const mk = (id, d) => {
      const x = Object.assign({}, d, P[id] || {});
      x.id = id;
      x.link = (C.promoActive ? x.stripePaymentLinkPromo : x.stripePaymentLinkRegular) || '';
      x.live = !!(C.enabled && /^https:\/\//.test(x.link));
      return x;
    };
    C.premium = mk('premium', { name: 'Premium', regularPrice: C.regularPrice || '$9.99', promoPrice: C.promoPrice || '$4.99', runnersPerDay: 3, stripePaymentLinkPromo: C.stripePaymentLinkPromo, stripePaymentLinkRegular: C.stripePaymentLinkRegular });
    C.runners = mk('runners', { name: '🏃 Runners', regularPrice: '$49.99', promoPrice: '$24.99', runnersPerDay: null });
    return C;
  }
  const curTier = () => { try { return (window.KyvoPremium && window.KyvoPremium.tier && window.KyvoPremium.tier()) || 'free'; } catch (e) { return 'free'; } };
  function planPriceHtml(C, x, per) {
    return C.promoActive
      ? `<span class="pm-old">${esc(x.regularPrice)}</span><b>${esc(x.promoPrice)}</b><span>/ ${esc(per)}</span>`
      : `<b>${esc(x.regularPrice)}</b><span>/ ${esc(per)}</span>`;
  }
  function planFeats(id) {
    const L = (pl, en) => (EN ? en : pl);
    return id === 'runners' ? [
      L('✦ Wszystko z Premium', '✦ Everything in Premium'),
      L('🏃 Wszystkie Runnery bez limitu (👑 KOL coin, 🚀 Moon run, 📈 Duży runner, 🐦 Tweet runner, 🔁 Kolejna fala)', '🏃 All Runners, no limit (👑 KOL coin, 🚀 Moon run, 📈 Big runner, 🐦 Tweet runner, 🔁 Second leg)'),
      L('🔔 Push o każdym Runnerze i Tweet runnerze', '🔔 Push for every Runner and Tweet runner'),
      L('👀 Push smart money (≥3 top traderów kupuje jeden coin)', '👀 Smart money push (≥3 top traders buy one coin)'),
    ] : [
      L('🏃 3 Runnery dziennie (darmowo: 1)', '🏃 3 Runners a day (free: 1)'),
      L('🥇 Pełny Gold: feed, sprawdzanie bez limitu, alerty Gold', '🥇 Full Gold: feed, unlimited checks, Gold alerts'),
      L('👀 Tracker: obserwuj portfele bez limitu (darmowo: 3)', '👀 Tracker: follow unlimited wallets (free: 3)'),
      L('🔔 Wszystkie powiadomienia bez limitu (darmowo: 2 dziennie)', '🔔 All notifications, no limit (free: 2 a day)'),
    ];
  }
  function planCardHtml(C, x, opts) {
    const L = (pl, en) => (EN ? en : pl);
    const per = EN ? 'mo' : C.period;
    const top = x.id === 'runners';
    const mine = opts && opts.tier === x.id;
    const cta = mine ? L('✓ Twój plan', '✓ Your plan')
      : x.live ? L(`Rozpocznij ${C.trialDays} dni za darmo`, `Start ${C.trialDays}-day free trial`)
      : L('Wkrótce — zapisz się przez Kontakt', 'Coming soon — join via Contact');
    return `<div class="pl-card${top ? ' top' : ''}${opts && opts.focus === x.id ? ' focus' : ''}" data-plan="${esc(x.id)}">
        ${top ? `<div class="pl-ribbon">${L('NAJWIĘCEJ SYGNAŁÓW', 'MOST SIGNALS')}</div>` : ''}
        <div class="pl-name">${esc(x.name).replace(/^([^A-Za-z]*)(.*)$/, '$1<span class="chrome">$2</span>')}</div>
        ${C.promoActive ? `<div class="pl-off">${L('Cena startowa', 'Launch price')} -${esc(C.promoPct)}%</div>` : ''}
        <div class="pm-price">${planPriceHtml(C, x, per)}</div>
        ${C.promoActive ? `<div class="pl-later">${L('potem', 'later')} ${esc(x.regularPrice)} / ${esc(per)}</div>` : ''}
        <ul class="pl-li">${planFeats(x.id).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <button type="button" class="pm-cta${top ? '' : ' alt'}" data-plango="${esc(x.id)}"${mine ? ' disabled' : ''}>${cta}</button>
      </div>`;
  }

  /* ---------------- v8.2: Premium pop-up after login / "continue without login" (max once per session and per day) ---------------- */
  function maybePremiumPopup(force, focus) {
    const C = planCfg();
    if (!force && C.popupAfterLogin === false) return false;
    const day = new Date().toISOString().slice(0, 10);
    try {
      if (!force && (sessionStorage.getItem('kyvo_pm_pop') || localStorage.getItem('kyvo_pm_pop_day') === day)) return false;
      sessionStorage.setItem('kyvo_pm_pop', '1');
      localStorage.setItem('kyvo_pm_pop_day', day);
    } catch (e) {}
    if (document.getElementById('kyvoPmPop')) return false;
    const L = (pl, en) => (EN ? en : pl);
    const live = C.premium.live || C.runners.live;
    const tier = curTier();
    const el = document.createElement('div');
    el.id = 'kyvoPmPop';
    el.className = 'pmpop';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Kyvo Premium');
    el.innerHTML = `
      <div class="pmpop-card">
        <button type="button" class="pmpop-x" data-pmclose aria-label="${L('Zamknij', 'Close')}">✕</button>
        <img src="icons/icon-192.png" width="48" height="48" alt="">
        <div class="pm-badge">${live ? L('✦ KYVO PREMIUM', '✦ KYVO PREMIUM') : L('✦ PREMIUM · WKRÓTCE', '✦ PREMIUM · COMING SOON')}</div>
        <h2>${L('Więcej sygnałów, mniej szumu', 'More signals, less noise')}</h2>
        ${C.promoActive ? `<div class="pm-promo">🔥 ${L('Cena startowa', 'Launch price')} -${esc(C.promoPct)}% · ${L('dla pierwszych użytkowników', 'for early users')}</div>` : ''}
        <div class="pl-grid">${planCardHtml(C, C.runners, { focus, tier })}${planCardHtml(C, C.premium, { focus, tier })}</div>
        <div class="pm-trial">${L(esc(C.trialDays) + ' dni za darmo na start', esc(C.trialDays) + '-day free trial')} · ${L('anulujesz kiedy chcesz', 'cancel anytime')} · ${L('darmowo zawsze: 1 Runner dziennie', 'always free: 1 Runner a day')}</div>
        <a href="#premium" class="pmpop-more" data-pmclose>${L('Zobacz szczegóły i tabelę funkcji', 'See details and the feature table')}</a>
        <div class="pmpop-note">${live ? '' : L('Płatności jeszcze nie działają — nic nie sprzedajemy i niczego nie pobieramy.', 'Payments aren\'t live yet — we don\'t sell or charge anything.')} ${L('Premium to nie porada finansowa.', 'Premium is not financial advice.')}</div>
      </div>`;
    el.setAttribute('translate', 'no');
    document.body.appendChild(el);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 180); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    el.querySelectorAll('[data-pmclose]').forEach((b) => b.addEventListener('click', close));
    el.querySelectorAll('[data-plango]').forEach((b) => (b.onclick = () => { // no payment is ever taken here: live plan → Premium page (Stripe link there), else → Kontakt (waitlist)
      const x = C[b.dataset.plango];
      close(); location.hash = x && x.live ? 'premium' : 'kontakt';
    }));
    setTimeout(() => el.querySelector('.pmpop-x').focus({ preventScroll: true }), 50);
    return true;
  }

  /* ---------------- Help / FAQ ---------------- */
  const FAQ_PL = [
    ['Start', [
      ['Czym jest Kyvo?', 'Darmowa aplikacja webowa (PWA), która zbiera w jednym miejscu publiczne dane o memecoinach: nowe pary, coiny przed migracją, coiny po migracji, ruchy publicznie znanych portfeli (smart money), ranking traderów i popularne tematy z X. Kyvo niczym nie handluje, nie trzyma środków i nigdy nie wysyła transakcji z Twojego portfela (logowanie portfelem to tylko podpis wiadomości).'],
      ['Czy muszę zakładać konto?', 'Nie. Logowanie jest opcjonalne — bez niego masz pełny dostęp. Ustawienia (sieć, filtry, Twoje publiczne adresy, nick, avatar) zapisują się tylko w pamięci tej przeglądarki (localStorage).'],
      ['Jak dodać Kyvo na ekran telefonu?', 'iPhone: otwórz stronę w Safari → Udostępnij ⬆︎ → „Do ekranu początkowego”. Android/Chrome: menu ⋮ → „Dodaj do ekranu głównego”. Po aktualizacji Kyvo zamknij apkę całkiem i otwórz ponownie, żeby wczytała nową wersję.'],
      ['Sieci: Solana · BSC · Robin · Wszystkie', 'Przełącznik pod wyszukiwarką wybiera sieć dla wszystkich list. „Robin” to Robinhood Chain. „Wszystkie” łączy trzy sieci — przy każdym coinie jest znaczek SOL / BSC / RH.'],
      ['Język', 'Kyvo działa po polsku i po angielsku. Zmienisz język przyciskami PL / EN w zakładce Więcej (albo na pierwszej karcie wprowadzenia, albo w nagłówku na komputerze). Wybór zapamiętujemy w tej przeglądarce.'],
    ]],
    ['Logowanie, Premium i kontakt', [
      ['Czy muszę się logować?', 'Nie. „Kontynuuj bez logowania” daje pełny dostęp do wszystkiego. Logowanie zapisuje Twój portfel w Profilu i przygotowuje konto pod przyszłe Kyvo Premium.'],
      ['Jak działa logowanie portfelem?', 'Wybierasz Phantom / Solflare (Solana) albo MetaMask lub inny portfel EVM (BSC, Robinhood Chain). Portfel pokazuje wiadomość „Logowanie do Kyvo. To nie jest transakcja i nic nie kosztuje.” — podpisujesz tylko ją. To nie jest transakcja, nie ma opłat, Kyvo nie dostaje dostępu do środków. Podpis sprawdzamy na Twoim urządzeniu, a sesja zostaje w tej przeglądarce. Na iPhonie Kyvo otworzy się w przeglądarce w aplikacji portfela.'],
      ['Co jeśli portfel prosi o zatwierdzenie transakcji?', 'Odrzuć ją. Kyvo nigdy nie wysyła transakcji do podpisu — tylko wiadomość tekstową. Nikt z Kyvo nie poprosi też o seed phrase ani klucz prywatny.'],
      ['Google, e-mail i Apple', 'Logowanie przez Google i e-mail (link logowania wysyłany na maila — bez hasła) włączymy wkrótce; Apple — później. Do tego czasu przyciski są oznaczone „Wkrótce”.'],
      ['Jak się wylogować?', 'Profil → „Wyloguj”. Adres zostaje w Profilu, możesz go usunąć osobno. Więcej → „Wyczyść dane Kyvo” usuwa wszystko z tej przeglądarki.'],
      ['Kyvo Premium', 'Plan Premium jest w przygotowaniu — funkcje oznaczone „wkrótce” jeszcze nie działają i nic nie jest sprzedawane. Planowane są dwa plany: Premium — $9.99 / mies. (cena startowa -50%: $4.99 / mies.) oraz 🏃 Runners — $49.99 / mies. (cena startowa -50%: $24.99 / mies.). Oba z 3 dniami za darmo (z podpiętą kartą, Apple Pay lub Google Pay; BLIK nie działa dla subskrypcji) i wymagają logowania. Runnery: darmowo 1 dziennie (pierwszy oznaczony danego dnia), Premium 3 dziennie, Runners — wszystkie + push o Runnerach i push smart money. Premium daje też pełny Gold, Tracker bez limitu i wszystkie powiadomienia. Wszystko inne, co działa dziś, zostaje za darmo.'],
      ['Kontakt', 'Chcesz pogadać, pomóc albo współpracować? Więcej → Kontakt (Discord).'],
    ]],
    ['Zakładki z coinami', [
      ['Pulse', 'Główny ekran. Na telefonie przełączasz New / Final Stretch / Migrated, na komputerze widzisz trzy kolumny obok siebie.'],
      ['New Pairs', 'Najnowsze pary na wybranej sieci. Kyvo domyślnie odsiewa śmieci i martwe pary.'],
      ['Final Stretch', 'Coiny wciąż na krzywej (bonding curve) pump.fun (Solana) lub four.meme (BSC), które są blisko „ukończenia” krzywej. Procent krzywej to estymacja Kyvo, a nie oficjalna wartość z platformy. Na Robinhood Chain ta zakładka jest niedostępna.'],
      ['Migrated', 'Coiny, które niedawno przeszły z krzywej na DEX (Solana: PumpSwap, Raydium, Meteora…; BSC: PancakeSwap).'],
      ['Good Coins', 'Coiny, które przeszły bramki Kyvo: bezpieczeństwo, popularność teraz i potencjał wzrostu. Przy każdym coinie widać, dlaczego tu jest. Przycisk „Konsensus SM” sortuje po tym, ile znanych portfeli kupiło. To nadal nie są rekomendacje.'],
      ['Hot i Boosted', 'Hot — coiny z najnowszymi profilami i boostami na DexScreener, sortowane po wolumenie. Boosted — coiny, za których promocję ktoś zapłacił na DexScreener (boost to reklama, nie sygnał jakości).'],
      ['Filtry', 'Przycisk „Filtry” nad listą. MC min/max, płynność (Liq) min, wolumen 24h min, wiek min/max w godzinach, zmiana ceny Δ 5m i Δ 1h, „Buy ratio” (udział transakcji kupna w ostatniej godzinie, 0–1) i „Wymagaj socials”. Każda zakładka pamięta własne filtry; „Reset” przywraca domyślne.'],
      ['⏱ wiek i „na liście od”', '⏱ to wiek pary od jej utworzenia. „Na liście od X min” mówi, od kiedy ten coin jest w tej zakładce — liczone od momentu, gdy Twoja przeglądarka zobaczyła go tam pierwszy raz (więc na nowym telefonie licznik startuje od zera).'],
      ['Liq: krzywa', 'Coin jest jeszcze na bonding curve, więc nie ma klasycznej puli płynności na DEX.'],
    ]],
    ['Smart money i Ranking', [
      ['Co znaczy znaczek „🧠 3 SM”?', 'Konsensus smart money: ile publicznie przypisanych portfeli (np. znani KOL-e / traderzy, których adresy są publiczne) kupiło ten coin w ostatnich 72 h i ilu z nich już sprzedało. Dane z publicznych transakcji Solany, odświeżane kilka razy dziennie — mogą być opóźnione o kilka godzin. Kupno przez znany portfel nie oznacza, że coin wzrośnie.'],
      ['Ranking — skąd PnL?', 'Liczymy zrealizowany PnL z publicznych transakcji: każda sprzedaż jest dopasowana do wcześniejszego kupna tego samego coina (metoda FIFO), a SOL przeliczamy po historycznym kursie SOL/USD. Okresy: Dzień, Tydzień, Miesiąc. Win rate = odsetek zamkniętych pozycji z zyskiem.'],
      ['Dlaczego czasem jest „—”?', 'Brak sprzedaży z dopasowanym kupnem w tym okresie — np. trader kupił wcześniej, niż sięga nasze okno danych. Wtedy wolimy pokazać „—” niż zmyśloną liczbę. Wyniki są przybliżone.'],
    ]],
    ['Profil', [
      ['Co wkleić?', 'Tylko publiczny adres portfela (Solana: ciąg base58; BSC / Robinhood: adres 0x…). Nigdy nie wklejaj seed phrase ani klucza prywatnego — Kyvo rozpozna takie dane, odrzuci je i nic nie zapisze. Nikt z Kyvo nigdy o nie nie poprosi.'],
      ['Okna PnL: 24h · 7 dni · 30 dni · Całość', 'PnL liczony z transakcji, które udało się pobrać z publicznych źródeł bezpośrednio w Twojej przeglądarce. Limity darmowych źródeł: Solana — ok. ostatnie 24 h (historia rośnie z każdym odświeżeniem na tym urządzeniu); BSC — ok. 24 h, przycisk „Starsze BSC” dociąga do 7 dni; Robinhood Chain — ok. 150 ostatnich transferów. Dlatego 30 dni i „Całość” mogą być niepełne.'],
      ['Pozycje i Aktywność', 'Pozycje — coiny kupione w oknie danych, z niezrealizowanym PnL po aktualnej cenie z DexScreener. Aktywność — lista kupna/sprzedaży.'],
      ['Karta PnL', 'Przycisk „Udostępnij” tworzy obrazek z Twoim wynikiem (generowany na telefonie, nigdzie nie wysyłany). Możesz go zapisać albo wysłać dalej.'],
      ['Jak usunąć moje dane?', 'Profil → usuń portfel, albo Więcej → „Wyczyść dane Kyvo”. Wszystko jest tylko w Twojej przeglądarce, więc to usuwa wszystko.'],
    ]],
    ['Viral z X, wykres i narzędzia coina', [
      ['Viral z X', 'Tematy → coiny: popularne tematy z X i coiny o pasującej nazwie z realnym wolumenem. Tweety traderów: posty znanych traderów, w których pada adres coina lub jednoznaczny $ticker. Ważne posty: duże posty, które ruszają rynek. Treści z X to krótkie cytaty z linkiem do oryginału. Na górze widać godzinę ostatniej aktualizacji — dane z X odświeżamy kilka razy dziennie, nie na żywo.'],
      ['Wykres coina', 'Interwały 1s, 15s, 30s, 1m, 5m, 15m i dłuższe. Świece 1s–30s budujemy z ostatnich publicznych transakcji puli, więc obejmują tylko krótki, świeży odcinek. Wykres: TradingView Lightweight Charts™, dane: GeckoTerminal.'],
      ['Kyvo Check (wynik 0–100)', 'Na stronie coina: automatyczne sprawdzenie ryzyka. Dane rynku z DexScreener (płynność, wiek, socials, presja sprzedaży, kopie tickera), a dla Solany i BSC także publiczne skanery kontraktów RugCheck i GoPlus (mint/freeze, holderzy, zablokowana płynność, honeypot, podatki). Czerwona flaga −25 pkt, ostrzeżenie −9 pkt. To filtr, nie gwarancja — rug może się zdarzyć przy każdym wyniku.'],
      ['Dlaczego ten coin jest tu?', 'Pod wykresem: proste wyjaśnienie, na jakie listy i filtry wpadł coin, kto ze smart money go kupił (i kto już sprzedał), czy był w tweecie lub viralowym temacie. Plus słowniczek dla początkujących.'],
      ['Watchlista i alerty', 'Kliknij ☆ Obserwuj na stronie coina. W zakładce ⭐ Watchlista ustawisz alerty: MC powyżej/poniżej albo ruch ±% od dodania. Alerty sprawdzamy co 30 s tylko wtedy, gdy Kyvo jest otwarte. Powiadomienia systemowe działają, jeśli przeglądarka na to pozwala (na iPhonie tylko po dodaniu do ekranu głównego, iOS 16.4+). Przy zamkniętej apce alerty nie działają.'],
      ['Cena od tweeta', 'W Viral → Tweety traderów widzisz, ile coin zrobił od momentu tweeta: cena z 5-min (albo 1h) świecy GeckoTerminal z chwili tweeta vs cena teraz. Bez opłat i poślizgu.'],
      ['Przyciski FOMO / Axiom / Photon / GMGN', 'To zwykłe linki do zewnętrznych serwisów, z którymi Kyvo nie jest powiązane. Handel odbywa się tam, na Twoją odpowiedzialność.'],
    ]],
  ];
  function renderHelp(root, ctx) {
    root.innerHTML = `
      <div class="lg-head"><button type="button" class="back" data-back aria-label="Wstecz">‹</button><div class="h" style="margin:0">Jak korzystać z Kyvo</div></div>
      <div class="card hp-quick">
        <button type="button" class="pf-btn pf-share" id="hpTour">▶ Pokaż wprowadzenie</button>
        <a class="pf-btn" href="#legal/ryzyko">⚠️ Ryzyko</a>
        <a class="pf-btn" href="#kontakt">💬 Kontakt</a>
      </div>
      ${FAQ.map(([sec, items]) => `
        <div class="vsub" style="margin:14px 2px 6px">${esc(sec)}</div>
        <div class="card hp-list">${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`).join('')}`;
    wireBack(root, ctx);
    root.querySelector('#hpTour').onclick = openOnboard;
  }

  /* ---------------- Legal ---------------- */
  const LEGAL_PL = {
    regulamin: {
      t: 'Regulamin',
      body: [
        ['1. Czym jest Kyvo', 'Kyvo to bezpłatna aplikacja internetowa (strona WWW / PWA), która prezentuje publicznie dostępne dane rynkowe o kryptowalutach typu memecoin, publiczną aktywność portfeli blockchain oraz cytaty z publicznych postów w serwisie X. Kyvo nie jest giełdą, kantorem, brokerem, doradcą inwestycyjnym ani portfelem.'],
        ['2. Brak porady finansowej', 'Żadna treść w Kyvo (listy, filtry, znaczki „smart money”, ranking, „Good Coins”, Kyvo Check, Gold, Runner, New Tweet, Wyniki, alerty i wynik „od dodania” na watchliście, tematy z X, wykresy) nie jest poradą inwestycyjną, rekomendacją ani zachętą do kupna lub sprzedaży. Decyzje podejmujesz samodzielnie i na własne ryzyko. Zawsze rób własny research (DYOR).'],
        ['3. Ryzyko', 'Memecoiny są skrajnie ryzykowne i zmienne. Ich wartość może spaść do zera w kilka minut. Częste są oszustwa (rug pull, honeypot, fałszywe kopie tickerów). Możesz stracić wszystkie zainwestowane pieniądze. Inwestuj tylko kwoty, których utratę możesz zaakceptować.'],
        ['4. Środki i klucze', 'Kyvo nigdy nie przechowuje, nie przyjmuje ani nie przesyła Twoich środków. Kyvo nigdy nie poprosi o seed phrase (frazę odzyskiwania) ani klucz prywatny. Jeśli ktoś podszywa się pod Kyvo i o nie prosi — to oszustwo.'],
        ['5. Dane i ich dokładność', 'Dane pochodzą z zewnętrznych, publicznych źródeł (lista w „Źródła danych”). Mogą być opóźnione, niepełne lub błędne. Część wartości to estymacje (np. procent bonding curve, PnL z ograniczonego okna transakcji, wynik Kyvo Check) i są tak oznaczone. Nie gwarantujemy dostępności ani poprawności danych.'],
        ['6. Linki zewnętrzne', 'Kyvo zawiera linki do zewnętrznych serwisów (np. DexScreener, X, eksploratory blockchain, terminale handlowe). Kyvo nie jest z nimi powiązane, nie odpowiada za ich treści ani działanie, a korzystanie z nich podlega ich regulaminom. Nazwy i znaki towarowe należą do ich właścicieli.'],
        ['7. Treści z X', 'Pokazujemy krótkie cytaty publicznych postów wraz z autorem i linkiem do oryginału, w celu informacyjnym. Prawa do treści należą do ich autorów. Jeśli jesteś autorem i chcesz usunięcia cytatu, skontaktuj się z nami — usuniemy go.'],
        ['7a. Logowanie', 'Logowanie jest dobrowolne — bez niego masz pełny dostęp. Logowanie portfelem polega wyłącznie na podpisaniu wiadomości tekstowej; to nie jest transakcja i nic nie kosztuje. Kyvo nigdy nie poprosi o podpisanie transakcji, seed phrase ani klucz prywatny. Sesja jest zapisana tylko w Twojej przeglądarce. Logowanie przez Google (gdy zostanie włączone) działa przez Supabase Auth (UE) i Google. Na telefonie logowanie aplikacją Phantom może na chwilę przełączyć Cię do Safari. Wylogujesz się w Profilu.'],
        ['7b. Kyvo Premium', 'Kyvo Premium jest w przygotowaniu i obecnie nie jest sprzedawane — nie pobieramy żadnych płatności. Ceny i funkcje pokazane na stronie Premium mają charakter zapowiedzi i mogą się zmienić. Premium będzie wymagało zalogowania.'],
        ['7c. Warunki subskrypcji (po uruchomieniu płatności)', 'Premium będzie subskrypcją miesięczną w dwóch planach: Premium — cena regularna $9.99 / mies., cena startowa dla pierwszych użytkowników $4.99 / mies. (-50%); 🏃 Runners — cena regularna $49.99 / mies., cena startowa $24.99 / mies. (-50%). Na start 3 dni za darmo — okres próbny wymaga podania metody płatności (karta, Apple Pay lub Google Pay; BLIK nie jest dostępny dla płatności cyklicznych). Jeśli nie anulujesz przed końcem okresu próbnego, subskrypcja zamieni się w płatną i będzie się automatycznie odnawiać co miesiąc. Anulować możesz w każdej chwili — Premium działa wtedy do końca opłaconego okresu. Płatności obsłuży zewnętrzny operator (Stripe); Kyvo nie widzi danych Twojej karty. Szczegóły, w tym prawo odstąpienia od umowy, podamy przed uruchomieniem płatności.'],
        ['8. Zasady korzystania', 'Nie wolno używać Kyvo do działań niezgodnych z prawem, do manipulacji rynkiem, oszustw ani do przeciążania usług, z których Kyvo korzysta. Kyvo jest przeznaczone dla osób pełnoletnich (18+).'],
        ['9. Odpowiedzialność', 'W najszerszym zakresie dopuszczalnym przez prawo twórca Kyvo nie odpowiada za straty finansowe wynikające z decyzji podjętych na podstawie treści w aplikacji ani za przerwy w działaniu lub błędy danych. Nie wyłącza to praw, których nie można wyłączyć na mocy przepisów, w tym praw konsumenta.'],
        ['10. Zmiany', 'Regulamin może się zmieniać wraz z rozwojem aplikacji. Aktualna wersja jest zawsze dostępna w Kyvo (Więcej → Regulamin).'],
        ['11. Kontakt', 'Pytania, zgłoszenia i prośby o usunięcie treści: Więcej → Kontakt.'],
      ],
    },
    prywatnosc: {
      t: 'Polityka prywatności',
      body: [
        ['W skrócie', 'Logowanie jest opcjonalne. Bez logowania Kyvo nie zbiera żadnych danych osobowych. Kyvo nie używa cookies reklamowych, analityki, pikseli ani trackingu (jedyny wyjątek: anonimowy licznik odwiedzin — opis niżej) i nie ma własnego serwera z bazą użytkowników. Logowanie portfelem zostaje na Twoim urządzeniu; logowanie Google (gdy zostanie włączone) obsługuje Supabase Auth (serwery w UE) razem z Google.'],
        ['Co zapisuje się na Twoim urządzeniu', 'W pamięci przeglądarki (localStorage i pamięć podręczna aplikacji) zapisujemy tylko: wybraną sieć i filtry, ostatnie dane coinów (żeby apka szybciej startowała), informację „od kiedy coin jest na liście”, wybrane zakładki, publiczne adresy portfeli dodane w Profilu, nick i avatar (zdjęcie avatara zostaje na telefonie), pobraną historię transakcji tych adresów, wybrany język, watchlistę i alerty oraz to, że wprowadzenie zostało już pokazane. Te dane nie są nigdzie wysyłane przez Kyvo. Usuniesz je przyciskiem „Wyczyść dane Kyvo” (Więcej) albo czyszcząc dane strony w przeglądarce.'],
        ['Logowanie portfelem', 'Gdy logujesz się portfelem, Twój portfel podpisuje wiadomość tekstową. Podpis sprawdzamy na Twoim urządzeniu; sesja (publiczny adres, treść wiadomości i podpis) zostaje tylko w localStorage tej przeglądarki i nie trafia na żaden serwer Kyvo. Nie dostajemy dostępu do środków ani kluczy.'],
        ['Logowanie przez Google lub e-mail', 'GOOGLE_STATUS Gdy jest włączone, logowanie Google obsługuje Supabase Auth (Supabase, Inc.; projekt Kyvo w UE — Frankfurt) razem z Google: przetwarzane są Twój adres e-mail, imię, zdjęcie profilowe i identyfikator konta Google. Supabase przechowuje konto (e-mail, ID, daty logowania, techniczne logi z adresem IP), a w Twojej przeglądarce zostaje dane sesji. Używamy ich tylko do logowania (i w przyszłości do obsługi Premium); podstawa: art. 6 ust. 1 lit. b RODO. Wylogujesz się przyciskiem „Wyloguj”; żeby usunąć konto Google w Kyvo, napisz do nas — usuniemy je w ciągu 30 dni. Logowanie e-mailem jest na razie wyłączone.'],
        ['Płatności (w przyszłości)', 'Kyvo Premium nie jest jeszcze sprzedawane. Po uruchomieniu płatności obsłuży je Stripe — dane karty trafią bezpośrednio do Stripe, a Kyvo zobaczy tylko status subskrypcji.'],
        ['Nie sprzedajemy danych', 'Nie sprzedajemy, nie udostępniamy i nie wykorzystujemy Twoich danych do reklam.'],
        ['Zapytania do zewnętrznych API', 'Żeby pokazać dane na żywo, Twoja przeglądarka łączy się bezpośrednio z publicznymi usługami: DexScreener, GeckoTerminal, RugCheck i GoPlus (tylko adres oglądanego coina), OneSignal (tylko gdy włączysz powiadomienia systemowe), publiczne węzły RPC Solany (publicnode), BSC (bloXroute, 48 Club, BNB Chain) i Robinhood Chain, Blockscout (Robinhood Chain) oraz Binance (publiczne kursy). Gdy logowanie Google jest włączone — także z Supabase (projekt Kyvo, UE) i serwerami Google. Obrazki coinów ładują się z serwerów tych usług. Jak przy każdym połączeniu w internecie, te serwisy widzą Twój adres IP i dane przeglądarki, a gdy sprawdzasz portfel w Profilu — także ten publiczny adres. Działają według własnych polityk prywatności. Licznik odwiedzin: raz na przeglądarkę strona wysyła jedno zapytanie do publicznego licznika Abacus (abacus.jasoncameron.dev), które zwiększa jedną wspólną liczbę; później tylko ją odczytuje. Nie wysyłamy żadnego identyfikatora, cookies ani adresu portfela (serwer licznika widzi adres IP, jak każda usługa).'],
        ['Powiadomienia', 'Powiadomienia w apce (gdy Kyvo jest otwarte) tworzy lokalnie Twoja przeglądarka. Powiadomienia systemowe (gdy Kyvo jest zamknięte) są opcjonalne i włączają się dopiero, gdy klikniesz „Włącz powiadomienia systemowe” i zaakceptujesz prośbę przeglądarki. Wysyła je OneSignal (OneSignal, Inc., USA): przechowuje anonimowy identyfikator subskrypcji push Twojej przeglądarki, typ urządzenia/przeglądarki, język, strefę czasową i znacznik planu (free/Premium), żeby wysłać alert. Nie przekazujemy OneSignal imienia, e-maila ani adresów portfeli. Wyłączysz to w ustawieniach powiadomień Kyvo lub w ustawieniach przeglądarki/telefonu — wtedy subskrypcja jest usuwana.'],
        ['Hosting', 'Strona jest hostowana na GitHub Pages (GitHub, Inc.). GitHub może przetwarzać adres IP odwiedzających w logach serwera w celach bezpieczeństwa, zgodnie ze swoją polityką prywatności. Kyvo nie ma dostępu do tych logów.'],
        ['Kontakt przez Discord', 'Jeśli napiszesz do nas na Discordzie, rozmowa odbywa się w serwisie Discord według jego zasad. Kyvo nie ma formularzy kontaktowych ani newslettera.'],
        ['Treści z X', 'Posty z X pokazujemy jako cytaty z linkiem do oryginału. Kliknięcie linku otwiera serwis X, który działa według własnej polityki prywatności.'],
        ['Adresy portfeli', 'Adres portfela jest publiczny z natury blockchaina. Kyvo używa go tylko w Twojej przeglądarce do pobrania publicznych transakcji. Nigdy nie wklejaj seed phrase ani klucza prywatnego — Kyvo ich nie przyjmuje.'],
        ['Twoje prawa', 'Ponieważ nie zbieramy ani nie przechowujemy Twoich danych osobowych na naszych serwerach, wszystkie dane masz pod kontrolą na swoim urządzeniu. W sprawach prywatności możesz się z nami skontaktować; masz też prawo złożyć skargę do Prezesa UODO.'],
      ],
    },
    zrodla: {
      t: 'Źródła danych i licencje',
      body: [
        ['Dane rynkowe', 'DexScreener (publiczne API: pary, ceny, MC, płynność, wolumen, profile i boosty) · GeckoTerminal (publiczne API: nowe pule, świece OHLCV, transakcje — zapasowe źródło i wykresy).'],
        ['Blockchain', 'Solana: publiczne RPC (publicnode; do rankingu także api.mainnet-beta.solana.com) · BSC: publiczne RPC bloXroute, 48 Club i BNB Chain · Robinhood Chain: publiczne RPC oraz eksplorator Blockscout. Kursy SOL/BNB/ETH: publiczne notowania Binance.'],
        ['X (Twitter)', 'Publiczne posty pokazywane jako krótkie cytaty z autorem i linkiem do oryginału. Dane z X odświeżane kilka razy dziennie (godzina aktualizacji widoczna w zakładce Viral).'],
        ['Smart money i Ranking', 'Portfele publicznie przypisane do znanych traderów / KOL-i (publiczne źródła). PnL liczony przez Kyvo z publicznych transakcji metodą FIFO.'],
        ['Bezpieczeństwo coinów (Kyvo Check)', 'RugCheck (publiczne API raportów tokenów Solany, rugcheck.xyz) i GoPlus Security (publiczne API bezpieczeństwa tokenów, gopluslabs.io) — wysyłamy tylko adres kontraktu coina, który oglądasz. Wynik Kyvo Check liczy Kyvo; to nie jest ocena tych serwisów.'],
        ['Wykresy', 'TradingView Lightweight Charts™ — © TradingView, Inc., licencja Apache License 2.0 (kopia licencji: vendor/lightweight-charts/LICENSE). Logo atrybucji TradingView jest widoczne na wykresie.'],
        ['Znaki towarowe', 'Solana, BNB Chain/BSC, Robinhood, X, DexScreener, GeckoTerminal, pump.fun, four.meme, PancakeSwap, FOMO, Axiom, Photon, GMGN, RugCheck, GoPlus i inne nazwy należą do ich właścicieli. Kyvo nie jest z nimi powiązane ani przez nie wspierane.'],
        ['Kyvo', 'Wygląd, logo (duszek Kyvo) i kod aplikacji są oryginalne.'],
      ],
    },
    ryzyko: {
      t: 'Ryzyko — przeczytaj',
      body: [
        ['To nie jest porada finansowa', 'Kyvo pokazuje dane. Nie mówi, co kupić. Znaczek smart money, miejsce w rankingu, wynik Kyvo Check czy viralowy temat nie oznaczają, że coin wzrośnie.'],
        ['Możesz stracić wszystko', 'Większość memecoinów traci prawie całą wartość. Ceny potrafią spaść o 90% w kilka minut. Wchodź tylko za kwoty, których utratę akceptujesz.'],
        ['Uważaj na oszustwa', 'Sprawdzaj adres kontraktu (CA), nie tylko ticker — kopie są bardzo częste. Uważaj na coiny z małą płynnością, nowe konta „insiderów” i obietnice pewnego zysku.'],
        ['Twoje klucze, Twoje środki', 'Nigdy nikomu nie podawaj seed phrase ani klucza prywatnego — ani Kyvo, ani „supportowi”, ani na stronach, do których prowadzą linki. Kyvo nigdy o nie nie prosi.'],
        ['DYOR', 'Do Your Own Research — sprawdź projekt, holderów, płynność i źródło informacji, zanim cokolwiek zrobisz.'],
      ],
    },
  };
  function legalLinks() {
    return `<a href="#help">Jak korzystać</a><a href="#legal/regulamin">Regulamin</a><a href="#legal/prywatnosc">Prywatność</a><a href="#legal/zrodla">Źródła danych</a><a href="#legal/ryzyko">Ryzyko</a><a href="#premium">Premium</a><a href="#kontakt">Kontakt</a>`;
  }
  function renderLegal(root, which, ctx) {
    const L = LEGAL[which] || LEGAL.regulamin;
    const gOn = window.KyvoAuth && window.KyvoAuth.googleReady && window.KyvoAuth.googleReady();
    const eOn = window.KyvoAuth && window.KyvoAuth.emailReady && window.KyvoAuth.emailReady();
    const fix = (t) => t.replace('GOOGLE_STATUS ', EN ? (gOn || eOn ? 'Enabled. ' : 'Currently disabled (coming soon). ') : (gOn || eOn ? 'Włączone. ' : 'Obecnie wyłączone (wkrótce). '));
    root.innerHTML = `
      <div class="lg-head"><button type="button" class="back" data-back aria-label="Wstecz">‹</button><div class="h" style="margin:0">${esc(L.t)}</div></div>
      <div class="mut" style="font-size:11.5px;margin:2px 2px 10px">Obowiązuje od ${UPDATED}</div>
      <div class="card lg-body">${L.body.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(fix(p))}</p>`).join('')}</div>`;
    wireBack(root, ctx);
  }
  function wireBack(root, ctx) {
    const b = root.querySelector('[data-back]');
    if (b) b.onclick = () => (history.length > 1 ? history.back() : ctx && ctx.home ? ctx.home() : (location.hash = 'pulse'));
  }
  /* ---------------- Premium ---------------- */
  const PREMIUM_ROWS_PL = [ // v8.14.1: [feature, Free, Premium, 🏃 Runners]
    ['Pulse na żywo (Solana · BSC · Robinhood)', 'free', 'free', 'free'],
    ['Good Coins, Final Stretch, Migrated + filtry', 'free', 'free', 'free'],
    ['Viral z X (aktualizacja kilka razy dziennie)', 'free', 'free', 'free'],
    ['Ranking traderów i profile', 'free', 'free', 'free'],
    ['Profil: do 8 portfeli + karta PnL', 'free', 'free', 'free'],
    ['Kyvo Check, watchlista + alerty (gdy apka otwarta)', 'free', 'free', 'free'],
    ['🏃 Runnery (👑 KOL coin, 🚀 Moon run, 📈 Duży runner, 🐦 Tweet runner)', '1 / dzień', '3 / dzień', 'all'],
    ['🔔 Push o Runnerach i Tweet runnerach', '1 / dzień', '3 / dzień', 'all'],
    ['🥇 Gold: Sprawdź coin (DD jak u pro tradera)', '3 / dzień', 'bez limitu', 'bez limitu'],
    ['🥇 Feed Gold + alerty Gold (cena ±15–20%, wampiry, artykuły)', '1 karta / dzień', 'all', 'all'],
    ['👀 Tracker: obserwowane portfele', '3', 'bez limitu', 'bez limitu'],
    ['👀 Push smart money (≥3 top traderów kupuje 1 coin)', '—', '—', 'all'],
    ['🔔 Powiadomienia (Good Coins, Viral, Gold)', '2 / dzień', 'bez limitu', 'bez limitu'],
    ['📓 Journal: dziennik z portfela, Kyvo Score, analityka, coach', '—', 'free', 'free'],
    ['📋 Plan dnia, cele, refleksje, karta P&L', '—', 'free', 'free'],
    ['Do 25 portfeli w Profilu', '—', 'soon', 'soon'],
    ['Dłuższa historia PnL (90 dni)', '—', 'soon', 'soon'],
    ['Własne zapisane filtry i presety Pulse', '—', 'soon', 'soon'],
    ['Viral z X częściej + wcześniejszy dostęp', '—', 'soon', 'soon'],
  ];
  /* ---------------- English content (translation; for legal pages the Polish version prevails) ---------------- */
  const EN = !!(window.KyvoI18n && window.KyvoI18n.isEn());
  const CARDS_EN = [
    {
      art: hero('en', 'See the move before the crowd does.'),
      t: 'Welcome to Kyvo',
      p: 'Smart money and viral memecoins in one place. Live data from Solana, BSC and Robinhood Chain.',
      li: ['Free, sign-in optional', 'Kyvo never holds your money', 'We never ask for your seed phrase or private key'],
      lang: true,
    },
    {
      art: kynArt('en'),
      t: 'Kyvo in numbers',
      p: 'Real numbers from Kyvo’s public log — computed every time you open the app, never rounded up.',
      li: [],
    },
    {
      art: art2('en'),
      t: 'Pulse: live coins',
      p: 'Pulse shows new pairs, coins close to finishing their bonding curve (Final Stretch) and coins that just moved to a DEX (Migrated). Good Coins are coins that pass stricter filters.',
      li: ['Switch network at the top: Solana · BSC · Robin · All', '“Filters” — set MC, liquidity, volume, age', '⏱ coin age and “on list for” on every row'],
    },
    {
      art: '<div class="ob-art"><span>𝕏 Topics → coins</span><span>Trader tweets</span><span>Key posts</span></div>',
      t: 'Viral from X',
      p: 'Popular topics on X and the coins that match them. When a trader tweets about a coin, you get a link to its Kyvo page right away.',
      li: ['Quotes with a link to the original on X', 'Coins matched by address or an unambiguous $ticker', 'The same ticker can have copies — check the address'],
    },
    {
      art: art4('en'),
      t: 'Leaderboard and your Profile',
      p: 'A trader leaderboard built from public on-chain transactions: PnL, win rate, recent trades. In Profile you paste a public wallet address and see your PnL, positions and a shareable card.',
      li: ['Public addresses only (Solana, BSC, Robinhood)', 'Your data stays in your browser', 'Up to 8 wallets at once'],
    },
    {
      art: coachArt('en'),
      t: 'Kyvo Coach in the Journal',
      p: 'Ask about your trades: are you tilt trading, which setup pays you the most, how your psychology looks this week. Answers are computed from your own journal — rule-based, no paid AI.',
      li: ['Journal and Coach — in Premium', 'A public wallet address is enough, never a key', 'Tips, not financial advice'],
    },
    {
      art: '<div class="ob-art ob-ios"><span>Safari</span><span>⬆︎ Share</span><span>➕ Add to Home Screen</span></div>',
      t: 'Add Kyvo to your screen',
      p: 'iPhone: open Kyvo in Safari → Share ⬆︎ → “Add to Home Screen”. Android/Chrome: menu ⋮ → “Add to Home screen”.',
      li: ['Not financial advice — DYOR', 'Memecoins are very risky, you can lose everything'],
      last: true,
    },
  ];
  const FAQ_EN = [
    ['Getting started', [
      ['What is Kyvo?', 'A free web app (PWA) that brings public memecoin data together in one place: new pairs, coins before migration, coins after migration, moves of publicly known wallets (smart money), a trader leaderboard and popular topics from X. Kyvo doesn\'t trade anything, doesn\'t hold funds and never sends transactions from your wallet (wallet sign-in is only a message signature).'],
      ['Do I need an account?', 'No. Signing in is optional — you have full access without it. Settings (network, filters, your public addresses, nickname, avatar) are saved only in this browser\'s storage (localStorage).'],
      ['How do I add Kyvo to my phone\'s home screen?', 'iPhone: open the site in Safari → Share ⬆︎ → “Add to Home Screen”. Android/Chrome: menu ⋮ → “Add to Home screen”. After a Kyvo update, close the app completely and open it again to load the new version.'],
      ['Networks: Solana · BSC · Robin · All', 'The switch under the search bar picks the network for all lists. “Robin” is Robinhood Chain. “All” combines the three networks — every coin shows a SOL / BSC / RH badge.'],
      ['Language', 'Kyvo is available in Polish and English. Switch with the PL / EN buttons in More (or on the first intro card, or in the header on desktop). Your choice is remembered in this browser.'],
    ]],
    ['Sign-in, Premium and contact', [
      ['Do I have to sign in?', 'No. “Continue without signing in” gives full access to everything. Signing in saves your wallet in Profile and prepares your account for the future Kyvo Premium.'],
      ['How does wallet sign-in work?', 'Choose Phantom / Solflare (Solana) or MetaMask or another EVM wallet (BSC, Robinhood Chain). The wallet shows the message “Sign in to Kyvo. This is not a transaction and costs nothing.” — you only sign that. It isn\'t a transaction, there are no fees and Kyvo gets no access to your funds. We verify the signature on your device and the session stays in this browser. On iPhone, Kyvo opens in the wallet app\'s browser.'],
      ['What if my wallet asks me to approve a transaction?', 'Reject it. Kyvo never sends a transaction to sign — only a text message. Nobody from Kyvo will ever ask for your seed phrase or private key either.'],
      ['Google, email and Apple', 'Google and email sign-in (a sign-in link sent to your email — no password) are coming soon; Apple later. Until then the buttons are marked “Coming soon”.'],
      ['How do I sign out?', 'Profile → “Sign out”. The address stays in Profile and you can remove it separately. More → “Clear Kyvo data” removes everything from this browser.'],
      ['Kyvo Premium', 'The Premium plans are in preparation — features marked “coming soon” don\'t work yet and nothing is being sold. Two plans are planned: Premium — $9.99 / month (launch price -50%: $4.99 / month) and 🏃 Runners — $49.99 / month (launch price -50%: $24.99 / month). Both come with 3 days free (with a card, Apple Pay or Google Pay attached; BLIK doesn\'t work for subscriptions) and require signing in. Runners: free 1 a day (the first one flagged that day), Premium 3 a day, Runners plan — all of them + Runner push and smart money push. Premium also gives the full Gold tab, unlimited Tracker and all notifications. Everything else that works today stays free.'],
      ['Contact', 'Want to chat, help out or collaborate? More → Contact (Discord).'],
    ]],
    ['Coin tabs', [
      ['Pulse', 'The main screen. On a phone you switch between New / Final Stretch / Migrated; on a computer you see three columns side by side.'],
      ['New Pairs', 'The newest pairs on the selected network. By default Kyvo filters out junk and dead pairs.'],
      ['Final Stretch', 'Coins still on the pump.fun (Solana) or four.meme (BSC) bonding curve that are close to “completing” it. The curve percentage is Kyvo\'s estimate, not an official platform value. This tab isn\'t available on Robinhood Chain.'],
      ['Migrated', 'Coins that recently moved from the curve to a DEX (Solana: PumpSwap, Raydium, Meteora…; BSC: PancakeSwap).'],
      ['Good Coins', 'Coins that passed Kyvo\'s gates: safety, popular right now and upside potential. Each coin shows why it is listed. The “Smart money consensus” button sorts by how many known wallets bought. These are still not recommendations.'],
      ['Hot and Boosted', 'Hot — coins with the newest DexScreener profiles and boosts, sorted by volume. Boosted — coins someone paid to promote on DexScreener (a boost is advertising, not a quality signal).'],
      ['Filters', 'The “Filters” button above the list. MC min/max, liquidity (Liq) min, 24h volume min, age min/max in hours, price change Δ 5m and Δ 1h, “Buy ratio” (share of buy trades in the last hour, 0–1) and “Require socials”. Every tab remembers its own filters; “Reset” restores the defaults.'],
      ['⏱ age and “on list for”', '⏱ is the pair\'s age since creation. “On list for X min” tells you how long this coin has been in this tab — counted from when your browser first saw it there (so on a new phone the counter starts from zero).'],
      ['Liq: curve', 'The coin is still on the bonding curve, so there is no classic DEX liquidity pool yet.'],
    ]],
    ['Smart money and Leaderboard', [
      ['What does the “🧠 3 SM” badge mean?', 'Smart money consensus: how many publicly attributed wallets (e.g. well-known KOLs / traders whose addresses are public) bought this coin in the last 72 h, and how many of them already sold. Data from public Solana transactions, refreshed a few times a day — it can be a few hours behind. A buy by a known wallet doesn\'t mean the coin will go up.'],
      ['Leaderboard — where does PnL come from?', 'We calculate realized PnL from public transactions: every sell is matched to an earlier buy of the same coin (FIFO), and SOL is converted at the historical SOL/USD rate. Periods: Day, Week, Month. Win rate = share of closed positions in profit.'],
      ['Why is there sometimes a “—”?', 'No sell matched to a buy in that period — e.g. the trader bought before our data window starts. We prefer showing “—” to making up a number. Results are approximate.'],
    ]],
    ['Profile', [
      ['What should I paste?', 'Only a public wallet address (Solana: a base58 string; BSC / Robinhood: a 0x… address). Never paste a seed phrase or private key — Kyvo recognizes such data, rejects it and saves nothing. Nobody from Kyvo will ever ask for them.'],
      ['PnL windows: 24h · 7 days · 30 days · All time', 'PnL is calculated from transactions that could be fetched from public sources directly in your browser. Free source limits: Solana — about the last 24 h (history grows with every refresh on this device); BSC — about 24 h, the “Older BSC” button loads up to 7 days; Robinhood Chain — about the last 150 transfers. That\'s why 30 days and “All time” may be incomplete.'],
      ['Positions and Activity', 'Positions — coins bought within the data window, with unrealized PnL at the current DexScreener price. Activity — a list of buys/sells.'],
      ['PnL card', 'The “Share” button creates an image with your result (generated on your phone, never uploaded). You can save it or send it on.'],
      ['How do I delete my data?', 'Profile → remove the wallet, or More → “Clear Kyvo data”. Everything lives only in your browser, so this deletes everything.'],
    ]],
    ['Viral from X, chart and coin tools', [
      ['Viral from X', 'Topics → coins: popular topics on X and coins with a matching name and real volume. Trader tweets: posts by known traders that include a coin address or an unambiguous $ticker. Key posts: big posts that move the market. X content is shown as short quotes with a link to the original. The time of the last update is shown at the top — X data is refreshed a few times a day, not live.'],
      ['Coin chart', 'Intervals 1s, 15s, 30s, 1m, 5m, 15m and longer. 1s–30s candles are built from the pool\'s latest public trades, so they only cover a short, recent stretch. Chart: TradingView Lightweight Charts™, data: GeckoTerminal.'],
      ['Kyvo Check (score 0–100)', 'On the coin page: an automatic risk check. Market data from DexScreener (liquidity, age, socials, sell pressure, ticker copies), and for Solana and BSC also the public contract scanners RugCheck and GoPlus (mint/freeze, holders, locked liquidity, honeypot, taxes). Red flag −25 pts, warning −9 pts. It\'s a filter, not a guarantee — a rug can happen at any score.'],
      ['Why is this coin here?', 'Below the chart: a simple explanation of which lists and filters the coin matched, which smart money wallets bought it (and who already sold), and whether it appeared in a tweet or a viral topic. Plus a beginner\'s glossary.'],
      ['Watchlist and alerts', 'Tap ☆ Watch on a coin page. In the ⭐ Watchlist tab you can set alerts: MC above/below or a ±% move since added. Alerts are checked every 30 s only while Kyvo is open. System notifications work if your browser allows them (on iPhone only after adding Kyvo to the Home Screen, iOS 16.4+). When the app is closed, alerts don\'t run.'],
      ['Price since tweet', 'In Viral → Trader tweets you can see how the coin has moved since the tweet: price from the GeckoTerminal 5-min (or 1h) candle at tweet time vs the price now. Excludes fees and slippage.'],
      ['FOMO / Axiom / Photon / GMGN buttons', 'These are plain links to external services that Kyvo isn\'t affiliated with. Trading happens there, at your own risk.'],
    ]],
  ];
  const PL_PREVAILS = ['Translation', 'This English text is a translation for convenience. If anything differs, the Polish version prevails.'];
  const LEGAL_EN = {
    regulamin: {
      t: 'Terms of use',
      body: [
        PL_PREVAILS,
        ['1. What Kyvo is', 'Kyvo is a free web application (website / PWA) that presents publicly available market data about memecoin-type cryptocurrencies, public blockchain wallet activity and quotes from public posts on X. Kyvo is not an exchange, currency exchange office, broker, investment adviser or wallet.'],
        ['2. No financial advice', 'No content in Kyvo (lists, filters, “smart money” badges, leaderboard, “Good Coins”, Kyvo Check, Gold, Runner, New Tweet, Results, watchlist alerts and “since added” results, topics from X, charts) is investment advice, a recommendation or an encouragement to buy or sell. You make your own decisions at your own risk. Always do your own research (DYOR).'],
        ['3. Risk', 'Memecoins are extremely risky and volatile. Their value can drop to zero within minutes. Scams (rug pulls, honeypots, fake ticker copies) are common. You can lose all the money you invest. Only invest amounts you can accept losing.'],
        ['4. Funds and keys', 'Kyvo never stores, accepts or transfers your funds. Kyvo will never ask for your seed phrase (recovery phrase) or private key. If someone impersonates Kyvo and asks for them — it\'s a scam.'],
        ['5. Data and its accuracy', 'Data comes from external, public sources (listed in “Data sources”). It may be delayed, incomplete or wrong. Some values are estimates (e.g. bonding curve percentage, PnL from a limited transaction window, Kyvo Check score) and are marked as such. We don\'t guarantee data availability or correctness.'],
        ['6. External links', 'Kyvo contains links to external services (e.g. DexScreener, X, blockchain explorers, trading terminals). Kyvo isn\'t affiliated with them, isn\'t responsible for their content or operation, and their use is subject to their own terms. Names and trademarks belong to their owners.'],
        ['7. Content from X', 'We show short quotes of public posts with the author and a link to the original, for information purposes. Rights to the content belong to its authors. If you are the author and want a quote removed, contact us — we\'ll remove it.'],
        ['7a. Sign-in', 'Signing in is voluntary — you have full access without it. Wallet sign-in consists only of signing a text message; it isn\'t a transaction and costs nothing. Kyvo will never ask you to sign a transaction or for a seed phrase or private key. The session is stored only in your browser. Google sign-in (once enabled) works through Supabase Auth (EU) and Google. On a phone, signing in with the Phantom app may briefly switch you to Safari. You can sign out in Profile.'],
        ['7b. Kyvo Premium', 'Kyvo Premium is in preparation and is not currently being sold — we don\'t take any payments. Prices and features shown on the Premium page are an announcement and may change. Premium will require signing in.'],
        ['7c. Subscription terms (once payments launch)', 'Premium will be a monthly subscription in two plans: Premium — regular price $9.99 / month, launch price for early users $4.99 / month (-50%); 🏃 Runners — regular price $49.99 / month, launch price $24.99 / month (-50%). 3 days free to start — the trial requires a payment method (card, Apple Pay or Google Pay; BLIK isn\'t available for recurring payments). If you don\'t cancel before the trial ends, the subscription becomes paid and renews automatically every month. You can cancel at any time — Premium then works until the end of the paid period. Payments will be handled by an external operator (Stripe); Kyvo doesn\'t see your card details. Details, including the right of withdrawal, will be provided before payments launch.'],
        ['8. Rules of use', 'You may not use Kyvo for unlawful activity, market manipulation, fraud or to overload the services Kyvo relies on. Kyvo is intended for adults (18+).'],
        ['9. Liability', 'To the fullest extent permitted by law, the creator of Kyvo is not liable for financial losses resulting from decisions made based on content in the app, or for interruptions or data errors. This does not exclude rights that cannot be excluded by law, including consumer rights.'],
        ['10. Changes', 'These terms may change as the app develops. The current version is always available in Kyvo (More → Terms).'],
        ['11. Contact', 'Questions, reports and removal requests: More → Contact.'],
      ],
    },
    prywatnosc: {
      t: 'Privacy policy',
      body: [
        PL_PREVAILS,
        ['In short', 'Signing in is optional. Without signing in, Kyvo collects no personal data. Kyvo uses no advertising cookies, analytics, pixels or tracking (one exception: an anonymous visit counter — see below) and has no server of its own with a user database. Wallet sign-in stays on your device; Google sign-in (once enabled) is handled by Supabase Auth (EU servers) together with Google.'],
        ['What is stored on your device', 'In browser storage (localStorage and the app cache) we only store: the selected network and filters, recent coin data (so the app starts faster), “how long a coin has been on the list”, selected tabs, your language, the public wallet addresses added in Profile, your nickname and avatar (the avatar photo stays on your phone), the fetched transaction history of those addresses, your watchlist and alerts, and the fact that the intro was already shown. Kyvo doesn\'t send this data anywhere. Delete it with “Clear Kyvo data” (More) or by clearing site data in your browser.'],
        ['Wallet sign-in', 'When you sign in with a wallet, your wallet signs a text message. We verify the signature on your device; the session (public address, message text and signature) stays only in this browser\'s localStorage and never reaches any Kyvo server. We get no access to funds or keys.'],
        ['Sign-in with Google or email', 'GOOGLE_STATUS When enabled, Google sign-in is handled by Supabase Auth (Supabase, Inc.; the Kyvo project is in the EU — Frankfurt) together with Google: your email address, name, profile photo and Google account ID are processed. Supabase stores the account (email, ID, sign-in dates, technical logs with your IP address) and session data stays in your browser. We use it only for signing in (and in the future for Premium); legal basis: Art. 6(1)(b) GDPR. Sign out with “Sign out”; to delete your Kyvo Google account, write to us — we delete it within 30 days. Email sign-in is disabled for now.'],
        ['Payments (in the future)', 'Kyvo Premium isn\'t sold yet. Once payments launch, Stripe will handle them — card details go directly to Stripe and Kyvo only sees the subscription status.'],
        ['We don\'t sell data', 'We don\'t sell, share or use your data for advertising.'],
        ['Requests to external APIs', 'To show live data, your browser connects directly to public services: DexScreener, GeckoTerminal, RugCheck and GoPlus (only the address of the coin you\'re viewing), OneSignal (only if you enable system notifications), public RPC nodes for Solana (publicnode), BSC (bloXroute, 48 Club, BNB Chain) and Robinhood Chain, Blockscout (Robinhood Chain) and Binance (public prices). When Google sign-in is enabled — also Supabase (Kyvo project, EU) and Google servers. Coin images load from those services\' servers. As with any internet connection, these services see your IP address and browser data, and when you check a wallet in Profile — also that public address. They operate under their own privacy policies. Visit counter: once per browser the site sends one request to the public Abacus counter (abacus.jasoncameron.dev), which adds 1 to a single shared number; after that it only reads it. No identifier, cookie or wallet address is sent (the counter\'s server sees your IP address, like any service).'],
        ['Notifications', 'In-app notifications (while Kyvo is open) are created locally by your browser. System notifications (while Kyvo is closed) are optional and only turn on when you tap “Enable system notifications” and accept the browser prompt. They are sent by OneSignal (OneSignal, Inc., USA), which stores an anonymous push-subscription ID for your browser, device/browser type, language, time zone and a plan tag (free/Premium) in order to deliver alerts. We don\'t give OneSignal your name, email or wallet addresses. Turn it off in Kyvo notification settings or in your browser/phone settings — the subscription is then removed.'],
        ['Hosting', 'The site is hosted on GitHub Pages (GitHub, Inc.). GitHub may process visitors\' IP addresses in server logs for security purposes, in line with its privacy policy. Kyvo has no access to those logs.'],
        ['Contact via Discord', 'If you message us on Discord, the conversation takes place on Discord under its rules. Kyvo has no contact forms or newsletter.'],
        ['Content from X', 'We show posts from X as quotes with a link to the original. Clicking the link opens X, which operates under its own privacy policy.'],
        ['Wallet addresses', 'A wallet address is public by the nature of a blockchain. Kyvo uses it only in your browser to fetch public transactions. Never paste a seed phrase or private key — Kyvo doesn\'t accept them.'],
        ['Your rights', 'Because we don\'t collect or store your personal data on our servers, you control all your data on your device. You can contact us about privacy; you also have the right to lodge a complaint with the President of the Polish Personal Data Protection Office (UODO).'],
      ],
    },
    zrodla: {
      t: 'Data sources and licenses',
      body: [
        PL_PREVAILS,
        ['Market data', 'DexScreener (public API: pairs, prices, MC, liquidity, volume, profiles and boosts) · GeckoTerminal (public API: new pools, OHLCV candles, trades — backup source and charts).'],
        ['Blockchain', 'Solana: public RPC (publicnode; for the leaderboard also api.mainnet-beta.solana.com) · BSC: public RPC from bloXroute, 48 Club and BNB Chain · Robinhood Chain: public RPC and the Blockscout explorer. SOL/BNB/ETH prices: public Binance quotes.'],
        ['X (Twitter)', 'Public posts shown as short quotes with the author and a link to the original. X data is refreshed a few times a day (update time shown in the Viral tab).'],
        ['Smart money and Leaderboard', 'Wallets publicly attributed to known traders / KOLs (public sources). PnL calculated by Kyvo from public transactions using FIFO.'],
        ['Coin safety (Kyvo Check)', 'RugCheck (public Solana token report API, rugcheck.xyz) and GoPlus Security (public token security API, gopluslabs.io) — we only send the contract address of the coin you\'re viewing. The Kyvo Check score is calculated by Kyvo; it isn\'t a rating by those services.'],
        ['Charts', 'TradingView Lightweight Charts™ — © TradingView, Inc., Apache License 2.0 (license copy: vendor/lightweight-charts/LICENSE). The TradingView attribution logo is visible on the chart.'],
        ['Trademarks', 'Solana, BNB Chain/BSC, Robinhood, X, DexScreener, GeckoTerminal, pump.fun, four.meme, PancakeSwap, FOMO, Axiom, Photon, GMGN, RugCheck, GoPlus and other names belong to their owners. Kyvo isn\'t affiliated with or endorsed by them.'],
        ['Kyvo', 'The design, logo (the Kyvo ghost) and app code are original.'],
      ],
    },
    ryzyko: {
      t: 'Risk — please read',
      body: [
        PL_PREVAILS,
        ['Not financial advice', 'Kyvo shows data. It doesn\'t tell you what to buy. A smart money badge, a leaderboard spot, a Kyvo Check score or a viral topic don\'t mean a coin will go up.'],
        ['You can lose everything', 'Most memecoins lose almost all their value. Prices can drop 90% within minutes. Only put in amounts you accept losing.'],
        ['Watch out for scams', 'Check the contract address (CA), not just the ticker — copies are very common. Be careful with low-liquidity coins, new “insider” accounts and promises of guaranteed profit.'],
        ['Your keys, your funds', 'Never give anyone your seed phrase or private key — not Kyvo, not “support”, not on sites you reach through links. Kyvo never asks for them.'],
        ['DYOR', 'Do Your Own Research — check the project, holders, liquidity and the source of the information before you do anything.'],
      ],
    },
  };
  const PREMIUM_ROWS_EN = [
    ['Live Pulse (Solana · BSC · Robinhood)', 'free', 'free', 'free'],
    ['Good Coins, Final Stretch, Migrated + filters', 'free', 'free', 'free'],
    ['Viral from X (updated a few times a day)', 'free', 'free', 'free'],
    ['Trader leaderboard and profiles', 'free', 'free', 'free'],
    ['Profile: up to 8 wallets + PnL card', 'free', 'free', 'free'],
    ['Kyvo Check, watchlist + alerts (while the app is open)', 'free', 'free', 'free'],
    ['🏃 Runners (👑 KOL coin, 🚀 Moon run, 📈 Big runner, 🐦 Tweet runner)', '1 / day', '3 / day', 'all'],
    ['🔔 Runner and Tweet runner push', '1 / day', '3 / day', 'all'],
    ['🥇 Gold: Check a coin (pro-trader DD)', '3 / day', 'unlimited', 'unlimited'],
    ['🥇 Gold feed + Gold alerts (price ±15–20%, vamps, articles)', '1 card / day', 'all', 'all'],
    ['👀 Tracker: followed wallets', '3', 'unlimited', 'unlimited'],
    ['👀 Smart money push (≥3 top traders buy 1 coin)', '—', '—', 'all'],
    ['🔔 Notifications (Good Coins, Viral, Gold)', '2 / day', 'unlimited', 'unlimited'],
    ['📓 Journal: wallet journal, Kyvo Score, analytics, coach', '—', 'free', 'free'],
    ['📋 Daily plan, goals, reflections, P&L card', '—', 'free', 'free'],
    ['Up to 25 wallets in Profile', '—', 'soon', 'soon'],
    ['Longer PnL history (90 days)', '—', 'soon', 'soon'],
    ['Saved custom filters and Pulse presets', '—', 'soon', 'soon'],
    ['Viral from X more often + early access', '—', 'soon', 'soon'],
  ];
  const CARDS = EN ? CARDS_EN : CARDS_PL;
  const FAQ = EN ? FAQ_EN : FAQ_PL;
  const LEGAL = EN ? LEGAL_EN : LEGAL_PL;
  const PREMIUM_ROWS = EN ? PREMIUM_ROWS_EN : PREMIUM_ROWS_PL;
  const T = (x) => (window.KyvoI18n ? window.KyvoI18n.t(x) : x);
  function renderPremium(root, ctx) {
    const C = planCfg();
    const L = (pl, en) => (EN ? en : pl);
    const per = EN ? 'mo' : C.period;
    const live = C.premium.live || C.runners.live;
    const S = window.KyvoAuth && window.KyvoAuth.session();
    const tier = curTier();
    const owner = !!(window.KyvoPremium && window.KyvoPremium.isOwner && window.KyvoPremium.isOwner());
    const cell = (v) => (v === 'free' ? '<span class="pm-ok">✓</span>' : v === 'soon' ? `<span class="pm-soon">${L('wkrótce', 'soon')}</span>` : v === 'all' ? '<span class="pm-ok">✓ ' + L('wszystkie', 'all') + '</span>' : v === '—' ? '<span class="mut">—</span>' : '<span class="mut">' + esc(v) + '</span>');
    const tierName = tier === 'runners' ? '🏃 Runners' : tier === 'premium' ? '✦ Premium' : L('Darmowy', 'Free');
    root.innerHTML = `
      <div class="lg-head"><button type="button" class="back" data-back aria-label="${L('Wstecz', 'Back')}">‹</button><div class="h" style="margin:0">Kyvo Premium</div></div>
      <div class="pm-hero" translate="no" data-ky-par>
        <div class="pm-bg" aria-hidden="true" data-depth="-0.5">${window.KyvoArt ? KyvoArt.pic('chrome', '(min-width:700px) 420px, 80vw') : ''}</div>
        <div class="pm-art" data-depth="0.8">${window.KyvoArt ? KyvoArt.pic('arc', '(min-width:700px) 640px, 100vw', { cls: 'pm-arc' }) + KyvoArt.pic('emblem', '120px', { cls: 'pm-emb', eager: 1, alt: 'Kyvo' }) : '<img src="icons/icon-192.png" width="56" height="56" alt="">'}</div>
        <div class="pm-badge">${live ? '✦ KYVO PREMIUM' : L('✦ PREMIUM · WKRÓTCE', '✦ PREMIUM · COMING SOON')}</div>
        <h1>${L('Więcej sygnałów, mniej szumu', 'More signals, less noise')}</h1>
        <p class="pm-line">${L('Szum jest za darmo. Przewaga nie.', 'Noise is free. An edge isn’t.')}</p>
        ${C.promoActive ? `<div class="pm-promo">🔥 ${L('Cena startowa', 'Launch price')} -${esc(C.promoPct)}% · ${L('dla pierwszych użytkowników', 'for early users')}</div>` : ''}
        <div class="pm-cur">${L('Twój plan', 'Your plan')}: <b>${esc(tierName)}</b>${owner ? ` <span class="mut">(${L('właściciel', 'owner')})</span>` : ''}</div>
        <div class="pl-grid">${planCardHtml(C, C.runners, { tier })}${planCardHtml(C, C.premium, { tier })}</div>
        <div class="pm-trial">${L(`${esc(C.trialDays)} dni za darmo, potem cena z planu · anulujesz kiedy chcesz`, `${esc(C.trialDays)} days free, then the plan price · cancel anytime`)}</div>
        <div class="pm-found"><span class="pm-fb"><small>Founding</small><b>#001</b><i>–#100</i></span><div><b>${L('Founding member — pierwsza setka', 'Founding member — the first hundred')}</b><small>${L('Cena startowa na zawsze, dopóki masz aktywną subskrypcję (bez przerwy, na tym samym planie). Pierwszych 100 subskrybentów dostaje numerowaną odznakę #001–#100, która zostaje z Tobą niezależnie od planu.', 'Launch price for good, as long as your subscription stays active (no gap, same plan). The first 100 subscribers get a numbered #001–#100 badge that stays with you whatever your plan.')}${live ? '' : ' ' + L('Ruszy razem z płatnościami.', 'Starts when payments go live.')}</small></div></div>
        ${S || tier !== 'free' ? '' : `<a class="pm-login" href="#login">🔑 ${L('Zaloguj się, żeby włączyć Premium', 'Sign in to enable Premium')}</a>`}
        <div class="pm-note" id="pmNote">${live ? L('Płatność obsługuje zewnętrzny operator płatności (Stripe).', 'Payment is handled by an external payment operator (Stripe).') : L('Premium jeszcze nie ruszyło — nic nie sprzedajemy i niczego nie pobieramy.', 'Premium hasn\'t launched yet — we don\'t sell anything and don\'t charge anything.')}</div>
        <div class="pm-pay">${L(`Okres próbny wymaga podpięcia karty, Apple Pay lub Google Pay. BLIK nie jest dostępny dla subskrypcji. Bez anulowania przed końcem ${esc(C.trialDays)} dni subskrypcja odnowi się automatycznie co miesiąc.`, `The trial requires a card, Apple Pay or Google Pay. BLIK isn't available for subscriptions. Unless you cancel before the end of the ${esc(C.trialDays)}-day trial, the subscription renews automatically every month.`)}</div>
      </div>
      <div class="card pm-tbl pm-tbl3" translate="no">
        <div class="pm-row pm-h"><div>${L('Funkcja', 'Feature')}</div><div>Free</div><div class="pm-pcol">Premium<small>${esc(C.promoActive ? C.premium.promoPrice : C.premium.regularPrice)}</small></div><div class="pm-rcol">🏃 Runners<small>${esc(C.promoActive ? C.runners.promoPrice : C.runners.regularPrice)}</small></div></div>
        ${PREMIUM_ROWS.map(([f, a, b, c]) => `<div class="pm-row"><div>${esc(f)}</div><div>${cell(a)}</div><div class="pm-pcol">${cell(b)}</div><div class="pm-rcol">${cell(c)}</div></div>`).join('')}
      </div>
      <div class="mut" style="font-size:11.5px;line-height:1.5;margin:6px 2px 12px" translate="no">${L(`Ceny w USD za miesiąc. Przekreślona cena = cena regularna po okresie startowym (Premium ${esc(C.premium.regularPrice)}, Runners ${esc(C.runners.regularPrice)}). „Wkrótce” = funkcja w przygotowaniu, jeszcze nie działa. Wszystko z kolumny Free działa już dziś i zostaje za darmo. Ceny i lista funkcji mogą się zmienić przed startem. Premium to nie porada finansowa.`, `Prices in USD per month. Crossed-out price = regular price after the launch period (Premium ${esc(C.premium.regularPrice)}, Runners ${esc(C.runners.regularPrice)}). “Coming soon” = feature in preparation, doesn't work yet. Everything in the Free column works today and stays free. Prices and the feature list may change before launch. Premium is not financial advice.`)}</div>`;
    wireBack(root, ctx);
    root.querySelectorAll('[data-plango]').forEach((b) => (b.onclick = () => {
      const x = C[b.dataset.plango];
      if (!x) return;
      if (x.live && S) { window.open(x.link, '_blank', 'noopener'); return; } // only when payments are switched on (enabled:true + https Stripe link)
      if (x.live && !S) { location.hash = 'login'; return; }
      const n = root.querySelector('#pmNote');
      n.innerHTML = `<b>${L('Wkrótce — zapisz się na listę.', 'Coming soon — join the list.')}</b> ${L(`Napisz na Discordzie, że chcesz plan ${esc(x.name)}, a dam znać, gdy ruszy.`, `Message me on Discord that you want the ${esc(x.name)} plan and I'll let you know when it launches.`)}`;
      n.classList.add('on');
      b.textContent = L('Wkrótce', 'Coming soon');
      setTimeout(() => (location.hash = 'kontakt'), 1600);
    }));
  }

  /* ---------------- Kontakt ---------------- */
  function renderContact(root, ctx) {
    const C = window.KYVO_CONTACT || {};
    const h = String(C.DISCORD_HANDLE || '').trim();
    const has = h && !/^todo$/i.test(h);
    const inv = String(C.DISCORD_INVITE_URL || '').trim();
    root.innerHTML = `
      <div class="lg-head"><button type="button" class="back" data-back aria-label="Wstecz">‹</button><div class="h" style="margin:0">Kontakt</div></div>
      <div class="card ct-card">
        <div class="ct-ic">💬</div>
        <h2>Chcesz pogadać, pomóc albo współpracować?</h2>
        <p>Napisz do mnie na Discordzie.</p>
        ${has ? `<div class="ct-handle"><span class="mono">${esc(h)}</span><button type="button" class="pf-btn" id="ctCopy">Kopiuj</button></div>` : '<div class="ct-handle mut">Nick na Discordzie pojawi się tu wkrótce.</div>'}
        ${/^https:\/\/(discord\.gg|discord\.com)\//.test(inv) ? `<a class="pm-cta" style="display:block;margin-top:12px" href="${esc(inv)}" target="_blank" rel="noopener noreferrer">Dołącz do Discorda ↗</a>` : ''}
        <div class="mut" style="font-size:11.5px;margin-top:12px;line-height:1.45">Nie mamy formularzy kontaktowych ani newslettera. Nigdy nie wysyłaj nikomu seed phrase ani klucza prywatnego, także „supportowi Kyvo”.</div>
      </div>`;
    wireBack(root, ctx);
    const b = root.querySelector('#ctCopy');
    if (b) b.onclick = async () => {
      try { await navigator.clipboard.writeText(h); b.textContent = 'Skopiowano ✓'; } catch (e) { b.textContent = h; }
    };
  }

  async function clearData() {
    if (!confirm(T('Usunąć wszystkie dane Kyvo z tej przeglądarki? (portfele w Profilu, nick, filtry, cache)'))) return false;
    let keepLang = null, keepOwner = null;
    try { keepLang = localStorage.getItem('kyvo_lang'); keepOwner = localStorage.getItem('kyvo_owner_tok'); } catch (e) {}
    try { Object.keys(localStorage).filter((k) => k.startsWith('kyvo_')).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
    try { localStorage.setItem(OB_KEY, String(Date.now())); if (keepLang) localStorage.setItem('kyvo_lang', keepLang); if (keepOwner) localStorage.setItem('kyvo_owner_tok', keepOwner); /* v8.11: owner Premium survives "clear data" */ } catch (e) {}
    return true;
  }

  window.KyvoLaunch = { planCfg, maybePremiumPopup, openLangPicker, renderPremium, renderContact, openOnboard, maybeOnboard, closeOnboard, renderHelp, renderLegal, legalLinks, clearData, isIOS, standalone };
})();
