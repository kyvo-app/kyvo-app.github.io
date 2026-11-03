/* Kyvo v8.3 (v8.2 + 🏃 Runner type) — in-app + system notifications while Kyvo is open (also in a background tab).
   Types: "good" = a new coin enters Good Coins with a high Kyvo Check score; "tweets" = a new important tweet with a coin in the X snapshot.
   No server: everything runs in this browser. Background push with the app CLOSED needs a server → KyvoPush hooks (disabled by config). */
(function () {
  'use strict';
  const SKEY = 'kyvo_notif_v1', GKEY = 'kyvo_seen_good_v1', TKEY = 'kyvo_seen_tw_v1';
  const DEF = { good: true, tweets: true, runner: true, gold: true, smart: true, vip: true, gta: true, runner2: true, minScore: 75 }; // v8.28: + 👀 smart · v8.31: + 🎮 gta (default ON) · v8.34: + 🚀 runner2 (default ON)
  let D = null;
  const T = (x) => (window.KyvoI18n ? window.KyvoI18n.t(x) : x);
  const EN = () => !!(window.KyvoI18n && window.KyvoI18n.isEn());
  const L = (pl, en) => (EN() ? en : pl);
  const plN = (n, few, many) => { const d = n % 10, h = n % 100; return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = (k, d) => { try { return Object.assign(Array.isArray(d) ? [] : {}, d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let S = load(SKEY, DEF);
  const supported = () => typeof window.Notification !== 'undefined';
  const perm = () => (supported() ? Notification.permission : 'unsupported');
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  async function system(title, body, url, tag) {
    if (perm() !== 'granted') return false;
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-96.png', tag: tag || 'kyvo', data: { url, kyvo: true } };
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg && reg.showNotification) { await reg.showNotification(title, opts); return true; }
      new Notification(title, opts); return true; // eslint-disable-line no-new
    } catch (e) { return false; }
  }
  /* v8.4: free plan = max FREE_CAP notifications per local day (in-app + system); Premium = all.
     Premium flag: KyvoPremium.isActive() (entitlement backend later). Client-side only — background push
     caps are enforced by the sender (see push-config.js). */
  const FREE_CAP = 2, CAPKEY = 'kyvo_notif_cap_v1';
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function isPremium() { try { return !!(window.KyvoPremium && window.KyvoPremium.isActive()); } catch (e) { return false; } }
  function capState() { const c = load(CAPKEY, { day: '', n: 0, hinted: false }); if (c.day !== today()) { c.day = today(); c.n = 0; c.hinted = false; } return c; }
  function usedToday() { return capState().n; }
  function send(title, body, hash, tag) {
    if (!isPremium()) {
      const c = capState();
      if (c.n >= FREE_CAP) {
        if (!c.hinted && D && D.toast) D.toast('🔒 ' + L(`Limit ${FREE_CAP} powiadomień na dziś. Premium dostaje wszystkie alerty.`, `Daily limit of ${FREE_CAP} notifications reached. Premium gets all alerts.`));
        c.hinted = true; save(CAPKEY, c);
        return false;
      }
      c.n++; save(CAPKEY, c);
    }
    const url = location.href.split('#')[0] + (hash || '');
    if (D && D.toast) D.toast('🔔 ' + title + (body ? ' — ' + body : ''));
    // system notification only when the user is not looking at Kyvo (no double ping)
    if (document.hidden || !document.hasFocus()) system(title, body, url, tag);
    log.unshift({ t: Date.now(), title, body, hash });
    log.length = Math.min(log.length, 20);
    save('kyvo_notif_log_v1', log);
  }
  let log = []; try { log = JSON.parse(localStorage.getItem('kyvo_notif_log_v1') || '[]') || []; } catch (e) { log = []; }

  /* ---- 1) new coin in Good Coins with a high Kyvo Check ---- */
  let goodBusy = false;
  async function onGood(list) {
    if (!D || !S.good || goodBusy || !Array.isArray(list)) return;
    goodBusy = true;
    try {
      const st = load(GKEY, { at: 0, keys: {} });
      const now = Date.now();
      const keys = list.map((c) => D.keyOf(c));
      const fresh = now - (st.at || 0) > 30 * 60e3; // first run or long pause -> re-seed silently (no flood)
      const added = fresh ? [] : list.filter((c) => !st.keys[D.keyOf(c)]);
      for (const k of keys) st.keys[k] = st.keys[k] || now;
      for (const k of Object.keys(st.keys)) if (now - st.keys[k] > 3 * 864e5) delete st.keys[k];
      st.at = now;
      save(GKEY, st);
      const hits = [];
      for (const c of added.slice(0, 6)) {
        let sc = null;
        try { sc = window.KyvoInsights && window.KyvoInsights.fullScore ? await window.KyvoInsights.fullScore(c) : null; } catch (e) { sc = null; }
        if (sc != null && sc >= (S.minScore || 75)) hits.push({ c, sc });
      }
      if (hits.length === 1) {
        const { c, sc } = hits[0];
        send(L('Nowy coin w Good Coins', 'New coin in Good Coins'), `$${c.symbol} · Kyvo Check ${sc}/100 · MC ${D.fmtUsd(c.mcap)}`, '#coin/' + encodeURIComponent(D.keyOf(c)), 'kyvo-good-' + D.keyOf(c));
      } else if (hits.length > 1) {
        send(L(`${hits.length} ${plN(hits.length, 'nowe coiny', 'nowych coinów')} w Good Coins`, `${hits.length} new coins in Good Coins`), hits.map((h) => `$${h.c.symbol} ${h.sc}/100`).join(' · '), '#good', 'kyvo-good');
      }
    } finally { goodBusy = false; }
  }

  /* ---- 3) 🏃 Runner (v8.3): new coin runner or super-important tweet — deduped, max 3 per refresh ---- */
  const RKEY = 'kyvo_seen_runner_v1';
  function onRunner(items) {
    if (!D || !items) return;
    const st = load(RKEY, { at: 0, keys: {} });
    const now = Date.now();
    const all = (items.coins || []).concat(items.tweets || []);
    const fresh = now - (st.at || 0) > 30 * 60e3; // first run / long pause: seed silently, no flood
    const added = fresh ? [] : all.filter((x) => !st.keys[x.key]);
    for (const x of all) st.keys[x.key] = st.keys[x.key] || now;
    for (const k of Object.keys(st.keys)) if (now - st.keys[k] > 7 * 864e5) delete st.keys[k]; // per coin: max 1 first-pump alert (key chain:addr) + max 1 second-leg alert (key leg2:chain:addr) per 7 days
    st.at = now;
    save(RKEY, st);
    if (S.runner === false || !added.length) return;
    const G = window.KyvoRunnerGate; // v8.11: free users get a Runner alert only for their 1 free daily Runner (Premium: all)
    const open = G && !(G.unlimited ? G.unlimited() : isPremium()) ? added.filter((x) => G.unlocked(x.key)) : added; // v8.14.1: Premium = its 3 daily Runners, 🏃 Runners = all
    for (const x of open.slice(0, 3)) {
      if (x.kind === 'coin' && x.leg2) {
        const c = x.c;
        send(`🔁 ${L('Kolejna fala', 'Second leg')}: $${c.symbol}${c.mcap ? ' @ ' + D.fmtUsd(c.mcap) + ' MC' : ''}`, x.why.slice(0, 3).join(', ').replace(/<[^>]+>/g, '') + '…', '#coin/' + encodeURIComponent(x.key.replace(/^leg2:/, '')), 'kyvo-leg2-' + x.key);
      } else if (x.kind === 'coin') {
        const c = x.c;
        const ch = c.change && c.change.h1 != null ? (c.change.h1 >= 0 ? '+' : '') + Math.round(c.change.h1) + '%' : '';
        const reason = x.why.slice(1, 3).join(', ');
        const st = window.__kyvoStageOf ? window.__kyvoStageOf(c.mcap) : null;
        if (x.early) {
          send(`🏃 Runner${st ? ' ' + L('etap', 'stage') + ' ' + st.n : ''}: $${c.symbol} ${L('zaczyna pompować', 'starting to pump')}${c.mcap ? ' @ ' + D.fmtUsd(c.mcap) + ' MC' : ''}`, `vol 5m ↑, ${L('kupujący', 'buyers')} ↑ — ${x.why.slice(0, 3).join(', ').replace(/<[^>]+>/g, '')}`, '#coin/' + encodeURIComponent(x.key), 'kyvo-runner-' + x.key);
          continue;
        }
        send(`🏃 Runner${st ? ' ' + L('etap', 'stage') + ' ' + st.n : ''}: $${c.symbol}${c.mcap ? ' @ ' + D.fmtUsd(c.mcap) + ' MC' : ''}`, `vol 1h ${D.fmtUsd(c.volume && c.volume.h1)}, ${ch}${reason ? ', ' + reason.replace(/<[^>]+>/g, '') : ''}`, '#coin/' + encodeURIComponent(x.key), 'kyvo-runner-' + x.key);
      } else {
        const sym = x.coin && x.coin.symbol ? '$' + x.coin.symbol : '';
        send(`🏃 Runner: ${sym} — @${x.t.handle}`, `${x.views ? Math.round(x.views / 1000) + 'k views' : ''}${x.named ? '' : ', ' + L('spekulacja', 'speculative')}`, '#coin/' + encodeURIComponent((x.coin.chain || 'solana') + ':' + x.coin.address), 'kyvo-runner-' + x.key);
      }
    }
  }

  /* ---- 2) new important tweet with a coin in the X snapshot ---- */
  function tweetItems(doc) {
    const out = [];
    // v8.6: only genuinely NEW tweets (≤ 2 h old) — old snapshot tweets never trigger a "new tweet" alert
    const fresh = (x) => Date.now() - new Date(x.posted_at || x.created_at).getTime() <= 2 * 3.6e6;
    for (const t of (doc && doc.trader_tweets) || []) { const nc = (t.coins || []).filter((c) => (c.rel || 'named') === 'named'); /* v8.10: no alert for a key-word 'powiązany coin' or a coinless tweet */ if (nc.length && fresh(t)) out.push({ id: 'tt:' + (t.id || t.url), h: t.handle, c: nc[0], kind: 'named', views: t.metrics && t.metrics.views }); }
    for (const p of (doc && doc.posts) || []) {
      if (!fresh(p)) continue;
      const named = p.coin_match === 'named' && (p.coins || []).length;
      const spec = (p.spec_coins || []).length;
      if (named || spec) out.push({ id: 'p:' + p.url, h: p.handle, c: named ? p.coins[0] : p.spec_coins[0], kind: named ? 'named' : 'speculative', views: p.metrics && p.metrics.views });
    }
    return out;
  }
  function onViral(doc) {
    if (!doc || !doc.updated_at) return;
    const st = load(TKEY, { seeded: false, ids: {} });
    const items = tweetItems(doc);
    const added = st.seeded ? items.filter((x) => !st.ids[x.id]) : [];
    const now = Date.now();
    for (const x of items) st.ids[x.id] = st.ids[x.id] || now;
    for (const k of Object.keys(st.ids)) if (now - st.ids[k] > 14 * 864e5) delete st.ids[k];
    st.seeded = true;
    save(TKEY, st);
    if (!S.tweets || !added.length) return;
    const tag = (x) => (x.kind === 'named' ? L('podany w tweecie', 'named in tweet') : L('spekulacja', 'speculative'));
    if (added.length === 1) {
      const x = added[0];
      send(L('Nowy tweet z coinem', 'New tweet with a coin'), `@${x.h}: $${x.c.symbol} (${tag(x)})`, '#tweets', 'kyvo-tw-' + x.id);
    } else {
      send(L(`${added.length} ${plN(added.length, 'nowe tweety', 'nowych tweetów')} z coinami`, `${added.length} new tweets with coins`), added.slice(0, 4).map((x) => `@${x.h} $${x.c.symbol}`).join(' · '), '#tweets', 'kyvo-tw');
    }
  }

  function pushOff() { try { return localStorage.getItem('kyvo_push_off') === '1'; } catch (e) { return false; } }
  /* ---- settings card (Więcej + Watchlista) ---- */
  function settingsHtml() {
    const p = perm();
    const P = window.KYVO_PUSH_CONFIG || {};
    return `<div class="card nset" data-nset>
      <div class="h" style="font-size:14px;margin:0 0 6px">🔔 ${L('Powiadomienia', 'Notifications')}</div>
      <label class="nrow"><input type="checkbox" data-nt="runner" ${S.runner !== false ? 'checked' : ''}><span><b>🏃 Runner</b><small>${L('najmocniejsze sygnały: ogromny rosnący wolumen, tysiące transakcji, super-ważne tweety (kilka–kilkanaście dziennie)', 'strongest signals: huge rising volume, thousands of txns, super-important tweets (a handful to ~20 a day)')}</small></span></label>
      <label class="nrow"><input type="checkbox" data-nt="runner2" ${S.runner2 !== false ? 'checked' : ''}><span><b>🚀 Runner 2.0</b><small>${L('ostrzejszy Runner: coin ≥ 1 h, bez przegrzania (≤ +100% w 1 h) i bez sztucznego wolumenu · osobno od 🏃 Runner', 'a stricter Runner: coin ≥ 1 h old, not overheated (≤ +100% in 1 h), no fake volume · separate from 🏃 Runner')}</small></span></label>
      <label class="nrow"><input type="checkbox" data-nt="gta" ${S.gta !== false ? 'checked' : ''}><span><b>🎮 GTA 6</b><small>${L('nowy coin GTA, który naprawdę rośnie, i ważne newsy GTA 6 (Rockstar, trailer, data premiery) · max 15 dziennie · za darmo dla wszystkich', 'a new GTA coin that is really running and big GTA 6 news (Rockstar, trailer, release date) · max 15 a day · free for everyone')}</small></span></label>
      <label class="nrow"><input type="checkbox" data-nt="gold" ${S.gold !== false ? 'checked' : ''}><span><b>🥇 Gold</b><small>${L('wszystkie alerty 🥇 Gold / 🟡 Gamble / 🧛 Vamp: cena ±15–20%, kopia powyżej $500K MC, nowy artykuł, skaner nowych coinów · Premium', 'every 🥇 Gold / 🟡 Gamble / 🧛 Vamp alert: price ±15–20%, a copy above $500K MC, a new article, the new-coin scanner · Premium')}</small></span></label>
      <label class="nrow"><input type="checkbox" data-nt="smart" ${S.smart !== false ? 'checked' : ''}><span><b>👀 Smart money</b><small>${L('kilku top traderów z Rankingu kupiło ten sam coin w 30 min · 🏃 Runners · w tygodniu z darmowym Premium dla wszystkich', 'several top Ranking traders bought the same coin within 30 min · 🏃 Runners · free for everyone during the free Premium week')}</small></span></label>
      <label class="nrow"><input type="checkbox" data-nt="good" ${S.good ? 'checked' : ''}><span><b>${L('Nowy coin w Good Coins', 'New coin in Good Coins')}</b><small>${L('wysoki wynik Kyvo Check + skaner nowych coinów (🟡 Gamble / 🥇 Gold · +100% w 1 h, świeża migracja) — wyłączone = żadnych', 'high Kyvo Check score + the new-coin scanner (🟡 Gamble / 🥇 Gold · +100% in 1 h, fresh migration) — off = none')}</small></span></label>
      <label class="nrow"><input type="checkbox" data-nt="vip" ${S.vip !== false ? 'checked' : ''}><span><b>⭐ ${L('Super ważne tweety', 'Super important tweets')}</b><small>${L('tylko naprawdę ważne posty: każdy nowy post Trumpa i Kimchiego, Elon i duże konta krypto (CZ, Vitalik, Saylor, Toly, Ansem…) tylko gdy chodzi o coina, rynek lub ma ogromny zasięg · max 5 dziennie na konto · Premium · w tygodniu z darmowym Premium dla wszystkich', 'only really important posts: every new Trump and Kimchi post; Elon and big crypto accounts (CZ, Vitalik, Saylor, Toly, Ansem…) only about a coin, the market, or going hugely viral · max 5 a day per account · Premium · free for everyone during the free Premium week')}</small></span></label>
      <label class="nrow"><input type="checkbox" data-nt="tweets" ${S.tweets ? 'checked' : ''}><span><b>${L('Nowy ważny tweet z coinem', 'New important tweet with a coin')}</b><small>${L('znany trader, KOL lub celebryta tweetuje o coinie (New Tweet, sprawdzane co kilka minut)', 'a well-known trader, KOL or celebrity tweets about a coin (New Tweet, checked every few minutes)')}</small></span></label>
      <div class="mut nnote ncap">${isPremium() ? (window.KyvoPremium && window.KyvoPremium.isRunners && window.KyvoPremium.isRunners() ? '🏃 ' + L('Runners: wszystkie powiadomienia, każdy Runner i smart money.', 'Runners: all notifications, every Runner and smart money.') : '✦ ' + L('Premium: wszystkie powiadomienia i alerty Gold, Runnery 3 dziennie. <a href="#premium">🏃 Runners: każdy Runner + smart money</a>.', 'Premium: all notifications and Gold alerts, Runners 3 a day. <a href="#premium">🏃 Runners: every Runner + smart money</a>.')) : `${L('Darmowo: maks.', 'Free: max')} ${FREE_CAP} ${L('powiadomienia dziennie', 'notifications a day')} (${L('dziś', 'today')}: ${Math.min(usedToday(), FREE_CAP)}/${FREE_CAP}). <a href="#premium">${L('Premium dostaje wszystkie alerty', 'Premium gets all alerts')}</a>.`}</div>
      <div class="mut nnote">${P.enabled ? L('Gdy Kyvo jest otwarte, dostajesz komunikat w apce. Po włączeniu powiadomień systemowych alerty przychodzą też, gdy apka jest zamknięta.', 'While Kyvo is open you get an in-app message. After you enable system notifications, alerts also arrive when the app is closed.') : L('Działa, gdy Kyvo jest otwarte (także w karcie w tle na komputerze): dostajesz komunikat w apce, a gdy patrzysz gdzie indziej — powiadomienie systemowe. Gdy apka jest zamknięta, nic nie przyjdzie.', 'Works while Kyvo is open (also in a background tab on a computer): you get an in-app message, and a system notification when you are looking elsewhere. When the app is closed, nothing arrives.')}</div>
      ${p === 'default' ? `<button type="button" class="pf-btn" data-nperm>${L('Włącz powiadomienia systemowe', 'Enable system notifications')}</button>` : ''}
      ${p === 'granted' ? `<div class="nok">✓ ${L('Powiadomienia systemowe włączone', 'System notifications enabled')}</div><button type="button" class="pf-btn" data-ntest>${L('Wyślij test', 'Send a test')}</button>` : ''}
      ${p === 'denied' ? `<div class="mut nnote">${L('Powiadomienia są zablokowane w ustawieniach przeglądarki — zostają komunikaty w apce.', 'Notifications are blocked in your browser settings — in-app messages still work.')}</div>` : ''}
      ${p === 'unsupported' ? `<div class="mut nnote">${isIOS() && !standalone() ? L('Na iPhonie powiadomienia działają tylko po dodaniu Kyvo do ekranu głównego (Safari → Udostępnij → „Do ekranu początkowego”, iOS 16.4+). Do tego czasu zostają komunikaty w apce.', 'On iPhone, notifications only work after adding Kyvo to the Home Screen (Safari → Share → “Add to Home Screen”, iOS 16.4+). Until then you get in-app messages.') : L('Ta przeglądarka nie obsługuje powiadomień — zostają komunikaty w apce.', 'This browser doesn\'t support notifications — in-app messages still work.')}</div>` : ''}
      ${P.enabled && p === 'granted' ? `<div class="mut nnote">${pushOff() ? L('Powiadomienia w tle (apka zamknięta): wyłączone.', 'Background notifications (app closed): off.') : L('Powiadomienia w tle (apka zamknięta): włączone.', 'Background notifications (app closed): on.')}</div><button type="button" class="pf-btn" data-npush>${pushOff() ? L('Włącz powiadomienia w tle', 'Turn on background notifications') : L('Wyłącz powiadomienia w tle', 'Turn off background notifications')}</button>` : ''}
      ${!P.enabled ? `<div class="mut nnote">${L('Push w tle, gdy apka jest zamknięta: wkrótce.', 'Background push when the app is closed: coming soon.')}</div>` : ''}
    </div>`;
  }
  function wireSettings(root, rerender) {
    const box = root && root.querySelector('[data-nset]');
    if (!box) return;
    /* v8.28: "Zapisano" only after the OneSignal tags really changed; otherwise a clear error + retry later (dirty flag). */
    box.querySelectorAll('[data-nt]').forEach((i) => (i.onchange = async () => {
      S[i.dataset.nt] = i.checked; save(SKEY, S);
      let ok = true;
      if (window.KyvoPush && window.KyvoPush.syncTags) ok = await window.KyvoPush.syncTags({ fromToggle: true });
      if (D && D.toast) D.toast(ok ? L('Zapisano', 'Saved') : L('Nie zapisano – otwórz Kyvo z ekranu głównego', 'Not saved – open Kyvo from the Home Screen'));
    }));
    const np = box.querySelector('[data-npush]');
    if (np) np.onclick = async () => {
      const off = !pushOff();
      try { localStorage.setItem('kyvo_push_off', off ? '1' : '0'); } catch (e) {}
      if (window.KyvoPush) { if (off) await window.KyvoPush.optOut(); else await window.KyvoPush.init(true); }
      if (D && D.toast) D.toast(off ? L('Powiadomienia w tle wyłączone', 'Background notifications off') : L('Powiadomienia w tle włączone', 'Background notifications on'));
      const n = document.createElement('div'); n.innerHTML = settingsHtml(); box.replaceWith(n.firstElementChild); wireSettings(root, rerender);
    };
    const b = box.querySelector('[data-nperm]');
    if (b) b.onclick = async () => {
      try { await Notification.requestPermission(); } catch (e) {}
      if (perm() === 'granted') window.KyvoPush && window.KyvoPush.init();
      (rerender || (() => { const n = document.createElement('div'); n.innerHTML = settingsHtml(); box.replaceWith(n.firstElementChild); wireSettings(root); }))();
    };
    const t = box.querySelector('[data-ntest]');
    if (t) t.onclick = () => system('Kyvo', L('Test powiadomienia ✓', 'Test notification ✓'), location.href.split('#')[0] + '#more', 'kyvo-test');
  }

  window.KyvoNotify = { init(deps) { D = deps; }, isPremium, usedToday, FREE_CAP, onGood, onViral, onRunner, settingsHtml, wireSettings, settings: () => S, log: () => log, _send: send };
})();

/* ---- KyvoPush: hooks for REAL background push (app closed). Disabled unless KYVO_PUSH_CONFIG.enabled. ---- */
(function () {
  'use strict';
  let started = false;
  let ready = null;            // v8.28: resolves true once OneSignal.init + optIn + addTags really finished (false on error)
  const TAGS_V = '4', TVKEY = 'kyvo_push_tags_v', DIRTY = 'kyvo_push_tags_dirty';
  /* v8.31: TAGS_V '3' = + gta tag (🎮 GTA 6 push toggle) -> every subscriber re-sends its tags once
     v8.34: TAGS_V '4' = + runner2 tag (🚀 Runner 2.0 push toggle; '0' = off, missing = on) */
  const setDirty = (v) => { try { if (v) localStorage.setItem(DIRTY, '1'); else localStorage.removeItem(DIRTY); } catch (e) {} };
  const isDirty = () => { try { return localStorage.getItem(DIRTY) === '1' || localStorage.getItem(TVKEY) !== TAGS_V; } catch (e) { return false; } };
  function canPush() {
    const C = window.KYVO_PUSH_CONFIG || {};
    let off = false; try { off = localStorage.getItem('kyvo_push_off') === '1'; } catch (e) {}
    return !!C.enabled && !off && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }
  const pushRelevant = () => { const C = window.KYVO_PUSH_CONFIG || {}; const ios = /iPhone|iPad|iPod/.test(navigator.userAgent); const sa = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; return !!C.enabled && (canPush() || (ios && !sa)); };
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function tags() {
    const S = (window.KyvoNotify && window.KyvoNotify.settings()) || {};
    return { good: S.good ? '1' : '0', tweets: S.tweets ? '1' : '0', runner: S.runner !== false ? '1' : '0', gold: S.gold !== false ? '1' : '0', smart: S.smart !== false ? '1' : '0', vip: S.vip !== false ? '1' : '0', gta: S.gta !== false ? '1' : '0', runner2: S.runner2 !== false ? '1' : '0', premium: curTier() !== 'free' ? '1' : '0', tier: curTier(), lang: window.KyvoI18n ? window.KyvoI18n.lang : 'pl', tv: TAGS_V };
  }
  function withOS(fn) {
    if (!started || !window.OneSignalDeferred) return Promise.resolve(false);
    const run = new Promise((res) => window.OneSignalDeferred.push(async (OneSignal) => { try { await fn(OneSignal); res(true); } catch (e) { res(false); } }));
    const timeout = new Promise((res) => setTimeout(() => res(false), 15000));   // SDK never loaded -> report failure, not hang
    return Promise.resolve(ready).then(() => Promise.race([run, timeout]));
  }
  function markSynced(ok, tg) {
    if (ok) { try { localStorage.setItem(TIERKEY, tg.tier); localStorage.setItem(TVKEY, TAGS_V); } catch (e) {} setDirty(false); } else setDirty(true);
    return ok;
  }
  /* v8.22: the legacy premium=1 tag also follows paidTier() (free launch week never changes push tags). */
  /* v8.16: tier tag (free | premium | runners) routes server push per plan (tools/kyvo_push.py). Default 'free'.
     Re-synced when the tier changes: owner unlock / entitlement event, KyvoPremiumReady, and a cheap check on focus. */
  const TIERKEY = 'kyvo_push_tier';
  function curTier() { try { const P = window.KyvoPremium; const t = P && (P.paidTier ? P.paidTier() : P.tier && P.tier()); return t === 'premium' || t === 'runners' ? t : 'free'; } catch (e) { return 'free'; } }
  /* v8.28: real result. Not started yet but allowed (permission granted, push on) -> init first (init writes all tags itself).
     Push not possible here (Safari tab on iPhone, permission missing) -> false + dirty, retried on the next visible / init. */
  async function syncTags(opt) {
    if (!started) {
      if (!canPush()) { setDirty(true); return opt && opt.fromToggle ? !pushRelevant() : false; }
      await init();
      return ready ? await ready : false;
    }
    const tg = tags();
    return markSynced(await withOS((OneSignal) => OneSignal.User.addTags(tg)), tg);
  }
  function syncTierIfChanged() { let last = null; try { last = localStorage.getItem(TIERKEY); } catch (e) {} return started && last !== curTier() ? syncTags() : Promise.resolve(false); }
  window.addEventListener('kyvo-premium-change', () => { syncTags(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) return; if (isDirty() && canPush()) syncTags(); else syncTierIfChanged(); });
  if (window.KyvoPremiumReady && window.KyvoPremiumReady.then) window.KyvoPremiumReady.then(() => syncTierIfChanged(), () => {});
  function optOut() { return withOS((OneSignal) => OneSignal.User.PushSubscription.optOut()); }
  async function init(force) {
    const C = window.KYVO_PUSH_CONFIG || {};
    if (!C.enabled) return false;
    let off = false; try { off = localStorage.getItem('kyvo_push_off') === '1'; } catch (e) {}
    if (off && !force) return false;
    if (started) { if (!force) return false; const tg = tags(); return markSynced(await withOS(async (OneSignal) => { await OneSignal.User.PushSubscription.optIn(); await OneSignal.User.addTags(tg); }), tg); }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false; // permission is asked only on a button tap
    started = true;
    const S = (window.KyvoNotify && window.KyvoNotify.settings()) || {};
    try {
      if (C.provider === 'onesignal' && C.onesignalAppId) {
        // OneSignal Web SDK v16. sw.js must importScripts the OneSignal SW (see push_plan.md) so both share one service worker.
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        await loadScript('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js');
        ready = new Promise((res) => window.OneSignalDeferred.push(async (OneSignal) => {
          try {
            const base = location.pathname.replace(/[^/]*$/, ''); // '/' on kyvo-app.github.io (v8.25), '/<repo>/' on a project page
            await OneSignal.init({ appId: C.onesignalAppId, serviceWorkerPath: C.swPath || base.replace(/^\//, '') + 'OneSignalSDKWorker.js', serviceWorkerParam: { scope: C.swScope || base }, autoResubscribe: true, notifyButton: { enable: false }, promptOptions: { autoPrompt: false } });
            await OneSignal.User.PushSubscription.optIn();
            const tg = tags();                          // v8.28: every launch re-sends ALL tags (incl. tv=2) -> heals old subscriptions
            await OneSignal.User.addTags(tg);
            res(markSynced(true, tg));
          } catch (e) { setDirty(true); res(false); }
        }));
        return true;
      }
      if (C.provider === 'fcm' && C.fcm && C.fcm.vapidPublicKey) {
        // Firebase Cloud Messaging: the token must be stored server-side (e.g. Firestore "push_tokens") for the GitHub Action to send to.
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
        const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(C.fcm);
        const reg = await navigator.serviceWorker.ready;
        const token = await window.firebase.messaging(app).getToken({ vapidKey: C.fcm.vapidPublicKey, serviceWorkerRegistration: reg });
        window.dispatchEvent(new CustomEvent('kyvo-push-token', { detail: { provider: 'fcm', token, topics: S } }));
        return !!token;
      }
    } catch (e) { started = false; }
    return false;
  }
  window.KyvoPush = { init, syncTags, syncTierIfChanged, tier: curTier, tags, optOut, enabled: () => !!(window.KYVO_PUSH_CONFIG || {}).enabled };
})();

/* ---- v8.24 🔔 "Włącz powiadomienia" banner on the home screen (installed PWA only, permission still 'default').
   iOS / iPadOS allow the permission prompt ONLY from a tap inside the Home-Screen app, so the prompt is requested directly in
   this click handler (no await before it), then OneSignal subscribes (KyvoPush.init). "×" hides it for 3 days. ---- */
(function () {
  'use strict';
  const HIDE = 'kyvo_pushbanner_hide';
  const L = (pl, en) => (window.KyvoI18n && window.KyvoI18n.lang === 'en' ? en : pl);
  const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function want() {
    const C = window.KYVO_PUSH_CONFIG || {};
    if (!C.enabled || !standalone() || typeof Notification === 'undefined' || Notification.permission !== 'default') return false;
    let h = 0; try { h = +localStorage.getItem(HIDE) || 0; } catch (e) {}
    return Date.now() - h > 3 * 864e5;
  }
  function remove() { const b = document.getElementById('kyPushBanner'); if (b) b.remove(); }
  function show() {
    if (!want()) { remove(); return; }
    if (document.getElementById('kyPushBanner')) return;
    const host = document.getElementById('s-list'); if (!host) return;
    const d = document.createElement('div');
    d.id = 'kyPushBanner'; d.className = 'card';
    d.setAttribute('translate', 'no');
    d.style.cssText = 'display:flex;align-items:center;gap:10px;margin:10px 12px;padding:12px 14px;border:1px solid rgba(167,139,250,.45);background:rgba(167,139,250,.12)';
    d.innerHTML = `<div style="flex:1;min-width:0"><b>🔔 ${L('Włącz powiadomienia', 'Turn on notifications')}</b><div class="mut" style="font-size:12px;margin-top:2px">${L('Runnery i super ważne tweety (Trump, Elon, Kimchi…) nawet gdy Kyvo jest zamknięte.', 'Runners and super important tweets (Trump, Elon, Kimchi…) even when Kyvo is closed.')}</div></div>
      <button type="button" class="pf-btn" data-kpb-on style="white-space:nowrap">${L('Włącz', 'Turn on')}</button>
      <button type="button" data-kpb-x aria-label="${L('Zamknij', 'Close')}" style="background:none;border:0;color:inherit;opacity:.6;font-size:18px;padding:0 2px">×</button>`;
    d.querySelector('[data-kpb-on]').onclick = () => {
      let p;
      try { p = Notification.requestPermission(); } catch (e) { p = null; }   // called synchronously inside the tap (iOS requirement)
      Promise.resolve(p).then(() => {
        if (Notification.permission === 'granted') {
          try { localStorage.setItem('kyvo_push_off', '0'); } catch (e) {}
          if (window.KyvoPush) window.KyvoPush.init(true);
        }
        remove();
      }, remove);
    };
    d.querySelector('[data-kpb-x]').onclick = () => { try { localStorage.setItem(HIDE, String(Date.now())); } catch (e) {} remove(); };
    host.insertBefore(d, host.firstChild);
  }
  const later = () => setTimeout(show, 1200);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) show(); });
  window.addEventListener('hashchange', () => setTimeout(show, 300));
})();
