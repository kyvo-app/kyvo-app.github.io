/* Kyvo v8.9 insights (+ 📈 Big runner) (v8.1 base + v8.3 upside/why/verdict + v8.7 watchlist "od dodania" P/L): Kyvo Check (safety score), "Dlaczego tu?", watchlista + lokalne alerty, cena od tweeta.
   Public data only (DexScreener, GeckoTerminal, RugCheck, GoPlus). No keys, no tracking, everything stays in this browser.
   Not financial advice. */
(function () {
  'use strict';
  let D = null; // deps injected by app.js
  const RC = 'https://api.rugcheck.xyz/v1/tokens/';
  const GP = 'https://api.gopluslabs.io/api/v1/';
  const memo = {}; // key -> {t, data}

  /* ---------------- helpers ---------------- */
  async function getJson(url, ttl) {
    const m = memo[url];
    if (m && Date.now() - m.t < (ttl || 300000)) return m.data;
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const to = ctl ? setTimeout(() => ctl.abort(), 12000) : null;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      memo[url] = { t: Date.now(), data };
      return data;
    } finally { if (to) clearTimeout(to); }
  }
  const E = (s) => D.esc(s);

  /* ---------------- Kyvo Check ---------------- */
  const RC_PL = {
    'Top 10 holders high ownership': 'Top 10 holderów ma ponad 70% podaży',
    'High holder concentration': 'Top 10 holderów ma ponad 50% podaży',
    'High ownership': 'Najwięksi holderzy mają ponad 80% podaży',
    'Single holder ownership': 'Jeden portfel ma dużą część podaży',
    'Large Amount of LP Unlocked': 'Płynność (LP) jest odblokowana: twórca może ją wyciągnąć',
    'Low amount of LP Providers': 'Płynność dostarcza tylko kilka portfeli',
    'Low Liquidity': 'Bardzo mała płynność',
    'Mutable metadata': 'Twórca może zmienić nazwę/obrazek (metadane)',
    'Freeze Authority still enabled': 'Twórca może zamrozić Twoje tokeny (freeze authority)',
    'Mint Authority still enabled': 'Twórca może dodrukować tokeny (mint authority)',
    'High market cap per holder': 'Bardzo wysoki MC w stosunku do liczby holderów',
    'Creator history of rugged tokens': 'Twórca ma w historii rugi',
    'Copycat token': 'Możliwa kopia innego tokena',
    'Low amount of holders': 'Bardzo mało holderów',
    'Transfer fee': 'Opłata od transferu (podatek)',
  };
  function universe() { return (D.getUniverse && D.getUniverse()) || []; }

  function cloneCheck(c) {
    const sym = String(c.symbol || '').toLowerCase();
    const nm = String(c.name || '').toLowerCase();
    if (!sym) return null;
    const same = universe().filter((x) => x && x.address !== c.address && (String(x.symbol || '').toLowerCase() === sym || (nm.length > 3 && String(x.name || '').toLowerCase() === nm)));
    if (!same.length) return null;
    const bigger = same.filter((x) => (x.liquidity || 0) > (c.liquidity || 0) * 3 && (x.mcap || 0) > (c.mcap || 0) * 3).sort((a, b) => (b.mcap || 0) - (a.mcap || 0))[0];
    return { count: same.length, bigger };
  }

  function localChecks(c) {
    const out = [];
    const add = (lvl, txt, src) => out.push({ lvl, txt, src: src || 'DexScreener' });
    const ageH = c.pairCreatedAt ? (Date.now() - c.pairCreatedAt) / 3600000 : null;
    if (c.onCurve && !c.migrated) add('info', `Coin jest jeszcze na krzywej ${c.dexId === 'fourmeme' ? 'four.meme' : 'pump.fun'} — płynność jest w krzywej, a nie w zwykłej puli.`);
    else if (c.liquidity == null || c.liquidity < 5000) add('bad', `Bardzo mała płynność (${D.fmtUsd(c.liquidity)}) — łatwo o duży poślizg albo brak kupca przy sprzedaży.`);
    else if (c.liquidity < 20000) add('warn', `Mała płynność (${D.fmtUsd(c.liquidity)}).`);
    else add('ok', `Płynność ${D.fmtUsd(c.liquidity)}.`);
    if (!c.onCurve && c.liquidity && c.mcap && c.mcap > 0) {
      const r = c.liquidity / c.mcap;
      if (r < 0.03) add('warn', `Płynność to tylko ${r < 0.001 ? '<0.1' : (r * 100).toFixed(1)}% MC — cena łatwo spada przy większej sprzedaży.`);
    }
    if (ageH == null) add('warn', 'Nieznany wiek pary.');
    else if (ageH < 1) add('warn', `Bardzo nowy coin (${Math.max(1, Math.round(ageH * 60))} min) — większość takich coinów szybko traci wartość.`);
    else if (ageH < 24) add('info', `Coin ma ${Math.round(ageH)} h.`);
    else add('ok', `Coin istnieje od ${ageH < 48 ? Math.round(ageH) + ' h' : Math.round(ageH / 24) + ' dni'}.`);
    if (!c.hasSocials) add('warn', 'Brak socials i strony (X, Telegram, WWW).');
    else add('ok', 'Ma socials albo stronę (sprawdź, czy prawdziwe).');
    if (c.buyRatioH1 != null && (c.buysH1 || 0) + (c.sellsH1 || 0) >= 20) {
      if (c.buyRatioH1 < 0.35) add('warn', `Przewaga sprzedaży w ostatniej godzinie (kupna ${Math.round(c.buyRatioH1 * 100)}%).`);
    }
    if (c.change && c.change.h1 != null && c.change.h1 <= -40) add('bad', `Spadek ${D.fmtPct(c.change.h1)} w 1h — możliwy dump albo rug.`);
    const cl = cloneCheck(c);
    if (cl && cl.bigger) add('bad', `Możliwa podróbka: jest większy coin $${E(cl.bigger.symbol)} (MC ${D.fmtUsd(cl.bigger.mcap)}). Zawsze porównaj adres (CA).`, 'Kyvo');
    else if (cl) add('warn', `Ten sam ticker ma jeszcze ${cl.count} inn${cl.count === 1 ? 'y coin' : 'e coiny'} w Kyvo — sprawdzaj adres (CA).`, 'Kyvo');
    if (c.boost > 0) add('info', 'Ma płatny boost na DexScreener — to reklama, nie dowód jakości.');
    return out;
  }

  async function remoteChecks(c) {
    const out = [];
    const add = (lvl, txt, src) => out.push({ lvl, txt, src });
    const srcs = [];
    if ((c.chainId || 'solana') === 'solana') {
      const [rc, gp] = await Promise.allSettled([
        getJson(RC + encodeURIComponent(c.address) + '/report/summary', 600000),
        getJson(GP + 'solana/token_security?contract_addresses=' + encodeURIComponent(c.address), 600000),
      ]);
      if (rc.status === 'fulfilled' && rc.value && Array.isArray(rc.value.risks)) {
        srcs.push('RugCheck');
        for (const r of rc.value.risks.slice(0, 8)) {
          const name = String(r.name || '');
          let lvl = r.level === 'danger' ? 'bad' : r.level === 'warn' ? 'warn' : 'info';
          let txt = RC_PL[name] || E(name);
          if (r.value) txt += ` (${E(String(r.value).slice(0, 16))})`;
          if (c.onCurve && !c.migrated && /holder|ownership/i.test(name)) {
            lvl = 'info';
            txt += ' — na krzywej dużą część tokenów trzyma sama krzywa, więc to częściowo normalne.';
          }
          add(lvl, txt, 'RugCheck');
        }
        if (!rc.value.risks.length) add('ok', 'RugCheck nie znalazł ryzyk.', 'RugCheck');
        if (!c.onCurve && typeof rc.value.lpLockedPct === 'number' && rc.value.lpLockedPct >= 90) add('ok', `Płynność zablokowana/spalona w ${Math.round(rc.value.lpLockedPct)}%.`, 'RugCheck');
      }
      const g = gp.status === 'fulfilled' && gp.value && gp.value.result && gp.value.result[c.address];
      if (g) {
        srcs.push('GoPlus');
        const st = (o) => o && String(o.status) === '1';
        if (st(g.mintable)) add('bad', 'Twórca nadal może dodrukować tokeny (mint authority).', 'GoPlus');
        else add('ok', 'Nie da się dodrukować tokenów (mint wyłączony).', 'GoPlus');
        if (st(g.freezable)) add('bad', 'Twórca może zamrozić tokeny w Twoim portfelu (freeze).', 'GoPlus');
        else add('ok', 'Brak możliwości zamrożenia (freeze wyłączony).', 'GoPlus');
        if (st(g.balance_mutable_authority)) add('bad', 'Ktoś może zmieniać salda portfeli.', 'GoPlus');
        if (g.transfer_fee && Object.keys(g.transfer_fee).length) add('warn', 'Token ma opłatę od transferu.', 'GoPlus');
        if (Array.isArray(g.transfer_hook) && g.transfer_hook.length) add('warn', 'Token ma transfer hook (dodatkowy kod przy każdym transferze).', 'GoPlus');
      }
    } else if (c.chainId === 'bsc') {
      const res = await getJson(GP + 'token_security/56?contract_addresses=' + encodeURIComponent(c.address), 600000).catch(() => null);
      const g = res && res.result && (res.result[String(c.address).toLowerCase()] || res.result[c.address]);
      if (g) {
        srcs.push('GoPlus');
        const one = (v) => String(v) === '1';
        if (one(g.is_honeypot)) add('bad', 'HONEYPOT: najpewniej nie da się sprzedać.', 'GoPlus');
        else if (g.is_honeypot === '0') add('ok', 'Nie wykryto honeypota (da się sprzedać).', 'GoPlus');
        if (one(g.cannot_sell_all)) add('bad', 'Nie da się sprzedać całości.', 'GoPlus');
        const bt = parseFloat(g.buy_tax), stx = parseFloat(g.sell_tax);
        if (isFinite(stx) && stx > 0.1) add('bad', `Wysoki podatek od sprzedaży: ${(stx * 100).toFixed(0)}%.`, 'GoPlus');
        else if ((isFinite(bt) && bt > 0) || (isFinite(stx) && stx > 0)) add('warn', `Podatek: kupno ${isFinite(bt) ? (bt * 100).toFixed(1) : '?'}%, sprzedaż ${isFinite(stx) ? (stx * 100).toFixed(1) : '?'}%.`, 'GoPlus');
        else if (g.buy_tax != null) add('ok', 'Brak podatku od kupna/sprzedaży.', 'GoPlus');
        if (one(g.is_mintable)) add('warn', 'Kontrakt pozwala dodrukować tokeny.', 'GoPlus');
        if (one(g.owner_change_balance)) add('bad', 'Właściciel może zmieniać salda.', 'GoPlus');
        if (one(g.hidden_owner) || one(g.can_take_back_ownership)) add('bad', 'Ukryty właściciel / można odzyskać własność kontraktu.', 'GoPlus');
        if (g.is_open_source === '0') add('warn', 'Kod kontraktu nie jest zweryfikowany (closed source).', 'GoPlus');
        if (Array.isArray(g.holders) && g.holders.length) {
          const top = g.holders.filter((h) => !one(h.is_locked) && !one(h.is_contract)).slice(0, 10).reduce((s, h) => s + (parseFloat(h.percent) || 0), 0);
          if (top > 0.5) add('warn', `Top 10 holderów (bez kontraktów) ma ${(top * 100).toFixed(0)}% podaży.`, 'GoPlus');
          else if (top > 0) add('ok', `Top 10 holderów ma ${(top * 100).toFixed(0)}% podaży.`, 'GoPlus');
        }
        if (Array.isArray(g.lp_holders) && g.lp_holders.length) {
          const locked = g.lp_holders.filter((h) => one(h.is_locked) || /^0x0{30,}|dead$/i.test(h.address || '')).reduce((s, h) => s + (parseFloat(h.percent) || 0), 0);
          if (locked >= 0.9) add('ok', `Płynność zablokowana/spalona w ${(locked * 100).toFixed(0)}%.`, 'GoPlus');
          else if (!c.onCurve) add('warn', `Tylko ${(locked * 100).toFixed(0)}% płynności zablokowane — twórca może ją wyciągnąć.`, 'GoPlus');
        }
      }
    }
    return { checks: out, srcs };
  }

  function scoreOf(checks) {
    let s = 100;
    for (const k of checks) s -= k.lvl === 'bad' ? 25 : k.lvl === 'warn' ? 9 : 0;
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  function grade(s) {
    if (s >= 75) return { cls: 'kc-g', t: 'Niskie ryzyko*' };
    if (s >= 50) return { cls: 'kc-y', t: 'Uważaj' };
    return { cls: 'kc-r', t: 'Wysokie ryzyko' };
  }
  const ICON = { ok: '✅', warn: '⚠️', bad: '⛔', info: 'ℹ️' };
  function checkHtml(c, checks, srcs, loading) {
    const s = scoreOf(checks);
    const g = grade(s);
    const ord = { bad: 0, warn: 1, info: 2, ok: 3 };
    const list = checks.slice().sort((a, b) => ord[a.lvl] - ord[b.lvl]);
    const nBad = checks.filter((k) => k.lvl === 'bad').length, nWarn = checks.filter((k) => k.lvl === 'warn').length;
    return `<div class="kcheck" data-score="${s}">
      <div class="kc-top">
        <div class="kc-ring ${g.cls}" style="--p:${s}"><b>${s}</b><small>/100</small></div>
        <div style="flex:1;min-width:0"><div class="h" style="font-size:14px;margin:0">Kyvo Check <span class="badge live">beta</span></div>
          <div class="kc-grade ${g.cls}">${g.t}</div>
          <div class="mut" style="font-size:11.5px">${nBad} ${plPl(nBad, 'czerwona flaga', 'czerwone flagi', 'czerwonych flag')} · ${nWarn} ${plPl(nWarn, 'ostrzeżenie', 'ostrzeżenia', 'ostrzeżeń')}${loading ? ' · <span class="kc-load">sprawdzam kontrakt…</span>' : ''}</div></div>
      </div>
      <ul class="kc-list">${list.map((k) => `<li class="kc-${k.lvl}"><span>${ICON[k.lvl]}</span><span>${k.txt}<small class="mut"> · ${E(k.src)}</small></span></li>`).join('')}</ul>
      <div class="mut kc-foot">Źródła: DexScreener${srcs.length ? ', ' + srcs.map(E).join(', ') : ''}${(c.chainId === 'robinhood') ? ' · dla Robinhood Chain nie ma jeszcze darmowego skanera kontraktów, więc wynik jest tylko z danych rynku' : ''}. *Wynik to automatyczny filtr, nie gwarancja — rug może się zdarzyć przy każdym wyniku. To nie jest porada finansowa.</div>
    </div>`;
  }
  const remCache = {};
  async function fullScore(c) {
    const local = localChecks(c);
    const ck = (c.chainId || 'solana') + ':' + c.address, hit = remCache[ck];
    let rem = { checks: [], srcs: [] };
    if (hit && Date.now() - hit.t < 5 * 60e3) rem = hit.v;
    else { try { rem = await remoteChecks(c); if (rem.srcs.length) remCache[ck] = { t: Date.now(), v: rem }; } catch (e) {} }
    return scoreOf(local.concat(rem.checks));
  }
  async function mountCheck(slot, c) {
    if (!slot) return;
    const local = localChecks(c);
    slot.innerHTML = checkHtml(c, local, [], c.chainId === 'solana' || c.chainId === 'bsc' || !c.chainId);
    let rem = { checks: [], srcs: [] };
    const ck = (c.chainId || 'solana') + ':' + c.address, hit = remCache[ck];
    if (hit && Date.now() - hit.t < 5 * 60e3) rem = hit.v;
    else { try { rem = await remoteChecks(c); if (rem.srcs.length) remCache[ck] = { t: Date.now(), v: rem }; } catch (e) {} }
    if (!slot.isConnected) return;
    // de-duplicate: remote holder/LP checks beat local ones
    slot.innerHTML = checkHtml(c, local.concat(rem.checks), rem.srcs, false);
  }

  /* ---------------- Dlaczego ten coin jest tu? ---------------- */
  const TAB_PL = { good: 'Good Coins', new: 'New Pairs', stretch: 'Final Stretch', migrated: 'Migrated', hot: 'Hot', boosted: 'Boosted' };
  function whyHtml(c, ctx) {
    ctx = ctx || {};
    const r = [];
    const tabs = (D.tabsFor ? D.tabsFor(c) : []).filter((t) => TAB_PL[t]);
    if (ctx.inner) { // v8.3: data bullets live in the upside card; keep list membership + glossary here
      const tl = tabs.length ? `${L('Spełnia filtry zakładek', 'Matches the filters of')}: <b>${tabs.map((t) => TAB_PL[t]).join(', ')}</b>` : L('Nie jest na żadnej liście Kyvo (z wyszukiwarki albo linku).', 'Not on any Kyvo list (from search or a link).');
      const g = whyHtml(c, {}).split('<details class="gloss">')[1] || '';
      return `<div class="card why"><div class="mut" style="font-size:12px;margin-bottom:6px" translate="no">${tl}</div><details class="gloss">${g}`;
    }
    if (tabs.length) r.push(`Spełnia filtry zakładek: <b>${tabs.map((t) => TAB_PL[t]).join(', ')}</b> (Twoje ustawienia filtrów).`);
    const cons = D.consensus ? D.consensus(c) : null;
    if (cons && cons.buyers.length) r.push(`<b>${cons.buyers.length}</b> portfel${cons.buyers.length === 1 ? '' : 'e'} smart money kupił${cons.buyers.length === 1 ? '' : 'y'} w ostatnich 72h (${cons.buyers.slice(0, 4).map(E).join(', ')})${cons.sellers.length ? `, a ${cons.sellers.length} już sprzedał${cons.sellers.length === 1 ? '' : 'o'} (${cons.sellers.slice(0, 3).map(E).join(', ')})` : ''}.`);
    const tw = D.tweetsFor ? D.tweetsFor(c) : [];
    if (tw.length) r.push(`Wspomniany na X: ${tw.slice(0, 3).map((t) => `<a href="${E(t.url)}" target="_blank" rel="noopener noreferrer">@${E(t.handle)}</a>`).join(', ')} — zobacz zakładkę Viral.`);
    const topic = D.topicFor ? D.topicFor(c) : null;
    if (topic) r.push(`Pasuje do viralowego tematu „<b>${E(D.vl ? D.vl(topic, 'label') : topic.label)}</b>”.`);
    if (c.change && c.change.h1 != null && Math.abs(c.change.h1) >= 20) r.push(`Mocny ruch ceny: <b>${D.fmtPct(c.change.h1)}</b> w ostatniej godzinie.`);
    if (c.volume && c.volume.h1 && c.liquidity && c.volume.h1 > c.liquidity) r.push(`Wolumen z 1h (${D.fmtUsd(c.volume.h1)}) jest większy niż płynność — dużo się dzieje.`);
    if (c.curveEst != null && !c.migrated) r.push(`Jest na krzywej, ok. <b>${c.curveEst.toFixed(0)}%</b> do migracji (estymacja MC / ~$69k).`);
    if (c.migrated && c.pairCreatedAt && Date.now() - c.pairCreatedAt < 6 * 3600000) r.push(`Niedawno zmigrował na ${E(c.dexId)}.`);
    if (c.boost > 0) r.push('Ma płatny boost na DexScreener (reklama, nie dowód jakości).');
    if (!r.length) r.push('Trafił tu z wyszukiwarki albo linku — nie spełnia żadnego z naszych kryteriów list.');
    return `<div class="card why"><div class="h" style="font-size:13px;margin:0 0 6px">Dlaczego ten coin jest tu?</div>
      <ul class="why-l">${r.map((x) => `<li>${x}</li>`).join('')}</ul>
      <details class="gloss"><summary>📖 Słowniczek dla początkujących</summary>
        <dl>
          <dt>MC (market cap)</dt><dd>Cena × liczba tokenów. Ile „wart” jest coin. Mały MC = duże ryzyko i duża zmienność.</dd>
          <dt>Płynność (Liq)</dt><dd>Pieniądze w puli, z której kupujesz i sprzedajesz. Mała płynność = trudno sprzedać bez dużej straty.</dd>
          <dt>Vol (wolumen)</dt><dd>Za ile kupiono i sprzedano w danym czasie.</dd>
          <dt>Buy 1h</dt><dd>Jaki procent transakcji z ostatniej godziny to kupna.</dd>
          <dt>Krzywa / migracja</dt><dd>Na pump.fun / four.meme coin startuje na „krzywej”. Gdy ją zapełni (ok. $69k MC), przechodzi na zwykłą giełdę DEX — to migracja.</dd>
          <dt>CA</dt><dd>Adres kontraktu — jedyny pewny identyfikator coina. Ticker może mieć kopie.</dd>
          <dt>Smart money</dt><dd>Publicznie znane portfele traderów z historią. Ich zakup to informacja, nie sygnał kupna — często są wcześniej i sprzedają szybciej niż Ty.</dd>
          <dt>Rug</dt><dd>Twórca wyciąga płynność albo sprzedaje wszystko i cena spada prawie do zera.</dd>
        </dl></details>
    </div>`;
  }

  /* ---------------- Watchlista + lokalne alerty ---------------- */
  const WKEY = 'kyvo_watch_v1';
  let watch = {};
  try { watch = JSON.parse(localStorage.getItem(WKEY) || '{}') || {}; } catch (e) { watch = {}; }
  // v8.7: every coin keeps its entry point (time, price, MC at the moment of adding) → "as if you bought then".
  // Entries saved before v8.7 without an entry price get the first live price after the update (entryFrom:'update' → "od teraz").
  (function migrateWatch() {
    let dirty = false;
    for (const k of Object.keys(watch)) {
      const w = watch[k];
      if (!w || typeof w !== 'object' || !w.address) { delete watch[k]; dirty = true; continue; }
      if (!(w.addedPrice > 0) && !w.entryPending) { w.entryPending = 'update'; w.addedPrice = null; dirty = true; }
      if (!w.addedAt) { w.addedAt = Date.now(); dirty = true; }
    }
    if (dirty) { try { localStorage.setItem(WKEY, JSON.stringify(watch)); } catch (e) {} }
  })();
  const live = {}; // key -> coin-ish {priceUsd, mcap, change, liquidity, image}
  function saveWatch() { try { localStorage.setItem(WKEY, JSON.stringify(watch)); } catch (e) {} updateBadge(); }
  function isWatched(key) { return !!watch[key]; }
  function toggleWatch(c) {
    const k = D.keyOf(c);
    delete lastCh[k];
    if (watch[k]) { delete watch[k]; saveWatch(); D.toast('Usunięto z watchlisty'); return false; }
    if (Object.keys(watch).length >= 60) { D.toast('Watchlista: max 60 coinów'); return false; }
    watch[k] = { chain: c.chainId || 'solana', address: c.address, symbol: c.symbol, name: c.name, image: c.image || null,
      addedAt: Date.now(), entryAt: null, addedPrice: null, addedMcap: c.mcap || null, peakPct: 0, lowPct: 0, alerts: [], pair: c.pairAddress || null };
    const px = c.priceUsd != null ? +c.priceUsd : NaN;
    if (px > 0 && isFinite(px)) { watch[k].addedPrice = px; watch[k].entryAt = watch[k].addedAt; }
    else watch[k].entryPending = 'add'; // no price on this coin object → first live DexScreener price (≤ 30 s)
    saveWatch();
    D.toast('⭐ Dodano do watchlisty');
    if (pollT) pollLive(); else ensurePoll(); // v8.13: main-pool price at once (entry cross-check in updateEntries)
    return true;
  }
  function updateBadge() {
    const n = Object.keys(watch).length;
    document.querySelectorAll('[data-watch-count]').forEach((el) => { el.textContent = n ? String(n) : ''; el.style.display = n ? '' : 'none'; });
  }
  function notifSupported() { return typeof window.Notification !== 'undefined'; }
  async function notify(title, body, key) {
    D.toast('🔔 ' + title);
    try {
      if (!notifSupported() || Notification.permission !== 'granted') return;
      const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-96.png', tag: 'kyvo-' + key, data: { url: location.href.split('#')[0] + '#coin/' + encodeURIComponent(key) } };
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg && reg.showNotification) await reg.showNotification(title, opts);
      else new Notification(title, opts);
    } catch (e) { /* toast already shown */ }
  }
  async function pollLive() {
    const keys = Object.keys(watch);
    if (!keys.length) return;
    const addrs = [...new Set(keys.map((k) => watch[k].address))];
    const KP = window.KyvoPairs;
    const lcKey = {}; for (const k of keys) lcKey[(watch[k].chain || 'solana') + ':' + String(watch[k].address).toLowerCase()] = k;
    for (let i = 0; i < addrs.length; i += 30) {
      try {
        const d = await getJson('https://api.dexscreener.com/latest/dex/tokens/' + addrs.slice(i, i + 30).join(','), 20000);
        // v8.13: the coin's MAIN pool by exact CA + chain (most liquidity; a dead pump.fun curve pair never wins after migration)
        const bm = KP.bestMap((d && d.pairs) || [], (ch, a) => ch + ':' + String(a).toLowerCase());
        for (const [lk, p] of Object.entries(bm)) {
          const k = lcKey[lk];
          if (!k || !p) continue;
          live[k] = { priceUsd: p.priceUsd != null ? +p.priceUsd : null, mcap: p.marketCap || p.fdv || null, liquidity: KP.liq(p), change: p.priceChange || {},
            image: p.info && p.info.imageUrl, pair: p.pairAddress || null, dexId: p.dexId || '', curve: KP.isCurve(p), pairCreatedAt: p.pairCreatedAt || null };
        }
      } catch (e) { /* keep last */ }
    }
    updateEntries();
    checkAlerts();
    verifyEntries().then((ch) => { if (ch && document.querySelector('#s-watch.on')) renderWatch(document.querySelector('#watchBody')); });
    if (document.querySelector('#watchBody') && document.querySelector('#s-watch.on')) renderWatch(document.querySelector('#watchBody'));
  }
  /* v8.13: entry-price sanity check (+ one-time repair of entries saved by v8.12 and older).
     The entry is compared with the MAIN pool's own candles (GeckoTerminal OHLCV) at the moment of adding. If it is off by
     more than 5× (it came from a dead curve pair / copy coin) it is re-derived from that candle and marked "poprawiona".
     Peak / low since added are then rebuilt from the same candles. Every entry is checked once (entryChecked). */
  const ENTRY_V = 1;
  let verifyBusy = false;
  async function entryFromOhlcv(w, Lv, t0) {
    const net = GTN[w.chain];
    if (!net || !Lv.pair) return null;
    const ageMin = (Date.now() - t0) / 60000;
    const [tf, agg, step] = ageMin <= 80 * 60 ? ['minute', 5, 300] : ageMin <= 40 * 1440 ? ['hour', 1, 3600] : ['day', 1, 86400];
    const lim = Math.min(1000, Math.ceil((ageMin * 60) / step) + 3);
    const url = `https://api.geckoterminal.com/api/v2/networks/${net}/pools/${encodeURIComponent(Lv.pair)}/ohlcv/${tf}?aggregate=${agg}&limit=${lim}&currency=usd&token=${encodeURIComponent(w.address)}`;
    const d = window.KyvoGT ? await window.KyvoGT.fetch(url, 300000) : await getJson(url, 300000);
    const ol = ((d && d.data && d.data.attributes && d.data.attributes.ohlcv_list) || []).map((r) => r.map(Number)).sort((a, b) => a[0] - b[0]);
    if (!ol.length) return null;
    const ts = t0 / 1000;
    if (ol[0][0] > ts) return { before: true }; // the pool has no candle that old (pool newer than the entry, or history cut)
    const inC = ol.find((r) => r[0] <= ts && ts < r[0] + step);
    const prev = ol.filter((r) => r[0] <= ts).pop();
    const px = inC ? inC[1] : prev ? prev[4] : null;
    if (!(px > 0)) return null;
    const after = ol.filter((r) => r[0] + step > ts);
    return { px, hi: Math.max(...after.map((r) => r[2])), lo: Math.min(...after.map((r) => r[3])) };
  }
  async function verifyEntries() {
    if (verifyBusy) return false;
    verifyBusy = true;
    let changed = false, n = 0;
    try {
      for (const [k, w] of Object.entries(watch)) {
        if ((w.entryChecked || 0) >= ENTRY_V || w.entryPending || !(w.addedPrice > 0)) continue;
        const Lv = live[k];
        if (!Lv || !Lv.pair || !(Lv.priceUsd > 0)) continue;
        const t0 = w.entryAt || w.addedAt;
        if (!t0 || Date.now() - t0 < 3 * 60e3) continue; // the candle of the entry minute is not final yet
        if (n++ >= 3) break; // ≤ 3 GeckoTerminal calls per 30-s refresh (shared public rate limit)
        // pool created after the entry → the coin was on its curve then; the curve price was the real price
        if (Lv.pairCreatedAt && Lv.pairCreatedAt > t0 && !Lv.curve) { w.entryChecked = ENTRY_V; changed = true; continue; }
        let r = null;
        try { r = await entryFromOhlcv(w, Lv, t0); } catch (e) { r = null; }
        if (!r) { w.entryTries = (w.entryTries || 0) + 1; if (w.entryTries >= 4) w.entryChecked = ENTRY_V; changed = true; continue; }
        if (r.before) { w.entryChecked = ENTRY_V; changed = true; continue; }
        const ratio = w.addedPrice / r.px;
        if (ratio > 5 || ratio < 0.2) {
          w.entryFix = { oldPrice: w.addedPrice, oldMcap: w.addedMcap || null, at: Date.now(), pool: Lv.pair };
          w.addedPrice = r.px;
          w.addedMcap = Lv.mcap > 0 ? (Lv.mcap * r.px) / Lv.priceUsd : null;
          w.peakPct = Math.max(0, (r.hi / r.px - 1) * 100); w.lowPct = Math.min(0, (r.lo / r.px - 1) * 100);
          delete lastCh[k];
          // alerts that fired only because of the wrong entry are re-armed
          for (const a of w.alerts || []) if (a.type === 'pct') a.fired = null;
        }
        w.entryChecked = ENTRY_V; w.pair = Lv.pair; changed = true;
      }
    } finally { verifyBusy = false; }
    if (changed) saveWatch();
    return changed;
  }
  // v8.7: fill missing entry prices + track peak / low "since added" from every live refresh (only while Kyvo is open)
  function sincePct(w, L) { return w && w.addedPrice > 0 && L && L.priceUsd > 0 ? (L.priceUsd / w.addedPrice - 1) * 100 : null; }
  const lastCh = {}; // key -> % since added at the previous refresh (memory only)
  function updateEntries() {
    let dirty = false;
    for (const [k, w] of Object.entries(watch)) {
      const L = live[k];
      if (!L || !(L.priceUsd > 0)) continue;
      if (w.entryPending || !(w.addedPrice > 0)) {
        w.addedPrice = L.priceUsd; w.addedMcap = L.mcap || w.addedMcap || null; w.entryAt = Date.now();
        if (w.entryPending === 'update') w.entryFrom = 'update';
        delete w.entryPending; w.peakPct = 0; w.lowPct = 0; dirty = true;
        continue;
      }
      // v8.13: within 2 min after adding, the entry must match the coin's main pool (the coin object could carry a stale pair)
      if (!w.entryFix && Date.now() - (w.entryAt || w.addedAt) < 120e3 && (w.addedPrice / L.priceUsd > 3 || L.priceUsd / w.addedPrice > 3)) {
        w.entryFix = { oldPrice: w.addedPrice, oldMcap: w.addedMcap || null, at: Date.now(), pool: L.pair };
        w.addedPrice = L.priceUsd; w.addedMcap = L.mcap || null; w.peakPct = 0; w.lowPct = 0; delete lastCh[k]; dirty = true;
        continue;
      }
      if (!(w.addedMcap > 0) && L.mcap > 0) { w.addedMcap = L.mcap * w.addedPrice / L.priceUsd; dirty = true; }
      const ch = sincePct(w, L);
      if (ch == null || !isFinite(ch)) continue;
      // peak/low need 2 refreshes in a row (one odd DexScreener tick — e.g. a switch to another pool — must not set a fake peak)
      const prev = lastCh[k]; lastCh[k] = ch;
      if (prev == null) continue;
      const hi = Math.min(prev, ch), lo = Math.max(prev, ch);
      if (hi > (w.peakPct || 0) + 0.05) { w.peakPct = hi; w.peakAt = Date.now(); dirty = true; }
      if (lo < (w.lowPct || 0) - 0.05) { w.lowPct = lo; dirty = true; }
    }
    if (dirty) saveWatch();
  }
  function checkAlerts() {
    let dirty = false;
    for (const [k, w] of Object.entries(watch)) {
      const L = live[k];
      if (!L) continue;
      for (const a of w.alerts || []) {
        if (a.fired) continue;
        let hit = false, msg = '';
        if (a.type === 'mcAbove' && L.mcap != null && L.mcap >= a.value) { hit = true; msg = `MC ${D.fmtUsd(L.mcap)} ≥ ${D.fmtUsd(a.value)}`; }
        if (a.type === 'mcBelow' && L.mcap != null && L.mcap <= a.value) { hit = true; msg = `MC ${D.fmtUsd(L.mcap)} ≤ ${D.fmtUsd(a.value)}`; }
        if (a.type === 'pct' && w.addedPrice && L.priceUsd) {
          const ch = (L.priceUsd / w.addedPrice - 1) * 100;
          if (Math.abs(ch) >= a.value) { hit = true; msg = `${D.fmtPct(ch)} od dodania`; }
        }
        if (hit) { a.fired = Date.now(); dirty = true; notify(`$${w.symbol}: ${msg}`, 'Kyvo · alert z watchlisty (to nie porada finansowa)', k); }
      }
    }
    if (dirty) saveWatch();
  }
  let pollT = null;
  function ensurePoll() {
    if (pollT || !Object.keys(watch).length) return;
    pollLive();
    pollT = setInterval(() => { if (!document.hidden) pollLive(); }, 30000);
  }
  function watchButtonHtml(c) {
    const on = isWatched(D.keyOf(c));
    return `<button type="button" class="wbtn${on ? ' on' : ''}" id="watchBtn" aria-pressed="${on}">${on ? '★ Obserwujesz' : '☆ Obserwuj'}</button>`;
  }
  function plPl(n, one, few, many) {
    const d = n % 10, h = n % 100;
    return n === 1 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
  }
  function wireWatchButton(c) {
    const b = document.getElementById('watchBtn');
    if (!b) return;
    b.onclick = () => { const on = toggleWatch(c); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '★ Obserwujesz' : '☆ Obserwuj'; };
  }
  // v8.14: alerts from the coin page (same watchlist alert logic: stored in w.alerts, checked every 30 s)
  function addAlert(c, type, value) {
    if (!['mcAbove', 'mcBelow', 'pct'].includes(type) || !isFinite(value) || value <= 0) return { ok: false, msg: L('Podaj liczbę większą od 0', 'Enter a number above 0') };
    const k = D.keyOf(c);
    if (!watch[k] && !toggleWatch(c)) return { ok: false, msg: L('Nie udało się dodać do watchlisty', 'Could not add to the watchlist') };
    const w = watch[k];
    if ((w.alerts || []).length >= 5) return { ok: false, msg: L('Max 5 alertów na coin', 'Max 5 alerts per coin') };
    (w.alerts = w.alerts || []).push({ type, value, fired: null, createdAt: Date.now() });
    saveWatch(); ensurePoll(); checkAlerts();
    return { ok: true, msg: L('Alert zapisany', 'Alert saved') };
  }
  function alertsOf(c) { const w = watch[D.keyOf(c)]; return w && w.alerts ? w.alerts.map((a) => ({ ...a, label: alertLabel(a) })) : []; }
  function removeAlert(c, i) { const w = watch[D.keyOf(c)]; if (w && w.alerts) { w.alerts.splice(i, 1); saveWatch(); } }
  function alertLabel(a) {
    return a.type === 'mcAbove' ? `MC ≥ ${D.fmtUsd(a.value)}` : a.type === 'mcBelow' ? `MC ≤ ${D.fmtUsd(a.value)}` : `ruch ±${a.value}% od dodania`;
  }
  // v8.7: watchlist helpers
  function money(v) {
    if (v == null || !isFinite(v)) return '—';
    if (v >= 1e4) return D.fmtUsd(v);
    return '$' + (v >= 1000 ? Math.round(v).toLocaleString('en-US') : v < 10 ? v.toFixed(2) : Math.round(v));
  }
  function agoLong(ms) {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return L('przed chwilą', 'just now');
    const m = Math.floor(s / 60);
    if (m < 60) return L(`${m} ${plPl(m, 'minutę', 'minuty', 'minut')} temu`, `${m} ${m === 1 ? 'minute' : 'minutes'} ago`);
    const h = Math.floor(m / 60);
    if (h < 48) return L(`${h} ${plPl(h, 'godzinę', 'godziny', 'godzin')} temu`, `${h} ${h === 1 ? 'hour' : 'hours'} ago`);
    const d = Math.floor(h / 24);
    return L(`${d} ${plPl(d, 'dzień', 'dni', 'dni')} temu`, `${d} ${d === 1 ? 'day' : 'days'} ago`);
  }
  function renderWatch(root) {
    if (!root) return;
    const keys = Object.keys(watch).sort((a, b) => (watch[b].addedAt || 0) - (watch[a].addedAt || 0));
    const perm = notifSupported() ? Notification.permission : 'unsupported';
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    const notifCard = `<div class="card" style="font-size:12.5px;line-height:1.5">
      <b>🔔 Jak działają alerty</b><br>
      Alerty sprawdzamy co 30 s, <b>tylko gdy Kyvo jest otwarte</b> (także w tle na komputerze). Dostaniesz komunikat w apce${perm === 'granted' ? ' i powiadomienie systemowe' : ''}. ${L('Gdy apka jest zamknięta, alerty z watchlisty nie działają — push przy zamkniętej apce dostajesz dla Runnera, Good Coins i New Tweet (ustawienia poniżej).', 'When the app is closed, watchlist alerts do not run — with the app closed you get push for Runner, Good Coins and New Tweet (settings below).')}
      ${perm === 'default' ? `<div style="margin-top:8px"><button type="button" class="pf-btn" id="notifBtn">Włącz powiadomienia systemowe</button></div>` : ''}
      ${perm === 'denied' ? '<div class="mut" style="margin-top:6px">Powiadomienia są zablokowane w ustawieniach przeglądarki — zostają komunikaty w apce.</div>' : ''}
      ${perm === 'unsupported' ? `<div class="mut" style="margin-top:6px">Ta przeglądarka nie obsługuje powiadomień${/iPhone|iPad/.test(navigator.userAgent) && !isStandalone ? ' (na iPhonie działają tylko po dodaniu Kyvo do ekranu głównego, iOS 16.4+)' : ''} — zostają komunikaty w apce.</div>` : ''}
    </div>`;
    const nset = window.KyvoNotify ? window.KyvoNotify.settingsHtml() : '';
    if (!keys.length) {
      root.innerHTML = `<div class="h">⭐ Watchlista</div><div class="sub">Twoje obserwowane coiny i alerty — zapisane tylko w tej przeglądarce</div>
        <div class="empty">Pusto. Otwórz dowolny coin i kliknij <b>☆ Obserwuj</b>.</div>
        <div class="card mut" style="font-size:12px;line-height:1.5">${L('Od momentu dodania liczymy, ile coin zrobił, tak jakbyś wtedy kupił: % zmiany, MC wejście → teraz i ile byłoby z $100.', 'From the moment you add a coin we track what it did as if you had bought then: % change, entry MC → now and what $100 would be worth.')}</div>${notifCard}${nset}`;
      wireNotif(root);
      return;
    }
    const rows = keys.map((k) => ({ k, w: watch[k], L: live[k] || {} })).map((r) => Object.assign(r, { since: sincePct(r.w, r.L) }));
    const priced = rows.filter((r) => r.since != null && isFinite(r.since));
    let summary = '';
    if (priced.length) {
      const inv = priced.length * 100, now = priced.reduce((a, r) => a + 100 * (1 + r.since / 100), 0), tot = (now / inv - 1) * 100;
      const best = priced.reduce((a, r) => (r.since > a.since ? r : a)), worst = priced.reduce((a, r) => (r.since < a.since ? r : a));
      summary = `<div class="card wsum">
        <div class="wsum-l"><small>${L('Gdybyś wszedł po $100 w każdy', 'If you put $100 into each')} (${priced.length} ${L(plPl(priced.length, 'coin', 'coiny', 'coinów'), priced.length === 1 ? 'coin' : 'coins')})</small>
          <b>${money(inv)} → <span class="${D.pctClass(tot)}">${money(now)}</span></b></div>
        <div class="wsum-r"><b class="${D.pctClass(tot)}">${D.fmtPct(tot)}</b><small>${L('od dodania', 'since added')}</small></div>
        ${priced.length > 1 ? `<div class="wsum-x">${L('Najlepszy', 'Best')} <b>$${E(best.w.symbol)}</b> <span class="${D.pctClass(best.since)}">${D.fmtPct(best.since)}</span> · ${L('najgorszy', 'worst')} <b>$${E(worst.w.symbol)}</b> <span class="${D.pctClass(worst.since)}">${D.fmtPct(worst.since)}</span></div>` : ''}
      </div>`;
    }
    root.innerHTML = `<div class="h">⭐ Watchlista <span class="badge live">${keys.length}</span></div>
      <div class="sub">${L('Ceny na żywo z DexScreener · wynik liczony od momentu dodania, tak jakbyś wtedy kupił · zapisane tylko w tej przeglądarce', 'Live prices from DexScreener · result measured from the moment you added it, as if you bought then · saved only in this browser')}</div>
      ${summary}
      <div class="card" style="padding:4px 10px">${rows.map(({ k, w, L: lv, since }) => {
        const al = (w.alerts || []);
        const mig = w.entryFrom === 'update';
        const t0 = mig ? (w.entryAt || w.addedAt) : w.addedAt;
        const fresh = Date.now() - t0 < 90e3;
        const timeTxt = w.entryPending ? L('czekam na cenę wejścia…', 'waiting for the entry price…')
          : mig ? (fresh ? L('📍 liczone od teraz', '📍 counted from now') : L('📍 start liczenia ', '📍 counting started ') + agoLong(t0))
          : L('dodano ', 'added ') + agoLong(t0);
        const mcNow = lv.mcap != null ? lv.mcap : null;
        const val = since != null ? 100 * (1 + since / 100) : null;
        const peak = since != null && (w.peakPct || 0) > 0.05 ? Math.max(w.peakPct, since) : null;
        const cls = D.pctClass(since);
        const tip = w.addedPrice > 0 ? `${L('Wejście', 'Entry')}: ${L('cena', 'price')} ${D.fmtUsd(w.addedPrice)} · MC ${D.fmtUsd(w.addedMcap)} · ${new Date(t0).toLocaleString(L('pl-PL', 'en-US'))}` : '';
        return `<div class="wrow${since != null ? ' w-' + cls : ''}" data-wk="${E(k)}">
          <a class="wmain" href="#coin/${encodeURIComponent(k)}"${tip ? ` title="${E(tip)}"` : ''}>
            ${D.imgTag ? D.imgTag({ chainId: w.chain, address: w.address, symbol: w.symbol, image: lv.image || w.image }, 'tok', 38) : ''}
            <span class="nm"><b><span class="cbadge c-${E(w.chain)}">${E(w.chain === 'solana' ? 'SOL' : w.chain === 'bsc' ? 'BSC' : 'RH')}</span> $${E(w.symbol)}</b>
              <small>MC <span class="wmc0">${D.fmtUsd(w.addedMcap)}</span> → <b class="${cls}">${D.fmtUsd(mcNow)}</b></small>
              <small>${timeTxt}</small>${w.entryFix ? `<small class="wfix" title="${E(L('Stara cena wejścia', 'Old entry price') + ': ' + D.fmtUsd(w.entryFix.oldPrice) + ' · MC ' + D.fmtUsd(w.entryFix.oldMcap))}">✓ ${L('wejście poprawione (główna pula)', 'entry fixed (main pool)')}</small>` : ''}</span>
            <span class="rt"><b class="wpct ${cls}">${since != null ? D.fmtPct(since) : '—'}</b><small class="mut">${mig ? L('od startu', 'since start') : L('od dodania', 'since added')}</small></span>
          </a>
          ${since != null ? `<div class="wpl">
            <span>$100 → <b class="${cls}">${money(val)}</b></span>
            ${peak != null ? `<span>${L('szczyt', 'peak')} <b class="up">${D.fmtPct(peak)}</b></span>` : ''}
            ${lv.change && lv.change.h1 != null ? `<span>1h <b class="${D.pctClass(+lv.change.h1)}">${D.fmtPct(+lv.change.h1)}</b></span>` : ''}
          </div>` : ''}
          <div class="walerts">${al.map((a, i) => `<span class="achip${a.fired ? ' fired' : ''}">${a.fired ? '🔔 ' : ''}${E(alertLabel(a))}${a.fired ? ' · zadziałał' : ''} <button type="button" data-adel="${i}" aria-label="Usuń alert">×</button></span>`).join('')}
            <button type="button" class="achip add" data-aadd>+ alert</button>
            <button type="button" class="achip rm" data-wrm>Usuń</button></div>
          <div class="aform" hidden>
            <select data-atype><option value="mcAbove">MC powyżej ($)</option><option value="mcBelow">MC poniżej ($)</option><option value="pct">Ruch ±% od dodania</option></select>
            <input data-aval type="number" inputmode="decimal" placeholder="np. 100000" min="0">
            <button type="button" class="pf-btn" data-asave>Zapisz</button>
          </div>
        </div>`;
      }).join('')}</div>
      <div class="foot">${L('Wynik „od dodania” = cena teraz vs cena w chwili dodania (bez opłat i poślizgu). Szczyt liczymy z odświeżeń co 30 s, gdy Kyvo jest otwarte.', '“Since added” = price now vs price when you added it (no fees or slippage). Peak is taken from 30 s refreshes while Kyvo is open.')}</div>
      ${notifCard}${nset}
      <div class="foot">Alerty działają lokalnie, gdy Kyvo jest otwarte · to nie jest porada finansowa</div>`;
    root.querySelectorAll('.wrow').forEach((row) => {
      const k = row.dataset.wk, w = watch[k];
      row.querySelector('[data-wrm]').onclick = () => { delete watch[k]; saveWatch(); renderWatch(root); };
      row.querySelector('[data-aadd]').onclick = () => { const f = row.querySelector('.aform'); f.hidden = !f.hidden; };
      row.querySelectorAll('[data-adel]').forEach((b) => (b.onclick = () => { w.alerts.splice(+b.dataset.adel, 1); saveWatch(); renderWatch(root); }));
      row.querySelector('[data-asave]').onclick = () => {
        const type = row.querySelector('[data-atype]').value;
        const value = parseFloat(row.querySelector('[data-aval]').value);
        if (!isFinite(value) || value <= 0) { D.toast('Podaj liczbę większą od 0'); return; }
        if ((w.alerts || []).length >= 5) { D.toast('Max 5 alertów na coin'); return; }
        (w.alerts = w.alerts || []).push({ type, value, fired: null, createdAt: Date.now() });
        saveWatch(); ensurePoll(); D.toast('Alert zapisany'); renderWatch(root); checkAlerts();
      };
    });
    wireNotif(root);
  }
  function wireNotif(root) {
    const b = root.querySelector('#notifBtn');
    if (b) b.onclick = async () => { try { await Notification.requestPermission(); } catch (e) {} renderWatch(root); };
    if (window.KyvoNotify) window.KyvoNotify.wireSettings(root, () => renderWatch(root));
  }

  /* ---------------- Cena od tweeta ---------------- */
  const TKEY = 'kyvo_tweetpx_v1';
  let tpx = {};
  try { tpx = JSON.parse(localStorage.getItem(TKEY) || '{}') || {}; } catch (e) { tpx = {}; }
  const GTN = { solana: 'solana', bsc: 'bsc', robinhood: 'robinhood' };
  async function priceAtTweet(coin, iso) {
    const id = coin.chain + ':' + coin.address + '@' + iso;
    if (tpx[id] !== undefined) return tpx[id];
    const ts = Math.floor(new Date(iso).getTime() / 1000);
    const net = GTN[coin.chain];
    if (!net || !coin.pair || !isFinite(ts)) return null;
    const ageDays = (Date.now() / 1000 - ts) / 86400;
    const [tf, agg, step] = ageDays < 5 ? ['minute', 5, 300] : ['hour', 1, 3600];
    const url = `https://api.geckoterminal.com/api/v2/networks/${net}/pools/${encodeURIComponent(coin.pair)}/ohlcv/${tf}?aggregate=${agg}&before_timestamp=${ts + step}&limit=3&currency=usd&token=${encodeURIComponent(coin.address)}`;
    const d = window.KyvoGT ? await window.KyvoGT.fetch(url, 86400000) : await getJson(url, 86400000);
    const list = (d && d.data && d.data.attributes && d.data.attributes.ohlcv_list) || [];
    const cand = list.filter((x) => x[0] <= ts).sort((a, b) => b[0] - a[0])[0];
    let px = cand ? +cand[1] : null; // open of the candle containing the tweet
    if (!(px > 0)) px = null;
    const nearCreation = coin.pair_created_at && coin.pair_created_at / 1000 > ts;
    const v = { px, preLaunch: !!nearCreation };
    tpx[id] = v;
    try { const ks = Object.keys(tpx); if (ks.length > 300) delete tpx[ks[0]]; localStorage.setItem(TKEY, JSON.stringify(tpx)); } catch (e) {}
    return v;
  }
  async function fillTweetSince(root, tweets, liveMap) {
    if (!root) return;
    const els = [...root.querySelectorAll('[data-since]')];
    for (const el of els) {
      if (!el.isConnected) return;
      let c, at, spec = false;
      if (typeof tweets === 'function') { const r = tweets(el); if (!r) continue; c = r.c; at = r.at; spec = r.spec; }
      else { const [ti, ci] = el.dataset.since.split(':').map(Number); const t = tweets[ti]; c = t && t.coins && t.coins[ci]; at = t && t.created_at; }
      if (!c || !at) continue;
      let v = null;
      try { v = await priceAtTweet(c, at); } catch (e) { v = null; }
      const L = liveMap[c.chain + ':' + c.address] || {};
      const now = L.price != null ? L.price : c.price_usd;
      const mcNow = L.mcap != null ? L.mcap : c.mcap;
      if (!el.isConnected) return;
      if (v && v.preLaunch) { el.innerHTML = `<span class="mut">Tweet był przed startem tej puli${spec ? ' — coin powstał po tweecie (typowe dla spekulacji)' : ''}</span>`; continue; }
      if (!v || !v.px || !now) { el.innerHTML = '<span class="mut">Cena od tweeta: brak danych</span>'; continue; }
      const ch = (now / v.px - 1) * 100;
      const mcThen = mcNow ? mcNow * (v.px / now) : null;
      const hint = ch >= 300 ? '🔥 już bardzo mocno urósł od tweeta — wejście teraz jest późne i ryzykowne' : ch >= 100 ? '⚠️ już sporo urósł od tweeta' : ch <= -50 ? '📉 mocno spadł od tweeta' : ch < 20 ? 'jeszcze mały ruch od tweeta' : '';
      el.innerHTML = `Od tweeta: <b class="${D.pctClass(ch)}">${D.fmtPct(ch)}</b>${mcThen ? ` <span class="mut">· MC ${D.fmtUsd(mcThen)} → ${D.fmtUsd(mcNow)}</span>` : ` <span class="mut">(${fmtPx(v.px)} → ${fmtPx(now)})</span>`}${hint ? `<div class="vhint">${hint}</div>` : ''}`;
      el.title = 'Cena z 5-min/1h świecy GeckoTerminal z momentu tweeta vs cena teraz (' + fmtPx(v.px) + ' → ' + fmtPx(now) + '). MC wtedy = MC teraz × cena wtedy / cena teraz. Nie uwzględnia opłat i poślizgu.';
    }
  }
  function fmtPx(p) {
    if (!(p > 0)) return '—';
    if (p >= 1) return '$' + p.toFixed(3);
    const z = Math.floor(-Math.log10(p));
    return '$' + p.toFixed(Math.min(12, z + 3));
  }


  /* ================= v8.3: Potencjał (spekulacja) + Dlaczego tu jest + Może iść w górę? =================
     Transparent heuristic on public data only. NOT a forecast, NOT financial advice. Memecoins can go to zero.

     Inputs (all already in Kyvo): S = Kyvo Check 0–100 (local DexScreener checks on lists; + RugCheck/GoPlus on the coin page),
     MC, liquidity, vol 1h/24h, Δ5m/Δ1h/Δ6h, buys vs sells 1h, age, smart-money consensus (72h), X tweet link (named/speculative),
     top-10 holder concentration (coin page only, from RugCheck/GoPlus), price since tweet (coin page, GeckoTerminal candle).

     GATE  → "wysokie ryzyko, brak szacunku" (no number) when: S < 50, OR any red flag (⛔: honeypot, mint/freeze authority,
             liquidity < $5k off-curve, −40% in 1h, likely clone, sell tax >10% …).
             Missing MC, or liquidity > 2× MC (broken MC/price data for that pair) → "za mało danych" (no number).
     Components (each clamped to 0..1):
       mom   = 0.5·clip(Δ1h,−30,100)/100 + 0.3·clip(Δ5m,−15,30)/30 + 0.2·clip(Δ6h,−50,200)/200
       flow  = (buyShare1h − 0.40) / 0.25                      (null → 0)
       act   = 0.6·log10(1 + 20·vol1h/MC)/log10(21) + 0.4·(volX − 1)/3,   volX = vol1h / (vol24h/24)
       sm    = (SMbuyers − 0.5·SMsellers) / 3
       viral = 1 named-coin tweet ≤24h · 0.6 named ≤72h · 0.5 speculative/topic match · 0 none
       q     = (S − 50) / 50
       liqOk = on bonding curve ? 0.6 : (liq/MC) / 0.10
     G = (0.25·mom + 0.15·flow + 0.15·act + 0.15·sm + 0.10·viral + 0.10·q + 0.10·liqOk) × ageF
       ageF = 0.7 (<1h) · 1.0 (<24h) · 0.85 (<7d) · 0.7 (older)
       − 0.10 top-10 holders >50% · − 0.15 overextended (Δ6h>300% or Δ24h>500% or ≥300% since tweet) · − 0.10 dumping (Δ1h<−20%)
     Scenario: G < 0.30 → niski/low · < 0.55 → średni/medium · else wysoki/high
     Range: room = (log10 10M − log10 MC) / (log10 10M − log10 20k)   (MC ≤ $20k → 1, ≥ $10M → 0)
            hi = (40 + 260·room) · (0.25 + 0.75·G) %,  lo = hi / 4  (rounded; lo ≥ 5)
     Time window: age < 6h or |Δ5m| ≥ 10% → 15 min–2 h · act ≥ 0.5 → 1–6 h · else 6–24 h
     Horizons 30 min / 1 h / 3 h / 6 h / 8 h (recomputed on every 45 s refresh):
       speed = max(act, mom);  share(h) = min(1, √(h/8) · (0.7 + 0.6·speed))
       hi_h = (40 + 260·room)·(0.25 + 0.75·G)·share(h),  lo_h = hi_h / 4
       scenario_h from G_h = G − 0.005·h   (signals fade with time)
       base_h (signed central case) = (hi_raw·share(h)·1.25/2)·(G_h − 0.22)/0.78   → negative when G_h < 0.22
       confidence_h = (25 + 50·G)·(1 − 0.07·(h − 0.5))·dataF  [5..95],  dataF ×0.85 no buy/sell data, ×0.85 no vol1h, ×0.9 no age
         → label: < 25 niska/low · < 45 średnia/medium · else wysoka/high
     Pure function: estimateUpside(x) below (window.KyvoUpside.estimate) — Node copy in tools/upside_estimate.js.
     Verdict "Może iść w górę?": overextended / dumping / sellers dominate → "Raczej po ruchu — ryzyko spadku";
             G ≥ 0.5 and ≥ 2 pros → "Możliwy dalszy wzrost"; else "Neutralnie". Gated → "Wysokie ryzyko — bez oceny".
     The range is the size of move such setups *sometimes* see — most memecoins still fall. Downside is always up to −100%. */
  const EN = () => !!(window.KyvoI18n && window.KyvoI18n.isEn());
  const L = (pl, en) => (EN() ? en : pl);
  const clamp01 = (x) => (isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);
  const clip = (x, a, b) => Math.max(a, Math.min(b, x));
  const num = (x) => (x == null || !isFinite(+x) ? null : +x);
  function fmtK(n) {
    if (n == null || !isFinite(n)) return '?';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'k';
    return String(Math.round(n));
  }
  function agoShort(ms) {
    const m = Math.max(1, Math.round((Date.now() - ms) / 60000));
    if (m < 60) return L(m + ' min temu', m + ' min ago');
    const h = Math.round(m / 60);
    if (h < 48) return L(h + ' h temu', h + 'h ago');
    return L(Math.round(h / 24) + ' d temu', Math.round(h / 24) + 'd ago');
  }
  const pct = (n) => (n >= 0 ? '+' : '') + (Math.abs(n) >= 100 ? Math.round(n) : n.toFixed(Math.abs(n) < 10 ? 1 : 0)) + '%';
  const niceRound = (x) => (x < 50 ? Math.round(x / 5) * 5 : Math.round(x / 10) * 10);

  /** Tweets on X linked to this coin (named in tweet, or speculative match), newest first. */
  function tweetLinks(c) {
    const v = D.getViral ? D.getViral() : null;
    if (!v) return [];
    const addr = String(c.address || '').toLowerCase();
    const out = [];
    const has = (arr) => (arr || []).some((x) => String(x.address || '').toLowerCase() === addr);
    for (const p of v.posts || []) {
      const named = has(p.coins), spec = has(p.spec_coins);
      if (named || spec) out.push({ handle: p.handle, url: p.url, at: p.posted_at || p.created_at, views: p.metrics && p.metrics.views, likes: p.metrics && p.metrics.likes, named });
    }
    for (const t of v.trader_tweets || []) if (has(t.coins)) out.push({ handle: t.handle, url: t.url, at: t.created_at, views: t.metrics && t.metrics.views, likes: t.metrics && t.metrics.likes, named: true });
    const topic = D.topicFor ? D.topicFor(c) : null;
    if (!out.length && topic && topic.source_post) out.push({ handle: (String(topic.source_post).match(/x\.com\/([^/]+)/) || [])[1] || 'X', url: topic.source_post, at: null, views: null, named: false, topic: D.vl ? D.vl(topic, 'label') : topic.label });
    return out.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }
  function sinceTweetPct(c, tw) {
    if (!tw || !tw.at || !(c.priceUsd > 0)) return null;
    const v = tpx[(c.chainId || 'solana') + ':' + c.address + '@' + tw.at];
    if (!v || !v.px || v.preLaunch) return null;
    return (c.priceUsd / v.px - 1) * 100;
  }

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

  /** Core analysis. ext = { checks: [...remote checks], conc: top10 share 0..1 } (coin page only). */
  function analyze(c, ext) {
    ext = ext || {};
    const checks = localChecks(c).concat(ext.checks || []);
    const S = scoreOf(checks);
    const reds = checks.filter((k) => k.lvl === 'bad');
    const ch = c.change || {}, vol = c.volume || {};
    const m5 = num(ch.m5), h1 = num(ch.h1), h6 = num(ch.h6), h24 = num(ch.h24);
    const mc = num(c.mcap), liq = num(c.liquidity), v1 = num(vol.h1), v24 = num(vol.h24);
    const ageH = c.pairCreatedAt ? (Date.now() - c.pairCreatedAt) / 3.6e6 : null;
    const br = num(c.buyRatioH1), ntx = (c.buysH1 || 0) + (c.sellsH1 || 0);
    const cons = D.consensus ? D.consensus(c) : { buyers: [], sellers: [] };
    const tws = tweetLinks(c);
    const tw = tws[0] || null;
    const twAgeH = tw && tw.at ? (Date.now() - new Date(tw.at).getTime()) / 3.6e6 : null;
    const since = sinceTweetPct(c, tw);
    const volX = v1 != null && v24 > 0 ? v1 / (v24 / 24) : null;
    const conc = num(ext.conc);

    const input = {
      score: S, redFlags: reds.length, mcap: mc, liquidity: liq, onCurve: !!(c.onCurve && !c.migrated), vol1h: v1, vol24h: v24,
      m5, h1, h6, h24, buys1h: c.buysH1, sells1h: c.sellsH1, ageH, smBuyers: cons.buyers.length, smSellers: cons.sellers.length,
      tweetNamed: tw ? !!tw.named : null, tweetAgeH: twAgeH, sinceTweetPct: since, top10: conc,
      boostRank: D.boostRank ? D.boostRank(c) : null,
    };
    const est = estimateUpside(input);
    const { comp, G, gated, noData, scen, lo, hi, tf, room, horizons } = est;
    const { over, dumping, sellersDom } = est.flags;
    const ageF = est.ageF;

    /* why bullets (plain data) */
    const why = [];
    for (const t of tws.slice(0, 2)) {
      const parts = [];
      if (t.views) parts.push(fmtK(t.views) + ' views');
      else if (t.likes) parts.push(fmtK(t.likes) + ' ♥');
      const at = t.at ? agoShort(new Date(t.at).getTime()) : '';
      const s2 = t === tw && since != null ? ` → <b class="${D.pctClass(since)}">${pct(since)}</b> ${L('od tweeta', 'since tweet')}` : '';
      const kind = t.named ? L('coin w tweecie', 'coin named in tweet') : L('spekulacja: tweet nie podaje coina', 'speculative: tweet doesn\u2019t name the coin');
      why.push(`🐦 ${t.topic ? L('Temat z X', 'X topic') + ' „' + E(t.topic) + '” · ' : ''}${L('Tweet od', 'Tweet by')} <a href="${E(t.url)}" target="_blank" rel="noopener noreferrer">@${E(t.handle)}</a>${parts.length ? ' (' + parts.join(', ') + ')' : ''}${at ? ' ' + at : ''}${s2} <span class="mut">· ${kind}</span>`);
    }
    if (cons.buyers.length) why.push(`🧠 Smart money: ${cons.buyers.length} ${L(cons.buyers.length === 1 ? 'trader kupił' : 'traderów kupiło', cons.buyers.length === 1 ? 'trader bought' : 'traders bought')} (72h)${cons.sellers.length ? ', ' + cons.sellers.length + ' ' + L('już sprzedało', 'already sold') : ''} <span class="mut">· ${cons.buyers.slice(0, 3).map(E).join(', ')}</span>`);
    if (volX != null && volX >= 1.5) why.push(`📊 ${L('Wolumen 1h', 'Volume 1h')} <b>x${volX >= 10 ? Math.round(volX) : volX.toFixed(1)}</b> ${L('vs średnia z 24h', 'vs 24h average')} (${D.fmtUsd(v1)})`);
    why.push(`🛡️ Kyvo Check <b>${S}</b>/100${reds.length ? ' · ' + reds.length + ' ' + L('czerwone flagi', 'red flags') : ''}`);
    if (c.onCurve && !c.migrated) why.push(`🎢 ${L('Na krzywej', 'On bonding curve')}${c.curveEst != null ? ' ~' + c.curveEst.toFixed(0) + '%' : ''}`);
    else if (liq != null && mc > 0) {
      const r = liq / mc;
      why.push(`💧 ${r >= 0.1 && liq >= 50000 ? L('Wysoka płynność', 'High liquidity') : r >= 0.05 && liq >= 15000 ? L('Płynność OK', 'Liquidity OK') : L('Niska płynność', 'Low liquidity')} ${D.fmtUsd(liq)} (${(r * 100).toFixed(r < 0.1 ? 1 : 0)}% MC)`);
    }
    const momP = [];
    if (m5 != null) momP.push(pct(m5) + ' 5m');
    if (h1 != null) momP.push(pct(h1) + ' 1h');
    if (h6 != null) momP.push(pct(h6) + ' 6h');
    if (momP.length) why.push(`⚡ Momentum: ${momP.join(' · ')}`);
    if (br != null && ntx >= 5) why.push(`🔁 ${L('Kupna 1h', 'Buys 1h')}: <b>${Math.round(br * 100)}%</b> (${c.buysH1} ${L('vs', 'vs')} ${c.sellsH1} ${L('sprzedaży', 'sells')})`);
    if (ageH != null) why.push(`⏱ ${L('Wiek pary', 'Pair age')}: ${ageH < 1 ? Math.max(1, Math.round(ageH * 60)) + ' min' : ageH < 48 ? Math.round(ageH) + ' h' : Math.round(ageH / 24) + ' d'} · MC ${D.fmtUsd(mc)}`);
    if (conc != null) why.push(`👥 Top 10 ${L('holderów', 'holders')}: ${(conc * 100).toFixed(0)}%`);

    /* pros / cons for "Room to run?" */
    const pros = [], cons2 = [];
    if (h1 != null && h1 >= 15 && (m5 == null || m5 >= 0)) pros.push(L(`mocne momentum (${pct(h1)} w 1h, nadal rośnie)`, `strong momentum (${pct(h1)} in 1h, still rising)`));
    if (br != null && ntx >= 20 && br >= 0.6) pros.push(L(`przewaga kupujących (${Math.round(br * 100)}% kupna)`, `buyers dominate (${Math.round(br * 100)}% buys)`));
    if (cons.buyers.length >= 2 && cons.buyers.length > cons.sellers.length) pros.push(L(`${cons.buyers.length} portfele smart money kupiły`, `${cons.buyers.length} smart-money wallets bought`));
    if (tw && twAgeH != null && twAgeH <= 6 && (since == null || since < 100)) pros.push(L('świeży tweet, coin jeszcze mało urósł od niego', 'fresh tweet, coin hasn\u2019t moved much since'));
    if (volX != null && volX >= 3) pros.push(L(`wolumen rośnie (x${volX.toFixed(1)})`, `volume picking up (x${volX.toFixed(1)})`));
    if (S >= 75) pros.push(L(`dobry Kyvo Check (${S})`, `good Kyvo Check (${S})`));
    if (room >= 0.6 && comp.liqOk >= 0.5) pros.push(L('mały MC przy przyzwoitej płynności', 'small MC with decent liquidity'));
    if (since != null && since >= 300) cons2.push(L(`już ${pct(since)} od tweeta`, `already ${pct(since)} since the tweet`));
    else if (h6 != null && h6 > 300) cons2.push(L(`już ${pct(h6)} w 6h`, `already ${pct(h6)} in 6h`));
    else if (h24 != null && h24 > 500) cons2.push(L(`już ${pct(h24)} w 24h`, `already ${pct(h24)} in 24h`));
    if (sellersDom) cons2.push(L(`przewaga sprzedających (${Math.round(br * 100)}% kupna)`, `sellers dominate (only ${Math.round(br * 100)}% buys)`));
    if (dumping) cons2.push(L(`spada (${pct(h1)} w 1h)`, `dropping (${pct(h1)} in 1h)`));
    if (conc != null && conc > 0.5) cons2.push(L(`top 10 holderów ma ${(conc * 100).toFixed(0)}% podaży (dev/wieloryby mogą zrzucić)`, `top 10 holders own ${(conc * 100).toFixed(0)}% (dev/whales can dump)`));
    if (cons.sellers.length > cons.buyers.length && cons.sellers.length) cons2.push(L('smart money już sprzedaje', 'smart money is already selling'));
    if (!c.onCurve && mc > 0 && liq != null && liq / mc < 0.05) cons2.push(L('mała płynność względem MC', 'thin liquidity vs MC'));
    if (ageH != null && ageH < 1) cons2.push(L('bardzo nowy coin — większość takich szybko spada', 'very new coin — most of these drop fast'));
    if (reds.length) cons2.unshift(L(`${reds.length} czerwone flagi w Kyvo Check`, `${reds.length} red flags in Kyvo Check`));
    let verdict;
    if (gated) verdict = 'risk';
    else if (noData) verdict = 'neutral';
    else if (over || dumping || sellersDom) verdict = 'late';
    else if (G >= 0.5 && pros.length >= 2) verdict = 'up';
    else verdict = 'neutral';
    return { S, reds, gated, noData, G, comp, ageF, scen, lo, hi, tf, room, why, pros: pros.slice(0, 3), cons: cons2.slice(0, 3), verdict, over, since, tw, horizons, est, input };
  }

  /** v8.3 Good Coins rule: safety + positive outlook. Returns { ok, a, why } (why = first failed rule, for debugging). */
  /* ---- contract facts for the SAFETY gate (cached 10 min; RugCheck full report + GoPlus) ---- */
  const CF = {}; // key -> { t, v } ; v = contract object for goodCoinRule
  const cfBusy = {};
  let cfQueue = [], cfRunning = 0, cfDone = null;
  function contractCached(c) { const h = CF[D.keyOf(c)]; return h && Date.now() - h.t < 10 * 60e3 ? h.v : null; }
  async function contractFacts(c) {
    const ch = c.chainId || 'solana', addr = c.address;
    const onCurve = !!(c.onCurve && !c.migrated);
    if (ch === 'solana') {
      const [rep, gp] = await Promise.allSettled([
        getJson(RC + encodeURIComponent(addr) + '/report', 600000),
        getJson(GP + 'solana/token_security?contract_addresses=' + encodeURIComponent(addr), 600000),
      ]);
      const r = rep.status === 'fulfilled' ? rep.value : null;
      const g = gp.status === 'fulfilled' && gp.value && gp.value.result ? gp.value.result[addr] : null;
      if (!r && !g) return null;
      const st = (o) => o && String(o.status) === '1';
      const mintRevoked = r ? !(r.token && r.token.mintAuthority) && !r.mintAuthority : g ? !st(g.mintable) : null;
      const freezeRevoked = r ? !(r.token && r.token.freezeAuthority) && !r.freezeAuthority : g ? !st(g.freezable) : null;
      let lp = null, top10 = null, dev = null;
      if (r) {
        const mk = r.markets || [];
        for (const m of mk) { const v = m && m.lp && m.lp.lpLockedPct; if (typeof v === 'number') lp = Math.max(lp || 0, v); }
        const pools = new Set();
        for (const m of mk) { if (m.pubkey) pools.add(m.pubkey); if (m.lp && m.lp.owner) pools.add(m.lp.owner); for (const f of ['liquidityA', 'liquidityB', 'liquidityAAccount', 'liquidityBAccount']) if (m[f]) pools.add(typeof m[f] === 'string' ? m[f] : m[f].address); }
        const known = r.knownAccounts || {};
        const isPool = (h) => pools.has(h.owner) || pools.has(h.address) || (known[h.owner] && /AMM|LOCKER|CURVE|pump/i.test(String(known[h.owner].type || known[h.owner].name))) || (known[h.address] && /AMM|LOCKER|CURVE|pump/i.test(String(known[h.address].type || known[h.address].name)));
        const hs = (r.topHolders || []).filter((h) => !isPool(h)).slice(0, 10);
        if (r.topHolders) top10 = hs.reduce((a, h) => a + (+h.pct || 0), 0);
        const sup = r.token && r.token.supply;
        if (sup && r.creatorBalance != null) dev = (r.creatorBalance / sup) * 100;
      }
      return { checked: true, chain: 'solana', mintRevoked, freezeRevoked, lpLockedPct: lp, top10Pct: top10, devPct: dev, onCurve };
    }
    if (ch === 'bsc') {
      const res = await getJson(GP + 'token_security/56?contract_addresses=' + encodeURIComponent(addr), 600000).catch(() => null);
      const g = res && res.result && (res.result[String(addr).toLowerCase()] || res.result[addr]);
      if (!g) return null;
      const one = (v) => String(v) === '1';
      const owner = String(g.owner_address || '').toLowerCase();
      const renounced = !owner || /^0x0{40}$/.test(owner) || /dead$/.test(owner);
      const danger = ['is_mintable', 'hidden_owner', 'can_take_back_ownership', 'owner_change_balance', 'selfdestruct', 'transfer_pausable', 'is_blacklisted', 'slippage_modifiable', 'personal_slippage_modifiable', 'external_call'].some((k) => one(g[k]));
      let lp = null;
      if (Array.isArray(g.lp_holders) && g.lp_holders.length) lp = g.lp_holders.filter((h) => one(h.is_locked) || /^0x0{30,}|dead$/i.test(h.address || '')).reduce((s2, h) => s2 + (parseFloat(h.percent) || 0), 0) * 100;
      let top10 = null;
      if (Array.isArray(g.holders) && g.holders.length) top10 = g.holders.filter((h) => !one(h.is_locked) && !one(h.is_contract)).slice(0, 10).reduce((s2, h) => s2 + (parseFloat(h.percent) || 0), 0) * 100;
      const bt = parseFloat(g.buy_tax), stx = parseFloat(g.sell_tax);
      return { checked: true, chain: 'bsc', honeypot: one(g.is_honeypot) || one(g.cannot_sell_all), buyTax: isFinite(bt) ? bt * 100 : null, sellTax: isFinite(stx) ? stx * 100 : null,
        ownerSafe: renounced || !danger, lpLockedPct: lp, top10Pct: top10, onCurve };
    }
    return { checked: true, chain: ch };
  }
  function queueContract(c, done) {
    const k = D.keyOf(c);
    if (cfBusy[k] || contractCached(c)) return;
    cfBusy[k] = 1;
    cfQueue.push(c);
    if (done) cfDone = done;
    pumpCf();
  }
  function pumpCf() {
    while (cfRunning < 3 && cfQueue.length) {
      const c = cfQueue.shift();
      cfRunning++;
      contractFacts(c).then((v) => { CF[D.keyOf(c)] = { t: Date.now(), v: v || { checked: true, chain: c.chainId || 'solana', error: true } }; })
        .catch(() => { CF[D.keyOf(c)] = { t: Date.now(), v: { checked: true, chain: c.chainId || 'solana', error: true } }; })
        .finally(() => { delete cfBusy[D.keyOf(c)]; cfRunning--; if (!cfQueue.length && !cfRunning && cfDone) { const f = cfDone; cfDone = null; f(); } else pumpCf(); });
    }
  }
  function goodOutlook(c, onContract) {
    let a;
    try { a = analyze(c); } catch (e) { return { ok: false, why: 'err' }; }
    const input = Object.assign({}, a.input, { vol5m: c.volume && c.volume.m5, contract: contractCached(c) });
    const r = goodCoinRule(input);
    // only market gates passed and the contract is unknown → fetch it (≤3 parallel), re-render when the queue drains
    if (r.pending && onContract) queueContract(c, onContract);
    return { ok: r.ok, pending: r.pending, why: r.failed, rank: r.rank, P: r.P, pop: r.pop, gates: r.gates, a };
  }
  // v8.4: no exact thresholds in the UI (Kyvo's rules stay private) — only what is checked
  const GATE_TXT = {
    kc: ['wysoki Kyvo Check, bez ⛔', 'high Kyvo Check, no ⛔'], liq: ['wystarczająca płynność', 'enough liquidity'], liqMc: ['płynność adekwatna do MC', 'liquidity fits the MC'],
    age: ['nie jest świeżynką z ostatnich minut', 'not minutes old'], mintFreeze: ['mint i freeze wyłączone', 'mint & freeze revoked'], lp: ['LP spalone/zablokowane', 'LP burned/locked'],
    top10: ['holderzy nie są skoncentrowani', 'holders not concentrated'], dev: ['dev nie trzyma dużo', 'dev holds little'], honeypot: ['nie honeypot', 'not a honeypot'],
    tax: ['niski podatek', 'low tax'], owner: ['owner zrzeczony / brak groźnych funkcji', 'owner renounced / no dangerous functions'],
    vol: ['duży wolumen teraz', 'strong volume now'], tx: ['dużo transakcji', 'lots of transactions'], volMc: ['wolumen mocny względem MC', 'volume strong vs MC'],
    pop: ['popularny teraz', 'popular right now'], buys: ['przewaga kupujących', 'buyers dominate'], mom: ['cena rośnie, bez paraboli', 'price rising, not parabolic'],
    notLate: ['nie „po ruchu” i nie spada', 'not late and not dumping'], base: ['dodatni szacunek bazowy', 'positive base estimate'], scanner: ['skaner kontraktu', 'contract scanner'], contract: ['kontrakt sprawdzony', 'contract checked'],
  };

  function gatesHtml(o) {
    if (!o || !o.gates) return '';
    const G3 = [['safety', '🛡️', L('Bezpieczeństwo', 'Safety')], ['hot', '🔥', L('Popularne teraz', 'Hot now')], ['upside', '📈', L('Potencjał 8h', '8h upside')]];
    return `<div class="gates">${G3.map(([k, ic, t]) => { const gs = o.gates[k] || []; const ok = gs.length && gs.every((q) => q.pass === true);
      return `<div class="gate ${ok ? 'ok' : 'no'}"><b>${ok ? '✅' : '⛔'} ${ic} ${t}</b> <span class="mut">${gs.map((q) => (q.pass ? '✓ ' : q.pass === null ? '… ' : '✗ ') + L(GATE_TXT[q.key][0], GATE_TXT[q.key][1])).join(' · ')}</span></div>`; }).join('')}</div>`;
  }
  /* ---- 🏃 Runner: coin runners + super-important tweets ---- */
  const fmtPctS = (v) => (v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '') + Math.round(v) + '%');
  function runnerOf(c) {
    let a;
    try { a = analyze(c); } catch (e) { return null; }
    const xin = Object.assign({}, a.input, { vol5m: c.volume && c.volume.m5, buys5m: c.buysM5, sells5m: c.sellsM5, tx6h: c.txH6 });
    const r = runnerRule(xin);
    if (!r.ok && (c.mcap || 0) >= BIG_T.mcMin) {
      // v8.9 📈 Big runner: established $1M+ coin running now (the small-cap runner gates do not fit big coins)
      const g = bigRunnerRule(xin);
      if (g.ok) {
        const why = [`${fmtPctS(c.change.h1)} 1h${c.change.h6 != null ? ' · ' + fmtPctS(c.change.h6) + ' 6h' : ''}`, `vol 1h ${D.fmtUsd(c.volume.h1)} ×${g.acc.toFixed(1)} ${L('vs średnia', 'vs avg')}`,
          `${g.ntx >= 1000 ? (g.ntx / 1000).toFixed(1) + 'k' : g.ntx} txns${g.txAcc ? ' ↑×' + g.txAcc.toFixed(1) : ''}`, `${Math.round(g.br * 100)}% ${L('kupna', 'buys')}`];
        if (a.tw) why.push(`${L('tweet', 'tweet')} @${E(a.tw.handle)}`);
        return { kind: 'coin', big: true, key: D.keyOf(c), c, a, r: g, score: 0.8 * g.score, why };
      }
    }
    if (!r.ok) {
      // first pump, as early as possible (same dedupe key as the full runner → max one first-pump alert per coin)
      const e = earlyRunnerRule(xin);
      if (!e.ok) return null;
      const why = [`${L('zaczyna pompować', 'starting to pump')} — vol 5m ${D.fmtUsd(c.volume.m5)} ↑×${e.acc.toFixed(1)}`, `${L('kupujący', 'buyers')} ↑ ${Math.round(e.br5 * 100)}% (${e.tx5} tx 5m)`, `+${Math.round(c.change.m5)}% 5m`];
      if (a.tw) why.push(`${L('tweet', 'tweet')} @${E(a.tw.handle)}`);
      return { kind: 'coin', early: true, key: D.keyOf(c), c, a, r: e, score: 0.6 * e.score, why };
    }
    const why = [];
    why.push(`vol 1h ${D.fmtUsd(c.volume.h1)}${r.accel >= 2 ? ' ↑×' + r.accel.toFixed(1) : ' ↑'}`);
    why.push(`${r.ntx >= 1000 ? (r.ntx / 1000).toFixed(1) + 'k' : r.ntx} txns`);
    why.push(`${Math.round(r.br * 100)}% ${L('kupna', 'buys')}`);
    if (a.tw) why.push(`${L('tweet', 'tweet')} @${E(a.tw.handle)}`);
    const cons = D.consensus ? D.consensus(c) : null;
    if (cons && cons.buyers.length) why.push(`${cons.buyers.length} SM`);
    return { kind: 'coin', key: D.keyOf(c), c, a, r, score: r.score, why };
  }
  /* ---- 🔁 Kolejna fala / Second leg: market prefilter (DexScreener fields) → 15-min candle shape (GeckoTerminal, cached
     10 min, ≤ 2 in flight, only for prefiltered coins) → secondLegRule ---- */
  const SHAPE = {}; let shapeBusy = 0;
  async function fetchShape(c) {
    const net = { solana: 'solana', bsc: 'bsc', robinhood: 'robinhood' }[c.chainId || 'solana'];
    const d = await window.KyvoGT.fetch(`https://api.geckoterminal.com/api/v2/networks/${net}/pools/${encodeURIComponent(c.pairAddress)}/ohlcv/minute?aggregate=15&limit=96&currency=usd&token=${encodeURIComponent(c.address)}`, 600000);
    const ol = ((d && d.data && d.data.attributes && d.data.attributes.ohlcv_list) || []).map((r) => r.map(Number)).sort((a, b) => a[0] - b[0]);
    if (ol.length < 8) return null;
    let hi = 0, hiI = 0; ol.forEach((r, i) => { if (r[2] > hi) { hi = r[2]; hiI = i; } });
    const lowBefore = Math.min(...ol.slice(0, hiI + 1).map((r) => r[3] || r[1]));
    const px = ol[ol.length - 1][4];
    const roll = ol.map((r, i) => ol.slice(Math.max(0, i - 3), i + 1).reduce((s2, q) => s2 + q[5], 0));
    const peak = Math.max(...roll.slice(0, Math.min(roll.length, hiI + 3)));
    const quietW = roll.slice(hiI + 4, roll.length - 2);
    return { pumpX: lowBefore > 0 ? hi / lowBefore : null, belowHigh: hi > 0 ? (1 - px / hi) * 100 : null, coolRatio: quietW.length && peak > 0 ? Math.min(...quietW) / peak : 1 };
  }
  function shapeOf(c) {
    const k = D.keyOf(c), e = SHAPE[k];
    if (e && Date.now() - e.t < 10 * 60e3) return e.v;
    if (shapeBusy < 2 && c.pairAddress && window.KyvoGT && !(e && e.busy)) {
      shapeBusy++; SHAPE[k] = Object.assign({}, e || { t: 0, v: undefined }, { busy: true });
      fetchShape(c).then((v) => { SHAPE[k] = { t: Date.now(), v }; }).catch(() => { SHAPE[k] = { t: Date.now(), v: null }; })
        .finally(() => { shapeBusy--; if (D.onShape) try { D.onShape(); } catch (err) {} });
    }
    return e ? e.v : undefined;
  }
  function leg2Of(c) {
    let a;
    try { a = analyze(c); } catch (e) { return null; }
    const base = Object.assign({}, a.input, { vol5m: c.volume && c.volume.m5, buys5m: c.buysM5, sells5m: c.sellsM5 });
    let r = secondLegRule(base);
    if (!r.pending) return null; // market part failed (or no candle data needed)
    const sh = shapeOf(c);
    if (!sh) return null;
    r = secondLegRule(Object.assign(base, sh));
    if (!r.ok) return null;
    const why = [`${L('wolumen znowu rośnie', 'volume rising again')}: vol 5m ${D.fmtUsd(c.volume.m5)} (×${r.acc.toFixed(1)} vs 1h)`, `${Math.round(r.br5 * 100)}% ${L('kupna 5m', 'buys 5m')}`, `−${Math.round(r.belowHigh)}% ${L('od szczytu', 'from high')}`, `${L('szczyt', 'high')} ×${r.pumpX.toFixed(1)}`];
    if (a.tw && a.tw.ageH != null && a.tw.ageH < 3) why.push(`${L('świeży tweet', 'fresh tweet')} @${E(a.tw.handle)}`);
    return { kind: 'coin', leg2: true, key: 'leg2:' + D.keyOf(c), c, a, r, score: r.score, why };
  }
  const BIG_AUTHORS = /^(elonmusk|cz_binance|heyibinance|realdonaldtrump|vitalikbuterin|saylor|binance|coinbase|solana|aeyakovenko|toly|pumpfun|a1lon9|blknoiz06|ansem|muststopmurad|cobie|orangie|cented7|cupseyy|frankdegods|notthreadguy|kreo444|quanterty)$/i;
  function tweetRunners() {
    const v = D.getViral ? D.getViral() : null;
    const out = [];
    if (!v) return out;
    const now = Date.now();
    const cand = [];
    for (const p of v.posts || []) cand.push({ t: p, coins: (p.coins || []).map((c) => [c, true]).concat((p.spec_coins || []).map((c) => [c, false])), at: p.posted_at || p.created_at });
    for (const t of v.trader_tweets || []) cand.push({ t, coins: (t.coins || []).map((c) => [c, true]), at: t.created_at });
    for (const x of cand) {
      if (!x.coins.length || !x.at) continue;
      const ageH = (now - new Date(x.at).getTime()) / 3.6e6;
      const m = x.t.metrics || {};
      const views = m.views || 0, likes = m.likes || 0;
      const vel = ageH > 0 ? views / Math.max(ageH, 0.5) : 0;
      const big = BIG_AUTHORS.test(x.t.handle || '');
      // strict: ≤ 24 h old AND (≥ 1M views or ≥ 20k likes or ≥ 150k views/h) AND (big author or ≥ 3M views)
      if (ageH > 24 || !((views >= 1e6 || likes >= 2e4 || vel >= 1.5e5) && (big || views >= 3e6))) continue;
      const [coin, named] = x.coins[0];
      out.push({ kind: 'tweet', key: 'tw:' + (x.t.url || x.t.id), t: x.t, at: x.at, ageH, views, likes, vel, named, coin, score: Math.min(1, Math.log10(Math.max(views, 1e5)) / 7) * (named ? 1 : 0.8),
        why: [`@${E(x.t.handle)}`, views ? fmtK(views) + ' views' : fmtK(likes) + ' ♥', vel ? fmtK(vel) + ' views/h' : '', named ? L('coin w tweecie', 'coin named') : L('spekulacja', 'speculative')].filter(Boolean) });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 6);
  }
  function runnerList(chain) {
    const uni = (D.getUniverse ? D.getUniverse() : []).filter((c) => !chain || chain === 'all' || (c.chainId || 'solana') === chain);
    const run = uni.map(runnerOf).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 15);
    const isRun = new Set(run.map((x) => x.key));
    const legs = uni.filter((c) => !isRun.has(D.keyOf(c))).map(leg2Of).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);
    const coins = run.concat(legs);
    return { coins, tweets: tweetRunners() };
  }
  function hotBadgeHtml(o) {
    const parts = [];
    for (const r of (o.pop && o.pop.reasons) || []) {
      if (r.k === 'vol') parts.push(`vol 1h ${D.fmtUsd(r.v)}${r.up ? ' ↑' : ''}`);
      if (r.k === 'tx') parts.push(`${r.v >= 1000 ? (r.v / 1000).toFixed(1) + 'k' : r.v} txns`);
      if (r.k === 'trend') parts.push(`trending #${r.v}`);
      if (r.k === 'tweet') parts.push(L('tweet na X', 'X tweet'));
      if (r.k === 'sm') parts.push(`${r.v} SM`);
    }
    return `<span class="hotb" translate="no">🔥 ${L('Popularne teraz', 'Hot now')}${parts.length ? ': ' + parts.slice(0, 3).join(' · ') : ''}</span>`;
  }
  /** Good Coins row: hot badge + prominent 8 h estimate + the expandable details. */
  function goodRowHtml(c) {
    const o = goodOutlook(c);
    if (!o.a) return '';
    const z8 = o.a.horizons && o.a.horizons.find((z) => z.h === 8);
    const big = z8 ? `<div class="g8" translate="no"><b>8h</b> ${L('bazowo', 'base')} <b class="${z8.base > 0 ? 'up' : 'dn'}">${z8.base > 0 ? '+' : ''}${z8.base}%</b> <span class="mut">· ${L('zakres', 'range')}</span> <span class="ups-v ups-${z8.scen}">+${z8.lo}–${z8.hi}%</span> <span class="mut">· ${L('pewność', 'conf.')} ${z8.conf}%</span></div>` : '';
    const gl = `<div class="gpass" translate="no">✅ ${L('Bezpieczny', 'Safe')} · ✅ ${L('Popularny', 'Hot')} · ✅ ${L('Potencjał 8h', '8h upside')}</div>`;
    return hotBadgeHtml(o) + big + (o.ok ? gl : '') + upsideRowHtml(c);
  }
  const SCEN = { low: ['niski', 'low'], med: ['średni', 'medium'], high: ['wysoki', 'high'] };
  const VERD = {
    up: ['↗ Możliwy dalszy wzrost', '↗ Room to run'],
    neutral: ['→ Neutralnie', '→ Neutral'],
    late: ['↘ Raczej po ruchu — ryzyko spadku', '↘ Likely late — downside risk'],
    risk: ['⛔ Wysokie ryzyko — bez oceny', '⛔ High risk — no rating'],
  };
  const DISC = () => L('To nie prognoza ani porada finansowa — memecoiny mogą spaść do zera.', 'This is not a forecast or financial advice — memecoins can go to zero.');
  function upsideLabel(a) {
    if (a.noData) return `<span class="ups-n">${L('Potencjał: za mało danych', 'Upside: not enough data')}</span>`;
    if (a.gated) return `<span class="ups-r">⛔ ${L('wysokie ryzyko, brak szacunku', 'high risk, no estimate')}</span>`;
    return `<span class="ups-v ups-${a.scen}">📈 +${a.lo}–${a.hi}% ${L('w', 'in')} ${a.tf}</span> <span class="ups-s ups-${a.scen}">${L(SCEN[a.scen][0], SCEN[a.scen][1])}</span>`;
  }
  const CONF = { low: ['niska', 'low'], med: ['średnia', 'medium'], high: ['wysoka', 'high'] };
  function horizonsHtml(a) {
    if (a.gated || a.noData || !a.horizons) return '';
    return `<table class="hz"><thead><tr><th>${L('Czas', 'Horizon')}</th><th>${L('Bazowo', 'Base')}</th><th>${L('Zakres', 'Range')}</th><th>${L('Scenariusz', 'Scenario')}</th><th>${L('Pewność', 'Confidence')}</th></tr></thead><tbody>
      ${a.horizons.map((z) => `<tr><td>${z.label}</td><td class="${z.base > 0 ? 'up' : z.base < 0 ? 'dn' : 'mut'}" style="font-weight:700">${z.base > 0 ? '+' : ''}${z.base}%</td><td class="ups-v ups-${z.scen}">+${z.lo}–${z.hi}%</td><td><span class="ups-s ups-${z.scen}">${L(SCEN[z.scen][0], SCEN[z.scen][1])}</span></td><td><span class="hz-c"><i style="width:${z.conf}%"></i></span> ${z.conf}% <span class="mut">${L(CONF[z.confLabel][0], CONF[z.confLabel][1])}</span></td></tr>`).join('')}
      </tbody></table><div class="mut" style="font-size:10.5px;margin-top:3px">${L('Pewność spada z dłuższym czasem. Spadek zawsze możliwy do −100%.', 'Confidence drops with longer horizons. Downside always possible to −100%.')}</div>`;
  }
  function compactHz(a) {
    if (a.gated || a.noData || !a.horizons) return upsideLabel(a);
    const z1 = a.horizons.find((z) => z.h === 1), z8 = a.horizons.find((z) => z.h === 8);
    return `<span class="ups-v ups-${z1.scen}">📈 1h +${z1.lo}–${z1.hi}%</span> <span class="mut">·</span> <span class="ups-v ups-${z8.scen}">8h +${z8.lo}–${z8.hi}%</span> <span class="ups-s ups-${a.scen}">${L(SCEN[a.scen][0], SCEN[a.scen][1])}</span>`;
  }
  function verdictHtml(a) { return `<span class="verd verd-${a.verdict}">${L(VERD[a.verdict][0], VERD[a.verdict][1])}</span>`; }
  function prosConsHtml(a) {
    return `<div class="pc">${a.pros.length ? `<div><b class="up">${L('Za', 'For')}</b><ul>${a.pros.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
      ${a.cons.length ? `<div><b class="dn">${L('Przeciw', 'Against')}</b><ul>${a.cons.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}</div>`;
  }
  /** Compact one-line (list rows). Tap → expands inline details. */
  function upsideRowHtml(c) {
    let a;
    try { a = analyze(c); } catch (e) { return ''; }
    const k = E(D.keyOf(c));
    return `<div class="upl" data-upk="${k}" role="button" tabindex="0" translate="no" title="${E(L('Potencjał (spekulacja) — dotknij, żeby zobaczyć dlaczego', 'Upside (speculative) — tap for why'))}">${compactHz(a)} · ${verdictHtml(a)} <span class="upl-x">▾</span></div>
      <div class="upx" hidden translate="no">
        <div class="upx-h">${L('Potencjał (spekulacja)', 'Upside (speculative)')}</div>
        ${horizonsHtml(a)}
        <div class="upx-h">${L('Dlaczego tu jest', 'Why it\u2019s here')}</div>
        <ul class="why-l">${a.why.slice(0, 6).map((x) => `<li>${x}</li>`).join('')}</ul>
        <div class="upx-h">${L('Może iść w górę?', 'Room to run?')} ${verdictHtml(a)}</div>
        ${prosConsHtml(a)}
        <div class="upx-f"><a href="#" data-upinfo>${L('Jak liczone?', 'How is this calculated?')}</a> · ${DISC()}</div>
      </div>`;
  }
  /** Full card (coin page): Potencjał + Dlaczego tu jest + Może iść w górę? */
  function upsideCardHtml(c, ext, loading) {
    const a = analyze(c, ext);
    const why = whyHtml(c, { inner: true });
    return `<div class="card upcard" translate="no">
      <div class="h" style="font-size:14px;margin:0 0 4px">${L('Potencjał (spekulacja)', 'Upside (speculative)')} <span class="badge demo">${L('szacunek', 'estimate')}</span>${loading ? ` <span class="kc-load mut" style="font-size:11px">${L('uzupełniam dane…', 'loading data…')}</span>` : ''}</div>
      <button type="button" class="upbig" data-upinfo>${upsideLabel(a)} <span class="mut" style="font-size:11px">ⓘ ${L('jak liczone', 'how')}</span></button>
      ${!a.gated && !a.noData ? `<div class="mut" style="font-size:11.5px;margin:4px 0 8px">${L('Siła sygnału', 'Signal strength')} ${Math.round(a.G * 100)}/100 · ${L('ryzyko spadku zawsze do −100%', 'downside always up to −100%')}</div>` : ''}
      ${horizonsHtml(a)}
      <div class="upx-h" style="margin-top:12px">${L('Dlaczego tu jest', 'Why it\u2019s here')}</div>
      ${ext && ext.good ? `<div class="mut" style="font-size:11.5px;margin-bottom:4px">${ext.good.ok ? L('Przeszedł 3 bramki Good Coins:', 'Passed all 3 Good Coins gates:') : L('Bramki Good Coins:', 'Good Coins gates:')}</div>${gatesHtml(ext.good)}` : ''}
      <ul class="why-l">${a.why.map((x) => `<li>${x}</li>`).join('')}</ul>
      <div class="upx-h" style="margin-top:12px">${L('Może iść w górę?', 'Room to run?')} ${verdictHtml(a)}</div>
      ${prosConsHtml(a)}
      <div class="upx-f">${DISC()}</div>
    </div>${why}`;
  }
  const remP = {};
  function remoteShared(c) {
    const ck = (c.chainId || 'solana') + ':' + c.address, hit = remCache[ck];
    if (hit && Date.now() - hit.t < 5 * 60e3) return Promise.resolve(hit.v);
    if (!remP[ck]) remP[ck] = remoteChecks(c).then((rem) => { if (rem.srcs.length) remCache[ck] = { t: Date.now(), v: rem }; delete remP[ck]; return rem; }).catch(() => { delete remP[ck]; return { checks: [], srcs: [] }; });
    return remP[ck];
  }
  function concFrom(rem) {
    for (const k of rem.checks || []) {
      const m = String(k.txt).match(/Top 10 holderów[^0-9]*(\d+)%/);
      if (m) return +m[1] / 100;
      if (/Top 10 holders high ownership|ponad 70%/.test(k.txt)) return 0.7;
      if (/High holder concentration|ponad 50%/.test(k.txt)) return 0.55;
    }
    return null;
  }
  async function mountUpside(slot, c) {
    if (!slot) return;
    const remote = c.chainId === 'solana' || c.chainId === 'bsc' || !c.chainId;
    slot.innerHTML = upsideCardHtml(c, null, remote);
    let rem = { checks: [], srcs: [] };
    if (remote) rem = await remoteShared(c);
    // price since the linked tweet (GeckoTerminal candle, cached 24h)
    const tw = tweetLinks(c)[0];
    if (tw && tw.at && c.pairAddress) { try { await priceAtTweet({ chain: c.chainId || 'solana', address: c.address, pair: c.pairAddress, pair_created_at: c.pairCreatedAt }, tw.at); } catch (e) {} }
    if (!slot.isConnected) return;
    // holder concentration only matters off-curve (on the curve the curve itself holds the supply)
    if (!contractCached(c) && (c.chainId === 'solana' || c.chainId === 'bsc' || !c.chainId)) { try { const v = await contractFacts(c); CF[D.keyOf(c)] = { t: Date.now(), v: v || { checked: true, chain: c.chainId || 'solana', error: true } }; } catch (e) {} }
    if (!slot.isConnected) return;
    const good = goodOutlook(c);
    slot.innerHTML = upsideCardHtml(c, { checks: rem.checks.filter((k) => !(c.onCurve && !c.migrated && k.lvl === 'info')), conc: c.onCurve && !c.migrated ? null : concFrom(rem), good }, false);
  }
  /* explanation sheet */
  function openUpInfo() {
    let el = document.getElementById('upSheet');
    if (!el) {
      el = document.createElement('div');
      el.id = 'upSheet';
      el.className = 'upsheet';
      el.setAttribute('translate', 'no');
      document.body.appendChild(el);
      el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-upclose]')) el.classList.remove('on'); });
    }
    el.innerHTML = `<div class="upsheet-b" role="dialog" aria-modal="true" aria-label="${E(L('Jak liczony jest potencjał', 'How the upside is calculated'))}">
      <div class="upsheet-g"></div>
      <div class="h" style="font-size:16px;margin:0 0 8px">${L('Jak liczony jest „Potencjał (spekulacja)”', 'How “Upside (speculative)” is calculated')}</div>
      <p>${L('Szacunek Kyvo łączy publiczne dane z DexScreener, GeckoTerminal, RugCheck/GoPlus, śledzonych portfeli i X. Nikt tu nie wie, co zrobi cena.', 'Kyvo\'s estimate combines public data from DexScreener, GeckoTerminal, RugCheck/GoPlus, tracked wallets and X. Nobody here knows what the price will do.')}</p>
      <ol>
        <li>${L('<b>Bezpieczeństwo:</b> coiny z czerwonymi flagami (np. honeypot, mint/freeze, bardzo mała płynność, gwałtowny zrzut, możliwa kopia) nie dostają szacunku.', '<b>Safety:</b> coins with red flags (e.g. honeypot, mint/freeze, very thin liquidity, a sharp dump, a likely clone) get no estimate.')}</li>
        <li>${L('<b>Siła sygnału (0–100):</b> łączy momentum, przewagę kupujących, wolumen, smart money, tweety na X, Kyvo Check i płynność. Minus za koncentrację holderów, „już po ruchu” i spadek.', '<b>Signal strength (0–100):</b> combines momentum, buyer pressure, volume, smart money, X tweets, Kyvo Check and liquidity. Minus for holder concentration, “already ran” and dumping.')}</li>
        <li>${L('<b>Zakres:</b> mniejsze coiny mogą ruszyć się mocniej, większe spokojniej; zakres skaluje siła sygnału.', '<b>Range:</b> smaller coins can move more, bigger ones less; the range scales with signal strength.')}</li>
        <li>${L('<b>Horyzonty 30 min – 8 h:</b> pewność maleje dla dłuższych horyzontów i przy brakujących danych. Liczone od nowa przy każdym odświeżeniu.', '<b>Horizons 30 min – 8 h:</b> confidence shrinks for longer horizons and when data is missing. Recomputed on every refresh.')}</li>
        <li>${L('<b>Może iść w górę?</b> „Raczej po ruchu”, „Neutralnie” albo „Możliwy dalszy wzrost” — wg siły sygnału i argumentów za/przeciw pokazanych przy coinie.', '<b>Room to run?</b> “Likely late”, “Neutral” or “Room to run” — from signal strength and the pros/cons shown on the coin.')}</li>
      </ol>
      <p class="mut">${L('Na listach liczymy z danych rynkowych; na stronie coina dochodzą RugCheck/GoPlus (holderzy) i cena od tweeta. Zakres pokazuje, jaki ruch takie setupy <i>czasem</i> robią — większość memecoinów i tak spada. Ryzyko spadku zawsze do −100%.', 'Lists use market data only; the coin page adds RugCheck/GoPlus (holders) and price since the tweet. The range shows the move such setups <i>sometimes</i> make — most memecoins still fall. Downside is always up to −100%.')}</p>
      <div class="upsheet-d">⚠️ ${DISC()}</div>
      <button type="button" class="pf-btn" data-upclose style="width:100%;margin-top:10px">${L('Rozumiem', 'Got it')}</button>
    </div>`;
    requestAnimationFrame(() => el.classList.add('on'));
  }
  document.addEventListener('click', (e) => {
    const info = e.target.closest && e.target.closest('[data-upinfo]');
    if (info) { e.preventDefault(); e.stopPropagation(); openUpInfo(); return; }
    const up = e.target.closest && e.target.closest('.upl');
    if (up) {
      e.preventDefault(); e.stopPropagation();
      const x = up.nextElementSibling;
      if (x && x.classList.contains('upx')) { x.hidden = !x.hidden; up.classList.toggle('open', !x.hidden); }
    }
  }, true);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.upl')) { e.preventDefault(); e.stopPropagation(); e.target.closest('.upl').click(); }
    if (e.key === 'Escape') { const s = document.getElementById('upSheet'); if (s) s.classList.remove('on'); }
  }, true);

  window.KyvoUpside = { estimate: estimateUpside, popularity: estimatePopularity, goodCoinRule, runnerRule, earlyRunnerRule, secondLegRule, bigRunnerRule, horizons: UPSIDE_HORIZONS };
  window.KyvoInsights = {
    init(deps) { D = deps; updateBadge(); ensurePoll(); },
    mountCheck, localChecks, scoreOf, cloneCheck, whyHtml,
    watchButtonHtml, wireWatchButton, renderWatch, addAlert, alertsOf, removeAlert, isWatched, toggleWatch, getWatch: () => watch, checkAlerts, _live: live,
    fillTweetSince, priceAtTweet, fullScore,
    analyze, runnerList, runnerOf, tweetRunners, goodOutlook, goodRowHtml, contractFacts, gatesHtml, estimateUpside, estimatePopularity, goodCoinRule, UPSIDE_HORIZONS, upsideRowHtml, upsideCardHtml, mountUpside, openUpInfo, tweetLinks,
  };
})();
