#!/usr/bin/env python3
"""Kyvo auto-calls -> Discord (runs in GitHub Actions, NOT on the trading VPS).

Every run (cron ~15 min): fresh Solana + BSC coins from public APIs (DexScreener + GeckoTerminal), the same
"Good Coins" filter as the app, then Kyvo Check (same scoring as the app: 100 - 25 per red flag - 9 per warning,
RugCheck for Solana, GoPlus for both), then the v8.3 Good Coins rule — the SAME code as the app, run through
`node tools/upside_estimate.js --good` (goodCoinRule): 3 gates — SAFETY (Kyvo Check ≥ 75, contract
facts from RugCheck/GoPlus: mint/freeze revoked, LP locked, top-10 ≤ 30%, dev ≤ 10% / not honeypot, tax ≤ 5%, owner safe),
HOT NOW (vol 1h ≥ $50k or accelerating, ≥ 300 txns, vol/MC ≥ 2%, popularity ≥ 0.30) and 8H UPSIDE (buys ≥ 55%, Δ1h > 0 not parabolic,
not fading, positive base estimate for 1h/3h/8h).
Candidates are ranked by popularity P × upside signal G. No Node or no positive setup -> nothing is posted.

Secrets (GitHub -> Settings -> Secrets and variables -> Actions), NEVER in the repo:
  DISCORD_WEBHOOK_SOL, DISCORD_WEBHOOK_BSC   (calls)       DISCORD_WEBHOOK_NEWS  (optional, manual changelog)
Missing secret -> that channel is skipped quietly (exit 0).

State (dedupe + rate limit) lives in a small JSON file (default .kyvo_calls/posted.json) that the workflow keeps
in actions/cache — no commits, so GitHub Pages is not rebuilt every 15 minutes.

Local test (prints embeds, posts nothing):   python3 tools/discord_calls.py --dry-run
Changelog post:   python3 tools/discord_calls.py --news "Kyvo v8.2: ..."      (needs DISCORD_WEBHOOK_NEWS)
Only public data, no keys needed for reading. Not financial advice.
"""
from __future__ import annotations
import argparse, json, os, shutil, subprocess, sys, time, urllib.parse, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kol_coins  # noqa: E402  v8.8: 👑 KOL coin / 🚀 Moon run overrides
import early_runner  # noqa: E402  v8.33 ⚡ Wczesny Runner rule

APP = KYVO_APP
DS = "https://api.dexscreener.com"
GT = "https://api.geckoterminal.com/api/v2"
RC = "https://api.rugcheck.xyz/v1/tokens/"
GP = "https://api.gopluslabs.io/api/v1/"
CHAINS = {"solana": {"gt": "solana", "secret": "DISCORD_WEBHOOK_SOL", "fomo": "solana", "label": "Solana"},
          "bsc": {"gt": "bsc", "secret": "DISCORD_WEBHOOK_BSC", "fomo": "bnb", "label": "BSC"}}
# Good Coins defaults from the app (app.js DEFAULT_FILTERS.good) + stricter posting floor
GOOD = {"mcap_min": 0, "liq_min": 25_000, "vol_min": 0, "age_max_h": 1e9, "age_min_h": 0.25, "buy_ratio_min": 0.55, "socials": False}  # = app v8.3 Good defaults
MIN_SCORE = int(os.environ.get("KYVO_CALLS_MIN_SCORE", "75"))
MIN_LIQ_POST = float(os.environ.get("KYVO_CALLS_MIN_LIQ", "25000"))
MAX_PER_HOUR = int(os.environ.get("KYVO_CALLS_MAX_PER_HOUR", "5"))
MAX_PER_RUN = 2           # per channel, keeps the feed calm
REPOST_AFTER_H = 72       # never post the same coin twice within 3 days
RUNNER_CAP = int(os.environ.get("KYVO_RUNNER_CAP", "15"))   # v8.25: coins per chain that get the full Runner check (was the first 8)
LEG2_CAP = int(os.environ.get("KYVO_LEG2_CAP", "6"))        # v8.25 🔁 server-side Kolejna fala: coins per chain checked
LEG2_SHAPES = int(os.environ.get("KYVO_LEG2_SHAPES", "3"))  # v8.25: ≤ 3 GeckoTerminal candle reads per chain per scan (10-min cache)
LEG2_CACHE = Path(os.environ.get("KYVO_LEG2_CACHE", ".kyvo_calls/leg2_shapes.json"))
# v8.38 ⚠️ po dumpie: a Runner / ⚡ Early flag on a coin that is already ≥ PD_BELOW % under its all-time high (max 15-min close of the
# last 48 h, GeckoTerminal) gets a badge — the coin is NEVER hidden or skipped, the app and the push only show "⚠️ po dumpie −X% od ATH".
# 72 h backtest of the real Runner flags (100 coins): ≥ 30% below ATH = 8 coins, −$374 at $100 each, win 12% (rest 92: win 23%).
PD_BELOW = float(os.environ.get("KYVO_PD_BELOW", "30"))
PD_READS = int(os.environ.get("KYVO_PD_READS", "6"))      # ≤ 6 GeckoTerminal reads per scan (10-min cache; free tier ~30 req/min)
PD_CACHE = Path(os.environ.get("KYVO_PD_CACHE", ".kyvo_calls/post_dump.json"))
# v8.41 faster scans: the slow-moving GeckoTerminal candidate lists (trending page 2, 6 h trending, top 24 h volume) are cached for
# GT_LIST_TTL s (file, survives between scans) -> 3 of 7 GeckoTerminal list reads per chain skipped on most scans (each costs a read +
# the 2.1 s rate-limit pause, more with 429 back-offs on GitHub's shared IPs). The fast lists (trending, new pools, 5 m, 1 h) stay live.
GT_LIST_TTL = int(os.environ.get("KYVO_GT_LIST_TTL", "300"))
GT_LIST_CACHE = Path(os.environ.get("KYVO_GT_LIST_CACHE", ".kyvo_calls/gt_lists.json"))
_GTL: dict = {}
# v8.42 🔥 Trend: established quality coins trending steadily up (CHOO-type: $300K–$50M, ≥ 6 h old, many holders, +15–60% in 1 h on
# rising volume) -> a 🏃 Runner flag with badge "trend" (Runner tab + push as '🏃 Runner · 🔥 Trend'); Runner 2.0 takes it when it
# passes its own stricter checks. Free public data only (DexScreener pairs already read, RugCheck / GoPlus, GeckoTerminal traders).
TREND = {"mc_min": 300_000, "mc_max": 50_000_000, "age_min_h": 6, "liq_min": 50_000, "vol24_min": 500_000, "vol1h_min": 50_000,
         "h1_min": 20, "h1_max": 60, "vol_up": 1.3, "h24_max": 400, "br_min": 0.52, "tx1h_min": 60, "m5_min": -5,
         "holders_min": 1000, "top10_max": 30, "top1_max": 10, "per_chain": 3, "day_cap": int(os.environ.get("KYVO_TREND_DAY_CAP", "8")),
         "cool_s": 1800}
# v8.42 🌱 Wczesny trend: FRESH graduated coins climbing hard with real volume (TOLY-type, 04.11: 35 min old, $90K MC, +143% 1 h,
# 8 k trades, 60% buys) -> 🏃 Runner flag with badge "etrend". Not bundled (RugCheck insiders < 20), no single-wallet dominance.
ETREND = {"mc_min": 50_000, "mc_max": 300_000, "age_min_h": 0.25, "age_max_h": 3, "liq_min": 15_000, "vol1h_min": 50_000, "h1_min": 30,
          "m5_min": 0, "m5_max": 60, "tx1h_min": 300, "br_min": 0.55, "holders_min": 150, "top10_max": 35, "top1_max": 8, "per_chain": 2,
          "day_cap": int(os.environ.get("KYVO_ETREND_DAY_CAP", "8")), "cool_s": 1800}
_T: dict = {}   # v8.41 per-phase timing (last output line, the loop log shows it)
# v8.9: quote / stable tokens that top the volume lists (never a "coin" for Kyvo)
QUOTE_TOKENS = {"so11111111111111111111111111111111111111112", "epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v", "es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb",
                "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "0x55d398326f99059ff775485246999027b3197955", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
                "0xe9e7cea3dedca5984780bafc599bd69add087d56", "0x2170ed0880ac9a755fd29b2688956bd959f933f8", "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c"}
UA = {"User-Agent": "kyvo-discord-calls/8.3 (+" + KYVO_REPO + ")", "Accept": "application/json"}
RC_PL = {
    "Top 10 holders high ownership": "Top 10 holderów ma >70% podaży", "High holder concentration": "Top 10 holderów ma >50% podaży",
    "High ownership": "Najwięksi holderzy mają >80% podaży", "Single holder ownership": "Jeden portfel ma dużą część podaży",
    "Large Amount of LP Unlocked": "LP odblokowane", "Low amount of LP Providers": "Mało dostawców płynności",
    "Low Liquidity": "Bardzo mała płynność", "Mutable metadata": "Metadane można zmienić",
    "Freeze Authority still enabled": "Freeze authority włączone", "Mint Authority still enabled": "Mint authority włączone",
    "Creator history of rugged tokens": "Twórca ma w historii rugi", "Copycat token": "Możliwa kopia innego tokena",
    "Low amount of holders": "Bardzo mało holderów", "Transfer fee": "Opłata od transferu",
}

# v8.33 latency: RugCheck / GoPlus answers are cached for SAFETY_TTL s (in memory + KYVO_SAFETY_CACHE file between scans) and
# prefetched in parallel for every coin a scan will check — the scan used to take 126–250 s (median ~180 s), mostly sequential
# RugCheck + GoPlus reads (GoPlus Solana was even read twice per coin: Kyvo Check + contract facts).
SAFETY_TTL = int(os.environ.get("KYVO_SAFETY_TTL", "300"))
SAFETY_CACHE = Path(os.environ.get("KYVO_SAFETY_CACHE", ".kyvo_calls/safety_cache.json"))
_MEMO: dict[str, list] = {}

def _memo_load() -> None:
    try:
        now = time.time()
        _MEMO.update({u: v for u, v in json.loads(SAFETY_CACHE.read_text()).items() if now - v[0] < SAFETY_TTL})
    except Exception: pass

def _memo_save() -> None:
    try:
        now = time.time(); SAFETY_CACHE.parent.mkdir(parents=True, exist_ok=True)
        SAFETY_CACHE.write_text(json.dumps({u: v for u, v in _MEMO.items() if now - v[0] < SAFETY_TTL and v[1] is not None}))
    except Exception: pass

def safety_urls(c: dict, report: bool = False) -> list[str]:
    if c["chain"] == "solana":
        u = [RC + urllib.parse.quote(c["address"]) + "/report/summary", GP + "solana/token_security?contract_addresses=" + c["address"]]
        return u + ([RC + urllib.parse.quote(c["address"]) + "/report"] if report else [])
    if c["chain"] == "bsc": return [GP + "token_security/56?contract_addresses=" + c["address"]]
    return []

def prefetch(coins: list[dict], report: bool = False, workers: int = 6) -> None:
    """v8.33: warm the safety cache for these coins in parallel (same GETs kyvo_check / contract_facts make later)."""
    from concurrent.futures import ThreadPoolExecutor
    urls = list(dict.fromkeys(u for c in coins for u in safety_urls(c, report) if u not in _MEMO))
    if urls:
        with ThreadPoolExecutor(max_workers=workers) as ex: list(ex.map(get, urls))

def get(url: str, timeout: int = 20):
    cache = url.startswith((RC, GP))
    if cache:
        m = _MEMO.get(url)
        if m and time.time() - m[0] < SAFETY_TTL: return m[1]
    r = _get(url, timeout)
    if cache and r is not None: _MEMO[url] = [time.time(), r]
    return r

def _get(url: str, timeout: int = 20):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(3 * (i + 1)); continue
            return None
        except Exception:
            time.sleep(1.5 * (i + 1))
    return None

def fmt_usd(v) -> str:
    if v is None: return "—"
    v = float(v)
    for d, s in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if abs(v) >= d: return f"${v / d:.2f}{s}"
    return f"${v:.0f}"

def age_label(h) -> str:
    if h is None: return "?"
    return f"{max(1, round(h * 60))} min" if h < 1 else f"{round(h)} h" if h < 48 else f"{round(h / 24)} dni"

# ---------------- candidates ----------------
def candidates(chain: str) -> list[str]:
    addrs: list[str] = []
    for path in ("/token-profiles/latest/v1", "/token-boosts/latest/v1", "/token-boosts/top/v1"):
        for t in get(DS + path) or []:
            if isinstance(t, dict) and t.get("chainId") == chain and t.get("tokenAddress"): addrs.append(t["tokenAddress"])
    net = CHAINS[chain]["gt"]
    for kind in ("trending_pools", "new_pools"):
        for page in (1, 2):
            u = f"{GT}/networks/{net}/{kind}?page={page}"
            if kind == "trending_pools" and page == 2: d, live = gt_list(u)            # v8.41 cached (slow list)
            else: d, live = get(u) or {}, True
            for p in d.get("data") or []:
                rid = (((p.get("relationships") or {}).get("base_token") or {}).get("data") or {}).get("id", "")
                if "_" in rid: addrs.append(rid.split("_", 1)[1])
            if live: time.sleep(2.1)   # GeckoTerminal free tier ~30 req/min
    # v8.8: what is exploding in the last 5 min; v8.9: + 1 h trending and top 24 h volume = established $1M–$100M coins (📈 Big runner)
    for u in (f"{GT}/networks/{net}/trending_pools?duration=5m&page=1", f"{GT}/networks/{net}/trending_pools?duration=1h&page=1", f"{GT}/networks/{net}/trending_pools?duration=6h&page=1",
              f"{GT}/networks/{net}/pools?sort=h24_volume_usd_desc&page=1"):
        if "duration=6h" in u or "h24_volume" in u: d, live = gt_list(u)            # v8.41 cached (slow lists)
        else: d, live = get(u) or {}, True
        for p in d.get("data") or []:
            rid = (((p.get("relationships") or {}).get("base_token") or {}).get("data") or {}).get("id", "")
            if "_" in rid and rid.split("_", 1)[1].lower() not in QUOTE_TOKENS: addrs.append(rid.split("_", 1)[1])
        if live: time.sleep(2.1)
    seen, out = set(), []
    for a in addrs:
        k = a.lower()
        if k not in seen: seen.add(k); out.append(a)
    return out[:210]

def gt_list(url: str) -> tuple[dict, bool]:
    """v8.41: a slow GeckoTerminal list from the file cache (≤ GT_LIST_TTL s old) or live. Returns (data, fetched_live)."""
    if not _GTL:
        try: _GTL.update(json.loads(GT_LIST_CACHE.read_text()))
        except Exception: _GTL["_"] = 1
    m = _GTL.get(url)
    if isinstance(m, list) and time.time() - m[0] < GT_LIST_TTL: return m[1], False
    d = get(url)
    if d:
        _GTL[url] = [time.time(), d]
        try:
            GT_LIST_CACHE.parent.mkdir(parents=True, exist_ok=True)
            keep = {k: v for k, v in _GTL.items() if isinstance(v, list) and time.time() - v[0] < 3600}
            tmp = GT_LIST_CACHE.with_suffix(".tmp"); tmp.write_text(json.dumps(keep)); tmp.replace(GT_LIST_CACHE)
        except Exception: pass
        return d, True
    if isinstance(m, list) and time.time() - m[0] < 3 * GT_LIST_TTL: return m[1], True   # API down / 429 -> a slightly older list
    return {}, True

def trend_pre(c: dict) -> bool:
    """v8.42 🔥 Trend — cheap stage on the DexScreener pair already in hand (no extra request)."""
    T = TREND; mc, v1, v6 = c.get("mcap") or 0, c.get("vol1h") or 0, c.get("vol6h") or 0
    if not (T["mc_min"] <= mc <= T["mc_max"]) or c.get("on_curve"): return False
    if (c.get("age_h") or 0) < T["age_min_h"] or (c.get("liq") or 0) < T["liq_min"] or (c.get("vol24") or 0) < T["vol24_min"]: return False
    h1 = c.get("h1")
    if h1 is None or not (T["h1_min"] <= h1 <= T["h1_max"]) or v1 < T["vol1h_min"]: return False
    if v6 and v1 < T["vol_up"] * v6 / 6: return False                      # volume rising: last hour above 1.3× the 6 h hourly pace
    if (c.get("h24") or 0) > T["h24_max"] or (c.get("m5") or 0) < T["m5_min"]: return False   # ≤ 5× the price 24 h ago, not dumping now
    if (c.get("tx_h1") or 0) < T["tx1h_min"] or (c.get("buy_ratio") or 0) < T["br_min"]: return False
    return True

def etrend_pre(c: dict) -> bool:
    """v8.42 🌱 Wczesny trend — cheap stage (DexScreener pair already in hand)."""
    T = ETREND
    if not (T["mc_min"] <= (c.get("mcap") or 0) <= T["mc_max"]) or c.get("on_curve") or (c.get("liq") or 0) < T["liq_min"]: return False
    if c.get("age_h") is None or not (T["age_min_h"] <= c["age_h"] <= T["age_max_h"]): return False
    if (c.get("h1") or 0) < T["h1_min"] or (c.get("vol1h") or 0) < T["vol1h_min"]: return False
    m5 = c.get("m5") or 0
    if not (T["m5_min"] <= m5 <= T["m5_max"]): return False               # still climbing, not one vertical candle
    return (c.get("tx_h1") or 0) >= T["tx1h_min"] and (c.get("buy_ratio") or 0) >= T["br_min"]

def trend_holders(c: dict) -> tuple[dict | None, dict | None, dict | None]:
    """(facts {h, t10, t1}, RugCheck report, GoPlus result) — Solana: RugCheck (same pool-free maths as tools/holders.py), BSC: GoPlus."""
    import holders as H
    if c["chain"] == "solana":
        try: r, _ = H.rc_report(c["address"], False)
        except H.RateLimited: return None, None, None
        return H.facts(r), r, None
    res = (kol_coins.get(kol_coins.GP + "token_security/56?contract_addresses=" + c["address"]) or {}).get("result") or {}
    g = res.get(c["address"].lower()) or res.get(c["address"])
    if not isinstance(g, dict): return None, None, None
    hs = [h for h in g.get("holders") or [] if not str(h.get("is_contract")) == "1" and not str(h.get("is_locked")) == "1"]
    pct = [float(h.get("percent") or 0) * 100 for h in hs]
    try: hc = int(g.get("holder_count") or 0)
    except Exception: hc = None
    return {"h": hc, "t10": round(sum(pct[:10]), 1) if pct else None, "t1": round(pct[0], 1) if pct else None}, None, g

def trend_scan(chain: str, coins: list[dict], flagged: set, st: dict, flag, early: bool = False) -> int:
    """v8.42 🔥 Trend (early=False) / 🌱 Wczesny trend (early=True): ≤ 3 / 2 candidates per chain get the holder + hard-rug check
    (🔥 also real buyers rising); ≤ 8 coins a Warsaw day each, 30-min re-flag cooldown."""
    T = ETREND if early else TREND; ts = st.setdefault("etrend" if early else "trend", {}); day = __import__("datetime").datetime.now(__import__("zoneinfo").ZoneInfo("Europe/Warsaw")).strftime("%Y-%m-%d")
    if ts.get("day") != day: ts.update({"day": day, "coins": []})
    seen = ts.setdefault("seen", {}); now = time.time()
    for k in [k for k, t in seen.items() if now - t > 86400]: seen.pop(k, None)
    pre = etrend_pre if early else trend_pre
    cand = sorted([c for c in coins if c["address"] not in flagged and pre(c)
                   and now - seen.get(f"{chain}:{c['address'].lower()}", 0) > T["cool_s"]], key=lambda c: -(c.get("vol1h") or 0))[:T["per_chain"]]
    n = 0
    for c in cand:
        k = f"{chain}:{c['address'].lower()}"
        if k not in ts["coins"] and len(ts["coins"]) >= T["day_cap"]: print(f"  🔥 trend ${c['symbol']}: day cap {T['day_cap']} reached"); break
        seen[k] = now
        f, r, g = trend_holders(c)
        if not f or f.get("h") is None: print(f"  no 🔥 trend ${c['symbol']}: holders unknown"); continue
        why = ("holders" if f["h"] < T["holders_min"] else "top10" if (f.get("t10") or 0) > T["top10_max"] else "top1" if (f.get("t1") or 0) > T["top1_max"] else
               "devrug" if f.get("devrug") else "rugged" if f.get("rugged") else None)
        if why: print(f"  no {'🌱 early' if early else '🔥'} trend ${c['symbol']}: {why} (h {f['h']}, top10 {f.get('t10')}%)"); continue
        if early:   # young coin: every hard-rug test incl. the insider / bundle graph + same-ticker copycat; no buyer-count floor
            try:
                score, checks = kyvo_check(c, coins)
                bad = kol_coins.hard_rug(c, checks, r, g) or kol_coins.copycat_of(c, coins)
            except Exception as e: print(f"  🌱 early trend check error ${c['symbol']}: {type(e).__name__}"); continue
            if bad: print(f"  no 🌱 early trend ${c['symbol']}: {bad}"); continue
            ov = {"badge": "etrend", "trend": {"h1": c.get("h1"), "m5": c.get("m5"), "age_h": round(c.get("age_h") or 0, 2), "holders": f["h"], "t10": f.get("t10"),
                                               "t1": f.get("t1"), "br": round(c.get("buy_ratio") or 0, 2), "tx1h": c.get("tx_h1")}}
            flag(c, "runner", ov, score, checks); flagged.add(c["address"]); n += 1
            if k not in ts["coins"]: ts["coins"].append(k)
            print(f"  🌱 early trend ${c['symbol']} MC {fmt_usd(c['mcap'])} age {c.get('age_h', 0):.1f} h h1 +{round(c.get('h1') or 0)}% holders {f['h']} top10 {f.get('t10')}%")
            continue
        try:
            score, checks = kyvo_check(c, coins)
            # RugCheck's insider graph flags most established coins (CHOO 04.11: 72 linked wallets, 19 262 holders) -> for 🔥 Trend the
            # holder spread above (≥ 1 000 holders, top 10 ≤ 30%, top 1 ≤ 10%) replaces that one test; every other hard-rug test stays
            ins = (r or {}).get("graphInsidersDetected") if isinstance(r, dict) else None
            r2 = dict(r, graphInsidersDetected=0) if isinstance(r, dict) else r
            ov = kol_coins.big_check(c, checks, coins, facts={"rc": r2} if c["chain"] == "solana" else {"rc": None, "gp": g})   # hard rug / copycat / real unique buyers rising
        except Exception as e: print(f"  🔥 trend check error ${c['symbol']}: {type(e).__name__}"); continue
        if ov.get("blocked"): print(f"  no 🔥 trend ${c['symbol']}: {ov['blocked']}"); continue
        ov.update({"badge": "trend", "trend": {"h1": c.get("h1"), "h6": c.get("h6"), "h24": c.get("h24"), "holders": f["h"], "t10": f.get("t10"), "t1": f.get("t1"),
                                               "br": round(c.get("buy_ratio") or 0, 2), "ins": ins, "vup": round((c.get("vol1h") or 0) / ((c.get("vol6h") or 0) / 6), 1) if c.get("vol6h") else None}})
        flag(c, "runner", ov, score, checks); flagged.add(c["address"]); n += 1
        if k not in ts["coins"]: ts["coins"].append(k)
        print(f"  🔥 trend ${c['symbol']} MC {fmt_usd(c['mcap'])} h1 +{round(c.get('h1') or 0)}% holders {f['h']} top10 {f.get('t10')}%")
    return n

def write_partial(path: Path | None, flags: list[dict]) -> None:
    """v8.41: flags found so far (after each chain) -> path, atomically; the loop pushes them before the rest of the scan ends."""
    if not path: return
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp"); tmp.write_text(json.dumps([{k: v for k, v in f.items() if k != "_pin"} for f in flags])); tmp.replace(path)
    except Exception as e: print(f"  partial flags error: {type(e).__name__}")

def pairs_for(chain: str, addrs: list[str]) -> list[dict]:
    # v8.13: tools/pairs.py rule (exact CA, main pool by liquidity, dead pump.fun curve pair never wins after migration)
    from pairs import best_map
    best: dict[str, dict] = {}
    for i in range(0, len(addrs), 30):
        best.update({k: v for k, v in best_map(get(f"{DS}/tokens/v1/{chain}/" + ",".join(addrs[i:i + 30])) or [], chain).items() if v})
        time.sleep(0.3)
    return list(best.values())

def to_coin(p: dict) -> dict:
    b = p.get("baseToken") or {}; info = p.get("info") or {}
    tx = ((p.get("txns") or {}).get("h1") or {})
    buys, sells = tx.get("buys") or 0, tx.get("sells") or 0
    created = p.get("pairCreatedAt")
    dex = p.get("dexId") or ""
    return {
        "chain": p.get("chainId"), "address": b.get("address"), "symbol": b.get("symbol") or "?", "name": b.get("name") or "",
        "mcap": p.get("marketCap") or p.get("fdv"), "liq": (p.get("liquidity") or {}).get("usd"), "vol24": (p.get("volume") or {}).get("h24"),
        "h1": (p.get("priceChange") or {}).get("h1"), "h24": (p.get("priceChange") or {}).get("h24"),
        "m5": (p.get("priceChange") or {}).get("m5"), "h6": (p.get("priceChange") or {}).get("h6"),
        "vol1h": (p.get("volume") or {}).get("h1"), "vol6h": (p.get("volume") or {}).get("h6"), "vol5m": (p.get("volume") or {}).get("m5"), "buys1h": buys, "sells1h": sells,
        "tx6h": (((p.get("txns") or {}).get("h6") or {}).get("buys") or 0) + (((p.get("txns") or {}).get("h6") or {}).get("sells") or 0) if ((p.get("txns") or {}).get("h6")) else None,
        "age_h": (time.time() * 1000 - created) / 3.6e6 if created else None,
        "buy_ratio": buys / (buys + sells) if buys + sells else None, "tx_h1": buys + sells,
        "buys5m": ((p.get("txns") or {}).get("m5") or {}).get("buys"), "sells5m": ((p.get("txns") or {}).get("m5") or {}).get("sells"),   # v8.24 early shadow
        "socials": bool(info.get("socials") or info.get("websites")), "image": info.get("imageUrl"),
        "on_curve": dex in ("pumpfun", "fourmeme"), "dex": dex, "boost": ((p.get("boosts") or {}).get("active") or 0),
        "price": float(p["priceUsd"]) if p.get("priceUsd") else None, "pair": p.get("pairAddress") or "",
        "ds_url": p.get("url") or f"https://dexscreener.com/{p.get('chainId')}/{b.get('address')}",
        "links": [x.get("url") for x in (info.get("socials") or []) + (info.get("websites") or []) if isinstance(x, dict) and x.get("url")],  # v8.8 KOL check
    }

def good(c: dict) -> bool:
    if (c["mcap"] or 0) < GOOD["mcap_min"] or (c["liq"] or 0) < GOOD["liq_min"] or (c["vol24"] or 0) < GOOD["vol_min"]: return False
    if c["age_h"] is None or c["age_h"] > GOOD["age_max_h"] or c["age_h"] < GOOD["age_min_h"]: return False
    if GOOD["socials"] and not c["socials"]: return False
    if c["buy_ratio"] is not None and c["tx_h1"] >= 10 and c["buy_ratio"] < GOOD["buy_ratio_min"]: return False
    return True

# ---------------- Kyvo Check (same rules/score as insights.js) ----------------
def kyvo_check(c: dict, universe: list[dict]) -> tuple[int, list[tuple[str, str]]]:
    out: list[tuple[str, str]] = []
    add = lambda lvl, t: out.append((lvl, t))
    liq, mc = c["liq"], c["mcap"]
    if c["on_curve"]: add("info", "Na krzywej bonding curve")
    elif liq is None or liq < 5000: add("bad", f"Bardzo mała płynność ({fmt_usd(liq)})")
    elif liq < 20000: add("warn", f"Mała płynność ({fmt_usd(liq)})")
    else: add("ok", f"Płynność {fmt_usd(liq)}")
    if not c["on_curve"] and liq and mc and liq / mc < 0.03: add("warn", "Płynność <3% MC")
    a = c["age_h"]
    if a is None: add("warn", "Nieznany wiek pary")
    elif a < 1: add("warn", "Bardzo nowy coin")
    elif a >= 24: add("ok", f"Istnieje od {age_label(a)}")
    add("ok", "Ma socials/stronę") if c["socials"] else add("warn", "Brak socials")
    if c["buy_ratio"] is not None and c["tx_h1"] >= 20 and c["buy_ratio"] < 0.35: add("warn", f"Przewaga sprzedaży 1h ({round(c['buy_ratio'] * 100)}% kupna)")
    if c["h1"] is not None and c["h1"] <= -40: add("bad", f"Spadek {c['h1']:.0f}% w 1h")
    same = [x for x in universe if x["address"] != c["address"] and x["symbol"].lower() == c["symbol"].lower()]
    if any((x["liq"] or 0) > (liq or 0) * 3 and (x["mcap"] or 0) > (mc or 0) * 3 for x in same): add("bad", "Możliwa podróbka (większy coin z tym tickerem)")
    elif same: add("warn", "Ten sam ticker ma inne coiny")
    if c["chain"] == "solana":
        rc = get(RC + urllib.parse.quote(c["address"]) + "/report/summary")
        if rc and isinstance(rc.get("risks"), list):
            for r in rc["risks"][:8]:
                lvl = "bad" if r.get("level") == "danger" else "warn" if r.get("level") == "warn" else "info"
                if c["on_curve"] and "holder" in str(r.get("name", "")).lower(): lvl = "info"
                add(lvl, RC_PL.get(r.get("name", ""), str(r.get("name", ""))[:60]))
            if not rc["risks"]: add("ok", "RugCheck: brak ryzyk")
            if not c["on_curve"] and isinstance(rc.get("lpLockedPct"), (int, float)) and rc["lpLockedPct"] >= 90: add("ok", f"LP zablokowane {round(rc['lpLockedPct'])}%")
        g = ((get(GP + "solana/token_security?contract_addresses=" + c["address"]) or {}).get("result") or {}).get(c["address"])
        if g:
            st = lambda o: isinstance(o, dict) and str(o.get("status")) == "1"
            add("bad", "Mint authority włączone") if st(g.get("mintable")) else add("ok", "Mint wyłączony")
            add("bad", "Freeze włączone") if st(g.get("freezable")) else add("ok", "Freeze wyłączony")
            if st(g.get("balance_mutable_authority")): add("bad", "Salda można zmieniać")
    elif c["chain"] == "bsc":
        res = (get(GP + "token_security/56?contract_addresses=" + c["address"]) or {}).get("result") or {}
        g = res.get(c["address"].lower()) or res.get(c["address"])
        if g:
            one = lambda v: str(v) == "1"
            if one(g.get("is_honeypot")): add("bad", "HONEYPOT")
            elif g.get("is_honeypot") == "0": add("ok", "Nie honeypot")
            if one(g.get("cannot_sell_all")): add("bad", "Nie da się sprzedać całości")
            try: bt, stx = float(g.get("buy_tax") or 0), float(g.get("sell_tax") or 0)
            except ValueError: bt = stx = 0.0
            if stx > 0.1: add("bad", f"Podatek sprzedaży {stx * 100:.0f}%")
            elif bt > 0 or stx > 0: add("warn", f"Podatek {bt * 100:.1f}% / {stx * 100:.1f}%")
            else: add("ok", "Bez podatku")
            if one(g.get("is_mintable")): add("warn", "Można dodrukować")
            if one(g.get("owner_change_balance")): add("bad", "Właściciel zmienia salda")
            if one(g.get("hidden_owner")) or one(g.get("can_take_back_ownership")): add("bad", "Ukryty właściciel")
            if g.get("is_open_source") == "0": add("warn", "Kod niezweryfikowany")
    score = max(0, min(100, 100 - 25 * sum(l == "bad" for l, _ in out) - 9 * sum(l == "warn" for l, _ in out)))
    return score, out

# ---------------- v8.3 Good Coins rule (shared JS heuristic) ----------------
RULE_JS = Path(__file__).with_name("upside_estimate.js")

def contract_facts(c: dict) -> dict:
    """SAFETY-gate contract facts — mirrors contractFacts() in insights.js."""
    on_curve = bool(c["on_curve"])
    if c["chain"] == "solana":
        r = get(RC + urllib.parse.quote(c["address"]) + "/report") or {}
        g = ((get(GP + "solana/token_security?contract_addresses=" + c["address"]) or {}).get("result") or {}).get(c["address"]) or {}
        if not r and not g: return {"checked": True, "chain": "solana", "error": True}
        tok = r.get("token") or {}
        st = lambda o: isinstance(o, dict) and str(o.get("status")) == "1"
        mint_rev = (not tok.get("mintAuthority") and not r.get("mintAuthority")) if r else not st(g.get("mintable"))
        frz_rev = (not tok.get("freezeAuthority") and not r.get("freezeAuthority")) if r else not st(g.get("freezable"))
        lp = None; pools = set()
        for m in r.get("markets") or []:
            v = (m.get("lp") or {}).get("lpLockedPct")
            if isinstance(v, (int, float)): lp = max(lp or 0, v)
            if m.get("pubkey"): pools.add(m["pubkey"])
            if (m.get("lp") or {}).get("owner"): pools.add(m["lp"]["owner"])
        known = r.get("knownAccounts") or {}
        def is_pool(h):
            for a in (h.get("owner"), h.get("address")):
                if a in pools: return True
                k = known.get(a) or {}
                if any(x in str(k.get("type", "")) + str(k.get("name", "")) for x in ("AMM", "LOCKER", "CURVE", "pump", "Pump")): return True
            return False
        top = [h for h in (r.get("topHolders") or []) if not is_pool(h)][:10]
        top10 = sum(float(h.get("pct") or 0) for h in top) if r.get("topHolders") is not None else None
        sup = tok.get("supply"); dev = (r["creatorBalance"] / sup * 100) if sup and r.get("creatorBalance") is not None else None
        return {"checked": True, "chain": "solana", "mintRevoked": mint_rev, "freezeRevoked": frz_rev, "lpLockedPct": lp, "top10Pct": top10, "devPct": dev, "onCurve": on_curve}
    if c["chain"] == "bsc":
        res = (get(GP + "token_security/56?contract_addresses=" + c["address"]) or {}).get("result") or {}
        g = res.get(c["address"].lower()) or res.get(c["address"])
        if not g: return {"checked": True, "chain": "bsc", "error": True}
        one = lambda v: str(v) == "1"
        owner = str(g.get("owner_address") or "").lower()
        renounced = not owner or owner == "0x" + "0" * 40 or owner.endswith("dead")
        danger = any(one(g.get(k)) for k in ("is_mintable", "hidden_owner", "can_take_back_ownership", "owner_change_balance", "selfdestruct", "transfer_pausable", "is_blacklisted", "slippage_modifiable", "personal_slippage_modifiable", "external_call"))
        lp = None
        if g.get("lp_holders"): lp = sum(float(h.get("percent") or 0) for h in g["lp_holders"] if one(h.get("is_locked")) or str(h.get("address", "")).lower().endswith("dead") or str(h.get("address", "")).startswith("0x000000000000000000000000000000")) * 100
        top10 = None
        if g.get("holders"): top10 = sum(float(h.get("percent") or 0) for h in [h for h in g["holders"] if not one(h.get("is_locked")) and not one(h.get("is_contract"))][:10]) * 100
        try: bt = float(g.get("buy_tax")) * 100
        except (TypeError, ValueError): bt = None
        try: stx = float(g.get("sell_tax")) * 100
        except (TypeError, ValueError): stx = None
        return {"checked": True, "chain": "bsc", "honeypot": one(g.get("is_honeypot")) or one(g.get("cannot_sell_all")), "buyTax": bt, "sellTax": stx,
                "ownerSafe": renounced or not danger, "lpLockedPct": lp, "top10Pct": top10, "onCurve": on_curve}
    return {"checked": True, "chain": c["chain"]}

def rule_input(c: dict, score: int, checks: list[tuple[str, str]], boost_rank, contract=None) -> dict:
    return {"score": score, "redFlags": sum(l == "bad" for l, _ in checks), "mcap": c["mcap"], "liquidity": c["liq"],
            "onCurve": c["on_curve"], "vol1h": c["vol1h"], "vol24h": c["vol24"], "m5": c["m5"], "h1": c["h1"], "h6": c["h6"],
            "h24": c["h24"], "buys1h": c["buys1h"], "sells1h": c["sells1h"], "ageH": c["age_h"], "smBuyers": 0, "smSellers": 0,
            "tweetNamed": None, "tweetAgeH": None, "sinceTweetPct": None, "top10": None, "boostRank": boost_rank,
            "vol5m": c.get("vol5m"), "tx6h": c.get("tx6h"), "buys5m": c.get("buys5m"), "sells5m": c.get("sells5m"), "contract": contract}

def good_rule(inputs: list[dict], mode: str = "--good") -> list[dict] | None:
    node = shutil.which("node")
    if not node or not RULE_JS.exists() or not inputs: return None
    try:
        r = subprocess.run([node, str(RULE_JS), mode], input=json.dumps(inputs), capture_output=True, text=True, timeout=30)
        return json.loads(r.stdout) if r.returncode == 0 else None
    except Exception:
        return None

def attach_predictions(flags: list[dict]) -> None:
    """v8.34: the coin-page prediction (estimateUpside) at flag time -> f["pred"] = {G, scen, sc (score), as (score assumed), h: {"1": [lo, hi, base, conf], ...}}.
       tools/track_record.py keeps the FIRST flag's pred, so accuracy can be measured later. Node missing -> no pred (flags unchanged)."""
    todo = [f for f in flags if isinstance(f.get("_pin"), dict)]
    ins = [{k: v for k, v in f["_pin"].items() if k != "_assumed"} for f in todo]
    res = good_rule(ins, "--estimate") if ins else None
    for f, r in zip(todo, res if isinstance(res, list) and len(res) == len(todo) else [None] * len(todo)):
        pin = f.pop("_pin", None) or {}
        if not isinstance(r, dict) or r.get("gated") or r.get("noData"): continue
        f["pred"] = {"G": round(r.get("G") or 0, 3), "scen": r.get("scen"), "sc": pin.get("score"), "as": bool(pin.get("_assumed")),
                     "h": {str(z["h"]): [z.get("lo"), z.get("hi"), z.get("base"), z.get("conf")] + ([1] if z.get("hidden") else []) for z in r.get("horizons") or []}}
    for f in flags: f.pop("_pin", None)

def outlook_text(res: dict) -> str:
    hz = {z["h"]: z for z in res["est"]["horizons"]}
    z8 = hz[8]
    return (f"**8h bazowo {z8['base']:+d}%** · zakres +{z8['lo']}–{z8['hi']}% · pewność {z8['conf']}%\n"
            f"1h {hz[1]['base']:+d}% · 3h {hz[3]['base']:+d}% · popularność {round(res['P'] * 100)}/100\n"
            "_Spekulacja, nie prognoza ani porada finansowa — memecoiny mogą spaść do zera._")

# ---------------- Discord ----------------
def embed(c: dict, score: int, checks: list[tuple[str, str]], res: dict | None = None) -> dict:
    ch = CHAINS[c["chain"]]
    key = urllib.parse.quote(f"{c['chain']}:{c['address']}", safe="")
    kyvo = f"{APP}#coin/{key}"
    fomo = f"https://fomo.family/tokens/{ch['fomo']}/{c['address']}"
    oks = [t for l, t in checks if l == "ok"][:3]
    risks = [("⚠️ " if l == "warn" else "⛔ ") + t for l, t in checks if l in ("warn", "bad")][:2]
    e = {
        "title": f"${c['symbol']} · {c['name']}"[:250],
        "url": kyvo,
        "color": 0x22C55E if score >= 85 else 0x84CC16,
        "description": f"`{c['address']}`",
        "fields": [
            {"name": "Sieć", "value": ch["label"], "inline": True},
            {"name": "MC", "value": fmt_usd(c["mcap"]), "inline": True},
            {"name": "Płynność", "value": fmt_usd(c["liq"]), "inline": True},
            {"name": "Wiek", "value": age_label(c["age_h"]), "inline": True},
            {"name": "Vol 24h", "value": fmt_usd(c["vol24"]), "inline": True},
            {"name": "Kyvo Check", "value": f"**{score}/100**", "inline": True},
            *([{"name": "🔥 Popularne teraz · potencjał 8h (spekulacja)", "value": outlook_text(res)[:1000], "inline": False}] if res else []),
            {"name": "Dlaczego", "value": ("\n".join("✅ " + t for t in oks) + ("\n" + "\n".join(risks) if risks else ""))[:1000] or "—", "inline": False},
            {"name": "Linki", "value": f"[Kyvo]({kyvo}) · [DexScreener]({c['ds_url']}) · [FOMO]({fomo})", "inline": False},
        ],
        "footer": {"text": "Auto scan by Kyvo – NFA, DYOR · zawsze sprawdź adres (CA)"},
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if c.get("image"): e["thumbnail"] = {"url": c["image"]}
    return e

def post(webhook: str, payload: dict) -> bool:
    data = json.dumps(payload).encode()
    for _ in range(3):
        try:
            req = urllib.request.Request(webhook, data=data, headers={**UA, "Content-Type": "application/json"}, method="POST")
            urllib.request.urlopen(req, timeout=20).read(); return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                try: wait = float(json.loads(e.read() or b"{}").get("retry_after", 2))
                except Exception: wait = 2
                time.sleep(min(wait, 30)); continue
            print(f"webhook error HTTP {e.code}", file=sys.stderr); return False   # never print the webhook URL
        except Exception as e:
            print("webhook error", type(e).__name__, file=sys.stderr); return False
    return False

def load_state(p: Path) -> dict:
    try: return json.loads(p.read_text())
    except Exception: return {"posted": {}, "hist": {}}

def write_kol_feed(path: Path, new: list[dict], dry: bool = False) -> None:
    """v8.8: data/kol_live.json for the app's Runner tab — first flag per coin kept (time + MC), 24 h window."""
    try: doc = json.loads(path.read_text())
    except Exception: doc = {"items": []}
    now = int(time.time() * 1000)
    items = {e["k"]: e for e in doc.get("items", []) if now - e.get("at", 0) < 24 * 3.6e6}
    added = 0
    for f in new:
        if f["k"] in items:
            e = items[f["k"]]; e.update({"mcNow": f["mc0"], "lastAt": f["at"], "top_pct": f.get("top_pct") or e.get("top_pct")})
            if f.get("badge") == "kol" and e.get("badge") != "kol": e.update({"badge": "kol", "kol": f.get("kol"), "evidence": f.get("evidence")})
            if f.get("tweet") and not e.get("tweet"): e["tweet"] = f["tweet"]; added += 1   # v8.9: 🐦 also a tweet runner -> commit + app badge
            elif f.get("tweet") and e.get("tweet"): e["tweet"]["chg"] = max(e["tweet"].get("chg") or 0, f["tweet"].get("chg") or 0)
        else: items[f["k"]] = dict(f); added += 1
    out = {"version": 1, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "items": sorted(items.values(), key=lambda e: -e["at"])}
    changed = added > 0 or len(items) != len(doc.get("items", []))
    if not dry:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh and not dry:
        with open(gh, "a") as fh: fh.write(f"kol_commit={'true' if changed else 'false'}\n")
    print(f"kol feed -> {path}: {len(items)} items ({added} new)")

def write_early_shadow(path: Path, hits: list[dict], flags: list[dict]) -> None:
    """v8.24 shadow log of earlyRunnerRule. First hit per coin is kept (time / price / MC at the early signal); when the same coin
    later gets a real 🏃 Runner flag, runner_at / runner_px / runner_mc are added -> lead time and price gap can be compared.
    7-day window, ≤ 1500 coins. Shadow only: nothing here is shown to users or pushed."""
    try: doc = json.loads(path.read_text())
    except Exception: doc = {}
    items = {e["k"]: e for e in doc.get("items", [])}
    now_ms = int(time.time() * 1000); new = 0
    for h in hits:
        if h["k"] not in items: items[h["k"]] = h; new += 1
        else: items[h["k"]]["hits"] = items[h["k"]].get("hits", 1) + 1; items[h["k"]]["lastHit"] = h["at"]
    for f in flags:
        e = items.get(f["k"])
        if e and f["kind"] == "runner" and not e.get("runner_at"):
            e.update({"runner_at": f["at"], "runner_px": f["px0"], "runner_mc": f["mc0"], "lead_min": round((f["at"] - e["at"]) / 60000, 1)})
    keep = sorted((e for e in items.values() if now_ms - e["at"] < 7 * 864e5), key=lambda e: -e["at"])[:1500]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "shadow": False,
                                "note": "v8.33 ⚡ Wczesny Runner log (tools/early_runner.py; v8.24–8.32: shadow test of EARLY_T): first early signal per coin + the later 🏃 Runner flag, for lead time.",
                                "items": keep}, ensure_ascii=False, separators=(",", ":")))
    print(f"early shadow -> {path}: {len(keep)} coins ({new} new)")

def early_snap(c: dict) -> dict:
    b5, s5 = c.get("buys5m") or 0, c.get("sells5m") or 0
    return {"liq": c.get("liq"), "vol5m": c.get("vol5m"), "vol1h": c.get("vol1h"), "m5": c.get("m5"), "h1": c.get("h1"), "tx5": b5 + s5,
            "br5": round(b5 / (b5 + s5), 3) if b5 + s5 else None, "acc": round(early_runner.accel(c) or 0, 2),
            "age_h": round(c["age_h"], 3) if c.get("age_h") is not None else None}

def early_log(c: dict) -> dict:
    return dict({"k": f"{c['chain']}:{c['address']}", "sym": c["symbol"], "name": c["name"], "chain": c["chain"], "addr": c["address"],
                 "pair": c.get("pair") or "", "at": int(time.time() * 1000), "px0": c["price"], "mc0": c["mcap"]}, **early_snap(c))

def heat(c: dict) -> float:
    """v8.25 Runner prefilter order: 1 h volume weighted by the 1 h move (capped), so the hottest coins are checked first."""
    import math
    return math.log10(1 + (c.get("vol1h") or 0)) * (1 + min(max(c.get("h1") or 0, 0), 500) / 100)

def candle_shape(ol: list) -> dict | None:
    """v8.25: Python port of fetchShape() in insights.js (15-min candles [t, o, h, l, c, v]) -> pumpX / belowHigh / coolRatio."""
    ol = sorted([[float(x) for x in r[:6]] for r in ol if len(r) >= 6], key=lambda r: r[0])
    if len(ol) < 8: return None
    hi, hi_i = 0.0, 0
    for i, r in enumerate(ol):
        if r[2] > hi: hi, hi_i = r[2], i
    low_before = min((r[3] or r[1]) for r in ol[: hi_i + 1])
    px = ol[-1][4]
    roll = [sum(q[5] for q in ol[max(0, i - 3): i + 1]) for i in range(len(ol))]
    peak = max(roll[: min(len(roll), hi_i + 3)])
    quiet = roll[hi_i + 4: len(roll) - 2]
    return {"pumpX": hi / low_before if low_before > 0 else None, "belowHigh": (1 - px / hi) * 100 if hi > 0 else None,
            "coolRatio": min(quiet) / peak if quiet and peak > 0 else 1}

def ath_close(ol: list) -> float | None:
    """v8.38: highest 15-min close (single-candle bad prints > 3x both neighbours dropped)."""
    cl = [float(r[4]) for r in sorted(ol, key=lambda r: r[0]) if len(r) >= 5 and r[4]]
    if len(cl) < 4: return None
    ok = [x for i, x in enumerate(cl) if not (0 < i < len(cl) - 1 and x > 3 * cl[i - 1] and x > 3 * cl[i + 1])]
    return max(ok) if ok else None

def post_dump(flags: list[dict]) -> None:
    """v8.38: flags of kind runner / early -> f["pd"] = {"b": % below ATH, "ath": ATH as MC, "w": True if ≥ PD_BELOW}. Badge only."""
    now = time.time()
    try: cache = {k: v for k, v in json.loads(PD_CACHE.read_text()).items() if now - v.get("t", 0) < 600}
    except Exception: cache = {}
    reads = 0
    for f in flags:
        if f.get("kind") not in ("runner", "early") or not f.get("pair") or not f.get("px0") or "pd" in f: continue
        k = f"{f['chain']}:{f['pair']}"
        if k in cache: ath = cache[k].get("ath")
        elif reads < PD_READS and f["chain"] in CHAINS:
            reads += 1
            d = get(f"{GT}/networks/{CHAINS[f['chain']]['gt']}/pools/{f['pair']}/ohlcv/minute?aggregate=15&limit=192&currency=usd&token={f['addr']}")
            time.sleep(2.1)
            ol = (((d or {}).get("data") or {}).get("attributes") or {}).get("ohlcv_list") or []
            ath = ath_close(ol); cache[k] = {"t": now, "ath": ath}
        else: continue
        if not ath: continue
        ath = max(ath, f["px0"]); b = (1 - f["px0"] / ath) * 100
        f["pd"] = {"b": round(b), "ath": round(f["mc0"] * ath / f["px0"]), "w": b >= PD_BELOW}
        if f["pd"]["w"]: print(f"  ⚠️ po dumpie ${f['sym']} ({f['kind']}): MC {fmt_usd(f['mc0'])} = −{round(b)}% from ATH {fmt_usd(f['pd']['ath'])} (badge only, not hidden)")
    try: PD_CACHE.parent.mkdir(parents=True, exist_ok=True); PD_CACHE.write_text(json.dumps(cache))
    except Exception: pass

def leg2_scan(chain: str, coins: list[dict], brank: dict, flag, skip: set) -> dict:
    now = time.time()
    try: cache = {k: v for k, v in json.loads(LEG2_CACHE.read_text()).items() if now - v.get("t", 0) < 600}
    except Exception: cache = {}
    pre = sorted([c for c in coins if c["address"] not in skip and 0 < (c["mcap"] or 0) <= 1e8 and (c["liq"] or 0) >= 15_000 and (c["age_h"] or 0) >= 2
                  and (c["vol5m"] or 0) >= 5000 and (c["m5"] or 0) > 0 and (c["vol1h"] or 0) > 0 and (c["vol5m"] or 0) * 12 >= 2 * (c["vol1h"] or 0)
                  and ((c.get("buys5m") or 0) + (c.get("sells5m") or 0)) > 0 and (c.get("buys5m") or 0) / ((c.get("buys5m") or 0) + (c.get("sells5m") or 0)) >= 0.55],
                 key=lambda c: -(c["vol5m"] or 0))[:LEG2_CAP]
    rin = []
    for c in pre:
        score, checks = kyvo_check(c, coins); rin.append((c, rule_input(c, score, checks, brank.get(c["address"].lower()))))
    r1 = good_rule([x for _, x in rin], "--leg2") or [{} for _ in rin]
    alive = [(c, x) for (c, x), r in zip(rin, r1) if r.get("pending")]   # market part passed, candle shape needed
    reads = 0; out = []
    for c, x in alive:
        k = f"{chain}:{c['address']}"
        if k in cache: sh = cache[k].get("v")
        elif reads < LEG2_SHAPES and c.get("pair"):
            reads += 1
            d = get(f"{GT}/networks/{CHAINS[chain]['gt']}/pools/{c['pair']}/ohlcv/minute?aggregate=15&limit=96&currency=usd&token={c['address']}")
            time.sleep(2.1)   # GeckoTerminal free tier ~30 req/min
            sh = candle_shape((((d or {}).get("data") or {}).get("attributes") or {}).get("ohlcv_list") or [])
            cache[k] = {"t": now, "v": sh}
        else: continue
        if sh: out.append((c, dict(x, **sh)))
    r2 = good_rule([x for _, x in out], "--leg2") or [{} for _ in out]
    n_ok = 0
    for (c, x), r in zip(out, r2):
        if not r.get("ok"): continue
        flag(c, "leg2"); n_ok += 1
        print(f"  🔁 kolejna fala ${c['symbol']} MC {fmt_usd(c['mcap'])} −{x['belowHigh']:.0f}% od szczytu, ×{r.get('acc') or 0:.1f} vol 5m")
    try: LEG2_CACHE.parent.mkdir(parents=True, exist_ok=True); LEG2_CACHE.write_text(json.dumps(cache))
    except Exception: pass
    if pre: print(f"  [{chain}] leg2: {len(pre)} prefilter, {len(alive)} market ok, {reads} candle reads, {n_ok} pass")
    return {"leg2_pre": len(pre), "leg2_market": len(alive), "leg2_pass": n_ok}

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="print embeds, post nothing")
    ap.add_argument("--state", type=Path, default=Path(os.environ.get("KYVO_CALLS_STATE", ".kyvo_calls/posted.json")))
    ap.add_argument("--chains", default="solana,bsc")
    ap.add_argument("--news", help="post this changelog text to DISCORD_WEBHOOK_NEWS and exit")
    ap.add_argument("--flags-out", type=Path, help="v8.3 track record: write every coin that passes the Good / Runner rule "
                    "(first-flag price + MC) to this JSON, even when no webhook is set (tools/track_record.py merges it)")
    ap.add_argument("--kol-out", type=Path, help="v8.8: merge 👑 KOL coin / 🚀 Moon run flags into this JSON (app feed data/kol_live.json)")
    ap.add_argument("--early-out", type=Path, help="v8.24 SHADOW test: log coins passing earlyRunnerRule (EARLY_T) to this JSON "
                    "(e.g. data/early_shadow.json) — never posted, never pushed; for comparing with real Runner flags later")
    ap.add_argument("--partial-out", type=Path, help="v8.41: flags so far, rewritten after each chain (the loop pushes them at once)")
    ap.add_argument("--audit-out", type=Path, help="v8.25: per-chain scan summary (candidates, prefilter passes, rule passes, near misses) as JSON")
    a = ap.parse_args()

    if a.news is not None:
        hook = os.environ.get("DISCORD_WEBHOOK_NEWS", "").strip()
        payload = {"username": "Kyvo", "allowed_mentions": {"parse": []}, "embeds": [{"title": "👻 Kyvo — co nowego", "description": a.news[:3900], "url": APP, "color": 0xA78BFA, "footer": {"text": "Kyvo · NFA, DYOR"}}]}
        if a.dry_run or not hook:
            print(("DRY RUN" if a.dry_run else "DISCORD_WEBHOOK_NEWS not set -> skipped"), json.dumps(payload, ensure_ascii=False, indent=1)); return 0
        return 0 if post(hook, payload) else 1

    _memo_load()
    hooks = {ch: os.environ.get(CHAINS[ch]["secret"], "").strip() for ch in CHAINS}
    chains = [c for c in a.chains.split(",") if c in CHAINS and (a.dry_run or hooks[c] or a.flags_out)]
    flags: list[dict] = []
    early_hits: list[dict] = []   # v8.24 shadow test of earlyRunnerRule (no Discord post, no push)
    audit: list[dict] = []        # v8.25 per-scan prefilter summary -> --audit-out -> data/flag_history.json "scans"
    def flag(c: dict, kind: str, ov: dict | None = None, score: int | None = None, checks: list | None = None):
        if c.get("price") and c.get("mcap"):
            f = {"k": f"{c['chain']}:{c['address']}", "sym": c["symbol"], "name": c["name"], "chain": c["chain"], "addr": c["address"],
                 "pair": c.get("pair") or "", "img": c.get("image"), "kind": kind, "at": int(time.time() * 1000), "px0": c["price"], "mc0": c["mcap"],
                 "h1": c.get("h1"), "m5": c.get("m5"), "age_h": round(c["age_h"], 3) if c.get("age_h") is not None else None,   # v8.24: push shows the real 1 h move
                 "vol1h": c.get("vol1h"), "h6": c.get("h6")}   # v8.34: push filter (vol 1h / MC); v8.39 h6 -> runner2 late_6h fallback
            # v8.34: estimateUpside input at flag time -> "pred" (computed in one node call before --flags-out is written, saved in the track record)
            f["_pin"] = dict(rule_input(c, score if score is not None else 75, checks or [], None), _assumed=score is None)
            if ov and ov.get("badge"):   # v8.8 override: no thresholds stored, only what the app shows
                f.update({"badge": ov["badge"], "kol": ov.get("handle") if ov["badge"] == "kol" else None, "top_pct": ov.get("top_pct"),
                          "top_is": ov.get("top_is"), "concentrated": ov.get("concentrated"), "evidence": ov.get("evidence") or [],
                          "tweeted_by": ov.get("tweeted_by") or [], "buyers1h": ov.get("buyers1h"), "big": ov.get("big"), "tweet": ov.get("tweet"),
                          "trend": ov.get("trend"),   # v8.42 🔥 Trend facts (app "why" line)
                          "snap": {"liq": c.get("liq"), "vol1h": c.get("vol1h"), "h1": c.get("h1"), "m5": c.get("m5"), "tx1h": c.get("tx_h1"),
                                   "age_h": round(c["age_h"], 3) if c.get("age_h") is not None else None, "created": int(time.time() * 1000 - (c.get("age_h") or 0) * 3.6e6)}})
            flags.append(f)
    if not chains:
        print("No DISCORD_WEBHOOK_SOL / DISCORD_WEBHOOK_BSC secret set -> nothing to do."); return 0
    st = load_state(a.state); now = time.time()
    st["posted"] = {k: t for k, t in st.get("posted", {}).items() if now - t < REPOST_AFTER_H * 3600}
    _t0 = time.time()
    for chain in chains:
        _tc = time.time()
        hist = [t for t in st.get("hist", {}).get(chain, []) if now - t < 3600]
        room = min(MAX_PER_RUN, MAX_PER_HOUR - len(hist))
        _tl = time.time(); _cand = candidates(chain); _T[f"{chain}_lists"] = round(time.time() - _tl)
        coins = [to_coin(p) for p in pairs_for(chain, _cand)]
        good_coins = [c for c in coins if good(c) and (c["liq"] or 0) >= MIN_LIQ_POST and f"{chain}:{c['address'].lower()}" not in st["posted"]]
        boosted = sorted([c for c in coins if c["boost"]], key=lambda c: -c["boost"])
        brank = {c["address"].lower(): i + 1 for i, c in enumerate(boosted)}
        good_coins.sort(key=lambda c: -(c["vol1h"] or 0))
        # v8.33: everything this scan will Kyvo-Check, prefetched in parallel (Good / Runner / KOL young / ⚡ early / Big runner)
        _pre = sorted([c for c in coins if (c["vol1h"] or 0) >= 100_000 and (c["h1"] or 0) >= 30 and (c["tx_h1"] or 0) >= 1000 and (c["liq"] or 0) >= 15_000], key=lambda c: -heat(c))[:RUNNER_CAP]
        _big = sorted([c for c in coins if 1e6 <= (c["mcap"] or 0) <= 1e8 and (c["age_h"] or 0) >= 6 and (c["vol1h"] or 0) >= 150_000 and ((c["h1"] or 0) >= 5 or (c["h6"] or 0) >= 40)], key=lambda c: -(c["vol1h"] or 0))[:10]
        _t = time.time(); prefetch(good_coins[:12], report=True); prefetch(_pre + early_runner.prefilter(coins) + _big)
        print(f"  [{chain}] safety prefetch {time.time() - _t:.1f}s")
        print(f"[{chain}] candidates={len(coins)} good&new={len(good_coins)} room={room}")
        scored = []
        for c in good_coins[:12]:
            score, checks = kyvo_check(c, coins)
            if score < MIN_SCORE:
                print(f"  skip ${c['symbol']} score {score}"); continue
            scored.append((c, score, checks))
        # pass 1: market gates only (contract unknown -> "pending"); pass 2: contract facts only for those still alive
        first = good_rule([rule_input(c, sc, ck, brank.get(c["address"].lower())) for c, sc, ck in scored])
        if first is None:
            print("  rule unavailable (node missing?) -> posting nothing"); scored = []; first = []
        alive = [(t, r) for t, r in zip(scored, first) if r.get("ok") or r.get("pending")]
        for t, r in zip(scored, first):
            if not (r.get("ok") or r.get("pending")): print(f"  skip ${t[0]['symbol']} gate: {r.get('failed')}")
        scored = [t for t, _ in alive]
        results = good_rule([rule_input(c, sc, ck, brank.get(c["address"].lower()), contract_facts(c)) for c, sc, ck in scored]) or []
        ranked = []
        for (c, sc, ck), res in zip(scored, results):
            if not res.get("ok"):
                print(f"  skip ${c['symbol']} gate: {res.get('failed')}"); continue
            ranked.append((res["rank"], c, sc, ck, res))
        ranked.sort(key=lambda t: -t[0])
        for _, c, *_rest in ranked: flag(c, "good")
        # 🏃 Runner (same runnerRule as the app): cheap market prefilter, then Kyvo Check, then node --runner
        # v8.25: the prefilter list is SORTED by heat (1 h volume × 1 h move) before the cap, and the cap is 15 (was: the first 8
        # in API order -> strong coins further down the candidate list were never checked)
        pre = [c for c in coins if (c["vol1h"] or 0) >= 100_000 and (c["h1"] or 0) >= 30 and (c["tx_h1"] or 0) >= 1000 and (c["liq"] or 0) >= 15_000]
        pre.sort(key=lambda c: -heat(c))
        rc = pre[:RUNNER_CAP]
        print(f"  [{chain}] runner prefilter: {len(pre)} of {len(coins)} passed, checking top {len(rc)}" + (f" (skipped {', '.join('$' + c['symbol'] for c in pre[RUNNER_CAP:RUNNER_CAP + 5])}{'…' if len(pre) > RUNNER_CAP + 5 else ''})" if len(pre) > RUNNER_CAP else ""))
        # v8.8: fresh coins with big volume also get a look for the 👑 KOL coin / 🚀 Moon run overrides (young pairs often have no h1 yet)
        seen_rc = {c["address"] for c in rc}
        rc += sorted([c for c in coins if c["address"] not in seen_rc and c["age_h"] is not None and c["age_h"] <= kol_coins.KOL_T["ageMaxH"]
                      and (c["vol1h"] or 0) >= kol_coins.KOL_T["vol1h"] and (c["tx_h1"] or 0) >= kol_coins.KOL_T["tx1h"]],
                     key=lambda c: -(c["vol1h"] or 0))[:6]
        rin = []
        for c in rc:
            score, checks = kyvo_check(c, coins); rin.append((c, rule_input(c, score, checks, brank.get(c["address"].lower())), checks))
        res_r = good_rule([x for _, x, _ in rin], "--runner") or [{} for _ in rin]
        audit.append({"t": int(time.time()), "chain": chain, "candidates": len(coins), "good": len(good_coins), "runner_pre": len(pre), "runner_checked": len(rc),
                      "kol_checked": len(rin) - len(rc), "runner_pass": sum(1 for r in res_r if r.get("ok")),
                      "fails": dict(sorted({k: sum(1 for r in res_r if r.get("failed") == k) for k in {r.get("failed") for r in res_r if r.get("failed")}}.items())),
                      "near": [{"sym": c["symbol"], "addr": c["address"], "failed": r.get("failed"), "h1": c.get("h1"), "vol1h": round(c.get("vol1h") or 0)}
                               for (c, _, _), r in zip(rin, res_r) if not r.get("ok") and r.get("failed") in ("accel", "buys", "young", "safety", "tx")][:6]})
        for (c, _, checks), r in zip(rin, res_r):
            ov = None
            try: ov = kol_coins.evaluate(c, checks, coins)
            except Exception as e: print(f"  kol/moon check error ${c['symbol']}: {type(e).__name__}")
            if ov and ov.get("blocked"): print(f"  no override ${c['symbol']}: {ov['blocked']}"); ov = None
            if r.get("ok"):
                flag(c, "runner", ov if ov and ov.get("badge") == "kol" else None); print(f"  runner ${c['symbol']} MC {fmt_usd(c['mcap'])}" + (" 👑 KOL" if ov and ov.get("badge") == "kol" else ""))
            elif ov and ov.get("badge"):
                flag(c, "runner", ov); print(f"  runner (override {ov['badge']}) ${c['symbol']} MC {fmt_usd(c['mcap'])} @{ov.get('handle') or '-'} top {ov.get('top_pct')}% ev={ov.get('evidence')}")
        # v8.33 ⚡ Wczesny Runner (was the v8.24 shadow test): tools/early_runner.py market rule -> Kyvo Check + contract facts ->
        # flag kind "early" (kyvo_push.py pushes it, tag "early"). Also logged to --early-out (data/early_shadow.json) for the lead-time log.
        try:
            runner_now = {f["addr"] for f in flags if f["kind"] == "runner"}
            ec = early_runner.prefilter(coins)
            for c in ec:
                score, checks = kyvo_check(c, coins)
                why = early_runner.safety(score, checks, contract_facts(c))
                if why or not c.get("price"): print(f"  ⚡ early ${c['symbol']} blocked: {why or 'price'}"); continue
                flag(c, "early", None, score, checks); flags[-1]["snap"] = early_snap(c)
                print(f"  ⚡ early runner ${c['symbol']} MC {fmt_usd(c['mcap'])} +{c.get('m5')}% 5m vol5m {fmt_usd(c.get('vol5m'))}")
                early_hits.append(dict(early_log(c), runner_same_scan=c["address"] in runner_now))
            if ec: print(f"  [{chain}] early: {len(ec)} passed the market rule")
        except Exception as e:
            print(f"  early error: {type(e).__name__}")
        # v8.25 🔁 Kolejna fala / Second leg on the SERVER too (same secondLegRule as the app): market prefilter on DexScreener fields,
        # Kyvo Check, node --leg2 (market part) -> 15-min candle shape (GeckoTerminal, ≤ LEG2_SHAPES reads / chain / scan, 10-min cache)
        # -> node --leg2 again. Passers are saved to the track record as kind "leg2" (no Discord post, no push — like the app).
        try:
            n2 = leg2_scan(chain, coins, brank, flag, {f["addr"] for f in flags if f["kind"] == "runner"})
            if audit and audit[-1].get("chain") == chain: audit[-1].update(n2)
        except Exception as e:
            print(f"  leg2 error: {type(e).__name__}")
        # v8.9 📈 Big runner: established $1M–$100M coins running now (bigRunnerRule, same code as the app) + hard-rug / copycat / unique buyers
        flagged = {f["addr"] for f in flags if f["kind"] == "runner"}
        bc = sorted([c for c in coins if c["address"] not in flagged and 1e6 <= (c["mcap"] or 0) <= 1e8 and (c["age_h"] or 0) >= 6
                     and (c["vol1h"] or 0) >= 150_000 and ((c["h1"] or 0) >= 5 or (c["h6"] or 0) >= 40)], key=lambda c: -(c["vol1h"] or 0))[:10]
        bin_ = []
        for c in bc:
            score, checks = kyvo_check(c, coins); bin_.append((c, rule_input(c, score, checks, brank.get(c["address"].lower())), checks))
        res_b = good_rule([x for _, x, _ in bin_], "--big") or [{} for _ in bin_]
        if bin_: print(f"  [{chain}] big-runner candidates={len(bin_)} pass rule={sum(1 for r in res_b if r.get('ok'))}")
        for (c, _, checks), r in zip(bin_, res_b):
            if not r.get("ok"): continue
            try: ov = kol_coins.big_check(c, checks, coins)
            except Exception as e: print(f"  big check error ${c['symbol']}: {type(e).__name__}"); continue
            if ov.get("blocked"): print(f"  no big runner ${c['symbol']}: {ov['blocked']}"); continue
            ov["big"] = {"h1": c.get("h1"), "h6": c.get("h6"), "acc": round(r.get("acc") or 0, 1), "txAcc": round(r["txAcc"], 1) if r.get("txAcc") else None, "br": round(r.get("br") or 0, 2)}
            flag(c, "runner", ov); print(f"  big runner ${c['symbol']} MC {fmt_usd(c['mcap'])} h1 {c.get('h1')} ×{r.get('acc', 0):.1f} vol")
        # v8.42 🔥 Trend (after the Big runner pass, never a coin already flagged this scan)
        for _early in (False, True):
            try: trend_scan(chain, coins, {f["addr"] for f in flags if f["kind"] == "runner"}, st, flag, early=_early)
            except Exception as e: print(f"  trend error: {type(e).__name__}")
        # v8.41: this chain's flags go out NOW (the loop pushes them while the next chain is scanned); ⚠️ po dumpie first so the push
        # keeps its tag (post_dump skips flags that already have pd -> no extra reads at the end)
        if a.partial_out and flags:
            try: post_dump(flags)
            except Exception as e: print(f"  post-dump check error: {type(e).__name__}")
            write_partial(a.partial_out, flags)
        _T[chain] = round(time.time() - _tc)
        if not a.dry_run and not hooks[chain]:
            st.setdefault("hist", {})[chain] = hist; continue   # flag-only run for this chain (no webhook)
        sent = 0
        for _, c, score, checks, res in ranked:
            if sent >= max(0, room) and not a.dry_run: break
            payload = {"username": "Kyvo Calls", "allowed_mentions": {"parse": []}, "embeds": [embed(c, score, checks, res)]}
            if a.dry_run:
                print(json.dumps(payload, ensure_ascii=False, indent=1)); sent += 1
                if sent >= MAX_PER_RUN: break
                continue
            if post(hooks[chain], payload):
                st["posted"][f"{chain}:{c['address'].lower()}"] = now; hist.append(now); sent += 1
                print(f"  posted ${c['symbol']} score {score} rank {res['rank']:.3f}"); time.sleep(1.2)
        if not ranked: print(f"  [{chain}] no coin with a positive outlook right now -> nothing posted")
        st.setdefault("hist", {})[chain] = hist
    # v8.9 🐦 Tweet runner: coins from fresh New Tweet items (≤ 4 h) that clearly run AFTER the tweet (every scan, ~90 s in the loop)
    _tt = time.time()
    if a.flags_out or a.kol_out:
        try:
            cands = kol_coins.tweet_candidates()
            by_chain: dict[str, list] = {}
            for x in cands: by_chain.setdefault(x["c"]["chain"], []).append(x)
            n_ok = 0
            for ch, xs in by_chain.items():
                live_c = {c["address"].lower(): c for c in (to_coin(p) for p in pairs_for(ch, [x["c"]["address"] for x in xs]))}
                for x in xs:
                    c = live_c.get(str(x["c"]["address"]).lower())
                    if not c: continue
                    px0 = x["c"].get("px_at_tweet") or kol_coins.px_at(dict(c, chain=ch, address=c["address"]), int(x["t"]["ts"]))
                    m = kol_coins.tweet_momentum(c, x["c"], px0)
                    if m: continue
                    score, checks = kyvo_check(c, [c])
                    ov = kol_coins.tweet_check(c, checks, x, px0, [c])
                    if ov.get("blocked"): print(f"  no tweet runner ${c['symbol']} (@{x['t'].get('handle')}): {ov['blocked']}"); continue
                    flag(c, "runner", ov); n_ok += 1
                    print(f"  🐦 tweet runner ${c['symbol']} +{ov['tweet']['chg']:.0f}% after @{x['t'].get('handle')} MC {fmt_usd(c['mcap'])}")
            print(f"tweet runners: {len(cands)} fresh tweet coins checked, {n_ok} running")
        except Exception as e:
            print(f"  tweet runner check error: {type(e).__name__}")
    _T["tweet"] = round(time.time() - _tt); _tt = time.time()
    if not a.dry_run:
        a.state.parent.mkdir(parents=True, exist_ok=True); a.state.write_text(json.dumps(st))
    if a.flags_out:
        try: post_dump(flags)                                        # v8.38 ⚠️ po dumpie badge (never hides a coin)
        except Exception as e: print(f"  post-dump check error: {type(e).__name__}")
        attach_predictions(flags)
        a.flags_out.parent.mkdir(parents=True, exist_ok=True); a.flags_out.write_text(json.dumps(flags))
        print(f"flags -> {a.flags_out}: {len(flags)}"); _T["pd_pred"] = round(time.time() - _tt)
    if a.kol_out: write_kol_feed(a.kol_out, [f for f in flags if f.get("badge")], dry=a.dry_run)
    if a.early_out: write_early_shadow(a.early_out, early_hits, flags)
    _memo_save()
    if a.audit_out:
        a.audit_out.parent.mkdir(parents=True, exist_ok=True); a.audit_out.write_text(json.dumps(audit))
    _T["total"] = round(time.time() - _t0)
    print("timing (s): " + " · ".join(f"{k} {v}" for k, v in _T.items()))   # v8.41: last line -> visible in the loop log
    return 0

if __name__ == "__main__":
    sys.exit(main())
