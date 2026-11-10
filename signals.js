/* Kyvo v8.46 Sygnały — coins where at least 2 traders Kyvo already tracks bought in the last 6 hours.
   Sources (public feeds already produced by the server loop, no new APIs, no keys):
     * data/tracker_feed.json — top Ranking wallets' pump.fun buys (tools/pump_tracker.py)
     * data/steven_live.json — 👤 bystevenr copy feed (tools/steven.py), one trader
     * data/rowdy_live.json — 👤 Rowdy copy feed (tools/rowdy.py), both of his wallets count as one trader
   The tab shows the count only. Trader names and wallet addresses are never put in the DOM.
   No sample rows: zero qualifying coins → the empty state. Not financial advice. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KyvoSignals = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var WINDOW_MS = 6 * 3600 * 1000;
  var SKIP = {
    So11111111111111111111111111111111111111112: 1,
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 1,
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 1
  };
  /* Public copy-feed wallets already published in tools/steven.py and tools/rowdy.py.
     Used only to collapse one person into one count. Never rendered. */
  var STEVEN = 'AH75Bn6QHSt5K2Ad4p1otns3JTwpSJWZTwiwKWNhmnKx';
  var ROWDY = ['DKgvpfttzmJqZXdavDwTxwSVkajibjzJnN2FA99dyciK', 'CzU8MaRcwvwUoNkwJFLbvtFWJugcEXAhDDQqNFE4ybb7'];
  var CHAIN = { solana: 'SOL', bsc: 'BSC', robinhood: 'RH' };
  var CHAIN_FILTERS = [
    { id: 'all', pl: 'Wszystkie', en: 'All' },
    { id: 'solana', pl: 'SOL', en: 'SOL' },
    { id: 'bsc', pl: 'BSC', en: 'BSC' },
    { id: 'robinhood', pl: 'Robinhood', en: 'Robinhood' }
  ];
  function normChain(c) {
    var x = String(c || 'solana').toLowerCase();
    if (x === 'sol' || x === 'solana') return 'solana';
    if (x === 'bnb' || x === 'bsc') return 'bsc';
    if (x === 'rh' || x === 'robin' || x === 'robinhood') return 'robinhood';
    return x || 'solana';
  }
  function normAddr(chain, addr) {
    var a = String(addr || '');
    return chain === 'solana' ? a : a.toLowerCase();
  }

  function ms(v) {
    var n = +v;
    if (!isFinite(n) || n <= 0) return 0;
    return n < 1e12 ? n * 1000 : n;
  }
  function aliasMap(src) {
    var m = {};
    function add(w, id) { if (w) m[w] = id; }
    add(STEVEN, 'c:steven');
    for (var i = 0; i < ROWDY.length; i++) add(ROWDY[i], 'c:rowdy');
    var lists = [['steven', 'c:steven'], ['rowdy', 'c:rowdy']];
    for (var L = 0; L < lists.length; L++) {
      var items = (src[lists[L][0]] && src[lists[L][0]].items) || [];
      for (var j = 0; j < items.length; j++) {
        var nest = items[j] && items[j][lists[L][0]];
        if (nest && nest.wallet) add(nest.wallet, lists[L][1]);
      }
    }
    return m;
  }
  function tid(map, wallet, fallback) {
    if (wallet && map[wallet]) return map[wallet];
    if (wallet) return 'w:' + wallet;
    return fallback || '';
  }
  function slot(map, chain, addr) {
    var c = normChain(chain);
    var a = normAddr(c, addr);
    var k = c + ':' + a;
    var s = map[k];
    if (!s) {
      s = { chain: c, addr: a, sym: '', name: '', img: '', pair: '', dex: '', mc: null, liq: null, traders: {} };
      map[k] = s;
    }
    return s;
  }
  function touch(s, id, t, cut, now) {
    if (!id || !(t >= cut && t <= now + 120000)) return;
    var x = s.traders[id];
    if (!x) s.traders[id] = { first: t, last: t };
    else { if (t < x.first) x.first = t; if (t > x.last) x.last = t; }
  }
  function paint(s, p) {
    if (!s.sym && p.sym) s.sym = p.sym;
    if (!s.name && p.name) s.name = p.name;
    if (!s.img && p.img) s.img = p.img;
    if (!s.pair && p.pair) s.pair = p.pair;
    if (!s.dex && p.dex) s.dex = p.dex;
    if (p.mc != null && isFinite(+p.mc) && +p.mc > 0 && (p.prefer || s.mc == null)) s.mc = +p.mc;
    if (p.liq != null && isFinite(+p.liq) && +p.liq > 0 && (p.prefer || s.liq == null)) s.liq = +p.liq;
  }
  function addCopy(coins, map, items, nest, fallback, cut, now) {
    for (var i = 0; i < (items || []).length; i++) {
      var e = items[i];
      if (!e || !e.addr || SKIP[e.addr]) continue;
      var meta = e[nest] || {};
      var s = slot(coins, e.chain || 'solana', e.addr);
      var id = tid(map, meta.wallet, fallback);
      touch(s, id, ms(meta.buy_at || e.at), cut, now);
      touch(s, id, ms(e.lastAt), cut, now);
      var snap = e.snap || {};
      paint(s, { sym: e.sym, name: e.name, img: e.img, pair: e.pair, dex: meta.dex, mc: e.mcNow || e.mc0, liq: snap.liq });
    }
  }

  /* Pure aggregator. `now` is epoch ms. Returned rows have no trader ids, names, or wallets. */
  function build(src, now) {
    src = src || {};
    now = now || Date.now();
    var cut = now - WINDOW_MS;
    var map = aliasMap(src);
    var coins = {};
    addCopy(coins, map, (src.steven && src.steven.items) || [], 'steven', 'c:steven', cut, now);
    addCopy(coins, map, (src.rowdy && src.rowdy.items) || [], 'rowdy', 'c:rowdy', cut, now);
    var tf = src.tracker || {};
    var trades = tf.trades || [];
    for (var i = 0; i < trades.length; i++) {
      var t = trades[i];
      if (!t || !t.buy || !t.m || !t.w || SKIP[t.m]) continue;
      var ch = normChain(t.chain || t.ch || 'solana');
      touch(slot(coins, ch, t.m), tid(map, t.w, ''), ms(t.at), cut, now);
    }
    var meta = tf.coins || {};
    for (var mint in meta) {
      if (!Object.prototype.hasOwnProperty.call(meta, mint)) continue;
      var s = coins['solana:' + normAddr('solana', mint)];
      if (!s) continue;
      var c = meta[mint] || {};
      paint(s, { sym: c.s, name: c.n, img: c.img, pair: c.pair, dex: c.dex, mc: c.mc, liq: c.liq, prefer: true });
    }
    var rows = [];
    for (var k in coins) {
      if (!Object.prototype.hasOwnProperty.call(coins, k)) continue;
      var coin = coins[k];
      var ids = Object.keys(coin.traders);
      if (ids.length < 2) continue;
      var first = Infinity, last = 0;
      for (var j = 0; j < ids.length; j++) {
        var tr = coin.traders[ids[j]];
        if (tr.first < first) first = tr.first;
        if (tr.last > last) last = tr.last;
      }
      rows.push({
        key: coin.chain + ':' + coin.addr,
        chain: coin.chain,
        addr: coin.addr,
        sym: coin.sym || '?',
        name: coin.name || coin.sym || '?',
        img: coin.img || '',
        mc: coin.mc,
        liq: coin.liq,
        pair: coin.pair || '',
        dex: coin.dex || '',
        n: ids.length,
        first: first,
        last: last
      });
    }
    rows.sort(function (a, b) { return b.n - a.n || b.last - a.last; });
    return rows;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function L(en, pl, enText) { return en ? enText : pl; }
  function clock(t, en) {
    var d = new Date(t);
    if (!isFinite(d.getTime())) return '—';
    var loc = en ? 'en-GB' : 'pl-PL';
    var hm = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    var today = new Date();
    if (d.toDateString() === today.toDateString()) return hm;
    var day = d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
    return day + ', ' + hm;
  }
  function ago(t, en) {
    var sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 60) return sec + (en ? ' s ago' : ' s temu');
    if (sec < 3600) return Math.floor(sec / 60) + (en ? ' min ago' : ' min temu');
    var h = Math.floor(sec / 3600);
    if (h < 48) return h + (en ? ' h ago' : ' h temu');
    return Math.floor(h / 24) + (en ? ' d ago' : ' dni temu');
  }
  function money(n, fmtUsd) {
    if (n == null || !isFinite(+n) || +n <= 0) return '';
    return fmtUsd ? fmtUsd(+n) : ('$' + Math.round(+n));
  }
  function hotClass(n) { return n >= 4 ? ' hot4' : n >= 3 ? ' hot3' : ''; }

  function rowHtml(r, en, hooks) {
    var badge = CHAIN[r.chain] || String(r.chain || '').slice(0, 3).toUpperCase();
    var img = hooks.img ? hooks.img(r) : (r.img
      ? '<img class="tok" src="' + esc(r.img) + '" width="42" height="42" alt="" loading="lazy">'
      : '<span class="tok sig-mono" aria-hidden="true">' + esc((r.sym || '?').slice(0, 1).toUpperCase()) + '</span>');
    var mc = money(r.mc, hooks.fmtUsd), liq = money(r.liq, hooks.fmtUsd);
    var facts = [];
    if (mc) facts.push('MC <b>' + esc(mc) + '</b>');
    if (liq) facts.push((en ? 'Liq' : 'Płynność') + ' <b>' + esc(liq) + '</b>');
    var chart = 'https://dexscreener.com/' + encodeURIComponent(r.chain || 'solana') + '/' + encodeURIComponent(r.addr);
    return '<article class="sig' + hotClass(r.n) + '" data-key="' + esc(r.key) + '" role="listitem">' +
      '<div class="sig-top">' + img +
        '<div class="nm"><b><span class="cbadge c-' + esc(r.chain || 'solana') + '">' + esc(badge) + '</span> ' +
          esc(r.name) + ' <span class="mut" style="font-weight:600">$' + esc(r.sym) + '</span></b>' +
          '<span class="sig-n">' + r.n + ' ' + (en ? (r.n === 1 ? 'trader' : 'traders') : 'traderów') + '</span></div></div>' +
      '<div class="sig-meta">' + (en ? 'First' : 'Pierwsze') + ' <b>' + esc(clock(r.first, en)) + '</b> <span class="mut">(' + esc(ago(r.first, en)) + ')</span>' +
        ' · ' + (en ? 'latest' : 'ostatnie') + ' <b>' + esc(clock(r.last, en)) + '</b> <span class="mut">(' + esc(ago(r.last, en)) + ')</span></div>' +
      (facts.length ? '<div class="sig-meta">' + facts.join(' · ') + '</div>' : '') +
      '<div class="sig-acts">' +
        '<button type="button" data-sig-copy="' + esc(r.addr) + '">' + (en ? 'Copy CA' : 'Kopiuj CA') + '</button>' +
        '<a data-sig-chart href="' + esc(chart) + '" target="_blank" rel="noopener noreferrer">' + (en ? 'Chart' : 'Wykres') + '</a>' +
      '</div></article>';
  }

  var sigChain = 'all';
  function shell(en, body, chain) {
    return '<div class="sig-page" translate="no">' +
      '<div class="sig-lead"><h2>' + (en ? 'Signals' : 'Sygnały') + '</h2>' +
      '<p>' + (en
        ? 'Memecoins on Solana, BSC and Robinhood Chain that at least 2 traders Kyvo already tracks bought in the last 6 hours. Only the count is shown — no names and no wallet addresses.'
        : 'Memecoiny na Solanie, BSC i Robinhood Chain, które w ostatnich 6 godzinach kupiło co najmniej 2 traderów śledzonych przez Kyvo. Widać tylko liczbę — bez nazw i bez adresów portfeli.') +
      '</p><div class="sig-chains" role="tablist">' + CHAIN_FILTERS.map(function (c) {
        return '<button type="button" data-sig-chain="' + c.id + '"' + (c.id === (chain || 'all') ? ' class="on"' : '') + '>' + (en ? c.en : c.pl) + '</button>';
      }).join('') + '</div></div>' + body +
      '<p class="sig-note">' + (en
        ? 'Not financial advice. A tracked buy is not a prediction.'
        : 'To nie jest porada finansowa. Zakup obserwowanego tradera nie jest prognozą.') + '</p></div>';
  }

  function listBody(rows, en, hooks, chain) {
    var shown = !chain || chain === 'all' ? rows : rows.filter(function (r) { return r.chain === chain; });
    if (!shown.length) {
      var name = chain === 'robinhood' ? 'Robinhood Chain' : chain === 'bsc' ? 'BSC' : chain === 'solana' ? 'Solana' : '';
      return '<div class="empty">' + (name
        ? (en
          ? 'No ' + name + ' signal in the last 6 hours. Nothing on this chain was bought by at least 2 tracked traders.'
          : 'Brak sygnału ' + name + ' w ostatnich 6 h. Na tej sieci żaden coin nie ma wejść od co najmniej 2 obserwowanych traderów.')
        : (en
          ? 'No signal in the last 6 hours. Nothing here was bought by at least 2 tracked traders. The list fills itself when that happens — Kyvo does not add examples.'
          : 'Brak sygnału w ostatnich 6 h. Żaden coin nie ma teraz wejść od co najmniej 2 obserwowanych traderów. Lista uzupełni się sama, gdy tak się stanie — Kyvo nie dodaje przykładów.')) + '</div>';
    }
    return '<div class="sig-wrap" role="list">' + shown.map(function (r) { return rowHtml(r, en, hooks || {}); }).join('') + '</div>';
  }

  function paintPage(root, src, hooks) {
    var en = !!(hooks && hooks.isEn && hooks.isEn());
    var rows;
    try { rows = build(src || {}, Date.now()); } catch (e) { rows = []; }
    root._sigRows = rows;
    root.innerHTML = shell(en, listBody(rows, en, hooks, sigChain), sigChain);
  }

  var cache = { at: 0, src: null };
  function load(force) {
    if (cache.src && !force && Date.now() - cache.at < 60000) return Promise.resolve(cache.src);
    function one(url) {
      return fetch(url + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' }).then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; });
    }
    return Promise.all([
      one('data/tracker_feed.json'),
      one('data/steven_live.json'),
      one('data/rowdy_live.json')
    ]).then(function (all) {
      var src = { tracker: all[0], steven: all[1], rowdy: all[2], _ok: !!(all[0] || all[1] || all[2]) };
      if (src._ok) { cache.src = src; cache.at = Date.now(); }
      return src;
    });
  }

  function copyText(addr, hooks) {
    var done = function () { if (hooks && hooks.toast) hooks.toast(hooks.isEn && hooks.isEn() ? 'Contract copied' : 'Skopiowano CA'); };
    var fail = function () { if (hooks && hooks.toast) hooks.toast(hooks.isEn && hooks.isEn() ? 'Could not copy' : 'Nie udało się skopiować'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(done, fail);
      return;
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = addr; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); done();
    } catch (e) { fail(); }
  }

  function show(root, hooks) {
    if (!root) return;
    var en = !!(hooks && hooks.isEn && hooks.isEn());
    if (!root._sigWired) {
      root._sigWired = true;
      root.addEventListener('click', function (e) {
        var chip = e.target.closest && e.target.closest('[data-sig-chain]');
        if (chip) { e.preventDefault(); sigChain = chip.getAttribute('data-sig-chain') || 'all'; if (root._sigSrc) paintPage(root, root._sigSrc, hooks); return; }
        var retry = e.target.closest && e.target.closest('[data-sig-retry]');
        if (retry) { e.preventDefault(); cache.at = 0; cache.src = null; show(root, hooks); return; }
        var copy = e.target.closest && e.target.closest('[data-sig-copy]');
        if (copy) { e.preventDefault(); e.stopPropagation(); copyText(copy.getAttribute('data-sig-copy'), hooks); return; }
        if (e.target.closest && e.target.closest('[data-sig-chart]')) return;
        var row = e.target.closest && e.target.closest('[data-key]');
        if (row) location.hash = '#coin/' + encodeURIComponent(row.getAttribute('data-key'));
      });
    }
    if (!cache.src) root.innerHTML = '<div class="loading"><div class="spin"></div>' + (en ? 'Loading signals…' : 'Ładuję sygnały…') + '</div>';
    load(false).then(function (src) {
      if (!root.isConnected) return;
      if (!src._ok) {
        root._sigSrc = null;
        root.innerHTML = shell(en, '<div class="empty">' + (en ? 'Signals could not load. ' : 'Nie udało się wczytać sygnałów. ') +
          '<button type="button" class="pill" data-sig-retry>' + (en ? 'Try again' : 'Spróbuj ponownie') + '</button></div>', sigChain);
        return;
      }
      root._sigSrc = src;
      paintPage(root, src, hooks);
    });
  }

  return { WINDOW_MS: WINDOW_MS, build: build, show: show, load: load };
});
