/* Kyvo v8.12 🥇 Gold — DD verdict rules (pure function, no DOM / network). ONE copy, used by:
     * the app (gold.js → window.KyvoGoldRules.verdict(facts)) for "Sprawdź coin"
     * the server (tools/gold.py → `node gold-rules.js --batch < facts.json`) for the Gold feed (data/gold.json)
   Mirrors the checklist trader Orangie's research bot used in "Memecoins + Grok AI" (YouTube, 2026-10):
     average trade size (≈ $10/trade = volume bots), MC vs liquidity, holder counter vs real traders, one buy that filled the
     pump.fun curve, borrowed celebrity / brand name, copies (vamps) of the same ticker, known traders in the coin, real flow,
     catalysts (news articles, tweets of big accounts). A known person holding a big % can BE the narrative (👑 KOL coin).
   Verdict: 'gold' (🥇 looks real — still a small gamble), 'hazard' (🟡 high risk), 'avoid' (🔴 stay away).
   Speculative heuristics on public data. NOT financial advice — memecoins can go to zero. */
(function (root) {
  'use strict';
  const GOLD_T = {
    estMc: 50e6, estAgeH: 720,   // v8.12 established-coin mode
    botAvg: 15, botAvgWarn: 40, botMinTx: 300,          // $ per trade (24 h volume / 24 h txns)
    tinyShare: 0.7, tinyUsd: 5,                          // ≥ 70 % of the last trades below $5 = bot dust
    mcLiqWarn: 8, mcLiqBad: 14,                          // MC / liquidity (×1.5 above $10M MC)
    holderFarm: 0.05, holderMin: 500,                    // real traders 24 h < 5 % of the holder counter
    top1Warn: 15, top1Bad: 30, top10Warn: 45, top10Bad: 65,
    curveBad: 0.5, curveWarn: 0.25,                      // single buy as a share of the pump.fun curve
    buyWarn: 0.40, buyOk: 0.55,
    flowVol1h: 2000, flowMc: 200000,
    goldLiq: 20000, goldTraders24: 150, goldBuyers1h: 25,
  };
  const n = (v) => (v == null || v === '' || !isFinite(+v) ? null : +v);
  function usd(v) {
    v = n(v); if (v == null) return '?';
    const a = Math.abs(v);
    return a >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : a >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : a >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v.toFixed(a < 10 ? 2 : 0);
  }
  const pct = (v) => (v == null ? '?' : (v >= 0 ? '+' : '') + Math.round(v) + '%');
  /* facts — see tools/gold.py collect() / gold.js collect(); every field may be null (= unknown) */
  function verdict(f) {
    f = f || {};
    if (f.celeb === undefined && (f.name || f.symbol)) f.celeb = celebFacts(f);
    const R = [];   // {lvl: 'bad'|'warn'|'ok'|'info', key, pl, en, crit}
    const mc = n(f.mcap), liq = n(f.liq), vol24 = n(f.vol && f.vol.h24), vol1h = n(f.vol && f.vol.h1);
    // v8.12: these are fresh-memecoin rules. On a big, established coin (MC ≥ $50M, ≥ 30 days) supply sits in team / exchange / LP
    // wallets and liquidity is spread over many pools -> such flags become 'info' and the verdict is capped at Hazard.
    const est = (mc || 0) >= GOLD_T.estMc && (n(f.ageH) || 0) >= GOLD_T.estAgeH;
    const SOFT = { bundle: 1, farm: 1, holders: 1, top1: 1, top10: 1, mcliq: 1, bots: 1, dust: 1, flow: 1, kolhold: 1 };
    const add = (lvl, key, pl, en, crit) => {
      if (est && SOFT[key] && (lvl === 'bad' || lvl === 'warn') && (!crit || key === 'bundle')) { lvl = 'info'; crit = false; pl += ' (duży, ustalony coin — orientacyjnie)'; en += ' (big, established coin — indicative only)'; }
      R.push({ lvl, key, pl, en, crit: !!crit });
    };
    if (est) R.push({ lvl: 'info', key: 'established', pl: 'Duży, ustalony coin (MC ≥ $50M, ≥ 30 dni) — ten DD jest zrobiony pod świeże memecoiny, więc maks. ocena to Hazard.', en: 'Big, established coin (MC ≥ $50M, ≥ 30 days) — this DD is built for fresh memecoins, so the best rating is Gamble.', crit: false });
    const tx24 = f.txns && f.txns.h24 ? (n(f.txns.h24.b) || 0) + (n(f.txns.h24.s) || 0) : null;
    const b1 = f.txns && f.txns.h1 ? n(f.txns.h1.b) || 0 : null, s1 = f.txns && f.txns.h1 ? n(f.txns.h1.s) || 0 : null;
    const kolNarr = !!(f.kol && (f.kol.badge === 'kol' || f.kol.handle)) || !!(f.rc && f.rc.topKol);
    const m = {};   // computed metrics for the UI
    // 1) hard rug signs (contract) — Solana: RugCheck; BSC: GoPlus
    const rc = f.rc;
    if (rc) {
      if (rc.mintAuth) add('bad', 'mint', 'Dev nadal może dodrukować tokeny (mint authority aktywne).', 'The dev can still mint more tokens (mint authority active).', true);
      if (rc.freezeAuth) add('bad', 'freeze', 'Dev może zamrozić Twoje tokeny (freeze authority aktywne).', 'The dev can freeze your tokens (freeze authority active).', true);
      if (rc.rugged) add('bad', 'rugged', 'RugCheck oznacza ten coin jako zrugowany.', 'RugCheck marks this coin as rugged.', true);
      if (n(rc.insiders) >= 20) add('bad', 'bundle', `Sieć powiązanych portfeli (${rc.insiders} insiderów) — wygląda na bundle.`, `Network of linked wallets (${rc.insiders} insiders) — looks bundled.`, n(rc.insiders) >= 40);
      if (n(rc.transferFee) > 5) add('bad', 'fee', `Podatek od transferu ${Math.round(rc.transferFee)}%.`, `Transfer tax ${Math.round(rc.transferFee)}%.`, true);
      if (!f.onCurve && n(rc.lpLockedPct) != null && rc.lpLockedPct < 90 && rc.lpAmm) add('warn', 'lp', `Płynność zablokowana tylko w ${Math.round(rc.lpLockedPct)}% — dev może ją wyciągnąć.`, `Only ${Math.round(rc.lpLockedPct)}% of liquidity locked — the dev could pull it.`);
      if (n(rc.creatorPct) >= 20 && !kolNarr) add('bad', 'dev', `Dev trzyma ${Math.round(rc.creatorPct)}% podaży.`, `The dev holds ${Math.round(rc.creatorPct)}% of supply.`);
    }
    if (f.gp && f.chain === 'bsc') {
      if (f.gp.honeypot) add('bad', 'honeypot', 'Honeypot — nie da się sprzedać.', 'Honeypot — you cannot sell.', true);
      if (n(f.gp.sellTax) > 10) add('bad', 'tax', `Podatek przy sprzedaży ${Math.round(f.gp.sellTax)}%.`, `Sell tax ${Math.round(f.gp.sellTax)}%.`, true);
      if (f.gp.ownerPowers) add('bad', 'owner', 'Właściciel kontraktu może zmieniać salda / dodrukować.', 'The contract owner can change balances / mint.', true);
    }
    // 2) average trade size — "$26K across ~2.7K trades = $10 a trade. That's volume bots, not real buyers."
    if (vol24 != null && tx24) {
      const avg = vol24 / tx24; m.avgTrade = avg; m.tx24 = tx24;
      if (tx24 >= GOLD_T.botMinTx && avg < GOLD_T.botAvg) add('bad', 'bots', `Średnio ${usd(avg)} na transakcję (${usd(vol24)} / ${tx24} tx w 24 h) — to boty wolumenowe, nie prawdziwi kupujący.`, `Avg ${usd(avg)} per trade (${usd(vol24)} / ${tx24} txns in 24 h) — volume bots, not real buyers.`, true);
      else if (tx24 >= GOLD_T.botMinTx && avg < GOLD_T.botAvgWarn) add('warn', 'bots', `Średnio tylko ${usd(avg)} na transakcję — sporo drobnych botów.`, `Only ${usd(avg)} per trade on average — many small bots.`);
      else if (tx24 >= 50) add('ok', 'bots', `Średnio ${usd(avg)} na transakcję — wygląda na prawdziwe zakupy.`, `Avg ${usd(avg)} per trade — looks like real buying.`);
    }
    const tr = f.trades;
    if (tr && n(tr.n) >= 40) {
      m.tinyShare = tr.tinyShare; m.medianTrade = tr.median;
      if (n(tr.tinyShare) >= GOLD_T.tinyShare && !R.some((r) => r.key === 'bots' && r.lvl === 'bad')) add('bad', 'dust', `${Math.round(tr.tinyShare * 100)}% ostatnich ${tr.n} transakcji to mniej niż $5 — sztuczny ruch.`, `${Math.round(tr.tinyShare * 100)}% of the last ${tr.n} trades are under $5 — fake activity.`, true);
    }
    // 3) MC vs liquidity — "500K MC with about 60K in liquidity and no real flow"
    if (mc && liq && !f.onCurve) {
      const r = mc / liq, k = mc > 1e7 ? 2.1 : mc > 1e6 ? 1.6 : 1; m.mcLiq = r;   // pump AMM liquidity grows slower than MC -> looser above $1M
      if (r >= GOLD_T.mcLiqBad * k) add('bad', 'mcliq', `MC ${usd(mc)} przy płynności tylko ${usd(liq)} (${r.toFixed(1)}×) — łatwo zrzucić cenę.`, `MC ${usd(mc)} on only ${usd(liq)} liquidity (${r.toFixed(1)}×) — easy to dump.`);
      else if (r >= GOLD_T.mcLiqWarn * k) add('warn', 'mcliq', `MC ${usd(mc)} przy płynności ${usd(liq)} (${r.toFixed(1)}×) — cienka płynność.`, `MC ${usd(mc)} on ${usd(liq)} liquidity (${r.toFixed(1)}×) — thin liquidity.`);
      else add('ok', 'mcliq', `Płynność ${usd(liq)} przy MC ${usd(mc)} (${r.toFixed(1)}×) — OK.`, `Liquidity ${usd(liq)} at MC ${usd(mc)} (${r.toFixed(1)}×) — OK.`);
    }
    if (mc && mc >= GOLD_T.flowMc && vol1h != null && vol1h < GOLD_T.flowVol1h) add('warn', 'flow', `Prawie brak realnego przepływu: ${usd(vol1h)} wolumenu w 1 h przy MC ${usd(mc)}.`, `Almost no real flow: ${usd(vol1h)} volume in 1 h at ${usd(mc)} MC.`);
    // 4) holder counter vs real traders — "header says about 2K holders, but only six of them are on FOMO"
    const holders = rc ? n(rc.holders) : null;
    let traders24 = f.gt && (n(f.gt.buyers24) != null || n(f.gt.sellers24) != null) ? (n(f.gt.buyers24) || 0) + (n(f.gt.sellers24) || 0) : null;
    if (traders24 === 0 && (tx24 || 0) > 50) traders24 = null;   // GeckoTerminal has not indexed this pool yet -> unknown, not "0 traders"
    m.holders = holders; m.traders24 = traders24;
    if (holders != null && traders24 != null) {
      if (holders >= GOLD_T.holderMin && traders24 < holders * GOLD_T.holderFarm) add('bad', 'farm', `Licznik pokazuje ${holders} holderów, ale w 24 h handlowało tylko ${traders24} portfeli — to farma holderów.`, `The counter shows ${holders} holders but only ${traders24} wallets traded in 24 h — a holder farm.`, n(m.avgTrade) != null && m.avgTrade < GOLD_T.botAvgWarn);
      else add(traders24 >= GOLD_T.goldTraders24 ? 'ok' : 'info', 'holders', `${holders} holderów, ${traders24} różnych portfeli handlowało w 24 h.`, `${holders} holders, ${traders24} different wallets traded in 24 h.`);
    } else if (traders24 != null) add(traders24 >= GOLD_T.goldTraders24 ? 'ok' : 'info', 'holders', `${traders24} różnych portfeli handlowało w 24 h.`, `${traders24} different wallets traded in 24 h.`);
    if (rc && n(rc.top1) != null) {
      m.top1 = rc.top1; m.top10 = rc.top10;
      if (kolNarr && rc.top1 >= GOLD_T.top1Warn) add('info', 'kolhold', `Największy holder ma ${Math.round(rc.top1)}%${rc.topKol ? ' — to @' + rc.topKol : f.kol && f.kol.handle ? ' — coin @' + f.kol.handle : ''}. Przy coinie znanej osoby to może być cała narracja, nie tylko ryzyko (ale on może sprzedać).`, `The top holder has ${Math.round(rc.top1)}%${rc.topKol ? ' — that is @' + rc.topKol : f.kol && f.kol.handle ? ' — @' + f.kol.handle + '\u2019s coin' : ''}. For a known person\u2019s coin that can be the whole narrative, not only a risk (but they can sell).`);
      else if (rc.top1 >= GOLD_T.top1Bad) add('bad', 'top1', `Jeden portfel trzyma ${Math.round(rc.top1)}% podaży.`, `One wallet holds ${Math.round(rc.top1)}% of supply.`);
      else if (rc.top1 >= GOLD_T.top1Warn) add('warn', 'top1', `Największy holder ma ${Math.round(rc.top1)}%.`, `The top holder has ${Math.round(rc.top1)}%.`);
      if (!kolNarr && n(rc.top10) != null) {
        if (rc.top10 >= GOLD_T.top10Bad) add('bad', 'top10', `Top 10 portfeli trzyma ${Math.round(rc.top10)}% podaży.`, `Top 10 wallets hold ${Math.round(rc.top10)}% of supply.`);
        else if (rc.top10 >= GOLD_T.top10Warn) add('warn', 'top10', `Top 10 portfeli trzyma ${Math.round(rc.top10)}%.`, `Top 10 wallets hold ${Math.round(rc.top10)}%.`);
        else add('ok', 'top10', `Top 10 portfeli: ${Math.round(rc.top10)}% — rozproszone.`, `Top 10 wallets: ${Math.round(rc.top10)}% — spread out.`);
      }
    }
    // 5) one buy filled the pump.fun curve — "there was only one buy above 9K, the single buy that filled the whole bonding curve"
    const cv = f.curve;
    if (cv && n(cv.maxBuyUsd) && n(cv.sizeUsd)) {
      const sh = cv.maxBuyUsd / cv.sizeUsd; m.curveMaxBuy = cv.maxBuyUsd; m.curveShare = sh;
      if (sh >= GOLD_T.curveBad) add('bad', 'curve', `Jeden zakup za ${usd(cv.maxBuyUsd)} wypełnił ~${Math.round(Math.min(1, sh) * 100)}% krzywej pump.fun — sztuczna migracja.`, `One ${usd(cv.maxBuyUsd)} buy filled ~${Math.round(Math.min(1, sh) * 100)}% of the pump.fun curve — forced migration.`, true);
      else if (sh >= GOLD_T.curveWarn) add('warn', 'curve', `Największy zakup na krzywej: ${usd(cv.maxBuyUsd)} (~${Math.round(sh * 100)}% krzywej).`, `Largest curve buy: ${usd(cv.maxBuyUsd)} (~${Math.round(sh * 100)}% of the curve).`);
      else add('ok', 'curve', `Krzywa wypełniona przez wielu kupujących (największy zakup ${usd(cv.maxBuyUsd)}).`, `Curve filled by many buyers (largest buy ${usd(cv.maxBuyUsd)}).`);
    }
    // 6) copies / vamps — "people are trying to vamp the token with a different contract address"
    const cp = f.copies;
    if (cp) {
      if (cp.original) add('bad', 'copy', `To kopia: starszy/większy $${cp.original.symbol} (MC ${usd(cp.original.mcap)}) już istnieje pod innym CA.`, `This is a copy: an older/bigger $${cp.original.symbol} (MC ${usd(cp.original.mcap)}) already exists at another CA.`, true);
      else if (n(cp.n) > 0) {
        const big = (cp.over500k || []).length;
        add(big ? 'warn' : 'ok', 'copies', `To oryginał (najstarszy z tym tickerem). Kopii: ${cp.n}${big ? `, w tym ${big} powyżej $500K MC — PvP / wampiry z wolumenem` : ''}.`, `This is the original (oldest with this ticker). Copies: ${cp.n}${big ? `, ${big} above $500K MC — PvP / vamps with volume` : ''}.`);
      } else add('ok', 'copies', 'Brak kopii z tym tickerem.', 'No copies with this ticker.');
    }
    // 7) borrowed celebrity / brand name — "the IShowSpeed name is borrowed. I skip it unless Speed himself posts it."
    const ce = f.celeb;
    if (ce && ce.term) {
      if (ce.official) add('info', 'celeb', `Nazwa „${ce.term}” — oficjalnie powiązana (${ce.official}).`, `Name “${ce.term}” — officially linked (${ce.official}).`);
      else if ((mc || 0) >= 2e7 && (n(f.ageH) || 0) >= 168) add('info', 'celeb', `Nazwa „${ce.term}” — coin nie jest oficjalnie powiązany, ale to już duży, stary coin (narracja społeczności).`, `Name “${ce.term}” — not officially linked, but it is a big, old coin by now (community narrative).`);
      else add('bad', 'celeb', `Pożyczona nazwa „${ce.term}”. Pomiń, chyba że ${ce.handle ? '@' + ce.handle : 'ta osoba / marka'} sam(a) to wrzuci.`, `Borrowed name “${ce.term}”. Skip it unless ${ce.handle ? '@' + ce.handle : 'that person / brand'} posts it.`);
    }
    // 8) known traders in the coin — "Logan's in it, Nico's in it. These are traders I personally know."
    const kw = (tr && tr.kols) || [];
    if (kw.length) add('ok', 'kols', `W ostatnich transakcjach są znani traderzy: ${kw.slice(0, 4).map((h) => '@' + h).join(', ')}.`, `Known traders in the latest trades: ${kw.slice(0, 4).map((h) => '@' + h).join(', ')}.`);
    if (f.kol && f.kol.badge === 'kol') add('info', 'kolcoin', `👑 KOL coin${f.kol.handle ? ' @' + f.kol.handle : ''} — coin znanej osoby (wysokie ryzyko, ona trzyma podaż).`, `👑 KOL coin${f.kol.handle ? ' @' + f.kol.handle : ''} — a known person\u2019s coin (high risk, they hold supply).`);
    // 9) age + migration
    const age = n(f.ageH); m.ageH = age;
    if (f.onCurve) add('info', 'stage', `Jeszcze na krzywej pump.fun${n(f.curvePct) != null ? ` (~${Math.round(f.curvePct)}%)` : ''} — przed migracją, bardzo wcześnie.`, `Still on the pump.fun curve${n(f.curvePct) != null ? ` (~${Math.round(f.curvePct)}%)` : ''} — before migration, very early.`);
    else if (f.dex) add('info', 'stage', `Zmigrowany (${f.dex}).`, `Migrated (${f.dex}).`);
    if (age != null && age < 0.17) add('warn', 'young', 'Ma mniej niż 10 minut — dane jeszcze niewiarygodne.', 'Less than 10 minutes old — data is not reliable yet.');
    // 10) buy / sell pressure
    if (b1 != null && b1 + s1 >= 20) {
      const sh = b1 / (b1 + s1); m.buyShare = sh;
      if (sh < GOLD_T.buyWarn) add('warn', 'pressure', `Więcej sprzedaży niż zakupów w 1 h (${Math.round(sh * 100)}% kupna).`, `More sells than buys in 1 h (${Math.round(sh * 100)}% buys).`);
      else if (sh >= GOLD_T.buyOk) add('ok', 'pressure', `Przewaga kupujących w 1 h (${Math.round(sh * 100)}% kupna).`, `Buyers dominate in 1 h (${Math.round(sh * 100)}% buys).`);
    }
    if (f.gt && n(f.gt.buyers1h) != null) m.buyers1h = f.gt.buyers1h;
    // 11) price move
    const ch = f.chg || {};
    if (n(ch.m5) != null && ch.m5 <= -15) add('warn', 'dump', `Spada teraz: ${pct(ch.m5)} w 5 min.`, `Dumping now: ${pct(ch.m5)} in 5 min.`);
    if (n(ch.h1) != null && ch.h1 >= 150) add('info', 'ran', `Już mocno poleciał: ${pct(ch.h1)} w 1 h — łatwo kupić szczyt.`, `Already ran hard: ${pct(ch.h1)} in 1 h — easy to buy the top.`);
    if (n(ch.h6) != null && ch.h6 <= -50) add('warn', 'bleed', `${pct(ch.h6)} w 6 h — trend w dół.`, `${pct(ch.h6)} in 6 h — downtrend.`);
    // 12) links
    const L = f.links || {};
    if (!(L.x || []).length && !(L.web || []).length && !(L.tg || []).length) add('warn', 'links', 'Brak linków (X / strona) — nie ma społeczności do sprawdzenia.', 'No links (X / website) — no community to check.');
    else add('ok', 'links', `Linki: ${[(L.x || []).length ? 'X' : '', (L.web || []).length ? L2w('strona', 'website') : '', (L.tg || []).length ? 'Telegram' : ''].filter(Boolean).join(', ')}.`, `Links: ${[(L.x || []).length ? 'X' : '', (L.web || []).length ? 'website' : '', (L.tg || []).length ? 'Telegram' : ''].filter(Boolean).join(', ')}.`);
    // 13) catalysts — "the more news articles came out, the more viral this story was going to go"
    const nw = f.news;
    if (nw && n(nw.n48) != null) {
      // matched by name only -> 'info' (no score boost); the user checks the headlines below
      if (nw.n48 > 0) add('info', 'news', `Artykuły z „${nw.q || ''}” w tytule: ${nw.n24 || 0} w 24 h, ${nw.n48} w 48 h${nw.trend === 'up' ? ' (więcej niż dzień wcześniej ↑)' : ''} — sprawdź, czy dotyczą tej narracji.`, `Articles with “${nw.q || ''}” in the headline: ${nw.n24 || 0} in 24 h, ${nw.n48} in 48 h${nw.trend === 'up' ? ' (more than the day before ↑)' : ''} — check they are about this narrative.`);
      else add('info', 'news', 'Brak artykułów w Google News z ostatnich 48 h.', 'No Google News articles in the last 48 h.');
    }
    const tws = f.tweets || [];
    if (tws.length) add('ok', 'tweets', `Tweetowali o nim: ${[...new Set(tws.map((t) => '@' + t.handle))].slice(0, 4).join(', ')}.`, `Tweeted about by: ${[...new Set(tws.map((t) => '@' + t.handle))].slice(0, 4).join(', ')}.`);
    // ---- verdict
    const bad = R.filter((r) => r.lvl === 'bad'), crit = bad.filter((r) => r.crit), warn = R.filter((r) => r.lvl === 'warn');
    const known = { trades: !!(tr && n(tr.n)), rc: !!rc || (f.chain === 'bsc' && !!f.gp), gt: !!f.gt };
    let level;
    if (crit.length || bad.length >= 2) level = 'avoid';
    else if (!bad.length && warn.length <= 1 && known.rc && (known.gt || known.trades)
      && (f.onCurve || (liq || 0) >= GOLD_T.goldLiq)
      && ((traders24 || 0) >= GOLD_T.goldTraders24 || n(m.buyers1h) >= GOLD_T.goldBuyers1h
        || (traders24 == null && n(m.buyers1h) == null && (b1 || 0) >= GOLD_T.goldBuyers1h * 2)) // GT not indexed yet -> DexScreener buy-tx count as the flow proxy
      && !est && !R.some((r) => r.key === 'celeb' && r.lvl === 'bad')) level = 'gold';
    else level = 'hazard';
    let score = 70 - bad.length * 25 - crit.length * 15 - warn.length * 8 + Math.min(20, R.filter((r) => r.lvl === 'ok').length * 4);
    score = Math.max(0, Math.min(100, Math.round(score)));
    const order = { bad: 0, warn: 1, info: 2, ok: 3 };
    R.sort((a, b) => order[a.lvl] - order[b.lvl]);
    const say = level === 'avoid'
      ? { pl: bad.length ? 'Trzymaj się z daleka. ' + (crit.length ? 'To ma znaki farmy / rugu — nie kupuj.' : 'Za dużo czerwonych flag naraz.') : 'Trzymaj się z daleka.', en: 'Stay away. ' + (crit.length ? 'It has the marks of a farm / rug — don\u2019t buy.' : 'Too many red flags at once.') }
      : level === 'gold'
        ? { pl: 'Wygląda na prawdziwy coin — nie widzę znaków rugu. Nadal to mały hazard.', en: 'Looks like a real coin — no rug signs I can see. Still a small gamble.' }
        : { pl: bad.length ? 'Hazard: jedna poważna flaga — tylko mała kwota, jeśli w ogóle.' : 'Hazard: brak twardych znaków rugu, ale za mało pewności na Gold.', en: bad.length ? 'Gamble: one serious flag — only a small size, if at all.' : 'Gamble: no hard rug signs, but not enough confidence for Gold.' };
    return { level, score, say, reasons: R, metrics: m, counts: { bad: bad.length, crit: crit.length, warn: warn.length, ok: R.filter((r) => r.lvl === 'ok').length }, known };
  }
  function L2w(pl) { return pl; }
  /* borrowed-name dictionary: term (lower-case, whole word in name/ticker) → official X handle */
  const CELEBS = {
    'elon': 'elonmusk', 'musk': 'elonmusk', 'trump': 'realDonaldTrump', 'melania': 'MELANIATRUMP', 'barron': null, 'cz': 'cz_binance', 'binance': 'binance',
    'ishowspeed': 'ishowspeedsui', 'speed': 'ishowspeedsui', 'mrbeast': 'MrBeast', 'mr beast': 'MrBeast', 'kanye': 'kanyewest', 'drake': 'Drake', 'taylor swift': 'taylorswift13',
    'kardashian': 'KimKardashian', 'tesla': 'Tesla', 'spacex': 'SpaceX', 'apple': 'Apple', 'google': 'Google', 'openai': 'OpenAI', 'chatgpt': 'OpenAI', 'grok': 'grok',
    'nvidia': 'nvidia', 'amazon': 'amazon', 'microsoft': 'Microsoft', 'nike': 'Nike', 'mcdonalds': 'McDonalds', 'disney': 'Disney', 'netflix': 'netflix',
    'gta': 'RockstarGames', 'rockstar': 'RockstarGames', 'pope': 'Pontifex', 'obama': 'BarackObama', 'biden': 'JoeBiden', 'vitalik': 'VitalikButerin', 'saylor': 'saylor',
    'ansem': 'blknoiz06', 'toly': 'aeyakovenko', 'kai cenat': 'KaiCenat', 'adin ross': 'adinross', 'xqc': 'xQc', 'pewdiepie': 'pewdiepie', 'ronaldo': 'Cristiano', 'messi': 'TeamMessi',
  };
  function celebOf(name, symbol) {
    const s = (' ' + String(name || '') + ' ' + String(symbol || '') + ' ').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
    for (const term of Object.keys(CELEBS)) {
      if (term === 'speed' && !/^\s*(i ?show ?)?speed\s*$/i.test(String(name || ''))) continue;   // "speed" alone is a common word: only the exact name
      if (term === 'cz' && !/^\s*cz\s*$/i.test(String(symbol || '')) && !/^\s*cz\b/i.test(String(name || ''))) continue;
      if (s.includes(' ' + term + ' ')) return { term, handle: CELEBS[term] };
    }
    return null;
  }
  /* borrowed name is "official" when the coin's own X link IS that account, or that account tweeted this CA (tracked feed) */
  function celebFacts(f) {
    const c = celebOf(f.name, f.symbol); if (!c) return null;
    const h = String(c.handle || '').toLowerCase();
    const xs = ((f.links && f.links.xHandles) || []).map((x) => String(x).toLowerCase());
    if (h && xs.includes(h)) return Object.assign(c, { official: 'X @' + c.handle });
    if (h && (f.tweets || []).some((t) => String(t.handle || '').toLowerCase() === h)) return Object.assign(c, { official: 'tweet @' + c.handle });
    if (f.kol && f.kol.badge === 'kol' && String(f.kol.handle || '').toLowerCase() === h) return Object.assign(c, { official: '👑 @' + c.handle });
    return c;
  }
  const api = { verdict, celebOf, celebFacts, CELEBS, GOLD_T, version: '8.12' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KyvoGoldRules = api;
  // node gold-rules.js --batch < facts.json  → JSON array of verdicts (server: tools/gold.py)
  if (typeof require !== 'undefined' && typeof process !== 'undefined' && require.main === module && process.argv.includes('--batch')) {
    let buf = ''; process.stdin.on('data', (d) => (buf += d)); process.stdin.on('end', () => {
      const arr = JSON.parse(buf || '[]');
      process.stdout.write(JSON.stringify(arr.map((f) => { try { return verdict(f); } catch (e) { return { level: 'hazard', score: 0, error: String(e) }; } })));
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
