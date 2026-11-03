#!/usr/bin/env python3
"""Kyvo v8.33 ⚡ Wczesny Runner / Early Runner — the START of a strong pump, pushed minutes before the 🏃 Runner rule can fire.

The 🏃 Runner rule needs a full hour of proof (vol 1h ≥ $100K, ≥ 1000 txns, +30% 1 h), so it usually fires when the coin is
already ~3x off the start of the move (v8.33 check of 17 Runner pushes: median 3.0x from the first +30% 5-min candle, push
at ~45% of the way from that start to the 24 h peak). The early rule looks at the LAST 5 MINUTES instead (DexScreener m5
fields, read on every scan of tools/discord_calls.py (~90 s cadence; Kyvo Check answers now cached + fetched in parallel, so a scan is faster)):

  market (cheap prefilter, no extra calls)                      anti-rug (live data only)
  · MC $25K–$3M                                                · liquidity ≥ $12K and ≥ 5% of MC (or still on the pump.fun curve)
  · price +25% or more in 5 min                                · ≥ 60 txns in 5 min, ≥ 58% buys (many buyers, not one wallet:
  · 5-min volume ≥ $8K and ≥ 2.5x the pace of the last hour        average trade ≤ $1,500 and ≥ 35 buys)
    (pairs < 1 h old: vs the pace of their whole life)         · pair ≥ 10 min old (skips the launch / bundle spike)
  · not already run: 1 h move ≤ +150% (else it's late)         · Kyvo Check (RugCheck + GoPlus) ≥ 60 with no red flag
                                                               · contract: mint + freeze revoked, top-10 ≤ 45%, dev ≤ 10%
Backtest (5-min candles, ~24 h, coins the scanner saw): see kyvo_v8_33 report. Thresholds are never shown in the app.
"""
from __future__ import annotations

EARLY_PUSH_T = {"mcMin": 25_000, "mcMax": 3_000_000, "m5": 25.0, "v5": 8_000, "acc": 2.5, "h1Max": 150.0,
                "liq": 12_000, "liqMc": 0.05, "tx5": 60, "buy5": 0.58, "buys5": 35, "avgBuyMax": 1_500, "ageMinH": 1 / 6,
                "kc": 60, "top10Max": 45.0, "devMax": 10.0}

def _n(v):
    try: return float(v) if v is not None else None
    except (TypeError, ValueError): return None

def accel(c: dict) -> float | None:
    v5, v1, age = _n(c.get("vol5m")), _n(c.get("vol1h")), _n(c.get("age_h"))
    if v5 is None or not v1: return None
    base = v1 / max(age, 1 / 12) if age is not None and age < 1 else v1     # young pair: whole-life pace per hour
    return v5 * 12 / base if base else None

def market(c: dict, T: dict | None = None) -> str | None:
    """None = passes the market part; else the first failed check (cheap, no network)."""
    T = dict(EARLY_PUSH_T, **(T or {}))
    mc, liq, m5, v5, h1, age = (_n(c.get(k)) for k in ("mcap", "liq", "m5", "vol5m", "h1", "age_h"))
    b5, s5 = _n(c.get("buys5m")) or 0, _n(c.get("sells5m")) or 0
    tx5 = b5 + s5; acc = accel(c)
    if not mc or not (T["mcMin"] <= mc <= T["mcMax"]): return "mc"
    if m5 is None or m5 < T["m5"]: return "move"
    if v5 is None or v5 < T["v5"]: return "vol5m"
    if acc is None or acc < T["acc"]: return "accel"
    if h1 is not None and h1 > T["h1Max"]: return "late"
    if age is None or age < T["ageMinH"]: return "young"
    if not c.get("on_curve") and (liq is None or liq < T["liq"] or liq / mc < T["liqMc"]): return "liq"
    if tx5 < T["tx5"] or b5 / tx5 < T["buy5"] or b5 < T["buys5"]: return "buyers"
    if v5 / tx5 > T["avgBuyMax"]: return "whale"                                           # a few huge trades = one big wallet
    return None

def safety(score: int, checks: list, facts: dict | None, T: dict | None = None) -> str | None:
    T = dict(EARLY_PUSH_T, **(T or {}))
    if score < T["kc"] or any(l == "bad" for l, _ in checks): return "safety"
    f = facts or {}
    if f.get("error"): return "contract"
    if f.get("chain") == "solana":
        if f.get("mintRevoked") is False or f.get("freezeRevoked") is False: return "contract"
        if f.get("top10Pct") is not None and f["top10Pct"] > T["top10Max"]: return "holders"
        if f.get("devPct") is not None and f["devPct"] > T["devMax"]: return "dev"
    if f.get("chain") == "bsc" and (f.get("honeypot") or f.get("ownerSafe") is False or (f.get("sellTax") or 0) > 5): return "contract"
    return None

def prefilter(coins: list[dict], cap: int = 8) -> list[dict]:
    """market() passers, strongest 5-min move first."""
    return sorted([c for c in coins if market(c) is None], key=lambda c: -((_n(c.get("m5")) or 0) * (accel(c) or 0)))[:cap]
