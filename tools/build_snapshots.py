#!/usr/bin/env python3
"""Kyvo v7.2 snapshot builder: data/smart_money.json + data/leaderboard.json.

Public data only, no API keys:
  - Solana public RPC: getSignaturesForAddress (paginated) + getTransaction (jsonParsed)
  - DexScreener: token symbol/name/price
  - Binance public data API (data-api.binance.vision): hourly SOLUSDT for historical SOL pricing
    (fallback: CoinGecko public market_chart; last fallback: current SOL price, labelled)

Incremental cache in tools/cache/ (not bundled): per-wallet signatures + parsed legs.
Later runs only fetch new signatures (`until` = newest cached) and new transactions.

Usage:
  python3 tools/build_snapshots.py                 # full / incremental (auto)
  python3 tools/build_snapshots.py --max-sigs 500 --days 30 --workers 6
  python3 tools/build_snapshots.py --no-cache      # ignore cache (cold run)
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import threading
import time
import urllib.error
import urllib.request
from bisect import bisect_right
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WALLETS_PATH = ROOT / "tools" / "wallets_public.json"
CACHE_DIR = ROOT / "tools" / "cache"
OUT_SM = ROOT / "data" / "smart_money.json"
OUT_LB = ROOT / "data" / "leaderboard.json"
DS = "https://api.dexscreener.com"
MAINNET = "https://api.mainnet-beta.solana.com"   # only free endpoint with deep (archival) history; ~4 getTransaction/s
RECENT = "https://solana-rpc.publicnode.com"       # fast, but only ~last 24h of transactions
SIG_RPC = MAINNET
TX_RPCS = [MAINNET]
RECENT_HORIZON = 20 * 3600
UA = "Mozilla/5.0 KyvoSnapshot/7.1 (public research; no key)"

WSOL = "So11111111111111111111111111111111111111112"
USD_MINTS = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11MCCe8BenwNYB",  # USDT
    "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",  # USD1
}
QUOTE_MINTS = {WSOL} | USD_MINTS
MIN_SOL_LEG = 0.005  # ignore pure-fee noise
CACHE_VERSION = 2


# ---------------------------------------------------------------- HTTP / RPC
class RateLimiter:
    def __init__(self, per_sec: float):
        self.interval = 1.0 / per_sec
        self.lock = threading.Lock()
        self.next_t = 0.0

    def wait(self):
        with self.lock:
            now = time.monotonic()
            t = max(now, self.next_t)
            self.next_t = t + self.interval
        d = t - time.monotonic()
        if d > 0:
            time.sleep(d)


LIMITERS = {
    (MAINNET, "getTransaction"): RateLimiter(3.6),
    (MAINNET, "getSignaturesForAddress"): RateLimiter(3.0),
    (RECENT, "getTransaction"): RateLimiter(25.0),
}
DEADLINE = [None]  # monotonic deadline for tx fetching (time budget)
STATS = defaultdict(int)
STATS_LOCK = threading.Lock()


def bump(k, n=1):
    with STATS_LOCK:
        STATS[k] += n


def http_json(url, data=None, timeout=45):
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": UA},
        method="GET" if body is None else "POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def rpc(method, params, url=None, tries=6):
    urls = [url] if url else TX_RPCS
    delay = 1.0
    last = None
    for attempt in range(tries):
        u = urls[attempt % len(urls)]
        LIMITERS.get((u, method), LIMITERS[(MAINNET, "getTransaction")]).wait()
        try:
            bump("rpc_calls")
            d = http_json(u, {"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
            if "error" in d:
                last = d["error"]
                code = (d["error"] or {}).get("code")
                if code in (429, -32429, -32005):
                    bump("rpc_429")
                    time.sleep(delay + random.random())
                    delay = min(delay * 2, 20)
                    continue
                raise RuntimeError(f"rpc error {d['error']}")
            return d.get("result")
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:
                bump("rpc_429")
                ra = e.headers.get("Retry-After")
                time.sleep(float(ra) if ra and ra.isdigit() else delay + random.random())
                delay = min(delay * 2, 20)
                continue
            if e.code in (403, 500, 502, 503, 504):
                time.sleep(delay)
                delay = min(delay * 2, 20)
                continue
            raise
        except Exception as e:  # timeouts etc
            last = e
            time.sleep(delay)
            delay = min(delay * 2, 20)
    raise RuntimeError(f"RPC {method} failed after {tries}: {last}")


# ---------------------------------------------------------------- SOL price history
class SolPrice:
    def __init__(self, current):
        self.ts = []
        self.px = []
        self.current = current
        self.source = "current (fallback)"

    def load(self, days):
        try:
            limit = min(1000, days * 24 + 48)
            rows = http_json(f"https://data-api.binance.vision/api/v3/klines?symbol=SOLUSDT&interval=1h&limit={limit}")
            pts = [(int(r[0]) // 1000, (float(r[1]) + float(r[4])) / 2) for r in rows]
            self._set(pts, "Binance SOLUSDT 1h (data-api.binance.vision)")
            return
        except Exception as e:
            print("  warn binance klines", e, file=sys.stderr)
        try:
            d = http_json(f"https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days={days + 1}")
            pts = [(int(p[0]) // 1000, float(p[1])) for p in d.get("prices") or []]
            self._set(pts, "CoinGecko market_chart hourly")
        except Exception as e:
            print("  warn coingecko", e, file=sys.stderr)

    def _set(self, pts, src):
        pts.sort()
        if pts:
            self.ts = [p[0] for p in pts]
            self.px = [p[1] for p in pts]
            self.source = src

    def at(self, t):
        if not self.ts or t is None:
            return self.current, False
        i = bisect_right(self.ts, t) - 1
        if i < 0:
            return self.px[0], True
        if t - self.ts[i] > 3 * 3600 and i == len(self.ts) - 1:
            return self.current or self.px[i], True
        return self.px[i], True


# ---------------------------------------------------------------- cache
def cache_path(wallet):
    return CACHE_DIR / f"{wallet}.json"


def load_cache(wallet, use_cache):
    if not use_cache:
        return {"v": CACHE_VERSION, "sigs": [], "legs": {}}
    p = cache_path(wallet)
    if p.exists():
        try:
            d = json.loads(p.read_text())
            if d.get("v") == CACHE_VERSION:
                return d
        except Exception:
            pass
    return {"v": CACHE_VERSION, "sigs": [], "legs": {}}


def save_cache(wallet, d):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = cache_path(wallet).with_suffix(".tmp")
    tmp.write_text(json.dumps(d, separators=(",", ":")))
    tmp.replace(cache_path(wallet))


# ---------------------------------------------------------------- parsing
def parse_legs(wallet, tx):
    """Return list of legs: {mint, tok, sol, usd} for a single tx (wallet perspective).

    sol = native SOL + WSOL delta (fee added back if wallet paid it); usd = stablecoin delta.
    Quote is assigned only when exactly one non-quote mint changed (clean swap)."""
    meta = tx.get("meta") or {}
    if meta.get("err"):
        return []
    keys = [x["pubkey"] if isinstance(x, dict) else x for x in tx["transaction"]["message"]["accountKeys"]]
    if wallet not in keys:
        return []
    idx = keys.index(wallet)
    native = (meta["postBalances"][idx] - meta["preBalances"][idx]) / 1e9
    if idx == 0:
        native += (meta.get("fee") or 0) / 1e9

    def bal(rows):
        out = defaultdict(float)
        for b in rows or []:
            if b.get("owner") != wallet:
                continue
            out[b["mint"]] += float(b["uiTokenAmount"].get("uiAmount") or 0)
        return out

    pre, post = bal(meta.get("preTokenBalances")), bal(meta.get("postTokenBalances"))
    deltas = {}
    for m in set(pre) | set(post):
        d = post.get(m, 0.0) - pre.get(m, 0.0)
        if abs(d) > 1e-12:
            deltas[m] = d
    sol = native + deltas.pop(WSOL, 0.0)
    usd = 0.0
    for m in list(deltas):
        if m in USD_MINTS:
            usd += deltas.pop(m)
    if abs(sol) < MIN_SOL_LEG:
        sol = 0.0
    if not deltas:
        return []
    if len(deltas) == 1:
        (m, d), = deltas.items()
        return [{"mint": m, "tok": d, "sol": sol, "usd": usd}]
    # multi-token tx (routes / batch): record without quote (activity only)
    return [{"mint": m, "tok": d, "sol": 0.0, "usd": 0.0, "multi": 1} for m, d in deltas.items()]


def fetch_tx(sig, block_time=None):
    params = [sig, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 1, "commitment": "confirmed"}]
    if block_time and time.time() - block_time < RECENT_HORIZON:
        try:
            r = rpc("getTransaction", params, url=RECENT, tries=2)
            if r:
                bump("tx_recent")
                return r
        except Exception:
            pass
    if DEADLINE[0] and time.monotonic() > DEADLINE[0]:
        bump("tx_skipped_budget")
        raise TimeoutError("time budget")
    bump("tx_mainnet")
    return rpc("getTransaction", params, url=MAINNET)


# ---------------------------------------------------------------- per-wallet sync
SPAM_MAX_SIGS = 500
MAX_SCAN_SIGS = 5000


def sync_sigs(w, max_sigs, since_ts, use_cache):
    """Phase A: update signature list (cheap). Returns state dict with cache + needed tx list."""
    addr = w["address"]
    c = load_cache(addr, use_cache)
    cached = c["sigs"]  # newest first: [sig, blockTime, err]
    known = {s[0] for s in cached}
    new = []
    reached = False
    before = None
    until = cached[0][0] if cached else None
    while True:
        opts = {"limit": 1000}
        if before:
            opts["before"] = before
        if until:
            opts["until"] = until
        try:
            page = rpc("getSignaturesForAddress", [addr, opts], url=SIG_RPC) or []
        except Exception as e:  # keep the cache intact; this wallet just isn't extended this run
            print(f"  ! sig sync failed for {w.get('name')}: {str(e)[:80]} (cache kept)")
            new, reached = [], True
            break
        if not page:
            reached = True  # nothing (more) newer than the cached head
            break
        stop = False
        for s in page:
            if s["signature"] in known:
                stop = True
                break
            new.append([s["signature"], s.get("blockTime"), 1 if s.get("err") else 0])
        if stop or len(page) < opts["limit"]:
            reached = True
            break
        if len(new) >= MAX_SCAN_SIGS:
            break
        if page[-1].get("blockTime") and page[-1]["blockTime"] < since_ts:
            reached = True  # everything older is outside the window anyway
            break
        before = page[-1]["signature"]
    # If we stopped before reaching the cached head there is a gap: drop the old list
    # (its parsed legs stay in c["legs"], so nothing is re-fetched) and page down again.
    sigs = new + cached if (reached or not cached) else list(new)
    # Adaptive depth: wallets flooded by dust/airdrop spam (inbound token, no quote leg)
    # get up to SPAM_MAX_SIGS successful signatures; failed signatures are free to skip
    # (no getTransaction), so depth counts only successful ones.
    L = [l for v in c["legs"].values() for l in v]
    spam = sum(1 for l in L if not l.get("sol") and not l.get("usd"))
    if L and spam / len(L) > 0.6:
        max_sigs = max(max_sigs, SPAM_MAX_SIGS)

    def ok_count(lst):
        return sum(1 for x in lst if not x[2])

    def depth_ok(lst):
        return (ok_count(lst) >= max_sigs or len(lst) >= MAX_SCAN_SIGS
                or (lst and lst[-1][1] and lst[-1][1] < since_ts))
    while sigs and not depth_ok(sigs):
        try:
            page = rpc("getSignaturesForAddress", [addr, {"limit": 1000, "before": sigs[-1][0]}], url=SIG_RPC) or []
        except Exception:
            break
        if not page:
            break
        sigs.extend([s["signature"], s.get("blockTime"), 1 if s.get("err") else 0] for s in page)
        if len(page) < 1000:
            break
    trimmed, ok = [], 0
    for x in sigs:
        if x[1] and x[1] < since_ts:
            break
        if not x[2]:
            if ok >= max_sigs:
                break
            ok += 1
        trimmed.append(x)
        if len(trimmed) >= MAX_SCAN_SIGS:
            break
    sigs = trimmed
    c["sigs"] = sigs
    if not sigs and cached:
        sigs = cached  # safety: never wipe a cache because of an empty/failed RPC answer
    c["sigs"] = sigs
    # Prune parsed legs only when they are provably outside the window (never because of a gap).
    times = {x[0]: x[1] for x in cached}
    times.update({x[0]: x[1] for x in sigs})
    c["legs"] = {k: v for k, v in c["legs"].items() if not (times.get(k) and times[k] < since_ts)}
    need = [(s[0], s[1]) for s in sigs if not s[2] and s[0] not in c["legs"]]
    return {"w": w, "c": c, "new_sigs": len(new), "need": need, "fetched": 0}


def finalize(st, use_cache):
    c = st["c"]
    addr = st["w"]["address"]
    if use_cache:
        save_cache(addr, c)
    sigs = c["sigs"]
    bt = {s[0]: s[1] for s in sigs}
    events = []
    for sig, legs in c["legs"].items():
        if sig not in bt:
            continue
        for L in legs:
            events.append(dict(L, sig=sig, t=bt.get(sig)))
    events.sort(key=lambda e: e["t"] or 0)
    return {
        "events": events, "sigs": len(sigs), "new_sigs": st["new_sigs"], "fetched_tx": st["fetched"],
        "missing_tx": len([s for s in sigs if not s[2] and s[0] not in c["legs"]]),
        "oldest": sigs[-1][1] if sigs else None,
    }


# ---------------------------------------------------------------- metadata
def dex_info(mints):
    out = {}
    uniq = [m for m in dict.fromkeys(mints) if m]
    for i in range(0, len(uniq), 30):
        chunk = uniq[i:i + 30]
        try:
            d = http_json(DS + "/latest/dex/tokens/" + ",".join(chunk))
        except Exception as e:
            print("  warn dexscreener", e, file=sys.stderr)
            time.sleep(1)
            continue
        for p in d.get("pairs") or []:
            if p.get("chainId") != "solana":
                continue
            bt = p.get("baseToken") or {}
            m = bt.get("address")
            liq = (p.get("liquidity") or {}).get("usd") or 0
            if not m or (m in out and out[m]["_liq"] >= liq):
                continue
            out[m] = {
                "symbol": bt.get("symbol") or "???", "name": bt.get("name") or bt.get("symbol") or "Unknown",
                "priceUsd": float(p["priceUsd"]) if p.get("priceUsd") else None, "_liq": liq,
            }
        time.sleep(0.25)
    for v in out.values():
        v.pop("_liq", None)
    return out


# ---------------------------------------------------------------- PnL
def leg_usd(e, solpx):
    """USD value of quote side (positive number) and whether historical price was used."""
    px, hist = solpx.at(e["t"])
    v = abs(e["sol"]) * (px or 0) + abs(e["usd"])
    return (v if v > 0 else None), hist


def compute_pnl(events, solpx, now_ts):
    """FIFO per mint. A sell is 'matched' when we hold enough cost basis from observed buys."""
    lots = defaultdict(list)  # mint -> [[tok, usd_cost]]
    closed = []  # {t, pnl, mint}
    unmatched_sells = 0
    priced_hist = priced_cur = 0
    for e in events:
        if e.get("multi"):
            continue
        tok = e["tok"]
        if tok > 0 and (e["sol"] < 0 or e["usd"] < 0):  # buy
            v, hist = leg_usd(e, solpx)
            if v is None:
                continue
            priced_hist += hist
            priced_cur += (not hist)
            lots[e["mint"]].append([tok, v])
        elif tok < 0 and (e["sol"] > 0 or e["usd"] > 0):  # sell
            v, hist = leg_usd(e, solpx)
            if v is None:
                continue
            priced_hist += hist
            priced_cur += (not hist)
            need = -tok
            cost = 0.0
            matched = 0.0
            q = lots[e["mint"]]
            while need > 1e-12 and q:
                lt = q[0]
                take = min(need, lt[0])
                frac = take / lt[0]
                cost += lt[1] * frac
                lt[1] -= lt[1] * frac
                lt[0] -= take
                need -= take
                matched += take
                if lt[0] <= 1e-12:
                    q.pop(0)
            if matched <= 0:
                unmatched_sells += 1
                continue
            share = matched / (-tok)
            # only count if ≥50% of the sell is matched to observed buys (else basis unknown)
            if share < 0.5:
                unmatched_sells += 1
                continue
            closed.append({"t": e["t"], "pnl": v * share - cost, "mint": e["mint"], "sig": e.get("sig"),
                           "proceeds": v * share, "cost": cost})
        elif tok < 0:
            # transfer out without proceeds: drop basis proportionally (not a realized trade)
            need = -tok
            q = lots[e["mint"]]
            while need > 1e-12 and q:
                lt = q[0]
                take = min(need, lt[0])
                lt[1] -= lt[1] * take / lt[0]
                lt[0] -= take
                need -= take
                if lt[0] <= 1e-12:
                    q.pop(0)

    def win(since):
        rows = [c for c in closed if c["t"] and c["t"] >= since]
        if not rows:
            return {"realized_pnl_usd": None, "trades": 0, "wins": None, "win_rate": None,
                    "note": "Brak sprzedaży z dopasowanym kosztem zakupu w tym oknie."}
        wins = sum(1 for c in rows if c["pnl"] > 0)
        return {"realized_pnl_usd": round(sum(c["pnl"] for c in rows), 2), "trades": len(rows),
                "wins": wins, "win_rate": round(wins / len(rows), 3),
                "note": "FIFO z publicznych transakcji RPC; SOL wyceniany historycznie (1h)."}

    stats = {k: win(now_ts - d * 86400) for k, d in (("1d", 1), ("7d", 7), ("30d", 30))}
    stats["_closed"] = closed
    pos = []
    for m, q in lots.items():
        tok = sum(l[0] for l in q)
        cost = sum(l[1] for l in q)
        if tok > 1e-9 and cost > 0.5:
            pos.append({"mint": m, "tok": tok, "cost_usd": round(cost, 2)})
    pos.sort(key=lambda x: -x["cost_usd"])
    stats["_positions"] = pos[:25]
    vol = {}
    for k, d in (("1d", 1), ("7d", 7), ("30d", 30)):
        tot = 0.0
        for e in events:
            if e.get("multi") or not e.get("t") or e["t"] < now_ts - d * 86400:
                continue
            if (e["tok"] > 0 and (e["sol"] < 0 or e["usd"] < 0)) or (e["tok"] < 0 and (e["sol"] > 0 or e["usd"] > 0)):
                v, _ = leg_usd(e, solpx)
                tot += v or 0
        vol[k] = round(tot, 2)
    stats["_volume"] = vol
    return stats, {"unmatched_sells": unmatched_sells, "closed": len(closed),
                   "priced_hist": priced_hist, "priced_current": priced_cur}


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wallets", type=Path, default=WALLETS_PATH)
    ap.add_argument("--max-sigs", type=int, default=300)
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--budget-min", type=float, default=13.0, help="stop fetching new tx after N minutes (cache resumes next run)")
    ap.add_argument("--wallet-workers", type=int, default=3)
    ap.add_argument("--no-cache", action="store_true")
    args = ap.parse_args()

    t0 = time.time()
    DEADLINE[0] = time.monotonic() + args.budget_min * 60
    wallets = json.loads(args.wallets.read_text())
    if isinstance(wallets, dict):
        wallets = wallets.get("wallets", [])
    now = datetime.now(timezone.utc)
    now_ts = int(now.timestamp())
    since_ts = now_ts - args.days * 86400
    upd = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    upd_w = now.astimezone(timezone(timedelta(hours=2))).strftime("%Y-%m-%dT%H:%M:%S+02:00")

    cur = None
    try:
        for p in http_json(DS + "/latest/dex/tokens/" + WSOL).get("pairs") or []:
            if p.get("chainId") == "solana" and p.get("priceUsd"):
                cur = float(p["priceUsd"])
                break
    except Exception as e:
        print("warn SOL price", e, file=sys.stderr)
    solpx = SolPrice(cur)
    solpx.load(args.days)
    print(f"Wallets {len(wallets)} · max_sigs {args.max_sigs} · {args.days}d · SOL now {cur} · hist: {solpx.source} ({len(solpx.ts)} pts)")

    use_cache = not args.no_cache
    # Phase A: signatures (gentle parallelism)
    def sig_job(w):
        try:
            return sync_sigs(w, args.max_sigs, since_ts, use_cache)
        except Exception as e:
            print(f"  ! sigs {w['name']}: {e}", file=sys.stderr)
            return {"w": w, "c": load_cache(w["address"], use_cache), "new_sigs": 0, "need": [], "fetched": 0}
    with ThreadPoolExecutor(args.wallet_workers) as wp:
        states = list(wp.map(sig_job, wallets))
    total_need = sum(len(st["need"]) for st in states)
    print(f"Phase A done {round(time.time()-t0,1)}s · tx to fetch: {total_need} (cached legs reused)")

    # Phase B: round-robin over wallets, newest first, so every wallet gets coverage under the time budget
    queues = [list(st["need"]) for st in states]
    order = []
    i = 0
    while any(queues):
        for qi, q in enumerate(queues):
            if q:
                order.append((qi, q.pop(0)))
        i += 1
    lock = threading.Lock()
    last_save = [time.time()]

    def tx_job(item):
        qi, (sig, bt0) = item
        st = states[qi]
        try:
            tx = fetch_tx(sig, bt0)
            legs = parse_legs(st["w"]["address"], tx) if tx else None
        except Exception:
            legs = None
        if legs is not None:
            with lock:
                st["c"]["legs"][sig] = legs
                st["fetched"] += 1
                if use_cache and time.time() - last_save[0] > 60:
                    last_save[0] = time.time()
                    for s2 in states:
                        save_cache(s2["w"]["address"], s2["c"])
        return 1

    done = 0
    with ThreadPoolExecutor(args.workers) as tp:
        for _ in tp.map(tx_job, order):
            done += 1
            if done % 500 == 0:
                print(f"  … {done}/{len(order)} tx · {round(time.time()-t0)}s · recent {STATS['tx_recent']} mainnet {STATS['tx_mainnet']} 429 {STATS['rpc_429']}", flush=True)

    results = {}
    for st in states:
        r = finalize(st, use_cache)
        results[st["w"]["address"]] = r
        print(f"  {st['w']['name']:<18} sigs={r['sigs']:<4} new={r['new_sigs']:<4} tx_fetched={r['fetched_tx']:<4} missing={r['missing_tx']:<4} legs={len(r['events'])}")

    pnl_cache = {w["address"]: compute_pnl(results[w["address"]]["events"], solpx, now_ts) for w in wallets}
    recent_trades = {}
    for w in wallets:
        r = results[w["address"]]
        rows = []
        for c in pnl_cache[w["address"]][0]["_closed"]:
            rows.append({"side": "sell", "mint": c["mint"], "t": c["t"], "pnl_usd": round(c["pnl"], 2),
                         "usd": round(c["proceeds"], 2), "cost_usd": round(c["cost"], 2), "sig": c["sig"]})
        for e in r["events"]:
            if e.get("multi") or not (e["tok"] > 0 and (e["sol"] < 0 or e["usd"] < 0)):
                continue
            v, _ = leg_usd(e, solpx)
            if v is None:
                continue
            rows.append({"side": "buy", "mint": e["mint"], "t": e["t"], "usd": round(v, 2), "sig": e["sig"]})
        rows.sort(key=lambda x: x["t"] or 0, reverse=True)
        recent_trades[w["address"]] = rows[:15]
    mints = [e["mint"] for r in results.values() for e in r["events"] if e["t"] and e["t"] >= now_ts - 3 * 86400]
    mints += [t["mint"] for rows in recent_trades.values() for t in rows]
    mints += [p_["mint"] for v_ in pnl_cache.values() for p_ in v_[0]["_positions"]]
    info = dex_info(list(dict.fromkeys(mints)))

    # ---------------- smart money feed (last 72h, capped) ----------------
    activity = []
    for w in wallets:
        for e in results[w["address"]]["events"]:
            if not e["t"] or e["t"] < now_ts - 3 * 86400:
                continue
            side = "buy" if e["tok"] > 0 else "sell"
            if not e.get("multi") and e["sol"] == 0 and e["usd"] == 0:
                continue  # transfer, not a trade
            v, _ = leg_usd(e, solpx) if not e.get("multi") else (None, False)
            m = info.get(e["mint"]) or {}
            activity.append({
                "wallet_id": w["id"], "wallet_name": w["name"], "handle": w.get("handle"), "wallet": w["address"],
                "mint": e["mint"], "symbol": m.get("symbol"), "name": m.get("name"), "side": side,
                "sol_size": round(abs(e["sol"]), 3) if e["sol"] else None,
                "usd_size": round(v, 2) if v else None,
                "block_time": e["t"], "signature": e["sig"], "tx_url": f"https://solscan.io/tx/{e['sig']}",
            })
    activity.sort(key=lambda a: a["block_time"] or 0, reverse=True)
    by_mint = defaultdict(list)
    for a in activity:
        if a["side"] == "buy" and len(by_mint[a["mint"]]) < 8:
            by_mint[a["mint"]].append({k: a[k] for k in ("wallet_id", "wallet_name", "handle", "wallet", "usd_size", "sol_size", "block_time", "tx_url")})
    sm = {
        "updated_at": upd, "updated_at_warsaw": upd_w,
        "source": "Public Solana RPC + DexScreener; SOL priced via " + solpx.source + ". No keys.",
        "note": "Not financial advice. Window: last 72h of observed swaps.",
        "sol_price_usd": cur,
        "wallets": [{k: w.get(k) for k in ("id", "name", "handle", "address", "source", "source_note")} for w in wallets],
        "activity": activity[:400],
        "by_mint": dict(by_mint),
    }
    OUT_SM.parent.mkdir(parents=True, exist_ok=True)
    OUT_SM.write_text(json.dumps(sm, ensure_ascii=False, separators=(",", ":")) + "\n")

    # ---------------- leaderboard ----------------
    leaders = []
    covered = 0
    for w in wallets:
        r = results[w["address"]]
        full, diag = pnl_cache[w["address"]]
        stats = {k: v for k, v in full.items() if not k.startswith("_")}
        closed_c = [{"t": c["t"], "p": round(c["pnl"], 2), "m": c["mint"], "u": round(c["proceeds"], 2)}
                    for c in full["_closed"] if c["t"]][-300:]
        positions = []
        for p_ in full["_positions"]:
            m = info.get(p_["mint"]) or {}
            positions.append(dict(p_, tok=float("%.6g" % p_["tok"]), symbol=m.get("symbol"), name=m.get("name")))
        trades = []
        for t in recent_trades[w["address"]]:
            m = info.get(t["mint"]) or {}
            trades.append(dict(t, symbol=m.get("symbol"), name=m.get("name")))
        if any(stats[k]["realized_pnl_usd"] is not None for k in stats):
            covered += 1
        avatar = f"data/avatars/{w['id']}.jpg"
        leaders.append({
            "id": w["id"], "name": w["name"], "handle": w.get("handle"), "address": w["address"],
            "source": w.get("source"), "source_note": w.get("source_note"),
            "avatar": avatar if w.get("handle") and (ROOT / avatar).exists() else None,
            "x_url": f"https://x.com/{w['handle']}" if w.get("handle") else None,
            "stats": stats,
            "recent_trades": trades,
            "closed": closed_c,
            "positions": positions,
            "volume_usd": full["_volume"],
            "recent_buys_1d": sum(1 for e in r["events"] if e["tok"] > 0 and (e["sol"] < 0 or e["usd"] < 0) and e["t"] and e["t"] >= now_ts - 86400),
            "coverage": {
                "sigs": r["sigs"], "oldest_ts": r["oldest"],
                "window_days": round((now_ts - r["oldest"]) / 86400, 1) if r["oldest"] else None,
                "missing_tx": r["missing_tx"], **diag,
            },
        })

    def key(L):
        p = L["stats"]["7d"]["realized_pnl_usd"]
        p30 = L["stats"]["30d"]["realized_pnl_usd"]
        return (p is not None, p if p is not None else (p30 if p30 is not None else -1e18))
    leaders.sort(key=key, reverse=True)
    lb = {
        "updated_at": upd, "updated_at_warsaw": upd_w, "source": sm["source"],
        "note": ("Realized PnL = FIFO on observed swaps (≤%d sigs or %dd per wallet). Sells whose buys happened "
                 "before the window are excluded. SOL legs priced with hourly historical SOL/USD. Approximate." % (args.max_sigs, args.days)),
        "wallets_count": len(wallets), "wallets_with_pnl": covered,
        "params": {"max_sigs": args.max_sigs, "days": args.days},
        "leaders": leaders,
    }
    OUT_LB.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n")
    el = round(time.time() - t0, 1)
    print(f"Done in {el}s · PnL coverage {covered}/{len(wallets)} · rpc calls {STATS['rpc_calls']} · 429s {STATS['rpc_429']} "
          f"· tx recent {STATS['tx_recent']} mainnet {STATS['tx_mainnet']} skipped(budget) {STATS['tx_skipped_budget']}")
    print("Wrote", OUT_SM, OUT_SM.stat().st_size, "B ·", OUT_LB, OUT_LB.stat().st_size, "B")


if __name__ == "__main__":
    main()
