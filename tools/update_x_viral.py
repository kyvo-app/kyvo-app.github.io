#!/usr/bin/env python3
"""Kyvo v8.2 — assemble / validate / stamp / enrich data/x_viral.json.

Does NOT call X itself (GitHub Pages can't hold an X secret). Feed it the raw JSON
the `x` MCP connector returns (see update_x_viral.md). Everything it adds is real:
  * trader_tweets: posts from tools/x_accounts.json that mention a coin
    (contract address / pump address / 0x / $CASHTAG / "ticker is X"), each resolved
    against DexScreener. Posts whose coin does not resolve are dropped.
  * topics[].coins: each topic's query/hints resolved to live DexScreener coins.
  * v8.2 enrich (--enrich-raw): for every post / trader tweet stores posted_at, full public metrics
    (views, likes, reposts, replies, quotes, bookmarks) + metrics_at, author_followers, and
    coin_match = "named" (the tweet itself gives a CA or an unambiguous $TICKER) or "speculative"
    (keyword match only: spec_coins ranked by match score, then newest + liquidity) or "none".
Only public data. Not financial advice.
"""
from __future__ import annotations
import argparse, json, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "x_viral.json"
ACCOUNTS = ROOT / "tools" / "x_accounts.json"
DS = "https://api.dexscreener.com"
KYVO_CHAINS = {"solana", "bsc", "robinhood"}
REQUIRED_POST = {"author_name", "handle", "text", "created_at", "url", "metrics"}
# Cashtags that are majors / stocks / generic words: a memecoin match for these would be misleading.
SKIP_TICKERS = {"BTC", "ETH", "SOL", "BNB", "USDC", "USDT", "ZEC", "NEAR", "HYPE", "XRP", "DOGE", "ADA", "HOOD", "NVDA",
                "TSLA", "AAPL", "SPY", "QQQ", "AI", "CA", "THE", "USD", "SPX", "ES", "NQ", "SUI", "STRC", "MSTR", "COIN"}
MIN_LIQ = 10_000          # USD liquidity floor for a coin to be shown
MIN_VOL_TICKER = 50_000
MIN_VOL_TOPIC = 5_000     # topic coins: real 24h volume, Kyvo chains only (fake-liquidity pools have ~0 volume)   # a $TICKER-only match also needs real 24h volume
AMBIG_RATIO = 3.0         # top ticker match must have >=3x the liquidity of a *different* token with the same ticker
RE_SOL = re.compile(r"(?<![A-Za-z0-9])([1-9A-HJ-NP-Za-km-z]{32,44})(?![A-Za-z0-9])")
RE_EVM = re.compile(r"\b(0x[a-fA-F0-9]{40})\b")
RE_CASH = re.compile(r"(?<![A-Za-z0-9])\$([A-Za-z][A-Za-z0-9]{0,14})\b")
RE_TICKER = re.compile(r"\bticker\s*(?:is|:)\s*\$?([A-Za-z][A-Za-z0-9]{0,14})\b", re.I)

_cache: dict[str, dict] = {}
def ds_get(path: str) -> dict:
    if path in _cache: return _cache[path]
    for i in range(3):
        try:
            req = urllib.request.Request(DS + path, headers={"User-Agent": "kyvo-snapshot/7.2"})
            d = json.load(urllib.request.urlopen(req, timeout=25))
            _cache[path] = d; time.sleep(0.25); return d
        except Exception:
            time.sleep(1.5 * (i + 1))
    return {}

def coin_from_pair(p: dict) -> dict:
    b = p.get("baseToken") or {}
    return {
        "chain": p.get("chainId"), "address": b.get("address"), "symbol": b.get("symbol"), "name": b.get("name"),
        "image": (p.get("info") or {}).get("imageUrl"), "mcap": p.get("marketCap") or p.get("fdv"),
        "liquidity": (p.get("liquidity") or {}).get("usd"), "price_usd": float(p["priceUsd"]) if p.get("priceUsd") else None,
        "change_h24": (p.get("priceChange") or {}).get("h24"), "volume_h24": (p.get("volume") or {}).get("h24"), "pair": p.get("pairAddress"), "dex": p.get("dexId"),
        "pair_created_at": p.get("pairCreatedAt"),
        "dexscreener": p.get("url") or f"https://dexscreener.com/{p.get('chainId')}/{b.get('address')}",
        "kyvo": p.get("chainId") in KYVO_CHAINS,
    }

def best_pair_per_token(pairs: list[dict]) -> dict[tuple, dict]:
    from pairs import choose   # v8.13: main-pool rule (tools/pairs.py)
    g: dict[tuple, list] = {}
    for p in pairs or []:
        b = p.get("baseToken") or {}
        k = (p.get("chainId"), (b.get("address") or "").lower())
        if not k[1]: continue
        g.setdefault(k, []).append(p)
    return {k: choose(v) for k, v in g.items()}

def resolve_address(addr: str) -> dict | None:
    d = ds_get("/latest/dex/tokens/" + addr)
    best = [p for p in best_pair_per_token(d.get("pairs")).values() if (p.get("baseToken") or {}).get("address", "").lower() == addr.lower()]
    best.sort(key=lambda p: -((p.get("liquidity") or {}).get("usd") or 0))
    if not best: return None
    c = coin_from_pair(best[0]); c["match"] = "contract"; return c

def resolve_ticker(sym: str) -> dict | None:
    """$TICKER -> the one token clearly dominant by real 24h volume (liquidity alone can be faked). Ambiguous -> None."""
    if sym.upper() in SKIP_TICKERS: return None
    d = ds_get("/latest/dex/search?q=" + urllib.parse.quote(sym))
    liq = lambda p: (p.get("liquidity") or {}).get("usd") or 0
    vol = lambda p: (p.get("volume") or {}).get("h24") or 0
    cands = [p for p in best_pair_per_token(d.get("pairs")).values()
             if ((p.get("baseToken") or {}).get("symbol") or "").upper() == sym.upper() and liq(p) >= MIN_LIQ and vol(p) > 0
             and p.get("chainId") in KYVO_CHAINS]   # Kyvo chains only: a same-ticker coin elsewhere is too easy to mismatch
    cands.sort(key=lambda p: -vol(p))
    if not cands or vol(cands[0]) < MIN_VOL_TICKER: return None
    if len(cands) > 1 and vol(cands[0]) < AMBIG_RATIO * vol(cands[1]): return None   # ambiguous ticker -> don't guess
    c = coin_from_pair(cands[0]); c["match"] = "cashtag"; return c

def extract_mentions(text: str) -> list[tuple[str, str]]:
    out, seen = [], set()
    for m in RE_EVM.findall(text): 
        if m.lower() not in seen: seen.add(m.lower()); out.append(("addr", m))
    for m in RE_SOL.findall(text):
        if m.startswith("0x") or m in seen: continue
        if not re.search(r"\d", m) or len(set(m)) < 12: continue  # skip plain words
        seen.add(m); out.append(("addr", m))
    for m in RE_CASH.findall(text) + RE_TICKER.findall(text):
        if m.upper() not in seen: seen.add(m.upper()); out.append(("tick", m.upper()))
    return out

def load_mcp(path: Path) -> dict:
    raw = path.read_text(errors="ignore"); i = raw.find("{")
    return json.loads(raw[i: raw.rfind("}") + 1]) if i >= 0 else {}

def build_trader_tweets(files: list[Path], max_age_days: int = 14) -> list[dict]:
    acc = json.loads(ACCOUNTS.read_text())["accounts"]
    by_id = {a["id"]: a for a in acc}; by_handle = {a["handle"].lower(): a for a in acc}
    now = datetime.now(timezone.utc)
    posts, users = {}, {}
    for f in files:
        d = load_mcp(f)
        for u in (d.get("includes") or {}).get("users", []): users[u["id"]] = u
        for p in d.get("data") or []:
            if "text" in p and "author_id" in p: posts[p["id"]] = p
    out, per_coin = [], {}
    for p in sorted(posts.values(), key=lambda x: x.get("created_at", ""), reverse=True):
        u = users.get(p["author_id"], {}); a = by_id.get(p["author_id"]) or by_handle.get((u.get("username") or "").lower())
        if not a: continue
        try:
            if now - datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")) > timedelta(days=max_age_days): continue
        except Exception: pass
        text = (p.get("note_tweet") or {}).get("text") or p["text"]
        urls = " ".join((x.get("expanded_url") or "") for x in ((p.get("entities") or {}).get("urls") or []))
        coins = []
        for kind, v in extract_mentions(text + " " + urls):
            c = resolve_address(v) if kind == "addr" else resolve_ticker(v)
            if c and not any(x["address"] == c["address"] for x in coins):
                c["mention"] = v if kind == "addr" else "$" + v; coins.append(c)
        if not coins: continue
        key = (a["handle"].lower(), coins[0]["address"])
        per_coin[key] = per_coin.get(key, 0) + 1
        if per_coin[key] > 2: continue   # max 2 tweets per author+coin (keeps the feed varied)
        m = p.get("public_metrics") or {}
        out.append({
            "id": p["id"], "handle": u.get("username") or a["handle"], "author_name": u.get("name") or a["handle"],
            "avatar": u.get("profile_image_url"), "role": a["role"], "wallet_id": a.get("wallet_id"),
            "text": text, "created_at": p["created_at"], "is_reply": bool(p.get("in_reply_to_user_id")),
            "url": p.get("url") or f"https://x.com/{a['handle']}/status/{p['id']}",
            "metrics": {"likes": int(m.get("like_count", 0)), "reposts": int(m.get("retweet_count", 0)), "replies": int(m.get("reply_count", 0))},
            "coins": coins[:3],
        })
    return out

def topic_score(term: str, c: dict) -> int:
    n = re.sub(r"[^a-z0-9]", "", (c.get("name") or "").lower()); s = re.sub(r"[^a-z0-9]", "", (c.get("symbol") or "").lower())
    q = re.sub(r"[^a-z0-9]", "", term.lower())
    if not q: return 0
    if q in (n, s): return 100
    if s.startswith(q) or n.startswith(q): return 90
    if q in s or q in n: return 80
    r = max(SequenceMatcher(None, q, s).ratio(), SequenceMatcher(None, q, n[: len(q) + 2]).ratio())
    return 70 if r >= 0.8 else 55 if r >= 0.7 else 0

def resolve_topics(doc: dict) -> None:
    for t in doc.get("topics", []):
        terms = [t.get("query") or t.get("label") or ""] + list(t.get("hints") or [])
        found: dict[tuple, dict] = {}
        for term in [x for x in terms if x][:4]:
            d = ds_get("/latest/dex/search?q=" + urllib.parse.quote(term))
            for p in best_pair_per_token(d.get("pairs")).values():
                c = coin_from_pair(p)
                if (c["liquidity"] or 0) < MIN_LIQ or (c["volume_h24"] or 0) < MIN_VOL_TOPIC or not c["kyvo"]: continue
                if (c["liquidity"] or 0) > 100 * (c["volume_h24"] or 1): continue   # implausible liquidity vs volume -> skip
                sc = max(topic_score(x, c) for x in terms if x)
                if sc < 70: continue
                k = (c["chain"], c["address"])
                if k not in found or sc > found[k]["score"]: c["score"] = sc; found[k] = c
        coins = sorted(found.values(), key=lambda c: (-c["score"], -(c["volume_h24"] or 0)))
        t["coins"] = coins[:4]
        t["coins_resolved_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def raw_index(files: list[Path]) -> tuple[dict, dict, str | None]:
    """All posts (id -> post) and users (id / lower(username) -> user) found in x MCP outputs + newest file time."""
    posts, users, newest = {}, {}, 0.0
    for f in files:
        try: d = load_mcp(f)
        except Exception: continue
        newest = max(newest, f.stat().st_mtime)
        rows = d.get("data") if isinstance(d.get("data"), list) else []
        for u in (d.get("includes") or {}).get("users", []) + [r for r in rows if "username" in r]:
            for k in (u.get("id"), (u.get("username") or "").lower()):
                if k and (k not in users or "public_metrics" in u): users[k] = u
        for p in rows:
            if "text" in p and "public_metrics" in p: posts[p["id"]] = p
    at = datetime.fromtimestamp(newest, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if newest else None
    return posts, users, at

def full_metrics(m: dict) -> dict:
    out = {"likes": int(m.get("like_count", 0)), "reposts": int(m.get("retweet_count", 0)), "replies": int(m.get("reply_count", 0)),
           "quotes": int(m.get("quote_count", 0)), "bookmarks": int(m.get("bookmark_count", 0))}
    if m.get("impression_count") is not None: out["views"] = int(m["impression_count"])
    return out

def spec_rank(c: dict) -> float:
    """Speculative candidates: stronger name match first, then newer pair and more liquidity."""
    import math
    age_d = max(0.0, (time.time() * 1000 - (c.get("pair_created_at") or 0)) / 86_400_000) if c.get("pair_created_at") else 365
    return (c.get("score") or 0) * 10 + math.log10(max(1.0, c.get("liquidity") or 1)) * 4 - min(age_d, 60) / 6

def enrich(doc: dict, files: list[Path]) -> None:
    posts, users, metrics_at = raw_index(files)
    topics = {t.get("id"): t for t in doc.get("topics", [])}
    def tid(item): return str(item.get("id") or (item.get("url") or "").rstrip("/").split("/")[-1])
    def apply(item):
        p = posts.get(tid(item))
        item["posted_at"] = item.get("created_at")
        if p:
            item["metrics"] = full_metrics(p.get("public_metrics") or {})
            item["metrics_at"] = metrics_at
            u = users.get(p.get("author_id")) or users.get((item.get("handle") or "").lower())
        else:
            u = users.get((item.get("handle") or "").lower())
        f = ((u or {}).get("public_metrics") or {}).get("followers_count")
        if f is not None: item["author_followers"] = int(f)
    for t in doc.get("trader_tweets", []):
        apply(t); t["coin_match"] = "named" if t.get("coins") else "none"
    for p in doc.get("posts", []):
        apply(p)
        named = []
        for kind, v in extract_mentions(p.get("text") or ""):
            c = resolve_address(v) if kind == "addr" else resolve_ticker(v)
            if c and not any(x["address"] == c["address"] for x in named):
                c["mention"] = v if kind == "addr" else "$" + v; named.append(c)
        if named:
            p["coin_match"] = "named"; p["coins"] = named[:3]; p.pop("spec_coins", None)
        else:
            t = topics.get(p.get("topic_id"))
            cands = sorted((t or {}).get("coins") or [], key=spec_rank, reverse=True)
            p["coin_match"] = "speculative" if cands else "none"
            p["spec_coins"] = [dict(c, match="speculative") for c in cands[:3]]
            if t: p["spec_keywords"] = [x for x in [t.get("query")] + list(t.get("hints") or []) if x][:4]
    for t in doc.get("topics", []):
        t["coins"] = [dict(c, match="speculative") for c in sorted(t.get("coins") or [], key=spec_rank, reverse=True)]
        src = posts.get(str(t.get("source_post") or "").rstrip("/").split("/")[-1])
        if src: t["source_posted_at"] = src.get("created_at")

def validate(doc: dict) -> list[str]:
    errs = []
    if "updated_at" not in doc: errs.append("missing updated_at")
    if not isinstance(doc.get("posts"), list): errs.append("posts must be a list")
    else:
        for i, p in enumerate(doc["posts"]):
            miss = REQUIRED_POST - set(p)
            if miss: errs.append(f"post[{i}] missing {miss}")
            if not (p.get("url") or "").startswith("https://x.com/"): errs.append(f"post[{i}] url must be https://x.com/...")
            for k in ("likes", "reposts", "replies"):
                if not isinstance((p.get("metrics") or {}).get(k), int): errs.append(f"post[{i}].metrics.{k} must be int")
            # v8.2 optional: views / quotes / bookmarks (int), metrics_at, author_followers (int), coin_match
            if p.get("coin_match") not in (None, "named", "speculative", "none"): errs.append(f"post[{i}] bad coin_match")
            if "author_followers" in p and not isinstance(p["author_followers"], int): errs.append(f"post[{i}].author_followers must be int")
    for i, t in enumerate(doc.get("trader_tweets", [])):
        if not t.get("coins"): errs.append(f"trader_tweets[{i}] has no resolved coin")
        if not (t.get("url") or "").startswith("https://x.com/"): errs.append(f"trader_tweets[{i}] bad url")
        for c in t.get("coins", []):
            if not c.get("address") or not c.get("chain"): errs.append(f"trader_tweets[{i}] coin missing address/chain")
    for i, t in enumerate(doc.get("topics", [])):
        for c in t.get("coins", []) or []:
            if not c.get("address"): errs.append(f"topics[{i}] coin missing address")
    return errs

def stamp(doc: dict) -> dict:
    now = datetime.now(timezone.utc)
    doc["updated_at"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    doc["updated_at_warsaw"] = now.astimezone(timezone(timedelta(hours=2))).strftime("%Y-%m-%dT%H:%M:%S+02:00")  # CEST; use +01:00 in winter
    return doc

def main():
    ap = argparse.ArgumentParser(description="Validate/stamp/build Viral z X snapshot")
    ap.add_argument("--from-raw", type=Path, help="Replace posts/topics from a hand-assembled raw JSON")
    ap.add_argument("--trader-raw", type=Path, nargs="*", help="x MCP outputs (search_posts_all / get_users_posts) -> trader_tweets")
    ap.add_argument("--resolve-topics", action="store_true", help="Resolve topics[].coins via DexScreener")
    ap.add_argument("--enrich-raw", type=Path, nargs="*", help="x MCP outputs -> posted_at, full metrics (views...), followers, named/speculative coins")
    ap.add_argument("--validate-only", action="store_true")
    ap.add_argument("--stamp", action="store_true")
    args = ap.parse_args()
    if args.from_raw:
        raw = json.loads(args.from_raw.read_text())
        doc = raw if "posts" in raw else {"posts": raw, "topics": [], "us_trends": [], "key_accounts": []}
        doc.setdefault("source", "manual raw import (x MCP)"); doc.setdefault("note", "Static snapshot. Not financial advice.")
        stamp(doc)
    else:
        if not OUT.exists(): print("No existing", OUT, file=sys.stderr); sys.exit(1)
        doc = json.loads(OUT.read_text())
        if args.stamp: stamp(doc)
    if args.trader_raw:
        doc["trader_tweets"] = build_trader_tweets(args.trader_raw)
        doc["tracked_accounts"] = [{"handle": a["handle"], "role": a["role"]} for a in json.loads(ACCOUNTS.read_text())["accounts"]]
        print("trader_tweets:", len(doc["trader_tweets"]))
    if args.resolve_topics:
        resolve_topics(doc)
        print("topics resolved:", [(t.get("label"), len(t.get("coins") or [])) for t in doc.get("topics", [])])
    if args.enrich_raw is not None:
        files = list(args.enrich_raw) + list(args.trader_raw or [])
        enrich(doc, files)
        print("enriched:", sum(1 for p in doc.get("posts", []) if "views" in (p.get("metrics") or {})), "posts with views ·",
              {k: sum(1 for p in doc.get("posts", []) if p.get("coin_match") == k) for k in ("named", "speculative", "none")})
    errs = validate(doc)
    if errs: print("INVALID:\n- " + "\n- ".join(errs), file=sys.stderr); sys.exit(2)
    if args.validate_only:
        print("OK", len(doc["posts"]), "posts ·", len(doc.get("trader_tweets", [])), "trader tweets · updated", doc.get("updated_at")); return
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
    print("Wrote", OUT, "posts=", len(doc["posts"]), "trader_tweets=", len(doc.get("trader_tweets", [])), "updated_at=", doc.get("updated_at"))

if __name__ == "__main__":
    main()
