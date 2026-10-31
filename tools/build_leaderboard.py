#!/usr/bin/env python3
"""Kyvo v8.4 (+ v8.14 pump.fun) leaderboard refresh -> data/leaderboard.json (public data only, no keys).

Source: kolscan.io/leaderboard public page (Solana KOL wallets; realized profit in SOL,
wins/losses for 1d / 7d / 30d; data embedded in the public HTML). SOL/USD: Binance public
spot price (fallback CoinGecko). On-chain trade history for wallets Kyvo already tracks is
carried over from the previous file (tools/build_snapshots.py) by wallet address.

Never invents numbers: if the source fails or looks broken, the previous file is kept unchanged
(exit 0, the UI shows its last-updated time). Run: python3 tools/build_leaderboard.py
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "leaderboard.json"
UA = "Mozilla/5.0 (compatible; KyvoLeaderboard/8.4; public page, daily)"
SRC = "https://kolscan.io/leaderboard"
WINDOWS = {1: "1d", 7: "7d", 30: "30d"}


def get(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def sol_price():
    try:
        return float(json.loads(get("https://data-api.binance.vision/api/v3/ticker/price?symbol=SOLUSDT"))["price"]), "Binance SOLUSDT"
    except Exception:
        pass
    try:
        return float(json.loads(get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"))["solana"]["usd"]), "CoinGecko"
    except Exception:
        return None, None


def kolscan_rows():
    h = get(SRC)
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', h, re.S)
    s = "".join(json.loads('"' + c + '"') for c in chunks)
    i = s.find('"initLeaderboard":')
    if i < 0:
        raise RuntimeError("initLeaderboard not found (page layout changed)")
    arr, _ = json.JSONDecoder().raw_decode(s[i + len('"initLeaderboard":'):])
    return arr


PF_API = "https://frontend-api-v3.pump.fun/pnl-leaderboard"
PF_PERIODS = {"1d": "daily", "7d": "weekly", "30d": "monthly"}


def pumpfun_rows():
    """v8.14: pump.fun's public PnL leaderboard (the one on pump.fun/leaderboard; unauthenticated GET its website makes).
    PnL = realized + unrealized (pump.fun's own number). Returns {window: [entry…]} or {} if pump.fun is unreachable."""
    out = {}
    for w, period in PF_PERIODS.items():
        try:
            d = json.loads(get(f"{PF_API}?period={period}&limit=50", timeout=20))
            rows = [e for e in d.get("entries") or [] if e.get("walletAddress") and isinstance(e.get("pnlUsd"), (int, float))]
            if len(rows) >= 10:
                out[w] = rows
        except Exception as e:
            print(f"pump.fun {period} failed: {e}", file=sys.stderr)
    return out


def merge_pumpfun(leaders, old_leaders, pf):
    """merge pump.fun traders into the kolscan list by wallet address (one row per wallet, sources = both)."""
    if not pf:   # pump.fun down: carry the previous pump.fun data forward (marked stale by its own timestamp)
        for a, o in old_leaders.items():
            if "pumpfun" in (o.get("sources") or []):
                if a in leaders:
                    leaders[a]["pf"] = o.get("pf"); leaders[a]["sources"] = sorted(set(leaders[a].get("sources", ["kolscan"])) | {"pumpfun"})
                    leaders[a].setdefault("profiles", {})["pumpfun"] = f"https://pump.fun/profile/{a}"
                elif o.get("sources") == ["pumpfun"]:
                    leaders[a] = o
        return 0
    for w, rows in pf.items():
        for e in rows:
            a = e["walletAddress"]
            L = leaders.get(a)
            if not L:
                o = old_leaders.get(a) or {}
                h = e.get("xUsername") or None
                L = leaders[a] = {
                    "id": o.get("id") or slug(e.get("username"), a),
                    "name": e.get("username") or a[:4] + "…" + a[-4:],
                    "handle": h, "chain": "solana", "address": a,
                    "source": f"https://pump.fun/profile/{a}",
                    "source_note": "Publiczny ranking PnL pump.fun (nazwa i avatar z profilu pump.fun)",
                    "avatar": e.get("profileImage") or None,
                    "x_url": f"https://x.com/{h}" if h else None, "telegram": None,
                    "stats": {k: {"realized_pnl_usd": None, "pnl_sol": None, "trades": 0, "wins": None, "win_rate": None,
                                  "note": "Brak w rankingu kolscan w tym okresie."} for k in WINDOWS.values()},
                    "rank": {}, "rank_prev": {}, "sources": ["pumpfun"],
                }
                for k in ("recent_trades", "closed", "positions", "volume_usd", "coverage"):
                    if o.get(k): L[k] = o[k]
            L["sources"] = sorted(set(L.get("sources") or ["kolscan"]) | {"pumpfun"})
            L.setdefault("profiles", {})["pumpfun"] = f"https://pump.fun/profile/{a}"
            if not L.get("avatar") and e.get("profileImage"): L["avatar"] = e["profileImage"]
            if e.get("username"): L["pf_name"] = e["username"]
            pfd = L.setdefault("pf", {"rank": {}, "pnl_usd": {}, "realized_usd": {}, "unrealized_usd": {}, "positions": {}, "verified": False})
            pfd["rank"][w] = e.get("rank")
            pfd["pnl_usd"][w] = round(e["pnlUsd"], 2)
            pfd["realized_usd"][w] = round(e.get("realizedPnlUsd") or 0, 2)
            pfd["unrealized_usd"][w] = round(e.get("unrealizedPnlUsd") or 0, 2)
            pfd["positions"][w] = e.get("positionsCount")
            pfd["verified"] = pfd["verified"] or bool(e.get("isVerified"))
    return sum(len(v) for v in pf.values())


def slug(name, addr):
    b = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (b or "w") + "-" + addr[:4].lower()


def main():
    old = {}
    try:
        old = json.loads(OUT.read_text())
    except Exception:
        pass
    try:
        rows = kolscan_rows()
    except Exception as e:
        print(f"source failed, keeping previous file: {e}", file=sys.stderr)
        return 0
    rows = [r for r in rows if r.get("wallet_address") and r.get("timeframe") in WINDOWS and isinstance(r.get("profit"), (int, float))]
    per = {w: [r for r in rows if r["timeframe"] == tf] for tf, w in WINDOWS.items()}
    if min(len(v) for v in per.values()) < 10:
        print(f"source looks incomplete {[len(v) for v in per.values()]}, keeping previous file", file=sys.stderr)
        return 0
    px, px_src = sol_price()
    if not px:
        print("no SOL price, keeping previous file", file=sys.stderr)
        return 0

    now = datetime.now(timezone.utc)
    old_leaders = {l.get("address"): l for l in old.get("leaders", [])}
    # previous ranks: use the previous file's ranks if it is from an earlier refresh >= 20h ago,
    # otherwise carry its own "previous" forward (so the arrow shows the change vs ~yesterday)
    old_at = None
    try:
        old_at = datetime.fromisoformat(old["updated_at"].replace("Z", "+00:00"))
    except Exception:
        pass
    use_old_rank = old.get("version", 1) >= 2 and old_at is not None and (now - old_at) >= timedelta(hours=20)

    leaders = {}
    for w, lst in per.items():
        lst.sort(key=lambda r: -r["profit"])
        for rank, r in enumerate(lst, 1):
            a = r["wallet_address"]
            L = leaders.get(a)
            if not L:
                o = old_leaders.get(a) or {}
                tw = r.get("twitter") or ""
                m = re.search(r"(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})", tw)
                handle = m.group(1) if m else o.get("handle")
                L = leaders[a] = {
                    "id": o.get("id") or slug(r.get("name"), a),
                    "name": r.get("name") or o.get("name") or a[:4] + "…" + a[-4:],
                    "handle": handle,
                    "chain": "solana",
                    "address": a,
                    "source": f"https://kolscan.io/account/{a}",
                    "source_note": "Publiczny ranking kolscan.io (portfel i nazwa przypisane przez kolscan)",
                    "avatar": o.get("avatar") or f"https://kolscan.io/profiles/{a}.png",
                    "x_url": f"https://x.com/{handle}" if handle else None,
                    "telegram": r.get("telegram"),
                    "stats": {k: {"realized_pnl_usd": None, "pnl_sol": None, "trades": 0, "wins": None, "win_rate": None,
                                  "note": "Poza top 50 kolscan w tym okresie."} for k in WINDOWS.values()},
                    "rank": {}, "rank_prev": {},
                }
                for k in ("recent_trades", "closed", "positions", "volume_usd", "coverage"):
                    if o.get(k):
                        L[k] = o[k]
            wins, losses = int(r.get("wins") or 0), int(r.get("losses") or 0)
            n = wins + losses
            L["stats"][w] = {
                "realized_pnl_usd": round(r["profit"] * px, 2),
                "pnl_sol": round(r["profit"], 3),
                "trades": n, "wins": wins, "win_rate": round(wins / n, 4) if n else None,
                "note": "Zrealizowany zysk wg publicznego rankingu kolscan.io (SOL → USD po bieżącym kursie).",
            }
            L["rank"][w] = rank

    def has_img(url):
        try:
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status == 200 and r.headers.get("Content-Type", "").startswith("image/")
        except Exception:
            return False

    for L in leaders.values():
        L.setdefault("sources", ["kolscan"])
        L.setdefault("profiles", {})["kolscan"] = f"https://kolscan.io/account/{L['address']}"
    pf_n = merge_pumpfun(leaders, old_leaders, pumpfun_rows())
    for L in leaders.values():
        if L["sources"] == ["pumpfun"]: L["profiles"].pop("kolscan", None)
        L["profiles"]["gmgn"] = f"https://gmgn.ai/sol/address/{L['address']}"   # public wallet page link only (no data read)

    for a, L in leaders.items():
        o = old_leaders.get(a) or {}
        if L["sources"] == ["pumpfun"]:
            L["rank_prev"] = {}
            L["active"] = bool((L.get("pf") or {}).get("rank", {}).get("1d") or (L.get("pf") or {}).get("rank", {}).get("7d"))
            continue
        if L["avatar"] and L["avatar"].startswith("https://kolscan.io/") and not has_img(L["avatar"]):
            L["avatar"] = None
        L["rank_prev"] = (o.get("rank") or {}) if use_old_rank else (o.get("rank_prev") or {})
        L["active"] = L["stats"]["1d"]["trades"] > 0 or L["stats"]["7d"]["trades"] > 0

    out = {
        "version": 3,
        "sources": {"kolscan": {"url": SRC, "pnl": "realized"}, "pumpfun": {"url": "https://pump.fun/leaderboard", "pnl": "realized + unrealized", "rows": pf_n}},
        "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updated_at_warsaw": now.astimezone(timezone(timedelta(hours=2))).isoformat(timespec="seconds"),
        "source": f"kolscan.io public leaderboard + pump.fun public PnL leaderboard (Solana); SOL/USD {px_src}. No keys.",
        "source_url": SRC,
        "chains": ["solana"],
        "sol_price_usd": round(px, 2),
        "prev_at": (old.get("updated_at") if use_old_rank else (old.get("prev_at") if old.get("version", 1) >= 2 else None)),
        "note": "Top 50 per window from kolscan. Realized profit in SOL converted at current SOL/USD. Approximate. Not financial advice.",
        "wallets_count": len(leaders),
        "leaders": sorted(leaders.values(), key=lambda L: (L["rank"].get("1d", 999), (L.get("pf") or {}).get("rank", {}).get("1d") or 999)),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"ok: {len(leaders)} wallets (pump.fun rows {pf_n}), 1d#1={per['1d'][0]['name']} {per['1d'][0]['profit']:.1f} SOL, SOL=${px:.2f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
