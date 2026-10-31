/* Kyvo v8.14 (rule unchanged since v8.13) — ONE rule for "which pool is the real price of this coin" (used by every list, the coin page, the chart,
   the watchlist, Runner / Gold / New Pairs / New Tweet / Wyniki). Before v8.13 some places preferred the pump.fun curve
   pair or the first pair returned — after a migration that pair is dead (frozen price, no liquidity), and a ticker search
   could even return a copy coin. Rules:
   1) always match by the exact token address (CA) + chain, never by symbol;
   2) real pools (PumpSwap / Raydium / Meteora / PancakeSwap / Uniswap …) with ≥ $1k liquidity win: highest liquidity USD,
      tie-break 24 h volume;
   3) a launchpad curve pair (pump.fun, four.meme, Meteora DBC …, no pool liquidity) is used only while the coin has no
      real pool yet = still on the curve (DexScreener's pump.fun pair is the pump.fun curve price; pump.fun's own API
      blocks browsers);
   4) dust pools (< $1k liquidity) only when nothing else exists. */
(function () {
  'use strict';
  const CURVE = new Set(['pumpfun', 'fourmeme', 'meteoradbc', 'launchlab', 'boop', 'believe', 'moonit', 'bonk', 'letsbonk', 'raydiumlaunchlab', 'flapsh']);
  const MIN_LIQ = 1000;
  const liq = (p) => (p && p.liquidity && +p.liquidity.usd) || 0;
  const vol = (p) => (p && p.volume && +p.volume.h24) || 0;
  const lc = (s) => String(s || '').toLowerCase();
  const isCurve = (p) => !!p && CURVE.has(p.dexId) && !(liq(p) >= MIN_LIQ && !/pumpfun|fourmeme/.test(p.dexId));
  const byLiq = (a, b) => liq(b) - liq(a) || vol(b) - vol(a);
  /* choose among pairs that are ALREADY the same token (same chain + CA) */
  function choose(ps) {
    ps = (ps || []).filter((p) => p && p.baseToken);
    if (!ps.length) return null;
    const pools = ps.filter((p) => !isCurve(p) && liq(p) >= MIN_LIQ).sort(byLiq);
    const curves = ps.filter(isCurve).sort((a, b) => vol(b) - vol(a));
    if (pools.length) {
      const top = pools[0], cv = curves[0];
      // a real pool beats the curve once it carries the coin (migration seeds ≥ ~$10k, or it out-trades the curve)
      if (!cv || liq(top) >= 5000 || vol(top) >= vol(cv)) return top;
      return cv;
    }
    if (curves.length) return curves[0];
    return ps.slice().sort(byLiq)[0];
  }
  function sameToken(p, chain, addr) {
    return p && p.baseToken && (!chain || p.chainId === chain) && (!addr || lc(p.baseToken.address) === lc(addr));
  }
  /* best pair for one token (chain optional but recommended) */
  function best(pairs, chain, addr) {
    return choose((pairs || []).filter((p) => sameToken(p, chain, addr)));
  }
  /* group a DexScreener pairs array by chain:CA (base token) → best pair each. keyFn(chain, addr) builds the key. */
  function bestMap(pairs, keyFn, filter) {
    const g = {};
    for (const p of pairs || []) {
      if (!p || !p.baseToken || !p.baseToken.address) continue;
      if (filter && !filter(p)) continue;
      const k = keyFn ? keyFn(p.chainId || 'solana', p.baseToken.address) : (p.chainId || 'solana') + ':' + p.baseToken.address;
      (g[k] = g[k] || []).push(p);
    }
    const out = {};
    for (const [k, ps] of Object.entries(g)) out[k] = choose(ps);
    return out;
  }
  /* did this token leave its curve? (a curve pair exists but a real pool won) */
  function migrated(pairs, chain, addr) {
    const ps = (pairs || []).filter((p) => sameToken(p, chain, addr));
    const b = choose(ps);
    return !!(b && !isCurve(b) && ps.some(isCurve));
  }
  window.KyvoPairs = { best, bestMap, choose, migrated, isCurve, liq, MIN_LIQ, CURVE };
})();
