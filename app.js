/* KYVO_LIVE_v8_35 — v8.35: 👥 sprawdzanie holderów (data/holders.json, tools/holders.py: RugCheck, bez puli/LP/krzywej/burn): ⚠️ 'mało holderów'
   (holderów < 300, top 10 > 30%, 1 portfel > 10%, dev rugował, rug) na każdym wierszu listy (Runner bez zmian — tylko odznaka), 🚀 Runner 2.0
   nie pokazuje i nie pushuje takich coinów, push Runner / Wczesny dostaje '⚠️ …' w treści, strona coina pokazuje top 10 / top 1 bez puli.
   KYVO_LIVE_v8_34 — v8.34: 🚀 nowa zakładka Runner 2.0 (obok Runnera i w Więcej): tylko coiny z Runnera / ⚡ Wczesnego, które przeszły filtry v8.34 (coin ≥ 1 h — młody sprawdzany ponownie po 30–60 min i tylko gdy cena ≥ 0,9× ceny z oznaczenia; bez +100% w 1 h; wolumen 1 h ≤ 1,5× MC), % od wejścia do Runner 2.0, podpowiedź „Sprzedaj ½ na x2, resztę trailing −30%” · osobne powiadomienia 🚀 Runner 2.0 (przełącznik w Powiadomieniach, domyślnie włączone) · 🏃 Runner, jego pushe, ⚡ Wczesny i Gold bez zmian · realniejsze przewidywania (niższy scenariusz bazowy, bez 6–8 h dla coinów < 6 h, „Większość takich coinów oddaje wzrost w 1–3 h”) · przewidywanie zapisywane w Wynikach · v8.33: ⚡ Wczesny Runner (push na starcie pompy, tools/early_runner.py) · jedna reguła wiarygodnej ceny wejścia (pairs.js entryCheck: watchlista z samonaprawą, GTA „od dodania”, Wyniki, statystyki) — koniec „>+99 999%” · nagłówek „2 h 47 min temu” + odświeżanie po powrocie z tła (timeout 20 s) · v8.32: v8.32: 🎮 GTA 6 „📈 od dodania” (ile % poszedł każdy GTA coin od kiedy Kyvo go wykryło / od pusha 🎮 GTA, max od tego czasu, kiedy dodany; plik data/gta_added.json z tools/gta_push.py) · v8.31: 🔔 nowe powiadomienia 🎮 GTA 6 (za darmo, przełącznik „🎮 GTA 6” w Powiadomieniach, domyślnie włączone): nowy GTA coin, który naprawdę rośnie (MC ≥ $25K, prawdziwy wolumen i płynność), i ważne newsy GTA 6 (każdy post Rockstar Games o GTA VI, konta fanowskie tylko trailer / data premiery / opóźnienie); max 1 na 10 min, 15 dziennie.
   KYVO_LIVE_v8_30 — v8.30: 🎮 nowa zakładka GTA 6 (za darmo dla wszystkich): nowe GTA coiny, GTA coiny co rosną (runnery GTA), największe GTA coiny i tweety o GTA (Rockstar Games, GTA 6 Countdown, Rockstar INTEL + każdy śledzony tweet o GTA, 72 h). Strona coina jak wszędzie.
   KYVO_LIVE_v8_29 — v8.29: 📈 strona coina nie przeładowuje się co 45 s (wykres DexScreener nie kręci się w kółko, statystyki i Cena aktualizowane na miejscu, Cena zgodna z MC), mniej zapytań GeckoTerminal przy otwartym coinie, 🧠 smart money z serwera na żywo (stare >72 h ukryte), Viral → New Tweet gdy dane z X są stare.
   KYVO_LIVE_v8_28 — v8.28: 🔔 krótkie powiadomienia (typ + $SYM + jedna liczba, bez dopisków), wyłączenie typu (🥇 Gold, nowy 👀 Smart money…) naprawdę zatrzymuje push („Zapisano” dopiero po zapisie w OneSignal).
   KYVO_LIVE_v8_27 — v8.26: 🔗 link do coina (push / udostępnienie) otwiera stronę coina od razu przy starcie apki — jeden coin pobierany bezpośrednio (DexScreener z ponowieniem, zapas GeckoTerminal), szkielet ładowania, „Nie znaleziono.” dopiero po nieudanych próbach + „Spróbuj ponownie” + 🏠 pierwszy start: ładowanie zamiast „Brak coinów dla tych filtrów”, dopóki nie przyjdą pierwsze dane.
   KYVO_LIVE_v8_25 — v8.25: 🏆 Wyniki — każdy Runner zapisany od razu po skanie (serwer co ~90 s, pierwsza cena i MC, historia oznaczeń do audytu) + 🏃 Runner: lepsza preselekcja (najgorętsze coiny najpierw, do 15 na sieć) + 🔁 Kolejna fala liczona też na serwerze (w apce znaczek „📱 tylko ten telefon” dla wykrytych lokalnie) + 🔔 tydzień promocji: wszyscy dostają pushe Premium/Runners do 7.11 23:59, nieudane pushe odrzucane po 3 próbach + 🔑 logowanie Google (Supabase, UE — włączy się po konfiguracji) + 👻 Phantom na telefonie: logowanie przez aplikację Phantom z powrotem do Kyvo (tylko podpis wiadomości) + kod Cloudflare Worker do szybkich pushy (wyłączony).
   KYVO_LIVE_v8_24 — v8.24: 🔔 powiadomienia tylko o super ważnych tweetach (Trump i Kimchi: każdy nowy post; Elon i duże konta krypto — CZ, Vitalik, Saylor, Armstrong, Toly, Ansem, Murad, Cobie, Hsaka, Hayes, ZachXBT, Pentoshi, top traderzy memecoinów — tylko coin / rynek / ogromny zasięg; max 5 dziennie na konto, 20 łącznie) + nowy wygląd pushy (autor + @handle, treść tweeta, zmiana ceny coina od tweeta z prawdziwych danych, avatar / logo coina, „· Kyvo”; Runner: $TICKER + % 1h, logo, otwiera stronę coina) + 🏃 Runner: ostrzejszy filtr dla pul < 30 min, test cienia reguły „wczesny Runner” (tylko log, bez pushy), Wyniki: max liczony tylko ze świec po sygnale + baner „🔔 Włącz powiadomienia” w zainstalowanej apce · v8.23: ⭐ New Tweet: Elon Musk + Donald Trump replies too (↪ Odpowiedź + the post they replied to) + VIP push for every new Elon / Trump post or reply (grouped, ≥10 min apart, ≤20/day per account; Premium + Runners, everyone during the free week) · v8.22: 🎁 free launch week (everyone gets the top tier Runners until 7.11 23:59 Warsaw, expires on its own; paid status + push tags unchanged) · v8.20: 🎴 Kreator P&L in Journal (9:16 card with your own photo / video background → PNG / MP4·WebM; v8.19 free hour removed) · v8.19: free hour (ended 19:00 Warsaw Oct 28) · v8.18: homepage "Największy znaleziony coin +X%" pill · v8.17: 📅 Kalendarz P&L in Journal (month grid in $, Record W-L-BE, month profit, on-chain badge, tap a day, share month card) · v8.16: v8.16: tier-aware push (OneSignal tag tier=free/premium/runners; server routes each push type per plan) · v8.15: 📓 Journal (Premium) + Obsidian design layer (theme.css, fx.js, self-hosted fonts) on top of
   KYVO_LIVE_v8_14_1 — v8.14.1 pricing: two paid tiers (Premium $9.99→$4.99 launch -50%: 3 Runners/day + full Gold/Tracker/notifications · 🏃 Runners $49.99→$24.99: all Runners + Runner/smart-money push; free 1 Runner/day; owner = Runners; payments not live) · v8.14 pump.fun-style coin page (live trades stream, area/candle chart with MC axis, KOL/whale markers, Callouts/Holders/About/Pairs tabs, alerts, pump.fun CTA), pump.fun traders in Ranking (source chips), 👀 Tracker (follow wallets, live swaps, cluster buys, Premium push) · v8.13 launch sweep: one main-pool price rule (pairs.js), watchlist entry repair · v8.12 🥇 Gold tab (Orangie-style coin DD: Sprawdź coin + Gold feed + Gold alerts) · v8.11 Runners = Premium (free: 1 Runner / Warsaw day) + owner unlock · v8.10 New Tweet = every fresh tweet of ~43 big accounts (Elon, Trump, CZ, KOLs) + mentioned / related coin · v8.9 continuous server feeds (~1-3 min) + 📈 Big runner ($1M–$100M) + robust charts · v8.8 👑 KOL coin + 🚀 Moon run · v8.7 watchlist P/L since added · multi-chain Pulse + smart money + leaderboard + Viral z X + onboarding/legal/login. Not financial advice. */
(function () {
  'use strict';

  const DS = 'https://api.dexscreener.com';
  const GT = 'https://api.geckoterminal.com/api/v2';
  const CACHE_KEY = 'kyvo_coins_v7';
  const FILT_KEY = 'kyvo_filters_v7';
  const CHAIN_KEY = 'kyvo_chain_v7';
  const REFRESH_MS = 45000;
  // v8.5: never the Kyvo mascot as a coin/trader picture — neutral grey dot instead
  const FALLBACK_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#2a2f3a"/></svg>');
  const MVP_MARKER = 'KYVO_LIVE_v8_25';
  /** Pump.fun / four.meme graduation commonly cited ~$69k MC on bonding curve — estimate only. */
  const PUMP_GRAD_MCAP = 69000;
  const FOUR_GRAD_MCAP = 69000;

  const CHAINS = ['solana', 'bsc', 'robinhood', 'all'];
  const CHAIN_LABEL = { solana: 'Solana', bsc: 'BSC', robinhood: 'Robin', all: 'Wszystkie' };
  const CHAIN_BADGE = { solana: 'SOL', bsc: 'BSC', robinhood: 'RH' };
  const GECKO_NET = { solana: 'solana', bsc: 'bsc', robinhood: 'robinhood' };

  const CURVE_DEX = { pumpfun: PUMP_GRAD_MCAP, fourmeme: FOUR_GRAD_MCAP };
  const MIG_DEX_BY_CHAIN = {
    solana: new Set(['pumpswap', 'raydium', 'meteora', 'orca', 'moonshot', 'fluxbeam']),
    bsc: new Set(['pancakeswap']),
    robinhood: new Set(), // no public bonding→DEX graduation flow identified
  };
  const ALL_MIG = new Set([].concat(...Object.values(MIG_DEX_BY_CHAIN).map((s) => [...s])));

  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const toastEl = $('#toast');
  let toastT;
  function toast(t) {
    toastEl.textContent = t;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 1800);
  }

  function fmtUsd(n) {
    if (n == null || !isFinite(n) || Number(n) === 0) return '—';
    if (n < 0) { const r = fmtUsd(-n); return r === '—' ? r : '-' + r; }
    const a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    if (a >= 1) return '$' + n.toFixed(2);
    if (a >= 0.0001) return '$' + n.toFixed(6).replace(/0+$/, '').replace(/\.$/, ''); // v8.29: $0.62, not $0.620000
    if (a < 1e-10) return '—';
    return '$' + Number(n).toExponential(2);
  }
  function fmtLiq(c) {
    const liq = c && c.liquidity;
    if (c && c.onCurve && (liq == null || !isFinite(liq) || liq <= 0)) return 'krzywa';
    if (liq == null || !isFinite(liq) || liq <= 0) return '—';
    if (liq < 1) return '<$1';
    return fmtUsd(liq);
  }
  function fmtPct(n) {
    if (n == null || !isFinite(n)) return '—';
    if (Math.abs(n) >= 1e5) return n > 0 ? '>+99 999%' : '−100%'; // v8.6: brand-new pools report absurd % (price from ~0)
    return (n >= 0 ? '+' : '') + Number(n).toFixed(n >= 1000 || n <= -1000 ? 0 : 1) + '%';
  }
  function pctClass(n) {
    if (n == null || !isFinite(n)) return 'mut';
    return n >= 0 ? 'up' : 'dn';
  }
  function shortCa(a) {
    return a ? a.slice(0, 4) + '…' + a.slice(-4) : '—';
  }
  function ageFrom(ms) {
    if (!ms) return '—';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return Math.floor(s) + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 86400 * 30) return Math.floor(s / 86400) + 'd';
    return Math.floor(s / (86400 * 30)) + 'mo';
  }
  function ageHours(ms) {
    if (!ms) return null;
    return (Date.now() - ms) / 3600000;
  }
  function timeAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    return isFinite(t) ? agoLabel(iso) : '';
  }
  function fmtInt(n) {
    if (n == null) return '—';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function parseNum(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  }
  function coinKey(chain, addr) {
    return String(chain || 'solana') + ':' + String(addr || '');
  }
  function keyOf(c) {
    return coinKey(c.chainId, c.address);
  }
  /* v8.35 👥 holder check — data/holders.json (tools/holders.py, server loop after every scan; RugCheck, pools / LP / curve / burn
     excluded). w = few (holders < 300) / top10 (> 30 %) / top1 (> 10 %) / devrug / rugged -> ⚠️ 'mało holderów' badge on every list row
     (Runner stays as-is, only the badge), 🚀 Runner 2.0 never lists flagged coins, coin page shows the facts. Missing file = no badges. */
  let holdDoc = null, holdAt = 0, holdBusy = false;
  async function loadHolders() {
    if (holdBusy || (holdDoc && Date.now() - holdAt < 120e3)) return holdDoc;
    holdBusy = true;
    try { const r = await fetch('data/holders.json?t=' + Math.floor(Date.now() / 120000), { cache: 'no-store' }); holdDoc = r.ok ? await r.json() : holdDoc || { coins: {} }; } catch (e) { holdDoc = holdDoc || { coins: {} }; }
    holdAt = Date.now(); holdBusy = false;
    return holdDoc;
  }
  function holdOf(k) { const m = holdDoc && holdDoc.coins; return (m && k && m[String(k).toLowerCase()]) || null; }
  function holdText(h, en) {
    const w = (h && h.w) || [];
    if (!w.length) return '';
    const L2 = (pl, e) => (en ? e : pl);
    if (w.includes('rugged')) return L2('RugCheck: rug', 'RugCheck: rugged');
    if (w.includes('devrug')) return L2('dev rugował wcześniej', 'dev rugged before');
    if (w.includes('few') && h.h != null) return L2(`mało holderów (${h.h})`, `few holders (${h.h})`);
    if (w.includes('top10')) return L2(`top 10 ma ${Math.round(h.t10)}%`, `top 10 hold ${Math.round(h.t10)}%`);
    if (w.includes('top1')) return L2(`1 portfel ma ${Math.round(h.t1)}%`, `1 wallet holds ${Math.round(h.t1)}%`);
    return L2('mało holderów', 'few holders');
  }
  function holdBadge(k, hh) {
    const h = hh || holdOf(k), en = window.KyvoI18n && window.KyvoI18n.isEn(), t = holdText(h, en);
    if (!t) return '';
    const tip = (en ? 'Holder check (RugCheck, pools excluded): ' : 'Sprawdzenie holderów (RugCheck, bez puli): ') + [h.h != null ? h.h + ' holders' : '', h.t10 != null ? 'top 10 ' + h.t10 + '%' : '', h.t1 != null ? 'top 1 ' + h.t1 + '%' : ''].filter(Boolean).join(' · ');
    return ` <span class="holdbadge" translate="no" title="${esc(tip)}">⚠️ ${esc(t)}</span>`;
  }
  window.KyvoHold = { get: holdOf, badge: holdBadge, text: holdText, load: loadHolders };
  function chainBadge(c) {
    const id = c.chainId || 'solana';
    return CHAIN_BADGE[id] || id.slice(0, 3).toUpperCase();
  }

  function agoLabel(isoOrSec) {
    let t;
    if (typeof isoOrSec === 'number') t = isoOrSec * 1000;
    else t = new Date(isoOrSec).getTime();
    if (!isFinite(t)) return '—';
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    return agoShort(sec);
  }
  /* honest timestamp: "20.10, 08:43 (3h temu)" in the user's local time */
  function stampLabel(iso) {
    const t = iso ? new Date(iso).getTime() : NaN;
    if (!isFinite(t)) return 'brak danych';
    const d = new Date(t);
    const hm = d.toLocaleTimeString((window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL'), { hour: '2-digit', minute: '2-digit' });
    const day = d.toLocaleDateString((window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL'), { day: '2-digit', month: '2-digit' });
    const today = new Date().toDateString() === d.toDateString();
    return (today ? 'dziś ' : day + ', ') + hm + ' (' + agoLabel(iso) + ')';
  }
  function viralStale() {   // v8.29: data/x_viral.json older than 48 h (or missing)
    const t = viral && viral.updated_at ? new Date(viral.updated_at).getTime() : NaN;
    return !isFinite(t) || Date.now() - t > 48 * 3600000;
  }
  function staleHtml(iso, hours, what) {
    const t = iso ? new Date(iso).getTime() : NaN;
    if (!isFinite(t)) return `<div class="card" style="font-size:12.5px;color:var(--warn)">Brak informacji o aktualizacji ${esc(what)}.</div>`;
    const h = (Date.now() - t) / 3600000;
    return h > hours ? `<div class="card" style="font-size:12.5px;color:var(--warn)">Uwaga: ${esc(what)} mają już ${Math.floor(h)} h — mogą być nieaktualne.</div>` : '';
  }
  function smartBuysForMint(mint) {
    if (!smartMoney || !smartMoney.by_mint) return [];
    return smartMoney.by_mint[mint] || [];
  }
  /* smart-money consensus: unique buyers (72h) and who of them already sold */
  let consCache = null;
  function smConsensus(mint) {
    if (!smartMoney) return { buyers: [], sellers: [] };
    if (!consCache) {
      consCache = {};
      const sells = {};
      for (const a of smartMoney.activity || []) if (a.side === 'sell') (sells[a.mint] = sells[a.mint] || new Set()).add(a.wallet_name || a.wallet_id);
      for (const [m, arr] of Object.entries(smartMoney.by_mint || {})) {
        const b = [...new Set(arr.map((x) => x.wallet_name || x.wallet_id))];
        const sl = sells[m] ? [...sells[m]].filter((n) => b.includes(n)) : [];
        consCache[m] = { buyers: b, sellers: sl };
      }
    }
    return consCache[mint] || { buyers: [], sellers: [] };
  }
  function consensusOf(c) {
    return (c.chainId === 'solana' || !c.chainId) ? smConsensus(c.address) : { buyers: [], sellers: [] };
  }
  function fmtSize(b) {
    if (b && b.usd_size != null && isFinite(b.usd_size) && b.usd_size > 0) return b.usd_size < 1 ? '<$1' : '~' + fmtUsd(b.usd_size);
    if (b && b.sol_size != null && isFinite(b.sol_size) && b.sol_size > 0) return '~' + Number(b.sol_size).toFixed(2) + ' SOL';
    return '—';
  }
  /* v8.29: data/smart_money.json is a manual snapshot (last one 20.10) — its buys showed as "🧠 SM" for 11 days. Now:
     buys older than 72 h are dropped, and the live server feed data/tracker_feed.json (top ~60 Ranking wallets' pump.fun
     trades, every ~4 min) is merged in, so the badges, Konsensus SM and the coin page's Smart money card are fresh. */
  let smLoadedAt = 0;
  async function loadSmartMoney() {
    smLoadedAt = Date.now();
    const cut = Date.now() / 1000 - 72 * 3600;
    let sm = null, tf = null;
    try { sm = await fetchJson('data/smart_money.json?v=8.2'); } catch (e) {}
    try { tf = await fetchJson('data/tracker_feed.json?t=' + Math.floor(Date.now() / 60000)); } catch (e) {}
    const by = {}, act = [], seen = new Set();
    const add = (m, row, side) => {
      if (!m || !row || !(row.block_time >= cut)) return;
      const id = row.tx_url || (row.wallet + m + row.block_time + side);
      if (seen.has(id)) return; seen.add(id);
      if (side === 'buy') (by[m] = by[m] || []).push(row);
      act.push(Object.assign({ mint: m, side }, row));
    };
    if (sm) {
      for (const [m, arr] of Object.entries(sm.by_mint || {})) for (const r of arr || []) add(m, r, 'buy');
      for (const a of sm.activity || []) if (a.side === 'sell') add(a.mint, a, 'sell');
    }
    let fresh = sm && sm.updated_at;
    if (tf && Array.isArray(tf.trades)) {
      const names = {};
      for (const w of tf.wallets || []) if (w && w.address) names[w.address] = w;
      for (const t of tf.trades) {
        if (!t || !t.m || !t.w) continue;
        const w = names[t.w] || {};
        add(t.m, { wallet_id: w.id || t.w, wallet_name: w.name || (t.w.slice(0, 4) + '…' + t.w.slice(-4)), handle: null, wallet: t.w,
          usd_size: t.usd != null ? +t.usd : null, sol_size: t.sol != null ? +t.sol : null, block_time: +t.at, tx_url: t.tx ? 'https://solscan.io/tx/' + t.tx : '' }, t.buy ? 'buy' : 'sell');
      }
      if (tf.updated_at && (!fresh || tf.updated_at > fresh)) fresh = tf.updated_at;
    }
    for (const m of Object.keys(by)) by[m].sort((a, b) => b.block_time - a.block_time);
    act.sort((a, b) => b.block_time - a.block_time);
    smartMoney = { by_mint: by, activity: act, updated_at: fresh || null };
    consCache = null;
  }
  async function loadLeaderboard() {
    try {
      leaderboard = await fetchJson('data/leaderboard.json?d=' + Math.floor(Date.now() / 3600000));
      if (!leaderboard || !Array.isArray(leaderboard.leaders)) throw new Error('bad leaderboard');
      try { localStorage.setItem('kyvo_lb_last', JSON.stringify(leaderboard)); } catch (e) {}
    } catch (e) {
      // v8.5: show the last ranking this browser saw instead of an empty screen
      let last = null;
      try { last = JSON.parse(localStorage.getItem('kyvo_lb_last') || 'null'); } catch (e2) { last = null; }
      leaderboard = last && Array.isArray(last.leaders) ? Object.assign(last, { _offline: true }) : { leaders: [], updated_at: null, _failed: true };
    }
  }



  /* ---- Fuzzy ---- */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function levenshtein(a, b) {
    a = norm(a); b = norm(b);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 0; i < a.length; i++) {
      let prev = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cur = a[i] === b[j] ? row[j] : 1 + Math.min(prev, row[j], row[j + 1]);
        row[j] = prev;
        prev = cur;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  }
  function fuzzyScore(query, name, symbol, address) {
    const q = norm(query);
    if (!q) return 0;
    const n = norm(name), sy = norm(symbol), ad = String(address || '').toLowerCase();
    if (ad && ad === query.trim().toLowerCase()) return 100;
    if (ad && query.length >= 6 && ad.includes(query.trim().toLowerCase())) return 95;
    if (sy === q || n === q) return 100;
    if (sy.startsWith(q) || n.startsWith(q)) return 90;
    if (sy.includes(q) || n.includes(q)) return 80;
    const dSy = levenshtein(q, sy);
    const dN = levenshtein(q, n.slice(0, Math.max(q.length + 2, sy.length)));
    const best = Math.min(dSy, dN);
    const maxLen = Math.max(q.length, sy.length, 1);
    if (best <= 1 && q.length >= 3) return 75;
    if (best <= 2 && q.length >= 4) return 60;
    if (best / maxLen <= 0.34) return 50;
    return 0;
  }

  /** Only platforms with verified URL formats for that chain. */
  function platformUrls(addr, chain) {
    const a = encodeURIComponent(addr);
    const c = (chain || 'solana').toLowerCase();
    const out = {
      DexScreener: `https://dexscreener.com/${c}/${a}`,
    };
    if (c === 'solana') {
      out.FOMO = `https://fomo.family/tokens/solana/${a}`; // FOMO route tokens/:chain/:address (universal link → opens the FOMO app on iPhone)
      out.Axiom = `https://axiom.trade/t/${a}?chain=sol`;
      out.Photon = `https://photon-sol.tinyastro.io/en/lp/${a}`;
      out.GMGN = `https://gmgn.ai/sol/token/${a}`;
      out.Explorer = `https://solscan.io/token/${a}`;
    } else if (c === 'bsc') {
      out.FOMO = `https://fomo.family/tokens/bnb/${a}`; // FOMO chain slug for BSC is "bnb"
      out.GMGN = `https://gmgn.ai/bsc/token/${a}`;
      out.PancakeSwap = `https://pancakeswap.finance/swap?outputCurrency=${a}&chain=bsc`;
      out.Explorer = `https://bscscan.com/token/${a}`;
      // Axiom / Photon: Solana-only terminals — omitted
    } else if (c === 'robinhood') {
      out.FOMO = `https://fomo.family/tokens/robinhood/${a}`;
      out.Explorer = `https://hoodexplorer.io/token/${a}`;
      // No verified GMGN / Axiom / Photon URLs for Robinhood Chain
    }
    return out;
  }

  function platButtonsHtml(urls) {
    const order = ['FOMO', 'Axiom', 'Photon', 'GMGN', 'PancakeSwap'];
    const keys = order.filter((k) => urls[k]);
    if (!keys.length) return '';
    const cols = Math.min(4, keys.length);
    return `<div class="plats" style="grid-template-columns:repeat(${cols},1fr)">${keys
      .map((k, i) => `<a class="plat${i === 0 ? ' p0' : ''}" href="${esc(urls[k])}" target="_blank" rel="noopener noreferrer">${esc(k)}</a>`)
      .join('')}</div>`;
  }

  /* ---- Chain switcher ---- */
  let activeChain = 'solana';
  function loadChain() {
    try {
      const v = localStorage.getItem(CHAIN_KEY);
      if (v && CHAINS.includes(v)) activeChain = v;
    } catch (e) {}
  }
  function saveChain() {
    try {
      localStorage.setItem(CHAIN_KEY, activeChain);
    } catch (e) {}
  }
  function setActiveChain(ch) {
    if (!CHAINS.includes(ch)) return;
    activeChain = ch;
    saveChain();
    // sync filter chain fields
    for (const k of FILTER_TABS) {
      if (filters[k]) filters[k].chain = ch;
    }
    saveFilters();
    renderChainSwitcher();
    try { updateRunnerBadge(); } catch (e) {} // Runner tab/badge follow the active chain (notifications cover all chains)
    if (['pulse', 'hot', 'good', 'new', 'stretch', 'migrated', 'boosted', 'runner', 'track'].includes(view)) setView(view);
    else if (view === 'search') {
      const q = ($('#q') && $('#q').value.trim()) || '';
      if (q) runSearch(q);
    }
  }
  function renderChainSwitcher() {
    const el = $('#chainSwitch');
    if (!el) return;
    el.innerHTML = CHAINS.map(
      (c) =>
        `<button type="button" data-chain="${c}" class="${activeChain === c ? 'on' : ''}">${esc(CHAIN_LABEL[c])}</button>`
    ).join('');
    $$('#chainSwitch [data-chain]').forEach((b) =>
      b.addEventListener('click', () => setActiveChain(b.getAttribute('data-chain')))
    );
  }
  function chainSupportsStretch(ch) {
    return ch === 'solana' || ch === 'bsc' || ch === 'all';
  }
  function chainSupportsMigrated(ch) {
    return ch === 'solana' || ch === 'bsc' || ch === 'all';
  }
  function chainNote(ch) {
    if (ch === 'robinhood') {
      return 'Robinhood Chain nie ma publicznej bonding curve jak pump.fun czy four.meme, więc Final Stretch i Migrated są tu niedostępne. New Pairs, Good i Hot działają.';
    }
    if (ch === 'bsc') {
      return 'BSC: Final Stretch = four.meme · Migrated = PancakeSwap.';
    }
    if (ch === 'all') {
      return 'Wszystkie sieci: Solana + BSC + Robinhood Chain.';
    }
    return 'Solana: Final Stretch = pump.fun · Migrated = PumpSwap / Raydium / Meteora.';
  }

  /* ---- Filters ---- */
  const FILTER_TABS = ['pulse', 'hot', 'good', 'new', 'stretch', 'migrated', 'boosted'];
  const DEFAULT_FILTERS = {
    hot: { mcapMin: '', mcapMax: '', liqMin: '', volMin: '', ageMaxH: '', ageMinH: '', chg5mMin: '', chg1hMin: '', buyRatioMin: '', hasSocials: false, chain: 'solana' },
    good: { mcapMin: '', mcapMax: '', liqMin: '25000', volMin: '', ageMaxH: '', ageMinH: '0.25', chg5mMin: '', chg1hMin: '0', buyRatioMin: '0.55', hasSocials: false, chain: 'solana', v: 84 }, // v8.3 = 3-gate defaults
    new: { mcapMin: '10000', mcapMax: '', liqMin: '', volMin: '', ageMaxH: '48', ageMinH: '', chg5mMin: '', chg1hMin: '', buyRatioMin: '', hasSocials: false, chain: 'solana' },
    stretch: { mcapMin: '25000', mcapMax: '', liqMin: '', volMin: '', ageMaxH: '168', ageMinH: '', chg5mMin: '', chg1hMin: '', buyRatioMin: '', hasSocials: false, chain: 'solana' },
    migrated: { mcapMin: '10000', mcapMax: '', liqMin: '5000', volMin: '', ageMaxH: '168', ageMinH: '', chg5mMin: '', chg1hMin: '', buyRatioMin: '', hasSocials: false, chain: 'solana' },
    boosted: { mcapMin: '', mcapMax: '', liqMin: '', volMin: '', ageMaxH: '', ageMinH: '', chg5mMin: '', chg1hMin: '', buyRatioMin: '', hasSocials: false, chain: 'solana' },
    pulse: { mcapMin: '10000', mcapMax: '', liqMin: '', volMin: '', ageMaxH: '48', ageMinH: '', chg5mMin: '', chg1hMin: '', buyRatioMin: '', hasSocials: false, chain: 'solana' },
  };

  let filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS));
  function loadFilters() {
    try {
      const raw = localStorage.getItem(FILT_KEY) || localStorage.getItem('kyvo_filters_v5');
      if (!raw) return;
      const o = JSON.parse(raw);
      for (const k of FILTER_TABS) {
        if (o[k]) filters[k] = Object.assign({}, DEFAULT_FILTERS[k], o[k]);
        if (k === 'good' && (!o.good || o.good.v !== 84)) filters.good = Object.assign({}, DEFAULT_FILTERS.good); // v8.3: reset old Good Coins defaults once
      }
    } catch (e) {}
  }
  function saveFilters() {
    try {
      localStorage.setItem(FILT_KEY, JSON.stringify(filters));
    } catch (e) {}
  }

  function applyFilters(list, tab) {
    const f = filters[tab] || DEFAULT_FILTERS.hot;
    const mcapMin = parseNum(f.mcapMin);
    const mcapMax = parseNum(f.mcapMax);
    const liqMin = parseNum(f.liqMin);
    const volMin = parseNum(f.volMin);
    const ageMaxH = parseNum(f.ageMaxH);
    const ageMinH = parseNum(f.ageMinH);
    const chg5mMin = parseNum(f.chg5mMin);
    const chg1hMin = parseNum(f.chg1hMin);
    const buyRatioMin = parseNum(f.buyRatioMin);
    const chain = activeChain;

    return list.filter((c) => {
      if (chain && chain !== 'all' && (c.chainId || 'solana') !== chain) return false;
      const mc = c.mcap;
      if (mcapMin != null && (mc == null || mc < mcapMin)) return false;
      if (mcapMax != null && (mc == null || mc > mcapMax)) return false;
      if (liqMin != null && (c.liquidity || 0) < liqMin) return false;
      if (volMin != null && (c.volume.h24 || 0) < volMin) return false;
      const ah = ageHours(c.pairCreatedAt);
      if (ageMaxH != null && (ah == null || ah > ageMaxH)) return false;
      if (ageMinH != null && (ah == null || ah < ageMinH)) return false;
      if (chg5mMin != null && (c.change.m5 == null || c.change.m5 < chg5mMin)) return false;
      if (chg1hMin != null && (c.change.h1 == null || c.change.h1 < chg1hMin)) return false;
      if (buyRatioMin != null && (c.buyRatioH1 == null || c.buyRatioH1 < buyRatioMin)) return false;
      if (f.hasSocials && !c.hasSocials) return false;
      return true;
    });
  }

  function filtSummary(tab) {
    // v8.4: never print Kyvo's filter thresholds; only say whether the user's own filters are on
    const f = filters[tab] || {}, d = (DEFAULT_FILTERS && DEFAULT_FILTERS[tab]) || {};
    const keys = ['mcapMin', 'mcapMax', 'liqMin', 'volMin', 'ageMaxH', 'ageMinH', 'hasSocials', 'buyRatioMin'];
    const custom = keys.some((k) => String(f[k] == null ? '' : f[k]) !== String(d[k] == null ? '' : d[k]));
    return (CHAIN_LABEL[activeChain] || activeChain) + ' · ' + (custom ? 'Twoje filtry' : 'filtry Kyvo');
  }

  /* ---- State ---- */
  let coins = [];
  let newPoolCoins = [];
  let byKey = {};
  let viral = null;
  let view = 'pulse';
  let mobilePulseTab = 'new';
  let selectedKey = null;
  let lastFetch = 0;
  let liveLoaded = false;   // v8.26: true after the FIRST live fetch finished (ok or not) -> before that an empty list = loading, not 'Brak coinów'
  let fetchErr = null;
  let sourceLabel = '';
  let filtOpen = false;
  let smartMoney = null; // data/smart_money.json
  let leaderboard = null; // data/leaderboard.json
  let goodSortSmart = false;


  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), coins, newPoolCoins, sourceLabel }));
    } catch (e) {}
  }
  function loadCache() {
    try {
      const o = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!o || !Array.isArray(o.coins) || !o.coins.length) return false;
      coins = o.coins;
      newPoolCoins = o.newPoolCoins || [];
      indexAll();
      sourceLabel = 'z pamięci, odświeżam…';
      lastFetch = o.t || 0;
      return true;
    } catch (e) {
      return false;
    }
  }
  function indexAll() {
    byKey = {};
    for (const c of coins.concat(newPoolCoins)) byKey[keyOf(c)] = c;
  }

  /* ---- v8.3 real token logos ----
     Order: 1) DexScreener info.imageUrl (pairs/tokens API) or token-profile icon
            2) GeckoTerminal token image_url (new_pools?include=base_token, then tokens/multi batch for the rest)
            3) Pump.fun image CDN (Solana mints from pump.fun, tried in <img> onerror chain)
            4) monogram placeholder (symbol initials, colour from address) — never a fake logo.
     Resolved URLs are cached in memory + localStorage (kyvo_img_v1, max 1500, 3 days). */
  const IMG_KEY = 'kyvo_img_v2'; // v8.4: v1 could hold pump.fun placeholder (Pepe) URLs → dropped
  try { localStorage.removeItem('kyvo_img_v1'); } catch (e) {}
  let imgCache = {};
  try { imgCache = JSON.parse(localStorage.getItem(IMG_KEY) || '{}') || {}; } catch (e) { imgCache = {}; }
  let imgDirty = false;
  const imgMiss = {}; // key -> ts of a GT lookup that returned no image (retry after 30 min)
  function goodImg(u) { return typeof u === 'string' && /^https:\/\//.test(u) && !/missing(_|\.)|placeholder/i.test(u) ? u : null; }
  function rememberImg(chain, addr, url) {
    const u = goodImg(url);
    if (!u || !addr) return;
    const k = coinKey(chain || 'solana', addr);
    if (imgCache[k] && imgCache[k].u === u) return;
    imgCache[k] = { u, t: Date.now() };
    imgDirty = true;
  }
  function flushImg() {
    if (!imgDirty) return;
    imgDirty = false;
    const cut = Date.now() - 3 * 86400000;
    const ent = Object.entries(imgCache).filter(([, v]) => v && v.t > cut).sort((a, b) => b[1].t - a[1].t).slice(0, 1500);
    imgCache = Object.fromEntries(ent);
    try { localStorage.setItem(IMG_KEY, JSON.stringify(imgCache)); } catch (e) {}
  }
  setInterval(flushImg, 4000);
  function cachedImg(chain, addr) { const v = imgCache[coinKey(chain || 'solana', addr)]; return v ? v.u : null; }
  function pumpImg(chain, addr, dexId) {
    if ((chain || 'solana') !== 'solana' || !addr) return null;
    if (!/pump$/i.test(addr) && dexId !== 'pumpfun' && dexId !== 'pumpswap') return null;
    return 'https://images.pump.fun/coin-image/' + encodeURIComponent(addr) + '?variant=86x86';
  }
  let MONO_STRIP = null; try { MONO_STRIP = new RegExp('[^\\p{L}\\p{N}]', 'gu'); } catch (e) { MONO_STRIP = null; } // old Safari: no \p{} → ASCII fallback
  const MONO_COL = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16', '#6366f1', '#f97316'];
  function monogram(sym, addr) {
    const t = Array.from(String(sym || '?').replace(MONO_STRIP || /[\s$!-\/:-@\[-`{-~]/g, '')).slice(0, 2).join('').toUpperCase() || '?';
    let h = 0; for (const ch of String(addr || sym || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const col = MONO_COL[h % MONO_COL.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${col}"/><text x="32" y="41" font-family="Arial,Helvetica,sans-serif" font-size="${t.length > 1 ? 24 : 30}" font-weight="700" text-anchor="middle" fill="#fff">${t.replace(/[<&>"]/g, '')}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  /** Ordered candidate list for a coin-ish object ({chainId|chain, address, image, symbol, dexId}). */
  function imgCandidates(c) {
    const chain = c.chainId || c.chain || 'solana';
    const out = [];
    const push = (u) => { u = goodImg(u); if (u && !out.includes(u)) out.push(u); };
    // v8.6: DexScreener CMS serves 800 px logos for 42 px rows — ask for its 128 px variant first (≈4× smaller), original as fallback
    const thumb = (u) => (typeof u === 'string' && /^https:\/\/cdn\.dexscreener\.com\/cms\/images\/[^?]+\?/.test(u) ? u.split('?')[0] + '?width=128&height=128&quality=80&format=auto' : null);
    push(thumb(c.image));
    push(c.image);
    push(cachedImg(chain, c.address));
    push(pumpImg(chain, c.address, c.dexId || c.dex));
    return { list: out, mono: monogram(c.symbol, c.address) };
  }
  window.__kyvoImgErr = function (el) {
    const fb = (el.getAttribute('data-fb') || '').split('|').filter(Boolean);
    const next = fb.shift();
    el.setAttribute('data-fb', fb.join('|'));
    if (next) { el.src = next; return; }
    el.onerror = null;
    el.src = el.getAttribute('data-mono') || FALLBACK_IMG;
    el.classList.add('mono');
  };
  /* v8.4: images.pump.fun answers unknown mints with a 302 to a generic placeholder (Pepe) — that is NOT the coin's
     logo. Verify once per URL with a no-redirect HEAD (CDN sends CORS *); a redirect = placeholder → next candidate. */
  const pumpOk = {}; // url -> true | false | Promise
  function checkPump(u) {
    if (pumpOk[u] !== undefined) return Promise.resolve(pumpOk[u]);
    return (pumpOk[u] = fetch(u, { method: 'HEAD', redirect: 'manual', mode: 'cors', cache: 'force-cache' })
      .then((r) => r.type !== 'opaqueredirect' && r.status === 200).catch(() => null)
      .then((v) => { if (v === null) { delete pumpOk[u]; return true; } pumpOk[u] = v; return v; }));
  }
  window.__kyvoImgOk = function (el) {
    const k = el.getAttribute('data-ik');
    const src = el.currentSrc || el.src;
    if (/images\.pump\.fun\/coin-image\//.test(src) && pumpOk[src] !== true) {
      checkPump(src).then((ok) => {
        if (!ok) { if ((el.currentSrc || el.src) === src) window.__kyvoImgErr(el); return; }
        if (k) { const [ch, ...rest] = k.split(':'); rememberImg(ch, rest.join(':'), src); }
      });
      return;
    }
    if (k && !/^data:/.test(src) && !el.classList.contains('mono')) {
      const [ch, ...rest] = k.split(':');
      rememberImg(ch, rest.join(':'), el.currentSrc || el.src);
    }
  };
  /* GeckoTerminal tokens/multi batch for coins still without a logo (one call per network, ≤30 addresses) */
  let imgFillBusy = false;
  async function fillMissingImages(list) {
    if (imgFillBusy) return;
    imgFillBusy = true;
    try {
      const byNet = {};
      for (const c of list) {
        if (!c || !c.address) continue;
        const ch = c.chainId || 'solana', k = coinKey(ch, c.address);
        if (goodImg(c.image) || cachedImg(ch, c.address) || (imgMiss[k] && Date.now() - imgMiss[k] < 30 * 60e3)) continue;
        // v8.4: pump CDN is only a last resort (placeholder for unknown mints) → still ask GeckoTerminal
        (byNet[ch] = byNet[ch] || []).push(c.address);
      }
      let changed = false;
      for (const [net, addrs] of Object.entries(byNet)) {
        if (view === 'coin') break;   // v8.29: a coin was opened meanwhile — leave GeckoTerminal to its chart
        const chunk = [...new Set(addrs)].slice(0, 30);
        if (!GECKO_NET[net] || !chunk.length) continue;
        try {
          const g = await fetchJson(GT + '/networks/' + GECKO_NET[net] + '/tokens/multi/' + chunk.join(','));
          const got = {};
          for (const t of (g && g.data) || []) {
            const a = t.attributes || {};
            if (a.address && goodImg(a.image_url)) got[String(a.address).toLowerCase()] = a.image_url;
          }
          for (const addr of chunk) {
            const u = got[String(addr).toLowerCase()];
            if (u) { rememberImg(net, addr, u); changed = true; } else imgMiss[coinKey(net, addr)] = Date.now();
          }
        } catch (e) { for (const addr of chunk) imgMiss[coinKey(net, addr)] = Date.now(); }
      }
      if (changed) {
        for (const c of allUniverse()) if (!goodImg(c.image)) { const u = cachedImg(c.chainId, c.address); if (u) c.image = u; }
        document.querySelectorAll('img[data-ik].mono, img[data-ik][data-noimg]').forEach((el) => {
          const [ch, ...rest] = el.getAttribute('data-ik').split(':');
          const u = cachedImg(ch, rest.join(':'));
          if (u) { el.classList.remove('mono'); el.removeAttribute('data-noimg'); el.onerror = () => window.__kyvoImgErr(el); el.src = u; }
        });
      }
    } finally { imgFillBusy = false; }
  }

  function pairToCoin(p, meta) {
    if (!p || !p.baseToken) return null;
    const bt = p.baseToken;
    const liq = (p.liquidity && p.liquidity.usd) || 0;
    const vol = p.volume || {};
    const ch = p.priceChange || {};
    const info = p.info || {};
    const tx = p.txns || {};
    const h1 = tx.h1 || {};
    const buys = h1.buys != null ? Number(h1.buys) : null;
    const sells = h1.sells != null ? Number(h1.sells) : null;
    let buyRatioH1 = null;
    if (buys != null && sells != null && buys + sells > 0) buyRatioH1 = buys / (buys + sells);
    const socials = info.socials || (meta && meta.links) || [];
    const websites = info.websites || [];
    const mcap = p.marketCap != null ? Number(p.marketCap) : p.fdv != null ? Number(p.fdv) : null;
    const dexId = p.dexId || '';
    const chainId = p.chainId || 'solana';
    let curveEst = null;
    const grad = CURVE_DEX[dexId];
    if (grad && mcap != null) {
      curveEst = Math.min(99.9, Math.max(0, (mcap / grad) * 100));
    }
    const migSet = MIG_DEX_BY_CHAIN[chainId] || ALL_MIG;
    return {
      address: bt.address,
      name: bt.name || bt.symbol || 'Unknown',
      symbol: bt.symbol || '???',
      chainId,
      priceUsd: p.priceUsd != null ? Number(p.priceUsd) : null,
      mcap,
      fdv: p.fdv != null ? Number(p.fdv) : null,
      liquidity: liq,
      volume: {
        m5: vol.m5 != null ? Number(vol.m5) : null,
        h1: vol.h1 != null ? Number(vol.h1) : null,
        h6: vol.h6 != null ? Number(vol.h6) : null,
        h24: vol.h24 != null ? Number(vol.h24) : null,
      },
      change: {
        m5: ch.m5 != null ? Number(ch.m5) : null,
        h1: ch.h1 != null ? Number(ch.h1) : null,
        h6: ch.h6 != null ? Number(ch.h6) : null,
        h24: ch.h24 != null ? Number(ch.h24) : null,
      },
      pairCreatedAt: p.pairCreatedAt || null,
      dexId,
      url: p.url || '',
      image: goodImg(info.imageUrl) || goodImg(meta && meta.icon) || cachedImg(chainId, bt.address) || null,
      socials,
      websites,
      description: (meta && meta.description) || '',
      boost: (meta && (meta.totalAmount || meta.amount)) || 0,
      pairAddress: p.pairAddress || '',
      buysH1: buys,
      sellsH1: sells,
      buysM5: tx.m5 && tx.m5.buys != null ? Number(tx.m5.buys) : null,
      sellsM5: tx.m5 && tx.m5.sells != null ? Number(tx.m5.sells) : null,
      txH6: tx.h6 && tx.h6.buys != null ? Number(tx.h6.buys) + Number(tx.h6.sells || 0) : null, // v8.9 big runner: trades vs 6 h pace
      buyRatioH1,
      hasSocials: !!(socials && socials.length) || !!(websites && websites.length),
      curveEst,
      onCurve: !!CURVE_DEX[dexId],
      migrated: migSet.has(dexId),
      gradMcap: grad || null,
    };
  }

  async function fetchJson(url) {
    if (window.KyvoGT && url.indexOf(GT) === 0) return window.KyvoGT.fetch(url, 120000); // shared GT rate gate (2 min cache)
    // v8.33: 20 s timeout — a request frozen while the phone slept (iOS PWA) used to hang forever, so refreshBusy stayed true
    // and the list never refreshed again ("10030s temu" = 2.8 h old screen while the server feeds were fine)
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const tm = ac ? setTimeout(() => ac.abort(), 20000) : 0;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ac ? ac.signal : undefined });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { if (tm) clearTimeout(tm); }
  }

  function allowedChain(cid) {
    return cid === 'solana' || cid === 'bsc' || cid === 'robinhood';
  }

  // v8.13: ONE pair rule everywhere (pairs.js): exact CA + chain, real pool with the most liquidity (tie: 24 h volume),
  // the pump.fun / four.meme curve pair only while there is no real pool yet. v8.12 and older preferred the curve pair,
  // so a migrated coin showed the DEAD pump.fun pair (frozen price → e.g. $SHAVCOIN "MC $24.3K" while it was at $3M).
  const KP = window.KyvoPairs;
  function pickBestPairs(pairs) {
    return KP.bestMap(pairs, coinKey, (p) => allowedChain(p.chainId) && (activeChain === 'all' || p.chainId === activeChain));
  }
  const rawPairs = new WeakMap(); // intoMap -> { key: { pairs: [...], meta } } (all pairs seen per coin)
  function ingestPairs(pairs, metaByAddr, intoMap) {
    let raw = rawPairs.get(intoMap);
    if (!raw) { raw = {}; rawPairs.set(intoMap, raw); }
    const touched = new Set();
    for (const p of pairs || []) {
      if (!p || !allowedChain(p.chainId) || !p.baseToken || !p.baseToken.address) continue;
      const k = coinKey(p.chainId, p.baseToken.address);
      const r = (raw[k] = raw[k] || { pairs: [], meta: null });
      const meta = metaByAddr && (metaByAddr[p.baseToken.address] || metaByAddr[k]);
      if (meta) r.meta = r.meta ? Object.assign({}, r.meta, meta) : meta;
      const i = r.pairs.findIndex((q) => q.pairAddress === p.pairAddress);
      if (i >= 0) r.pairs[i] = p; else r.pairs.push(p);
      if (p.info && p.info.imageUrl) rememberImg(p.chainId, p.baseToken.address, p.info.imageUrl);
      touched.add(k);
    }
    for (const k of touched) {
      const r = raw[k];
      const bp = KP.choose(r.pairs);
      const c = bp && pairToCoin(bp, r.meta);
      if (!c) continue;
      const prev = intoMap[k];
      if (KP.migrated(r.pairs, c.chainId, c.address)) c.migratedFromCurve = true;
      if (prev) {
        c.boost = Math.max(c.boost || 0, prev.boost || 0);
        if (!c.image && prev.image) c.image = prev.image;
        if (!c.description && prev.description) c.description = prev.description;
        if ((!c.socials || !c.socials.length) && prev.socials && prev.socials.length) { c.socials = prev.socials; c.hasSocials = true; }
      }
      intoMap[k] = c;
    }
  }
  // v8.13: a ticker/keyword search often returns ONLY the pump.fun curve pair of a coin that already migrated (the real
  // PumpSwap/Raydium pool is missing from that answer). Re-check every curve coin with its full pair list.
  async function verifyCurveCoins(intoMap) {
    const need = Object.values(intoMap).filter((c) => c && c.onCurve).map((c) => c.address);
    if (need.length) await fetchTokenBatch(need.slice(0, 150), null, intoMap);
  }

  async function fetchTokenBatch(addrs, metaByAddr, intoMap) {
    const unique = [...new Set(addrs.filter(Boolean))];
    for (let i = 0; i < unique.length; i += 30) {
      const chunk = unique.slice(i, i + 30);
      try {
        const tok = await fetchJson(DS + '/latest/dex/tokens/' + chunk.join(','));
        ingestPairs(tok.pairs || [], metaByAddr, intoMap);
      } catch (e) {
        console.warn('token batch failed', e);
      }
    }
  }

  const lastPoolAddrs = {};   // v8.29: net -> last new_pools answer
  async function loadNewPoolsNetwork(net, intoMap) {
    // v8.29: with a coin page open, reuse the last list (DexScreener refresh only) — 3 GeckoTerminal calls every 45 s
    // competed with the coin chart for GeckoTerminal's ~30/min free limit and pushed it into "ładuje się zbyt długo"
    if (view === 'coin' && lastPoolAddrs[net] && lastPoolAddrs[net].length) { await fetchTokenBatch(lastPoolAddrs[net], null, intoMap); return; }
    const addrs = [];
    // page=1 only: some Gecko networks (e.g. robinhood) 400/fail on page>1 and spam console
    const pages = [1]; // one page per network keeps GeckoTerminal calls well under the public limit (chart shares it)
    for (const page of pages) {
      try {
        const g = await fetchJson(GT + '/networks/' + net + '/new_pools?page=' + page + '&include=base_token');
        for (const inc of g.included || []) {
          const a = inc && inc.attributes;
          if (a && a.address && a.image_url) rememberImg(net, a.address, a.image_url);
        }
        for (const row of g.data || []) {
          const id =
            row.relationships &&
            row.relationships.base_token &&
            row.relationships.base_token.data &&
            row.relationships.base_token.data.id;
          if (id) addrs.push(String(id).replace(new RegExp('^' + net + '_'), ''));
        }
      } catch (e) {
        /* network may not support pagination — skip quietly */
      }
    }
    if (addrs.length) lastPoolAddrs[net] = addrs.slice();
    await fetchTokenBatch(addrs, null, intoMap);
  }

  async function loadLiveCoins() {
    fetchErr = null;
    try {
      const [profiles, boosts, boostsLatest] = await Promise.all([
        fetchJson(DS + '/token-profiles/latest/v1'),
        fetchJson(DS + '/token-boosts/top/v1'),
        fetchJson(DS + '/token-boosts/latest/v1').catch(() => []),
      ]);
      const metaByAddr = {};
      const addrs = [];
      for (const x of [].concat(boosts || [], boostsLatest || [], profiles || [])) {
        if (!x || !allowedChain(x.chainId) || !x.tokenAddress) continue;
        const a = x.tokenAddress;
        if (!metaByAddr[a]) {
          metaByAddr[a] = x;
          addrs.push(a);
        } else metaByAddr[a] = Object.assign({}, metaByAddr[a], x);
      }

      const into = {};
      await fetchTokenBatch(addrs.slice(0, 90), metaByAddr, into);

      // Bonding / migrated searches per chain
      const searches = [
        'pumpfun', 'pump', 'bonk', 'trump', 'pepe', 'solana meme',
        'fourmeme', 'four.meme', 'bsc meme', 'pancakeswap',
        'robinhood', 'flap',
      ];
      for (const q of searches) {
        try {
          const d = await fetchJson(DS + '/latest/dex/search?q=' + encodeURIComponent(q));
          const wanted = (d.pairs || []).filter(
            (p) =>
              allowedChain(p.chainId) &&
              (CURVE_DEX[p.dexId] || ALL_MIG.has(p.dexId) || p.chainId === 'robinhood')
          );
          ingestPairs(wanted, metaByAddr, into);
        } catch (e) {}
      }

      try { await verifyCurveCoins(into); } catch (e) {}

      const newMap = {};
      await Promise.all([
        loadNewPoolsNetwork('solana', newMap),
        loadNewPoolsNetwork('bsc', newMap),
        loadNewPoolsNetwork('robinhood', newMap),
      ]);
      for (const [k, c] of Object.entries(newMap)) {
        if (!into[k]) into[k] = c;
      }

      for (const c of Object.values(into)) if (!c.image) c.image = cachedImg(c.chainId, c.address);
      coins = Object.values(into);
      coins.sort((a, b) => (b.volume.h24 || 0) - (a.volume.h24 || 0));
      newPoolCoins = Object.values(newMap);
      newPoolCoins.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
      indexAll();
      lastFetch = Date.now();
      sourceLabel = 'na żywo';
      saveCache();
      return true;
    } catch (e1) {
      console.warn('primary load failed', e1);
      fetchErr = 'Nie udało się pobrać danych na żywo (sprawdź internet albo spróbuj za chwilę).';
      if (!coins.length && loadCache()) {
        fetchErr = 'Brak połączenia — pokazuję ostatnie zapisane dane.';
        return true;
      }
      return false;
    }
  }

  function typoVariants(q) {
    const out = new Set();
    const s = q.trim();
    if (!s) return [];
    out.add(s);
    if (s.length >= 4) out.add(s.slice(0, -1));
    out.add(s.replace(/(.)\1+/g, '$1'));
    if (s.length >= 3) out.add(s.slice(0, -2) + s.slice(-1) + s.slice(-2, -1));
    for (const t of ['BONK', 'WIF', 'PEPE', 'POPCAT', 'PNUT', 'MOODENG', 'TRUMP', 'DOGE', 'SPX', 'FARTCOIN', 'FLOKI', 'CAKE']) {
      if (fuzzyScore(s, t, t, '') >= 60) out.add(t);
    }
    return [...out];
  }

  async function searchDex(q) {
    const query = q.trim();
    if (!query) return [];
    const variants = typoVariants(query);
    try {
      const seen = new Set();
      let list = [];
      for (const v of variants.slice(0, 4)) {
        const d = await fetchJson(DS + '/latest/dex/search?q=' + encodeURIComponent(v));
        const best = pickBestPairs(d.pairs || []);
        for (const p of Object.values(best)) {
          const c = pairToCoin(p, null);
          if (!c || seen.has(keyOf(c))) continue;
          seen.add(keyOf(c));
          list.push(c);
        }
        if (list.length >= 12) break;
      }
      list = list
        .map((c) => ({
          c,
          s: Math.max(fuzzyScore(query, c.name, c.symbol, c.address), ...variants.map((v) => fuzzyScore(v, c.name, c.symbol, c.address))),
        }))
        .filter((x) => x.s > 0 || norm(query).length >= 32)
        .sort((a, b) => b.s - a.s || (b.c.liquidity || 0) - (a.c.liquidity || 0))
        .map((x) => x.c);
      if (!list.length) {
        list = allUniverse()
          .filter((c) => activeChain === 'all' || c.chainId === activeChain)
          .map((c) => ({ c, s: fuzzyScore(query, c.name, c.symbol, c.address) }))
          .filter((x) => x.s >= 50)
          .sort((a, b) => b.s - a.s)
          .map((x) => x.c);
      }
      return list.slice(0, 40);
    } catch (e) {
      return allUniverse()
        .filter((c) => activeChain === 'all' || c.chainId === activeChain)
        .map((c) => ({ c, s: fuzzyScore(query, c.name, c.symbol, c.address) }))
        .filter((x) => x.s >= 50)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.c);
    }
  }

  function allUniverse() {
    const m = {};
    for (const c of coins.concat(newPoolCoins)) m[keyOf(c)] = c;
    return Object.values(m);
  }

  /* v8.6: New Tweet feed — data/x_live.json (tools/x_live.py in GitHub Actions every ~5–15 min) */
  let xLive = null, xLiveAt = 0;
  async function loadLive(force) {
    if (!force && xLive && Date.now() - xLiveAt < 55000) return xLive;
    try { xLive = await fetchJson('data/x_live.json?t=' + Math.floor(Date.now() / 60000)); /* v8.9: 1-min cache-bust */ xLiveAt = Date.now(); } catch (e) { xLive = xLive || { tweets: [], updated_at: null }; }
    mergeLive();
    return xLive;
  }
  const namedCoins = (t) => (t.coins || []).filter((c) => (c.rel || 'named') === 'named');
  function mergeLive() {
    if (!viral || !xLive || !(xLive.tweets || []).length) return;
    const have = new Set((viral.trader_tweets || []).map((t) => String(t.id || t.url)));
    // v8.10: the New Tweet feed now carries EVERY tweet; only those with a coin named in the tweet go to Viral / alerts
    viral.trader_tweets = (viral.trader_tweets || []).concat(xLive.tweets.filter((t) => !have.has(String(t.id)) && !have.has(t.url) && namedCoins(t).length).map((t) => Object.assign({}, t, { coins: namedCoins(t) })));
  }
  async function loadViral() {
    try {
      viral = await fetchJson('data/x_viral.json?t=' + Math.floor(Date.now() / 600000));
      await loadLive(true).catch(() => null);
      if (window.KyvoNotify) window.KyvoNotify.onViral(viral);
      return viral;
    } catch (e) {
      viral = { posts: [], topics: [], updated_at: null };
      return viral;
    }
  }

  async function matchTopicToCoins(topic) {
    const hints = topic.hints || [];
    let found = await searchDex(topic.query || topic.label || '');
    for (const h of hints.slice(0, 2)) {
      if (found.length >= 6) break;
      const more = await searchDex(h);
      const seen = new Set(found.map((c) => keyOf(c)));
      for (const c of more) if (!seen.has(keyOf(c))) found.push(c);
    }
    return found
      .map((c) => ({
        c,
        s: Math.max(
          fuzzyScore(topic.label, c.name, c.symbol, c.address),
          ...hints.map((h) => fuzzyScore(h, c.name, c.symbol, c.address))
        ),
      }))
      .filter((x) => x.s >= 50 || found.length <= 3)
      .sort((a, b) => b.s - a.s || (b.c.liquidity || 0) - (a.c.liquidity || 0))
      .slice(0, 5);
  }

  /* ---- Column builders ---- */
  /* v8.3 quality pass: Pulse lists hide ⛔ high-risk (Kyvo Check < 50 / red flags / liq < $5k) and dead pairs
     (> 30 min old, < $500 vol 1h and < 10 txns). Toggle "Pokaż wszystkie" (localStorage kyvo_quality). */
  let qualityOnly = localStorage.getItem('kyvo_quality') !== '0';
  const qHidden = {};
  function qualityFilter(list, tab) {
    if (!qualityOnly || !window.KyvoInsights) { qHidden[tab] = 0; return list; }
    const out = []; let h = 0;
    for (const c of list) {
      let bad = false;
      try { bad = !!window.KyvoInsights.analyze(c).gated; } catch (e) {}
      const ah = ageHours(c.pairCreatedAt), tx = (c.buysH1 || 0) + (c.sellsH1 || 0);
      if (!bad && ah != null && ah > 0.5 && ((c.volume && c.volume.h1) || 0) < 500 && tx < 10) bad = true;
      if (bad) h++; else out.push(c);
    }
    qHidden[tab] = h;
    return out;
  }
  function qualityNote(tab) {
    const en = window.KyvoI18n && window.KyvoI18n.isEn();
    if (!qualityOnly) return `<div class="qhide mut" translate="no">${en ? 'Showing all coins, including ⛔ high-risk and dead pairs.' : 'Pokazuję wszystkie coiny, także ⛔ ryzykowne i martwe.'} <button type="button" class="fbtn" data-qtoggle>${en ? 'Quality only' : 'Tylko jakościowe'}</button></div>`;
    if (!qHidden[tab]) return '';
    return `<div class="qhide mut" translate="no">✨ ${en ? `Hidden ${qHidden[tab]} risky/dead coins (⛔ Kyvo Check, red flags or no trading).` : `Ukryto ${qHidden[tab]} ryzykownych/martwych coinów (⛔ Kyvo Check, czerwone flagi albo brak handlu).`} <button type="button" class="fbtn" data-qtoggle>${en ? 'Show all' : 'Pokaż wszystkie'}</button></div>`;
  }
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-qtoggle]'); if (!b) return; qualityOnly = !qualityOnly; localStorage.setItem('kyvo_quality', qualityOnly ? '1' : '0'); setView(view); });
  function listNew(baseFiltTab) {
    const tab = baseFiltTab || 'new';
    let list = applyFilters(allUniverse().slice(), tab);
    list.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
    return qualityFilter(list, 'new');
  }
  function listStretch(baseFiltTab) {
    if (!chainSupportsStretch(activeChain)) return [];
    const tab = baseFiltTab || 'stretch';
    let list = allUniverse().filter((c) => {
      if (!c.onCurve || c.mcap == null) return false;
      if (activeChain === 'solana') return c.dexId === 'pumpfun';
      if (activeChain === 'bsc') return c.dexId === 'fourmeme';
      return c.onCurve; // all
    });
    list = applyFilters(list, tab);
    let tight = list.filter((c) => c.curveEst != null && c.curveEst >= 55);
    if (tight.length < 3) {
      tight = list.slice().sort((a, b) => (b.curveEst || 0) - (a.curveEst || 0)).filter((c) => (c.curveEst || 0) >= 50);
    }
    tight.sort((a, b) => (b.curveEst || 0) - (a.curveEst || 0) || (b.mcap || 0) - (a.mcap || 0));
    return qualityFilter(tight, 'stretch');
  }
  let migSort = localStorage.getItem('kyvo_mig_sort') === 'mom' ? 'mom' : 'fresh';
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-migsort]'); if (!b) return; migSort = b.getAttribute('data-migsort'); localStorage.setItem('kyvo_mig_sort', migSort); setView(view); });
  function migSortHtml() { return `<div class="rk-per migsort">${[['fresh', 'Najświeższe migracje'], ['mom', 'Momentum teraz']].map(([k, t]) => `<button type="button" data-migsort="${k}" class="${migSort === k ? 'on' : ''}">${t}</button>`).join('')}</div>`; }
  function listMigrated(baseFiltTab) {
    if (!chainSupportsMigrated(activeChain)) return [];
    const tab = baseFiltTab || 'migrated';
    let list = allUniverse().filter((c) => {
      if (!c.migrated) return false;
      if (activeChain === 'solana') return (MIG_DEX_BY_CHAIN.solana || ALL_MIG).has(c.dexId);
      if (activeChain === 'bsc') return c.dexId === 'pancakeswap';
      return c.migrated;
    });
    list = applyFilters(list, tab);
    if (migSort === 'mom') {
      const mo = (c) => { const b = c.buysM5 || 0, se = c.sellsM5 || 0, v5 = (c.volume && c.volume.m5) || 0, m5 = (c.change && c.change.m5) || 0;
        return Math.log10(1 + v5) * (0.5 + (b + se ? b / (b + se) : 0.5)) + Math.max(-1, Math.min(1, m5 / 20)); };
      list.sort((a, b) => mo(b) - mo(a));
    } else list.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
    return qualityFilter(list, 'migrated');
  }
  let goodPending = 0;
  function goodContractsDone() { if ((view === 'good' || view === 'runner') && !document.hidden) keepUi(() => setView(view)); }
  function listGood() {
    // v8.3: safety filters (DEFAULT_FILTERS.good) + positive outlook (KyvoInsights.goodOutlook): Kyvo Check ≥ 75, no ⛔,
    // popular right now (P ≥ 0.30) + base estimate > 0 for 1h/3h/8h, buys > sells (1h), healthy volume, not "po ruchu"/fading,
    // Δ1h > −15%. Sorted by rank = popularity P × upside signal G (goodCoinRule in insights.js).
    let list = applyFilters(allUniverse(), 'good');
    if (window.KyvoInsights && window.KyvoInsights.goodOutlook) {
      const all = list.map((c) => ({ c, o: window.KyvoInsights.goodOutlook(c, goodContractsDone) }));
      goodPending = all.filter((x) => x.o.pending).length;
      list = all.filter((x) => x.o.ok);
      if (goodSortSmart) {
        list.sort((x, y) => {
          const ca = consensusOf(x.c), cb = consensusOf(y.c);
          return (cb.buyers.length * 2 - cb.sellers.length) - (ca.buyers.length * 2 - ca.sellers.length) || y.o.a.G - x.o.a.G;
        });
      } else list.sort((x, y) => y.o.rank - x.o.rank);
      return list.map((x) => x.c);
    }
    list.sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0));
    return list;
  }
  let boostRankMap = null, boostRankAt = 0;
  function boostRank(c) {
    if (!boostRankMap || Date.now() - boostRankAt > 20000) {
      boostRankMap = {};
      coins.filter((x) => x.boost > 0).sort((a, b) => b.boost - a.boost).forEach((x, i) => { boostRankMap[keyOf(x)] = i + 1; });
      boostRankAt = Date.now();
    }
    return boostRankMap[keyOf(c)] || null;
  }
  /* ---- v8.3 Runner stages by market cap (bounds from tools/runner_research.py: the 5x+ share falls with MC at the
     first-hour mark: <$60k 75% · $60–150k 45% · $150–500k 14% · $500k–1M 7% · $1M+ 29% (n=88, survivorship-biased)) ---- */
  const STAGES = [
    { n: 1, max: 60e3, pl: 'bardzo wcześnie', en: 'very early', range: '~$30–60k' },
    { n: 2, max: 150e3, pl: 'wcześnie', en: 'early', range: '$60–150k' },
    { n: 3, max: 500e3, pl: 'rozpędza się', en: 'building', range: '$150–500k' },
    { n: 4, max: 1e6, pl: 'dojrzały ruch', en: 'mature move', range: '$500k–1M' },
    { n: 5, max: Infinity, pl: 'duży, późniejszy', en: 'large, later', range: '$1M+' },
  ];
  function stageOf(mc) { if (mc == null || !isFinite(mc)) return null; return STAGES.find((s) => mc < s.max) || STAGES[4]; }
  function stageBarHtml(st) {
    if (!st) return '';
    return `<span class="stbar" aria-label="Etap ${st.n}/5">${STAGES.map((s) => `<i class="${s.n <= st.n ? 'on' : ''}"></i>`).join('')}</span>`;
  }
  window.__kyvoStageOf = stageOf;

  /* ---- v8.3 Wyniki / Track record: every coin Kyvo flags (Good Coin or Runner) is logged at the FIRST flag with time,
     price and MC; performance since flag = now %, max %, 1 h %, 8 h %. Local log (localStorage kyvo_track_v1, max 300,
     sampled on every refresh; exact 1 h / 8 h / max back-filled from GeckoTerminal 15-min candles when Wyniki opens) +
     the server log data/track_record.json written by the GitHub Action (tools/track_record.py). ---- */
  const TR_KEY = 'kyvo_track_v1';
  let track = (() => { try { const o = JSON.parse(localStorage.getItem(TR_KEY) || 'null'); return o && o.items ? o : { items: {} }; } catch (e) { return { items: {} }; } })();
  let trackDirty = false, trackDsAt = 0, trackServer = null, trackServerAt = 0;
  function saveTrack() {
    if (!trackDirty) return;
    const it = track.items, ks = Object.keys(it);
    if (ks.length > 300) ks.sort((a, b) => it[a].at - it[b].at).slice(0, ks.length - 300).forEach((k) => delete it[k]);
    try { localStorage.setItem(TR_KEY, JSON.stringify(track)); trackDirty = false; } catch (e) {}
  }
  function trackFlag(c, kind) {
    if (!c || !c.priceUsd || !c.mcap) return;
    const k = keyOf(c), now = Date.now();
    let e = track.items[k];
    if (!e) {
      e = track.items[k] = { k, sym: c.symbol, name: c.name, chain: c.chainId || 'solana', addr: c.address, pair: c.pairAddress || '', img: c.image || null,
        kinds: {}, at: now, px0: c.priceUsd, mc0: c.mcap, max: c.priceUsd, maxAt: now, last: c.priceUsd, mcNow: c.mcap, lastAt: now };
      const st = stageOf(c.mcap); if (kind === 'runner' && st) e.stage0 = st.n;
    }
    if (!e.kinds[kind]) { e.kinds[kind] = now; trackDirty = true; }
  }
  function trackSample(e, px, mc) {
    if (!e || !px || !isFinite(px)) return;
    const now = Date.now();
    e.last = px; e.lastAt = now; if (mc) e.mcNow = mc;
    if (px > e.max) { e.max = px; e.maxAt = now; }
    for (const [h, f] of [[1, 'p1'], [8, 'p8']]) {
      const t = e.at + h * 3.6e6;
      // live sample counts for the 1 h / 8 h mark only if taken within 15 / 60 min after it; otherwise candles fill it
      if (e[f] == null && now >= t && now - t <= (h === 1 ? 15 : 60) * 60e3) e[f] = px;
    }
    trackDirty = true;
  }
  async function trackUpdate() {
    try {
      for (const c of listGood()) trackFlag(c, 'good');
      if (window.KyvoInsights) for (const x of window.KyvoInsights.runnerList().coins) trackFlag(x.c, x.leg2 ? 'leg2' : 'runner');
      const stale = [];
      for (const e of Object.values(track.items)) {
        if (Date.now() - e.at > 7 * 864e5) continue;
        const c = byKey[e.k];
        if (c && c.priceUsd) trackSample(e, c.priceUsd, c.mcap); else if (Date.now() - e.at < 72 * 3.6e6) stale.push(e);
      }
      // coins that left the lists: DexScreener tokens batch, at most every 5 min
      if (stale.length && Date.now() - trackDsAt > 300000) {
        trackDsAt = Date.now();
        for (const ch of [...new Set(stale.map((e) => e.chain))]) {
          const grp = stale.filter((e) => e.chain === ch).slice(0, 30);
          try {
            const d = await fetchJson(DS + '/tokens/v1/' + ch + '/' + grp.map((e) => e.addr).join(','));
            const pairs = Array.isArray(d) ? d : (d && d.pairs) || [];
            for (const e of grp) {
              const p = KP.best(pairs, ch, e.addr); // v8.13: the coin's main pool now (a stored curve pair dies at migration)
              if (p && p.pairAddress && p.pairAddress !== e.pair && !KP.isCurve(p)) { e.pair = p.pairAddress; e.ohAt = 0; }
              if (p && p.priceUsd) trackSample(e, +p.priceUsd, p.marketCap || p.fdv);
            }
          } catch (err) {}
        }
      }
      saveTrack();
    } catch (e) {}
  }
  // exact max / 1 h / 8 h from GeckoTerminal 15-min candles (only when Wyniki is open; shared GT rate gate)
  async function trackBackfill(list, onDone) {
    if (!window.KyvoGT) return;
    const need = list.filter((e) => e.pair && e.src !== 'server' && (!e.ohAt || Date.now() - e.ohAt > 15 * 60e3) && Date.now() - e.at > 20 * 60e3 && Date.now() - e.at < 48 * 3.6e6 && !(e.p8 != null && e.ohFinal)).slice(0, 8);
    for (const e of need) {
      try {
        const net = GECKO_NET[e.chain] || e.chain;
        const d = await window.KyvoGT.fetch(`https://api.geckoterminal.com/api/v2/networks/${net}/pools/${encodeURIComponent(e.pair)}/ohlcv/minute?aggregate=15&limit=200&currency=usd&token=${encodeURIComponent(e.addr)}`, 600000);
        const ol = ((d && d.data && d.data.attributes && d.data.attributes.ohlcv_list) || []).map((r) => r.map(Number)).sort((a, b) => a[0] - b[0]);
        const after = ol.filter((r) => r[0] * 1000 >= e.at - 15 * 60e3 + 1);
        if (!after.length) continue;
        const live = track.items[e.k] || e;
        const mx = Math.max(...after.map((r) => r[2]));
        if (mx > (live.max || 0)) { live.max = mx; live.maxAt = after.find((r) => r[2] === mx)[0] * 1000; }
        for (const [h, f] of [[1, 'p1'], [8, 'p8']]) {
          const t = (e.at + h * 3.6e6) / 1000;
          const cnd = ol.find((r) => r[0] <= t && t < r[0] + 900);
          if (cnd && Date.now() / 1000 > t) live[f] = cnd[4];
        }
        live.ohAt = Date.now(); if (live.p8 != null) live.ohFinal = 1; trackDirty = true;
      } catch (err) {}
    }
    saveTrack();
    if (need.length && onDone) onDone();
  }
  async function loadTrackServer() {
    if (trackServer && Date.now() - trackServerAt < 10 * 60e3) return trackServer;
    try { const r = await fetch('data/track_record.json?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' }); if (r.ok) { trackServer = await r.json(); trackServerAt = Date.now(); } } catch (e) {}
    return trackServer;
  }
  // v8.33: % since a flag / entry through the shared entry sanity rule (pairs.js entryCheck): entry MC < $1K or > 500x from < $3K = "—"
  const pctE = (px, e) => (px > 0 && e && e.px0 > 0 ? KP.safePct(px, e.px0, e.mc0, e.mc0 > 0 ? (e.mc0 * px) / e.px0 : null) : null);
  let trackKind = localStorage.getItem('kyvo_track_kind') || 'all';
  async function renderTrack() {
    document.body.classList.remove('pulse-on');
    $('#pulseDesk').innerHTML = '';
    const en = window.KyvoI18n && window.KyvoI18n.isEn();
    const L2 = (pl, e) => (en ? e : pl);
    const srv = await loadTrackServer();
    if (view !== 'track') return;
    const merged = {};
    for (const e of (srv && srv.items) || []) merged[e.k] = Object.assign({ src: 'server' }, e);
    for (const e of Object.values(track.items)) { const s = merged[e.k]; merged[e.k] = s && s.at <= e.at ? Object.assign({}, e, s, { kinds: Object.assign({}, e.kinds, s.kinds), src: 'server' }) : Object.assign({ src: 'local' }, e); }
    let all = Object.values(merged).filter((e) => Date.now() - e.at < 7 * 864e5).sort((a, b) => b.at - a.at);
    const list = trackKind === 'all' ? all : all.filter((e) => e.kinds && e.kinds[trackKind]);
    const nowP = (e) => pctE(e.last, e), maxP = (e) => pctE(e.max, e);
    const med = (a) => { a = a.filter((v) => v != null && isFinite(v)).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
    const done1 = list.filter((e) => Date.now() - e.at > 3.6e6);
    const hit50 = done1.filter((e) => (maxP(e) || 0) >= 50).length, hit100 = done1.filter((e) => (maxP(e) || 0) >= 100).length;
    const pc = (v) => (v == null || !isFinite(v) ? '<span class="mut">—</span>' : `<b class="${pctClass(v)}">${fmtPct(v)}</b>`);
    const tm = (ms) => new Date(ms).toLocaleString(window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const tkPrem = isRunnersUser(), tkOpen = tkPrem ? [] : (RunnerGate.openKeys() || []).map((k) => String(k).replace(/^leg2:/, ''));
    const row = (e) => {
      const rAt = e.kinds && Math.max(e.kinds.runner || 0, e.kinds.leg2 || 0);
      if (!tkPrem && rAt && Date.now() - rAt < 24 * 3.6e6 && !tkOpen.includes(e.k)) // v8.11: Runners from the last 24 h stay locked for free users (no name / CA)
        return `<div class="row trk rlock" role="button" tabindex="0" data-unlock translate="no"><div class="rlock-ic" aria-hidden="true">🔒</div><div class="nm"><b>🏃 Runner <span class="mut" style="font-weight:600">· ${L2('Oznaczony', 'Flagged')} ${esc(tm(rAt))}</span></b><small class="rlock-t">🔒 ${L2('Wynik widoczny w planie 🏃 Runners (darmowo po 24 h)', 'Result visible with the 🏃 Runners plan (free after 24 h)')}</small></div></div>`;
      const st = stageOf(e.mc0);
      const kinds = Object.keys(e.kinds || {}).map((k) => (k === 'runner' ? (e.badge === 'kol' ? '👑 KOL coin' : e.badge === 'moon' ? '🚀 Moon run' : '🏃 Runner') : k === 'leg2' ? '🔁 ' + L2('Kolejna fala', 'Second leg') : k === 'early' ? '⚡ ' + L2('Wczesny Runner', 'Early Runner') : '✅ Good')).join(' · ');
      const p1 = e.p1 != null ? pctE(e.p1, e) : null, p8 = e.p8 != null ? pctE(e.p8, e) : null;
      const pend = (h) => (Date.now() - e.at < h * 3.6e6 ? `<span class="mut">${L2('za', 'in')} ${ageLabelH(h - (Date.now() - e.at) / 3.6e6)}</span>` : '<span class="mut">—</span>');
      return `<div class="row trk" data-key="${esc(e.k)}" role="button" tabindex="0">${imgTag({ image: e.img, chainId: e.chain, address: e.addr, symbol: e.sym, dexId: '' })}
        <div class="nm"><b><span class="cbadge c-${esc(e.chain)}">${esc(CHAIN_BADGE[e.chain] || e.chain)}</span> $${esc(e.sym)} <span class="mut" style="font-weight:600;font-size:11px">${kinds}${e.kinds && (e.kinds.runner || e.kinds.leg2) && st ? ' · ' + L2('etap', 'stage') + ' ' + st.n : ''}${e.src === 'local' ? ` · <span title="${esc(L2('Zapisane tylko na tym telefonie (wykryte w apce, nie przez serwer Kyvo).', 'Saved only on this phone (detected in the app, not by the Kyvo server).'))}">📱 ${L2('tylko ten telefon', 'this phone only')}</span>` : ''}</span></b>
          <small>${holdBadge(e.k).trim()}${holdBadge(e.k) ? ' ' : ''}${L2('Oznaczony', 'Flagged')} ${esc(tm(e.at))} · MC ${fmtUsd(e.mc0)} → ${fmtUsd(e.mcNow || (e.mc0 * (e.last || e.px0) / e.px0))}${e.src === 'server' ? ' · <span class="mut">Kyvo</span>' : ''}</small>
          <div class="trk-g" translate="no"><span>${L2('Teraz', 'Now')} ${pc(nowP(e))}</span><span>Max ${pc(maxP(e))}</span><span>1h ${p1 != null ? pc(p1) : pend(1)}</span><span>8h ${p8 != null ? pc(p8) : pend(8)}</span></div></div></div>`;
    };
    $('#listBody').innerHTML = `<div class="h">📊 ${L2('Wyniki', 'Track record')}</div>
      <div class="sub" translate="no">${L2('Każdy coin, który Kyvo oznaczyło (Good Coin lub Runner), zapisany w chwili PIERWSZEGO oznaczenia — z ceną i MC. Pokazujemy wszystkie, także te, które spadły.', 'Every coin Kyvo flagged (Good Coin or Runner), logged at the FIRST flag with price and MC. We show all of them, including the ones that fell.')}</div>
      <div class="filtbar" style="margin:8px 0" id="trkKinds">${[['all', L2('Wszystkie', 'All')], ['good', '✅ Good'], ['runner', '🏃 Runner'], ['early', '⚡ ' + L2('Wczesny', 'Early')], ['leg2', '🔁 ' + L2('Kolejna fala', 'Second leg')]].map(([k, t]) => `<button type="button" class="fbtn ${trackKind === k ? 'on' : ''}" data-tk="${k}">${t}</button>`).join('')}</div>
      <div class="card trk-sum" translate="no">
        <div><b>${list.length}</b><small>${L2('oznaczeń (7 dni)', 'flags (7 days)')}</small></div>
        <div><b>${done1.length ? Math.round(hit50 / done1.length * 100) + '%' : '—'}</b><small>${L2('doszło do +50% (max)', 'reached +50% (max)')}</small></div>
        <div><b>${done1.length ? Math.round(hit100 / done1.length * 100) + '%' : '—'}</b><small>${L2('doszło do 2x (max)', 'reached 2x (max)')}</small></div>
        <div><b class="${pctClass(med(list.map(nowP)))}">${med(list.map(nowP)) != null ? fmtPct(med(list.map(nowP))) : '—'}</b><small>${L2('mediana teraz', 'median now')}</small></div>
        <div><b class="${pctClass(med(list.map((e) => (e.p8 != null ? pctE(e.p8, e) : null))))}">${med(list.map((e) => (e.p8 != null ? pctE(e.p8, e) : null))) != null ? fmtPct(med(list.map((e) => (e.p8 != null ? pctE(e.p8, e) : null)))) : '—'}</b><small>${L2('mediana po 8h', 'median at 8h')}</small></div>
      </div>
      ${list.length ? `<div class="card" style="padding:4px 10px">${list.slice(0, 120).map(row).join('')}</div>` : `<div class="empty" translate="no">${L2('Jeszcze nic nie zapisano. Wyniki zbierają się, gdy Kyvo oznacza coiny (Good Coins / Runner) — na tym urządzeniu oraz w logu serwera.', 'Nothing logged yet. Results build up as Kyvo flags coins (Good Coins / Runner) — on this device and in the server log.')}</div>`}
      <div class="foot" translate="no">${L2('„Max” = najwyższa cena po oznaczeniu (świece 15-min GeckoTerminal lub próbki z apki). Wejście po cenie z chwili oznaczenia, bez poślizgu i opłat. „Kyvo” = log serwera (GitHub Action co ~15 min), reszta = log z tego urządzenia, gdy apka była otwarta. Przeszłe wyniki nie gwarantują przyszłych — to nie porada finansowa, memecoiny mogą spaść do zera.', '“Max” = highest price after the flag (GeckoTerminal 15-min candles or app samples). Entry at the price at flag time, no slippage or fees. “Kyvo” = server log (GitHub Action every ~15 min), the rest = this device’s log while the app was open. Past results don’t guarantee future ones — not financial advice, memecoins can go to zero.')}</div>`;
    $$('#trkKinds [data-tk]').forEach((b) => (b.onclick = () => { trackKind = b.dataset.tk; localStorage.setItem('kyvo_track_kind', trackKind); renderTrack(); }));
    wireRows($('#listBody'));
    $$('#listBody [data-unlock]').forEach((el) => { el.onclick = () => openPremium(); });
    trackBackfill(list, () => { if (view === 'track') renderTrack(); });
  }

  /* ---- 🏃 Runner tab ---- */
  const RSEEN = 'kyvo_runner_viewed_v1';
  let runnerStage = +(localStorage.getItem('kyvo_runner_stage') || 0) || 0;
  let shapeT = 0;
  /* v8.8: 👑 KOL coin / 🚀 Moon run — Runner overrides found by the server (tools/kol_coins.py in the kyvo-push Action)
     -> data/kol_live.json. They fail the normal safety score on purpose (e.g. supply sits in the KOL's wallet), so every
     card carries a high-risk line. No thresholds are shown. */
  let kolLive = null, kolLiveAt = 0, kolBusy = false;
  async function loadKolLive() {
    if (kolBusy) return kolLive;
    kolBusy = true;
    try { kolLive = await fetchJson('data/kol_live.json?t=' + Math.floor(Date.now() / 60000)); } catch (e) { kolLive = kolLive || { items: [] }; }
    kolLiveAt = Date.now(); kolBusy = false;
    return kolLive;
  }
  function kolCoinOf(e) {
    const u = allUniverse().find((c) => keyOf(c) === e.k);
    if (u) return u;
    const s2 = e.snap || {};
    return { address: e.addr, name: e.name || e.sym, symbol: e.sym, chainId: e.chain, mcap: e.mcNow || e.mc0, priceUsd: null, liquidity: s2.liq, pairAddress: e.pair || '',
      volume: { m5: null, h1: s2.vol1h, h6: null, h24: null }, change: { m5: s2.m5, h1: s2.h1, h6: null, h24: null }, pairCreatedAt: s2.created || null,
      image: e.img || null, dexId: '', socials: [], websites: [], _snap: true };
  }
  function kolWhy(e) {
    const en = window.KyvoI18n && window.KyvoI18n.isEn(), L2 = (pl, x) => (en ? x : pl);
    const ev = { link: L2('coin linkuje X tego KOL-a', 'coin links this KOL\u2019s X'), profile_wallet: L2('podaż wysłana do portfela z profilu KOL-a', 'supply sent to the KOL\u2019s profile wallet'),
      kol_wallet: L2('znany portfel KOL-a trzyma podaż', 'a known KOL wallet holds supply'), tweet: L2('tweet z tym CA', 'tweet with this CA') };
    const out = [];
    if (e.badge === 'kol') { if (e.kol) out.push('@' + esc(e.kol)); for (const k of e.evidence || []) if (ev[k]) out.push(ev[k] + (k === 'tweet' && (e.tweeted_by || []).length ? ' @' + esc(e.tweeted_by[0]) : '')); }
    else if (e.badge === 'tweet' && e.tweet) { // v8.9 🐦 Tweet runner: runs after a tracked account's tweet
      out.push(`+${Math.round(e.tweet.chg || 0)}% ${L2('od tweeta', 'since the tweet')} @${esc(e.tweet.handle || '')}`, L2('wolumen i kupujący rosną od tweeta', 'volume and buyers rising since the tweet'));
    }
    else if (e.badge === 'big') { // v8.9 📈 Big runner (server): established $1M+ coin running now
      const b = e.big || {}, pc = (v) => (v == null ? null : (v >= 0 ? '+' : '') + Math.round(v) + '%');
      if (b.h1 != null) out.push(pc(b.h1) + ' 1h' + (b.h6 != null ? ' · ' + pc(b.h6) + ' 6h' : ''));
      if (b.acc) out.push(`vol 1h ×${(+b.acc).toFixed(1)} ${L2('vs średnia', 'vs avg')}`);
      if (b.txAcc) out.push(`${L2('transakcje', 'trades')} ↑×${(+b.txAcc).toFixed(1)}`);
      if (b.br) out.push(`${Math.round(b.br * 100)}% ${L2('kupna', 'buys')}`);
    }
    else out.push(L2('bardzo szybki wzrost MC', 'very fast MC growth'), L2('ogromny wolumen', 'huge volume'));
    if (e.buyers1h) out.push(`${fmtInt(Math.round(e.buyers1h))} ${L2('kupujących 1h', 'buyers 1h')}`);
    return out;
  }
  function kolWarnHtml(e) {
    if (e.badge === 'tweet') return `<div class="kolwarn" translate="no">⚠️ ${(window.KyvoI18n && window.KyvoI18n.isEn()) ? 'Moves right after a tweet often fade fast — late entries are risky.' : 'Ruchy zaraz po tweecie często szybko się kończą — późne wejście jest ryzykowne.'}</div>`;
    if (e.badge === 'big') return ''; // v8.9: big runners passed the normal safety floor — no high-risk banner
    const en = window.KyvoI18n && window.KyvoI18n.isEn(), L2 = (pl, x) => (en ? x : pl);
    const p = e.top_pct != null ? Math.round(e.top_pct) : null, who = e.kol ? ' (@' + esc(e.kol) + ')' : '';
    let t;
    if (e.badge === 'kol' && e.concentrated && p) t = L2(`Wysokie ryzyko: ~${p}% podaży leży w portfelu KOL-a${who} — jedna jego sprzedaż może mocno zrzucić cenę.`, `High risk: ~${p}% of the supply sits in the KOL\u2019s wallet${who} — one sale by them can crash the price.`);
    else if (e.badge === 'kol') t = L2('Wysokie ryzyko: coin nie przeszedł zwykłych testów bezpieczeństwa Kyvo.', 'High risk: this coin did not pass Kyvo\u2019s usual safety checks.');
    else t = L2(`Wysokie ryzyko: nie przeszedł testów bezpieczeństwa Kyvo${p && e.concentrated ? ` (największy portfel ma ~${p}% podaży)` : ''}. Tak szybkie ruchy często kończą się dużym spadkiem.`, `High risk: it failed Kyvo\u2019s safety checks${p && e.concentrated ? ` (the biggest wallet holds ~${p}% of supply)` : ''}. Moves this fast often end in a big drop.`);
    return `<div class="kolwarn" translate="no">⚠️ ${t}</div>`;
  }
  /* v8.11: Runners are Premium. Free plan = ONE Runner per Europe/Warsaw day: the first Runner flagged today (earliest flag
     time among today's Runners, remembered for the whole day on this device). Every other Runner (incl. 👑 KOL coin,
     🚀 Moon run, 📈 Big runner, 🐦 Tweet runner, 🔁 second leg) renders as a locked card without name / CA / chart / links.
     CLIENT-SIDE gate only: Kyvo is a static PWA and data/*.json is public, so a technical user can bypass it. Real
     enforcement later = login (Supabase/Firebase) + entitlement + a server-filtered Runner feed. */
  const FREE_RK = 'kyvo_free_runner_v1', OPEN_RK = 'kyvo_open_runners_v2';
  let trackTried = false;
  const warsawDay = (ms) => { try { return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' }); } catch (e) { return new Date(ms).toISOString().slice(0, 10); } };
  const isPremiumUser = () => { try { return !!(window.KyvoPremium && window.KyvoPremium.isActive()); } catch (e) { return false; } };
  /* v8.14.1 tiers: free = 1 Runner / Warsaw day, Premium = 3 / day, 🏃 Runners = all (owner = Runners). */
  const isRunnersUser = () => { try { return !!(window.KyvoPremium && (window.KyvoPremium.isRunners ? window.KyvoPremium.isRunners() : window.KyvoPremium.isActive())); } catch (e) { return false; } };
  const runnerQuota = () => { try { const q = window.KyvoPremium && window.KyvoPremium.runnersPerDay ? window.KyvoPremium.runnersPerDay() : (isPremiumUser() ? Infinity : 1); return q > 0 ? q : 1; } catch (e) { return 1; } };
  function runnerFlagAt(x) {
    if (x.srv && x.srv.at) return x.srv.at;
    const tr = track.items[x.leg2 ? String(x.key).replace(/^leg2:/, '') : x.key] || track.items[x.c ? keyOf(x.c) : ''];
    if (!tr) return null;
    const k = tr.kinds || {};
    let at = (x.leg2 ? k.leg2 : k.runner) || tr.at || null;
    const sv = trackServer && (trackServer.items || []).find((e) => e.k === tr.k); // server log = first flag time for everyone
    const sAt = sv && sv.kinds && (x.leg2 ? sv.kinds.leg2 : sv.kinds.runner);
    if (sAt && (!at || sAt < at)) at = sAt;
    return at;
  }
  /* The first N Runners flagged today (Europe/Warsaw) are open, N = runnerQuota(). Picks are remembered for the whole day on this
     device; a higher quota (Free → Premium) keeps the earlier picks and adds the next ones. */
  function openRunnerKeys(coins) {
    const q = runnerQuota();
    if (!isFinite(q)) return null; // unlimited
    const day = warsawDay(Date.now());
    let st = {}; try { st = JSON.parse(localStorage.getItem(OPEN_RK) || '{}') || {}; } catch (e) {}
    let keys = st.day === day && Array.isArray(st.keys) ? st.keys.slice() : [];
    if (!keys.length) { try { const v1 = JSON.parse(localStorage.getItem(FREE_RK) || '{}') || {}; if (v1.day === day && v1.key) keys = [v1.key]; } catch (e) {} } // v8.11 pick survives the update
    if (keys.length >= q) return keys.slice(0, q);
    const today = (coins || []).map((x) => ({ x, at: runnerFlagAt(x) })).filter((o) => o.at && warsawDay(o.at) === day && !keys.includes(o.x.key)).sort((a, b) => a.at - b.at);
    for (const o of today) { if (keys.length >= q) break; keys.push(o.x.key); }
    if (!kolLiveAt || trackTried !== true) return keys; // server Runner feed not loaded yet → don't lock in picks that an earlier server Runner should win
    if (keys.length) try { localStorage.setItem(OPEN_RK, JSON.stringify({ day, keys })); } catch (e) {}
    return keys;
  }
  function freeRunnerKey(coins) { const k = openRunnerKeys(coins); return k ? k[0] || null : null; } // legacy helper (first open Runner)
  /* v8.14.1 ✦ chrome hero stats (big metallic numerals). REAL data only: server log data/track_record.json
     (same for everyone, numbers only — no names/CA, so it never reveals a locked Runner). Missing data → nothing is shown. */
  function runnerHeroStats() {
    const items = (trackServer && trackServer.items) || [];
    if (!items.length) return null;
    const day = warsawDay(Date.now());
    const rs = items.filter((e) => e.kinds && e.kinds.runner && e.px0 > 0);
    let win = rs.filter((e) => warsawDay(e.kinds.runner) === day), today = true;
    if (!win.length) { win = rs.filter((e) => Date.now() - e.kinds.runner < 24 * 3.6e6); today = false; }
    if (!win.length) return null;
    const mx = win.map((e) => pctE(e.max, e)).filter((v) => v != null && isFinite(v) && v < 5000); // >50x = suspect price sample, skipped
    return { n: win.length, today, win, best: mx.length ? Math.max(...mx) : null, x2: mx.length ? mx.filter((v) => v >= 100).length : null };
  }
  function runnerHeroHtml(big) {
    const S = runnerHeroStats();
    if (!S) return '';
    const en = window.KyvoI18n && window.KyvoI18n.isEn();
    const L2 = (pl, e) => (en ? e : pl);
    const nLbl = S.today ? L2(S.n === 1 ? 'Runner oznaczony dziś' : 'Runnerów oznaczonych dziś', S.n === 1 ? 'Runner flagged today' : 'Runners flagged today') : L2('Oznaczonych w 24 h', 'Flagged in 24 h');
    const stat = (v, l, cls) => `<div class="kh-s${cls ? ' ' + cls : ''}"><b class="chrome">${v}</b><small>${l}</small></div>`;
    const art = window.KyvoArt ? `<span class="kh-bg" aria-hidden="true" data-depth="-0.5">${KyvoArt.pic('arc', '(min-width:900px) 900px, 100vw')}</span>` : '';
    return `<a class="kyhero ky-tilt${big ? ' big' : ''}" href="#runner" translate="no" data-ky-par>${art}
      <div class="kh-k">${L2('Kyvo · log serwera', 'Kyvo · server log')}</div>
      ${(() => { // v8.15 pass 8: big counter = one huge number + a row of smaller stats beneath (Liquid-style)
        const sub = `${S.best != null && S.best > 0 ? stat('+' + Math.round(S.best) + '%', L2('najlepszy (max po oznaczeniu)', 'best (max after flag)')) : ''}${S.x2 ? stat(String(S.x2), L2('doszło do 2x', 'reached 2x')) : ''}`;
        return big ? `<div class="kh-main">${stat(String(S.n), nLbl, 'main')}</div>${sub ? `<div class="kh-row kh-sub">${sub}</div>` : ''}` : `<div class="kh-row">${stat(String(S.n), nLbl, 'main')}${sub}</div>`;
      })()}
      ${big ? `<div class="kh-line">${L2('Wcześnie to nie szczęście. To filtr.', 'Early isn’t luck. It’s a filter.')}</div>` : ''}
    </a>`;
  }
  function updatePulseHero() {
    const el = $('#kyHero'); if (!el) return;
    const on = view === 'pulse';
    document.body.classList.toggle('hero-on', on);
    if (!on) return;
    const fill = () => { if (view === 'pulse') el.innerHTML = runnerHeroHtml(false) + (window.KyvoNumbers ? window.KyvoNumbers.strip('kyn-desk') : ''); }; // pass 9: 'Dane z' strip (desktop only, CSS)
    fill();
    if (!trackServer || Date.now() - trackServerAt > 10 * 60e3) loadTrackServer().then(fill).catch(() => {});
  }
  const RunnerGate = {
    premium: isPremiumUser,
    unlimited: isRunnersUser,
    quota: runnerQuota,
    openKeys: () => openRunnerKeys(runnerItems().coins), // null = unlimited
    freeKey: () => freeRunnerKey(runnerItems().coins),
    unlocked(key) { if (isRunnersUser()) return true; const ks = this.openKeys(); return !ks || ks.includes(key); },
  };
  window.KyvoRunnerGate = RunnerGate;
  function openPremium(plan) { if (window.KyvoLaunch && window.KyvoLaunch.maybePremiumPopup && window.KyvoLaunch.maybePremiumPopup(true, typeof plan === 'string' ? plan : 'runners')) return; location.hash = 'premium'; }
  function runnerItems() {
    if (!trackTried) { trackTried = 'busy'; loadTrackServer().finally(() => { trackTried = true; if (view === 'runner') renderRunner(); }); }
    const base = window.KyvoInsights ? window.KyvoInsights.runnerList(activeChain) : { coins: [], tweets: [] };
    const srv = ((kolLive && kolLive.items) || []).filter((e) => e.badge && Date.now() - e.at < 12 * 3.6e6 && (activeChain === 'all' || !activeChain || e.chain === activeChain));
    for (const e of srv) {
      const have = base.coins.find((x) => x.key === e.k && !x.leg2);
      if (have) { have.srv = e; have.why = kolWhy(e).concat(have.why || []); continue; }
      base.coins.push({ kind: 'coin', key: e.k, c: kolCoinOf(e), srv: e, score: 2, why: kolWhy(e) });
    }
    if (!kolBusy && Date.now() - kolLiveAt > 60000) loadKolLive().then(() => { if (view === 'runner' && srv.length !== ((kolLive && kolLive.items) || []).filter((e) => e.badge && Date.now() - e.at < 12 * 3.6e6 && (activeChain === 'all' || !activeChain || e.chain === activeChain)).length) renderRunner(); else updateRunnerBadge(); });
    return base;
  }
  function updateRunnerBadge(items) {
    items = items || runnerItems();
    let seenK = {}; try { seenK = JSON.parse(localStorage.getItem(RSEEN) || '{}') || {}; } catch (e) {}
    const n = items.coins.concat(items.tweets).filter((x) => !seenK[x.key]).length;
    $$('[data-runner-count]').forEach((el) => { el.textContent = n ? String(n) : ''; el.style.display = n ? '' : 'none'; });
  }
  /* v8.34 🚀 Runner 2.0 — data/runner2.json (tools/runner2.py, written by the server loop after every Runner scan): Runner / ⚡ Early
     coins that passed the v8.34 filters (age ≥ 1 h — young ones re-checked 30–60 min later and kept only at ≥ 0.9× the flag price;
     ≤ +100% in 1 h; vol 1 h ≤ 1.5× MC). % since it entered Runner 2.0 through the shared entry rule (pctE / pairs.js entryCheck).
     Gate = the Runner tab's: 🏃 Runners plan (incl. promo / free hour) sees all; others see the Runners they have open + anything > 24 h. */
  let r2Doc = null, r2At = 0, r2Busy = false;
  async function loadRunner2() {
    if (r2Busy || (r2Doc && Date.now() - r2At < 60e3)) return r2Doc;
    r2Busy = true;
    try { const r = await fetch('data/runner2.json?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' }); r2Doc = r.ok ? await r.json() : r2Doc || { coins: [] }; } catch (e) { r2Doc = r2Doc || { coins: [] }; }
    r2At = Date.now(); r2Busy = false;
    return r2Doc;
  }
  function renderRunner2() {
    document.body.classList.remove('pulse-on');
    $('#pulseDesk').innerHTML = '';
    const en = window.KyvoI18n && window.KyvoI18n.isEn();
    const L2 = (pl, e) => (en ? e : pl);
    const box = $('#listBody');
    if (!r2Doc) { box.innerHTML = `<div class="loading"><div class="spin"></div>${L2('Ładuję Runner 2.0…', 'Loading Runner 2.0…')}</div>`; loadRunner2().then(() => { if (view === 'runner2') renderRunner2(); }); return; }
    if (Date.now() - r2At > 60e3) loadRunner2().then(() => { if (view === 'runner2') renderRunner2(); });
    const all = ((r2Doc && r2Doc.coins) || []).filter((e) => e && e.k && Date.now() - e.at < 72 * 3.6e6 && (activeChain === 'all' || !activeChain || e.chain === activeChain)).sort((a, b) => b.at - a.at);
    const prem = isRunnersUser(), paid = isPremiumUser();
    let openK = null; if (!prem) { try { openK = (RunnerGate.openKeys() || []).map((k) => String(k).replace(/^leg2:/, '')); } catch (e) { openK = []; } }
    const isOpen = (e) => prem || Date.now() - e.at > 24 * 3.6e6 || (openK || []).includes(e.k);
    const ago = (ms) => { const m = Math.max(1, Math.round((Date.now() - ms) / 60e3)); return m < 60 ? L2(m + ' min temu', m + ' min ago') : m < 48 * 60 ? L2(Math.floor(m / 60) + ' h ' + (m % 60) + ' min temu', Math.floor(m / 60) + ' h ' + (m % 60) + ' min ago') : L2(Math.round(m / 1440) + ' d temu', Math.round(m / 1440) + ' d ago'); };
    const srcL = (e) => (e.src === 'early' ? '⚡ ' + L2('Wczesny', 'Early') : e.src === 'leg2' ? '🔁 ' + L2('Kolejna fala', 'Second leg') : e.src === 'kol' ? '👑 KOL' : e.src === 'moon' ? '🚀 Moon' : e.src === 'big' ? '📈 ' + L2('Duży', 'Big') : e.src === 'tweet' ? '🐦 Tweet' : '🏃 Runner');
    const ok = (v) => v != null && isFinite(v) && v < 5000;
    const pcts = (e) => { const c = kolCoinOf(e), live = Number(c && c.priceUsd) > 0 ? Number(c.priceUsd) : e.last; const nowP = pctE(live, e); const maxP = pctE(Math.max(e.max || 0, live || 0), e); return { c, nowP, maxP }; };
    const res = all.map((e) => Object.assign({ e }, pcts(e)));
    const done = res.filter((r) => ok(r.nowP));
    const med = (a) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
    const hit2x = res.filter((r) => ok(r.maxP) && r.maxP >= 100).length;
    const row = (r) => {
      const e = r.e;
      const rt = `<div class="rt td-rt">${ok(r.nowP) ? `<b class="${pctClass(r.nowP)}">${fmtPct(r.nowP)}</b><small class="mut">${L2('od wejścia', 'since entry')}</small>` : '<span class="mut">—</span>'}${ok(r.maxP) ? `<small class="mut">max ${fmtPct(Math.max(0, r.maxP))}</small>` : ''}</div>`;
      if (!isOpen(e)) return `<div class="row td-row rlock" role="button" tabindex="0" data-unlock translate="no"><div class="rlock-ic" aria-hidden="true">🔒</div><div class="nm"><b>🚀 Runner 2.0 <span class="mut" style="font-weight:600">· ${esc(ago(e.at))}</span></b><div class="rlock-bars" aria-hidden="true"><i style="width:58%"></i><i style="width:40%"></i></div><small class="rlock-t">🔒 ${paid ? L2('Wszystkie — plan 🏃 Runners', 'All — 🏃 Runners plan') : L2('Premium (3/dzień) lub 🏃 Runners (wszystkie)', 'Premium (3/day) or 🏃 Runners (all)')}</small></div>${rt}</div>`;
      const c = r.c;
      return `<div class="row td-row r2-row" data-key="${esc(e.k)}" role="button" tabindex="0" translate="no">${imgTag(c)}<div class="nm"><b><span class="cbadge c-${esc(e.chain || 'solana')}">${esc(chainBadge(c))}</span> ${esc(e.name || e.sym || '')} <span class="mut" style="font-weight:600">$${esc(e.sym || '')}</span></b>
        <small class="td-sub">${holdBadge(e.k, holdOf(e.k) || e.hold).trim()}${holdBadge(e.k, holdOf(e.k) || e.hold) ? ' ' : ''}${esc(ago(e.at))} · ${esc(srcL(e))} · MC ${fmtUsd(e.mc0)} → ${fmtUsd((c && c.mcap) || e.mcNow || e.mc0)}</small>
        <small class="r2-why mut">${esc(e.why || '')}${e.how && /^recheck/.test(e.how) ? ' · ' + L2('sprawdzony ponownie', 're-checked') : ''}</small>
        <small class="r2-exit">🎯 ${L2('Sprzedaj ½ na x2, resztę trailing −30%', 'Sell ½ at 2x, trail the rest −30%')}</small></div>${rt}</div>`;
    };
    box.innerHTML = `<div class="h">🚀 <span class="chrome">Runner 2.0</span> <span class="badge live">LIVE</span></div>
      <div class="r2-hero" translate="no"><div class="r2-t">${L2('Ostrzejszy Runner — tylko coiny, które przeszły dodatkowe filtry', 'A stricter Runner — only coins that passed extra filters')}</div>
        <div class="r2-chips"><span class="gta-chip">⏱ ${L2('coin ≥ 1 h', 'coin ≥ 1 h old')}</span><span class="gta-chip">🔥 ${L2('≤ +100% w 1 h', '≤ +100% in 1 h')}</span><span class="gta-chip">📊 ${L2('wolumen 1 h ≤ 1,5× MC', '1 h volume ≤ 1.5× MC')}</span><span class="gta-chip">🔁 ${L2('młody: ponownie po 30–60 min', 'young: re-checked after 30–60 min')}</span><span class="gta-chip">👥 ${L2('bez ⚠️ mało holderów / top 10 > 30%', 'no ⚠️ few holders / top 10 > 30%')}</span></div>
        <div class="r2-s">🎯 ${L2('Wyjście: sprzedaj ½ na x2, resztę trailing −30% (stop −40% przed x2). W teście 72 h tylko to wyjście dawało zysk po opłatach.', 'Exit: sell ½ at 2x, trail the rest −30% (stop −40% before 2x). In the 72 h test it was the only exit in profit after fees.')}</div>
        ${res.length ? `<div class="r2-s mut">${L2('72 h', '72 h')}: ${res.length} ${L2('coinów', 'coins')} · ${L2('mediana teraz', 'median now')} ${done.length ? fmtPct(med(done.map((r) => r.nowP))) : '—'} · ${L2('doszło do x2', 'reached 2x')}: ${hit2x}</div>` : ''}</div>
      ${prem ? '' : `<div class="rplan" translate="no"><div class="rplan-t"><b>${paid ? L2('Premium: Twoje odblokowane Runnery', 'Premium: your unlocked Runners') : L2('Plan darmowy', 'Free plan')}</b><small>${L2('Runner 2.0 odblokowuje się tak samo jak Runner: coiny odblokowane w 🏃 Runner i wszystkie starsze niż 24 h. Wszystkie od razu — plan 🏃 Runners.', 'Runner 2.0 unlocks like Runner: coins unlocked in 🏃 Runner and everything older than 24 h. All of them right away — 🏃 Runners plan.')}</small></div><button type="button" class="rplan-cta" data-unlock>🏃 ${L2('Zobacz plany', 'See plans')}</button></div>`}
      ${res.length ? `<div class="card td-card" style="padding:4px 10px">${res.map(row).join('')}</div>` : `<div class="empty" translate="no">${L2('Jeszcze żaden coin nie przeszedł filtrów Runner 2.0. Lista odświeża się po każdym skanie (~90 s).', 'No coin has passed the Runner 2.0 filters yet. The list refreshes after every scan (~90 s).')} <a href="#runner">🏃 Runner →</a></div>`}
      <div class="foot" translate="no">${L2('Runner 2.0 to spekulacja, nie porada finansowa — memecoiny mogą spaść do zera. % liczone od ceny w chwili wejścia do Runner 2.0.', 'Runner 2.0 is speculation, not financial advice — memecoins can go to zero. % is measured from the price when the coin entered Runner 2.0.')}</div>`;
    wireRows(box);
    $$('#listBody [data-unlock]').forEach((el) => { el.onclick = (ev) => { ev.stopPropagation(); openPremium(); }; el.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPremium(); } }; });
  }
  function renderRunner() {
    document.body.classList.remove('pulse-on');
    $('#pulseDesk').innerHTML = '';
    const en = window.KyvoI18n && window.KyvoI18n.isEn();
    const L2 = (pl, e) => (en ? e : pl);
    const items = runnerItems();
    const seenK = {}; for (const x of items.coins.concat(items.tweets)) seenK[x.key] = Date.now();
    try { localStorage.setItem(RSEEN, JSON.stringify(seenK)); } catch (e) {}
    updateRunnerBadge(items);
    // v8.3: stages by MC, smallest first (how early each runner is); MC at first flag from the track-record log
    for (const x of items.coins) trackFlag(x.c, x.leg2 ? 'leg2' : 'runner');
    const pri = (x) => (x.srv && x.srv.badge === 'kol' ? 2 : x.srv && x.srv.tweet ? 1 : 0); // v8.9: 👑 first, then 🐦
    items.coins.sort((a, b) => pri(b) - pri(a) || (a.c.mcap || 0) - (b.c.mcap || 0)); // v8.8: 👑 KOL coins first
    const stCount = {}; for (const x of items.coins) { const st = stageOf(x.c.mcap); if (st) stCount[st.n] = (stCount[st.n] || 0) + 1; }
    if (runnerStage && !stCount[runnerStage]) runnerStage = 0;
    const prem = isRunnersUser(), paid = isPremiumUser(), quota = runnerQuota(), openK = prem ? [] : (openRunnerKeys(items.coins) || []);
    const isOpen = (x) => prem || openK.includes(x.key);
    if (!prem) items.coins.sort((a, b) => (isOpen(b) ? 1 : 0) - (isOpen(a) ? 1 : 0)); // v8.11: the free Runner first
    const shown = runnerStage ? items.coins.filter((x) => (stageOf(x.c.mcap) || {}).n === runnerStage) : items.coins;
    const freeLeft = !prem && openK.length && items.coins.some((x) => openK.includes(x.key)), openN = openK.length, nLeft = Math.max(0, quota - openN);
    const flagAgo = (ms) => { const m = Math.max(1, Math.round((Date.now() - ms) / 60e3)); return m < 60 ? L2(m + ' min temu', m + ' min ago') : L2(Math.round(m / 60) + ' h temu', Math.round(m / 60) + ' h ago'); };
    const kindLabel = (x) => { const b = x.srv && x.srv.badge; return b === 'kol' ? '👑 KOL coin' : b === 'moon' ? '🚀 Moon run' : b === 'tweet' ? '🐦 Tweet runner' : b === 'big' || x.big ? '📈 ' + L2('Duży runner', 'Big runner') : x.leg2 ? '🔁 ' + L2('Kolejna fala', 'Second leg') : x.early ? '⚡ ' + L2('Zaczyna pompować', 'Starting to pump') : '🏃 Runner'; };
    const lockCard = (x) => { const at = runnerFlagAt(x); // v8.11: no name / ticker / CA / logo / chart / links for locked Runners
      return `<div class="row runner rlock" role="button" tabindex="0" data-unlock translate="no"><div class="rlock-ic" aria-hidden="true">🔒</div>
        <div class="nm"><b>${kindLabel(x)}${at ? ` <span class="mut" style="font-weight:600">· ${esc(flagAgo(at))}</span>` : ''}</b>
          <div class="rlock-bars" aria-hidden="true"><i style="width:62%"></i><i style="width:44%"></i><i style="width:74%"></i></div>
          <small class="rlock-t">🔒 ${paid ? L2('Wszystkie Runnery — plan 🏃 Runners', 'All Runners — 🏃 Runners plan') : L2('+1 Runner — Premium (3/dzień) lub 🏃 Runners (wszystkie)', '+1 Runner — Premium (3/day) or 🏃 Runners (all)')}</small></div>
        <div class="rt"><span class="rlock-cta">${L2('Odblokuj', 'Unlock')}</span></div></div>`; };
    const coinCard = (x) => {
      if (!isOpen(x)) return lockCard(x);
      const c = x.c;
      const st = stageOf(c.mcap), sv = x.srv;
      const tr = sv ? { mc0: sv.mc0, at: sv.at, kinds: { runner: sv.at } } : track.items[keyOf(c)]; // v8.8: server flag time/MC for 👑/🚀
      const climb = tr && tr.mc0 ? (c.mcap / tr.mc0 - 1) * 100 : null;
      return `<div class="row runner${x.leg2 ? ' leg2' : ''}" data-key="${esc(keyOf(c))}" role="button" tabindex="0">${imgTag(c)}
        <div class="nm"><b><span class="cbadge c-${esc(c.chainId || 'solana')}">${esc(chainBadge(c))}</span> ${esc(c.name)} <span class="mut" style="font-weight:600">$${esc(c.symbol)}</span>${sv ? '' : x.leg2 ? ` <span class="leg2b" translate="no">🔁 ${L2('Kolejna fala', 'Second leg')}</span>` : x.big ? ` <span class="leg2b bigb" translate="no">📈 ${L2('Duży runner', 'Big runner')}</span>` : x.early ? ` <span class="leg2b early" translate="no">⚡ ${L2('Zaczyna pompować', 'Starting to pump')}</span>` : ''}</b>
          ${sv ? `<div class="kolline">${sv.badge === 'kol' ? '<span class="leg2b kolb" translate="no">👑 KOL coin</span>' : sv.badge === 'tweet' ? `<span class="leg2b twb" translate="no">🐦 Tweet runner</span>` : sv.badge === 'big' ? `<span class="leg2b bigb" translate="no">📈 ${L2('Duży runner', 'Big runner')}</span>` : `<span class="leg2b moonb" translate="no">🚀 Moon run · ${L2('wysokie ryzyko', 'high risk')}</span>`}</div>` + kolWarnHtml(sv) : ''}
          ${sv && sv.tweet && sv.tweet.url ? `<div class="twlink" translate="no"><a href="${esc(sv.tweet.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">🐦 ${L2('Tweet', 'Tweet')} @${esc(sv.tweet.handle || '')} · +${Math.round(sv.tweet.chg || 0)}% ${L2('od tweeta', 'since')} ↗</a></div>` : ''}
          ${st ? `<div class="rstage st${st.n}" translate="no"><b>${L2('Etap', 'Stage')} ${st.n}</b> ${stageBarHtml(st)} <span class="mut">${esc(st.range)} · ${esc(L2(st.pl, st.en))}</span></div>` : ''}
          <div class="rmc" translate="no">${tr && tr.mc0 ? `${L2('MC przy oznaczeniu', 'MC at flag')} <b>${fmtUsd(tr.mc0)}</b> → ${L2('teraz', 'now')} <b>${fmtUsd(c.mcap)}</b> <span class="${pctClass(climb)}">${climb >= 0.5 ? '↑' : climb <= -0.5 ? '↓' : '→'} ${fmtPct(climb)}</span> <span class="mut">· ${esc(flagAgo(tr.kinds.runner || tr.kinds.leg2 || tr.at))}</span>` : `MC <b>${fmtUsd(c.mcap)}</b>`}</div>
          <small>${holdBadge(keyOf(c)).trim()}${holdBadge(keyOf(c)) ? ' ' : ''}Liq ${fmtLiq(c)} · ⏱ ${esc(ageFrom(c.pairCreatedAt))}</small>
          <div class="rwhy" translate="no">${sv && sv.badge === 'kol' ? '👑 ' + L2('Dlaczego KOL coin', 'Why KOL coin') : sv && sv.badge === 'moon' ? '🚀 ' + L2('Dlaczego moon run', 'Why moon run') : sv && sv.badge === 'tweet' ? '🐦 ' + L2('Dlaczego tweet runner', 'Why tweet runner') : (sv && sv.badge === 'big') || x.big ? '📈 ' + L2('Dlaczego duży runner', 'Why big runner') : x.leg2 ? '🔁 ' + L2('Dlaczego kolejna fala', 'Why second leg') : '🏃 ' + L2('Dlaczego runner', 'Why runner')}: ${x.why.join(' · ')}</div>
          ${c._snap ? '' : window.KyvoInsights.upsideRowHtml(c)}</div>
        <div class="rt">${sparkSvg(c)}<b class="${pctClass(c.change.h1)}">${fmtPct(c.change.h1)}</b><small class="mut">1h</small><small class="rtmc" translate="no">MC ${fmtUsd(c.mcap)}</small></div></div>`;
    };
    const twCard = (x) => {
      if (!prem) return `<div class="card runner-tw rlock" role="button" tabindex="0" data-unlock translate="no"><div class="rtw-h"><span class="rlock-ic sm" aria-hidden="true">🔒</span> <b>${L2('Super-ważny tweet z coinem', 'Super-important tweet with a coin')}</b> <span class="mut">${esc(agoLabel(x.at))}</span></div><div class="rlock-bars" aria-hidden="true"><i style="width:80%"></i><i style="width:56%"></i></div><small class="rlock-t">🔒 🏃 Runners · <span class="rlock-cta">${L2('Odblokuj', 'Unlock')}</span></small></div>`;
      const k = coinKey(x.coin.chain, x.coin.address);
      return `<div class="card runner-tw" translate="no">
        <div class="rtw-h">${imgTag(x.t.avatar, 'av', 32)} <b>@${esc(x.t.handle)}</b> <span class="mut">${esc(agoLabel(x.at))} · ${x.views ? fmtInt(x.views) + ' views' : fmtInt(x.likes) + ' ♥'}${x.vel ? ' · ' + fmtInt(Math.round(x.vel)) + ' views/h' : ''}</span></div>
        <div class="rtw-t">${esc(String(x.t.text || '').slice(0, 220))}</div>
        <div class="rwhy">🏃 ${L2('Dlaczego runner', 'Why runner')}: ${x.why.join(' · ')}</div>
        ${vCoinHtml(Object.assign({}, x.coin, { kyvo: true }))}
        <div class="vsince mut" data-rsince="${esc(k)}" data-at="${esc(x.at)}">${L2('Ruch od tweeta: liczę…', 'Move since tweet: computing…')}</div>
        <a href="${esc(x.t.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px">${L2('Otwórz tweet', 'Open tweet')} ↗</a>
      </div>`;
    };
    /* v8.15: hero = Runners FLAGGED today (server log data/track_record.json); "Aktywne teraz" = coins that meet the live bar now.
       The section below lists the same flagged-today set the hero counts, so the two never contradict each other.
       Gate: Runners plan sees all; Free/Premium see their open picks (first flagged today, up to the daily quota), others locked. */
    const HS = runnerHeroStats(), todayList = HS ? HS.win.slice().sort((a, b) => b.kinds.runner - a.kinds.runner) : [], todayN = todayList.length;
    const todayOpen = (() => { if (prem) return null; const o = openK.slice(); for (const e of todayList.slice().sort((a, b) => a.kinds.runner - b.kinds.runner)) { if (o.length >= quota) break; if (!o.includes(e.k)) o.push(e.k); } return o; })();
    const todayRow = (e) => {
      const maxP = pctE(e.max, e), nowP = pctE(e.last, e);
      const ok = (v) => v != null && isFinite(v) && v < 5000;
      const res = `<div class="rt td-rt">${ok(maxP) ? `<b class="chrome td-max">+${Math.round(Math.max(0, maxP))}%</b><small class="mut">${L2('max po oznacz.', 'max after flag')}</small>` : ''}${ok(nowP) ? `<small class="${pctClass(nowP)}">${L2('teraz', 'now')} ${fmtPct(nowP)}</small>` : ''}</div>`;
      if (todayOpen && !todayOpen.includes(e.k)) return `<div class="row td-row rlock" role="button" tabindex="0" data-unlock translate="no"><div class="rlock-ic" aria-hidden="true">🔒</div><div class="nm"><b>🏃 Runner <span class="mut" style="font-weight:600">· ${esc(flagAgo(e.kinds.runner))}</span></b><div class="rlock-bars" aria-hidden="true"><i style="width:58%"></i><i style="width:40%"></i></div></div>${res}</div>`;
      const c = kolCoinOf(e);
      return `<div class="row td-row" data-key="${esc(e.k)}" role="button" tabindex="0" translate="no">${imgTag(c)}<div class="nm"><b><span class="cbadge c-${esc(e.chain || 'solana')}">${esc(chainBadge(c))}</span> ${esc(e.name || e.sym || '')} <span class="mut" style="font-weight:600">$${esc(e.sym || '')}</span></b><small class="td-sub">${holdBadge(e.k).trim()}${holdBadge(e.k) ? ' ' : ''}${esc(flagAgo(e.kinds.runner))} · MC ${fmtUsd(e.mc0)} → ${fmtUsd(e.mcNow || e.mc0)}</small></div>${res}</div>`;
    };
    const todayHtml = todayN ? `<div class="h" style="font-size:14px;margin-top:12px">${HS.today ? L2('Oznaczone dziś', 'Flagged today') : L2('Oznaczone w 24 h', 'Flagged in 24 h')} <span class="mut" style="font-size:12px">${todayN}</span> <span class="mut rh-note">${L2('log serwera · wynik od oznaczenia', 'server log · result since flag')}</span></div><div class="card td-card" style="padding:4px 10px">${todayList.map(todayRow).join('')}</div>` : '';
    $('#listBody').innerHTML = `<div class="h">🏃 <span class="chrome">Runner</span> <span class="badge live">LIVE</span></div>
      ${runnerHeroHtml(true)}
      <div class="sub" translate="no">${L2('Najmocniejsze sygnały: rosnący wolumen, dużo transakcji, szybki ruch po filtrach bezpieczeństwa.', 'The strongest signals: rising volume, many txns, a fast move after safety filters.')}</div>
      ${prem ? `<div class="rplan prem" translate="no">🏃 ${L2('Plan Runners: wszystkie Runnery i push bez limitu.', 'Runners plan: all Runners and push, no limit.')}${window.KyvoPremium && window.KyvoPremium.isOwner && window.KyvoPremium.isOwner() ? ' <span class="mut">(' + L2('właściciel', 'owner') + ')</span>' : window.KyvoPremium && window.KyvoPremium.isFreeHour && window.KyvoPremium.isFreeHour() ? ' <span class="mut">(🎁 ' + L2('za darmo do', 'free until') + ' ' + window.KyvoPremium.freeLabel() + ')</span>' : ''}</div>`
        : paid ? `<div class="rplan" translate="no"><div class="rplan-t"><b>✦ ${L2(`Premium: ${quota} Runnery dziennie`, `Premium: ${quota} Runners a day`)}</b><small>${freeLeft ? L2(`Twoje Runnery na dziś (${openN}/${quota}) są odblokowane poniżej — pierwsze oznaczone dziś (czas PL).${nLeft ? ` Jeszcze ${nLeft} odblokuje się przy kolejnych.` : ''} Wszystkie Runnery + push są w planie 🏃 Runners.`, `Your Runners for today (${openN}/${quota}) are unlocked below — the first ones flagged today (Polish time).${nLeft ? ` ${nLeft} more unlock with the next ones.` : ''} All Runners + push are in the 🏃 Runners plan.`) : L2(`Odblokujesz ${quota} pierwsze Runnery oznaczone dziś (czas PL). Wszystkie Runnery + push są w planie 🏃 Runners.`, `You unlock the first ${quota} Runners flagged today (Polish time). All Runners + push are in the 🏃 Runners plan.`)}</small></div><button type="button" class="rplan-cta" data-unlock>🏃 ${L2('Przejdź na Runners', 'Upgrade to Runners')}</button></div>`
        : `<div class="rplan" translate="no"><div class="rplan-t"><b>${L2('Plan darmowy: 1 Runner dziennie', 'Free plan: 1 Runner a day')}</b><small>${freeLeft ? L2('Twój darmowy Runner na dziś jest odblokowany poniżej — pierwszy oznaczony dziś (czas PL).', 'Your free Runner for today is unlocked below — the first one flagged today (Polish time).') : openN ? L2('Dzisiejszy darmowy Runner już minął. Kolejny jutro.', 'Today\u2019s free Runner has passed. Next one tomorrow.') : L2('Darmowy Runner na dziś odblokuje się przy pierwszym coinie oznaczonym dziś (czas PL).', 'Today\u2019s free Runner unlocks with the first coin flagged today (Polish time).')} ${L2('Premium: 3 Runnery dziennie · 🏃 Runners: wszystkie + push.', 'Premium: 3 Runners a day · 🏃 Runners: all + push.')}</small></div><button type="button" class="rplan-cta" data-unlock>✦ ${L2('Zobacz plany', 'See plans')}</button></div>`}
      <div class="h" style="font-size:14px;margin-top:10px">${L2('Aktywne teraz', 'Active now')} <span class="mut" style="font-size:12px">${items.coins.length}</span> <span class="mut rh-note">${L2('od najmniejszego MC', 'smallest MC first')}</span></div>
      ${items.coins.length ? `<div class="filtbar rstages" style="margin:6px 0" translate="no"><button type="button" class="fbtn ${!runnerStage ? 'on' : ''}" data-rst="0">${L2('Wszystkie', 'All')}</button>${STAGES.map((s2) => `<button type="button" class="fbtn ${runnerStage === s2.n ? 'on' : ''}" data-rst="${s2.n}" ${stCount[s2.n] ? '' : 'disabled'}>${L2('Etap', 'Stage')} ${s2.n} <span class="mut">${esc(s2.range)}</span> ${stCount[s2.n] || 0}</button>`).join('')}</div>` : ''}
      ${items.coins.length ? `<div class="card" style="padding:4px 10px">${shown.map(coinCard).join('')}</div>` : `<div class="empty" translate="no">${L2('Żaden Runner nie spełnia teraz progu na żywo (celowo wysoki).', 'No Runner meets the live bar right now (deliberately high).') + (todayN ? ' ' + L2('Dzisiejsze oznaczenia są poniżej.', 'Today\u2019s flags are below.') : '')}</div>`}
      ${todayHtml}
      <div class="h" style="font-size:14px;margin-top:12px">${L2('Super-ważne tweety', 'Super-important tweets')} <span class="mut" style="font-size:12px">${items.tweets.length}</span></div>
      ${items.tweets.length ? items.tweets.map(twCard).join('') : `<div class="empty" translate="no">${L2('Brak super-ważnych tweetów z ostatnich 24 h w migawce X.', 'No super-important tweets from the last 24 h in the X snapshot.')}</div>`}
      <div class="foot" translate="no">${L2('Runner to spekulacja, nie prognoza ani porada finansowa — memecoiny mogą spaść do zera. Migawka X odświeżana ok. 3× dziennie; powiadomienia działają przy otwartej apce (push w tle po włączeniu OneSignal).', 'Runner is speculation, not a forecast or financial advice — memecoins can go to zero. X snapshot refreshes about 3× a day; notifications work while the app is open (background push once OneSignal is enabled).')}</div>`;
    wireRows($('#listBody'));
    $$('#listBody [data-unlock]').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); openPremium(); }; el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPremium(); } }; });
    $$('#listBody [data-rst]').forEach((b) => (b.onclick = () => { runnerStage = +b.dataset.rst || 0; localStorage.setItem('kyvo_runner_stage', String(runnerStage)); renderRunner(); }));
    saveTrack();
    // move since tweet (GeckoTerminal candle, cached)
    if (window.KyvoInsights) {
      $$('[data-rsince]').forEach(async (el) => {
        const k = el.dataset.rsince, at = el.dataset.at;
        const x = items.tweets.find((t) => coinKey(t.coin.chain, t.coin.address) === k);
        if (!x) return;
        try {
          const v = await window.KyvoInsights.priceAtTweet({ chain: x.coin.chain, address: x.coin.address, pair: x.coin.pair, pair_created_at: x.coin.pair_created_at }, at);
          const L0 = liveCoinOf(k);
          const now = L0 && L0.price != null ? L0.price : x.coin.price_usd;
          if (!el.isConnected) return;
          if (v && v.preLaunch) el.textContent = L2('Coin powstał po tweecie', 'Coin launched after the tweet');
          else if (v && v.px && now) { const ch = (now / v.px - 1) * 100; el.innerHTML = `${L2('Od tweeta', 'Since tweet')}: <b class="${pctClass(ch)}">${fmtPct(ch)}</b>`; }
          else el.textContent = L2('Ruch od tweeta: brak danych', 'Move since tweet: no data');
        } catch (e) { if (el.isConnected) el.textContent = L2('Ruch od tweeta: brak danych', 'Move since tweet: no data'); }
      });
    }
  }
  function listHot() {
    let list = applyFilters(coins.slice(), 'hot');
    list.sort((a, b) => (b.volume.h24 || 0) - (a.volume.h24 || 0));
    return list;
  }
  function listBoosted() {
    let list = applyFilters(coins.filter((c) => c.boost > 0), 'boosted');
    if (!list.length) list = applyFilters(coins.slice(), 'boosted');
    list.sort((a, b) => (b.boost || 0) - (a.boost || 0));
    return list;
  }

  /* ---- Render ---- */
  function imgTag(src, cls, size) {
    const s = size || 42;
    if (src && typeof src === 'object') {
      // coin-ish object → real logo with fallback chain (DexScreener → GeckoTerminal → pump.fun → monogram)
      const { list, mono } = imgCandidates(src);
      const ik = coinKey(src.chainId || src.chain || 'solana', src.address || '');
      const first = list[0] || mono;
      return `<img class="${cls || 'tok'}${list.length ? '' : ' mono'}" src="${esc(first)}" width="${s}" height="${s}" alt="" loading="lazy" decoding="async" data-ik="${esc(ik)}"${list.length ? '' : ' data-noimg="1"'} data-fb="${esc(list.slice(1).join('|'))}" data-mono="${esc(mono)}" onload="__kyvoImgOk(this)" onerror="__kyvoImgErr(this)">`;
    }
    const mono = monogram('?', String(src || ''));
    return `<img class="${cls || 'tok'}" src="${esc(src || mono)}" width="${s}" height="${s}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.getAttribute('data-mono')" data-mono="${esc(mono)}">`;
  }

  /* first-seen per list (localStorage) → "na liście od X" */
  const SEEN_KEY = 'kyvo_seen_v1';
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { seen = {}; }
  let seenDirty = false;
  function seenSince(listId, key) {
    if (!listId) return null;
    const m = seen[listId] || (seen[listId] = {});
    if (!m[key]) { m[key] = Date.now(); seenDirty = true; }
    return m[key];
  }
  function flushSeen() {
    if (!seenDirty) return;
    seenDirty = false;
    const cut = Date.now() - 3 * 86400000;
    for (const l of Object.keys(seen)) {
      const ent = Object.entries(seen[l]).filter(([, t]) => t > cut).sort((a, b) => b[1] - a[1]).slice(0, 400);
      seen[l] = Object.fromEntries(ent);
    }
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
  }
  setInterval(flushSeen, 5000);
  function onListLabel(ms) {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return 'na liście od <1 min';
    if (m < 60) return 'na liście od ' + m + ' min';
    if (m < 1440) return 'na liście od ' + Math.floor(m / 60) + ' h';
    return 'na liście od ' + Math.floor(m / 1440) + ' d';
  }
  /* v8.5: compact, useful signal instead of "⏱ 1m · na liście od <1 min" (both said the same thing on fresh lists):
     age (or time since migration) + buyer share + 5-min activity + short-term momentum. */
  function rowTimeHtml(c, listId) {
    const age = ageFrom(c.pairCreatedAt);
    const mig = /^migrated:/.test(listId || '');
    const b5 = c.buysM5, s5 = c.sellsM5, bh = c.buysH1, sh = c.sellsH1;
    const useM5 = b5 != null && s5 != null && b5 + s5 >= 5;
    const B = useM5 ? b5 : bh, S = useM5 ? s5 : sh;
    let flow = '';
    if (B != null && S != null && B + S > 0) {
      const share = Math.round((B / (B + S)) * 100);
      flow = `<span class="sigpill ${share >= 60 ? 'up' : share <= 40 ? 'dn' : ''}" title="Udział kupujących (${useM5 ? '5 min' : '1 h'})"><i class="sgd"></i>${share}% ${useM5 ? '5m' : '1h'}</span>`;
    }
    const tx = useM5 ? b5 + s5 : null;
    const act = tx != null ? `<span class="sigpill" title="Transakcje w 5 min">${tx} tx</span>` : '';
    const m5 = c.change && c.change.m5;
    const mom = m5 != null && isFinite(m5) && Math.abs(m5) >= 1 ? `<span class="sigpill ${m5 > 0 ? 'up' : 'dn'}" title="Zmiana ceny 5 min">${m5 > 0 ? '↗' : '↘'} ${m5 >= 1e5 ? '>+99 999' : (m5 > 0 ? '+' : '') + Math.round(m5)}% 5m</span>` : '';
    // "na liście od" only where it adds information (lists that are not sorted by age, after ≥ 10 min)
    const fs = /^(new|migrated|stretch|pulse):/.test(listId || '') ? null : seenSince(listId, keyOf(c));
    const onl = fs && Date.now() - fs >= 10 * 60e3 ? `<span class="onlist" title="Od kiedy coin jest w tej zakładce">${onListLabel(fs)}</span>` : '';
    return `<span class="tm"><span class="agepill" title="${mig ? 'Czas od migracji (nowa pula na DEX)' : 'Wiek pary (od utworzenia)'}">${mig ? 'migr. ' : ''}${esc(age)}</span>${flow}${act}${mom}${onl}</span>`;
  }

  /* v8.15 sparkline from REAL DexScreener price changes (24h → 6h → 1h → 5m → now). Points are evenly spaced (a trend
     shape, not a time-scaled chart); fewer than 3 known points → no sparkline. */
  function sparkSvg(c) {
    const ch = c && c.change; if (!ch) return '';
    const seq = [ch.h24, ch.h6, ch.h1, ch.m5].map((v) => (v != null && isFinite(v) && v > -99.9 ? 1 / (1 + v / 100) : null));
    const pts = seq.concat([1]).filter((v) => v != null);
    if (pts.length < 3) return '';
    const mn = Math.min(...pts), mx = Math.max(...pts), W = 56, H = 20, r = mx - mn || 1;
    const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, H - 2 - ((v - mn) / r) * (H - 4)]);
    const d = xy.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
    const up = pts[pts.length - 1] >= pts[0], col = up ? '#3BE58A' : '#FF5A6E', last = xy[xy.length - 1];
    return `<svg class="spark ${up ? 'up' : 'dn'}" viewBox="-2 0 ${W + 4} ${H}" width="${W + 4}" height="${H}" aria-hidden="true"><path d="${d}L${W} ${H}L0 ${H}Z" fill="${col}" fill-opacity=".10" stroke="none"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2" fill="${col}"/></svg>`;
  }
  function coinRow(c, opts) {
    opts = opts || {};
    const ch = c.change.h1 != null ? c.change.h1 : c.change.h24;
    let extra = '';
    if (opts.showCurve && c.curveEst != null) {
      extra = `<span class="est">~${c.curveEst.toFixed(0)}% krzywej*</span>`;
    }
    if (opts.showDex) {
      extra += (extra ? ' · ' : '') + `<span class="mut">${esc(c.dexId)}</span>`;
    }
    const cons = consensusOf(c);
    if (cons.buyers.length) {
      const names = cons.buyers.slice(0, 2).join(', ');
      extra += (extra ? ' · ' : '') + `<span class="smbadge" title="Konsensus smart money (72h): ${cons.buyers.length} kupiło${cons.sellers.length ? ', ' + cons.sellers.length + ' już sprzedało' : ''}">🧠 ${cons.buyers.length} SM${cons.sellers.length ? ' · ' + cons.sellers.length + ' sprz.' : ''} · ${esc(names)}</span>`;
    }
    const cl = window.KyvoInsights ? window.KyvoInsights.cloneCheck(c) : null;
    if (cl && cl.bigger) extra += (extra ? ' · ' : '') + `<span class="clonebadge" title="Jest większy coin o tym samym tickerze — sprawdź adres (CA)">⚠ możliwa kopia</span>`;
    const hb = holdBadge(keyOf(c)).trim();   // v8.35 ⚠️ few holders
    const star = window.KyvoInsights && window.KyvoInsights.isWatched(keyOf(c)) ? '<span class="wstar" title="Na Twojej watchliście">★</span> ' : '';
    const badge = `<span class="cbadge c-${esc(c.chainId || 'solana')}">${esc(chainBadge(c))}</span>`;
    return `<div class="row" data-key="${esc(keyOf(c))}" role="button" tabindex="0">
      ${imgTag(c)}
      <div class="nm"><b>${star}${badge} ${esc(c.name)} <span class="mut" style="font-weight:600">$${esc(c.symbol)}</span></b>
        <small>${hb ? hb + ' ' : ''}MC ${fmtUsd(c.mcap)} · ${fmtLiq(c) === 'krzywa' ? 'Liq: krzywa' : 'Liq ' + fmtLiq(c)}${extra ? ' · ' + extra : ''}</small>
        ${rowTimeHtml(c, opts.listId)}${opts.extraHtml || ''}${opts.upside && window.KyvoInsights ? (opts.good ? window.KyvoInsights.goodRowHtml(c) : window.KyvoInsights.upsideRowHtml(c)) : ''}</div>
      <div class="rt">${sparkSvg(c)}<b class="${pctClass(ch)}">${fmtPct(ch)}</b>
        <small class="mut">Vol ${fmtUsd(c.volume.h24)}</small></div>
    </div>`;
  }

  function wireRows(root) {
    $$('[data-key]', root).forEach((el) => {
      const go = (e) => { if (e && e.target && e.target.closest && e.target.closest('.upl,.upx')) return; goCoin(el.getAttribute('data-key')); };
      el.addEventListener('click', go);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target !== el) return;
          e.preventDefault();
          go();
        }
      });
    });
  }

  function renderFilterPanel(tab) {
    const f = filters[tab] || DEFAULT_FILTERS.hot;
    // v8.4: Kyvo's default thresholds are not shown — an empty field = "auto (Kyvo)"
    const dflt = DEFAULT_FILTERS[tab] || {};
    const fv = (k) => (f[k] != null && String(f[k]) !== '' && String(f[k]) === String(dflt[k] == null ? '' : dflt[k]) ? '' : f[k]);
    const fph = (k, ph) => (dflt[k] != null && String(dflt[k]) !== '' ? 'auto (Kyvo)' : ph.replace(/^np\. [0-9.]+$/, '—'));
    const panel = $('#filtPanel');
    const bar = $('#filtBar');
    const show = FILTER_TABS.includes(tab) && tab !== 'viral' && tab !== 'more' && tab !== 'coin' && tab !== 'search';
    if (bar) bar.style.display = show ? '' : 'none';
    if (!show) {
      panel.classList.remove('open');
      return;
    }
    $('#filtSummary').textContent = filtSummary(tab);
    $('#filtToggle').classList.toggle('on', filtOpen);
    panel.classList.toggle('open', filtOpen);
    if (!filtOpen) {
      panel.innerHTML = '';
      return;
    }
    panel.innerHTML = `
      <div class="fgrid">
        <div class="ffield"><label>MC min ($)</label><input data-k="mcapMin" type="number" inputmode="decimal" value="${esc(fv('mcapMin'))}" placeholder="${esc(fph('mcapMin', 'np. 10000'))}"></div>
        <div class="ffield"><label>MC max ($)</label><input data-k="mcapMax" type="number" inputmode="decimal" value="${esc(fv('mcapMax'))}" placeholder="${esc(fph('mcapMax', '—'))}"></div>
        <div class="ffield"><label>Liq min ($)</label><input data-k="liqMin" type="number" inputmode="decimal" value="${esc(fv('liqMin'))}" placeholder="${esc(fph('liqMin', '—'))}"></div>
        <div class="ffield"><label>Vol 24h min ($)</label><input data-k="volMin" type="number" inputmode="decimal" value="${esc(fv('volMin'))}" placeholder="${esc(fph('volMin', '—'))}"></div>
        <div class="ffield"><label>Wiek max (h)</label><input data-k="ageMaxH" type="number" inputmode="decimal" value="${esc(fv('ageMaxH'))}" placeholder="${esc(fph('ageMaxH', '—'))}"></div>
        <div class="ffield"><label>Wiek min (h)</label><input data-k="ageMinH" type="number" inputmode="decimal" value="${esc(fv('ageMinH'))}" placeholder="${esc(fph('ageMinH', '—'))}"></div>
        <div class="ffield"><label>Δ 5m min (%)</label><input data-k="chg5mMin" type="number" inputmode="decimal" value="${esc(fv('chg5mMin'))}" placeholder="${esc(fph('chg5mMin', '—'))}"></div>
        <div class="ffield"><label>Δ 1h min (%)</label><input data-k="chg1hMin" type="number" inputmode="decimal" value="${esc(fv('chg1hMin'))}" placeholder="${esc(fph('chg1hMin', '—'))}"></div>
        <div class="ffield"><label>Buy ratio 1h min (0–1)</label><input data-k="buyRatioMin" type="number" step="0.05" min="0" max="1" value="${esc(fv('buyRatioMin'))}" placeholder="${esc(fph('buyRatioMin', 'np. 0.4'))}"></div>
        <div class="ffield full"><label class="fcheck"><input data-k="hasSocials" type="checkbox" ${f.hasSocials ? 'checked' : ''}> Wymagaj socials / strony WWW</label></div>
      </div>
      <div class="factions">
        <button type="button" class="reset" id="filtReset">Reset</button>
        <button type="button" class="apply" id="filtApply">Zastosuj</button>
      </div>
      <div class="mut" style="font-size:11px;margin-top:8px">Sieć wybierasz przełącznikiem u góry. Filtry zapisują się w tej przeglądarce. Buy ratio = udział transakcji kupna w ostatniej godzinie.</div>`;
    $('#filtApply').onclick = () => {
      const next = Object.assign({}, filters[tab]);
      panel.querySelectorAll('[data-k]').forEach((el) => {
        const k = el.getAttribute('data-k');
        if (el.type === 'checkbox') next[k] = el.checked;
        else next[k] = el.value === '' && DEFAULT_FILTERS[tab] && DEFAULT_FILTERS[tab][k] != null ? DEFAULT_FILTERS[tab][k] : el.value;
      });
      next.chain = activeChain;
      filters[tab] = next;
      saveFilters();
      filtOpen = false;
      setView(view);
    };
    $('#filtReset').onclick = () => {
      filters[tab] = Object.assign({}, DEFAULT_FILTERS[tab], { chain: activeChain });
      saveFilters();
      renderFilterPanel(tab);
      setView(view);
    };
  }

  function renderList(list, title, sub, opts) {
    opts = opts || {};
    const body = $('#listBody');
    document.body.classList.remove('pulse-on');
    $('#pulseDesk').innerHTML = '';
    if (fetchErr && !list.length) {
      body.innerHTML = `<div class="err">${esc(fetchErr)}<div style="margin-top:8px"><button class="pill" id="retryBtn">Spróbuj ponownie</button></div></div>`;
      $('#retryBtn') && $('#retryBtn').addEventListener('click', () => refresh(true));
      return;
    }
    const swipe =
      opts.swipeTabs
        ? `<div class="swipe" id="pulseSwipe">
            <button type="button" data-ptab="new" class="${mobilePulseTab === 'new' ? 'on' : ''}">New</button>
            <button type="button" data-ptab="stretch" class="${mobilePulseTab === 'stretch' ? 'on' : ''}" ${!chainSupportsStretch(activeChain) ? 'disabled style="opacity:.4"' : ''}>Final Stretch</button>
            <button type="button" data-ptab="migrated" class="${mobilePulseTab === 'migrated' ? 'on' : ''}" ${!chainSupportsMigrated(activeChain) ? 'disabled style="opacity:.4"' : ''}>Migrated</button>
          </div>`
        : '';
    body.innerHTML = `
      ${swipe}
      <div class="h">${esc(title)} <span class="badge live">LIVE</span> <span class="mut" style="font-weight:600;font-size:12px">${list.length}</span></div>
      <div class="sub">${esc(sub || '')} · ${esc(filtSummary(opts.filtTab || view))} · ${esc(sourceLabel || 'DexScreener')}</div>
      ${opts.topHtml || ''}
      ${opts.hideNote ? `<div class="card" style="font-size:12.5px;color:var(--warn)">${esc(opts.hideNote)}</div>` : ''}
      ${
        list.length
          ? `<div class="card" style="padding:4px 10px">${list.map((c, i) => coinRow(c, Object.assign({ listId: (opts.filtTab || view) + ':' + activeChain, good: (opts.filtTab || view) === 'good', upside: (opts.filtTab || view) === 'good' ? i < 60 : (opts.filtTab || view) === 'new' ? i < 40 : i < 5 }, opts.rowOpts))).join('')}</div>`
          : opts.hideNote
            ? ''
            : !liveLoaded ? `<div class="loading"><div class="spin"></div>Ładuję live dane…</div>`
            : opts.emptyHtml || `<div class="empty">Brak coinów dla tych filtrów.</div>`
      }
      ${opts.footnote || ''}
      <div class="foot">Dane: DexScreener / GeckoTerminal · to nie jest porada finansowa</div>`;
    wireRows(body);
    if (opts.swipeTabs) {
      $$('#pulseSwipe [data-ptab]').forEach((b) =>
        b.addEventListener('click', () => {
          if (b.disabled) return;
          mobilePulseTab = b.getAttribute('data-ptab');
          setView('pulse');
        })
      );
    }
  }

  function stretchTip() {
    if (activeChain === 'bsc') return 'four.meme · blisko ukończenia krzywej';
    if (activeChain === 'all') return 'pump.fun + four.meme · blisko ukończenia krzywej';
    return 'pump.fun · blisko ukończenia krzywej';
  }
  function migrTip() {
    if (activeChain === 'bsc') return 'Świeżo po migracji na PancakeSwap · ⏱ = czas od migracji';
    if (activeChain === 'all') return 'Świeżo po migracji na DEX · ⏱ = czas od migracji';
    return 'Świeżo po migracji na PumpSwap / Raydium / Meteora · ⏱ = czas od migracji';
  }
  function newTip() {
    const ch = CHAIN_LABEL[activeChain] || activeChain;
    return 'Najnowsze pary';
  }

  function renderPulseDesktop() {
    const news = listNew('new').slice(0, 40);
    const stretchOk = chainSupportsStretch(activeChain);
    const migrOk = chainSupportsMigrated(activeChain);
    const stretch = stretchOk ? listStretch('stretch').slice(0, 40) : [];
    const migr = migrOk ? listMigrated('migrated').slice(0, 40) : [];
    document.body.classList.add('pulse-on');
    $('#listBody').innerHTML = '';
    const desk = $('#pulseDesk');
    const col = (title, list, tip, rowOpts, emptyNote, listKey = title === 'New Pairs' ? 'new' : title === 'Final Stretch' ? 'stretch' : 'migrated') => `
      <div class="pcol">
        <h3>${esc(title)} <span class="badge live">${list.length}</span></h3>
        <div class="mut" style="font-size:11px;margin-bottom:8px">${esc(tip)}</div>
        ${listKey === 'migrated' && list.length ? migSortHtml() : ''}
        ${qualityNote(listKey)}
        ${
          list.length
            ? list.map((c, i) => coinRow(c, Object.assign({ listId: listKey + ':' + activeChain, upside: listKey === 'new' ? i < 40 : i < 5 }, rowOpts))).join('')
            : !liveLoaded ? `<div class="loading" style="padding:16px 4px"><div class="spin"></div>Ładuję live dane…</div>`
            : `<div class="empty" style="padding:16px 4px">${esc(emptyNote || 'Brak coinów — zmień filtry albo poczekaj chwilę na odświeżenie')}</div>`
        }
      </div>`;
    let html = col('New Pairs', news, newTip(), { showDex: true });
    if (stretchOk) {
      html += col('Final Stretch', stretch, stretchTip(), { showCurve: true });
    } else {
      html += col('Final Stretch', [], 'Niedostępne', {}, chainNote(activeChain));
    }
    if (migrOk) {
      html += col('Migrated', migr, migrTip(), { showDex: true });
    } else {
      html += col('Migrated', [], 'Niedostępne', {}, chainNote(activeChain));
    }
    html += `<div class="foot" style="grid-column:1/-1">* Procent krzywej to estymacja (MC / ~$69k), nie oficjalna wartość. · ${chainNote(activeChain)}</div>`;
    desk.innerHTML = html;
    wireRows(desk);
  }

  function renderPulseMobile() {
    document.body.classList.remove('pulse-on');
    $('#pulseDesk').innerHTML = '';
    if (mobilePulseTab === 'stretch') {
      if (!chainSupportsStretch(activeChain)) {
        renderList([], 'Final Stretch', 'Niedostępne na tym chainie', {
          filtTab: 'stretch',
          swipeTabs: true,
          hideNote: chainNote(activeChain),
        });
        return;
      }
      renderList(listStretch('stretch'), 'Final Stretch', stretchTip(), {
        filtTab: 'stretch',
        swipeTabs: true,
        rowOpts: { showCurve: true },
        footnote: qualityNote('stretch') + '<div class="mut" style="font-size:11px;margin:6px 2px">* Krzywa ≈ MC / ~$69k (estymacja)</div>',
      });
    } else if (mobilePulseTab === 'migrated') {
      if (!chainSupportsMigrated(activeChain)) {
        renderList([], 'Migrated', 'Niedostępne na tym chainie', {
          filtTab: 'migrated',
          swipeTabs: true,
          hideNote: chainNote(activeChain),
        });
        return;
      }
      renderList(listMigrated('migrated'), 'Migrated', migrTip(), {
        filtTab: 'migrated',
        swipeTabs: true,
        topHtml: migSortHtml(),
        rowOpts: { showDex: true },
        footnote: qualityNote('migrated'),
      });
    } else {
      renderList(listNew('new'), 'New Pairs', newTip(), {
        filtTab: 'new',
        swipeTabs: true,
        rowOpts: { showDex: true },
        footnote: qualityNote('new'),
      });
    }
  }

  function isDesktopPulse() {
    return window.matchMedia('(min-width:900px)').matches;
  }

  function openCoin(key) {
    selectedKey = key;
    view = 'coin';
    let c = byKey[key];
    // legacy: bare address
    if (!c && key && key.indexOf(':') < 0) {
      c = Object.values(byKey).find((x) => x.address === key);
      if (c) key = keyOf(c);
    }
    const paint = (coin) => {
      show('coin');
      renderCoin(coin);
    };
    if (c) {
      paint(c);
      enrichCoin(c).then((nc) => {
        if (nc && selectedKey === keyOf(nc)) {
          byKey[keyOf(nc)] = nc;
          paint(nc);
        }
      });
      return;
    }
    show('coin');
    loadCoinDirect(key);
  }

  /* ---- v8.26 cold coin deep link: fetch THIS one coin directly (no waiting for all feeds). DexScreener up to 3 tries
     (0 / 1.2 s / 2.5 s), then GeckoTerminal (token + top pools). Skeleton while loading; 'Nie znaleziono.' only after
     every source failed, with 'Spróbuj ponownie'. ---- */
  const GT_DEX = { 'pump-fun': 'pumpfun', 'pumpfun': 'pumpfun', 'pump-swap': 'pumpswap', 'raydium-clmm': 'raydium', 'raydium-cpmm': 'raydium', 'meteora-dlmm': 'meteora', 'meteora-damm-v2': 'meteora', 'pancakeswap_v2': 'pancakeswap', 'pancakeswap-v3-bsc': 'pancakeswap', 'four-meme': 'fourmeme' };
  function coinSkeleton() {
    const bar = (w, h, mt) => `<div style="height:${h}px;width:${w};margin-top:${mt}px;border-radius:8px;background:linear-gradient(90deg,#ffffff0d,#ffffff1a,#ffffff0d);background-size:200% 100%;animation:kySk 1.2s linear infinite"></div>`;
    return `<style>@keyframes kySk{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>
      <div class="kyskel" aria-busy="true" style="padding:12px 4px">
        <div style="display:flex;gap:12px;align-items:center"><div style="width:52px;height:52px;border-radius:50%;background:#ffffff14"></div><div style="flex:1">${bar('55%', 18, 0)}${bar('35%', 12, 8)}</div></div>
        ${bar('100%', 220, 18)}${bar('100%', 54, 14)}${bar('80%', 14, 14)}${bar('60%', 14, 10)}
        <div class="loading" style="padding:14px 0 0"><div class="spin"></div>Ładuję coin…</div>
      </div>`;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function gtToPairs(g, chain) {
    const tok = (g && g.data && g.data.attributes) || {};
    const out = [];
    for (const inc of (g && g.included) || []) {
      if (!inc || inc.type !== 'pool' || !inc.attributes) continue;
      const a = inc.attributes, rel = inc.relationships || {};
      const baseId = rel.base_token && rel.base_token.data && rel.base_token.data.id;
      if (baseId && tok.address && String(baseId).toLowerCase() !== (GECKO_NET[chain] + '_' + tok.address).toLowerCase()) continue;
      const dexRaw = (rel.dex && rel.dex.data && rel.dex.data.id) || '';
      const num = (o) => { const r = {}; for (const k of ['m5', 'h1', 'h6', 'h24']) r[k] = o && o[k] != null ? Number(o[k]) : null; return r; };
      const tx = a.transactions || {};
      out.push({
        chainId: chain, dexId: GT_DEX[dexRaw] || dexRaw, pairAddress: a.address,
        url: 'https://dexscreener.com/' + chain + '/' + a.address,
        baseToken: { address: tok.address, name: tok.name, symbol: tok.symbol },
        priceUsd: a.base_token_price_usd, marketCap: a.market_cap_usd != null ? Number(a.market_cap_usd) : null,
        fdv: a.fdv_usd != null ? Number(a.fdv_usd) : null, liquidity: { usd: Number(a.reserve_in_usd) || 0 },
        volume: num(a.volume_usd), priceChange: num(a.price_change_percentage),
        txns: { h1: tx.h1 ? { buys: tx.h1.buys, sells: tx.h1.sells } : undefined, h24: tx.h24 ? { buys: tx.h24.buys, sells: tx.h24.sells } : undefined },
        pairCreatedAt: a.pool_created_at ? Date.parse(a.pool_created_at) : null,
        info: tok.image_url && !/missing/.test(tok.image_url) ? { imageUrl: tok.image_url } : {},
      });
    }
    return out;
  }
  async function fetchCoinDirect(chain, addr) {
    const k = coinKey(chain, addr);
    const pick = (map) => map[k] || Object.values(map).find((x) => x.address && x.address.toLowerCase() === addr.toLowerCase() && x.chainId === chain) || null;
    for (const wait of [0, 1200, 2500, 5000]) {   // DexScreener rate-limits bursts (429) -> back off
      if (wait) await sleep(wait);
      try {
        const d = await fetchJson(DS + '/latest/dex/tokens/' + encodeURIComponent(addr));
        const map = {};
        ingestPairs(d.pairs || [], null, map);
        const hit = pick(map);
        if (hit) return hit;
        if (Array.isArray(d.pairs)) break;   // valid answer without this coin -> no point retrying DexScreener
      } catch (e) {}
    }
    const net = GECKO_NET[chain];
    if (net) {
      for (const wait of [0, 2500]) {
        if (wait) await sleep(wait);
        try {
          const url = GT + '/networks/' + net + '/tokens/' + encodeURIComponent(addr) + '?include=top_pools';
          const r = await fetch(url, { headers: { Accept: 'application/json' } });   // direct (not the 2-min shared gate cache: one call, user is waiting)
          if (r.status === 404) break;
          if (!r.ok) continue;
          const map = {};
          ingestPairs(gtToPairs(await r.json(), chain), null, map);
          const hit = pick(map);
          if (hit) { if (!hit.image) hit.image = cachedImg(hit.chainId, hit.address); return hit; }
          break;
        } catch (e) {}
      }
    }
    return null;
  }
  function loadCoinDirect(key) {
    const chain = key.includes(':') ? key.split(':')[0] : 'solana';
    const addr = key.includes(':') ? key.split(':').slice(1).join(':') : key;
    const still = () => view === 'coin' && selectedKey === key;
    $('#coinBody').innerHTML = coinSkeleton();
    fetchCoinDirect(chain, addr).then((nc) => {
      if (!still()) return;
      if (!nc) nc = byKey[key] || null;   // the live feed may have brought it meanwhile
      if (!nc) {
        $('#coinBody').innerHTML = `<div class="err">Nie znaleziono.<div class="mut" style="font-size:12px;margin-top:6px">Nie udało się pobrać tego coina (DexScreener / GeckoTerminal). Sprawdź internet i spróbuj ponownie.</div>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:center"><button type="button" class="pill" id="coinRetry">Spróbuj ponownie</button><button type="button" class="pill" id="backFail">‹ Wróć</button></div></div>`;
        $('#coinRetry').addEventListener('click', () => { if (still()) loadCoinDirect(key); });
        $('#backFail').addEventListener('click', () => (history.length > 1 ? history.back() : setView('pulse')));
        return;
      }
      if (!nc.image) nc.image = cachedImg(nc.chainId, nc.address);
      byKey[keyOf(nc)] = nc;
      selectedKey = keyOf(nc);
      show('coin');
      renderCoin(nc);
    });
  }

  async function enrichCoin(cOrAddr) {
    const addr = typeof cOrAddr === 'string' ? cOrAddr : cOrAddr.address;
    try {
      const d = await fetchJson(DS + '/latest/dex/tokens/' + encodeURIComponent(addr));
      const map = {};
      ingestPairs(d.pairs || [], null, map);
      if (typeof cOrAddr === 'object' && cOrAddr.chainId) {
        const k = coinKey(cOrAddr.chainId, addr);
        if (map[k]) return map[k];
      }
      const vals = Object.values(map);
      if (activeChain !== 'all') {
        const hit = vals.find((x) => x.chainId === activeChain);
        if (hit) return hit;
      }
      return vals[0] || byKey[coinKey((cOrAddr && cOrAddr.chainId) || 'solana', addr)] || null;
    } catch (e) {
      return typeof cOrAddr === 'object' ? byKey[keyOf(cOrAddr)] || null : null;
    }
  }

  /* v8.29: a price that cannot be true (above the market cap = supply < 1 token, e.g. a reversed pair) is hidden, so the page
     never shows "Cena $12.7K" next to "MC $6.7K" */
  function coinPx(c) {
    const p = c && c.priceUsd != null ? +c.priceUsd : NaN;
    if (!isFinite(p) || p <= 0) return null;
    const cap = c.mcap > 0 ? c.mcap : c.fdv > 0 ? c.fdv : 0;
    return cap && p > cap ? null : p;
  }
  /* v8.29: the 45-s refresh used to re-render the WHOLE coin page (chart re-attached, the DexScreener chart restarted its
     "Ładuję wykres…" spinner, Kyvo Check / holders / tabs reloaded, half-typed alert lost). Now only the numbers change in place. */
  function updateCoinLive(c) {
    if (!c || !document.getElementById('cpPx')) return false;
    const set = (id, txt, cls) => { const e = document.getElementById(id); if (!e) return; e.textContent = txt; if (cls != null) e.className = cls; };
    const ch = (window.KyvoChart && window.KyvoChart.current && window.KyvoChart.current()) || null;
    const live = !!(ch && ch.data && !ch.fbAt);   // the Kyvo chart streams MC + price itself
    if (!live) { set('cpPx', fmtUsd(coinPx(c))); if (c.mcap > 0) set('cpMc', fmtUsd(c.mcap)); }
    set('cpLiq', fmtLiq(c)); set('cpFdv', fmtUsd(c.fdv));
    set('cpV5', fmtUsd(c.volume.m5)); set('cpV1', fmtUsd(c.volume.h1)); set('cpV24', fmtUsd(c.volume.h24));
    set('cpD5', fmtPct(c.change.m5), pctClass(c.change.m5)); set('cpD1', fmtPct(c.change.h1), pctClass(c.change.h1));
    set('cpBuy', c.buyRatioH1 != null ? Math.round(c.buyRatioH1 * 100) + '%' : '—');
    return true;
  }

  function renderCoin(c) {

    const smBuys = (c.chainId === 'solana' || !c.chainId) ? smartBuysForMint(c.address) : [];
    const smHtml = smBuys.length
      ? `<div class="card" style="margin-top:10px"><div class="h" style="font-size:13px;margin:0 0 6px">Smart money <span class="badge live">on-chain</span> <span class="smbadge">🧠 ${consensusOf(c).buyers.length} kupiło${consensusOf(c).sellers.length ? ' · ' + consensusOf(c).sellers.length + ' już sprzedało' : ''}</span></div>
          <div class="mut" style="font-size:11px;margin-bottom:6px">Publiczne portfele KOL / traderów · dane z ${esc(stampLabel(smartMoney && smartMoney.updated_at))} · to nie porada finansowa</div>
          ${smBuys.slice(0, 8).map((b) =>
            `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #ffffff08;font-size:12.5px">
              <span><b>${esc(b.wallet_name)}</b> ${b.handle ? `<a href="https://x.com/${esc(b.handle)}" target="_blank" rel="noopener">@${esc(b.handle)}</a>` : ''}
              <span class="mut">${b.block_time ? agoLabel(b.block_time) : '—'}</span></span>
              <span>${esc(fmtSize(b))} <a href="${esc(b.tx_url)}" target="_blank" rel="noopener" style="font-size:11px">tx</a></span>
            </div>`
          ).join('')}
        </div>`
      : (c.chainId === 'solana' || !c.chainId
          ? `<div class="card mut" style="margin-top:10px;font-size:12.5px"><span class="mut">Żaden ze śledzonych portfeli smart money nie kupował ostatnio tego coina.</span></div>`
          : '');

    const urls = platformUrls(c.address, c.chainId);
    const socials = (c.socials || [])
      .map((s) => {
        const u = s.url || s;
        return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.type || 'link')}</a>` : '';
      })
      .filter(Boolean)
      .join(' ');
    const webs = (c.websites || [])
      .map((w) => (w.url ? `<a href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">${esc(w.label || 'web')}</a>` : ''))
      .filter(Boolean)
      .join(' ');
    const gradLabel = c.gradMcap ? '~$' + Math.round(c.gradMcap / 1000) + 'k' : '~$69k';
    const curveLine =
      c.curveEst != null
        ? `<div class="card" style="margin-top:10px;font-size:13px">Krzywa (estymacja): <b>~${c.curveEst.toFixed(1)}%</b> <span class="est">(MC ${fmtUsd(c.mcap)} / ${gradLabel})*</span></div>`
        : '';
    const curveBadge =
      c.dexId === 'pumpfun'
        ? '<span class="badge demo" style="margin-left:4px">pump.fun</span>'
        : c.dexId === 'fourmeme'
          ? '<span class="badge demo" style="margin-left:4px">four.meme</span>'
          : '';

    const CP = window.KyvoCoinPage;
    $('#coinBody').innerHTML = `
      ${CP ? CP.headerHtml(c) : `<span class="back" id="coinBack">‹</span> <b>${esc(c.name)}</b>`}
      <div id="chartSlot" class="chartslot"></div>
      <div class="statg cp-statg">
        <div class="st"><small>Cena</small><b id="cpPx">${fmtUsd(coinPx(c))}</b></div>
        <div class="st"><small>Płynność</small><b id="cpLiq">${fmtLiq(c)}</b></div>
        <div class="st"><small>FDV</small><b id="cpFdv">${fmtUsd(c.fdv)}</b></div>
        <div class="st"><small>Vol 5m</small><b id="cpV5">${fmtUsd(c.volume.m5)}</b></div>
        <div class="st"><small>Vol 1h</small><b id="cpV1">${fmtUsd(c.volume.h1)}</b></div>
        <div class="st"><small>Vol 24h</small><b id="cpV24">${fmtUsd(c.volume.h24)}</b></div>
        <div class="st"><small>Δ 5m</small><b id="cpD5" class="${pctClass(c.change.m5)}">${fmtPct(c.change.m5)}</b></div>
        <div class="st"><small>Δ 1h</small><b id="cpD1" class="${pctClass(c.change.h1)}">${fmtPct(c.change.h1)}</b></div>
        <div class="st"><small>Buy 1h</small><b id="cpBuy">${c.buyRatioH1 != null ? Math.round(c.buyRatioH1 * 100) + '%' : '—'}</b></div>
      </div>
      ${CP ? CP.tabsHtml() : ''}
      <div id="kcheckSlot" class="card" style="margin-top:14px"></div>
      <div id="upsideSlot" style="margin-top:10px"></div>
      ${curveLine}
      ${smHtml}
      <div class="card" style="margin-top:10px"><div class="h" style="font-size:13px;margin:0 0 6px">Socials</div><div class="socials">${socials || '<span class="mut">Brak</span>'} ${webs}</div></div>
      ${platButtonsHtml(urls)}
      <div style="margin-top:8px;text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="${esc(urls.DexScreener)}" target="_blank" rel="noopener noreferrer" style="font-size:12px">DexScreener ↗</a>
        ${urls.Explorer ? `<a href="${esc(urls.Explorer)}" target="_blank" rel="noopener noreferrer" style="font-size:12px">Explorer ↗</a>` : ''}
      </div>
      <div class="foot">To nie jest porada finansowa · DYOR · zawsze sprawdzaj adres (CA)</div>
      ${CP ? CP.ctaHtml(c) : ''}`;
    const mountChart = () => {
      if (!window.KyvoChart) return;
      const pc = CP && CP.pfCoin(c.address);
      window.KyvoChart.mount($('#chartSlot'), {
        key: keyOf(c), network: GECKO_NET[c.chainId || 'solana'], pool: c.pairAddress || null, token: c.address,
        dsChain: c.chainId || 'solana', pair: c.pairAddress || '', smBuys, price: c.priceUsd, change: c.change, // v8.9: last-resort line chart
        mcap: c.mcap, createdAt: c.pairCreatedAt || null, // v8.14: MC axis + "All" timeframe
        wallets: CP ? CP.knownWallets(c) : {}, pfTrades: (pc && pc.trades) || [],
        onAlert: CP ? () => CP.openAlert(c) : null, onLive: (mc, px) => { if (CP) CP.onLive(mc); const pe = document.getElementById('cpPx'); if (pe && isFinite(px) && px > 0) pe.textContent = fmtUsd(px); }, // v8.29: Cena follows the live chart like MC
      });
    };
    mountChart();
    if (window.KyvoInsights) {
      window.KyvoInsights.mountCheck($('#kcheckSlot'), c);
      window.KyvoInsights.mountUpside($('#upsideSlot'), c);
    }
    if (CP) CP.wire(c, $('#coinBody'));
    $('#coinBack').onclick = () => (history.length > 1 ? history.back() : setView('pulse'));
    const cc = $('#copyCa');
    if (cc) cc.onclick = async () => {
      try {
        await navigator.clipboard.writeText(c.address);
        toast('Skopiowano CA ' + shortCa(c.address));
      } catch (e) {
        toast('Nie udało się skopiować');
      }
    };
    coinRemount = (cc2) => { if (cc2 === c && selectedKey === keyOf(c)) mountChart(); };
  }
  let coinRemount = null;

  /* ---------------- Viral z X: tematy → coiny, tweety traderów, ważne posty ---------------- */
  let viralTab = localStorage.getItem('kyvo_viral_tab') || 'topics';
  const liveCoin = {}; // chain:addr -> {mcap, change24, image}
  function liveCoinOf(k) { return liveCoin[k] || null; }
  function snapCoinKey(c) { return coinKey(c.chain, c.address); }
  function vCoinHtml(c, opts) {
    opts = opts || {};
    const k = snapCoinKey(c);
    const L = liveCoin[k] || {};
    const mc = L.mcap != null ? L.mcap : c.mcap;
    const ch = L.change24 != null ? L.change24 : c.change_h24;
    const img = Object.assign({}, c, { image: L.image || c.image });
    const href = c.kyvo !== false ? '#coin/' + encodeURIComponent(k) : null;
    const ds = c.dexscreener || `https://dexscreener.com/${c.chain}/${c.address}`;
    return `<div class="vcoin" data-vk="${esc(k)}">
      ${href ? `<a class="vcoin-main" href="${esc(href)}">` : '<span class="vcoin-main">'}
        ${imgTag(img, 'tok', opts.size || 34)}
        <span class="nm"><b><span class="cbadge c-${esc(c.chain)}">${esc(CHAIN_BADGE[c.chain] || String(c.chain || '').toUpperCase())}</span> $${esc(c.symbol)} <span class="mut" style="font-weight:600">· ${esc(c.name || '')}</span></b>
        <small><span data-mc>MC ${fmtUsd(mc)}</span> · <span data-ch class="${pctClass(ch)}">${fmtPct(ch)} 24h</span>${c.mention ? ` · <span class="mut">z tweeta: ${esc(c.mention.length > 16 ? shortCa(c.mention) : c.mention)}</span>` : ''}</small></span>
      ${href ? '</a>' : '</span>'}
      <span class="vcoin-act">${href ? `<a class="vbtn vbtn-pri" href="${esc(href)}">Otwórz</a>` : ''}<a class="vbtn" href="${esc(ds)}" target="_blank" rel="noopener noreferrer">DEX ↗</a></span>
    </div>`;
  }
  async function refreshViralCoins(root) {
    const all = [];
    if (!viral) viral = { topics: [], posts: [], trader_tweets: [] };
    for (const t of viral.topics || []) for (const c of t.coins || []) all.push(c);
    for (const t of viral.trader_tweets || []) for (const c of t.coins || []) all.push(c);
    for (const p of viral.posts || []) for (const c of (p.coins || []).concat(p.spec_coins || [])) all.push(c);
    const addrs = [...new Set(all.map((c) => c.address))];
    for (let i = 0; i < addrs.length; i += 30) {
      try {
        const d = await fetchJson(DS + '/latest/dex/tokens/' + addrs.slice(i, i + 30).join(','));
        const best = {};
        for (const [k, p] of Object.entries(KP.bestMap(d.pairs || [], coinKey))) {
          if (p) best[k] = { liq: KP.liq(p), price: p.priceUsd != null ? +p.priceUsd : null, mcap: p.marketCap || p.fdv, change24: p.priceChange && p.priceChange.h24, image: p.info && p.info.imageUrl };
        }
        Object.assign(liveCoin, best);
      } catch (e) { /* snapshot values stay */ }
    }
    if (!root || !root.isConnected) return;
    root.querySelectorAll('.vcoin[data-vk]').forEach((el) => {
      const L = liveCoin[el.dataset.vk];
      if (!L) return;
      const mc = el.querySelector('[data-mc]'); if (mc && L.mcap != null) mc.textContent = 'MC ' + fmtUsd(L.mcap);
      const ch = el.querySelector('[data-ch]'); if (ch && L.change24 != null) { ch.textContent = fmtPct(L.change24) + ' 24h'; ch.className = pctClass(L.change24); }
    });
  }
  const vl = (t, f) => (window.KyvoI18n && window.KyvoI18n.isEn() && t && t[f + '_en'] ? t[f + '_en'] : t ? t[f] : '');
  function tweetText(t) {
    // strip trailing t.co links; highlight cashtags / addresses that resolved
    let s = esc(String(t || '').replace(/&amp;/g, '&').replace(/\s*https:\/\/t\.co\/\w+/g, '').trim());
    s = s.replace(/(\$[A-Za-z][A-Za-z0-9]{0,14})\b/g, '<b class="vtag">$1</b>');
    return s;
  }
  function roleBadge(r) {
    return r === 'trader' ? '<span class="badge live" title="Portfel publicznie przypisany — jest w Rankingu">trader</span>' : '<span class="badge demo">KOL</span>';
  }
  /* v8.2: tweet facts (exact time, views, followers) + momentum + named-vs-speculative coin */
  const LOC = () => (window.KyvoI18n ? window.KyvoI18n.locale() : 'pl-PL');
  function exactTime(iso) {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) return '';
    return d.toLocaleString(LOC(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function ageLabelH(h) { return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : h < 48 ? Math.round(h) + ' h' : Math.round(h / 24) + ' d'; }
  function momentumOf(p) {
    const t0 = new Date(p.posted_at || p.created_at).getTime();
    if (!isFinite(t0)) return null;
    const ageH = (Date.now() - t0) / 3.6e6;
    const m = p.metrics || {};
    const tm = new Date(p.metrics_at || '').getTime();
    const hAtSnap = isFinite(tm) ? Math.max(0.25, (tm - t0) / 3.6e6) : null;
    const vph = m.views != null && hAtSnap ? m.views / hAtSnap : null;
    const stage = ageH < 2 ? 'early' : ageH < 12 ? 'mid' : ageH < 48 ? 'late' : 'old';
    const label = { early: '🟢 Wcześnie', mid: '🟡 W trakcie', late: '🟠 Późno', old: '🔴 Bardzo późno' }[stage];
    return { stage, label, ageH, vph };
  }
  function tweetMetaHtml(p) {
    const m = p.metrics || {};
    const mo = momentumOf(p);
    const at = p.posted_at || p.created_at;
    return `<div class="tmeta">
      <div class="tm-row">🕒 <b>${esc(exactTime(at))}</b> · ${esc(timeAgo(at))}${p.author_followers != null ? ` · 👥 <b>${fmtInt(p.author_followers)}</b> <span class="mut">obserwujących</span>` : ''}</div>
      <div class="tm-row tm-eng">${m.views != null ? `<span title="Wyświetlenia">👁 ${fmtInt(m.views)}</span>` : ''}<span title="Polubienia">♥ ${fmtInt(m.likes)}</span><span title="Reposty">↻ ${fmtInt(m.reposts)}</span><span title="Odpowiedzi">💬 ${fmtInt(m.replies)}</span>${m.quotes != null ? `<span title="Cytaty">❝ ${fmtInt(m.quotes)}</span>` : ''}</div>
      ${mo ? `<div class="tm-mom mom-${mo.stage}"><b>Momentum:</b> ${esc(mo.label)} · tweet ma ${esc(ageLabelH(mo.ageH))}${mo.vph != null ? ` · ~${fmtInt(Math.round(mo.vph))} wyśw./h <span class="mut">(średnio do pomiaru)</span>` : ''}</div>` : ''}
    </div>`;
  }
  function matchChipHtml(kind) {
    if (kind === 'named') return '<div class="mchip named">✅ Coin podany w tweecie</div>';
    if (kind === 'speculative') return '<div class="mchip spec">🔮 Spekulacja — dopasowanie po słowach kluczowych</div><div class="mut mdisc">Tweet nie podaje coina. To kandydaci znalezieni po nazwie/tickerze (nowsze i z większą płynnością wyżej). Mogą nie mieć nic wspólnego z tweetem i często są kopiami. Nie porada finansowa.</div>';
    return '';
  }
  let sinceReg = [];
  function sinceSlot(c, at, spec) {
    sinceReg.push({ c, at, spec: !!spec });
    return `<div class="vsince" data-since="${sinceReg.length - 1}"><span class="mut">Od tweeta: liczę…</span></div>`;
  }
  const sinceResolve = (el) => sinceReg[+el.dataset.since] || null;
  const MOM_HELP = '<details class="gloss momhelp"><summary>⚡ Jak czytać momentum?</summary><div>„Wcześnie” = tweet ma mniej niż 2 h, „W trakcie” = 2–12 h, „Późno” = 12–48 h, „Bardzo późno” = ponad 2 dni. Wyświetlenia na godzinę liczymy z danych z chwili pobrania (snapshot X ok. 3× dziennie), więc to średnia, nie tempo na żywo. Jeśli coin już mocno urósł od tweeta, większa część ruchu mogła już być. To tylko podpowiedź, nie sygnał kupna.</div></details>';

  /* v8.10: 🐦 New Tweet — EVERY fresh tweet of the tracked accounts (trader / KOL / celebrity / news), newest first, ≤ 12 h.
     Coin: 'wspomniany' (named in the tweet) or 'powiązany' (a new coin about the tweet's topic, launched ≤ 60 min after it),
     else 'brak coina jeszcze' (a coin can attach later). Logo, chain, MC, price since tweet / launch, volume after. */
  const plFew = (n) => { const d = n % 10, h = n % 100; return d >= 2 && d <= 4 && (h < 12 || h > 14); };
  let twFilter = 'all'; const twSeen = new Set(); // v8.10: filter chips + 'new since last render' flash
  async function renderTweets() {
    document.body.classList.remove('pulse-on');
    const body = $('#tweetsBody');
    const en = window.KyvoI18n && window.KyvoI18n.isEn();
    const L2 = (pl, e) => (en ? e : pl);
    if (!xLive) body.innerHTML = `<div class="loading"><div class="spin"></div>${L2('Ładuję New Tweet…', 'Loading New Tweet…')}</div>`;
    await loadLive();
    if (view !== 'tweets') return;
    const now = Date.now();
    const seen = new Set();
    // v8.10: EVERY fresh tweet of the tracked accounts (≤ 12 h), newest first — with its coin when there is one
    const all = ((xLive && xLive.tweets) || []).filter((t) => { const k = String(t.id); if (seen.has(k)) return false; seen.add(k); if (t.role === 'gta' && !/^rockstargames$/i.test(t.handle || '')) return false; /* v8.30: GTA news accounts -> 🎮 GTA 6 tab only */ return now - new Date(t.created_at).getTime() <= 12 * 3.6e6; })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const hasCoin = (t) => (t.coins || []).length > 0;
    const pumps = (t) => (t.coins || []).some((c) => c.pumping);
    const isVip = (t) => !!t.vip || /^(elonmusk|realdonaldtrump|kimchi1x)$/i.test(t.handle || ''); // v8.23 · v8.24 + Kimchi
    const list = all.filter((t) => twFilter === 'coin' ? hasCoin(t) : twFilter === 'pump' ? pumps(t) : twFilter === 'vip' ? isVip(t) : twFilter === 'reply' ? !!t.is_reply : true);
    const ageH = (t) => (now - new Date(t.created_at).getTime()) / 3.6e6;
    const fresh = list.filter((t) => ageH(t) < 2), older = list.filter((t) => ageH(t) >= 2);
    const upd = xLive && xLive.updated_at;
    const updMin = upd ? Math.round((now - new Date(upd).getTime()) / 60000) : null;
    const coinBox = (c, t) => {
      const ch = c.pre_launch ? c.chg_since_launch : c.chg_since_tweet, va = c.vol_after, vb = c.vol_1h_before;
      const meas = c.measured_at ? Math.max(0, Math.round((now / 1000 - c.measured_at) / 60)) : null;
      const lab = c.pre_launch ? L2('Od startu (po tweecie)', 'Since launch (after tweet)') : L2('Od tweeta', 'Since tweet');
      const facts = ch != null || va != null ? `${ch != null ? `${lab}: <b class="${pctClass(ch)}">${fmtPct(ch)}</b>` : ''}${va != null ? ` · ${L2('wolumen po tweecie', 'volume after tweet')} <b>${fmtUsd(va)}</b>${vb != null && !c.pre_launch ? ` <span class="mut">(${L2('1 h przed', '1 h before')}: ${fmtUsd(vb)})</span>` : ''}` : ''}${meas != null ? ` <span class="mut">· ${L2('pomiar', 'measured')} ${meas} min ${L2('temu', 'ago')}</span>` : ''}`
        : `<span class="mut">${L2('Cena od tweeta: liczę…', 'Price since tweet: measuring…')}</span>`;
      return `${vCoinHtml(c)}<div class="vsince">${c.pumping ? `<span class="badge pumpb">🚀 ${L2('Pompuje po tweecie', 'Pumping after tweet')}</span> ` : ''}${facts}</div>`;
    };
    const coinPart = (t) => {
      const cs = t.coins || [];
      if (!cs.length) {
        const young = ageH(t) < 1.5;
        return `<div class="mchip none" translate="no">⏳ ${L2('Brak coina jeszcze', 'No coin yet')}${young ? ` <span class="mut">· ${L2('szukamy nowych coinów o tym temacie co kilka minut', 'checking new coins about this topic every few minutes')}</span>` : ''}</div>`;
      }
      if ((cs[0].rel || 'named') === 'related') {
        const c = cs[0], dm = c.pair_created_at ? Math.round((c.pair_created_at / 1000 - t.ts) / 60) : null;
        return `<div class="mchip rel" translate="no">🔗 ${L2('Powiązany coin', 'Related coin')} <span class="mut">· ${L2('tweet go nie podaje — nowy coin o tym temacie', 'not named in the tweet — a new coin about this topic')}${dm != null ? ` · ${L2('start', 'launched')} ${dm <= 0 ? L2('razem z tweetem', 'with the tweet') : dm + ' min ' + L2('po tweecie', 'after the tweet')}` : ''}${c.kw ? ` · ${L2('słowo', 'word')} „${esc(c.kw)}”` : ''}${c.alts ? ` · ${L2('kopii', 'copies')}: ${c.alts}` : ''}</span></div>
          <div class="vcoins vcoins-t">${coinBox(c, t)}</div><div class="mut mdisc" translate="no">${L2('Dopasowanie po nazwie — może nie mieć związku z autorem tweeta. Wybraliśmy ten z największym wolumenem; oczywiste scamy odrzucone. Nie porada finansowa.', 'Matched by name — may have nothing to do with the author. We picked the one with the most volume; obvious scams dropped. Not financial advice.')}</div>`;
      }
      return `<div class="mchip named" translate="no">✅ ${L2('Wspomniany coin', 'Mentioned coin')}</div><div class="vcoins vcoins-t">${cs.map((c) => coinBox(c, t)).join('')}</div>`;
    };
    // v8.9 🐦 Tweet runner: coins that clearly run after this tweet (server feed data/kol_live.json)
    if (!kolLive) { try { await loadKolLive(); } catch (e) {} }
    const twRun = {};
    for (const e of (kolLive && kolLive.items) || []) if (e.tweet && e.tweet.id && Date.now() - e.at < 24 * 3.6e6) twRun[String(e.tweet.id)] = e;
    const isNew = (t) => twSeen.size && !twSeen.has(String(t.id));
    const twPrem = isRunnersUser(); let twKeys; const twOpen = (k) => twPrem || (twKeys === undefined ? (twKeys = RunnerGate.openKeys() || []) : twKeys).includes(k);
    /* v8.23: Elon / Trump replies — "Odpowiedź" + what they replied to (parent post text from the server feed) */
    const replyBox = (t) => {
      const r = t.reply_to || {};
      const who = r.handle ? `@${esc(r.handle)}` : L2('innego posta', 'another post');
      const ptxt = r.text ? esc(r.text.length > 220 ? r.text.slice(0, 220) + '…' : r.text) : '';
      const link = r.url || (r.handle && r.id ? `https://x.com/${encodeURIComponent(r.handle)}/status/${encodeURIComponent(r.id)}` : '');
      return `<div class="twreply" translate="no"><span class="mut">↪ ${L2('Odpowiedź do', 'Reply to')} ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${who}</a>` : who}${r.name ? ` <span class="mut">(${esc(r.name)})</span>` : ''}${ptxt ? ':' : ''}</span>${ptxt ? `<div class="twrp">${ptxt}</div>` : ''}</div>`;
    };
    const card = (t) => {
      const h = ageH(t);
      const tr0 = twRun[String(t.id)];
      const tr = tr0 && twOpen(tr0.k) ? tr0 : null; // v8.11: locked Tweet runner → no runner badge at all for free users (a 🔒 badge would reveal which coin runs)
      const q = t.quote, m = (t.media || [])[0];
      return `<div class="card post vtweet${h < 2 ? ' fresh' : ''}${tr ? ' twrun' : ''}${isNew(t) ? ' newin' : ''}${hasCoin(t) ? '' : ' nocoin'}">${tr ? `<div class="twrunb" translate="no">🐦 Tweet runner · <b>$${esc(tr.sym)}</b> <b class="up">+${Math.round(tr.tweet.chg || 0)}%</b> ${L2('po tweecie', 'after the tweet')} · <a href="#runner">${L2('w Runnerach', 'in Runner')} →</a></div>` : ''}
        <div class="meta">${imgTag(t.avatar, 'av', 36)}
          <div style="flex:1;min-width:0"><b style="font-size:13.5px">${esc(t.author_name || t.handle)} <span class="mut">@${esc(t.handle)}</span> ${t.role === 'celebrity' ? '<span class="badge demo">VIP</span>' : t.role === 'news' ? '<span class="badge demo">NEWS</span>' : t.role === 'project' ? '<span class="badge demo">' + L2('projekt', 'project') + '</span>' : t.role === 'gta' ? '<span class="badge demo">🎮 GTA</span>' : roleBadge(t.role)}</b>
          <div class="mut" style="font-size:11.5px">${t.author_followers != null ? `👥 ${fmtInt(t.author_followers)} ${L2('obserwujących', 'followers')} · ` : ''}🕒 ${esc(exactTime(t.created_at))} · <b class="${h < 2 ? 'up' : ''}">${esc(ageLabelH(h))} ${L2('temu', 'ago')}</b>${t.is_reply ? ` · <span class="badge twrb">↪ ${L2('Odpowiedź', 'Reply')}</span>` : ''}</div></div>
          <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" class="vx" aria-label="${L2('Otwórz na X', 'Open on X')}">𝕏</a></div>
        ${t.is_reply ? replyBox(t) : ''}<div class="txt vq${String(t.text || '').length > 190 ? ' long' : ''}">${tweetText(t.is_reply ? String(t.text || '').replace(/^(@\w{1,15}\s+)+/, '') || t.text : t.text)}</div>
        ${q && q.text ? `<div class="twq"><span class="mut">↪ @${esc(q.handle || '')}:</span> ${esc(q.text.length > 200 ? q.text.slice(0, 200) + '…' : q.text)}</div>` : ''}
        ${m && m.url ? `<a class="twimg" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="${esc(m.url)}" alt="${esc(m.alt || '')}" onerror="this.parentNode.remove()">${m.type !== 'photo' ? '<span>▶</span>' : ''}</a>` : ''}
        ${coinPart(t)}
        <div class="vfoot"><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${L2('Tweet na X', 'Tweet on X')} ↗</a>${t.wallet_id ? `<a class="vbtn" href="#trader/${encodeURIComponent(t.wallet_id)}">${L2('Profil w Rankingu', 'Ranking profile')}</a>` : ''}</div>
      </div>`;
    };
    const nCoin = all.filter(hasCoin).length, nPump = all.filter(pumps).length;
    const chip = (id, lb, n) => `<button type="button" class="twf${twFilter === id ? ' on' : ''}" data-twf="${id}">${lb} <span class="vcount">${n}</span></button>`;
    body.innerHTML = `<div class="h" translate="no">🐦 New Tweet <span class="badge live">${all.filter((t) => ageH(t) < 2).length} ${L2('z ostatnich 2 h', 'in the last 2 h')}</span></div>
      <div class="sub" translate="no">${L2('Wszystkie świeże tweety Elona, Trumpa, CZ, KOL-i i dużych traderów — najnowsze na górze, z coinem, gdy jest. U Elona i Trumpa także odpowiedzi (coiny często startują od jednej odpowiedzi). Sprawdzamy', 'Every fresh tweet from Elon, Trump, CZ, KOLs and big traders — newest first, with the coin when there is one. For Elon and Trump also their replies (coins often launch off a single reply). We check')} ${((xLive && xLive.accounts) || []).length} ${L2(plFew(((xLive && xLive.accounts) || []).length) ? 'konta' : 'kont', 'accounts')} ${L2('co kilka minut', 'every few minutes')}${updMin != null ? ` · ${L2('ostatnio', 'last')} ${updMin} min ${L2('temu', 'ago')}` : ''}.</div>
      ${updMin != null && updMin > 45 ? `<div class="card" style="font-size:12.5px;color:var(--warn)" translate="no">${L2('Feed nie odświeżył się od', 'Feed has not refreshed for')} ${updMin} min — ${L2('źródło mogło chwilowo nie odpowiadać.', 'the source may be temporarily unavailable.')}</div>` : ''}
      <div class="twfs" translate="no">${chip('all', L2('Wszystkie', 'All'), all.length)}${chip('coin', L2('Z coinem', 'With a coin'), nCoin)}${chip('pump', '🚀 ' + L2('Pompuje', 'Pumping'), nPump)}${chip('vip', '⭐ VIP', all.filter(isVip).length)}${chip('reply', '↪ ' + L2('Odpowiedzi', 'Replies'), all.filter((t) => t.is_reply).length)}</div>
      <div>${fresh.length ? fresh.map(card).join('') : `<div class="empty">${twFilter === 'all' ? L2('W ostatnich 2 h śledzone konta nic nie napisały.', 'The tracked accounts have not posted in the last 2 h.') : L2('Brak takich tweetów w ostatnich 2 h.', 'No such tweets in the last 2 h.')}</div>`}</div>
      ${older.length ? `<div class="h" style="font-size:14px;margin-top:14px" translate="no">${L2('Wcześniej (2–12 h)', 'Earlier (2–12 h)')} <span class="mut" style="font-size:12px">${older.length}</span></div><div>${older.map(card).join('')}</div>` : ''}
      <div class="mut" style="font-size:11px;margin-top:10px;line-height:1.45" translate="no">${L2('„Wspomniany coin” = tweet podaje adres kontraktu albo jednoznaczny $ticker. „Powiązany coin” = tweet nie podaje coina, ale do godziny po nim wystartował coin Solana/BSC o tej nazwie z prawdziwym handlem (bierzemy ten z największym wolumenem). „Pompuje po tweecie” = cena +30% od tweeta (albo od startu) lub wolumen po tweecie ≥3× godziny przed nim. Nie porada finansowa — wejście po tweecie bywa późne.', '“Mentioned coin” = the tweet gives a contract address or an unambiguous $ticker. “Related coin” = the tweet names no coin, but within an hour a Solana/BSC coin with that name launched and really trades (we take the one with the most volume). “Pumping after tweet” = price +30% since the tweet (or launch) or volume after it ≥3× the hour before. Not financial advice — buying after a tweet is often late.')}</div>
      <div class="foot">${L2('Źródło tweetów: publiczne API FxTwitter (lustro X) · ceny: DexScreener / GeckoTerminal', 'Tweet source: public FxTwitter API (X mirror) · prices: DexScreener / GeckoTerminal')}</div>`;
    body.querySelectorAll('[data-twf]').forEach((b) => b.addEventListener('click', () => { twFilter = b.dataset.twf; keepUi(() => renderTweets()); }));
    for (const t of all) twSeen.add(String(t.id));
    refreshViralCoins(body).catch(() => {});
  }
  async function renderViral() {
    document.body.classList.remove('pulse-on');
    const body = $('#viralBody');
    if (!viral) {
      body.innerHTML = `<div class="loading"><div class="spin"></div>Ładuję Viral z X…</div>`;
      await loadViral();
    }
    const topics = viral.topics || [];
    const topicById = Object.fromEntries(topics.map((t) => [t.id, t]));
    // v8.3 quality pass: drop no-coin posts with low reach, very old items, and items whose coins already dumped
    const ageHof = (at) => (Date.now() - new Date(at).getTime()) / 3.6e6;
    const dumped = (coins, at) => {
      if (!coins.length || !(ageHof(at) >= 12)) return false;
      return coins.every((c) => { const L0 = liveCoin[snapCoinKey(c)]; return L0 && ((L0.change24 != null && L0.change24 <= -50) || (L0.liq != null && L0.liq < 3000)); });
    };
    const postCoins = (p) => { const t = p.topic_id && topicById[p.topic_id]; const kind = p.coin_match || ((t && (t.coins || []).length) ? 'speculative' : 'none'); return { kind, coins: kind === 'named' ? p.coins || [] : kind === 'speculative' ? (p.spec_coins && p.spec_coins.length ? p.spec_coins : (t && t.coins) || []).slice(0, 3) : [] }; };
    const qDrop = { posts: 0, traders: 0 };
    const posts = (viral.posts || []).filter((p) => {
      const at = p.posted_at || p.created_at, views = (p.metrics && p.metrics.views) || 0, { kind, coins } = postCoins(p);
      const ok = ageHof(at) <= 72 && (kind === 'named' ? !dumped(coins, at) : kind === 'speculative' ? views >= 300000 && !dumped(coins, at) : views >= 1000000);
      if (!ok) qDrop.posts++;
      return ok;
    }).sort((a, b) => (postCoins(b).kind === 'named') - (postCoins(a).kind === 'named') || ((b.metrics && (b.metrics.views || b.metrics.likes)) || 0) - ((a.metrics && (a.metrics.views || a.metrics.likes)) || 0));
    const tweets = (viral.trader_tweets || []).filter((t) => { const at = t.posted_at || t.created_at; const ok = ageHof(at) <= 7 * 24 && !dumped(t.coins || [], at); if (!ok) qDrop.traders++; return ok; })
      .sort((a, b) => new Date(b.posted_at || b.created_at) - new Date(a.posted_at || a.created_at));
    const qNote = (n) => (n ? `<div class="qhide mut" translate="no">✨ ${window.KyvoI18n && window.KyvoI18n.isEn() ? `Hidden ${n} low-signal items (no coin and low reach, too old, or the coin already dumped).` : `Ukryto ${n} słabych pozycji (bez coina i mały zasięg, za stare albo coin już spadł).`}</div>` : '');
    const tabs = [['topics', 'Tematy → coiny', topics.length], ['traders', 'Tweety traderów', tweets.length], ['posts', 'Ważne posty', posts.length]];
    if (!tabs.some((t) => t[0] === viralTab)) viralTab = 'topics';
    body.innerHTML = `
      <div class="h">Viral z X <span class="badge live" id="viralStamp">aktualizacja: ${esc(stampLabel(viral.updated_at))}</span></div>
      <div class="sub">Prawdziwe posty z X, odświeżane kilka razy dziennie (nie na żywo) · ceny coinów na żywo z DexScreener</div>
      ${staleHtml(viral.updated_at, 12, 'dane z X')}
      <a class="card" href="#tweets" style="display:block;font-size:13px;text-decoration:none" translate="no">🐦 <b>New Tweet</b> — ${window.KyvoI18n && window.KyvoI18n.isEn() ? 'fresh tweets about coins from traders, KOLs and celebrities (updated every ~5–15 min)' : 'świeże tweety o coinach od traderów, KOL-i i celebrytów (co ~5–15 min)'} →</a>
      <div class="vtabs" role="tablist">${tabs.map(([id, lb, n]) => `<button type="button" role="tab" data-vt="${id}" class="${id === viralTab ? 'on' : ''}">${lb} <span class="vcount">${n}</span></button>`).join('')}</div>
      <div id="vPane"></div>
      <div class="mut" style="font-size:11px;margin-top:10px;line-height:1.45">Pokazujemy tylko coiny, które naprawdę istnieją na DexScreener (adres z tweeta albo jednoznaczny $ticker z płynnością i wolumenem). Ten sam ticker może mieć kopie — zawsze sprawdź adres. To nie jest porada finansowa.</div>`;
    const pane = $('#vPane');
    const draw = () => {
      sinceReg = [];
      if (viralTab === 'topics') {
        const postByUrl = Object.fromEntries(posts.map((p) => [p.url, p]));
        pane.innerHTML = topics.length ? MOM_HELP + topics.map((t) => {
          const src = t.source_post && postByUrl[t.source_post];
          const named = src && src.coin_match === 'named';
          const coins = named ? src.coins || [] : (t.coins || []).slice(0, 3);
          const at = (src && (src.posted_at || src.created_at)) || t.source_posted_at;
          return `<div class="card vtopic" data-topic="${esc(t.id)}">
            <div class="vtopic-h"><b>${esc(vl(t, 'label'))}</b>${t.source_post ? `<a href="${esc(t.source_post)}" target="_blank" rel="noopener noreferrer" class="vx">𝕏 źródło ↗</a>` : ''}</div>
            <div class="mut vwhy">${esc(vl(t, 'why') || '')}</div>
            ${src ? `<div class="tm-src">${esc(src.author_name)} <span class="mut">@${esc(src.handle)}</span></div>${tweetMetaHtml(src)}` : at ? tweetMetaHtml({ created_at: at }) : ''}
            ${coins.length ? matchChipHtml(named ? 'named' : 'speculative') : ''}
            <div class="vcoins">${coins.length ? coins.map((c) => vCoinHtml(c) + (at ? sinceSlot(c, at, !named) : '')).join('') : '<div class="mut vlive" style="font-size:12px;padding:6px 0">Szukam coinów na żywo…</div>'}</div>
          </div>`;
        }).join('') : '<div class="empty">Brak tematów w ostatniej aktualizacji.</div>';
        // topics without snapshot coins: live fuzzy match (existing engine)
        topics.filter((t) => !(t.coins || []).length).forEach(async (t) => {
          let m = [];
          try { m = await matchTopicToCoins(t); } catch (e) {}
          const box = pane.querySelector(`.vtopic[data-topic="${CSS.escape(t.id)}"] .vcoins`);
          if (!box) return;
          box.innerHTML = m.length
            ? m.slice(0, 4).map(({ c }) => vCoinHtml({ chain: c.chainId, address: c.address, symbol: c.symbol, name: c.name, image: c.image, mcap: c.mcap, change_h24: c.change && c.change.h24, kyvo: true })).join('')
            : '<div class="mut" style="font-size:12px;padding:6px 0">Brak pasującego coina z płynnością</div>';
        });
      } else if (viralTab === 'traders') {
        pane.innerHTML = tweets.length ? tweets.map((t, ti) => {
          const m = t.metrics || {};
          const prof = t.wallet_id ? `<a class="vbtn" href="#trader/${encodeURIComponent(t.wallet_id)}">Profil w Rankingu</a>` : '';
          return `<div class="card post vtweet">
            <div class="meta">${imgTag(t.avatar, 'av', 36)}
              <div style="flex:1;min-width:0"><b style="font-size:13.5px">${esc(t.author_name)} <span class="mut">@${esc(t.handle)}</span> ${roleBadge(t.role)}</b>
              ${t.is_reply ? '<div class="mut" style="font-size:11px">odpowiedź</div>' : ''}</div>
              <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" class="vx" aria-label="Otwórz na X">𝕏</a></div>
            ${tweetMetaHtml(t)}
            <div class="txt vq${String(t.text || '').length > 190 ? ' long' : ''}">${tweetText(t.text)}</div>
            ${(t.coins || []).length ? matchChipHtml('named') : ''}
            <div class="vcoins vcoins-t">${(t.coins || []).map((c) => vCoinHtml(c) + sinceSlot(c, t.posted_at || t.created_at, false)).join('')}</div>
            <div class="vfoot"><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">Tweet na X ↗</a>${prof}</div>
          </div>`;
        }).join('') : '<div class="empty">W tym snapshocie nikt ze śledzonych traderów nie wspomniał coina, który da się jednoznacznie znaleźć.</div>';
        pane.insertAdjacentHTML('afterbegin', MOM_HELP + qNote(qDrop.traders) + `<div class="mut" style="font-size:11.5px;margin:0 2px 8px">Śledzimy ${esc(String((viral.tracked_accounts || []).length || 17))} publicznych kont (traderzy z Rankingu + znani KOL-e). Z tweeta wyciągamy adres kontraktu albo $ticker i od razu pokazujemy coin.</div>`);
      } else {
        pane.innerHTML = MOM_HELP + qNote(qDrop.posts) + (posts.length ? '' : `<div class="empty">${window.KyvoI18n && window.KyvoI18n.isEn() ? 'No high-signal posts right now.' : 'Teraz brak mocnych postów.'}</div>`) + posts.map((p) => {
          const t = p.topic_id && topicById[p.topic_id];
          const kind = p.coin_match || ((t && (t.coins || []).length) ? 'speculative' : 'none');
          const coins = kind === 'named' ? p.coins || [] : kind === 'speculative' ? (p.spec_coins && p.spec_coins.length ? p.spec_coins : (t && t.coins) || []).slice(0, 3) : [];
          const at = p.posted_at || p.created_at;
          return `<div class="card post">
            <div class="meta">${imgTag(p.avatar, 'av', 36)}
              <div style="flex:1;min-width:0"><b style="font-size:13.5px">${esc(p.author_name)} <span class="mut">@${esc(p.handle)}</span></b></div>
              <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="vx">𝕏</a></div>
            ${tweetMetaHtml(p)}
            <div class="txt">${tweetText(p.text)}</div>
            ${coins.length ? `${matchChipHtml(kind)}${t && kind === 'speculative' ? `<div class="vsub">Coiny do tematu „${esc(vl(t, 'label'))}”</div>` : ''}<div class="vcoins">${coins.map((c) => vCoinHtml(c, { size: 28 }) + sinceSlot(c, at, kind !== 'named')).join('')}</div>` : '<div class="mut" style="font-size:12px;margin-top:6px">Tweet nie podaje coina i nie znaleźliśmy pasującego coina z płynnością.</div>'}
            <div style="margin-top:8px"><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px">Oryginał na X ↗</a></div>
          </div>`;
        }).join('');
      }
    };
    body.querySelectorAll('.vtabs [data-vt]').forEach((b) => (b.onclick = () => {
      viralTab = b.dataset.vt; localStorage.setItem('kyvo_viral_tab', viralTab);
      body.querySelectorAll('.vtabs [data-vt]').forEach((x) => x.classList.toggle('on', x === b));
      draw(); refreshViralCoins(pane).then(sinceFill);
    }));
    const sinceFill = () => { if (window.KyvoInsights) window.KyvoInsights.fillTweetSince(pane, sinceResolve, liveCoin); };
    draw();
    refreshViralCoins(pane).then(() => {
      if (!pane.isConnected) return;
      if (!renderViral.liveDone) { renderViral.liveDone = true; renderViral(); return; } // re-filter with live prices (dumped coins)
      sinceFill();
    });
  }

  /* ---------------- Ranking (Kolscan-style) + trader profile ---------------- */
  let rankPeriod = localStorage.getItem('kyvo_rank_period') || '7d';
  let rankSrc = localStorage.getItem('kyvo_rank_src') || 'all';   // v8.14: all | kolscan | pumpfun
  const srcsOf = (x) => x.sources || ['kolscan'];
  // v8.14: PnL per source — kolscan = realized; pump.fun = realized + unrealized (pump.fun PnL leaderboard); all = kolscan, else pump.fun
  function pnlSrc(L, per, src) {
    const pf = L && L.pf && L.pf.pnl_usd && L.pf.pnl_usd[per];
    const pv = pf == null || !isFinite(pf) ? null : pf;
    if (src === 'pumpfun') return { v: pv, k: 'pf' };
    const kv = pnlOf(L, per);
    if (src === 'kolscan' || kv != null) return { v: kv, k: 'ks' };
    return { v: pv, k: pv == null ? 'ks' : 'pf' };
  }
  function pnlOf(L, per) {
    const v = L && L.stats && L.stats[per] && L.stats[per].realized_pnl_usd;
    return v == null || !isFinite(v) ? null : v;
  }
  function pnlHtml(v, tip) {
    if (v == null) return `<span class="mut" title="${esc(tip || 'Brak sprzedaży z dopasowanym kosztem zakupu w tym okresie')}">—</span>`;
    return `<b class="${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '+' : ''}${fmtUsd(v)}</b>`;
  }
  function avatarHtml(L, size) {
    size = size || 34;
    return L.avatar
      ? `<img class="av" src="${esc(L.avatar)}" width="${size}" height="${size}" style="width:${size}px;height:${size}px" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="av avl" style="width:${size}px;height:${size}px">${esc((L.name || '?')[0].toUpperCase())}</div>`;
  }
  function sortedLeaders(per, src) {
    src = src || 'all';
    const leaders = ((leaderboard && leaderboard.leaders) || []).filter((x) => src === 'all' || srcsOf(x).includes(src));
    const P = (x, p) => pnlSrc(x, p, src).v;
    leaders.sort((a, b) => {
      const pa = P(a, per), pb = P(b, per);
      if (pa == null && pb == null) { const b30 = P(b, '30d'), a30 = P(a, '30d'); return (b30 == null ? -1e18 : b30) - (a30 == null ? -1e18 : a30); }
      if (pa == null) return 1;
      if (pb == null) return -1;
      return pb - pa;
    });
    return leaders;
  }
  function mvHtml(x, per) {
    // v8.4: rank change vs the previous daily refresh (▲ up / ▼ down / NEW)
    const r = x.rank && x.rank[per], p = x.rank_prev && x.rank_prev[per];
    if (!r || !leaderboard.prev_at) return '';
    if (!p) return '<span class="rk-mv new" title="Nowy w top 50">NEW</span>';
    if (p === r) return '';
    return p > r ? `<span class="rk-mv up" title="Awans">▲${p - r}</span>` : `<span class="rk-mv dn" title="Spadek">▼${r - p}</span>`;
  }
  function renderRank() {
    const L2 = (pl, e) => (window.KyvoI18n && window.KyvoI18n.isEn() ? e : pl);
    document.body.classList.remove('pulse-on');
    const body = $('#rankBody');
    if (!leaderboard || !(leaderboard.leaders || []).length) {
      body.innerHTML = `<div class="h">Ranking</div><div class="empty">Ranking jest chwilowo niedostępny — spróbuj za kilka minut.<div style="margin-top:8px"><button class="pill" id="rankRetry">Spróbuj ponownie</button></div></div>`;
      const rb = $('#rankRetry'); if (rb) rb.onclick = () => loadLeaderboard().then(renderRank);
      return;
    }
    const per = rankPeriod;
    // v8.3 quality pass: traders without a trade in the last 7 days go to a collapsed "inactive" section
    const lastT = (x) => Math.max(0, ...((x.recent_trades || []).map((t) => +t.t || 0)));
    const isActive = (x) => x.active === true || (x.active !== false && Date.now() / 1000 - lastT(x) < 7 * 86400);
    const src = ['all', 'kolscan', 'pumpfun'].includes(rankSrc) ? rankSrc : 'all';
    const ALL = sortedLeaders(per, src);
    const L = ALL.filter(isActive), INACT = ALL.filter((x) => !isActive(x));
    const withPnl = L.filter((x) => pnlSrc(x, per, src).v != null).length;
    const nSrc = (k) => ((leaderboard.leaders || []).filter((x) => k === 'all' || srcsOf(x).includes(k)).length);
    const TR = window.KyvoTracker;
    const rowOf = (x, i) => {
      const st = (x.stats && x.stats[per]) || {};
      const P = pnlSrc(x, per, src);
      const pos = x.pf && x.pf.positions && x.pf.positions[per];
      const wr = st.win_rate == null ? '—' : Math.round(st.win_rate * 100) + '%';
      const wl = st.trades ? `<span class="up">${st.wins}</span>/<span class="dn">${st.trades - st.wins}</span>` : '<span class="mut">—</span>';
      const sb = srcsOf(x).map((k) => (k === 'pumpfun' ? `<a class="srcb pf" href="${esc((x.profiles && x.profiles.pumpfun) || 'https://pump.fun/profile/' + x.address)}" target="_blank" rel="noopener" data-noop="1">pump.fun</a>` : k === 'kolscan' ? `<a class="srcb ks" href="${esc((x.profiles && x.profiles.kolscan) || 'https://kolscan.io/account/' + x.address)}" target="_blank" rel="noopener" data-noop="1">kolscan</a>` : '')).join('');
      const tr = st.trades || (P.k === 'pf' && pos ? `<span title="Pozycje na pump.fun">${pos}</span>` : 0);
      return `<div class="rk-row" data-trader="${esc(x.id)}" role="button" tabindex="0">
        <div class="rk-n ${i < 3 && P.v != null ? 'top' + (i + 1) : ''}">${i + 1}</div>${src === 'pumpfun' ? '' : mvHtml(x, per)}
        ${avatarHtml(x, 34)}
        <div class="rk-nm"><b>${esc(x.name)}${x.pf && x.pf.verified ? ' <span class="rk-ver" title="Zweryfikowany na pump.fun">✓</span>' : ''}</b><small><span class="rk-badges">${sb}</span> ${x.handle ? '@' + esc(x.handle) : `<span class="mut">${esc(shortCa(x.address))}</span>`}</small></div>
        <div class="rk-c rk-wl" title="Wygrane / przegrane (zamknięte pozycje)">${wl}</div>
        <div class="rk-c rk-wr" title="Win rate">${wr}</div>
        <div class="rk-c rk-tr" title="Zamknięte trade'y">${tr}</div>
        <div class="rk-c rk-pnl" title="${P.k === 'pf' ? 'PnL pump.fun: zrealizowany + niezrealizowany' : 'PnL zrealizowany (kolscan)'}">${pnlHtml(P.v, st.note)}${P.v != null && P.k === 'pf' && src !== 'pumpfun' ? '<small class="rk-pk">pump.fun</small>' : ''}</div>
        ${TR && TR.enabled() ? TR.btnHtml({ address: x.address, name: x.name, img: x.avatar, src: srcsOf(x)[0] }, 'rk') : ''}
        ${x.handle ? `<a class="rk-x" href="${esc(x.x_url || 'https://x.com/' + x.handle)}" target="_blank" rel="noopener" title="Obserwuj na X" data-noop="1">𝕏</a>` : '<span class="rk-x off"></span>'}
      </div>`;
    };
    const rows = L.map(rowOf).join('');
    const inactHtml = INACT.length ? `<details class="card rk" style="margin-top:8px"><summary class="mut" style="font-size:12px;padding:6px 4px;cursor:pointer">Nieaktywni (brak transakcji od 7 dni): ${INACT.length}</summary>${INACT.map((x, i) => rowOf(x, L.length + i)).join('')}</details>` : '';
    body.innerHTML = `
      ${rankSegHtml('rank')}
      <div class="h">Ranking traderów <span class="badge live">on-chain</span></div>
      ${leaderboard.version >= 2
        ? `<div class="sub"><span>Zaktualizowano:</span> <b>${esc(new Date(leaderboard.updated_at).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</b> · <span>Odświeżane automatycznie co 6 godzin</span> · <span>Solana, źródło:</span> <a href="${esc(leaderboard.source_url || 'https://kolscan.io/leaderboard')}" target="_blank" rel="noopener">kolscan.io</a></div>`
        : `<div class="sub">Zrealizowany PnL z publicznych transakcji Solany · aktualizacja: ${esc(stampLabel(leaderboard.updated_at))} · PnL dla ${withPnl}/${L.length} aktywnych portfeli w tym okresie</div>`}
      ${leaderboard._offline ? '<div class="card" style="font-size:12px;color:var(--warn)">Brak połączenia z danymi rankingu — pokazuję ostatnio zapisany ranking.</div>' : ''}
      ${staleHtml(leaderboard.updated_at, 36, 'dane rankingu')}
      <div class="rk-per" id="rankPer">${['1d', '7d', '30d'].map((p) => `<button type="button" data-per="${p}" class="${p === per ? 'on' : ''}">${p === '1d' ? 'Dzień' : p === '7d' ? 'Tydzień' : 'Miesiąc'}</button>`).join('')}</div>
      <div class="rk-src" id="rankSrc">${[['all', L2('Wszystkie', 'All')], ['kolscan', 'kolscan'], ['pumpfun', 'pump.fun']].map(([k, n]) => `<button type="button" data-src="${k}" class="${k === src ? 'on' : ''}">${n} <span class="mut">${nSrc(k)}</span></button>`).join('')}</div>
      <div class="card rk">
        <div class="rk-row rk-head"><div class="rk-n">#</div><div style="width:34px"></div><div class="rk-nm">Trader</div><div class="rk-c rk-wl">W/L</div><div class="rk-c rk-wr">Win</div><div class="rk-c rk-tr">${src === 'pumpfun' ? L2('Poz.', 'Pos.') : "Trade'y"}</div><div class="rk-c rk-pnl">${src === 'pumpfun' ? 'PnL total' : 'PnL'}</div>${TR && TR.enabled() ? '<span class="trk-f rk ph"></span>' : ''}<span class="rk-x off"></span></div>
        ${rows}
      </div>
      ${inactHtml}
      ${leaderboard.version >= 2
        ? `<div class="mut" style="font-size:11px;margin:6px 2px;line-height:1.45" translate="no">${L2('Top 50 traderów Solany w każdym okresie (Dzień / Tydzień / Miesiąc) z publicznych rankingów kolscan.io i pump.fun, połączonych po adresie portfela. kolscan = PnL zrealizowany; pump.fun = PnL total (zrealizowany + niezrealizowany), W/L i win rate tylko z kolscan. „—” = poza top 50 w tym okresie. Zysk w SOL przeliczony na $ po bieżącym kursie. Axiom, GMGN, Photon, BullX, Padre i FOMO nie udostępniają publicznych rankingów bez logowania — pominięte. 👀 = obserwuj w Trackerze. BSC i Robinhood Chain: brak darmowego publicznego rankingu, dodamy gdy będzie źródło. Wyniki przybliżone · to nie jest porada finansowa.', "Top 50 Solana traders in each period (Day / Week / Month) from the public kolscan.io and pump.fun leaderboards, merged by wallet address. kolscan = realized PnL; pump.fun = total PnL (realized + unrealized), W/L and win rate from kolscan only. „—” = outside the top 50 in this period. SOL profit converted to $ at the current rate. Axiom, GMGN, Photon, BullX, Padre and FOMO don't publish public leaderboards without login — skipped. 👀 = follow in the Tracker. BSC and Robinhood Chain: no free public leaderboard, we'll add one when a source exists. Approximate results · not financial advice.")}</div>`
        : '<div class="mut" style="font-size:11px;margin:6px 2px;line-height:1.45">„—” = brak sprzedaży z dopasowanym zakupem w tym okresie (np. kupił wcześniej niż obejmuje nasze okno). Kwoty w SOL przeliczane po historycznym kursie SOL/USD. Wyniki przybliżone · to nie jest porada finansowa.</div>'}`;
    wireRankSeg(body);
    $$('#rankSrc [data-src]').forEach((b) => b.addEventListener('click', () => {
      rankSrc = b.dataset.src;
      localStorage.setItem('kyvo_rank_src', rankSrc);
      renderRank();
    }));
    $$('#rankPer [data-per]').forEach((b) => b.addEventListener('click', () => {
      rankPeriod = b.dataset.per;
      localStorage.setItem('kyvo_rank_period', rankPeriod);
      renderRank();
    }));
    $$('[data-trader]', body).forEach((el) => {
      const go = (e) => {
        if (e.target.closest('[data-noop]')) return;
        location.hash = 'trader/' + encodeURIComponent(el.dataset.trader);
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(e); });
    });
  }

  // v8.14: "🏆 Ranking | 👀 Tracker" segment (Tracker lives under the Ranking tab — the 7-slot bottom bar stays as is)
  function rankSegHtml(on) {
    if (!(window.KyvoTracker && window.KyvoTracker.enabled())) return '';
    const n = window.KyvoTracker.list().length;
    return `<div class="rk-seg" role="tablist"><button type="button" data-rseg="rank" class="${on === 'rank' ? 'on' : ''}">🏆 Ranking</button><button type="button" data-rseg="tracker" class="${on === 'tracker' ? 'on' : ''}">👀 Tracker${n ? ` <span class="rk-segn">${n}</span>` : ''}</button></div>`;
  }
  function wireRankSeg(root) {
    root.querySelectorAll('[data-rseg]').forEach((b) => (b.onclick = () => { if (!b.classList.contains('on')) setView(b.dataset.rseg); }));
  }

  function renderTrader(id) {
    document.body.classList.remove('pulse-on');
    const body = $('#traderBody');
    const L = ((leaderboard && leaderboard.leaders) || []).find((x) => x.id === id || x.address === id);
    if (!L) {
      body.innerHTML = `<div class="err">Nie znaleziono tradera.<div class="back" id="trBackF">‹ Ranking</div></div>`;
      $('#trBackF').onclick = () => setView('rank');
      return;
    }
    window.KyvoProfile.renderTrader(body, L, leaderboard);
  }

  // v8.15 pass 8: menu tiles get line-SVG icons instead of emoji (text stays as-is so i18n keys still match)
  const mtile = (href, ic, t, d, hl) => `<a class="more-tile${hl ? ' hl' : ''}" href="${href}"><i class="mti">${(window.KyvoIcons && window.KyvoIcons[ic]) || ''}</i><b>${t}</b><small>${d}</small></a>`;
  function renderProfil() {
    document.body.classList.remove('pulse-on');
    if (window.KyvoAuth) window.KyvoAuth.renderBar($('#profilTop'));
    window.KyvoProfile.renderOwn($('#profilBody'));
    $('#profilLinks').innerHTML = `<div class="more-grid" style="margin-top:6px">
        ${mtile('#premium', 'gem', 'Kyvo Premium', 'Cena startowa -50% · wkrótce', true)}
        ${mtile('#journal', 'j_log', 'Journal', 'Twój dziennik tradingu')}
        ${mtile('#help', 'book', 'Jak korzystać', 'FAQ i wprowadzenie')}
        ${mtile('#more', 'sliders', 'Więcej', 'Ustawienia, regulamin, prywatność')}
        ${mtile('#kontakt', 'users', 'Kontakt', 'Discord')}
      </div>
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px"><b style="font-size:13px">Język / Language</b>${window.KyvoI18n ? window.KyvoI18n.toggleHtml() : ''}</div>`;
  }
  window.__kyvoRerenderProfil = () => { if (view === 'profil') renderProfil(); };
  window.__kyvoToast = toast;

  function renderMore() {
    document.body.classList.remove('pulse-on');
    const S = window.KyvoAuth && window.KyvoAuth.session();
    const tile = (href, t, d, hl) => `<a class="more-tile${hl ? ' hl' : ''}" href="${href}"><b>${t}</b><small>${d}</small></a>`;
    $('#moreBody').innerHTML = `
      <div class="h">Więcej</div>
      <div class="more-grid">
        ${mtile('#premium', 'gem', 'Kyvo Premium', 'Premium i Runners · cena startowa -50%', true)}
        <a class="more-tile hl" href="#runner2"><i class="mti" style="font-size:16px;font-style:normal">🚀</i><b>Runner 2.0</b><small>Ostrzejszy Runner: coin ≥ 1 h, bez przegrzania · % od wejścia · ½ na x2 + trailing</small></a>
        <a class="more-tile hl" href="#gta"><i class="mti" style="font-size:16px;font-style:normal">🎮</i><b>GTA 6</b><small>Nowe GTA coiny, te co rosną, runnery i tweety Rockstar — za darmo</small></a>
        ${mtile('#login', S ? 'users' : 'lock', S ? 'Konto' : 'Zaloguj się', S ? 'Jesteś zalogowany' : 'Portfel lub Google — albo bez logowania')}
        ${mtile('#help', 'book', 'Jak korzystać', 'Zakładki, filtry, PnL, FAQ')}
        ${mtile('#watch', 'star', 'Watchlista i alerty', 'Obserwowane coiny, alerty MC i % (gdy Kyvo jest otwarte)')}
        ${mtile('#journal', 'j_log', 'Journal', 'Dziennik transakcji, wyniki, analiza i coach — Premium')}
        ${mtile('#rank', 'rank', 'Ranking traderów', 'PnL i win rate publicznych portfeli')}
        ${mtile('#kontakt', 'users', 'Kontakt', 'Discord — pogadaj, pomóż, współpracuj')}
        ${mtile('#legal/ryzyko', 'shield_alert', 'Ryzyko', 'Przeczytaj, zanim cokolwiek kupisz')}
      </div>
      <div class="card" style="padding:4px 12px">
        <div class="lg-links" style="margin:10px 0">
          <a href="#legal/regulamin">Regulamin</a><a href="#legal/prywatnosc">Polityka prywatności</a><a href="#legal/zrodla">Źródła danych i licencje</a>
        </div>
      </div>
      <div class="card">
        <div class="h" style="font-size:13px;margin:0 0 6px">Język / Language</div>
        ${window.KyvoI18n ? window.KyvoI18n.toggleHtml('lang-big') : ''}
      </div>
      ${window.KyvoNotify ? window.KyvoNotify.settingsHtml() : ''}
      <div class="card">
        <div class="h" style="font-size:13px;margin:0 0 6px">Ustawienia</div>
        <div class="pf-actions" style="margin-top:0">
          <button type="button" class="pf-btn" id="moreTour">▶ Pokaż wprowadzenie</button>
          <button type="button" class="pf-btn" id="moreClear">🗑 Wyczyść dane Kyvo</button>
        </div>
        <div class="mut" style="font-size:11.5px;margin-top:8px;line-height:1.45">Wszystkie Twoje dane (portfele, nick, filtry, sesja) są tylko w tej przeglądarce. „Wyczyść dane Kyvo” usuwa je całkowicie.</div>
      </div>
      <div class="card"><div class="h" style="font-size:13px;margin:0 0 4px">O Kyvo</div>
        <div style="font-size:13px;color:#ccc;line-height:1.5">Kyvo — smart money i viralowe memecoiny w jednym miejscu. Live Pulse dla Solany, BSC i Robinhood Chain, wykresy od 1s, ranking traderów on-chain, Viral z X i Twój Profil z PnL. Ranking i smart money odświeżamy kilka razy dziennie z publicznych danych blockchain, Viral z X — kilka razy dziennie.</div></div>`;
    if (window.KyvoNotify) window.KyvoNotify.wireSettings($('#moreBody'), () => renderMore());
    $('#moreTour').onclick = () => window.KyvoLaunch && window.KyvoLaunch.openOnboard();
    $('#moreClear').onclick = async () => { if (window.KyvoLaunch && (await window.KyvoLaunch.clearData())) { toast('Dane Kyvo usunięte'); setTimeout(() => location.reload(), 600); } };
  }

  function renderPage(kind, arg) {
    document.body.classList.remove('pulse-on');
    const L = window.KyvoLaunch, A = window.KyvoAuth;
    const ctx = { home: () => setView('pulse') };
    document.body.classList.toggle('chrome-off', kind === 'login');
    if (kind === 'help') L.renderHelp($('#helpBody'), ctx);
    else if (kind === 'legal') L.renderLegal($('#legalBody'), arg, ctx);
    else if (kind === 'premium') L.renderPremium($('#premiumBody'), ctx);
    else if (kind === 'kontakt') L.renderContact($('#kontaktBody'), ctx);
    else if (kind === 'login') A.renderLogin($('#loginBody'), {
      onDone: () => setView('profil'),
      onGuest: () => { document.body.classList.remove('chrome-off'); setView('pulse'); },
    });
    window.scrollTo(0, 0);
  }

  function show(which) {
    $$('.scr').forEach((s) => s.classList.remove('on'));
    const map = {
      pulse: 's-list', hot: 's-list', good: 's-list', new: 's-list', stretch: 's-list',
      migrated: 's-list', boosted: 's-list', search: 's-list', runner: 's-list', runner2: 's-list', track: 's-list', viral: 's-viral', tweets: 's-tweets', more: 's-more', coin: 's-coin',
      rank: 's-rank', trader: 's-trader', tracker: 's-tracker', journal: 's-journal', profil: 's-profil', watch: 's-watch', gold: 's-gold', gta: 's-gta',
      help: 's-help', legal: 's-legal', login: 's-login', premium: 's-premium', kontakt: 's-kontakt',
    };
    if (which !== 'login') document.body.classList.remove('chrome-off');
    $('#' + (map[which] || 's-list')).classList.add('on');
    $$('#seg button').forEach((b) => b.classList.toggle('on', b.dataset.view === (which === 'coin' ? view : which === 'trader' || which === 'tracker' ? 'rank' : which === 'search' ? 'hot' : which)));
    if (which === 'gta') { const gb = document.querySelector('#seg button[data-view="gta"]'); try { if (gb) gb.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} }   // v8.30: the 🎮 GTA 6 button sits off-screen on a phone
    const tabMap = { gold: 'gold', runner: 'runner', runner2: 'runner', gta: 'hot', track: 'hot', pulse: 'hot', hot: 'hot', good: 'hot', new: 'hot', stretch: 'hot', migrated: 'hot', boosted: 'hot', search: 'search', viral: 'viral', tweets: 'viral', watch: 'hot', more: 'profil', rank: 'rank', trader: 'rank', tracker: 'rank', journal: 'profil', profil: 'profil', help: 'profil', legal: 'profil', login: 'profil', premium: 'profil', kontakt: 'profil' };
    $$('.tb button').forEach((b) => b.classList.toggle('on', b.dataset.tab === (tabMap[which] || 'hot')));
  }

  function setView(v, arg) {
    view = v; try { updatePulseHero(); } catch (e) {} // v8.14.1 chrome hero on Pulse
    if (['help', 'legal', 'login', 'premium', 'kontakt'].includes(v)) {
      view = v;
      show(v);
      renderFilterPanel('more');
      renderPage(v, arg);
      const h = v === 'legal' ? 'legal/' + (arg || 'regulamin') : v;
      if (location.hash !== '#' + h) history.replaceState(null, '', '#' + h);
      return;
    }
    view = v;
    if (v === 'viral') {
      show('viral');
      renderFilterPanel('viral');
      renderViral();
      location.hash = 'viral';
      return;
    }
    if (v === 'tweets') {
      show('tweets');
      renderFilterPanel('viral');
      renderTweets();
      location.hash = 'tweets';
      return;
    }
    if (v === 'gold') {   // v8.12 🥇 Gold (gold.js)
      show('gold');
      renderFilterPanel('more');
      loadLive().catch(() => {}); loadKolLive().catch(() => {});
      if (window.KyvoGold) window.KyvoGold.show($('#goldBody'), arg);
      if (location.hash !== '#gold') { if (arg) history.replaceState(null, '', '#gold'); else location.hash = 'gold'; }
      return;
    }
    if (v === 'gta') {   // v8.30 🎮 GTA 6 (gta.js) — free for everyone
      show('gta');
      renderFilterPanel('more');
      document.body.classList.remove('pulse-on');
      if (window.KyvoGta) window.KyvoGta.show();
      else $('#gtaBody').innerHTML = '<div class="empty">GTA 6 niedostępne.</div>';
      location.hash = 'gta';
      return;
    }
    if (v === 'profil') {
      show('profil');
      renderFilterPanel('more');
      renderProfil();
      location.hash = 'profil';
      return;
    }
    if (v === 'rank') {
      show('rank');
      renderFilterPanel('more');
      renderRank();
      location.hash = 'rank';
      return;
    }
    if (v === 'journal') {   // 📓 Journal (journal.js); arg = sub-route: dash|log|stats|coach|trade/<id>|add|edit/<id>
      show('journal');
      renderFilterPanel('more');
      if (!leaderboard) loadLeaderboard().catch(() => {});
      if (window.KyvoJournal) window.KyvoJournal.show($('#journalBody'), arg || '');
      else $('#journalBody').innerHTML = '<div class="empty">Journal niedostępny.</div>';
      const jh = 'journal' + (arg ? '/' + arg : '');
      if (location.hash.slice(1) !== jh) history.replaceState(null, '', '#' + jh);
      return;
    }
    if (v === 'tracker') {   // v8.14 👀 Tracker (tracker.js)
      show('tracker');
      renderFilterPanel('more');
      if (!leaderboard) loadLeaderboard().catch(() => {});
      if (window.KyvoTracker) window.KyvoTracker.show($('#trackerBody'));
      location.hash = 'tracker';
      return;
    }
    if (v === 'watch') {
      show('watch');
      renderFilterPanel('more');
      if (window.KyvoInsights) window.KyvoInsights.renderWatch($('#watchBody'));
      location.hash = 'watch';
      return;
    }
    if (v === 'more') {
      show('more');
      renderFilterPanel('more');
      renderMore();
      location.hash = 'more';
      return;
    }
    show(v);
    renderFilterPanel(v === 'search' ? 'hot' : v);

    if (v === 'pulse') {
      location.hash = 'pulse';
      if (isDesktopPulse()) renderPulseDesktop();
      else renderPulseMobile();
      return;
    }
    if (v === 'runner2') {   // v8.34 🚀 Runner 2.0
      renderRunner2();
      location.hash = 'runner2';
      return;
    }
    if (v === 'runner') {
      renderRunner();
      location.hash = 'runner';
      return;
    }
    if (v === 'track') {
      renderTrack();
      location.hash = 'track';
      return;
    }
    if (v === 'good') {
      const en = window.KyvoI18n && window.KyvoI18n.isEn();
      const smNote = goodSortSmart ? (en ? 'sort: smart money consensus' : 'sortowanie: konsensus smart money') : (en ? 'sort: popularity × upside' : 'sortowanie: popularność × potencjał');
      const gl = listGood();
      const fewNote = gl.length < 3 ? `<div class="card" style="font-size:12.5px;color:var(--warn)" translate="no">${en ? 'Few good setups right now' : 'Teraz mało dobrych setupów'} — ${en ? 'only coins that are popular right now, with a safe Kyvo Check, more buyers than sellers, healthy volume and a positive base estimate for 1h, 3h and 8h are shown. We don\u2019t fill the list with falling coins.' : 'pokazujemy tylko coiny popularne teraz, z bezpiecznym Kyvo Check, przewagą kupujących, zdrowym wolumenem i dodatnim szacunkiem bazowym na 1h, 3h i 8h. Nie dopychamy listy spadającymi coinami.'}</div>` : '';
      const pendNote = goodPending ? `<div class="mut" style="font-size:11.5px;margin:6px 2px" translate="no">⏳ ${en ? 'Checking contracts of ' + goodPending + ' more coins (RugCheck / GoPlus)…' : 'Sprawdzam kontrakty jeszcze ' + goodPending + ' coinów (RugCheck / GoPlus)…'}</div>` : '';
      renderList(gl, 'Good Coins', (en ? 'Hot now + chance to rise in 8h · ' : 'Popularne teraz + szansa na wzrost w 8h · ') + smNote, {
        filtTab: 'good',
        emptyHtml: `<div class="empty" translate="no">${goodPending ? (en ? 'Checking contracts — Good Coins will appear here in a moment.' : 'Sprawdzam kontrakty — Good Coins pojawią się tu za chwilę.') : (en ? 'Right now no coin passes all Kyvo checks (safety, popularity, upside). We re-check every 45 s and never pad the list with weak coins.' : 'Teraz żaden coin nie przechodzi wszystkich testów Kyvo (bezpieczeństwo, popularność, potencjał). Sprawdzamy ponownie co 45 s i nie dopychamy listy słabymi coinami.')}<div style="margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a class="pill" style="padding:8px 14px;font-size:12.5px" href="#new">${en ? 'See New Pairs' : 'Zobacz New Pairs'}</a><a class="pill" style="padding:8px 14px;font-size:12.5px" href="#runner">🏃 Runner</a></div></div>`,
        footnote: pendNote + (!gl.length || (goodPending && gl.length < 3) ? '' : fewNote) + `<div class="mut" style="font-size:11px;margin:6px 2px" translate="no">${en ? 'Good Coins = popular right now × chance to rise in 8h, after safety filters. This is not a forecast or financial advice — memecoins can go to zero.' : 'Good Coins = popularne teraz × szansa na wzrost w 8h, po filtrach bezpieczeństwa. To nie prognoza ani porada finansowa — memecoiny mogą spaść do zera.'}</div>` + `<div class="filtbar" style="margin:8px 0"><button type="button" class="fbtn ${goodSortSmart ? 'on' : ''}" id="goodSmartSort">🧠 Konsensus SM</button>
          <span class="mut" style="font-size:11px">Ile publicznie znanych portfeli kupiło w 72h (i ilu już sprzedało) · odświeżane kilka razy dziennie</span></div>`,
      });
      const btn = $('#goodSmartSort');
      if (btn) btn.onclick = () => { goodSortSmart = !goodSortSmart; setView('good'); };
      location.hash = 'good';
      return;
    }
    if (v === 'new') {
      renderList(listNew('new'), 'New Pairs', newTip(), { filtTab: 'new', rowOpts: { showDex: true }, footnote: qualityNote('new') });
      location.hash = 'new';
      return;
    }
    if (v === 'stretch') {
      if (!chainSupportsStretch(activeChain)) {
        renderList([], 'Final Stretch', 'Niedostępne', { filtTab: 'stretch', hideNote: chainNote(activeChain) });
      } else {
        renderList(listStretch('stretch'), 'Final Stretch', stretchTip(), {
          filtTab: 'stretch',
          rowOpts: { showCurve: true },
          footnote: qualityNote('stretch') + '<div class="mut" style="font-size:11px;margin:6px 2px" translate="no">' + (window.KyvoI18n && window.KyvoI18n.isEn() ? '* Curve % is a Kyvo estimate' : '* Procent krzywej to estymacja Kyvo') + '</div>',
        });
      }
      location.hash = 'stretch';
      return;
    }
    if (v === 'migrated') {
      if (!chainSupportsMigrated(activeChain)) {
        renderList([], 'Migrated', 'Niedostępne', { filtTab: 'migrated', hideNote: chainNote(activeChain) });
      } else {
        renderList(listMigrated('migrated'), 'Migrated', migrTip(), { filtTab: 'migrated', topHtml: migSortHtml(), rowOpts: { showDex: true }, footnote: qualityNote('migrated') });
      }
      location.hash = 'migrated';
      return;
    }
    if (v === 'boosted') {
      renderList(qualityFilter(listBoosted(), 'boosted'), 'Boosted', 'Płatne boosty na DexScreener (reklama, nie sygnał jakości)', { filtTab: 'boosted', footnote: qualityNote('boosted') });
      location.hash = 'boosted';
      return;
    }
    renderList(qualityFilter(listHot(), 'hot'), 'Hot · ' + (CHAIN_LABEL[activeChain] || ''), 'Nowe profile i boosty DexScreener · sortowanie po wolumenie 24h', { filtTab: 'hot', footnote: qualityNote('hot') });
    location.hash = 'hot';
  }

  async function runSearch(q) {
    view = 'search';
    show('search');
    renderFilterPanel('search');
    document.body.classList.remove('pulse-on');
    $('#pulseDesk').innerHTML = '';
    const body = $('#listBody');
    body.innerHTML = `<div class="loading"><div class="spin"></div>Szukam „${esc(q)}”…</div>`;
    location.hash = 'search/' + encodeURIComponent(q);
    const list = await searchDex(q);
    for (const c of list) byKey[keyOf(c)] = c;
    body.innerHTML = list.length
      ? `<div class="h">Wyniki <span class="badge live">LIVE</span> · ${esc(CHAIN_LABEL[activeChain])}</div>
         <div class="sub">Wyniki dla „${esc(q)}” (także literówki)</div>
         <div class="card" style="padding:4px 10px">${list.map((c) => coinRow(c)).join('')}</div>`
      : `<div class="empty">Nic nie znaleziono dla „${esc(q)}” (${esc(CHAIN_LABEL[activeChain])})</div>`;
    wireRows(body);
  }

  function routeFromHash() {
    const h = (location.hash || '#pulse').slice(1);
    let [a, b] = h.split('/');
    if (a === 'leaderboard') a = 'rank';
    if (a === 'coin' && b) {
      openCoin(decodeURIComponent(b));
      return;
    }
    if (a === 'gold') { setView('gold', b); return; }
    if (a === 'journal') { setView('journal', h.slice(8)); return; }   // 📓 Journal: keep the full sub-route (trade/<id>)
    if (a === 'trader' && b) {
      view = 'rank';
      show('trader');
      renderFilterPanel('more');
      renderTrader(decodeURIComponent(b));
      window.scrollTo(0, 0);
      return;
    }
    if (['help', 'legal', 'login', 'premium', 'kontakt'].includes(a)) {
      setView(a, b ? decodeURIComponent(b) : undefined);
      return;
    }
    if (a === 'search' && b) {
      $('#q').value = decodeURIComponent(b);
      runSearch(decodeURIComponent(b));
      return;
    }
    if (['pulse', 'hot', 'good', 'new', 'stretch', 'migrated', 'boosted', 'viral', 'tweets', 'more', 'rank', 'tracker', 'profil', 'watch', 'runner', 'runner2', 'track', 'gta'].includes(a)) {
      setView(a);
      return;
    }
    setView('pulse');
  }

  let lastImgFill = 0;
  /* v8.4 anti-glitch: one refresh at a time; a failed refresh keeps the last good data (no error box / ERR flash
     when coins are already on screen); auto re-render keeps scroll position and opened ▾ panels. */
  let refreshBusy = false, refreshFails = 0, refreshStart = 0;
  function keepUi(fn) {
    const y = window.scrollY;
    const open = new Set();
    document.querySelectorAll('#listBody details[open], #pulseDesk details[open]').forEach((d) => {
      const row = d.closest('[data-key]'); open.add((row ? row.getAttribute('data-key') : '') + '|' + (d.className || ''));
    });
    fn();
    if (open.size) document.querySelectorAll('#listBody details, #pulseDesk details').forEach((d) => {
      const row = d.closest('[data-key]'); if (open.has((row ? row.getAttribute('data-key') : '') + '|' + (d.className || ''))) d.open = true;
    });
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
  }
  async function refresh(manual) {
    if (refreshBusy && Date.now() - refreshStart < 90000) return;   // v8.33 watchdog: a refresh stuck > 90 s no longer blocks all later ones
    refreshBusy = true; refreshStart = Date.now();
    try { await refreshInner(manual); } catch (e) { console.warn('refresh', e); } finally { refreshBusy = false; }
  }
  async function refreshInner(manual) {
    const hadData = coins.length > 0;
    if (!hadData || manual) $('#livePill').textContent = '…';
    let ok = await loadLiveCoins();
    liveLoaded = true;
    if (!ok && hadData) { refreshFails++; fetchErr = null; $('#livePill').textContent = refreshFails >= 3 ? 'ERR' : 'LIVE'; return; }
    if (ok) refreshFails = 0;
    $('#livePill').textContent = ok ? 'LIVE' : 'ERR';
    if (ok && window.KyvoNotify) { try { window.KyvoNotify.onGood(listGood()); } catch (e) {} }
    // v8.3: Runner notifications (all chains) + tab badge + track-record log
    if (ok && window.KyvoNotify && window.KyvoInsights) { try { window.KyvoNotify.onRunner(window.KyvoInsights.runnerList()); } catch (e) {} }
    if (ok) { try { updateRunnerBadge(); } catch (e) {} trackUpdate(); }
    if (ok && Date.now() - smLoadedAt > 300000) loadSmartMoney().catch(() => {});   // v8.29: live smart money every ~5 min
    if (['pulse', 'hot', 'good', 'new', 'stretch', 'migrated', 'boosted', 'runner'].includes(view)) {
      if (!document.hidden) keepUi(() => setView(view));
    } else if (view === 'coin' && selectedKey && byKey[selectedKey] && !document.hidden) { if (!updateCoinLive(byKey[selectedKey])) keepUi(() => renderCoin(byKey[selectedKey])); }
    updateClock();
    // v8.3: GeckoTerminal logo lookup for coins still without an image — at most every 2 min (shared GT rate limit)
    if (ok && view !== 'coin' && Date.now() - lastImgFill > 120000) {   // v8.29: not while a coin is open (its chart needs GeckoTerminal's free limit)
      lastImgFill = Date.now();
      try {
        const vc = [];
        if (viral) for (const grp of [viral.topics, viral.trader_tweets, viral.posts]) for (const t of grp || []) for (const x of (t.coins || []).concat(t.spec_coins || [])) vc.push({ chainId: x.chain, address: x.address, image: x.image, dexId: x.dex });
        fillMissingImages(listNew('new').slice(0, 40).concat(listGood().slice(0, 30), listMigrated('migrated').slice(0, 20), vc));
      } catch (e) {}
    }
  }
  function updateClock() {
    const el = $('#clock');
    if (!lastFetch) {
      el.textContent = '—';
      return;
    }
    const sec = Math.round((Date.now() - lastFetch) / 1000);
    el.textContent = sec < 5 ? (window.KyvoI18n && window.KyvoI18n.isEn() ? 'now' : 'teraz') : agoShort(sec);
    el.classList.toggle('stale', sec > 300);
  }
  /* v8.33: "47 s temu" / "12 min temu" / "2 h 47 min temu" (was raw seconds: "10030s temu") */
  function agoShort(sec) {
    const en = window.KyvoI18n && window.KyvoI18n.isEn(), ago = en ? ' ago' : ' temu';
    if (sec < 60) return sec + ' s' + ago;
    if (sec < 3600) return Math.floor(sec / 60) + ' min' + ago;
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h < 48) return h + ' h' + (m ? ' ' + m + ' min' : '') + ago;
    return Math.floor(h / 24) + (en ? ' d' : ' dni') + ago;
  }

  function goCoin(key) {
    const h = 'coin/' + encodeURIComponent(key);
    if (location.hash === '#' + h) openCoin(key);
    else location.hash = h;
  }

  /* ---- Wire ---- */
  loadChain();
  loadFilters();
  for (const k of FILTER_TABS) {
    if (filters[k]) filters[k].chain = activeChain;
  }
  renderChainSwitcher();
  $$('#seg button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $$('.tb button').forEach((b) =>
    b.addEventListener('click', () => {
      const t = b.dataset.tab;
      if (t === 'search') {
        $('#q').focus();
        return;
      }
      if (t === 'hot') setView('pulse');
      else if (t === 'viral' && viralStale()) setView('tweets');   // v8.29: old X snapshot -> the live New Tweet feed first
      else setView(t);
    })
  );
  $('#filtToggle').addEventListener('click', () => {
    filtOpen = !filtOpen;
    renderFilterPanel(view === 'search' ? 'hot' : view === 'pulse' ? (isDesktopPulse() ? 'pulse' : mobilePulseTab === 'stretch' ? 'stretch' : mobilePulseTab === 'migrated' ? 'migrated' : 'new') : view);
  });
  let searchT;
  $('#q').addEventListener('input', () => {
    clearTimeout(searchT);
    const v = $('#q').value.trim();
    if (!v) {
      setView('pulse');
      return;
    }
    searchT = setTimeout(() => runSearch(v), 380);
  });
  $('#q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchT);
      const v = $('#q').value.trim();
      if (v) runSearch(v);
    }
  });
  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('resize', () => {
    if (view === 'pulse') setView('pulse');
  });

  function tabsFor(c) {
    const k = keyOf(c), out = [];
    const has = (l) => l.some((x) => keyOf(x) === k);
    try {
      if (has(listGood())) out.push('good');
      if (has(listNew('new'))) out.push('new');
      if (has(listStretch('stretch'))) out.push('stretch');
      if (has(listMigrated('migrated'))) out.push('migrated');
      if (has(listHot())) out.push('hot');
    } catch (e) {}
    return out;
  }
  function tweetsFor(c) {
    if (!viral) return [];
    return (viral.trader_tweets || []).filter((t) => (t.coins || []).some((x) => x.address === c.address));
  }
  function topicFor(c) {
    if (!viral) return null;
    return (viral.topics || []).find((t) => (t.coins || []).some((x) => x.address === c.address)) || null;
  }
  window.addEventListener('kyvo-premium-change', () => { // v8.11: owner unlock / entitlement change → re-render gated views
    try { if (view === 'gold' && window.KyvoGold) window.KyvoGold.render(); } catch (e) {}
    try { if (view === 'runner') keepUi(() => renderRunner()); else if (view === 'runner2') keepUi(() => renderRunner2()); else if (view === 'track') renderTrack(); else if (view === 'tweets') keepUi(() => renderTweets()); } catch (e) {}
  });
  if (window.KyvoInsights) window.KyvoInsights.init({ vl, esc, fmtUsd, fmtPct, pctClass, toast, keyOf, getUniverse: allUniverse, consensus: consensusOf, tabsFor, tweetsFor, topicFor, imgTag, getViral: () => viral, boostRank, onShape: () => { clearTimeout(shapeT); shapeT = setTimeout(() => { if (view === 'runner') renderRunner(); }, 1500); } });
  /* v8.30 🎮 GTA 6 tab (gta.js): DexScreener search for GTA queries (only while the tab is open) + coins already loaded */
  async function gtaFetchCoins(queries, addrs) {
    const map = {};
    for (const q of queries || []) { try { const d = await fetchJson(DS + '/latest/dex/search?q=' + encodeURIComponent(q)); ingestPairs(d.pairs || [], null, map); } catch (e) {} }
    if (addrs && addrs.length) await fetchTokenBatch(addrs, null, map);
    return map;
  }
  if (window.KyvoGta) window.KyvoGta.init({
    isEn: () => !!(window.KyvoI18n && window.KyvoI18n.isEn()), esc, fmtInt, imgTag, tweetText, exactTime, ageLabelH, vCoinHtml, coinRow, wireRows, keyOf,
    fetchCoins: gtaFetchCoins, universe: allUniverse, chain: () => activeChain, getLive: () => xLive, loadLive: () => loadLive(), getViral: () => viral,
    runners: () => { try { return runnerItems().coins; } catch (e) { return []; } }, unlocked: (k) => { try { return RunnerGate.unlocked(k); } catch (e) { return false; } },
    remember: (c) => { const k = keyOf(c); if (!byKey[k]) byKey[k] = c; }, isView: () => view === 'gta', keep: (fn) => keepUi(fn),
  });
  if (window.KyvoProfile) window.KyvoProfile.init({ esc, fmtUsd, agoLabel, shortCa, toast });
  if (window.KyvoCoinPage) window.KyvoCoinPage.init({ esc, fmtUsd, fmtPct, toast, keyOf, shortCa, ageFrom, imgTag, chainBadge, tweetsFor, consensus: consensusOf, smartBuys: (c) => ((c.chainId === 'solana' || !c.chainId) ? smartBuysForMint(c.address) : []), getLeaderboard: () => leaderboard, getSmartMoney: () => smartMoney, onPf: (c) => coinRemount && coinRemount(c) });
  if (window.KyvoJournal) window.KyvoJournal.init({ fmtUsd, toast, openPremium, getLeaderboard: () => leaderboard });   // 📓 Journal
  if (window.KyvoTracker) window.KyvoTracker.init({ fmtUsd, toast, openPremium, getLeaderboard: () => leaderboard, segHtml: rankSegHtml, wireSeg: wireRankSeg });
  if (window.KyvoGold) window.KyvoGold.init({ fmtUsd, imgTag, toast, openPremium, getLeaderboard: () => leaderboard, getLive: () => xLive, getKolLive: () => kolLive, isView: (v) => view === v });
  loadCache();
  // Ranking / trader / profil don't need live coins — route them as soon as the snapshot is in
  let earlyRouted = null;
  // v8.26: a coin deep link (push / shared link) opens at once; the coin is fetched on its own (loadCoinDirect)
  if (/^#coin\//.test(location.hash || '')) { earlyRouted = location.hash; routeFromHash(); }
  const pLb = loadLeaderboard().then(() => {
    const h = (location.hash || '').slice(1).split('/')[0];
    if (['rank', 'trader', 'profil', 'leaderboard', 'gold', 'journal'].includes(h)) { earlyRouted = location.hash; routeFromHash(); }
  });
  // v8.7: a cold start with a deep link (#watch, #coin/…, #tweets — e.g. from a push notification) used to land on Pulse,
  // because the first live render set location.hash = 'pulse' before this route ran. Restore the boot hash unless the user navigated.
  const bootHash = location.hash;
  let userNav = false;
  document.addEventListener('click', () => { userNav = true; }, { once: true, capture: true });
  Promise.all([loadViral(), loadSmartMoney(), pLb, refresh()]).then(() => {
    if (!userNav && bootHash && bootHash !== '#pulse' && bootHash !== earlyRouted && location.hash === '#pulse') { try { history.replaceState(null, '', bootHash); } catch (e) {} }
    if (location.hash !== earlyRouted) routeFromHash();
    try { updateRunnerBadge(); } catch (e) {}
  });
  setInterval(() => refresh(), REFRESH_MS);
  const holdRefresh = () => { const was = holdDoc && holdDoc.updated_at; loadHolders().then(() => { if (holdDoc && holdDoc.updated_at !== was && ['hot', 'good', 'new', 'stretch', 'migrated', 'boosted', 'runner', 'runner2', 'track', 'watch'].includes(view)) keepUi(() => setView(view)); }); };
  holdRefresh(); setInterval(holdRefresh, 150e3);   // v8.35 👥
  // v8.33: back from the background with old data -> refresh now (timers are paused while the phone sleeps)
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastFetch > REFRESH_MS) refresh(); });
  window.addEventListener('pageshow', (ev) => { if (ev.persisted && Date.now() - lastFetch > REFRESH_MS) refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && lastFetch && ['pulse', 'hot', 'good', 'new', 'stretch', 'migrated', 'boosted', 'runner', 'runner2'].includes(view)) keepUi(() => setView(view)); });
  // v8.2: re-check the X snapshot every 10 min while Kyvo is open -> "new important tweet" notification
  setInterval(async () => {
    try {
      const d = await fetchJson('data/x_viral.json?t=' + Math.floor(Date.now() / 600000));
      if (d && d.updated_at && (!viral || d.updated_at !== viral.updated_at)) {
        viral = d;
        if (window.KyvoNotify) window.KyvoNotify.onViral(d);
        if (view === 'viral') renderViral();
      }
    } catch (e) {}
  }, 10 * 60e3);
  // v8.6: New Tweet feed while Kyvo is open (in-app alert for fresh tweets; the phone push comes from GitHub Actions)
  // v8.9: every 60 s (the server loop now updates the feeds every few minutes instead of every ~35 min); only re-render when it changed
  let liveSig = '';
  setInterval(async () => {
    if (document.hidden) return;
    try {
      await loadLive(true);
      const sig = ((xLive && xLive.tweets) || []).map((t) => t.id + ':' + (t.coins || []).map((c) => c.address + (c.pumping ? '!' : '')).join('+')).join(','); // v8.10: a coin attached later re-renders too
      if (sig === liveSig) return;
      liveSig = sig;
      if (viral && window.KyvoNotify) window.KyvoNotify.onViral(viral);
      if (view === 'tweets') keepUi(() => renderTweets());
    } catch (e) {}
  }, 60e3);
  // v8.9: 👑 KOL / 🚀 Moon / 📈 Big runner server feed every 60 s while open (Runner tab + badge update without a reload)
  let kolSig = '';
  setInterval(async () => {
    if (document.hidden) return;
    try {
      await loadKolLive();
      const sig = ((kolLive && kolLive.items) || []).map((e) => e.k + ':' + (e.lastAt || e.at)).join(',');
      if (sig === kolSig) return;
      kolSig = sig;
      if (view === 'runner') keepUi(() => renderRunner()); else if (view === 'runner2') keepUi(() => renderRunner2()); else if (view === 'tweets') keepUi(() => renderTweets()); else updateRunnerBadge();
    } catch (e) {}
  }, 60e3);
  if (window.KyvoNotify) window.KyvoNotify.init({ toast, keyOf, fmtUsd });
  if (window.KyvoPush) window.KyvoPush.init();
  setInterval(updateClock, 1000);
  if ('serviceWorker' in navigator) {
    // v8.4: when push is enabled, keep OneSignal's registration (sw.js?push=1) instead of swapping back to plain sw.js
    const pushOn = !!(window.KYVO_PUSH_CONFIG && window.KYVO_PUSH_CONFIG.enabled);
    navigator.serviceWorker.getRegistration().then((r) => {
      const cur = r && (r.active || r.waiting || r.installing);
      if (r) { try { const u = r.update(); if (u && u.catch) u.catch(() => {}); } catch (e) {} } // v8.5: check for a new release on every start (browsers may wait up to 24 h)
      if (pushOn && cur && /OneSignalSDK(Updater)?Worker\.js/.test(cur.scriptURL)) return; // OneSignal's registration (may carry ?appId=…)
      if (!pushOn && cur && /OneSignalSDK/.test(cur.scriptURL)) { r.unregister().then(() => navigator.serviceWorker.register('sw.js')); return; }
      return navigator.serviceWorker.register(pushOn ? 'OneSignalSDKWorker.js' : 'sw.js');
    }).catch(() => {});
  }
  if (window.KyvoAuth) window.KyvoAuth.onChange(() => { if (view === 'profil') renderProfil(); else if (view === 'more') renderMore(); });
  // first launch: onboarding cards → login screen (skippable: "Kontynuuj bez logowania")
  if (window.KyvoLaunch) {
    const offerLogin = () => { if (window.KyvoAuth && window.KyvoAuth.shouldOfferLogin()) setView('login'); };
    window.KyvoLaunch.maybeOnboard(offerLogin);
  }

  window.__KYVO__ = {
    MVP_MARKER,
    fmtUsd,
    fmtLiq,
    platformUrls,
    fuzzyScore,
    refresh,
    getCoins: () => coins,
    getNew: () => newPoolCoins,
    getChain: () => activeChain,
    setChain: setActiveChain,
    listNew,
    listStretch,
    listMigrated,
    listGood,
    smartBuysForMint,
    smConsensus,
    tabsFor,
    getSmartMoney: () => smartMoney,
    getLeaderboard: () => leaderboard,
    applyFilters,
    filters,
    DEFAULT_FILTERS,
  };
})();
