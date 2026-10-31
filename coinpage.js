/* Kyvo v8.14 coin page (pump.fun-style): header (age · holders · ⭐ · share), MC + % pill, "N holders, X KOL-i trzyma",
   tabs Callouts / Holders / About / Pairs, Alert sheet (watchlist alerts), sticky bottom CTA (pump.fun / Axiom + ⭐ Obserwuj).
   Data: DexScreener + GeckoTerminal + RugCheck (public, browser) and data/pf_social.json (pump.fun callouts / top traders,
   fetched server-side because pump.fun blocks browser calls from other sites). Never asks for keys — public addresses only. */
(function () {
  'use strict';
  const GT = 'https://api.geckoterminal.com/api/v2';
  const RC = 'https://api.rugcheck.xyz/v1/tokens/';
  const DS = 'https://api.dexscreener.com';
  const NET = { solana: 'solana', bsc: 'bsc', base: 'base', ethereum: 'eth', robinhood: 'robinhood' };
  let D = null;
  const L = (pl, en) => (window.KyvoI18n && window.KyvoI18n.isEn() ? en : pl);
  const E = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const TAB_KEY = 'kyvo_coin_tab';
  const mem = new Map(); // url -> {t, p}
  function getJson(url, ttl) {
    const h = mem.get(url);
    if (h && Date.now() - h.t < ttl) return h.p;
    const p = fetch(url, { headers: { Accept: 'application/json' } }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    mem.set(url, { t: Date.now(), p });
    p.catch(() => mem.delete(url));
    return p;
  }
  const gt = (path, ttl) => (window.KyvoGT ? window.KyvoGT.fetch(GT + path, ttl, true) : getJson(GT + path, ttl));

  /* ---------- pump.fun social feed (server-side) ---------- */
  let pf = null, pfAt = 0, pfP = null;
  function loadPf() {
    if (pf && Date.now() - pfAt < 180000) return Promise.resolve(pf);
    if (pfP) return pfP;
    pfP = fetch('data/pf_social.json?t=' + Math.floor(Date.now() / 180000)).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((d) => { pf = d || pf || { coins: {} }; pfAt = Date.now(); pfP = null; return pf; });
    return pfP;
  }
  const pfCoin = (mint) => (pf && pf.coins && pf.coins[mint]) || null;
  const isPump = (c) => (c.chainId || 'solana') === 'solana' && (/pump$/.test(c.address) || /^pump/.test(c.dexId || ''));
  const pfProfile = (w) => 'https://pump.fun/profile/' + w;

  /* ---------- known wallets: Kyvo KOLs + ranking (kolscan + pump.fun) + smart money + pump.fun traders/callers of this coin ---------- */
  let kwBase = null, kwSig = '';
  function knownWallets(c) {
    const lb = D.getLeaderboard && D.getLeaderboard(), sm = D.getSmartMoney && D.getSmartMoney();
    const sig = (lb && lb.updated_at) + '|' + (sm && sm.updated_at);
    if (!kwBase || sig !== kwSig) {
      kwSig = sig; kwBase = {};
      for (const w of (sm && sm.wallets) || []) if (w.address) kwBase[w.address] = { name: w.name, handle: w.handle, src: 'kyvo', url: w.handle ? 'https://x.com/' + w.handle : 'https://solscan.io/account/' + w.address, kol: true };
      for (const l of (lb && lb.leaders) || []) {
        if (!l.address) continue;
        const srcs = l.sources || ['kolscan'];
        const src = srcs.includes('kolscan') ? 'kolscan' : 'pumpfun';
        kwBase[l.address] = Object.assign({}, kwBase[l.address], { name: l.name, handle: l.handle || (kwBase[l.address] || {}).handle, img: l.avatar || null, src,
          url: (l.profiles && (l.profiles[src] || l.profiles.pumpfun)) || 'https://kolscan.io/account/' + l.address, kol: true, id: l.id });
      }
    }
    const out = Object.assign({}, kwBase);
    const pc = c && pfCoin(c.address);
    if (pc) {
      for (const t of pc.traders || []) if (!out[t.wallet]) out[t.wallet] = { name: t.name || t.wallet.slice(0, 4), img: t.img, src: 'pumpfun', url: pfProfile(t.wallet), verified: t.verified };
      for (const x of pc.callouts || []) if (!out[x.wallet]) out[x.wallet] = { name: x.name || x.wallet.slice(0, 4), img: x.img, src: 'pumpfun', url: pfProfile(x.wallet), caller: true };
    }
    return out;
  }

  /* ---------- helpers ---------- */
  function ago(sec) {
    const s = Math.max(0, Math.floor(Date.now() / 1000 - sec));
    if (s < 60) return L('teraz', 'now');
    if (s < 3600) return Math.floor(s / 60) + (L(' min', 'm'));
    if (s < 86400) return Math.floor(s / 3600) + L(' godz.', 'h');
    return Math.floor(s / 86400) + L(' d', 'd');
  }
  const kfmt = (n) => (n == null || !isFinite(n) ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(2) + 'K' : String(n));
  function av(img, name, cls) {
    const ini = E(((name || '?').replace(/^@/, '')[0] || '?').toUpperCase());
    return img ? `<span class="cav ${cls || ''}"><img src="${E(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='${ini}'"></span>` : `<span class="cav ${cls || ''}">${ini}</span>`;
  }
  const srcBadge = (s) => s === 'pumpfun' ? '<span class="srcb pf">pump.fun</span>' : s === 'kolscan' ? '<span class="srcb ks">kolscan</span>' : s === 'x' ? '<span class="srcb xx">X</span>' : s === 'kyvo' ? '<span class="srcb ky">Kyvo</span>' : '';
  function xHandle(c, info) {
    const tw = (c.socials || []).find((s) => /twitter|^x$/i.test(s.type || '') || /x\.com|twitter\.com/.test(s.url || ''));
    if (tw && tw.url) return tw.url;
    if (info && info.twitter_handle) return 'https://x.com/' + info.twitter_handle;
    return '';
  }
  const ctaUrl = (c) => (isPump(c) ? 'https://pump.fun/coin/' + c.address : (c.chainId || 'solana') === 'solana' ? 'https://axiom.trade/meme/' + (c.pairAddress || c.address) : 'https://dexscreener.com/' + (c.chainId || 'solana') + '/' + (c.pairAddress || c.address));
  const ctaLabel = (c) => (isPump(c) ? L('Otwórz na pump.fun', 'Open on pump.fun') : (c.chainId || 'solana') === 'solana' ? L('Otwórz w Axiom', 'Open in Axiom') : L('Otwórz w DexScreener', 'Open in DexScreener'));

  /* ---------- page parts (called from app.js renderCoin) ---------- */
  function headerHtml(c) {
    const on = window.KyvoInsights && window.KyvoInsights.isWatched(D.keyOf(c));
    return `<div class="cp-top">
        <button type="button" class="cp-ib cp-back" id="coinBack" aria-label="${L('Wróć', 'Back')}">‹</button>
        <span class="cp-sym">${E(c.symbol || c.name || '')}</span>
        <span class="cp-meta" title="${L('Wiek puli', 'Pool age')}">🌱 ${E(D.ageFrom(c.pairCreatedAt))}</span>
        <span class="cp-meta" id="cpHolders" title="${L('Holderzy', 'Holders')}">👥 —</span>
        <span style="flex:1"></span>
        <button type="button" class="cp-ib cp-star${on ? ' on' : ''}" data-watch-star aria-label="${L('Obserwuj', 'Watch')}" aria-pressed="${!!on}">${on ? '★' : '☆'}</button>
        <button type="button" class="cp-ib" id="cpShare" aria-label="${L('Udostępnij', 'Share')}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg></button>
      </div>
      <div class="cp-id">
        <div class="cp-logo">${D.imgTag(c, 'tok cp-tok', 58)}<span class="cp-chain c-${E(c.chainId || 'solana')}">${E(D.chainBadge(c))}</span></div>
        <div class="cp-nm">
          <b class="cp-name">${E(c.name)}</b>
          <div class="cp-ca"><span class="mono">${E(D.shortCa(c.address))}</span>
            <button type="button" class="cp-mini" id="copyCa" aria-label="${L('Kopiuj adres', 'Copy address')}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>
            <a class="cp-mini" id="cpX" href="${E(xHandle(c) || '#')}" target="_blank" rel="noopener noreferrer" ${xHandle(c) ? '' : 'hidden'} aria-label="X">𝕏</a>
            ${c.onCurve || c.dexId === 'pumpfun' ? '<span class="badge demo">' + L('krzywa', 'curve') + '</span>' : c.migrated ? '<span class="badge live">migrated</span>' : ''}
          </div>
        </div>
        <div class="cp-mc"><div><small>MC</small> <b id="cpMc">${D.fmtUsd(c.mcap)}</b></div>
          <span class="cp-pct ${(c.change.h24 || 0) >= 0 ? 'up' : 'dn'}">${(c.change.h24 || 0) >= 0 ? '↑' : '↓'} ${E(D.fmtPct(c.change.h24).replace(/^[+-]/, ''))} <small>24h</small></span></div>
      </div>
      <div class="cp-hold" id="cpHoldLine"><span class="mut">${L('Sprawdzam holderów…', 'Checking holders…')}</span></div>`;
  }
  function tabsHtml() {
    const t = localStorage.getItem(TAB_KEY) || 'callouts';
    const tabs = [['callouts', 'Callouts'], ['holders', L('Holderzy', 'Holders')], ['about', L('O coinie', 'About')], ['pairs', L('Pary', 'Pairs')]];
    return `<div class="cp-tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-cptab="${k}" class="${k === t ? 'on' : ''}">${n}</button>`).join('')}</div><div id="cpTab" class="cp-tab"></div>`;
  }
  function ctaHtml(c) {
    const on = window.KyvoInsights && window.KyvoInsights.isWatched(D.keyOf(c));
    const pump = isPump(c);
    return `<div class="cp-cta">
        <a class="cp-buy${pump ? ' pf' : ''}" href="${E(ctaUrl(c))}" target="_blank" rel="noopener noreferrer">${pump ? '<span aria-hidden="true">💊</span>' : ''}${ctaLabel(c)} ↗</a>
        <button type="button" class="cp-watch${on ? ' on' : ''}" data-watch-star aria-pressed="${!!on}">${on ? '★ ' + L('Obserwujesz', 'Watching') : '☆ ' + L('Obserwuj', 'Watch')}</button>
      </div>`;
  }

  let curC = null, curInfo = null, curRc = null;
  function wire(c, root) {
    curC = c; curInfo = null; curRc = null;
    const syncStars = () => {
      const on = window.KyvoInsights && window.KyvoInsights.isWatched(D.keyOf(c));
      root.querySelectorAll('[data-watch-star]').forEach((b) => {
        b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', String(!!on));
        b.textContent = b.classList.contains('cp-star') ? (on ? '★' : '☆') : on ? '★ ' + L('Obserwujesz', 'Watching') : '☆ ' + L('Obserwuj', 'Watch');
      });
    };
    root.querySelectorAll('[data-watch-star]').forEach((b) => (b.onclick = () => { if (window.KyvoInsights) window.KyvoInsights.toggleWatch(c); syncStars(); }));
    const sh = root.querySelector('#cpShare');
    if (sh) sh.onclick = async () => {
      const url = location.origin + location.pathname + '#coin/' + encodeURIComponent(D.keyOf(c));
      try { if (navigator.share) { await navigator.share({ title: c.name + ' ($' + c.symbol + ') · Kyvo', url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(url); D.toast(L('Skopiowano link', 'Link copied')); } catch (e) { D.toast(url); }
    };
    root.querySelectorAll('[data-cptab]').forEach((b) => (b.onclick = () => {
      localStorage.setItem(TAB_KEY, b.dataset.cptab);
      root.querySelectorAll('[data-cptab]').forEach((x) => x.classList.toggle('on', x === b));
      renderTab(c, root);
    }));
    renderTab(c, root);
    loadPf().then(() => { if (curC === c) { renderTab(c, root, true); holdLine(c, root); if (D.onPf) D.onPf(c); } });
    const net = NET[c.chainId || 'solana'];
    if (net) gt(`/networks/${net}/tokens/${c.address}/info`, 600000).then((d) => {
      if (curC !== c) return;
      curInfo = (d && d.data && d.data.attributes) || null;
      holdLine(c, root);
      const xa = root.querySelector('#cpX');
      if (xa && !xa.getAttribute('href').startsWith('http') && xHandle(c, curInfo)) { xa.href = xHandle(c, curInfo); xa.hidden = false; }
      if (localStorage.getItem(TAB_KEY) === 'about' || localStorage.getItem(TAB_KEY) === 'holders') renderTab(c, root, true);
    }).catch(() => holdLine(c, root));
    if ((c.chainId || 'solana') === 'solana') getJson(RC + encodeURIComponent(c.address) + '/report', 600000).then((d) => {
      if (curC !== c) return;
      curRc = d || null;
      holdLine(c, root);
      if (localStorage.getItem(TAB_KEY) === 'holders') renderTab(c, root, true);
    }).catch(() => { curRc = { failed: true }; holdLine(c, root); });
  }
  function onLive(mc) {
    const el = document.getElementById('cpMc');
    if (el && isFinite(mc) && mc > 0) el.textContent = D.fmtUsd(mc);
  }

  /* holders line: "1,2K holders, 2 KOL-i trzyma" */
  function kolHolders(c) {
    const kw = knownWallets(c), names = new Map();
    for (const h of (curRc && curRc.topHolders) || []) { const k = kw[h.owner]; if (k && k.kol) names.set(h.owner, { name: k.name, img: k.img, pct: h.pct, src: k.src }); }
    const cons = D.consensus ? D.consensus(c) : { buyers: [], sellers: [] };
    for (const n of cons.buyers || []) if (!(cons.sellers || []).includes(n) && ![...names.values()].some((x) => x.name === n)) names.set('sm:' + n, { name: n, src: 'kyvo' });
    return [...names.values()];
  }
  function holdLine(c, root) {
    const el = root.querySelector('#cpHoldLine'), hd = root.querySelector('#cpHolders');
    if (!el) return;
    const n = (curInfo && curInfo.holders && curInfo.holders.count) || (curRc && curRc.totalHolders) || null;
    if (hd) hd.textContent = '👥 ' + (n ? kfmt(n) : '—');
    const kh = kolHolders(c);
    const who = kh.slice(0, 4).map((k) => av(k.img, k.name, 'xs')).join('');
    const hs = n ? `<b>${kfmt(n)}</b> holders` : L('holderzy: —', 'holders: —');
    el.innerHTML = `${hs}, ${kh.length ? `<span class="cp-kav">${who}</span><b>${kh.length}</b> ${kh.length === 1 ? L('śledzony KOL trzyma', 'tracked KOL holds') : L('KOL-i trzyma', 'KOLs hold')} <span class="mut">(${E(kh.slice(0, 3).map((k) => k.name).join(', '))}${kh.length > 3 ? '…' : ''})</span>` : `<span class="mut">${L('żaden śledzony KOL nie trzyma', 'no tracked KOL holds it')}</span>`}`;
  }

  /* ---------- tabs ---------- */
  function renderTab(c, root, quiet) {
    const box = root.querySelector('#cpTab');
    if (!box) return;
    const t = localStorage.getItem(TAB_KEY) || 'callouts';
    if (t === 'holders') box.innerHTML = holdersHtml(c);
    else if (t === 'about') box.innerHTML = aboutHtml(c);
    else if (t === 'pairs') { box.innerHTML = pairsCache[c.address] ? pairsHtml(c, pairsCache[c.address]) : `<div class="cp-empty"><div class="spin"></div></div>`; loadPairs(c, root); }
    else box.innerHTML = calloutsHtml(c);
    box.dataset.tab = t;
    wireTab(c, box, root);
  }
  let coFilter = 'all';
  function calloutsHtml(c) {
    const pc = pfCoin(c.address);
    const tw = (D.tweetsFor ? D.tweetsFor(c) : []) || [];
    const gold = goldCard(c);
    const items = [];
    for (const x of (pc && pc.callouts) || []) items.push({ k: 'pf', at: x.at, html: pfCalloutHtml(c, x) });
    for (const t of tw) { const ts = t.ts ? +t.ts : Math.floor(new Date(t.created_at).getTime() / 1000); items.push({ k: 'x', at: ts, html: tweetHtml(t, ts) }); }
    items.sort((a, b) => b.at - a.at);
    const nPf = items.filter((i) => i.k === 'pf').length, nX = items.length - nPf;
    const list = items.filter((i) => coFilter === 'all' || i.k === coFilter);
    const traders = tradersHtml(c, pc);
    const pfNote = !isPump(c) ? '' : pc
      ? `<div class="cp-note mut">${L('Callouty i top traderzy z pump.fun (publiczne dane, odświeżane po stronie serwera co ~6 min, stan sprzed', 'Callouts and top traders from pump.fun (public data, refreshed server-side every ~6 min, as of')} ${ago(pc.at)}${L(').', ' ago).')}</div>`
      : `<div class="cp-note mut">${pf ? L('Brak callouts z pump.fun dla tego coina w danych Kyvo — pump.fun nie pozwala apce czytać ich bezpośrednio, więc Kyvo pobiera je po stronie serwera tylko dla gorących coinów (co ~6 min).', 'No pump.fun callouts for this coin in Kyvo data — pump.fun does not let the app read them directly, so Kyvo fetches them server-side only for hot coins (every ~6 min).') : L('Ładuję callouty pump.fun…', 'Loading pump.fun callouts…')} <a href="https://pump.fun/coin/${E(c.address)}" target="_blank" rel="noopener noreferrer">pump.fun ↗</a></div>`;
    return `${gold}
      <div class="cp-chips"><button type="button" data-cof="all" class="${coFilter === 'all' ? 'on' : ''}">${L('Wszystkie', 'All')} ${items.length}</button>
        <button type="button" data-cof="pf" class="${coFilter === 'pf' ? 'on' : ''}">pump.fun ${nPf}</button>
        <button type="button" data-cof="x" class="${coFilter === 'x' ? 'on' : ''}">X / KOL ${nX}</button></div>
      ${traders}
      ${list.length ? list.slice(0, 40).map((i) => i.html).join('') : `<div class="cp-empty mut">${L('Brak calloutów i tweetów KOL o tym coinie.', 'No callouts or KOL tweets about this coin yet.')}</div>`}
      ${pfNote}`;
  }
  const fb = (w) => (window.KyvoTracker ? window.KyvoTracker.btnHtml(w, 'sm') : '');
  function pfCalloutHtml(c, x) {
    const mult = x.mc > 0 && c.mcap > 0 ? c.mcap / x.mc : null;
    const th = String(x.thesis || '').trim();
    return `<div class="co">
      <a href="${E(pfProfile(x.wallet))}" target="_blank" rel="noopener noreferrer">${av(x.img, x.name)}</a>
      <div class="co-b"><div class="co-h"><a class="co-n" href="${E(pfProfile(x.wallet))}" target="_blank" rel="noopener noreferrer">${E(x.name || x.wallet.slice(0, 6))}</a><span class="mut">· ${ago(x.at)}</span>${srcBadge('pumpfun')}${fb({ address: x.wallet, name: x.name, img: x.img, src: 'pumpfun' })}
        ${x.followers ? `<span class="mut co-f">${kfmt(x.followers)} ${L('obserw.', 'followers')}</span>` : ''}</div>
        ${th ? `<div class="co-t">${E(th.slice(0, 280))}</div>` : ''}
        <div class="co-m">${x.mc ? `<span>${L('call przy', 'called at')} MC <b>${D.fmtUsd(x.mc)}</b></span>` : ''}${mult ? `<span class="${mult >= 1 ? 'up' : 'dn'}"><b>${mult >= 10 ? Math.round(mult) : mult.toFixed(mult < 1 ? 2 : 1)}×</b> ${L('teraz', 'now')}</span>` : ''}${x.max_x ? `<span class="mut">max ${(+x.max_x).toFixed(1)}×</span>` : ''}<span class="mut">♥ ${x.likes || 0} · 💬 ${x.replies || 0}</span></div>
      </div></div>`;
  }
  function tweetHtml(t, ts) {
    const txt = String(t.text || '').slice(0, 280);
    return `<div class="co">
      <a href="https://x.com/${E(t.handle)}" target="_blank" rel="noopener noreferrer">${av(t.avatar, t.author_name || t.handle)}</a>
      <div class="co-b"><div class="co-h"><a class="co-n" href="https://x.com/${E(t.handle)}" target="_blank" rel="noopener noreferrer">${E(t.author_name || t.handle)}</a><span class="mut">@${E(t.handle)} · ${isFinite(ts) ? ago(ts) : ''}</span>${srcBadge('x')}</div>
        <div class="co-t">${E(txt)}</div>
        <div class="co-m"><a href="${E(t.url)}" target="_blank" rel="noopener noreferrer">${L('Otwórz na X', 'Open on X')} ↗</a></div></div></div>`;
  }
  function tradersHtml(c, pc) {
    const tr = (pc && pc.traders) || [];
    const kw = knownWallets(c);
    // Kyvo KOLs / ranking wallets that traded this coin (smart money feed) + pump.fun's top traders of this coin, de-duplicated by wallet
    const map = new Map();
    for (const t of tr) map.set(t.wallet, { wallet: t.wallet, name: t.name, img: t.img, src: 'pumpfun', url: pfProfile(t.wallet), buys: 0, sells: 0, bu: 0, su: 0 });
    for (const x of (pc && pc.trades) || []) {
      let m = map.get(x.wallet);
      if (!m) { const k = kw[x.wallet]; if (!k) continue; m = { wallet: x.wallet, name: k.name, img: k.img, src: k.src, url: k.url, buys: 0, sells: 0, bu: 0, su: 0 }; map.set(x.wallet, m); }
      if (x.buy) { m.buys++; m.bu += x.usd || 0; } else { m.sells++; m.su += x.usd || 0; }
    }
    for (const b of (D.smartBuys ? D.smartBuys(c) : [])) {
      if (!b.wallet) continue;
      let m = map.get(b.wallet);
      const k = kw[b.wallet] || { name: b.wallet_name, src: 'kyvo', url: 'https://solscan.io/account/' + b.wallet };
      if (!m) { m = { wallet: b.wallet, name: k.name || b.wallet_name, img: k.img, src: k.src, url: k.url, buys: 0, sells: 0, bu: 0, su: 0, kyvo: true }; map.set(b.wallet, m); }
      if (!m.fromSm) { m.buys++; m.bu += +b.usd_size || 0; m.fromSm = true; }
      if (kw[b.wallet] && kw[b.wallet].src !== 'pumpfun') m.src2 = kw[b.wallet].src;
    }
    for (const m of map.values()) { const k = kw[m.wallet]; if (k && k.src && k.src !== m.src && k.kol) m.src2 = k.src; }
    const list = [...map.values()].sort((a, b) => (b.bu + b.su) - (a.bu + a.su)).slice(0, 12);
    if (!list.length) return '';
    return `<div class="cp-tr"><div class="cp-trh">${L('Traderzy tego coina', 'Traders of this coin')} <span class="mut">(pump.fun top · KOL Kyvo)</span></div>
      <div class="cp-trl">${list.map((m) => `<a class="cp-trc" href="${E(m.url)}" target="_blank" rel="noopener noreferrer">${av(m.img, m.name)}<span class="cp-trn">${E(m.name)}</span>
        <span class="cp-trs">${m.buys ? `<span class="up">▲${m.bu ? ' ' + D.fmtUsd(m.bu) : ' ' + m.buys}</span>` : ''}${m.sells ? ` <span class="dn">▼ ${m.su ? D.fmtUsd(m.su) : m.sells}</span>` : ''}${!m.buys && !m.sells ? '<span class="mut">top trader</span>' : ''}</span>
        <span class="cp-trb">${srcBadge(m.src)}${m.src2 ? srcBadge(m.src2) : ''}</span>${fb({ address: m.wallet, name: m.name, img: m.img, src: m.src })}</a>`).join('')}</div></div>`;
  }
  function goldCard(c) {
    const G = window.KyvoGold;
    const f = G && G._feed && G._feed();
    const k = (c.chainId || 'solana') + ':' + c.address;
    const card = f && (f.cards || []).find((x) => x.k === k);
    if (!card) return '';
    const lv = { gold: ['🥇', 'Gold', 'up'], hazard: ['⚠️', L('Hazard', 'Gamble'), 'warn'], avoid: ['⛔', L('Omijaj', 'Avoid'), 'dn'] }[card.level] || ['🥇', card.level, ''];
    const say = card.say ? (L('pl', 'en') === 'en' ? card.say.en : card.say.pl) || card.say.pl : '';
    return `<div class="cp-gold ${lv[2]}"><b>${lv[0]} ${L('Werdykt Gold', 'Gold verdict')}: ${E(lv[1])}</b> <span class="mut">${card.score != null ? E(card.score) + '/100' : ''}</span><div>${E(say)}</div></div>`;
  }
  function holdersHtml(c) {
    if ((c.chainId || 'solana') !== 'solana') return `<div class="cp-empty mut">${L('Lista holderów jest dostępna dla Solany.', 'The holders list is available for Solana.')}</div>`;
    const dist = curInfo && curInfo.holders && curInfo.holders.distribution_percentage;
    const distH = dist ? `<div class="cp-dist">${[['top_10', 'Top 10'], ['11_20', '11–20'], ['21_40', '21–40'], ['rest', L('Reszta', 'Rest')]].map(([k, n]) => `<div><small>${n}</small><b>${E((+dist[k] || 0).toFixed(1))}%</b></div>`).join('')}</div>` : '';
    if (!curRc) return distH + `<div class="cp-empty"><div class="spin"></div>${L('Ładuję holderów (RugCheck)…', 'Loading holders (RugCheck)…')}</div>`;
    if (curRc.failed || !curRc.topHolders) return distH + `<div class="cp-empty mut">${L('RugCheck chwilowo nie odpowiada — spróbuj za chwilę.', 'RugCheck is not responding — try again shortly.')}</div>`;
    const kw = knownWallets(c), ka = curRc.knownAccounts || {};
    const dev = curInfo && curInfo.developer_address || curRc.creator;
    const rows = curRc.topHolders.slice(0, 20).map((h, i) => {
      const k = kw[h.owner], kn = ka[h.owner] || ka[h.address];
      const tags = [];
      if (kn && kn.type === 'AMM') tags.push(`<span class="ht lp">${L('pula', 'pool')} · ${E(kn.name)}</span>`);
      else if (kn && kn.type === 'LOCKER') tags.push(`<span class="ht lk">${E(kn.name)}</span>`);
      if (h.owner === dev || (kn && kn.type === 'CREATOR')) tags.push('<span class="ht dev">dev</span>');
      if (k && k.kol) tags.push(`<span class="ht kol">KOL</span>`);
      if (h.insider) tags.push(`<span class="ht ins">insider</span>`);
      const nm = k ? `<a href="${E(k.url)}" target="_blank" rel="noopener noreferrer">${E(k.name)}</a>` : `<a class="mono" href="https://solscan.io/account/${E(h.owner)}" target="_blank" rel="noopener noreferrer">${E(D.shortCa(h.owner))}</a>`;
      return `<div class="hr"><span class="hn">${i + 1}</span>${k ? av(k.img, k.name, 'xs') : ''}<span class="hw">${nm} ${tags.join('')}</span><span class="hp"><i style="width:${Math.min(100, h.pct).toFixed(1)}%"></i><b>${h.pct >= 10 ? h.pct.toFixed(1) : h.pct.toFixed(2)}%</b></span></div>`;
    }).join('');
    const devPct = curInfo && curInfo.developer_holding_percentage;
    return `${distH}${devPct != null ? `<div class="cp-note">${L('Dev trzyma', 'Dev holds')}: <b>${(+devPct).toFixed(2)}%</b></div>` : ''}<div class="hl">${rows}</div>
      <div class="cp-note mut">${L('Top 20 holderów z RugCheck (publiczne). „pula” = LP / krzywa, „dev” = twórca, „KOL” = portfel z rankingu Kyvo.', 'Top 20 holders from RugCheck (public). “pool” = LP / curve, “dev” = creator, “KOL” = wallet from the Kyvo ranking.')}</div>`;
  }
  function aboutHtml(c) {
    const i = curInfo || {};
    const desc = i.description || c.description || '';
    const links = [];
    for (const s of c.socials || []) if (s.url) links.push(`<a href="${E(s.url)}" target="_blank" rel="noopener noreferrer">${E(s.type || 'link')}</a>`);
    for (const w of c.websites || []) if (w.url) links.push(`<a href="${E(w.url)}" target="_blank" rel="noopener noreferrer">${E(w.label || 'web')}</a>`);
    if (!links.length) for (const w of i.websites || []) links.push(`<a href="${E(w)}" target="_blank" rel="noopener noreferrer">web</a>`);
    if (!links.some((l) => /x\.com|twitter/.test(l)) && i.twitter_handle) links.push(`<a href="https://x.com/${E(i.twitter_handle)}" target="_blank" rel="noopener noreferrer">X</a>`);
    const lp = i.launchpad_details || null;
    const facts = [];
    if (lp && lp.graduation_percentage != null) facts.push([L('Krzywa', 'Curve'), lp.completed ? L('ukończona ✓', 'completed ✓') : (+lp.graduation_percentage).toFixed(1) + '%']);
    if (i.mint_authority !== undefined) facts.push(['Mint authority', i.mint_authority ? '⚠️ ' + L('aktywny', 'active') : '✓ ' + L('wyłączony', 'renounced')]);
    if (i.freeze_authority !== undefined) facts.push(['Freeze authority', i.freeze_authority ? '⚠️ ' + L('aktywny', 'active') : '✓ ' + L('wyłączony', 'renounced')]);
    if (i.gt_score != null) facts.push(['GT score', (+i.gt_score).toFixed(0) + '/100']);
    facts.push([L('Wiek', 'Age'), D.ageFrom(c.pairCreatedAt)]);
    facts.push(['DEX', c.dexId || '—']);
    return `${goldCard(c)}
      ${desc ? `<div class="cp-desc">${E(String(desc).slice(0, 600))}</div>` : `<div class="cp-desc mut">${L('Brak opisu.', 'No description.')}</div>`}
      <div class="cp-links">${links.join('') || `<span class="mut">${L('Brak linków', 'No links')}</span>`}</div>
      <div class="cp-fullca"><small class="mut">CA</small><span class="mono">${E(c.address)}</span><button type="button" class="cp-mini" data-copyca aria-label="${L('Kopiuj adres', 'Copy address')}">⧉</button></div>
      <div class="cp-facts">${facts.map(([k, v]) => `<div><small>${E(k)}</small><b>${E(v)}</b></div>`).join('')}</div>`;
  }
  const pairsCache = {};
  function loadPairs(c, root) {
    if (pairsCache[c.address] && Date.now() - pairsCache[c.address].t < 120000) return;
    getJson(DS + '/latest/dex/tokens/' + encodeURIComponent(c.address), 60000).then((d) => {
      pairsCache[c.address] = { t: Date.now(), pairs: ((d && d.pairs) || []).filter((p) => p.chainId === (c.chainId || 'solana')) };
      if (curC === c && localStorage.getItem(TAB_KEY) === 'pairs') { const b = root.querySelector('#cpTab'); if (b) { b.innerHTML = pairsHtml(c, pairsCache[c.address]); wireTab(c, b, root); } }
    }).catch(() => { const b = root.querySelector('#cpTab'); if (b && curC === c) b.innerHTML = `<div class="cp-empty mut">${L('DexScreener nie odpowiada.', 'DexScreener is not responding.')}</div>`; });
  }
  function pairsHtml(c, pc) {
    const ps = (pc.pairs || []).slice().sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
    if (!ps.length) return `<div class="cp-empty mut">${L('Brak par.', 'No pairs.')}</div>`;
    let main = c.pairAddress;
    try { const KP = window.KyvoPairs; if (KP && KP.best) { const b = KP.best(ps); if (b && b.pairAddress) main = b.pairAddress; } } catch (e) {}
    return ps.slice(0, 20).map((p) => {
      const m = p.pairAddress === main;
      return `<a class="pr${m ? ' main' : ''}" href="${E(p.url || 'https://dexscreener.com/' + p.chainId + '/' + p.pairAddress)}" target="_blank" rel="noopener noreferrer">
        <span class="pr-d"><b>${E(p.dexId)}</b> <span class="mut">${E((p.baseToken && p.baseToken.symbol) || '')}/${E((p.quoteToken && p.quoteToken.symbol) || '')}</span>${m ? ` <span class="badge live">${L('główna pula', 'main pool')}</span>` : ''}</span>
        <span class="pr-v"><small>${L('Płynność', 'Liquidity')}</small>${D.fmtUsd(p.liquidity && p.liquidity.usd)}</span>
        <span class="pr-v"><small>Vol 24h</small>${D.fmtUsd(p.volume && p.volume.h24)}</span></a>`;
    }).join('') + `<div class="cp-note mut">${L('Pary z DexScreener. Wykres i transakcje na żywo pokazują główną pulę.', 'Pairs from DexScreener. The chart and live trades use the main pool.')}</div>`;
  }
  function wireTab(c, box, root) {
    box.querySelectorAll('[data-cof]').forEach((b) => (b.onclick = () => { coFilter = b.dataset.cof; renderTab(c, root); }));
    box.querySelectorAll('[data-copyca]').forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(c.address); D.toast(L('Skopiowano CA', 'CA copied')); } catch (e) { D.toast(L('Nie udało się skopiować', 'Copy failed')); } }));
  }

  /* ---------- Alert sheet (reuses watchlist alerts) ---------- */
  function openAlert(c) {
    const I = window.KyvoInsights;
    if (!I || !I.addAlert) return;
    const old = document.querySelector('.cp-sheet'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'cp-sheet';
    const draw = () => {
      const al = I.alertsOf(c);
      const mc = c.mcap || 0;
      el.innerHTML = `<div class="cp-sh" role="dialog" aria-label="Alert"><div class="cp-shh"><b>🔔 Alert · ${E(c.symbol)}</b><button type="button" class="cp-ib" data-x aria-label="${L('Zamknij', 'Close')}">×</button></div>
        <div class="mut" style="font-size:12px;margin-bottom:8px">${L('Teraz MC', 'Now MC')} ${D.fmtUsd(mc)} · ${L('alerty działają, gdy Kyvo jest otwarte (watchlista).', 'alerts run while Kyvo is open (watchlist).')}</div>
        <div class="cp-qa">${mc ? [2, 5, 10].map((x) => `<button type="button" data-q="mcAbove:${Math.round(mc * x)}">MC ≥ ${D.fmtUsd(mc * x)} (${x}×)</button>`).join('') + `<button type="button" data-q="mcBelow:${Math.round(mc * 0.5)}">MC ≤ ${D.fmtUsd(mc * 0.5)} (−50%)</button>` : ''}<button type="button" data-q="pct:25">±25%</button></div>
        <div class="cp-af"><select data-t><option value="mcAbove">MC ≥</option><option value="mcBelow">MC ≤</option><option value="pct">${L('ruch ±%', 'move ±%')}</option></select><input data-v type="number" inputmode="decimal" min="0" placeholder="${L('np. 500000', 'e.g. 500000')}"><button type="button" class="cp-ok" data-save>${L('Zapisz', 'Save')}</button></div>
        ${al.length ? `<div class="cp-al">${al.map((a, i) => `<span class="achip${a.fired ? ' fired' : ''}">${a.fired ? '🔔 ' : ''}${E(a.label)} <button type="button" data-del="${i}" aria-label="${L('Usuń alert', 'Delete alert')}">×</button></span>`).join('')}</div>` : ''}
      </div>`;
      const add = (type, value) => { const r = I.addAlert(c, type, value); D.toast(r.msg); if (r.ok) { draw(); syncAll(); } };
      el.querySelector('[data-x]').onclick = () => el.remove();
      el.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { const [t, v] = b.dataset.q.split(':'); add(t, +v); }));
      el.querySelector('[data-save]').onclick = () => add(el.querySelector('[data-t]').value, parseFloat(el.querySelector('[data-v]').value));
      el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { I.removeAlert(c, +b.dataset.del); draw(); }));
    };
    const syncAll = () => document.querySelectorAll('#coinBody [data-watch-star]').forEach((b) => {
      const on = I.isWatched(D.keyOf(c));
      b.classList.toggle('on', on);
      b.textContent = b.classList.contains('cp-star') ? (on ? '★' : '☆') : on ? '★ ' + L('Obserwujesz', 'Watching') : '☆ ' + L('Obserwuj', 'Watch');
    });
    el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
    draw();
    document.body.appendChild(el);
  }

  window.KyvoCoinPage = {
    init(deps) { D = deps; loadPf(); },
    headerHtml, tabsHtml, ctaHtml, wire, onLive, openAlert, knownWallets, loadPf, pfCoin, isPump,
  };
})();
