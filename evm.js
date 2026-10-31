/* Kyvo EVM wallets (BSC, Robinhood Chain) — public, keyless, browser-only (CORS) data.
   Only a PUBLIC 0x address is ever used. Never a private key or seed.
   BSC: ERC-20 Transfer logs (topic filter) from public RPCs that allow it, + tx/receipt for the BNB leg.
   Robinhood Chain: public Blockscout explorer API (+ public RPC for recent BNB/ETH balance deltas).
   To add another EVM chain later: add an entry to CHAINS with mode 'logs' (RPC with topic getLogs) or 'blockscout'. */
(function () {
  'use strict';
  const BIG0 = typeof BigInt === 'function' ? BigInt(0) : 0; // v8.5: no 0n literal (older Safari can't parse it)
  const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const WITHDRAWAL = '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65';
  const CHAINS = {
    bsc: {
      id: 'bsc', label: 'BSC', badge: 'BSC', native: 'BNB', pxSymbol: 'BNBUSDT', mode: 'logs',
      logRpcs: ['https://bsc.rpc.blxrbdn.com', 'https://rpc-bsc.48.club'], // allow topic-only eth_getLogs (5000 blocks)
      rpcs: ['https://bsc-dataseed.bnbchain.org', 'https://bsc.rpc.blxrbdn.com', 'https://rpc-bsc.48.club'], logRange: 5000, blockSec: 0.45, windowH: 24, maxWindowH: 168,
      wrapped: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      stables: ['0x55d398326f99059ff775485246999027b3197955', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', '0xe9e7cea3dedca5984780bafc599bd69add087d56', '0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d'],
      fourMeme: { addr: '0x5c952063c7fc8610ffdb798152d69f0b9550762b', sale: '0x0a5575b3648bae2210cee56bf33254cc1ddfbc7bf637c0af2ac18b14fb1bae19' },
      explorer: 'https://bscscan.com', maxTx: 160,
      sourceNote: 'publiczne RPC BSC (logi transferów ERC-20)',
    },
    robinhood: {
      id: 'robinhood', label: 'Robinhood Chain', badge: 'RH', native: 'ETH', pxSymbol: 'ETHUSDT', mode: 'blockscout',
      blockscout: 'https://robinhoodchain.blockscout.com', rpcs: ['https://rpc.mainnet.chain.robinhood.com'],
      wrapped: '0x0bd7d308f8e1639fab988df18a8011f41eacad73',
      stables: ['0x5fc5360d0400a0fd4f2af552add042d716f1d168'],
      explorer: 'https://robinhoodchain.blockscout.com', maxTx: 150,
      sourceNote: 'publiczny explorer Robinhood Chain (Blockscout, ostatnie ~150 transferów)',
    },
  };
  const isEvmAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || '');
  const lc = (s) => String(s || '').toLowerCase();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad32 = (a) => '0x' + '0'.repeat(24) + lc(a).slice(2);
  const big = (h) => { try { return BigInt(h && h !== '0x' ? h : '0x0'); } catch (e) { return BIG0; } };
  const toNum = (raw, dec) => { // BigInt -> float with decimals, precision-safe enough for UI
    const neg = raw < BIG0; let v = neg ? -raw : raw;
    const d = BigInt(10) ** BigInt(dec || 0);
    const n = Number(v / d) + Number(v % d) / Number(d);
    return neg ? -n : n;
  };

  /* ---------- JSON-RPC with provider fallback + batching ---------- */
  async function rpc(ch, body, tries, urls) {
    tries = tries || 3;
    urls = urls || ch.rpcs;
    let lastErr;
    for (let i = 0; i < tries; i++) {
      for (const url of urls) {
        try {
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (!r.ok) throw new Error('http ' + r.status);
          const d = await r.json();
          if (Array.isArray(body)) {
            if (!Array.isArray(d)) throw new Error('batch');
            const byId = {}; for (const x of d) byId[x.id] = x;
            if (body.some((q) => byId[q.id] && byId[q.id].error && /limit|rate|busy|exceed/i.test(byId[q.id].error.message || ''))) throw new Error('busy');
            return body.map((q) => byId[q.id] || { error: { message: 'missing' } });
          }
          if (d.error) { if (/limit|rate|busy/i.test(d.error.message || '')) throw new Error('busy'); return d; }
          return d;
        } catch (e) { lastErr = e; }
      }
      await sleep(800 * (i + 1) + Math.random() * 300);
    }
    throw lastErr || new Error('rpc');
  }
  let rid = 1;
  const q = (method, params) => ({ jsonrpc: '2.0', id: rid++, method, params });
  async function parallel(ch, calls, conc, urls, onDone) {
    const out = new Array(calls.length);
    let next = 0, done = 0;
    const worker = async () => {
      while (next < calls.length) {
        const i = next++;
        try { out[i] = await rpc(ch, calls[i], 3, urls); } catch (e) { out[i] = { error: { message: String(e && e.message) } }; }
        done++; onDone && onDone(done, calls.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(conc, calls.length) }, worker));
    return out;
  }
  async function batched(ch, calls, size, conc) {
    size = size || 20; conc = conc || 3;
    const out = new Array(calls.length);
    const groups = [];
    for (let i = 0; i < calls.length; i += size) groups.push([i, calls.slice(i, i + size)]);
    const work = groups.slice();
    const worker = async () => {
      while (work.length) {
        const [i0, g] = work.shift();
        const res = await rpc(ch, g);
        res.forEach((r, j) => (out[i0 + j] = r));
      }
    };
    await Promise.all(Array.from({ length: Math.min(conc, groups.length) }, worker));
    return out;
  }

  /* ---------- cache ---------- */
  const CK = (c, a) => 'kyvo_pf_evm_' + c + '_' + lc(a);
  function load(c, a) { try { return JSON.parse(localStorage.getItem(CK(c, a)) || 'null') || null; } catch (e) { return null; } }
  function save(c, a, v) {
    try { localStorage.setItem(CK(c, a), JSON.stringify(v)); }
    catch (e) { // quota: keep newest half
      const hs = Object.keys(v.tx).sort((x, y) => (v.tx[y].t || 0) - (v.tx[x].t || 0));
      for (const h of hs.slice(Math.floor(hs.length / 2))) delete v.tx[h];
      try { localStorage.setItem(CK(c, a), JSON.stringify(v)); } catch (e2) {}
    }
  }
  const fresh = () => ({ tx: {}, dec: {}, toBlock: 0, fromBlock: 0, updated: 0, oldest: null, holdings: null, nativeBal: null, notes: [] });

  function addDelta(tx, token, raw) {
    tx.d = tx.d || {};
    tx.d[token] = (big(tx.d[token] || '0x0') + raw).toString();
  }

  /* ---------- BSC-style: Transfer logs via topic-filtered getLogs ---------- */
  async function syncLogs(ch, addr, cache, onProgress, opts) {
    opts = opts || {};
    const me = lc(addr);
    const bnRes = await rpc(ch, q('eth_blockNumber', []));
    const bn = Number(big(bnRes.result));
    const span = Math.round((ch.windowH * 3600) / ch.blockSec);
    const maxSpan = Math.round(((ch.maxWindowH || ch.windowH) * 3600) / ch.blockSec);
    let ranges = [];
    if (opts.older && cache.fromBlock) { // extend backwards by one window
      const lo = Math.max(cache.fromBlock - span, bn - maxSpan);
      if (lo < cache.fromBlock) ranges.push([lo, cache.fromBlock - 1, 'old']);
    } else {
      let from = cache.toBlock ? cache.toBlock + 1 : bn - span;
      if (from < bn - span && !cache.toBlock) from = bn - span;
      if (from < bn - maxSpan) from = bn - maxSpan;
      ranges.push([from, bn, 'new']);
      if (!cache.fromBlock) cache.fromBlock = from;
    }
    const calls = [];
    for (const [a, z] of ranges) for (let s = a; s <= z; s += ch.logRange) {
      const e = Math.min(z, s + ch.logRange - 1);
      calls.push(q('eth_getLogs', [{ fromBlock: '0x' + s.toString(16), toBlock: '0x' + e.toString(16), topics: [TRANSFER, pad32(me)] }]));
      calls.push(q('eth_getLogs', [{ fromBlock: '0x' + s.toString(16), toBlock: '0x' + e.toString(16), topics: [TRANSFER, null, pad32(me)] }]));
    }
    onProgress && onProgress('logi', 0, calls.length);
    const res = await parallel(ch, calls, 6, ch.logRpcs, (d, n) => onProgress && onProgress('logi', d, n));
    let failed = 0;
    const seen = new Set();
    for (const r of res) {
      if (!r || r.error || !Array.isArray(r.result)) { failed++; continue; }
      for (const L of r.result) {
        if (!L.topics || L.topics.length !== 3) continue; // ERC-721 has 4 topics
        const k = L.transactionHash + ':' + L.logIndex;
        if (seen.has(k)) continue; seen.add(k);
        const h = L.transactionHash;
        const tx = cache.tx[h] || (cache.tx[h] = { b: Number(big(L.blockNumber)) });
        if (tx.e) continue; // already enriched in an earlier sync (logs identical)
        if (tx.lk && tx.lk.includes(k)) continue;
        (tx.lk = tx.lk || []).push(k);
        const tok = lc(L.address), raw = big(L.data);
        const fromMe = lc('0x' + L.topics[1].slice(26)) === me, toMe = lc('0x' + L.topics[2].slice(26)) === me;
        if (fromMe && !toMe) addDelta(tx, tok, -raw);
        else if (toMe && !fromMe) addDelta(tx, tok, raw);
      }
    }
    if (failed && failed === res.length) throw new Error('logs');
    if (failed) cache.notes = ['Część zakresu bloków nie odpowiedziała — Odśwież uzupełni.'];
    else if (opts.older) cache.fromBlock = ranges.length ? ranges[0][0] : cache.fromBlock;
    else cache.toBlock = bn;
    cache.canOlder = cache.fromBlock > bn - maxSpan + ch.logRange;
    // decimals for new tokens
    const toks = new Set();
    for (const tx of Object.values(cache.tx)) for (const t of Object.keys(tx.d || {})) if (cache.dec[t] == null) toks.add(t);
    const tl = [...toks];
    if (tl.length) {
      const dr = await batched(ch, tl.map((t) => q('eth_call', [{ to: t, data: '0x313ce567' }, 'latest'])), 25, 2);
      tl.forEach((t, i) => { const v = dr[i] && dr[i].result; const n = v && v !== '0x' ? Number(big(v)) : 18; cache.dec[t] = n > 0 && n <= 36 ? n : 18; });
    }
    // enrich newest unenriched txs: tx (from/value), receipt (unwrap / four.meme), block time
    const need = Object.entries(cache.tx).filter(([, t]) => !t.e).sort((a, b) => b[1].b - a[1].b).slice(0, ch.maxTx);
    onProgress && onProgress('tx', 0, need.length);
    const ec = [];
    for (const [h, t] of need) { ec.push(q('eth_getTransactionByHash', [h])); ec.push(q('eth_getTransactionReceipt', [h])); }
    const blocks = [...new Set(need.map(([, t]) => t.b))];
    const bc = blocks.map((b) => q('eth_getBlockByNumber', ['0x' + b.toString(16), false]));
    const [er, br] = await Promise.all([batched(ch, ec, 20, 4), batched(ch, bc, 25, 2)]);
    const bts = {}; blocks.forEach((b, i) => { const r = br[i] && br[i].result; if (r) bts[b] = Number(big(r.timestamp)); });
    need.forEach(([h, t], i) => {
      const tx = er[2 * i] && er[2 * i].result, rc = er[2 * i + 1] && er[2 * i + 1].result;
      if (!tx || !rc) return;
      t.t = bts[t.b] || null;
      t.from = lc(tx.from);
      t.ok = rc.status === '0x1';
      t.v = t.from === me ? big(tx.value).toString() : '0';
      let wd = BIG0, fm = BIG0;
      for (const L of rc.logs || []) {
        const a = lc(L.address), t0 = L.topics && L.topics[0];
        if (a === ch.wrapped && t0 === WITHDRAWAL) wd += big(L.data);
        if (ch.fourMeme && a === ch.fourMeme.addr && t0 === ch.fourMeme.sale) {
          const w = (L.data || '').slice(2).match(/.{64}/g) || [];
          if (w.length >= 6 && lc('0x' + w[1].slice(24)) === me) fm += big('0x' + w[4]) - big('0x' + w[5]);
        }
      }
      t.wd = wd.toString(); t.fm = fm.toString();
      t.e = 1; delete t.lk;
    });
    onProgress && onProgress('tx', need.length, need.length);
    // holdings: balances of tokens seen in the window + native
    const all = new Set(Object.values(cache.tx).flatMap((t) => Object.keys(t.d || {})));
    const hl = [...all];
    const calls2 = hl.map((t) => q('eth_call', [{ to: t, data: '0x70a08231' + pad32(me).slice(2) }, 'latest']));
    calls2.push(q('eth_getBalance', [me, 'latest']));
    const hr = await batched(ch, calls2, 25, 2);
    cache.holdings = hl.map((t, i) => ({ mint: t, raw: (hr[i] && hr[i].result) || '0x0', dec: cache.dec[t] || 18 }))
      .filter((h) => big(h.raw) > BIG0).map((h) => ({ mint: h.mint, tok: toNum(big(h.raw), h.dec) }));
    const nb = hr[hl.length] && hr[hl.length].result;
    cache.nativeBal = nb ? toNum(big(nb), 18) : null;
    cache.windowNote = `ok. ostatnie ${Math.max(1, Math.round(((bn - cache.fromBlock) * ch.blockSec) / 3600))}h`;
    const ts = Object.values(cache.tx).map((t) => t.t).filter(Boolean);
    cache.oldest = ts.length ? Math.min(...ts) : Math.floor(Date.now() / 1000 - ch.windowH * 3600);
  }

  /* ---------- Blockscout explorer (Robinhood Chain) ---------- */
  async function bsGet(ch, path, tries) {
    tries = tries || 4;
    let last;
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(ch.blockscout + path);
        if (r.ok) return await r.json();
        last = new Error('http ' + r.status);
      } catch (e) { last = e; }
      await sleep(1200 * (i + 1));
    }
    throw last;
  }
  async function syncBlockscout(ch, addr, cache, onProgress) {
    const me = lc(addr);
    const A = encodeURIComponent(addr);
    onProgress && onProgress('explorer', 0, 3);
    const [tt, tl, il] = await Promise.all([
      bsGet(ch, `/api?module=account&action=tokentx&address=${A}&sort=desc&page=1&offset=${ch.maxTx}`),
      bsGet(ch, `/api?module=account&action=txlist&address=${A}&sort=desc&page=1&offset=${ch.maxTx}`).catch(() => null),
      bsGet(ch, `/api?module=account&action=txlistinternal&address=${A}&sort=desc&page=1&offset=${ch.maxTx}`).catch(() => null),
    ]);
    onProgress && onProgress('explorer', 3, 3);
    const rows = Array.isArray(tt && tt.result) ? tt.result : [];
    const txs = {};
    for (const x of (tl && Array.isArray(tl.result) ? tl.result : [])) txs[lc(x.hash)] = x;
    const internal = {};
    let internalLag = !(il && Array.isArray(il.result)) || (il && il.status === '2');
    for (const x of (il && Array.isArray(il.result) ? il.result : [])) {
      const h = lc(x.hash || x.transactionHash);
      const v = big('0x' + BigInt(x.value || '0').toString(16));
      internal[h] = (internal[h] || BIG0) + (lc(x.to) === me ? v : lc(x.from) === me ? -v : BIG0);
    }
    const seen = new Set();
    const touched = new Set();
    for (const x of rows) {
      const h = lc(x.hash);
      const k = h + ':' + (x.logIndex || '') + ':' + lc(x.contractAddress) + ':' + x.value + ':' + lc(x.from) + lc(x.to);
      if (seen.has(k)) continue; seen.add(k);
      if (cache.tx[h] && cache.tx[h].e && !touched.has(h)) continue; // known tx
      if (!touched.has(h)) { cache.tx[h] = { b: Number(x.blockNumber), t: Number(x.timeStamp), d: {} }; touched.add(h); }
      const t = cache.tx[h];
      const tok = lc(x.contractAddress);
      cache.dec[tok] = Number(x.tokenDecimal || 18);
      const raw = BigInt(x.value || '0');
      const fromMe = lc(x.from) === me, toMe = lc(x.to) === me;
      if (fromMe && !toMe) addDelta(t, tok, -raw); else if (toMe && !fromMe) addDelta(t, tok, raw);
    }
    const needBal = [];
    for (const h of touched) {
      const t = cache.tx[h], tx = txs[h];
      t.from = tx ? lc(tx.from) : null;
      t.ok = tx ? tx.isError !== '1' : true;
      t.v = tx && lc(tx.from) === me ? BigInt(tx.value || '0').toString() : '0';
      t.fee = tx && lc(tx.from) === me ? (BigInt(tx.gasUsed || '0') * BigInt(tx.gasPrice || '0')).toString() : '0';
      t.in = internal[h] != null ? internal[h].toString() : null;
      t.e = 1;
      const toks = Object.entries(t.d || {}).filter(([k]) => k !== ch.wrapped && !ch.stables.includes(k));
      const quoteSeen = Object.keys(t.d || {}).some((k) => k === ch.wrapped || ch.stables.includes(k));
      if (toks.length === 1 && BigInt(toks[0][1]) < BIG0 && !quoteSeen && t.in == null) needBal.push(h); // sell for native ETH, no internal tx indexed
    }
    // native ETH received in a sell: balance(b) - balance(b-1) (+fee) from the public RPC (recent blocks only)
    if (needBal.length) {
      const calls = [];
      for (const h of needBal) { const b = cache.tx[h].b; calls.push(q('eth_getBalance', [me, '0x' + (b - 1).toString(16)])); calls.push(q('eth_getBalance', [me, '0x' + b.toString(16)])); }
      try {
        const r = await batched(ch, calls, 20, 2);
        needBal.forEach((h, i) => {
          const a = r[2 * i] && r[2 * i].result, b = r[2 * i + 1] && r[2 * i + 1].result;
          if (a && b) cache.tx[h].in = (big(b) - big(a) + BigInt(cache.tx[h].fee || '0') + BigInt(cache.tx[h].v || '0')).toString();
        });
      } catch (e) { /* old blocks: state not available on the public node */ }
    }
    cache.internalLag = internalLag;
    // holdings (complete list from the explorer) + native balance
    try {
      const [toks, info] = await Promise.all([bsGet(ch, `/api/v2/addresses/${A}/tokens?type=ERC-20`, 3), bsGet(ch, `/api/v2/addresses/${A}`, 3)]);
      cache.holdings = (toks.items || []).map((i) => ({ mint: lc(i.token && i.token.address_hash), tok: toNum(BigInt(i.value || '0'), Number((i.token && i.token.decimals) || 18)), symbol: i.token && i.token.symbol, name: i.token && i.token.name, image: i.token && i.token.icon_url, px: i.token && i.token.exchange_rate ? +i.token.exchange_rate : null }))
        .filter((h) => h.mint && h.tok > 0);
      cache.nativeBal = info && info.coin_balance != null ? toNum(BigInt(info.coin_balance), 18) : null;
      cache.holdingsNext = !!(toks.next_page_params);
    } catch (e) { cache.notes = ['Explorer nie zwrócił listy tokenów — spróbuj Odśwież.']; }
    const ts = Object.values(cache.tx).map((t) => t.t).filter(Boolean);
    cache.oldest = ts.length ? Math.min(...ts) : null;
    cache.windowNote = `ostatnie ${rows.length} transferów tokenów`;
  }

  const syncing = {};
  async function sync(chain, addr, onProgress, opts) {
    const ch = CHAINS[chain];
    if (!ch || !isEvmAddr(addr)) throw new Error('bad');
    const key = chain + ':' + lc(addr);
    if (syncing[key]) return syncing[key];
    opts = opts || {};
    syncing[key] = (async () => {
      const cache = load(chain, addr) || fresh();
      cache.notes = [];
      if (ch.mode === 'logs') await syncLogs(ch, addr, cache, onProgress, opts);
      else await syncBlockscout(ch, addr, cache, onProgress);
      cache.updated = Date.now();
      save(chain, addr, cache);
      return cache;
    })();
    try { return await syncing[key]; } finally { delete syncing[key]; }
  }

  /* events in the same shape as the Solana engine: {sig, t, mint, tok, sol (native incl. wrapped), usd} */
  function events(chain, addr) {
    const ch = CHAINS[chain]; const c = load(chain, addr);
    if (!ch || !c) return { events: [], cache: c };
    const me = lc(addr);
    const ev = [];
    let unknownSells = 0;
    for (const [h, t] of Object.entries(c.tx)) {
      if (!t.e || t.ok === false || !t.t) continue;
      const deltas = {};
      for (const [tok, raw] of Object.entries(t.d || {})) { const v = toNum(BigInt(raw), c.dec[tok] == null ? 18 : c.dec[tok]); if (Math.abs(v) > 0) deltas[tok] = v; }
      let native = -toNum(BigInt(t.v || '0'), 18);
      if (chain === 'robinhood' && t.in != null) native += toNum(BigInt(t.in), 18);
      let qn = deltas[ch.wrapped] || 0; delete deltas[ch.wrapped];
      let usd = 0; for (const s of ch.stables) if (deltas[s] != null) { usd += deltas[s]; delete deltas[s]; }
      const ms = Object.keys(deltas);
      if (!ms.length) continue;
      if (ms.length > 1) { for (const m of ms) ev.push({ sig: h, t: t.t, mint: m, tok: deltas[m], sol: 0, usd: 0, multi: 1 }); continue; }
      const tok = deltas[ms[0]];
      if (tok < 0 && native <= 0 && qn <= 0 && usd <= 0 && t.from === me) {
        const wd = toNum(BigInt(t.wd || '0'), 18), fm = toNum(BigInt(t.fm || '0'), 18);
        if (wd > 0) native += wd; else if (fm > 0) native += fm;
      }
      let sol = native + qn;
      if (Math.abs(sol) < 1e-7) sol = 0;
      if (tok < 0 && sol <= 0 && usd <= 0) unknownSells++;
      ev.push({ sig: h, t: t.t, mint: ms[0], tok, sol, usd });
    }
    ev.sort((a, b) => a.t - b.t);
    return { events: ev, cache: c, unknownSells };
  }

  /* native coin USD history (Binance public klines, hourly) */
  const pxCache = {};
  async function nativePx(chain) {
    const ch = CHAINS[chain];
    if (pxCache[chain]) return pxCache[chain];
    const out = { ts: [], px: [], cur: null, hist: false };
    try {
      const rows = await (await fetch('https://data-api.binance.vision/api/v3/klines?symbol=' + ch.pxSymbol + '&interval=1h&limit=1000')).json();
      for (const k of rows) { out.ts.push(Math.floor(k[0] / 1000)); out.px.push((+k[1] + +k[4]) / 2); }
      out.hist = out.ts.length > 0; out.cur = out.px[out.px.length - 1];
    } catch (e) {}
    if (!out.cur) {
      try {
        const d = await (await fetch('https://api.dexscreener.com/latest/dex/tokens/' + ch.wrapped)).json();
        const p = (d.pairs || []).find((x) => x.chainId === chain && x.priceUsd && lc(x.baseToken.address) === ch.wrapped);
        out.cur = p ? +p.priceUsd : null;
      } catch (e) {}
    }
    pxCache[chain] = out;
    return out;
  }

  const txUrl = (chain, h) => (CHAINS[chain] ? CHAINS[chain].explorer + '/tx/' + h : '#');
  const addrUrl = (chain, a) => (CHAINS[chain] ? CHAINS[chain].explorer + '/address/' + a : '#');
  window.KyvoEVM = { CHAINS, isEvmAddr, sync, events, load, nativePx, txUrl, addrUrl, isQuote: (chain, t) => { const ch = CHAINS[chain]; return !!ch && (lc(t) === ch.wrapped || ch.stables.includes(lc(t))); } };
})();
