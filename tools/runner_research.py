#!/usr/bin/env python3
"""Kyvo v8.3 Runner research: which early metrics (first 15–60 min of a pool) separate coins that later did 2x+
from those that didn't? Public data: GeckoTerminal pools lists + 5-min OHLCV. Writes JSON rows.
Usage: python3 tools/runner_research.py [out.json]"""
import json, sys, time, urllib.request
from pathlib import Path
UA = {"User-Agent": "kyvo-research/8.3", "Accept": "application/json"}
GT = "https://api.geckoterminal.com/api/v2"
def get(u):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(8 * (i + 1)); continue
            return None
        except Exception: time.sleep(2)
    return None
def ts(s):
    return int(time.mktime(time.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")) - time.timezone) if s else None
now = time.time()
pools = {}
for net in ("solana", "bsc"):
    lists = [f"{GT}/networks/{net}/trending_pools?duration=24h&page={p}" for p in (1, 2, 3)] + \
            [f"{GT}/networks/{net}/pools?sort=h24_volume_usd_desc&page={p}" for p in range(1, 7)] + \
            [f"{GT}/networks/{net}/pools?sort=h24_tx_count_desc&page={p}" for p in range(1, 4)] + \
            [f"{GT}/networks/{net}/new_pools?page={p}" for p in range(1, 6)]
    for u in lists:
        d = get(u); time.sleep(2.1)
        for p in (d or {}).get("data") or []:
            a = p["attributes"]; c = ts(a.get("pool_created_at"))
            if not c or not (8 * 3600 <= now - c <= 96 * 3600): continue   # created 8h–4d ago → we can see the outcome
            pools[(net, a["address"])] = {"net": net, "pool": a["address"], "name": a.get("name"), "created": c,
                "base": (p.get("relationships", {}).get("base_token", {}).get("data", {}).get("id", "").split("_", 1) + [""])[1],
                "mc_now": float(a.get("market_cap_usd") or a.get("fdv_usd") or 0), "px_now": float(a.get("base_token_price_usd") or 0),
                "liq_now": float(a.get("reserve_in_usd") or 0), "tx24": (a.get("transactions") or {}).get("h24") or {}, "chg24": (a.get("price_change_percentage") or {}).get("h24"),
                "dex": p.get("relationships", {}).get("dex", {}).get("data", {}).get("id")}
    print(net, "pools so far", len(pools), flush=True)
rows = []
for k, P in list(pools.items()):
    if not P["px_now"] or not P["mc_now"]: continue
    d = get(f"{GT}/networks/{P['net']}/pools/{P['pool']}/ohlcv/minute?aggregate=5&limit=1000&currency=usd&token=base&before_timestamp={int(min(now, P['created'] + 30 * 3600))}")
    time.sleep(2.1)
    ol = sorted(((d or {}).get("data") or {}).get("attributes", {}).get("ohlcv_list") or [])
    ol = [c for c in ol if c[0] >= P["created"] - 300]
    if len(ol) < 15: continue
    t0 = ol[0][0]; p_open = ol[0][1] or ol[0][4]
    def upto(m): return [c for c in ol if c[0] < t0 + m * 60]
    w15, w30, w60 = upto(15), upto(30), upto(60)
    if not w60: continue
    p60 = w60[-1][4]; p15 = w15[-1][4] if w15 else None
    after = [c for c in ol if t0 + 3600 <= c[0] <= t0 + 25 * 3600]
    if len(after) < 12 or not p60: continue
    mx = max(c[2] for c in after); mxi = max(range(len(after)), key=lambda i: after[i][2])
    vol = lambda w: sum(c[5] for c in w)
    v_last15 = vol([c for c in w60 if c[0] >= t0 + 45 * 60]); v_first45 = vol([c for c in w60 if c[0] < t0 + 45 * 60])
    mc60 = P["mc_now"] * p60 / P["px_now"]
    rows.append({**{x: P[x] for x in ("net", "pool", "name", "base", "dex", "created", "mc_now", "liq_now", "chg24")},
        "mc60": mc60, "vol15": vol(w15), "vol30": vol(w30), "vol60": vol(w60), "vol_acc": (v_last15 * 3 / v_first45) if v_first45 else None,
        "mom15": (p15 / p_open - 1) * 100 if p15 and p_open else None, "mom60": (p60 / p_open - 1) * 100 if p_open else None,
        "max_after": (mx / p60 - 1) * 100, "t_to_max_h": (after[mxi][0] - t0) / 3600, "ret24": (after[-1][4] / p60 - 1) * 100,
        "tx24_now": P["tx24"]})
    print(f"  {P['net']:>6} {str(P['name'])[:24]:>24} mc60 ${mc60:,.0f} vol60 ${rows[-1]['vol60']:,.0f} max_after {rows[-1]['max_after']:+.0f}%", flush=True)
out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/workspace/kyvo_calib/runners_v8_3.json")
out.write_text(json.dumps(rows, indent=1)); print("rows", len(rows), "->", out)
