# Refreshing `data/x_viral.json` (~12–25 X reads, ~3×/day)

GitHub Pages cannot hold an X secret, so Kyvo ships a **static snapshot** built with the `x` MCP connector.
Only real posts; a coin is shown only if it resolves on DexScreener.

## 1. Read X (save every MCP result to a file, e.g. `/tmp/x_raw/*.txt`)

Accounts live in `tools/x_accounts.json` (trader = wallet publicly attributed in `wallets_public.json`; kol = well-known public account, no wallet attribution).

1. **Tweety traderów** (3–4 reads) — `search_posts_all`, `max_results` 100, `start_time` = now − 7 days,
   `post.fields=created_at,public_metrics,entities,author_id,note_tweet,in_reply_to_user_id`, `expansions=author_id`,
   `user.fields=username,name,profile_image_url,public_metrics` (**v8.2: `public_metrics` = follower count**):
   - `(from:orangie OR from:Quanterty OR from:Cupseyy OR from:Ga__ke OR from:Cented7 OR from:notthreadguy OR from:frankdegods OR from:jijo_exe OR from:MarcellxMarcell OR from:Dior100x OR from:kreo444 OR from:traderpow) has:cashtags -is:retweet`
   - `(from:blknoiz06 OR from:MustStopMurad OR from:CryptoKaleo OR from:a1lon9 OR from:Pumpfun) has:cashtags -is:retweet`
   - `(<same lists>) (pump OR CA OR dexscreener OR ticker OR aped OR bought) -is:retweet -is:reply`
   - optional: `get_users_posts` (exclude=retweets) for orangie / Quanterty / Cupseyy (ids in `x_accounts.json`).
2. **Important posts / topics** (2–4 reads): `search_posts_all` `from:elonmusk -is:retweet -is:reply` (relevancy, last 3 days);
   `search_news` `memecoin viral solana pump.fun` (max_age_hours 72); optionally `(memecoin OR pumpfun) has:cashtags -is:retweet lang:en`.
3. **(v8.2, 1 read, every refresh)** `get_users_by_usernames` for every author shown (tracked accounts + authors of key posts, e.g. elonmusk, Pumpfun, MustStopMurad, Quanterty) with `user.fields=public_metrics,profile_image_url` → follower counts. Save as `/tmp/x_raw/users.txt`.
4. **(v8.2)** every `search_posts_all` / `get_users_posts` call must request `post.fields=created_at,public_metrics,entities,author_id,note_tweet,in_reply_to_user_id` — `public_metrics` gives **views (`impression_count`)**, likes, reposts, replies, quotes, bookmarks. Keep the raw files: the builder reads metrics from them.

## 2. Write topics + key posts

Make `raw_doc.json` with `posts` (real fields: author_name, handle, avatar, text, created_at, url, metrics{likes,reposts,replies}, optional `topic_id`)
and `topics` (`id`, `label`, `query`, `hints`, `source_post`, `why` — Polish; plus `label_en` and `why_en` — the same in English for the EN version of the app). Never invent metrics.

## 3. Build + validate

```bash
python3 tools/update_x_viral.py --from-raw raw_doc.json --trader-raw /tmp/x_raw/*.txt --resolve-topics --enrich-raw /tmp/x_raw/*.txt
python3 tools/update_x_viral.py --validate-only
```

- `--trader-raw`: extracts contract addresses (Solana base58 / pump, 0x), `$CASHTAGS` and "ticker is X" from posts of tracked accounts (last 14 days),
  resolves via DexScreener (`/latest/dex/tokens`, `/latest/dex/search`). Tickers: Kyvo chains only, ≥ $10k liquidity, ≥ $50k 24h volume,
  and ≥ 3× the volume of any other token with the same ticker — otherwise dropped (no guessing). Majors/stocks ($BTC, $HOOD…) are skipped.
- `--resolve-topics`: fills `topics[].coins` (Kyvo chains, real volume, liquidity not implausibly larger than volume).
- Max 2 tweets per author+coin.
- `--enrich-raw` (v8.2): adds to every post / trader tweet `posted_at`, `metrics{likes,reposts,replies,quotes,bookmarks,views}`, `metrics_at`
  (time the metrics were read = newest raw file time), `author_followers` (when the users file has it), and
  `coin_match`: **`named`** = the tweet itself contains a contract address or an unambiguous `$TICKER` (→ `coins`),
  **`speculative`** = the coin is only matched by keywords of the topic (→ `spec_coins`, ranked: name match, then newer pair + more liquidity; `spec_keywords`),
  **`none`** = nothing found. Never present a speculative match as the tweet's coin. All new fields are optional in the app.

## 4. Commit + push `data/x_viral.json` (deploy via cloud agent).

**Budget:** this refresh used 12 reads. UI shows „zaktualizowano X min temu” from `updated_at`; MC / 24h are refreshed live in the browser.
