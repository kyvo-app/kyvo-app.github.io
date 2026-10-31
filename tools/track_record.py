#!/usr/bin/env python3
"""Kyvo v8.3 "Wyniki / Track record" — server log of every coin Kyvo flags (Good Coin, 🏃 Runner, v8.25 🔁 Kolejna fala).

v8.25 — two writers, clear roles:
  * kyvo-push loop (tools/kyvo_loop.py, every ~90 s scan) is the ONLY writer of NEW flags:
      python3 tools/track_record.py --merge-only --flags .kyvo_push/flags.json --out data/track_record.json --history data/flag_history.json
    merges the scan's flags right away (dedupe by chain + address, the FIRST flag's time / price / MC is kept, later flags only
    add a kind), no network (optionally + the Cloudflare worker's GET /flags when KYVO_WORKER_FLAGS_URL is set), and keeps
    data/flag_history.json (every (coin, kind) seen by the scanner: first / last time, hits, source + per-scan prefilter
    counts) so missed coins can be audited.
  * kyvo-calls (every ~15 min) only updates PERFORMANCE (--perf-only): exact max / 1 h / 8 h from GeckoTerminal 15-min candles
    (v8.24: max counts only candles starting at / after the flag time, never the flag's own candle; maxV=2 marks fixed items)
    (≤ 50 h after the flag, at most 25 pools per run), current price from DexScreener; it never adds coins.
  Both commit through tools/git_sync.py: on a push race the two JSON files are MERGED (merge_docs / merge_history), never
  overwritten, so neither workflow can drop the other's work.
Old single-writer mode (no --merge-only / --perf-only) still works: merge flags + performance in one go.
commit=true goes to $GITHUB_OUTPUT if there is a new flag or the last committed update is ≥ 60 min old.
Public data only, no keys. Not financial advice.
"""
from __future__ import annotations
import argparse, json, os, time, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pairs import choose, is_curve  # noqa: E402  (v8.13 main-pool rule)

UA = {"User-Agent": "kyvo-track-record/8.3 (+" + KYVO_REPO + ")", "Accept": "application/json"}
DS = "https://api.dexscreener.com"
GT = "https://api.geckoterminal.com/api/v2"
GT_NET = {"solana": "solana", "bsc": "bsc", "robinhood": "robinhood"}
KEEP_DAYS = 14

def get(url: str):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(6 * (i + 1)); continue
            return None
        except Exception: time.sleep(2)
    return None

# ---------------- v8.25 merge helpers (shared with tools/git_sync.py) ----------------
FIRST = ("k", "sym", "name", "chain", "addr", "img", "at", "px0", "mc0", "stage0")          # identity + first-flag snapshot
PERF = ("pair", "max", "maxAt", "maxV", "maxLive", "maxLiveAt", "p1", "p8", "ohAt", "ohFinal")   # candle-based performance
LIVE = ("last", "lastAt", "mcNow")                                                               # latest live price
HIST_DAYS = 7
HIST_MAX = 6000
SCANS_MAX = 240

def nkey(e: dict) -> str:
    """dedupe key: chain + address (addresses compared case-insensitively; EVM is case-insensitive, Solana base58 collisions
    that differ only by case do not happen in practice)."""
    k = str(e.get("k") or "")
    ch = e.get("chain") or (k.split(":", 1)[0] if ":" in k else "")
    ad = e.get("addr") or (k.split(":", 1)[1] if ":" in k else k)
    return f"{str(ch).lower()}:{str(ad).lower()}"

def new_item(f: dict) -> dict:
    e = {x: f.get(x) for x in ("k", "sym", "name", "chain", "addr", "pair", "img", "at", "px0", "mc0")}
    e.update({"kinds": {}, "max": f["px0"], "maxAt": f["at"], "last": f["px0"], "mcNow": f["mc0"], "lastAt": f["at"]})
    if f.get("src") and f["src"] != "loop": e["src0"] = f["src"]
    return e

def merge_flags(items: dict, flags: list[dict], src: str = "loop") -> int:
    """items: nkey -> item. Adds new coins (first flag kept), adds kinds to known coins. Returns the number of NEW coins."""
    new = 0
    for f in flags:
        if not f.get("k") or not f.get("px0") or not f.get("mc0") or not f.get("at"): continue
        nk = nkey(f); e = items.get(nk)
        if not e:
            items[nk] = e = new_item(dict(f, src=f.get("src") or src)); new += 1
        elif f["at"] < e["at"]:                                      # an earlier flag arrived later (e.g. worker) -> it becomes the first
            for x in ("at", "px0", "mc0"): e[x] = f[x]
        kinds = e.setdefault("kinds", {})
        kind = f.get("kind") or "runner"
        if kind not in kinds or f["at"] < kinds[kind]: kinds[kind] = f["at"]
        if f.get("badge") and not e.get("badge"): e["badge"] = f["badge"]; e["kol"] = f.get("kol")   # v8.8 👑 / 🚀
    return new

def merge_item(a: dict, b: dict) -> dict:
    """one coin present in two copies of track_record.json -> one item (first flag = earliest, performance = freshest)."""
    first, other = (a, b) if (a.get("at") or 0) <= (b.get("at") or 0) else (b, a)
    out = dict(other); out.update({k: first[k] for k in FIRST if k in first})
    perf = a if (a.get("ohAt") or 0) >= (b.get("ohAt") or 0) else b
    for k in PERF:
        if k in perf: out[k] = perf[k]
        elif k in out and k not in perf and k in ("ohFinal",): out.pop(k, None)
    live = a if (a.get("lastAt") or 0) >= (b.get("lastAt") or 0) else b
    for k in LIVE:
        if k in live: out[k] = live[k]
    if not perf.get("maxV"):                                         # neither copy on the v8.24 candle rule yet -> keep the higher max
        mx = max(a.get("max") or 0, b.get("max") or 0)
        if mx: out["max"] = mx
    kinds = {}
    for e in (a, b):
        for k, t in (e.get("kinds") or {}).items():
            if k not in kinds or (t or 0) < kinds[k]: kinds[k] = t
    out["kinds"] = kinds
    for k in ("badge", "kol", "src0"):
        v = first.get(k) or other.get(k)
        if v: out[k] = v
    return out

def merge_docs(ours: dict, theirs: dict) -> dict:
    """two versions of data/track_record.json -> union (used on a git push race; neither side's coins or updates are lost)."""
    now_ms = int(time.time() * 1000)
    items: dict[str, dict] = {}
    for doc in (theirs or {}, ours or {}):
        for e in doc.get("items", []) or []:
            if not isinstance(e, dict) or not e.get("k"): continue
            nk = nkey(e)
            items[nk] = merge_item(items[nk], e) if nk in items else dict(e)
    items = {k: e for k, e in items.items() if now_ms - (e.get("at") or 0) < KEEP_DAYS * 864e5}
    out = dict(theirs or {}); out.update({k: v for k, v in (ours or {}).items() if k != "items"})
    out["committed_at"] = max((ours or {}).get("committed_at") or 0, (theirs or {}).get("committed_at") or 0)
    out["items"] = sorted(items.values(), key=lambda e: -(e.get("at") or 0))
    return out

def update_history(doc: dict, flags: list[dict], src: str, audit: list | None = None) -> int:
    """data/flag_history.json: one row per (coin, kind) the scanner flagged — first / last time + hits + first price / MC + source —
    plus the last SCANS_MAX scan summaries (candidates, prefilter passes, rule passes per chain). 7-day window. Returns new rows."""
    now_ms = int(time.time() * 1000)
    rows = {r["id"]: r for r in doc.get("rows", []) if isinstance(r, dict) and r.get("id")}
    new = 0
    for f in flags:
        if not f.get("k") or not f.get("at"): continue
        rid = nkey(f) + "|" + (f.get("kind") or "runner")
        r = rows.get(rid)
        if not r:
            rows[rid] = {"id": rid, "k": f["k"], "sym": f.get("sym"), "chain": f.get("chain"), "kind": f.get("kind") or "runner",
                         "badge": f.get("badge"), "first": f["at"], "last": f["at"], "hits": 1, "px0": f.get("px0"), "mc0": f.get("mc0"),
                         "h1": f.get("h1"), "age_h": f.get("age_h"), "src": f.get("src") or src}
            new += 1
        else:
            r["last"] = max(r.get("last") or 0, f["at"]); r["hits"] = (r.get("hits") or 1) + 1
            if f["at"] < (r.get("first") or 1e18): r.update({"first": f["at"], "px0": f.get("px0"), "mc0": f.get("mc0")})
            s0 = f.get("src") or src
            if s0 not in str(r.get("src") or ""): r["src"] = (str(r.get("src") or "") + "+" + s0).strip("+")
    keep = sorted((r for r in rows.values() if now_ms - (r.get("last") or 0) < HIST_DAYS * 864e5), key=lambda r: -(r.get("first") or 0))[:HIST_MAX]
    scans = (doc.get("scans") or []) + (audit or [])
    doc.clear()
    doc.update({"updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "note": "v8.25 audit log: every coin the Kyvo scanner flagged (first / last flag, hits, source) + per-scan prefilter counts. Not financial advice.",
                "rows": keep, "scans": [x for x in scans if isinstance(x, dict)][-SCANS_MAX:]})
    return new

def merge_history(ours: dict, theirs: dict) -> dict:
    rows: dict[str, dict] = {}
    for doc in (theirs or {}, ours or {}):
        for r in doc.get("rows", []) or []:
            if not isinstance(r, dict) or not r.get("id"): continue
            o = rows.get(r["id"])
            if not o: rows[r["id"]] = dict(r); continue
            m = dict(o if (o.get("first") or 0) <= (r.get("first") or 0) else r)
            m["last"] = max(o.get("last") or 0, r.get("last") or 0); m["hits"] = max(o.get("hits") or 1, r.get("hits") or 1)
            rows[r["id"]] = m
    scans, seen = [], set()
    for x in sorted(((theirs or {}).get("scans") or []) + ((ours or {}).get("scans") or []), key=lambda x: x.get("t") or 0):
        key = (x.get("t"), x.get("chain"))
        if key not in seen: seen.add(key); scans.append(x)
    out = dict(theirs or {}); out.update({k: v for k, v in (ours or {}).items() if k not in ("rows", "scans")})
    out["rows"] = sorted(rows.values(), key=lambda r: -(r.get("first") or 0))[:HIST_MAX]; out["scans"] = scans[-SCANS_MAX:]
    return out

def worker_flags(url: str) -> list[dict]:
    """v8.25: recent 🏃 Runner flags from the Cloudflare fast-push worker (GET <worker>/flags). Empty URL / error -> []."""
    if not url: return []
    d = get(url.rstrip("/") + ("" if url.rstrip("/").endswith("/flags") else "/flags"))
    items = (d or {}).get("items") if isinstance(d, dict) else d
    out = []
    for f in items or []:
        if not isinstance(f, dict): continue
        if not (f.get("k") and f.get("chain") in GT_NET and f.get("addr") and isinstance(f.get("px0"), (int, float)) and isinstance(f.get("mc0"), (int, float))): continue
        out.append(dict({x: f.get(x) for x in ("k", "sym", "name", "chain", "addr", "pair", "img", "at", "px0", "mc0", "h1", "age_h")}, kind="runner", src="worker"))
    return out

def load_json(p: Path, default):
    try: return json.loads(p.read_text())
    except Exception: return default

def write_doc(path: Path, items: dict, doc: dict, commit: bool, now_ms: int) -> None:
    last_commit = doc.get("committed_at") or 0
    out = {"updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "committed_at": now_ms if commit else last_commit,
           "note": "Every coin flagged by Kyvo (Good Coins / Runner / Kolejna fala rule), first flag only. Entry = price at flag, no fees/slippage. Not financial advice.",
           "items": sorted(items.values(), key=lambda e: -e["at"])}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--flags", type=Path, default=Path(".kyvo_calls/flags.json"))
    ap.add_argument("--out", type=Path, default=Path("data/track_record.json"))
    ap.add_argument("--max-ohlcv", type=int, default=25)
    ap.add_argument("--merge-only", action="store_true", help="v8.25 loop mode: merge the scan's flags now, no network, no performance update")
    ap.add_argument("--perf-only", action="store_true", help="v8.25 kyvo-calls mode: update performance only, never add coins")
    ap.add_argument("--history", type=Path, help="v8.25 audit log data/flag_history.json (merge mode)")
    ap.add_argument("--audit", type=Path, help="v8.25 per-scan prefilter summary written by discord_calls.py --audit-out")
    ap.add_argument("--worker-url", default=os.environ.get("KYVO_WORKER_FLAGS_URL", "").strip(), help="v8.25 Cloudflare worker base URL (empty = off)")
    ap.add_argument("--dry-run", action="store_true", help="print what would change, write nothing")
    a = ap.parse_args()
    now_ms = int(time.time() * 1000)
    doc = load_json(a.out, {"items": []})
    items = {nkey(e): e for e in doc.get("items", []) if isinstance(e, dict) and e.get("k")}
    new = 0
    if not a.perf_only:
        flags = [f for f in load_json(a.flags, []) if isinstance(f, dict)]
        wf = worker_flags(a.worker_url) if a.worker_url else []
        new = merge_flags(items, flags, "loop") + merge_flags(items, wf, "worker")
        if a.history:
            hist = load_json(a.history, {})
            audit = load_json(a.audit, []) if a.audit else []
            hn = update_history(hist, flags + wf, "loop", audit if isinstance(audit, list) else [])
            if not a.dry_run:
                a.history.parent.mkdir(parents=True, exist_ok=True); a.history.write_text(json.dumps(hist, ensure_ascii=False, separators=(",", ":")))
                if a.audit: a.audit.unlink(missing_ok=True)      # consumed -> the next scan writes a fresh summary
            print(f"flag history: {len(hist.get('rows', []))} rows ({hn} new), {len(hist.get('scans', []))} scan summaries" + (f", worker flags {len(wf)}" if a.worker_url else ""))
    items = {k: e for k, e in items.items() if now_ms - e["at"] < KEEP_DAYS * 864e5}
    if a.merge_only:
        if not a.dry_run and (new or not a.out.exists()): write_doc(a.out, items, doc, False, now_ms)
        print(f"track record (merge): {len(items)} coins, {new} new flags saved now")
        gh = os.environ.get("GITHUB_OUTPUT")
        if gh:
            with open(gh, "a") as fh: fh.write(f"track_new={new}\n")
        return 0
    live = [e for e in items.values() if now_ms - e["at"] < 7 * 864e5]
    # current price: DexScreener tokens batch per chain (≤ 30 addresses / call)
    for ch in {e["chain"] for e in live}:
        grp = [e for e in live if e["chain"] == ch]
        for i in range(0, len(grp), 30):
            d = get(f"{DS}/tokens/v1/{ch}/" + ",".join(e["addr"] for e in grp[i:i + 30]))
            for e in grp[i:i + 30]:
                ps = [p for p in (d or []) if ((p.get("baseToken") or {}).get("address") or "").lower() == e["addr"].lower()]
                p = choose(ps)   # v8.13: the coin's main pool NOW (a stored pump.fun curve pair is dead after migration)
                if p and p.get("pairAddress") and p["pairAddress"] != e.get("pair") and not is_curve(p): e["pair"] = p["pairAddress"]; e.pop("ohFinal", None)
                if p and p.get("priceUsd"):
                    px = float(p["priceUsd"]); e["last"] = px; e["lastAt"] = now_ms; e["mcNow"] = p.get("marketCap") or p.get("fdv") or e.get("mcNow")
                    if px > (e.get("max") or 0): e["max"], e["maxAt"] = px, now_ms
                    if px > (e.get("maxLive") or 0): e["maxLive"], e["maxLiveAt"] = px, now_ms   # v8.24: live price seen after the flag
            time.sleep(1)
    # exact max / 1 h / 8 h from 15-min candles while the flag is ≤ 50 h old
    todo = sorted([e for e in live if e.get("pair") and now_ms - e["at"] < 50 * 3.6e6 and (not e.get("ohFinal") or e.get("maxV") != 2)],
                  key=lambda e: (e.get("maxV") == 2, e.get("ohAt", 0)))[: a.max_ohlcv]   # v8.24: items not yet on the fixed max rule first
    for e in todo:
        d = get(f"{GT}/networks/{GT_NET.get(e['chain'], e['chain'])}/pools/{e['pair']}/ohlcv/minute?aggregate=15&limit=200&currency=usd&token={e['addr']}")
        time.sleep(2.1)
        ol = sorted(((d or {}).get("data") or {}).get("attributes", {}).get("ohlcv_list") or [])
        # v8.24 max fix: only candles that START at / after the flag time. The 15-min candle containing the flag (its high is often
        # the spike BEFORE the flag) no longer counts. Max = recomputed from scratch each time (not only raised), so maxes stored
        # by the old rule get corrected while the flag is ≤ 50 h old: max(px0, highs after the flag, live prices seen after the flag).
        after = [r for r in ol if r[0] * 1000 >= e["at"]]
        if not after and not ol: continue
        mx = max([r[2] for r in after], default=0)
        best = max(e["px0"] or 0, mx, e.get("maxLive") or 0)
        e["max"] = best
        e["maxAt"] = int(next(r for r in after if r[2] == mx)[0] * 1000) if after and best == mx else (e.get("maxLiveAt") or e["at"]) if best == (e.get("maxLive") or 0) and best > (e["px0"] or 0) else e["at"]
        e["maxV"] = 2
        for h, f in ((1, "p1"), (8, "p8")):
            t = (e["at"] + h * 3.6e6) / 1000
            c = next((r for r in ol if r[0] <= t < r[0] + 900), None)
            if c and time.time() > t: e[f] = c[4]
        e["ohAt"] = now_ms
        if e.get("p8") is not None and now_ms - e["at"] > 9 * 3.6e6: e["ohFinal"] = 1
    last_commit = doc.get("committed_at") or 0
    commit = bool(new) or now_ms - last_commit >= 60 * 60e3
    if not a.dry_run: write_doc(a.out, items, doc, commit, now_ms)
    print(f"track record: {len(items)} coins ({new} new flags), ohlcv {len(todo)}, commit={str(commit).lower()}")
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        with open(gh, "a") as fh: fh.write(f"commit={'true' if commit else 'false'}\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
