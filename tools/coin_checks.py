#!/usr/bin/env python3
"""Kyvo v8.36 — 🧪 extra coin checks + 🔔 coin events (after Orangie's 'You're Not Behind (Yet)' / 'Grok AI' videos, Oct 2026).

Free public sources only (no keys, never a paid RPC): Solana public RPC, RugCheck, DexScreener, Google News RSS (via tools/gold.py).
For the coins Kyvo itself lists — Runner / ⚡ Early (track record, 24 h), 🚀 Runner 2.0, 🥇 Gold:

  * bundle (⚠️ 'bundle' badge, Solana only): the top ~20 holders (RugCheck topHolders, pools / LP / curve / lockers / burn
    excluded, same rule as tools/holders.py). For each wallet: getSignaturesForAddress(limit 1000) = how many txns it has
    (≥ 1000 = an old wallet, not a fresh factory wallet) + its OLDEST txn -> the wallet that first sent it SOL (= the funder).
    Flag when
      'funder' : ≥ 3 of those holders were first funded by the SAME small wallet (< 1000 txns, not an exchange) and hold ≥ 3 %
      'equal'  : ≥ 5 fresh holders (< 1000 txns) hold near-equal amounts (within ±25 %) with similar txn counts (max/min ≤ 1.6)
                 and ≥ 5 % together — "wallets 2 through 20 each hold about 1.2 to 1.5 % … that's the wallet factory"
    Funders are immutable -> cached forever per wallet (state file); ≤ KYVO_BUNDLE_MAX (2) coins and ~25 s per run,
    RPC calls ~0.15 s apart, a 429 stops the run. Re-checked every 6 h.
  * fakevol (⚠️ 'fejkowy wolumen'): average trade = 24 h volume / 24 h txns (DexScreener, any chain) < $30 with ≥ 300 txns
    ("2.7K trades, which averages out to $10 a trade. That's volume bots"), or the 🥇 Gold check found ≥ 70 % dust trades
    (< $5) or one buy that filled the pump.fun curve. Threshold from 119 Gold coins with price data (v8.36 report).
  * events for the 'Pilnuj moich coinów' watchlist alerts (the app matches them against each phone's own watchlist):
      whale / dev sell : a top-10 wallet (or the creator) drops ≥ 50 % of its position and ≥ 1 % of supply between two RugCheck looks
      news             : a new Google News article naming the coin (Gold coins: from their gold.json card; Runner 2.0 / Runner: fetched)
      vamp             : a NEW copy of the ticker passes $500K MC
Output data/coin_checks.json {v, updated_at, thr, coins: {"chain:<addr lower>": {b, fv, at}}, events: [...48 h]}.
Local test: python3 tools/coin_checks.py --out /tmp/cc.json --state /tmp/cc_state.json [--no-net]
"""
from __future__ import annotations
import argparse, concurrent.futures as cf, hashlib, json, os, re, sys, threading, time, urllib.error, urllib.request
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import holders as H  # noqa: E402  (facts / pool rule / RugCheck cache)

RPC = os.environ.get("KYVO_SOL_RPC", "https://api.mainnet-beta.solana.com")   # public endpoint; never a paid / keyed RPC
if "helius" in RPC.lower(): RPC = "https://api.mainnet-beta.solana.com"
DS = "https://api.dexscreener.com/tokens/v1/"
THR = {"fundMin": 3, "fundPct": 3.0, "eqMin": 5, "eqPct": 5.0, "eqTol": 0.25, "eqTx": 1.6, "freshTx": 1000,
       "fvAvg": float(os.environ.get("KYVO_FV_AVG", "30")), "fvMinTx": 300, "sellDrop": 0.5, "sellPct": 1.0}
MAX_B = int(os.environ.get("KYVO_BUNDLE_MAX", "3")); BUDGET_S = float(os.environ.get("KYVO_BUNDLE_BUDGET_S", "40"))
TTL_B, TTL_FV, KEEP_S, EV_KEEP_S, MAX_EV = 6 * 3600, 600, 72 * 3600, 48 * 3600, 300
# exchange / bridge hot wallets fund thousands of unrelated users -> never a "same funder" cluster (they also have ≥ 1000 txns)
CEX = {"5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9", "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS", "5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD",
       "AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2", "FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5", "ASTyfSima4LLAdDgoFGkgqoKowG1LZFDr9fAQrg7iaJZ",
       "2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S", "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"}
UA = {"User-Agent": "kyvo-coin-checks/8.36", "Content-Type": "application/json"}

class RateLimited(Exception): pass
_last = [0.0]; NCALL = [0]; _lock = threading.Lock()
PAR = int(os.environ.get("KYVO_RPC_PAR", "6"))   # public RPC answers in ~1-5 s; 6 in flight stays far under its 40 req / 10 s per-IP limit

def rpc(method, params):
    with _lock:
        dt = time.time() - _last[0]
        if dt < 0.15: time.sleep(0.15 - dt)
        _last[0] = time.time(); NCALL[0] += 1
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(RPC, data=body, headers=UA), timeout=15) as f: d = json.load(f)
    except urllib.error.HTTPError as e:
        if e.code == 429: raise RateLimited()
        return None
    except Exception:
        return None
    if isinstance(d, dict) and d.get("error"):
        if (d["error"] or {}).get("code") in (429, -32429): raise RateLimited()
        return None
    return (d or {}).get("result")

def wallet_info(w: str, cache: dict) -> dict | None:
    """{n: txns (capped 1000), f: first funder or None, sol: lamports it sent} — immutable for fresh wallets, cached forever."""
    e = cache.get(w)
    if e and (e.get("n", 0) >= THR["freshTx"] or e.get("f") is not None or time.time() - e.get("t", 0) < 6 * 3600): return e
    sigs = rpc("getSignaturesForAddress", [w, {"limit": 1000}])
    if sigs is None: return None
    out = {"n": len(sigs), "f": None, "t": int(time.time())}
    if sigs and len(sigs) < THR["freshTx"]:
        tx = rpc("getTransaction", [sigs[-1]["signature"], {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}])
        if tx:
            ins = list(((tx.get("transaction") or {}).get("message") or {}).get("instructions") or [])
            for g in (tx.get("meta") or {}).get("innerInstructions") or []: ins += g.get("instructions") or []
            for i in ins:
                p = i.get("parsed") if isinstance(i, dict) else None
                if not isinstance(p, dict) or i.get("program") != "system": continue
                inf = p.get("info") or {}
                if p.get("type") in ("transfer", "transferWithSeed") and inf.get("destination") == w and inf.get("source") != w:
                    out["f"], out["sol"] = inf.get("source"), inf.get("lamports"); break
                if p.get("type") in ("createAccount", "createAccountWithSeed") and inf.get("newAccount") == w and inf.get("source") != w:
                    out["f"], out["sol"] = inf.get("source"), inf.get("lamports"); break
            if out["f"] is None:
                keys = ((tx.get("transaction") or {}).get("message") or {}).get("accountKeys") or []
                k0 = keys[0].get("pubkey") if keys and isinstance(keys[0], dict) else (keys[0] if keys else None)
                if k0 and k0 != w: out["f"] = k0
    cache[w] = out
    return out

def top_wallets(r) -> list[dict]:
    """RugCheck report -> [{owner, pct}] top 20 real wallets (pools etc. excluded with tools/holders.py's rule)."""
    fx = H.facts(r)
    if not fx: return []
    pools, known = set(H.POOLS0), r.get("knownAccounts") or {}
    for m in r.get("markets") or []:
        for v in (m.get("pubkey"), (m.get("lp") or {}).get("owner"), m.get("liquidityA"), m.get("liquidityB"),
                  (m.get("liquidityAAccount") or {}).get("owner") if isinstance(m.get("liquidityAAccount"), dict) else None,
                  (m.get("liquidityBAccount") or {}).get("owner") if isinstance(m.get("liquidityBAccount"), dict) else None):
            if isinstance(v, str): pools.add(v)
    import re
    out = []
    for h in r.get("topHolders") or []:
        o = h.get("owner") or h.get("address")
        if not o or o in pools or o in H.BURN or h.get("address") in pools: continue
        kk = known.get(o) or known.get(h.get("address")) or {}
        if re.search("AMM|LOCKER|CURVE|pump", str(kk.get("type", "")) + str(kk.get("name", "")), re.I): continue
        out.append({"o": o, "pct": float(h.get("pct") or 0)})
    return out[:20]

def prefetch(ws: list[str], cache: dict, deadline: float) -> None:
    """wallet_info for many wallets in parallel (results land in cache; RateLimited is re-raised)."""
    ws = [w for w in dict.fromkeys(ws) if w]
    if not ws or time.time() > deadline: return
    def one(w):
        if time.time() > deadline: return None
        return wallet_info(w, cache)
    with cf.ThreadPoolExecutor(PAR) as ex:
        for f in [ex.submit(one, w) for w in ws]: f.result()

def bundle_check(tops: list[dict], cache: dict, deadline: float) -> dict | None:
    prefetch([t["o"] for t in tops], cache, deadline)
    info = {}
    for t in tops:
        if time.time() > deadline: return None
        i = wallet_info(t["o"], cache)
        if i is None: return None
        info[t["o"]] = i
    res = {"flag": False, "why": None, "n": 0, "pct": 0.0, "fund": 0, "checked": len(tops)}
    groups: dict[str, list] = {}
    for t in tops:
        f = info[t["o"]].get("f")
        if f and f not in CEX: groups.setdefault(f, []).append(t)
    best = None
    prefetch([f for f, g in groups.items() if len(g) >= THR["fundMin"]], cache, deadline)
    for f, g in groups.items():
        if len(g) < THR["fundMin"]: continue
        fi = wallet_info(f, cache) if time.time() < deadline else None
        if fi is None or fi.get("n", 0) >= THR["freshTx"]: continue   # big / exchange-like funder -> not a factory
        s = sum(x["pct"] for x in g)
        if s >= THR["fundPct"] and (not best or s > best[1]): best = (g, s)
    if best:
        res.update(flag=True, why="funder", n=len(best[0]), pct=round(best[1], 1), fund=1)
    fresh = sorted([t for t in tops if info[t["o"]].get("n", 0) < THR["freshTx"] and t["pct"] >= 0.3], key=lambda t: t["pct"])
    eq = []
    for c in fresh:   # largest set within ±tol of a center pct, with similar txn counts
        s = [t for t in fresh if abs(t["pct"] - c["pct"]) <= THR["eqTol"] * c["pct"]]
        ns = sorted(info[t["o"]]["n"] for t in s)
        while len(s) >= THR["eqMin"] and max(ns[-1], 1) / max(ns[0], 1) > THR["eqTx"]:
            mid = sorted(ns)[len(ns) // 2]   # drop the txn-count outlier furthest from the median
            far = max(s, key=lambda t: abs(info[t["o"]]["n"] - mid)); s = [t for t in s if t is not far]; ns = sorted(info[t["o"]]["n"] for t in s)
        if len(s) > len(eq): eq = s
    eqs = sum(t["pct"] for t in eq)
    if len(eq) >= THR["eqMin"] and eqs >= THR["eqPct"] and (not res["flag"] or eqs > res["pct"]):
        fs = {info[t["o"]].get("f") for t in eq}
        res.update(flag=True, why="equal", n=len(eq), pct=round(eqs, 1), fund=len(fs))
    return res

def ds_tokens(chain: str, addrs: list[str]) -> dict:
    out = {}
    for i in range(0, len(addrs), 30):
        try:
            with urllib.request.urlopen(urllib.request.Request(DS + chain + "/" + ",".join(addrs[i:i + 30]), headers={"User-Agent": UA["User-Agent"]}), timeout=15) as f: d = json.load(f)
        except Exception: continue
        for p in d or []:
            a = (p.get("baseToken") or {}).get("address")
            if not a: continue
            liq = (p.get("liquidity") or {}).get("usd") or 0
            if a.lower() in out and out[a.lower()]["liq"] >= liq: continue
            tx = p.get("txns") or {}; t24 = tx.get("h24") or {}
            out[a.lower()] = {"liq": liq, "vol24": (p.get("volume") or {}).get("h24"), "tx24": (t24.get("buys") or 0) + (t24.get("sells") or 0)}
    return out

def fv_of(vol24, tx24, gold_rk=()) -> dict:
    avg = (vol24 / tx24) if vol24 is not None and tx24 else None
    why = []
    if avg is not None and tx24 >= THR["fvMinTx"] and avg < THR["fvAvg"]: why.append("avg")
    if ("dust", "bad") in gold_rk: why.append("dust")
    if ("curve", "bad") in gold_rk: why.append("curve")
    return {"avg": round(avg, 1) if avg is not None else None, "tx24": tx24, "flag": bool(why), "why": why}

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--track", type=Path, default=Path("data/track_record.json"))
    ap.add_argument("--runner2", type=Path, default=Path("data/runner2.json"))
    ap.add_argument("--gold", type=Path, default=Path("data/gold.json"))
    ap.add_argument("--out", type=Path, default=Path("data/coin_checks.json"))
    ap.add_argument("--state", type=Path, default=Path(".kyvo_push/coin_checks_state.json"))
    ap.add_argument("--no-net", action="store_true", help="tests: no network (cached RugCheck only, no RPC / DexScreener / news)")
    ap.add_argument("--no-news", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    now = time.time(); nowms = int(now * 1000); deadline = now + BUDGET_S
    doc = H.load(a.out, {}); st = H.load(a.state, {})
    coins = {k: v for k, v in (doc.get("coins") or {}).items() if now - (v.get("at") or 0) / 1000 < KEEP_S}
    events = [e for e in doc.get("events") or [] if now - (e.get("at") or 0) / 1000 < EV_KEEP_S]
    wcache: dict = st.get("wallets") or {}; prev_tops: dict = st.get("tops") or {}; seen_news: dict = st.get("news") or {}; seen_vamp: dict = st.get("vamps") or {}
    before = json.dumps([coins, events], sort_keys=True)
    # candidates: {k_lower: {addr, chain, sym, name, src, rk}}
    cand: dict[str, dict] = {}
    def add(k, addr, chain, sym, name, src, rk=()):
        if not k or not addr: return
        k = str(k).lower(); e = cand.setdefault(k, {"addr": addr, "chain": chain or k.split(":")[0], "sym": sym, "name": name, "src": set(), "rk": set()})
        e["src"].add(src); e["rk"] |= set(rk)
    for c in (H.load(a.runner2, {}) or {}).get("coins") or []: add(c.get("k"), c.get("addr"), c.get("chain"), c.get("sym"), c.get("name"), "runner2")
    gold_cards: dict = {}
    for c in (H.load(a.gold, {}) or {}).get("cards") or []:
        if c.get("k"): gold_cards[str(c["k"]).lower()] = c
        add(c.get("k"), c.get("address"), c.get("chain"), c.get("symbol"), c.get("name"), "gold", [(r.get("key"), r.get("lvl")) for r in c.get("reasons") or []])
    for c in (H.load(a.track, {}) or {}).get("items") or []:
        if now - (c.get("at") or 0) / 1000 < 24 * 3600 and any(x in (c.get("kinds") or {}) for x in ("runner", "early", "leg2")):
            add(c.get("k"), c.get("addr"), c.get("chain"), c.get("sym"), c.get("name"), "runner")
    def ev(k, c, t, pl, en, url=None):
        events.append({"k": k, "sym": c.get("sym"), "t": t, "at": nowms, "pl": pl, "en": en, **({"url": url} if url else {})})
    # 1) fake volume (DexScreener batch, every run, all chains)
    if not a.no_net:
        by: dict = {}
        for k, c in cand.items():
            if now - ((coins.get(k) or {}).get("fvAt") or 0) / 1000 >= TTL_FV: by.setdefault(c["chain"], []).append(c["addr"])
        for ch, ads in by.items():
            for al, m in ds_tokens(ch, ads[:120]).items():
                k = f"{ch}:{al}"
                if k not in cand: continue
                e = coins.setdefault(k, {}); e["fv"] = fv_of(m["vol24"], m["tx24"], cand[k]["rk"]); e["fvAt"] = nowms; e["at"] = nowms
    for k, c in cand.items():   # Gold-only signals also without a DexScreener answer
        if c["rk"] & {("dust", "bad"), ("curve", "bad")} and not ((coins.get(k) or {}).get("fv") or {}).get("flag"):
            e = coins.setdefault(k, {"at": nowms}); old = e.get("fv") or {}; e["fv"] = fv_of(None, old.get("tx24"), c["rk"]) | {"avg": old.get("avg")}
    # 2) bundle + whale / dev sells (Solana, RugCheck top holders + public RPC)
    nb = 0; nrc = 0; stopped = None; deadline = time.time() + BUDGET_S   # budget starts here (DexScreener above is one batch call)
    order = sorted((k for k, c in cand.items() if k.startswith("solana:")), key=lambda k: (0 if "runner2" in cand[k]["src"] else 1 if "gold" in cand[k]["src"] else 2))
    for k in order:
        c = cand[k]; e = coins.get(k) or {}
        due = now - (e.get("bAt") or 0) / 1000 >= TTL_B
        r, net = None, False
        try: r, net = H.rc_report(c["addr"], True)   # shared cache first (holders.py / gold.py just fetched it)
        except H.RateLimited: pass
        if r is None and due and not a.no_net and nb < MAX_B and nrc < MAX_B + 2 and time.time() < deadline:
            nrc += 1
            try: r, net = H.rc_report(c["addr"], False)
            except H.RateLimited: stopped = "rugcheck 429"; break
        if r is None: continue
        tops = top_wallets(r)
        # whale / dev sells: compare with the previous look
        pt = prev_tops.get(k)
        cur = {t["o"]: round(t["pct"], 2) for t in tops[:10]}
        cr, crb = r.get("creator"), None
        try: crb = float(r.get("creatorBalance")) / (float((r.get("token") or {}).get("supply") or 0) or 1) * 100 if r.get("creatorBalance") is not None else None
        except (TypeError, ValueError): crb = None
        if pt:
            for o, p0 in (pt.get("t") or {}).items():
                p1 = cur.get(o)
                if p1 is None: p1 = next((t["pct"] for t in tops if t["o"] == o), 0.0)
                if p0 >= THR["sellPct"] and p0 - p1 >= THR["sellPct"] and p1 <= p0 * (1 - THR["sellDrop"]):
                    ev(k, c, "whale", f"🐋 ${c['sym']}: wieloryb sprzedał {p0 - p1:.1f}% podaży ({p0:.1f}% → {p1:.1f}%)", f"🐋 ${c['sym']}: a whale sold {p0 - p1:.1f}% of supply ({p0:.1f}% → {p1:.1f}%)")
            d0 = pt.get("dev")
            if d0 is not None and crb is not None and d0 >= THR["sellPct"] and d0 - crb >= THR["sellPct"] and crb <= d0 * (1 - THR["sellDrop"]):
                ev(k, c, "dev", f"🧑‍💻 ${c['sym']}: dev sprzedał ({d0:.1f}% → {crb:.1f}% podaży)", f"🧑‍💻 ${c['sym']}: the dev sold ({d0:.1f}% → {crb:.1f}% of supply)")
        if tops: prev_tops[k] = {"t": cur, "dev": round(crb, 2) if crb is not None else None, "at": nowms}
        if not due or a.no_net or nb >= MAX_B or time.time() > deadline or not tops: continue
        try: b = bundle_check(tops, wcache, deadline)
        except RateLimited: stopped = "rpc 429"; break
        if b is None: stopped = stopped or "time"; continue
        nb += 1; e = coins.setdefault(k, {}); e["b"] = b; e["bAt"] = nowms; e["at"] = nowms
    # 3) news + vamps. Gold coins: read from their Gold card (gold.py already fetched them, no extra request).
    #    Runner 2.0 / Runner coins: tools/gold.py helpers (Google News RSS + DexScreener search), ≤ 4 uncached coins per run.
    def news_vamps(k, c, nw, cp):
        for it in (nw or {}).get("items") or []:
            hk = hashlib.sha1((k + it.get("t", "")).encode()).hexdigest()[:12]
            if hk in seen_news: continue
            seen_news[hk] = nowms
            if k in seen_news.get("_seeded", []): ev(k, c, "news", f"📰 ${c['sym']}: nowy artykuł — {it.get('t', '')[:90]}", f"📰 ${c['sym']}: new article — {it.get('t', '')[:90]}", it.get("url"))
        for v in (cp or {}).get("over500k") or []:
            vk = k + ":" + str(v.get("address"))
            if vk in seen_vamp: continue
            seen_vamp[vk] = nowms
            if k in seen_news.get("_seeded", []): ev(k, c, "vamp", f"🧛 ${c['sym']}: kopia ${v.get('symbol')} ma już MC {round((v.get('mcap') or 0) / 1e3)}K", f"🧛 ${c['sym']}: copy ${v.get('symbol')} passed {round((v.get('mcap') or 0) / 1e3)}K MC", v.get("url"))
        sd = seen_news.setdefault("_seeded", [])
        if k not in sd: sd.append(k)   # first look = baseline (old articles / copies are not 'new')
    for k, c in cand.items():
        g = gold_cards.get(k)
        if g and (g.get("news") is not None or g.get("copies") is not None): news_vamps(k, c, g.get("news"), g.get("copies"))
    if not a.no_net and not a.no_news:
        try:
            import gold as G
            gc = G.Cache(a.state.parent / "coin_checks_gold_cache.json"); nn = 0
            for k, c in cand.items():
                if k in gold_cards or nn >= 4 or time.time() > deadline + 20: continue
                cc = {"chain": c["chain"], "address": c["addr"], "symbol": c.get("sym") or "", "name": c.get("name") or "", "mcap": None, "age_h": None}
                cached = gc.get(f"copies:{c['chain']}:{c['addr']}", G.SLOW_EVERY - 60) is not None
                if not cached: nn += 1
                news_vamps(k, c, G.news(cc, gc), G.copies(cc, gc))
            gc.save()
        except Exception as ex: print("coin_checks: news/vamps skipped:", ex)
    events = sorted(events, key=lambda e: -e["at"])[:MAX_EV]
    nbf = sum(1 for v in coins.values() if (v.get("b") or {}).get("flag")); nfv = sum(1 for v in coins.values() if (v.get("fv") or {}).get("flag"))
    print(f"coin_checks: {len(cand)} candidates, {nb} bundle checks ({NCALL[0]} RPC calls){', stopped: ' + stopped if stopped else ''}, {len(coins)} coins, ⚠️ bundle {nbf}, ⚠️ fake volume {nfv}, {len(events)} events")
    if a.dry_run: return 0
    changed = json.dumps([coins, events], sort_keys=True) != before
    out = {"v": 836, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)), "thr": THR,
           "note": "🧪 v8.36: b = bundle / wallet-factory check (top 20 holders' first funders, public Solana RPC), fv = fake volume (avg trade = vol24 / txns24, Gold dust / one-buy curve), events = whale / dev sells, new articles, copies > $500K (for the watchlist alerts). tools/coin_checks.py",
           "coins": dict(sorted(coins.items(), key=lambda kv: -(kv[1].get("at") or 0))[:600]), "events": events}
    a.out.parent.mkdir(parents=True, exist_ok=True); a.out.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    cut = now - 3 * 86400
    st = {"wallets": dict(list(wcache.items())[-20000:]), "tops": {k: v for k, v in prev_tops.items() if (v.get("at") or 0) / 1000 > cut},
          "news": {k: v for k, v in seen_news.items() if k == "_seeded" or (isinstance(v, int) and v / 1000 > cut)}, "vamps": {k: v for k, v in seen_vamp.items() if v / 1000 > cut}}
    st["news"]["_seeded"] = (st["news"].get("_seeded") or [])[-800:]
    a.state.parent.mkdir(parents=True, exist_ok=True); a.state.write_text(json.dumps(st))
    go = os.environ.get("GITHUB_OUTPUT")
    if go and changed:
        with open(go, "a") as fh: fh.write("checks_new=true\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
