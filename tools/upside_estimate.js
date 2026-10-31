#!/usr/bin/env node
/* Kyvo v8.3 — upside_estimate.js: Node-runnable copy of estimateUpside() from insights.js (between UPSIDE_CORE_BEGIN/END).
   Speculative heuristic on public market data. NOT a forecast, NOT financial advice — memecoins can go to zero.
   Usage:
     node tools/upside_estimate.js '{"score":82,"redFlags":0,"mcap":250000,"liquidity":40000,"vol1h":90000,"vol24h":400000,"m5":3,"h1":25,"h6":60,"buys1h":300,"sells1h":180,"ageH":5,"smBuyers":2,"smSellers":0,"tweetNamed":true,"tweetAgeH":2}'
     echo '[{...},{...}]' | node tools/upside_estimate.js            (estimateUpside per item)
     echo '[{...},{...}]' | node tools/upside_estimate.js --good     (goodCoinRule: Good Coins / Discord calls rule)
     echo '[{...}]' | node tools/upside_estimate.js --runner   (runnerRule: 🏃 Runner trigger)
     echo '[{...}]' | node tools/upside_estimate.js --leg2     (secondLegRule: 🔁 Kolejna fala; needs pumpX/belowHigh/coolRatio)
     echo '[{...}]' | node tools/upside_estimate.js --big      (v8.9 bigRunnerRule: 📈 established $1M–$100M coin running now)
     echo '[{...}]' | node tools/upside_estimate.js --early    (earlyRunnerRule: 🏃 first pump, 5-min acceleration)
     const { estimateUpside } = require('./tools/upside_estimate.js');
   Regenerate after changing insights.js: python3 tools/sync_upside.py (copies the core block verbatim). */
'use strict';
/* UPSIDE_CORE_BEGIN — pure function, no DOM / network. Same code is shipped as tools/upside_estimate.js (Node). */
/**
 * estimateUpside(x) → speculative upside estimate for one memecoin. NOT a forecast, NOT financial advice.
 * x (plain numbers, null = unknown):
 *   score (Kyvo Check 0–100), redFlags (count of ⛔ checks), mcap, liquidity, onCurve (bool, still on bonding curve),
 *   vol1h, vol24h, m5, h1, h6, h24 (price change %), buys1h, sells1h, ageH (pair age, hours),
 *   smBuyers, smSellers (tracked smart-money wallets, 72h), tweetNamed (bool|null: true = coin named in tweet,
 *   false = speculative/topic match, null = no tweet), tweetAgeH, sinceTweetPct, top10 (0..1 holder share, off-curve only)
 * returns { gated, noData, G, comp, ageF, flags, scen, lo, hi, tf, room, horizons: [{h, label, lo, hi, base, scen, conf, confLabel}] }
 */
const UPSIDE_HORIZONS = [0.5, 1, 3, 6, 8];
function estimateUpside(x) {
  const c01 = (v) => (isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const n = (v) => (v == null || !isFinite(+v) ? null : +v);
  const nice = (v) => (v < 20 ? Math.round(v) : v < 50 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10);
  const S = n(x.score) == null ? 0 : +x.score, reds = n(x.redFlags) || 0;
  const mc = n(x.mcap), liq = n(x.liquidity), v1 = n(x.vol1h), v24 = n(x.vol24h);
  const m5 = n(x.m5), h1 = n(x.h1), h6 = n(x.h6), h24 = n(x.h24);
  const b = n(x.buys1h), s = n(x.sells1h), ntx = (b || 0) + (s || 0);
  const br = b != null && s != null && ntx > 0 ? b / ntx : null;
  const ageH = n(x.ageH), twAgeH = n(x.tweetAgeH), since = n(x.sinceTweetPct), top10 = n(x.top10);
  const smB = n(x.smBuyers) || 0, smS = n(x.smSellers) || 0;
  const onCurve = !!x.onCurve;
  const volX = v1 != null && v24 > 0 ? v1 / (v24 / 24) : null;
  const comp = {
    mom: c01(0.5 * cl(h1 || 0, -30, 100) / 100 + 0.3 * cl(m5 || 0, -15, 30) / 30 + 0.2 * cl(h6 || 0, -50, 200) / 200),
    flow: br == null || ntx < 5 ? 0 : c01((br - 0.4) / 0.25),
    act: mc > 0 && v1 != null ? c01(0.6 * c01(Math.log10(1 + 20 * v1 / mc) / Math.log10(21)) + 0.4 * c01(((volX || 1) - 1) / 3)) : 0,
    sm: c01((smB - 0.5 * smS) / 3),
    viral: x.tweetNamed == null ? 0 : x.tweetNamed && twAgeH != null && twAgeH <= 24 ? 1 : x.tweetNamed && twAgeH != null && twAgeH <= 72 ? 0.6 : 0.5,
    q: c01((S - 50) / 50),
    liqOk: onCurve ? 0.6 : mc > 0 && liq != null ? c01(liq / mc / 0.1) : 0,
  };
  const ageF = ageH == null ? 0.85 : ageH < 1 ? 0.7 : ageH < 24 ? 1 : ageH < 168 ? 0.85 : 0.7;
  const flags = {
    over: (h6 != null && h6 > 300) || (h24 != null && h24 > 500) || (since != null && since >= 300),
    dumping: h1 != null && h1 < -20,
    sellersDom: br != null && ntx >= 20 && br < 0.45,
    concentrated: top10 != null && top10 > 0.5,
    buyShare: br, volX,
  };
  let G = (0.25 * comp.mom + 0.15 * comp.flow + 0.15 * comp.act + 0.15 * comp.sm + 0.1 * comp.viral + 0.1 * comp.q + 0.1 * comp.liqOk) * ageF;
  if (flags.concentrated) G -= 0.1;
  if (flags.over) G -= 0.15;
  if (flags.dumping) G -= 0.1;
  G = c01(G);
  const gated = S < 50 || reds > 0 || (!onCurve && liq != null && liq < 5000);
  const noData = !(mc > 0) || (!onCurve && liq != null && liq > 2 * mc); // liq > 2×MC = broken MC/price data
  const scenOf = (g) => (g < 0.3 ? 'low' : g < 0.55 ? 'med' : 'high');
  const room = mc > 0 ? c01((Math.log10(1e7) - Math.log10(Math.max(mc, 5000))) / (Math.log10(1e7) - Math.log10(2e4))) : 0;
  const hiRaw = (40 + 260 * room) * (0.25 + 0.75 * G);
  const hi = Math.max(10, nice(hiRaw)), lo = Math.max(5, nice(hiRaw / 4));
  const tf = (ageH != null && ageH < 6) || (m5 != null && Math.abs(m5) >= 10) ? '15 min–2 h' : comp.act >= 0.5 ? '1–6 h' : '6–24 h';
  // horizons: share of the full move reachable in h hours grows ~√(h/8), faster for active / fast-moving coins;
  // signal decays with time (G_h = G − 0.005·h); confidence drops with horizon and with missing data.
  const speed = Math.max(comp.act, comp.mom);
  const dataF = (br == null ? 0.85 : 1) * (v1 == null ? 0.85 : 1) * (ageH == null ? 0.9 : 1);
  const horizons = UPSIDE_HORIZONS.map((h) => {
    const share = Math.min(1, Math.sqrt(h / 8) * (0.7 + 0.6 * speed));
    const hH = Math.max(3, nice(hiRaw * share)), lH = Math.max(1, nice(hiRaw * share / 4));
    const conf = Math.round(cl((25 + 50 * G) * (1 - 0.07 * (h - 0.5)) * dataF, 5, 95));
    // base (signed central case): midpoint of the range × (G_h − 0.22)/0.78 → negative when the signal is weak/fading
    // (v8.3 calibration: neutral point lowered from 0.30 so calm, established coins with buyer flow are not all negative)
    const gH = c01(G - 0.005 * h), mid = (hiRaw * share * 1.25) / 2;
    const base = Math.round(mid * (gH - 0.22) / 0.78);
    return { h, label: h < 1 ? Math.round(h * 60) + ' min' : h + ' h', lo: Math.min(lH, hH), hi: hH, base, scen: scenOf(gH), conf, confLabel: conf < 25 ? 'low' : conf < 45 ? 'med' : 'high' };
  });
  return { gated, noData, G, comp, ageF, flags, scen: scenOf(G), lo, hi, tf, room, horizons };
}
/**
 * estimatePopularity(x) → { P 0..1, parts, reasons } "Popularne teraz / Hot now" (attention right now).
 * Extra x fields: boostRank (1 = top DexScreener boost among listed coins, null = none).
 *   vol    = log10(vol1h/5k)/log10(80)          ($5k → 0, $400k → 1)
 *   rising = (volX − 0.8)/2.2                   (vol1h vs 24h hourly average)
 *   tx     = log10(txns1h/50)/log10(40)         (50 → 0, 2000 → 1)
 *   trend  = 1 − (boostRank − 1)/10             (DexScreener boosts; #1 → 1, #11+ → 0)
 *   viral / sm = same as estimateUpside
 *   P = 0.30·vol + 0.15·rising + 0.20·tx + 0.10·trend + 0.15·viral + 0.10·sm
 */
function estimatePopularity(x) {
  const c01 = (v) => (isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
  const n = (v) => (v == null || !isFinite(+v) ? null : +v);
  const v1 = n(x.vol1h), v24 = n(x.vol24h), ntx = (n(x.buys1h) || 0) + (n(x.sells1h) || 0);
  const volX = v1 != null && v24 > 0 ? v1 / (v24 / 24) : null;
  const rank = n(x.boostRank), twAgeH = n(x.tweetAgeH), smB = n(x.smBuyers) || 0, smS = n(x.smSellers) || 0;
  const parts = {
    vol: v1 > 0 ? c01(Math.log10(v1 / 5000) / Math.log10(80)) : 0,
    rising: volX == null ? 0 : c01((volX - 0.8) / 2.2),
    tx: ntx > 0 ? c01(Math.log10(ntx / 50) / Math.log10(40)) : 0,
    trend: rank ? c01(1 - (rank - 1) / 10) : 0,
    viral: x.tweetNamed == null ? 0 : x.tweetNamed && twAgeH != null && twAgeH <= 24 ? 1 : x.tweetNamed && twAgeH != null && twAgeH <= 72 ? 0.6 : 0.5,
    sm: c01((smB - 0.5 * smS) / 3),
  };
  const P = 0.3 * parts.vol + 0.15 * parts.rising + 0.2 * parts.tx + 0.1 * parts.trend + 0.15 * parts.viral + 0.1 * parts.sm;
  const reasons = [];
  if (v1 != null && v1 >= 10000) reasons.push({ k: 'vol', v: v1, up: volX != null && volX >= 1.3, x: volX });
  if (ntx >= 100) reasons.push({ k: 'tx', v: ntx });
  if (rank && rank <= 10) reasons.push({ k: 'trend', v: rank });
  if (x.tweetNamed != null) reasons.push({ k: 'tweet', v: x.tweetNamed });
  if (smB) reasons.push({ k: 'sm', v: smB });
  return { P, parts, reasons, volX };
}
/**
 * v8.3 Good Coins = 3 gates (all must pass) — used by the app, tools/upside_estimate.js --good and tools/discord_calls.py.
 *  1) SAFETY (hard): Kyvo Check ≥ 75, no ⛔; liquidity ≥ $25k and liq/MC ≥ 8%; pair age ≥ 15 min;
 *     contract — Solana: mint + freeze revoked, LP burned/locked ≥ 90% (or still on the pump.fun curve), top-10 holders
 *     (excl. pools/curve) ≤ 30%, creator ≤ 10% · BSC: not honeypot, buy & sell tax ≤ 5%, owner renounced or no dangerous
 *     functions, LP locked ≥ 90% (or four.meme curve). Robinhood: no free contract scanner → never passes.
 *  2) HOT NOW: vol 1h ≥ $50k (or 5-min volume pace ×12 ≥ $30k and ≥ 1.2× the 1h pace), txns 1h ≥ 300,
 *     vol1h/MC ≥ 10%, popularity P ≥ 0.30 (boost rank / X tweet / smart money add to P).
 *  3) 8H UPSIDE: buy share 1h ≥ 55%, Δ1h > 0 and ≤ 150% (no parabolic exhaustion), not fading after a pump (Δ24h > 300%
 *     and Δ5m/Δ1h < 0), not overextended/dumping, base estimate > 0 for 1 h, 3 h and 8 h.
 *  rank = P (hot) × G (upside); sorted descending. contract facts missing → status 'pending' (app fetches them).
 * x additionally: vol5m, contract = { checked, chain, mintRevoked, freezeRevoked, lpLockedPct, top10Pct, devPct,
 *   honeypot, buyTax, sellTax, ownerSafe, onCurve } (pct values 0..100).
 */
const GOOD_T = { kc: 75, liq: 25000, liqMc: 0.08, ageMinH: 0.25, top10: 30, dev: 10, lp: 90, tax: 5,
  vol1h: 50000, vol5mPace: 30000, tx1h: 300, volMc: 0.02, P: 0.30, buyShare: 0.55, h1Max: 150 };
function goodCoinRule(x, T) {
  T = Object.assign({}, GOOD_T, T || {});
  const n = (v) => (v == null || !isFinite(+v) ? null : +v);
  const est = estimateUpside(x), pop = estimatePopularity(x);
  const z = (h) => est.horizons.find((q) => q.h === h);
  const mc = n(x.mcap), liq = n(x.liquidity), v1 = n(x.vol1h), v5 = n(x.vol5m), h1 = n(x.h1), m5 = n(x.m5), h24 = n(x.h24);
  const b = n(x.buys1h) || 0, s = n(x.sells1h) || 0, ntx = b + s, br = ntx ? b / ntx : null;
  const k = x.contract || null;
  const g = { safety: [], hot: [], upside: [] };
  const add = (gate, key, pass, val) => g[gate].push({ key, pass: pass === null ? null : !!pass, val });
  // 1) SAFETY
  add('safety', 'kc', (n(x.score) || 0) >= T.kc && !(n(x.redFlags) || 0), n(x.score));
  add('safety', 'liq', liq != null && liq >= T.liq, liq);
  add('safety', 'liqMc', !!x.onCurve || (mc > 0 && liq != null && liq / mc >= T.liqMc && liq <= 2 * mc), mc > 0 && liq != null ? liq / mc : null);
  add('safety', 'age', n(x.ageH) != null && x.ageH >= T.ageMinH, n(x.ageH));
  if (!k || !k.checked) add('safety', 'contract', null, null);
  else if (k.chain === 'solana') {
    add('safety', 'mintFreeze', k.mintRevoked === true && k.freezeRevoked === true, null);
    add('safety', 'lp', !!k.onCurve || (n(k.lpLockedPct) != null && k.lpLockedPct >= T.lp), n(k.lpLockedPct));
    add('safety', 'top10', n(k.top10Pct) != null && k.top10Pct <= T.top10, n(k.top10Pct));
    add('safety', 'dev', n(k.devPct) == null ? true : k.devPct <= T.dev, n(k.devPct));
  } else if (k.chain === 'bsc') {
    add('safety', 'honeypot', k.honeypot === false, null);
    add('safety', 'tax', n(k.buyTax) != null && n(k.sellTax) != null && k.buyTax <= T.tax && k.sellTax <= T.tax, Math.max(n(k.buyTax) || 0, n(k.sellTax) || 0));
    add('safety', 'owner', k.ownerSafe === true, null);
    add('safety', 'lp', !!k.onCurve || (n(k.lpLockedPct) != null && k.lpLockedPct >= T.lp), n(k.lpLockedPct));
    if (n(k.top10Pct) != null) add('safety', 'top10', k.top10Pct <= T.top10, k.top10Pct);
  } else add('safety', 'scanner', false, null);
  // 2) HOT NOW
  const pace5 = v5 != null ? v5 * 12 : null;
  add('hot', 'vol', (v1 != null && v1 >= T.vol1h) || (pace5 != null && pace5 >= T.vol5mPace && v1 != null && pace5 >= 1.2 * v1), v1);
  add('hot', 'tx', ntx >= T.tx1h, ntx);
  add('hot', 'volMc', mc > 0 && v1 != null && v1 / mc >= T.volMc, mc > 0 && v1 != null ? v1 / mc : null);
  add('hot', 'pop', pop.P >= T.P, Math.round(pop.P * 100));
  // 3) 8H UPSIDE
  add('upside', 'buys', br != null && br >= T.buyShare, br);
  add('upside', 'mom', h1 != null && h1 > 0 && h1 <= T.h1Max, h1);
  add('upside', 'notLate', !(h24 != null && h24 > 300 && ((h1 != null && h1 < 0) || (m5 != null && m5 < 0))) && !est.flags.over && !est.flags.dumping && !est.flags.sellersDom && !(h1 != null && h1 <= -15), null);
  add('upside', 'base', !est.gated && !est.noData && z(1).base > 0 && z(3).base > 0 && z(8).base > 0, z(8).base);
  const all = g.safety.concat(g.hot, g.upside);
  const failed = all.find((q) => q.pass === false);
  const pending = !failed && all.some((q) => q.pass === null);
  return { ok: !failed && !pending, pending, failed: failed ? failed.key : null, gates: g, rank: pop.P * est.G, P: pop.P, pop, est, T };
}
/**
 * runnerRule(x, T) → { ok, failed, score, why[] } — "🏃 Runner": huge & accelerating volume, very many txns, fast move,
 * basic safety passed, MC small enough for a realistic 2x. Thresholds RUNNER_T come from tools/runner_research.py
 * (see kyvo_v8_3_notes.md for sample size / hit rate). Extra x fields: vol5m.
 */
// v8.3 research (tools/runner_research.py, n=88 Solana/BSC pools, 2.8 days): first-hour rule vol ≥ $100k, Δ ≥ +30%,
// volume accelerating (last-15-min pace ≥ first-45-min pace) → 14/17 did 2x+ within 25 h (precision 0.82 vs base 0.60,
// recall 0.26, ~6/day from first-hour triggers alone). tx/buy-share thresholds are not testable on OHLCV (spec values).
// v8.24 young-pool filter (pool < youngH = 30 min old): its 'last hour' is really its whole life, so (1) the 5-min acceleration is
// measured against the pace of the pool's whole life (like earlyRunnerRule) instead of the not-yet-full hour, which used to
// inflate it ~2-3x, and (2) stricter floors: safety ≥ youngKc, liquidity ≥ youngLiq, buy share ≥ youngBuy, accel ≥ youngAcc.
// Keep in sync: insights.js RUNNER_T  <->  tools/upside_estimate.js RUNNER_T (server rule).
const RUNNER_T = { kc: 60, liq: 15000, liqMc: 0.05, ageMinH: 0.1, mcMax: 3e7, vol1h: 100000, acc: 1.0, tx1h: 1000, buyShare: 0.55, h1Min: 30, m5Min: 0,
  youngH: 0.5, youngKc: 70, youngLiq: 20000, youngBuy: 0.58, youngAcc: 1.2 };
function runnerRule(x, T) {
  T = Object.assign({}, RUNNER_T, T || {});
  const c01 = (v) => (isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
  const n = (v) => (v == null || !isFinite(+v) ? null : +v);
  const mc = n(x.mcap), liq = n(x.liquidity), v1 = n(x.vol1h), v5 = n(x.vol5m), v24 = n(x.vol24h), h1 = n(x.h1), m5 = n(x.m5), ageH = n(x.ageH);
  const b = n(x.buys1h) || 0, s = n(x.sells1h) || 0, ntx = b + s, br = ntx ? b / ntx : null;
  const acc5 = v5 != null && v1 > 0 ? (v5 * 12) / v1 : null;           // last 5 min pace vs last hour
  const acc24 = v1 != null && v24 > 0 ? v1 / (v24 / 24) : null;         // last hour vs 24 h average
  const accel = ageH != null && ageH < 2 ? (acc5 != null ? acc5 : T.acc) : Math.max(acc5 || 0, acc24 || 0); // brand-new pairs: no 24h baseline → 5-min pace only
  const young = ageH != null && ageH < T.youngH;                       // v8.24
  const accY = young && v5 != null && v1 > 0 ? (v5 * 12) / (v1 / Math.max(ageH, 1 / 12)) : null;   // 5-min pace vs whole-life pace
  const checks = [
    ['safety', (n(x.score) || 0) >= T.kc && !(n(x.redFlags) || 0)],
    ['liq', liq != null && liq >= T.liq && (!!x.onCurve || (mc > 0 && liq / mc >= T.liqMc && liq <= 2 * mc))],
    ['age', ageH != null && ageH >= T.ageMinH],
    ['mc', mc > 0 && mc <= T.mcMax],
    ['vol', v1 != null && v1 >= T.vol1h],
    ['accel', accel >= T.acc],
    ['tx', ntx >= T.tx1h],
    ['buys', br != null && br >= T.buyShare],
    ['move', h1 != null && h1 >= T.h1Min && (m5 == null || m5 >= T.m5Min)],
    ['young', !young || ((n(x.score) || 0) >= T.youngKc && liq >= T.youngLiq && br >= T.youngBuy && accY != null && accY >= T.youngAcc)],
  ];
  const failed = checks.find((q) => !q[1]);
  const score = 0.35 * c01(Math.log10((v1 || 1) / T.vol1h) / 1.3 + 0.2) + 0.25 * c01((accel - 1) / 3) + 0.25 * c01(Math.log10((ntx || 1) / T.tx1h) / 1 + 0.2) + 0.15 * c01((h1 || 0) / 200);
  return { ok: !failed, failed: failed ? failed[0] : null, score, accel, ntx, br, young, accY };
}
/**
 * secondLegRule(x, T) → { ok, pending, failed, score, acc, br5, why } — "🔁 Kolejna fala / Second leg": a coin that
 * already pumped (24 h high ≥ 2× the low before it), cooled (now 30–60% below that high AND the quietest hour after the
 * high had ≤ 50% of the peak hour's volume) and now RE-ACCELERATES (5-min volume pace ≥ 2× the last hour, ≥ $5k in 5 min,
 * price up in 5 min, 5-min buy share ≥ 55% and not lower than the 1 h share). Same safety floor as runnerRule.
 * Extra x fields: vol5m, buys5m, sells5m, and from 15-min candles (pending until known): pumpX, belowHigh, coolRatio.
 * Research (tools/second_leg_research.py) → kyvo_v8_3_notes.md.
 */
const LEG2_T = { kc: 60, liq: 15000, liqMc: 0.05, mcMax: 1e8, pumpX: 2, belowMin: 30, belowMax: 60, coolMax: 0.5, acc: 2, v5Min: 5000, buy5: 0.55 };
function secondLegRule(x, T) {
  T = Object.assign({}, LEG2_T, T || {});
  const n = (v) => (v == null || !isFinite(+v) ? null : +v);
  const mc = n(x.mcap), liq = n(x.liquidity), v1 = n(x.vol1h), v5 = n(x.vol5m), m5 = n(x.m5);
  const b5 = n(x.buys5m) || 0, s5 = n(x.sells5m) || 0, br5 = b5 + s5 ? b5 / (b5 + s5) : null;
  const b1 = n(x.buys1h) || 0, s1 = n(x.sells1h) || 0, br1 = b1 + s1 ? b1 / (b1 + s1) : null;
  const acc = v5 != null && v1 > 0 ? (v5 * 12) / v1 : null;
  const market = [
    ['safety', (n(x.score) || 0) >= T.kc && !(n(x.redFlags) || 0)],
    ['liq', liq != null && liq >= T.liq && (!!x.onCurve || (mc > 0 && liq / mc >= T.liqMc && liq <= 2 * mc))],
    ['mc', mc > 0 && mc <= T.mcMax],
    ['reaccel', acc != null && acc >= T.acc && v5 >= T.v5Min],
    ['green', m5 != null && m5 > 0],
    ['buys5m', br5 != null && br5 >= T.buy5 && (br1 == null || br5 >= br1 - 0.02)],
  ];
  const mf = market.find((q) => !q[1]);
  if (mf) return { ok: false, pending: false, failed: mf[0], acc, br5 };
  const px = n(x.pumpX), below = n(x.belowHigh), cool = n(x.coolRatio);
  if (px == null || below == null || cool == null) return { ok: false, pending: true, failed: null, acc, br5 };
  const shape = [['pumped', px >= T.pumpX], ['pullback', below >= T.belowMin && below <= T.belowMax], ['cooled', cool <= T.coolMax]];
  const sf = shape.find((q) => !q[1]);
  const c01 = (v) => Math.max(0, Math.min(1, v));
  const score = 0.4 * c01((acc - 1) / 4) + 0.25 * c01((br5 - 0.5) / 0.3) + 0.2 * c01((px - 1) / 4) + 0.15 * c01(1 - cool);
  return { ok: !sf, pending: false, failed: sf ? sf[0] : null, score, acc, br5, pumpX: px, belowHigh: below, coolRatio: cool };
}
/**
 * earlyRunnerRule(x, T) → { ok, failed, score, acc, br5, tx5 } — "🏃 Runner: zaczyna pompować" (FIRST pump, as early as
 * possible): sudden 5-min volume + buyer acceleration with the safety floor passed, before the 1 h runner thresholds fire.
 * Research (first-15-min metrics, n=88): vol15 $20k–500k & Δ15 ≥ +10% → 20/30 did 2x+ (0.67 vs base 0.60, recall 0.38,
 * ≈ 11/day in the sample). 5-min acceleration / buyer counts are live-only fields (not testable on candles).
 * Extra x fields: vol5m, buys5m, sells5m.
 */
const EARLY_T = { kc: 60, liq: 10000, liqMc: 0.05, mcMax: 3e6, v5Min: 8000, v5Max: 170000, acc: 2.5, m5Min: 5, buy5: 0.6, tx5: 40 };
function earlyRunnerRule(x, T) {
  T = Object.assign({}, EARLY_T, T || {});
  const n = (v) => (v == null || !isFinite(+v) ? null : +v);
  const mc = n(x.mcap), liq = n(x.liquidity), v1 = n(x.vol1h), v5 = n(x.vol5m), m5 = n(x.m5), ageH = n(x.ageH);
  const b5 = n(x.buys5m) || 0, s5 = n(x.sells5m) || 0, tx5 = b5 + s5, br5 = tx5 ? b5 / tx5 : null;
  // brand-new pair (< 1 h): the hour is not full yet, so compare with the pace of the pair's whole life
  const acc = v5 != null && v1 > 0 ? (v5 * 12) / (ageH != null && ageH < 1 ? v1 / Math.max(ageH, 1 / 12) : v1) : null;
  const checks = [
    ['safety', (n(x.score) || 0) >= T.kc && !(n(x.redFlags) || 0)],
    ['liq', liq != null && liq >= T.liq && (!!x.onCurve || (mc > 0 && liq / mc >= T.liqMc && liq <= 2 * mc))],
    ['mc', mc > 0 && mc <= T.mcMax],
    ['vol5m', v5 != null && v5 >= T.v5Min && v5 <= T.v5Max],
    ['accel', acc != null && acc >= T.acc],
    ['move', m5 != null && m5 >= T.m5Min],
    ['buyers', tx5 >= T.tx5 && br5 != null && br5 >= T.buy5],
  ];
  const f = checks.find((q) => !q[1]);
  const c01 = (v) => Math.max(0, Math.min(1, v));
  const score = 0.4 * c01((acc || 0) / 6) + 0.3 * c01(((br5 || 0) - 0.5) / 0.3) + 0.3 * c01(Math.log10(Math.max(tx5, 1) / T.tx5) + 0.3);
  return { ok: !f, failed: f ? f[0] : null, score, acc, br5, tx5 };
}
/**
 * v8.9 bigRunnerRule(x, T) → { ok, failed, score, acc, txAcc, br } — "📈 Duży runner / Big runner": an ESTABLISHED coin
 * ($1M–$100M MC, not minutes old) that is running right now: strong 1 h (or 6 h) price move, volume of the last hour far
 * above its own 24 h average, more trades than its recent pace, buyers dominate, healthy liquidity, safety floor passed,
 * not a parabolic blow-off and not dumping in the last 5 min. Research: tools/big_runner_research.py → kyvo_v8_9_notes.md.
 * Extra x fields: vol5m, tx6h (buys+sells 6 h). Thresholds are never shown in the app.
 */
const BIG_T = { kc: 60, mcMin: 1e6, mcMax: 1e8, ageMinH: 6, liq: 50000, liqMc: 0.03, vol1h: 150000, volMc: 0.02, acc: 2.5, tx1h: 500, txAcc: 1.3, buyShare: 0.52, h1Min: 15, h6Min: 40, h1Soft: 5, h1Max: 300, m5Min: -3 };
function bigRunnerRule(x, T) {
  T = Object.assign({}, BIG_T, T || {});
  const n = (v) => (v == null || !isFinite(+v) ? null : +v);
  const c01 = (v) => (isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
  const mc = n(x.mcap), liq = n(x.liquidity), v1 = n(x.vol1h), v24 = n(x.vol24h), h1 = n(x.h1), h6 = n(x.h6), m5 = n(x.m5), ageH = n(x.ageH), tx6 = n(x.tx6h);
  const b = n(x.buys1h) || 0, s = n(x.sells1h) || 0, ntx = b + s, br = ntx ? b / ntx : null;
  const acc = v1 != null && v24 > 0 ? v1 / (v24 / 24) : null;
  const txAcc = tx6 != null && tx6 > 0 ? ntx / (tx6 / 6) : null;
  const checks = [
    ['safety', (n(x.score) || 0) >= T.kc && !(n(x.redFlags) || 0)],
    ['mc', mc != null && mc >= T.mcMin && mc <= T.mcMax],
    ['age', ageH != null && ageH >= T.ageMinH],
    ['liq', liq != null && !x.onCurve && liq >= T.liq && mc > 0 && liq / mc >= T.liqMc && liq <= 2 * mc],
    ['vol', v1 != null && v1 >= Math.max(T.vol1h, T.volMc * (mc || 0))],
    ['surge', acc != null && acc >= T.acc],
    ['tx', ntx >= T.tx1h && (txAcc == null || txAcc >= T.txAcc)],
    ['buys', br != null && br >= T.buyShare],
    ['move', h1 != null && h1 <= T.h1Max && (h1 >= T.h1Min || (h6 != null && h6 >= T.h6Min && h1 >= T.h1Soft))],
    ['notDumping', m5 == null || m5 >= T.m5Min],
  ];
  const f = checks.find((q) => !q[1]);
  const score = 0.35 * c01(Math.log10((acc || 1)) / 1) + 0.25 * c01((h1 || 0) / 60) + 0.2 * c01(((br || 0) - 0.5) / 0.2) + 0.2 * c01(((txAcc || 1) - 1) / 2);
  return { ok: !f, failed: f ? f[0] : null, score, acc, txAcc, br, ntx };
}
/* UPSIDE_CORE_END */

module.exports = { estimateUpside, estimatePopularity, goodCoinRule, GOOD_T, runnerRule, RUNNER_T, earlyRunnerRule, EARLY_T, secondLegRule, LEG2_T, bigRunnerRule, BIG_T, UPSIDE_HORIZONS };

if (require.main === module) {
  const run = (txt) => {
    const inp = JSON.parse(txt);
    const fn = process.argv.includes('--good') ? goodCoinRule : process.argv.includes('--runner') ? runnerRule : process.argv.includes('--leg2') ? secondLegRule : process.argv.includes('--early') ? earlyRunnerRule : process.argv.includes('--big') ? bigRunnerRule : estimateUpside;
    const res = Array.isArray(inp) ? inp.map(fn) : fn(inp);
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  };
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (arg) run(arg);
  else { let d = ''; process.stdin.on('data', (c) => (d += c)); process.stdin.on('end', () => run(d || '{}')); }
}
