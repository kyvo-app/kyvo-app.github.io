#!/usr/bin/env python3
"""Kyvo v8.31 — 🎮 GTA 6 push detector (server side, GitHub Actions only; never the trading VPS).

Same matching as the app's 🎮 GTA 6 tab (gta.js: STRONG / MEDIUM / SYM_OK, ≥ PF_MIN GTA pump.fun callouts), run by
tools/kyvo_loop.py in the background every --gta-every (240 s): 8 DexScreener searches (the gta.js QUERIES) + one batch for
coins named by ≥ 3 GTA callouts (data/pf_social.json) or by a tracked tweet (data/x_live.json) -> ~2–3 DexScreener calls a
minute. Writes .kyvo_push/gta_alerts.json = every GTA coin that RUNS NOW (coin_runs(): stricter than the tab's 🚀 Rosną):
  strong match (name / symbol / ≥ 3 GTA callouts) · MC ≥ $25K · liquidity ≥ $8K (or still on the pump.fun curve) ·
  vol 1 h ≥ $5K · ≥ 20 buys in 1 h and buys ≥ 0.8 × sells · +20 % in 1 h, or +60 % in 6 h while not falling in 1 h;
  a coin < 1 h old must still pass on the next read ≥ 2 min later ("confirmed", .kyvo_push/gta_seen.json) — flash-pump / rug guard
  (real case 2026-11-01: a 32-min-old '$GTA 6 Coin' passed at $340K MC +753 % and was at $1.7K MC ~10 min later).
tools/kyvo_push.py (--gta) turns those into '🎮 GTA' pushes (one per coin, one more at ≥ 3x the alerted MC and ≥ $250K) and
reads the GTA tweets itself from data/x_live.json (tweet_reason(): every original @RockstarGames post about GTA VI, fan / news
accounts only for big news — trailer, release date, delay, pre-orders, price …). Rate limits + tag 'gta' live in kyvo_push.py.
v8.32 '📈 od dodania': every strong-matched GTA coin (name / symbol / ≥ 3 callouts) gets a first-seen record in --added
(data/gta_added.json, runtime file the loop commits with the feeds): first-seen time + price + MC, max price seen since then
(sampled on every read, ~240 s — wicks between two reads are missed). A coin pushed as '🎮 GTA' uses the PUSH price/time as its
reference (kyvo_push.py state "gta_coins", --state). Entries older than ADDED_KEEP_D (7) days are pruned, at most ADDED_MAX (500).
Local test:  python3 tools/gta_push.py --out /tmp/gta_alerts.json --added /tmp/gta_added.json --print
"""
from __future__ import annotations
import argparse, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

STRONG = [
    re.compile(r"(^|[^a-z0-9])gta ?(6|vi|v|iv|5|online)?([^a-z0-9]|$)"),
    re.compile(r"(^|[^a-z0-9])gta(6|vi|v|iv|5)([^a-z0-9]|$)"),
    re.compile(r"grand ?theft"), re.compile(r"(^|[^a-z0-9])theft ?auto"),
    re.compile(r"vice ?city"), re.compile(r"(^|[^a-z0-9])leonida([^a-z0-9]|$)"), re.compile(r"(^|[^a-z0-9])los ?santos([^a-z0-9]|$)"),
    re.compile(r"liberty ?city"), re.compile(r"rockstar ?games"), re.compile(r"jason ?duval"), re.compile(r"lucia ?caminos"),
    re.compile(r"tommy ?vercetti"), re.compile(r"niko ?bellic"), re.compile(r"trevor ?philips"), re.compile(r"franklin ?clinton"),
]
MEDIUM = [re.compile(r"(^|[^a-z0-9])(jason|lucia|trevor|cj|rockstar|wasted|vice|duval|caminos)([^a-z0-9]|$)"), re.compile(r"san ?andreas")]
SYM_OK = re.compile(r"^(gta ?6|gta ?vi|gta ?v|gta ?iv|gta ?5|gta ?online|gta ?6 ?coin|vicecity|vice ?city|leonida|lossantos)$")
QUERIES = ["gta 6", "gta vi", "gta6", "gta", "grand theft auto", "vice city", "leonida", "los santos"]
PF_MIN = 3

# push thresholds (coin_runs) — real DexScreener fields only
MC_MIN, LIQ_MIN, VOL1H_MIN, BUYS1H_MIN = 25_000, 8_000, 5_000, 20
H1_MIN, H6_MIN = 20, 60
NEW_AGE_H = 6                      # '🆕 nowy' label in the push body
CONFIRM_AGE_H, CONFIRM_GAP_S = 1, 120   # a coin < 1 h old must still run on a 2nd detector read ≥ 2 min later (flash pump / rug guard)
MILESTONE_X, MILESTONE_MC = 3, 250_000

# tweets: GTA VI subject + "big news" words (fan / news accounts need both; @RockstarGames needs only the subject)
GTA6_RE = re.compile(r"(?<![a-z0-9])(gta ?(6|vi)|gtavi|grand theft auto (6|vi)|leonida|vice city|jason (and|&) lucia|jason duval|lucia caminos)(?![a-z0-9])", re.I)
BIG_RE = re.compile(r"(?<![a-z0-9])(trailer|release date|releases? on|launch(es)? on|out now|available now|delay(ed|s)?|postpone[ds]?|pushed back|"
                    r"pre-?orders?|pre-?purchase|price[ds]?|\$69\.99|\$79\.99|\$99\.99|gameplay reveal|first gameplay|officially|confirmed|announce[ds]?|"
                    r"announcement|screenshots?|box art|cover art|launch date|release window|premiere)(?![a-z0-9])", re.I)
NOT_BIG_RE = re.compile(r"(?<![a-z0-9])(soundtrack|original score|vinyl|merch|gta online|survey|poll|intend to)(?![a-z0-9])", re.I)
GTA_HANDLES_OFFICIAL = {"rockstargames"}
TWEET_MAX_AGE_S = 45 * 60

ADDED_KEEP_D, ADDED_MAX = 7, 500

UA = {"User-Agent": "Mozilla/5.0 (kyvo-gta/8.31)", "Accept": "application/json"}

def norm(s) -> str:
    s = re.sub(r"[\u2019'`]", "", str(s or "").lower())
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9#]+", " ", s)).strip()

def strong(s) -> bool:
    n = norm(s); return bool(n) and any(r.search(n) for r in STRONG)

def medium(s) -> bool:
    n = norm(s); return bool(n) and any(r.search(n) for r in MEDIUM)

def match_coin(name: str, sym: str, desc: str = "", pf_calls: int = 0) -> str | None:
    """gta.js matchCoin: None | 'name' | 'symbol' | 'desc' | 'calls'."""
    if strong(name): return "name"
    if SYM_OK.search(norm(sym)): return "symbol"
    if strong(desc) and (medium(name) or medium(sym) or strong(sym)): return "desc"
    if (pf_calls or 0) >= PF_MIN: return "calls"
    return None

def tweet_reason(t: dict) -> str | None:
    """why a GTA-account tweet deserves a '🎮 GTA' push (None = tab only). Replies never push."""
    h = str(t.get("handle") or "").lower()
    if t.get("role") != "gta" or t.get("is_reply"): return None
    txt = " ".join([t.get("text") or "", (t.get("quote") or {}).get("text") or ""] + [m.get("alt") or "" for m in t.get("media") or []])
    txt = re.sub(r"https?://\S+", "", txt)
    if not GTA6_RE.search(txt): return None
    if h in GTA_HANDLES_OFFICIAL: return "official GTA VI post"
    if NOT_BIG_RE.search(txt): return None                             # soundtrack / merch / GTA Online promos are not "big news"
    m = BIG_RE.search(txt)
    return f"big news '{m.group(1).lower()}'" if m else None

def _get(url: str, timeout: int = 15):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def _num(v):
    try: return float(v)
    except Exception: return None

def coin_from_pair(p: dict) -> dict:
    b = p.get("baseToken") or {}
    ch, addr = p.get("chainId") or "", b.get("address") or ""
    tx = ((p.get("txns") or {}).get("h1") or {})
    liq = _num((p.get("liquidity") or {}).get("usd"))
    return {"k": f"{ch}:{addr}", "chain": ch, "addr": addr, "pair": p.get("pairAddress"), "px": _num(p.get("priceUsd")), "sym": b.get("symbol") or "", "name": b.get("name") or "",
            "dex": p.get("dexId") or "", "img": (p.get("info") or {}).get("imageUrl"),
            "mc": _num(p.get("marketCap")) or _num(p.get("fdv")), "liq": liq,
            "vol1h": _num((p.get("volume") or {}).get("h1")) or 0, "vol24": _num((p.get("volume") or {}).get("h24")) or 0,
            "h1": _num((p.get("priceChange") or {}).get("h1")), "h6": _num((p.get("priceChange") or {}).get("h6")),
            "buys1h": tx.get("buys") or 0, "sells1h": tx.get("sells") or 0,
            "created": p.get("pairCreatedAt") if (p.get("pairCreatedAt") or 0) > 1.6e12 else None,
            "on_curve": (p.get("dexId") or "") in ("pumpfun", "moonshot", "launchlab", "bonk") or (liq is None and str(addr).endswith("pump"))}

def best_pairs(pairs: list[dict]) -> dict:
    """one pair per token: the most liquid one (curve pairs only when nothing else exists)."""
    out: dict = {}
    for p in pairs or []:
        if not isinstance(p, dict) or not (p.get("baseToken") or {}).get("address"): continue
        c = coin_from_pair(p)
        o = out.get(c["k"].lower())
        if o is None or ((c["liq"] or 0), c["vol24"]) > ((o["liq"] or 0), o["vol24"]): out[c["k"].lower()] = c
    return out

def coin_runs(c: dict) -> str | None:
    """None = no push. Otherwise a short reason. Stricter than the tab's 🚀 Rosną list (push-worthy, not just 'up')."""
    mc, h1, h6 = c.get("mc") or 0, c.get("h1"), c.get("h6")
    if mc > 2e9 and (c.get("vol24") or 0) < 1e6: return None          # gta.js sane(): broken supply
    if mc < MC_MIN: return None
    if (c.get("liq") or 0) < LIQ_MIN and not c.get("on_curve"): return None
    if (c.get("vol1h") or 0) < VOL1H_MIN: return None
    if (c.get("buys1h") or 0) < BUYS1H_MIN or (c.get("buys1h") or 0) < 0.8 * (c.get("sells1h") or 0): return None
    if h1 is not None and h1 >= H1_MIN: return f"+{h1:.0f}% 1h"
    if h6 is not None and h6 >= H6_MIN and (h1 or 0) >= 0: return f"+{h6:.0f}% 6h"
    return None

def update_added(path: Path, matched: list[dict], state: Path | None, now: float) -> dict:
    """v8.32: first-seen reference per GTA coin (+ max since then); a 🎮 GTA push re-bases it to the push price/time."""
    try: d = json.loads(path.read_text())
    except Exception: d = {}
    coins = d.get("coins") if isinstance(d.get("coins"), dict) else {}
    try: pushed = (json.loads(state.read_text()).get("gta_coins") or {}) if state else {}
    except Exception: pushed = {}
    for c in matched:
        px, k = c.get("px"), c["k"].lower()
        if not px or px <= 0: continue
        e = coins.get(k)
        if e is None:
            e = coins[k] = {"t": int(now), "px0": px, "mc0": c.get("mc"), "src": "seen", "max": px, "maxT": int(now)}
        pu = pushed.get(k)
        if pu and e.get("src") != "push" and pu.get("t"):                  # pushed coin -> push price (state px, else MC ratio)
            ppx = pu.get("px") or (px * pu["mc"] / c["mc"] if pu.get("mc") and c.get("mc") else None)
            if ppx and ppx > 0: e.update({"t": int(pu["t"]), "px0": ppx, "mc0": pu.get("mc"), "src": "push", "max": max(ppx, px), "maxT": int(now)})
        if px > (e.get("max") or 0): e["max"], e["maxT"] = px, int(now)
        e["sym"] = c.get("sym") or e.get("sym")
    coins = {k: v for k, v in coins.items() if now - (v.get("t") or 0) < ADDED_KEEP_D * 86400}
    if len(coins) > ADDED_MAX: coins = dict(sorted(coins.items(), key=lambda kv: -(kv[1].get("t") or 0))[:ADDED_MAX])
    res = {"v": 832, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)), "note": "🎮 GTA 6 tab '📈 od dodania': first time Kyvo saw each GTA coin (or its 🎮 GTA push), price then (px0, USD), max price seen since (max). tools/gta_push.py", "coins": coins}
    path.parent.mkdir(parents=True, exist_ok=True); path.write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")))
    return res

def scan(root: Path, out: Path, verbose: bool = False, added: Path | None = None, state: Path | None = None) -> dict:
    t0 = time.time(); errs = []; pool: dict = {}
    for q in QUERIES:
        try: pool.update({k: v for k, v in best_pairs(_get("https://api.dexscreener.com/latest/dex/search?q=" + urllib.parse.quote(q)).get("pairs")).items() if k not in pool})
        except Exception as e: errs.append(f"{q}: {str(e)[:80]}")
        time.sleep(0.4)
    try: pf = json.loads((root / "data/pf_social.json").read_text())
    except Exception: pf = {}
    calls = {}
    for m, v in ((pf.get("coins") or {}) if isinstance(pf, dict) else {}).items():
        n = sum(1 for x in (v or {}).get("callouts") or [] if strong((x or {}).get("thesis")))
        if n: calls[m] = n
    extra = [m for m, n in calls.items() if n >= PF_MIN]
    try: live = json.loads((root / "data/x_live.json").read_text())
    except Exception: live = {}
    for t in live.get("tweets") or []:
        for c in t.get("coins") or []:
            if c and c.get("address") and (strong(c.get("name")) or strong(c.get("symbol"))): extra.append(c["address"])
    extra = [m for m in dict.fromkeys(extra) if not any(k.endswith(":" + m.lower()) for k in pool)][:30]
    if extra:
        try:
            r = _get("https://api.dexscreener.com/tokens/v1/solana/" + ",".join(extra))
            pool.update(best_pairs(r if isinstance(r, list) else (r or {}).get("pairs")))
        except Exception as e: errs.append(f"tokens: {str(e)[:80]}")
    matched, running = [], []
    for c in pool.values():
        why = match_coin(c["name"], c["sym"], "", calls.get(c["addr"], 0))
        if not why or why == "desc": continue
        c["why"] = why; c["calls"] = calls.get(c["addr"], 0); matched.append(c)
        r = coin_runs(c)
        if r:
            c["run"] = r
            c["age_h"] = round((time.time() * 1000 - c["created"]) / 3.6e6, 2) if c.get("created") else None
            c["new"] = c["age_h"] is not None and c["age_h"] <= NEW_AGE_H
            running.append(c)
    for c in [c for c in running if not c.get("img") and c["chain"] == "solana"][:5]:   # new coin: DexScreener has no logo yet -> pump.fun's
        try: c["img"] = (_get("https://frontend-api-v3.pump.fun/coins-v2/" + c["addr"], 10) or {}).get("image_uri") or None
        except Exception: pass
    if added:
        try: update_added(added, matched, state, time.time())
        except Exception as e: errs.append(f"added: {str(e)[:80]}")
    seen_p = out.parent / "gta_seen.json"
    try: seen = json.loads(seen_p.read_text())
    except Exception: seen = {}
    now = time.time(); seen = {k: v for k, v in seen.items() if now - v < 6 * 3600}
    for c in running:
        k = c["k"].lower(); first = seen.setdefault(k, now)
        young = c.get("age_h") is not None and c["age_h"] < CONFIRM_AGE_H
        c["confirmed"] = (not young) or now - first >= CONFIRM_GAP_S
    for k in [k for k in seen if k not in {c["k"].lower() for c in running}]: seen.pop(k)   # must run on consecutive reads
    seen_p.parent.mkdir(parents=True, exist_ok=True); seen_p.write_text(json.dumps(seen))
    running.sort(key=lambda c: -((max(0, c.get("h1") or 0) + 0.3 * max(0, c.get("h6") or 0)) * (1 + (c.get("vol1h") or 0) / 1e5)))
    res = {"at": int(time.time()), "v": 832, "matched": len(matched), "pool": len(pool), "errors": errs, "coins": running[:20],
           "secs": round(time.time() - t0, 1)}
    out.parent.mkdir(parents=True, exist_ok=True); out.write_text(json.dumps(res, ensure_ascii=False))
    if verbose:
        for c in running: print(f"  RUNS {c['sym']!r:14} {c['name'][:24]!r:26} MC {c['mc'] or 0:>12,.0f} liq {c['liq'] or 0:>10,.0f} vol1h {c['vol1h']:>9,.0f} h1 {c['h1']} h6 {c['h6']} buys {c['buys1h']}/{c['sells1h']} age_h {c['age_h']} why {c['why']}")
    print(f"gta: {len(pool)} coins searched, {len(matched)} GTA matches, {len(running)} running now ({sum(1 for c in running if c['confirmed'])} confirmed) · {res['secs']}s" + (f" · errors {len(errs)}" if errs else ""))
    return res

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path(".kyvo_push/gta_alerts.json"))
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--print", action="store_true")
    ap.add_argument("--added", type=Path, default=None, help="v8.32 first-seen reference file (loop: data/gta_added.json)")
    ap.add_argument("--state", type=Path, default=None, help="v8.32 kyvo_push state (gta_coins = push price/time)")
    ap.add_argument("--dry-run", action="store_true", help="same as a normal run (the detector never sends anything itself)")
    a = ap.parse_args()
    scan(a.root, a.out, a.print, a.added, a.state)
    return 0

if __name__ == "__main__":
    sys.exit(main())
