/* Kyvo v8.14 👀 Tracker — follow public Solana wallets (top Ranking traders or any pasted PUBLIC address) and watch their swaps live.
   Data (free, public, no keys):
     * data/tracker_feed.json — server-side every ~4 min (tools/pump_tracker.py): pump.fun public /user-trades of the top ~60
       Ranking wallets (kolscan + pump.fun), coin info from DexScreener, cluster buys (≥2 top traders within 30 min), fresh-coin buys.
     * pasted wallets outside that set — read in the browser from a free public Solana RPC (publicnode, getSignaturesForAddress +
       getTransaction), only while this view is open, ~every 60 s, ≤ 4 new tx per wallet per poll; coin info from DexScreener.
   Gate (KYVO_TRACKER_CONFIG): free = follow 3 wallets, Premium = unlimited, 🏃 Runners (v8.14.1) = unlimited + phone push (≥3 top traders buy one coin in 30 min).
   The app NEVER asks for a private key or seed phrase — only a public address. Not financial advice. */
(function () {
  'use strict';
  const CFG = Object.assign({ enabled: true, freeFollows: 3, premiumPush: true, rpc: 'https://solana-rpc.publicnode.com', customPollSec: 60, customMaxTxPerPoll: 6 }, window.KYVO_TRACKER_CONFIG || {});
  const KEY = 'kyvo_tracker_v1';
  const DS = 'https://api.dexscreener.com/tokens/v1/solana/';
  const STABLE = new Set(['So11111111111111111111111111111111111111112', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB']);
  const L = (pl, en) => (window.KyvoI18n && window.KyvoI18n.isEn() ? en : pl);
  const E = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  let D = {};
  const isPrem = () => !!(window.KyvoPremium && window.KyvoPremium.isActive && window.KyvoPremium.isActive());
  const isRun = () => !!(window.KyvoPremium && window.KyvoPremium.isRunners && window.KyvoPremium.isRunners()); // v8.14.1: smart-money push = 🏃 Runners tier
  const short = (a) => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '');
  const usd = (n) => (D.fmtUsd ? D.fmtUsd(n) : '$' + Math.round(n));
  const mcS = (n) => (!n ? '—' : n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'K' : '$' + Math.round(n));
  const ago = (s) => { const d = Math.max(0, Date.now() / 1000 - s); return d < 60 ? Math.round(d) + 's' : d < 3600 ? Math.round(d / 60) + 'm' : d < 86400 ? Math.round(d / 3600) + 'h' : Math.round(d / 86400) + 'd'; };

  /* ---------- follows (localStorage) ---------- */
  function st() { try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); return { wallets: Array.isArray(s.wallets) ? s.wallets : [], seen: s.seen || 0 }; } catch (e) { return { wallets: [], seen: 0 }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  const list = () => st().wallets;
  const isFollowed = (a) => list().some((w) => w.address === a);
  const limit = () => (isPrem() ? Infinity : CFG.freeFollows);
  const validAddr = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
  function looksSecret(a) {
    const t = String(a || '').trim();
    if (/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(t)) return true;                // base58 secret key (~88 chars)
    if (/^\[\s*\d+(\s*,\s*\d+){20,}\s*\]$/.test(t)) return true;               // JSON byte array keypair
    if (t.split(/\s+/).filter((w) => /^[a-z]+$/.test(w)).length >= 12) return true; // seed phrase
    return false;
  }
  function follow(w, silent) {
    if (!w || !validAddr(w.address)) { if (!silent) toast(L('To nie jest publiczny adres Solany', 'Not a public Solana address')); return false; }
    const s = st();
    if (s.wallets.some((x) => x.address === w.address)) return true;
    if (s.wallets.length >= limit()) {
      toast(L(`Darmowy plan: max ${CFG.freeFollows} obserwowane portfele · Premium = bez limitu · 🏃 Runners = + push smart money`, `Free plan: max ${CFG.freeFollows} followed wallets · Premium = unlimited · 🏃 Runners = + smart money push`));
      if (D.openPremium) setTimeout(() => D.openPremium('premium'), 900);
      return false;
    }
    s.wallets.push({ address: w.address, name: (w.name || '').slice(0, 32) || short(w.address), img: w.img || null, src: w.src || null, url: w.url || null, custom: !!w.custom, addedAt: Date.now() });
    save(s);
    if (!silent) toast(L('👀 Obserwujesz ', '👀 Following ') + (w.name || short(w.address)));
    refreshButtons();
    return true;
  }
  function unfollow(a) { const s = st(); s.wallets = s.wallets.filter((w) => w.address !== a); save(s); refreshButtons(); }
  function toggle(w) { if (isFollowed(w.address)) { unfollow(w.address); toast(L('Przestajesz obserwować', 'Unfollowed')); return false; } return follow(w); }
  function toast(m) { if (D.toast) D.toast(m); }

  /* follow button used on Ranking rows, chart marker popups and coin-page Callouts people */
  // v8.15: line icons instead of the 👀 emoji (Ranking rows, popups, Callouts)
  const CHK = '<svg class="kyi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const fLabel = (on) => (on ? CHK : ((window.KyvoIcons && window.KyvoIcons.eye) || '👀')) + `<span>${on ? L('Obserwujesz', 'Following') : L('Obserwuj', 'Follow')}</span>`;
  function btnHtml(w, cls) {
    if (!CFG.enabled || !w || !validAddr(w.address || '')) return '';
    const on = isFollowed(w.address);
    return `<button type="button" class="trk-f${on ? ' on' : ''}${cls ? ' ' + cls : ''}" data-noop="1" data-fw="${E(w.address)}" data-fn="${E(w.name || '')}" data-fi="${E(w.img || '')}" data-fs="${E(w.src || '')}" title="${on ? L('Obserwujesz — kliknij, aby przestać', 'Following — tap to unfollow') : L('Obserwuj w Trackerze', 'Follow in Tracker')}" aria-label="${on ? L('Obserwujesz', 'Following') : L('Obserwuj w Trackerze', 'Follow in Tracker')}">${fLabel(on)}</button>`;
  }
  function refreshButtons() {
    document.querySelectorAll('.trk-f[data-fw]').forEach((b) => {
      const on = isFollowed(b.dataset.fw);
      b.classList.toggle('on', on);
      b.innerHTML = fLabel(on);
    });
  }
  // one delegated handler for every follow button anywhere in the app
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.trk-f[data-fw]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    toggle({ address: b.dataset.fw, name: b.dataset.fn, img: b.dataset.fi, src: b.dataset.fs });
    if (root && root.isConnected) render();
  }, true);

  /* ---------- server feed ---------- */
  let feed = null, feedAt = 0;
  async function loadFeed(force) {
    if (feed && !force && Date.now() - feedAt < 60000) return feed;
    try {
      const r = await fetch('data/tracker_feed.json?t=' + Math.floor(Date.now() / 60000));
      if (r.ok) { feed = await r.json(); feedAt = Date.now(); }
    } catch (e) {}
    return feed || (feed = { wallets: [], trades: [], coins: {}, clusters: [], fresh: [], _none: true });
  }

  /* ---------- custom wallets via free public RPC (browser) ---------- */
  const cust = { trades: new Map(), seen: new Set(), coins: {}, errs: 0, at: 0, busy: false, last: {}, stat: {}, q: {} };
  try { (JSON.parse(sessionStorage.getItem('kyvo_trk_cust') || '[]') || []).forEach((t) => { cust.trades.set(t.tx + t.w, t); cust.seen.add(t.tx); }); } catch (e) {}
  let rpcId = 1;
  async function rpc(method, params) {
    const r = await fetch(CFG.rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }) });
    if (!r.ok) throw new Error('RPC ' + r.status);
    const j = await r.json();
    if (j.error) throw new Error('RPC ' + (j.error.code || 'err'));
    return j.result;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function parseSwap(tx, w, solPx) {
    if (!tx || !tx.meta || tx.meta.err) return null;
    const keys = (tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys) || [];
    const k0 = keys[0] && (keys[0].pubkey || keys[0]);
    if (k0 !== w) return null;                                     // only swaps the wallet signed itself
    let sol = (tx.meta.postBalances[0] - tx.meta.preBalances[0] + (tx.meta.fee || 0)) / 1e9;
    const d = {};
    const add = (b, sgn) => { if (b.owner !== w) return; const v = +(b.uiTokenAmount && b.uiTokenAmount.uiAmount) || 0; d[b.mint] = (d[b.mint] || 0) + sgn * v; };
    (tx.meta.preTokenBalances || []).forEach((b) => add(b, -1));
    (tx.meta.postTokenBalances || []).forEach((b) => add(b, 1));
    if (d['So11111111111111111111111111111111111111112']) sol += d['So11111111111111111111111111111111111111112'];
    const toks = Object.keys(d).filter((m) => !STABLE.has(m) && Math.abs(d[m]) > 0);
    if (toks.length !== 1 || Math.abs(sol) < 0.01) return null;
    const m = toks[0], q = d[m];
    if ((q > 0) === (sol > 0)) return null;                         // not a swap (both in or both out)
    const u = Math.abs(sol) * (solPx || 0);
    return { w, m, buy: q > 0, sol: +Math.abs(sol).toFixed(3), usd: +u.toFixed(2), px: u && Math.abs(q) ? u / Math.abs(q) : null, at: tx.blockTime || 0, tx: tx.transaction.signatures[0], rpc: true };
  }
  async function pollCustom(ws) {
    if (cust.busy || !ws.length) return;
    cust.busy = true;
    const solPx = (D.getLeaderboard && (D.getLeaderboard() || {}).sol_price_usd) || 0;
    let ok = 0;
    try {
      for (const w of ws.slice(0, 12)) {
        if (!root || !root.isConnected) break;
        // busy / spammed wallets get thousands of FAILED txs from other signers — page (≤ 2 × 1000 sigs, 1 cheap call each)
        // until successful ones show up; later polls only read signatures newer than the newest one seen ("until")
        let sigs = [], before = null, failed = false;
        const until = cust.last[w.address];
        for (let pg = 0; pg < (until ? 1 : 2); pg++) {
          let s;
          try { s = await rpc('getSignaturesForAddress', [w.address, Object.assign({ limit: until ? 200 : 1000 }, before ? { before } : {}, until ? { until } : {})]); ok++; } catch (e) { cust.errs++; failed = true; break; }
          if (!s || !s.length) break;
          if (!pg && s[0]) cust.last[w.address] = s[0].signature;
          sigs = sigs.concat(s.filter((x) => !x.err));
          before = s[s.length - 1].signature;
          if (sigs.length >= CFG.customMaxTxPerPoll || Date.now() / 1000 - (s[s.length - 1].blockTime || 0) > 12 * 3600) break;
          await sleep(300);
        }
        if (failed) { await sleep(800); continue; }
        cust.stat[w.address] = { at: Date.now(), ok: sigs.length };
        // newest first, then the older backlog from earlier polls (spam airdrops signed by others are skipped after one look)
        const q = (cust.q[w.address] = sigs.concat(cust.q[w.address] || []).filter((s, i, a) => !cust.seen.has(s.signature) && Date.now() / 1000 - (s.blockTime || 0) < 12 * 3600 && a.findIndex((y) => y.signature === s.signature) === i).slice(0, 400));
        const fresh = q.splice(0, CFG.customMaxTxPerPoll);
        for (const s of fresh) {
          cust.seen.add(s.signature);
          await sleep(250);
          try {
            const tx = await rpc('getTransaction', [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 1, commitment: 'confirmed' }]);
            const t = parseSwap(tx, w.address, solPx);
            if (t) cust.trades.set(t.tx + t.w, t);
          } catch (e) { cust.errs++; cust.seen.delete(s.signature); }
        }
        await sleep(300);
      }
      const need = [...new Set([...cust.trades.values()].map((t) => t.m))].filter((m) => !cust.coins[m] && !(feed && feed.coins && feed.coins[m]));
      for (let i = 0; i < need.length; i += 30) {
        try {
          const r = await fetch(DS + need.slice(i, i + 30).join(','));
          const ps = r.ok ? await r.json() : [];
          (ps || []).forEach((p) => {
            const m = p.baseToken && p.baseToken.address, liq = (p.liquidity && p.liquidity.usd) || 0;
            if (!m || (cust.coins[m] && cust.coins[m].liq >= liq)) return;
            cust.coins[m] = { s: p.baseToken.symbol, n: p.baseToken.name, img: p.info && p.info.imageUrl, mc: p.marketCap || p.fdv, px: +p.priceUsd || 0, pair: p.pairAddress, born: p.pairCreatedAt ? Math.floor(p.pairCreatedAt / 1000) : null, liq };
          });
        } catch (e) {}
      }
      try { sessionStorage.setItem('kyvo_trk_cust', JSON.stringify([...cust.trades.values()].sort((a, b) => b.at - a.at).slice(0, 150))); } catch (e) {}
    } finally { cust.busy = false; cust.at = Date.now(); cust.ok = ok; }
  }

  /* ---------- view ---------- */
  let root = null, tab = localStorage.getItem('kyvo_trk_tab') || 'mine', timer = null, adding = false;
  function coinOf(m) { return (feed && feed.coins && feed.coins[m]) || cust.coins[m] || {}; }
  function mcAt(t) { if (t.mc) return t.mc; const c = coinOf(t.m); return t.px && c.mc && c.px ? t.px * (c.mc / c.px) : null; }
  function walletInfo(a) {
    const f = list().find((w) => w.address === a);
    const s = feed && (feed.wallets || []).find((w) => w.address === a);
    return Object.assign({ address: a, name: short(a) }, s || {}, f ? { name: f.name || (s && s.name), img: f.img || (s && s.img) } : {});
  }
  function av(w, sz) {
    sz = sz || 30;
    return w.img ? `<img class="trk-av" src="${E(w.img)}" width="${sz}" height="${sz}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
      : `<span class="trk-av trk-avl" style="width:${sz}px;height:${sz}px">${E((w.name || '?')[0].toUpperCase())}</span>`;
  }
  function coinImg(c, m) {
    return c.img ? `<img class="trk-ci" src="${E(c.img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="trk-ci trk-cil">${E(((c.s || m || '?')[0] || '?').toUpperCase())}</span>`;
  }
  function allTrades() {
    const m = new Map();
    ((feed && feed.trades) || []).forEach((t) => m.set(t.tx + t.w, t));
    cust.trades.forEach((t, k) => { if (!m.has(k)) m.set(k, t); });
    return [...m.values()].sort((a, b) => b.at - a.at);
  }
  function freshSet() {
    const s = new Map();
    ((feed && feed.fresh) || []).forEach((f) => s.set(f.tx + f.w, f));
    // custom-wallet trades: first buy into a coin whose pool was < 60 min old
    const firsts = new Map();
    [...cust.trades.values()].sort((a, b) => a.at - b.at).forEach((t) => { if (t.buy && !firsts.has(t.w + t.m)) firsts.set(t.w + t.m, t); });
    firsts.forEach((t) => { const b = coinOf(t.m).born; if (b && t.at - b >= 0 && t.at - b <= 3600) s.set(t.tx + t.w, { age: t.at - b }); });
    return s;
  }
  function clustersFor(trs, mine) {
    // clusters among the trades shown (followed wallets) — ≥2 distinct wallets buying the same coin within 30 min
    const by = {};
    trs.filter((t) => t.buy).sort((a, b) => a.at - b.at).forEach((t) => (by[t.m] = by[t.m] || []).push(t));
    const out = [];
    Object.keys(by).forEach((m) => {
      const bs = by[m]; let best = null;
      for (let i = 0; i < bs.length; i++) {
        const win = bs.slice(i).filter((b) => b.at - bs[i].at <= 1800);
        const ws = [...new Set(win.map((b) => b.w))];
        if (ws.length >= 2 && (!best || ws.length > best.wallets.length)) best = { m, wallets: ws, first: win[0].at, last: win[win.length - 1].at, usd: win.reduce((s, b) => s + (b.usd || 0), 0) };
      }
      if (best) out.push(best);
    });
    if (!mine && feed && feed.clusters) feed.clusters.forEach((c) => { if (!out.some((o) => o.m === c.m)) out.push(c); });
    return out.sort((a, b) => b.wallets.length - a.wallets.length || b.last - a.last);
  }
  function coinLinks(m) {
    const c = coinOf(m);
    const pf = /pump$/.test(m) || /^pump/.test(c.dex || '');
    return `<a class="trk-lk" href="#coin/solana:${E(m)}" title="Kyvo">📈</a>${pf ? `<a class="trk-lk" href="https://pump.fun/coin/${E(m)}" target="_blank" rel="noopener" title="pump.fun">💊</a>` : `<a class="trk-lk" href="https://dexscreener.com/solana/${E(c.pair || m)}" target="_blank" rel="noopener" title="DexScreener">DS</a>`}`;
  }
  function clusterHtml(c, mine) {
    const co = coinOf(c.m), n = c.wallets.length, hot = n >= 3;
    const names = c.wallets.slice(0, 4).map((a) => walletInfo(a));
    const mins = Math.max(1, Math.round((c.last - c.first) / 60));
    return `<div class="trk-cl${hot ? ' hot' : ''}">
      <a class="trk-clc" href="#coin/solana:${E(c.m)}">${coinImg(co, c.m)}<b>$${E(co.s || short(c.m))}</b></a>
      <div class="trk-clt"><b>${hot ? '🔥 ' : '👥 '}${n} ${mine ? L('obserwowanych kupiło', 'followed wallets bought') : L('top traderów kupiło', 'top traders bought')}</b>
        <small>${L('w', 'within')} ${mins} min · ${usd(c.usd)} · MC ${mcS(co.mc)} · ${ago(c.last)} ${L('temu', 'ago')}</small>
        <span class="trk-clw">${names.map((w) => av(w, 18)).join('')}<small>${E(names.map((w) => w.name).join(', '))}${n > 4 ? ' +' + (n - 4) : ''}</small></span></div>
      <span class="trk-cll">${coinLinks(c.m)}</span></div>`;
  }
  function rowHtml(t, fresh) {
    const w = walletInfo(t.w), c = coinOf(t.m), f = fresh.get(t.tx + t.w), mc = mcAt(t), big = (t.usd || 0) >= 2000;
    return `<div class="trk-row ${t.buy ? 'b' : 's'}${big ? ' big' : ''}${f ? ' fr' : ''}">
      ${av(w, 30)}
      <div class="trk-who"><b>${E(w.name)}</b><small>${t.buy ? `<span class="trk-sd b">▲ ${L('KUPNO', 'BUY')}</span>` : `<span class="trk-sd s">▼ ${L('SPRZEDAŻ', 'SELL')}</span>`} · ${ago(t.at)}</small></div>
      <a class="trk-coin" href="#coin/solana:${E(t.m)}">${coinImg(c, t.m)}<span><b>$${E(c.s || short(t.m))}</b><small>MC ${mcS(mc)}</small></span></a>
      <div class="trk-usd"><b class="${t.buy ? 'up' : 'dn'}">${t.usd ? usd(t.usd) : t.sol + ' SOL'}</b>${f ? `<small class="trk-fr">🌱 ${L('świeży', 'fresh')} ${Math.round((f.age || 0) / 60)}m</small>` : `<small>${t.sol ? t.sol + ' SOL' : ''}</small>`}</div>
      <span class="trk-lks">${coinLinks(t.m)}<a class="trk-lk" href="https://solscan.io/tx/${E(t.tx)}" target="_blank" rel="noopener" title="Solscan">↗</a></span>
    </div>`;
  }
  function suggestions() {
    const lb = (D.getLeaderboard && D.getLeaderboard()) || {};
    const fw = (feed && feed.wallets) || [];
    const base = fw.length ? fw : (lb.leaders || []).slice(0, 20).map((x) => ({ address: x.address, name: x.name, img: x.avatar, src: x.sources }));
    const act = {};
    ((feed && feed.trades) || []).forEach((t) => { act[t.w] = (act[t.w] || 0) + 1; });
    return base.filter((w) => w.address && !isFollowed(w.address)).sort((a, b) => (act[b.address] || 0) - (act[a.address] || 0)).slice(0, 12);
  }
  function srcBadge(src) {
    const s = Array.isArray(src) ? src : src ? [src] : [];
    return s.map((x) => (x === 'pumpfun' ? '<span class="srcb pf">pump.fun</span>' : x === 'kolscan' ? '<span class="srcb ks">kolscan</span>' : '')).join('');
  }
  function render() {
    if (!root) return;
    const keep = adding ? { a: (root.querySelector('#trkAddr') || {}).value, n: (root.querySelector('#trkNick') || {}).value, f: document.activeElement && document.activeElement.id } : null;
    const ws = list(), lim = limit(), prem = isPrem();
    const followed = new Set(ws.map((w) => w.address));
    const trs = allTrades();
    const mineT = trs.filter((t) => followed.has(t.w));
    if (tab === 'mine' && !ws.length) tab = 'top';
    const shown = (tab === 'mine' ? mineT : trs).slice(0, 80);
    const fresh = freshSet();
    const cls = clustersFor(tab === 'mine' ? mineT : trs, tab === 'mine').filter((c) => Date.now() / 1000 - c.last < 6 * 3600).slice(0, 6);
    const fr = shown.filter((t) => fresh.has(t.tx + t.w)).length;
    const tracked = new Set(((feed && feed.wallets) || []).map((w) => w.address));
    const customN = ws.filter((w) => !tracked.has(w.address)).length;
    const upd = feed && feed.updated_at ? ago(Date.parse(feed.updated_at) / 1000) : null;
    root.innerHTML = `
      ${D.segHtml ? D.segHtml('tracker') : ''}
      <div class="h">👀 Tracker <span class="badge live">live</span></div>
      <div class="sub">${L('Obserwuj portfele top traderów (kolscan + pump.fun) albo wklej dowolny publiczny adres Solany i patrz, co kupują i sprzedają.', 'Follow top traders’ wallets (kolscan + pump.fun) or paste any public Solana address and see what they buy and sell.')}</div>
      <div class="card trk-me">
        <div class="trk-meh"><b>${L('Obserwowane', 'Following')} ${ws.length}${lim === Infinity ? '' : '/' + lim}</b>
          <span class="mut">${prem ? (isRun() ? '🏃 Runners · ' + L('bez limitu + push', 'unlimited + push') : '✦ Premium · ' + L('bez limitu', 'unlimited') + ` · <a href="#premium" class="trk-up">🏃 Runners: + push</a>`) : L('Darmowy plan', 'Free plan') + ` · <a href="#premium" class="trk-up">✦ Premium: ${L('bez limitu', 'unlimited')} · 🏃 Runners: + push</a>`}</span>
          <button type="button" class="pill" id="trkAdd">${adding ? '×' : '+ ' + L('Dodaj adres', 'Add address')}</button></div>
        ${adding ? `<form class="trk-form" id="trkForm" autocomplete="off">
          <input id="trkAddr" inputmode="text" spellcheck="false" autocapitalize="off" placeholder="${L('Publiczny adres portfela Solany', 'Public Solana wallet address')}" maxlength="120">
          <input id="trkNick" placeholder="${L('Nick (opcjonalnie)', 'Nickname (optional)')}" maxlength="32">
          <button class="pill on" type="submit">👀 ${L('Obserwuj', 'Follow')}</button>
          <div class="trk-warn">🔒 ${L('Tylko PUBLICZNY adres. Kyvo nigdy nie prosi o klucz prywatny ani frazę seed — nie wklejaj ich nigdzie.', 'PUBLIC address only. Kyvo never asks for a private key or seed phrase — never paste them anywhere.')}</div>
        </form>` : ''}
        ${ws.length ? `<div class="trk-chips">${ws.map((w) => `<span class="trk-chip">${av(walletInfo(w.address), 20)}<b>${E(w.name)}</b>${tracked.has(w.address) ? '' : `<small title="${L('Czytane z publicznego RPC Solany w przeglądarce', 'Read from a public Solana RPC in your browser')}">RPC${cust.stat[w.address] && !cust.stat[w.address].ok ? ' · ' + L('brak udanych tx', 'no successful tx') : ''}</small>`}<a href="https://pump.fun/profile/${E(w.address)}" target="_blank" rel="noopener" title="pump.fun">↗</a><button type="button" data-unf="${E(w.address)}" aria-label="${L('Przestań obserwować', 'Unfollow')}">×</button></span>`).join('')}</div>`
          : `<div class="mut" style="font-size:12px;margin-top:6px">${L('Nie obserwujesz jeszcze nikogo — zacznij od sugerowanych top traderów poniżej.', 'You are not following anyone yet — start with the suggested top traders below.')}</div>`}
      </div>
      <div class="rk-per trk-tabs" id="trkTabs">
        <button type="button" data-tt="mine" class="${tab === 'mine' ? 'on' : ''}">👀 ${L('Obserwowani', 'Following')} (${mineT.length})</button>
        <button type="button" data-tt="top" class="${tab === 'top' ? 'on' : ''}">🏆 ${L('Top traderzy', 'Top traders')} (${(feed && feed.wallets || []).length})</button>
      </div>
      ${cls.length ? `<div class="trk-h">👥 ${L('Wspólne zakupy (≥2 portfele w 30 min)', 'Cluster buys (≥2 wallets within 30 min)')}</div>${cls.map((c) => clusterHtml(c, tab === 'mine')).join('')}` : ''}
      <div class="trk-h">⚡ ${L('Na żywo', 'Live')} ${fr ? `<span class="trk-frb">🌱 ${fr} ${L('pierwszych zakupów świeżych coinów', 'first buys into fresh coins')}</span>` : ''}</div>
      <div class="card trk-feed">${shown.length ? shown.map((t) => rowHtml(t, fresh)).join('')
        : `<div class="empty" style="padding:18px 8px">${tab === 'mine' ? L('Brak transakcji obserwowanych portfeli w ostatnich 12 h.', 'No trades from followed wallets in the last 12 h.') + (customN ? '<br><small class="mut">' + L('Czytam adresy z publicznego RPC…', 'Reading addresses from a public RPC…') + '</small>' : '') : feed && feed._none ? L('Feed trackera jeszcze nie jest dostępny — pojawi się po pierwszym przebiegu serwera.', 'Tracker feed not available yet — it appears after the first server run.') : L('Brak transakcji w ostatnich 12 h.', 'No trades in the last 12 h.')}</div>`}</div>
      <div class="trk-h">💡 ${L('Sugerowani (top Ranking)', 'Suggested (top Ranking)')}</div>
      <div class="card trk-sug">${suggestions().map((w) => `<div class="trk-sr">${av(w, 28)}<a class="trk-sn" href="#trader/${E(encodeURIComponent((((D.getLeaderboard && D.getLeaderboard()) || {}).leaders || []).find((x) => x.address === w.address)?.id || w.address))}"><b>${E(w.name || short(w.address))}</b><small>${srcBadge(w.src)}</small></a>${btnHtml(w)}</div>`).join('') || `<div class="mut" style="font-size:12px">${L('Obserwujesz już wszystkich sugerowanych.', 'You already follow every suggestion.')}</div>`}</div>
      <div class="mut trk-note">${L(
        `Źródła (darmowe, publiczne): top ~60 portfeli z Rankingu — publiczne transakcje pump.fun odczytywane po stronie serwera co ~4 min${upd ? ` (ostatnio ${upd} temu)` : ''}; inne wklejone adresy — publiczny RPC Solany w przeglądarce co ~${CFG.customPollSec} s, tylko gdy ten ekran jest otwarty${cust.errs ? ' (RPC chwilowo ogranicza zapytania)' : ''}. Portfele zasypane tysiącami nieudanych transakcji (spam/boty) mogą nie pokazać swapów przez darmowe RPC. MC przy transakcji jest przybliżone. ${CFG.premiumPush ? 'Premium: push na telefon, gdy ≥3 top traderów kupi ten sam coin w 30 min. ' : ''}Kyvo nigdy nie prosi o klucze. To nie jest porada finansowa.`,
        `Sources (free, public): top ~60 Ranking wallets — public pump.fun trades read server-side every ~4 min${upd ? ` (last ${upd} ago)` : ''}; other pasted addresses — public Solana RPC in your browser every ~${CFG.customPollSec} s, only while this screen is open${cust.errs ? ' (RPC is rate-limiting right now)' : ''}. Wallets flooded with thousands of failed transactions (spam/bots) may show no swaps via the free RPC. MC at trade is approximate. ${CFG.premiumPush ? 'Premium: phone push when ≥3 top traders buy the same coin within 30 min. ' : ''}Kyvo never asks for keys. Not financial advice.`)}</div>`;
    if (D.wireSeg) D.wireSeg(root);
    if (keep) { const ia = root.querySelector('#trkAddr'), ib = root.querySelector('#trkNick'); if (ia && keep.a) ia.value = keep.a; if (ib && keep.n) ib.value = keep.n; if (keep.f && root.querySelector('#' + keep.f)) root.querySelector('#' + keep.f).focus(); }
    root.querySelector('#trkAdd').onclick = () => { adding = !adding; render(); if (adding) setTimeout(() => { const i = root.querySelector('#trkAddr'); if (i) i.focus(); }, 30); };
    const fm = root.querySelector('#trkForm');
    if (fm) fm.onsubmit = (e) => {
      e.preventDefault();
      const a = fm.querySelector('#trkAddr').value.trim(), n = fm.querySelector('#trkNick').value.trim();
      if (looksSecret(a)) { fm.querySelector('#trkAddr').value = ''; toast(L('⛔ To wygląda na klucz prywatny / seed! Nie wklejaj go nigdzie. Kyvo potrzebuje tylko publicznego adresu.', '⛔ That looks like a private key / seed! Never paste it anywhere. Kyvo only needs a public address.')); return; }
      if (!validAddr(a)) { toast(L('Nieprawidłowy adres Solany (32–44 znaki base58)', 'Invalid Solana address (32–44 base58 chars)')); return; }
      const s = feed && (feed.wallets || []).find((w) => w.address === a);
      if (follow({ address: a, name: n || (s && s.name) || short(a), img: s && s.img, src: s ? s.src : null, custom: !s })) { adding = false; tab = 'mine'; localStorage.setItem('kyvo_trk_tab', tab); render(); tick(true); }
    };
    root.querySelectorAll('[data-unf]').forEach((b) => (b.onclick = () => { unfollow(b.dataset.unf); render(); }));
    root.querySelectorAll('#trkTabs [data-tt]').forEach((b) => (b.onclick = () => { tab = b.dataset.tt; localStorage.setItem('kyvo_trk_tab', tab); render(); }));
  }
  async function tick(force) {
    if (!root || !root.isConnected || document.hidden) return;
    await loadFeed(force);
    render();
    const tracked = new Set(((feed && feed.wallets) || []).map((w) => w.address));
    const custom = list().filter((w) => !tracked.has(w.address));
    if (custom.length && (force || Date.now() - cust.at > CFG.customPollSec * 1000 - 2000)) { await pollCustom(custom); if (root && root.isConnected) render(); }
  }
  function show(el) {
    root = el;
    if (!CFG.enabled) { el.innerHTML = (D.segHtml ? D.segHtml('tracker') : '') + `<div class="empty">${L('Tracker jest wyłączony.', 'Tracker is turned off.')}</div>`; if (D.wireSeg) D.wireSeg(el); return; }
    render();
    tick(true);
    clearInterval(timer);
    timer = setInterval(() => { if (!root || !root.isConnected || !root.closest('.scr.on')) { clearInterval(timer); timer = null; return; } tick(false); }, 20000);
  }
  function init(deps) { D = deps || {}; }
  window.KyvoTracker = { init, show, btnHtml, isFollowed, follow, unfollow, toggle, list, enabled: () => !!CFG.enabled, _parseSwap: parseSwap, _looksSecret: looksSecret };
})();
