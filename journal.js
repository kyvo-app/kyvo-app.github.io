/* Kyvo v8.15 📓 Journal (v8.20: 🎴 Kreator P&L — pnlcard.js) — memecoin trading journal (Premium).
   Inspired by trading-journal apps, built for Solana memecoins: trades are auto-built from a PUBLIC wallet address.
   Data (free, public, no API keys, all in the browser):
     * swaps: free public Solana RPC (publicnode — same one as the 👀 Tracker): getSignaturesForAddress + getTransaction
       (jsonParsed, 1 tx per request — the public RPC allows no batches), 3 parallel requests with back-off on 429/5xx,
       last CFG.days days / max CFG.maxTx transactions per run ("Wczytaj starsze" loads the next batch).
       Parsed swaps are cached in localStorage (kyvo_journal_v1) — each tx is fetched once.
     * coin name / logo / MC now: DexScreener tokens/v1 (30 mints per call), cached 10 min.
     * "% of peak captured": GeckoTerminal public OHLCV (1 call / 3 s, newest closed trades only), cached for good.
     * Kyvo alerts: data/track_record.json (Runner / Good flags) + data/gold.json (Gold).
   Trades = positions per coin: opened by the first buy, closed when ≥ 99 % of the bought tokens are sold; FIFO cost basis.
   P&L is in SOL (fees, tips and ATA rent included); $ values use the CURRENT SOL price (approximate).
   The app NEVER asks for a private key or seed phrase — only a public address (keys / seeds are rejected).
   Coach = free, rule-based (no paid AI). Not financial advice. */
(function () {
  'use strict';
  // v8.15 pass 6: circuit breaker / break screen switched off (too heavy for most users). Code kept, UI and checks off.
  const BREAKER = false;
  function rulesOn() { return BREAKER && !!(plan && plan.rules && plan.rules.on); }
  const CFG = Object.assign({
    enabled: true, premiumOnly: true, days: 7, maxTx: 200, conc: 3, peakMax: 25,
    rpc: (window.KYVO_TRACKER_CONFIG && window.KYVO_TRACKER_CONFIG.rpc) || 'https://solana-rpc.publicnode.com',
  }, window.KYVO_JOURNAL_CONFIG || {});
  const KEY = 'kyvo_journal_v1', CKEY = 'kyvo_journal_coins', PKEY = 'kyvo_journal_peaks';
  const DS = 'https://api.dexscreener.com/tokens/v1/solana/';
  const GT = 'https://api.geckoterminal.com/api/v2';
  const WSOL = 'So11111111111111111111111111111111111111112';
  const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
  const QUOTE = new Set([WSOL, USDC, USDT]);
  const isEn = () => !!(window.KyvoI18n && window.KyvoI18n.isEn && window.KyvoI18n.isEn());
  const L = (pl, en) => (isEn() ? en : pl);
  const E = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => Math.floor(Date.now() / 1000);
  let D = {};

  /* ---------- tags ---------- */
  const TAGS = [
    { id: 'fomo', e: '😵', pl: 'FOMO', en: 'FOMO' },
    { id: 'kyvo', e: '🏃', pl: 'Runner z Kyvo', en: 'Kyvo Runner', auto: 1 },
    { id: 'gold', e: '🥇', pl: 'Gold ✅', en: 'Gold ✅', auto: 1 },
    { id: 'early', e: '🐣', pl: 'Za wcześnie sprzedane', en: 'Sold too early' },
    { id: 'late', e: '🐌', pl: 'Za późno sprzedane', en: 'Sold too late' },
    { id: 'plan', e: '🎯', pl: 'Według planu', en: 'Followed plan' },
    { id: 'bundle', e: '📦', pl: 'Bundled dev', en: 'Bundled dev' },
    { id: 'rug', e: '💀', pl: 'Rug', en: 'Rug', auto: 1 },
    { id: 'revenge', e: '😤', pl: 'Revenge', en: 'Revenge', auto: 1 },
    { id: 'kol', e: '📣', pl: 'Call KOL-a', en: 'KOL call' },
    { id: 'snipe', e: '🎯', pl: 'Snipe', en: 'Snipe' },
    { id: 'calm', e: '🧘', pl: 'Spokój / cierpliwość', en: 'Calm & patient' },
    { id: 'fear', e: '😨', pl: 'Strach', en: 'Fear' },
  ];
  const tagById = (id) => TAGS.find((t) => t.id === id);
  const tagLabel = (id) => { const t = tagById(id); return t ? t.e + ' ' + L(t.pl, t.en) : id; };

  /* ---------- formatting ---------- */
  function fSol(n, sign) {
    if (n == null || !isFinite(n)) return '—';
    const a = Math.abs(n), s = n < 0 ? '−' : sign ? '+' : '';
    return s + (a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a >= 1 ? a.toFixed(2) : a.toFixed(3)) + ' SOL';
  }
  function fUsd(n, sign) {
    if (n == null || !isFinite(n)) return '—';
    const a = Math.abs(n), s = n < 0 ? '−' : sign ? '+' : '';
    return s + '$' + (a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'K' : a >= 100 ? a.toFixed(0) : a.toFixed(2));
  }
  const fPct = (p, sign) => (p == null || !isFinite(p) ? '—' : (p < 0 ? '−' : sign ? '+' : '') + Math.abs(p * 100).toFixed(p !== 0 && Math.abs(p) < 0.1 ? 1 : 0) + '%');
  const fMc = (n) => (!n || !isFinite(n) ? '—' : n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'K' : '$' + Math.round(n));
  function fHold(s) {
    if (s == null || !isFinite(s) || s < 0) return '—';
    if (s < 60) return Math.round(s) + 's';
    if (s < 3600) return Math.round(s / 60) + ' min';
    if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.round((s % 3600) / 60) + 'm';
    return (s / 86400).toFixed(1) + (isEn() ? 'd' : ' dni');
  }
  const short = (a) => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '');
  const cls = (n) => (n > 0 ? 'up' : n < 0 ? 'dn' : '');
  function fDate(t, withTime) {
    const d = new Date(t * 1000);
    const o = withTime ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit' };
    try { return d.toLocaleString(isEn() ? 'en-GB' : 'pl-PL', o); } catch (e) { return d.toISOString().slice(0, 16); }
  }

  /* ---------- address safety (same rules as tracker.js) ---------- */
  const validAddr = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
  function looksSecret(a) {
    if (window.KyvoTracker && window.KyvoTracker._looksSecret) { try { return window.KyvoTracker._looksSecret(a); } catch (e) {} }
    const t = String(a || '').trim();
    if (/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(t)) return true;
    if (/^\[\s*\d+(\s*,\s*\d+){20,}\s*\]$/.test(t)) return true;
    if (t.split(/\s+/).filter((w) => /^[a-z]+$/.test(w)).length >= 12) return true;
    return false;
  }

  /* =====================================================================================================
     CORE (pure — no DOM; exported as KyvoJournal.core for tests)
     ===================================================================================================== */
  // one signed transaction -> one swap {s, at, m, b, q, sol} or null. sol = SOL spent (buy, incl. fees) / received (sell, net).
  function parseSwapTx(tx, w, solPx) {
    if (!tx || !tx.meta || tx.meta.err) return null;
    const msg = tx.transaction && tx.transaction.message;
    const keys = (msg && msg.accountKeys) || [];
    const k0 = keys[0] && (keys[0].pubkey || keys[0]);
    if (k0 !== w) return null;                               // only transactions the wallet signed (fee payer) itself
    const fee = (tx.meta.fee || 0) / 1e9;
    let sol = ((tx.meta.postBalances || [])[0] - (tx.meta.preBalances || [])[0]) / 1e9;
    const d = {};
    const amt = (b) => { const u = b.uiTokenAmount || {}; const v = u.uiAmountString != null ? +u.uiAmountString : +u.uiAmount; return isFinite(v) ? v : 0; };
    (tx.meta.preTokenBalances || []).forEach((b) => { if (b.owner === w) d[b.mint] = (d[b.mint] || 0) - amt(b); });
    (tx.meta.postTokenBalances || []).forEach((b) => { if (b.owner === w) d[b.mint] = (d[b.mint] || 0) + amt(b); });
    if (d[WSOL]) sol += d[WSOL];
    const stable = (d[USDC] || 0) + (d[USDT] || 0);
    const toks = Object.keys(d).filter((m) => !QUOTE.has(m) && Math.abs(d[m]) > 0);
    if (toks.length !== 1) return null;                      // token↔token routes / multi-coin txs are skipped
    const m = toks[0], q = d[m];
    let quote = sol;
    if (Math.abs(stable) >= 0.5) { if (!solPx) return null; quote = sol + stable / solPx; }
    if (Math.abs(quote + fee) < 0.003) return null;          // transfers, airdrop claims, dust
    if ((q > 0) === (quote + fee > 0)) return null;          // not a swap (both in or both out)
    const sig = (tx.transaction.signatures || [])[0];
    return { s: sig, at: tx.blockTime || 0, m, b: q > 0 ? 1 : 0, q: Math.abs(q), sol: +Math.abs(quote).toFixed(6) };
  }

  // swaps -> positions (one per coin round trip), FIFO cost basis
  function buildPositions(swaps) {
    const by = {};
    swaps.slice().sort((a, b) => a.at - b.at).forEach((s) => (by[s.m] = by[s.m] || []).push(s));
    const out = [];
    Object.keys(by).forEach((m) => {
      let pos = null, lots = [];
      const held = () => lots.reduce((a, l) => a + l.q, 0);
      const mk = (s) => ({ id: m.slice(0, 6) + s.s.slice(0, 10), m, fills: [], openAt: s.at, closeAt: null, buySol: 0, buyQty: 0, sellSol: 0, sellQty: 0, costSold: 0, procSold: 0, realized: 0, maxQty: 0, inc: 0, status: 'open' });
      for (const s of by[m]) {
        if (s.b) {
          if (!pos) pos = mk(s);
          pos.fills.push(s); pos.buySol += s.sol; pos.buyQty += s.q;
          lots.push({ q: s.q, c: s.sol, q0: s.q });
          pos.maxQty = Math.max(pos.maxQty, held());
        } else {
          if (!pos) { pos = mk(s); pos.inc = 1; }               // tokens bought before the loaded period
          pos.fills.push(s); pos.sellSol += s.sol; pos.sellQty += s.q;
          let rem = s.q, cost = 0;
          while (rem > 0 && lots.length) {
            const l = lots[0], take = Math.min(rem, l.q), c = l.c * (take / l.q);
            cost += c; l.c -= c; l.q -= take; rem -= take;
            if (l.q <= l.q0 * 1e-6) lots.shift();
          }
          if (rem > s.q * 0.02) pos.inc = 1;                    // part of this sell has no known buy
          const known = Math.max(0, s.q - rem), proc = s.sol * (s.q ? known / s.q : 0);
          pos.costSold += cost; pos.procSold += proc; pos.realized += proc - cost;
          const h = held();
          if (h <= Math.max(pos.maxQty, 1e-12) * 0.01) { pos.closeAt = s.at; pos.status = pos.inc ? 'inc' : 'closed'; out.push(pos); pos = null; lots = []; }
        }
      }
      if (pos) { pos.heldQty = held(); pos.heldCost = lots.reduce((a, l) => a + l.c, 0); pos.status = pos.inc ? 'inc' : 'open'; out.push(pos); }
    });
    out.forEach((p) => {
      p.entryPx = p.buyQty ? p.buySol / p.buyQty : null;       // SOL per token (avg)
      p.exitPx = p.sellQty ? p.sellSol / p.sellQty : null;
      p.pnlPct = p.costSold > 0 ? p.realized / p.costSold : null;
      p.hold = (p.closeAt || now()) - p.openAt;
    });
    return out.sort((a, b) => (b.closeAt || b.openAt) - (a.closeAt || a.openAt));
  }

  // decorate positions with coin info / MC / Kyvo flags / tags (ctx = {coins, solPx, flags, gold, meta, peaks})
  function enrich(ps, ctx) {
    const solPx = ctx.solPx || 0;
    ps.forEach((p) => {
      const c = (ctx.coins && ctx.coins[p.m]) || {};
      p.sym = p.sym || c.s || (p.m ? short(p.m) : '?'); p.name = p.name || c.n || ''; p.img = p.img || c.img || null; p.pair = c.pair || p.pair || null;
      const supply = c.mc && c.px ? c.mc / c.px : /pump$/.test(p.m || '') ? 1e9 : null;
      if (!p.manual) {
        p.entryMc = p.entryPx && supply && solPx ? p.entryPx * solPx * supply : null;
        p.exitMc = p.exitPx && supply && solPx ? p.exitPx * solPx * supply : null;
      }
      p.mcNow = c.mc || null;
      if (p.status === 'open' && c.px && solPx && p.heldQty) { p.unreal = (p.heldQty * c.px) / solPx - p.heldCost; p.unrealPct = p.heldCost ? p.unreal / p.heldCost : null; }
      p.rugged = !!((p.mcNow && p.entryMc && p.mcNow <= p.entryMc * 0.1) || (p.pnlPct != null && p.pnlPct <= -0.8));
      const auto = [];
      const f = ctx.flags && ctx.flags[p.m];
      p.kyvo = null;
      if (f && p.openAt * 1000 >= f.at - 60000 && p.openAt * 1000 - f.at < 86400000) { auto.push('kyvo'); p.kyvo = { min: Math.round((p.openAt * 1000 - f.at) / 60000), mc0: f.mc0, runner: f.runner }; }
      const g = ctx.gold && ctx.gold[p.m];
      if (g && p.openAt * 1000 >= g - 60000) auto.push('gold');
      if (p.rugged) auto.push('rug');
      if (p.revenge) auto.push('revenge');
      const meta = (ctx.meta && ctx.meta[p.id]) || {};
      const off = new Set(meta.x || []);
      p.autoTags = auto.filter((t) => !off.has(t));
      p.tags = [...new Set(p.autoTags.concat(meta.t || []))];
      p.notes = meta.n || '';
      const pk = ctx.peaks && ctx.peaks[p.id];
      p.peak = pk && pk.h ? pk : null;
      if (!p.demo) p.captured = p.peak && p.peak.h > p.peak.e * 1.02 ? Math.max(0, Math.min(1, (p.peak.x - p.peak.e) / (p.peak.h - p.peak.e))) : null;
    });
    return ps;
  }

  // tilt guard: bursts (≥5 new coins in 10 min) and revenge buys (new coin ≤5 min after closing a loss ≤ −15 %)
  function tilt(ps) {
    const opens = ps.filter((p) => p.status !== 'inc').slice().sort((a, b) => a.openAt - b.openAt);
    const ev = [];
    for (let i = 0; i < opens.length; i++) {
      const win = opens.filter((p) => p.openAt >= opens[i].openAt && p.openAt - opens[i].openAt <= 600);
      if (win.length >= 5) { ev.push({ k: 'burst', at: win[win.length - 1].openAt, n: win.length, ids: win.map((p) => p.id) }); i += win.length - 1; }
    }
    const closedL = ps.filter((p) => p.status === 'closed' && p.pnlPct != null && p.pnlPct <= -0.15);
    closedL.forEach((l) => {
      const nx = opens.find((p) => p.id !== l.id && p.openAt >= l.closeAt && p.openAt - l.closeAt <= 300);
      if (nx) { nx.revenge = 1; ev.push({ k: 'revenge', at: nx.openAt, id: nx.id, after: l.id, res: nx.realized }); }
    });
    return ev.sort((a, b) => b.at - a.at);
  }

  function group(ts, keyFn, order) {
    const g = new Map();
    ts.forEach((t) => {
      const ks = [].concat(keyFn(t)).filter((k) => k != null);
      ks.forEach((k) => { let r = g.get(k); if (!r) g.set(k, (r = { k, n: 0, w: 0, pnl: 0, hold: 0 })); r.n++; if (t.realized > 0) r.w++; r.pnl += t.realized; r.hold += t.hold || 0; });
    });
    const rows = [...g.values()].map((r) => Object.assign(r, { wr: r.n ? r.w / r.n : 0, avgHold: r.n ? r.hold / r.n : 0 }));
    return order ? order.map((k) => rows.find((r) => r.k === k)).filter(Boolean) : rows.sort((a, b) => b.n - a.n);
  }
  const MCB = [[0, 3e4, '<30K'], [3e4, 1e5, '30–100K'], [1e5, 3e5, '100–300K'], [3e5, 1e6, '300K–1M'], [1e6, Infinity, '1M+']];
  const HB = [[0, 60, '<1 min'], [60, 300, '1–5 min'], [300, 1800, '5–30 min'], [1800, 7200, '30 min–2h'], [7200, Infinity, '2h+']];
  const mcBucket = (mc) => { const b = mc ? MCB.find((x) => mc >= x[0] && mc < x[1]) : null; return b ? b[2] : null; };
  const holdBucket = (s) => { const b = HB.find((x) => s >= x[0] && s < x[1]); return b ? b[2] : null; };

  function stats(ps, solPx, extra) {
    const closed = ps.filter((p) => p.status === 'closed' && p.costSold > 0);
    const open = ps.filter((p) => p.status === 'open');
    const wins = closed.filter((p) => p.realized > 0), losses = closed.filter((p) => p.realized <= 0);
    const S = { n: closed.length, nOpen: open.length, nInc: ps.filter((p) => p.status === 'inc').length, solPx };
    S.pnl = closed.reduce((a, p) => a + p.realized, 0);
    S.pnlUsd = solPx ? S.pnl * solPx : null;
    S.unreal = open.reduce((a, p) => a + (p.unreal || 0), 0);
    S.vol = closed.reduce((a, p) => a + p.costSold, 0);
    S.wr = closed.length ? wins.length / closed.length : null;
    const gw = wins.reduce((a, p) => a + p.realized, 0), gl = -losses.reduce((a, p) => a + p.realized, 0);
    S.pf = gl > 0 ? gw / gl : wins.length ? Infinity : null;
    S.avgHold = closed.length ? closed.reduce((a, p) => a + p.hold, 0) / closed.length : null;
    S.holdW = wins.length ? wins.reduce((a, p) => a + p.hold, 0) / wins.length : null;
    S.holdL = losses.length ? losses.reduce((a, p) => a + p.hold, 0) / losses.length : null;
    const cap = closed.filter((p) => p.captured != null);
    S.captured = cap.length ? cap.reduce((a, p) => a + p.captured, 0) / cap.length : null; S.capN = cap.length;
    const rugs = closed.concat(open).filter((p) => p.rugged);
    S.rugShare = closed.length + open.length ? rugs.length / (closed.length + open.length) : null; S.rugN = rugs.length;
    const rugT = closed.filter((p) => p.pnlPct != null && p.pnlPct <= -0.7);
    S.rugHold = rugT.length ? rugT.reduce((a, p) => a + p.hold, 0) / rugT.length : null; S.rugHoldN = rugT.length;
    S.best = closed.slice().sort((a, b) => b.realized - a.realized)[0] || null;
    S.worst = closed.slice().sort((a, b) => a.realized - b.realized)[0] || null;
    // curve + calendar (by close time, local timezone)
    let cum = 0;
    S.curve = closed.slice().sort((a, b) => a.closeAt - b.closeAt).map((p) => ({ t: p.closeAt, v: (cum += p.realized) }));
    S.days = {};
    closed.forEach((p) => { const d = new Date(p.closeAt * 1000); const k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); const r = S.days[k] || (S.days[k] = { pnl: 0, n: 0 }); r.pnl += p.realized; r.n++; });
    // groups
    S.byTag = group(closed, (p) => (p.tags.length ? p.tags : ['_none']));
    S.byHour = group(closed, (p) => { const h = new Date(p.openAt * 1000).getHours(); return Math.floor(h / 2) * 2; }, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    S.byDow = group(closed, (p) => (new Date(p.openAt * 1000).getDay() + 6) % 7, [0, 1, 2, 3, 4, 5, 6]);
    S.byMc = group(closed, (p) => mcBucket(p.entryMc), MCB.map((x) => x[2]));
    S.byHold = group(closed, (p) => holdBucket(p.hold), HB.map((x) => x[2]));
    S.byKyvo = group(closed, (p) => (p.tags.includes('kyvo') ? 'kyvo' : 'other'), ['kyvo', 'other']);
    S.tilt = tilt(ps);
    S.adh = extra && extra.adh != null ? extra.adh : null;
    S.score = score(S, closed);
    return S;
  }

  function score(S, closed) {
    if (!closed.length) return null;
    const cl = (x) => Math.max(0, Math.min(100, Math.round(x)));
    const big = closed.filter((p) => p.pnlPct != null && p.pnlPct <= -0.5).length / closed.length;
    const tiltN = S.tilt.length;
    let hold = 60;
    if (S.holdW && S.holdL) { const r = S.holdL / S.holdW; hold = r <= 0.7 ? 100 : r >= 2.5 ? 15 : 100 - ((r - 0.7) / 1.8) * 85; }
    const c = {
      win: cl(((S.wr || 0) / 0.55) * 100),
      pf: cl(S.pf === Infinity ? 100 : ((S.pf || 0) / 2) * 100),
      disc: cl(100 - big * 120 - (tiltN / closed.length) * 150),
      hold: cl(hold),
      rug: cl(100 - (S.rugShare || 0) * 200),
    };
    if (S.adh != null) c.disc = cl(c.disc * 0.6 + S.adh * 100 * 0.4);   // v8.15: kept rules (circuit breaker) feed Discipline
    const total = cl(c.win * 0.25 + c.pf * 0.25 + c.disc * 0.2 + c.hold * 0.15 + c.rug * 0.15);
    const weakest = Object.keys(c).sort((a, b) => c[a] - c[b])[0];
    return { total, c, weakest };
  }

  // free rule-based coach: returns [{icon, sev, pl, en, w}] sorted by weight (max 6)
  function coach(S, ps) {
    const out = [];
    const add = (w, icon, sev, pl, en) => out.push({ w, icon, sev, pl, en });
    const closed = ps.filter((p) => p.status === 'closed' && p.costSold > 0);
    if (closed.length < 5) {
      add(100, '🧭', 'tip', `Masz dopiero ${closed.length} zamkniętych trade'ów — coach potrzebuje min. 5, żeby dać sensowne wskazówki.`, `You only have ${closed.length} closed trades — the coach needs at least 5 for meaningful tips.`);
      return out;
    }
    const hh = (h) => ('0' + h).slice(-2) + ':00';
    const worstH = S.byHour.filter((r) => r.n >= 3 && r.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
    if (worstH) add(90 + Math.min(10, -worstH.pnl), '🌙', 'bad', `Najwięcej tracisz między ${hh(worstH.k)} a ${hh((worstH.k + 2) % 24)} (${fSol(worstH.pnl, 1)}, ${worstH.n} trade'ów, win rate ${fPct(worstH.wr)}). Nie handluj w tych godzinach.`, `You lose the most between ${hh(worstH.k)} and ${hh((worstH.k + 2) % 24)} (${fSol(worstH.pnl, 1)}, ${worstH.n} trades, win rate ${fPct(worstH.wr)}). Don't trade in that window.`);
    const bestH = S.byHour.filter((r) => r.n >= 3 && r.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0];
    if (bestH) add(50, '☀️', 'good', `Najlepiej idzie Ci między ${hh(bestH.k)} a ${hh((bestH.k + 2) % 24)} (${fSol(bestH.pnl, 1)}).`, `You do best between ${hh(bestH.k)} and ${hh((bestH.k + 2) % 24)} (${fSol(bestH.pnl, 1)}).`);
    if (S.rugHoldN >= 2) add(85, '💀', 'bad', `Rugi (−70% i gorzej) trzymasz średnio ${fHold(S.rugHold)} — ustaw wyjście na −30% i nie czekaj na odbicie.`, `You hold rugs (−70% or worse) for ${fHold(S.rugHold)} on average — set an exit at −30% and don't wait for a bounce.`);
    if (S.holdW && S.holdL && S.holdL > S.holdW * 1.5) add(80, '⏳', 'bad', `Stratne pozycje trzymasz ${fHold(S.holdL)}, a zyskowne tylko ${fHold(S.holdW)}. Odwróć to: tnij straty szybko, zyskom daj rosnąć.`, `You hold losers for ${fHold(S.holdL)} but winners only ${fHold(S.holdW)}. Flip it: cut losses fast, let winners run.`);
    if (S.captured != null && S.capN >= 3 && S.captured < 0.35) add(75, '🐣', 'bad', `Łapiesz średnio tylko ${fPct(S.captured)} ruchu do szczytu. Sprzedaj połowę na +50%–100%, a resztę trzymaj z wyjściem na −30% od szczytu.`, `You only catch ${fPct(S.captured)} of the move to the peak on average. Sell half at +50–100% and trail the rest with a −30% from-peak exit.`);
    else if (S.captured != null && S.capN >= 3 && S.captured >= 0.6) add(40, '🎯', 'good', `Dobre wyjścia: łapiesz średnio ${fPct(S.captured)} ruchu do szczytu.`, `Good exits: you catch ${fPct(S.captured)} of the move to the peak on average.`);
    const mcs = S.byMc.filter((r) => r.n >= 3);
    const mb = mcs.slice().sort((a, b) => b.wr - a.wr || b.pnl - a.pnl)[0], mw = mcs.slice().sort((a, b) => a.pnl - b.pnl)[0];
    if (mb && mw && mb.k !== mw.k && mw.pnl < 0) add(70, '📊', 'tip', `Najlepiej wchodzisz przy MC ${mb.k} (win rate ${fPct(mb.wr)}), a przy MC ${mw.k} tracisz (${fSol(mw.pnl, 1)}). Trzymaj się swojego przedziału.`, `Your best entries are at MC ${mb.k} (win rate ${fPct(mb.wr)}), at MC ${mw.k} you lose (${fSol(mw.pnl, 1)}). Stick to your range.`);
    const ky = S.byKyvo.find((r) => r.k === 'kyvo'), ot = S.byKyvo.find((r) => r.k === 'other');
    if (ky && ky.n >= 2 && ot && ot.n >= 2) add(ky.wr > ot.wr ? 65 : 45, '🏃', ky.wr > ot.wr ? 'good' : 'tip', `Trade'y z alertów Kyvo: win rate ${fPct(ky.wr)} (${fSol(ky.pnl, 1)}) vs reszta ${fPct(ot.wr)} (${fSol(ot.pnl, 1)}).`, `Trades from Kyvo alerts: win rate ${fPct(ky.wr)} (${fSol(ky.pnl, 1)}) vs the rest ${fPct(ot.wr)} (${fSol(ot.pnl, 1)}).`);
    const rev = S.tilt.filter((e) => e.k === 'revenge');
    if (rev.length >= 2 && rev.reduce((a, e) => a + (e.res || 0), 0) < 0) { const lost = rev.reduce((a, e) => a + (e.res || 0), 0); add(78, '😤', 'bad', `${rev.length}× kupiłeś nowy coin w ciągu 5 min po stracie (revenge trading, wynik ${fSol(lost, 1)}). Po stracie zrób 5 min przerwy.`, `${rev.length}× you bought a new coin within 5 min of a loss (revenge trading, result ${fSol(lost, 1)}). Take a 5-min break after a loss.`); }
    const bur = S.tilt.filter((e) => e.k === 'burst');
    if (bur.length) add(60, '🧊', 'bad', `${bur.length}× wszedłeś w 5+ coinów w 10 minut. To overtrading — wybieraj 1–2 najlepsze setupy.`, `${bur.length}× you entered 5+ coins within 10 minutes. That's overtrading — pick the best 1–2 setups.`);
    const sorted = closed.slice().sort((a, b) => b.costSold - a.costSold), top = sorted.slice(0, Math.max(2, Math.round(closed.length * 0.2)));
    const topPnl = top.reduce((a, p) => a + p.realized, 0);
    if (closed.length >= 8 && topPnl < 0 && topPnl < S.pnl) add(68, '⚖️', 'bad', `Twoje największe pozycje (top 20%) dały ${fSol(topPnl, 1)}. Trzymaj stały rozmiar pozycji zamiast all-in na „pewniaki”.`, `Your biggest positions (top 20%) made ${fSol(topPnl, 1)}. Keep a fixed position size instead of going big on "sure things".`);
    const days = ['poniedziałki', 'wtorki', 'środy', 'czwartki', 'piątki', 'soboty', 'niedziele'], daysEn = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
    const wd = S.byDow.filter((r) => r.n >= 3 && r.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
    if (wd) add(35, '📅', 'tip', `Najsłabsze dni to ${days[wd.k]} (${fSol(wd.pnl, 1)}).`, `Your weakest days are ${daysEn[wd.k]} (${fSol(wd.pnl, 1)}).`);
    const qf = S.byHold.find((r) => r.k === '<1 min');
    if (qf && qf.n >= 4 && qf.pnl < 0) add(55, '⚡', 'tip', `Trade'y krótsze niż minuta dają ${fSol(qf.pnl, 1)} (${qf.n}×). Panika czy plan? Sprawdź notatki.`, `Trades shorter than a minute made ${fSol(qf.pnl, 1)} (${qf.n}×). Panic or plan? Check your notes.`);
    const bt = S.byTag.filter((r) => !['_none', 'revenge', 'rug', 'fomo', 'late', 'early'].includes(r.k) && r.n >= 2).sort((a, b) => b.pnl - a.pnl)[0];
    if (bt && bt.pnl > 0) add(42, '🏷️', 'good', `Najlepszy tag: ${tagLabel(bt.k)} — ${fSol(bt.pnl, 1)}, win rate ${fPct(bt.wr)}. Rób więcej takich setupów.`, `Best tag: ${tagLabel(bt.k)} — ${fSol(bt.pnl, 1)}, win rate ${fPct(bt.wr)}. Do more of these setups.`);
    if (S.wr != null && S.pf != null && S.wr < 0.4 && S.pf > 1.2) add(38, '📈', 'good', `Wygrywasz tylko ${fPct(S.wr)} trade'ów, ale zyski są większe niż straty (profit factor ${S.pf.toFixed(2)}). To działa — pilnuj stop lossów.`, `You win only ${fPct(S.wr)} of trades but winners outsize losers (profit factor ${S.pf.toFixed(2)}). It works — keep your stops.`);
    if (!out.length) add(10, '✅', 'good', 'Nie widzę wyraźnych błędów w tym okresie. Dodawaj notatki i tagi, żeby coach miał więcej danych.', 'No clear mistakes in this period. Add notes and tags so the coach has more to work with.');
    return out.sort((a, b) => b.w - a.w).slice(0, 6);
  }


  /* ---------- v8.15: plan / circuit breaker / extra analytics (pure, testable in node) ---------- */
  const dayKey = (t) => { const d = new Date(t * 1000); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  const dayStart = (t) => { const d = new Date(t * 1000); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000); };
  const weekStart = (t) => { const d0 = dayStart(t), wd = (new Date(d0 * 1000).getDay() + 6) % 7; return dayStart(d0 - wd * 86400 + 43200); };
  function inQuiet(t, R) {
    if (!R || !R.quietOn) return false;
    const h = new Date(t * 1000).getHours(), a = +R.quietFrom, b = +R.quietTo;
    return a === b ? false : a < b ? h >= a && h < b : h >= a || h < b;
  }
  // breaches of the user's own rules during one local day → [{k, at, v}]; k: trades | loss | streak | quiet | size
  function rulesDay(ps, R, d0) {
    const out = [];
    if (!R) return out;
    const d1 = dayStart(d0 + 86400 + 43200);
    const opened = ps.filter((p) => p.status !== 'inc' && p.openAt >= d0 && p.openAt < d1).sort((a, b) => a.openAt - b.openAt);
    const closed = ps.filter((p) => p.status === 'closed' && p.closeAt >= d0 && p.closeAt < d1).sort((a, b) => a.closeAt - b.closeAt);
    if (R.maxTrades > 0 && opened.length > R.maxTrades) out.push({ k: 'trades', at: opened[R.maxTrades].openAt, v: opened.length });
    if (R.maxLoss > 0) { let c = 0; for (const p of closed) { c += p.realized; if (c <= -R.maxLoss) { out.push({ k: 'loss', at: p.closeAt, v: c }); break; } } }
    if (R.lossStreak > 0) { let n = 0; for (const p of closed) { n = p.realized < 0 ? n + 1 : 0; if (n >= R.lossStreak) { out.push({ k: 'streak', at: p.closeAt, v: n }); break; } } }
    if (R.quietOn) { const q = opened.find((p) => inQuiet(p.openAt, R)); if (q) out.push({ k: 'quiet', at: q.openAt, v: new Date(q.openAt * 1000).getHours() }); }
    if (R.maxSize > 0) { const b = opened.find((p) => (p.buySol || p.costSold || 0) > R.maxSize * 1.0001); if (b) out.push({ k: 'size', at: b.openAt, v: b.buySol || b.costSold }); }
    return out.sort((a, b) => a.at - b.at);
  }
  // rule adherence over the loaded period: % of trading days with no breach + streak of clean days (days without trades count as clean)
  function discipline(ps, R, from, tNow) {
    const days = [];
    const lo = dayStart(Math.max(from || 0, tNow - 30 * 86400));
    for (let d = dayStart(tNow), i = 0; d >= lo && i < 32; d = dayStart(d - 43200), i++) {
      const n = ps.filter((p) => p.status !== 'inc' && p.openAt >= d && p.openAt < d + 86400).length;
      days.push({ k: dayKey(d), d, n, br: rulesDay(ps, R, d) });
    }
    const traded = days.filter((x) => x.n > 0), kept = traded.filter((x) => !x.br.length).length;
    let streak = 0; for (const x of days) { if (x.br.length) break; streak++; }
    return { days, kept, total: traded.length, adh: traded.length ? kept / traded.length : null, streak };
  }
  const grade = (v) => (v == null ? '—' : v >= 95 ? 'A+' : v >= 85 ? 'A' : v >= 75 ? 'B' : v >= 65 ? 'C' : v >= 50 ? 'D' : 'F');
  // "what if you had rules": drop every trade opened after the first breach of the day (and single quiet-hour / oversize trades)
  function whatIf(ps, R) {
    const closed = ps.filter((p) => p.status === 'closed' && p.costSold > 0);
    const byDay = {};
    closed.forEach((p) => { (byDay[dayStart(p.openAt)] = byDay[dayStart(p.openAt)] || []).push(p); });
    let actual = 0, sim = 0, skipped = 0, days = 0;
    Object.keys(byDay).forEach((d0) => {
      const br = rulesDay(ps, R, +d0).filter((b) => b.k !== 'quiet' && b.k !== 'size');
      const stop = br[0] || null; let hit = false;
      byDay[d0].forEach((p) => {
        actual += p.realized;
        const cut = stop && (stop.k === 'trades' ? p.openAt >= stop.at : p.openAt > stop.at);
        const bad = inQuiet(p.openAt, R) || (R.maxSize > 0 && (p.buySol || p.costSold) > R.maxSize * 1.0001);
        if (cut || bad) { skipped++; hit = true; } else sim += p.realized;
      });
      if (hit) days++;
    });
    return { actual, sim, diff: sim - actual, skipped, days, n: closed.length };
  }
  // n-th trade of the day (by entry) → group rows 1..4, 5+
  function tradeNo(ps) {
    const closed = ps.filter((p) => p.status === 'closed' && p.costSold > 0).sort((a, b) => a.openAt - b.openAt);
    const cnt = {}, no = new Map();
    closed.forEach((p) => { const d = dayStart(p.openAt); cnt[d] = (cnt[d] || 0) + 1; no.set(p, cnt[d] >= 5 ? '5+' : String(cnt[d])); });
    return group(closed, (p) => no.get(p), ['1', '2', '3', '4', '5+']);
  }
  const MISTAKES = ['fomo', 'revenge', 'late', 'early', 'bundle', 'fear'];
  function mistakeCost(ps) {
    const closed = ps.filter((p) => p.status === 'closed' && p.costSold > 0);
    const rows = MISTAKES.map((k) => { const t = closed.filter((p) => p.tags && p.tags.includes(k)); return { k, n: t.length, pnl: t.reduce((a, p) => a + p.realized, 0), wr: t.length ? t.filter((p) => p.realized > 0).length / t.length : 0 }; }).filter((r) => r.n);
    const ids = new Set(); closed.forEach((p) => { if (p.tags && p.tags.some((t) => MISTAKES.includes(t))) ids.add(p); });
    const tot = [...ids].reduce((a, p) => a + p.realized, 0);
    return { rows: rows.sort((a, b) => a.pnl - b.pnl), total: tot, n: ids.size };
  }
  function breakEven(S0, ps) {
    const closed = ps.filter((p) => p.status === 'closed' && p.costSold > 0);
    const w = closed.filter((p) => p.realized > 0), l = closed.filter((p) => p.realized <= 0);
    if (!w.length || !l.length) return null;
    const aw = w.reduce((a, p) => a + p.realized, 0) / w.length, al = -l.reduce((a, p) => a + p.realized, 0) / l.length;
    return { aw, al, be: al / (aw + al), wr: w.length / closed.length };
  }
  // per-trade Kyvo Scale 0–100 (result, exit quality, process tags, rule fit)
  function tradeScale(p, R) {
    if (!p || p.status !== 'closed' || p.pnlPct == null) return null;
    let s = 50 + Math.max(-25, Math.min(25, p.pnlPct * 30));
    if (p.captured != null) s += Math.max(-8, Math.min(12, (p.captured - 0.35) * 30));
    const t = p.tags || [];
    if (t.includes('plan')) s += 10; if (t.includes('calm')) s += 5; if (t.includes('gold')) s += 4;
    if (t.includes('fomo')) s -= 10; if (t.includes('revenge')) s -= 15; if (t.includes('late')) s -= 5; if (t.includes('fear')) s -= 4;
    if (p.rugged) s -= 8;
    if (p.pnlPct <= -0.5) s -= 6;
    if (R && R.on && R.maxSize > 0 && (p.buySol || p.costSold) > R.maxSize * 1.0001) s -= 10;
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  const core = { rulesDay, discipline, whatIf, tradeNo, mistakeCost, breakEven, tradeScale, grade, dayKey, dayStart, parseSwapTx, buildPositions, enrich, stats, coach, tilt, score, looksSecret, validAddr, mcBucket, holdBucket };
  window.KyvoJournal = { core };
  if (typeof document === 'undefined') return;   // node tests: core only
  /* =====================================================================================================
     DATA (browser): state, RPC sync, coins, Kyvo flags, peaks
     ===================================================================================================== */
  const isPrem = () => !!(window.KyvoPremium && window.KyvoPremium.isActive && window.KyvoPremium.isActive());
  const toast = (m) => (D.toast ? D.toast(m) : window.__kyvoToast ? window.__kyvoToast(m) : console.log(m));
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const blank = () => ({ wallet: '', swaps: {}, sigs: [], head: null, tail: null, sigEnd: false, at: 0, meta: {}, manual: [] });
  let st = Object.assign(blank(), lsGet(KEY, {}));
  function save() {
    if (lsSet(KEY, st)) return;
    // quota: drop non-swap markers older than the window, then retry
    const cut = now() - CFG.days * 86400;
    const keep = new Set(st.sigs.filter((s) => s[1] >= cut).map((s) => s[0]));
    Object.keys(st.swaps).forEach((k) => { if (!st.swaps[k] && !keep.has(k)) delete st.swaps[k]; });
    st.sigs = st.sigs.filter((s) => s[1] >= cut);
    lsSet(KEY, st);
  }
  let job = { busy: false, done: 0, total: 0, rl: 0, err: '', id: 0 };
  let rpcId = 1;
  async function rpc(method, params, jid) {
    let wait = 1200;
    for (let i = 0; i < 5; i++) {
      if (jid !== job.id) throw new Error('cancelled');
      let r = null;
      try {
        const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const to = ac ? setTimeout(() => ac.abort(), 15000) : null;
        r = await fetch(CFG.rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }), signal: ac ? ac.signal : undefined });
        clearTimeout(to);
      } catch (e) { r = null; }
      if (r && r.ok) {
        const j = await r.json().catch(() => null);
        if (j && !j.error) return j.result;
        if (j && j.error && j.error.code !== 429 && j.error.code !== -32429) return null;   // permanent (tx not found etc.)
      }
      job.rl++; render(true);
      await sleep(wait + Math.random() * 400); wait = Math.min(wait * 2, 12000);
    }
    throw new Error('rate');
  }
  function pending() { const cut = now() - CFG.days * 86400; return st.sigs.filter((s) => s[1] >= cut && !(s[0] in st.swaps)); }
  function coverFrom() {
    const cut = now() - CFG.days * 86400;
    let from = now();
    for (const s of st.sigs) { if (s[1] < cut) break; if (!(s[0] in st.swaps)) return { from, full: false }; from = s[1]; }
    return { from: st.sigEnd ? cut : from, full: st.sigEnd };
  }
  async function sync(manual) {
    if (job.busy || !st.wallet || !isPrem()) return;
    const jid = ++job.id;
    job = { busy: true, done: 0, total: 0, rl: 0, err: '', id: jid, phase: 'sigs' };
    render(true);
    const w = st.wallet, cut = now() - CFG.days * 86400;
    if (st.at && cut > st.at / 1000) st.histFrom = 0;   // v8.17: away longer than the window -> older days can have gaps, restart calendar history
    try {
      // 1) new signatures (newest first, until the newest one we know)
      let fresh = [], before = null;
      for (let pg = 0; pg < 4; pg++) {
        const s = await rpc('getSignaturesForAddress', [w, Object.assign({ limit: 1000 }, before ? { before } : {}, st.head ? { until: st.head } : {})], jid);
        if (!s || !s.length) { if (!st.head) st.sigEnd = true; break; }
        if (!pg) var head = s[0].signature;
        fresh = fresh.concat(s.filter((x) => !x.err).map((x) => [x.signature, x.blockTime || 0]));
        before = s[s.length - 1].signature;
        if (!st.head) st.tail = before;
        if (s.length < 1000) { if (!st.head) st.sigEnd = true; break; }
        if ((s[s.length - 1].blockTime || 0) < cut) { if (!st.head) st.sigEnd = true; break; }
      }
      if (head) st.head = head;
      st.sigs = fresh.concat(st.sigs.filter((x) => !fresh.some((f) => f[0] === x[0])));
      // 2) older signatures until the window start (max 4 pages per run)
      for (let pg = 0; pg < 4 && !st.sigEnd && st.tail; pg++) {
        const s = await rpc('getSignaturesForAddress', [w, { limit: 1000, before: st.tail }], jid);
        if (!s || !s.length) { st.sigEnd = true; break; }
        st.sigs = st.sigs.concat(s.filter((x) => !x.err).map((x) => [x.signature, x.blockTime || 0]));
        st.tail = s[s.length - 1].signature;
        if (s.length < 1000 || (s[s.length - 1].blockTime || 0) < cut) st.sigEnd = true;
      }
      save();
      // 3) transactions (newest first, max CFG.maxTx per run, CFG.conc in parallel)
      const q = pending().slice(0, CFG.maxTx);
      job.phase = 'tx'; job.total = q.length; render(true);
      const solPx = await getSolPx();
      let i = 0, lastSave = Date.now();
      const worker = async () => {
        while (i < q.length && jid === job.id) {
          const s = q[i++];
          const tx = await rpc('getTransaction', [s[0], { encoding: 'jsonParsed', maxSupportedTransactionVersion: 1, commitment: 'confirmed' }], jid);
          const sw = tx ? parseSwapTx(tx, w, solPx) : null;
          st.swaps[s[0]] = sw || 0;
          job.done++;
          if (Date.now() - lastSave > 3000) { lastSave = Date.now(); save(); recompute(); render(true); }
          await sleep(60);
        }
      };
      await Promise.all(Array.from({ length: CFG.conc }, worker));
      st.at = Date.now();
      { const cf = coverFrom().from; st.histFrom = st.histFrom ? Math.min(st.histFrom, cf) : cf; }   // v8.17 calendar history start
      save();
    } catch (e) {
      if (jid === job.id) job.err = e && e.message === 'rate' ? 'rate' : 'net';
    } finally {
      if (jid === job.id) { job.busy = false; save(); }
    }
    if (jid !== job.id) return;
    recompute();
    await loadCoins();
    recompute();
    render();
    checkBreach();
    if (job.err && manual) toast(L('Publiczne RPC Solany ogranicza zapytania — spróbuj za minutę.', 'The public Solana RPC is rate-limiting — try again in a minute.'));
    peaksLoop();
    const t = (S && S.tilt) || [];
    if (t[0] && now() - t[0].at < 3600) toast('🧊 ' + L('Tilt guard: zrób 5 min przerwy.', 'Tilt guard: take a 5-min break.'));
  }

  let solPxC = { v: 0, t: 0 };
  async function getSolPx() {
    const lb = D.getLeaderboard && D.getLeaderboard();
    if (lb && lb.sol_price_usd) return lb.sol_price_usd;
    if (solPxC.v && Date.now() - solPxC.t < 600000) return solPxC.v;
    try { const r = await fetch(DS + WSOL); const j = await r.json(); const p = (j || []).map((x) => +x.priceUsd).filter(Boolean); if (p.length) solPxC = { v: p.sort((a, b) => a - b)[p.length >> 1], t: Date.now() }; } catch (e) {}
    return solPxC.v;
  }
  let coins = lsGet(CKEY, {});
  async function loadCoins(force) {
    const ms = [...new Set(allSwaps().map((s) => s.m).concat(st.manual.map((t) => t.m).filter(Boolean)))];
    const need = ms.filter((m) => force || !coins[m] || Date.now() - (coins[m].t || 0) > 600000);
    for (let i = 0; i < need.length; i += 30) {
      try {
        const r = await fetch(DS + need.slice(i, i + 30).join(','));
        const ps = r.ok ? await r.json() : [];
        const best = {};
        (ps || []).forEach((p) => {
          const m = p.baseToken && p.baseToken.address, liq = (p.liquidity && p.liquidity.usd) || 0;
          if (!m || (best[m] && best[m].liq >= liq)) return;
          best[m] = { s: p.baseToken.symbol, n: p.baseToken.name, img: p.info && p.info.imageUrl, mc: p.marketCap || p.fdv, px: +p.priceUsd || 0, pair: p.pairAddress, dex: p.dexId, born: p.pairCreatedAt || null, liq, t: Date.now() };
        });
        need.slice(i, i + 30).forEach((m) => { coins[m] = best[m] || Object.assign({}, coins[m] || {}, { t: Date.now() }); });
      } catch (e) {}
      await sleep(250);
    }
    const keep = new Set(ms);
    Object.keys(coins).forEach((m) => { if (!keep.has(m)) delete coins[m]; });
    lsSet(CKEY, coins);
  }
  let flags = null, gold = null;
  async function loadFlags() {
    if (flags) return;
    flags = {}; gold = {};
    try {
      const r = await fetch('data/track_record.json?t=' + Math.floor(Date.now() / 600000));
      const j = r.ok ? await r.json() : {};
      (j.items || []).forEach((x) => { if (x.chain === 'solana' && x.addr) flags[x.addr] = { at: x.at, mc0: x.mc0, runner: !!(x.kinds && x.kinds.runner) }; });
    } catch (e) {}
    try {
      const r = await fetch('data/gold.json?t=' + Math.floor(Date.now() / 600000));
      const j = r.ok ? await r.json() : {};
      (j.cards || []).forEach((c) => { if (c.level === 'gold' && c.address) gold[c.address] = +c.at || 0; });
    } catch (e) {}
  }
  let peaks = lsGet(PKEY, {}), peakBusy = false;
  async function peaksLoop() {
    if (peakBusy || !isPrem()) return;
    peakBusy = true;
    try {
      const todo = PS.filter((p) => p.status === 'closed' && !p.manual && !p.demo && p.pair && !peaks[p.id]).slice(0, CFG.peakMax);
      for (const p of todo) {
        // leave GeckoTerminal's free quota (~30/min shared with the rest of the app) to the trade-view chart while it is open
        while (sub === 'trade' && root && root.isConnected) await sleep(3000);
        const end = Math.min(now(), p.closeAt + 3600), span = end - p.openAt + 120;
        const agg = span <= 60000 ? 1 : span <= 300000 ? 5 : 15;
        const lim = Math.min(1000, Math.ceil(span / (agg * 60)) + 2);
        try {
          const r = await fetch(`${GT}/networks/solana/pools/${p.pair}/ohlcv/minute?aggregate=${agg}&before_timestamp=${end + agg * 60}&limit=${lim}&currency=usd&token=base`, { headers: { Accept: 'application/json' } });
          if (r.status === 429) { await sleep(20000); continue; }
          if (!r.ok) { peaks[p.id] = { na: 1 }; continue; }
          const j = await r.json();
          const L0 = ((j.data && j.data.attributes && j.data.attributes.ohlcv_list) || []).slice().sort((a, b) => a[0] - b[0]);
          const at = (t) => { let c = null; for (const k of L0) { if (k[0] <= t) c = k; else break; } return c; };
          const ce = at(p.openAt), cx = at(p.closeAt);
          const hi = L0.filter((k) => k[0] + agg * 60 > p.openAt && k[0] <= end).reduce((a, k) => Math.max(a, k[2]), 0);
          peaks[p.id] = ce && cx && hi ? { e: ce[4], x: cx[4], h: Math.max(hi, ce[4], cx[4]), agg } : { na: 1 };
        } catch (e) { /* network — retry next time */ }
        lsSet(PKEY, peaks);
        recompute(); render(true);
        await sleep(4000);
      }
    } finally { peakBusy = false; }
  }

  function allSwaps() { return Object.values(st.swaps).filter(Boolean); }
  let PS = [], S = null, COACH = [], DEMO = false, demoMeta = {}, CALPS = [];
  const findP = (id) => PS.find((x) => x.id === id) || CALPS.find((x) => x.id === id);   // v8.17: calendar can open trades older than the 7-day window
  function recompute() {
    let ps;
    if (!st.wallet && !st.manual.length) { ps = demoPositions(); DEMO = true; }
    else {
      DEMO = false;
      const cf = coverFrom().from;
      ps = st.wallet ? buildPositions(allSwaps().filter((s) => s.at >= cf - 1)) : [];
      ps = ps.concat(st.manual.map(manualPos));
    }
    const solPx = (D.getLeaderboard && (D.getLeaderboard() || {}).sol_price_usd) || solPxC.v || 0;
    tilt(ps);
    enrich(ps, { coins: DEMO ? {} : coins, solPx, flags: flags || {}, gold: gold || {}, meta: DEMO ? demoMeta : st.meta, peaks: DEMO ? {} : peaks });
    DISC = !DEMO && rulesOn() ? discipline(ps, plan.rules, st.wallet ? coverFrom().from : 0, now()) : null;
    PS = ps; S = stats(ps, solPx, { adh: DISC ? DISC.adh : null }); COACH = coach(S, ps);
    /* v8.17 P&L calendar: same synced wallet swaps, but every swap kept on this device since histFrom (the start of the
       unbroken on-chain history; reset after a gap longer than the sync window) — not only the last CFG.days days. */
    if (DEMO) CALPS = ps;
    else {
      if (st.wallet && st.at && !st.histFrom) st.histFrom = coverFrom().from;
      const hf = st.histFrom || coverFrom().from;
      const cps = (st.wallet ? buildPositions(allSwaps().filter((s) => s.at >= hf - 1)) : []).concat(st.manual.map(manualPos));
      enrich(cps, { coins, solPx, flags: flags || {}, gold: gold || {}, meta: st.meta, peaks });
      CALPS = cps;
    }
  }
  function manualPos(t) {
    const r = t.entryMc && t.exitMc ? t.size * (t.exitMc / t.entryMc - 1) : t.pnl || 0;
    return { id: t.id, manual: 1, m: t.m || '', sym: t.sym || (t.m ? short(t.m) : '?'), fills: [], openAt: t.openAt, closeAt: t.closeAt, buySol: t.size, sellSol: t.size + r, costSold: t.size, procSold: t.size + r, realized: r, pnlPct: t.size ? r / t.size : null, hold: t.closeAt - t.openAt, entryMc: t.entryMc || null, exitMc: t.exitMc || null, status: 'closed', inc: 0 };
  }

  /* ---------- demo ("Przykład") — shown only when no wallet and no manual trades; always labeled ---------- */
  function demoPositions() {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const syms = ['PRZYKŁAD', 'DEMO', 'SAMPLE', 'TEST', 'KOT', 'PIES', 'ŻABA', 'RAKIETA', 'KSIĘŻYC', 'BANAN'];
    const out = [], t0 = now() - 20 * 86400;
    for (let i = 0; i < 46; i++) {
      const open = t0 + Math.floor(i * 20 * 86400 / 46 + rnd() * 20000);
      const hour = new Date(open * 1000).getHours();
      const night = hour >= 1 && hour < 5;
      const size = [0.25, 0.5, 0.5, 1, 1, 2][Math.floor(rnd() * 6)];
      let r = rnd();
      let pct = night ? (r < 0.75 ? -0.3 - rnd() * 0.65 : rnd() * 1.2) : r < 0.45 ? -0.15 - rnd() * 0.6 : r < 0.9 ? 0.1 + rnd() * 1.4 : 2 + rnd() * 6;
      const hold = pct < -0.6 ? 1500 + rnd() * 3000 : pct < 0 ? 300 + rnd() * 1800 : 60 + rnd() * 900;
      const mc0 = [22e3, 45e3, 80e3, 140e3, 260e3, 600e3][Math.floor(rnd() * 6)];
      const p = { id: 'demo' + i, demo: 1, m: '', sym: syms[i % syms.length], fills: [], openAt: open, closeAt: Math.round(open + hold), buySol: size, costSold: size, procSold: size * (1 + pct), sellSol: size * (1 + pct), realized: size * pct, pnlPct: pct, hold: Math.round(hold), entryMc: mc0, exitMc: mc0 * (1 + pct), status: 'closed', manual: 1 };
      if (i % 5 === 0) { p.kyvo = 1; }
      out.push(p);
    }
    out.forEach((p, i) => { if (p.kyvo) { p.realized = Math.abs(p.realized) * (i % 3 ? 1 : -0.4); p.pnlPct = p.realized / p.costSold; p.exitMc = p.entryMc * (1 + p.pnlPct); } });
    const meta = {};
    out.forEach((p, i) => { const t = []; if (p.kyvo) t.push('kyvo'); if (p.pnlPct < -0.5 && i % 2) t.push('fomo'); if (p.pnlPct > 0 && p.pnlPct < 0.4 && i % 3 === 0) t.push('early'); if (i % 7 === 3) t.push('plan'); meta[p.id] = { t }; p.captured = p.pnlPct > 0 ? 0.2 + (i % 5) * 0.08 : 0; });
    demoMeta = meta;
    return out.sort((a, b) => b.closeAt - a.closeAt);
  }

  /* =====================================================================================================
     VIEW
     ===================================================================================================== */
  let root = null, sub = 'dash', filt = 'all', calM = null, calSel = null;
  const TABS = [['dash', '📊', 'Dashboard', 'Dashboard'], ['plan', '📋', 'Plan', 'Plan'], ['log', '📓', 'Dziennik', 'Journal'], ['stats', '📈', 'Analityka', 'Analytics'], ['coach', '🤖', 'Coach', 'Coach']];
  const ICO = (k, fb) => (window.KyvoIcons && window.KyvoIcons[k]) || fb;   // v8.15 line icons (fx.js), emoji fallback
  const go = (h) => { location.hash = 'journal' + (h ? '/' + h : ''); };
  function coinImg(p, sz) {
    sz = sz || 34;
    return p.img ? `<img class="jr-ci" src="${E(p.img)}" width="${sz}" height="${sz}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">`
      : `<span class="jr-ci jr-cil" style="width:${sz}px;height:${sz}px">${E(((p.sym || '?').replace('$', '')[0] || '?').toUpperCase())}</span>`;
  }
  const chips = (p, max) => p.tags.slice(0, max || 9).map((t) => `<span class="jr-tag t-${E(t)}">${E(tagLabel(t))}</span>`).join('');

  /* ---------- v8.15: daily plan, circuit breaker, reflections, goals, showcase (all stored on this device) ---------- */
  const PLK = 'kyvo_journal_plan';
  const DEF_RULES = { on: false, maxTrades: 12, maxLoss: 1, lossStreak: 3, maxSize: 0, brk: 10, quietOn: false, quietFrom: 2, quietTo: 7, push: false, since: 0 };
  const DEF_ITEMS = [
    ['d1', 'Sprawdzam dev, LP i holderów przed wejściem', 'I check dev, LP and holders before entering'],
    ['d2', 'Stały rozmiar pozycji — bez all-in', 'Fixed position size — no all-in'],
    ['d3', 'Wyjście (np. −30%) ustalone przed kupnem', 'Exit (e.g. −30%) set before buying'],
    ['d4', 'Nie gonię coina po +100% w godzinę', 'I don’t chase a coin after +100% in an hour'],
    ['d5', 'Po stracie przerwa, nie od razu kolejny buy', 'After a loss a break, not the next buy right away'],
  ];
  const planBlank = () => ({ rules: Object.assign({}, DEF_RULES), items: DEF_ITEMS.map((x) => ({ id: x[0] })), done: {}, goals: { day: 0, week: 0 }, days: {}, weeks: {}, cool: null, seen: {}, pins: [], cb: { kept: 0, early: 0 } });
  let plan = (() => { const p = Object.assign(planBlank(), lsGet(PLK, {})); p.rules = Object.assign({}, DEF_RULES, p.rules || {}); p.cb = Object.assign({ kept: 0, early: 0 }, p.cb || {}); return p; })();
  function savePlan() {
    const lim = dayKey(now() - 60 * 86400);
    ['done', 'days'].forEach((f) => Object.keys(plan[f]).forEach((k) => { if (k < lim) delete plan[f][k]; }));
    Object.keys(plan.seen).forEach((k) => { if (k.slice(0, 10) < dayKey(now() - 14 * 86400)) delete plan.seen[k]; });
    lsSet(PLK, plan);
  }
  const itemText = (it) => { const d = DEF_ITEMS.find((x) => x[0] === it.id); return d ? L(d[1], d[2]) : it.t || ''; };
  const weekKey = (t) => dayKey(weekStart(t));
  const MOODS = [['calm', '🧘', 'Spokój', 'Calm'], ['ok', '🙂', 'OK', 'OK'], ['fomo', '😵', 'FOMO', 'FOMO'], ['tilt', '😤', 'Tilt', 'Tilt']];
  const BRK = {
    trades: (b, R) => L(`${b.v} trade’ów dziś — Twój limit to ${R.maxTrades}.`, `${b.v} trades today — your limit is ${R.maxTrades}.`),
    loss: (b, R) => L(`Dzisiejsza strata ${fSol(b.v, 1)} — limit to −${R.maxLoss} SOL.`, `Today’s loss is ${fSol(b.v, 1)} — the limit is −${R.maxLoss} SOL.`),
    streak: (b) => L(`${b.v} stratne trade’y z rzędu.`, `${b.v} losing trades in a row.`),
    quiet: (b, R) => L(`Trade w godzinach ciszy (${R.quietFrom}:00–${R.quietTo}:00).`, `A trade during quiet hours (${R.quietFrom}:00–${R.quietTo}:00).`),
    size: (b, R) => L(`Pozycja ${fSol(b.v)} — powyżej limitu ${R.maxSize} SOL.`, `A ${fSol(b.v)} position — above your ${R.maxSize} SOL limit.`),
  };
  const RNAME = { trades: ['Limit trade’ów', 'Trade limit'], loss: ['Limit straty', 'Loss limit'], streak: ['Straty z rzędu', 'Losses in a row'], quiet: ['Godziny ciszy', 'Quiet hours'], size: ['Rozmiar pozycji', 'Position size'] };
  let DISC = null;
  function today() {
    const t = now(), d0 = dayStart(t), w0 = weekStart(t);
    const live = DEMO ? [] : PS;
    const closedT = live.filter((p) => p.status === 'closed' && p.closeAt >= d0).sort((a, b) => b.closeAt - a.closeAt);
    let ls = 0; for (const p of closedT) { if (p.realized < 0) ls++; else break; }
    return {
      d0, n: live.filter((p) => p.status !== 'inc' && p.openAt >= d0).length,
      pnl: closedT.reduce((a, p) => a + p.realized, 0),
      week: live.filter((p) => p.status === 'closed' && p.closeAt >= w0).reduce((a, p) => a + p.realized, 0),
      nW: live.filter((p) => p.status === 'closed' && p.closeAt >= w0).length,
      wr: closedT.length ? closedT.filter((p) => p.realized > 0).length / closedT.length : null, nC: closedT.length, ls,
      br: !DEMO && rulesOn() ? rulesDay(PS, plan.rules, d0) : [],
    };
  }
  function checkBreach() {
    if (DEMO || !rulesOn() || !isPrem()) return;
    const t = now(), dk = dayKey(t);
    const fresh = rulesDay(PS, plan.rules, dayStart(t)).filter((b) => b.at >= (plan.rules.since || 0) && t - b.at < 3 * 3600 && !plan.seen[dk + ':' + b.k]);
    if (!fresh.length) return;
    fresh.forEach((b) => { plan.seen[dk + ':' + b.k] = 1; });
    const b = fresh[fresh.length - 1];
    plan.cool = { until: t + Math.max(1, +plan.rules.brk || 10) * 60, at: t, k: b.k, v: b.v };
    savePlan(); mountCool();
    if (plan.rules.push && typeof Notification !== 'undefined' && Notification.permission === 'granted' && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((r) => r.showNotification('Kyvo · ' + L('Bezpiecznik', 'Circuit breaker'), { body: BRK[b.k](b, plan.rules) + ' ' + L(`Przerwa ${plan.rules.brk} min.`, `${plan.rules.brk}-min break.`), icon: 'icons/icon-192.png', tag: 'kyvo-cb' })).catch(() => {});
    }
  }
  /* full-screen cooldown ("bezpiecznik"): a timed break after a broken rule. Kyvo cannot block the wallet — it is a firm nudge. */
  let coolT = 0;
  // v8.15 pass 5: full-screen break screen (timer must run out; ending early is possible but asks and is counted)
  const COOL_HEAD = {
    loss: ['Dzienny limit straty osiągnięty.', 'Daily loss limit hit.'],
    streak: ['Seria strat. Bezpiecznik zadziałał.', 'Losing streak. The breaker tripped.'],
    trades: ['Limit trade’ów na dziś wyczerpany.', 'Today’s trade limit is used up.'],
    size: ['Za duża pozycja jak na Twoje zasady.', 'Too big a position for your own rules.'],
    quiet: ['Godziny ciszy. Miało nie być tradingu.', 'Quiet hours. You said no trading now.'],
  };
  const coolWhy = (c, R) => {
    const b = (x) => `<b>${E(x)}</b>`;
    switch (c.k) {
      case 'loss': return L(`${b(fSol(c.v, 1))} dziś — Twój dzienny limit to −${E(R.maxLoss)} SOL`, `${b(fSol(c.v, 1))} today — your daily limit is −${E(R.maxLoss)} SOL`);
      case 'streak': return L(`${b(c.v)} stratne trade’y z rzędu — bezpiecznik włączony`, `${b(c.v)} losing trades in a row — circuit breaker on`);
      case 'trades': return L(`${b(c.v)} trade’ów dziś — Twój limit to ${E(R.maxTrades)}`, `${b(c.v)} trades today — your limit is ${E(R.maxTrades)}`);
      case 'size': return L(`Pozycja ${b(fSol(c.v))} — Twój limit to ${E(R.maxSize)} SOL`, `A ${b(fSol(c.v))} position — your limit is ${E(R.maxSize)} SOL`);
      case 'quiet': return L(`Trade w godzinach ciszy ${b(R.quietFrom + ':00–' + R.quietTo + ':00')}`, `A trade during quiet hours ${b(R.quietFrom + ':00–' + R.quietTo + ':00')}`);
      default: return E(BRK[c.k] ? BRK[c.k](c, R) : '');
    }
  };
  function closeCool(el) {
    clearInterval(coolT); coolT = 0;
    document.body.classList.remove('ky-noscroll');
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.remove(); return; }
    el.classList.add('out'); setTimeout(() => el.remove(), 320);
  }
  function mountCool() {
    if (!BREAKER) { if (plan.cool) { plan.cool = null; savePlan(); } const o = document.querySelector('.ky-cool'); if (o) o.remove(); return; }
    const c = plan.cool, old = document.getElementById('kyCool');
    // finished long ago (app was closed): count it as kept, no screen
    if (!c || c.until + 1800 <= now()) {
      if (c) { plan.cool = null; plan.cb.kept++; savePlan(); }
      if (old) closeCool(old); else { clearInterval(coolT); coolT = 0; document.body.classList.remove('ky-noscroll'); }
      return;
    }
    const R = plan.rules, el = old || document.createElement('div');
    const tot = Math.max(60, c.until - c.at), C = 2 * Math.PI * 92;
    const head = COOL_HEAD[c.k] || ['Przerwa.', 'Break.'];
    el.id = 'kyCool'; el.className = 'ky-cool'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('translate', 'no');
    el.setAttribute('aria-labelledby', 'kycH');
    const art = window.KyvoArt ? KyvoArt.pic('arc', '100vw', { cls: 'kyc-arcimg', eager: 1 }) : '';
    el.innerHTML = `<div class="kyc-vig" aria-hidden="true"></div>${art}
      <div class="kyc-box">
        <div class="kyc-ic" aria-hidden="true">${ICO('shield_alert', ICO('shield', '🛡'))}</div>
        <small class="kyc-k">${L('Bezpiecznik', 'Circuit breaker')} · ${L(RNAME[c.k] ? RNAME[c.k][0] : '', RNAME[c.k] ? RNAME[c.k][1] : '')}</small>
        <h2 id="kycH">${L(head[0], head[1])}</h2>
        <p class="kyc-red">${L('Odejdź od wykresu.', 'Step back from the chart.')}</p>
        <p class="kyc-sub">${L('Memecoiny nie uciekną. Twój kapitał — może.', 'Memecoins aren’t going anywhere. Your bankroll might.')}</p>
        <div class="kyc-why">${coolWhy(c, R)}</div>
        <div class="kyc-ring" role="timer" aria-live="off">
          <svg viewBox="0 0 220 220" aria-hidden="true">
            <defs><linearGradient id="kycR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".55" stop-color="#ef4444"/><stop offset="1" stop-color="#b91c1c"/></linearGradient>
            <linearGradient id="kycC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".5" stop-color="#8e96a3" stop-opacity=".25"/><stop offset="1" stop-color="#ffffff" stop-opacity=".45"/></linearGradient></defs>
            <circle cx="110" cy="110" r="106" fill="none" stroke="url(#kycC)" stroke-width="1.2"/>
            <circle cx="110" cy="110" r="92" fill="none" stroke="#ef44441f" stroke-width="10"/>
            <circle class="kyc-arc" cx="110" cy="110" r="92" fill="none" stroke="url(#kycR)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" transform="rotate(-90 110 110)"/>
            <circle cx="110" cy="110" r="78" fill="none" stroke="url(#kycC)" stroke-width="1"/>
          </svg>
          <div class="kyc-mid"><b class="kyc-t">--:--</b><small class="kyc-l">${L('pozostało', 'remaining')}</small></div>
        </div>
        <div class="kyc-act"></div>
        <small class="kyc-note">${L('Kyvo nie blokuje portfela ani transakcji — to przerwa, którą sam sobie ustawiłeś.', 'Kyvo doesn’t block your wallet or trades — this is a break you set for yourself.')} ${L('Dotrzymane', 'Kept')}: ${plan.cb.kept} · ${L('przerwane', 'ended early')}: ${plan.cb.early}</small>
      </div>`;
    if (!old) document.body.appendChild(el);
    document.body.classList.add('ky-noscroll');
    const act = el.querySelector('.kyc-act'), t = el.querySelector('.kyc-t'), a = el.querySelector('.kyc-arc'), lab = el.querySelector('.kyc-l');
    let state = '';
    const setAct = (done) => {
      if (state === (done ? 'd' : 'r')) return; state = done ? 'd' : 'r';
      el.classList.toggle('done', done);
      act.innerHTML = done
        ? `<button type="button" class="kyc-ok" data-kyc="ok">${L('Rozumiem. Wracam tylko z planem.', 'Got it. I’m back only with a plan.')}</button>`
        : `<small class="kyc-wait">${L('Przycisk odblokuje się, gdy licznik dojdzie do zera.', 'The button unlocks when the timer reaches zero.')}</small><button type="button" class="kyc-early" data-kyc="early">${L('Zakończ przerwę wcześniej', 'End the break early')}</button>`;
      const ok = act.querySelector('[data-kyc="ok"]'), early = act.querySelector('[data-kyc="early"]');
      if (ok) {
        ok.onclick = () => { plan.cool = null; plan.cb.kept++; savePlan(); closeCool(el); toast(L('Przerwa dotrzymana. Wracaj z planem.', 'Break kept. Come back with a plan.')); if (root && root.isConnected) render(); };
        setTimeout(() => { try { ok.focus({ preventScroll: true }); } catch (e) {} }, 50);
      }
      if (early) early.onclick = () => {
        if (!confirm(L('Na pewno? Przerwanie przerwy liczy się w statystyce dyscypliny.', 'Sure? Ending the break early counts in your discipline stats.'))) return;
        plan.cool = null; plan.cb.early++; savePlan(); closeCool(el); if (root && root.isConnected) render();
      };
    };
    const tick = () => {
      if (!plan.cool) return;
      const left = Math.max(0, plan.cool.until - now());
      const done = left <= 0;
      if (t) t.textContent = done ? L('Gotowe', 'Ready') : Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
      if (lab) lab.textContent = done ? L('możesz wrócić', 'you can come back') : L('pozostało', 'remaining');
      if (a) a.style.strokeDashoffset = (C * (left / tot)).toFixed(1);
      setAct(done);
      if (done) { clearInterval(coolT); coolT = 0; }
    };
    // first frame: arc drawn from empty, then follows the clock
    requestAnimationFrame(() => requestAnimationFrame(tick));
    setAct(plan.cool.until <= now());
    clearInterval(coolT); coolT = setInterval(tick, 1000);
  }
  // light background check while the app is open: new swaps only (one RPC call when nothing changed)
  setInterval(() => {
    if (!rulesOn() || !st.wallet || job.busy || document.visibilityState !== 'visible' || !isPrem()) return;
    if (Date.now() - (st.at || 0) > 170000) sync(false);
  }, 60000);

  function shareTrade(p) {
    if (!window.KyvoShare || !p) return;
    if (DEMO || p.demo) { toast(L('Podłącz portfel albo dodaj trade, żeby udostępnić swój wynik.', 'Connect a wallet or add a trade to share your own result.')); return; }
    const pnl = p.status === 'open' ? p.unreal : p.realized, pct = p.status === 'open' ? p.unrealPct : p.pnlPct, px = S.solPx;
    KyvoShare.open({ kind: 'trade', sym: p.sym, title: '$' + p.sym, img: p.img || null, big: fPct(pct, 1), pos: pnl > 0 ? true : pnl < 0 ? false : null,
      sub: fSol(pnl, 1) + (px && pnl ? '  ·  ' + fUsd(pnl * px, 1) : ''),
      rows: [[L('MC wejścia', 'Entry MC'), fMc(p.entryMc)], [p.status === 'open' ? L('MC teraz', 'MC now') : L('MC wyjścia', 'Exit MC'), fMc(p.status === 'open' ? p.mcNow : p.exitMc)], [L('Czas trzymania', 'Hold time'), fHold(p.hold)], ['Kyvo Scale', tradeScale(p, rulesOn() ? plan.rules : null) == null ? '—' : tradeScale(p, rulesOn() ? plan.rules : null) + '/100']],
      when: fDate(p.closeAt || p.openAt) });
  }
  function shareMonth() {   // v8.17: 1080×1920 card with the month's P&L calendar
    if (!window.KyvoShare || !calM) return;
    if (DEMO) { toast(L('Podłącz portfel albo dodaj trade, żeby udostępnić swój wynik.', 'Connect a wallet or add a trade to share your own result.')); return; }
    const [Y, M] = calM, first = new Date(Y, M, 1), dim = new Date(Y, M + 1, 0).getDate(), C = calMonth(Y, M), px = S.solPx || 0;
    const cells = [];
    for (let d = 1; d <= dim; d++) { const r = C.days[dKey(new Date(Y, M, d))]; cells.push(r ? { d, v: r.pnl, t: (r.pnl < 0 && !isBE({ realized: r.pnl, costSold: 0 }) ? '−' : '') + fCompact(r.pnl, px), be: isBE({ realized: r.pnl, costSold: 0 }) } : { d }); }
    KyvoShare.open({ kind: 'month', title: first.toLocaleString(isEn() ? 'en-GB' : 'pl-PL', { month: 'long', year: 'numeric' }).toUpperCase(),
      big: px ? fUsd(C.pnl * px, 1) : fSol(C.pnl, 1), pos: C.pnl > 0 ? true : C.pnl < 0 ? false : null, sub: px ? fSol(C.pnl, 1) : '',
      cal: { pad: (first.getDay() + 6) % 7, cells, wd: isEn() ? ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] : ['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SO', 'ND'] },
      rows: [[L('Rekord W-L-BE', 'Record W-L-BE'), `${C.w}-${C.l}-${C.be}`], [L('Zysk za miesiąc', 'Month profit'), px ? fUsd(C.pnl * px, 1) : fSol(C.pnl, 1)]],
      verified: !!(st.wallet && !C.manual), when: st.at ? L('Zaktualizowano', 'Updated') + ' ' + fDate(st.at / 1000, 1) : fDate(now()) });
  }
  function shareDay(period) {
    if (!window.KyvoShare) return;
    if (DEMO) { toast(L('Podłącz portfel albo dodaj trade, żeby udostępnić swój wynik.', 'Connect a wallet or add a trade to share your own result.')); return; }
    const T = today(), px = S.solPx;
    const d = period === 'day' ? { t: L('Dzisiaj', 'Today'), pnl: T.pnl, n: T.nC, wr: T.wr }
      : { t: L(`Ostatnie ${CFG.days} dni`, `Last ${CFG.days} days`), pnl: S.pnl, n: S.n, wr: S.wr };
    KyvoShare.open({ kind: 'day', title: d.t, big: fSol(d.pnl, 1).replace(' SOL', ''), pos: d.pnl > 0 ? true : d.pnl < 0 ? false : null,
      sub: 'SOL' + (px ? '  ·  ' + fUsd(d.pnl * px, 1) : ''),
      rows: [['Trades', String(d.n)], ['Win rate', d.wr == null ? '—' : fPct(d.wr)], ['Kyvo Score', S.score ? S.score.total + '/100' : '—'], [L('Dyscyplina', 'Discipline'), DISC && DISC.adh != null ? grade(Math.round(DISC.adh * 100)) : S.score ? grade(S.score.c.disc) : '—']],
      when: fDate(now()) });
  }
  /* v8.20 🎴 Kreator P&L (pnlcard.js): card data built ONLY from Journal trades. Source label: wallet → on-chain,
     hand-entered → "wpisane ręcznie", sample data → "demo". */
  const fBigUsd = (n) => { if (n == null || !isFinite(n)) return ''; const a = Math.abs(n), s = n < 0 ? '−' : '+'; return s + '$' + (a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a.toLocaleString('en-US', { maximumFractionDigits: a >= 100 ? 0 : 2, minimumFractionDigits: a >= 100 ? 0 : 2 })); };
  const fFull = (t) => { try { return new Date(t * 1000).toLocaleDateString(isEn() ? 'en-GB' : 'pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { return fDate(t); } };
  const srcOf = (ps) => (DEMO || ps.some((p) => p.demo) ? 'demo' : ps.some((p) => p.manual) || !st.wallet ? 'manual' : 'wallet');
  function myNick() { try { const o = window.KyvoProfile && window.KyvoProfile.own && window.KyvoProfile.own(); return (o && o.nick) || ''; } catch (e) { return ''; } }
  function pnlCard(kind, arg) {
    if (!isPrem()) { if (D.openPremium) D.openPremium(); else location.hash = 'premium'; return; }
    if (!window.KyvoPnlCard) return;
    const px = S.solPx || 0, base = { nick: myNick() };
    if (kind === 'trade') {
      const p = findP(arg);
      if (!p || p.status === 'inc') { toast(L('Ten trade nie ma pełnego wyniku (brak kosztu wejścia).', 'This trade has no full result (no entry cost).')); return; }
      const open = p.status === 'open', pnl = open ? p.unreal : p.realized, pct = open ? p.unrealPct : p.pnlPct, size = p.buySol || p.costSold;
      if (pnl == null || !isFinite(pnl)) { toast(L('Brak wyniku dla tego trade’u.', 'No result for this trade yet.')); return; }
      return KyvoPnlCard.open(Object.assign(base, { kind, sym: p.sym, pill: '$' + p.sym + ' · Trade', whoSub: '$' + p.sym + ' · Solana',
        label: open ? L('Niezrealizowany P&L', 'Unrealized P&L') : pnl >= 0 ? L('Zrealizowany zysk', 'Realized profit') : L('Zrealizowana strata', 'Realized loss'),
        usdTxt: px ? fBigUsd(pnl * px) : '', solTxt: fSol(pnl, 1), pctTxt: fPct(pct, 1), pos: pnl > 0 ? true : pnl < 0 ? false : null,
        stats: [[px ? fUsd(size * px) : fSol(size), L('wkład', 'invested')], [fHold(p.hold), L('czas trzymania', 'hold time')], [fMc(p.entryMc), L('MC wejścia', 'entry MC')]],
        statsNoUsd: [[fPct(pct, 1), L('wynik', 'result')], [fHold(p.hold), L('czas trzymania', 'hold time')], [fMc(p.entryMc), L('MC wejścia', 'entry MC')]],
        when: fFull(p.closeAt || p.openAt), src: srcOf([p]) }));
    }
    let ps, label, pill, when;
    if (kind === 'month') {
      const [Y, M] = calM || [new Date().getFullYear(), new Date().getMonth()];
      ps = calMonth(Y, M).closed;
      const mn = new Date(Y, M, 1).toLocaleString(isEn() ? 'en-GB' : 'pl-PL', { month: 'long', year: 'numeric' });
      label = L('Zysk za miesiąc', 'Month profit') + ' · ' + mn; pill = L('Miesiąc', 'Month'); when = mn;
    } else {   // day: arg = 'YYYY-MM-DD' (calendar) or today
      const k = arg || dKey(new Date());
      ps = CALPS.filter((p) => p.status === 'closed' && p.costSold > 0 && p.closeAt && dKey(new Date(p.closeAt * 1000)) === k);
      const isT = k === dKey(new Date());
      label = isT ? L('Zysk dziś', 'Profit today') : L('Zysk dnia', 'Day profit'); pill = isT ? L('Dziś', 'Today') : L('Dzień', 'Day');
      when = ps.length ? fFull(ps[0].closeAt) : fFull(now());
    }
    if (!ps.length) { toast(kind === 'month' ? L('Brak zamkniętych trade’ów w tym miesiącu.', 'No closed trades this month.') : L('Brak zamkniętych trade’ów tego dnia.', 'No closed trades that day.')); return; }
    const pnl = ps.reduce((a, p) => a + p.realized, 0), cost = ps.reduce((a, p) => a + (p.costSold || 0), 0), w = ps.filter((p) => !isBE(p) && p.realized > 0).length, l = ps.filter((p) => !isBE(p) && p.realized < 0).length;
    if (pnl < 0) label = kind === 'month' ? L('Wynik za miesiąc', 'Month result') + label.slice(label.indexOf(' · ')) : L('Wynik dnia', 'Day result');
    const wr = fPct(ps.length ? w / ps.length : null);
    KyvoPnlCard.open(Object.assign(base, { kind, pill, whoSub: L('Dziennik · Solana', 'Journal · Solana'), label,
      usdTxt: px ? fBigUsd(pnl * px) : '', solTxt: fSol(pnl, 1), pctTxt: cost ? fPct(pnl / cost, 1) : '', pos: pnl > 0 ? true : pnl < 0 ? false : null,
      stats: [[String(ps.length), L('trade’ów', 'trades')], [`${w}-${l}`, L('wygrane-przegrane', 'wins-losses')], [wr, 'win rate']],
      when, src: srcOf(ps) }));
  }
  const showcase = () => {
    const pins = PS.filter((p) => plan.pins.includes(p.id));
    const auto = PS.filter((p) => !plan.pins.includes(p.id) && (tradeScale(p, rulesOn() ? plan.rules : null) || 0) >= 85).sort((a, b) => b.realized - a.realized);
    return pins.concat(auto).slice(0, 8);
  };
  function showcaseHtml() {
    const sc = showcase();
    if (!sc.length) return '';
    return `<div class="card jr-show"><div class="jr-cardh"><b>${ICO('pin', '⭐')} Showcase</b><small class="mut">${L('przypięte + auto A+ (Kyvo Scale 85+)', 'pinned + auto A+ (Kyvo Scale 85+)')}</small></div>
      <div class="jr-showr">${sc.map((p) => `<a class="jr-shc" href="#journal/trade/${E(p.id)}">${coinImg(p, 30)}<b>$${E(p.sym)}</b><span class="${cls(p.realized)}">${fPct(p.pnlPct, 1)}</span><i>${plan.pins.includes(p.id) ? ICO('pin', '⭐') : 'A+'}</i></a>`).join('')}</div></div>`;
  }
  function planStrip() {
    const T = today(), R = plan.rules, dk = dayKey(now());
    const done = (plan.done[dk] || []).length, tot = plan.items.length;
    const st0 = !BREAKER ? null : !R.on ? ['off', L('Bezpiecznik wyłączony', 'Circuit breaker off')] : T.br.length ? ['bad', L('Zasada złamana dziś', 'A rule broken today')] : ['ok', L('Zasady dotrzymane', 'Rules kept')];
    return `<a class="card jr-pstrip" href="#journal/plan"><span class="jr-psi">${ICO('j_plan', '📋')}</span><div><small>${L('Plan dnia', 'Today’s plan')}</small><b>${L('Checklista', 'Checklist')} ${done}/${tot}${plan.goals.day ? ` · ${L('cel', 'goal')} ${fSol(T.pnl, 1).replace(' SOL', '')}/${plan.goals.day}` : ''}</b></div>${st0 ? `<span class="jr-pss ${st0[0]}">${st0[1]}</span>` : `<span class="mut">›</span>`}</a>`;
  }
  const num = (v, d) => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) && x >= 0 ? x : d; };
  function meter(lbl, cur, max, txt, bad) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (cur / max) * 100)) : 0;
    return `<div class="jr-mt${bad ? ' bad' : pct >= 80 ? ' warn' : ''}"><div><span>${lbl}</span><b>${txt}</b></div><i><u style="width:${max > 0 ? pct.toFixed(0) : 0}%"></u></i></div>`;
  }
  function planView() {
    const T = today(), R = plan.rules, t = now(), dk = dayKey(t), wk = weekKey(t);
    const done = plan.done[dk] || [], day = plan.days[dk] || {}, week = plan.weeks[wk] || {};
    const hrs = Array.from({ length: 24 }, (_, i) => i);
    const sel = (n, v, opts) => `<select name="${n}">${opts.map((o) => `<option value="${o[0]}"${+v === +o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const disc = DISC;
    const dScore = disc && disc.adh != null ? Math.round(disc.adh * 100) : null;
    // journaling streak: consecutive days with a checklist tick or a note
    let jst = 0; for (let d = dayStart(t), i = 0; i < 60; d = dayStart(d - 43200), i++) { const k = dayKey(d), x = plan.days[k] || {}; if ((plan.done[k] || []).length || x.plan || x.post || x.mood) jst++; else if (i > 0 || k !== dk) break; }
    let wst = 0; for (let w = weekStart(t), i = 0; i < 26; w = weekStart(w - 3 * 86400), i++) { const x = plan.weeks[dayKey(w)] || {}; if (x.good || x.bad || x.change || x.score) wst++; else if (i > 0) break; }
    const status = !R.on ? `<div class="jr-cbs off">${L('Wyłączony. Ustaw limity i włącz — Kyvo sprawdza je na Twoich trade’ach z portfela.', 'Off. Set your limits and turn it on — Kyvo checks them against your wallet trades.')}</div>`
      : T.br.length ? `<div class="jr-cbs bad"><b>${L('Złamane dziś', 'Broken today')}:</b> ${T.br.map((b) => E(BRK[b.k](b, R))).join(' ')}</div>`
      : `<div class="jr-cbs ok">${L('Wszystkie zasady dotrzymane dziś.', 'All rules kept today.')}${DEMO ? ' ' + L('(podłącz portfel, żeby sprawdzać automatycznie)', '(connect a wallet to check automatically)') : ''}</div>`;
    return `
      <div class="jr-plh"><b class="jr-chrome">${L('Plan dnia', 'Today’s plan')}</b><small class="mut">${E(new Date().toLocaleDateString(isEn() ? 'en-GB' : 'pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }))}</small></div>
      ${BREAKER ? `
      <div class="card jr-cb ${R.on ? (T.br.length ? 'bad' : 'on') : ''}">
        <div class="jr-cardh"><b>${ICO('shield', '🛡')} ${L('Bezpiecznik', 'Circuit breaker')}</b><button type="button" class="jr-sw${R.on ? ' on' : ''}" data-pl="rules-on" role="switch" aria-checked="${R.on}" aria-label="${L('Włącz bezpiecznik', 'Turn on the circuit breaker')}"><i></i></button></div>
        ${status}
        ${R.on ? `<div class="jr-mts">
          ${R.maxTrades ? meter(L('Trade’y dziś', 'Trades today'), T.n, R.maxTrades, `${T.n}/${R.maxTrades}`, T.n > R.maxTrades) : ''}
          ${R.maxLoss ? meter(L('P&L dziś (limit straty)', 'P&L today (loss limit)'), Math.max(0, -T.pnl), R.maxLoss, `${fSol(T.pnl, 1).replace(' SOL', '')} / −${R.maxLoss} SOL`, -T.pnl >= R.maxLoss) : ''}
          ${R.lossStreak ? meter(L('Straty z rzędu', 'Losses in a row'), T.ls, R.lossStreak, `${T.ls}/${R.lossStreak}`, T.ls >= R.lossStreak) : ''}
        </div>` : ''}
        <details class="jr-cbf"${R.on ? '' : ' open'}><summary>${L('Moje zasady', 'My rules')}</summary>
          <form id="jrRules" class="jr-rf" autocomplete="off">
            <label>${L('Maks. trade’ów dziennie', 'Max trades per day')}<input name="maxTrades" inputmode="numeric" value="${R.maxTrades || ''}" placeholder="0 = ${L('bez limitu', 'no limit')}"></label>
            <label>${L('Maks. strata dziennie (SOL)', 'Max daily loss (SOL)')}<input name="maxLoss" inputmode="decimal" value="${R.maxLoss || ''}" placeholder="1"></label>
            <label>${L('Przerwa po X stratach z rzędu', 'Break after X losses in a row')}<input name="lossStreak" inputmode="numeric" value="${R.lossStreak || ''}" placeholder="3"></label>
            <label>${L('Maks. rozmiar pozycji (SOL)', 'Max position size (SOL)')}<input name="maxSize" inputmode="decimal" value="${R.maxSize || ''}" placeholder="0 = ${L('bez limitu', 'no limit')}"></label>
            <label>${L('Długość przerwy', 'Break length')}${sel('brk', R.brk, [[5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '60 min']])}</label>
            <label class="jr-chk"><input type="checkbox" name="quietOn"${R.quietOn ? ' checked' : ''}> ${L('Godziny ciszy (bez tradingu)', 'Quiet hours (no trading)')}</label>
            <div class="jr-f2"><label>${L('Od', 'From')}${sel('quietFrom', R.quietFrom, hrs.map((h) => [h, h + ':00']))}</label><label>${L('Do', 'To')}${sel('quietTo', R.quietTo, hrs.map((h) => [h, h + ':00']))}</label></div>
            <label class="jr-chk"><input type="checkbox" name="push"${R.push ? ' checked' : ''}> ${L('Powiadomienie na telefonie, gdy zasada pęknie', 'Phone notification when a rule breaks')}</label>
            <button class="jr-btn on" type="submit">${L('Zapisz zasady', 'Save rules')}</button>
            <small class="mut">${L('Gdy zasada pęknie, Kyvo pokaże ekran przerwy z odliczaniem. Kyvo nie blokuje portfela — działa, gdy aplikacja jest otwarta (sprawdza nowe swapy co ~3 min).', 'When a rule breaks, Kyvo shows a break screen with a countdown. Kyvo does not block your wallet — it works while the app is open (checks new swaps every ~3 min).')}</small>
          </form></details>
      </div>
      <div class="card jr-dsc">
        <div class="jr-dsg"><b class="jr-chrome">${R.on ? grade(dScore) : '—'}</b><small>${L('Dyscyplina', 'Discipline')}</small></div>
        <div class="jr-dsr">
          <div><span>${L('Dni bez złamanej zasady', 'Days without a broken rule')}</span><b>${R.on && disc ? disc.streak : '—'}</b></div>
          <div><span>${L('Dni z tradingiem w normie', 'Trading days within rules')}</span><b>${R.on && disc && disc.total ? `${disc.kept}/${disc.total} · ${fPct(disc.adh)}` : '—'}</b></div>
          <div><span>${L('Przerwy dotrzymane / przerwane', 'Breaks kept / ended early')}</span><b>${plan.cb.kept} / ${plan.cb.early}</b></div>
          ${R.on && disc ? `<div class="jr-dots">${disc.days.slice(0, 14).reverse().map((x) => `<i class="${x.br.length ? 'bad' : x.n ? 'ok' : ''}" title="${E(x.k)}"></i>`).join('')}</div>` : ''}
        </div>
        <small class="mut">${L('Ocena A+–F z dotrzymanych zasad — wlicza się do Kyvo Score (Dyscyplina).', 'A+–F grade from kept rules — feeds the Kyvo Score (Discipline).')}</small>
      </div>
      ` : ''}
      <div class="card jr-goal"><div class="jr-cardh"><b>${ICO('runner', '🎯')} ${L('Cele', 'Goals')}</b></div>
        <div class="jr-f2"><label>${L('Cel dzienny (SOL)', 'Daily goal (SOL)')}<input data-goal="day" inputmode="decimal" value="${plan.goals.day || ''}" placeholder="0.5"></label><label>${L('Cel tygodniowy (SOL)', 'Weekly goal (SOL)')}<input data-goal="week" inputmode="decimal" value="${plan.goals.week || ''}" placeholder="3"></label></div>
        ${plan.goals.day ? meter(L('Dziś', 'Today'), Math.max(0, T.pnl), plan.goals.day, `${fSol(T.pnl, 1)} / ${plan.goals.day} SOL`) : ''}
        ${plan.goals.week ? meter(L('Ten tydzień', 'This week'), Math.max(0, T.week), plan.goals.week, `${fSol(T.week, 1)} / ${plan.goals.week} SOL`) : ''}
        <button type="button" class="jr-btn" data-act="share-day">${ICO('share', '↗')} ${L('Karta P&L dnia', 'Today’s P&L card')}</button>
      </div>
      <div class="card jr-chkl"><div class="jr-cardh"><b>${ICO('j_plan', '✅')} ${L('Przed sesją', 'Before the session')}</b><small class="mut">${done.length}/${plan.items.length}${jst ? ` · ${L('seria', 'streak')} ${jst} ${L('dni', 'days')}` : ''}</small></div>
        <div class="jr-cl">${plan.items.map((it, i) => `<div class="jr-cli${done.includes(it.id || 'c' + i) ? ' on' : ''}"><button type="button" role="checkbox" aria-checked="${done.includes(it.id || 'c' + i)}" data-ck="${E(it.id || 'c' + i)}"><i></i><span>${E(itemText(it))}</span></button>${DEF_ITEMS.some((x) => x[0] === it.id) ? '' : `<button type="button" class="jr-clx" data-ckdel="${i}" aria-label="${L('Usuń', 'Remove')}">×</button>`}</div>`).join('')}</div>
        <form id="jrCkAdd" class="jr-wrow" autocomplete="off"><input name="t" maxlength="80" placeholder="${L('Dodaj własny punkt…', 'Add your own item…')}"><button class="jr-btn" type="submit">+</button></form>
        <label class="jr-tl">${L('Plan na dziś', 'Plan for today')}<textarea data-pn="day.plan" rows="3" maxlength="1500" placeholder="${L('Jakie narracje / coiny obserwuję? Jaki rozmiar? Kiedy kończę?', 'Which narratives / coins am I watching? What size? When do I stop?')}">${E(day.plan || '')}</textarea></label>
      </div>
      <div class="card jr-post"><div class="jr-cardh"><b>${ICO('book', '📓')} ${L('Po sesji', 'After the session')}</b><small class="mut">${T.nC ? `${T.nC} trade · ${fSol(T.pnl, 1)}` : L('brak zamkniętych dziś', 'nothing closed today')}</small></div>
        <div class="jr-moods">${MOODS.map((m) => `<button type="button" data-mood="${m[0]}" class="${day.mood === m[0] ? 'on' : ''}">${m[1]} ${L(m[2], m[3])}</button>`).join('')}</div>
        <label class="jr-tl">${L('Co dziś poszło dobrze, a co nie?', 'What went well today, and what didn’t?')}<textarea data-pn="day.post" rows="3" maxlength="2000">${E(day.post || '')}</textarea></label>
        <small class="mut" data-pns></small>
      </div>
      <div class="card jr-week"><div class="jr-cardh"><b>${ICO('j_stats', '📈')} ${L('Refleksja tygodnia', 'Weekly reflection')}</b><small class="mut">${S.n ? `${T.nW} trade · ${fSol(T.week, 1)}` : ''}${wst ? ` · ${L('seria', 'streak')} ${wst} ${L('tyg.', 'wk')}` : ''}</small></div>
        <label class="jr-tl">${L('Co działało?', 'What worked?')}<textarea data-pn="week.good" rows="2" maxlength="1500">${E(week.good || '')}</textarea></label>
        <label class="jr-tl">${L('Co kosztowało mnie najwięcej?', 'What cost me the most?')}<textarea data-pn="week.bad" rows="2" maxlength="1500">${E(week.bad || '')}</textarea></label>
        <label class="jr-tl">${L('Jedna zmiana na przyszły tydzień', 'One change for next week')}<textarea data-pn="week.change" rows="2" maxlength="600">${E(week.change || '')}</textarea></label>
        <div class="jr-wsc"><span>${L('Ocena tygodnia', 'Rate the week')}</span>${Array.from({ length: 10 }, (_, i) => `<button type="button" data-wsc="${i + 1}" class="${week.score === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('')}</div>
      </div>
      <div class="mut jr-foot">${L('Plan, cele i refleksje są zapisane tylko na tym urządzeniu.', 'Plan, goals and reflections are stored on this device only.')}</div>`;
  }
  function wirePlan() {
    const q = (s) => root.querySelector(s), qa = (s) => root.querySelectorAll(s);
    const sw = q('[data-pl="rules-on"]');
    if (sw) sw.onclick = () => { plan.rules.on = !plan.rules.on; plan.rules.since = now(); savePlan(); recompute(); render(); };
    const rf = q('#jrRules');
    if (rf) rf.onsubmit = (e) => {
      e.preventDefault();
      const f = rf.elements, R = plan.rules;
      R.maxTrades = Math.round(num(f.maxTrades.value, 0)); R.maxLoss = num(f.maxLoss.value, 0); R.lossStreak = Math.round(num(f.lossStreak.value, 0)); R.maxSize = num(f.maxSize.value, 0);
      R.brk = +f.brk.value || 10; R.quietOn = f.quietOn.checked; R.quietFrom = +f.quietFrom.value; R.quietTo = +f.quietTo.value; R.push = f.push.checked;
      R.on = true; R.since = now();
      if (R.push && typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      savePlan(); recompute(); render(); toast(L('Zasady zapisane — bezpiecznik włączony', 'Rules saved — circuit breaker on'));
    };
    qa('[data-goal]').forEach((i) => (i.onchange = () => { plan.goals[i.dataset.goal] = num(i.value, 0); savePlan(); render(); }));
    const dk = dayKey(now()), wk = weekKey(now());
    qa('[data-ck]').forEach((b) => (b.onclick = () => { const d = (plan.done[dk] = plan.done[dk] || []), id = b.dataset.ck; plan.done[dk] = d.includes(id) ? d.filter((x) => x !== id) : d.concat([id]); savePlan(); render(); }));
    qa('[data-ckdel]').forEach((b) => (b.onclick = () => { plan.items.splice(+b.dataset.ckdel, 1); savePlan(); render(); }));
    const ca = q('#jrCkAdd');
    if (ca) ca.onsubmit = (e) => { e.preventDefault(); const v = ca.elements.t.value.trim().slice(0, 80); if (!v || plan.items.length >= 12) return; plan.items.push({ id: 'c' + Date.now().toString(36), t: v }); savePlan(); render(); };
    qa('[data-mood]').forEach((b) => (b.onclick = () => { const d = (plan.days[dk] = plan.days[dk] || {}); d.mood = d.mood === b.dataset.mood ? '' : b.dataset.mood; savePlan(); render(); }));
    qa('[data-wsc]').forEach((b) => (b.onclick = () => { const w = (plan.weeks[wk] = plan.weeks[wk] || {}); w.score = w.score === +b.dataset.wsc ? 0 : +b.dataset.wsc; savePlan(); render(); }));
    qa('[data-pn]').forEach((ta) => { let tt; ta.oninput = () => { clearTimeout(tt); tt = setTimeout(() => {
      const [g, f] = ta.dataset.pn.split('.'), o = g === 'day' ? (plan.days[dk] = plan.days[dk] || {}) : (plan.weeks[wk] = plan.weeks[wk] || {});
      o[f] = ta.value.slice(0, 2000); savePlan(); const s = q('[data-pns]'); if (s) s.textContent = '✓ ' + L('zapisano', 'saved');
    }, 500); }; });
  }

  /* ----- extra analytics (Liquid-style insight cards, memecoin version) ----- */
  function insightCards() {
    const mc = mistakeCost(PS), be = breakEven(S, PS), tn = tradeNo(PS);
    const R = plan.rules.on ? plan.rules : Object.assign({}, DEF_RULES, { maxTrades: 10, maxLoss: 0, lossStreak: 3, maxSize: 0, quietOn: false });
    const wi = BREAKER ? whatIf(PS, R) : null;
    const mx = Math.max(0.0001, ...mc.rows.map((r) => Math.abs(r.pnl)));
    return `<div class="jr-ins">
      <div class="card jr-an jr-in"><b>${ICO('flame', '💸')} ${L('Ile kosztują Cię błędy', 'What your mistakes cost')}</b>
        ${mc.n ? `<div class="jr-inb ${cls(mc.total)}">${fSol(mc.total, 1)}</div><small class="mut">${L(`Trade’y z tagiem błędu (FOMO, revenge, za późno / za wcześnie, bundle, strach): ${mc.n}.`, `Trades tagged as a mistake (FOMO, revenge, too late / too early, bundle, fear): ${mc.n}.`)} ${mc.total >= 0 ? L('Tym razem wyszły na plus — to szczęście, nie powtarzalny setup.', 'They ended up green this time — that is luck, not a repeatable setup.') : L('Tyle oddałeś rynkowi przez błędy.', 'That is what mistakes gave back to the market.')}</small>
          ${mc.rows.map((r) => `<div class="jr-anr"><span>${E(tagLabel(r.k))}</span><span>${r.n}</span><span>${fPct(r.wr)}</span><span class="jr-anb"><i class="${r.pnl >= 0 ? 'p' : 'n'}" style="width:${Math.max(3, (Math.abs(r.pnl) / mx) * 100).toFixed(0)}%"></i><em class="${cls(r.pnl)}">${fSol(r.pnl, 1).replace(' SOL', '')}</em></span></div>`).join('')}`
        : `<div class="jr-empty">${L('Taguj trade’y (FOMO, revenge, za późno…) — tu zobaczysz, ile Cię kosztują.', 'Tag your trades (FOMO, revenge, too late…) — this shows what they cost you.')}</div>`}</div>
      ${BREAKER ? `
      <div class="card jr-an jr-in"><b>${ICO('shield', '🛡')} ${L('Gdybyś trzymał się zasad', 'If you had followed rules')}</b>
        <div class="jr-inb ${cls(wi.diff)}">${wi.diff >= 0 ? '+' : '−'}${Math.abs(wi.diff).toFixed(2)} SOL</div>
        <small class="mut">${plan.rules.on ? L('Twoje zasady', 'Your rules') : L('Przykładowe zasady: maks. 10 trade’ów dziennie, stop po 3 stratach z rzędu', 'Example rules: max 10 trades a day, stop after 3 losses in a row')} · ${L(`pominięte trade’y: ${wi.skipped} · dni: ${wi.days}`, `${wi.skipped} trades skipped on ${wi.days} day${wi.days === 1 ? '' : 's'}`)}</small>
        <div class="jr-in2"><div><small>${L('Faktycznie', 'Actual')}</small><b class="${cls(wi.actual)}">${fSol(wi.actual, 1)}</b></div><div><small>${L('Z zasadami', 'With rules')}</small><b class="${cls(wi.sim)}">${fSol(wi.sim, 1)}</b></div></div>
        ${plan.rules.on ? '' : `<a class="jr-link" href="#journal/plan">${L('Ustaw własne zasady ›', 'Set your own rules ›')}</a>`}</div>
      ` : ''}
      <div class="card jr-an jr-in"><b>${ICO('j_stats', '⚖️')} ${L('Twój próg rentowności', 'Your break-even win rate')}</b>
        ${be ? `<div class="jr-in2"><div><small>${L('Potrzebny WR', 'WR needed')}</small><b>${fPct(be.be)}</b></div><div><small>${L('Twój WR', 'Your WR')}</small><b class="${be.wr >= be.be ? 'up' : 'dn'}">${fPct(be.wr)}</b></div></div>
          <small class="mut">${L(`Śr. zysk ${fSol(be.aw)} vs śr. strata ${fSol(be.al)}. `, `Avg win ${fSol(be.aw)} vs avg loss ${fSol(be.al)}. `)}${be.wr >= be.be ? L('Jesteś nad progiem — chroń to.', 'You are above break-even — protect it.') : L('Jesteś pod progiem — mniejsze straty albo dłużej trzymane zyski.', 'You are below break-even — smaller losses or longer-held winners.')}</small>`
        : `<div class="jr-empty">${L('Potrzebny co najmniej 1 zyskowny i 1 stratny trade.', 'Needs at least 1 winning and 1 losing trade.')}</div>`}</div>
    </div>
    ${bars(ICO('j_log', '#') + ' ' + L('Który trade dnia', 'Trade number of the day'), tn, (k) => (k === '5+' ? L('5. i dalsze', '5th and later') : k + '.'))}`;
  }

  function header() {
    const w = st.wallet;
    const cov = coverFrom();
    return `<div class="jr-head">
        <div class="jr-ttl"><span class="jr-logo">${ICO('book', '📓')}</span><div><b>Journal</b><small>${L('Dziennik memecoinów · Solana', 'Memecoin journal · Solana')}</small></div><span class="jr-pb">✦ Premium</span></div>
        ${w && isPrem() ? `<div class="jr-wal"><span class="jr-dot${job.busy ? ' busy' : ''}"></span><b translate="no">${E(short(w))}</b><small>${job.busy ? L('synchronizuję…', 'syncing…') : st.at ? L('od', 'since') + ' ' + fDate(cov.from) : ''}</small>
          <button type="button" class="jr-ib" data-act="sync" aria-label="${L('Odśwież', 'Refresh')}" ${job.busy ? 'disabled' : ''}>⟳</button>
          <button type="button" class="jr-ib" data-act="wallet" aria-label="${L('Zmień portfel', 'Change wallet')}">✎</button></div>` : ''}
      </div>
      <div class="jr-tabs" role="tablist">${TABS.map((t) => `<button type="button" data-sub="${t[0]}" class="${sub === t[0] || (sub === 'trade' && t[0] === 'log') ? 'on' : ''}"><span>${ICO('j_' + t[0], t[1])}</span>${L(t[2], t[3])}</button>`).join('')}</div>`;
  }
  function progress() {
    if (!job.busy && !job.err) {
      const pend = st.wallet ? pending().length : 0;
      return pend && !job.busy ? `<div class="jr-more card"><span>${L(`Wczytano najnowsze transakcje. Zostało ${pend} starszych z ostatnich ${CFG.days} dni.`, `Newest transactions loaded. ${pend} older ones from the last ${CFG.days} days remain.`)}</span><button type="button" class="jr-btn" data-act="sync">${L('Wczytaj starsze', 'Load older')} (+${Math.min(pend, CFG.maxTx)})</button></div>` : '';
    }
    if (job.err && !job.busy) return `<div class="jr-prog err"><b>⚠️ ${job.err === 'rate' ? L('Publiczne RPC Solany chwilowo ogranicza zapytania.', 'The public Solana RPC is rate-limiting right now.') : L('Problem z połączeniem.', 'Connection problem.')}</b><span>${L('To, co już pobrane, jest zapisane.', 'Everything fetched so far is saved.')}</span><button type="button" class="jr-btn on" data-act="sync">${L('Spróbuj ponownie', 'Retry')}</button></div>`;
    const pct = job.total ? Math.round((job.done / job.total) * 100) : 4;
    return `<div class="jr-prog"><div class="jr-pt"><b>${job.phase === 'sigs' ? L('Szukam transakcji portfela…', 'Finding wallet transactions…') : L(`Czytam transakcje ${job.done}/${job.total}`, `Reading transactions ${job.done}/${job.total}`)}</b><small>${job.rl ? L('RPC zwalnia — czekam i ponawiam…', 'RPC is slowing down — waiting and retrying…') : L('darmowe publiczne RPC · ~10–40 s', 'free public RPC · ~10–40 s')}</small></div><div class="jr-bar"><i style="width:${pct}%"></i></div></div>`;
  }
  function tiltBanner() {
    const t = S && S.tilt && S.tilt[0];
    if (!t || DEMO || now() - t.at > 3600) return '';
    return `<div class="jr-tilt">🧊 <div><b>Tilt guard</b><span>${t.k === 'burst' ? L(`${t.n} wejść w 10 min.`, `${t.n} entries in 10 min.`) : L('Kupiłeś nowy coin zaraz po stracie.', 'You bought a new coin right after a loss.')} ${L('Zrób 5 min przerwy, zanim klikniesz kolejny buy.', 'Take a 5-min break before the next buy.')}</span></div></div>`;
  }
  function demoRibbon() { return DEMO ? `<div class="jr-demo">${L('PRZYKŁAD', 'EXAMPLE')} · ${L('przykładowe dane — wpisz swój publiczny adres, żeby zobaczyć swoje trade’y', 'sample data — enter your public address to see your own trades')}</div>` : ''; }

  function walletCard(compact) {
    return `<form class="card jr-wform" id="jrWForm" autocomplete="off">
      <b>${L('Podłącz portfel (tylko do odczytu)', 'Connect a wallet (read-only)')}</b>
      <small class="mut">${L('Wklej PUBLICZNY adres portfela Solany — Kyvo sam zbuduje dziennik z Twoich swapów z ostatnich 7 dni.', 'Paste your PUBLIC Solana wallet address — Kyvo builds the journal from your swaps of the last 7 days.')}</small>
      <div class="jr-wrow"><input id="jrAddr" inputmode="text" spellcheck="false" autocapitalize="off" maxlength="120" placeholder="${L('Publiczny adres portfela Solany', 'Public Solana wallet address')}"><button class="jr-btn on" type="submit">${L('Wczytaj', 'Load')}</button></div>
      <div class="trk-warn jr-warn">🔒 ${L('Tylko PUBLICZNY adres. Kyvo nigdy nie prosi o klucz prywatny ani frazę seed — nie wklejaj ich nigdzie.', 'PUBLIC address only. Kyvo never asks for a private key or seed phrase — never paste them anywhere.')}</div>
      ${compact ? '' : `<button type="button" class="jr-link" data-act="add">+ ${L('albo dodaj trade ręcznie', 'or add a trade manually')}</button>`}
    </form>`;
  }

  /* ----- dashboard ----- */
  function ring(v) {
    const r = 34, c = 2 * Math.PI * r, off = c * (1 - (v || 0) / 100);
    return `<svg class="jr-ring" viewBox="0 0 84 84" width="84" height="84"><defs><linearGradient id="jrRg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6fa"/><stop offset=".45" stop-color="#8e96a3"/><stop offset=".7" stop-color="#e6e9ef"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="#ffffff14" stroke-width="7"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="url(#jrRg)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 42 42)"/></svg>`;
  }
  const SC = { win: ['Win rate', 'Win rate'], pf: ['Profit factor', 'Profit factor'], disc: ['Dyscyplina', 'Discipline'], hold: ['Czas trzymania', 'Hold time'], rug: ['Ekspozycja na rug', 'Rug exposure'] };
  const SCTIP = {
    win: ['Za mało wygranych — wchodź tylko w setupy z planem (np. alerty Runner / Gold) zamiast w każdy pump.', 'Too few winners — only take planned setups (e.g. Runner / Gold alerts) instead of every pump.'],
    pf: ['Straty są większe niż zyski — tnij stratne szybciej (wyjście −30%), zyskownym daj rosnąć.', 'Losses outsize wins — cut losers faster (−30% exit), let winners run.'],
    disc: ['Za dużo dużych strat i tiltu — stały rozmiar pozycji, stop loss i przerwa po stracie.', 'Too many big losses and tilt — fixed size, a stop loss and a break after a loss.'],
    hold: ['Stratne trzymasz dłużej niż zyskowne — to odwrotnie, niż powinno być.', 'You hold losers longer than winners — the opposite of what works.'],
    rug: ['Za dużo coinów, które zrugowały — sprawdzaj dev, LP i holderów (Gold „Sprawdź coin”).', 'Too many coins that rugged — check dev, LP and holders (Gold “Check coin”).'],
  };
  function curveSvg(curve) {
    if (!curve || curve.length < 2) return `<div class="jr-empty">${L('Wykres pojawi się po 2+ zamkniętych trade’ach.', 'The chart appears after 2+ closed trades.')}</div>`;
    const W = 320, H = 120, pts = [{ t: curve[0].t - 1, v: 0 }].concat(curve);
    const vs = pts.map((p) => p.v), mn = Math.min(0, ...vs), mx = Math.max(0, ...vs), rg = mx - mn || 1;
    const x = (i) => (i / (pts.length - 1)) * W, y = (v) => H - 8 - ((v - mn) / rg) * (H - 18);
    // v8.15: smooth monotone-ish curve (Catmull-Rom → cubic Bézier, tension 0.18) instead of straight segments
    const P = pts.map((p, i) => [x(i), y(p.v)]);
    let d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2, k = 0.18;
      const c1x = p1[0] + (p2[0] - p0[0]) * k, c1y = p1[1] + (p2[1] - p0[1]) * k, c2x = p2[0] - (p3[0] - p1[0]) * k, c2y = p2[1] - (p3[1] - p1[1]) * k;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const last = pts[pts.length - 1].v, col = last >= 0 ? '#3BE58A' : '#FF5A6E', ly = P[P.length - 1][1];
    const grid = [0.25, 0.5, 0.75].map((f) => `<line x1="0" x2="${W}" y1="${(H * f).toFixed(1)}" y2="${(H * f).toFixed(1)}" stroke="#ffffff08"/>`).join('');
    return `<div class="jr-cwrap"><svg class="jr-curve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="jrCa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset=".6" stop-color="${col}" stop-opacity=".06"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient><linearGradient id="jrCl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".55" stop-color="#ffffff"/><stop offset="1" stop-color="${col}"/></linearGradient></defs>
      ${grid}<line x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="#ffffff26" stroke-dasharray="2 5"/>
      <path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#jrCa)"/><path d="${d}" fill="none" stroke="url(#jrCl)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg><i class="jr-cdot" style="left:100%;top:${((ly / H) * 100).toFixed(1)}%;background:${col};box-shadow:0 0 0 3px ${col}33,0 0 14px ${col}"></i></div>`;
  }
  /* v8.17 📅 Kalendarz P&L (TikTok-style monthly P&L calendar): closed trades by close day (device time zone), $ at the
     current SOL price (SOL when no price), Record W-L-BE, month profit, last sync time, "on-chain" badge only for wallet data. */
  const dKey = (d) => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  const isBE = (p) => Math.abs(p.realized) < Math.max(0.001, (p.costSold || 0) * 0.005);   // break-even: |P&L| < 0.5 % of size (min 0.001 SOL)
  function fCompact(n, px) {
    const a = Math.abs(px ? n * px : n);
    if (!px) return (a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2)) + '◎';
    return '$' + (a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : a >= 1e4 ? Math.round(a / 1e3) + 'K' : a >= 1e3 ? (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : a >= 9.5 ? Math.round(a) : a >= 0.995 ? a.toFixed(1).replace(/\.0$/, '') : a.toFixed(2));
  }
  function calMonth(Y, M) {
    const days = {}, closed = [];
    CALPS.forEach((p) => {
      if (p.status !== 'closed' || !(p.costSold > 0) || !p.closeAt) return;
      const d = new Date(p.closeAt * 1000);
      if (d.getFullYear() !== Y || d.getMonth() !== M) return;
      closed.push(p);
      const r = days[dKey(d)] || (days[dKey(d)] = { pnl: 0, n: 0 }); r.pnl += p.realized; r.n++;
    });
    const be = closed.filter(isBE), w = closed.filter((p) => !isBE(p) && p.realized > 0), l = closed.filter((p) => !isBE(p) && p.realized < 0);
    return { days, closed, w: w.length, l: l.length, be: be.length, pnl: closed.reduce((a, p) => a + p.realized, 0), manual: closed.some((p) => p.manual) };
  }
  function calendar() {
    const t = new Date();
    if (!calM) calM = [t.getFullYear(), t.getMonth()];
    const [Y, M] = calM, first = new Date(Y, M, 1), dim = new Date(Y, M + 1, 0).getDate(), pad = (first.getDay() + 6) % 7;
    const C = calMonth(Y, M), px = S.solPx || 0, vals = Object.values(C.days).map((d) => Math.abs(d.pnl)), mx = Math.max(0.0001, ...vals);
    const hf = DEMO ? 0 : st.wallet ? st.histFrom || coverFrom().from : 0;
    let cells = '';
    for (let i = 0; i < pad; i++) cells += '<span class="jr-cd x"></span>';
    for (let d = 1; d <= dim; d++) {
      const day = new Date(Y, M, d), k = dKey(day), r = C.days[k];
      const today = Y === t.getFullYear() && M === t.getMonth() && d === t.getDate();
      const nod = !r && hf && st.wallet && !st.manual.length && day.getTime() / 1000 + 86400 <= hf;   // before the on-chain history on this device
      const a = r ? 0.3 + 0.5 * Math.min(1, Math.abs(r.pnl) / mx) : 0;
      const tone = r ? (isBE({ realized: r.pnl, costSold: 0 }) ? 'be' : r.pnl > 0 ? 'up' : 'dn') : '';
      const tip = r ? `${fDate(day.getTime() / 1000)} · ${r.pnl >= 0 ? '+' : ''}${px ? fUsd(r.pnl * px, 1) + ' · ' : ''}${fSol(r.pnl, 1)} · ${r.n} trade` : '';
      cells += r ? `<button type="button" class="jr-cd h ${tone}${today ? ' td' : ''}${calSel === k ? ' sel' : ''}" data-cday="${k}" style="--a:${a.toFixed(2)}" title="${E(tip)}" aria-label="${E(tip)}"><i>${d}</i><b>${tone === 'dn' ? '−' : ''}${fCompact(r.pnl, px)}</b></button>`
        : `<span class="jr-cd${today ? ' td' : ''}${nod ? ' nod' : ''}"><i>${d}</i></span>`;
    }
    const mn = first.toLocaleString(isEn() ? 'en-GB' : 'pl-PL', { month: 'long', year: 'numeric' });
    const wd = isEn() ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
    const nC = C.closed.length, tot = C.pnl;
    const sel = calSel && calSel.slice(0, 7) === dKey(first).slice(0, 7) ? CALPS.filter((p) => p.status === 'closed' && p.costSold > 0 && p.closeAt && dKey(new Date(p.closeAt * 1000)) === calSel).sort((a, b) => b.closeAt - a.closeAt) : [];
    const upd = DEMO ? L('Przykładowe dane (podłącz portfel)', 'Sample data (connect a wallet)') : st.wallet && st.at ? `${L('Zaktualizowano', 'Updated')}: ${fDate(st.at / 1000, 1)}` : L('Trade’y wpisane ręcznie', 'Manually entered trades');
    const badge = !DEMO && st.wallet && nC && !C.manual ? `<span class="jr-ver" title="${E(L('Wynik policzony z publicznych transakcji tego portfela na Solanie', 'Computed from this wallet’s public Solana transactions'))}">✓ ${L('Zweryfikowane on-chain', 'Verified on-chain')}</span>`
      : !DEMO && C.manual ? `<span class="jr-ver man">✍︎ ${L('zawiera ręczne trade’y', 'includes manual trades')}</span>` : '';
    return `<div class="card jr-cal" id="jrCal"><div class="jr-calh"><button type="button" class="jr-ib" data-cal="-1" aria-label="${L('Poprzedni miesiąc', 'Previous month')}">‹</button><div class="jr-calt"><small>${L('Kalendarz P&L', 'P&L calendar')}</small><b>${E(mn)}</b></div>${nC && !DEMO ? `<button type="button" class="jr-ib" data-act="share-month" aria-label="${L('Udostępnij miesiąc', 'Share month')}">${ICO('share', '↗')}</button>` : '<span></span>'}<button type="button" class="jr-ib" data-cal="1" aria-label="${L('Następny miesiąc', 'Next month')}">›</button></div>
      <div class="jr-calg">${wd.map((d) => `<span class="jr-cw">${d}</span>`).join('')}${cells}</div>
      ${sel.length ? `<div class="jr-cdl"><div class="jr-cdlh"><b>${E(fDate(sel[0].closeAt))}</b><span class="${cls(sel.reduce((a, p) => a + p.realized, 0))}">${px ? fUsd(sel.reduce((a, p) => a + p.realized, 0) * px, 1) + ' · ' : ''}${fSol(sel.reduce((a, p) => a + p.realized, 0), 1)}</span><button type="button" class="jr-ib" data-act="card-cday" aria-label="${L('Karta P&L dnia', 'Day P&L card')}" title="${L('Karta P&L dnia', 'Day P&L card')}">🎴</button><button type="button" class="jr-ib" data-cday="${calSel}" aria-label="${L('Zamknij', 'Close')}">×</button></div><div class="jr-list">${sel.map(rowHtml).join('')}</div></div>` : ''}
      <div class="jr-calf">
        <div><small>${L('Rekord', 'Record')} <span class="mut">W-L-BE</span></small><b>${C.w}-${C.l}-${C.be}</b></div>
        <div><small>${L('Zysk za miesiąc', 'Month profit')}</small><b class="${cls(tot)}">${nC ? (px ? fUsd(tot * px, 1) : fSol(tot, 1)) : '—'}</b>${nC && px ? `<i>${fSol(tot, 1)}</i>` : ''}</div>
      </div>
      <div class="jr-calm"><span>${E(upd)}</span>${badge}</div>
      <small class="mut jr-caln">${nC ? '' : L('Brak zamkniętych trade’ów w tym miesiącu. ', 'No closed trades this month. ')}${L('Dzień = data zamknięcia trade’u (czas na tym urządzeniu).', 'Day = trade close date (this device’s time).')}${px ? ' ' + L(`$ wg obecnej ceny SOL (${fUsd(px)}).`, `$ at the current SOL price (${fUsd(px)}).`) : ''}${hf && !DEMO ? ' ' + L(`Historia portfela od ${fDate(hf)}.`, `Wallet history since ${fDate(hf)}.`) : ''}</small></div>`;
  }
  function stat(lbl, val, sub, c) { return `<div class="jr-st"><small>${lbl}</small><b class="${c || ''}">${val}</b>${sub ? `<i>${sub}</i>` : ''}</div>`; }
  function dash() {
    if (!S.n && !S.nOpen) return emptyTrades();
    const sc = S.score;
    const solPx = S.solPx;
    const pfS = S.pf == null ? '—' : S.pf === Infinity ? '∞' : S.pf.toFixed(2);
    return `${planStrip()}
      <div class="card jr-hero">
        ${DEMO ? '' : `<button type="button" class="jr-ib jr-shb" data-act="share-all" aria-label="${L('Karta P&L', 'P&L card')}">${ICO('share', '↗')}</button>`}
        <small>${L('Zrealizowany P&L', 'Realized P&L')} · ${DEMO ? L('20 dni', '20 days') : L(`ostatnie ${CFG.days} dni`, `last ${CFG.days} days`)}</small>
        <div class="jr-big jr-chrome">${fSol(S.pnl, 1)}</div>
        <div class="jr-hsub"><b class="${cls(S.pnl)}">${S.pnlUsd != null ? fUsd(S.pnlUsd, 1) : ''}</b>${S.nOpen ? `<span>· ${S.nOpen} ${L('otwarte', 'open')} ${S.unreal ? `<b class="${cls(S.unreal)}">${fSol(S.unreal, 1)}</b>` : ''}</span>` : ''}<span>· ${S.n} ${L('zamkniętych', 'closed')}</span></div>
        ${curveSvg(S.curve)}
        <div class="jr-kpcr"><button type="button" class="jr-btn" data-act="card-day">🎴 ${L('Karta P&L dnia', 'Day P&L card')}</button><button type="button" class="jr-btn" data-act="card-month">🎴 ${L('Karta P&L miesiąca', 'Month P&L card')}</button></div>
      </div>
      ${sc ? `<div class="card jr-score">
        <div class="jr-sl">${ring(sc.total)}<div class="jr-sv"><b class="jr-chrome">${sc.total}</b><small>Kyvo Score</small></div></div>
        <div class="jr-sr">${Object.keys(SC).map((k) => `<div class="jr-sb${k === sc.weakest ? ' weak' : ''}"><span>${L(SC[k][0], SC[k][1])}</span><i><u style="width:${sc.c[k]}%"></u></i><b>${sc.c[k]}</b></div>`).join('')}</div>
        <div class="jr-tip">⚠️ <b>${L('Najsłabszy punkt', 'Weakest area')}: ${L(SC[sc.weakest][0], SC[sc.weakest][1])}.</b> ${L(SCTIP[sc.weakest][0], SCTIP[sc.weakest][1])}</div>
      </div>` : ''}
      <div class="jr-grid">
        ${stat('Win rate', S.wr == null ? '—' : fPct(S.wr), S.n ? `${Math.round((S.wr || 0) * S.n)}/${S.n}` : '')}
        ${stat('Profit factor', pfS, L('zyski / straty', 'wins / losses'))}
        ${stat(L('Śr. czas trzymania', 'Avg hold time'), fHold(S.avgHold), S.holdW && S.holdL ? `${L('zysk', 'win')} ${fHold(S.holdW)} · ${L('strata', 'loss')} ${fHold(S.holdL)}` : '')}
        ${stat(L('Złapane ze szczytu', 'Peak captured'), S.captured == null ? '—' : fPct(S.captured), S.capN ? L(`z ${S.capN} trade’ów`, `from ${S.capN} trades`) : DEMO ? '' : L('liczę z wykresów…', 'computing from charts…'))}
        ${stat(L('Ekspozycja na rug', 'Rug exposure'), S.rugShare == null ? '—' : fPct(S.rugShare), `${S.rugN} ${L('coinów −90%', 'coins −90%')}`, S.rugShare > 0.3 ? 'dn' : '')}
        ${stat(L('Obrót', 'Volume'), fSol(S.vol), solPx ? fUsd(S.vol * solPx) : '')}
      </div>
      <div class="jr-bw">
        ${S.best ? `<a class="card jr-bwc" href="#journal/trade/${E(S.best.id)}"><small>🏆 ${L('Najlepszy', 'Best')}</small><span>${coinImg(S.best, 26)}<b>$${E(S.best.sym)}</b></span><b class="${cls(S.best.realized)}">${fSol(S.best.realized, 1)}</b><i>${fPct(S.best.pnlPct, 1)}</i></a>` : ''}
        ${S.worst && S.worst !== S.best ? `<a class="card jr-bwc" href="#journal/trade/${E(S.worst.id)}"><small>💀 ${L('Najgorszy', 'Worst')}</small><span>${coinImg(S.worst, 26)}<b>$${E(S.worst.sym)}</b></span><b class="${cls(S.worst.realized)}">${fSol(S.worst.realized, 1)}</b><i>${fPct(S.worst.pnlPct, 1)}</i></a>` : ''}
      </div>
      ${showcaseHtml()}
      ${calendar()}
      ${COACH[0] ? `<a class="card jr-cprev" href="#journal/coach"><span class="jr-bot">${ICO('j_coach', '🤖')}</span><div><small>Kyvo Coach</small><b>${E(L(COACH[0].pl, COACH[0].en))}</b></div><span class="mut">›</span></a>` : ''}`;
  }
  function emptyTrades() {
    const cov = coverFrom();
    return `<div class="card jr-emptyc"><div style="font-size:34px">🫥</div><b>${job.busy ? L('Szukam swapów…', 'Looking for swaps…') : L('Brak swapów memecoinów w tym okresie', 'No memecoin swaps in this period')}</b>
      <small class="mut">${job.busy ? '' : L(`Sprawdzono transakcje od ${fDate(cov.from, 1)}. Liczą się tylko swapy SOL/USDC ↔ token podpisane przez ten portfel (np. pump.fun, PumpSwap, Raydium, Jupiter, Axiom, Photon). Transakcje botów z innym portfelem płacącym opłatę nie są widoczne.`, `Checked transactions since ${fDate(cov.from, 1)}. Only SOL/USDC ↔ token swaps signed by this wallet count (e.g. pump.fun, PumpSwap, Raydium, Jupiter, Axiom, Photon). Bot trades paid by another wallet are not visible.`)}</small>
      <button type="button" class="jr-btn" data-act="add">+ ${L('Dodaj trade ręcznie', 'Add a trade manually')}</button></div>`;
  }

  /* ----- journal list ----- */
  function rowHtml(p) {
    const pnl = p.status === 'open' ? p.unreal : p.realized, pct = p.status === 'open' ? p.unrealPct : p.pnlPct;
    return `<a class="jr-row ${p.status}" href="#journal/trade/${E(p.id)}">
      ${coinImg(p, 36)}
      <div class="jr-rn"><b>$${E(p.sym)}${p.manual && !p.demo ? ' <span class="jr-mb">✍︎</span>' : ''}</b><small>${fDate(p.openAt, 1)} · ${p.status === 'open' ? L('otwarta', 'open') : p.status === 'inc' ? L('kupione wcześniej', 'bought earlier') : fHold(p.hold)}</small>
        <span class="jr-rt">${chips(p, 3)}</span></div>
      <div class="jr-rm"><small>MC</small><b>${fMc(p.entryMc)}</b><small>→ ${p.status === 'open' ? fMc(p.mcNow) : fMc(p.exitMc)}</small></div>
      <div class="jr-rp"><b class="${cls(pnl)}">${p.status === 'inc' ? '—' : fPct(pct, 1)}</b><small class="${cls(pnl)}">${p.status === 'inc' ? fSol(p.sellSol) : fSol(pnl, 1)}</small><small>${fSol(p.buySol || p.costSold)}</small></div></a>`;
  }
  function logView() {
    const F = [['all', L('Wszystkie', 'All')], ['win', L('Zyskowne', 'Winners')], ['loss', L('Stratne', 'Losers')], ['open', L('Otwarte', 'Open')], ['kyvo', '🏃 Kyvo'], ['notes', '📝 ' + L('Z notatką', 'With note')]];
    const ok = (p) => filt === 'all' ? p.status !== 'inc' : filt === 'win' ? p.status === 'closed' && p.realized > 0 : filt === 'loss' ? p.status === 'closed' && p.realized <= 0 : filt === 'open' ? p.status === 'open' : filt === 'kyvo' ? p.tags.includes('kyvo') : filt === 'notes' ? !!p.notes : true;
    const rows = PS.filter(ok), inc = PS.filter((p) => p.status === 'inc');
    return `<div class="jr-fl">${F.map((f) => `<button type="button" data-f="${f[0]}" class="${filt === f[0] ? 'on' : ''}">${f[1]}</button>`).join('')}<button type="button" class="jr-add" data-act="add">+ ${L('Dodaj', 'Add')}</button></div>
      <div class="card jr-list">${rows.length ? rows.map(rowHtml).join('') : `<div class="jr-empty">${L('Brak trade’ów dla tego filtra.', 'No trades for this filter.')}</div>`}</div>
      ${inc.length && filt === 'all' ? `<details class="card jr-inc"><summary>⏳ ${inc.length} ${L('sprzedaży coinów kupionych przed wczytanym okresem (bez kosztu wejścia — nie liczone w statystykach)', 'sells of coins bought before the loaded period (no entry cost — not counted in stats)')}</summary>${inc.map(rowHtml).join('')}</details>` : ''}`;
  }

  /* ----- trade view ----- */
  function tradeView(id) {
    const p = findP(id);
    if (!p) return `<div class="card jr-empty">${L('Nie znaleziono trade’u.', 'Trade not found.')} <a href="#journal/log">‹ ${L('Dziennik', 'Journal')}</a></div>`;
    const pnl = p.status === 'open' ? p.unreal : p.realized, pct = p.status === 'open' ? p.unrealPct : p.pnlPct, solPx = S.solPx;
    const c = coins[p.m] || {};
    const pf = /pump$/.test(p.m || '');
    return `<button type="button" class="jr-back" data-act="back">‹ ${L('Dziennik', 'Journal')}</button>
      <div class="card jr-th">
        <div class="jr-thc">${coinImg(p, 46)}<div><b>$${E(p.sym)}</b><small>${E(p.name || '')}</small></div>
          <span class="jr-st-b ${p.status}">${p.status === 'open' ? L('otwarta', 'open') : p.status === 'inc' ? L('niepełna', 'partial') : L('zamknięta', 'closed')}</span></div>
        <div class="jr-tact">${tradeScale(p, rulesOn() ? plan.rules : null) != null ? `<span class="jr-scale" title="${L('Kyvo Scale: wynik, wyjście, proces (tagi)', 'Kyvo Scale: result, exit, process (tags)')}"><small>Kyvo Scale</small><b>${tradeScale(p, rulesOn() ? plan.rules : null)}</b><i>${grade(tradeScale(p, rulesOn() ? plan.rules : null))}</i></span>` : '<span></span>'}
          <span class="jr-tab2">${p.demo ? '' : `<button type="button" class="jr-ib${plan.pins.includes(p.id) ? ' on' : ''}" data-act="pin" aria-pressed="${plan.pins.includes(p.id)}" aria-label="${L('Przypnij do Showcase', 'Pin to Showcase')}">${ICO('pin', '⭐')}</button>`}${p.status === 'inc' ? '' : `<button type="button" class="jr-btn on jr-kpc" data-act="card-trade">🎴 ${L('Karta P&L', 'P&L card')}</button>`}<button type="button" class="jr-btn jr-shr" data-act="share-trade" aria-label="${L('Udostępnij', 'Share')}">${ICO('share', '↗')}</button></span></div>
        <div class="jr-big jr-chrome">${p.status === 'inc' ? '—' : fPct(pct, 1)}</div>
        <div class="jr-hsub"><b class="${cls(pnl)}">${p.status === 'inc' ? '' : fSol(pnl, 1)}</b>${solPx && pnl ? `<span>${fUsd(pnl * solPx, 1)}</span>` : ''}${p.status === 'open' ? `<span>· ${L('niezrealizowane, wg ceny teraz', 'unrealized, at current price')}</span>` : ''}</div>
        <div class="jr-grid jr-g3">
          ${stat(L('MC wejścia', 'Entry MC'), fMc(p.entryMc))}
          ${stat(p.status === 'open' ? L('MC teraz', 'MC now') : L('MC wyjścia', 'Exit MC'), fMc(p.status === 'open' ? p.mcNow : p.exitMc))}
          ${stat(L('Rozmiar', 'Size'), fSol(p.buySol || p.costSold), solPx ? fUsd((p.buySol || p.costSold) * solPx) : '')}
          ${stat(L('Czas trzymania', 'Hold time'), fHold(p.hold))}
          ${stat(L('Złapane ze szczytu', 'Peak captured'), p.captured == null ? '—' : fPct(p.captured), p.peak ? L('szczyt', 'peak') + ' ' + fPct(p.peak.h / p.peak.e - 1, 1) : '')}
          ${stat(L('MC teraz', 'MC now'), fMc(p.mcNow), p.rugged ? '💀 rug' : '')}
        </div>
        ${p.kyvo && p.kyvo.min != null ? `<div class="jr-ky">🏃 <b>${L('Runner z Kyvo', 'Kyvo Runner')}</b> · ${p.kyvo.min >= 0 ? L(`wejście ${p.kyvo.min} min po alercie`, `entered ${p.kyvo.min} min after the alert`) : L(`wejście ${-p.kyvo.min} min przed alertem`, `entered ${-p.kyvo.min} min before the alert`)}${p.kyvo.mc0 ? ` (${L('alert przy MC', 'alert at MC')} ${fMc(p.kyvo.mc0)})` : ''}</div>` : ''}
      </div>
      ${p.m && !p.demo ? `<div class="jr-chartwrap" id="jrChart"></div>` : ''}
      ${p.fills.length ? `<div class="card jr-fills"><b>${L('Transakcje', 'Fills')}</b>${p.fills.map((f) => `<div class="jr-fill ${f.b ? 'b' : 's'}"><span>${f.b ? '▲ ' + L('KUPNO', 'BUY') : '▼ ' + L('SPRZEDAŻ', 'SELL')}</span><small>${fDate(f.at, 1)}</small><b>${fSol(f.sol)}</b><a href="https://solscan.io/tx/${E(f.s)}" target="_blank" rel="noopener">↗</a></div>`).join('')}</div>` : ''}
      <div class="card jr-tagc"><b>${L('Tagi i emocje', 'Tags & emotions')}</b><div class="jr-tags">${TAGS.map((t) => `<button type="button" data-tag="${t.id}" class="${p.tags.includes(t.id) ? 'on' : ''}${t.auto && p.autoTags.includes(t.id) ? ' auto' : ''}">${t.e} ${L(t.pl, t.en)}${t.auto && p.autoTags.includes(t.id) ? ' ⚙' : ''}</button>`).join('')}</div>
        <small class="mut">⚙ = ${L('dodane automatycznie (można odznaczyć)', 'added automatically (tap to remove)')}</small></div>
      <div class="card jr-notes"><b>${L('Notatki', 'Notes')}</b><textarea id="jrNote" rows="4" maxlength="2000" placeholder="${L('Dlaczego wszedłeś? Co poszło dobrze / źle? Co zrobisz następnym razem?', 'Why did you enter? What went well / wrong? What will you do next time?')}">${E(p.notes)}</textarea><small class="mut" id="jrNoteS"></small></div>
      ${p.m ? `<div class="jr-links"><a href="#coin/solana:${E(p.m)}">📈 Kyvo</a>${pf ? `<a href="https://pump.fun/coin/${E(p.m)}" target="_blank" rel="noopener">💊 pump.fun</a>` : ''}<a href="https://dexscreener.com/solana/${E(c.pair || p.m)}" target="_blank" rel="noopener">DexScreener ↗</a></div>` : ''}
      ${p.manual && !p.demo ? `<div class="jr-mact"><button type="button" class="jr-btn" data-act="edit" data-id="${E(p.id)}">✎ ${L('Edytuj', 'Edit')}</button><button type="button" class="jr-btn jr-del" data-act="del" data-id="${E(p.id)}">🗑 ${L('Usuń', 'Delete')}</button></div>` : ''}`;
  }
  function mountChart(p) {
    const slot = root && root.querySelector('#jrChart');
    if (!slot || !window.KyvoChart || !p.m) return;
    const c = coins[p.m] || {}, solPx = S.solPx;
    window.KyvoChart.mount(slot, {
      key: 'jr:' + p.id, network: 'solana', pool: c.pair || null, token: p.m, dsChain: 'solana', pair: c.pair || '', smBuys: [],
      price: c.px, change: null, mcap: c.mc, createdAt: c.born || null,
      focus: p.openAt ? { from: p.openAt, to: p.closeAt || null } : null,   // v8.15: timeframe fitted to the trade's duration
      wallets: st.wallet ? { [st.wallet]: { name: L('Ty', 'You'), src: 'kyvo' } } : {},
      pfTrades: p.fills.map((f) => ({ tx: f.s, wallet: st.wallet, at: f.at, buy: !!f.b, usd: solPx ? f.sol * solPx : 0, px: null })),
    });
  }

  /* ----- manual add / edit ----- */
  function addForm(id) {
    const t = (id && st.manual.find((x) => x.id === id)) || {};
    const dt = (s) => { if (!s) return ''; const d = new Date(s * 1000 - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
    const meta = (id && st.meta[id]) || {};
    return `<button type="button" class="jr-back" data-act="back">‹ ${L('Wróć', 'Back')}</button>
      <form class="card jr-form" id="jrForm" autocomplete="off" data-id="${E(id || '')}">
        <b>${id ? L('Edytuj trade', 'Edit trade') : L('Dodaj trade ręcznie', 'Add a trade manually')}</b>
        <label>${L('Adres coina (CA, opcjonalnie)', 'Coin address (CA, optional)')}<input name="m" value="${E(t.m || '')}" spellcheck="false" autocapitalize="off" maxlength="60"></label>
        <label>Ticker<input name="sym" value="${E(t.sym || '')}" maxlength="20" placeholder="$PEPE"></label>
        <div class="jr-f2"><label>${L('Wejście', 'Entry')}<input type="datetime-local" name="o" value="${dt(t.openAt) || dt(now() - 3600)}"></label><label>${L('Wyjście', 'Exit')}<input type="datetime-local" name="c" value="${dt(t.closeAt) || dt(now())}"></label></div>
        <div class="jr-f2"><label>${L('Rozmiar (SOL)', 'Size (SOL)')}<input name="size" inputmode="decimal" value="${E(t.size || '')}" placeholder="0.5"></label><label>${L('Wynik % (gdy brak MC)', 'Result % (if no MC)')}<input name="pct" inputmode="decimal" value="${t.size && t.pnl != null && !t.entryMc ? E(((t.pnl / t.size) * 100).toFixed(1)) : ''}" placeholder="+45"></label></div>
        <div class="jr-f2"><label>${L('MC wejścia ($)', 'Entry MC ($)')}<input name="emc" inputmode="decimal" value="${E(t.entryMc || '')}" placeholder="80000"></label><label>${L('MC wyjścia ($)', 'Exit MC ($)')}<input name="xmc" inputmode="decimal" value="${E(t.exitMc || '')}" placeholder="150000"></label></div>
        <label>${L('Notatki', 'Notes')}<textarea name="n" rows="3" maxlength="2000">${E(meta.n || '')}</textarea></label>
        <div class="jr-tags">${TAGS.filter((x) => !x.auto || x.id === 'kyvo').map((x) => `<button type="button" data-ftag="${x.id}" class="${(meta.t || []).includes(x.id) ? 'on' : ''}">${x.e} ${L(x.pl, x.en)}</button>`).join('')}</div>
        <button class="jr-btn on" type="submit">${L('Zapisz', 'Save')}</button>
      </form>`;
  }
  function submitForm(fm) {
    const g = (n) => (fm.elements[n] ? fm.elements[n].value.trim() : '');
    const num = (n) => { const v = parseFloat(g(n).replace(/[\s$,]/g, '').replace(/k$/i, 'e3').replace(/m$/i, 'e6')); return isFinite(v) ? v : null; };
    const m = g('m');
    if (m && looksSecret(m)) { fm.elements.m.value = ''; toast(L('⛔ To wygląda na klucz prywatny / seed! Nie wklejaj go nigdzie.', '⛔ That looks like a private key / seed! Never paste it anywhere.')); return; }
    if (m && !validAddr(m)) { toast(L('Nieprawidłowy adres coina', 'Invalid coin address')); return; }
    const o = Date.parse(g('o')) / 1000, c = Date.parse(g('c')) / 1000, size = num('size'), emc = num('emc'), xmc = num('xmc'), pct = num('pct');
    if (!size || size <= 0) { toast(L('Podaj rozmiar w SOL', 'Enter the size in SOL')); return; }
    if (!(o && c && c >= o)) { toast(L('Sprawdź daty wejścia i wyjścia', 'Check the entry and exit dates')); return; }
    if (!(emc && xmc) && pct == null) { toast(L('Podaj MC wejścia i wyjścia albo wynik %', 'Enter entry and exit MC or the result %')); return; }
    const id = fm.dataset.id || 'man' + Date.now().toString(36);
    const t = { id, m: m || '', sym: g('sym').replace(/^\$/, '').slice(0, 20) || (m ? short(m) : '?'), openAt: Math.round(o), closeAt: Math.round(c), size, entryMc: emc && xmc ? emc : null, exitMc: emc && xmc ? xmc : null, pnl: emc && xmc ? null : size * (pct / 100) };
    st.manual = st.manual.filter((x) => x.id !== id).concat([t]);
    const tags = [...fm.querySelectorAll('[data-ftag].on')].map((b) => b.dataset.ftag);
    st.meta[id] = Object.assign({}, st.meta[id] || {}, { n: g('n'), t: tags });
    save(); recompute();
    toast(L('Zapisano trade', 'Trade saved'));
    if (m) loadCoins().then(() => { recompute(); render(); });
    go('trade/' + id);
  }

  /* ----- analytics ----- */
  function bars(title, rows, lab) {
    const mx = Math.max(0.0001, ...rows.map((r) => Math.abs(r.pnl)));
    return `<div class="card jr-an"><b>${title}</b>${rows.length ? `<div class="jr-anh"><span></span><span>n</span><span>WR</span><span>P&L</span></div>` + rows.map((r) => `<div class="jr-anr"><span>${lab(r.k)}</span><span>${r.n}</span><span>${fPct(r.wr)}</span><span class="jr-anb"><i class="${r.pnl >= 0 ? 'p' : 'n'}" style="width:${Math.max(3, (Math.abs(r.pnl) / mx) * 100).toFixed(0)}%"></i><em class="${cls(r.pnl)}">${fSol(r.pnl, 1).replace(' SOL', '')}</em></span></div>`).join('') : `<div class="jr-empty">${L('Za mało danych.', 'Not enough data.')}</div>`}</div>`;
  }
  function statsView() {
    if (!S.n) return emptyTrades();
    const dows = isEn() ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
    const hh = (h) => ('0' + h).slice(-2) + '–' + ('0' + ((h + 2) % 24)).slice(-2);
    return `${insightCards()}<div class="sub" style="margin:12px 2px 10px">${L('Zamknięte trade’y, wynik w SOL. WR = win rate. Godziny wg czasu na tym urządzeniu.', 'Closed trades, result in SOL. WR = win rate. Hours in this device’s time zone.')}</div>
      ${bars('🏃 ' + L('Alerty Kyvo vs reszta', 'Kyvo alerts vs the rest'), S.byKyvo, (k) => (k === 'kyvo' ? L('Z alertu Kyvo', 'From a Kyvo alert') : L('Pozostałe', 'Other')))}
      ${bars('🏷️ ' + L('Wg tagu', 'By tag'), S.byTag, (k) => (k === '_none' ? L('bez tagu', 'no tag') : E(tagLabel(k))))}
      ${bars('🕑 ' + L('Wg godziny wejścia', 'By hour of entry'), S.byHour, hh)}
      ${bars('📅 ' + L('Wg dnia tygodnia', 'By weekday'), S.byDow, (k) => dows[k])}
      ${bars('💰 ' + L('Wg MC przy wejściu', 'By MC at entry'), S.byMc, (k) => 'MC ' + k)}
      ${bars('⏱ ' + L('Czas trzymania vs wynik', 'Hold time vs result'), S.byHold, (k) => k)}`;
  }

  /* ----- v8.15 pass 8: Kyvo Coach chat panel (rule-based answers from the journal data; no paid AI) ----- */
  const KCO = { tab: 'coach', msgs: [], draft: '' };
  const KMARK = '<svg class="kco-mark" viewBox="0 0 399 406" aria-hidden="true"><defs><linearGradient id="kcoG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#9aa0aa"/><stop offset="1" stop-color="#e9ebef"/></linearGradient></defs><polygon fill="url(#kcoG)" points="0,145 164,0 164,182 0,322"/><polygon fill="url(#kcoG)" points="165,182 399,0 399,88 215,222 215,406 165,406"/></svg>';
  const KQ = [['tilt', 'shield_alert', 'Czy gram na tilcie?', 'Am I tilt trading?'], ['setup', 'trend', 'Który setup daje mi najwięcej?', 'Which setup pays me the most?'], ['psych', 'clock', 'Oceń moją psychikę w tym tygodniu', 'Grade my psychology this week']];
  const kcoClosed = () => PS.filter((p) => p.status === 'closed' && p.costSold > 0);
  function kcoRoute(t) {
    t = String(t || '').toLowerCase();
    if (/tilt|revenge|zemst|nerw|emoc|overtrad|za du[żz]o/.test(t)) return 'tilt';
    if (/setup|tag|strateg|najwi[eę]cej|zarabia|pays|best|godzin|hour|\bmc\b|market cap/.test(t)) return 'setup';
    if (/psych|tydzie|tygod|week|ocen|oceń|grade|dyscypl|disciplin|mental/.test(t)) return 'psych';
    return 'all';
  }
  function kcoAnswer(q) {
    const cl = kcoClosed(), hh = (h) => ('0' + h).slice(-2) + ':00';
    if (!S || cl.length < 5) return L(`Na razie widzę ${cl.length} zamkniętych trade’ów. Potrzebuję min. 5, żeby odpowiedzieć uczciwie — podłącz portfel albo dodaj trade’y ręcznie.`, `I can see only ${cl.length} closed trades so far. I need at least 5 to answer honestly — connect a wallet or add trades manually.`);
    if (q === 'tilt') {
      const t = S.tilt || [], rev = t.filter((e) => e.k === 'revenge'), bur = t.filter((e) => e.k === 'burst');
      const res = rev.reduce((a, e) => a + (e.res || 0), 0), hot = t[0] && now() - t[0].at < 3600 && !DEMO;
      const v = hot ? L('<b>Tak — teraz.</b> W ostatniej godzinie złapałem sygnał tiltu.', '<b>Yes — right now.</b> I caught a tilt signal in the last hour.')
        : rev.length + bur.length >= 3 ? L('<b>Czasem tak.</b> Wzorzec się powtarza.', '<b>Sometimes, yes.</b> The pattern repeats.')
        : rev.length + bur.length ? L('<b>Raczej nie</b>, ale były pojedyncze wpadki.', '<b>Mostly not</b>, but there were a few slips.') : L('<b>Nie.</b> Nie widzę tiltu w tym okresie.', '<b>No.</b> I see no tilt in this period.');
      return `${v}<ul><li>${L(`Zakup w 5 min po stracie: <b>${rev.length}×</b>${rev.length ? `, wynik <b class="${cls(res)}">${fSol(res, 1)}</b>` : ''}`, `Buying within 5 min of a loss: <b>${rev.length}×</b>${rev.length ? `, result <b class="${cls(res)}">${fSol(res, 1)}</b>` : ''}`)}</li><li>${L(`5+ wejść w 10 min: <b>${bur.length}×</b>`, `5+ entries within 10 min: <b>${bur.length}×</b>`)}</li></ul>${L('Zasada: po stracie 5 minut przerwy, potem tylko setup z planu.', 'Rule: after a loss take 5 minutes off, then only a setup from your plan.')}`;
    }
    if (q === 'setup') {
      const li = [];
      const bt = S.byTag.filter((r) => !['_none', 'revenge', 'rug', 'fomo', 'late'].includes(r.k) && r.n >= 2).sort((a, b) => b.pnl - a.pnl)[0];
      if (bt) li.push(L(`Tag <b>${E(tagLabel(bt.k))}</b>: <b class="${cls(bt.pnl)}">${fSol(bt.pnl, 1)}</b>, win rate ${fPct(bt.wr)} (${bt.n}×)`, `Tag <b>${E(tagLabel(bt.k))}</b>: <b class="${cls(bt.pnl)}">${fSol(bt.pnl, 1)}</b>, win rate ${fPct(bt.wr)} (${bt.n}×)`));
      const mb = S.byMc.filter((r) => r.n >= 2).sort((a, b) => b.pnl - a.pnl)[0];
      if (mb) li.push(L(`Wejścia przy MC <b>${E(mb.k)}</b>: <b class="${cls(mb.pnl)}">${fSol(mb.pnl, 1)}</b>, win rate ${fPct(mb.wr)}`, `Entries at MC <b>${E(mb.k)}</b>: <b class="${cls(mb.pnl)}">${fSol(mb.pnl, 1)}</b>, win rate ${fPct(mb.wr)}`));
      const bh = S.byHour.filter((r) => r.n >= 2).sort((a, b) => b.pnl - a.pnl)[0];
      if (bh) li.push(L(`Godziny <b>${hh(bh.k)}–${hh((bh.k + 2) % 24)}</b>: <b class="${cls(bh.pnl)}">${fSol(bh.pnl, 1)}</b>`, `Hours <b>${hh(bh.k)}–${hh((bh.k + 2) % 24)}</b>: <b class="${cls(bh.pnl)}">${fSol(bh.pnl, 1)}</b>`));
      const ky = S.byKyvo.find((r) => r.k === 'kyvo'), ot = S.byKyvo.find((r) => r.k === 'other');
      if (ky && ky.n >= 2 && ot && ot.n >= 1) li.push(L(`Alerty Kyvo: win rate <b>${fPct(ky.wr)}</b> vs reszta ${fPct(ot.wr)}`, `Kyvo alerts: win rate <b>${fPct(ky.wr)}</b> vs the rest ${fPct(ot.wr)}`));
      if (!li.length) return L('Za mało powtarzalnych setupów. Taguj trade’y (np. Runner, KOL, Gold), a powiem, co działa.', 'Not enough repeated setups yet. Tag your trades (e.g. Runner, KOL, Gold) and I will tell you what works.');
      return `${L('Najwięcej daje Ci:', 'What pays you the most:')}<ul>${li.map((x) => `<li>${x}</li>`).join('')}</ul>${L('Rób więcej tego, mniej reszty.', 'Do more of this, less of the rest.')}`;
    }
    if (q === 'psych') {
      const t0 = now() - 7 * 86400, wk = cl.filter((p) => (p.closeAt || p.openAt) >= t0);
      const base = wk.length >= 3 ? wk : cl, scope = wk.length >= 3 ? L('w tym tygodniu', 'this week') : L('w całym okresie (w tym tygodniu za mało trade’ów)', 'over the whole period (too few trades this week)');
      const tl = (S.tilt || []).filter((e) => wk.length >= 3 ? e.at >= t0 : true);
      const rv = tl.filter((e) => e.k === 'revenge').length, bu = tl.filter((e) => e.k === 'burst').length;
      const w = base.filter((p) => p.realized > 0), wr = base.length ? w.length / base.length : 0, pnl = base.reduce((a, p) => a + p.realized, 0);
      const rugs = base.filter((p) => p.tags.includes('rug')).length;
      let sc = 100; const why = [];
      if (rv) { sc -= Math.min(36, rv * 12); why.push(L(`${rv}× zakup zaraz po stracie`, `${rv}× buying right after a loss`)); }
      if (bu) { sc -= Math.min(30, bu * 10); why.push(L(`${bu}× seria 5+ wejść w 10 min`, `${bu}× a burst of 5+ entries in 10 min`)); }
      if (S.holdW && S.holdL && S.holdL > S.holdW * 1.5) { sc -= 12; why.push(L(`stratne trzymasz dłużej (${fHold(S.holdL)} vs ${fHold(S.holdW)})`, `you hold losers longer (${fHold(S.holdL)} vs ${fHold(S.holdW)})`)); }
      if (rugs) { sc -= Math.min(18, rugs * 6); why.push(L(`${rugs}× rug w portfelu`, `${rugs}× rug held`)); }
      if (wr < 0.3) { sc -= 8; why.push(L('niski win rate', 'low win rate')); }
      sc = Math.max(5, sc);
      return `${L(`Ocena ${scope}:`, `Grade ${scope}:`)} <span class="kco-grade">${grade(sc)}</span> <small class="mut">${sc}/100</small><ul><li>${L('Trade’y', 'Trades')}: <b>${base.length}</b> · win rate <b>${fPct(wr)}</b> · P&L <b class="${cls(pnl)}">${fSol(pnl, 1)}</b></li>${why.length ? why.map((x) => `<li>${x}</li>`).join('') : `<li>${L('Bez tiltu, bez trzymania strat — czysta głowa.', 'No tilt, no holding losers — a clear head.')}</li>`}</ul>${sc >= 80 ? L('Tak trzymaj. Zapisz w notatce, co działało.', 'Keep it up. Write down what worked.') : L('Jedna rzecz na jutro: po stracie 5 min przerwy i stały rozmiar pozycji.', 'One thing for tomorrow: a 5-min break after a loss and a fixed position size.')}`;
    }
    return `${L('Najważniejsze, co widzę w Twoim dzienniku:', 'The most important things I see in your journal:')}<ul>${COACH.slice(0, 3).map((c) => `<li>${E(L(c.pl, c.en))}</li>`).join('')}</ul>${L('Zapytaj też o tilt, setup albo psychikę.', 'Ask me about tilt, setups or psychology too.')}`;
  }
  function kcoAsk(q, text) {
    KCO.msgs.push({ me: 1, t: E(String(text).slice(0, 200)) }, { t: kcoAnswer(q) });
    KCO.msgs = KCO.msgs.slice(-12); KCO.tab = 'coach'; render();
    const b = root && root.querySelector('.kco-body'); if (b) b.scrollTop = b.scrollHeight;
  }
  function kcoPanel(inner) {
    const tabs = [['coach', 'Coach', 'Coach'], ['tips', 'Wskazówki', 'Tips'], ['tilt', 'Tilt guard', 'Tilt guard']];
    const n = kcoClosed().length;
    let body;
    if (KCO.tab === 'tips') body = `<div class="kco-list">${COACH.map((c) => `<div class="kco-tip ${c.sev}"><i></i><p>${E(L(c.pl, c.en))}</p></div>`).join('')}</div>`;
    else if (KCO.tab === 'tilt') body = inner;
    else if (!KCO.msgs.length) body = `<div class="kco-empty">${KMARK}<b>${L('O co chcesz zapytać?', 'What do you want to know?')}</b><span>${L(`Coach przeczytał każdy Twój trade (${n} zamkniętych).`, `Your coach has read every trade you logged (${n} closed).`)}</span>
        <div class="kco-qs">${KQ.map((q) => `<button type="button" data-kco="q" data-q="${q[0]}"><i>${ICO(q[1], '•')}</i>${L(q[2], q[3])}</button>`).join('')}</div></div>`;
    else body = `<div class="kco-msgs">${KCO.msgs.map((m) => m.me ? `<div class="kco-me">${m.t}</div>` : `<div class="kco-ai">${KMARK}<div>${m.t}</div></div>`).join('')}</div>
        <div class="kco-qs row">${KQ.map((q) => `<button type="button" data-kco="q" data-q="${q[0]}"><i>${ICO(q[1], '•')}</i>${L(q[2], q[3])}</button>`).join('')}</div>`;
    return `<div class="kco-stage"><section class="kco" aria-label="Kyvo Coach">
      <header class="kco-h"><div class="kco-seg" role="tablist">${tabs.map((t) => `<button type="button" role="tab" data-kco="tab" data-t="${t[0]}" class="${KCO.tab === t[0] ? 'on' : ''}" aria-selected="${KCO.tab === t[0]}">${L(t[1], t[2])}</button>`).join('')}</div>
        ${KCO.msgs.length && KCO.tab === 'coach' ? `<button type="button" class="kco-x" data-kco="reset" aria-label="${L('Nowa rozmowa', 'New chat')}">${L('Nowa', 'New')}</button>` : ''}</header>
      <div class="kco-body">${body}</div>
      <form class="kco-in" id="kcoForm" autocomplete="off"><input id="kcoTxt" maxlength="200" placeholder="${L('Zapytaj o swoje trade’y…', 'Ask about your trades…')}" value="${E(KCO.draft)}"><span class="kco-mode">${L('Reguły · bez AI', 'Rules · no AI')}</span><button type="submit" aria-label="${L('Wyślij', 'Send')}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>
    </section></div>`;
  }
  function kcoWire() {
    if (!root) return;
    root.querySelectorAll('[data-kco]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.kco;
      if (a === 'tab') { KCO.tab = b.dataset.t; render(); }
      else if (a === 'reset') { KCO.msgs = []; render(); }
      else if (a === 'q') { const q = KQ.find((x) => x[0] === b.dataset.q); kcoAsk(q[0], L(q[2], q[3])); }
    }));
    const f = root.querySelector('#kcoForm');
    if (f) {
      const i = f.querySelector('#kcoTxt');
      i.oninput = () => { KCO.draft = i.value; };
      f.onsubmit = (e) => {
        e.preventDefault(); const v = i.value.trim(); if (!v) return;
        if (looksSecret(v)) { KCO.draft = ''; i.value = ''; toast(L('⛔ To wygląda na klucz prywatny / seed! Nie wklejaj go nigdzie.', '⛔ That looks like a private key / seed! Never paste it anywhere.')); return; }
        KCO.draft = ''; kcoAsk(kcoRoute(v), v);
      };
    }
  }

  /* ----- coach ----- */
  function coachView() {
    const sc = S.score, t = S.tilt || [];
    const hot = t[0] && now() - t[0].at < 3600 && !DEMO;
    const tg = `      <div class="card jr-tg ${hot ? 'hot' : ''}"><b>${ICO('shield', '🧊')} Tilt guard</b>
        <div class="jr-tgs">${hot ? `<i class="kco-dot dn"></i> ${L('Tilt teraz — zrób 5 min przerwy.', 'Tilting right now — take a 5-min break.')}` : `<i class="kco-dot up"></i> ${L('Spokój — brak tiltu w ostatniej godzinie.', 'Calm — no tilt in the last hour.')}`}</div>
        <small class="mut">${L('Ostrzegam, gdy wchodzisz w 5+ coinów w 10 min albo kupujesz nowy coin w ciągu 5 min po stracie (−15% lub gorzej). Działa, gdy Journal jest otwarty i odświeżony.', 'I warn you when you enter 5+ coins within 10 min or buy a new coin within 5 min of a loss (−15% or worse). Works while the Journal is open and refreshed.')}</small>
        ${t.length ? `<div class="jr-tgl">${t.slice(0, 6).map((e) => `<div><span>${e.k === 'burst' ? '<i class="kco-dot dn"></i> ' + L(`${e.n} wejść w 10 min`, `${e.n} entries in 10 min`) : '<i class="kco-dot dn"></i> ' + L('zakup po stracie', 'buy after a loss')}</span><small>${fDate(e.at, 1)}</small>${e.k === 'revenge' && e.res != null ? `<b class="${cls(e.res)}">${fSol(e.res, 1)}</b>` : '<b></b>'}</div>`).join('')}</div>` : ''}
      </div>
      ${BREAKER ? `<a class="card jr-cprev" href="#journal/plan"><span class="jr-bot">${ICO('shield', '🛡')}</span><div><small>${L('Bezpiecznik', 'Circuit breaker')}</small><b>${plan.rules.on ? (DISC && DISC.total ? L(`Dyscyplina ${grade(Math.round((DISC.adh || 0) * 100))} · ${DISC.kept}/${DISC.total} dni w normie`, `Discipline ${grade(Math.round((DISC.adh || 0) * 100))} · ${DISC.kept}/${DISC.total} days within rules`) : L('Włączony — pilnuje Twoich limitów.', 'On — watching your limits.')) : L('Ustaw limity: trade’y, strata, straty z rzędu. Po złamaniu — przerwa.', 'Set limits: trades, loss, losses in a row. Break one — take a break.')}</b></div><span class="mut">›</span></a>` : `<a class="card jr-cprev" href="#journal/plan"><span class="jr-bot">${ICO('j_plan', '📋')}</span><div><small>${L('Plan dnia', 'Today’s plan')}</small><b>${L('Checklista przed sesją, cele i krótka notatka po sesji.', 'A pre-session checklist, goals and a short after-session note.')}</b></div><span class="mut">›</span></a>`}`;
    return `${kcoPanel(tg)}
      <div class="mut jr-foot">${L('Coach działa na regułach i Twoich statystykach (bez płatnego AI) — to wskazówki, nie porada finansowa.', 'The coach is rule-based on your own stats (no paid AI) — tips, not financial advice.')}</div>`;
  }

  function cine() {
    const pic = window.KyvoArt ? KyvoArt.pic('cliff', '(min-width:760px) 760px, 100vw') : '';
    return `<div class="jr-cine" data-ky-par translate="no"><div class="jr-cine-bg" data-depth="-0.6">${pic}</div><div class="jr-cine-t"><small>Kyvo Journal</small><b>${L('Każdy trade zostawia ślad.', 'Every trade leaves a trace.')}</b><span>${L('Dziennik pokazuje, dokąd prowadzi.', 'The journal shows where it leads.')}</span></div></div>`;
  }
  /* ----- locked (free users) ----- */
  function lockedView() {
    const keepDemo = st; st = blank(); recompute(); st = keepDemo;
    return `<div class="jr-lockw"><div class="jr-lockc" aria-hidden="true">${dash()}</div>
      <div class="jr-locko card">${cine()}<div class="jr-lk">${ICO('lock', '🔒')}</div><b class="jr-chrome jr-lkt">Journal ✦ Premium</b>
        <p>${L('Automatyczny dziennik Twoich trade’ów z publicznego adresu portfela: P&L, kalendarz, Kyvo Score, analityka wg godzin / MC / tagów, coach i tilt guard.', 'An automatic journal of your trades from a public wallet address: P&L, calendar, Kyvo Score, analytics by hour / MC / tag, a coach and a tilt guard.')}</p>
        <ul><li>📊 Dashboard · ${L('kalendarz P&L', 'P&L calendar')}</li><li>📓 ${L('Dziennik z notatkami i tagami', 'Journal with notes & tags')}</li><li>📈 ${L('Analityka', 'Analytics')}</li><li>📋 ${L('Plan dnia, cele, refleksje', 'Daily plan, goals, reflections')}</li><li>🤖 Coach + 🧊 tilt guard</li></ul>
        <button type="button" class="jr-btn on" data-act="premium">✦ ${L('Odblokuj Premium', 'Unlock Premium')}</button>
        <small class="mut">${L('Na tle: PRZYKŁAD (przykładowe dane).', 'Behind: EXAMPLE (sample data).')}</small></div></div>`;
  }

  /* ----- render ----- */
  let rT = 0;
  function render(soft) {
    if (!root || !root.isConnected) return;
    if (soft) { if (rT) return; rT = setTimeout(() => { rT = 0; render(); }, 400); return; }
    if (sub === 'trade' || sub === 'add' || sub === 'edit' || sub === 'plan') {
      // don't wipe a note being typed / a form being filled
      const ae = document.activeElement;
      if (ae && root.contains(ae) && /TEXTAREA|INPUT/.test(ae.tagName) && root.dataset.sub === sub + ':' + subArg) return;
    }
    const y = window.scrollY;
    const same = root.dataset.sub === sub + ':' + subArg;
    let body;
    if (!isPrem()) body = lockedView();
    else if (sub === 'trade') body = tradeView(subArg);
    else if (sub === 'add' || sub === 'edit') body = addForm(sub === 'edit' ? subArg : '');
    else if (sub === 'plan') body = progress() + planView();
    else {
      const top = (!st.wallet ? cine() + walletCard(st.manual.length > 0) + demoRibbon() : '') + progress() + tiltBanner();
      body = top + (sub === 'log' ? logView() : sub === 'stats' ? statsView() : sub === 'coach' ? coachView() : dash());
    }
    const keepChart = sub === 'trade' && same && root.querySelector('.kchart');
    const chartEl = keepChart ? root.querySelector('.kchart') : null;
    root.innerHTML = `<div class="jr">${header()}${body}
      <div class="mut jr-foot">${L(`Źródła (darmowe, publiczne): publiczne RPC Solany (swapy podpisane przez portfel, ostatnie ${CFG.days} dni), DexScreener (coiny, MC teraz), GeckoTerminal (szczyty), alerty Kyvo. P&L w SOL z opłatami; $ wg obecnego kursu SOL. MC przy wejściu/wyjściu przybliżone. Kyvo nigdy nie prosi o klucze. To nie jest porada finansowa.`, `Sources (free, public): public Solana RPC (swaps signed by the wallet, last ${CFG.days} days), DexScreener (coins, MC now), GeckoTerminal (peaks), Kyvo alerts. P&L in SOL incl. fees; $ at the current SOL price. Entry/exit MC approximate. Kyvo never asks for keys. Not financial advice.`)}</div></div>`;
    root.dataset.sub = sub + ':' + subArg;
    wire();
    if (sub === 'trade' && isPrem()) {
      const p = findP(subArg);
      if (p) { if (chartEl && root.querySelector('#jrChart')) root.querySelector('#jrChart').appendChild(chartEl); else mountChart(p); }
    }
    if (same) window.scrollTo(0, y);
  }
  function wire() {
    root.querySelectorAll('[data-sub]').forEach((b) => (b.onclick = () => go(b.dataset.sub === 'dash' ? '' : b.dataset.sub)));
    root.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filt = b.dataset.f; render(); }));
    root.querySelectorAll('[data-cal]').forEach((b) => (b.onclick = () => { const d = new Date(calM[0], calM[1] + +b.dataset.cal, 1); calM = [d.getFullYear(), d.getMonth()]; calSel = null; render(); }));
    root.querySelectorAll('[data-cday]').forEach((b) => (b.onclick = () => { calSel = calSel === b.dataset.cday ? null : b.dataset.cday; render(); const l = root.querySelector('.jr-cdl'); if (l && l.scrollIntoView) l.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
    root.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'sync') sync(true);
      else if (a === 'premium') { if (D.openPremium) D.openPremium(); else location.hash = 'premium'; }
      else if (a === 'add') go('add');
      else if (a === 'share-day') shareDay('day');
      else if (a === 'share-all') shareDay('all');
      else if (a === 'share-month') shareMonth();
      else if (a === 'share-trade') shareTrade(findP(subArg));
      else if (a === 'card-trade') pnlCard('trade', subArg);
      else if (a === 'card-day') pnlCard('day');
      else if (a === 'card-cday') pnlCard('day', calSel);
      else if (a === 'card-month') pnlCard('month');
      else if (a === 'pin') { const id = subArg; plan.pins = plan.pins.includes(id) ? plan.pins.filter((x) => x !== id) : [id].concat(plan.pins).slice(0, 12); savePlan(); render(); }
      else if (a === 'edit') go('edit/' + b.dataset.id);
      else if (a === 'back') { if (history.length > 1) history.back(); else go('log'); }
      else if (a === 'del') { if (confirm(L('Usunąć ten trade?', 'Delete this trade?'))) { st.manual = st.manual.filter((x) => x.id !== b.dataset.id); delete st.meta[b.dataset.id]; save(); recompute(); go('log'); } }
      else if (a === 'wallet') {
        if (confirm(L('Odłączyć portfel? Notatki, tagi i ręczne trade’y zostaną.', 'Disconnect the wallet? Notes, tags and manual trades are kept.'))) { job.id++; job.busy = false; const keep = { meta: st.meta, manual: st.manual }; st = Object.assign(blank(), keep); save(); recompute(); render(); }
      }
    }));
    const wf = root.querySelector('#jrWForm');
    if (wf) wf.onsubmit = (e) => {
      e.preventDefault();
      const i = wf.querySelector('#jrAddr'), a = i.value.trim();
      if (looksSecret(a)) { i.value = ''; toast(L('⛔ To wygląda na klucz prywatny / seed! Nie wklejaj go nigdzie. Kyvo potrzebuje tylko publicznego adresu.', '⛔ That looks like a private key / seed! Never paste it anywhere. Kyvo only needs a public address.')); return; }
      if (!validAddr(a)) { toast(L('Nieprawidłowy adres Solany (32–44 znaki base58)', 'Invalid Solana address (32–44 base58 chars)')); return; }
      const keep = { meta: st.meta, manual: st.manual };
      st = Object.assign(blank(), keep, { wallet: a }); save();
      recompute(); render(); sync(true);
    };
    root.querySelectorAll('[data-tag]').forEach((b) => (b.onclick = () => {
      const p = findP(subArg); if (!p) return;
      const m = (st.meta[p.id] = st.meta[p.id] || {}), id = b.dataset.tag;
      m.t = m.t || []; m.x = m.x || [];
      if (p.tags.includes(id)) { m.t = m.t.filter((x) => x !== id); if (p.autoTags.includes(id)) m.x.push(id); }
      else { m.t.push(id); m.x = m.x.filter((x) => x !== id); }
      save(); recompute(); render();
    }));
    const nt = root.querySelector('#jrNote');
    if (nt) { let tt; nt.oninput = () => { clearTimeout(tt); tt = setTimeout(() => { const m = (st.meta[subArg] = st.meta[subArg] || {}); m.n = nt.value.slice(0, 2000); save(); const p = findP(subArg); if (p) p.notes = m.n; const s = root.querySelector('#jrNoteS'); if (s) s.textContent = '✓ ' + L('zapisano', 'saved'); }, 500); }; }
    if (sub === 'plan') wirePlan();
    if (sub === 'coach') kcoWire();
    const fm = root.querySelector('#jrForm');
    if (fm) {
      fm.querySelectorAll('[data-ftag]').forEach((b) => (b.onclick = () => b.classList.toggle('on')));
      fm.onsubmit = (e) => { e.preventDefault(); submitForm(fm); };
    }
  }

  let subArg = '', lastAuto = 0;
  async function show(el, arg) {
    root = el;
    const a = String(arg || '').split('/');
    sub = ['plan', 'log', 'stats', 'coach', 'trade', 'add', 'edit'].includes(a[0]) ? a[0] : 'dash';
    subArg = a.slice(1).join('/');
    if (!CFG.enabled) { el.innerHTML = `<div class="empty">${L('Journal jest wyłączony.', 'Journal is turned off.')}</div>`; return; }
    if (window.KyvoPremiumReady) { try { await window.KyvoPremiumReady; } catch (e) {} }
    if (!flags) { await loadFlags(); }
    recompute();
    render();
    window.scrollTo(0, 0);
    if (!isPrem()) return;
    checkBreach();
    if (st.wallet && !job.busy && Date.now() - (st.at || 0) > 180000 && Date.now() - lastAuto > 60000) { lastAuto = Date.now(); sync(false); }
    else if (st.wallet && !job.busy && Object.keys(coins).length === 0) { loadCoins().then(() => { recompute(); render(); peaksLoop(); }); }
    else if (st.wallet) peaksLoop();
  }
  function init(deps) { D = deps || {}; }
  if (plan.cool) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountCool); else setTimeout(mountCool, 0); }
  window.addEventListener('kyvo-premium-change', () => { if (root && root.isConnected) { recompute(); render(); } });
  Object.assign(window.KyvoJournal, { init, show, enabled: () => !!CFG.enabled, _state: () => st, _job: () => job, _positions: () => PS, _sync: sync, _plan: () => plan, _check: () => { recompute(); checkBreach(); return DISC; }, _share: shareTrade, _pnlCard: pnlCard, _shareDay: shareDay, _mountCool: mountCool, _savePlan: savePlan });
})();
