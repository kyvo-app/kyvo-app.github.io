#!/usr/bin/env python3
"""Kyvo v8.12 🥇 Gold — DD feed + Gold alerts (GitHub Actions only, free public APIs, no keys).

What trader Orangie's research bot does in "Memecoins + Grok AI" (YouTube, Oct 2026), rebuilt on free data:
  * DD card per hot coin (Runner flags, 👑 KOL / 📈 Big runner coins, coins named in fresh tracked tweets, DexScreener boosts,
    GeckoTerminal 1 h trending): average trade size (volume bots), MC vs liquidity, holder counter vs wallets that really traded,
    one buy that filled the pump.fun curve, borrowed celebrity / brand name, copies (vamps) of the ticker, known traders in the
    latest trades, buy/sell pressure, 5m/1h/6h move, links, catalysts (Google News articles 24 h / 48 h + trend, tracked tweets).
    The verdict comes from gold-rules.js (the SAME rules the app's "Sprawdź coin" uses) -> data/gold.json.
  * Gold alerts -> .kyvo_push/gold_alerts.json (sent by tools/kyvo_push.py, Premium only by default):
      price ±15 % (±20 % under $300K MC) vs the last baseline on 🥇 Gold coins — checked every gold step (~5 min), 45-min cooldown/coin
      vamp: a copy of a 🥇 Gold coin's ticker passes $500K MC                                     — every ~30 min
      catalyst: a NEW news article about a 🥇 Gold coin's narrative                                — every ~30 min, 1 per coin per 2 h
    at most GOLD_MAX_H (4) alerts per hour; the first run only seeds baselines (no blast).
Data: DexScreener, GeckoTerminal (≈30 req/min, spaced 2.2 s, cached), RugCheck (via kol_coins.get, 10-min cache),
Google News RSS (server side only; Google marks the feed "personal, non-commercial use" — see README risks).
Local test:  python3 tools/gold.py --dry-run          (real API calls, writes data/gold.json, alerts printed)
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, statistics, subprocess, sys, time, urllib.parse, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kol_coins  # noqa: E402
from discord_calls import pairs_for, to_coin, fmt_usd  # noqa: E402
import pairs as pairs_mod  # noqa: E402  (v8.13 main-pool rule)

ROOT = Path(__file__).resolve().parents[1]
GT, DS = kol_coins.GT, kol_coins.DS
RULES = ROOT / "gold-rules.js"
MAX_COINS = int(os.environ.get("KYVO_GOLD_MAX", "14"))
FEED_MAX_MC = float(os.environ.get("KYVO_GOLD_FEED_MAX_MC", "50e6"))   # v8.12: the feed is for memecoins; the checker still rates anything
SLOW_EVERY = 1800          # vamps + news
PX_COOLDOWN = 45 * 60
GOLD_MAX_H = int(os.environ.get("KYVO_GOLD_MAX_H", "4"))
CURVE_SOL = 85             # pump.fun bonding curve ≈ 85 SOL raised before migration
GENERIC = {"the", "coin", "token", "cat", "dog", "moon", "pepe", "sol", "solana", "meme", "test", "ai", "bonk", "inu", "baby", "king", "new", "official"}
UA = {"User-Agent": "Mozilla/5.0 (kyvo-gold/8.12; +" + KYVO_APP + ")"}

def load(p: Path, default):
    try: return json.loads(p.read_text())
    except Exception: return default

class Cache:
    """tiny TTL cache on disk (.kyvo_push/gold_cache.json) so the 5-min loop stays polite to GeckoTerminal."""
    def __init__(self, p: Path): self.p = p; self.d = load(p, {})
    def get(self, k, ttl):
        e = self.d.get(k)
        return e["v"] if e and time.time() - e["t"] < ttl else None
    def put(self, k, v): self.d[k] = {"t": time.time(), "v": v}; return v
    def save(self):
        now = time.time(); self.d = {k: e for k, e in self.d.items() if now - e["t"] < 8 * 3600}
        self.p.parent.mkdir(parents=True, exist_ok=True); self.p.write_text(json.dumps(self.d))

_gt_last = [0.0]
def gt(path: str):
    w = 2.2 - (time.time() - _gt_last[0])
    if w > 0: time.sleep(w)
    d = kol_coins._get(GT + path); _gt_last[0] = time.time(); return d

# ---------------- facts (mirrors gold.js collect()) ----------------
def gt_pool(c, cache):
    k = f"pool:{c['pair']}"; v = cache.get(k, 290)
    if v is not None: return v
    a = ((gt(f"/networks/{c['chain']}/pools/{c['pair']}") or {}).get("data") or {}).get("attributes") or {}
    tx = a.get("transactions") or {}
    if not tx: return cache.put(k, {})
    return cache.put(k, {"buyers1h": (tx.get("h1") or {}).get("buyers"), "sellers1h": (tx.get("h1") or {}).get("sellers"),
                         "buyers24": (tx.get("h24") or {}).get("buyers"), "sellers24": (tx.get("h24") or {}).get("sellers")})

def trade_stats(rows: list, kolw: dict) -> dict:
    vals = [float(r.get("volume_in_usd") or 0) for r in rows]
    if not vals: return {"n": 0}
    kols = []
    for r in rows:
        h = kolw.get(r.get("tx_from_address") or "")
        if h and h not in kols: kols.append(h)
    return {"n": len(vals), "avgUsd": sum(vals) / len(vals), "median": statistics.median(vals), "tinyShare": sum(v < 5 for v in vals) / len(vals),
            "wallets": len({r.get("tx_from_address") for r in rows}), "maxBuyUsd": max([float(r.get("volume_in_usd") or 0) for r in rows if r.get("kind") == "buy"] or [0]),
            "kols": kols}

def gt_trades(chain, pair, cache, ttl=290):
    k = f"trades:{pair}"; v = cache.get(k, ttl)
    if v is not None: return v
    d = gt(f"/networks/{chain}/pools/{pair}/trades") or {}
    rows = [x.get("attributes") or {} for x in d.get("data") or []]
    return cache.put(k, [{"volume_in_usd": r.get("volume_in_usd"), "kind": r.get("kind"), "tx_from_address": r.get("tx_from_address"),
                          "ts": r.get("block_timestamp")} for r in rows])

def curve_facts(c, cache, sol_px):
    """largest single buy on the pump.fun bonding curve (GeckoTerminal keeps ~24 h / 300 trades -> only for young coins)."""
    if c["chain"] != "solana" or not sol_px: return None
    if c["on_curve"]:
        rows = gt_trades(c["chain"], c["pair"], cache)
    else:
        if (c.get("age_h") or 99) > 26 or not str(c["address"]).endswith("pump"): return None
        k = f"curvepool:{c['address']}"; pool = cache.get(k, 6 * 3600)
        if pool is None:
            d = gt(f"/networks/solana/tokens/{c['address']}/pools?page=1") or {}
            pool = ""
            for p in d.get("data") or []:
                rel = p.get("relationships") or {}
                if ((rel.get("dex") or {}).get("data") or {}).get("id") == "pump-fun" and (((rel.get("base_token") or {}).get("data") or {}).get("id") or "").endswith(c["address"]):
                    pool = (p.get("attributes") or {}).get("address") or ""; break
            cache.put(k, pool)
        if not pool: return None
        rows = gt_trades("solana", pool, cache, ttl=6 * 3600)
    buys = [float(r.get("volume_in_usd") or 0) for r in rows if r.get("kind") == "buy"]
    if not buys: return None
    return {"maxBuyUsd": max(buys), "sizeUsd": CURVE_SOL * sol_px, "n": len(rows)}

def rc_facts(c, kolw):
    if c["chain"] != "solana": return None
    r = kol_coins.get(kol_coins.RC + urllib.parse.quote(c["address"]) + "/report")
    if not r: return None
    tok = r.get("token") or {}
    hs = kol_coins.holders(r)
    sup = tok.get("supply")
    lp = None; amm = False
    for m in r.get("markets") or []:
        v = (m.get("lp") or {}).get("lpLockedPct")
        if isinstance(v, (int, float)): lp = max(lp or 0, v)
        if "pump_fun" not in str(m.get("marketType", "")).lower() or "amm" in str(m.get("marketType", "")).lower(): amm = True
    top = hs[0] if hs else None
    tf = (r.get("transferFee") or {}).get("pct")
    return {"holders": r.get("totalHolders"), "top1": float(top.get("pct") or 0) if top else None,
            "top10": sum(float(h.get("pct") or 0) for h in hs[:10]) if r.get("topHolders") is not None else None,
            "insiders": r.get("graphInsidersDetected") or 0, "mintAuth": bool(r.get("mintAuthority") or tok.get("mintAuthority")),
            "freezeAuth": bool(r.get("freezeAuthority") or tok.get("freezeAuthority")), "rugged": bool(r.get("rugged")),
            "lpLockedPct": lp, "lpAmm": amm, "creatorPct": (r["creatorBalance"] / sup * 100) if sup and r.get("creatorBalance") is not None else None,
            "transferFee": tf, "topKol": kolw.get((top or {}).get("owner") or "") if top else None}

def copies(c, cache):
    """same ticker (or same name) on the same chain, other contract. 'original' = an older coin that is at least as big."""
    k = f"copies:{c['chain']}:{c['address']}"; v = cache.get(k, SLOW_EVERY - 60)
    if v is not None: return v
    sym = str(c["symbol"]).strip().lower(); name = str(c["name"]).strip().lower()
    d = kol_coins._get(DS + "/latest/dex/search?q=" + urllib.parse.quote(c["symbol"])) or {}
    best = {}
    for p in d.get("pairs") or []:
        b = p.get("baseToken") or {}
        if p.get("chainId") != c["chain"] or not b.get("address") or b["address"] == c["address"]: continue
        if str(b.get("symbol", "")).strip().lower() != sym and str(b.get("name", "")).strip().lower() != name: continue
        mc = p.get("marketCap") or p.get("fdv") or 0
        if mc < 10_000: continue
        if ((p.get("liquidity") or {}).get("usd") or 0) < 1000 and ((p.get("volume") or {}).get("h24") or 0) < 20_000: continue   # v8.13: no pool, no trading = not a real copy
        e = best.get(b["address"])
        if not e or mc > e["mcap"]:
            best[b["address"]] = {"address": b["address"], "symbol": b.get("symbol"), "name": b.get("name"), "mcap": mc, "created": p.get("pairCreatedAt"),
                                  "vol24": (p.get("volume") or {}).get("h24"), "url": p.get("url")}
    my_created = time.time() * 1000 - (c.get("age_h") or 0) * 3.6e6
    orig = None; newer = []
    for e in best.values():
        if e["created"] and e["created"] < my_created - 600_000 and e["mcap"] >= (c["mcap"] or 0): orig = orig if orig and orig["created"] < e["created"] else e
        elif e["created"] and e["created"] > my_created: newer.append(e)
    newer.sort(key=lambda e: -e["mcap"])
    out = {"n": len(newer), "original": orig, "over500k": [e for e in newer if e["mcap"] >= 500_000][:5], "top": newer[:3]}
    return cache.put(k, out)

def news(c, cache):
    """Google News RSS — articles that name the coin's narrative (its name). Server side only (no CORS)."""
    q = re.sub(r"[^\w\s'.-]", " ", str(c["name"] or "")).strip()
    if len(q) < 4 or q.lower() in GENERIC or q.lower() == "the " + str(c["symbol"]).lower():
        q = str(c["symbol"] or "").strip()
        if len(q) < 4 or q.lower() in GENERIC: return None
    k = f"news3:{q.lower()}"; v = cache.get(k, SLOW_EVERY - 60)
    if v is not None: return v
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": f'"{q}" when:2d', "hl": "en-US", "gl": "US", "ceid": "US:en"})
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r: root = ET.fromstring(r.read())
    except Exception: return None
    now = time.time(); items = []
    # one-word names are often plain English ("clout", "glitch") -> must appear as a Capitalized / UPPER proper name; phrases: any case
    qrx = re.compile(r"\b(" + re.escape(q[:1].upper() + q[1:]) + "|" + re.escape(q.upper()) + r")\b") if " " not in q else re.compile(r"\b" + re.escape(q) + r"\b", re.I)
    for it in root.iter("item"):
        try: ts = parsedate_to_datetime(it.findtext("pubDate")).timestamp()
        except Exception: continue
        if now - ts > 48 * 3600: continue
        title = it.findtext("title") or ""
        if not qrx.search(title): continue   # Google News also matches the article body / related stories -> keep only titles that name it
        items.append({"t": title[:160], "src": it.findtext("source") or "", "url": it.findtext("link") or "", "ts": int(ts)})
    items.sort(key=lambda x: -x["ts"])
    n24 = sum(now - x["ts"] <= 86400 for x in items); prev = len(items) - n24
    return cache.put(k, {"q": q, "n24": n24, "n48": len(items), "trend": "up" if n24 > prev and n24 >= 2 else "down" if n24 < prev else "flat", "items": items[:4]})

def tweets_for(c, live) -> list:
    now = time.time(); out = []
    sym = str(c["symbol"] or ""); rx = re.compile(r"\$" + re.escape(sym) + r"\b", re.I) if len(sym) >= 3 else None
    for t in live.get("tweets", []):
        if now - (t.get("ts") or 0) > 12 * 3600: continue
        hit = any(str(x.get("address")) == c["address"] and x.get("rel", "named") == "named" for x in t.get("coins") or [])
        if not hit and rx and rx.search(t.get("text") or "") and not any(x.get("address") for x in t.get("coins") or [] if str(x.get("symbol", "")).lower() == sym.lower() and x.get("address") != c["address"]):
            hit = True
        if hit: out.append({"handle": t.get("handle"), "url": t.get("url"), "ts": t.get("ts"), "fol": t.get("author_followers")})
    return out[:6]

def links(c_pair: dict) -> dict:
    info = c_pair.get("info") or {}
    xs, web, tg = [], [], []
    for s in info.get("socials") or []:
        u = s.get("url") or ""; t = (s.get("type") or "").lower()
        (xs if t in ("twitter", "x") or "x.com/" in u or "twitter.com/" in u else tg if t == "telegram" else web).append(u)
    for w in info.get("websites") or []:
        if w.get("url"): web.append(w["url"])
    handles = [h for h, prof in (kol_coins.x_handle(u) for u in xs) if h and prof]
    return {"x": xs[:3], "web": web[:2], "tg": tg[:2], "xHandles": handles}

def facts_for(c, p, cache, kolw, live, kol_item, sol_px, slow):
    f = {"chain": c["chain"], "address": c["address"], "symbol": c["symbol"], "name": c["name"], "pair": c["pair"], "dex": c["dex"],
         "onCurve": c["on_curve"], "mcap": c["mcap"], "liq": c["liq"], "price": c["price"], "ageH": c["age_h"],
         "vol": {"m5": c["vol5m"], "h1": c["vol1h"], "h6": (p.get("volume") or {}).get("h6"), "h24": c["vol24"]},
         "txns": {k: {"b": (v or {}).get("buys"), "s": (v or {}).get("sells")} for k, v in (p.get("txns") or {}).items()},
         "chg": {"m5": c["m5"], "h1": c["h1"], "h6": c["h6"], "h24": c["h24"]}, "links": links(p)}
    if c["chain"] in ("solana", "bsc") and c["pair"]:
        f["gt"] = gt_pool(c, cache) or None
        f["trades"] = trade_stats(gt_trades(c["chain"], c["pair"], cache), kolw)
    f["curve"] = curve_facts(c, cache, sol_px)
    f["rc"] = rc_facts(c, kolw)
    if kol_item: f["kol"] = {"badge": kol_item.get("badge"), "handle": kol_item.get("kol")}
    f["tweets"] = tweets_for(c, live)
    young = (c.get("age_h") or 1e9) < 48          # fresh coins (scanner hits): copies every run (30-min cache inside copies())
    if slow or young or cache.get(f"copies:{c['chain']}:{c['address']}", 6 * 3600) is not None: f["copies"] = copies(c, cache) if (slow or young) else cache.get(f"copies:{c['chain']}:{c['address']}", 6 * 3600)
    nk = None
    if slow: f["news"] = news(c, cache)
    else:
        for k_, e in cache.d.items():
            if k_.startswith("news:") and isinstance(e.get("v"), dict) and e["v"].get("q", "").lower() in (str(c["name"]).lower(), str(c["symbol"]).lower()): nk = e["v"]
        f["news"] = nk
    return f

def verdicts(facts: list[dict]) -> list[dict]:
    r = subprocess.run(["node", str(RULES), "--batch"], input=json.dumps(facts), capture_output=True, text=True, timeout=60)
    if r.returncode: raise RuntimeError(r.stderr[-300:])
    return json.loads(r.stdout)

# ---------------- candidates ----------------
def candidate_addrs(state_dir: Path, prev: dict, fst: dict | None = None, fcfg: dict | None = None) -> list[tuple[str, str, str]]:
    """(chain, address, source) — runner flags first, then KOL / big runner coins, tweet coins, boosts, GT 1 h trending, 🔎 scanner."""
    out = []; now = time.time()
    keep = float((fcfg or {}).get("keep_hours", 6)) * 3600
    for k, h in ((fst or {}).items()):     # coins a filter already hit stay in the feed for keep_hours
        if now - h.get("at", 0) < keep and ":" in k: out.append((k.split(":", 1)[0], k.split(":", 1)[1], "scan"))
    for f in load(state_dir / "flags.json", []):
        if f.get("kind") == "runner": out.append((f["chain"], f["addr"], {"kol": "kol", "big": "big", "moon": "runner", "tweet": "tweet"}.get(f.get("badge"), "runner")))
    for e in load(ROOT / "data/kol_live.json", {}).get("items", []):
        if now * 1000 - e.get("at", 0) < 12 * 3.6e6: out.append((e["chain"], e["addr"], {"kol": "kol", "big": "big", "tweet": "tweet"}.get(e.get("badge"), "runner")))
    for t in load(ROOT / "data/x_live.json", {}).get("tweets", []):
        if now - (t.get("ts") or 0) > 6 * 3600: continue
        for x in t.get("coins") or []:
            if x.get("rel", "named") == "named" and x.get("address"): out.append((x["chain"], x["address"], "tweet"))
    for e in (prev.get("cards") or []):   # keep following yesterday's Gold coins for 24 h (alerts need continuity)
        if e.get("level") == "gold" and now * 1000 - (e.get("first_at") or 0) < 24 * 3.6e6: out.append((e["chain"], e["address"], e.get("src", ["trend"])[0]))
    for t in (kol_coins._get(DS + "/token-boosts/top/v1") or [])[:30]:
        if isinstance(t, dict) and t.get("chainId") == "solana" and t.get("tokenAddress"): out.append(("solana", t["tokenAddress"], "boost"))
    d = gt("/networks/solana/trending_pools?duration=1h&page=1") or {}
    for p in (d.get("data") or [])[:12]:
        rid = (((p.get("relationships") or {}).get("base_token") or {}).get("data") or {}).get("id", "")
        if "_" in rid: out.append(("solana", rid.split("_", 1)[1], "trend"))
    if fcfg:
        try: out += scan_addrs(fcfg)
        except Exception as e: print(f"  scan error: {type(e).__name__}: {e}")   # noqa: BLE001
    seen, res = {}, []
    for ch, a, s in out:
        k = f"{ch}:{a}".lower()
        if k in seen: (seen[k][3].append(s) if s not in seen[k][3] else None); continue
        seen[k] = (ch, a, s, [s]); res.append(seen[k])
    return [(ch, a, srcs) for ch, a, _, srcs in res]

# ---------------- 🔎 auto-scanner (tools/gold_filters.json) ----------------
FILTERS_PATH = Path(__file__).resolve().parent / "gold_filters.json"
GT_NET = {"solana": "solana", "bsc": "bsc"}

def load_filters() -> dict:
    cfg = load(FILTERS_PATH, {})
    if not cfg.get("enabled"): return {}
    cfg["filters"] = [f for f in cfg.get("filters", []) if f.get("enabled", True) and f.get("id")]
    return cfg if cfg["filters"] else {}

def scan_addrs(cfg: dict) -> list[tuple[str, str, str]]:
    """discovery: GeckoTerminal trending (1 h) + new pools, DexScreener latest profiles / boosts. Exact filter runs later on DS data."""
    src = cfg.get("sources", {}); chains = [c for c in src.get("chains", ["solana"]) if c in GT_NET]; out = []
    def from_gt(path):
        for p in ((gt(path) or {}).get("data") or []):
            rid = (((p.get("relationships") or {}).get("base_token") or {}).get("data") or {}).get("id", "")
            if "_" in rid: out.append((rid.split("_", 1)[0], rid.split("_", 1)[1], "scan"))
    for ch in chains:
        for pg in range(1, int(src.get("gt_trending_pages", 1)) + 1): from_gt(f"/networks/{GT_NET[ch]}/trending_pools?duration=1h&page={pg}")
        for pg in range(1, int(src.get("gt_new_pools_pages", 0)) + 1): from_gt(f"/networks/{GT_NET[ch]}/new_pools?page={pg}")
    for url, n in ((DS + "/token-profiles/latest/v1", src.get("ds_latest_profiles", 0)), (DS + "/token-boosts/latest/v1", src.get("ds_boosts_latest", 0))):
        if not n: continue
        for t in (kol_coins._get(url) or [])[: int(n)]:
            if isinstance(t, dict) and t.get("chainId") in chains and t.get("tokenAddress"): out.append((t["chainId"], t["tokenAddress"], "scan"))
    return [(ch if ch != "bsc" else "bsc", a, s) for ch, a, s in out if ch in chains]

def filter_pre(fl: dict, c: dict) -> bool:
    if c["chain"] not in fl.get("chains", ["solana"]): return False
    r = fl.get("pre", {}); mc = c.get("mcap") or 0
    def ge(v, key): return key not in r or (v is not None and v >= r[key])
    def le(v, key): return key not in r or (v is not None and v <= r[key])
    if "dex" in r and c.get("dex") not in r["dex"]: return False
    return (ge(c.get("h1"), "min_h1") and ge(mc, "min_mcap") and le(mc, "max_mcap") and ge(c.get("liq"), "min_liq") and ge(c.get("vol1h"), "min_vol1h")
            and ge(c.get("buys1h"), "min_buys1h") and le(c.get("age_h"), "max_age_h")
            and ge((c.get("vol1h") or 0) / mc if mc else None, "min_vol1h_mcap"))

def filter_post(fl: dict, m: dict) -> bool:
    r = fl.get("post", {}); m = m or {}
    if "min_holders" in r and not ((m.get("holders") or 0) >= r["min_holders"]): return False
    if "min_traders24" in r and m.get("traders24") is not None and m["traders24"] < r["min_traders24"]: return False   # unknown (GT lag) passes
    if "min_avg_trade" in r and not ((m.get("avgTrade") or 0) >= r["min_avg_trade"]): return False
    if "max_top10" in r and m.get("top10") is not None and m["top10"] > r["max_top10"]: return False
    return True

def filter_label(fl: dict) -> dict:
    return {"id": fl["id"], "emoji": fl.get("emoji", "🔎"), "pl": fl.get("pl", fl["id"]), "en": fl.get("en", fl.get("pl", fl["id"]))}

# ---------------- alerts ----------------
def alert(st, sub, k, card, title_pl, title_en, body_pl, body_en, aid):
    if aid in st["ids"]: return None
    st["ids"][aid] = time.time()
    return {"id": aid, "sub": sub, "k": k, "sym": card["symbol"], "chain": card["chain"], "at": int(time.time() * 1000),
            "title_pl": title_pl, "title_en": title_en, "body_pl": body_pl, "body_en": body_en, "hash": "#gold/" + k}

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=ROOT / "data/gold.json")
    ap.add_argument("--state-dir", type=Path, default=Path(os.environ.get("KYVO_STATE_DIR", ".kyvo_push")))
    ap.add_argument("--dry-run", action="store_true", help="state + alerts are not saved (gold.json is written)")
    ap.add_argument("--force-slow", action="store_true")
    a = ap.parse_args()
    sd = a.state_dir if a.state_dir.is_absolute() else ROOT / a.state_dir
    t0 = time.time(); now = time.time()
    st = load(sd / "gold_state.json", {})
    seeding = not st.get("seeded")
    st.setdefault("px", {}); st["ids"] = {k: t for k, t in st.get("ids", {}).items() if now - t < 3 * 86400}
    st["hist"] = [t for t in st.get("hist", []) if now - t < 3600]
    slow = a.force_slow or now - st.get("slow_at", 0) >= SLOW_EVERY
    cache = Cache(sd / "gold_cache.json")
    prev = load(a.out, {})
    prev_cards = {e["k"]: e for e in prev.get("cards", [])}
    kolw = kol_coins.kol_wallets(); live = load(ROOT / "data/x_live.json", {})
    kol_items = {e["k"].lower(): e for e in load(ROOT / "data/kol_live.json", {}).get("items", [])}
    fcfg = load_filters(); fst = st.setdefault("fhits", {})
    st["fhits"] = fst = {k: h for k, h in fst.items() if now - h.get("at", 0) < 48 * 3600}
    cands = candidate_addrs(sd, prev, fst, fcfg)
    by_chain: dict[str, list] = {}
    for ch, ad, srcs in cands: by_chain.setdefault(ch, []).append((ad, srcs))
    coins = []
    for ch, xs in by_chain.items():
        if ch not in ("solana", "bsc"): continue
        src_of = {ad.lower(): s for ad, s in xs}
        raw = {}
        for i in range(0, len(xs), 30):   # v8.13: tools/pairs.py main-pool rule
            raw.update({k: v for k, v in pairs_mod.best_map(kol_coins._get(f"{DS}/tokens/v1/{ch}/" + ",".join(ad for ad, _ in xs[i:i + 30])) or [], ch).items() if v})
        for k_, p in raw.items():
            c = to_coin(p)
            if not c.get("price") or not c.get("mcap") or str(c["address"]).lower() in kol_coins.__dict__.get("QUOTES", ()): continue
            if (c["mcap"] or 0) < 15_000 or (c["vol24"] or 0) < 5_000: continue
            if (c["mcap"] or 0) > FEED_MAX_MC or re.fullmatch(r"W?(USD.?|.?USD|DAI|PYUSD|EURC|SOL|BNB|ETH|BTC)", str(c["symbol"] or "").upper()): continue   # majors / stables / big caps: not a memecoin DD
            srcs = list(dict.fromkeys("watch" if x == "filter" else x for x in src_of.get(k_, ["trend"]) if x != "scan"))   # watch = followed: was Gold earlier
            hk = f"{c['chain']}:{c['address']}"
            hits = [fl for fl in (fcfg or {}).get("filters", []) if filter_pre(fl, c)]   # 🔎 exact rule on DexScreener data
            old = [i for i in (fst.get(hk, {}).get("ids") or []) if now - fst[hk].get("at", 0) < float(fcfg.get("keep_hours", 6)) * 3600] if fcfg else []
            ids = list(dict.fromkeys([fl["id"] for fl in hits] + old))
            if ids: srcs = ["filter"] + [x for x in srcs if x != "watch"]; c["_fids"] = ids; c["_fnew"] = [fl["id"] for fl in hits]
            if not srcs: continue              # scanned, but no filter matched
            coins.append((c, p, srcs))
    rank = {"runner": 0, "kol": 0, "filter": 0, "big": 1, "tweet": 1, "watch": 1, "boost": 2, "trend": 3}
    coins.sort(key=lambda x: (min(rank.get(s, 3) for s in x[2]), -(x[0]["vol1h"] or 0)))
    nf = 0; cap = int((fcfg or {}).get("max_hits_per_run", 5)); kept = []
    for x in coins:                            # filter hits get at most max_hits_per_run slots (fresh hits first: higher vol1h)
        if x[2][0] == "filter" and min(rank.get(s, 3) for s in x[2][1:] or ["trend"]) > 0:
            if nf >= cap: continue
            nf += 1
        kept.append(x)
    coins = kept[:MAX_COINS]
    sol_px = None
    for c, p, _ in coins:
        try:
            if c["chain"] == "solana" and str((p.get("quoteToken") or {}).get("symbol", "")).upper() == "SOL" and float(p.get("priceNative") or 0) > 0:
                sol_px = float(p["priceUsd"]) / float(p["priceNative"]); break
        except Exception: pass
    facts = []
    for c, p, srcs in coins:
        try: facts.append(facts_for(c, p, cache, kolw, live, kol_items.get(f"{c['chain']}:{c['address']}".lower()), sol_px, slow))
        except Exception as e:  # noqa: BLE001
            print(f"  facts error ${c['symbol']}: {type(e).__name__}: {e}"); facts.append(None)
        if time.time() - t0 > 200: print("  time budget hit -> partial run"); break
    pairs = [(x, f) for x, f in zip(coins, facts) if f]
    vs = verdicts([f for _, f in pairs]) if pairs else []
    cards, alerts = [], []
    ms = int(now * 1000)
    for ((c, p, srcs), f), v in zip(pairs, vs):
        k = f"{c['chain']}:{c['address']}"; pc = prev_cards.get(k) or {}
        card = {"k": k, "chain": c["chain"], "address": c["address"], "symbol": c["symbol"], "name": c["name"], "image": c.get("image"), "pair": c["pair"],
                "dex": c["dex"], "onCurve": c["on_curve"], "src": srcs, "level": v["level"], "score": v["score"], "say": v.get("say"), "reasons": v["reasons"],
                "metrics": v.get("metrics"), "m": {"mcap": c["mcap"], "liq": c["liq"], "price": c["price"], "vol1h": c["vol1h"], "vol24": c["vol24"],
                "m5": c["m5"], "h1": c["h1"], "h6": c["h6"], "h24": c["h24"], "ageH": c["age_h"], "buys1h": c["buys1h"], "sells1h": c["sells1h"]},
                "news": f.get("news"), "tweets": f.get("tweets"), "copies": f.get("copies"), "kol": f.get("kol"), "links": f.get("links"),
                "first_at": pc.get("first_at") or ms, "level_at": pc.get("level_at") if pc.get("level") == v["level"] else ms, "prev_level": pc.get("level") if pc.get("level") != v["level"] else pc.get("prev_level")}
        fl_by = {fl["id"]: fl for fl in (fcfg or {}).get("filters", [])}
        fids = [i for i in (c.get("_fids") or []) if i in fl_by and filter_post(fl_by[i], v.get("metrics"))]
        if c.get("_fids") and not fids:        # failed the post-DD rule (e.g. no real holders)
            card["src"] = [s for s in srcs if s != "filter"]
            if not card["src"]: fst.pop(k, None); continue
        if fids:
            card["filters"] = [filter_label(fl_by[i]) for i in fids]
            h = fst.setdefault(k, {"first": now}); new = [i for i in fids if i in (c.get("_fnew") or [])]
            if new: h["at"] = now
            h["ids"] = list(dict.fromkeys(fids + (h.get("ids") or [])))[:4]; h.setdefault("at", now)
            ac = (fcfg or {}).get("alert", {}); fresh = [i for i in new if fl_by[i].get("alert", True)]
            if ac.get("enabled", True) and fresh and v["level"] in ac.get("levels", ["gold", "hazard"]) and now - h.get("alert_at", 0) >= float(ac.get("cooldown_h", 12)) * 3600:
                fl = fl_by[fresh[0]]; LV = {"gold": ("🥇 Gold", "🥇 Gold"), "hazard": ("🟡 Hazard", "🟡 Gamble"), "avoid": ("🔴 Unikaj", "🔴 Avoid")}[v["level"]]
                top = next((r for r in v["reasons"] if r["lvl"] in ("bad", "warn")), None) or next((r for r in v["reasons"] if r["lvl"] == "ok"), {})
                mv = f" {c['h1']:+.0f}%" if c.get("h1") else ""          # v8.28 short FOMO style: '🥇 Gold · $SYM +12%' / 'MC $498K · 🎓 filter'
                al = alert(st, "filter", k, card, f"{LV[0]} · ${c['symbol']}{mv}", f"{LV[1]} · ${c['symbol']}{mv}",
                           f"MC {fmt_usd(c['mcap'])} · {fl.get('emoji', '🔎')} {fl['pl']}"[:110],
                           f"MC {fmt_usd(c['mcap'])} · {fl.get('emoji', '🔎')} {fl.get('en', fl['pl'])}"[:110],
                           f"gfilt:{k}:{int(now // 3600)}")
                if al: al["filter"] = fl["id"]; alerts.append(al); h["alert_at"] = now
        cards.append(card)
        if v["level"] != "gold" or not c.get("price"): continue
        # --- price ±15–20 % vs baseline
        th = 20 if (c["mcap"] or 0) < 300_000 else 15
        b = st["px"].get(k)
        if not b: st["px"][k] = {"base": c["price"], "at": now, "alert_at": 0}
        else:
            chg = (c["price"] / b["base"] - 1) * 100
            if abs(chg) >= th and now - b.get("alert_at", 0) >= PX_COOLDOWN:
                up = chg > 0; arrow = "📈" if up else "📉"
                al = alert(st, "price", k, card, f"🥇 Gold · ${c['symbol']} {chg:+.0f}% {arrow}", f"🥇 Gold · ${c['symbol']} {chg:+.0f}% {arrow}",
                           f"MC {fmt_usd(c['mcap'])} (z {fmt_usd(b['base'] * (c['mcap'] / c['price']))} w {round((now - b['at']) / 60)} min)",
                           f"MC {fmt_usd(c['mcap'])} (from {fmt_usd(b['base'] * (c['mcap'] / c['price']))} in {round((now - b['at']) / 60)} min)",
                           f"gpx:{k}:{int(now // 600)}")
                if al: alerts.append(al)
                st["px"][k] = {"base": c["price"], "at": now, "alert_at": now}
            elif now - b["at"] > 6 * 3600: st["px"][k] = {"base": c["price"], "at": now, "alert_at": b.get("alert_at", 0)}
        # --- vamps over $500K MC (slow)
        for e in ((f.get("copies") or {}).get("over500k") or []) if slow else []:
            al = alert(st, "vamp", k, card, f"🧛 Wampir · ${e['symbol']} {fmt_usd(e['mcap'])}", f"🧛 Vamp · ${e['symbol']} {fmt_usd(e['mcap'])}",
                       f"kopia ${c['symbol']} · MC oryginału {fmt_usd(c['mcap'])}", f"copy of ${c['symbol']} · original MC {fmt_usd(c['mcap'])}",
                       f"gvamp:{c['chain']}:{e['address']}")
            if al: alerts.append(al)
        # --- new catalyst article (slow)
        nw = f.get("news") or {}
        if slow and nw.get("items"):
            seen = set(st.setdefault("news", {}).get(k, []))
            fresh = [x for x in nw["items"] if x["url"] not in seen and now - x["ts"] < 6 * 3600]
            st["news"][k] = list(seen | {x["url"] for x in nw["items"]})[-40:]
            if fresh and seen and now - st.setdefault("news_at", {}).get(k, 0) >= 7200:
                x = fresh[0]
                al = alert(st, "news", k, card, f"📰 News · ${c['symbol']}", f"📰 News · ${c['symbol']}",
                           f"{x['src']}: {x['t'][:70]}", f"{x['src']}: {x['t'][:70]}",
                           "gnews:" + hashlib.sha1((k + x["url"]).encode()).hexdigest()[:16])
                if al: alerts.append(al); st["news_at"][k] = now
    # ordering: Gold first, then Hazard, then the red-flag examples
    lv = {"gold": 0, "hazard": 1, "avoid": 2}
    cards.sort(key=lambda e: (lv[e["level"]], -e["score"], -(e["m"].get("vol1h") or 0)))
    if seeding:
        print(f"first run: seeded {len(st['px'])} price baselines, {len(alerts)} alerts dropped"); alerts = []
    fmax = int(((fcfg or {}).get("alert") or {}).get("max_per_hour", 3)); st["fhist"] = [t for t in st.get("fhist", []) if now - t < 3600]
    fal = [x for x in alerts if x["sub"] == "filter"]
    if len(fal) > max(0, fmax - len(st["fhist"])):
        drop = fal[max(0, fmax - len(st["fhist"])):]; print(f"  filter cap: {len(drop)} filter alerts dropped"); alerts = [x for x in alerts if x not in drop]
    room = max(0, GOLD_MAX_H - len(st["hist"]))
    if len(alerts) > room: print(f"  hourly cap: {len(alerts) - room} alerts dropped"); alerts = alerts[:room]
    st["hist"] += [now] * len(alerts); st["fhist"] += [now] * sum(x["sub"] == "filter" for x in alerts)
    log = [x for x in prev.get("alerts", []) if ms - x.get("at", 0) < 24 * 3.6e6]
    log = (alerts + log)[:30]
    doc = {"version": 1, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "slow_at": int((now if slow else st.get("slow_at", now)) * 1000),
           "cards": cards, "alerts": log,
           "filters": [dict(filter_label(fl), alert=bool(fl.get("alert", True)), hits=sum(any(x["id"] == fl["id"] for x in e.get("filters") or []) for e in cards)) for fl in (fcfg or {}).get("filters", [])], "note": "Heurystyki na publicznych danych (DexScreener, GeckoTerminal, RugCheck, Google News). To nie porada finansowa."}
    changed = bool(alerts) or {e["k"]: e["level"] for e in cards} != {e["k"]: e["level"] for e in prev.get("cards", [])}
    a.out.parent.mkdir(parents=True, exist_ok=True); a.out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
    if slow: st["slow_at"] = now
    st["seeded"] = True
    if not a.dry_run:
        pend = [x for x in load(sd / "gold_alerts.json", []) if now * 1000 - x.get("at", 0) < 3600 * 1000] + alerts
        (sd / "gold_alerts.json").write_text(json.dumps(pend, ensure_ascii=False))
        (sd / "gold_state.json").write_text(json.dumps(st))
    cache.save()
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        with open(gh, "a") as fh: fh.write(f"gold_commit={'true' if changed else 'false'}\n")
    cnt = {l: sum(e["level"] == l for e in cards) for l in lv}
    for e in cards:
        if e.get("filters"): print(f"  🔎 {e['symbol']}: {', '.join(x['id'] for x in e['filters'])} -> {e['level']}")
    print(f"gold -> {a.out.name}: {len(cards)} cards (gold {cnt['gold']} / hazard {cnt['hazard']} / avoid {cnt['avoid']}), {len(alerts)} alerts{' [slow]' if slow else ''}, {time.time() - t0:.0f}s")
    for x in alerts: print("  ALERT", x["id"], "|", x["title_pl"], "|", x["body_pl"])
    return 0

if __name__ == "__main__":
    sys.exit(main())
