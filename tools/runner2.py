#!/usr/bin/env python3
"""Kyvo v8.34 — 🚀 Runner 2.0: a stricter Runner list, built right after every Runner scan in tools/kyvo_loop.py.

Candidates = this scan's 🏃 Runner (incl. 👑 / 🚀 / 📈 / 🐦 overrides and 🔁 second legs) and ⚡ Early Runner flags (.kyvo_push/flags.json).
A coin enters Runner 2.0 only if it passes ALL v8.34 filters (72 h backtest, kyvo_predictions_report.md):
  * age >= 1 h            — coins < 1 h old hit −50 % before 2x most of the time; a young coin waits in a queue and is
                            re-checked 30–60 min after its first flag with live DexScreener data, kept only if price >= 0.9× flag price
  * not +100 % in the last 1 h (late — the move already happened)
  * 1 h volume <= 1.5× MC  (churn / bots)
The plain 🏃 Runner list, its pushes and ⚡ Early pushes are NOT changed by this (v8.33 behaviour).
Entry = price / MC at the moment the coin passed (validated like pairs.js entryCheck: MC < $1K or price vs MC off > 5× -> not added).
Output data/runner2.json (the app's 🚀 Runner 2.0 tab, ~72 h) — tools/kyvo_push.py pushes new entries (type 'runner2', tag runner2).
State .kyvo_push/runner2_state.json (young queue). Thresholds: env KYVO_R2_* (defaults below). No keys, public DexScreener only.
Local test: python3 tools/runner2.py --flags x.json --out /tmp/r2.json --state /tmp/r2s.json --no-net
"""
from __future__ import annotations
import argparse, json, os, sys, time, urllib.request
from pathlib import Path

F = {
    "ageMinH": float(os.environ.get("KYVO_R2_AGE_MIN_H", "1")),
    "h1Max": float(os.environ.get("KYVO_R2_H1_MAX", "100")),
    "volMcMax": float(os.environ.get("KYVO_R2_VOLMC_MAX", "1.5")),
    "recheckMinS": int(os.environ.get("KYVO_R2_RECHECK_MIN_S", "1800")),
    "recheckMaxS": int(os.environ.get("KYVO_R2_RECHECK_MAX_S", "3600")),
    "recheckMinPx": float(os.environ.get("KYVO_R2_RECHECK_MIN_PX", "0.9")),
}
KEEP_S = 72 * 3600
MAX_COINS = 120
KINDS = ("runner", "leg2", "early")
EXIT_HINT = {"pl": "Sprzedaj ½ na x2, resztę trailing −30%", "en": "Sell ½ at 2x, trail the rest −30%"}

def nf(v):
    try: return float(v) if v is not None else None
    except (TypeError, ValueError): return None

def check(mc, h1, age_h, vol1h) -> str | None:
    """None = passes; else 'young' / 'late_h1' / 'churn'. Unknown age -> treated as young (never let an unknown-age coin in);
       unknown h1 / volume never block (the Runner rule already required a real move + volume)."""
    mc, h1, age_h, vol1h = nf(mc), nf(h1), nf(age_h), nf(vol1h)
    if age_h is None or age_h < F["ageMinH"]: return "young"
    if h1 is not None and h1 > F["h1Max"]: return "late_h1"
    if mc and vol1h is not None and vol1h / mc > F["volMcMax"]: return "churn"
    return None

def entry_ok(px, mc) -> bool:
    return bool(px and px > 0 and mc and mc >= 1000)

def ds_tokens(chain: str, addrs: list[str]) -> dict:
    """address(lower) -> live data of the most liquid pair (DexScreener tokens/v1, ≤ 30 per call). Error -> what we got."""
    out = {}
    for i in range(0, len(addrs), 30):
        try:
            r = urllib.request.Request(f"https://api.dexscreener.com/tokens/v1/{chain}/" + ",".join(addrs[i:i + 30]), headers={"User-Agent": "kyvo-runner2"})
            with urllib.request.urlopen(r, timeout=20) as f: ps = json.load(f)
        except Exception as e:
            print(f"runner2: DexScreener {chain} error {type(e).__name__}"); continue
        for p in ps or []:
            a = str((p.get("baseToken") or {}).get("address", "")).lower()
            liq = (p.get("liquidity") or {}).get("usd") or 0
            if a in out and out[a]["_liq"] >= liq: continue
            cr = p.get("pairCreatedAt")
            out[a] = {"_liq": liq, "px": nf(p.get("priceUsd")), "mc": nf(p.get("marketCap") or p.get("fdv")), "h1": nf((p.get("priceChange") or {}).get("h1")),
                      "vol1h": nf((p.get("volume") or {}).get("h1")), "age_h": (time.time() * 1000 - cr) / 3.6e6 if cr else None}
    return out

def load(p: Path, d):
    try: return json.loads(p.read_text())
    except Exception: return d

def src_of(f: dict) -> str:
    return f.get("badge") or ("early" if f.get("kind") == "early" else "leg2" if f.get("kind") == "leg2" else "runner")

def why_txt(age_h, h1, vol1h, mc) -> str:
    out = []
    if age_h is not None: out.append(f"age {age_h:.1f}h")
    if h1 is not None: out.append(f"{h1:+.0f}% 1h")
    if vol1h is not None and mc: out.append(f"vol/MC {vol1h / mc:.2f}")
    return " · ".join(out)

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--flags", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("data/runner2.json"))
    ap.add_argument("--state", type=Path, default=Path(".kyvo_push/runner2_state.json"))
    ap.add_argument("--no-net", action="store_true", help="no DexScreener (tests): no re-check, no live price update")
    ap.add_argument("--dry-run", action="store_true", help="print only, write nothing")
    a = ap.parse_args()
    now = time.time(); nowms = int(now * 1000)
    st = load(a.state, {}); q: dict = st.get("queue") or {}
    doc = load(a.out, {}); coins = {c["k"].lower(): c for c in doc.get("coins") or [] if c.get("k") and now - (c.get("at") or 0) / 1000 < KEEP_S}
    flags = [f for f in load(a.flags, []) if f.get("kind") in KINDS and f.get("k")]
    added, queued, skipped = [], 0, {}
    def add(k, f, px, mc, h1, age_h, vol1h, how):
        if not entry_ok(px, mc): skipped["entry"] = skipped.get("entry", 0) + 1; return
        coins[k] = {"k": f["k"], "sym": f.get("sym"), "name": f.get("name"), "chain": f.get("chain"), "addr": f.get("addr"), "pair": f.get("pair") or "",
                    "img": f.get("img"), "src": f.get("src") or src_of(f), "at": nowms, "px0": px, "mc0": mc, "flagAt": f.get("at"), "flagPx": f.get("px0"),
                    "how": how, "why": why_txt(age_h, h1, vol1h, mc), "h1": h1, "ageH": round(age_h, 2) if age_h is not None else None,
                    "last": px, "lastAt": nowms, "mcNow": mc, "max": px, "maxAt": nowms}
        q.pop(k, None); added.append(coins[k])
    # 1) this scan's flags
    for f in sorted(flags, key=lambda f: 0 if f.get("kind") != "early" else 1):
        k = f["k"].lower()
        if k in coins: continue
        sn = f.get("snap") or {}
        h1 = nf(f.get("h1") if f.get("h1") is not None else sn.get("h1")); age_h = nf(f.get("age_h") if f.get("age_h") is not None else sn.get("age_h"))
        vol1h = nf(f.get("vol1h") if f.get("vol1h") is not None else sn.get("vol1h")); px, mc = nf(f.get("px0")), nf(f.get("mc0"))
        why = check(mc, h1, age_h, vol1h)
        qe = q.get(k)
        if why is None and qe and qe.get("px0") and px and px < F["recheckMinPx"] * qe["px0"]: why = "dumped"   # was young: must hold 0.9× of its first flag
        if why is None: add(k, f, px, mc, h1, age_h, vol1h, "scan"); continue
        if why == "young" and not qe:
            q[k] = {"t": int(now), "px0": px, "mc0": mc, "f": {x: f.get(x) for x in ("k", "sym", "name", "chain", "addr", "pair", "img", "at", "px0")}, "src": src_of(f)}; queued += 1
        skipped[why] = skipped.get(why, 0) + 1
    # 2) young queue: re-check 30–60 min after the first flag with live data
    for k in [k for k, v in q.items() if now - v["t"] > F["recheckMaxS"] + 600 or k in coins]: q.pop(k, None)
    due = {k: v for k, v in q.items() if now - v["t"] >= F["recheckMinS"]}
    live: dict = {}
    if not a.no_net:
        by: dict = {}
        for k in list(due) + list(coins):   # original-case address (Solana addresses are case-sensitive); results keyed lower-case
            e = coins.get(k) or (due.get(k) or {}).get("f") or {}
            ch = k.split(":", 1)[0]; ad = e.get("addr") or k.split(":", 1)[1]
            by.setdefault(ch, set()).add(ad)
        for ch, ads in by.items(): live.update({f"{ch}:{ad}": v for ad, v in ds_tokens(ch, sorted(ads)).items()})
    for k, v in due.items():
        m = live.get(k)
        if not m: continue
        why = check(m["mc"], m["h1"], m["age_h"], m["vol1h"])
        if why is None and v.get("px0") and m.get("px") and m["px"] < F["recheckMinPx"] * v["px0"]: why = "dumped"
        if why == "young" and now - v["t"] < F["recheckMaxS"]: continue
        if why: q.pop(k, None); skipped["recheck_" + why] = skipped.get("recheck_" + why, 0) + 1; continue
        add(k, dict(v["f"], src=v.get("src")), m["px"], m["mc"], m["h1"], m["age_h"], m["vol1h"], f"recheck {round((now - v['t']) / 60)} min")
    # 3) live price for the list ('% since it entered Runner 2.0' in the app)
    for k, c in coins.items():
        m = live.get(k)
        if not m or not (m.get("px") and m["px"] > 0): continue
        c["last"], c["lastAt"], c["mcNow"] = m["px"], nowms, m.get("mc") or c.get("mcNow")
        if m["px"] > (c.get("max") or 0): c["max"], c["maxAt"] = m["px"], nowms
    lst = sorted(coins.values(), key=lambda c: -c["at"])[:MAX_COINS]
    out = {"v": 834, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)), "filter": F, "exit": EXIT_HINT,
           "note": "🚀 Runner 2.0: Runner / Early coins that passed the v8.34 filters (age ≥ 1 h, ≤ +100% 1 h, vol 1h ≤ 1.5× MC); px0 / mc0 = when it entered. tools/runner2.py",
           "coins": lst}
    for c in added: print(f"🚀 Runner 2.0 + ${c['sym']} MC {round(c['mc0'] or 0)} ({c['src']}, {c['how']}; {c['why']})")
    print(f"runner2: {len(flags)} candidates, +{len(added)} added, {queued} queued young, queue {len(q)}, skipped {skipped}, list {len(lst)}")
    if a.dry_run: return 0
    a.out.parent.mkdir(parents=True, exist_ok=True); a.out.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    a.state.parent.mkdir(parents=True, exist_ok=True); st["queue"] = q; a.state.write_text(json.dumps(st))
    go = os.environ.get("GITHUB_OUTPUT")
    if go and added:
        with open(go, "a") as fh: fh.write("runner2_new=true\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
