#!/usr/bin/env python3
"""Kyvo v8.3 "🔁 Kolejna fala / Second leg" research on the runner sample (tools/runner_research.py output).
For each pool: 5-min OHLCV from creation (~3.5 days). Walk forward in time; a SECOND-LEG TRIGGER fires at the first 5-min
candle where ALL hold:
  pumped   : running high ≥ 2× the launch-hour close
  cooled   : price now 30–60% below that high AND trailing 1 h volume ≤ 50% of the peak 1 h volume
  re-accel : this candle's volume ≥ 2× the trailing-1 h average 5-min volume (≥ $5k) AND it closes green
Outcome from the trigger close over the next 8 h: max %, min %, "worked" = +50% reached before −30%.
Baseline: every OTHER candle in the same pumped+cooled state (no volume spike) — same outcome metric.
Usage: python3 tools/second_leg_research.py [runners.json] [out.json]"""
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
src = Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/kyvo_calib/runners_v8_3.json")
out = Path(sys.argv[2] if len(sys.argv) > 2 else "/workspace/kyvo_calib/second_leg_v8_3.json")
pools = json.loads(src.read_text())
def outcome(ol, i):
    p0 = ol[i][4]; mx = mn = 0.0; worked = None
    for c in ol[i + 1:]:
        if c[0] > ol[i][0] + 8 * 3600: break
        up = (c[2] / p0 - 1) * 100; dn = (c[3] / p0 - 1) * 100
        if worked is None and dn <= -30: worked = False
        if worked is None and up >= 50: worked = True
        mx = max(mx, up); mn = min(mn, dn)
    return {"max8": mx, "min8": mn, "worked": bool(worked)}
trig, base = [], []
for n, P in enumerate(pools):
    d = get(f"{GT}/networks/{P['net']}/pools/{P['pool']}/ohlcv/minute?aggregate=5&limit=1000&currency=usd&token=base&before_timestamp={int(P['created'] + 84 * 3600)}")
    time.sleep(2.1)
    ol = sorted(((d or {}).get("data") or {}).get("attributes", {}).get("ohlcv_list") or [])
    ol = [c for c in ol if c[0] >= P["created"] - 300]
    if len(ol) < 40: continue
    launch = ol[min(11, len(ol) - 1)][4]
    hi = 0; peak1h = 0; fired = False
    for i in range(12, len(ol) - 1):
        c = ol[i]; hi = max(hi, c[2])
        win = [x for x in ol[max(0, i - 12):i] if x[0] >= c[0] - 3600]
        v1h = sum(x[5] for x in win); peak1h = max(peak1h, v1h)
        if hi < 2 * launch or not win: continue
        below = (1 - c[4] / hi) * 100
        cooled = 30 <= below <= 60 and v1h <= 0.5 * peak1h
        if not cooled: continue
        avg5 = v1h / max(1, len(win))
        spike = c[5] >= 2 * avg5 and c[5] >= 5000 and c[4] > c[1]
        row = {"net": P["net"], "name": P["name"], "t": c[0], "below_high": below, **outcome(ol, i)}
        if spike and not fired:
            trig.append(row); fired = True   # first trigger per pool only (dedupe like the app)
        elif not spike and i % 6 == 0:
            base.append(row)                   # sample the cooled state every 30 min
    print(f"{n + 1}/{len(pools)} {P['name'][:22]:22} trig={len(trig)} base={len(base)}", flush=True)
def stats(rs):
    if not rs: return {"n": 0}
    m = sorted(r["max8"] for r in rs)
    return {"n": len(rs), "worked": sum(r["worked"] for r in rs), "hit": round(sum(r["worked"] for r in rs) / len(rs), 3),
            "2x": sum(r["max8"] >= 100 for r in rs), "med_max8": round(m[len(m) // 2], 1), "med_min8": round(sorted(r["min8"] for r in rs)[len(rs) // 2], 1)}
res = {"trigger": stats(trig), "baseline_cooled": stats(base), "rows": trig}
out.write_text(json.dumps(res, indent=1)); print("RESULT", json.dumps({k: v for k, v in res.items() if k != "rows"})); print("DONE")
