#!/usr/bin/env python3
"""Kyvo v8.25 — conflict-safe commit + push for the data files shared by the kyvo-push loop and kyvo-calls.

data/track_record.json and data/flag_history.json are written by BOTH workflows (loop = new flags, kyvo-calls = performance).
A plain `pull --rebase` on a one-line JSON file conflicts whenever both changed it, and "ours wins" would silently drop the
other side's work. Here a conflicting JSON file is MERGED (tools/track_record.merge_docs / merge_history: union of coins,
first flag = earliest, performance = freshest); every other feed file keeps the old rule (our fresh copy wins).
Usage (kyvo-calls):  python3 tools/git_sync.py -m "track record: update [skip ci]" data/track_record.json
Library (kyvo_loop): from git_sync import commit_files
"""
from __future__ import annotations
import argparse, json, os, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from track_record import merge_docs, merge_history  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MERGERS = {"data/track_record.json": merge_docs, "data/flag_history.json": merge_history}

def git(*a) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True)

def _merge_into_worktree(keep: dict[str, bytes]) -> None:
    """worktree = origin's files now; write ours back (JSON-merged where a merger exists)."""
    for f, b in keep.items():
        p = ROOT / f
        if f in MERGERS and p.exists():
            try:
                theirs = json.loads(p.read_text()); ours = json.loads(b.decode())
                p.write_text(json.dumps(MERGERS[f](ours, theirs), ensure_ascii=False, separators=(",", ":"))); continue
            except Exception as e:  # noqa: BLE001  unreadable copy -> ours (fresh) wins, like before
                print(f"git_sync: merge of {f} failed ({type(e).__name__}) -> using ours", flush=True)
        p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(b)

def commit_files(files: list[str], msg: str, tries: int = 4, log=print) -> bool:
    files = [f for f in files if (ROOT / f).exists()]
    if not files: return False
    git("add", *files)
    if git("diff", "--cached", "--quiet").returncode == 0: return False
    git("commit", "-q", "-m", msg)
    branch = os.environ.get("GITHUB_REF_NAME") or "main"
    keep = {f: (ROOT / f).read_bytes() for f in files}
    for i in range(tries):
        pr = git("pull", "--rebase", "-q", "origin", branch)
        if pr.returncode != 0:      # both sides touched a file -> take origin, re-apply ours (JSON-merged for the shared files)
            git("rebase", "--abort"); git("fetch", "-q", "origin", branch); git("reset", "-q", "--hard", f"origin/{branch}")
            _merge_into_worktree(keep)
            git("add", *files)
            if git("diff", "--cached", "--quiet").returncode == 0: return False
            git("commit", "-q", "-m", msg)
            log(f"git_sync: rebase conflict -> merged {', '.join(f for f in files if f in MERGERS) or 'feeds'} with origin")
        if git("push", "-q", "origin", f"HEAD:{branch}").returncode == 0:
            log(f"committed + pushed: {msg}"); return True
        time.sleep(4 * (i + 1))
    log(f"push failed {tries}x -> will retry at the next commit slot"); return False

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("-m", "--message", required=True)
    ap.add_argument("files", nargs="+")
    a = ap.parse_args()
    commit_files(a.files, a.message)
    return 0

if __name__ == "__main__":
    sys.exit(main())
