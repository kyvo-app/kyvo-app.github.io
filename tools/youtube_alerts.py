#!/usr/bin/env python3
"""Kyvo YouTube alerts -> Discord, via the channel's FREE public RSS feed (no API key, no quota).

Feed: https://www.youtube.com/feeds/videos.xml?channel_id=<id>   (default: @calytonnx = UCOVnFqOFnZu9U3xEdIU3MpA)
Posts each NEW video (also premieres/live streams, which appear in the feed) to every webhook that is set:
  DISCORD_WEBHOOK_YT, DISCORD_WEBHOOK_ANNOUNCE   (GitHub Secrets — never in the repo; missing -> skipped quietly)
First run only remembers the existing videos (no flood). State: .kyvo_calls/yt.json (kept in actions/cache).
Local test:  python3 tools/youtube_alerts.py --dry-run [--all]
"""
from __future__ import annotations
import argparse, json, os, sys, time, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

CHANNELS = [c.strip() for c in os.environ.get("YT_CHANNEL_IDS", "UCOVnFqOFnZu9U3xEdIU3MpA").split(",") if c.strip()]
UA = {"User-Agent": "kyvo-yt-alerts/8.2"}
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}

def fetch(url: str) -> bytes | None:
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r: return r.read()
        except Exception: time.sleep(2 * (i + 1))
    return None

def entries(channel_id: str) -> list[dict]:
    raw = fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + channel_id)
    if not raw: return []
    root = ET.fromstring(raw)
    author = root.findtext("a:title", default="YouTube", namespaces=NS)
    out = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", namespaces=NS)
        if not vid: continue
        thumb = e.find("media:group/media:thumbnail", NS)
        out.append({"id": vid, "title": e.findtext("a:title", default="", namespaces=NS), "author": author,
                    "url": f"https://www.youtube.com/watch?v={vid}", "published": e.findtext("a:published", default="", namespaces=NS),
                    "thumb": thumb.get("url") if thumb is not None else f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"})
    return out

def is_live(vid: str) -> bool:
    """Best effort: the public watch page says isLiveNow/isLive for live streams. Failure -> treated as a normal video."""
    html = fetch(f"https://www.youtube.com/watch?v={vid}") or b""
    return b'"isLiveNow":true' in html or b'"isLive":true' in html

def payload(v: dict, live: bool) -> dict:
    return {"username": "Kyvo · YouTube", "allowed_mentions": {"parse": []},
            "content": f"{'🔴 **LIVE**' if live else '🎬 Nowy film'}: **{v['author']}** — {v['url']}",
            "embeds": [{"title": v["title"][:250], "url": v["url"], "color": 0xFF0033 if live else 0xA78BFA,
                        "image": {"url": v["thumb"]}, "footer": {"text": "Kyvo · YouTube RSS"}, "timestamp": v["published"] or None}]}

def post(hook: str, body: dict) -> bool:
    data = json.dumps(body).encode()
    for _ in range(3):
        try:
            urllib.request.urlopen(urllib.request.Request(hook, data=data, headers={**UA, "Content-Type": "application/json"}, method="POST"), timeout=20).read()
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(3); continue
            print(f"webhook HTTP {e.code}", file=sys.stderr); return False   # never print the URL
        except Exception as e:
            print("webhook error", type(e).__name__, file=sys.stderr); return False
    return False

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true"); ap.add_argument("--all", action="store_true", help="dry-run: treat every feed item as new")
    ap.add_argument("--state", type=Path, default=Path(os.environ.get("KYVO_YT_STATE", ".kyvo_calls/yt.json")))
    a = ap.parse_args()
    hooks = [h for h in (os.environ.get("DISCORD_WEBHOOK_YT", "").strip(), os.environ.get("DISCORD_WEBHOOK_ANNOUNCE", "").strip()) if h]
    if not hooks and not a.dry_run:
        print("No DISCORD_WEBHOOK_YT / DISCORD_WEBHOOK_ANNOUNCE secret -> skipped."); return 0
    try: st = json.loads(a.state.read_text())
    except Exception: st = {}
    for ch in CHANNELS:
        items = entries(ch)
        seen = set(st.get(ch, []))
        first = ch not in st
        new = [v for v in items if (a.all or v["id"] not in seen)]
        print(f"[{ch}] feed items={len(items)} new={0 if first and not a.all else len(new)}{' (first run: remembered only)' if first and not a.all else ''}")
        if not (first and not a.all):
            for v in reversed(new[:5]):   # oldest first, max 5 per run
                body = payload(v, is_live(v["id"]))
                if a.dry_run: print(json.dumps(body, ensure_ascii=False, indent=1)); continue
                if all(post(h, body) for h in hooks): seen.add(v["id"])
                time.sleep(1)
        st[ch] = list(seen | ({v["id"] for v in items} if first else set()))[-200:]
    if not a.dry_run:
        a.state.parent.mkdir(parents=True, exist_ok=True); a.state.write_text(json.dumps(st))
    return 0

if __name__ == "__main__":
    sys.exit(main())
