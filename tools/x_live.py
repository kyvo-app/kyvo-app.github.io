#!/usr/bin/env python3
"""Kyvo v8.10 — "New Tweet" feed: EVERY fresh tweet from the tracked accounts -> data/x_live.json, with its coin when there is one.

Source: the public FxTwitter API (api.fxtwitter.com/2/profile/<handle>/statuses, no key, ~20 newest posts per account).
v8.23: accounts with "replies": true in x_accounts.json (Elon Musk, Donald Trump) are read with ?with_replies=1&count=40, and
their replies are kept even without a coin (memecoins often launch off a single Elon / Trump reply). Each reply carries
reply_to = {handle, id, url, text}; the parent text comes from /2/status/<id> (≤ REPLY_PARENT_BUDGET new lookups per run).
It is an unofficial third-party mirror of X: free, but it can rate-limit, lag, answer a random 404 or stop working at any
time. Each account gets up to 3 tries; when a read fails the account's tweets from the previous file are kept (nothing is
invented).
Coins per tweet (v8.10):
  * coin_match "named"   = 'wspomniany coin': a contract address in the tweet or an unambiguous $TICKER on DexScreener
                           (same strict rules as tools/update_x_viral.py).
  * coin_match "related" = 'powiązany coin': the tweet names no coin, but a Solana / BSC coin whose ticker / name matches one
                           of the tweet's key words launched between ~2 min before and 60 min after the tweet (the classic
                           "big account tweets X, someone launches $X" pattern). Only coins with real trading; among several
                           matches the one with the most volume (copies have less); obvious rugs dropped (same hard-rug
                           checks as the Runner). Searched while the tweet is ≤ 90 min old, so a coin can attach later.
  * coin_match "none"    = shown anyway ('brak coina jeszcze').
For each coin: price now, price at tweet time (GeckoTerminal 5-min candles; for a coin launched after the tweet: price at
launch), volume before / after, pumping=True when price is up ≥30 %, or up ≥8 % on a 3× volume spike. Only public data. Not financial advice.
"""
from __future__ import annotations
import argparse, json, os, re, sys, time, urllib.parse, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_x_viral import ROOT, ACCOUNTS, KYVO_CHAINS, SKIP_TICKERS, extract_mentions, resolve_address, resolve_ticker, ds_get, coin_from_pair  # noqa: E402

OUT = ROOT / "data" / "x_live.json"
FX = "https://api.fxtwitter.com/2/profile/{}/statuses"
FX_STATUS = "https://api.fxtwitter.com/2/status/{}"
REPLY_PARENT_BUDGET = int(os.environ.get("KYVO_LIVE_PARENT_BUDGET", "10"))   # v8.23: parent-text lookups per run
GT = "https://api.geckoterminal.com/api/v2"
GT_NET = {"solana": "solana", "bsc": "bsc", "robinhood": "robinhood"}
KEEP_H = 12          # v8.10: the tab shows the last 12 h (was 24 h + coin-only)
MAX_ITEMS = 160
GTA_KEEP_H = 72      # v8.30 🎮 GTA 6 tab: role "gta" accounts + any tracked tweet that mentions GTA stay 72 h (the tab shows 72 h)
GTA_RE = re.compile(r"(?<![a-z0-9])(gta ?(6|vi|v|online)?|grand theft auto|vice city|leonida|rockstar ?games|jason duval|lucia caminos)(?![a-z0-9])", re.I)
REL_FROM, REL_TO = -120, 3600      # a 'powiązany coin' must launch between 2 min before and 60 min after the tweet
REL_SEARCH_H = 1.5                 # keep looking for a related coin while the tweet is this young
REL_CHAINS = ("solana", "bsc")
UA = {"User-Agent": "Mozilla/5.0 (kyvo-live/8.24; +" + KYVO_APP + ")", "Accept": "application/json"}
T0 = time.time()

def get(url: str, timeout: int = 20, tries: int = 2):
    err = None
    for i in range(tries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout))
        except Exception as e:  # noqa: BLE001
            err = e; time.sleep(1.5 * (i + 1))
    print(f"  ! {url.split('?')[0][:90]}: {type(err).__name__} {getattr(err, 'code', '')}")
    return None

def accounts() -> list[dict]:
    d = json.loads(ACCOUNTS.read_text())
    out, seen = [], set()
    for a in d.get("accounts", []) + d.get("live_extra", []) + d.get("live_more", []):
        h = a["handle"]
        if h.lower() in seen: continue
        seen.add(h.lower()); out.append(a)
    return out

def tweet_text(t: dict) -> str:
    """text + expanded links (a CA often sits only inside a dexscreener / pump.fun / gmgn link) + quoted tweet."""
    s = t.get("text") or ""
    raw = t.get("raw_text") or {}
    for f in raw.get("facets") or []:
        for k in ("replacement", "original", "display"):
            if isinstance(f.get(k), str): s += " " + f[k]
    q = t.get("quote") or {}
    if q.get("text"): s += " " + q["text"]
    return s

def media_of(t: dict) -> list[dict]:
    out = []
    for m in ((t.get("media") or {}).get("all") or [])[:4]:
        u = m.get("thumbnail_url") if m.get("type") in ("video", "gif") else m.get("url")
        if u: out.append({"type": m.get("type"), "url": u, "alt": (m.get("altText") or "")[:200]})
    return out

# ---------------- key words -> related coin ----------------
STOP = set("""a about above after again against all almost also am an and any are aren as at be because been before being below
between both but by can cannot could did do does doing don done down during each even ever every few for from further get gets
getting got had has have having he her here hers herself him himself his how i if in into is it its itself just let like lol
made make makes many may me might more most much must my myself never new no nor not now of off on once only or other our ours
out over own people per really right same say said says see she should so some still such than that the their theirs them then
there these they thing things think this those though through to today too true under until up upon us very via want was way we
well were what when where which while who whom why will with without would yes yet you your yours yup wow amazing great good
best big huge major breaking just news update thanks thank everyone anyone someone something nothing time year years day days
week month going gonna watch look live now here coming soon first last next one two three four five back again full video
link post thread tweet tweets follow join check market markets price crypto cryptocurrency token tokens coin coins memecoin
meme memes chain onchain launch launched project team community holders buy sell trading trade trader traders bullish bearish
pump pumps dump wallet wallets airdrop exchange listing listed spot futures etf bitcoin btc ethereum eth solana sol bnb usd usdt
usdc dollar dollars money billion million percent world america american americans president government state states country
nation national official officially announce announced announcing today tonight tomorrow yesterday morning evening week
ceo cto founder report reports reportedly according http https www com amp rt via gm gn ser fren frens lfg wagmi ngmi imo tbh ok okay oh yeah yep nope please must vote""".split())
WORD = re.compile(r"#?[A-Za-z][A-Za-z0-9']{2,24}")
URL = re.compile(r"https?://\S+|@\w+|\$[A-Za-z]\w*")

def is_gta(role, *texts) -> bool:
    """v8.30: a tweet for the 🎮 GTA 6 tab (kept 72 h instead of KEEP_H)."""
    return role == "gta" or any(GTA_RE.search(x or "") for x in texts)

def keep_h(p: dict) -> int:
    return GTA_KEEP_H if is_gta(p.get("role"), p.get("text"), (p.get("quote") or {}).get("text")) else KEEP_H

def norm(s: str) -> str: return re.sub(r"[^a-z0-9]", "", (s or "").lower())

def keywords(text: str, n: int = 4, own: set | None = None) -> list[str]:
    """the tweet's most meme-able words: #hashtags > ALL-CAPS > Capitalised names (and glued name pairs) > other words."""
    s = URL.sub(" ", text or ""); own = own or set()
    toks = [(m.group(0), m.start()) for m in WORD.finditer(s)]
    sc: dict[str, float] = {}
    for i, (w, pos) in enumerate(toks):
        raw = w.lstrip("#").replace("'s", "").replace("'", "")
        k = norm(raw)
        if len(k) < 3 or k in STOP or k.upper() in SKIP_TICKERS or k in own: continue
        if re.search(r"\d", k) and re.search(r"[a-z]", k) and len(k) >= 6: continue      # t.co / link ids
        start = i == 0 or re.search(r"[.!?:\n]\s*$", s[max(0, pos - 3):pos]) is not None
        if w.startswith("#"): v = 5.0
        elif raw.isupper() and len(raw) >= 3: v = 4.0
        elif raw[:1].isupper(): v = 2.0 if start else 3.0
        else: v = 0.3 if re.search(r"(ing|ed|ly|tion|ions|ers|ness|ment|ive|ous|able)$", k) else 0.7
        sc[k] = max(sc.get(k, 0), v) + (0.5 if k in sc else 0)
        if i + 1 < len(toks):                                 # "Dark Maga" -> darkmaga (launchers glue names together)
            w2 = toks[i + 1][0].lstrip("#"); k2 = norm(w2)
            if raw[:1].isupper() and w2[:1].isupper() and k2 not in STOP and k2 not in own and len(k2) >= 3 and len(k + k2) <= 16:
                sc[k + k2] = max(sc.get(k + k2, 0), v - 0.4)
    return [k for k, v in sorted(sc.items(), key=lambda x: -x[1])[:n] if v >= 0.7]

def _matches(kw: str, p: dict) -> bool:
    b = p.get("baseToken") or {}
    s, n = norm(b.get("symbol")), norm(b.get("name"))
    if not s and not n: return False
    if kw in (s, n): return True
    if len(kw) >= 4 and (n.startswith(kw) or s.startswith(kw) or n.endswith(kw)): return True
    return len(s) >= 5 and s == kw[: len(s)] and len(s) >= 0.7 * len(kw)

def _active(p: dict) -> bool:
    """real trading, not a dead copy: some MC, some 24 h volume and recent trades."""
    v = (p.get("volume") or {}).get("h1") or 0; v24 = (p.get("volume") or {}).get("h24") or 0
    tx = (p.get("txns") or {}).get("h1") or {}
    mc = p.get("marketCap") or p.get("fdv") or 0
    return mc >= 15_000 and v24 >= 10_000 and (v >= 3_000 or (tx.get("buys") or 0) + (tx.get("sells") or 0) >= 50)

def rug_reason(c: dict) -> str | None:
    """same hard-rug checks as the Runner (kol_coins.hard_rug); no contract data = not blocked (not an OBVIOUS rug)."""
    try:
        import kol_coins as K
        if c["chain"] == "solana":
            r = K.get(K.RC + urllib.parse.quote(c["address"]) + "/report")
            g = ((K.get(K.GP + "solana/token_security?contract_addresses=" + c["address"]) or {}).get("result") or {}).get(c["address"])
        else:
            r = None; res = (K.get(K.GP + "token_security/56?contract_addresses=" + c["address"]) or {}).get("result") or {}
            g = res.get(c["address"].lower()) or res.get(c["address"])
        if (c["chain"] == "solana" and not r) or (c["chain"] == "bsc" and not g): return None
        cc = dict(c, on_curve=str(c.get("dex") or "").lower() in ("pumpfun", "fourmeme"))
        return K.hard_rug(cc, [], r, g)
    except Exception as e:  # noqa: BLE001
        print(f"  ! rug check: {type(e).__name__}"); return None

def own_words(au: dict, acc: dict) -> set:
    """the author's own name / handle are not the tweet's topic (Trump signs every post 'President DJT')."""
    ws = {norm(au.get("screen_name")), norm(acc.get("handle")), norm(au.get("name"))}
    ws |= {norm(w) for w in re.split(r"\W+", au.get("name") or "") if len(w) >= 3}
    if {"realdonaldtrump", "whitehouse"} & ws: ws |= {"donaldtrump", "donald", "trump", "djt", "presidentdjt"}
    if "elonmusk" in ws: ws |= {"elon", "musk", "elonmusk"}
    return ws - {""}

_pool_cache: dict[str, list] = {}
def related_coin(t: dict, budget: list[int]) -> dict | None:
    """best fresh Solana/BSC coin named after one of the tweet's key words, launched ~0-60 min after it."""
    ts = t["ts"]; kws = t.get("kw") or []
    cands: dict[str, tuple[str, dict]] = {}
    for kw in kws:
        if kw not in _pool_cache:
            if budget[0] <= 0: continue
            budget[0] -= 1
            _pool_cache[kw] = (ds_get("/latest/dex/search?q=" + urllib.parse.quote(kw)) or {}).get("pairs") or []
        for p in _pool_cache[kw]:
            if p.get("chainId") not in REL_CHAINS: continue
            cr = (p.get("pairCreatedAt") or 0) / 1000
            if not (ts + REL_FROM <= cr <= ts + REL_TO) or not _matches(kw, p) or not _active(p): continue
            a = (p.get("baseToken") or {}).get("address")
            if a and (a not in cands or ((p.get("volume") or {}).get("h24") or 0) > ((cands[a][1].get("volume") or {}).get("h24") or 0)): cands[a] = (kw, p)
    best = sorted(cands.values(), key=lambda x: -(((x[1].get("volume") or {}).get("h24") or 0)))
    for kw, p in best[:3]:                                      # most volume first; skip an obvious rug and try the next
        c = coin_from_pair(p); why = rug_reason(c)
        if why: print(f"  related ${c['symbol']} for @{t['handle']}: blocked ({why})"); continue
        c.update({"rel": "related", "kw": kw, "match": "related", "alts": max(0, len(best) - 1)})
        return c
    return None

# ---------------- prices ----------------
def candles_after(c: dict, ts: int) -> dict | None:
    """price at tweet + volume 1 h before vs after the tweet, from GeckoTerminal 5-min candles of the top pool."""
    net = GT_NET.get(c.get("chain")); pool = c.get("pair")
    if not net or not pool or ":" in str(pool): return None
    d = get(f"{GT}/networks/{net}/pools/{pool}/ohlcv/minute?aggregate=5&limit=300&currency=usd&token={c.get('address')}")
    rows = (((d or {}).get("data") or {}).get("attributes") or {}).get("ohlcv_list") or []
    time.sleep(2.1)  # GeckoTerminal public limit ~30 req/min
    if not rows: return None
    rows.sort(key=lambda r: r[0])
    before = [r for r in rows if r[0] < ts]
    after = [r for r in rows if r[0] >= ts - 300]
    if not after: return None
    va = sum(r[5] for r in after)
    hrs = max(5 / 60, (time.time() - ts) / 3600)
    if not before and rows[0][0] > ts:                          # launched after the tweet -> measure from launch
        return {"pre_launch": True, "px_at_launch": rows[0][1], "vol_after": round(va), "hours_after": round(hrs, 2)}
    px0 = before[-1][4] if before else after[0][1]
    vb = sum(r[5] for r in before if r[0] >= ts - 3600)
    return {"px_at_tweet": px0, "vol_1h_before": round(vb), "vol_after": round(va), "hours_after": round(hrs, 2)}

def refresh_prices(tweets: list[dict]) -> None:
    """v8.10: price / MC NOW for every coin (DexScreener, ≤ 30 tokens per call) so 'since tweet' is current."""
    by: dict[str, list[dict]] = {}
    for t in tweets:
        for c in t.get("coins") or []:
            if c.get("chain") in ("solana", "bsc", "robinhood") and c.get("address"): by.setdefault(c["chain"], []).append(c)
    for ch, cs in by.items():
        addrs = list(dict.fromkeys(c["address"] for c in cs))
        for i in range(0, len(addrs), 30):
            d = get(f"https://api.dexscreener.com/tokens/v1/{ch}/" + ",".join(addrs[i:i + 30]))
            from pairs import best_map   # v8.13: main-pool rule (tools/pairs.py)
            best = best_map(d or [], ch)
            for c in cs:
                p = best.get(c["address"].lower())
                if not p or not p.get("priceUsd"): continue
                c.update({"price_usd": float(p["priceUsd"]), "mcap": p.get("marketCap") or p.get("fdv") or c.get("mcap"),
                          "change_h24": (p.get("priceChange") or {}).get("h24"), "liquidity": (p.get("liquidity") or {}).get("usd"),
                          "volume_h24": (p.get("volume") or {}).get("h24"), "image": c.get("image") or (p.get("info") or {}).get("imageUrl")})

def apply_move(c: dict) -> None:
    base = c.get("px_at_launch") if c.get("pre_launch") else c.get("px_at_tweet")
    if base and c.get("price_usd"):
        c["chg_since_tweet" if not c.get("pre_launch") else "chg_since_launch"] = round((c["price_usd"] / base - 1) * 100, 1)
    ch = c.get("chg_since_tweet") if not c.get("pre_launch") else c.get("chg_since_launch")
    per_h = (c.get("vol_after") or 0) / max(c.get("hours_after") or 1, 1 / 12)
    c["pumping"] = bool((ch or 0) >= 30 or ((ch or 0) >= 8 and (c.get("vol_after") or 0) >= 20_000 and per_h >= 3 * max(c.get("vol_1h_before") or 0, 1)))  # v8.10: volume spike alone (flat price, stablecoins) is not a pump

# ---------------- main ----------------
def _ts(iso) -> float:
    try: return datetime.fromisoformat(str(iso).replace('Z', '+00:00')).timestamp()
    except Exception: return 0.0

def read_account(acc: dict, deadline: float):
    if time.time() > deadline: return acc, None
    if acc.get("replies"):                                       # v8.23: timeline with replies (Elon / Trump)
        d = get(FX.format(acc["handle"]) + "?with_replies=1&count=40", tries=4)   # FxTwitter answers a random 404 now and then
        if d and d.get("code") == 200: time.sleep(0.5); return acc, d
        print(f"  ! @{acc['handle']}: with_replies read failed -> plain timeline")
    d = get(FX.format(acc["handle"]), tries=3)
    time.sleep(0.5)
    return acc, d if d and d.get("code") == 200 else None

def reply_info(t: dict) -> dict | None:
    """v8.23: who / what the post replies to. FxTwitter sometimes leaves replying_to empty on a real reply; then the text
    starts with @handle(s) hidden by display_text_range -> handle only (no parent id). Self-replies (threads) -> self=True."""
    r = t.get("replying_to") or {}
    if r.get("screen_name"):
        return {"handle": r.get("screen_name"), "id": str(r.get("status") or "") or None, "url": r.get("url"), "text": None,
                "self": (r.get("screen_name") or "").lower() == ((t.get("author") or {}).get("screen_name") or "").lower()}
    raw = t.get("raw_text") or {}
    rng = raw.get("display_text_range") or [0, 0]
    m = re.match(r"@(\w{1,15})", t.get("text") or "")
    if m and rng and rng[0] > 0:
        return {"handle": m.group(1), "id": None, "url": None, "text": None, "self": False}
    return None

def parent_text(rt: dict, budget: list[int]) -> None:
    """fill reply_to.text / author name from FxTwitter /2/status/<id> (one call, cached in the feed file)."""
    if not rt or not rt.get("id") or rt.get("text") is not None or budget[0] <= 0: return
    budget[0] -= 1
    d = get(FX_STATUS.format(rt["id"]), tries=2)
    s = (d or {}).get("status") or (d or {}).get("tweet") or {}
    if s.get("text") is not None:
        rt["text"] = (s.get("text") or "")[:400]
        au = s.get("author") or {}
        rt["name"] = au.get("name"); rt["handle"] = au.get("screen_name") or rt.get("handle")
        rt["url"] = rt.get("url") or s.get("url")
    else:
        rt["text"] = ""                                          # tried once; deleted / protected parent -> no retry

def sig(tweets: list[dict]) -> list:
    return sorted((t["id"], tuple(c.get("address") or "" for c in t.get("coins") or [])) for t in tweets)

def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("--out", type=Path, default=OUT); ap.add_argument("--max-accounts", type=int, default=60)
    ap.add_argument("--read-s", type=float, default=float(os.environ.get("KYVO_LIVE_READ_S", "110")), help="stop starting account reads after this many seconds")
    ap.add_argument("--workers", type=int, default=2)
    a = ap.parse_args()
    old = {}
    try: old = json.loads(a.out.read_text())
    except Exception: pass
    prev = {t["id"]: t for t in old.get("tweets", [])}
    now = time.time(); items: dict[str, dict] = {}
    pbudget = [REPLY_PARENT_BUDGET]
    accs = accounts()[: a.max_accounts]; ok_reads = 0; read_ok = set()
    with ThreadPoolExecutor(a.workers) as ex:
        res = list(ex.map(lambda x: read_account(x, T0 + a.read_s), accs))
    for acc, d in res:
        if not d: continue
        ok_reads += 1; read_ok.add(acc["handle"].lower())
        for t in d.get("results") or []:
            if t.get("reposted_by") or t.get("type") != "status": continue          # skip retweets (their time is the original's)
            au = t.get("author") or {}
            if (au.get("screen_name") or "").lower() != acc["handle"].lower(): continue
            ts = int(t.get("created_timestamp") or 0)
            if not ts or now - ts > GTA_KEEP_H * 3600: continue
            if now - ts > KEEP_H * 3600 and not is_gta(acc.get("role"), t.get("text"), (t.get("quote") or {}).get("text")): continue   # v8.30: GTA tweets 72 h
            tid = str(t["id"])
            metrics = {"likes": t.get("likes"), "reposts": t.get("reposts"), "replies": t.get("replies"), "quotes": t.get("quotes"), "bookmarks": t.get("bookmarks"), "views": t.get("views")}
            if tid in prev:
                p = prev[tid]; p["metrics"] = metrics
                if p.get("reply_to") and p["reply_to"].get("text") is None: parent_text(p["reply_to"], pbudget)
                p["metrics_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds"); items[tid] = p; continue
            full = tweet_text(t)
            coins = []
            for kind, val in ([] if acc.get("role") == "gta" else extract_mentions(full)[:4]):   # v8.30: GTA news accounts never name a coin (no 🐦 / VIP push, no KOL / Gold)
                c = resolve_address(val) if kind == "addr" else resolve_ticker(val)
                if c and c.get("chain") in KYVO_CHAINS and not any(x["address"] == c["address"] for x in coins):
                    c["rel"] = "named"; c["mention"] = val if kind == "addr" else "$" + val; coins.append(c)
            rinfo = reply_info(t)
            is_reply = bool(rinfo) and not rinfo.get("self")        # v8.23: a self-reply (own thread) is a normal post
            if is_reply and not coins and not acc.get("replies"): continue   # other accounts: bare replies only with a named coin
            if rinfo and not rinfo.get("self"): parent_text(rinfo, pbudget)
            q = t.get("quote") or {}
            items[tid] = {
                "id": tid, "url": t.get("url") or f"https://x.com/{acc['handle']}/status/{tid}", "handle": au.get("screen_name"), "author_name": au.get("name"),
                "avatar": au.get("avatar_url"), "author_followers": au.get("followers"), "verified": bool((au.get("verification") or {}).get("verified")),
                "role": acc.get("role", "kol"), "wallet_id": acc.get("wallet_id"), "text": t.get("text") or "", "is_reply": is_reply,
                "reply_to": {k: v for k, v in rinfo.items() if k != "self"} if is_reply else None, "vip": bool(acc.get("vip")),
                "quote": {"handle": (q.get("author") or {}).get("screen_name"), "text": (q.get("text") or "")[:280]} if q.get("text") else None,
                "media": media_of(t),
                "created_at": datetime.fromtimestamp(ts, timezone.utc).isoformat().replace("+00:00", "Z"), "ts": ts,
                "metrics": metrics, "metrics_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "coin_match": "named" if coins else "none", "coins": coins[:3], "first_seen": int(now),
                "kw": [] if coins else keywords(full + " " + " ".join(m["alt"] for m in media_of(t)) + (" " + rinfo["text"] if is_reply and rinfo.get("text") else ""), own=own_words(au, acc)),
            }
    # keep still-fresh items from the last file (an account read failed this run, or a tweet slid out of its newest-20)
    for tid, p in prev.items():
        if tid not in items and now - (p.get("ts") or 0) <= keep_h(p) * 3600: items[tid] = p   # v8.30: GTA tweets 72 h
    tweets = sorted(items.values(), key=lambda x: -x["ts"])[:MAX_ITEMS]
    # 'powiązany coin': tweets ≤ 90 min old without a named coin, newest first, ≤ 60 DexScreener searches per run (DS allows ~300/min)
    budget = [int(os.environ.get("KYVO_LIVE_DS_BUDGET", "60"))]; n_rel = 0
    for t in tweets:
        if t.get("coin_match") == "named" or now - t["ts"] > REL_SEARCH_H * 3600 or time.time() - T0 > 165: continue
        if "kw" not in t: t["kw"] = keywords(t.get("text", "") + " " + ((t.get("quote") or {}).get("text") or ""), own=own_words({"name": t.get("author_name"), "screen_name": t.get("handle")}, {}))
        c = related_coin(t, budget)
        if c and (not t.get("coins") or t["coins"][0].get("address") != c["address"]):
            t["coins"] = [c]; t["coin_match"] = "related"; n_rel += 1
            print(f"  🔗 @{t['handle']} -> ${c['symbol']} ({c['chain']}, key word '{c['kw']}')")
    refresh_prices([t for t in tweets if t.get("coins")])
    # after-tweet market facts (tweets < 12 h, newest first, ≤ KYVO_LIVE_GT_BUDGET GeckoTerminal calls)
    gt = int(os.environ.get('KYVO_LIVE_GT_BUDGET', '12'))  # v8.9: the loop uses 5 (runs next to the Runner scan; GT ~30 req/min)
    for t in tweets:
        for c in (t.get("coins") or [])[:1]:
            fresh_m = c.get("measured_at") and now - c["measured_at"] < (300 if now - t["ts"] < 3 * 3600 else 1800)
            if gt > 0 and not fresh_m and time.time() - T0 < 175:
                gt -= 1; f = candles_after(c, t["ts"])
                if f: c.update(f); c["measured_at"] = int(now)
            apply_move(c)
    if ok_reads == 0 and prev:
        print("source unavailable this run -> keeping previous file"); return 0
    for t in tweets: t.setdefault("coin_match", "named" if t.get("coins") else "none")
    doc = {"source": "FxTwitter public API (api.fxtwitter.com) — unofficial X mirror, no key; coins via DexScreener, candles via GeckoTerminal",
           "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"), "accounts_read": ok_reads,
           "accounts": [x["handle"] for x in accounts()], "keep_hours": KEEP_H, "tweets": tweets}
    a.out.parent.mkdir(parents=True, exist_ok=True)
    # commit when a tweet or a coin was added / attached, or the last commit is ≥ 30 min old (keeps Pages rebuilds sane)
    changed = sig(tweets) != sig(list(prev.values())) or now - _ts(old.get("updated_at")) >= 1800
    a.out.write_text(json.dumps(doc, ensure_ascii=False, indent=1))
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        with open(gh, "a") as f: f.write(f"commit={'true' if changed else 'false'}\n")
    nrep = sum(1 for t in tweets if t.get("is_reply") and t.get("vip"))
    print(f"x_live: {nrep} VIP replies (Elon / Trump) in the feed, {REPLY_PARENT_BUDGET - pbudget[0]} parent lookups")
    nn = sum(1 for t in tweets if t.get("coin_match") == "named"); nr = sum(1 for t in tweets if t.get("coin_match") == "related")
    print(f"x_live: {ok_reads}/{len(accs)} accounts read, {len(tweets)} tweets ≤{KEEP_H} h ({nn} named coin, {nr} related coin, +{n_rel} attached now) in {time.time() - T0:.0f}s -> {a.out}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
