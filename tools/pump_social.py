#!/usr/bin/env python3
"""Kyvo v8.14 — pump.fun "ziomki" (people) for hot coins -> data/pf_social.json (GitHub Actions only, public reads, no keys).

pump.fun's own API refuses browsers from other sites (CORS), so the app cannot ask it directly. This server step reads, per
hot Solana coin (🥇 Gold feed, 👑 KOL / 🐦 Tweet runner coins, Runner flags, DexScreener boosts / GeckoTerminal trending):
  * callouts      GET frontend-api-v3.pump.fun/callout/coin/{mint}         (who called it, MC at the call, max ×, thesis)
  * top traders   GET frontend-api-v3.pump.fun/pnl-leaderboard/top-trader-trades/{mint}
                  (pump.fun leaderboard traders who traded this coin: username, avatar, their buys/sells with $ and time)
  * profiles      GET frontend-api-v3.pump.fun/users/{wallet}               (username + avatar of callers, cached 24 h)
Only unauthenticated public GETs that pump.fun's own website makes; ~0.35 s between calls, ≤ KYVO_PF_MAX coins per run,
stops itself after ~150 s. Any failure keeps the previous file (never invents data). Not financial advice.
Local test:  python3 tools/pump_social.py --state-dir /tmp/kyvo_pf
"""
from __future__ import annotations
import argparse, json, os, sys, time, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "pf_social.json"
API = "https://frontend-api-v3.pump.fun"
UA = {"User-Agent": "Mozilla/5.0 (kyvo-pf/8.14; +" + KYVO_APP + ")", "Accept": "application/json"}
MAX_COINS = int(os.environ.get("KYVO_PF_MAX", "24"))
BUDGET_S = float(os.environ.get("KYVO_PF_BUDGET_S", "150"))
KEEP_S = 12 * 3600          # coins not refreshed for 12 h drop out of the file

def load(p: Path, default):
    try: return json.loads(p.read_text())
    except Exception: return default

_last = [0.0]
def get(url: str, timeout=12):
    w = 0.35 - (time.time() - _last[0])
    if w > 0: time.sleep(w)
    _last[0] = time.time()
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def hot_mints(state_dir: Path) -> list[str]:
    out: list[str] = []
    def add(chain, a):
        if a and (chain or "solana") == "solana" and a not in out and 32 <= len(a) <= 44: out.append(a)
    for c in load(ROOT / "data/gold.json", {}).get("cards", []): add(c.get("chain"), c.get("address"))
    for i in load(ROOT / "data/kol_live.json", {}).get("items", []): add(i.get("chain"), i.get("addr"))
    fl = load(state_dir / "flags.json", {})
    for f in (fl.get("flags") if isinstance(fl, dict) else fl) or []:
        if isinstance(f, dict): add(f.get("chain") or f.get("chainId"), f.get("address") or f.get("addr") or f.get("mint"))
    for t in load(ROOT / "data/x_live.json", {}).get("tweets", [])[:80]:
        for c in (t.get("coins") or []) + ([t["coin"]] if isinstance(t.get("coin"), dict) else []):
            if isinstance(c, dict): add(c.get("chain"), c.get("address"))
    try:   # DexScreener top boosts (free, public)
        for b in get("https://api.dexscreener.com/token-boosts/top/v1")[:30]: add(b.get("chainId"), b.get("tokenAddress"))
    except Exception: pass
    # pump.fun mints first (the only ones pump.fun has callouts / trader boards for)
    out.sort(key=lambda a: 0 if a.endswith("pump") else 1)
    return out[:MAX_COINS]

def profile(wallet: str, cache: dict) -> dict:
    e = cache.get(wallet)
    if e and time.time() - e.get("t", 0) < 86400: return e
    try:
        u = get(f"{API}/users/{wallet}")
        e = {"t": time.time(), "name": u.get("username") or None, "img": u.get("profile_image") or None,
             "followers": u.get("followers"), "x": u.get("x_username") or None}
    except Exception:
        e = {"t": time.time() - 86400 + 3600, "name": None, "img": None}   # retry in 1 h
    cache[wallet] = e
    return e

def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("--state-dir", default=".kyvo_push"); ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    sd = ROOT / a.state_dir if not a.state_dir.startswith("/") else Path(a.state_dir); sd.mkdir(parents=True, exist_ok=True)
    ucache_p = sd / "pf_users.json"; ucache = load(ucache_p, {})
    old = load(OUT, {}); coins = old.get("coins", {}) if isinstance(old.get("coins"), dict) else {}
    t0 = time.time(); ok = fail = 0
    for mint in hot_mints(sd):
        if time.time() - t0 > BUDGET_S: break
        rec = {"at": int(time.time()), "callouts": [], "traders": [], "trades": []}
        try:
            d = get(f"{API}/callout/coin/{mint}?limit=20")
            for c in (d.get("callouts") or [])[:20]:
                w = c.get("userId") or ""
                p = profile(w, ucache) if w else {}
                rec["callouts"].append({"wallet": w, "name": p.get("name"), "img": p.get("img"), "followers": p.get("followers"),
                    "at": int((c.get("createdAt") or 0) / 1000), "mc": c.get("marketCap"), "px": c.get("calloutPriceUsd"),
                    "max_x": round(c["maxMultiplier"], 2) if isinstance(c.get("maxMultiplier"), (int, float)) else None,
                    "thesis": (c.get("thesis") or "")[:280], "likes": c.get("likes") or 0, "replies": c.get("replyCount") or 0,
                    "id": c.get("calloutId")})
            ok += 1
        except Exception: fail += 1
        try:
            d = get(f"{API}/pnl-leaderboard/top-trader-trades/{mint}")
            for t in (d.get("traders") or [])[:30]:
                rec["traders"].append({"wallet": t.get("walletAddress"), "name": t.get("username"), "img": t.get("profileImage"),
                    "verified": bool(t.get("isVerified")), "best_rank": t.get("bestRank"), "periods": t.get("periods") or [], "n": t.get("tradeCount")})
            for t in (d.get("trades") or [])[:120]:
                ts = t.get("timestamp") or ""
                try: at = int(time.mktime(time.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S")) - time.timezone)
                except Exception: at = 0
                rec["trades"].append({"wallet": t.get("walletAddress"), "buy": bool(t.get("isBuy")), "usd": round(float(t.get("amountUsd") or 0), 2),
                    "px": t.get("priceUsd"), "at": at, "tx": t.get("tx")})
            ok += 1
        except Exception: fail += 1
        if rec["callouts"] or rec["traders"] or mint not in coins: coins[mint] = rec
        else: coins[mint]["at"] = rec["at"]
    now = time.time()
    coins = {m: r for m, r in coins.items() if now - r.get("at", 0) < KEEP_S}
    ucache = {k: v for k, v in ucache.items() if now - v.get("t", 0) < 3 * 86400}
    if ok == 0:
        print(f"pump.fun unreachable ({fail} errors) — keeping the previous file", file=sys.stderr); return 0
    out = {"version": 1, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "source": "pump.fun public frontend API (server-side reads)",
           "note": "Callouts and top-trader trades as shown on pump.fun. Not financial advice.", "coins": coins}
    changed = json.dumps(old.get("coins", {}), sort_keys=True) != json.dumps(coins, sort_keys=True)
    if not a.dry_run:
        OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
        ucache_p.write_text(json.dumps(ucache))
    print(f"pf_social: {len(coins)} coins, ok={ok} fail={fail}, {time.time() - t0:.0f}s")
    go = os.environ.get("GITHUB_OUTPUT")
    if go:
        with open(go, "a") as f: f.write(f"pf_commit={'true' if changed and not a.dry_run else 'false'}\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
