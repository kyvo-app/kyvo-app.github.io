#!/usr/bin/env python3
"""Kyvo v8.6 (v8.16 tier-aware) — server-side phone push via OneSignal (works while the app is CLOSED). Runs in GitHub Actions only.

Sends one push per genuinely NEW item:
  * 🐦 New Tweet: a tracked account tweeted about a coin (data/x_live.json, built by tools/x_live.py), tweet ≤ 2 h old
  * 🏃 Runner: a coin that passed the app's runnerRule this run (flags JSON written by tools/discord_calls.py --flags-out)
  * v8.8 👑 KOL coin / 🚀 Moon run: Runner overrides (tools/kol_coins.py), same "runner" tag + same free-user daily cap
  * v8.9 🐦 Tweet runner: coin from a fresh New Tweet item that clearly runs after the tweet (dedupe id twr:<coin>)
  * v8.9 📈 Big runner: established $1M–$100M coin running now (bigRunnerRule + tools/kol_coins.big_check)
  * v8.12 🥇 Gold alerts (tools/gold.py -> .kyvo_push/gold_alerts.json): price ±15–20 % / vamp > $500K MC / new article on a Gold coin.
    v8.36: OFF (the Gold tab is gone; KYVO_GOLD_PUSH=1 turns them back on). 👀 Smart money (kind gold + smart) is NOT affected.
    Tag "gold"; Premium only by default (GOLD_FREE_PUSH=0 -> never counts against / goes to the free 2/day plan); max GOLD_PER_RUN per run.
  * v8.14 👀 Smart money (tools/pump_tracker.py -> .kyvo_push/smart_alerts.json): ≥3 tracked top Ranking traders bought the same coin
    within 30 min. Premium only (never the free plan), tag "gold" opt-out respected, max SMART_PER_RUN per run, id smart:<mint> -> one push
    per coin per 3 days (sent-ids memory).
Dedupe: sent ids live in the state file (restored/saved with actions/cache). First run only seeds (no blast of old items).
Audience before v8.16 (kept for history; replaced by TIERS below): premium=1 -> every alert; everyone else -> at most FREE_CAP alerts per
Europe/Warsaw day (one global counter = same broadcasts for all free users); v8.11: of those, at most FREE_RUNNERS (1)
Runner push per day — the day's first Runner; every other Runner goes to premium=1 only. Users who switched a type off (tag tweets=0 /
runner=0) are excluded. Quiet hours: none for now.
v8.16 TIERS: the app tags every subscriber tier=free|premium|runners (notify.js; no tag = free) and each item goes out as ONE
notification filtered to the tiers that get it (tiers_for): New Tweet -> free (2/day cap) + Premium + Runners; Runner family ->
free 1st of the day, Premium first 3 of the day, Runners all; Gold -> Premium + Runners; 👀 Smart money -> Runners only.
v8.23 ⭐ VIP (Elon Musk / Donald Trump, "vip": true in x_accounts.json): a push for EVERY new post or reply (not only ones naming a
coin; a VIP post that names a coin still goes out through the normal 🐦 coin push above, never twice). Tag "vip" (opt-out "0").
Grouped per account per run (3 new Elon replies = 1 push), ≥ VIP_GAP_S between two pushes for the same account (newer posts
wait and are folded into the next one), ≤ VIP_DAY_CAP pushes per account per Warsaw day, only posts ≤ VIP_MAX_AGE_S old,
web_push_topic vip-<handle> (a newer push replaces the older one on the phone). Tiers: Premium + Runners (VIP_TIERS);
during the free launch week (PROMO_UNTIL, same instant as premium-config.js FREE_UNTIL) also free users, outside the free 2/day
cap — the app's push tag stays the PAID tier during the promo, so without this free users would not get it.
v8.24 ⭐ IMPORTANT-TWEET push (replaces "every post"): the New Tweet feed still shows everything, but a VIP push only goes out
for an important post (important(); rules + keywords + thresholds live in x_accounts.json "vip_push", per-account "vip_rule"):
  posts    (Trump, Kimchi)  every ORIGINAL post; a reply only if it is important by keywords / coin / engagement
  keywords (Elon)           post or reply naming a coin / $CASHTAG / contract address, or a market-moving keyword in its text,
                            its quoted post or the post it replies to, or very high early engagement (likes / likes-per-min / views)
  crypto   (CZ, Vitalik, Saylor, Armstrong, Toly, Ansem, Murad, Cobie, Hsaka, Hayes, top memecoin traders …) coin / cashtag /
                            CA, a strong crypto_keywords word (launch, listing, hack, ETF, SEC, airdrop, CA: …) or engagement_crypto
  all                       old v8.23 behaviour (every post + reply)
Caps: ≥ gap_s between two pushes for one account, ≤ day_cap (5) per account and ≤ total_day_cap (20) for all accounts per
Warsaw day, ≤ per_run (2) VIP pushes per run. A post that is not important yet is re-checked every run while ≤ max_age_min old
(engagement can still cross the line), then dropped. First v8.24 run seeds (no blast of the new accounts' recent posts).
KYVO_PROMO_ALL=1 extends that promo routing to every push type (Runner / Gold / Smart money too).
v8.25: KYVO_PROMO_ALL defaults to 1 -> until KYVO_PROMO_UNTIL (2026-11-07 23:59 Warsaw) every subscriber gets the Premium /
Runners pushes (Runner, Gold, Smart money); after that instant it turns itself off (set KYVO_PROMO_ALL=0 to stop it earlier).
A push OneSignal does not deliver (HTTP 200 with "All included players are not subscribed" and no id, HTTP 4xx/5xx, network)
is retried on the next runs and DROPPED after MAX_FAILS (3) tries (state "fail" / "dropped"). Every attempt is logged to
.kyvo_push/push_log.json (id, title, tiers, recipients, OneSignal notification id, errors — never the key).
RUNNER_PUSH_SOURCE=worker: plain 🏃 Runner pushes come from the Cloudflare worker (kyvo_cf_worker) -> skipped here so a Runner is
never pushed twice; KOL / Moon / Tweet / Big runners, Gold, Smart money, tweets and VIP stay here. Default github.
v8.28: short FOMO-style texts — title = emoji + type · $SYM + one number, body = one short line (MC / key stat); no disclaimer,
no contract address, no "· Kyvo" (tidy() in payload() strips them as a safety net; the app UI keeps the one-time disclaimer).
👀 Smart money has its own opt-out tag "smart" (and still respects "gold"); every logged attempt carries its OneSignal filters.
v8.31 🎮 GTA 6 (free for everyone, tag "gta", own toggle '🎮 GTA 6' in notify.js; missing tag = ON, "0" = off):
  * coin: tools/gta_push.py (kyvo_loop background step, DexScreener search) -> --gta .kyvo_push/gta_alerts.json = GTA coins that
    run now; ONE push per coin ever (st["gta_coins"], 30 days), one more when MC ≥ 3x the alerted MC and ≥ $250K
    ('🎮 GTA · $SYM 3x od alertu'); a coin pushed as 🏃 Runner in the last hour is not pushed again as 🎮 GTA.
  * tweet: data/x_live.json role "gta" accounts — every original @RockstarGames post about GTA VI, fan / news accounts only big news
    (gta_push.tweet_reason: trailer, release date, delay, pre-orders, price …), ≤ 45 min old, fan echo ≤ 1 h after a Rockstar push dropped.
  * limits: ≥ GTA_GAP_S (600 s) between two GTA pushes, ≤ GTA_DAY_CAP (15) per Warsaw day, GTA_PER_RUN (1); never counts against
    the free 2/day cap; tiers free + premium + runners. First v8.31 run seeds (no blast of what is already running / posted).
Secret: ONESIGNAL_REST_API_KEY (GitHub -> Settings -> Secrets -> Actions). Missing -> safe no-op. The key is never printed.
"""
from __future__ import annotations
import argparse, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))  # tools/ on the path for kyvo_config
from kyvo_config import APP_URL as KYVO_APP, REPO_URL as KYVO_REPO  # v8.25 single configurable base URL
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

APP_ID = "a5a8f0d3-4c22-4d5b-8ace-5e94dc22ef5f"   # public OneSignal App ID (same as push-config.js)
APP_URL = KYVO_APP
API = "https://api.onesignal.com/notifications?c=push"
FREE_CAP = 2
FREE_RUNNERS = 1      # v8.11: free users get a push for ONE Runner per Warsaw day (the first one sent); Premium gets all
MAX_TWEET_AGE_S = 2 * 3600
MAX_PER_RUN = 6
GOLD_FREE_PUSH = int(os.environ.get("KYVO_GOLD_FREE_PUSH", "0"))   # v8.12: 0 = Gold alerts go to premium=1 only
GOLD_PER_RUN = 2
GOLD_PUSH = int(os.environ.get("KYVO_GOLD_PUSH", "0"))   # v8.36: the 🥇 Gold tab is gone -> Gold alert pushes are OFF (tools/gold.py still builds data/gold.json)
MAX_GOLD_AGE_S = 3600
SMART_PER_RUN = 1          # v8.14
GTA_GAP_S = int(os.environ.get("KYVO_GTA_GAP_S", "600"))       # v8.31 🎮 GTA: ≥ 10 min between two GTA pushes
GTA_DAY_CAP = int(os.environ.get("KYVO_GTA_DAY_CAP", "15"))    # per Warsaw day
GTA_PER_RUN = 1
GTA_SEED_V = 831                                                # bump -> next run re-seeds the GTA block
GTA_MAX_DET_AGE_S = 15 * 60                                     # ignore a stale detector file
WARSAW = ZoneInfo("Europe/Warsaw")
# v8.23 ⭐ VIP posts / replies · v8.24 important-tweet filter (config: x_accounts.json "vip_push")
ACCOUNTS = Path(__file__).resolve().parent / "x_accounts.json"
def _acc_cfg() -> dict:
    try: return json.loads(ACCOUNTS.read_text())
    except Exception: return {}
_VC = _acc_cfg().get("vip_push") or {}
VIP_MAX_AGE_S = int(_VC.get("max_age_min", 45)) * 60
VIP_GAP_S = int(os.environ.get("KYVO_VIP_GAP_S", _VC.get("gap_s", 600)))          # ≥ 10 min between two pushes for the same account
VIP_DAY_CAP = int(os.environ.get("KYVO_VIP_DAY_CAP", _VC.get("day_cap", 5)))      # per account per Warsaw day (v8.23: 20)
VIP_TOTAL_CAP = int(os.environ.get("KYVO_VIP_TOTAL_CAP", _VC.get("total_day_cap", 20)))   # v8.24: all VIP accounts together per day
VIP_PER_RUN = int(_VC.get("per_run", 2))
VIP_SEED_V = 824                                                                  # bump -> next run re-seeds the VIP block
VIP_TIERS = [t for t in os.environ.get("KYVO_VIP_TIERS", "premium,runners").split(",") if t in ("free", "premium", "runners")]
PROMO_UNTIL = datetime.fromisoformat(os.environ.get("KYVO_PROMO_UNTIL", "2026-11-07T22:59:00+00:00")).timestamp()   # = 7.11 23:59 Warsaw
PROMO_ALL = os.environ.get("KYVO_PROMO_ALL", "1") == "1"   # v8.25: ON by default; promo_on() switches it off by itself after PROMO_UNTIL
MAX_FAILS = 3   # v8.25: an item OneSignal rejects 3x ("not subscribed", HTTP error …) is dropped instead of retried forever
RUNNER_PUSH_SOURCE = os.environ.get("RUNNER_PUSH_SOURCE", "github").strip().lower() or "github"   # v8.25: github | worker (Cloudflare)
PUSH_LOG_MAX = 300
# v8.34 🚀 Runner 2.0 (data/runner2.json from tools/runner2.py): stricter Runner signal, own type 'runner2' / tag runner2 (toggle '🚀 Runner 2.0',
# missing tag = ON, "0" = off). Always sent by THIS loop (not 'plain' -> never skipped by RUNNER_PUSH_SOURCE=worker). Once per coin; may
# follow a 🏃 Runner / ⚡ Early push of the same coin. v8.39: sent at once (R2_GAP_S = 0, was a 10-min wait after the Runner / Early push;
# KYVO_R2_GAP_S brings a gap back). Same plan routing as 🏃 Runner. v8.39: a coin that entered from a 🔁 Kolejna fala flag (src leg2)
# is never pushed (0/6 winners in the 03–04.11 backtest) — it stays visible in the app's Runner 2.0 list.
R2_MAX_AGE_S = 20 * 60     # only coins that entered Runner 2.0 in the last 20 min push (older -> list only)
R2_GAP_S = int(os.environ.get("KYVO_R2_GAP_S", "0"))   # v8.39: 0 = push at once (was 10 min after the Runner / Early push of the coin)
R2_PER_RUN = 2
R2_SEED_V = 1
R2_EXIT = {"pl": "Sprzedaj ½ na x2, resztę trailing −30%", "en": "Sell ½ at 2x, trail the rest −30%"}

def runner2_items(a, st: dict, sent: dict, now: float, seeding: bool, items_now: list[dict]) -> list[dict]:
    doc = load(a.runner2, {}) if a.runner2 else {}
    r2seed = seeding or st.get("r2_seeded_v") != R2_SEED_V
    out = []
    busy = {it["id"].split(":", 1)[1] for it in items_now if it.get("kind") == "runner" and ":" in it["id"]} if R2_GAP_S > 0 else set()   # v8.39: gap 0 -> same run is fine
    for c in sorted(doc.get("coins") or [], key=lambda c: c.get("at") or 0):
        k = str(c.get("k", "")).lower(); kid = "r2:" + k
        if not k or kid in sent: continue
        if r2seed or now - (c.get("at") or 0) / 1000 > R2_MAX_AGE_S: sent[kid] = now; continue
        hw = (HOLD.get(k) or {}).get("w") or ((c.get("hold") or {}).get("w"))
        if hw: sent[kid] = now; print(f"- {kid}: 🚀 Runner 2.0 skipped — ⚠️ holders {hw}"); continue   # v8.35 never push a flagged coin
        if ((CHECKS.get(k) or {}).get("b") or {}).get("flag"): sent[kid] = now; print(f"- {kid}: 🚀 Runner 2.0 skipped — ⚠️ bundle"); continue   # v8.36
        if c.get("src") == "leg2": sent[kid] = now; print(f"- {kid}: 🚀 Runner 2.0 not pushed — 🔁 Kolejna fala (v8.39, list only)"); continue
        other = max([sent.get(p + k, 0) for p in ("run:", "early:", "kol:", "moon:", "big:", "twr:")] + [0])
        if k in busy or (R2_GAP_S > 0 and now - other < R2_GAP_S):
            print(f"- {kid}: 🚀 Runner 2.0 waits ({int(now - other) if other else 0}s since the Runner push < {R2_GAP_S}s)"); continue
        if len(out) >= R2_PER_RUN: continue
        h1 = c.get("h1"); mv = f" +{round(h1)}% 1h" if isinstance(h1, (int, float)) and 0 < h1 < 100000 else ""
        it = {"id": kid, "kind": "runner2", "topic": kid, "hash": "#coin/" + urllib.parse.quote(c["k"], safe=""),
              "title_pl": f"🚀 Runner 2.0 · ${c.get('sym') or '?'}{mv} · sprawdzony", "title_en": f"🚀 Runner 2.0 · ${c.get('sym') or '?'}{mv} · confirmed"}
        for lang, base in (("pl", f"MC {fmt_usd(c.get('mc0'))} · ostrzejszy sygnał"), ("en", f"MC {fmt_usd(c.get('mc0'))} · stricter signal")):
            hint = f"MC {fmt_usd(c.get('mc0'))} · {R2_EXIT[lang]}"
            it["body_" + lang] = hint if len(hint) <= 110 else base
        if c.get("img"): it["icon"] = it["image"] = c["img"]
        if isinstance(c.get("pd"), dict): it["pd"] = c["pd"]                 # v8.38 ⚠️ po dumpie tag (pd_tag)
        out.append(it)
    if r2seed: st["r2_seeded_v"] = R2_SEED_V; print(f"Runner 2.0: first v{R2_SEED_V} run -> seeded, nothing sent")
    return out
CHECKS: dict = {}   # v8.36 🧪 data/coin_checks.json coins (tools/coin_checks.py) — only the ⚠️ bundle flag stops a Runner 2.0 push
HOLD: dict = {}   # v8.35 👥 data/holders.json coins (tools/holders.py), loaded in main()

def hold_label(h: dict | None, lang: str) -> str:
    """v8.35: short ⚠️ text for a flagged coin ('' = not flagged / unknown)."""
    w = (h or {}).get("w") or []
    if not w: return ""
    pl = lang == "pl"
    if "rugged" in w: return "⛔ RugCheck: rug" if pl else "⛔ RugCheck: rugged"
    if "devrug" in w: return "⚠️ dev rugował wcześniej" if pl else "⚠️ dev rugged before"
    if "few" in w and h.get("h") is not None: return f"⚠️ mało holderów ({h['h']})" if pl else f"⚠️ few holders ({h['h']})"
    if "top10" in w: return f"⚠️ top 10 ma {round(h.get('t10') or 0)}%" if pl else f"⚠️ top 10 hold {round(h.get('t10') or 0)}%"
    if "top1" in w: return f"⚠️ 1 portfel ma {round(h.get('t1') or 0)}%" if pl else f"⚠️ 1 wallet holds {round(h.get('t1') or 0)}%"
    return "⚠️ mało holderów" if pl else "⚠️ few holders"

def hold_tag(items: list[dict]) -> None:
    """v8.35: Runner / Early / KOL / Moon / Big / Tweet pushes for a ⚠️ flagged coin keep going out (Runner list unchanged),
       but the body starts with the warning, e.g. '⚠️ mało holderów (84) · MC $120K'."""
    for it in items:
        if it.get("kind") != "runner" or it.get("smart") or ":" not in it["id"]: continue
        h = HOLD.get(it["id"].split(":", 1)[1])
        for lang in ("pl", "en"):
            lb = hold_label(h, lang)
            if lb and lb not in it["body_" + lang]: it["body_" + lang] = f"{lb} · {it['body_' + lang]}"
        if hold_label(h, "en"): it["hold"] = h.get("w")

def pd_label(pd: dict | None, lang: str) -> str:
    """v8.38: '⚠️ po dumpie −61% od ATH' for a coin flagged ≥ 30% under its all-time high ('' = not post-dump / unknown)."""
    if not isinstance(pd, dict) or not pd.get("w") or not isinstance(pd.get("b"), (int, float)): return ""
    return f"⚠️ po dumpie −{round(pd['b'])}% od ATH" if lang == "pl" else f"⚠️ post-dump −{round(pd['b'])}% from ATH"

def pd_tag(items: list[dict], flags: list[dict]) -> None:
    """v8.38: Runner-family / Runner 2.0 pushes for a post-dump coin still go out, but the title ends with '⚠️ po dumpie' and the
       body starts with '⚠️ po dumpie −X% od ATH · …' (the coin is never dropped)."""
    fp = {}
    for f in flags:
        if f.get("kind") in ("runner", "early") and isinstance(f.get("pd"), dict): fp.setdefault(str(f.get("k", "")).lower(), f["pd"])
    for it in items:
        if it.get("kind") not in ("runner", "runner2") or it.get("smart") or ":" not in it["id"]: continue
        pd = it.get("pd") or fp.get(it["id"].split(":", 1)[1])
        if not pd_label(pd, "en"): continue
        for lang in ("pl", "en"):
            lb = pd_label(pd, lang)
            if lb not in it["body_" + lang]: it["body_" + lang] = f"{lb} · {it['body_' + lang]}"
            t = "⚠️ po dumpie" if lang == "pl" else "⚠️ post-dump"
            if t not in it["title_" + lang]: it["title_" + lang] = f"{it['title_' + lang]} · {t}"
        it["pd"] = pd

DEF_KW = ["crypto", "bitcoin", "btc", "doge", "dogecoin", "memecoin", "coin", "token", "tariff", "tariffs", "fed", "interest rates",
          "rate cut", "war", "ban", "etf", "launch", "buy", "sec", "executive order"]
CASHTAG = re.compile(r"(?<![\w$])\$[A-Za-z][A-Za-z0-9]{1,9}\b")
CA_RE = re.compile(r"\b(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\b")

def _kw_re(words) -> re.Pattern | None:
    ws = sorted({str(w).lower().strip() for w in words or [] if str(w).strip()}, key=len, reverse=True)
    return re.compile(r"(?<![\w$])(" + "|".join(re.escape(w) for w in ws) + r")(?!\w)", re.I) if ws else None
KW_RE = _kw_re(_VC.get("keywords") or DEF_KW)
CRYPTO_KW_RE = _kw_re(_VC.get("crypto_keywords") or [])
ENG = _VC.get("engagement") or {"min_likes": 25000, "likes_per_min": 600, "min_views": 3000000}
ENG_CRYPTO = _VC.get("engagement_crypto") or {"min_likes": 6000, "likes_per_min": 150, "min_views": 1000000}

def vip_handles() -> dict:
    """handle(lower) -> {"name", "rule", "star"}. vip=true (Elon / Trump / Kimchi = ⭐ chip in the app) or any vip_rule."""
    d = _acc_cfg()
    if not d: return {"elonmusk": {"name": "Elon Musk", "rule": "keywords", "star": True}, "realdonaldtrump": {"name": "Donald Trump", "rule": "posts", "star": True}}
    out = {}
    for k in ("accounts", "live_extra", "live_more"):
        for a in d.get(k, []):
            if not (a.get("vip") or a.get("vip_rule")) or a["handle"].lower() in out: continue
            out[a["handle"].lower()] = {"name": a.get("name") or a["handle"], "rule": a.get("vip_rule") or "keywords", "star": bool(a.get("vip"))}
    return out

def _eng_hit(t: dict, th: dict) -> str | None:
    m = t.get("metrics") or {}
    likes, views = m.get("likes") or 0, m.get("views") or 0
    try: at = datetime.fromisoformat(str(t.get("metrics_at")).replace("Z", "+00:00")).timestamp()
    except Exception: at = None
    mins = (at - (t.get("ts") or 0)) / 60 if at else None
    if th.get("min_likes") and likes >= th["min_likes"]: return f"{likes} likes"
    if th.get("min_views") and views >= th["min_views"]: return f"{views} views"
    if th.get("likes_per_min") and mins and mins >= 5 and likes / mins >= th["likes_per_min"]: return f"{round(likes / mins)} likes/min"
    return None

def important(t: dict, rule: str) -> str | None:
    """v8.24: why this VIP post deserves a push (None = feed only, no push)."""
    own = " ".join([t.get("text") or "", ((t.get("quote") or {}).get("text") or "")] + [m.get("alt") or "" for m in t.get("media") or []])
    if rule == "all": return "all"
    if t.get("coins") and any((c.get("rel", "named") == "named") for c in t["coins"]): return "coin"
    if CASHTAG.search(own): return "cashtag " + CASHTAG.search(own).group(0)
    if CA_RE.search(re.sub(r"https?://\S+", "", own)): return "contract address"
    if rule == "posts" and not t.get("is_reply"): return "original post"
    kre = CRYPTO_KW_RE if rule == "crypto" else KW_RE
    txt = own + (" " + ((t.get("reply_to") or {}).get("text") or "") if t.get("is_reply") and rule != "crypto" else "")
    m = kre.search(re.sub(r"https?://\S+", "", txt)) if kre else None
    if m: return "keyword '" + m.group(1).lower() + "'"
    e = _eng_hit(t, ENG_CRYPTO if rule == "crypto" else ENG)
    return ("engagement " + e) if e else None

def promo_on(now: float | None = None) -> bool:
    return (now or time.time()) < PROMO_UNTIL

def clip(s: str, n: int) -> str:
    s = " ".join(str(s or "").split())
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"

def vip_item(handle: str, ts: list[dict], now: float) -> dict:
    """one grouped push for one VIP account (newest post first). v8.24 FOMO-style: title = author name + @handle,
    body = the tweet text (+ ↪ what it replies to, + measured coin move), Kyvo branding at the end; avatar as icon."""
    ts = sorted(ts, key=lambda t: -(t.get("ts") or 0)); t = ts[0]
    star = "⭐" if t.get("_star", True) else "📣"                       # 📣 = big crypto account (no ⭐ VIP chip)
    head = f"{star} {short_name(t, handle)}"                           # v8.28: '⭐ Trump · tweet'
    is_rep = bool(t.get("is_reply"))
    rt = t.get("reply_to") or {}
    coin = next((c for c in t.get("coins") or [] if c.get("symbol") and c.get("rel", "named") == "named"), None)
    mv_pl, mv_en = coin_move(coin) if coin else ("", "")
    n = len(ts); nr = sum(1 for x in ts if x.get("is_reply"))
    if n == 1:
        title_pl = f"{head} · {'odpowiedź' if is_rep else 'tweet'}"; title_en = f"{head} · {'reply' if is_rep else 'tweet'}"
    else:
        few = n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14)
        title_pl = f"{head} · {n} {'posty' if few else 'postów'}"; title_en = f"{head} · {n} posts"
    txt = clip(re.sub(r"^(@\w{1,15}\s+)+", "", t.get("text") or "") or t.get("text") or "📷", 90)   # drop the leading @reply handles
    rpl = f" ↪ @{rt.get('handle')}" if is_rep and rt.get("handle") else ""
    body_pl = f"{txt}{rpl}" + (f" · {mv_pl}" if mv_pl else "")
    body_en = f"{txt}{rpl}" + (f" · {mv_en}" if mv_en else "")
    return {"id": "vip:" + handle, "ids": ["vip:" + str(x["id"]) for x in ts], "kind": "vip", "vip_handle": handle, "topic": "vip-" + handle,
            "hash": "#tweets", "why": t.get("_why"), "title_pl": title_pl, "title_en": title_en, "body_pl": body_pl, "body_en": body_en,
            "icon": big_avatar(t.get("avatar")), "image": tweet_photo(t)}

def big_avatar(u: str | None) -> str | None:
    """v8.24: X avatar as the notification icon (Chrome / Android / desktop; iOS always shows the Kyvo app icon)."""
    return re.sub(r"_(normal|bigger|200x200|mini)\.(jpg|jpeg|png|webp)$", r"_400x400.\2", u) if u else None

def tweet_photo(t: dict) -> str | None:
    return next((m.get("url") for m in t.get("media") or [] if m.get("type") == "photo" and m.get("url")), None)

def author_line(t: dict, handle: str = "") -> str:
    h = t.get("handle") or handle
    n = t.get("author_name")
    return f"{n} @{h}" if n and n.lower() != str(h).lower() else f"@{h}"

SHORT_NAMES = {"realdonaldtrump": "Trump", "elonmusk": "Elon", "cz_binance": "CZ", "vitalikbuterin": "Vitalik", "saylor": "Saylor"}
def short_name(t: dict, handle: str = "") -> str:
    """v8.28: short author label for push titles: known VIPs by nickname, else the display name (≤ 18), else @handle."""
    h = str(t.get("handle") or handle or "")
    if h.lower() in SHORT_NAMES: return SHORT_NAMES[h.lower()]
    n = (t.get("author_name") or "").strip()
    return clip(n, 18) if n else f"@{h}"

def move_pct(c: dict) -> str:
    """v8.28: ' +42%' measured since the tweet (same source as coin_move), '' when not measured."""
    ch = c.get("chg_since_tweet") if c and not c.get("pre_launch") else None
    if not isinstance(ch, (int, float)) or abs(ch) > 100000: return ""
    return f" {ch:+.1f}%" if abs(ch) < 10 else f" {ch:+.0f}%"

_DISCLAIMER = re.compile(r"\s*[.·,]?\s*(?:to nie (?:jest )?porada finansowa|not financial advice|\bnfa\b|\bdyor\b)\s*\.?", re.I)
def tidy(s: str, n: int) -> str:
    """v8.28 safety net for every push text: no disclaimer, no contract address, no trailing '· Kyvo', one line, ≤ n chars."""
    s = re.sub(r"(?:\bCA\s*:?\s*)?" + CA_RE.pattern, "", str(s or ""))   # the address and a leading "CA:" label
    s = _DISCLAIMER.sub("", s)
    s = re.sub(r"(\s*·\s*Kyvo)+\s*$", "", s)
    s = re.sub(r"\s*·\s*(·\s*)+", " · ", " ".join(s.split()))
    s = re.sub(r"^[\s·,.]+|[\s·,]+$", "", s)
    return clip(s, n)

def coin_move(c: dict) -> tuple[str, str]:
    """v8.24: '$SYM +42% od tweeta' only from the measured price (x_live.py apply_move: DexScreener price vs GeckoTerminal candle
       at tweet time). Not measured yet / absurd value -> just the ticker, never an invented number."""
    ch = c.get("chg_since_tweet") if not c.get("pre_launch") else None
    sym = "$" + str(c.get("symbol") or "?")
    if ch is None or not isinstance(ch, (int, float)) or abs(ch) > 100000: return sym, sym
    v = f"{ch:+.1f}" if abs(ch) < 10 else f"{ch:+.0f}"
    return f"{sym} {v}% od tweeta", f"{sym} {v}% since the tweet"

def runner_style(items: list[dict], flags: list[dict]) -> None:
    """v8.28: every Runner-family push -> title '<emoji> <Type> · $SYM +X%' (X = DexScreener priceChange.h1 at the flag, real data;
       omitted when unknown), plain Runner body 'MC $X · Name', coin logo as icon + big image, tap opens the coin page in Kyvo."""
    fm = {str(f.get("k", "")).lower(): f for f in flags if f.get("kind") == "runner"}
    fe = {str(f.get("k", "")).lower(): f for f in flags if f.get("kind") == "early"}    # v8.33 ⚡ early flags (title already has the 5-min move)
    for it in items:
        if it.get("kind") != "runner" or it.get("smart"): continue
        f = (fe if it["id"].startswith("early:") else fm).get(it["id"].split(":", 1)[1])
        if not f: continue
        h1 = f.get("h1") if f.get("h1") is not None else (f.get("snap") or {}).get("h1")
        if it["id"].startswith("twr:") and (f.get("tweet") or {}).get("chg") is not None: h1 = None   # title already has the % after the tweet
        nm = clip(f.get("name") or "", 18)
        mv = f" +{round(h1)}%" if isinstance(h1, (int, float)) and 0 < h1 < 100000 else ""
        for k in ("title_pl", "title_en"):                             # v8.28: title '🏃 Runner · $SYM +86%' (1 h move, real data)
            if mv and "%" not in it[k]: it[k] = it[k] + mv
        if it.get("plain") and nm and nm.lower() != str(f.get("sym", "")).lower():   # coin name goes to the short body line
            for k in ("body_pl", "body_en"): it[k] = f"{it[k]} · {nm}"
        if f.get("img"): it["icon"] = it["image"] = f["img"]
        it["hash"] = "#coin/" + urllib.parse.quote(f["k"], safe="")

def fmt_usd(v) -> str:
    if v is None: return "?"
    v = float(v)
    return f"${v/1e9:.2f}B" if v >= 1e9 else f"${v/1e6:.2f}M" if v >= 1e6 else f"${v/1e3:.1f}K" if v >= 1e3 else f"${v:.0f}"

def load(p: Path, default):
    try: return json.loads(p.read_text())
    except Exception: return default

def send(key: str, payload: dict) -> dict:
    """v8.25: full result {ok, id, recipients, errors, http} (was a bool). ok = OneSignal returned a notification id.
       HTTP 200 + errors "All included players are not subscribed" + empty id = NOT ok (nobody matched the filters)."""
    auth = ("Key " if key.startswith("os_v2") else "Basic ") + key
    req = urllib.request.Request(API, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Authorization": auth, "Content-Type": "application/json; charset=utf-8", "Accept": "application/json"})
    res = {"ok": False, "id": None, "recipients": None, "errors": None, "http": None}
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            res["http"] = r.status; body = json.load(r)
        res.update(id=body.get("id") or None, recipients=body.get("recipients"), errors=body.get("errors") or None)
        res["ok"] = bool(res["id"])
    except urllib.error.HTTPError as e:
        res["http"] = e.code; res["errors"] = e.read()[:300].decode("utf-8", "replace")   # response never echoes the key
    except Exception as e:  # noqa: BLE001
        res["errors"] = f"{type(e).__name__}"
    if isinstance(res["errors"], (list, dict)): res["errors"] = json.dumps(res["errors"], ensure_ascii=False)[:300]
    print(f"  OneSignal: ok={res['ok']} id={res['id']} recipients={res['recipients']} http={res['http']}" + (f" errors={str(res['errors'])[:200]}" if res["errors"] else ""))
    return res

def log_push(st: dict, it: dict, tiers: list[str], res: dict, status: str) -> None:
    """v8.25 push audit log (state dir, kept with actions/cache): one row per attempt, newest last, no secrets."""
    st.setdefault("_log", []).append({"t": int(time.time()), "item": it["id"], "kind": it["kind"], "title": tidy(it["title_en"], 120), "tiers": tiers,
                                      "tags": kind_tags(it) if it.get("kind") else None, "filters": it.get("_filters"), "status": status, "ok": res.get("ok"), "os_id": res.get("id"), "recipients": res.get("recipients"),
                                      "http": res.get("http"), "errors": (str(res["errors"])[:300] if res.get("errors") else None)})

TIERS = ("free", "premium", "runners")
PREMIUM_RUNNERS = 3   # v8.16: Premium = 3 Runners a day (premium-config.js plans.premium.runnersPerDay) -> the day's first 3 Runner pushes

def tiers_for(it: dict, st: dict) -> list[str]:
    """v8.16 tier routing (tag `tier` set by the app in notify.js; no tag = free). Mirrors the plan cards in launch.js:
       New Tweet       -> free (inside the FREE_CAP 2/day) + premium + runners
       Runner family   -> free: the day's 1st Runner (inside FREE_CAP) · premium: the day's first PREMIUM_RUNNERS · runners: all
       Gold alert      -> premium + runners (free only if KYVO_GOLD_FREE_PUSH=1, inside FREE_CAP)
       Smart money     -> runners only (plan card: "👀 Smart money push" is a 🏃 Runners feature; tracker.js gates it the same way)"""
    free_left = st.get("free_n", 0) < FREE_CAP
    k = it["kind"]
    if k == "gta": return ["free", "premium", "runners"]              # v8.31 🎮 GTA 6: free for everyone, outside FREE_CAP
    if k == "vip":                                                     # v8.23: never counts against the free 2/day plan
        return list(dict.fromkeys(VIP_TIERS + (["free"] if promo_on() else []))) or ["premium", "runners"]
    if PROMO_ALL and promo_on(): return ["free", "premium", "runners"]   # v8.23 opt-in: whole push = top tier for everyone
    if it.get("smart"): return ["runners"]
    if k == "gold": return (["free"] if GOLD_FREE_PUSH and free_left else []) + ["premium", "runners"]
    if k in ("runner", "runner2"):                                     # v8.34 🚀 Runner 2.0 = same plan routing + daily counters as 🏃 Runner
        out = ["free"] if free_left and st.get("free_runner_n", 0) < FREE_RUNNERS else []
        if st.get("prem_runner_n", 0) < PREMIUM_RUNNERS: out.append("premium")
        return out + ["runners"]
    return (["free"] if free_left else []) + ["premium", "runners"]   # tweets + anything else = general

def kind_tags(it: dict) -> list[str]:
    """v8.28: opt-out tags an item must pass. 👀 Smart money has its own toggle ("smart") and still respects "gold".
       v8.29: 🔎 scanner alerts (gold:gfilt:… — '🟡 Gamble · $X +150%' / '🥇 Gold · $X' for a NEW coin the Gold scanner found) are
       "a new good coin" to users: they now need BOTH "gold" and "good", so the 'Nowy coin w Good Coins' switch stops them too
       (before, tag good was synced by the app but no server push read it). Same '= 1 OR not_exists' semantics as every tag."""
    if it.get("smart"): return ["gold", "smart"]
    if it.get("kind") == "gold" and str(it.get("id", "")).startswith("gold:gfilt:"): return ["gold", "good"]
    return [it["kind"]]

def audience(kind_tag, tiers: list[str]) -> list[dict]:
    """OneSignal filters: (every kind tag not switched off) AND (tier in `tiers`), as OR branches so a missing tag is never ambiguous:
       kind: tag = "1" OR tag missing (the app sets "0" when the user turns a type off). Kept as '= 1 OR not_exists' on purpose:
             OneSignal's docs do not say whether '!= 0' matches a MISSING tag, so v8.28 does not rely on it;
       free: tier = "free" OR tier missing (subscribers from before v8.14.1 / users who never got a tier tag).
       Several kind tags (Smart money: gold + smart) -> every combination (2 tags x 4 tier branches = 16 branches, < 200 entries)."""
    keys = [kind_tag] if isinstance(kind_tag, str) else list(kind_tag)
    combos: list[list[dict]] = [[]]
    for k in keys:
        opts = [{"field": "tag", "key": k, "relation": "=", "value": "1"}, {"field": "tag", "key": k, "relation": "not_exists"}]
        combos = [c + [o] for c in combos for o in opts]
    tconds = []
    for t in tiers:
        tconds.append({"field": "tag", "key": "tier", "relation": "=", "value": t})
        if t == "free": tconds.append({"field": "tag", "key": "tier", "relation": "not_exists"})
    f: list[dict] = []
    for kc in combos:
        for tc in tconds:
            if f: f.append({"operator": "OR"})
            for c in kc: f += [c, {"operator": "AND"}]
            f.append(tc)
    return f

def filters_str(f: list[dict]) -> str:
    """compact, secret-free text form of the OneSignal filters for push_log.json."""
    out = []
    for x in f:
        if "operator" in x: out.append(" | " if x["operator"] == "OR" else "&")
        else: out.append(f"{x['key']}{'=' + x['value'] if x['relation'] == '=' else '∅'}")
    return "".join(out)[:600]

def payload(item: dict, filters: list[dict]) -> dict:
    return {"app_id": APP_ID, "target_channel": "push", "filters": filters,
            "headings": {"en": tidy(item["title_en"], 70), "pl": tidy(item["title_pl"], 70)},      # v8.28: short, no NFA / CA / '· Kyvo'
            "contents": {"en": tidy(item["body_en"], 110) or "Kyvo", "pl": tidy(item["body_pl"], 110) or "Kyvo"},
            "url": APP_URL + item["hash"], "web_push_topic": item["topic"][:60], "ttl": 3 * 3600,
            # v8.24: author avatar / coin logo as the icon, tweet photo / coin logo as the big image (Chrome, Edge, Android, desktop).
            # iOS / iPadOS home-screen web push ignores both and always shows the Kyvo app icon -> "· Kyvo" is also in the text.
            "chrome_web_icon": item.get("icon") or APP_URL + "icons/icon-192.png", "firefox_icon": item.get("icon") or APP_URL + "icons/icon-192.png",
            **({"chrome_web_image": item["image"]} if item.get("image") else {})}

def gta_items(a, st: dict, sent: dict, now: float, day: str, seeding: bool) -> list[dict]:
    """v8.31 🎮 GTA 6 pushes (see the docstring). Returns at most GTA_PER_RUN items; counters move only when a push really went out."""
    import gta_push as G
    if st.get("gta_day") != day: st["gta_day"], st["gta_n"] = day, 0
    gcoins = {k: v for k, v in (st.get("gta_coins") or {}).items() if now - v.get("t", 0) < 30 * 86400}
    st["gta_coins"] = gcoins
    gseed = seeding or st.get("gta_seeded_v") != GTA_SEED_V
    det = load(a.gta, {}) if a.gta else {}
    coins = det.get("coins") or [] if now - (det.get("at") or 0) <= GTA_MAX_DET_AGE_S else []
    cand: list[dict] = []
    for t in load(a.live, {}).get("tweets", []):                       # tweets first: official news beats a coin
        kid = "gta:tw:" + str(t.get("id"))
        if kid in sent or t.get("role") != "gta": continue
        age = now - (t.get("ts") or 0)
        if age < -120: continue
        why = G.tweet_reason(t)
        if not why: continue
        if gseed or age > G.TWEET_MAX_AGE_S: sent[kid] = now; continue
        official = str(t.get("handle") or "").lower() in G.GTA_HANDLES_OFFICIAL
        if not official and now - st.get("gta_rs_last", 0) < 3600: sent[kid] = now; print(f"GTA: @{t.get('handle')} echo of a Rockstar push -> skipped"); continue
        txt = clip(re.sub(r"^(@\w{1,15}\s+)+", "", t.get("text") or "") or "📷", 100)
        who = "Rockstar Games" if official else short_name(t)
        cand.append({"id": kid, "kind": "gta", "topic": "gta-tw", "hash": "#gta", "why": why, "gta_official": official,
                     "title_pl": f"🎮 GTA · {who}", "title_en": f"🎮 GTA · {who}", "body_pl": txt, "body_en": txt,
                     "icon": big_avatar(t.get("avatar")), "image": tweet_photo(t), "_p": 0 if official else 2})
    for c in coins:
        k = str(c.get("k") or "").lower()
        if not k or not c.get("sym") or c.get("confirmed") is False: continue   # < 1 h old coin not confirmed by a 2nd read yet
        mc = c.get("mc") or 0; prev = gcoins.get(k)
        if gseed: gcoins.setdefault(k, {"t": int(now), "mc": mc, "n": 1}); continue
        if f"run:{k}" in sent and now - sent[f"run:{k}"] < 3600 and not prev:   # just pushed as 🏃 Runner -> remember, no 2nd push
            gcoins[k] = {"t": int(now), "mc": mc, "n": 1}; print(f"GTA: ${c['sym']} already pushed as Runner -> skipped"); continue
        nm = clip(c.get("name") or "", 18)
        name_part = f" · {nm}" if nm and nm.lower() != str(c["sym"]).lower() else ""
        hsh = "#coin/" + urllib.parse.quote(c.get("k") or k, safe="")
        if prev is None:
            h1, h6 = c.get("h1"), c.get("h6")
            mv = f" +{h1:.0f}%" if isinstance(h1, (int, float)) and h1 >= G.H1_MIN else (f" +{h6:.0f}% 6h" if isinstance(h6, (int, float)) and h6 > 0 else "")
            new_pl, new_en = ("🆕 nowy · ", "🆕 new · ") if c.get("new") else ("", "")
            cand.append({"id": "gta:coin:" + k, "kind": "gta", "topic": "gta-" + k[-40:], "hash": hsh, "why": c.get("run"),
                         "gta_coin": k, "gta_mc": mc, "gta_level": 1, "gta_px": c.get("px"),
                         "title_pl": f"🎮 GTA · ${c['sym']}{mv}", "title_en": f"🎮 GTA · ${c['sym']}{mv}",
                         "body_pl": f"{new_pl}MC {fmt_usd(mc)}{name_part}", "body_en": f"{new_en}MC {fmt_usd(mc)}{name_part}",
                         "icon": c.get("img"), "image": c.get("img"), "_p": 1, "_s": -(c.get("vol1h") or 0)})
        elif prev.get("n", 1) < 2 and prev.get("mc") and mc >= G.MILESTONE_X * prev["mc"] and mc >= G.MILESTONE_MC and (c.get("h1") or 0) > 0:
            x = mc / prev["mc"]
            cand.append({"id": "gta:coin2:" + k, "kind": "gta", "topic": "gta-" + k[-40:], "hash": hsh, "why": f"{x:.1f}x since the GTA alert",
                         "gta_coin": k, "gta_mc": prev["mc"], "gta_level": 2,
                         "title_pl": f"🎮 GTA · ${c['sym']} {x:.0f}x od alertu", "title_en": f"🎮 GTA · ${c['sym']} {x:.0f}x since the alert",
                         "body_pl": f"MC {fmt_usd(mc)} (było {fmt_usd(prev['mc'])}){name_part}", "body_en": f"MC {fmt_usd(mc)} (was {fmt_usd(prev['mc'])}){name_part}",
                         "icon": c.get("img"), "image": c.get("img"), "_p": 2, "_s": -x})
    if gseed:
        st["gta_seeded_v"] = GTA_SEED_V
        print(f"GTA: first v{GTA_SEED_V} run -> seeded {len(gcoins)} running coin(s) + current GTA posts, nothing sent")
        return []
    if not cand: return []
    cand.sort(key=lambda x: (x["_p"], x.get("_s", 0)))
    if now - st.get("gta_last", 0) < GTA_GAP_S:
        print(f"GTA: {len(cand)} waiting (gap {int(now - st.get('gta_last', 0))}s < {GTA_GAP_S}s)"); return []
    if st.get("gta_n", 0) >= GTA_DAY_CAP:
        print(f"GTA: daily cap {GTA_DAY_CAP} reached -> {len(cand)} skipped")
        for x in cand:
            sent[x["id"]] = now
            if x.get("gta_coin"): gcoins[x["gta_coin"]] = {"t": int(now), "mc": x.get("gta_mc"), "n": x.get("gta_level", 1)}
        return []
    for x in cand[GTA_PER_RUN:]: print(f"GTA: {x['id']} -> next run")
    return cand[:GTA_PER_RUN]

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", type=Path, default=Path("data/x_live.json"))
    ap.add_argument("--flags", type=Path, default=Path(".kyvo_push/flags.json"))
    ap.add_argument("--state", type=Path, default=Path(".kyvo_push/sent.json"))
    ap.add_argument("--gold", type=Path, default=Path(".kyvo_push/gold_alerts.json"), help="v8.12 Gold alerts written by tools/gold.py")
    ap.add_argument("--smart", type=Path, default=Path(".kyvo_push/smart_alerts.json"), help="v8.14 Tracker cluster-buy alerts (tools/pump_tracker.py)")
    ap.add_argument("--runner2", type=Path, default=None, help="v8.34 🚀 Runner 2.0 list (tools/runner2.py -> data/runner2.json)")
    ap.add_argument("--checks", type=Path, default=None, help="v8.36 🧪 coin checks (tools/coin_checks.py -> data/coin_checks.json)")
    ap.add_argument("--holders", type=Path, default=None, help="v8.35 👥 holder check (tools/holders.py -> data/holders.json)")
    ap.add_argument("--gta", type=Path, default=Path(".kyvo_push/gta_alerts.json"), help="v8.31 🎮 GTA coins running now (tools/gta_push.py)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--full", action="store_true", help="dry run: print the whole payload (pretty)")
    a = ap.parse_args()
    key = os.environ.get("ONESIGNAL_REST_API_KEY", "").strip()
    if not key and not a.dry_run:
        print("ONESIGNAL_REST_API_KEY not set -> nothing sent (safe no-op).")
    now = time.time(); day = datetime.now(WARSAW).strftime("%Y-%m-%d")
    st = load(a.state, {})
    seeding = not st.get("seeded")
    sent: dict = {k: t for k, t in st.get("sent", {}).items() if now - t < 3 * 86400}
    if st.get("free_day") != day: st["free_day"], st["free_n"], st["free_runner_n"], st["prem_runner_n"] = day, 0, 0, 0

    items = []
    for t in load(a.live, {}).get("tweets", []):
        kid = "tw:" + str(t.get("id"))
        age = now - (t.get("ts") or 0)
        named = [c for c in t.get("coins") or [] if c.get("rel", "named") == "named"]   # v8.10: a 'powiązany coin' (key-word match) never pushes on its own
        if kid in sent or age > MAX_TWEET_AGE_S or not named: continue
        if seeding and age > 20 * 60: sent[kid] = now; continue
        c = named[0]
        txt = clip(re.sub(r"^(@\w{1,15}\s+)+", "", t.get("text") or ""), 60)
        mc = f"MC {fmt_usd(c.get('mcap'))}" if c.get("mcap") else ""
        ttl = f"🐦 Tweet · @{t.get('handle') or '?'} · ${c.get('symbol') or '?'}{move_pct(c)}"   # v8.28 short FOMO style
        items.append({"id": kid, "kind": "tweets", "topic": kid, "hash": "#tweets",
                      "title_pl": ttl, "title_en": ttl,
                      "body_pl": " · ".join(x for x in ((f"„{txt}”" if txt else ""), mc, ("🚀 pompuje" if c.get("pumping") else "")) if x),
                      "body_en": " · ".join(x for x in ((f"“{txt}”" if txt else ""), mc, ("🚀 pumping" if c.get("pumping") else "")) if x),
                      "icon": big_avatar(t.get("avatar")), "image": c.get("image") or tweet_photo(t)})
    # v8.23 ⭐ VIP · v8.24: only IMPORTANT posts (important(); grouped per account, gap + per-account / total daily caps)
    vips = vip_handles()
    if st.get("vip_day") != day: st["vip_day"], st["vip_n"] = day, {}
    vseed = seeding or st.get("vip_seeded_v") != VIP_SEED_V
    vnew: dict[str, list] = {}; n_feed = 0
    for t in load(a.live, {}).get("tweets", []):
        h = str(t.get("handle") or "").lower()
        if h not in vips: continue
        vid = "vip:" + str(t.get("id")); age = now - (t.get("ts") or 0)
        if vid in sent or "tw:" + str(t.get("id")) in sent: continue
        named = [c for c in t.get("coins") or [] if c.get("rel", "named") == "named"]
        if named and age <= MAX_TWEET_AGE_S: continue                  # pushed by the 🐦 coin block (id tw:<id>)
        if age < -120: continue                                        # clock skew guard
        if vseed or age > VIP_MAX_AGE_S: sent[vid] = now; continue     # first VIP run / too old -> never push
        why = important(t, vips[h]["rule"])
        if not why: n_feed += 1; continue                              # feed only; re-checked next run while young (engagement)
        vnew.setdefault(h, []).append(dict(t, _why=why, _star=vips[h]["star"]))
    if vseed: print(f"VIP: first v{VIP_SEED_V} run -> seeded, nothing sent"); st["vip_seeded"] = True; st["vip_seeded_v"] = VIP_SEED_V
    if n_feed: print(f"VIP: {n_feed} fresh post(s) not important -> feed only, no push")
    n_vip = 0
    for h, ts in sorted(vnew.items(), key=lambda kv: -max(x.get("ts") or 0 for x in kv[1])):
        for x in ts: print(f"VIP @{h} [{vips[h]['rule']}] important: {x['_why']} · {clip(x.get('text'), 60)!r}")
        last = (st.get("vip_last") or {}).get(h, 0)
        if now - last < VIP_GAP_S: print(f"VIP @{h}: {len(ts)} new, waiting (gap {int(now - last)}s < {VIP_GAP_S}s)"); continue
        if (st.get("vip_n") or {}).get(h, 0) >= VIP_DAY_CAP or sum((st.get("vip_n") or {}).values()) >= VIP_TOTAL_CAP:
            print(f"VIP @{h}: daily cap ({VIP_DAY_CAP}/account, {VIP_TOTAL_CAP} total) reached -> {len(ts)} skipped"); [sent.__setitem__("vip:" + str(x["id"]), now) for x in ts]; continue
        if n_vip >= VIP_PER_RUN: print(f"VIP @{h}: per-run limit {VIP_PER_RUN} -> next run"); continue
        n_vip += 1
        items.append(vip_item(h, ts, now))
    _flags = load(a.flags, [])
    run_now = {str(x.get("k", "")).lower() for x in _flags if x.get("kind") == "runner"}
    for f in _flags:
        if f.get("kind") == "early":    # v8.33 ⚡ Wczesny Runner (tools/early_runner.py): the start of a strong pump, before the 🏃 Runner rule
            ekid, rkid = "early:" + f["k"].lower(), "run:" + f["k"].lower()
            if ekid in sent or rkid in sent or f["k"].lower() in run_now: continue               # once per coin; never after it was already pushed as a Runner
            if seeding: sent[ekid] = now; continue
            m5 = (f.get("snap") or {}).get("m5", f.get("m5"))
            mv = f" +{round(m5)}% 5 min" if isinstance(m5, (int, float)) and 0 < m5 < 100000 else ""
            items.append({"id": ekid, "kind": "runner", "plain": True, "topic": ekid, "hash": "#coin/" + f["k"],
                          "title_pl": f"⚡ Wczesny Runner · ${f['sym']}{mv}", "title_en": f"⚡ Early Runner · ${f['sym']}{mv}",
                          "body_pl": f"MC {fmt_usd(f.get('mc0'))} · start pompy", "body_en": f"MC {fmt_usd(f.get('mc0'))} · pump starting"})
            continue
        if f.get("kind") != "runner": continue
        kid = "run:" + f["k"].lower()
        if kid in sent and not f.get("tweet"): continue
        if seeding:
            sent[kid] = now
            if f.get("tweet"): sent["twr:" + f["k"].lower()] = now
            continue
        b = f.get("badge")
        if b == "kol":      # v8.8 👑 KOL coin (official coin of a known KOL) — high risk: supply sits in the KOL's wallet
            conc_pl = f" · ⚠️ {round(f['top_pct'])}% u KOL-a" if f.get("concentrated") and f.get("top_pct") else " · ⚠️ wysokie ryzyko"
            conc_en = f" · ⚠️ {round(f['top_pct'])}% held by the KOL" if f.get("concentrated") and f.get("top_pct") else " · ⚠️ high risk"
            who = f"@{f['kol']} · " if f.get("kol") else ""
            items.append({"id": kid, "kind": "runner", "topic": kid, "hash": "#runner",
                          "title_pl": f"👑 KOL · ${f['sym']}", "title_en": f"👑 KOL · ${f['sym']}",
                          "body_pl": f"{who}MC {fmt_usd(f.get('mc0'))}{conc_pl}",
                          "body_en": f"{who}MC {fmt_usd(f.get('mc0'))}{conc_en}"})
            continue
        if b == "moon":     # v8.8 🚀 Moon run — extreme real momentum, safety score failed
            items.append({"id": kid, "kind": "runner", "topic": kid, "hash": "#runner",
                          "title_pl": f"🚀 Moon · ${f['sym']}", "title_en": f"🚀 Moon · ${f['sym']}",
                          "body_pl": f"MC {fmt_usd(f.get('mc0'))} · ⚠️ nie przeszedł testów",
                          "body_en": f"MC {fmt_usd(f.get('mc0'))} · ⚠️ failed safety checks"})
            continue
        if f.get("tweet"):  # v8.9 🐦 Tweet runner (own dedupe id: a coin can be a Runner AND later run after a tweet)
            tw = f["tweet"]; tkid = "twr:" + f["k"].lower()
            if tkid not in sent:
                if seeding: sent[tkid] = now
                else:
                    items.append({"id": tkid, "kind": "runner", "topic": tkid, "hash": "#runner",
                                  "title_pl": f"🐦 Tweet runner · ${f['sym']} +{round(tw.get('chg') or 0)}%",
                                  "title_en": f"🐦 Tweet runner · ${f['sym']} +{round(tw.get('chg') or 0)}%",
                                  "body_pl": f"po tweecie @{tw.get('handle')} · MC {fmt_usd(f.get('mc0'))}",
                                  "body_en": f"after @{tw.get('handle')}'s tweet · MC {fmt_usd(f.get('mc0'))}"})
            if b == "tweet": continue
        if b == "big":      # v8.9 📈 Big runner — established $1M–$100M coin running now (passed the safety floor)
            bg = f.get("big") or {}
            mv = (f" +{round(bg['h1'])}%" if bg.get("h1") is not None and bg["h1"] > 0 else "")
            items.append({"id": kid, "kind": "runner", "topic": kid, "hash": "#runner",
                          "title_pl": f"📈 Duży runner · ${f['sym']}{mv}", "title_en": f"📈 Big runner · ${f['sym']}{mv}",
                          "body_pl": f"MC {fmt_usd(f.get('mc0'))} · wolumen ↑", "body_en": f"MC {fmt_usd(f.get('mc0'))} · volume ↑"})
            continue
        items.append({"id": kid, "kind": "runner", "plain": True, "topic": kid, "hash": "#coin/" + f["k"],
                      "title_pl": f"🏃 Runner · ${f['sym']}", "title_en": f"🏃 Runner · ${f['sym']}",
                      "body_pl": f"MC {fmt_usd(f.get('mc0'))}", "body_en": f"MC {fmt_usd(f.get('mc0'))}"})
    if a.holders: HOLD.update((load(a.holders, {}) or {}).get("coins") or {})
    if a.checks: CHECKS.update({x.lower(): v for x, v in ((load(a.checks, {}) or {}).get("coins") or {}).items()})
    runner_style(items, load(a.flags, []))    # v8.24 FOMO-style Runner pushes: coin logo, real 1 h move, deep link, Kyvo branding
    n_gold = 0
    for g in sorted(load(a.gold, []), key=lambda x: -(x.get("at") or 0)):   # v8.12 🥇 Gold alerts
        kid = "gold:" + str(g.get("id"))
        if kid in sent or now - (g.get("at") or 0) / 1000 > MAX_GOLD_AGE_S: continue
        if seeding: sent[kid] = now; continue
        if not GOLD_PUSH: sent[kid] = now; print(f"- {kid}: 🥇 Gold push off (v8.36)"); continue   # marked sent -> no burst if it is ever turned back on
        if n_gold >= GOLD_PER_RUN: continue          # next run (alerts expire after 1 h)
        n_gold += 1
        items.append({"id": kid, "kind": "gold", "topic": kid, "hash": g.get("hash") or "#gold",
                      "title_pl": g["title_pl"], "title_en": g["title_en"], "body_pl": g["body_pl"], "body_en": g["body_en"]})
    n_smart = 0
    for g in sorted(load(a.smart, []), key=lambda x: -(x.get("at") or 0)):   # v8.14 👀 smart-money cluster buys (Premium)
        kid = str(g.get("id"))
        if not kid.startswith("smart:") or kid in sent or now - (g.get("at") or 0) / 1000 > 1800: continue
        if seeding: sent[kid] = now; continue
        if n_smart >= SMART_PER_RUN: continue
        n_smart += 1
        items.append({"id": kid, "kind": "gold", "smart": True, "topic": kid, "hash": g.get("hash") or "#tracker",
                      "title_pl": g["title_pl"], "title_en": g["title_en"], "body_pl": g["body_pl"], "body_en": g["body_en"]})
    items += gta_items(a, st, sent, now, day, seeding)                    # v8.31 🎮 GTA 6
    items += runner2_items(a, st, sent, now, seeding, items)              # v8.34 🚀 Runner 2.0 (own type / tag, loop-sent)
    hold_tag(items)                                                       # v8.35 ⚠️ few holders / concentration tag
    pd_tag(items, _flags)                                                 # v8.38 ⚠️ po dumpie tag (badge only, push still sent)
    if seeding: print(f"first run: seeded {len(sent)} existing items, nothing sent")
    items.sort(key=lambda it: 0 if it["title_en"].startswith(("👑", "🚀", "🐦", "⭐", "📣", "🎮")) else 1)
    if RUNNER_PUSH_SOURCE == "worker":   # v8.25: the Cloudflare worker pushes plain Runners -> never twice
        for it in [x for x in items if x.get("plain")]:
            sent[it["id"]] = now; log_push(st, it, [], {}, "skipped_worker_source")
            print(f"- {it['id']}: skipped (RUNNER_PUSH_SOURCE=worker)")
        items = [x for x in items if not x.get("plain")]
    fails: dict = st.setdefault("fail", {})
    for it in items[:MAX_PER_RUN]:
        print(f"- {it['id']}: {it['title_en']}" + (f"  [why: {it['why']}]" if it.get("why") else ""))
        tiers = tiers_for(it, st)            # v8.16: one notification per item, filtered to the tiers that get it
        flt = audience(kind_tags(it), tiers); it["_filters"] = filters_str(flt)
        pl = payload(it, flt)
        def count():                         # quota counters (Europe/Warsaw day)
            if "free" in tiers and it["kind"] not in ("vip", "gta") and not (PROMO_ALL and promo_on()):
                st["free_n"] = st.get("free_n", 0) + 1
                if it["kind"] in ("runner", "runner2"): st["free_runner_n"] = st.get("free_runner_n", 0) + 1; st["free_runner_id"] = it["id"]
            if "premium" in tiers and it["kind"] in ("runner", "runner2") and not it.get("smart"):
                st["prem_runner_n"] = st.get("prem_runner_n", 0) + 1
            if it["kind"] == "vip":                                    # v8.23 VIP: mark every grouped post + gap / day counters
                for x in it["ids"]: sent[x] = now
                st.setdefault("vip_last", {})[it["vip_handle"]] = now
                st.setdefault("vip_n", {})[it["vip_handle"]] = st.get("vip_n", {}).get(it["vip_handle"], 0) + 1
            if it["kind"] == "gta":                                    # v8.31: gap / day counters + once-per-coin memory
                st["gta_last"] = now; st["gta_n"] = st.get("gta_n", 0) + 1
                if it.get("gta_coin"):
                    gc = st.setdefault("gta_coins", {}); prev = gc.get(it["gta_coin"]) or {}
                    gc[it["gta_coin"]] = {"t": int(now), "mc": it.get("gta_mc"), "n": it.get("gta_level", 1),
                                          "px": prev.get("px") if it.get("gta_level", 1) > 1 else it.get("gta_px")}   # v8.32: push price for '📈 od dodania'
                if it.get("gta_official"): st["gta_rs_last"] = now
        if a.dry_run:
            print(json.dumps(pl, ensure_ascii=False, indent=1) if a.full else json.dumps(pl, ensure_ascii=False)[:600])
            print(f"  tiers: {', '.join(tiers)}")
            count()   # dry run: count in memory (state is not written) so the caps can be checked
            continue
        if not key: continue
        tiers_log = list(tiers)
        res = send(key, pl)
        if res["ok"]:
            sent[it["id"]] = now; fails.pop(it["id"], None)
            count(); log_push(st, it, tiers_log, res, "sent")
        else:
            fails[it["id"]] = fails.get(it["id"], 0) + 1
            if fails[it["id"]] >= MAX_FAILS:     # v8.25: give up -> marked handled, never retried again
                sent[it["id"]] = now; fails.pop(it["id"], None)
                if it["kind"] == "vip":
                    for x in it.get("ids") or []: sent[x] = now
                st.setdefault("dropped", {})[it["id"]] = {"t": int(now), "title": it["title_en"][:120], "errors": str(res.get("errors") or "")[:200]}
                log_push(st, it, tiers_log, res, f"dropped_after_{MAX_FAILS}")
                print(f"  dropped after {MAX_FAILS} failed tries")
            else:
                log_push(st, it, tiers_log, res, f"failed_{fails[it['id']]}")
        time.sleep(1)
    st["fail"] = {k: v for k, v in fails.items() if k not in sent}
    st["dropped"] = {k: v for k, v in (st.get("dropped") or {}).items() if now - v.get("t", 0) < 7 * 86400}
    new_log = st.pop("_log", [])
    if new_log and not a.dry_run:
        lp = a.state.parent / "push_log.json"
        try: old = json.loads(lp.read_text())
        except Exception: old = []
        lp.parent.mkdir(parents=True, exist_ok=True); lp.write_text(json.dumps((old + new_log)[-PUSH_LOG_MAX:], ensure_ascii=False))
    st["sent"] = sent; st["seeded"] = True
    if not a.dry_run and (key or seeding):
        a.state.parent.mkdir(parents=True, exist_ok=True); a.state.write_text(json.dumps(st))
    return 0

if __name__ == "__main__":
    sys.exit(main())
