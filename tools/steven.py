"""Kyvo v8.43 👤 bystevenr — copy feed of the trader @bystevenr (fomo.family Top 100): every coin his Solana wallet BUYS goes into
the 🏃 Runner tab (badge '👤 bystevenr', data/steven_live.json) and out as a normal 🏃 Runner push ('🏃 Runner · 👤 bystevenr · $SYM',
same runner push type / toggle / caps, one push per coin) within seconds. It is a copy of his buys: no Runner rules apply.

Wallet (public, on-chain): AH75Bn6QHSt5K2Ad4p1otns3JTwpSJWZTwiwKWNhmnKx — fomoapi.io / provadata.com / fomoradar.io list it as the
verified wallet behind the FOMO account; checked 04.11.2026: his FOMO S.A.N buy ($1 500 USDC, 15:48:13 CET) is this wallet's tx.
FOMO signs with its own relayer (fee payer), the wallet is a writable account of the swap, so getSignaturesForAddress sees it.
His EVM wallet (0xd0b3…e440) trades on Robinhood Chain / Ethereum, which Kyvo does not cover -> not polled.

Detection: a free public RPC (publicnode, fallback api.mainnet-beta), getSignaturesForAddress(until = last seen, commitment
confirmed) every POLL_S (2 s) = 30 light requests / min, + one getTransaction per new signature. A buy = his token balance of a
non-stable mint goes UP while his USDC / USDT / SOL goes down. Coin facts: one DexScreener call (sym / logo / pair / MC). MC at
his buy = DexScreener MC × (his fill price / DexScreener price). No Helius, no private APIs, no keys.

Runs in the background of tools/kyvo_loop.py for the whole run; after each new buy it runs the push command it was given
(after "--") with --flags pointing at its own flags file. Dry run (--backfill N): parse his last N txs, print the buys, write nothing."""
from __future__ import annotations
import argparse, json, os, subprocess, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from pairs import best_map   # noqa: E402

WALLET = os.environ.get("KYVO_STEVEN_WALLET", "AH75Bn6QHSt5K2Ad4p1otns3JTwpSJWZTwiwKWNhmnKx")
RPCS = [u for u in os.environ.get("KYVO_STEVEN_RPC", "https://solana-rpc.publicnode.com,https://api.mainnet-beta.solana.com").split(",") if u]
POLL_S = float(os.environ.get("KYVO_STEVEN_POLL_S", "2"))
MIN_USD = float(os.environ.get("KYVO_STEVEN_MIN_USD", "50"))      # dust / test buys are ignored
CATCHUP_S = 15 * 60                                                 # after a restart: buys from the last 15 min still count
WSOL = "So11111111111111111111111111111111111111112"
STABLE = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT"}
DS = "https://api.dexscreener.com"
UA = {"user-agent": "Mozilla/5.0 (kyvo-app.github.io)", "content-type": "application/json"}
_bad: dict[str, float] = {}   # rpc url -> skip until


def http(url: str, body: dict | None = None, timeout: float = 8):
    r = urllib.request.Request(url, json.dumps(body).encode() if body is not None else None, UA)
    with urllib.request.urlopen(r, timeout=timeout) as f: return json.load(f)


def rpc(method: str, params: list):
    err = None
    for u in RPCS:
        if _bad.get(u, 0) > time.time(): continue
        try:
            d = http(u, {"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
            if "error" in d: raise RuntimeError(str(d["error"])[:120])
            return d.get("result")
        except Exception as e:
            err = e; _bad[u] = time.time() + 60    # 429 / timeout -> the next RPC for a minute
    raise RuntimeError(f"all RPCs failed: {type(err).__name__}")


def load(p: Path, default):
    try: return json.loads(p.read_text())
    except Exception: return default


def save(p: Path, obj) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); tmp = p.with_suffix(".tmp"); tmp.write_text(json.dumps(obj, ensure_ascii=False)); tmp.replace(p)


_sol = {"px": None, "t": 0.0}
def sol_usd() -> float | None:
    if time.time() - _sol["t"] > 600:
        try:
            p = best_map(http(f"{DS}/tokens/v1/solana/{WSOL}") or [], "solana").get(WSOL.lower())
            if p and p.get("priceUsd"): _sol.update(px=float(p["priceUsd"]), t=time.time())
        except Exception: pass
    return _sol["px"]


def buys_of(tx: dict) -> list[dict]:
    """Token buys of WALLET in one transaction: [{mint, qty, usd}] (usd = USDC / USDT / SOL he paid)."""
    m = tx.get("meta") or {}
    if m.get("err"): return []
    d: dict[str, float] = {}
    for sd, arr in ((-1, m.get("preTokenBalances") or []), (1, m.get("postTokenBalances") or [])):
        for b in arr:
            if b.get("owner") == WALLET: d[b["mint"]] = d.get(b["mint"], 0) + sd * float((b.get("uiTokenAmount") or {}).get("uiAmount") or 0)
    keys = [k.get("pubkey") if isinstance(k, dict) else k for k in (tx.get("transaction") or {}).get("message", {}).get("accountKeys", [])]
    sol = 0.0
    if WALLET in keys:
        i = keys.index(WALLET); sol = ((m.get("postBalances") or [0])[i] - (m.get("preBalances") or [0])[i]) / 1e9
    sol += d.pop(WSOL, 0)
    usd = -sum(d.pop(s, 0) for s in list(STABLE) if s in d)
    if sol < -0.01: usd += -sol * (sol_usd() or 0)
    got = sorted(((k, v) for k, v in d.items() if v > 0), key=lambda x: -x[1])[:1]   # one coin per swap (dust side-effects of the route dropped)
    if not got or usd <= 0: return []     # no payment out -> transfer / airdrop, not a buy
    return [{"mint": k, "qty": v, "usd": round(usd, 2)} for k, v in got]


def coin(mint: str) -> dict | None:
    for i in range(3):    # a brand-new pump.fun coin can need a few seconds on DexScreener
        try:
            p = best_map(http(f"{DS}/tokens/v1/solana/{mint}") or [], "solana").get(mint.lower())
            if p: return p
        except Exception: pass
        time.sleep(1.5)
    return None


def to_flag(b: dict, sig: str, bt: int, seen_ms: int) -> dict | None:
    p = coin(b["mint"])
    if not p: return None
    bt_ = p.get("baseToken") or {}; px_ds = float(p.get("priceUsd") or 0); mc_ds = p.get("marketCap") or p.get("fdv") or 0
    px_buy = b["usd"] / b["qty"] if b["qty"] > 0 else 0
    ok = px_ds > 0 and px_buy > 0 and 0.2 < px_buy / px_ds < 5    # fill price sane vs DexScreener -> MC at HIS price
    px0 = px_buy if ok else px_ds; mc0 = mc_ds * (px_buy / px_ds) if ok else mc_ds
    if not (px0 > 0 and mc0 > 0): return None
    info = p.get("info") or {}; cr = p.get("pairCreatedAt")
    return {"k": f"solana:{bt_.get('address') or b['mint']}", "sym": bt_.get("symbol") or "?", "name": bt_.get("name") or "", "chain": "solana",
            "addr": bt_.get("address") or b["mint"], "pair": p.get("pairAddress") or "", "img": info.get("imageUrl"), "kind": "runner",
            "badge": "steven", "at": seen_ms, "px0": px0, "mc0": mc0, "h1": None, "m5": None,
            "age_h": round((time.time() * 1000 - cr) / 3.6e6, 3) if cr else None, "vol1h": (p.get("volume") or {}).get("h1"), "h6": None,
            "steven": {"usd": b["usd"], "buy_at": bt * 1000, "sig": sig, "dex": p.get("dexId") or ""},
            "snap": {"liq": (p.get("liquidity") or {}).get("usd"), "vol1h": (p.get("volume") or {}).get("h1"), "h1": (p.get("priceChange") or {}).get("h1"),
                     "m5": (p.get("priceChange") or {}).get("m5"), "created": cr}}


def get_tx(sig: str) -> dict | None:
    for i in range(4):    # at 'confirmed' the tx can lag the signature list by a moment
        tx = rpc("getTransaction", [sig, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 1, "commitment": "confirmed"}])
        if tx: return tx
        time.sleep(0.6)
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--state-dir", default=".kyvo_push")
    ap.add_argument("--feed", type=Path, default=None, help="app feed (data/steven_live.json); none = not written")
    ap.add_argument("--max-s", type=float, default=50 * 60)
    ap.add_argument("--backfill", type=int, default=0, help="dry run: parse his last N txs, print the buys, write nothing")
    ap.add_argument("push", nargs=argparse.REMAINDER, help="-- <push command>; run with --flags <steven_flags.json> after new buys")
    a = ap.parse_args()
    sd = ROOT / a.state_dir
    if a.backfill:
        sigs = rpc("getSignaturesForAddress", [WALLET, {"limit": a.backfill, "commitment": "confirmed"}]) or []
        n = 0
        for s in sigs:
            if s.get("err"): continue
            tx = get_tx(s["signature"])
            for b in buys_of(tx or {}):
                if b["usd"] < MIN_USD: continue
                f = to_flag(b, s["signature"], s.get("blockTime") or 0, int(time.time() * 1000)); n += 1
                print(f"  {time.strftime('%d.%m %H:%M:%S', time.localtime(s.get('blockTime') or 0))} 👤 bystevenr kupił ${f['sym'] if f else '?'} za ${b['usd']:,.0f}"
                      + (f" · MC przy zakupie ${f['mc0']:,.0f} · {f['steven']['dex']}" if f else f" ({b['mint'][:6]}…, no DexScreener pair)"))
        print(f"backfill: {len(sigs)} txs, {n} buys ≥ ${MIN_USD:.0f}")
        return 0
    push = [x for x in a.push if x != "--"]
    stp, flp = sd / "steven_state.json", sd / "steven_flags.json"
    st = load(stp, {}); flags = [f for f in load(flp, []) if time.time() * 1000 - f.get("at", 0) < 24 * 3.6e6]
    seen = set(st.get("seen") or [])
    last = st.get("last") if time.time() - st.get("last_t", 0) < CATCHUP_S else None
    end = time.time() + a.max_s; errs = 0; n_req = 0; lag = []
    print(f"👤 bystevenr poller: wallet {WALLET[:4]}…{WALLET[-4:]}, every {POLL_S:.0f} s, {'catch-up from last run' if last else 'new buys only'}", flush=True)
    while time.time() < end:
        t0 = time.time()
        try:
            opt = {"limit": 25, "commitment": "confirmed"}
            if last: opt["until"] = last
            sigs = rpc("getSignaturesForAddress", [WALLET, opt]) or []; n_req += 1; errs = 0
        except Exception as e:
            errs += 1; print(f"  steven rpc error: {e}", flush=True); time.sleep(min(30, POLL_S * 2 ** errs)); continue
        if last is None:              # first start without a recent state: everything already there is history
            last = sigs[0]["signature"] if sigs else None; st.update(last=last, last_t=time.time()); save(stp, st); time.sleep(POLL_S); continue
        new = []
        for s in reversed(sigs):      # oldest first
            if s.get("err") or s["signature"] in seen: continue
            seen.add(s["signature"])
            try: tx = get_tx(s["signature"]); n_req += 1
            except Exception as e: print(f"  steven tx error: {e}", flush=True); continue
            for b in buys_of(tx or {}):
                if b["usd"] < MIN_USD: continue
                now_ms = int(time.time() * 1000); f = to_flag(b, s["signature"], s.get("blockTime") or 0, now_ms)
                if not f: print(f"  👤 buy {b['mint'][:6]}… ${b['usd']:.0f}: no DexScreener pair yet", flush=True); continue
                d = now_ms / 1000 - (s.get("blockTime") or now_ms / 1000); lag.append(d)
                print(f"  👤 bystevenr kupił ${f['sym']} za ${b['usd']:,.0f} · MC ${f['mc0']:,.0f} · {d:.1f} s po bloku", flush=True)
                new.append(f)
        if sigs: last = sigs[0]["signature"]
        st.update(last=last, last_t=time.time(), seen=list(seen)[-300:]); save(stp, st)
        if new:
            if a.feed: write_feed(a.feed, new)
            one: dict[str, dict] = {}          # several buys of one coin in one poll -> one flag (first buy, sizes added up)
            for f in new:
                k = f["k"].lower()
                if k in one: one[k]["steven"]["usd"] = round(one[k]["steven"]["usd"] + f["steven"]["usd"], 2)
                else: one[k] = json.loads(json.dumps(f))
            new = list(one.values()); ks = set(one)
            flags = [f for f in flags if f["k"].lower() not in ks] + new; save(flp, flags)
            if push:
                t1 = time.time()
                subprocess.run(push + ["--flags", str(flp)], cwd=ROOT, timeout=90)
                print(f"  👤 push step {time.time() - t1:.1f} s (buy -> push done {time.time() - (new[-1]['steven']['buy_at'] / 1000):.1f} s)", flush=True)
        time.sleep(max(0.2, POLL_S - (time.time() - t0)))
    print(f"👤 bystevenr poller done: {n_req} RPC requests" + (f", lag block->seen median {sorted(lag)[len(lag) // 2]:.1f} s" if lag else ""), flush=True)
    return 0


def write_feed(path: Path, new: list[dict]) -> None:
    """data/steven_live.json — first buy per coin kept (time + MC at his buy), later buys of the same coin add up; 48 h window."""
    doc = load(path, {}); now = int(time.time() * 1000)
    items = {e["k"]: e for e in doc.get("items", []) if now - e.get("at", 0) < 48 * 3.6e6}
    for f in new:
        e = items.get(f["k"])
        if e: e["steven"]["usd"] = round((e["steven"].get("usd") or 0) + f["steven"]["usd"], 2); e["steven"]["n"] = e["steven"].get("n", 1) + 1; e["lastAt"] = f["at"]
        else: items[f["k"]] = {k: v for k, v in f.items() if k not in ("h1", "m5", "h6")}
    save(path, {"version": 1, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "items": sorted(items.values(), key=lambda e: -e["at"])})


if __name__ == "__main__":
    sys.exit(main())
