/* Kyvo v8.12 🥇 Gold — coin DD like trader Orangie's research bot ("Memecoins + Grok AI", YouTube 2026-10).
   1) "Sprawdź coin": paste a CA or ticker → 🥇 Gold / 🟡 Hazard / 🔴 Trzymaj się z daleka + plain reasons
      (all public, free, CORS-open APIs called from this browser: DexScreener, GeckoTerminal, RugCheck; verdict = gold-rules.js).
   2) Gold feed: DD cards of hot coins computed on the server (tools/gold.py → data/gold.json, every ~5 min) incl. catalysts
      (Google News article count + trend, tracked tweets) — Premium, 1 free card per Warsaw day.
   3) 🔔 Gold alerts: server push for Gold-feed coins (price ±15–20 %, vamp > $500K MC, new article) + in-app alerts for YOUR ⭐ watchlist
      (price ±15 %, vamp > $500K) while Kyvo is open. Premium.
   Client-side gate (static PWA, public data) — bypassable by a technical user, same as the Runner gate. Not financial advice. */
(function () {
  'use strict';
  const CFG = Object.assign({ enabled: true, checkerFreePerDay: 3, feedFreeCards: 1, alertsPremium: true, watchPriceMovePct: 15, watchVampMc: 500000 }, window.KYVO_GOLD_CONFIG || {});
  const DS = 'https://api.dexscreener.com', GT = 'https://api.geckoterminal.com/api/v2', RC = 'https://api.rugcheck.xyz/v1/tokens/', GP = 'https://api.gopluslabs.io/api/v1/';
  const CURVE_SOL = 85;
  const CHK_KEY = 'kyvo_gold_chk_v1', FREE_KEY = 'kyvo_gold_free_v1', WB_KEY = 'kyvo_gold_wb_v1', LAST_KEY = 'kyvo_gold_last_v1';
  let D = null, feed = null, feedAt = 0, feedBusy = null, lastRes = null, busy = false, rootEl = null, pendingOpen = null;
  const EN = () => !!(window.KyvoI18n && window.KyvoI18n.isEn());
  const L2 = (pl, en) => (EN() ? en : pl);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const warsawDay = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const isPrem = () => { try { return !!(window.KyvoPremium && window.KyvoPremium.isActive()); } catch (e) { return false; } };
  const usd = (v) => (D && D.fmtUsd ? D.fmtUsd(v) : v == null ? '?' : '$' + Math.round(v));
  const pct = (v) => (v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '') + (Math.abs(v) >= 100 ? Math.round(v) : (+v).toFixed(1)) + '%');
  const pcls = (v) => (v == null ? 'mut' : v >= 0 ? 'up' : 'dn');
  function ago(ms) {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 90) return L2('przed chwilą', 'just now');
    if (s < 3600) return Math.round(s / 60) + ' min' + L2(' temu', ' ago');
    if (s < 86400) return Math.round(s / 3600) + ' h' + L2(' temu', ' ago');
    return Math.round(s / 86400) + L2(' d temu', ' d ago');
  }
  const ageLbl = (h) => (h == null ? '?' : h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : h < 48 ? Math.round(h) + ' h' : Math.round(h / 24) + ' d');
  async function getJson(url, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), ms || 15000) : null;
    try { const r = await fetch(url, { signal: ctl ? ctl.signal : undefined, headers: { accept: 'application/json' } }); if (!r.ok) return null; return await r.json(); }
    catch (e) { return null; } finally { if (t) clearTimeout(t); }
  }
  let gtLast = 0;
  async function gt(path) {   // GeckoTerminal public API ≈ 30 req/min per IP → space calls
    const w = 1300 - (Date.now() - gtLast); if (w > 0) await new Promise((r) => setTimeout(r, w));
    gtLast = Date.now(); return getJson(GT + path, 15000);
  }
  const LV = {
    gold: { ic: '🥇', pl: 'Gold', en: 'Gold', sub: ['wygląda na prawdziwy coin', 'looks like a real coin'], cls: 'g-gold' },
    hazard: { ic: '🟡', pl: 'Hazard', en: 'Gamble', sub: ['wysokie ryzyko — tylko mała kwota', 'high risk — small size only'], cls: 'g-haz' },
    avoid: { ic: '🔴', pl: 'Trzymaj się z daleka', en: 'Stay away', sub: ['czerwone flagi', 'red flags'], cls: 'g-bad' },
  };
  const RIC = { bad: '⛔', warn: '⚠️', ok: '✅', info: 'ℹ️' };

  /* ---------------- data ---------------- */
  async function loadFeed(force) {
    if (!force && feed && Date.now() - feedAt < 60000) return feed;
    if (feedBusy) return feedBusy;
    feedBusy = getJson('data/gold.json?t=' + Math.floor(Date.now() / 60000), 15000).then((d) => { if (d && Array.isArray(d.cards)) { feed = d; feedAt = Date.now(); } feedBusy = null; return feed; });
    return feedBusy;
  }
  function kolWallets() {
    const out = {};
    try { for (const l of ((D.getLeaderboard && D.getLeaderboard()) || {}).leaders || []) if (l.address && l.handle) out[l.address] = l.handle; } catch (e) {}
    return out;
  }
  const isAddr = (q) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q) || /^0x[0-9a-fA-F]{40}$/.test(q);
  function bestPair(pairs, addr) {
    // v8.13: shared rule (pairs.js) — exact CA, main pool by liquidity, curve pair only while not migrated
    const ok = (pairs || []).filter((p) => p && p.baseToken && ['solana', 'bsc'].includes(p.chainId) && (!addr || String(p.baseToken.address).toLowerCase() === addr.toLowerCase()));
    if (!ok.length) return null;
    const bm = window.KyvoPairs.bestMap(ok);
    return Object.values(bm).filter(Boolean).sort((a, b) => window.KyvoPairs.liq(b) - window.KyvoPairs.liq(a) || ((b.volume || {}).h24 || 0) - ((a.volume || {}).h24 || 0))[0] || null;
  }
  async function resolve(q) {
    q = String(q || '').trim().replace(/^\$/, '');
    const m = q.match(/(?:dexscreener\.com|pump\.fun\/coin|gmgn\.ai\/[a-z]+\/token|birdeye\.so\/token)\/(?:[a-z]+\/)?([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})/i);
    if (m) q = m[1];
    if (!q) return { err: L2('Wklej CA albo ticker.', 'Paste a CA or a ticker.') };
    if (isAddr(q)) {
      const d = await getJson(DS + '/latest/dex/tokens/' + q, 15000);
      let p = bestPair(d && d.pairs, q);
      if (!p) { const d2 = await getJson(DS + '/latest/dex/pairs/solana/' + q, 15000); p = bestPair(d2 && (d2.pairs || (d2.pair ? [d2.pair] : []))); }
      return p ? { pair: p } : { err: L2('Nie znalazłem tego CA na DexScreener (Solana / BSC).', 'Could not find this CA on DexScreener (Solana / BSC).') };
    }
    const d = await getJson(DS + '/latest/dex/search?q=' + encodeURIComponent(q), 15000);
    const same = ((d && d.pairs) || []).filter((p) => ['solana', 'bsc'].includes(p.chainId) && String((p.baseToken || {}).symbol || '').toLowerCase() === q.toLowerCase());
    if (!same.length) return { err: L2(`Brak coina $${q} na Solanie / BSC.`, `No $${q} coin on Solana / BSC.`) };
    const byTok = {}, vol = {};
    for (const p of same) { const a = p.baseToken.address; vol[a] = (vol[a] || 0) + ((p.volume || {}).h24 || 0); if (!byTok[a] || ((p.liquidity || {}).usd || 0) > ((byTok[a].liquidity || {}).usd || 0)) byTok[a] = p; }
    // rank by real trading (24 h volume over all pools of the token), not MC / liquidity — fake copies show a huge MC
    // and even "$50M liquidity" on a pool that trades $2 a day
    const w = (p) => vol[p.baseToken.address] + Math.min((p.liquidity || {}).usd || 0, 2e5) * 0.1;
    const list = Object.values(byTok).sort((a, b) => w(b) - w(a));
    // v8.13: a search answer can hold only part of a coin's pools (often just the dead pump.fun curve pair) → full pair list by CA
    try {
      const top = list[0];
      const d2 = await getJson(DS + '/latest/dex/tokens/' + top.baseToken.address, 15000);
      const p2 = bestPair(d2 && d2.pairs, top.baseToken.address);
      if (p2 && p2.chainId === top.chainId) list[0] = p2;
    } catch (e) {}
    // v8.13: alternatives only if they are real coins (some liquidity or trading, an MC) — not dust pairs showing "—" / "$1"
    const realAlt = (p) => (p.marketCap || p.fdv || 0) >= 1000 && (((p.liquidity || {}).usd || 0) >= 1000 || vol[p.baseToken.address] >= 20000);
    return { pair: list[0], alts: list.slice(1).filter(realAlt).slice(0, 5) };
  }
  function linksOf(p) {
    const info = p.info || {}, x = [], web = [], tg = [];
    for (const s of info.socials || []) { const u = s.url || ''; const t = String(s.type || '').toLowerCase(); (t === 'twitter' || t === 'x' || /(?:x|twitter)\.com\//.test(u) ? x : t === 'telegram' ? tg : web).push(u); }
    for (const w of info.websites || []) if (w.url) web.push(w.url);
    const xHandles = x.map((u) => { const mm = String(u).match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/); return mm ? mm[1] : null; }).filter(Boolean);
    return { x: x.slice(0, 3), web: web.slice(0, 2), tg: tg.slice(0, 2), xHandles };
  }
  function tradeStats(rows, kolw) {
    const vals = rows.map((r) => +r.volume_in_usd || 0);
    if (!vals.length) return { n: 0 };
    const s = vals.slice().sort((a, b) => a - b), kols = [];
    for (const r of rows) { const h = kolw[r.tx_from_address]; if (h && !kols.includes(h)) kols.push(h); }
    return { n: vals.length, avgUsd: vals.reduce((a, b) => a + b, 0) / vals.length, median: s[Math.floor(s.length / 2)], tinyShare: vals.filter((v) => v < 5).length / vals.length,
      wallets: new Set(rows.map((r) => r.tx_from_address)).size, maxBuyUsd: Math.max(0, ...rows.filter((r) => r.kind === 'buy').map((r) => +r.volume_in_usd || 0)), kols };
  }
  const tradesOf = (d) => ((d && d.data) || []).map((x) => x.attributes || {});
  function rcFacts(r, kolw) {
    if (!r || typeof r !== 'object' || (!r.token && !r.topHolders)) return null;
    const tok = r.token || {}, pools = new Set(['FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM']), known = r.knownAccounts || {};
    let lp = null, amm = false;
    for (const m of r.markets || []) {
      if (m.pubkey) pools.add(m.pubkey);
      if (m.lp && m.lp.owner) pools.add(m.lp.owner);
      for (const f of ['liquidityA', 'liquidityB']) if (typeof m[f] === 'string') pools.add(m[f]);
      for (const f of ['liquidityAAccount', 'liquidityBAccount']) if (m[f] && m[f].owner) pools.add(m[f].owner);
      const v = m.lp && m.lp.lpLockedPct; if (typeof v === 'number') lp = Math.max(lp || 0, v);
      const mt = String(m.marketType || '').toLowerCase(); if (!mt.includes('pump_fun') || mt.includes('amm')) amm = true;
    }
    const isPool = (h) => [h.owner, h.address].some((a) => pools.has(a) || /AMM|LOCKER|CURVE|pump/i.test(String((known[a] || {}).type || '') + String((known[a] || {}).name || '')));
    const hs = (r.topHolders || []).filter((h) => !isPool(h)), top = hs[0];
    const sup = tok.supply;
    return { holders: r.totalHolders != null ? r.totalHolders : null, top1: top ? +top.pct || 0 : null, top10: r.topHolders ? hs.slice(0, 10).reduce((a, h) => a + (+h.pct || 0), 0) : null,
      insiders: r.graphInsidersDetected || 0, mintAuth: !!(r.mintAuthority || tok.mintAuthority), freezeAuth: !!(r.freezeAuthority || tok.freezeAuthority), rugged: !!r.rugged,
      lpLockedPct: lp, lpAmm: amm, creatorPct: sup && r.creatorBalance != null ? (r.creatorBalance / sup) * 100 : null, transferFee: (r.transferFee || {}).pct || null,
      topKol: top ? kolw[top.owner] || null : null };
  }
  function gpFacts(g) {
    if (!g) return null;
    const one = (v) => String(v) === '1';
    return { honeypot: one(g.is_honeypot) || one(g.cannot_sell_all), sellTax: g.sell_tax != null && g.sell_tax !== '' ? +g.sell_tax * 100 : null,
      ownerPowers: ['is_mintable', 'hidden_owner', 'can_take_back_ownership', 'owner_change_balance', 'selfdestruct'].some((k) => one(g[k])) };
  }
  async function copiesOf(p) {
    const b = p.baseToken, sym = String(b.symbol || '').trim().toLowerCase(), name = String(b.name || '').trim().toLowerCase();
    const d = await getJson(DS + '/latest/dex/search?q=' + encodeURIComponent(b.symbol), 15000);
    const best = {};
    for (const x of (d && d.pairs) || []) {
      const t = x.baseToken || {};
      if (x.chainId !== p.chainId || !t.address || t.address === b.address) continue;
      if (String(t.symbol || '').trim().toLowerCase() !== sym && String(t.name || '').trim().toLowerCase() !== name) continue;
      const mc = x.marketCap || x.fdv || 0; if (mc < 10000) continue;
      // v8.13: a pool with no liquidity and no trading is not a real coin (e.g. a launchpad pair showing "$2M MC" on $1.7k volume)
      if (((x.liquidity || {}).usd || 0) < 1000 && ((x.volume || {}).h24 || 0) < 20000) continue;
      if (!best[t.address] || mc > best[t.address].mcap) best[t.address] = { address: t.address, symbol: t.symbol, name: t.name, mcap: mc, created: x.pairCreatedAt, vol24: (x.volume || {}).h24, url: x.url };
    }
    const mine = p.pairCreatedAt || Date.now(), mc0 = p.marketCap || p.fdv || 0;
    let orig = null; const newer = [];
    for (const e of Object.values(best)) {
      if (e.created && e.created < mine - 600000 && e.mcap >= mc0) { if (!orig || e.created < orig.created) orig = e; }
      else if (e.created && e.created > mine) newer.push(e);
    }
    newer.sort((a, c) => c.mcap - a.mcap);
    return { n: newer.length, original: orig, over500k: newer.filter((e) => e.mcap >= 500000).slice(0, 5), top: newer.slice(0, 3) };
  }
  function tweetsFor(c) {
    const live = (D.getLive && D.getLive()) || {}, out = [], now = Date.now() / 1000;
    const rx = String(c.symbol || '').length >= 3 ? new RegExp('\\$' + String(c.symbol).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i') : null;
    for (const t of live.tweets || []) {
      if (now - (t.ts || 0) > 12 * 3600) continue;
      const hit = (t.coins || []).some((x) => x.address === c.address && (x.rel || 'named') === 'named') || (rx && rx.test(t.text || '') && !(t.coins || []).some((x) => String(x.symbol || '').toLowerCase() === String(c.symbol).toLowerCase() && x.address !== c.address));
      if (hit) out.push({ handle: t.handle, url: t.url, ts: t.ts, fol: t.author_followers });
    }
    return out.slice(0, 6);
  }
  /* full client-side DD of one coin (mirrors tools/gold.py facts_for) */
  async function collect(p, step) {
    const b = p.baseToken, chain = p.chainId, kolw = kolWallets();
    const tx = p.txns || {}, dex = p.dexId || '';
    const ageH = p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3.6e6 : null;
    const onCurve = dex === 'pumpfun' || dex === 'fourmeme';
    const f = { chain, address: b.address, symbol: b.symbol, name: b.name, pair: p.pairAddress, dex, onCurve, mcap: p.marketCap || p.fdv, liq: (p.liquidity || {}).usd, price: p.priceUsd ? +p.priceUsd : null, ageH,
      vol: { m5: (p.volume || {}).m5, h1: (p.volume || {}).h1, h6: (p.volume || {}).h6, h24: (p.volume || {}).h24 },
      txns: Object.fromEntries(Object.entries(tx).map(([k, v]) => [k, { b: (v || {}).buys, s: (v || {}).sells }])),
      chg: { m5: (p.priceChange || {}).m5, h1: (p.priceChange || {}).h1, h6: (p.priceChange || {}).h6, h24: (p.priceChange || {}).h24 }, links: linksOf(p) };
    const net = chain === 'bsc' ? 'bsc' : 'solana';
    step(L2('GeckoTerminal: portfele i transakcje…', 'GeckoTerminal: wallets and trades…'));
    const pool = await gt(`/networks/${net}/pools/${p.pairAddress}`);
    const ta = (((pool || {}).data || {}).attributes || {}).transactions || null;
    if (ta) f.gt = { buyers1h: (ta.h1 || {}).buyers, sellers1h: (ta.h1 || {}).sellers, buyers24: (ta.h24 || {}).buyers, sellers24: (ta.h24 || {}).sellers };
    const tr = tradesOf(await gt(`/networks/${net}/pools/${p.pairAddress}/trades`));
    if (tr.length) f.trades = tradeStats(tr, kolw);
    // pump.fun curve: the largest single buy (GeckoTerminal keeps ~24 h / 300 trades)
    let solPx = null;
    try { if (String((p.quoteToken || {}).symbol).toUpperCase() === 'SOL' && +p.priceNative > 0) solPx = +p.priceUsd / +p.priceNative; } catch (e) {}
    if (chain === 'solana' && solPx) {
      let rows = null;
      if (onCurve) rows = tr;
      else if ((ageH || 99) <= 26 && /pump$/.test(b.address)) {
        step(L2('pump.fun: kto wypełnił krzywą…', 'pump.fun: who filled the curve…'));
        const tp = await gt(`/networks/solana/tokens/${b.address}/pools?page=1`);
        const cp = ((tp && tp.data) || []).find((x) => ((((x.relationships || {}).dex || {}).data || {}).id === 'pump-fun') && String(((((x.relationships || {}).base_token || {}).data || {}).id) || '').endsWith(b.address));
        if (cp) rows = tradesOf(await gt(`/networks/solana/pools/${cp.attributes.address}/trades`));
      }
      const buys = (rows || []).filter((r) => r.kind === 'buy').map((r) => +r.volume_in_usd || 0);
      if (buys.length) f.curve = { maxBuyUsd: Math.max(...buys), sizeUsd: CURVE_SOL * solPx, n: rows.length };
    }
    step(chain === 'solana' ? L2('RugCheck: holderzy i kontrakt…', 'RugCheck: holders and contract…') : L2('GoPlus: kontrakt…', 'GoPlus: contract…'));
    if (chain === 'solana') f.rc = rcFacts(await getJson(RC + encodeURIComponent(b.address) + '/report', 20000), kolw);
    else { const g = await getJson(GP + 'token_security/56?contract_addresses=' + b.address, 15000); const res = (g && g.result) || {}; f.gp = gpFacts(res[b.address.toLowerCase()] || res[b.address]); }
    step(L2('Szukam kopii (wampirów) tickera…', 'Looking for copies (vamps) of the ticker…'));
    f.copies = await copiesOf(p);
    const kl = ((D.getKolLive && D.getKolLive()) || {}).items || [];
    const ke = kl.find((e) => String(e.k || '').toLowerCase() === (chain + ':' + b.address).toLowerCase() && e.badge);
    if (ke) f.kol = { badge: ke.badge, handle: ke.kol || null };
    f.tweets = tweetsFor(f);
    const fc = feed && (feed.cards || []).find((c) => c.k === chain + ':' + b.address);
    f.news = fc ? fc.news || null : null;   // Google News is read by the server (no CORS) — only for coins in the Gold feed
    return f;
  }

  /* ---------------- gates ---------------- */
  function chkState() { const s = lsGet(CHK_KEY, null); return s && s.day === warsawDay() ? s : { day: warsawDay(), cas: [] }; }
  function chkLeft() { return Math.max(0, CFG.checkerFreePerDay - chkState().cas.length); }
  function chkAllowed(k) { if (isPrem()) return true; const s = chkState(); return s.cas.includes(k) || s.cas.length < CFG.checkerFreePerDay; }
  function chkCount(k) { if (isPrem()) return; const s = chkState(); if (!s.cas.includes(k)) { s.cas.push(k); lsSet(CHK_KEY, s); } }
  function freeCard(cards) {
    const day = warsawDay(); const s = lsGet(FREE_KEY, null);
    if (s && s.day === day) return s;
    if (!cards || !cards.length || CFG.feedFreeCards <= 0) return null;
    const c = cards[0]; const v = { day, k: c.k, snap: c, at: Date.now() };
    lsSet(FREE_KEY, v); return v;
  }
  function openPremium() { if (D && D.openPremium) D.openPremium('premium'); else location.hash = 'premium'; }

  /* ---------------- render ---------------- */
  function verdictHead(level, v, c) {
    const L = LV[level] || LV.hazard;
    return `<div class="g-vh ${L.cls}"><span class="g-vic">${L.ic}</span><div><b>${EN() ? L.en : L.pl}</b><small>${esc(v && v.say ? (EN() ? v.say.en : v.say.pl) : L2(L.sub[0], L.sub[1]))}</small></div>${v && v.score != null ? `<span class="g-score" title="${L2('wynik DD 0–100', 'DD score 0–100')}">${v.score}</span>` : ''}</div>`;
  }
  function metricsHtml(f, v) {
    const m = (v && v.metrics) || {}, cells = [];
    const cell = (k, val, cls) => cells.push(`<div class="st"><small>${k}</small><b class="${cls || ''}">${val}</b></div>`);
    cell('MC', usd(f.mcap)); cell(L2('Płynność', 'Liquidity'), f.onCurve ? L2('krzywa', 'curve') : usd(f.liq));
    cell(L2('Śr. transakcja', 'Avg trade'), m.avgTrade != null ? usd(m.avgTrade) : '—', m.avgTrade != null && m.avgTrade < 15 ? 'dn' : '');
    cell('MC / Liq', m.mcLiq != null ? m.mcLiq.toFixed(1) + '×' : '—', m.mcLiq >= 14 ? 'dn' : m.mcLiq >= 8 ? 'wr' : '');
    cell(L2('Holderzy', 'Holders'), m.holders != null ? Number(m.holders).toLocaleString('pl-PL') : '—');
    cell(L2('Portfele 24 h', 'Wallets 24 h'), m.traders24 != null ? Number(m.traders24).toLocaleString('pl-PL') : '—');
    cell(L2('Top holder', 'Top holder'), m.top1 != null ? Math.round(m.top1) + '%' : '—', m.top1 >= 30 ? 'dn' : '');
    cell(L2('Max zakup krzywej', 'Max curve buy'), m.curveMaxBuy != null ? usd(m.curveMaxBuy) : '—', m.curveShare >= 0.5 ? 'dn' : '');
    cell(L2('Kupno 1 h', 'Buys 1 h'), m.buyShare != null ? Math.round(m.buyShare * 100) + '%' : '—', m.buyShare != null ? (m.buyShare >= 0.55 ? 'up' : m.buyShare < 0.4 ? 'dn' : '') : '');
    const ch = f.chg || {};
    cell('5m', pct(ch.m5), pcls(ch.m5)); cell('1h', pct(ch.h1), pcls(ch.h1)); cell('6h', pct(ch.h6), pcls(ch.h6));
    return `<div class="g-mx">${cells.join('')}</div>`;
  }
  function reasonsHtml(v, limit) {
    const rs = (v && v.reasons) || [];
    const show = limit ? rs.slice(0, limit) : rs;
    return `<ul class="g-rs">${show.map((r) => `<li class="g-r ${r.lvl}"><span>${RIC[r.lvl] || '•'}</span><span>${esc(EN() ? r.en : r.pl)}</span></li>`).join('')}</ul>${limit && rs.length > limit ? `<details class="g-more"><summary>${L2('Pokaż wszystkie', 'Show all')} (${rs.length})</summary><ul class="g-rs">${rs.slice(limit).map((r) => `<li class="g-r ${r.lvl}"><span>${RIC[r.lvl] || '•'}</span><span>${esc(EN() ? r.en : r.pl)}</span></li>`).join('')}</ul></details>` : ''}`;
  }
  function narrativeHtml(f) {
    const parts = [];
    const nw = f.news;
    if (nw && nw.n48 != null) {
      parts.push(`<div class="g-nt"><b>📰 ${L2('Artykuły', 'Articles')}</b> <span class="mut">${nw.n24} / 24 h · ${nw.n48} / 48 h${nw.trend === 'up' ? ' · <span class="up">↑ ' + L2('rośnie', 'rising') + '</span>' : nw.trend === 'down' ? ' · ↓' : ''} · „${esc(nw.q)}”</span></div>`
        + (nw.items || []).slice(0, 3).map((x) => `<a class="g-art" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.t)}<small>${esc(x.src)} · ${esc(ago(x.ts * 1000))}</small></a>`).join(''));
    }
    const tw = f.tweets || [];
    if (tw.length) parts.push(`<div class="g-nt"><b>🐦 ${L2('Tweety śledzonych kont', 'Tweets from tracked accounts')}</b></div>` + tw.slice(0, 3).map((t) => `<a class="g-art" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">@${esc(t.handle)}${t.fol ? ` <span class="mut">· ${usd(t.fol).replace('$', '')} ${L2('obs.', 'fol.')}</span>` : ''}<small>${esc(ago(t.ts * 1000))}</small></a>`).join(''));
    const cp = f.copies;
    if (cp && (cp.original || (cp.top || []).length)) {
      parts.push(`<div class="g-nt"><b>🧛 ${L2('Kopie tickera', 'Ticker copies')}</b></div>`
        + (cp.original ? `<a class="g-art bad" href="${esc(cp.original.url || '#')}" target="_blank" rel="noopener noreferrer">${L2('Oryginał', 'Original')}: $${esc(cp.original.symbol)} · MC ${usd(cp.original.mcap)}<small>${esc(String(cp.original.address).slice(0, 6))}…${esc(String(cp.original.address).slice(-4))}</small></a>` : '')
        + (cp.top || []).map((e) => `<a class="g-art" href="${esc(e.url || '#')}" target="_blank" rel="noopener noreferrer">${L2('Kopia', 'Copy')}: $${esc(e.symbol)} · MC ${usd(e.mcap)}${e.mcap >= 500000 ? ' <span class="wr">· > $500K</span>' : ''}<small>${esc(String(e.address).slice(0, 6))}…${esc(String(e.address).slice(-4))}</small></a>`).join(''));
    }
    const q = encodeURIComponent((f.name && f.name.length >= 4 ? f.name : '$' + f.symbol));
    parts.push(`<div class="g-src"><a href="https://news.google.com/search?q=${q}" target="_blank" rel="noopener noreferrer">Google News ↗</a><a href="https://x.com/search?q=${encodeURIComponent(f.address)}&f=live" target="_blank" rel="noopener noreferrer">${L2('X: szukaj CA', 'X: search CA')} ↗</a><a href="https://dexscreener.com/${esc(f.chain)}/${esc(f.address)}" target="_blank" rel="noopener noreferrer">DexScreener ↗</a>${f.chain === 'solana' ? `<a href="https://rugcheck.xyz/tokens/${esc(f.address)}" target="_blank" rel="noopener noreferrer">RugCheck ↗</a>` : ''}</div>`);
    return `<div class="g-narr"><div class="g-sh">${L2('Narracja i źródła', 'Narrative and sources')}</div>${parts.join('')}<div class="mut g-tip">${L2('Nie ufaj w ciemno — otwórz źródła i sprawdź sam.', 'Don\u2019t trust blindly — open the sources and check yourself.')}</div></div>`;
  }
  function coinLine(c, img) {
    const age = c.ageH != null ? ageLbl(c.ageH) : c.m && c.m.ageH != null ? ageLbl(c.m.ageH) : '?';
    const stage = c.onCurve ? L2('krzywa pump.fun', 'pump.fun curve') : c.dex || '';
    const icon = D && D.imgTag ? D.imgTag({ address: c.address, chainId: c.chain, symbol: c.symbol, name: c.name, image: img || c.image || null }, 'av', 40) : '';
    return `<div class="g-coin">${icon}<div class="nm"><b translate="no">$${esc(c.symbol)} <span class="mut" style="font-weight:600">${esc(c.name || '')}</span></b><small>${esc(c.chain)} · ${esc(stage)} · ${L2('wiek', 'age')} ${esc(age)} · <span class="g-ca" translate="no">${esc(String(c.address).slice(0, 5))}…${esc(String(c.address).slice(-4))}</span></small></div></div>`;
  }
  function resultHtml(res) {
    if (res.err) return `<div class="card g-err">${esc(res.err)}</div>`;
    if (res.locked) return `<div class="rplan" translate="no"><div class="rplan-t"><b>🔒 ${L2(`Wykorzystano ${CFG.checkerFreePerDay} darmowe sprawdzenia na dziś`, `You used today\u2019s ${CFG.checkerFreePerDay} free checks`)}</b><small>${L2('Jutro (czas PL) kolejne — albo bez limitu w Premium. Ponowne sprawdzenie tego samego coina dziś jest darmowe.', 'More tomorrow (Polish time) — or unlimited with Premium. Re-checking the same coin today is free.')}</small></div><button type="button" class="rplan-cta" data-unlock>✦ ${L2('Odblokuj Premium', 'Unlock Premium')}</button></div>`;
    const f = res.f, v = res.v, L = LV[v.level];
    const alts = (res.alts || []).length ? `<div class="mut g-alts">${L2('Inne coiny z tym tickerem', 'Other coins with this ticker')}: ${res.alts.map((p) => `<button type="button" class="g-alt" data-gq="${esc(p.baseToken.address)}">$${esc(p.baseToken.symbol)} · ${usd(p.marketCap || p.fdv)}</button>`).join(' ')}</div>` : '';
    return `<div class="card g-card g-res ${L.cls}" data-gres>
      ${verdictHead(v.level, v, f)}
      ${coinLine(f, res.img)}
      ${alts}
      <div class="g-sh">${L2('Checklista DD', 'DD checklist')}</div>
      ${reasonsHtml(v)}
      ${metricsHtml(f, v)}
      ${narrativeHtml(f)}
      <div class="g-act">
        <button type="button" class="pf-btn" data-gwatch>${window.KyvoInsights && window.KyvoInsights.isWatched(f.chain + ':' + f.address) ? '★ ' + L2('Obserwujesz', 'Watching') : '☆ ' + L2('Obserwuj (alerty Gold)', 'Watch (Gold alerts)')}</button>
        <a class="pf-btn" href="#coin/${encodeURIComponent(f.chain + ':' + f.address)}">${L2('Otwórz coin', 'Open coin')} →</a>
      </div>
      <div class="mut g-disc">${L2('Sprawdzone', 'Checked')} ${esc(new Date(res.at).toLocaleTimeString(EN() ? 'en-GB' : 'pl-PL', { hour: '2-digit', minute: '2-digit' }))} · ${L2('heurystyki na publicznych danych (DexScreener, GeckoTerminal, RugCheck). To nie porada finansowa — memecoiny mogą spaść do zera.', 'heuristics on public data (DexScreener, GeckoTerminal, RugCheck). Not financial advice — memecoins can go to zero.')}</div>
    </div>`;
  }
  function cardHtml(c, open) {
    const L = LV[c.level] || LV.hazard, srcL = { runner: '🏃 Runner', kol: '👑 KOL', big: '📈 ' + L2('Duży runner', 'Big runner'), tweet: '🐦 Tweet', boost: '⚡ Boost', trend: '🔥 Trending', watch: '👀 ' + L2('Śledzony', 'Followed') };
    if (!open) return `<div class="card g-card g-lock ${L.cls} rlock" role="button" tabindex="0" data-unlock translate="no"><div class="g-vh ${L.cls}"><span class="g-vic">${L.ic}</span><div><b>${EN() ? L.en : L.pl}</b><small>${L2('dodany', 'added')} ${esc(ago(c.first_at))}</small></div><span class="rlock-ic sm">🔒</span></div><div class="rlock-bars" aria-hidden="true"><i style="width:70%"></i><i style="width:52%"></i><i style="width:80%"></i></div><small class="rlock-t">🔒 ${L2('Pełne DD w Premium', 'Full DD with Premium')} · <span class="rlock-cta">${L2('Odblokuj', 'Unlock')}</span></small></div>`;
    const f = Object.assign({}, c, { mcap: c.m.mcap, liq: c.m.liq, ageH: c.m.ageH, chg: { m5: c.m.m5, h1: c.m.h1, h6: c.m.h6 } });
    const v = { level: c.level, score: c.score, say: c.say, reasons: c.reasons, metrics: c.metrics };
    const chg = c.prev_level && c.prev_level !== c.level ? ` <span class="g-chg">${(LV[c.prev_level] || {}).ic || ''}→${L.ic}</span>` : '';
    return `<div class="card g-card ${L.cls}" id="g-${esc(c.k.replace(/[^A-Za-z0-9]/g, ''))}" data-gk="${esc(c.k)}">
      ${verdictHead(c.level, v, c)}
      ${coinLine(c)}
      <div class="g-tags">${(c.filters || []).map((x) => `<span class="g-tag flt" title="${L2('Auto-skaner Kyvo', 'Kyvo auto-scanner')}">🔎 ${L2('Filtr', 'Filter')}: ${esc(x.emoji || '')} ${esc(EN() ? x.en : x.pl)}</span>`).join('')}${(c.src || []).filter((s) => s !== 'filter').map((s) => `<span class="g-tag">${esc(srcL[s] || s)}</span>`).join('')}${c.kol && c.kol.badge === 'kol' ? `<span class="g-tag kol">👑 @${esc(c.kol.handle || 'KOL')}</span>` : ''}<span class="g-tag mut">${L2('w feedzie', 'in feed')} ${esc(ago(c.first_at))}${chg}</span></div>
      ${reasonsHtml(v, 5)}
      ${metricsHtml(f, v)}
      <details class="g-more"><summary>📰 ${L2('Narracja, kopie, źródła', 'Narrative, copies, sources')}${c.news && c.news.n24 ? ` · ${c.news.n24} ${L2('art./24 h', 'art./24 h')}` : ''}</summary>${narrativeHtml(f)}</details>
      <div class="g-act"><button type="button" class="pf-btn" data-gq="${esc(c.address)}">↻ ${L2('Sprawdź teraz', 'Check now')}</button><a class="pf-btn" href="#coin/${encodeURIComponent(c.k)}">${L2('Otwórz coin', 'Open coin')} →</a></div>
    </div>`;
  }
  function alertsHtml(list, prem) {
    if (!list || !list.length) return '';
    if (!prem && CFG.alertsPremium) return `<div class="card g-alerts rlock" role="button" tabindex="0" data-unlock><div class="g-sh">🔔 ${L2('Alerty Gold (24 h)', 'Gold alerts (24 h)')}: ${list.length}</div><div class="rlock-bars" aria-hidden="true"><i style="width:76%"></i><i style="width:48%"></i></div><small class="rlock-t">🔒 ${L2('Alerty cenowe ±15–20%, wampiry > $500K i nowe artykuły — Premium', 'Price ±15–20%, vamps > $500K and new articles — Premium')} · <span class="rlock-cta">${L2('Odblokuj', 'Unlock')}</span></small></div>`;
    const ic = { price: '📈', vamp: '🧛', news: '📰' };
    return `<div class="card g-alerts"><div class="g-sh">🔔 ${L2('Alerty Gold (24 h)', 'Gold alerts (24 h)')}</div>${list.slice(0, 8).map((a) => `<a class="g-al" href="#gold/${encodeURIComponent(a.k)}"><span>${/^[^\w$]/.test(String(a.title_pl || '')) ? '' : ic[a.sub] || '🔔'}${esc(EN() ? a.title_en : a.title_pl)}</span><small>${esc(EN() ? a.body_en : a.body_pl)} · ${esc(ago(a.at))}</small></a>`).join('')}</div>`;
  }
  function render(root) {
    rootEl = root = root || rootEl; if (!root) return;
    const prem = isPrem(), left = chkLeft();
    const cards = (feed && feed.cards) || [];
    const fc = prem ? null : freeCard(cards);
    const cnt = { gold: 0, hazard: 0, avoid: 0 }; cards.forEach((c) => (cnt[c.level] = (cnt[c.level] || 0) + 1));
    let feedHtml;
    if (!feed) feedHtml = feedBusy ? `<div class="loading"><div class="spin"></div>${L2('Ładuję feed Gold…', 'Loading the Gold feed…')}</div>` : `<div class="card mut">${L2('Feed Gold jeszcze niedostępny — serwer liczy DD co ~5 min.', 'The Gold feed is not available yet — the server computes DD every ~5 min.')}</div>`;
    else if (!cards.length) feedHtml = `<div class="card mut">${L2('Teraz brak gorących coinów do oceny.', 'No hot coins to rate right now.')}</div>`;
    else {
      const open = (c) => prem || (fc && c.k === fc.k);
      let html = '';
      if (fc && !cards.some((c) => c.k === fc.k) && fc.snap) html += cardHtml(Object.assign({}, fc.snap, { src: (fc.snap.src || []) }), true).replace('class="card g-card', 'class="card g-card g-old');
      const groups = [['gold', '🥇 Gold'], ['hazard', '🟡 ' + L2('Hazard', 'Gamble')], ['avoid', '🔴 ' + L2('Ostrzeżenia — trzymaj się z daleka', 'Warnings — stay away')]];
      for (const [lv, title] of groups) {
        const xs = cards.filter((c) => c.level === lv); if (!xs.length) continue;
        html += `<div class="g-gh">${title} <span class="mut">${xs.length}</span></div>` + xs.map((c) => cardHtml(c, open(c))).join('');
      }
      feedHtml = html;
    }
    const plan = prem ? `<div class="rplan prem" translate="no">✦ ${L2('Premium: pełny feed Gold, sprawdzanie bez limitu i alerty Gold.', 'Premium: full Gold feed, unlimited checks and Gold alerts.')}${window.KyvoPremium && window.KyvoPremium.isOwner && window.KyvoPremium.isOwner() ? ' <span class="mut">(' + L2('właściciel', 'owner') + ')</span>' : window.KyvoPremium && window.KyvoPremium.isFreeHour && window.KyvoPremium.isFreeHour() ? ' <span class="mut">(🎁 ' + L2('za darmo do', 'free until') + ' ' + window.KyvoPremium.freeLabel() + ')</span>' : ''}</div>`
      : `<div class="rplan" translate="no"><div class="rplan-t"><b>${L2('Plan darmowy', 'Free plan')}: ${CFG.checkerFreePerDay} ${L2('sprawdzenia + 1 karta Gold dziennie', 'checks + 1 Gold card a day')}</b><small>${L2('Pełny feed Gold, sprawdzanie bez limitu i alerty (cena ±15–20%, wampiry > $500K, nowe artykuły) są w Premium.', 'The full Gold feed, unlimited checks and alerts (price ±15–20%, vamps > $500K, new articles) are Premium.')}</small></div><button type="button" class="rplan-cta" data-unlock>✦ ${L2('Odblokuj Premium', 'Unlock Premium')}</button></div>`;
    root.innerHTML = `<div class="g-hero"><h2>🥇 Gold <span class="pill live">LIVE</span></h2><p class="mut">${L2('Research jak u pro tradera: zanim kupisz, sprawdź boty wolumenowe, fałszywych holderów, kopie, płynność i narrację.', 'Research like a pro trader: before you buy, check volume bots, fake holders, copies, liquidity and the narrative.')}</p></div>
      <div class="card g-check">
        <div class="g-sh">🔎 ${L2('Sprawdź coin', 'Check a coin')}</div>
        <form class="g-form" data-gform><input id="goldQ" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="${L2('Wklej CA albo $ticker…', 'Paste a CA or $ticker…')}" value="${esc(lastRes && lastRes.q ? lastRes.q : '')}"><button type="submit" class="rplan-cta" ${busy ? 'disabled' : ''}>${busy ? '…' : L2('Sprawdź', 'Check')}</button></form>
        <div class="mut g-left">${prem ? '✦ ' + L2('Premium: bez limitu', 'Premium: unlimited') : `${L2('Darmowo dziś', 'Free today')}: ${left}/${CFG.checkerFreePerDay}`} · ${L2('sprawdzam: śr. transakcję, MC/płynność, holderów vs portfele, krzywą pump.fun, kopie, pożyczone nazwy, presję kupna, linki', 'checks: avg trade, MC/liquidity, holders vs wallets, pump.fun curve, copies, borrowed names, buy pressure, links')}</div>
        <div id="goldRes">${busy ? `<div class="loading"><div class="spin"></div><span data-gstep>${esc(busy)}</span></div>` : lastRes ? resultHtml(lastRes) : ''}</div>
      </div>
      ${plan}
      ${alertsHtml(feed && feed.alerts, prem)}
      <div class="g-fh"><b>${L2('Feed Gold', 'Gold feed')}</b> <span class="mut">${feed ? `🥇 ${cnt.gold || 0} · 🟡 ${cnt.hazard || 0} · 🔴 ${cnt.avoid || 0} · ${L2('aktualizacja', 'updated')} ${esc(ago(Date.parse(feed.updated_at)))}` : ''}</span></div>
      <div class="mut g-feednote">${L2('Gorące coiny (Runnery, KOL coiny, tweety, boosty, trending) + trafienia auto-skanera, ocenione co ~5 min. Artykuły i kopie — co ~30 min.', 'Hot coins (Runners, KOL coins, tweets, boosts, trending) + auto-scanner hits, rated every ~5 min. Articles and copies — every ~30 min.')}</div>
      ${feed && (feed.filters || []).length ? `<div class="card g-scan"><div class="g-sh">🔎 ${L2('Auto-skaner', 'Auto-scanner')} <span class="mut">${L2('Kyvo sam przeszukuje rynek co ~5 min i robi DD każdego trafienia', 'Kyvo scans the market every ~5 min and runs DD on every hit')}</span></div>${feed.filters.map((x) => `<div class="g-flt"><span>${esc(x.emoji || '🔎')}</span><span>${esc(EN() ? x.en : x.pl)}${x.alert ? ` <span class="mut">· 🔔 ${L2('alert', 'alert')}</span>` : ''}</span><b>${x.hits || 0}</b></div>`).join('')}</div>` : ''}
      ${feedHtml}
      <div class="card mut g-how"><b>${L2('Jak to działa', 'How it works')}</b><br>${L2('🥇 Gold = brak twardych znaków rugu, realny przepływ i rozproszeni holderzy — nadal hazard. 🟡 Hazard = jedna poważna flaga albo za mało danych. 🔴 = boty wolumenowe, farma holderów, jeden zakup wypełnił krzywą, kopia, pożyczona nazwa, aktywny mint/freeze. Coin znanej osoby z dużym % podaży może być całą narracją — ale ona może sprzedać. 🔎 Auto-skaner sam szuka coinów wg filtrów (np. +100% w 1 h przy MC ≥ $1M, świeży absolwent pump.fun z prawdziwymi holderami) i robi im ten sam DD. Blokady są po stronie przeglądarki (dane są publiczne).', '🥇 Gold = no hard rug signs, real flow and spread-out holders — still a gamble. 🟡 Gamble = one serious flag or too little data. 🔴 = volume bots, holder farm, one buy filled the curve, a copy, a borrowed name, active mint/freeze. A known person\u2019s coin with a big % of supply can be the whole narrative — but they can sell. 🔎 The auto-scanner finds coins by itself with filters (e.g. +100% in 1 h at MC ≥ $1M, a fresh pump.fun graduate with real holders) and runs the same DD on them. Gates run in the browser (the data is public).')}</div>`;
    wire(root);
    if (pendingOpen) { const k = pendingOpen; pendingOpen = null; focusCard(k); }
  }
  function wire(root) {
    const form = root.querySelector('[data-gform]');
    if (form) form.onsubmit = (e) => { e.preventDefault(); check(root.querySelector('#goldQ').value); };
    root.querySelectorAll('[data-gq]').forEach((b) => (b.onclick = () => { root.querySelector('#goldQ').value = b.dataset.gq; check(b.dataset.gq); }));
    root.querySelectorAll('[data-unlock]').forEach((b) => { b.onclick = openPremium; b.onkeydown = (e) => { if (e.key === 'Enter') openPremium(); }; });
    const w = root.querySelector('[data-gwatch]');
    if (w && lastRes && lastRes.f && window.KyvoInsights) w.onclick = () => {
      const f = lastRes.f; const on = window.KyvoInsights.toggleWatch({ chainId: f.chain, address: f.address, symbol: f.symbol, name: f.name, image: lastRes.img || null, priceUsd: f.price, mcap: f.mcap });
      w.textContent = on ? '★ ' + L2('Obserwujesz', 'Watching') : '☆ ' + L2('Obserwuj (alerty Gold)', 'Watch (Gold alerts)');
    };
  }
  function focusCard(k) {
    const el = rootEl && rootEl.querySelector(`[data-gk="${CSS && CSS.escape ? CSS.escape(k) : k}"]`);
    if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.add('g-flash'); setTimeout(() => el.classList.remove('g-flash'), 2400); const d = el.querySelector('details'); if (d) d.open = true; }
    else if (/:/.test(k)) { const a = k.split(':')[1]; if (rootEl) { rootEl.querySelector('#goldQ').value = a; check(a); } }
  }
  async function check(q) {
    if (busy) return;
    q = String(q || '').trim();
    const setStep = (t) => { busy = t; const el = rootEl && rootEl.querySelector('[data-gstep]'); if (el) el.textContent = t; else render(); };
    setStep(L2('Szukam coina…', 'Finding the coin…'));
    let res;
    try {
      const r = await resolve(q);
      if (r.err) res = { q, err: r.err };
      else {
        const k = r.pair.chainId + ':' + r.pair.baseToken.address;
        if (!chkAllowed(k)) res = { q, locked: true };
        else {
          await loadFeed().catch(() => null);
          const f = await collect(r.pair, setStep);
          const v = window.KyvoGoldRules.verdict(f);
          chkCount(k);
          res = { q, f, v, alts: r.alts || [], img: (r.pair.info || {}).imageUrl || null, at: Date.now() };
          try { lsSet(LAST_KEY, { q, k, level: v.level, at: res.at }); } catch (e) {}
        }
      }
    } catch (e) { res = { q, err: L2('Nie udało się pobrać danych — spróbuj za chwilę (limity darmowych API).', 'Could not fetch the data — try again in a moment (free API limits).') }; }
    busy = false; lastRes = res; render();
    const el = rootEl && rootEl.querySelector('#goldRes'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /* ---------------- in-app Gold alerts for the ⭐ watchlist (app open) ---------------- */
  let wT = null, vampAt = 0;
  function watchAlertsOn() {
    if (!CFG.enabled) return false;
    const S = (window.KyvoNotify && window.KyvoNotify.settings && window.KyvoNotify.settings()) || {};
    return S.gold !== false && (!CFG.alertsPremium || isPrem());
  }
  function send(title, body, hash, tag) { if (window.KyvoNotify && window.KyvoNotify._send) window.KyvoNotify._send(title, body, hash, tag); }
  async function watchTick() {
    if (document.hidden || !watchAlertsOn() || !window.KyvoInsights) return;
    const W = window.KyvoInsights.getWatch() || {}, live = window.KyvoInsights._live || {};
    const st = lsGet(WB_KEY, { px: {}, vamps: {} }); st.px = st.px || {}; st.vamps = st.vamps || {};
    const now = Date.now(), th = CFG.watchPriceMovePct;
    for (const [k, w] of Object.entries(W)) {
      const px = live[k] && +live[k].priceUsd; if (!(px > 0)) continue;
      const b = st.px[k];
      if (!b) { st.px[k] = { base: px, at: now, al: 0 }; continue; }
      const ch = (px / b.base - 1) * 100;
      if (Math.abs(ch) >= th && now - (b.al || 0) >= 30 * 60e3) {
        send(`${ch > 0 ? '📈' : '📉'} $${w.symbol} ${pct(ch)} · 🥇 Gold`, L2(`ruch od ${ago(b.at)} · watchlista · to nie porada finansowa`, `move since ${ago(b.at)} · watchlist · not financial advice`), '#coin/' + encodeURIComponent(k), 'kyvo-gold-' + k);
        st.px[k] = { base: px, at: now, al: now };
      } else if (now - b.at > 6 * 3.6e6) st.px[k] = { base: px, at: now, al: b.al || 0 };
    }
    if (now - vampAt >= 30 * 60e3) {
      vampAt = now;
      for (const [k, w] of Object.entries(W).slice(0, 12)) {
        const cp = await copiesOf({ chainId: w.chain, baseToken: { address: w.address, symbol: w.symbol, name: w.name }, pairCreatedAt: (live[k] && live[k].pairCreatedAt) || w.addedAt, marketCap: (live[k] && live[k].mcap) || w.addedMcap }).catch(() => null);
        for (const e of (cp && cp.over500k) || []) {
          if (e.mcap < CFG.watchVampMc) continue;
          const id = w.chain + ':' + e.address;
          if (st.vamps[id]) continue;
          const seeded = st.vamps['_seed:' + k];
          st.vamps[id] = now;
          if (seeded) send(`🧛 ${L2('Wampir', 'Vamp')} $${e.symbol} > $500K`, L2(`kopia Twojego $${w.symbol} ma MC ${usd(e.mcap)}`, `a copy of your $${w.symbol} has ${usd(e.mcap)} MC`), '#gold', 'kyvo-gvamp-' + e.address);
        }
        st.vamps['_seed:' + k] = st.vamps['_seed:' + k] || now;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    lsSet(WB_KEY, st);
  }

  function init(deps) {
    D = deps || {};
    if (!CFG.enabled) { document.querySelectorAll('[data-gold-ui]').forEach((el) => (el.style.display = 'none')); document.documentElement.style.setProperty('--tbn', '6'); return; }
    loadFeed().then(() => { if (D.isView && D.isView('gold')) render(); updateBadge(); });
    setInterval(() => { if (!document.hidden) loadFeed(true).then(() => { updateBadge(); if (D.isView && D.isView('gold') && !busy) keepScroll(render); }); }, 120000);
    if (!wT) { wT = setInterval(watchTick, 60000); setTimeout(watchTick, 8000); }
  }
  function keepScroll(fn) { const y = window.scrollY; const open = rootEl ? [...rootEl.querySelectorAll('details[open]')].map((d) => (d.closest('[data-gk]') || {}).dataset && d.closest('[data-gk]').dataset.gk) : []; fn(); open.forEach((k) => { const el = k && rootEl.querySelector(`[data-gk="${k}"] details`); if (el) el.open = true; }); window.scrollTo(0, y); }
  function updateBadge() {
    const n = ((feed && feed.cards) || []).filter((c) => c.level === 'gold').length;
    document.querySelectorAll('[data-gold-count]').forEach((el) => { el.textContent = n ? String(n) : ''; el.style.display = n ? '' : 'none'; });
  }
  async function show(root, arg) {
    rootEl = root;
    if (arg) pendingOpen = decodeURIComponent(arg);
    render(root);
    await loadFeed();
    if (!busy) render(root);
    updateBadge();
  }
  window.KyvoGold = { init, show, render: () => render(), check, collect, resolve, loadFeed, cfg: CFG, _feed: () => feed };
})();
