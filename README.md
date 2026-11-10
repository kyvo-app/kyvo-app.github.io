# Kyvo v8.25

**Nowy adres: https://kyvo-app.github.io/** (repo kyvo-app/kyvo-app.github.io). Kroki przeprowadzki są w `MOVE_PLAN.md`.

v8.25 w skrócie:
- Wyniki zapisują każdą flagę od razu, a commity są odporne na konflikty (`tools/git_sync.py`). Pełna historia flag jest w `data/flag_history.json`.
- Preselekcja Runnera bierze najpierw najgorętsze coiny, maks. 15 na sieć.
- Kolejna fala jest liczona też na serwerze.
- Pushe:
  - promocja do 7.11 23:59 (Warszawa),
  - push porzucany po 3 nieudanych próbach,
  - log `push_log.json`,
  - przełącznik `RUNNER_PUSH_SOURCE`.
- Logowanie Google przez Supabase jest wyłączone do czasu konfiguracji (`GOOGLE_LOGIN_SETUP.md`).
- Phantom na telefonie loguje przez deeplink i przekazuje logowanie z Safari do apki.
- Wszystkie linki serwera biorą adres z jednego miejsca: `tools/kyvo_config.py` / `KYVO_APP_URL`.
- Worker Cloudflare jest osobno (`kyvo_cf_worker/`).

## (history) Kyvo v8.0

Live multi-chain memecoin Pulse (Solana / BSC / Robinhood) + **smart money snapshot** + **trader leaderboard** + Viral z X.

**Not financial advice.** Public data only. No keys in the repo.

## What's real

| Feature | Status |
|--------|--------|
| Pulse / Hot / Good / Boosted / search | Live DexScreener + GeckoTerminal |
| Chain switcher | Solana · BSC · Robin · Wszystkie (`localStorage`) |
| BSC Final Stretch / Migrated | `fourmeme` / `pancakeswap` |
| Robinhood Stretch/Migrated | Hidden (no public bonding graduation dexId) |
| Smart money badges | Snapshot `data/smart_money.json` (public Solana RPC) |
| Leaderboard | Snapshot `data/leaderboard.json`: realized PnL 1d/7d/30d, win rate and trades from FIFO buy/sell matching per mint, with SOL legs priced at hourly historical SOL/USD (Binance public klines). Shows `—` when it can't be computed reliably |
| Coin chart | TradingView Lightweight Charts™ v4.2.3 (Apache-2.0, bundled in `vendor/`, attribution logo kept) fed by GeckoTerminal public OHLCV for 1m/5m/15m/1h/4h. 1s/15s/30s candles are built client-side from the pool's last 300 public trades, because GeckoTerminal's `second` OHLCV is paid-only; the UI says these candles cover only recent trades. Falls back to a DexScreener embed. Shares one GeckoTerminal rate gate with the app |
| Row times | Coin age plus "na liście od X", which tracks first-seen per tab and chain in localStorage |
| Ranking | Its own tab (center button in the bottom bar). Kolscan-style table with 1d/7d/30d toggle, opening trader profiles |
| Profil | No login. The user pastes a public Solana address (stored in localStorage only). Swaps are fetched in the browser from publicnode only, throttled and cached in localStorage. api.mainnet-beta returns 403 to browser requests that carry an Origin header, so in-browser history covers about the last 24h and grows with every refresh on the same device and run through the same FIFO engine (`profile.js`). Shows a cumulative PnL chart, Pozycje (unrealized PnL at current DexScreener price), Aktywność, and a shareable PnL card (canvas PNG / iOS share sheet) |
| Profil (v7.2, many wallets) | Up to 8 public addresses on Solana, BSC and Robinhood Chain (base58 for SOL, one 0x address can be added on both EVM chains). Per-wallet and combined PnL / positions / activity in the same layout. Seed-phrase / private-key paste is detected and refused. Sources, all keyless and verified to work from a browser (CORS): **Solana** publicnode RPC (~24h, grows per device). **BSC** ERC-20 `Transfer` logs via topic-filtered `eth_getLogs` on `bsc.rpc.blxrbdn.com` (fallback `rpc-bsc.48.club`; 5000-block chunks, last ~24h, "Starsze BSC (+24h)" up to 7 days) plus tx/receipt/blocks from `bsc-dataseed.bnbchain.org`; BNB leg from `tx.value`, WBNB unwrap or four.meme `TokenSale` events; holdings = BNB + tokens seen in the window (`balanceOf`). **Robinhood Chain** public Blockscout (`robinhoodchain.blockscout.com`, Etherscan-style `tokentx/txlist/txlistinternal`, last ~150 transfers; full token holdings from `/api/v2/addresses/{a}/tokens`), ETH leg from internal txs or a recent-block balance delta on `rpc.mainnet.chain.robinhood.com`. Native USD = Binance hourly klines; token prices = DexScreener. BscScan/Etherscan v2 free tier does not cover BSC, so there is no full keyless BSC history. New EVM chains: add an entry to `CHAINS` in `evm.js` |
| Viral z X | Snapshot `data/x_viral.json`: topics with pre-resolved coins (`topics[].coins`, Kyvo chains only, real volume), **Tweety traderów** (`trader_tweets`: posts from `tools/x_accounts.json` that mention a contract address or an unambiguous `$TICKER`, resolved on DexScreener; unresolved/ambiguous are dropped), and key posts. Live MC/24h refreshed from DexScreener in the browser |

Marker: `KYVO_LIVE_v8_0` (meta `kyvo-build`, hidden `#mvpMarker`, `window.__KYVO__.MVP_MARKER`) · SW: `kyvo-v8-0`

## v8.0 — public launch

| Feature | Notes |
|--------|-------|
| Onboarding | `launch.js`: 5 swipeable cards on first launch (`kyvo_onboard_v8` in localStorage), skippable, re-open from Więcej / Jak korzystać. `?noonboard` skips it (for screenshots) |
| Jak korzystać | `#help` — FAQ for every tab, filter, "na liście od", SM badges, PnL windows/limits, login, Premium |
| Legal (PL) | `#legal/regulamin`, `#legal/prywatnosc`, `#legal/zrodla`, `#legal/ryzyko`; links in footer, Więcej, Profil |
| Login | `auth.js` + `auth-config.js`. **Wallet sign-in works now**: Phantom / Solflare (`signMessage`) and MetaMask / any EIP-1193 wallet (`personal_sign`). Only a readable text message is signed (never a transaction); signature verified client-side with `vendor/kyvo-crypto` (tweetnacl ed25519 + noble secp256k1/keccak, licenses included). Session = `kyvo_session_v1` in localStorage, re-verified on load; the address is added to Profil. No injected wallet on mobile → deep link (`phantom.app/ul/browse/…`, `solflare.com/ul/v1/browse/…`, `metamask.app.link/dapp/…`). **Google + e-mail link** (Firebase Auth, SDK loaded from gstatic only when enabled) are code-ready but OFF (`enabled:false`, placeholder config) → buttons show "Wkrótce". Apple = "Wkrótce". Guests keep full access ("Kontynuuj bez logowania") |
| Access | `#premium` is a one-time code field (Hasło / kod), not a shop. Redeem is `POST {code}` to `KYVO_ACCESS_CONFIG.redeemUrl` (empty until the sales API is live — the field does not unlock). A success sets `kyvo_device_ok` on this device only and does not store the code. Free limits stay otherwise. `?owner=` and `KYVO_OWNER_SHA256` are unchanged. |
| Kontakt | `#kontakt`, `contact-config.js` (`DISCORD_HANDLE:'TODO'` → shows "pojawi się tu wkrótce"; set the handle to show a copy button; optional invite URL) |
| Share | `<title>`, meta description, Open Graph + Twitter `summary_large_image` (`og-image.png` 1200×630), icons 16–512 + maskable, apple-touch icons, 8 iOS splash screens (`icons/splash/`), manifest shortcuts |
| Data reset | Więcej → "Wyczyść dane Kyvo" removes every `kyvo_*` localStorage key and SW caches |

### To enable later
- **Google / e-mail login**: follow `firebase_setup_pl.md` (repo root, Polish step-by-step), paste the 4 public web-config values into `auth-config.js`, set `google.enabled` / `email.enabled` to `true`.
- **Payments**: not sold inside this app. Do not put a password or a Stripe secret key (`sk_…`) in the repo.
- **Discord**: set `DISCORD_HANDLE` (and optionally `DISCORD_INVITE_URL`) in `contact-config.js`.

### ⚠️ Legal — owner to-do (not shown in the UI)
- Regulamin, Polityka prywatności, Źródła danych and Ryzyko are a **plain-language template**. Have them checked by a lawyer **before monetization** (Premium, ads, affiliate links) and before enabling Google/e-mail login.
- Polish law (UŚUDE) expects the service provider to be identifiable with contact details; currently only a Discord placeholder is shown. Add an operator name/contact (likely a parent or a company while the owner is a minor).
- **Subscription terms** in Regulamin §7c (auto-renewal, cancel anytime, trial converts to paid unless cancelled, Stripe as processor, withdrawal right) are placeholders for **lawyer review**; consumer-law info (prawo odstąpienia, digital content rules) must be finalized before payments go live.
- **GDPR**: once Firebase login is enabled, the Firebase project owner is the **data controller** for name/e-mail/avatar/uid — needs a named controller + contact in the privacy policy, a records-of-processing note, Google as processor (Firebase DPA), and working account deletion (implemented: Profil → "Usuń konto Kyvo").
- Regulamin states 18+. Decide with the lawyer.

## Refresh (box / CI)

```bash
# Smart money + leaderboard (public Solana RPC, no keys)
python3 tools/build_snapshots.py            # 300 successful sigs per wallet (500 for spam-flooded wallets) or 30 days
python3 tools/build_snapshots.py --no-cache # cold rebuild
```

How it works:
- Signatures are paginated with `getSignaturesForAddress`. Transactions come from publicnode when they are under 20h old, otherwise from api.mainnet-beta, which is rate limited to about 3.6 tx/s with backoff on 429.
- Each run has a hard budget of 13 min (`--budget-min`). Parsed transactions are cached in `tools/cache/`, which is gitignored and not bundled. A cold start needs 1–3 runs to fill the cache; after that a refresh only fetches new transactions and takes about 1–3 min.
- The cache never shrinks because of an empty or failed RPC answer. The cache is saved every 60s, so an interrupted run can be resumed.

```bash

# Viral z X — see tools/update_x_viral.md (x MCP, ~12–25 reads)
python3 tools/update_x_viral.py --from-raw raw_doc.json --trader-raw /tmp/x_raw/*.txt --resolve-topics
# or just refresh timestamps / coin matches:
python3 tools/update_x_viral.py --resolve-topics --stamp
```

One-liner after X dump is ready:

```bash
python3 tools/build_snapshots.py && python3 tools/update_x_viral.py --stamp
```

## Legal

Memecoins are extremely risky. Kyvo shows public market data and public wallet activity attributed from public sources (Solana Tracker titles, Alez-confirmed KOL wallets). No custody, no trading bots, no private keys.

## v8.17 (KYVO_LIVE_v8_19 · SW kyvo-v8-17) — 📅 Kalendarz P&L (Journal)
- The Journal dashboard calendar (since v8.15: month grid, SOL, Pn–Nd, arrows, today) now matches the TikTok "monthly P&L
  calendar": uppercase month title, compact $ per day (current SOL price; SOL when no price), muted green / red tiles,
  tap a day → that day's closed trades (tap a row → trade view), footer Rekord W-L-BE (closed trades; BE = |P&L| < 0.5 %),
  Zysk za miesiąc ($ + SOL), "Zaktualizowano" (last wallet sync) and "✓ Zweryfikowane on-chain" ONLY when the month is
  100 % from the public wallet (manual trades → "zawiera ręczne trade’y", demo → "Przykładowe dane").
- History: the calendar uses every swap kept on this device since `st.histFrom` (start of unbroken on-chain history), not only
  the 7-day sync window; histFrom resets when the app was not synced for longer than the window (gap). Older days are dimmed.
- "Udostępnij miesiąc" (share icon on the calendar) → 1080×1920 PNG with the month grid (share.js kind 'month').

## v8.16 (KYVO_LIVE_v8_16 · SW kyvo-v8-16) — tier-aware push
- App (notify.js) tags every OneSignal subscriber `tier` = free | premium | runners (default free) on opt-in and again whenever
  the tier changes (owner unlock / `kyvo-premium-change`, KyvoPremiumReady, a cheap check when the app comes back to the front).
- Server (tools/kyvo_push.py `tiers_for` + `audience`): one notification per item, filtered by tier (no tier tag = free):
  🐦 New Tweet → free (2/day cap) + Premium + Runners · 🏃 Runner family (KOL coin, Moon run, Big runner, Tweet runner) →
  free: the day's 1st, Premium: the day's first 3, Runners: all · 🥇 Gold → Premium + Runners · 👀 Smart money → Runners only.
- Tiers are still client-side until payments exist (a technical user could fake the tag).

## v8.15 (KYVO_LIVE_v8_15 · SW kyvo-v8-15) — 📓 Journal + Obsidian design

**Design pass 2 (same v8.15):**
- Header is calmer: a scrollable tab row with line icons instead of emoji, plus one control row holding the chain segmented control and the Filtry button. That row is hidden on detail views (coin, journal, premium, profil).
- Leading emoji in section titles are swapped for SVG icons in fx.js, after i18n runs. Long helper paragraphs are clamped to 2 lines; tap to expand.
- Coin rows get a sparkline built from the real 24h/6h/1h/5m changes, plus press states.
- Runner: the hero now reads "Runnerów oznaczonych dziś" (server log). The live list is "Aktywne teraz" (live bar). A new "Oznaczone dziś" section lists the same set the hero counts, with max% and now% since the flag, using the same tier gate.
- Restyled: Gold, Tracker and Journal (calendar heatmap and KPI tiles). Premium plan cards are now glass, with a check-icon feature list.
- **Journal (Premium)** `journal.js` / `journal.css`: `#journal` (dashboard), `#journal/log`, `/stats`, `/coach`, `/trade/<id>`. Read-only sync of a PUBLIC wallet address (private keys / seed phrases are rejected, never stored). Trade view chart opens on a timeframe that fits the trade (`chart.js` `focus` option: finest TF that covers entry→exit, visible range zoomed to the trade).
- **Design layer** `theme.css` (loaded last, tokens + components) and `fx.js` (inline SVG icon set for the bottom dock and Journal, section enter animation, count-up numbers — all off under `prefers-reduced-motion`).
- **Self-hosted fonts** `fonts/` — Inter + Space Grotesk variable woff2 (latin + latin-ext), SIL OFL 1.1 (`fonts/OFL-*.txt`). No external font requests.
- `tracker.js`: `getTransaction(..., { maxSupportedTransactionVersion: 1 })` (same as profile.js / journal.js).

**Design pass 3 (same v8.15) — cinematic art:**
- `img/`: original Kyvo renders (molten chrome, chrome K emblem, horizon arc, cliff + chart aurora, obsidian texture) plus real 360px Kyvo screen captures, all as AVIF + WebP at fixed widths. `KyvoArt.pic(name, sizes, {eager, alt, cls})` in `compat.js` builds the responsive `<picture>` (lazy unless `eager`).
- Used in: welcome card 0 (layered hero + one-liner), welcome card 1 (two 3D-tilted phones), Premium hero (emblem over arc, chrome flow, textured plan cards), Runner/Pulse hero (arc behind the chrome numbers, big hero one-liner), Journal locked + no-wallet view (cliff band).
- `fx.js` depth3d(): `[data-ky-par]` containers move their `[data-depth]` layers with scroll, pointer (hover devices) and device tilt where the browser gives it without a permission prompt (Android; iOS falls back to scroll). Pointer tilt on `.pl-card`, `.kyhero`, phones. All off under `prefers-reduced-motion`.
- `sw.js`: `img/` is not precached; it is cached on first use, cache-first (same rule as `vendor/`). Cache name unchanged.

**Pass 4 (same v8.15): trader-discipline tools in Journal, plus final polish:**
- Journal → new **Plan** tab (premium):
  - **Circuit breaker / Bezpiecznik.** Your own limits: trades per day, daily loss in SOL, losses in a row, max position size, quiet hours.
    - When a fresh breach (under 3 h old) shows up in your synced swaps, Kyvo shows a full-screen timed break (5–60 min) with a countdown. An optional SW notification needs push permission.
    - It does NOT block the wallet or transactions. It works while the app is open, and re-syncs every ~3 min.
  - **Discipline** grade (A+–F): streak, adherence and breaks kept/ended early. It feeds the Discipline part of Kyvo Score.
  - **Goals** (day/week), **pre-session checklist** (editable) and **plan for today**.
  - **After-session note** with mood, and a **weekly reflection** with a 1–10 score and streaks. All of this is stored only on the device.
- Analytics adds four insight cards:
  - cost of mistake tags
  - "if you had kept your rules" (what-if)
  - break-even win rate
  - P&L by trade number of the day
- Trade view: **Kyvo Scale** (0–100 execution score), pin to **Showcase** (pins + auto A+), and a **P&L card**.
- `share.js` (new): 1080×1920 PNG share card for a trade or a period/day, drawn on canvas. Uses the Web Share API with a file when available, otherwise a PNG download.
- Tags: calm 🧘 / fear 😨. Premium page: comparison rows for Journal and Plan, plus the **Founding member #001–#100** wording.
  - This is copy only. Payment logic is unchanged.
- Polish:
  - the desktop welcome hero has no visible box edge
  - the coin page stats grid sits right under the chart
  - the Ranking follow button uses an icon instead of 👀
- `sw.js` precaches `share.js`. Cache name unchanged.

**Pass 5 (same v8.15): cinematic break screen (Bezpiecznik lock):**
- Full-screen black overlay with a breathing red edge vignette and a chrome shield-alert tile. Headline depends on the rule (loss limit / streak / trades / size / quiet hours), with a red "step back" line, a calm grey line, and a reason pill showing the red number.
- Big chrome countdown inside a ring that fills as the break runs, then turns green with "Gotowe / Ready".
- The confirm button only unlocks at zero. Ending early is still possible (text link + confirm) and counts as "przerwane".
- An honest note stays: Kyvo does not block the wallet. Breaks that ended over 30 min ago are cleared silently. Reduced motion turns off all animation.

## v8.13 (KYVO_LIVE_v8_13 · SW kyvo-v8-13) — one pair rule, correct watchlist entry
- **pairs.js / tools/pairs.py** — one rule for "which pool is the price of this coin": exact CA + chain (never the ticker),
  real pool with the most USD liquidity (tie: 24 h volume), pump.fun / four.meme curve pair only while the coin is still
  on its curve, dust pools (< $1k liq) only as a last resort. Used by lists, coin page, chart, watchlist, Runner, Gold,
  New Pairs, New Tweet, Wyniki and the backend tools (discord_calls, gold, x_live, track_record, update_x_viral).
- Fixed: after a migration DexScreener keeps the dead pump.fun pair (frozen price) — v8.12 picked it, e.g. $SHAVCOIN
  showed "MC $24.3K → $3.38M, +14041%" on the watchlist and a 1-candle chart. Curve coins are re-checked with their full
  pair list (verifyCurveCoins), so migrated coins also leave Final Stretch.
- Watchlist entry check: an entry > 5× off the main pool's GeckoTerminal OHLCV at the add time is re-derived from the
  candles (peak / low rebuilt, pct alerts re-armed) and marked "✓ wejście poprawione z wykresu głównej puli". Existing
  localStorage entries are repaired once (ENTRY_V=1, ≤ 3 GT calls / 30 s).
- Gold: ticker search re-resolves the top token by CA; dust copies (no liquidity, no trading) are ignored in the copy
  check and in "other coins with this ticker". Profile: SOL price from the WSOL main pool (was: any Solana pair).
- EN: Good Coins subtitle and Final Stretch footnote translated; Regulamin §2 now names Gold / Runner / alerts.

## v8.12 (KYVO_LIVE_v8_12 · SW kyvo-v8-12) — 🥇 Gold
Orangie-style coin DD ("Grok bot" + "Memecoin Digester") as a new tab **🥇 Gold** (bottom bar + seg bar, `#gold`, `#gold/<chain>:<CA>`).
- **Sprawdź coin** (gold.js + gold-rules.js, in the browser): paste a CA / pump.fun / DexScreener link / `$ticker` (ticker → the pool with the most liquidity + volume, other coins with that ticker listed). Verdict 🥇 Gold / 🟡 Hazard / 🔴 Trzymaj się z daleka + DD checklist in Polish (EN via L2): avg trade size (≈$10–15 = volume bots), share of < $5 trades, MC vs liquidity, holder counter vs wallets that traded in 24 h (holder farm), top 1 / top 10, single buy that filled the pump.fun curve, bundle / insiders, mint / freeze / LP lock (RugCheck; GoPlus on BSC), borrowed celebrity name vs official (linked X handle / tweeted by that handle), copies / vamps (which one is the original), age + migration, buy/sell pressure, 5m / 1h / 6h change, links, KOL holding / tweeting (can be the narrative), news (from the Gold feed).
- **Feed Gold** (`tools/gold.py` → `data/gold.json`, every ~5 min in the kyvo-push loop, background job ≤ 230 s): ~14 hot coins (Runners, KOL coins, tweet coins, boosts, GT trending, 🔎 scanner hits) with the same verdict (shared `gold-rules.js` via node), Google News RSS headlines with the coin's name (24 h / 48 h / trend), KOL tweets, copies.
- **🔎 Auto-skaner** (`tools/gold_filters.json`, tune without code): discovery from GT trending 1 h + GT new pools + DS latest profiles / boosts (Solana + BSC), exact rule on DexScreener data, DD on every hit, card tagged "🔎 Filtr: …", hit kept 6 h. Presets: 🚀 +100 % in 1 h & MC ≥ $1M · 🎓 pump.fun graduate < 1 h, MC ≥ $75K, ≥ 60 buys/h, then real holders (≥ 150 holders, avg trade ≥ $30, top 10 ≤ 45 %) · 🌊 1 h volume ≥ 50 % MC, +20 %, MC $250K–$5M (no push). Max 5 hits/run.
- **Gold alerts** (OneSignal tag `gold`, Premium only unless `KYVO_GOLD_FREE_PUSH=1`): 📈/📉 ±15 % (±20 % under $300K MC) on Gold coins (45-min cooldown), 🧛 vamp copy > $500K MC, 📰 new article (≤ 6 h old, 1 per coin per 2 h), 🔎 filter hit with Gold/Hazard verdict (12 h cooldown per coin, ≤ 3/h). ≤ 4 Gold alerts/h overall, ≤ 2 per push run, dedupe ids, expire after 1 h; first run only seeds. In-app (app open): ±15 % and vamp alerts for ⭐ watchlist coins (Premium, notify setting 🥇 Gold).
- **Gating** (`window.KYVO_GOLD_CONFIG` in premium-config.js): free = 3 checks per Warsaw day (re-checking the same coin is free) + 1 full feed card per day (others: level + age only); Premium = unlimited, full feed, Gold push. `enabled:false` hides the tab.
- **Limits:** client-side gates (bypassable); "real holders" = RugCheck counter vs GT unique traders 24 h (no paid holder API); curve-fill only for coins < ~26 h (GT keeps 300 trades / 24 h); news = Google News RSS server-side (personal/non-commercial terms), matched by name; GeckoTerminal free limit ~30 req/min (calls spaced 2.2 s, cached); verdicts are heuristics, not advice. Big established coins (MC ≥ $50M, ≥ 30 days) get indicative flags only and max Hazard; the feed skips MC > $50M and stables.

## v8.11 (KYVO_LIVE_v8_11 · SW kyvo-v8-11)
- 🏃 **Runners are Premium.** Free plan: 1 Runner per Europe/Warsaw day — the first Runner flagged that day (earliest flag time, remembered per device for the day). Every other Runner (👑 KOL coin, 🚀 Moon run, 📈 Big runner, 🐦 Tweet runner, 🔁 second leg, super-important tweets) shows as a locked card: kind + flag time only, no name / ticker / CA / logo / chart / links; "✦ Odblokuj Premium" opens the existing Premium pop-up.
- No leaks via the Runner badge (best effort): New Tweet tab shows the 🐦 Tweet runner highlight only when unlocked (no 🔒 badge either), 📊 Wyniki masks Runner rows from the last 24 h, in-app Runner alerts fire only for the free Runner. Coin detail / search / watchlist never showed a Runner badge.
- Push (tools/kyvo_push.py): premium=1 gets every Runner; premium≠1 gets at most 1 Runner push per Warsaw day (the first one sent), still inside the 2/day free cap.
- Owner unlock: `?owner=<token>` → SHA-256 checked against the hash in premium-config.js (token never in the repo), stored on the device (`kyvo_owner_tok`, survives reloads / SW updates / "clear data"), URL param stripped, toast "Premium aktywne (właściciel)", OneSignal tag premium=1 re-synced.
- **Limit:** static PWA + public data/*.json → the gate is client-side and bypassable by a technical user. Real enforcement needs login + entitlement (Supabase/Firebase + Stripe webhook) and a server-filtered Runner feed (Edge Function returning full Runner data only to Premium tokens; the public JSON would carry only locked stubs), plus per-user push targeting (OneSignal external_id) instead of client-set tags.

## v8.10 (KYVO_LIVE_v8_10 · SW kyvo-v8-10)
- 🐦 **New Tweet = a moving feed**: every own tweet (no retweets; replies only when they name a coin) from ~43 tracked accounts in the last 12 h, newest first, sections "<2 h" / "Wcześniej". Previously tweets without a resolvable coin were dropped, so the tab showed ~2 tweets.
- Tracked list expanded (`tools/x_accounts.json` → `live_more`: WhiteHouse, saylor, justinsuntron, brian_armstrong, VitalikButerin, MrBeast, Cobratate, cb_doge, DogeDesigner, KookCapitalLLC, ZssBecker, theunipcs, rajgokal, ShockedJS, WatcherGuru, binance, BNBCHAIN, solana). These feed New Tweet only, not 👑 KOL coin.
- Coin per tweet: **✅ Wspomniany coin** ($ticker / CA in the tweet) → else **🔗 Powiązany coin**: the highest-volume fresh Solana/BSC coin (DexScreener search, free) whose name/ticker matches the tweet's key word and that launched −2…+60 min after the tweet (min MC $15k, vol24 $10k, real 1 h activity; obvious rugs dropped) → else **⏳ Brak coina jeszcze** (a coin can attach on later runs, for tweets ≤ 90 min).
- Price since tweet (or since launch for related coins) refreshed every run; 🚀 "Pompuje" = ≥ +30 %, or ≥ +8 % on a 3× volume spike. Filter chips: Wszystkie / Z coinem / Pompuje.
- Push / 🐦 Tweet runner / KOL coin: unchanged rules, **only mentioned coins** (related coins never push).
- Loop: tweet read every ~150 s (was 240), FxTwitter 3 tries, background job limit 230 s.

## v8.9 (KYVO_LIVE_v8_9 · SW kyvo-v8-9)
- ⏱ **Continuous feeds** (`tools/kyvo_loop.py`, `.github/workflows/kyvo-push.yml`): one run loops ~51 min in 3 chunks
  (state saved to actions/cache after each chunk): Runner scan every ~90 s, New Tweet read every ~4 min (in parallel, GT budget 5),
  OneSignal push right after each step (same sent-ids dedupe + free 2/day cap). Feed commits only on new items
  (or a 30-min heartbeat), ≤ 1 per 3 min and ≤ 7 per hour (GitHub Pages branch build: soft limit 10 builds/h, shared).
  The run requeues itself (`gh workflow run`, only after success); cron */15 is a backstop; `concurrency: kyvo-push` = 1 running + 1 queued.
  Kill switch: repo variable `KYVO_LOOP_CHAIN=0`. RugCheck/GoPlus answers cached 10 min (`.kyvo_push/facts`).
- App polls `data/x_live.json` and `data/kol_live.json` every 60 s while open (1-min `?t=` cache-bust) and re-renders only on change.
- 📈 **Duży runner / Big runner** (`bigRunnerRule` in insights.js = tools/upside_estimate.js `--big`): established $1M–$100M coins
  (≥ 6 h old) running now — strong 1 h (or 6 h) move, last-hour volume far above its 24 h average, trades above the 6 h pace,
  buyers dominate, healthy liquidity, Kyvo Check floor, not parabolic / not dumping. Server adds GT 1 h trending + top-volume pools,
  hard-rug + copycat guard + unique buyers (≥ threshold, rising vs 6 h, no wash trading) → `badge: "big"` in `data/kol_live.json` + push.
  Second wave (🔁) MC cap 30M → 100M. Runner cards show MC on the right. Research: `tools/big_runner_research.py`.
- 📊 **Charts** (`chart.js`): GT queue with a priority lane for the open chart (background GT calls pause while it loads), 12-s
  timeout per call, backoff 3/6/12 s, OHLCV 404 → token's own GT pool, empty OHLCV on new pools → 1-min candles from trades,
  12-s watchdog → DexScreener embed (15-s load watchdog) → simple line from DexScreener % changes; four.meme curve pairs go
  straight to DexScreener; chart library loaded on demand if missing; reopen reuses a healthy chart / remembers a fallback for 3 min.
  SW: `vendor/` cache-first.

## v8.8 (KYVO_LIVE_v8_8 · SW kyvo-v8-8)
- 👑 **KOL coin** (Runner override, `tools/kol_coins.py`, called from `tools/discord_calls.py` in kyvo-push / kyvo-calls):
  a fresh coin whose on-chain metadata / DexScreener socials link EXACTLY a curated KOL X handle (`tools/x_accounts.json`
  accounts + live_extra + kol_extra + every kolscan leaderboard handle) AND one more proof (biggest holder = known KOL wallet,
  or = the wallet of the coin's linked pump.fun profile, or a tracked account tweeted this CA in `data/x_live.json`), plus
  momentum (volume, trades, unique buyers from GeckoTerminal). Flagged as Runner + push even if the Kyvo Check / holder
  concentration fails; the 30M MC cap is lifted for KOL coins in their first hours.
- 🚀 **Moon run · wysokie ryzyko**: no KOL proof, but extreme real momentum in the first hours (MC into the millions very fast,
  huge volume, thousands of trades and unique buyers, low trades-per-wallet = no wash trading).
- Hard-rug protections stay for both: mint/freeze authority, rugged, mutable balances, transfer fee, unlocked AMM LP, bundled
  launch (RugCheck insider network), dev-held supply, same-ticker/same-name copycat (older or ≥3× bigger original),
  impersonation (linked X is a post by another account, mixed links, or not the real big account); BSC honeypot/sell tax.
- App: Runner tab shows them first with the badge and a clear ⚠️ high-risk line (e.g. "~75% podaży leży w portfelu KOL-a");
  feed `data/kol_live.json` (committed by kyvo-push only when it changes). No thresholds in the UI. Free users: same 2 push/day cap.
- New Tweet: + @kimchi1x. Backfill + notes: `kyvo_v8_8_notes.md` (box only).

## v8.7 (KYVO_LIVE_v8_7 · SW kyvo-v8-7)
- ⭐ **Watchlist "od dodania"**: adding a coin stores the entry point (time, price USD, MC) in `kyvo_watch_v1`.
  Each row shows % since added (green/red), MC entry → now, "dodano 2 godziny temu", $100 → $X and the peak % since added
  (taken from the 30 s DexScreener refreshes while Kyvo is open). Summary card: "$100 in each" total, best and worst coin.
- Migration: watchlist entries saved before v8.7 without an entry price take the first live price after the update and are
  marked "📍 liczone od teraz" / "od startu". Coins added without a price wait for the first live price (≤ 30 s).

## v8.6 (KYVO_LIVE_v8_6 · SW kyvo-v8-6)
- 🐦 **New Tweet** tab (`#tweets`): fresh tweets (≤2 h on top, ≤24 h below with real age) from tracked accounts that name a coin
  (contract address or unambiguous $ticker on DexScreener) — coin logo, chain, MC, price since tweet, volume after vs 1 h before,
  🚀 "Pompuje po tweecie". Data: `data/x_live.json`, built by `tools/x_live.py` (public FxTwitter API, no X key).
- **Phone push (app closed)**: `.github/workflows/kyvo-push.yml` (cron */5, real cadence ~5–15 min) → `tools/x_live.py` +
  runner scan (`tools/discord_calls.py --flags-out`, no Discord posts) → `tools/kyvo_push.py` → OneSignal REST.
  Secret `ONESIGNAL_REST_API_KEY` only in GitHub Secrets; missing = no-op. Premium (tag premium=1) gets all; free max 2/day.
- Static privacy page `privacy.html` (PL + EN) for App Store Connect / Play Console "Privacy policy URL".

### v8.9 — 🐦 Tweet runner
A coin named in a tracked account's tweet (New Tweet feed: x_live / KOL) that clearly runs **after** the tweet, within the first few hours, gets:
a push (`🐦 Tweet runner: $X +NN% po tweecie @handle`, same OneSignal path, dedupe `twr:<coin>`, free cap 2/day, Premium unlimited),
a 🐦 badge plus a tweet link in Runner, and a highlighted card in New Tweet. The rule needs a strong price rise since the tweet, rising volume and buyers, and no dump in progress.
Only hard rugs and copycats are blocked, the same as v8.8. It is checked in every loop scan (about 90 s). Thresholds live only in `tools/kol_coins.py` (TW_T) and are not shown in the app.

### v8.15 — Pass 6 (simpler + new welcome stage)
- Circuit breaker / break screen ("Bezpiecznik") switched off: `BREAKER = false` in journal.js. Rules form, lock overlay, discipline card, "what if you followed rules" insight and its Kyvo Score effect are gone from the UI; a leftover `plan.cool` is cleared on load. Plan keeps the checklist, goals and reflections. Premium comparison row now reads "Daily plan, goals, reflections, P&L card".
- New welcome "Kyvo stage" (`.ks-*` in theme.css, `stage()` in launch.js): real Kyvo screens (Runner, coin chart, Journal dashboard, P&L card) captured at 3x as chrome-bezel 3D phones on a green horizon glow, with CSS-only edit-style motion (fly-in, P&L card stamp, focus punch + light sweep per phone, overlay chips, cut flash). Static under reduced motion.
- Assets: `img/scr-{runner,coin,journal}-{pl,en}-{420,780}` and `img/scr-pnl-{pl,en}-{360,640}` (AVIF + WebP, registered in KyvoArt). Card 1 loads 3×420w AVIF + 1×360w (~80 KB); cards 2 and 4 are lazy.

### v8.15 — Pass 7 (one chrome 3D model, Liquid-style simplicity)
- Liquid's "3D model" is not live 3D: the hero is a raw WebGL chrome-silk fragment shader, and the chrome object is a pre-rendered image (`/reviews/ring.webp`, a 2508px liquid-chrome ring). No three.js, Spline or glb.
- Kyvo now does the same: welcome card 1 shows one chrome 3D Kyvo mark (rendered offline with three.js: physical chrome, studio reflections, 6 s seamless loop) on pure black with the chrome headline.
- Assets: `img/kyvo-model.mp4` (~445 KB) / `.webm` (~486 KB), plus posters `img/kyvo-model-{380,760}.{avif,webp}` (5–19 KB). The poster shows first. The video loads on idle, fades in, and pauses off-screen or in a hidden tab. Reduced motion or Save-Data shows the poster only.
- Cards 2 and 4 show a single floating device (coin screen / P&L card) with no chips. The pass-6 phone stage is kept in `launch.js` behind `STAGE = false`.
- CSS class `.kym` (`.km` is already used by chart whale markers).

### v8.15 — design pass 8 (menu + all screens, Liquid-calm)
- Pure black base, chrome/silver accents, one accent pair (green up / red down); violet→cyan gradients retired (primary = white, active chip = white, panels = hairline glass).
- Nav: mono uppercase tab row with an underline on the active tab (desktop + mobile); bottom dock of rounded hairline tiles with line icons and a dot under the active tab. Menu/Profile tiles use line SVG icons instead of emoji.
- Runner hero = one huge chrome number + a row of smaller stats. Coin-row signal pills are hairline mono.
- Journal → Coach is a frosted-glass chat panel (Coach / Tips / Tilt guard): 3 suggested questions + free text, answered by rules from the journal data (no paid AI); private-key-shaped input is rejected.
- Welcome: card 2 = real desktop Pulse inside an app window with callouts; new card 5 = Kyvo Coach preview (6 cards total). Assets: img/scr-desk-pulse-{pl,en}-{640,1060}.{avif,webp}.

### v8.15 — design pass 9 (Kyvo w liczbach + "Dane z")
- Welcome card 2 (7 cards now) = one huge chrome number + a row of small stats, computed at load time from data/ only: coins in data/track_record.json (rolling 14-day log; caption says "od <first date>" until it is 14 days old), Runner-rule flags, coins whose max ≥ 2× flag price (same >50x sanity cut as the Runner hero), data/leaderboard.json wallets_count, data/tracker_feed.json wallets. Missing file → that stat hides. Count-up via rAF, static under prefers-reduced-motion.
- "Dane z / Data from" strip: greyscale favicons in img/brands/ (pump.fun, Axiom, GMGN, kolscan, DEX Screener, GeckoTerminal, Solscan, RugCheck, Phantom, Solana — only platforms the code reads from or links to) + "Kyvo nie jest powiązane z tymi platformami". Slow CSS marquee (46 s, pause on hover); reduced motion = static wrapped list. Also on desktop Pulse under the hero (≥900 px).
- Visitor counter (launch.js `KYN_VISITS`, flag `on`): Abacus public counter (abacus.jasoncameron.dev, no account, no key). Only on kyvo-app.github.io (v8.25; was alezrugla-max.github.io); one /hit per browser (localStorage kyvo_vc1), then /get; 4 s timeout; hidden on any error or below 100. SW never caches it. Set `on:false` to disable.
