#!/usr/bin/env python3
"""Kyvo v8.35 — 👥 holder check for the coins Kyvo shows (Runner, 🚀 Runner 2.0, ⚡ Early, 🥇 Gold, track record).

Why: coins with very few real holders / a few wallets holding most of the supply were shown on FOMO with no warning on the list.
Source: RugCheck public report (api.rugcheck.xyz/v1/tokens/<mint>/report, free, no key) — Solana only (BSC etc: no data -> no badge).
  * holders      = RugCheck totalHolders
  * top10 / top1 = % of supply in the 10 / 1 biggest wallets EXCLUDING pools / LP / bonding curve / lockers / burn (same rule as gold.js rcFacts)
  * devrug       = RugCheck risk "Creator history of rugged tokens";  rugged = RugCheck says rugged
  * 🥇 Gold checks (data/gold.json metrics: holders / top1 / top10, same RugCheck source) are reused without any extra request.
Flag ('w', the app's ⚠️ 'mało holderów' badge; 🚀 Runner 2.0 drops flagged coins; Runner / Early pushes get a ⚠️ tag):
  holders < 300  or  top10 > 30 %  or  top1 > 10 %  or  devrug  or  rugged        (env KYVO_HOLD_*; v8.35 report)
Rate-limit friendly: ≤ KYVO_HOLD_MAX_NEW (12) RugCheck calls per run, ~0.4 s apart, a 429 stops the run; answers reused from the
shared fact cache (kol_coins CACHE_DIR, 10 min) and from data/holders.json (20 min for this scan's flags, 3 h for older coins).
Output data/holders.json {v, updated_at, thr, coins: {"solana:<mint lower>": {h, t10, t1, devrug, rugged, w, src, at}}} — 72 h, ≤ 600 coins.
Local test: python3 tools/holders.py --flags x.json --out /tmp/h.json --no-net
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, sys, time, urllib.error, urllib.request
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RC = "https://api.rugcheck.xyz/v1/tokens/"
THR = {"holdersMin": int(os.environ.get("KYVO_HOLD_MIN", "300")), "top10Max": float(os.environ.get("KYVO_HOLD_TOP10_MAX", "30")),
       "top1Max": float(os.environ.get("KYVO_HOLD_TOP1_MAX", "10"))}
MAX_NEW = int(os.environ.get("KYVO_HOLD_MAX_NEW", "12"))
TTL_HOT, TTL_OLD, KEEP_S, MAX_COINS = 1200, 3 * 3600, 72 * 3600, 600
BURN = {"1nc1nerator11111111111111111111111111111111", "11111111111111111111111111111111"}
POOLS0 = {"FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"}
CACHE_DIR = Path(os.environ.get("KYVO_FACT_CACHE", ".kyvo_push/facts"))   # shared with kol_coins.get (same file names)

def load(p: Path, d):
    try: return json.loads(Path(p).read_text())
    except Exception: return d

def nf(v):
    try: return float(v) if v is not None else None
    except (TypeError, ValueError): return None

def flags_of(h, t10, t1, devrug=False, rugged=False) -> list[str]:
    w = []
    if h is not None and h < THR["holdersMin"]: w.append("few")
    if t10 is not None and t10 > THR["top10Max"]: w.append("top10")
    if t1 is not None and t1 > THR["top1Max"]: w.append("top1")
    if devrug: w.append("devrug")
    if rugged: w.append("rugged")
    return w

def facts(r) -> dict | None:
    """RugCheck /report -> holder facts (pools / LP / curve / lockers / burn excluded, like gold.js rcFacts)."""
    if not isinstance(r, dict) or not (r.get("topHolders") or r.get("totalHolders") is not None): return None
    pools, known = set(POOLS0), r.get("knownAccounts") or {}
    for m in r.get("markets") or []:
        if m.get("pubkey"): pools.add(m["pubkey"])
        lp = m.get("lp") or {}
        if lp.get("owner"): pools.add(lp["owner"])
        for f in ("liquidityA", "liquidityB"):
            if isinstance(m.get(f), str): pools.add(m[f])
        for f in ("liquidityAAccount", "liquidityBAccount"):
            if isinstance(m.get(f), dict) and m[f].get("owner"): pools.add(m[f]["owner"])
    def is_pool(h):
        for a in (h.get("owner"), h.get("address")):
            if a in pools or a in BURN: return True
            k = known.get(a) or {}
            if re.search("AMM|LOCKER|CURVE|pump", str(k.get("type", "")) + str(k.get("name", "")), re.I): return True
        return False
    hs = [h for h in r.get("topHolders") or [] if not is_pool(h)]
    t10 = round(sum(nf(h.get("pct")) or 0 for h in hs[:10]), 1) if r.get("topHolders") else None
    t1 = round(nf(hs[0].get("pct")) or 0, 1) if hs else None
    risks = {str(x.get("name")) for x in r.get("risks") or []}
    h = r.get("totalHolders")
    return {"h": int(h) if isinstance(h, (int, float)) else None, "t10": t10, "t1": t1,
            "devrug": "Creator history of rugged tokens" in risks, "rugged": bool(r.get("rugged"))}

class RateLimited(Exception): pass

def rc_report(addr: str, no_net: bool):
    url = RC + addr + "/report"
    cp = CACHE_DIR / (hashlib.sha1(url.encode()).hexdigest() + ".json")
    try:
        if time.time() - cp.stat().st_mtime < 600: return json.loads(cp.read_text()), False
    except Exception: pass
    if no_net: return None, False
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kyvo-holders"}), timeout=12) as f: d = json.load(f)
    except urllib.error.HTTPError as e:
        if e.code == 429: raise RateLimited()
        return None, True
    except Exception:
        return None, True
    try: CACHE_DIR.mkdir(parents=True, exist_ok=True); cp.write_text(json.dumps(d))
    except Exception: pass
    return d, True

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--flags", type=Path, default=Path(".kyvo_push/flags.json"))
    ap.add_argument("--track", type=Path, default=Path("data/track_record.json"))
    ap.add_argument("--gold", type=Path, default=Path("data/gold.json"))
    ap.add_argument("--early", type=Path, default=Path("data/early_shadow.json"))
    ap.add_argument("--out", type=Path, default=Path("data/holders.json"))
    ap.add_argument("--no-net", action="store_true", help="no RugCheck calls (tests): fact cache + gold metrics only")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    now = time.time(); nowms = int(now * 1000)
    doc = load(a.out, {}); coins = {k: v for k, v in (doc.get("coins") or {}).items() if now - (v.get("at") or 0) / 1000 < KEEP_S}
    before = json.dumps(coins, sort_keys=True)
    # candidates, most important first: this scan's flags -> Runner 2.0 / Gold / Early lists -> track record (24 h)
    cand: dict[str, tuple[str, int]] = {}
    def add(k, addr, ttl):
        if not k or not addr or not str(k).lower().startswith("solana:"): return
        k = str(k).lower()
        if k not in cand or ttl < cand[k][1]: cand[k] = (addr, ttl)
    for f in load(a.flags, []) or []: add(f.get("k"), f.get("addr"), TTL_HOT)
    for c in (load(a.early, {}) or {}).get("items") or []: add(c.get("k"), c.get("addr"), TTL_HOT)
    for c in (load(a.track, {}) or {}).get("items") or []:
        if now - (c.get("at") or 0) / 1000 < 24 * 3600: add(c.get("k"), c.get("addr"), TTL_OLD)
    # 🥇 Gold metrics = the same RugCheck facts, already fetched by tools/gold.py -> no request
    for c in (load(a.gold, {}) or {}).get("cards") or []:
        k, m = str(c.get("k") or "").lower(), c.get("metrics") or {}
        if not k.startswith("solana:") or m.get("top10") is None: continue
        at = int(c.get("level_at") or c.get("first_at") or nowms)
        if k in coins and (coins[k].get("at") or 0) >= at: continue
        h, t10, t1 = m.get("holders"), round(nf(m.get("top10")) or 0, 1), round(nf(m.get("top1")) or 0, 1)
        old = coins.get(k) or {}
        coins[k] = {"h": h, "t10": t10, "t1": t1, "devrug": old.get("devrug", False), "rugged": old.get("rugged", False), "src": "gold", "at": at}
    n_new = n_fail = 0; stopped = None
    for k, (addr, ttl) in cand.items():
        e = coins.get(k)
        if e and now - (e.get("at") or 0) / 1000 < ttl: continue
        if n_new >= MAX_NEW: stopped = "max"; break
        try: r, net = rc_report(addr, a.no_net)
        except RateLimited: stopped = "429"; break
        if net: n_new += 1; time.sleep(0.4)
        fx = facts(r)
        if not fx:
            n_fail += int(net)
            continue
        coins[k] = dict(fx, src="rugcheck", at=nowms)
    for v in coins.values(): v["w"] = flags_of(v.get("h"), v.get("t10"), v.get("t1"), v.get("devrug"), v.get("rugged"))
    lst = dict(sorted(coins.items(), key=lambda kv: -(kv[1].get("at") or 0))[:MAX_COINS])
    nfl = sum(1 for v in lst.values() if v["w"])
    print(f"holders: {len(cand)} candidates, {n_new} RugCheck calls ({n_fail} empty){', stopped: ' + stopped if stopped else ''}, {len(lst)} coins, {nfl} flagged ⚠️")
    if a.dry_run: return 0
    changed = json.dumps(lst, sort_keys=True) != before
    out = {"v": 835, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)), "thr": THR,
           "note": "👥 v8.35 holder check (RugCheck, pools/LP/curve/burn excluded). w: few = holders < holdersMin, top10 / top1 = biggest wallets' % of supply over the limit, devrug = creator rugged before, rugged. tools/holders.py",
           "coins": lst}
    a.out.parent.mkdir(parents=True, exist_ok=True); a.out.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    go = os.environ.get("GITHUB_OUTPUT")
    if go and changed:
        with open(go, "a") as fh: fh.write("holders_new=true\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
