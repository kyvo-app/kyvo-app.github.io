/* Kyvo price chart: TradingView Lightweight Charts™ (Apache-2.0, bundled in vendor/) + GeckoTerminal public OHLCV.
   v8.14 (pump.fun-style): smooth MC area line by default (candle toggle), 1m/5m/15m/1h/All, MC axis with the live MC tag,
   live trades stream on the left (GeckoTerminal public trades, ~8 s), KOL / pump.fun trader / whale avatar markers.
   Fallback: DexScreener embed. */
(function () {
  'use strict';
  const GT = 'https://api.geckoterminal.com/api/v2';
  const TFS = [
    { id: '1m', sec: 60, tf: 'minute', agg: 1 },
    { id: '5m', sec: 300, tf: 'minute', agg: 5 },
    { id: '15m', sec: 900, tf: 'minute', agg: 15 },
    { id: '1h', sec: 3600, tf: 'hour', agg: 1 },
    { id: 'All', all: true },
  ];
  // "All": the coarsest-needed candle so ~300 candles cover the pool's whole life
  const ALL_STEPS = [
    { sec: 60, tf: 'minute', agg: 1 }, { sec: 300, tf: 'minute', agg: 5 }, { sec: 900, tf: 'minute', agg: 15 },
    { sec: 3600, tf: 'hour', agg: 1 }, { sec: 14400, tf: 'hour', agg: 4 }, { sec: 86400, tf: 'day', agg: 1 },
  ];
  function allStep(createdAt) {
    const age = createdAt ? (Date.now() - createdAt) / 1000 : 86400 * 30;
    return ALL_STEPS.find((x) => x.sec * 290 >= age) || ALL_STEPS[ALL_STEPS.length - 1];
  }
  const TF_KEY = 'kyvo_chart_tf2';
  // v8.15: a chart opened for one trade (Journal) picks the finest candle whose ~280 candles still reach back to the entry,
  // so the whole trade is visible; the choice is not saved as the user's default timeframe
  function focusTf(f) {
    const nowS = Date.now() / 1000, from = f.from || nowS, to = f.to || nowS, dur = Math.max(60, to - from);
    const need = nowS - from + Math.max(dur * 0.6, 600);
    return TFS.find((x) => !x.all && x.sec * 280 >= need && dur / x.sec <= 240) || TFS[TFS.length - 1];
  }
  function focusRange(me) {
    const f = me.opts.focus, cs = me.data;
    if (!f || !cs || cs.length < 3 || !me.chart) return;
    const sec = curSec(me), nowS = Date.now() / 1000, from = f.from, to = f.to || nowS, dur = Math.max(60, to - from);
    const pad = Math.max(dur * 0.6, sec * 12);
    const a = Math.max(cs[0].time, from - pad), b = Math.min(cs[cs.length - 1].time, to + pad);
    if (b - a < sec * 4) return;
    try { me.chart.timeScale().setVisibleRange({ from: Math.floor(a), to: Math.ceil(b) }); } catch (e) {}
  }
  const MODE_KEY = 'kyvo_chart_mode';     // 'line' (default, like pump.fun) | 'candle'
  const STREAM_KEY = 'kyvo_chart_stream'; // '0' = live trades stream hidden
  const L = (pl, en) => (window.KyvoI18n && window.KyvoI18n.isEn && window.KyvoI18n.isEn() ? en : pl);
  const escH = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const cache = new Map(); // url -> {t, data}
  let lastReq = 0;
  const MIN_GAP = 4000; // GeckoTerminal public API: stay well under ~30 req/min (shared with the app)
  let cooldownUntil = 0; // after a rate-limit / blocked response, pause all GT calls
  // v8.9: a real queue with a PRIORITY lane. v8.8 chained every GT call of the whole app (second-wave shapes, track record,
  // watchlist, tweets) on one promise, 4 s apart — opening a coin often waited 30–60 s behind them ("Ładuję wykres…" forever),
  // and one hanging request (no timeout) blocked every later chart. Chart calls now jump the queue; each call times out at 12 s.
  const queue = [];
  let pumping = false;
  const inflight = new Map(); // url -> promise (same URL requested twice = one call)
  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      while (queue.length) {
        queue.sort((a, b) => b.pri - a.pri || a.seq - b.seq);
        // v8.9: while a chart is still loading, background GT calls (images, second-wave shapes, track record) wait (≤ 20 s)
        // — GeckoTerminal's free limit is shared, and the chart is what the user is looking at
        if (!queue[0].pri && chartBusy() && Date.now() - (queue[0].since || (queue[0].since = Date.now())) < 20000) { await new Promise((r) => setTimeout(r, 400)); continue; }
        const job = queue.shift();
        if (job.alive && !job.alive()) { job.err(new Error('cancelled')); continue; } // chart already closed: skip the call
        if (job.stale && cooldownUntil > Date.now()) { job.ok(job.stale); continue; } // rate-limited: stale beats waiting
        // chart (priority) calls: 1.5 s after the previous call and at most 3 s of a rate-limit pause; background calls keep 4 s + full pause
        const wait = job.pri ? Math.max(0, lastReq + 1500 - Date.now(), Math.min(3000, cooldownUntil - Date.now()))
          : Math.max(0, lastReq + MIN_GAP - Date.now(), cooldownUntil - Date.now());
        if (wait) await new Promise((r) => setTimeout(r, wait));
        lastReq = Date.now();
        try { job.ok(await job.run()); } catch (e) { job.err(e); }
      }
    } finally { pumping = false; }
  }
  let seq = 0;
  const chartBusy = () => !!(cur && !cur.dead && !cur.data && !cur.fbAt && cur.root && cur.root.isConnected);
  function gtFetch(url, ttl, pri, alive) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.t < ttl) return Promise.resolve(hit.data);
    if (inflight.has(url) && !alive) return inflight.get(url);
    const run = async () => {
      const again = cache.get(url);
      if (again && Date.now() - again.t < ttl) return again.data; // filled while queued
      let r;
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const to = ctl ? setTimeout(() => ctl.abort(), 12000) : null;
      try {
        r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined });
      } catch (e) {
        if (to) clearTimeout(to);
        if (e && e.name === 'AbortError') { if (hit) return hit.data; throw new Error('timeout'); }
        // GT answers 429 without CORS headers → surfaces as a network error
        cooldownUntil = Date.now() + 10000;
        if (hit) return hit.data;
        throw new Error('limit');
      }
      if (to) clearTimeout(to);
      if (r.status === 429) {
        cooldownUntil = Date.now() + 10000;
        if (hit) return hit.data; // stale is better than nothing
        throw new Error('limit');
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      cache.set(url, { t: Date.now(), data: d });
      return d;
    };
    const p = new Promise((ok, err) => { queue.push({ run, ok, err, pri: pri ? 1 : 0, seq: seq++, stale: hit ? hit.data : null, alive }); pump(); })
      .finally(() => { if (inflight.get(url) === p) inflight.delete(url); });
    if (!alive) inflight.set(url, p);
    return p;
  }
  const chartFetch = (url, ttl, me) => gtFetch(url, ttl, true, me ? () => !me.dead && me === cur && !me.fbAt : null);

  function fmtPrice(p) {
    if (p == null || !isFinite(p)) return '—';
    if (p <= 0) return p === 0 ? '0' : ''; // v8.1: no '-0' labels below zero (volume area under candles)
    if (p >= 1000) return p.toFixed(0);
    if (p >= 1) return p.toFixed(3);
    const z = Math.floor(-Math.log10(p));
    return p.toFixed(Math.min(14, z + 4));
  }
  // v8.14: MC axis like pump.fun ($189.75K)
  function fmtMc(v) {
    if (v == null || !isFinite(v)) return '—';
    if (v <= 0) return v === 0 ? '$0' : '';
    const a = Math.abs(v);
    if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return '$' + (v / 1e3).toFixed(a >= 1e5 ? 1 : 2) + 'K';
    return '$' + v.toFixed(0);
  }
  function fmtUsdS(v) {
    if (!isFinite(v)) return '$?';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e4) return '$' + Math.round(v / 1e3) + 'K';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    if (v >= 10) return '$' + Math.round(v);
    if (v > 0 && v < 0.1) return '<$0.1';
    return '$' + v.toFixed(1);
  }
  function fmtTime(t, sec) {
    const d = new Date(t * 1000);
    const loc = window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL';
    const o = { hour: '2-digit', minute: '2-digit' };
    if (sec < 60) o.second = '2-digit';
    if (sec >= 14400) return d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' }) + (sec >= 86400 ? '' : ' ' + d.toLocaleTimeString(loc, o));
    return d.toLocaleTimeString(loc, o);
  }
  function agoS(t) {
    const s = Math.max(0, Math.floor(Date.now() / 1000 - t));
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }

  let cur = null; // current mounted chart
  const fbMemo = new Map(); // key -> time of the last transient fallback

  function destroy() {
    if (!cur) return;
    cur.dead = true;
    clearInterval(cur.timer);
    clearTimeout(cur.watchT);
    clearTimeout(cur.retryT);
    clearTimeout(cur.tradeT);
    try { cur.ro && cur.ro.disconnect(); } catch (e) {}
    try { cur.chart && cur.chart.remove(); } catch (e) {}
    cur.root.remove();
    cur = null;
  }

  const ICON = {
    bell: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    candle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 3v4M7 17v4M17 3v6M17 15v6"/><rect x="4.5" y="7" width="5" height="10" rx="1"/><rect x="14.5" y="9" width="5" height="6" rx="1"/></svg>',
    line: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 17c4-1 5-9 9-9s4 6 9-3"/></svg>',
    stream: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 6h7M4 12h10M4 18h6"/><path d="M18 5v14M15 16l3 3 3-3"/></svg>',
  };

  function mount(slot, opts) {
    if (!slot) return;
    if (cur && cur.key === opts.key) {
      // v8.9: reopening the same coin — reuse only a healthy chart; a fallback caused by a temporary problem (rate limit,
      // timeout, library not loaded yet, pool not indexed yet) is rebuilt so the real chart gets another chance
      const stale = cur.fbTransient && Date.now() - (cur.fbAt || 0) > 180000; // ≤ 3 min: keep the working DexScreener chart
      if (!stale) {
        slot.appendChild(cur.root);
        cur.opts = Object.assign(cur.opts, opts, { smBuys: opts.smBuys || [] });
        setFactor(cur);
        if (cur.data) { paint(cur, false); }
        if (cur.chart && Date.now() - (cur.loadedAt || 0) > 30000) load(cur, false);
        if (cur.chart) { schedule(cur); pollTrades(cur, true); }
        return;
      }
    }
    destroy();
    const root = document.createElement('div');
    root.className = 'kchart';
    const saved = localStorage.getItem(TF_KEY);
    const tf = opts.focus ? focusTf(opts.focus) : TFS.find((x) => x.id === saved) || TFS[4];
    const mode = localStorage.getItem(MODE_KEY) === 'candle' ? 'candle' : 'line';
    const streamOn = localStorage.getItem(STREAM_KEY) !== '0';
    root.innerHTML = `
      <div class="kc-box${streamOn ? ' st-on' : ''}"><div class="kc-chart"></div>
        <div class="kc-stream" aria-live="off" aria-label="${L('Transakcje na żywo', 'Live trades')}"></div>
        <div class="kc-marks"></div><div class="kc-pop" hidden></div>
        <div class="kc-state"><div class="spin"></div>${L('Ładuję wykres…', 'Loading chart…')}</div></div>
      <div class="kc-bar">
        <div class="kc-tfs" role="tablist">${TFS.map((x) => `<button type="button" data-tf="${x.id}" class="${x.id === tf.id ? 'on' : ''}">${x.id === 'All' ? L('Wszystko', 'All') : x.id}</button>`).join('')}</div>
        <span class="kc-sep"></span>
        ${opts.onAlert ? `<button type="button" class="kc-tool kc-alert" aria-label="Alert">${ICON.bell}<span>Alert</span></button>` : ''}
        <button type="button" class="kc-tool kc-mode" aria-label="${L('Świece / linia', 'Candles / line')}" title="${L('Świece / linia', 'Candles / line')}">${mode === 'candle' ? ICON.line : ICON.candle}</button>
        <button type="button" class="kc-tool kc-st${streamOn ? ' on' : ''}" aria-label="${L('Transakcje na żywo', 'Live trades')}" title="${L('Transakcje na żywo', 'Live trades')}">${ICON.stream}</button>
      </div>
      <div class="kc-note mut"></div>
      <div class="kc-attr mut">${L('Wykres', 'Chart')}: <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a> · ${L('dane', 'data')}: <a href="https://www.geckoterminal.com/" target="_blank" rel="noopener">GeckoTerminal</a></div>`;
    slot.appendChild(root);
    cur = { key: opts.key, opts, root, tf, mode, streamOn, pool: opts.pool || null, chart: null, data: null, timer: null, fails: 0, trades: [], seen: new Set() };
    const me = cur;
    setFactor(me);
    root.querySelectorAll('[data-tf]').forEach((b) =>
      b.addEventListener('click', () => {
        const t = TFS.find((x) => x.id === b.dataset.tf);
        if (!t || me.dead) return;
        me.tf = t;
        if (!me.opts.focus) localStorage.setItem(TF_KEY, t.id);
        root.querySelectorAll('[data-tf]').forEach((x) => x.classList.toggle('on', x === b));
        load(me, true);
        schedule(me);
      })
    );
    const al = root.querySelector('.kc-alert');
    if (al) al.onclick = () => me.opts.onAlert && me.opts.onAlert();
    root.querySelector('.kc-mode').onclick = (ev) => {
      me.mode = me.mode === 'candle' ? 'line' : 'candle';
      localStorage.setItem(MODE_KEY, me.mode);
      ev.currentTarget.innerHTML = me.mode === 'candle' ? ICON.line : ICON.candle;
      if (me.chart) { applyMode(me); paint(me, false); }
    };
    root.querySelector('.kc-st').onclick = (ev) => {
      me.streamOn = !me.streamOn;
      localStorage.setItem(STREAM_KEY, me.streamOn ? '1' : '0');
      ev.currentTarget.classList.toggle('on', me.streamOn);
      root.querySelector('.kc-box').classList.toggle('st-on', me.streamOn);
      if (me.streamOn) renderStream(me, true);
      requestAnimationFrame(() => placeMarks(me));
    };
    root.querySelector('.kc-pop').addEventListener('click', (e) => { if (e.target.closest('.kc-pop-x')) hidePop(me); });
    if (!opts.network) { fallback(me, L('GeckoTerminal nie obsługuje tej sieci', 'GeckoTerminal does not support this network'), false); return; }
    if (opts.pool && /:/.test(opts.pool)) { fallback(me, '', false); return; } // v8.9: four.meme curve pair ids ("0x…:4meme") are DexScreener-only
    const memo = fbMemo.get(opts.key); // v8.9: this coin needed the DexScreener chart < 3 min ago -> show it at once on reopen
    if (memo && Date.now() - memo < 180000) { fallback(me, L('Wykres Kyvo był przed chwilą niedostępny', 'The Kyvo chart was unavailable a moment ago'), true); return; }
    // v8.9: never leave a blank box — no candles after 12 s (rate limit / slow pool) → DexScreener chart, Kyvo chart on reopen
    me.watchT = setTimeout(() => { if (me === cur && !me.dead && !me.data && !me.fbAt) fallback(me, L('Wykres Kyvo ładuje się zbyt długo', 'The Kyvo chart is taking too long'), true); }, 12000);
    // v8.9: the chart library can be missing on a slow first visit (service worker 5-s timeout) — load it on demand
    ensureLib().then((ok) => {
      if (me.dead || me !== cur) return;
      if (!ok) { fallback(me, L('Biblioteka wykresu niedostępna', 'Chart library unavailable'), true); return; }
      build(me);
      load(me, true).then(() => pollTrades(me, true));
      schedule(me);
    });
  }
  let libP = null;
  function ensureLib() {
    if (window.LightweightCharts) return Promise.resolve(true);
    if (libP) return libP;
    libP = new Promise((res) => {
      let tries = 0;
      const attempt = () => {
        tries++;
        const sc = document.createElement('script');
        sc.src = 'vendor/lightweight-charts/lightweight-charts.standalone.production.js' + (tries > 1 ? '?r=' + Date.now() : '');
        sc.onload = () => res(!!window.LightweightCharts);
        sc.onerror = () => { sc.remove(); if (tries < 3) setTimeout(attempt, 1500 * tries); else { libP = null; res(false); } };
        document.head.appendChild(sc);
      };
      attempt();
    });
    return libP;
  }

  // v8.14: values are shown as market cap (price × circulating supply implied by DexScreener's mcap/price)
  function setFactor(me) {
    const p = +me.opts.price, m = +me.opts.mcap;
    me.f = isFinite(p) && p > 0 && isFinite(m) && m > 0 ? m / p : 0;
  }
  const V = (me, px) => (me.f ? px * me.f : px);
  const fmtV = (me) => (v) => (me.f ? fmtMc(v) : fmtPrice(v));

  function build(me) {
    const el = me.root.querySelector('.kc-chart');
    const LC = window.LightweightCharts;
    const chart = LC.createChart(el, {
      autoSize: true,
      layout: { background: { type: 'solid', color: 'rgba(0,0,0,0)' }, textColor: '#7d818b', fontSize: 11, fontFamily: "'KyvoInter', Inter, system-ui, sans-serif", attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: '#ffffff07' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 4, fixRightEdge: false,
        tickMarkFormatter: (t) => fmtTime(t, curSec(me)) },
      localization: { locale: (window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL'), priceFormatter: (v) => fmtV(me)(v), timeFormatter: (t) => fmtTime(t, Math.min(curSec(me), 59)) },
      crosshair: { mode: 0, vertLine: { color: '#ffffff40', width: 1, style: 3, labelBackgroundColor: '#1c1c22' }, horzLine: { color: '#ffffff40', width: 1, style: 3, labelBackgroundColor: '#1c1c22' } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });
    const pf = { type: 'custom', formatter: (v) => fmtV(me)(v), minMove: 1e-12 };
    me.area = chart.addAreaSeries({ lineColor: '#3BE58A', topColor: '#3BE58A30', bottomColor: '#3BE58A00', lineWidth: 2, lineType: 2,
      priceFormat: pf, priceLineStyle: 2, priceLineWidth: 1, crosshairMarkerRadius: 5, crosshairMarkerBorderColor: '#ffffff', crosshairMarkerBorderWidth: 2, lastPriceAnimation: 1 });
    me.candles = chart.addCandlestickSeries({
      upColor: '#34E07A', downColor: '#FF5468', borderVisible: false, wickUpColor: '#34E07A', wickDownColor: '#FF5468',
      priceFormat: pf, priceLineStyle: 2,
    });
    me.vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    me.chart = chart;
    applyMode(me);
    const re = () => requestAnimationFrame(() => placeMarks(me));
    chart.timeScale().subscribeVisibleLogicalRangeChange(re);
    chart.subscribeClick(() => hidePop(me));
    if (typeof ResizeObserver !== 'undefined') { me.ro = new ResizeObserver(re); me.ro.observe(el); }
  }
  function applyMode(me) {
    const c = me.mode === 'candle';
    me.area.applyOptions({ visible: !c });
    me.candles.applyOptions({ visible: c });
    me.vol.applyOptions({ visible: c });
    me.chart.applyOptions({ rightPriceScale: { scaleMargins: { top: 0.12, bottom: c ? 0.24 : 0.08 } } });
    me.series = c ? me.candles : me.area;
    requestAnimationFrame(() => placeMarks(me));
  }
  const curSec = (me) => (me.tf.all ? (me.step || allStep(me.opts.createdAt)).sec : me.tf.sec);

  async function resolvePool(me) {
    if (me.pool) return me.pool;
    let d;
    try { d = await chartFetch(`${GT}/networks/${me.opts.network}/tokens/${me.opts.token}/pools?page=1`, 300000, me); }
    catch (e) { if (/404/.test(String(e.message))) throw new Error('no pool'); throw e; }
    const p = d && d.data && d.data[0] && d.data[0].attributes && d.data[0].attributes.address;
    if (!p) throw new Error('no pool');
    me.pool = p;
    return p;
  }
  // v8.9: DexScreener's pair is sometimes unknown to GeckoTerminal (other DEX, or not indexed yet) -> 404 on OHLCV.
  // Then ask GeckoTerminal for the token's own top pool once before giving up on native candles.
  async function withPool(me, fn) {
    try { return await fn(await resolvePool(me)); }
    catch (e) {
      if (!/404/.test(String(e.message)) || me.poolRetried) throw e;
      me.poolRetried = true; me.pool = null;
      return fn(await resolvePool(me));
    }
  }
  // GeckoTerminal public trades (last 300) -> [{id,t,buy,usd,wallet,px}] oldest first
  function parseTrades(d, token) {
    const rows = [];
    for (const r of (d && d.data) || []) {
      const a = r.attributes || {};
      const t = Math.floor(new Date(a.block_timestamp).getTime() / 1000);
      let px = null;
      if (a.from_token_address === token) px = parseFloat(a.price_from_in_usd);
      else if (a.to_token_address === token) px = parseFloat(a.price_to_in_usd);
      else px = parseFloat(a.kind === 'sell' ? a.price_from_in_usd : a.price_to_in_usd);
      if (!isFinite(t) || !isFinite(px) || px <= 0 || a.is_anomalous) continue;
      rows.push({ id: a.tx_hash || r.id, t, buy: a.kind !== 'sell', usd: parseFloat(a.volume_in_usd) || 0, wallet: a.tx_from_address || '', px });
    }
    rows.sort((x, y) => x.t - y.t);
    return rows;
  }
  async function getTrades(me, ttl) {
    const { network, token } = me.opts;
    return withPool(me, async (pool) => parseTrades(await chartFetch(`${GT}/networks/${network}/pools/${pool}/trades`, ttl, me), token));
  }
  function tradesToCandles(rows, sec) {
    const out = [];
    for (const r of rows) {
      const b = r.t - (r.t % sec);
      const last = out[out.length - 1];
      if (last && last.time === b) {
        last.high = Math.max(last.high, r.px); last.low = Math.min(last.low, r.px); last.close = r.px; last.volume += r.usd;
      } else out.push({ time: b, open: last ? last.close : r.px, high: Math.max(r.px, last ? last.close : r.px), low: Math.min(r.px, last ? last.close : r.px), close: r.px, volume: r.usd });
    }
    return out;
  }

  async function getCandles(me, tf) {
    const { network, token } = me.opts;
    const st = tf.all ? allStep(me.opts.createdAt) : tf;
    me.step = st;
    return withPool(me, async (pool) => {
      const d = await chartFetch(`${GT}/networks/${network}/pools/${pool}/ohlcv/${st.tf}?aggregate=${st.agg}&limit=300&currency=usd&token=${encodeURIComponent(token)}`, st.sec >= 3600 ? 120000 : 45000, me);
      const list = (d && d.data && d.data.attributes && d.data.attributes.ohlcv_list) || [];
      const candles = list
        .map((x) => ({ time: x[0], open: +x[1], high: +x[2], low: +x[3], close: +x[4], volume: +x[5] || 0 }))
        .filter((c) => isFinite(c.close) && c.close > 0)
        .sort((a, b) => a.time - b.time);
      const ded = [];
      for (const c of candles) if (!ded.length || ded[ded.length - 1].time !== c.time) ded.push(c);
      // v8.9: a brand-new pool often has no OHLCV yet for 5m+ (or at all) — build 1-min candles from its latest trades instead
      if (ded.length < 3) {
        const rows = await getTrades(me, 6000).catch(() => null);
        const tr = rows && tradesToCandles(rows, 60);
        if (tr && tr.length >= 2) { me.step = ALL_STEPS[0]; ingestTrades(me, rows); return { candles: tr, note: L(`Nowy coin: punkty 1m z ostatnich ${rows.length} transakcji (pełne dane pojawią się, gdy GeckoTerminal je zbierze).`, `New coin: 1m points from the last ${rows.length} trades (full data appears once GeckoTerminal indexes it).`), fromTrades: true }; }
      }
      return { candles: ded, note: '' };
    });
  }

  function setState(me, html) {
    const s = me.root.querySelector('.kc-state');
    if (!s) return;
    s.style.display = html ? '' : 'none';
    if (html) s.innerHTML = html;
  }

  function paint(me, fit) {
    const cs = me.data;
    if (!cs || !me.chart) return;
    const up = V(me, cs[cs.length - 1].close) >= V(me, cs[0].open);
    const col = up ? '#3BE58A' : '#FF5A6E';
    me.area.applyOptions({ lineColor: col, topColor: col + '30', bottomColor: col + '00', priceLineColor: col });
    me.area.setData(cs.map((c) => ({ time: c.time, value: V(me, c.close) })));
    me.candles.setData(cs.map(({ time, open, high, low, close }) => ({ time, open: V(me, open), high: V(me, high), low: V(me, low), close: V(me, close) })));
    me.vol.setData(cs.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#34E07A55' : '#FF546855' })));
    if (fit) { me.chart.timeScale().fitContent(); focusRange(me); }
    applyMarkers(me);
  }

  async function load(me, showSpinner) {
    const tf = me.tf;
    if (me.dead || me.fbAt || !me.chart) return; // v8.9: already on the DexScreener / line fallback
    clearTimeout(me.retryT);
    if (showSpinner && !me.data) setState(me, `<div class="spin"></div>${L('Ładuję wykres…', 'Loading chart…')}`);
    try {
      const { candles, note } = await getCandles(me, tf);
      if (me.dead || me !== cur || me.tf !== tf || !me.chart) return;
      if (!candles.length) {
        if (me.data && !showSpinner) return; // keep the last good candles on a refresh tick
        me.empty = (me.empty || 0) + 1;
        if (me.empty >= 2) { fallback(me, L('GeckoTerminal nie ma jeszcze świec dla tej puli', 'GeckoTerminal has no candles for this pool yet'), true); return; }
        setState(me, `<div>${L('Brak danych jeszcze — coin jest bardzo nowy.', 'No data yet — the coin is very new.')}</div><div class="mut">${L('Ponawiam za chwilę…', 'Retrying shortly…')}</div><button type="button" class="pill kc-ds">${L('Wykres DexScreener', 'DexScreener chart')}</button>`);
        wireDs(me);
        me.retryT = setTimeout(() => me === cur && me.tf === tf && load(me, true), 8000);
        return;
      }
      me.fails = 0; me.empty = 0;
      me.data = candles;
      me.chart.applyOptions({ timeScale: { secondsVisible: candles[1] && candles[1].time - candles[0].time < 60 } });
      paint(me, showSpinner);
      const sec = curSec(me);
      const lbl = tf.all ? L('Wszystko', 'All') + ' (' + (sec >= 86400 ? '1D' : sec >= 3600 ? sec / 3600 + 'h' : sec / 60 + 'm') + ')' : tf.id;
      me.root.querySelector('.kc-note').textContent = note || L(`MC · ${lbl} · ${candles.length} pkt · na żywo`, `MC · ${lbl} · ${candles.length} pts · live`);
      me.root.dataset.rendered = String(candles.length);
      me.root.dataset.tf = tf.id;
      me.loadedAt = Date.now();
      fbMemo.delete(me.key);
      setState(me, '');
    } catch (e) {
      if (me.dead || me !== cur || me.tf !== tf || me.fbAt || !me.chart) return;
      me.fails++;
      const msg = String(e && e.message);
      if (me.data && !showSpinner) return; // refresh tick failed: keep showing the last candles, next tick retries
      if (/no pool|404/.test(msg)) { fallback(me, L('GeckoTerminal nie zna jeszcze tej puli', 'GeckoTerminal does not know this pool yet'), true); return; }
      if (me.fails <= 3) {
        // v8.9: exponential backoff 3 s → 6 s → 12 s (rate limit, timeout, flaky mobile network), then DexScreener
        const wait = 3000 * Math.pow(2, me.fails - 1);
        setState(me, `<div class="spin"></div>${msg === 'limit' ? L('Limit zapytań GeckoTerminal', 'GeckoTerminal rate limit') : msg === 'timeout' ? L('Wolne połączenie', 'Slow connection') : L('Problem z danymi', 'Data problem')} — ${L('ponawiam', 'retrying')} (${me.fails}/3)…`);
        me.retryT = setTimeout(() => me === cur && me.tf === tf && load(me, true), wait);
        return;
      }
      fallback(me, L('GeckoTerminal nie odpowiada', 'GeckoTerminal is not responding'), true);
    }
  }

  function wireDs(me) {
    const b = me.root.querySelector('.kc-ds');
    if (b) b.onclick = () => fallback(me, '');
  }

  /* ---------- v8.14: live trades stream (left) ---------- */
  function whaleMin(me) {
    const xs = me.trades.map((r) => r.usd).sort((a, b) => a - b);
    const p95 = xs.length >= 20 ? xs[Math.floor(xs.length * 0.95)] : Infinity;
    return Math.max(1500, Math.min(p95, 10000));
  }
  function ingestTrades(me, rows) {
    let fresh = 0;
    for (const r of rows) {
      if (me.seen.has(r.id)) continue;
      me.seen.add(r.id); me.trades.push(r); fresh++;
      if (me.primed) r.fresh = true;
    }
    me.trades.sort((a, b) => a.t - b.t);
    if (me.trades.length > 600) { const drop = me.trades.splice(0, me.trades.length - 600); drop.forEach((r) => me.seen.delete(r.id)); }
    me.primed = true;
    return fresh;
  }
  function renderStream(me, full) {
    const box = me.root.querySelector('.kc-stream');
    if (!box || !me.streamOn) return;
    const wm = whaleMin(me), big = Math.max(300, wm / 3);
    const known = me.opts.wallets || {};
    const rows = me.trades.slice(-26).reverse();
    box.innerHTML = rows.map((r) => {
      const k = known[r.wallet];
      const cls = (r.buy ? 'b' : 's') + (r.usd >= wm ? ' w' : r.usd >= big ? ' g' : '') + (r.fresh && !full ? ' nw' : '') + (k ? ' k' : '');
      return `<div class="kt ${cls}"><i>${r.buy ? '▲' : '▼'}</i>${fmtUsdS(r.usd)}${k ? `<em>${escH((k.name || '?').slice(0, 1).toUpperCase())}</em>` : r.usd >= wm ? '<em class="wh">🐋</em>' : ''}</div>`;
    }).join('');
    rows.forEach((r) => { r.fresh = false; });
    me.root.dataset.trades = String(me.trades.length);
  }
  // keep the last point moving between OHLCV refreshes
  function liveTick(me) {
    if (!me.data || !me.data.length || !me.trades.length) return;
    const sec = curSec(me), last = me.data[me.data.length - 1];
    const newer = me.trades.filter((r) => r.t >= last.time && !r.ticked);
    if (!newer.length) return;
    for (const r of newer) {
      r.ticked = true;
      const b = r.t - (r.t % sec), tail = me.data[me.data.length - 1];
      if (b < tail.time) continue;
      if (b === tail.time) { tail.high = Math.max(tail.high, r.px); tail.low = Math.min(tail.low, r.px); tail.close = r.px; tail.volume += r.usd; }
      else me.data.push({ time: b, open: tail.close, high: Math.max(tail.close, r.px), low: Math.min(tail.close, r.px), close: r.px, volume: r.usd });
      const t = me.data[me.data.length - 1];
      try {
        me.area.update({ time: t.time, value: V(me, t.close) });
        me.candles.update({ time: t.time, open: V(me, t.open), high: V(me, t.high), low: V(me, t.low), close: V(me, t.close) });
      } catch (e) {}
    }
    if (me.opts.onLive) me.opts.onLive(V(me, me.data[me.data.length - 1].close), me.data[me.data.length - 1].close);
  }
  async function pollTrades(me, now) {
    clearTimeout(me.tradeT);
    if (me.dead || me !== cur || me.fbAt) return;
    const next = () => { me.tradeT = setTimeout(() => pollTrades(me), me.streamOn ? 8000 : 20000); };
    if (!now && (document.hidden || !me.root.isConnected)) { next(); return; }
    try {
      const rows = await getTrades(me, 5000);
      if (me.dead || me !== cur) return;
      const fresh = ingestTrades(me, rows);
      if (fresh || now) { renderStream(me, !!now); liveTick(me); applyMarkers(me); }
    } catch (e) { /* rate-limit noise: next tick */ }
    next();
  }

  /* ---------- v8.14: trader markers (KOL / pump.fun traders / whales) as HTML avatars ---------- */
  function markerEvents(me) {
    const known = me.opts.wallets || {};
    const ev = [], seen = new Set();
    const wm = whaleMin(me);
    for (const r of me.trades) {
      const k = known[r.wallet];
      if (!k && r.usd < wm) continue;
      seen.add(r.id);
      ev.push({ t: r.t, buy: r.buy, usd: r.usd, wallet: r.wallet, px: r.px, who: k || null, whale: !k, tx: r.id });
    }
    for (const r of me.opts.pfTrades || []) { // pump.fun's own "top traders" trades for this coin (server-side feed)
      if (seen.has(r.tx)) continue; seen.add(r.tx);
      const k = known[r.wallet] || { name: (r.wallet || '').slice(0, 4), src: 'pumpfun' };
      ev.push({ t: r.at, buy: r.buy, usd: r.usd, wallet: r.wallet, px: r.px, who: k, whale: false, tx: r.tx });
    }
    for (const b of me.opts.smBuys || []) { // Kyvo's on-chain smart-money feed
      const id = b.signature || b.tx || (b.tx_url || '').split('/').pop();
      if (id && seen.has(id)) continue; if (id) seen.add(id);
      if (!b.block_time) continue;
      const k = known[b.wallet] || { name: b.wallet_name || 'KOL', handle: b.handle, src: 'kyvo' };
      ev.push({ t: b.block_time, buy: b.side !== 'sell', usd: +b.usd_size || 0, wallet: b.wallet, px: null, who: k, whale: false, tx: id });
    }
    return ev;
  }
  function nearestIdx(data, t) {
    let lo = 0, hi = data.length - 1;
    if (t < data[0].time) return -1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (data[m].time <= t) lo = m; else hi = m - 1; }
    return lo;
  }
  function applyMarkers(me) {
    if (!me.series || !me.data || !me.data.length) return;
    const groups = new Map();
    for (const e of markerEvents(me)) {
      const i = nearestIdx(me.data, e.t);
      if (i < 0) continue;
      const key = me.data[i].time + (e.buy ? 'b' : 's');
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { time: me.data[i].time, idx: i, buy: e.buy, ev: [] }));
      g.ev.push(e);
    }
    me.groups = [...groups.values()].sort((a, b) => a.time - b.time);
    me.root.dataset.markers = String(me.groups.length);
    placeMarks(me);
  }
  function avatarOf(e) {
    const w = e.who;
    if (!w) return '<b class="km-i">🐋</b>';
    if (w.img) return `<img src="${escH(w.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('b'),{className:'km-i',textContent:${escH(JSON.stringify((w.name || '?').slice(0, 1).toUpperCase()))}}))">`;
    return `<b class="km-i">${escH((w.name || '?').slice(0, 1).toUpperCase())}</b>`;
  }
  function placeMarks(me) {
    const lay = me.root && me.root.querySelector('.kc-marks');
    if (!lay || !me.chart || !me.series || !me.groups) return;
    const ts = me.chart.timeScale();
    const W = lay.clientWidth - 58; // keep off the right axis
    const html = [];
    const used = [];
    me.groups.forEach((g, gi) => {
      const x = ts.timeToCoordinate(g.time);
      const c = me.data[g.idx];
      if (x == null || !c) return;
      const v = V(me, me.mode === 'candle' ? (g.buy ? c.low : c.high) : c.close);
      let y = me.series.priceToCoordinate(v);
      if (y == null || x < 0 || x > W) return;
      y += g.buy ? 16 : -16; // buys under the line, sells above (pump.fun style)
      for (const u of used) if (Math.abs(u[0] - x) < 18 && Math.abs(u[1] - y) < 18) y += g.buy ? 18 : -18;
      used.push([x, y]);
      const e0 = g.ev.slice().sort((a, b) => (b.who ? 1 : 0) - (a.who ? 1 : 0) || b.usd - a.usd)[0];
      const n = g.ev.length;
      html.push(`<button type="button" class="km ${g.buy ? 'b' : 's'}${e0.who ? '' : ' wh'}" data-g="${gi}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px">${n > 1 ? `<span class="km-n">${n}</span>` : ''}${avatarOf(e0)}</button>`);
    });
    lay.innerHTML = html.join('');
    lay.querySelectorAll('.km').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); showPop(me, me.groups[+b.dataset.g], b); }));
  }
  function profileUrl(w, wallet) {
    if (w && w.url) return w.url;
    return wallet ? 'https://solscan.io/account/' + wallet : '';
  }
  function showPop(me, g, btn) {
    const pop = me.root.querySelector('.kc-pop');
    if (!g || !pop) return;
    const rows = g.ev.slice().sort((a, b) => b.usd - a.usd).slice(0, 8).map((e) => {
      const w = e.who;
      const name = w ? w.name : L('Wieloryb', 'Whale') + ' ' + (e.wallet ? e.wallet.slice(0, 4) + '…' + e.wallet.slice(-4) : '');
      const src = w && w.src ? `<span class="kp-src">${escH(w.src === 'pumpfun' ? 'pump.fun' : w.src)}</span>` : '';
      const url = profileUrl(w, e.wallet);
      return `<div class="kp-row"><span class="kp-av">${avatarOf(e)}</span><span class="kp-nm">${url ? `<a href="${escH(url)}" target="_blank" rel="noopener noreferrer">${escH(name)}</a>` : escH(name)}${src}<small class="mut">${agoS(e.t)} ${L('temu', 'ago')}</small></span>
        <b class="${e.buy ? 'up' : 'dn'}">${e.buy ? L('kupił', 'bought') : L('sprzedał', 'sold')} ${e.usd ? fmtUsdS(e.usd) : ''}</b>${e.wallet && window.KyvoTracker ? window.KyvoTracker.btnHtml({ address: e.wallet, name: w ? w.name : '', img: w && (w.img || w.avatar), src: w && w.src }, 'sm') : ''}</div>`;
    }).join('');
    pop.innerHTML = `<button type="button" class="kc-pop-x" aria-label="${L('Zamknij', 'Close')}">×</button>${rows}${g.ev.length > 8 ? `<div class="mut" style="font-size:11px">+${g.ev.length - 8}</div>` : ''}`;
    pop.hidden = false;
    const box = me.root.querySelector('.kc-box');
    const bw = box.clientWidth, x = parseFloat(btn.style.left), y = parseFloat(btn.style.top);
    const pw = Math.min(260, bw - 16);
    pop.style.width = pw + 'px';
    pop.style.left = Math.max(8, Math.min(bw - pw - 8, x - pw / 2)) + 'px';
    pop.style.top = (y > box.clientHeight / 2 ? Math.max(6, y - 14 - pop.offsetHeight) : y + 16) + 'px';
  }
  function hidePop(me) { const p = me.root && me.root.querySelector('.kc-pop'); if (p) p.hidden = true; }

  // v8.9 fallback chain: GeckoTerminal candles → DexScreener embed (15-s load watchdog) → simple line from DexScreener % changes.
  function fallback(me, why, transient) {
    clearInterval(me.timer);
    clearTimeout(me.watchT);
    clearTimeout(me.retryT);
    clearTimeout(me.tradeT);
    try { me.ro && me.ro.disconnect(); } catch (e) {}
    try { me.chart && me.chart.remove(); } catch (e) {}
    me.chart = null; me.data = null; me.series = null;
    me.fbTransient = !!transient; me.fbAt = Date.now();
    if (transient && me.key) fbMemo.set(me.key, me.fbAt); else if (me.key) fbMemo.delete(me.key);
    const { dsChain, pair, token } = me.opts;
    const src = `https://dexscreener.com/${encodeURIComponent(dsChain || 'solana')}/${encodeURIComponent(pair || token)}?embed=1&theme=dark&info=0&trades=0`;
    me.root.querySelectorAll('.kc-tfs,.kc-mode,.kc-st,.kc-sep').forEach((x) => { x.style.display = 'none'; });
    const box = me.root.querySelector('.kc-box');
    box.classList.remove('st-on');
    box.innerHTML = `<iframe class="kc-iframe" src="${src}" title="DexScreener chart" referrerpolicy="no-referrer" allow="clipboard-write"></iframe><div class="kc-state"><div class="spin"></div>${L('Ładuję wykres DexScreener…', 'Loading DexScreener chart…')}</div>`;
    const ifr = box.querySelector('iframe');
    let loaded = false;
    ifr.addEventListener('load', () => { loaded = true; const st = box.querySelector('.kc-state'); if (st) st.style.display = 'none'; me.root.dataset.dsLoaded = '1'; });
    me.retryT = setTimeout(() => { if (!loaded && me === cur && !me.dead) line(me, L('DexScreener nie odpowiada', 'DexScreener is not responding')); }, 15000);
    me.root.querySelector('.kc-note').innerHTML = (why ? why.replace(/[<>]/g, '') + L(' — pokazuję wykres DexScreener.', ' — showing the DexScreener chart.') : L('Wykres DexScreener.', 'DexScreener chart.')) +
      (me.opts.network ? ` <button type="button" class="pill kc-again" style="margin-left:6px">${L('Spróbuj wykres Kyvo', 'Try the Kyvo chart')}</button>` : '');
    const ag = me.root.querySelector('.kc-again');
    if (ag) ag.onclick = () => { const slot = me.root.parentNode, o = me.opts; fbMemo.delete(me.key); me.fbAt = 0; me.fbTransient = true; me.root.dataset.retry = '1'; if (slot) { destroy(); mount(slot, o); } };
    me.root.querySelector('.kc-attr').innerHTML = L('Wykres', 'Chart') + ': <a href="https://dexscreener.com/" target="_blank" rel="noopener">DexScreener</a> (embed)';
    me.root.dataset.fallback = '1';
  }

  // last resort: 5 points (24 h, 6 h, 1 h, 5 min ago, now) rebuilt from DexScreener's price + % changes — always available
  function line(me, why) {
    const p = +me.opts.price, ch = me.opts.change || {};
    const box = me.root.querySelector('.kc-box');
    const now = Math.floor(Date.now() / 1000);
    const pts = [];
    if (isFinite(p) && p > 0) {
      for (const [k, sec] of [['h24', 86400], ['h6', 21600], ['h1', 3600], ['m5', 300]]) {
        const v = ch[k];
        if (v != null && isFinite(v) && v > -100) pts.push({ time: now - sec, value: p / (1 + v / 100) });
      }
      pts.push({ time: now, value: p });
    }
    if (pts.length < 2) {
      box.innerHTML = `<div class="kc-state"><div>${L('Brak danych jeszcze — wykres pojawi się, gdy coin złapie pierwsze transakcje.', 'No data yet — the chart appears once the coin gets its first trades.')}</div><button type="button" class="pill kc-again2">${L('Spróbuj ponownie', 'Try again')}</button></div>`;
      const b = box.querySelector('.kc-again2');
      if (b) b.onclick = () => { const slot = me.root.parentNode, o = me.opts; fbMemo.delete(me.key); if (slot) { destroy(); mount(slot, o); } };
      me.root.dataset.empty = '1';
      return;
    }
    const lo = Math.min(...pts.map((x) => x.value)), hi = Math.max(...pts.map((x) => x.value)), W = 600, H = 260;
    const X = (t) => ((t - pts[0].time) / (now - pts[0].time)) * (W - 20) + 10, Y = (v) => H - 20 - ((v - lo) / (hi - lo || 1)) * (H - 40);
    const up = pts[pts.length - 1].value >= pts[0].value;
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polyline fill="none" stroke="${up ? '#34E07A' : '#FF5468'}" stroke-width="2.5" points="${pts.map((x) => X(x.time).toFixed(1) + ',' + Y(x.value).toFixed(1)).join(' ')}"/>${pts.map((x) => `<circle cx="${X(x.time).toFixed(1)}" cy="${Y(x.value).toFixed(1)}" r="3.5" fill="${up ? '#34E07A' : '#FF5468'}"/>`).join('')}</svg>`;
    me.root.querySelector('.kc-note').textContent = `${why ? why + ' — ' : ''}${L('uproszczony wykres z % zmian (24h · 6h · 1h · 5m · teraz).', 'simplified chart from % changes (24h · 6h · 1h · 5m · now).')}`;
    me.root.dataset.line = String(pts.length);
  }

  function schedule(me) {
    clearInterval(me.timer);
    const every = curSec(me) <= 300 ? 45000 : 90000;
    me.timer = setInterval(() => {
      if (me !== cur || !me.root.isConnected) return;
      if (document.hidden || !me.chart) return;
      load(me, false);
    }, every);
  }

  window.KyvoChart = { mount, destroy, TFS, current: () => cur, line: (o) => cur && line(cur, o || ''), fmtMc };
  window.KyvoGT = { fetch: gtFetch };
})();
