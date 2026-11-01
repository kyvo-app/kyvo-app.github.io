/* Kyvo v8.30 — 🎮 GTA 6 tab (FREE for everyone, no Premium gate).
   One place for the GTA 6 meta: new GTA coins, GTA coins going up (runners), the biggest GTA coins and GTA tweets.
   Sources (all already used by the app, nothing paid):
     • DexScreener public search (browser, CORS ok) for a few GTA queries — ≤ 8 calls per refresh, refresh every ~90 s and
       ONLY while this tab is open (DexScreener allows ~300 search calls / min; GeckoTerminal is NOT used here)
     • coins already loaded by the app (Pulse / New Pairs / Runner universe) whose name matches GTA
     • data/x_live.json (New Tweet feed, tools/x_live.py) — tweets that mention GTA + the GTA accounts (role "gta" in
       tools/x_accounts.json: @RockstarGames, @GTAVI_Countdown, @RockstarIntel), kept 72 h for GTA instead of 12 h
     • data/pf_social.json (pump.fun callouts, tools/pump_social.py) — a coin with ≥ 3 pump.fun callouts about GTA joins the
       list even when its name is not "GTA" (e.g. a GTA character / in-game meme coin). Missing files = section just empty.
   Matching is STRICT on purpose: "GTA" / "GTA 6" / "GTA VI" / "Grand Theft" / "Vice City" / "Leonida" / "Los Santos" /
   full character names ("Jason Duval", "Lucia Caminos" …). A bare "Jason" / "Lucia" / "Trevor" or a "$GTA" ticker with an
   unrelated name ("Giga Titty Ass") does NOT count on its own.
   Kyvo Runner badges stay behind the normal Runner gate (RunnerGate.unlocked) — the tab itself is free, a locked Runner is
   never revealed here. v8.31: server push '🎮 GTA' (tools/gta_push.py + kyvo_push.py, opt-out tag "gta" = the 🎮 GTA 6 switch in notify.js); this tab itself never notifies. */
(function () {
  'use strict';
  const STRONG = [
    /(^|[^a-z0-9])gta ?(6|vi|v|iv|5|online)?([^a-z0-9]|$)/,
    /(^|[^a-z0-9])gta(6|vi|v|iv|5)([^a-z0-9]|$)/,
    /grand ?theft/, /(^|[^a-z0-9])theft ?auto/,
    /vice ?city/, /(^|[^a-z0-9])leonida([^a-z0-9]|$)/, /(^|[^a-z0-9])los ?santos([^a-z0-9]|$)/, /liberty ?city/,
    /rockstar ?games/, /jason ?duval/, /lucia ?caminos/, /tommy ?vercetti/, /niko ?bellic/, /trevor ?philips/, /franklin ?clinton/,
  ];
  const MEDIUM = [/(^|[^a-z0-9])(jason|lucia|trevor|cj|rockstar|wasted|vice|duval|caminos)([^a-z0-9]|$)/, /san ?andreas/];
  const SYM_OK = /^(gta ?6|gta ?vi|gta ?v|gta ?iv|gta ?5|gta ?online|gta ?6 ?coin|vicecity|vice ?city|leonida|lossantos)$/;
  const QUERIES = ['gta 6', 'gta vi', 'gta6', 'gta', 'grand theft auto', 'vice city', 'leonida', 'los santos'];
  const REFRESH_MS = 90000, TWEET_H = 72, PF_MIN = 3, FRESH_MC = 5000;   // ≥ 3 GTA callouts; a new coin below $5K MC already dumped under the pump.fun start

  const norm = (s) => String(s || '').toLowerCase().replace(/[\u2019'`]/g, '').replace(/[^a-z0-9#]+/g, ' ').replace(/\s+/g, ' ').trim();
  const strong = (s) => { const n = norm(s); return !!n && STRONG.some((r) => r.test(n)); };
  const medium = (s) => { const n = norm(s); return !!n && MEDIUM.some((r) => r.test(n)); };
  /* coin -> null | 'name' | 'symbol' | 'desc' | 'calls' */
  function matchCoin(c, pfCalls) {
    if (!c) return null;
    const nm = c.name || '', sy = c.symbol || '', ds = c.description || '';
    if (strong(nm)) return 'name';
    if (SYM_OK.test(norm(sy))) return 'symbol';
    if (strong(ds) && (medium(nm) || medium(sy) || strong(sy))) return 'desc';
    if ((pfCalls || 0) >= PF_MIN) return 'calls';
    return null;
  }
  const matchText = (t) => strong(t);

  let ctx = null;
  const S = { coins: {}, at: 0, busy: false, err: '', pf: null, pfAt: 0, added: null, addedAt: 0, sec: 'all', timer: null, first: true };
  const L2 = (pl, en) => (ctx && ctx.isEn() ? en : pl);

  async function loadPf() {
    if (S.pf && Date.now() - S.pfAt < 5 * 60e3) return S.pf;
    try { const r = await fetch('data/pf_social.json?t=' + Math.floor(Date.now() / 300000)); S.pf = r.ok ? await r.json() : (S.pf || {}); } catch (e) { S.pf = S.pf || {}; }
    S.pfAt = Date.now();
    return S.pf;
  }
  /* v8.32 '📈 od dodania': data/gta_added.json (written by tools/gta_push.py every ~240 s) = first time Kyvo saw each GTA coin
     (or its 🎮 GTA push): px0 = price then, max = highest price seen since. Missing file -> no badge. */
  async function loadAdded() {
    if (S.added && Date.now() - S.addedAt < 4 * 60e3) return S.added;
    try { const r = await fetch('data/gta_added.json?t=' + Math.floor(Date.now() / 240000)); const j = r.ok ? await r.json() : null; S.added = (j && j.coins) || S.added || {}; } catch (e) { S.added = S.added || {}; }
    S.addedAt = Date.now();
    return S.added;
  }
  function sinceAdded(c) {
    const e = S.added && S.added[String(ctx.keyOf(c) || '').toLowerCase()];
    const px = Number(c.priceUsd);
    if (!e || !(e.px0 > 0) || !(px > 0)) return null;
    const pct = (px / e.px0 - 1) * 100, max = (Math.max(e.max || 0, px) / e.px0 - 1) * 100;
    return { pct, max, h: Math.max(0, (Date.now() / 1000 - e.t) / 3600), push: e.src === 'push' };
  }
  const fmtPct = (v) => (v >= 0 ? '+' : '−') + (Math.abs(v) >= 1000 ? ctx.fmtInt(Math.round(Math.abs(v))) : Math.abs(v) >= 10 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1)) + '%';
  /* pump.fun callouts about GTA: mint -> { n, text } (only the text of the first matching callout, for the "why" line) */
  function pfGta() {
    const out = {};
    const coins = (S.pf && S.pf.coins) || {};
    for (const m in coins) {
      const cs = (coins[m] && coins[m].callouts) || [];
      const hit = cs.filter((x) => matchText(x && x.thesis));
      if (hit.length) out[m] = { n: hit.length, of: cs.length };
    }
    return out;
  }

  async function refresh(force) {
    if (S.busy || (!force && Date.now() - S.at < REFRESH_MS)) return;
    S.busy = true; S.err = '';
    try {
      await loadPf();
      const pg = pfGta();
      const extra = Object.keys(pg).filter((m) => pg[m].n >= PF_MIN);
      const live = ctx.getLive() || {};
      for (const t of live.tweets || []) for (const c of t.coins || []) if (c && c.address && (matchText(c.name) || matchText(c.symbol))) extra.push(c.address);
      const map = await ctx.fetchCoins(QUERIES, [...new Set(extra)].slice(0, 30));
      const fresh = {};
      for (const c of Object.values(map)) { const why = matchCoin(c, (pg[c.address] || {}).n); if (why) fresh[ctx.keyOf(c)] = Object.assign(c, { _gta: why, _pf: pg[c.address] || null }); }
      // a search answer can hold only the dead pump.fun curve pair of a coin that already migrated -> one re-check (≤ 30)
      const curve = Object.values(fresh).filter((c) => c.onCurve && ((c.volume && c.volume.h24) || 0) > 300).map((c) => c.address).slice(0, 30);
      if (curve.length) { const m2 = await ctx.fetchCoins([], curve); for (const c of Object.values(m2)) { const k = ctx.keyOf(c); if (fresh[k]) fresh[k] = Object.assign(c, { _gta: fresh[k]._gta, _pf: fresh[k]._pf }); } }
      if (Object.keys(fresh).length || !Object.keys(S.coins).length) S.coins = fresh;
      S.at = Date.now();
    } catch (e) { S.err = String((e && e.message) || e); S.at = Date.now() - REFRESH_MS + 20000; }
    finally { S.busy = false; }
  }

  function pool() {
    const m = Object.assign({}, S.coins);
    for (const c of ctx.universe()) { const k = ctx.keyOf(c); if (!m[k]) { const why = matchCoin(c, 0); if (why) m[k] = Object.assign({}, c, { _gta: why }); } }
    // Kyvo Runner flags (server feed) whose coin is GTA — only when the user may see that Runner
    for (const x of ctx.runners()) if (x && x.c && !m[x.key] && matchCoin(x.c, 0) && ctx.unlocked(x.key)) m[x.key] = Object.assign({}, x.c, { _gta: 'name' });
    const ch = ctx.chain();
    return Object.values(m).filter((c) => c && c.address && (ch === 'all' || !ch || c.chainId === ch));
  }
  const vol = (c, f) => (c.volume && c.volume[f]) || 0;
  const chg = (c, f) => (c.change && c.change[f] != null && isFinite(c.change[f]) ? c.change[f] : null);
  const ageH = (c) => { const t = c.pairCreatedAt; return t && t > 1.6e12 ? (Date.now() - t) / 3.6e6 : null; };   // DexScreener sometimes sends 0 / junk
  const sane = (c) => !(c.mcap > 2e9 && vol(c, 'h24') < 1e6);   // "MC $12B" with $991 volume = broken supply

  function lists() {
    const all = pool().filter(sane);
    let freshH = 24;
    let fresh = all.filter((c) => { const a = ageH(c); return a != null && a <= freshH && (c.mcap || 0) >= FRESH_MC && (a < 1 || vol(c, 'h24') >= 150); });
    if (fresh.length < 4) { freshH = 72; fresh = all.filter((c) => { const a = ageH(c); return a != null && a <= freshH && (c.mcap || 0) >= FRESH_MC && (a < 1 || vol(c, 'h24') >= 150); }); }
    fresh.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
    const upScore = (c) => { const h1 = Math.min(chg(c, 'h1') || 0, 800), h6 = Math.min(chg(c, 'h6') || 0, 2000); return (Math.max(0, h1) + Math.max(0, h6) * 0.3) * Math.log10(10 + vol(c, 'h1')); };
    const up = all.filter((c) => (vol(c, 'h1') >= 1500 || vol(c, 'h24') >= 15000) && ((c.liquidity || 0) >= 5000 || c.onCurve) && ((chg(c, 'h1') || 0) >= 8 || (chg(c, 'h6') || 0) >= 25))
      .sort((a, b) => upScore(b) - upScore(a));
    const top = all.filter((c) => (c.mcap || 0) >= 50000 && vol(c, 'h24') >= 10000).sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
    const added = all.filter((c) => (c._sa = sinceAdded(c))).sort((a, b) => b._sa.pct - a._sa.pct);
    return { all, fresh: fresh.slice(0, 30), freshH, up: up.slice(0, 20), top: top.slice(0, 15), added: added.slice(0, 40) };
  }

  function gtaTweets() {
    const now = Date.now(), seen = new Set(), out = [];
    const live = ctx.getLive() || {};
    const viral = ctx.getViral() || {};
    const src = (live.tweets || []).concat(viral.posts || [], viral.trader_tweets || []);
    for (const t of src) {
      if (!t) continue;
      const id = String(t.id || t.url || ''); if (!id || seen.has(id)) continue;
      const at = new Date(t.created_at || t.posted_at).getTime(); if (!isFinite(at) || now - at > TWEET_H * 3.6e6) continue;
      const txt = [t.text, t.quote && t.quote.text, t.reply_to && t.reply_to.text].concat((t.coins || []).map((c) => (c.name || '') + ' ' + (c.symbol || ''))).join(' \n ');
      if (t.role !== 'gta' && !matchText(txt)) continue;
      seen.add(id); out.push(Object.assign({}, t, { _at: at }));
    }
    return out.sort((a, b) => b._at - a._at);
  }

  function extraLine(c, runnerOf) {
    const bits = [];
    const sa = c._sa;
    if (sa) {
      bits.push(`<span class="gta-chip sa ${sa.pct >= 0 ? 'up' : 'dn'}">${sa.pct >= 0 ? '📈' : '📉'} ${fmtPct(sa.pct)} ${L2(sa.push ? 'od pusha' : 'od dodania', sa.push ? 'since push' : 'since added')}</span>`);
      if (sa.max >= 1 && sa.max - sa.pct >= 1) bits.push(`<span class="gta-chip up">max ${fmtPct(sa.max)}</span>`);
      bits.push(`<span class="gta-chip">🕒 ${L2(sa.push ? 'push' : 'dodany', sa.push ? 'pushed' : 'added')} ${sa.h < 1 / 60 ? L2('teraz', 'now') : ctx.esc(ctx.ageLabelH(sa.h)) + ' ' + L2('temu', 'ago')}</span>`);
    }
    const a = ageH(c);
    if (a != null && a < 24) bits.push(`<span class="gta-chip new">🆕 ${L2('nowy', 'new')}</span>`);   // the row already shows the exact age
    const r = runnerOf[ctx.keyOf(c)];
    if (r) bits.push(`<span class="gta-chip run">🏃 ${L2('Runner Kyvo', 'Kyvo Runner')}</span>`);
    if (c._pf && c._pf.n) bits.push(`<span class="gta-chip pf">📣 ${c._pf.n} ${L2(c._pf.n === 1 ? 'call o GTA' : 'calli o GTA', c._pf.n === 1 ? 'GTA call' : 'GTA calls')} · pump.fun</span>`);
    const h6 = chg(c, 'h6');
    if (h6 != null && Math.abs(h6) >= 1) bits.push(`<span class="gta-chip ${h6 > 0 ? 'up' : 'dn'}">${h6 > 0 ? '+' : ''}${Math.round(h6)}% 6h</span>`);
    return bits.length ? `<div class="gta-x">${bits.join('')}</div>` : '';
  }

  function tweetCard(t) {
    const h = (Date.now() - t._at) / 3.6e6;
    const q = t.quote, m = (t.media || [])[0];
    const cs = (t.coins || []).slice(0, 2);
    const badge = t.handle && /^rockstargames$/i.test(t.handle) ? '<span class="badge live">Rockstar</span>' : t.role === 'gta' ? '<span class="badge demo">GTA</span>' : t.role === 'celebrity' ? '<span class="badge demo">VIP</span>' : t.role === 'news' ? '<span class="badge demo">NEWS</span>' : '';
    return `<div class="card post vtweet${h < 2 ? ' fresh' : ''}">
      <div class="meta">${ctx.imgTag(t.avatar, 'av', 36)}
        <div style="flex:1;min-width:0"><b style="font-size:13.5px">${ctx.esc(t.author_name || t.handle || '')} <span class="mut">@${ctx.esc(t.handle || '')}</span> ${badge}</b>
        <div class="mut" style="font-size:11.5px">${t.author_followers != null ? `👥 ${ctx.fmtInt(t.author_followers)} · ` : ''}🕒 ${ctx.esc(ctx.exactTime(t.created_at || t.posted_at))} · <b class="${h < 2 ? 'up' : ''}">${ctx.esc(ctx.ageLabelH(h))} ${L2('temu', 'ago')}</b></div></div>
        ${t.url ? `<a href="${ctx.esc(t.url)}" target="_blank" rel="noopener noreferrer" class="vx" aria-label="X">𝕏</a>` : ''}</div>
      <div class="txt vq${String(t.text || '').length > 190 ? ' long' : ''}">${ctx.tweetText(t.text)}</div>
      ${q && q.text ? `<div class="twq"><span class="mut">↪ @${ctx.esc(q.handle || '')}:</span> ${ctx.esc(q.text.length > 200 ? q.text.slice(0, 200) + '…' : q.text)}</div>` : ''}
      ${m && m.url ? `<a class="twimg" href="${ctx.esc(t.url)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="${ctx.esc(m.url)}" alt="" onerror="this.parentNode.remove()">${m.type !== 'photo' ? '<span>▶</span>' : ''}</a>` : ''}
      ${cs.length ? `<div class="mchip ${(cs[0].rel || 'named') === 'related' ? 'rel' : 'named'}" translate="no">${(cs[0].rel || 'named') === 'related' ? '🔗 ' + L2('Coin o tym tweecie', 'Coin about this tweet') : '✅ ' + L2('Coin z tweeta', 'Coin in the tweet')}</div><div class="vcoins vcoins-t">${cs.map((c) => ctx.vCoinHtml(c)).join('')}</div>` : ''}
    </div>`;
  }

  function render() {
    const body = document.getElementById('gtaBody'); if (!body || !ctx) return;
    const L = lists(), tw = gtaTweets();
    const runnerOf = {}; for (const x of ctx.runners()) if (x && x.key && ctx.unlocked(x.key)) runnerOf[x.key] = x;
    for (const c of L.all) ctx.remember(c);
    const sec = S.sec, isAll = sec === 'all';
    const rows = (list, n) => list.length ? `<div class="card" style="padding:4px 10px">${list.slice(0, n).map((c) => ctx.coinRow(c, { listId: 'gta:' + ctx.chain(), extraHtml: extraLine(c, runnerOf) })).join('')}</div>` : '';
    const more = (id, list, n) => isAll && list.length > n ? `<button type="button" class="gta-more" data-gsec="${id}">${L2('Pokaż wszystkie', 'Show all')} (${list.length}) →</button>` : '';
    const loading = S.busy && !L.all.length && S.first;
    const empty = (txt) => `<div class="empty" style="padding:16px 10px">${txt}</div>`;
    const head = (ico, t, n, sub) => `<div class="h gta-h" translate="no">${ico} ${t} <span class="mut" style="font-size:12px;font-weight:700">${n}</span></div>${sub ? `<div class="sub">${sub}</div>` : ''}`;
    const nF = isAll ? 6 : 30, nU = isAll ? 6 : 20, nT = isAll ? 5 : 15, nW = isAll ? 4 : 40;
    const secFresh = `${head('🆕', L2('Nowe GTA coiny', 'New GTA coins'), L.fresh.length, L2(L.freshH === 24 ? 'Wystartowały w ostatnich 24 h · najnowsze na górze' : 'Wystartowały w ostatnich 3 dniach · najnowsze na górze', L.freshH === 24 ? 'Launched in the last 24 h · newest first' : 'Launched in the last 3 days · newest first'))}
      ${rows(L.fresh, nF) || (loading ? '' : empty(L2('Teraz brak nowych GTA coinów z handlem. Sprawdzamy co 90 s.', 'No new GTA coins with trading right now. We check every 90 s.')))}${more('new', L.fresh, nF)}`;
    const secUp = `${head('🚀', L2('GTA idą w górę', 'GTA coins going up'), L.up.length, L2('Rosną teraz (1 h / 6 h) z prawdziwym wolumenem · Runnery GTA', 'Rising now (1 h / 6 h) with real volume · GTA runners'))}
      ${rows(L.up, nU) || (loading ? '' : empty(L2('Teraz żaden GTA coin nie rośnie mocno z wolumenem.', 'No GTA coin is rising hard with volume right now.')))}${more('up', L.up, nU)}`;
    const secTop = `${head('💰', L2('Największe GTA coiny', 'Biggest GTA coins'), L.top.length, L2('Po market capie · wolumen 24 h ≥ $10K', 'By market cap · 24 h volume ≥ $10K'))}
      ${rows(L.top, nT) || (loading ? '' : empty(L2('Brak danych.', 'No data.')))}${more('top', L.top, nT)}`;
    const secTw = `${head('🐦', L2('GTA tweety', 'GTA tweets'), tw.length, L2('Rockstar Games, GTA 6 Countdown, Rockstar INTEL + każdy śledzony tweet o GTA · ostatnie 72 h', 'Rockstar Games, GTA 6 Countdown, Rockstar INTEL + every tracked tweet about GTA · last 72 h'))}
      ${tw.length ? tw.slice(0, nW).map(tweetCard).join('') : empty(L2('W ostatnich 72 h nie było tweetów o GTA ze śledzonych kont.', 'No GTA tweets from tracked accounts in the last 72 h.'))}${more('tw', tw, nW)}`;
    const nA = isAll ? 5 : 40;
    const secAdded = L.added.length ? `${head('📈', L2('Od dodania w Kyvo', 'Since added to Kyvo'), L.added.length, L2('Ile poszły od kiedy Kyvo je wykryło (albo od pusha 🎮 GTA) · max = najwyżej od tego czasu', 'How far they moved since Kyvo detected them (or since the 🎮 GTA push) · max = highest since then'))}
      ${rows(L.added, nA)}${more('added', L.added, nA)}` : (sec === 'added' ? empty(L2('Kyvo jeszcze zbiera ceny z momentu dodania — wróć za kilka minut.', 'Kyvo is still collecting the prices at detection — check back in a few minutes.')) : '');
    const chip = (id, lb, n) => `<button type="button" class="twf${sec === id ? ' on' : ''}" data-gsec="${id}">${lb}${n != null ? ` <span class="vcount">${n}</span>` : ''}</button>`;
    const upd = S.at ? Math.max(0, Math.round((Date.now() - S.at) / 1000)) : null;
    body.innerHTML = `<div class="gta-hero" translate="no"><div class="gta-k">🎮 GTA 6 <span class="gta-free">FREE</span></div>
        <div class="gta-t">${L2('Wszystkie coiny i tweety o GTA 6 w jednym miejscu', 'Every GTA 6 coin and tweet in one place')}</div>
        <div class="gta-s">${L2('Nowe coiny, te co rosną, runnery GTA i tweety Rockstar. Za darmo dla wszystkich.', 'New coins, the ones going up, GTA runners and Rockstar tweets. Free for everyone.')}</div></div>
      <div class="twfs" translate="no">${chip('all', L2('Wszystko', 'All'))}${chip('new', '🆕 ' + L2('Nowe', 'New'), L.fresh.length)}${chip('up', '🚀 ' + L2('Rosną', 'Going up'), L.up.length)}${chip('top', '💰 Top', L.top.length)}${L.added.length || sec === 'added' ? chip('added', '📈 ' + L2('Od dodania', 'Since added'), L.added.length) : ''}${chip('tw', '🐦 ' + L2('Tweety', 'Tweets'), tw.length)}</div>
      ${loading ? `<div class="loading"><div class="spin"></div>${L2('Szukam GTA coinów…', 'Looking for GTA coins…')}</div>` : ''}
      ${S.err && !L.all.length ? `<div class="card" style="font-size:12.5px;color:var(--warn)">${L2('DexScreener chwilowo nie odpowiada — spróbujemy za chwilę.', 'DexScreener is not answering right now — retrying shortly.')}</div>` : ''}
      ${isAll || sec === 'up' ? secUp : ''}
      ${isAll || sec === 'new' ? secFresh : ''}
      ${isAll || sec === 'tw' ? secTw : ''}
      ${isAll || sec === 'top' ? secTop : ''}
      ${isAll || sec === 'added' ? secAdded : ''}
      <div class="mut" style="font-size:11px;margin-top:10px;line-height:1.45" translate="no">${L2('GTA coin = nazwa albo ticker wprost o GTA (GTA 6, GTA VI, Grand Theft Auto, Vice City, Leonida, Los Santos, pełne imiona postaci) albo ≥ 3 calle o GTA na pump.fun. Uważaj na kopie — sprawdź adres (CA) na stronie coina.', 'GTA coin = name or ticker clearly about GTA (GTA 6, GTA VI, Grand Theft Auto, Vice City, Leonida, Los Santos, full character names) or ≥ 3 GTA callouts on pump.fun. Watch out for copies — check the contract (CA) on the coin page.')}</div>
      <div class="foot">${L2('Dane: DexScreener · pump.fun (calle) · tweety: FxTwitter (lustro X)', 'Data: DexScreener · pump.fun (callouts) · tweets: FxTwitter (X mirror)')}${upd != null ? ` · ${L2('odświeżone', 'updated')} ${upd < 5 ? L2('teraz', 'now') : upd + ' s ' + L2('temu', 'ago')}` : ''}</div>`;
    ctx.wireRows(body);
    body.querySelectorAll('[data-gsec]').forEach((b) => b.addEventListener('click', () => { S.sec = b.getAttribute('data-gsec'); render(); window.scrollTo(0, 0); }));
  }

  async function show() {
    render();
    const live = ctx.loadLive().catch(() => null);
    const ad = loadAdded().then(() => { if (ctx.isView()) ctx.keep(render); });
    const p = refresh(false);
    await live; if (ctx.isView()) ctx.keep(render);
    await p; S.first = false; if (ctx.isView()) ctx.keep(render);
    if (!S.timer) S.timer = setInterval(() => {
      if (!ctx.isView() || document.hidden) return;
      Promise.all([ctx.loadLive().catch(() => null), loadAdded()]).then(() => refresh(false)).then(() => { if (ctx.isView()) ctx.keep(render); });
    }, 30000);
  }

  window.KyvoGta = {
    init(c) { ctx = c; },
    show,
    render,
    matchCoin, matchText,
    _lists: () => lists(), _tweets: () => gtaTweets(),
  };
})();
