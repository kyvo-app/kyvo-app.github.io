#!/usr/bin/env python3
"""Kyvo v8.9 research: replay the 📈 Big runner rule ($1M–$100M established coins) on GeckoTerminal hourly candles.

Candidates: Solana + BSC pools from GeckoTerminal trending (1h / 6h / 24h) and top 24h volume (free public API).
For every hour of the last ~48 h: h1 / h6 price change, volume of the hour vs the average of the 24 h before it,
MC at that hour (= MC now × close then / close now). First trigger per coin per 24 h is counted.
Outcome: max high within the next 8 h and close 8 h later vs the trigger close. Liquidity, txns and unique buyers are
NOT in candles (live-only gates) → the per-day count is an upper bound for those gates; survivors are over-represented.
Usage: python3 tools/big_runner_research.py [--out /tmp/big.json]
"""
from __future__ import annotations
import argparse, json, time, urllib.request
GT = "https://api.geckoterminal.com/api/v2"
UA = {"User-Agent": "kyvo-research/8.9", "Accept": "application/json"}
def get(u):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(20); continue
            return None
        except Exception: time.sleep(3)
    return None
def gt(u):
    d = get(u); time.sleep(2.2); return d
def pools(net):
    out = {}
    urls = [f"{GT}/networks/{net}/trending_pools?duration={d}&page={p}" for d in ("1h", "6h", "24h") for p in (1, 2)]
    urls += [f"{GT}/networks/{net}/pools?sort=h24_volume_usd_desc&page={p}" for p in (1, 2, 3)]
    for u in urls:
        for p in ((gt(u) or {}).get("data") or []):
            a = p.get("attributes") or {}
            mc = float(a.get("market_cap_usd") or a.get("fdv_usd") or 0)
            liq = float(a.get("reserve_in_usd") or 0)
            born = a.get("pool_created_at")
            tok = (((p.get("relationships") or {}).get("base_token") or {}).get("data") or {}).get("id", "").split("_", 1)[-1]
            if 5e5 <= mc <= 2e8 and tok and tok.lower() not in STABLE:
                out[a["address"]] = {"net": net, "pool": a["address"], "name": a.get("name"), "mc": mc, "liq": liq, "born": born, "tok": tok}
    return out
RAW: dict = {}
STABLE = {"so11111111111111111111111111111111111111112", "epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v", "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
          "0x55d398326f99059ff775485246999027b3197955", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb"}
def replay(p, T):
    d = gt(f"{GT}/networks/{p['net']}/pools/{p['pool']}/ohlcv/hour?aggregate=1&limit=80&currency=usd&token={p['tok']}")
    rows = sorted((((d or {}).get("data") or {}).get("attributes") or {}).get("ohlcv_list") or [], key=lambda r: r[0])
    RAW[p["pool"]] = {"p": p, "rows": rows}
    return hits_of(p, rows, T)
def hits_of(p, rows, T):
    if len(rows) < 32: return []
    last = rows[-1][4]; hits = []; cool = 0
    for i in range(30, len(rows)):
        t, o, h, l, c, v = rows[i]
        if t < cool: continue
        mc = p["mc"] * c / last if last else 0
        h1 = (c / rows[i - 1][4] - 1) * 100 if rows[i - 1][4] else 0
        h6 = (c / rows[i - 6][4] - 1) * 100 if rows[i - 6][4] else 0
        avg = sum(r[5] for r in rows[i - 24:i]) / 24
        acc = v / avg if avg > 0 else 0
        if not (T["mcMin"] <= mc <= T["mcMax"]): continue
        if v < max(T["vol1h"], T["volMc"] * mc): continue
        if acc < T["acc"]: continue
        if not (h1 >= T["h1Min"] or (h6 >= T["h6Min"] and h1 >= T["h1Soft"])): continue
        if h1 > T["h1Max"]: continue
        fut = rows[i + 1:i + 9]
        mx = max([r[2] for r in fut], default=c); c8 = fut[-1][4] if len(fut) >= 8 else None
        hits.append({"t": t, "name": p["name"], "net": p["net"], "mc": round(mc), "h1": round(h1, 1), "h6": round(h6, 1), "acc": round(acc, 1), "vol": round(v),
                     "max8": round((mx / c - 1) * 100, 1), "c8": round((c8 / c - 1) * 100, 1) if c8 else None})
        cool = t + 24 * 3600
    return hits
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="/tmp/big_runner_replay.json"); ap.add_argument("--max", type=int, default=140)
    a = ap.parse_args()
    T = {"mcMin": 1e6, "mcMax": 1e8, "vol1h": 150_000, "volMc": 0.02, "acc": 2.5, "h1Min": 15, "h6Min": 40, "h1Soft": 5, "h1Max": 300}
    P = {}
    for net in ("solana", "bsc"): P.update(pools(net))
    print(f"{len(P)} candidate pools"); res = []
    for p in list(P.values())[: a.max]: res += [dict(h, pool=p["pool"]) for h in replay(p, T)]
    json.dump({"T": T, "pools": len(P), "hits": res}, open(a.out, "w"), indent=1)
    json.dump(RAW, open(a.out.replace(".json", "_raw.json"), "w"))
    print(f"{len(res)} triggers -> {a.out}")
