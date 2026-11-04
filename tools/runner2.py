#!/usr/bin/env python3
"""Kyvo v8.34 — 🚀 Runner 2.0: a stricter Runner list, built right after every Runner scan in tools/kyvo_loop.py.

Candidates = this scan's 🏃 Runner (incl. 👑 / 🚀 / 📈 / 🐦 overrides and 🔁 second legs) and ⚡ Early Runner flags (.kyvo_push/flags.json).
A coin enters Runner 2.0 only if it passes ALL v8.34 filters (72 h backtest, kyvo_predictions_report.md):
  * age >= 1 h            — coins < 1 h old hit −50 % before 2x most of the time; a young coin waits in a queue and is
                            re-checked 30–60 min after its first flag with live DexScreener data, kept only if price >= 0.9× flag price
  * not +100 % in the last 1 h (late — the move already happened)
  * 1 h volume <= 1.5× MC  (churn / bots)
  * v8.35 👥 holders (data/holders.json, tools/holders.py — RugCheck, pools/LP/curve excluded): a coin flagged ⚠️ (holders < 300,
    top 10 > 30 %, top 1 > 10 %, dev rugged before, rugged) is NOT added; a Solana coin without holder data yet waits ≤ 15 min
  * v8.36 🧪 bundle (data/coin_checks.json, tools/coin_checks.py — first funders of the top 20 holders, public Solana RPC): a coin
    flagged ⚠️ bundle is NOT added (backtest on the 47 v8.34 entries: +$457 -> +$500, 1 coin dropped, it lost −43 %). No waiting:
    the RPC is slow (1–3 coins / run), so a coin without a bundle check yet goes in as before; one flagged later only gets the badge.
  * v8.39 late_6h: price > 5× its 6 h low (or its launch price when younger than 6 h) -> NOT added (the move already happened;
    24 h backtest 03–04.11: 14 -> 10 entries, all 3 winners kept, −40 % stops 6 -> 3, $100/coin −$117 -> +$5). 6 h low = lowest
    5-min candle BODY (min of open / close, wicks ignored) from GeckoTerminal, ≤ GT_MAX calls per run; no candles -> estimate
    from the DexScreener m5 / h1 / h6 moves (price 5 min / 1 h / 6 h ago).
  * v8.39 chased: price > 1.5× the coin's FIRST 🏃 Runner / ⚡ Early flag price -> NOT added (re-flags and re-checks within 6 h of
    the first flag; the ≥ 0.9× rule stays). E.g. $CHILLCATS entered 2 h after its first flag at 2.8× that price and lost −40 %.
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
    "recheckMaxPx": float(os.environ.get("KYVO_R2_RECHECK_MAX_PX", "1.5")),   # v8.39 chased: ≤ 1.5× the first Runner / Early flag price
    "late6hMax": float(os.environ.get("KYVO_R2_LATE6H_MAX", "5")),           # v8.39 late_6h: ≤ 5× the 6 h low
}
GT = "https://api.geckoterminal.com/api/v2"
GT_NET = {"solana": "solana", "bsc": "bsc", "robinhood": "robinhood"}
GT_MAX = int(os.environ.get("KYVO_R2_GT_MAX", "6"))       # v8.39: GeckoTerminal candle reads per run (public API ~30 req/min)
FIRST_KEEP_S = 6 * 3600                                    # v8.39: first Runner / Early flag of the last 6 h (older flags = new run, no cap)
KEEP_S = 72 * 3600
MAX_COINS = 120
KINDS = ("runner", "leg2", "early")
HOLD_WAIT_S = int(os.environ.get("KYVO_R2_HOLD_WAIT_S", "300"))   # v8.41: 15 -> 5 min (holders.py now also runs per chain); v8.35: max wait for the holder check before a Solana coin is let in
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

def late_6h(px, low) -> str | None:
    """v8.39: 'late_6h' when the price is more than late6hMax × its 6 h low (unknown low -> never blocks)."""
    px, low = nf(px), nf(low)
    if px and low and low > 0 and px > F["late6hMax"] * low: return "late_6h"
    return None

def chased(px, first_px) -> str | None:
    """v8.39: 'chased' when the price is more than recheckMaxPx × the first Runner / Early flag price (unknown -> never blocks)."""
    px, first_px = nf(px), nf(first_px)
    if px and first_px and first_px > 0 and px > F["recheckMaxPx"] * first_px: return "chased"
    return None

def body_low(ohlcv: list, t_end: float, span_s: float = 6 * 3600) -> float | None:
    """v8.39: lowest candle body (min of open / close; wicks / single bad prints ignored) of [t, o, h, l, c, v] candles in the
    span_s seconds before t_end (seconds). For a coin younger than span_s this is the low since its first candle (≈ launch)."""
    vals = [min(r[1], r[4]) for r in ohlcv or [] if len(r) >= 5 and t_end - span_s <= r[0] <= t_end and r[1] and r[4] and min(r[1], r[4]) > 0]
    return min(vals) if vals else None

def low_from_moves(px, m5=None, h1=None, h6=None) -> float | None:
    """v8.39 fallback without candles: lowest of the price now / 5 min / 1 h / 6 h ago (DexScreener priceChange; for a pair younger
    than 6 h, h6 runs from its first trade). Under-estimates the real move (never stricter than the candle rule)."""
    px = nf(px)
    if not px: return None
    out = [px]
    for ch in (m5, h1, h6):
        ch = nf(ch)
        if ch is not None and ch > -100: out.append(px / (1 + ch / 100))
    return min(out)

def gt_low6h(chain: str, pair: str, addr: str, now: float) -> float | None:
    """v8.39: 6 h body low from GeckoTerminal 5-min candles (72 = 6 h) of the coin's pool, priced in the coin itself. Error -> None."""
    if not (pair and addr and chain in GT_NET): return None
    url = f"{GT}/networks/{GT_NET[chain]}/pools/{pair}/ohlcv/minute?aggregate=5&limit=72&currency=usd&token={addr}"
    try:
        r = urllib.request.Request(url, headers={"User-Agent": "kyvo-runner2", "Accept": "application/json"})
        with urllib.request.urlopen(r, timeout=15) as f: d = json.load(f)
    except Exception as e:
        print(f"runner2: GeckoTerminal {chain} error {type(e).__name__}"); return None
    return body_low(((d or {}).get("data") or {}).get("attributes", {}).get("ohlcv_list") or [], now)

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
                      "m5": nf((p.get("priceChange") or {}).get("m5")), "h6": nf((p.get("priceChange") or {}).get("h6")),   # v8.39 late_6h fallback
                      "vol1h": nf((p.get("volume") or {}).get("h1")), "age_h": (time.time() * 1000 - cr) / 3.6e6 if cr else None}
    return out

def load(p: Path, d):
    try: return json.loads(p.read_text())
    except Exception: return d

# v8.42 🔥 Trend picks enter Runner 2.0 only when they are the strongest kind (on top of every normal Runner 2.0 check):
# wide holder base, low concentration, a clean (not overheated) 1 h move on clearly rising volume, buyers in charge, MC ≥ $1M.
TREND_R2 = {"holders": 2000, "t10": 25, "t1": 5, "h1_max": 60, "vup": 1.3, "br": 0.55, "mc_min": 300_000}   # price side = the Runner
# rule (stricter h1 / vol / MC made the 03–04.11 backtest worse); the extra strictness is the holder base and buyer share.
# 🌱 Wczesny trend picks always go through the re-check queue (30–60 min later, live data, every normal check incl. ≤ 5× the 6 h low,
# ≤ 1.5× the first flag, ≥ 0.9× the flag price) and then need ≥ 300 holders AND more than at the flag, top 10 ≤ 30%, top 1 ≤ 8%.
ETREND_R2 = {"holders": 300, "t10": 30, "t1": 8}

def etrend_strict(v: dict, h: dict | None) -> str | None:
    """None = ok, 'wait' = holders not rising yet (stays queued), else the reason."""
    if not h or h.get("h") is None: return "wait"
    t0 = ((v.get("f") or {}).get("trend") or {}).get("holders") or 0; E = ETREND_R2
    if (h.get("t10") or 0) > E["t10"] or (h.get("t1") or 0) > E["t1"]: return "etrend_holders"
    if h["h"] < E["holders"] or h["h"] <= t0: return "wait"
    return None

def trend_strict(f: dict, mc) -> str | None:
    t = f.get("trend") or {}; T = TREND_R2
    if (t.get("holders") or 0) < T["holders"] or (t.get("t10") if t.get("t10") is not None else 99) > T["t10"] or (t.get("t1") or 0) > T["t1"]: return "trend_holders"
    if (t.get("h1") or 0) > T["h1_max"] or (t.get("vup") or 0) < T["vup"] or (t.get("br") or 0) < T["br"] or (mc or 0) < T["mc_min"]: return "trend_weak"
    return None

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
    ap.add_argument("--holders", type=Path, default=Path("data/holders.json"), help="v8.35 holder check (tools/holders.py)")
    ap.add_argument("--checks", type=Path, default=None, help="v8.36 🧪 bundle check (tools/coin_checks.py -> data/coin_checks.json)")
    ap.add_argument("--history", type=Path, default=Path("data/flag_history.json"), help="v8.39 first Runner / Early flag prices (read only)")
    ap.add_argument("--no-net", action="store_true", help="no DexScreener (tests): no re-check, no live price update")
    ap.add_argument("--dry-run", action="store_true", help="print only, write nothing")
    a = ap.parse_args()
    now = time.time(); nowms = int(now * 1000)
    st = load(a.state, {}); q: dict = st.get("queue") or {}
    doc = load(a.out, {}); coins = {c["k"].lower(): c for c in doc.get("coins") or [] if c.get("k") and now - (c.get("at") or 0) / 1000 < KEEP_S}
    flags = [f for f in load(a.flags, []) if f.get("kind") in KINDS and f.get("k")]
    added, queued, skipped = [], 0, {}
    # v8.39 first 🏃 Runner / ⚡ Early flag price per coin: own memory (state) + data/flag_history.json (read only), earliest wins
    first: dict = {k: v for k, v in (st.get("first") or {}).items() if isinstance(v, list) and len(v) == 2 and now - v[0] / 1000 < FIRST_KEEP_S}
    def note_first(k, t, px):
        t, px = nf(t), nf(px)
        if not (t and px and px > 0) or now - t / 1000 > FIRST_KEEP_S: return
        if k not in first or t < first[k][0]: first[k] = [int(t), px]
    for r in (load(a.history, {}) or {}).get("rows") or []:
        if isinstance(r, dict) and r.get("kind") in ("runner", "early") and r.get("k"): note_first(str(r["k"]).lower(), r.get("first"), r.get("px0"))
    for f in flags:
        if f.get("kind") in ("runner", "early"): note_first(f["k"].lower(), f.get("at"), f.get("px0"))
    gt_n = [0]; gt_cache: dict = {}
    def low6h(k, e, px, m5=None, h1=None, h6=None):
        """v8.39: 6 h low — GeckoTerminal candle body low (≤ GT_MAX reads / run), else the DexScreener-move estimate."""
        if k in gt_cache: return gt_cache[k]
        lo = None
        if not a.no_net and gt_n[0] < GT_MAX:
            gt_n[0] += 1
            lo = gt_low6h(k.split(":", 1)[0], e.get("pair") or "", e.get("addr") or k.split(":", 1)[1], now)
            time.sleep(2.1)
        if lo is None: lo = low_from_moves(px, m5, h1, h6)
        else: lo = min(lo, nf(px) or lo)
        gt_cache[k] = lo
        return lo
    H = (load(a.holders, {}) or {}).get("coins") or {}; hp: dict = {k: t for k, t in (st.get("hold_wait") or {}).items() if now - t < 3 * 3600}
    def hold_ok(k) -> bool:
        """v8.35: flagged ⚠️ -> never; Solana without holder data yet -> wait (≤ HOLD_WAIT_S since first seen), then let it in."""
        h = H.get(k)
        if h is not None:
            if h.get("w"): skipped["holders"] = skipped.get("holders", 0) + 1; return False
            return True
        if not k.startswith("solana:"): return True
        t0 = hp.setdefault(k, now)
        if now - t0 < HOLD_WAIT_S: skipped["holders_wait"] = skipped.get("holders_wait", 0) + 1; return False
        return True
    CB = {x.lower(): v for x, v in ((load(a.checks, {}) or {}).get("coins") or {}).items()} if a.checks else {}
    def bundled(k) -> bool:
        """v8.36: ⚠️ bundle / wallet factory (coin_checks.py) -> never added."""
        return bool(((CB.get(k) or {}).get("b") or {}).get("flag"))
    def add(k, f, px, mc, h1, age_h, vol1h, how):
        if not entry_ok(px, mc): skipped["entry"] = skipped.get("entry", 0) + 1; return
        if bundled(k): q.pop(k, None); skipped["bundle"] = skipped.get("bundle", 0) + 1; return
        if not hold_ok(k):
            if k in hp and k not in q:   # v8.35: waiting for holder data -> queue it (due on the next scan, re-checked live like a young coin)
                q[k] = {"t": int(now - F["recheckMinS"]), "px0": px, "mc0": mc, "f": {x: f.get(x) for x in ("k", "sym", "name", "chain", "addr", "pair", "img", "at", "px0", "pd", "trend")}, "src": f.get("src") or src_of(f), "hw": 1}
            return
        coins[k] = {"k": f["k"], "sym": f.get("sym"), "name": f.get("name"), "chain": f.get("chain"), "addr": f.get("addr"), "pair": f.get("pair") or "",
                    "img": f.get("img"), "src": f.get("src") or src_of(f), "at": nowms, "px0": px, "mc0": mc, "flagAt": f.get("at"), "flagPx": f.get("px0"),
                    "how": how, "why": why_txt(age_h, h1, vol1h, mc), "h1": h1, "ageH": round(age_h, 2) if age_h is not None else None,
                    "last": px, "lastAt": nowms, "mcNow": mc, "max": px, "maxAt": nowms,
                    "hold": {x: H[k].get(x) for x in ("h", "t10", "t1")} if k in H else None,
                    "pd": f.get("pd") if isinstance(f.get("pd"), dict) else None}   # v8.38 ⚠️ po dumpie (badge only)
        q.pop(k, None); hp.pop(k, None); added.append(coins[k])
    # 1) this scan's flags
    for f in sorted(flags, key=lambda f: 0 if f.get("kind") != "early" else 1):
        k = f["k"].lower()
        if k in coins: continue
        sn = f.get("snap") or {}
        h1 = nf(f.get("h1") if f.get("h1") is not None else sn.get("h1")); age_h = nf(f.get("age_h") if f.get("age_h") is not None else sn.get("age_h"))
        vol1h = nf(f.get("vol1h") if f.get("vol1h") is not None else sn.get("vol1h")); px, mc = nf(f.get("px0")), nf(f.get("mc0"))
        if f.get("badge") == "climb": continue   # v8.44 🫏 Cichy wspinacz: Runner tab only, never 🚀 Runner 2.0
        why = check(mc, h1, age_h, vol1h)
        if why is None and f.get("badge") == "trend": why = trend_strict(f, mc)   # v8.42 only the strongest 🔥 Trend picks
        if f.get("badge") == "etrend" and why in (None, "young"): why = "young"     # v8.42 🌱 always re-checked later (holders must rise)
        qe = q.get(k)
        if why is None and qe and qe.get("px0") and px and px < F["recheckMinPx"] * qe["px0"]: why = "dumped"   # was young: must hold 0.9× of its first flag
        if why is None: why = chased(px, (first.get(k) or [0, None])[1])        # v8.39: re-flag far above the first flag
        if why is None: why = late_6h(px, low6h(k, f, px, sn.get("m5", f.get("m5")), h1, f.get("h6", sn.get("h6"))))   # v8.39
        if why is None: add(k, f, px, mc, h1, age_h, vol1h, "scan"); continue
        if why in ("late_6h", "chased"): q.pop(k, None)
        if why == "young" and not qe:
            q[k] = {"t": int(now), "px0": px, "mc0": mc, "f": {x: f.get(x) for x in ("k", "sym", "name", "chain", "addr", "pair", "img", "at", "px0", "pd", "trend")}, "src": src_of(f)}; queued += 1
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
        if why is None: why = chased(m.get("px"), (first.get(k) or [0, v.get("px0")])[1])   # v8.39 ≤ 1.5× the first flag price
        if why is None: why = late_6h(m.get("px"), low6h(k, v.get("f") or {}, m.get("px"), m.get("m5"), m.get("h1"), m.get("h6")))   # v8.39
        if why is None and k in H and H[k].get("w"): why = "holders"
        if why is None and not hold_ok(k): continue          # v8.35 waits for holder data (stays queued)
        if why is None and v.get("src") == "etrend":         # v8.42 🌱 Wczesny trend: holders ≥ 300 and rising, low concentration
            why = etrend_strict(v, H.get(k))
            if why == "wait":
                if now - v["t"] < F["recheckMaxS"]: continue
                why = "etrend_holders_flat"
        if why: q.pop(k, None); skipped["recheck_" + why] = skipped.get("recheck_" + why, 0) + 1; continue
        add(k, dict(v["f"], src=v.get("src")), m["px"], m["mc"], m["h1"], m["age_h"], m["vol1h"], f"recheck {round((now - v['t']) / 60)} min")
    # 3) live price for the list ('% since it entered Runner 2.0' in the app)
    for k, c in coins.items():
        m = live.get(k)
        if not m or not (m.get("px") and m["px"] > 0): continue
        c["last"], c["lastAt"], c["mcNow"] = m["px"], nowms, m.get("mc") or c.get("mcNow")
        if m["px"] > (c.get("max") or 0): c["max"], c["maxAt"] = m["px"], nowms
    for k, c in coins.items():                             # v8.35: holder facts that arrive / change after entry -> shown in the app
        if k in H: c["hold"] = {x: H[k].get(x) for x in ("h", "t10", "t1", "w")}
    lst = sorted(coins.values(), key=lambda c: -c["at"])[:MAX_COINS]
    out = {"v": 835, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)), "filter": F, "exit": EXIT_HINT,
           "note": "🚀 Runner 2.0: Runner / Early coins that passed the v8.34 filters (age ≥ 1 h, ≤ +100% 1 h, vol 1h ≤ 1.5× MC, v8.35: no ⚠️ few-holders / concentration flag, v8.39: ≤ 5× the 6 h low, ≤ 1.5× the first flag price); px0 / mc0 = when it entered. tools/runner2.py",
           "coins": lst}
    for c in added: print(f"🚀 Runner 2.0 + ${c['sym']} MC {round(c['mc0'] or 0)} ({c['src']}, {c['how']}; {c['why']})")
    print(f"runner2: {len(flags)} candidates, +{len(added)} added, {queued} queued young, queue {len(q)}, skipped {skipped}, list {len(lst)}")
    if a.dry_run: return 0
    a.out.parent.mkdir(parents=True, exist_ok=True); a.out.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    a.state.parent.mkdir(parents=True, exist_ok=True); st["queue"] = q; st["hold_wait"] = hp; st["first"] = first; a.state.write_text(json.dumps(st))
    go = os.environ.get("GITHUB_OUTPUT")
    if go and added:
        with open(go, "a") as fh: fh.write("runner2_new=true\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
