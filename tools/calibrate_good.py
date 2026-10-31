#!/usr/bin/env python3
"""Kyvo v8.3 calibration: what did coins look like when tracked traders (smart money / X calls) entered,
and what happened in the next 8h? Public data only (DexScreener + GeckoTerminal OHLCV). Writes JSON + prints summary.
Usage: python3 tools/calibrate_good.py [out.json]"""
import json, sys, time, math, urllib.request, statistics as stt
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "kyvo-calibrate/8.3", "Accept": "application/json"}
def get(u):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(6 * (i + 1)); continue
            return None
        except Exception: time.sleep(2)
    return None
sm = json.load(open(ROOT / "data/smart_money.json"))
xv = json.load(open(ROOT / "data/x_viral.json"))
calls = {}  # (chain, addr) -> {t, src}
for a in sorted(sm["activity"], key=lambda a: a["block_time"]):
    if a["side"] != "buy": continue
    k = ("solana", a["mint"])
    if k not in calls: calls[k] = {"t": a["block_time"], "src": "sm:" + a["wallet_id"], "symbol": a.get("symbol")}
for tw in xv.get("trader_tweets", []):
    t = int(time.mktime(time.strptime(tw["created_at"][:19], "%Y-%m-%dT%H:%M:%S")) - time.timezone)
    for c in tw.get("coins", []):
        k = (c["chain"], c["address"])
        if k not in calls or t < calls[k]["t"]: calls[k] = {"t": t, "src": "x:" + tw["handle"], "symbol": c.get("symbol")}
now = time.time()
items = [(k, v) for k, v in calls.items() if now - v["t"] >= 8 * 3600]
print("calls total", len(calls), "with full 8h after", len(items))
# best pool per token via DexScreener
pools = {}
by_chain = {}
for (ch, a), _ in items: by_chain.setdefault(ch, []).append(a)
for ch, addrs in by_chain.items():
    for i in range(0, len(addrs), 30):
        for p in get(f"https://api.dexscreener.com/tokens/v1/{ch}/" + ",".join(addrs[i:i + 30])) or []:
            b = p["baseToken"]["address"]; liq = (p.get("liquidity") or {}).get("usd") or 0
            if b not in pools or liq > pools[b]["liq"]:
                pools[b] = {"pair": p["pairAddress"], "liq": liq, "mc": p.get("marketCap") or p.get("fdv"), "px": float(p.get("priceUsd") or 0),
                            "created": (p.get("pairCreatedAt") or 0) / 1000, "dex": p.get("dexId")}
        time.sleep(0.4)
NET = {"solana": "solana", "bsc": "bsc", "robinhood": "robinhood"}
rows = []
for (ch, a), v in items:
    P = pools.get(a)
    if not P or not P["px"] or not P["mc"]: continue
    t = v["t"]
    d = get(f"https://api.geckoterminal.com/api/v2/networks/{NET[ch]}/pools/{P['pair']}/ohlcv/minute?aggregate=15&limit=1000&currency=usd&token={a}&before_timestamp={int(t + 9 * 3600)}")
    time.sleep(2.2)
    ol = sorted(((d or {}).get("data") or {}).get("attributes", {}).get("ohlcv_list") or [])
    if len(ol) < 8: continue
    pre = [c for c in ol if c[0] < t - 900 + 1]           # candles fully before entry
    ent = [c for c in ol if c[0] <= t < c[0] + 900]
    post = [c for c in ol if t < c[0] <= t + 8 * 3600]
    if not ent or len(post) < 8: continue
    p0 = ent[0][4]  # close of the entry candle (conservative)
    if not p0: continue
    v1h = sum(c[5] for c in pre[-4:]); vprev = sum(c[5] for c in pre[-8:-4])
    p1h = pre[-4][1] if len(pre) >= 4 else None
    mc0 = P["mc"] * p0 / P["px"]
    mx = max(c[2] for c in post); cl8 = post[-1][4]; mn = min(c[3] for c in post)
    rows.append({"chain": ch, "addr": a, "sym": v["symbol"], "src": v["src"], "t": t, "dex": P["dex"],
                 "age_h": (t - P["created"]) / 3600 if P["created"] else None, "mc0": mc0, "v1h": v1h, "v1h_mc": v1h / mc0 if mc0 else None,
                 "vacc": (v1h / vprev) if vprev else None, "mom1h": (p0 / p1h - 1) * 100 if p1h else None,
                 "max8": (mx / p0 - 1) * 100, "ret8": (cl8 / p0 - 1) * 100, "dd8": (mn / p0 - 1) * 100, "liq_now": P["liq"]})
    print(f"  {str(v['symbol']):>12} {v['src']:>16} mc0 ${mc0:,.0f} age {rows[-1]['age_h'] if rows[-1]['age_h'] is None else round(rows[-1]['age_h'],1)}h max8 {rows[-1]['max8']:+.0f}% ret8 {rows[-1]['ret8']:+.0f}%", flush=True)
out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/workspace/kyvo_calib/calib_v8_3.json")
out.write_text(json.dumps(rows, indent=1))
print("rows", len(rows), "->", out)
