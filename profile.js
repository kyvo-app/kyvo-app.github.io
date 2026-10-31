/* Kyvo profiles: shared FOMO-style profile layout (original design) for Ranking traders and the user's own "Profil".
   Own profile = public Solana address only (localStorage), swaps fetched client-side from public RPC,
   the same FIFO PnL engine as tools/build_snapshots.py. Not financial advice. */
(function () {
  const T = (x) => (window.KyvoI18n ? window.KyvoI18n.t(x) : x);
  'use strict';
  const MAINNET = 'https://api.mainnet-beta.solana.com';
  const RECENT = 'https://solana-rpc.publicnode.com';
  const WSOL = 'So11111111111111111111111111111111111111112';
  const USD_MINTS = new Set(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11MCCe8BenwNYB', 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB']);
  const MIN_SOL_LEG = 0.005;
  const OWN_KEY = 'kyvo_profile_v1'; // {wallets:[{chain,address}], nick, avatar:{type:'ghost'|'emoji'|'photo', v}} (v7.1 had a single {address})
  const WCHAINS = [
    { id: 'solana', label: 'Solana', badge: 'SOL', explorer: (a) => 'https://solscan.io/account/' + a, tx: (h) => 'https://solscan.io/tx/' + h, exName: 'Solscan' },
    { id: 'bsc', label: 'BSC', badge: 'BSC', explorer: (a) => 'https://bscscan.com/address/' + a, tx: (h) => 'https://bscscan.com/tx/' + h, exName: 'BscScan' },
    { id: 'robinhood', label: 'Robinhood Chain', badge: 'RH', explorer: (a) => 'https://robinhoodchain.blockscout.com/address/' + a, tx: (h) => 'https://robinhoodchain.blockscout.com/tx/' + h, exName: 'Explorer' },
  ];
  const WC = Object.fromEntries(WCHAINS.map((c) => [c.id, c]));
  const MAX_WALLETS = 8;
  const CACHE_PREFIX = 'kyvo_pf_tx_';
  const MAX_SIGS = 150;
  const GHOSTS = [
    ['#8B5CF6', '#22D3EE'], ['#34E07A', '#0EA5E9'], ['#FF5468', '#F59E0B'], ['#F472B6', '#8B5CF6'], ['#F5B83C', '#EF4444'], ['#64748B', '#0F172A'],
  ];
  const EMOJI = ['👻', '🐸', '🦍', '🐳', '🚀', '💎', '🔥', '🤑'];
  let H = null; // helpers from app.js

  /* ---------------- storage ---------------- */
  function own() {
    let o;
    try { o = JSON.parse(localStorage.getItem(OWN_KEY) || 'null') || {}; } catch (e) { o = {}; }
    if (!Array.isArray(o.wallets)) o.wallets = isAddr(o.address) ? [{ chain: 'solana', address: o.address }] : [];
    o.wallets = o.wallets.filter((w) => w && WC[w.chain] && (w.chain === 'solana' ? isAddr(w.address) : isEvm(w.address)));
    return o;
  }
  function isEvm(a) { return /^0x[0-9a-fA-F]{40}$/.test(a || ''); }
  function saveOwn(o) { try { localStorage.setItem(OWN_KEY, JSON.stringify(o)); } catch (e) { H.toast('Brak miejsca w pamięci przeglądarki'); } }
  function isAddr(a) { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a || ''); }

  /* ---------------- RPC (gentle, cached) ---------------- */
  let lastMain = 0;
  async function rpc(url, method, params, tries) {
    tries = tries || 5;
    let delay = 1200;
    for (let i = 0; i < tries; i++) {
      if (url === RECENT) {
        const w = Math.max(0, lastMain + 120 - Date.now());
        lastMain = Date.now() + w;
        if (w) await new Promise((r) => setTimeout(r, w));
      }
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
        if (r.status === 429 || r.status === 403 || r.status >= 500) throw new Error('busy');
        const d = await r.json();
        if (d.error) {
          if (d.error.code === 429 || d.error.code === -32429 || d.error.code === -32005) throw new Error('busy');
          throw new Error('rpc');
        }
        return d.result;
      } catch (e) {
        if (e.message === 'rpc' || i === tries - 1) throw e;
        await new Promise((r) => setTimeout(r, delay + Math.random() * 400));
        delay = Math.min(delay * 2, 12000);
      }
    }
  }
  function parseLegs(wallet, tx) {
    const meta = tx && tx.meta;
    if (!meta || meta.err) return [];
    const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey));
    const idx = keys.indexOf(wallet);
    if (idx < 0) return [];
    let native = (meta.postBalances[idx] - meta.preBalances[idx]) / 1e9;
    if (idx === 0) native += (meta.fee || 0) / 1e9;
    const bal = (rows) => {
      const o = {};
      for (const b of rows || []) if (b.owner === wallet) o[b.mint] = (o[b.mint] || 0) + Number(b.uiTokenAmount.uiAmount || 0);
      return o;
    };
    const pre = bal(meta.preTokenBalances), post = bal(meta.postTokenBalances);
    const deltas = {};
    for (const m of new Set([...Object.keys(pre), ...Object.keys(post)])) {
      const d = (post[m] || 0) - (pre[m] || 0);
      if (Math.abs(d) > 1e-12) deltas[m] = d;
    }
    let sol = native + (deltas[WSOL] || 0);
    delete deltas[WSOL];
    let usd = 0;
    for (const m of Object.keys(deltas)) if (USD_MINTS.has(m)) { usd += deltas[m]; delete deltas[m]; }
    if (Math.abs(sol) < MIN_SOL_LEG) sol = 0;
    const ms = Object.keys(deltas);
    if (!ms.length) return [];
    if (ms.length === 1) return [{ mint: ms[0], tok: deltas[ms[0]], sol, usd }];
    return ms.map((m) => ({ mint: m, tok: deltas[m], sol: 0, usd: 0, multi: 1 }));
  }

  /* SOL/USD hourly history (Binance public klines), current price fallback */
  let solPx = null;
  async function loadSolPx() {
    if (solPx) return solPx;
    const out = { ts: [], px: [], cur: null, hist: false };
    try {
      const r = await fetch('https://data-api.binance.vision/api/v3/klines?symbol=SOLUSDT&interval=1h&limit=1000');
      const rows = await r.json();
      for (const k of rows) { out.ts.push(Math.floor(k[0] / 1000)); out.px.push((+k[1] + +k[4]) / 2); }
      out.hist = out.ts.length > 0;
      out.cur = out.px[out.px.length - 1];
    } catch (e) { /* fall back below */ }
    if (!out.cur) {
      try {
        const d = await (await fetch('https://api.dexscreener.com/latest/dex/tokens/' + WSOL)).json();
        const p = window.KyvoPairs.best(d.pairs || [], 'solana', WSOL); // v8.13: SOL as the BASE token (a SOL-quoted pair's priceUsd is the other coin)
        out.cur = p ? +p.priceUsd : null;
      } catch (e) {}
    }
    solPx = out;
    return out;
  }
  function pxAt(sp, t) {
    if (!sp.ts.length || !t) return sp.cur;
    let lo = 0, hi = sp.ts.length - 1;
    if (t < sp.ts[0]) return sp.px[0];
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sp.ts[mid] <= t) lo = mid; else hi = mid - 1; }
    return sp.px[lo];
  }

  /* FIFO engine (same rules as the snapshot builder) */
  function buildModel(events, sp, nowTs) {
    const lots = {};
    const closed = [];
    const activity = [];
    let unmatched = 0;
    const legUsd = (e) => { const v = Math.abs(e.sol) * (pxAt(sp, e.t) || 0) + Math.abs(e.usd); return v > 0 ? v : null; };
    for (const e of events) {
      if (e.multi) continue;
      const isBuy = e.tok > 0 && (e.sol < 0 || e.usd < 0);
      const isSell = e.tok < 0 && (e.sol > 0 || e.usd > 0);
      if (isBuy) {
        const v = legUsd(e);
        if (v == null) continue;
        (lots[e.mint] = lots[e.mint] || []).push([e.tok, v]);
        activity.push({ side: 'buy', mint: e.mint, t: e.t, usd: v, sig: e.sig });
      } else if (isSell) {
        const v = legUsd(e);
        if (v == null) continue;
        let need = -e.tok, cost = 0, matched = 0;
        const q = lots[e.mint] || [];
        while (need > 1e-12 && q.length) {
          const lt = q[0];
          const take = Math.min(need, lt[0]);
          const c = lt[1] * (take / lt[0]);
          cost += c; lt[1] -= c; lt[0] -= take; need -= take; matched += take;
          if (lt[0] <= 1e-12) q.shift();
        }
        const share = matched / -e.tok;
        if (matched <= 0 || share < 0.5) { unmatched++; activity.push({ side: 'sell', mint: e.mint, t: e.t, usd: v, sig: e.sig }); continue; }
        closed.push({ t: e.t, p: v * share - cost, m: e.mint, u: v * share });
        activity.push({ side: 'sell', mint: e.mint, t: e.t, usd: v, pnl_usd: v * share - cost, sig: e.sig });
      } else if (e.tok < 0) {
        let need = -e.tok;
        const q = lots[e.mint] || [];
        while (need > 1e-12 && q.length) {
          const lt = q[0];
          const take = Math.min(need, lt[0]);
          lt[1] -= lt[1] * (take / lt[0]); lt[0] -= take; need -= take;
          if (lt[0] <= 1e-12) q.shift();
        }
      }
    }
    const positions = [];
    for (const [m, q] of Object.entries(lots)) {
      const tok = q.reduce((a, l) => a + l[0], 0), cost = q.reduce((a, l) => a + l[1], 0);
      if (tok > 1e-9 && cost > 0.5) positions.push({ mint: m, tok, cost_usd: cost });
    }
    positions.sort((a, b) => b.cost_usd - a.cost_usd);
    activity.sort((a, b) => (b.t || 0) - (a.t || 0));
    const vol = {};
    for (const [k, d] of [['1d', 1], ['7d', 7], ['30d', 30]]) {
      vol[k] = activity.filter((a) => a.t && a.t >= nowTs - d * 86400).reduce((s, a) => s + (a.usd || 0), 0);
    }
    vol.all = activity.reduce((s, a) => s + (a.usd || 0), 0);
    const oldest = events.length ? events[0].t : null;
    return { closed, positions: positions.slice(0, 25), activity: activity.slice(0, 40), volume_usd: vol, unmatched, oldest, priced: sp.hist ? 'hist' : 'current' };
  }

  function txCache(addr) { try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + addr) || 'null') || { sigs: [], legs: {} }; } catch (e) { return { sigs: [], legs: {} }; } }
  function saveTxCache(addr, c) {
    try { localStorage.setItem(CACHE_PREFIX + addr, JSON.stringify(c)); }
    catch (e) { // quota: drop oldest half
      c.sigs = c.sigs.slice(0, Math.floor(c.sigs.length / 2));
      const keep = new Set(c.sigs.map((s) => s[0]));
      c.legs = Object.fromEntries(Object.entries(c.legs).filter(([k]) => keep.has(k)));
      try { localStorage.setItem(CACHE_PREFIX + addr, JSON.stringify(c)); } catch (e2) {}
    }
  }

  const syncing = {};
  async function syncWallet(addr, onProgress) {
    if (syncing[addr]) return syncing[addr];
    syncing[addr] = (async () => {
      const c = txCache(addr);
      const head = c.sigs[0] && c.sigs[0][0];
      const opts = { limit: MAX_SIGS };
      if (head) opts.until = head;
      // publicnode first (fast, CORS *), mainnet fallback
      // Browser: api.mainnet-beta answers 403 to any request with an Origin header, so only publicnode is usable here
      const page = (await rpc(RECENT, 'getSignaturesForAddress', [addr, opts], 4)) || [];
      const fresh = page.map((s) => [s.signature, s.blockTime, s.err ? 1 : 0]);
      c.sigs = fresh.concat(head && fresh.length < MAX_SIGS ? c.sigs : []).slice(0, MAX_SIGS * 2);
      c.na = c.na || {};
      const need = c.sigs.filter((s) => !s[2] && !(s[0] in c.legs) && !c.na[s[0]]).slice(0, MAX_SIGS);
      let done = 0, lastSave = Date.now();
      const now = Date.now() / 1000;
      const work = need.slice();
      const worker = async () => {
        while (work.length) {
          const [sig, bt] = work.shift();
          const params = [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 1, commitment: 'confirmed' }];
          let tx = null;
          try {
            tx = await rpc(RECENT, 'getTransaction', params, 3);
            if (tx) c.legs[sig] = parseLegs(addr, tx);
            else c.na[sig] = 1; // older than the public node's ~24h window
          } catch (e) { /* keep going; retried on next refresh */ }
          done++;
          onProgress && onProgress(done, need.length);
          if (Date.now() - lastSave > 4000) { lastSave = Date.now(); saveTxCache(addr, c); }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      c.updated = Date.now();
      saveTxCache(addr, c);
      return c;
    })();
    try { return await syncing[addr]; } finally { delete syncing[addr]; }
  }
  async function modelFromCache(addr) {
    const c = txCache(addr);
    const sp = await loadSolPx();
    const bt = Object.fromEntries(c.sigs.map((s) => [s[0], s[1]]));
    const ev = [];
    for (const [sig, legs] of Object.entries(c.legs)) for (const L of legs || []) if (bt[sig]) ev.push(Object.assign({}, L, { sig, t: bt[sig] }));
    ev.sort((a, b) => a.t - b.t);
    const m = buildModel(ev, sp, Math.floor(Date.now() / 1000));
    m.sigs = c.sigs.length;
    m.updated = c.updated || null;
    m.missing = c.sigs.filter((s) => !s[2] && !(s[0] in c.legs) && !(c.na || {})[s[0]]).length;
    m.na = Object.keys(c.na || {}).filter((k) => bt[k]).length;
    return m;
  }

  /* ---------------- token meta + prices (DexScreener, batched) ---------------- */
  const tokMeta = {}; // chain:address -> {symbol,name,price,image}
  const mk = (chain, m) => (chain || 'solana') + ':' + (chain && chain !== 'solana' ? String(m).toLowerCase() : m);
  async function loadMeta(items) {
    const by = {};
    for (const it of items) {
      if (!it || !it.mint || it.native) continue;
      const k = mk(it.chain, it.mint);
      if (!tokMeta[k]) (by[it.chain || 'solana'] = by[it.chain || 'solana'] || new Set()).add(it.chain && it.chain !== 'solana' ? String(it.mint).toLowerCase() : it.mint);
    }
    for (const [chain, set] of Object.entries(by)) {
      const need = [...set];
      for (let i = 0; i < need.length; i += 30) {
        try {
          const d = await (await fetch('https://api.dexscreener.com/latest/dex/tokens/' + need.slice(i, i + 30).join(','))).json();
          // v8.13: main pool per token (pairs.js) — a coin still on its pump.fun curve has no pool liquidity but a real price
          for (const [k, p] of Object.entries(window.KyvoPairs.bestMap(d.pairs || [], mk, (x) => x.chainId === chain))) {
            if (!p) continue;
            const liq = window.KyvoPairs.liq(p), curve = window.KyvoPairs.isCurve(p);
            tokMeta[k] = { symbol: p.baseToken.symbol, name: p.baseToken.name, price: p.priceUsd && (liq >= 500 || curve) ? +p.priceUsd : null, image: p.info && p.info.imageUrl, _liq: liq };
          }
        } catch (e) {}
        for (const m of need.slice(i, i + 30)) if (!tokMeta[mk(chain, m)]) tokMeta[mk(chain, m)] = { symbol: null, name: null, price: null };
      }
    }
  }

  /* ---------------- shared layout ---------------- */
  const PERIODS = [['1d', '24h', 1], ['7d', '7 dni', 7], ['30d', '30 dni', 30], ['all', 'Całość', null]];
  function periodStats(model, per) {
    const now = Date.now() / 1000;
    const d = PERIODS.find((x) => x[0] === per)[2];
    const rows = model.closed.filter((c) => c.t && (d == null || c.t >= now - d * 86400));
    const wins = rows.filter((c) => c.p > 0).length;
    const best = rows.reduce((b, c) => (!b || c.p > b.p ? c : b), null);
    return {
      pnl: rows.length ? rows.reduce((s, c) => s + c.p, 0) : null,
      trades: rows.length, wins, win_rate: rows.length ? wins / rows.length : null, best, rows,
      volume: model.volume_usd ? model.volume_usd[per] != null ? model.volume_usd[per] : model.volume_usd['30d'] : null,
    };
  }
  function avatarSpec(av, size, fallbackLetter) {
    size = size || 56;
    if (av && av.type === 'photo' && av.v) return `<img class="pf-av" src="${H.esc(av.v)}" style="width:${size}px;height:${size}px" alt="">`;
    if (av && av.type === 'url' && av.v) return `<img class="pf-av" src="${H.esc(av.v)}" style="width:${size}px;height:${size}px" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'pf-av pf-avl',textContent:'${H.esc((fallbackLetter || '?')[0])}'}))">`;
    if (av && av.type === 'emoji') return `<div class="pf-av pf-ave" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.55)}px">${H.esc(av.v)}</div>`;
    const g = GHOSTS[(av && av.type === 'ghost' ? av.v : 0) % GHOSTS.length];
    return `<div class="pf-av" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,${g[0]},${g[1]})"><img src="kyvo_mark.svg" alt="" style="width:62%;height:62%;margin:19%"></div>`;
  }
  function money(v, signed) {
    if (v == null || !isFinite(v)) return '—';
    return (signed && v >= 0 ? '+' : '') + H.fmtUsd(v);
  }

  /* opts: {kind:'own'|'trader', title, handle, x_url, address, avatar, sourceNote, updatedAt, model, root, onRefresh} */
  function render(opts) {
    const root = opts.root;
    const st = opts.st || { per: localStorage.getItem('kyvo_pf_per') || '7d', tab: 'pos' };
    const exOf = (c) => WC[c || opts.chain || 'solana'] || WC.solana;
    const model = opts.model;
    const draw = () => {
      const ps = periodStats(model, st.per);
      const cls = ps.pnl == null ? 'mut' : ps.pnl >= 0 ? 'up' : 'dn';
      root.innerHTML = `
        <div class="pf-head">
          ${opts.back ? '<span class="back" id="pfBack">‹</span>' : ''}
          <div class="pf-avwrap" id="pfAvBtn" ${opts.kind === 'own' ? 'role="button" title="Zmień avatar"' : ''}>${avatarSpec(opts.avatar, 60, opts.title)}${opts.kind === 'own' ? '<span class="pf-edit">✎</span>' : ''}</div>
          <div class="pf-id">
            <div class="pf-nick">${opts.kind === 'own' ? `<input id="pfNick" maxlength="24" value="${H.esc(opts.title || '')}" placeholder="Twój nick" aria-label="Nick">` : `<b>${H.esc(opts.title)}</b>`}</div>
            ${opts.handle ? `<a href="${H.esc(opts.x_url || 'https://x.com/' + opts.handle)}" target="_blank" rel="noopener" class="pf-handle">@${H.esc(opts.handle)} · Obserwuj na X</a>` : ''}
            ${opts.addrHtml || `<div class="pf-addr">${opts.chain && opts.chain !== 'solana' ? `<span class="cbadge c-${H.esc(opts.chain)}">${H.esc(exOf().badge)}</span>` : ''}<span class="mono">${H.esc(H.shortCa(opts.address))}</span>
              <button type="button" class="copybtn" id="pfCopy" aria-label="Kopiuj adres"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="2.4"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>
              <a href="${H.esc(exOf().explorer(opts.address))}" target="_blank" rel="noopener">${H.esc(exOf().exName)} ↗</a></div>`}
          </div>
        </div>
        <div class="pf-avpick" id="pfAvPick" hidden></div>
        ${opts.walletBar || ''}
        <div class="pf-per">${PERIODS.map((p) => `<button type="button" data-per="${p[0]}" class="${p[0] === st.per ? 'on' : ''}">${p[1]}</button>`).join('')}</div>
        <div class="pf-pnl ${cls}">${money(ps.pnl, true)}</div>
        <div class="pf-pnlsub mut">Zrealizowany PnL · ${PERIODS.find((p) => p[0] === st.per)[1]}${ps.pnl == null ? ' · brak zamkniętych pozycji w tym okresie' : ''}</div>
        <div class="pf-chart" id="pfChart"></div>
        <div class="pf-stats">
          <div><small>Win rate</small><b>${ps.win_rate == null ? '—' : Math.round(ps.win_rate * 100) + '%'}</b></div>
          <div><small>Trade'y</small><b>${ps.trades}</b></div>
          <div><small>Wolumen</small><b>${ps.volume ? H.fmtUsd(ps.volume) : '—'}</b></div>
          <div><small>Najlepszy</small><b class="${ps.best && ps.best.p >= 0 ? 'up' : ''}">${ps.best ? money(ps.best.p, true) : '—'}</b></div>
        </div>
        ${opts.chainCards ? opts.chainCards(st.per) : ''}
        <div class="pf-actions">
          <button type="button" class="pf-btn pf-share" id="pfShare">Udostępnij kartę PnL</button>
          ${opts.kind === 'own' ? '<button type="button" class="pf-btn" id="pfRefresh">Odśwież</button>' + (opts.ownActions || '') : '<button type="button" class="pf-btn" id="pfSetMine">Ustaw jako mój profil</button>'}
        </div>
        <div class="pf-tabs"><button type="button" data-tab="pos" class="${st.tab === 'pos' ? 'on' : ''}">Pozycje</button><button type="button" data-tab="act" class="${st.tab === 'act' ? 'on' : ''}">Aktywność</button></div>
        <div class="card pf-list" id="pfList"></div>
        <div class="pf-cardwrap" id="pfCardWrap" hidden>
          <canvas id="pfCanvas" width="1080" height="1350"></canvas>
          <div class="pf-actions"><button type="button" class="pf-btn pf-share" id="pfDl">Pobierz obraz</button><button type="button" class="pf-btn" id="pfNative">Udostępnij…</button><button type="button" class="pf-btn" id="pfClose">Zamknij</button></div>
        </div>
        <div class="mut pf-foot">${opts.footHtml || H.esc(opts.footNote || '')} ${H.esc(opts.priceNote || `Kwoty w SOL przeliczane po kursie ${model.priced === 'current' ? 'bieżącym' : 'historycznym (1h)'} SOL/USD.`)} Wyniki przybliżone · to nie jest porada finansowa.</div>`;
      wire(ps);
      drawChart(ps);
      drawList();
    };
    const wire = (ps) => {
      const q = (s) => root.querySelector(s);
      if (q('#pfBack')) q('#pfBack').onclick = () => (history.length > 1 ? history.back() : (location.hash = 'rank'));
      if (q('#pfCopy')) q('#pfCopy').onclick = async () => { try { await navigator.clipboard.writeText(opts.address); H.toast('Skopiowano adres ' + H.shortCa(opts.address)); } catch (e) { H.toast('Nie udało się skopiować'); } };
      root.querySelectorAll('.pf-per [data-per]').forEach((b) => (b.onclick = () => { st.per = b.dataset.per; localStorage.setItem('kyvo_pf_per', st.per); draw(); }));
      root.querySelectorAll('.pf-tabs [data-tab]').forEach((b) => (b.onclick = () => { st.tab = b.dataset.tab; root.querySelectorAll('.pf-tabs [data-tab]').forEach((x) => x.classList.toggle('on', x === b)); drawList(); }));
      q('#pfShare').onclick = () => { q('#pfCardWrap').hidden = false; drawCard(q('#pfCanvas'), opts, ps, st.per); q('#pfCardWrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      q('#pfClose').onclick = () => (q('#pfCardWrap').hidden = true);
      const fname = () => `kyvo_pnl_${String(opts.handle || opts.title || 'profil').replace(/[^a-z0-9_]+/gi, '') || 'profil'}_${st.per}.png`;
      q('#pfDl').onclick = () => q('#pfCanvas').toBlob((blob) => {
        if (!blob) return H.toast('Nie udało się utworzyć obrazu');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = fname();
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      }, 'image/png');
      q('#pfNative').onclick = () => q('#pfCanvas').toBlob(async (blob) => {
        try {
          const f = new File([blob], fname(), { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Kyvo PnL' });
          else q('#pfDl').click();
        } catch (e) {}
      }, 'image/png');
      if (opts.kind === 'own') {
        q('#pfNick').onchange = () => { const o = own(); o.nick = q('#pfNick').value.trim().slice(0, 24); saveOwn(o); opts.title = o.nick; };
        q('#pfAvBtn').onclick = () => avatarPicker(q('#pfAvPick'), (av) => { const o = own(); o.avatar = av; saveOwn(o); opts.avatar = av; draw(); });
        q('#pfRefresh').onclick = () => opts.onRefresh && opts.onRefresh();
        opts.onWire && opts.onWire(root);
      } else {
        q('#pfSetMine').onclick = () => {
          const o = own();
          if (!o.wallets.some((w) => w.chain === 'solana' && w.address === opts.address)) o.wallets.unshift({ chain: 'solana', address: opts.address });
          o.wallets = o.wallets.slice(0, MAX_WALLETS); delete o.address;
          o.nick = o.nick || opts.title; if (!o.avatar && opts.avatar) o.avatar = opts.avatar; saveOwn(o); H.toast('Dodano do Twojego profilu'); location.hash = 'profil';
        };
      }
    };
    const drawChart = (ps) => {
      const el = root.querySelector('#pfChart');
      if (!window.LightweightCharts || !el) return;
      if (!ps.rows.length) { el.innerHTML = '<div class="pf-chartempty mut">Brak zamkniętych pozycji w tym okresie</div>'; return; }
      const chart = window.LightweightCharts.createChart(el, {
        autoSize: true,
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#8b8b9a', fontSize: 10, attributionLogo: true },
        grid: { vertLines: { visible: false }, horzLines: { color: '#ffffff08' } },
        rightPriceScale: { visible: false }, leftPriceScale: { visible: false },
        timeScale: { borderVisible: false, timeVisible: st.per === '1d', fixLeftEdge: true, fixRightEdge: true },
        crosshair: { mode: 0 }, handleScroll: false, handleScale: false,
        localization: { priceFormatter: (v) => money(v, true) },
      });
      const series = chart.addBaselineSeries({
        baseValue: { type: 'price', price: 0 }, lineWidth: 2,
        topLineColor: '#34E07A', topFillColor1: '#34E07A44', topFillColor2: '#34E07A05',
        bottomLineColor: '#FF5468', bottomFillColor1: '#FF546805', bottomFillColor2: '#FF546844',
        priceLineVisible: false, lastValueVisible: false,
      });
      const pts = [];
      let cum = 0;
      const sorted = ps.rows.slice().sort((a, b) => a.t - b.t);
      pts.push({ time: sorted[0].t - 60, value: 0 });
      for (const c of sorted) {
        cum += c.p;
        const last = pts[pts.length - 1];
        if (last.time >= c.t) last.value = cum; else pts.push({ time: c.t, value: cum });
      }
      series.setData(pts);
      chart.timeScale().fitContent();
    };
    const drawList = async () => {
      const box = root.querySelector('#pfList');
      if (!box) return;
      const multi = !!opts.multiChain;
      const cb = (c) => (multi ? `<span class="cbadge c-${H.esc(c || 'solana')}">${H.esc((WC[c || 'solana'] || WC.solana).badge)}</span> ` : '');
      if (st.tab === 'pos') {
        const pos = model.positions || [];
        if (!pos.length) { box.innerHTML = `<div class="empty" style="padding:14px">${H.esc(opts.emptyPos || 'Brak otwartych pozycji kupionych w naszym oknie danych.')}</div>`; return; }
        box.innerHTML = '<div class="loading" style="padding:12px"><div class="spin"></div>Wyceniam pozycje…</div>';
        await loadMeta(pos);
        if (!box.isConnected) return;
        let hidden = 0;
        const rows = pos.map((p) => {
          const m = p.native ? {} : tokMeta[mk(p.chain, p.mint)] || {};
          const price = p.native ? p.px : m.price != null ? m.price : p.px != null ? p.px : null;
          const val = price != null ? price * p.tok : null;
          if (p.cost_usd == null && !p.native && (val == null || val < 1)) { hidden++; return null; } // airdrop/spam or dust
          const u = val != null && p.cost_usd != null ? val - p.cost_usd : null;
          const pct = u != null && p.cost_usd ? (u / p.cost_usd) * 100 : null;
          const sym = p.native ? p.symbol : m.symbol || p.symbol;
          const img = m.image || p.image;
          const sub = p.native ? `saldo ${p.tok.toLocaleString((window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL'), { maximumFractionDigits: 4 })} ${H.esc(p.symbol)}` : p.quote ? 'saldo' : p.cost_usd != null ? 'koszt ' + H.fmtUsd(p.cost_usd) : 'koszt nieznany (kupione przed oknem)';
          const inner = `${img ? `<img src="${H.esc(img)}" class="pf-tok" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="pf-tok pf-tokl">${H.esc((sym || '?').slice(0, 1))}</span>`}
            <span class="pf-r1"><b>${cb(p.chain)}${H.esc(sym ? (p.native ? sym : '$' + sym) : H.shortCa(p.mint))}</b><small class="mut">${sub}</small></span>
            <span class="pf-r2"><b>${val != null ? H.fmtUsd(val) : '—'}</b><small class="${u == null ? 'mut' : u >= 0 ? 'up' : 'dn'}" title="Niezrealizowany PnL (bieżąca cena)">${p.native ? 'gaz / zapas' : u == null ? (price == null ? 'brak ceny' : 'wartość teraz') : money(u, true) + (pct != null ? ' · ' + (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%' : '')}</small></span>`;
          return { v: p.native ? -1 : val || 0, html: p.native ? `<div class="pf-row">${inner}</div>` : `<a class="pf-row" href="#coin/${encodeURIComponent((p.chain || 'solana') + ':' + p.mint)}">${inner}</a>` };
        }).filter(Boolean);
        rows.sort((a, b) => b.v - a.v);
        box.innerHTML = (rows.map((r) => r.html).join('') || '<div class="empty" style="padding:14px">Brak pozycji z ceną.</div>') +
          (hidden ? `<div class="mut" style="font-size:11px;padding:8px 0 4px">Ukryto ${hidden} ${hidden === 1 ? 'token' : 'tokenów'} bez ceny lub o wartości < $1 (często airdropy/spam).</div>` : '');
      } else {
        const act = model.activity || [];
        if (!act.length) { box.innerHTML = '<div class="empty" style="padding:14px">Brak swapów w naszym oknie danych.</div>'; return; }
        await loadMeta(act);
        if (!box.isConnected) return;
        box.innerHTML = act.map((a) => {
          const m = tokMeta[mk(a.chain, a.mint)] || {};
          const sym = m.symbol || a.symbol;
          return `<div class="pf-row">
            <span class="tr-side ${a.side === 'buy' ? 'up' : 'dn'}">${a.side === 'buy' ? 'KUP' : 'SPRZ'}</span>
            <a class="pf-r1" href="#coin/${encodeURIComponent((a.chain || 'solana') + ':' + a.mint)}"><b>${cb(a.chain)}${H.esc(sym ? '$' + sym : H.shortCa(a.mint))}</b><small class="mut">${a.t ? H.agoLabel(a.t) : '—'} · <span data-tx="${H.esc(a.sig)}" data-ch="${H.esc(a.chain || 'solana')}">tx</span></small></a>
            <span class="pf-r2"><b>${a.usd != null ? H.fmtUsd(a.usd) : '—'}</b>${a.pnl_usd != null ? `<small class="${a.pnl_usd >= 0 ? 'up' : 'dn'}">${money(a.pnl_usd, true)}</small>` : ''}</span>
          </div>`;
        }).join('');
        box.querySelectorAll('[data-tx]').forEach((x) => {
          x.style.color = 'var(--acc2)';
          x.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.open((WC[x.dataset.ch] || WC.solana).tx(x.dataset.tx), '_blank', 'noopener'); };
        });
      }
    };
    draw();
  }

  function avatarPicker(box, onPick) {
    box.hidden = !box.hidden;
    if (box.hidden) return;
    box.innerHTML = `<div class="pf-picks">${GHOSTS.map((_, i) => `<button type="button" data-g="${i}">${avatarSpec({ type: 'ghost', v: i }, 40)}</button>`).join('')}${EMOJI.map((e) => `<button type="button" data-e="${e}">${avatarSpec({ type: 'emoji', v: e }, 40)}</button>`).join('')}</div>
      <label class="pf-btn" style="display:inline-block;margin-top:8px">Wgraj zdjęcie<input type="file" accept="image/*" hidden id="pfFile"></label>
      <div class="mut" style="font-size:11px;margin-top:4px">Zdjęcie zostaje tylko w tej przeglądarce (localStorage).</div>`;
    box.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => onPick({ type: 'ghost', v: +b.dataset.g })));
    box.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => onPick({ type: 'emoji', v: b.dataset.e })));
    box.querySelector('#pfFile').onchange = (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 256;
        const g = cv.getContext('2d');
        const s = Math.min(img.width, img.height);
        g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
        URL.revokeObjectURL(img.src);
        onPick({ type: 'photo', v: cv.toDataURL('image/jpeg', 0.82) });
      };
      img.src = URL.createObjectURL(f);
    };
  }

  function drawCard(cv, opts, ps, per) {
    const g = cv.getContext('2d');
    const W = cv.width, Hh = cv.height;
    const v = ps.pnl;
    const bg = g.createLinearGradient(0, 0, W, Hh);
    bg.addColorStop(0, '#140a2a'); bg.addColorStop(0.5, '#07070B'); bg.addColorStop(1, v != null && v < 0 ? '#2d0814' : '#05261a');
    g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
    const glow = g.createRadialGradient(W * 0.85, 160, 10, W * 0.85, 160, 700);
    glow.addColorStop(0, '#8B5CF666'); glow.addColorStop(1, '#8B5CF600');
    g.fillStyle = glow; g.fillRect(0, 0, W, Hh);
    const F = (w, s) => `${w} ${s}px Inter, system-ui, -apple-system, sans-serif`;
    g.fillStyle = '#f2f2f7'; g.font = F(800, 56); g.fillText('Kyvo', 90, 130);
    g.fillStyle = '#8b8b9a'; g.font = F(600, 34); g.fillText('PnL · ' + T(PERIODS.find((p) => p[0] === per)[1]), 90, 188);
    const rest = () => {
      g.fillStyle = '#f2f2f7'; g.font = F(800, 62); g.fillText(String(opts.title || 'Trader').slice(0, 18), 270, 340);
      g.fillStyle = '#22D3EE'; g.font = F(600, 36); g.fillText(opts.handle ? '@' + opts.handle : opts.cardSub || H.shortCa(opts.address), 270, 396);
      g.font = F(900, v != null && Math.abs(v) >= 100000 ? 130 : 160);
      g.fillStyle = v == null ? '#8b8b9a' : v >= 0 ? '#34E07A' : '#FF5468';
      g.fillText(money(v, true), 90, 640);
      // sparkline of cumulative pnl
      const rows = ps.rows.slice().sort((a, b) => a.t - b.t);
      if (rows.length > 1) {
        let cum = 0; const pts = [0];
        for (const r of rows) { cum += r.p; pts.push(cum); }
        const mn = Math.min(...pts), mx = Math.max(...pts), x0 = 90, x1 = W - 90, y0 = 700, y1 = 900;
        g.beginPath();
        pts.forEach((p, i) => { const x = x0 + ((x1 - x0) * i) / (pts.length - 1); const y = y1 - ((p - mn) / (mx - mn || 1)) * (y1 - y0); i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.strokeStyle = v != null && v < 0 ? '#FF5468' : '#34E07A'; g.lineWidth = 6; g.stroke();
      }
      g.font = F(600, 38); g.fillStyle = '#c9c9d6';
      const wr = ps.win_rate == null ? '—' : Math.round(ps.win_rate * 100) + '%';
      g.fillText(`Win rate ${wr}  ·  ${T("Trade'y")} ${ps.trades}  ·  ${T('Najlepszy')} ${ps.best ? money(ps.best.p, true) : '—'}`, 90, 1000);
      g.fillStyle = '#8b8b9a'; g.font = F(500, 30);
      g.fillText(T('Zrealizowany PnL on-chain') + ' (' + (opts.chainsLabel || 'Solana') + ') · ' + new Date().toLocaleString((window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL'), { dateStyle: 'short', timeStyle: 'short' }), 90, 1200);
      g.fillText(T('kyvo · to nie jest porada finansowa'), 90, 1250);
    };
    // avatar
    const cx = 90 + 75, cy = 340 - 20, r = 75;
    const av = opts.avatar || { type: 'ghost', v: 0 };
    const circle = () => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath(); };
    const gg = GHOSTS[(av.type === 'ghost' ? av.v : 0) % GHOSTS.length];
    const lg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    lg.addColorStop(0, gg[0]); lg.addColorStop(1, gg[1]);
    g.save(); circle(); g.fillStyle = av.type === 'emoji' ? '#1b1b24' : lg; g.fill(); g.restore();
    rest();
    const img = new Image();
    img.onload = () => {
      g.save(); circle(); g.clip();
      if (av.type === 'ghost') g.drawImage(img, cx - r * 0.62, cy - r * 0.62, r * 1.24, r * 1.24);
      else g.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      g.restore();
    };
    if (av.type === 'emoji') { g.font = F(400, 90); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(av.v, cx, cy + 4); g.textAlign = 'start'; g.textBaseline = 'alphabetic'; }
    else img.src = av.type === 'ghost' ? 'kyvo_mark.svg' : av.v;
  }

  /* ---------------- pages ---------------- */
  function renderTrader(root, L, meta) {
    const model = {
      closed: L.closed || [], positions: L.positions || [], volume_usd: Object.assign({}, L.volume_usd || {}, { all: (L.volume_usd || {})['30d'] }),
      activity: (L.recent_trades || []).map((t) => Object.assign({}, t)), priced: 'hist',
    };
    const cov = L.coverage || {};
    render({
      root, kind: 'trader', back: true, title: L.name, handle: L.handle, x_url: L.x_url, address: L.address,
      avatar: L.avatar ? { type: 'url', v: L.avatar } : { type: 'ghost', v: (L.name || 'a').charCodeAt(0) % GHOSTS.length },
      model,
      footNote: (L.sources && L.sources.length === 1 && L.sources[0] === 'pumpfun') ? `Wynik z publicznego rankingu PnL pump.fun (Solana; PnL = zrealizowany + niezrealizowany), zaktualizowano ${meta && meta.updated_at ? H.agoLabel(meta.updated_at) : '—'}. Lista transakcji — zobacz 👀 Tracker lub profil pump.fun.` : (!L.coverage && meta && meta.version >= 2) ? `Wynik z publicznego rankingu kolscan.io (Solana), zaktualizowano ${meta.updated_at ? H.agoLabel(meta.updated_at) : '—'}. Lista transakcji tylko dla portfeli śledzonych przez Kyvo on-chain.` : `Dane z ostatnich ${cov.sigs != null ? cov.sigs : '—'} transakcji portfela (${cov.window_days != null ? cov.window_days + ' dni' : '—'}), zaktualizowano ${meta && meta.updated_at ? H.agoLabel(meta.updated_at) : '—'}. Przypisanie portfela: publiczne źródło${L.source ? ' (' + L.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + ')' : ''}.`,
    });
    traderExtras(root, L);
  }
  // v8.14: pump.fun stats + profile links (kolscan / pump.fun / GMGN) + 👀 follow in the Tracker
  function traderExtras(root, L) {
    const pf = L.pf, pr = L.profiles || {}, TR = window.KyvoTracker;
    const E2 = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const fm = (v) => (v == null ? '—' : `<b class="${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '+' : '−'}$${Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e3 ? (Math.abs(v) / 1e3).toFixed(1) + 'K' : Math.round(Math.abs(v))}</b>`);
    const EN = !!(window.KyvoI18n && window.KyvoI18n.isEn()), T = (pl, en) => (EN ? en : pl);
    const per = [['1d', T('Dzień', 'Day')], ['7d', T('Tydzień', 'Week')], ['30d', T('Miesiąc', 'Month')]];
    const pfH = pf ? `<div class="pf-pfst" translate="no"><div class="mut" style="font-size:11px;margin-bottom:4px">${T('pump.fun PnL (zrealizowany + niezrealizowany)', 'pump.fun PnL (realized + unrealized)')}${pf.verified ? ' · ✓ ' + T('zweryfikowany', 'verified') : ''}</div>
      <div class="pf-pfg">${per.map(([k, n]) => `<div><small>${n}${pf.rank && pf.rank[k] ? ' · #' + pf.rank[k] : ''}</small>${fm(pf.pnl_usd && pf.pnl_usd[k])}${pf.positions && pf.positions[k] ? `<small class="mut">${pf.positions[k]} ${T('poz.', 'pos.')}</small>` : ''}</div>`).join('')}</div></div>` : '';
    const links = [pr.kolscan && ['kolscan', pr.kolscan], ['pump.fun', pr.pumpfun || 'https://pump.fun/profile/' + L.address], ['GMGN', pr.gmgn || 'https://gmgn.ai/sol/address/' + L.address], ['Solscan', 'https://solscan.io/account/' + L.address]].filter(Boolean);
    const html = `<div class="card pf-xtra">${pfH}<div class="pf-xl">${TR && TR.enabled() ? TR.btnHtml({ address: L.address, name: L.name, img: L.avatar, src: (L.sources || ['kolscan'])[0] }) : ''}${links.map(([n, u]) => `<a class="pill" href="${E2(u)}" target="_blank" rel="noopener noreferrer">${n} ↗</a>`).join('')}</div></div>`;
    const tgt = root.querySelector('.pf-head, .pf-top, .pf-hdr');
    if (tgt) tgt.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
  }

  /* ---------------- own profile: many wallets (Solana + EVM) ---------------- */
  const ownSt = { per: localStorage.getItem('kyvo_pf_per') || '7d', tab: 'pos' };
  let ownSel = localStorage.getItem('kyvo_pf_sel') || 'all';
  const wkey = (w) => w.chain + ':' + w.address;
  const wstat = {}; // wkey -> {state:'sync'|'ok'|'err', prog, err}
  const inflight = {}; // wkey -> Promise (shared across re-renders)
  function chainOf(id) { return WC[id] || WC.solana; }

  async function walletModel(w) {
    const now = Math.floor(Date.now() / 1000);
    if (w.chain === 'solana') {
      const m = await modelFromCache(w.address);
      const tag = (x) => Object.assign({}, x, { chain: 'solana' });
      const okWindow = m.sigs || 0;
      return {
        w, model: Object.assign({}, m, { closed: m.closed.map(tag), positions: m.positions.map(tag), activity: m.activity.map(tag) }),
        has: okWindow > 0 || !!m.updated,
        window: m.sigs ? `ostatnie ${m.sigs} transakcji` : '—',
        note: `Solana: publiczne RPC (ok. 24h wstecz w przeglądarce; historia rośnie z każdym odświeżeniem na tym urządzeniu)${m.missing ? ` · ${m.missing} transakcji do pobrania` : ''}.`,
        updated: m.updated,
      };
    }
    const E = window.KyvoEVM;
    const { events, cache, unknownSells } = E.events(w.chain, w.address);
    const sp = await E.nativePx(w.chain);
    const m = buildModel(events, sp, now);
    const ch = E.CHAINS[w.chain];
    const tag = (x) => Object.assign({}, x, { chain: w.chain });
    const fifo = {}; for (const p of m.positions) fifo[p.mint] = p;
    const positions = [];
    if (cache && cache.nativeBal != null) positions.push({ chain: w.chain, native: true, symbol: ch.native, tok: cache.nativeBal, px: sp.cur, mint: 'native' });
    for (const h of (cache && cache.holdings) || []) {
      if (E.isQuote(w.chain, h.mint)) { // WBNB/WETH/stables: show as value, no PnL
        positions.push({ chain: w.chain, mint: h.mint, tok: h.tok, cost_usd: null, symbol: h.symbol, image: h.image, px: h.px, quote: true });
        continue;
      }
      const f = fifo[h.mint];
      positions.push({ chain: w.chain, mint: h.mint, tok: h.tok, cost_usd: f ? f.cost_usd * Math.min(1, h.tok / f.tok) : null, symbol: h.symbol, image: h.image, px: h.px });
    }
    const notes = [];
    if (w.chain === 'bsc') notes.push(`BSC: transfery tokenów z ${cache ? cache.windowNote || 'ostatnich ~24h' : 'ostatnich ~24h'} (darmowe publiczne RPC — pełnej historii nie da się pobrać bez płatnego klucza). Kwota w BNB z samej transakcji, unwrapu WBNB albo zdarzeń four.meme. Saldo: BNB + tokeny, które ruszały się w tym oknie.`);
    if (w.chain === 'robinhood') notes.push(`Robinhood Chain: ${cache ? cache.windowNote || 'ostatnie transfery' : 'ostatnie transfery'} z publicznego explorera (Blockscout). Saldo tokenów pełne. Sprzedaż za ETH liczymy z transakcji wewnętrznych albo różnicy salda (tylko świeże bloki).`);
    if (unknownSells) notes.push(`${unknownSells} ${unknownSells === 1 ? 'sprzedaż' : 'sprzedaży'} bez znanej kwoty — nie liczymy do PnL.`);
    if (cache && cache.notes && cache.notes.length) notes.push(...cache.notes);
    return {
      w, model: Object.assign({}, m, { closed: m.closed.map(tag), positions, activity: m.activity.map(tag) }),
      has: !!(cache && cache.updated), window: cache ? cache.windowNote || '—' : '—', note: notes.join(' '), updated: cache && cache.updated,
      canOlder: !!(cache && cache.canOlder), priced: sp.hist ? 'hist' : 'current',
    };
  }
  function combine(list) {
    const m = { closed: [], positions: [], activity: [], volume_usd: { '1d': 0, '7d': 0, '30d': 0, all: 0 }, priced: 'hist' };
    for (const x of list) {
      m.closed.push(...x.model.closed); m.positions.push(...x.model.positions); m.activity.push(...x.model.activity);
      for (const k of Object.keys(m.volume_usd)) m.volume_usd[k] += (x.model.volume_usd && x.model.volume_usd[k]) || 0;
      if (x.model.priced === 'current') m.priced = 'current';
    }
    m.activity.sort((a, b) => (b.t || 0) - (a.t || 0)); m.activity = m.activity.slice(0, 60);
    return m;
  }

  function addFormHtml(o, first) {
    const pre = localStorage.getItem('kyvo_pf_addch') || 'solana';
    return `<div class="card pf-onb pf-addf" id="pfAddForm">
      ${first ? `<div style="display:flex;gap:12px;align-items:center">${avatarSpec(o.avatar, 56)}<div><b style="font-size:16px">PnL Twoich portfeli</b><div class="mut" style="font-size:12.5px;margin-top:2px">Bez logowania. Solana, BSC i Robinhood Chain — wklej publiczny adres.</div></div></div>` : '<b style="font-size:14px">Dodaj portfel</b>'}
      <div class="pf-chpick" role="radiogroup" aria-label="Sieć">${WCHAINS.map((c) => `<button type="button" role="radio" data-ch="${c.id}" class="${c.id === pre ? 'on' : ''}"><span class="cbadge c-${c.id}">${c.badge}</span> ${c.label}</button>`).join('')}</div>
      <input id="pfAddr" class="pf-input" placeholder="${pre === 'solana' ? 'Publiczny adres Solana' : 'Publiczny adres 0x…'}" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text">
      <label class="pf-both" id="pfBothWrap" ${pre === 'solana' ? 'hidden' : ''}><input type="checkbox" id="pfBoth" checked> <span id="pfBothTxt">Ten sam adres dodaj też na ${pre === 'bsc' ? 'Robinhood Chain' : 'BSC'}</span></label>
      <div class="pf-err" id="pfErr" hidden></div>
      <button type="button" class="pf-btn pf-share" id="pfGo" style="width:100%;margin-top:8px">${first ? 'Pokaż mój PnL' : 'Dodaj portfel'}</button>
      ${first ? '' : '<button type="button" class="pf-btn" id="pfAddCancel" style="width:100%;margin-top:6px">Anuluj</button>'}
      <div class="pf-safe">🔒 Kyvo nigdy nie prosi o klucz prywatny ani seed frazę — tylko publiczny adres. Nie podłączasz portfela, nic nie podpisujesz.</div>
      ${first ? `<div class="mut" style="font-size:11.5px;margin-top:8px;line-height:1.45">Adresy zapisujemy tylko w tej przeglądarce. Dane bierzemy z darmowych publicznych źródeł: Solana RPC, publiczne RPC BSC, explorer Robinhood Chain, ceny z DexScreener. Darmowe źródła trzymają krótką historię, więc PnL liczymy z ostatnich transakcji (szczegóły pod profilem).</div>` : ''}
    </div>`;
  }
  function wireAddForm(root, onDone, onCancel) {
    const f = root.querySelector('#pfAddForm');
    if (!f) return;
    let ch = localStorage.getItem('kyvo_pf_addch') || 'solana';
    const inp = f.querySelector('#pfAddr'), err = f.querySelector('#pfErr'), both = f.querySelector('#pfBothWrap');
    const setCh = (c) => {
      ch = c; localStorage.setItem('kyvo_pf_addch', c);
      f.querySelectorAll('.pf-chpick [data-ch]').forEach((b) => b.classList.toggle('on', b.dataset.ch === c));
      inp.placeholder = c === 'solana' ? 'Publiczny adres Solana' : 'Publiczny adres 0x…';
      both.hidden = c === 'solana';
      f.querySelector('#pfBothTxt').textContent = 'Ten sam adres dodaj też na ' + (c === 'bsc' ? 'Robinhood Chain' : 'BSC');
    };
    f.querySelectorAll('.pf-chpick [data-ch]').forEach((b) => (b.onclick = () => setCh(b.dataset.ch)));
    const showErr = (t) => { err.textContent = t; err.hidden = !t; };
    inp.oninput = () => {
      const a = inp.value.trim();
      showErr('');
      if (isEvm(a) && ch === 'solana') setCh('bsc');
      else if (isAddr(a) && !a.startsWith('0x') && ch !== 'solana') setCh('solana');
    };
    const go = () => {
      const a = inp.value.trim();
      if (/\s/.test(a) && a.split(/\s+/).length >= 6) { showErr('To wygląda na frazę seed — NIGDY jej nikomu nie podawaj. Wklej tylko publiczny adres portfela.'); inp.value = ''; return; }
      if (/^[0-9a-fA-F]{64}$/.test(a.replace(/^0x/, '')) || (/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(a))) { showErr('To wygląda na klucz prywatny — nie wklejaj go nigdzie. Potrzebny jest tylko publiczny adres.'); inp.value = ''; return; }
      const add = [];
      if (ch === 'solana') { if (!isAddr(a) || a.startsWith('0x')) return showErr('To nie wygląda na adres Solana (32–44 znaki base58).'); add.push({ chain: 'solana', address: a }); }
      else {
        if (!isEvm(a)) return showErr('Adres BSC / Robinhood Chain zaczyna się od 0x i ma 42 znaki.');
        add.push({ chain: ch, address: a });
        if (f.querySelector('#pfBoth').checked) add.push({ chain: ch === 'bsc' ? 'robinhood' : 'bsc', address: a });
      }
      const o = own();
      const have = new Set(o.wallets.map((w) => w.chain + ':' + w.address.toLowerCase()));
      const fresh = add.filter((w) => !have.has(w.chain + ':' + w.address.toLowerCase()));
      if (!fresh.length) return showErr('Ten portfel już jest w profilu.');
      if (o.wallets.length + fresh.length > MAX_WALLETS) return showErr(`Maksymalnie ${MAX_WALLETS} portfeli.`);
      o.wallets.push(...fresh); delete o.address; saveOwn(o);
      H.toast(fresh.length > 1 ? 'Dodano portfel na 2 sieciach' : 'Dodano portfel');
      onDone && onDone(fresh);
    };
    f.querySelector('#pfGo').onclick = go;
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    const c = f.querySelector('#pfAddCancel'); if (c) c.onclick = () => onCancel && onCancel();
  }

  function renderOwn(root) {
    const gen = (root._kyvoGen = (root._kyvoGen || 0) + 1);
    const live = () => root.isConnected && root._kyvoGen === gen;
    const o = own();
    if (!o.wallets.length) {
      root.innerHTML = `<div class="h">Twój profil</div>${addFormHtml(o, true)}
        <div class="card" role="button" id="pfMore" style="cursor:pointer"><b style="font-size:13px">Więcej · O Kyvo →</b></div>`;
      wireAddForm(root, () => { ownSel = 'all'; localStorage.setItem('kyvo_pf_sel', 'all'); renderOwn(root); });
      root.querySelector('#pfMore').onclick = () => (location.hash = 'more');
      return;
    }
    const wallets = o.wallets;
    if (ownSel !== 'all' && !wallets.some((w) => wkey(w) === ownSel)) ownSel = 'all';
    let models = [];
    let adding = false;
    const progText = () => wallets.filter((w) => (wstat[wkey(w)] || {}).state === 'sync').map((w) => `${chainOf(w.chain).badge} ${(wstat[wkey(w)] || {}).prog || '…'}`).join(' · ');
    const paintProg = () => {
      if (!live()) return;
      let el = root.querySelector('#pfProg');
      const t = progText();
      if (!t) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'pfProg'; el.className = 'pf-prog'; el.innerHTML = '<div class="spin"></div><span></span>'; root.prepend(el); }
      el.querySelector('span').textContent = 'Pobieram dane: ' + t;
    };
    const draw = async () => {
      models = await Promise.all(wallets.map((w) => walletModel(w).catch(() => ({ w, model: { closed: [], positions: [], activity: [], volume_usd: {} }, has: false, window: '—', note: '' }))));
      if (!live()) return;
      const cur = ownSel === 'all' ? null : models.find((x) => wkey(x.w) === ownSel);
      const shown = cur ? [cur] : models;
      const model = combine(shown);
      const chainsLabel = [...new Set(shown.map((x) => chainOf(x.w.chain).label))].join(' + ');
      const chip = (x) => {
        const st = wstat[wkey(x.w)] || {};
        return `<button type="button" data-w="${H.esc(wkey(x.w))}" class="${ownSel === wkey(x.w) ? 'on' : ''}"><span class="cbadge c-${x.w.chain}">${chainOf(x.w.chain).badge}</span> ${H.esc(H.shortCa(x.w.address))}${st.state === 'sync' ? ' <i class="pf-dot"></i>' : st.state === 'err' ? ' <b class="dn">!</b>' : ''}</button>`;
      };
      const walletBar = `<div class="pf-wallets" role="tablist" aria-label="Portfele">
          <button type="button" data-w="all" class="${ownSel === 'all' ? 'on' : ''}">Wszystkie <span class="vcount">${wallets.length}</span></button>
          ${models.map(chip).join('')}
          ${wallets.length < MAX_WALLETS ? '<button type="button" data-w="add" class="pf-wadd">+ Portfel</button>' : ''}
        </div><div id="pfAddSlot"></div>`;
      const chainCards = (per) => {
        if (cur || models.length < 2) return '';
        return `<div class="pf-chains">${models.map((x) => {
          const ps = periodStats(x.model, per); const st = wstat[wkey(x.w)] || {};
          return `<button type="button" class="pf-ch" data-w="${H.esc(wkey(x.w))}">
            <span class="pf-ch-h"><span class="cbadge c-${x.w.chain}">${chainOf(x.w.chain).badge}</span> <span class="mono mut">${H.esc(H.shortCa(x.w.address))}</span></span>
            <b class="${ps.pnl == null ? 'mut' : ps.pnl >= 0 ? 'up' : 'dn'}">${st.state === 'sync' && !x.has ? '…' : money(ps.pnl, true)}</b>
            <small class="mut">${st.state === 'err' ? '<span class="dn">błąd źródła</span>' : st.state === 'sync' ? 'pobieram…' : `${ps.trades} trade'y · ${H.esc(x.window)}`}</small>
          </button>`;
        }).join('')}</div>`;
      };
      const addrHtml = cur ? null : `<div class="pf-addr"><span>${wallets.length} ${wallets.length === 1 ? 'portfel' : wallets.length < 5 ? 'portfele' : 'portfeli'}</span> · ${[...new Set(wallets.map((w) => chainOf(w.chain).badge))].map((b) => `<span class="cbadge c-${WCHAINS.find((c) => c.badge === b).id}">${b}</span>`).join(' ')}</div>`;
      const notes = shown.map((x) => x.note).filter(Boolean);
      const ownActions = (cur ? '<button type="button" class="pf-btn" id="pfRemove">Usuń ten portfel</button>' : '') +
        (shown.some((x) => x.canOlder) ? '<button type="button" class="pf-btn" id="pfOlder">Starsze BSC (+24h)</button>' : '');
      const anyCurrent = shown.some((x) => x.model.priced === 'current');
      render({
        root, kind: 'own', st: ownSt, title: o.nick || 'Mój portfel', address: cur ? cur.w.address : wallets[0].address, chain: cur ? cur.w.chain : null,
        addrHtml, avatar: o.avatar || { type: 'ghost', v: 0 }, model, multiChain: !cur && new Set(wallets.map((w) => w.chain)).size > 1,
        walletBar, chainCards, ownActions, chainsLabel, cardSub: cur ? H.shortCa(cur.w.address) : chainsLabel,
        emptyPos: 'Brak pozycji z ceną w naszym oknie danych.',
        priceNote: `Kwoty w SOL/BNB/ETH przeliczane po kursie ${anyCurrent ? 'bieżącym' : 'historycznym (1h, Binance)'}; ceny tokenów z DexScreener.`,
        footHtml: notes.map((n) => H.esc(n)).join('<br>') + '<br>🔒 Tylko publiczne adresy — nigdy klucz prywatny ani seed.',
        onRefresh: () => syncAll(true),
        onWire: (r) => {
          r.querySelectorAll('.pf-wallets [data-w], .pf-chains [data-w]').forEach((b) => (b.onclick = () => {
            const v = b.dataset.w;
            if (v === 'add') { adding = !adding; if (!adding && pending) { pending = false; draw(); } else paintAdd(); if (adding) { const i = root.querySelector('#pfAddr'); i && i.focus({ preventScroll: true }); } return; }
            ownSel = v; localStorage.setItem('kyvo_pf_sel', v); draw();
          }));
          const rm = r.querySelector('#pfRemove');
          if (rm) rm.onclick = () => {
            const o2 = own(); o2.wallets = o2.wallets.filter((w) => wkey(w) !== ownSel); saveOwn(o2);
            H.toast('Usunięto portfel'); ownSel = 'all'; localStorage.setItem('kyvo_pf_sel', 'all'); renderOwn(root);
          };
          const old = r.querySelector('#pfOlder');
          if (old) old.onclick = () => syncAll(true, true);
          paintAdd(); paintProg();
        },
      });
      const more = document.createElement('div');
      more.className = 'card'; more.style.cursor = 'pointer'; more.innerHTML = '<b style="font-size:13px">Więcej · O Kyvo →</b>';
      more.onclick = () => (location.hash = 'more');
      root.appendChild(more);
    };
    const paintAdd = () => {
      const slot = root.querySelector('#pfAddSlot');
      if (!slot) return;
      slot.innerHTML = adding ? addFormHtml(o, false) : '';
      root.querySelectorAll('.pf-wallets [data-w="add"]').forEach((b) => b.classList.toggle('on', adding));
      if (adding) wireAddForm(slot, (fresh) => { adding = false; renderOwn(root); }, () => { adding = false; if (pending) { pending = false; draw(); } else paintAdd(); });
    };
    let redrawT = null;
    let pending = false;
    const redrawSoon = () => {
      clearTimeout(redrawT);
      redrawT = setTimeout(() => {
        if (!live()) return;
        if (adding) { pending = true; return; } // never wipe the add-wallet form while the user types
        draw();
      }, 250);
    };
    async function syncOne(w, force, older) {
      const k = wkey(w);
      if (inflight[k]) { try { await inflight[k]; } catch (e) {} paintProg(); redrawSoon(); return; }
      const last = w.chain === 'solana' ? txCache(w.address).updated : ((window.KyvoEVM.load(w.chain, w.address) || {}).updated);
      if (!force && last && Date.now() - last < 10 * 60000) return;
      wstat[k] = { state: 'sync', prog: '…' };
      paintProg();
      inflight[k] = (async () => {
        try {
          if (w.chain === 'solana') await syncWallet(w.address, (d, n) => { wstat[k].prog = `${d}/${n}`; paintProg(); });
          else await window.KyvoEVM.sync(w.chain, w.address, (stage, d, n) => { wstat[k].prog = `${stage === 'logi' ? 'bloki' : stage === 'tx' ? 'transakcje' : 'explorer'} ${d}/${n}`; paintProg(); }, { older: !!older && w.chain === 'bsc' });
          wstat[k] = { state: 'ok' };
        } catch (e) {
          wstat[k] = { state: 'err', err: String(e && e.message) };
          if (live()) H.toast(`${chainOf(w.chain).label}: publiczne źródło jest teraz zajęte — spróbuj Odśwież za chwilę`);
        }
      })();
      try { await inflight[k]; } finally { delete inflight[k]; }
      paintProg();
      redrawSoon();
    }
    async function syncAll(force, older, only) {
      const list = only || wallets;
      await Promise.all(list.map((w) => syncOne(w, force, older && w.chain === 'bsc')));
    }
    draw().then(() => syncAll(false));
  }

  window.KyvoProfile = { init: (h) => (H = h), renderTrader, renderOwn, buildModel, parseLegs, own, saveOwn, avatarSpec, MAX_WALLETS };
})();
