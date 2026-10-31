#!/usr/bin/env python3
"""Kyvo v8.14 — 👀 Tracker smart-money feed -> data/tracker_feed.json (GitHub Actions only, public reads, no keys).

For the top ~KYVO_TRACK_MAX (60) wallets of the Kyvo Ranking (kolscan + pump.fun PnL leaderboard, data/leaderboard.json):
  * trades   GET frontend-api-v3.pump.fun/user-trades/{wallet}?limit=25   (public read pump.fun's own site uses; newest first)
  * coins    GET api.dexscreener.com/tokens/v1/solana/{≤30 mints}          (symbol, logo, MC now, main pair, pair age)
Derived:
  * clusters: ≥2 distinct tracked wallets bought the same coin within 30 min ("kilku obserwowanych kupiło ten sam coin")
  * fresh:    a tracked wallet's first buy into a coin whose pool was < 60 min old at that moment
  * Premium push: ≥3 tracked top traders bought the same coin within 30 min and the last buy is ≤ 30 min old ->
    <state>/smart_alerts.json (sent by tools/kyvo_push.py, Premium only, one push per coin per 3 days, max 1 per run).
pump.fun refuses browser calls from other sites (CORS), so this runs server-side. ~0.35 s between calls, stops after ~120 s.
Any failure keeps the previous file. Not financial advice.
Local test:  python3 tools/pump_tracker.py --state-dir /tmp/kyvo_tk
"""
from __future__ import annotations
import argparse, json, os, sys, time, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "tracker_feed.json"
API = "https://frontend-api-v3.pump.fun"
UA = {"User-Agent": "Mozilla/5.0 (kyvo-tracker/8.14; +" + KYVO_APP + ")", "Accept": "application/json"}
MAX_W = int(os.environ.get("KYVO_TRACK_MAX", "60"))
BUDGET_S = float(os.environ.get("KYVO_TRACK_BUDGET_S", "120"))
KEEP_S = 12 * 3600
CLUSTER_S = 30 * 60
SKIP = {"So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"}

def load(p: Path, default):
    try: return json.loads(p.read_text())
    except Exception: return default

_last = [0.0]
def get(url: str, timeout=12):
    w = 0.35 - (time.time() - _last[0])
    if w > 0: time.sleep(w)
    _last[0] = time.time()
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def top_wallets() -> list[dict]:
    lb = load(ROOT / "data/leaderboard.json", {})
    L = [x for x in lb.get("leaders", []) if x.get("address")]
    def ks(x):
        r = (x.get("rank") or {}); return min(r.get("1d") or 999, r.get("7d") or 999)
    def pf(x):
        r = ((x.get("pf") or {}).get("rank") or {}); return min(r.get("1d") or 999, r.get("7d") or 999)
    ks_l = sorted([x for x in L if ks(x) < 999], key=ks)
    pf_l = sorted([x for x in L if pf(x) < 999], key=pf)
    out, seen = [], set()
    for a, b in zip(ks_l + [None] * len(pf_l), pf_l + [None] * len(ks_l)):   # interleave both sources
        for x in (a, b):
            if x and x["address"] not in seen and len(out) < MAX_W:
                seen.add(x["address"]); src = x.get("sources") or ["kolscan"]
                out.append({"address": x["address"], "name": x.get("name"), "img": x.get("avatar"), "id": x.get("id"), "src": src,
                            "url": (x.get("profiles") or {}).get("pumpfun" if src == ["pumpfun"] else "kolscan") or f"https://pump.fun/profile/{x['address']}"})
    return out

def ts(v):
    if isinstance(v, (int, float)): return int(v / 1000 if v > 1e12 else v)
    try: return int(datetime.fromisoformat(str(v).replace("Z", "+00:00")).timestamp())
    except Exception: return 0

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--state-dir", type=Path, default=Path(".kyvo_push"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    sd = a.state_dir if a.state_dir.is_absolute() else ROOT / a.state_dir
    sd.mkdir(parents=True, exist_ok=True)
    t0 = time.time(); now = int(t0)
    old = load(OUT, {})
    ws = top_wallets()
    if not ws: print("tracker: no ranking wallets -> keep previous file"); return 0
    trades = {t["tx"] + t["w"]: t for t in old.get("trades", []) if now - t.get("at", 0) < KEEP_S}
    ok = fail = 0
    for w in ws:
        if time.time() - t0 > BUDGET_S: break
        try:
            d = get(f"{API}/user-trades/{w['address']}?limit=25")
            ok += 1
        except Exception as e:  # noqa: BLE001
            fail += 1; print(f"  {w['name']}: {type(e).__name__}"); continue
        for r in d.get("trades") or []:
            m = r.get("mint"); at = ts(r.get("timestamp"))
            if not m or m in SKIP or not r.get("tx") or now - at > KEEP_S: continue
            trades[r["tx"] + w["address"]] = {"w": w["address"], "m": m, "buy": bool(r.get("isBuy")), "usd": round(float(r.get("amountUsd") or 0), 2),
                                              "sol": round(float(r.get("amountSol") or 0), 3), "px": r.get("priceUsd"), "at": at, "tx": r["tx"]}
    if ok == 0:
        print(f"tracker: 0 ok ({fail} failed) -> keep previous file")
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as f: f.write("tracker_commit=false\n")
        return 0
    tl = sorted(trades.values(), key=lambda t: -t["at"])[:500]
    mints = list(dict.fromkeys(t["m"] for t in tl))[:120]
    coins = dict((old.get("coins") or {}))
    for i in range(0, len(mints), 30):
        if time.time() - t0 > BUDGET_S + 30: break
        try:
            for p in get("https://api.dexscreener.com/tokens/v1/solana/" + ",".join(mints[i:i + 30])) or []:
                bt = (p.get("baseToken") or {}); m = bt.get("address")
                if m not in mints: continue
                liq = (p.get("liquidity") or {}).get("usd") or 0
                if m in coins and coins[m].get("_t") == now and (coins[m].get("liq") or 0) >= liq: continue
                px = float(p.get("priceUsd") or 0); mc = p.get("marketCap") or p.get("fdv")
                coins[m] = {"s": bt.get("symbol"), "n": bt.get("name"), "img": (p.get("info") or {}).get("imageUrl"), "mc": mc, "px": px,
                            "pair": p.get("pairAddress"), "dex": p.get("dexId"), "born": int((p.get("pairCreatedAt") or 0) / 1000) or None, "liq": liq, "_t": now}
        except Exception as e:  # noqa: BLE001
            print(f"  dexscreener: {type(e).__name__}")
    coins = {m: c for m, c in coins.items() if m in set(t["m"] for t in tl)}
    for t in tl:   # MC at the trade = trade price × supply implied by DexScreener (MC / price now)
        c = coins.get(t["m"]) or {}
        try: t["mc"] = round(float(t["px"]) * c["mc"] / c["px"]) if c.get("mc") and c.get("px") and t.get("px") else None
        except Exception: t["mc"] = None
    # clusters: distinct tracked wallets buying the same coin within 30 min
    clusters = []
    by_m: dict = {}
    for t in sorted(tl, key=lambda t: t["at"]):
        if t["buy"]: by_m.setdefault(t["m"], []).append(t)
    for m, bs in by_m.items():
        best = None
        for i in range(len(bs)):
            win = [b for b in bs[i:] if b["at"] - bs[i]["at"] <= CLUSTER_S]
            ww = list(dict.fromkeys(b["w"] for b in win))
            if len(ww) >= 2 and (not best or len(ww) > len(best["wallets"]) or (len(ww) == len(best["wallets"]) and win[-1]["at"] > best["last"])):
                best = {"m": m, "wallets": ww, "first": win[0]["at"], "last": win[-1]["at"], "usd": round(sum(b["usd"] for b in win), 2)}
        if best: clusters.append(best)
    clusters.sort(key=lambda c: (-len(c["wallets"]), -c["last"]))
    fresh = []
    firsts = {}
    for t in sorted(tl, key=lambda t: t["at"]):
        if t["buy"] and (t["w"], t["m"]) not in firsts: firsts[(t["w"], t["m"])] = t
    for t in firsts.values():
        born = (coins.get(t["m"]) or {}).get("born")
        if born and 0 <= t["at"] - born <= 3600: fresh.append({"w": t["w"], "m": t["m"], "at": t["at"], "age": t["at"] - born, "usd": t["usd"], "tx": t["tx"]})
    fresh.sort(key=lambda f: -f["at"])
    for c in coins.values(): c.pop("_t", None)
    out = {"version": 1, "updated_at": datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "source": "pump.fun public user trades (frontend-api-v3 /user-trades) + DexScreener; top Kyvo Ranking wallets. No keys.",
           "note": "Tracked = top Kyvo Ranking wallets (kolscan + pump.fun). MC at trade is approximate. Not financial advice.",
           "wallets": ws, "trades": tl, "coins": coins, "clusters": clusters[:30], "fresh": fresh[:30]}
    # Premium push: ≥3 top traders in 30 min, last buy ≤ 30 min ago
    alerts = []
    names = {w["address"]: w["name"] for w in ws}
    for c in clusters:
        if len(c["wallets"]) >= 3 and now - c["last"] <= CLUSTER_S:
            co = coins.get(c["m"]) or {}; sym = co.get("s") or c["m"][:4]
            who = ", ".join(names.get(x, x[:4]) for x in c["wallets"][:3])
            mc = co.get("mc"); mcs = (f"${mc/1e6:.2f}M" if mc >= 1e6 else f"${mc/1e3:.1f}K") if mc else "?"
            alerts.append({"id": "smart:" + c["m"], "at": now * 1000, "hash": "#coin/solana:" + c["m"],
                           "title_pl": f"👀 {len(c['wallets'])} top traderów kupiło ${sym}", "title_en": f"👀 {len(c['wallets'])} top traders bought ${sym}",
                           "body_pl": f"{who} · w {max(1, round((c['last'] - c['first']) / 60))} min · MC {mcs}. To nie porada finansowa.",
                           "body_en": f"{who} · within {max(1, round((c['last'] - c['first']) / 60))} min · MC {mcs}. Not financial advice."})
    if not a.dry_run:
        OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
        if alerts:
            pend = [x for x in load(sd / "smart_alerts.json", []) if now * 1000 - x.get("at", 0) < 3600 * 1000]
            have = {x["id"] for x in pend}
            pend += [x for x in alerts if x["id"] not in have]
            (sd / "smart_alerts.json").write_text(json.dumps(pend, ensure_ascii=False))
    changed = [t["tx"] for t in old.get("trades", [])[:50]] != [t["tx"] for t in tl[:50]]
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f: f.write(f"tracker_commit={'true' if changed else 'false'}\n")
    print(f"tracker: {len(ws)} wallets, {ok} ok / {fail} fail, {len(tl)} trades, {len(coins)} coins, {len(clusters)} clusters "
          f"(max {max([len(c['wallets']) for c in clusters] or [0])}), {len(fresh)} fresh, {len(alerts)} push candidates, {time.time() - t0:.0f}s")
    return 0

if __name__ == "__main__":
    sys.exit(main())
