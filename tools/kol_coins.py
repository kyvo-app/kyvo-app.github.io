#!/usr/bin/env python3
"""Kyvo v8.8 — Runner overrides for coins that FAIL the normal safety score but are worth an alert anyway.

  👑 KOL coin   — an official coin of a known KOL / celebrity: its on-chain metadata or DexScreener socials link EXACTLY a
                  handle from the curated list (tools/x_accounts.json + kolscan leaderboard handles), and at least one more
                  proof: the biggest holder is a known KOL wallet (leaderboard / wallets_public), or the biggest holder is
                  the very wallet in the coin's linked pump.fun profile (supply was sent to the linked KOL), or a tracked
                  account tweeted this exact contract (data/x_live.json). Plus real momentum (volume, trades, unique buyers).
  🚀 Moon run   — no KOL proof needed, but extreme REAL momentum in the first hours: fast MC growth into the millions,
                  huge volume, thousands of trades and unique buyers (not a few wallets wash-trading).

Both still require the hard-rug protections: mint + freeze authority revoked, not flagged rugged, balances not mutable,
no big transfer fee, LP burned/locked on AMM pools, no bundled launch (insider network), not a same-ticker copycat of a
bigger coin, not dev-held supply; on BSC: not a honeypot, sell tax ≤ 10 %, can sell all.
Holder concentration / low Kyvo Check is allowed here on purpose — the app shows a clear high-risk line instead.
Public data only (RugCheck, GoPlus, GeckoTerminal, DexScreener, FxTwitter), no keys. Not financial advice.
Thresholds live only here (server side); the app never shows them.
"""
from __future__ import annotations
import json, re, time, urllib.parse, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RC = "https://api.rugcheck.xyz/v1/tokens/"
GP = "https://api.gopluslabs.io/api/v1/"
GT = "https://api.geckoterminal.com/api/v2"
DS = "https://api.dexscreener.com"
FXP = "https://api.fxtwitter.com/{}"
UA = {"User-Agent": "Mozilla/5.0 (kyvo-kol/8.8; +" + KYVO_APP + ")", "Accept": "application/json"}
IPFS_GW = ("https://dweb.link/ipfs/", "https://gateway.pinata.cloud/ipfs/", "https://cloudflare-ipfs.com/ipfs/", "https://ipfs.io/ipfs/")

# momentum gates (same metric names as runnerRule in tools/upside_estimate.js; DexScreener h1 window + GeckoTerminal unique traders)
KOL_T = {"ageMinH": 0.05, "ageMaxH": 6, "mcMax": 1.5e8, "liq": 30_000, "vol1h": 250_000, "tx1h": 1000, "buyShare": 0.50,
         "h1Min": 30, "m5Min": -10, "buyersH1": 300, "txPerTrader": 8, "holderMin": 20}
MOON_T = {"ageMinH": 0.08, "ageMaxH": 6, "mcMin": 3e6, "mcMax": 1.5e8, "liq": 75_000, "vol1h": 1.5e6, "volMc": 0.15, "tx1h": 3000,
          "buyShare": 0.52, "h1Min": 150, "h6Min": 400, "m5Min": -8, "buyersH1": 1500, "txPerTrader": 6}
HARD_T = {"insiders": 20, "devPct": 20, "transferFee": 5, "lpLocked": 90, "bscSellTax": 10}
# program-owned vaults RugCheck does not label (seen as the ~96 % "holder" of many Meteora-launchpad coins, 2026-10-22).
# Treated as a pool, not a wallet, so the app never shows "one wallet holds 96 %" for a curve vault.
PROGRAM_OWNERS = {"FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"}
RESERVED = {"i", "home", "search", "intent", "share", "hashtag", "explore", "messages", "notifications", "settings"}

CACHE_DIR = Path(__import__("os").environ.get("KYVO_FACT_CACHE", ".kyvo_push/facts"))
CACHE_TTL = 600  # v8.9: RugCheck / GoPlus answers reused for 10 min (contract facts change slowly; keeps the 90-s loop polite)

def get(url: str, timeout: int = 20):
    cacheable = url.startswith((RC, GP))
    if cacheable:
        import hashlib
        cp = CACHE_DIR / (hashlib.sha1(url.encode()).hexdigest() + ".json")
        try:
            if time.time() - cp.stat().st_mtime < CACHE_TTL: return json.loads(cp.read_text())
        except Exception: pass
        d = _get(url, timeout)
        if d is not None:
            try: CACHE_DIR.mkdir(parents=True, exist_ok=True); cp.write_text(json.dumps(d))
            except Exception: pass
        return d
    return _get(url, timeout)

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

# ---------------- curated lists ----------------
_cache: dict = {}
def kol_handles() -> dict[str, str]:
    """lowercase handle -> display handle. Exact match only."""
    if "h" in _cache: return _cache["h"]
    out: dict[str, str] = {}
    try:
        d = json.loads((ROOT / "tools" / "x_accounts.json").read_text())
        for a in d.get("accounts", []) + d.get("live_extra", []) + d.get("kol_extra", []): out[a["handle"].lower()] = a["handle"]
    except Exception: pass
    for l in kol_wallet_rows(): out.setdefault(l["handle"].lower(), l["handle"])
    _cache["h"] = out; return out

def kol_wallet_rows() -> list[dict]:
    if "w" in _cache: return _cache["w"]
    rows = []
    try:
        for l in json.loads((ROOT / "data" / "leaderboard.json").read_text()).get("leaders", []):
            if l.get("address") and l.get("handle"): rows.append({"address": l["address"], "handle": l["handle"], "src": "kolscan"})
    except Exception: pass
    try:
        for w in json.loads((ROOT / "tools" / "wallets_public.json").read_text()):
            if w.get("address") and w.get("handle"): rows.append({"address": w["address"], "handle": w["handle"], "src": "wallets_public"})
    except Exception: pass
    _cache["w"] = rows; return rows

def kol_wallets() -> dict[str, str]:
    return {r["address"]: r["handle"] for r in kol_wallet_rows()}

def tweeted_ca(addr: str, live: dict | None = None, max_age_h: float = 6) -> list[str]:
    """tracked accounts (incl. @Pumpfun) whose fresh New Tweet item resolved to exactly this contract."""
    if live is None:
        try: live = json.loads((ROOT / "data" / "x_live.json").read_text())
        except Exception: live = {}
    now = time.time(); out = []
    for t in live.get("tweets", []):
        if now - (t.get("ts") or 0) > max_age_h * 3600: continue
        if any(str(c.get("address")) == addr and c.get("rel", "named") == "named" for c in t.get("coins") or []) and t.get("handle") not in out: out.append(t.get("handle"))
    return out

# ---------------- link parsing ----------------
def x_handle(url: str) -> tuple[str | None, bool]:
    """('kimchi1x', True) for x.com/kimchi1x ; ('someone', False) for x.com/someone/status/1 (a post BY someone, not a profile);
    (None, False) for communities / search / anything else."""
    m = re.match(r"^https?://(?:www\.|mobile\.)?(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})(/[^?#]*)?", (url or "").strip())
    if not m or m.group(1).lower() in RESERVED: return None, False
    rest = (m.group(2) or "").strip("/")
    return m.group(1), rest == ""

def pump_profile_wallet(url: str) -> str | None:
    m = re.match(r"^https?://(?:www\.)?pump\.fun/profile/([1-9A-HJ-NP-Za-km-z]{32,44})/?$", (url or "").strip())
    return m.group(1) if m else None

def token_metadata(rc_report: dict | None) -> dict:
    """off-chain JSON from the on-chain metadata URI (pump.fun coins: twitter / website / telegram set at launch)."""
    uri = ((rc_report or {}).get("tokenMeta") or {}).get("uri") or ""
    if not uri: return {}
    urls = [uri]
    m = re.search(r"/ipfs/([A-Za-z0-9]+)", uri)
    if m: urls = [g + m.group(1) for g in IPFS_GW]
    for u in urls:
        d = get(u, timeout=10)
        if isinstance(d, dict) and (d.get("name") or d.get("symbol")): return d
    return {}

def linked(c: dict, meta: dict) -> dict:
    """all X links + pump.fun profile wallets from metadata + DexScreener info."""
    urls = list(c.get("links") or [])
    for k in ("twitter", "website", "telegram"):
        if isinstance(meta.get(k), str) and meta[k]: urls.append(meta[k])
    out = {"profiles": [], "status_by": [], "pump_wallets": []}
    for u in urls:
        h, is_profile = x_handle(u)
        if h: (out["profiles"] if is_profile else out["status_by"]).append(h)
        w = pump_profile_wallet(u)
        if w: out["pump_wallets"].append(w)
    for k in out: out[k] = list(dict.fromkeys(out[k]))
    return out

def verify_handle(h: str) -> dict:
    """the linked X account really exists and is a big account (FxTwitter public profile). None = source unavailable."""
    d = get(FXP.format(urllib.parse.quote(h)), timeout=12)
    u = (d or {}).get("user") if isinstance(d, dict) else None
    if not u: return {"ok": None}
    if (u.get("screen_name") or "").lower() != h.lower(): return {"ok": False, "why": "handle mismatch"}
    fol = u.get("followers") or 0; ver = bool((u.get("verification") or {}).get("verified"))
    return {"ok": fol >= 20_000 or (ver and fol >= 5_000), "followers": fol, "verified": ver}

# ---------------- facts ----------------
def gt_traders(c: dict, with_h6: bool = False) -> dict | None:
    if c.get("chain") not in ("solana", "bsc") or not c.get("pair"): return None
    d = get(f"{GT}/networks/{c['chain']}/pools/{c['pair']}")
    time.sleep(2.1)   # v8.9: GeckoTerminal public limit ~30 req/min (the loop scans every ~90 s)
    tx = (((d or {}).get("data") or {}).get("attributes") or {}).get("transactions") or {}
    h1 = tx.get("h1") or {}
    if not h1: return None
    out = {"buyers1h": h1.get("buyers") or 0, "sellers1h": h1.get("sellers") or 0, "buys1h": h1.get("buys") or 0, "sells1h": h1.get("sells") or 0}
    if with_h6: out["buyers6h"] = (tx.get("h6") or {}).get("buyers")
    return out

def holders(r: dict) -> list[dict]:
    """top non-pool holders from a RugCheck full report (same pool detection as contract_facts)."""
    pools = set(PROGRAM_OWNERS); known = r.get("knownAccounts") or {}
    for m in r.get("markets") or []:
        if m.get("pubkey"): pools.add(m["pubkey"])
        if (m.get("lp") or {}).get("owner"): pools.add(m["lp"]["owner"])
        for f in ("liquidityA", "liquidityB"):
            if isinstance(m.get(f), str): pools.add(m[f])
        for f in ("liquidityAAccount", "liquidityBAccount"):
            if isinstance(m.get(f), dict) and m[f].get("owner"): pools.add(m[f]["owner"])
    def is_pool(h):
        for a in (h.get("owner"), h.get("address")):
            if a in pools: return True
            k = known.get(a) or {}
            if re.search(r"AMM|LOCKER|CURVE|pump", str(k.get("type", "")) + str(k.get("name", "")), re.I): return True
        return False
    return [h for h in (r.get("topHolders") or []) if not is_pool(h)]

def hard_rug(c: dict, checks, r: dict | None, g: dict | None) -> str | None:
    """None = no hard-rug sign. Otherwise the reason (never shown with numbers in the app)."""
    if any(l == "bad" and ("podróbka" in t or "Copycat" in t or "kopia" in t) for l, t in checks): return "copycat"
    if c["chain"] == "solana":
        if not r: return "no_contract_data"
        tok = r.get("token") or {}
        if r.get("mintAuthority") or tok.get("mintAuthority"): return "mint_authority"
        if r.get("freezeAuthority") or tok.get("freezeAuthority"): return "freeze_authority"
        if r.get("rugged"): return "rugged"
        if any("Copycat" in str(x.get("name")) for x in r.get("risks") or []): return "copycat"
        st = lambda o: isinstance(o, dict) and str(o.get("status")) == "1"
        if g and (st(g.get("mintable")) or st(g.get("freezable")) or st(g.get("balance_mutable_authority"))): return "authority"
        fee = ((r.get("transferFee") or {}).get("pct") or 0)
        if fee and fee > HARD_T["transferFee"]: return "transfer_fee"
        if (r.get("graphInsidersDetected") or 0) >= HARD_T["insiders"]: return "bundled"
        sup = tok.get("supply") or 0
        if sup and (r.get("creatorBalance") or 0) / sup * 100 >= HARD_T["devPct"]: return "dev_holds"
        if not c.get("on_curve"):
            for m in r.get("markets") or []:
                if m.get("pubkey") == c.get("pair") and re.search(r"raydium|pump_fun_amm|pumpswap", str(m.get("marketType")), re.I):
                    if ((m.get("lp") or {}).get("lpLockedPct") or 0) < HARD_T["lpLocked"]: return "lp_unlocked"
        return None
    if c["chain"] == "bsc":
        if not g: return "no_contract_data"
        one = lambda v: str(v) == "1"
        if one(g.get("is_honeypot")) or one(g.get("cannot_sell_all")): return "honeypot"
        try:
            if float(g.get("sell_tax") or 0) * 100 > HARD_T["bscSellTax"]: return "sell_tax"
        except ValueError: pass
        if one(g.get("owner_change_balance")) or one(g.get("hidden_owner")) or one(g.get("is_mintable")): return "owner_powers"
        return None
    return "chain"

def copycat_of(c: dict, universe: list[dict] | None = None, search: list | None = None) -> str | None:
    """a same-ticker (or same-name) coin on the same chain that is ≥ 3× bigger in MC and liquidity, or that launched EARLIER
    and is at least as big right now → this one is a copy. Uses the scan universe plus one DexScreener search
    (the original is often not among the scan candidates)."""
    now_ms = time.time() * 1000
    mine = now_ms - (c.get("age_h") or 0) * 3.6e6 if c.get("age_h") is not None else None
    sym, name = (c.get("symbol") or "").lower(), (c.get("name") or "").lower()
    others = []
    for x in universe or []:
        others.append((x.get("address"), (x.get("symbol") or "").lower(), (x.get("name") or "").lower(), x.get("mcap") or 0, x.get("liq") or 0,
                       now_ms - x["age_h"] * 3.6e6 if x.get("age_h") is not None else None))
    if search is None: search = (get(f"{DS}/latest/dex/search?q=" + urllib.parse.quote(c.get("symbol") or "")) or {}).get("pairs") or []
    for p in search:
        if p.get("chainId") != c.get("chain"): continue
        b = p.get("baseToken") or {}
        others.append((b.get("address"), (b.get("symbol") or "").lower(), (b.get("name") or "").lower(), p.get("marketCap") or p.get("fdv") or 0,
                       (p.get("liquidity") or {}).get("usd") or 0, p.get("pairCreatedAt")))
    for addr, s2, n2, mc2, lq2, born in others:
        if not addr or addr == c.get("address") or not (s2 == sym or (name and n2 == name)): continue
        if mc2 >= 3 * (c.get("mcap") or 0) and lq2 >= 3 * (c.get("liq") or 0): return addr
        if born and mine and born < mine - 60e3 and mc2 >= (c.get("mcap") or 0) and lq2 >= 0.5 * (c.get("liq") or 0): return addr
    return None

def momentum(c: dict, tr: dict | None, T: dict, moon: bool) -> str | None:
    """None = passes; else the failed gate name."""
    age, mc, liq = c.get("age_h"), c.get("mcap") or 0, c.get("liq") or 0
    v1, ntx = c.get("vol1h") or 0, (c.get("buys1h") or 0) + (c.get("sells1h") or 0)
    br = (c.get("buys1h") or 0) / ntx if ntx else 0
    if age is None or age < T["ageMinH"] or age > T["ageMaxH"]: return "age"
    if moon and mc < T["mcMin"]: return "mc"
    if mc <= 0 or mc > T["mcMax"]: return "mc"
    if liq < T["liq"] and not c.get("on_curve"): return "liq"
    if v1 < T["vol1h"]: return "vol"
    if moon and v1 < T["volMc"] * mc: return "volMc"
    if ntx < T["tx1h"]: return "tx"
    if br < T["buyShare"]: return "buys"
    h1, h6, m5 = c.get("h1"), c.get("h6"), c.get("m5")
    if moon:
        if not ((h1 or 0) >= T["h1Min"] or (h6 or 0) >= T["h6Min"]): return "move"
    elif age >= 1 and (h1 or 0) < T["h1Min"]: return "move"
    if m5 is not None and m5 < T["m5Min"]: return "dumping"
    if tr is None: return "traders_unknown"
    traders = (tr["buyers1h"] or 0) + (tr["sellers1h"] or 0)
    if (tr["buyers1h"] or 0) < T["buyersH1"]: return "buyers"
    if traders and (tr["buys1h"] + tr["sells1h"]) / traders > T["txPerTrader"]: return "wash"
    return None

def kol_evidence(c: dict, r: dict | None, meta: dict, live: dict | None = None, verify: bool = True) -> dict:
    kh, kw = kol_handles(), kol_wallets()
    L = linked(c, meta)
    hs = holders(r or {})
    top = hs[0] if hs else {}
    top_pct = float(top.get("pct") or 0) if top else 0.0
    top_owner = top.get("owner") or top.get("address") or ""
    ev, handle = [], None
    linked_kols = [kh[h.lower()] for h in L["profiles"] if h.lower() in kh] + [kh[h.lower()] for h in L["status_by"] if h.lower() in kh]
    if linked_kols:
        handle = linked_kols[0]
        ev.append("link")
    other_x = [h for h in L["profiles"] + L["status_by"] if h.lower() not in kh]
    big = [h for h in hs if float(h.get("pct") or 0) >= 5]
    wallet_kol = next(((kw[h.get("owner")], float(h.get("pct") or 0)) for h in big if h.get("owner") in kw), None)
    if wallet_kol: ev.append("kol_wallet")
    profile_hold = bool(top_owner and top_owner in L["pump_wallets"] and top_pct >= KOL_T["holderMin"])
    if profile_hold: ev.append("profile_wallet")
    tw = tweeted_ca(c["address"], live)
    if tw: ev.append("tweet")
    ok = ("link" in ev and any(e in ev for e in ("kol_wallet", "profile_wallet", "tweet"))) or ("kol_wallet" in ev and "tweet" in ev)
    # impersonation: also links another (non-KOL) X account, or the linked account is not the real big account
    imp = None
    if ok and handle and other_x: imp = "mixed_links"
    if ok and handle and verify and not imp:
        v = verify_handle(handle)
        if v.get("ok") is False: imp = v.get("why") or "small_account"
    if not handle and wallet_kol: handle = wallet_kol[0]
    return {"ok": ok and not imp, "handle": handle, "evidence": ev, "impersonation": imp, "tweeted_by": tw,
            "top_pct": round(top_pct, 1), "top_is": "kol_wallet" if wallet_kol and top_owner in kw else "kol_profile" if profile_hold else "unknown",
            "linked": L}

BIG_X = {"buyersH1": 150, "txPerTrader": 8, "buyersUp": 1.2}

def big_check(c: dict, checks, universe: list[dict] | None = None, facts: dict | None = None) -> dict:
    """v8.9 📈 Big runner (established $1M–$100M coin, passed bigRunnerRule): hard-rug protections + copycat guard + REAL unique
    buyers in the last hour (not a few wallets wash-trading) and buyers rising vs the 6 h pace (GeckoTerminal pool transactions)."""
    facts = facts or {}
    r = facts.get("rc") if "rc" in facts else (get(RC + urllib.parse.quote(c["address"]) + "/report") if c["chain"] == "solana" else None)
    if "gp" in facts: g = facts["gp"]
    elif c["chain"] == "solana": g = ((get(GP + "solana/token_security?contract_addresses=" + c["address"]) or {}).get("result") or {}).get(c["address"])
    else:
        res = (get(GP + "token_security/56?contract_addresses=" + c["address"]) or {}).get("result") or {}
        g = res.get(c["address"].lower()) or res.get(c["address"])
    bad = hard_rug(c, checks, r, g)
    if not bad and copycat_of(c, universe, facts.get("search")): bad = "copycat"
    if bad: return {"blocked": bad}
    tr = facts["tr"] if "tr" in facts else gt_traders(c, with_h6=True)
    if not tr: return {"blocked": "traders_unknown"}
    traders = (tr["buyers1h"] or 0) + (tr["sellers1h"] or 0)
    if (tr["buyers1h"] or 0) < BIG_X["buyersH1"]: return {"blocked": "buyers"}
    if traders and (tr["buys1h"] + tr["sells1h"]) / traders > BIG_X["txPerTrader"]: return {"blocked": "wash"}
    b6 = tr.get("buyers6h")
    if b6 and (tr["buyers1h"] or 0) < BIG_X["buyersUp"] * b6 / 6: return {"blocked": "buyers_flat"}
    hs = holders(r or {}) if r else []
    top = round(float(hs[0].get("pct") or 0), 1) if hs else None
    return {"badge": "big", "buyers1h": tr["buyers1h"], "top_pct": top, "concentrated": bool((top or 0) >= 20), "evidence": []}

# v8.9 🐦 Tweet runner: a coin from a tracked account's tweet (data/x_live.json) that clearly runs AFTER the tweet
TW_T = {"maxAgeH": 4, "minAgeMin": 3, "chgMin": 40, "vol1h": 30_000, "volX": 2.5, "buyShare": 0.52, "m5Min": -5, "h1Min": 0,
        "buyersH1": 80, "buyersUp": 1.3, "txPerTrader": 8}

def px_at(c: dict, ts: int) -> float | None:
    """price at tweet time from GeckoTerminal 5-min candles (only when x_live had no budget left for this tweet)."""
    if c.get("chain") not in ("solana", "bsc") or not c.get("pair"): return None
    d = get(f"{GT}/networks/{c['chain']}/pools/{c['pair']}/ohlcv/minute?aggregate=5&limit=100&currency=usd&token={c.get('address')}")
    time.sleep(2.1)
    rows = sorted((((d or {}).get("data") or {}).get("attributes") or {}).get("ohlcv_list") or [], key=lambda r: r[0])
    before = [r for r in rows if r[0] < ts]
    return float(before[-1][4]) if before else None

def tweet_candidates(live: dict | None = None) -> list[dict]:
    """fresh tweets (minAgeMin..maxAgeH) with a coin that existed BEFORE the tweet; newest first, one entry per coin."""
    if live is None:
        try: live = json.loads((ROOT / "data" / "x_live.json").read_text())
        except Exception: live = {}
    now = time.time(); out, seen = [], set()
    for t in sorted(live.get("tweets", []), key=lambda x: -(x.get("ts") or 0)):
        age = now - (t.get("ts") or 0)
        if age < TW_T["minAgeMin"] * 60 or age > TW_T["maxAgeH"] * 3600: continue
        for c in (t.get("coins") or [])[:1]:
            k = f"{c.get('chain')}:{c.get('address')}"
            if c.get("pre_launch") or c.get("rel", "named") != "named" or k in seen or c.get("chain") not in ("solana", "bsc"): continue
            seen.add(k); out.append({"t": t, "c": c})
    return out

def tweet_momentum(c: dict, x: dict, px0: float | None) -> str | None:
    """market gates on live DexScreener fields (c = to_coin dict). None = passes."""
    if not px0 or not c.get("price"): return "no_px"
    chg = (c["price"] / px0 - 1) * 100
    if chg < TW_T["chgMin"]: return "chg"
    vb = (x.get("vol_1h_before") or 0)
    if (c.get("vol1h") or 0) < max(TW_T["vol1h"], TW_T["volX"] * vb): return "vol"
    ntx = (c.get("buys1h") or 0) + (c.get("sells1h") or 0)
    if not ntx or (c.get("buys1h") or 0) / ntx < TW_T["buyShare"]: return "buys"
    if c.get("m5") is not None and c["m5"] < TW_T["m5Min"]: return "dumping"
    if c.get("h1") is not None and c["h1"] < TW_T["h1Min"]: return "fading"
    return None

def tweet_check(c: dict, checks, tw: dict, px0: float, universe: list[dict] | None = None, facts: dict | None = None) -> dict:
    """hard-rug + copycat blocks (same as v8.8) + REAL buyers rising (GeckoTerminal). Returns the override or {'blocked': why}."""
    facts = facts or {}
    r = facts.get("rc") if "rc" in facts else (get(RC + urllib.parse.quote(c["address"]) + "/report") if c["chain"] == "solana" else None)
    if "gp" in facts: g = facts["gp"]
    elif c["chain"] == "solana": g = ((get(GP + "solana/token_security?contract_addresses=" + c["address"]) or {}).get("result") or {}).get(c["address"])
    else:
        res = (get(GP + "token_security/56?contract_addresses=" + c["address"]) or {}).get("result") or {}
        g = res.get(c["address"].lower()) or res.get(c["address"])
    bad = hard_rug(c, checks, r, g)
    if not bad and copycat_of(c, universe, facts.get("search")): bad = "copycat"
    if bad: return {"blocked": bad}
    tr = facts["tr"] if "tr" in facts else gt_traders(c, with_h6=True)
    if not tr: return {"blocked": "traders_unknown"}
    traders = (tr["buyers1h"] or 0) + (tr["sellers1h"] or 0)
    if (tr["buyers1h"] or 0) < TW_T["buyersH1"]: return {"blocked": "buyers"}
    if traders and (tr["buys1h"] + tr["sells1h"]) / traders > TW_T["txPerTrader"]: return {"blocked": "wash"}
    b6 = tr.get("buyers6h")
    if b6 and (tr["buyers1h"] or 0) < TW_T["buyersUp"] * b6 / 6: return {"blocked": "buyers_flat"}
    t = tw["t"]; hs = holders(r or {}) if r else []
    top = round(float(hs[0].get("pct") or 0), 1) if hs else None
    return {"badge": "tweet", "buyers1h": tr["buyers1h"], "top_pct": top, "concentrated": bool((top or 0) >= 20), "evidence": ["tweet"],
            "tweeted_by": [t.get("handle")], "tweet": {"id": str(t.get("id")), "url": t.get("url"), "handle": t.get("handle"), "ts": t.get("ts"),
            "px0": px0, "chg": round((c["price"] / px0 - 1) * 100, 1)}}

def evaluate(c: dict, checks, universe: list[dict] | None = None, live: dict | None = None, facts: dict | None = None, verify: bool = True) -> dict | None:
    """Return {'badge': 'kol'|'moon', ...} when an override applies, else None (or {'blocked': reason} for logging).
    facts (tests/backfill): {'rc': report, 'gp': goplus, 'tr': traders, 'meta': metadata} to skip the network."""
    facts = facts or {}
    pre_kol = momentum(c, {"buyers1h": 10**9, "sellers1h": 0, "buys1h": 0, "sells1h": 0}, KOL_T, False) is None
    pre_moon = momentum(c, {"buyers1h": 10**9, "sellers1h": 0, "buys1h": 0, "sells1h": 0}, MOON_T, True) is None
    if not (pre_kol or pre_moon): return None
    r = facts.get("rc") if "rc" in facts else (get(RC + urllib.parse.quote(c["address"]) + "/report") if c["chain"] == "solana" else None)
    if "gp" in facts: g = facts["gp"]
    elif c["chain"] == "solana": g = ((get(GP + "solana/token_security?contract_addresses=" + c["address"]) or {}).get("result") or {}).get(c["address"])
    else:
        res = (get(GP + "token_security/56?contract_addresses=" + c["address"]) or {}).get("result") or {}
        g = res.get(c["address"].lower()) or res.get(c["address"])
    bad = hard_rug(c, checks, r, g)
    if not bad and copycat_of(c, universe, facts.get("search")): bad = "copycat"
    if bad: return {"blocked": bad}
    tr = facts["tr"] if "tr" in facts else gt_traders(c)
    out = None
    if pre_kol and c["chain"] == "solana":
        meta = facts["meta"] if "meta" in facts else token_metadata(r)
        ev = kol_evidence(c, r, meta, live, verify)
        if ev["ok"]:
            m = momentum(c, tr, KOL_T, False)
            if m is None: out = {"badge": "kol", **ev}
            elif not pre_moon: return {"blocked": "kol_momentum:" + m, **ev}
        elif ev.get("impersonation"): return {"blocked": "impersonation:" + ev["impersonation"], **ev}
    if out is None and pre_moon:
        m = momentum(c, tr, MOON_T, True)
        if m: return {"blocked": "moon:" + m}
        hs = holders(r or {}) if r else []
        out = {"badge": "moon", "top_pct": round(float(hs[0].get("pct") or 0), 1) if hs else None, "evidence": []}
    if out is None: return None
    out["buyers1h"] = (tr or {}).get("buyers1h")
    out["concentrated"] = bool((out.get("top_pct") or 0) >= 20)
    return out
