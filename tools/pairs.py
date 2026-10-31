"""Kyvo v8.13 — the ONE rule for "which DexScreener pair is the real price of a coin" (same as pairs.js in the app).
1) match by exact token address (CA) + chain, never by symbol;
2) real pools with >= $1k liquidity win: highest liquidity USD, tie-break 24 h volume;
3) a launchpad curve pair (pump.fun / four.meme / Meteora DBC ..., no pool liquidity) only while there is no real pool
   (after a migration DexScreener keeps the dead curve pair with a frozen price);
4) dust pools (< $1k) only when nothing else exists."""
CURVE = {"pumpfun", "fourmeme", "meteoradbc", "launchlab", "boop", "believe", "moonit", "bonk", "letsbonk", "raydiumlaunchlab", "flapsh"}
MIN_LIQ = 1000


def liq(p: dict) -> float:
    return float(((p or {}).get("liquidity") or {}).get("usd") or 0)


def vol(p: dict) -> float:
    return float(((p or {}).get("volume") or {}).get("h24") or 0)


def is_curve(p: dict) -> bool:
    d = (p or {}).get("dexId") or ""
    return d in CURVE and not (liq(p) >= MIN_LIQ and d not in ("pumpfun", "fourmeme"))


def choose(ps: list[dict]) -> dict | None:
    ps = [p for p in ps or [] if p and p.get("baseToken")]
    if not ps: return None
    pools = sorted((p for p in ps if not is_curve(p) and liq(p) >= MIN_LIQ), key=lambda p: (-liq(p), -vol(p)))
    curves = sorted((p for p in ps if is_curve(p)), key=lambda p: -vol(p))
    if pools:
        top = pools[0]; cv = curves[0] if curves else None
        if not cv or liq(top) >= 5000 or vol(top) >= vol(cv): return top
        return cv
    if curves: return curves[0]
    return sorted(ps, key=lambda p: (-liq(p), -vol(p)))[0]


def best_map(pairs: list[dict], chain: str | None = None) -> dict[str, dict]:
    """{lowercase CA: best pair} for every base token in a DexScreener answer (optionally one chain only)."""
    g: dict[str, list] = {}
    for p in pairs or []:
        a = ((p or {}).get("baseToken") or {}).get("address")
        if not a or (chain and p.get("chainId") != chain): continue
        g.setdefault(((p.get("chainId") or "") + ":" if not chain else "") + a.lower(), []).append(p)
    return {k: choose(v) for k, v in g.items()}


def best(pairs: list[dict], chain: str, addr: str) -> dict | None:
    return choose([p for p in pairs or [] if p.get("chainId") == chain and ((p.get("baseToken") or {}).get("address") or "").lower() == addr.lower()])
