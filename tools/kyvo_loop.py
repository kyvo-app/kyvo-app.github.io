#!/usr/bin/env python3
"""Kyvo v8.12 — continuous feed loop for the kyvo-push GitHub Action (runs on GitHub's servers only, never on the trading VPS).

GitHub fires "*/5" schedules only every ~30–40 min in practice, so one workflow run now keeps working for ~50 min:
  * every SCAN_EVERY  (~90 s): Runner scan  -> .kyvo_push/flags.json + data/kol_live.json (👑 KOL / 🚀 Moon / 📈 Big runner)
  * every TWEET_EVERY (~2.5 min, v8.10): New Tweet feed -> data/x_live.json (FxTwitter, ~43 accounts, 2 at a time, ≤ ~3 min)
  * every GOLD_EVERY (~5 min, v8.12): 🥇 Gold feed -> data/gold.json (tools/gold.py: DD verdict for ~14 hot coins, news,
    KOL tweets; runs in the background like x_live, stops itself at ~200 s) + .kyvo_push/gold_alerts.json for the push step
  * every PF_EVERY (~6 min, v8.14): pump.fun callouts + top-trader trades for hot coins -> data/pf_social.json
    (tools/pump_social.py, public pump.fun reads; the app cannot call pump.fun itself because of CORS). Rides along in
    feed commits; on its own it only marks a commit when nothing else changed for a while (low priority).
  * every TK_EVERY (~4 min, v8.14): 👀 Tracker — top Ranking wallets' public pump.fun trades -> data/tracker_feed.json
    (tools/pump_tracker.py; ≥3 top traders buying one coin in 30 min -> Premium push via smart_alerts.json + kyvo_push.py).
  * every GTA_EVERY (~4 min, v8.31): 🎮 GTA 6 detector -> .kyvo_push/gta_alerts.json (tools/gta_push.py: 8 DexScreener
    searches + 1 batch, GTA coins that run now) -> '🎮 GTA' pushes in kyvo_push.py (free, tag "gta", rate-limited there)
  * v8.35: right after every scan tools/holders.py refreshes data/holders.json (👥 RugCheck holders / top-10 % without pools, ≤ 12
    calls per run, cached) -> runner2.py drops ⚠️ flagged coins, kyvo_push.py tags Runner / Early pushes, the app shows ⚠️ 'mało holderów'
  * v8.36: after every scan tools/coin_checks.py runs in the background -> data/coin_checks.json (🧪 bundle / wallet-factory check
    of the top 20 holders via public Solana RPC, ≤ 3 coins per run, cached 6 h; fake volume = avg trade; whale / dev sells, news and
    ticker copies as events for the app's 'Pilnuj moich coinów' watchlist alerts — matched in the browser, no per-user push)
  * v8.34: right after every scan tools/runner2.py builds data/runner2.json (🚀 Runner 2.0 = Runner / Early coins that pass the
    v8.34 filters; young coins re-checked 30–60 min later) -> '🚀 Runner 2.0' pushes in kyvo_push.py (type runner2, tag runner2)
  * v8.25: right after every scan the scan's flags are merged into data/track_record.json (tools/track_record.py --merge-only;
    the loop is the only writer of NEW flags, kyvo-calls only updates performance) + data/flag_history.json (audit log);
    commits go through tools/git_sync.py, which JSON-merges the shared files on a push race instead of overwriting them
  * after every step: OneSignal push for genuinely new items (tools/kyvo_push.py: sent-ids dedupe + free 2/day cap)
  * data commits only when a feed's CONTENT changed (new tweet / new flag) or as a 30-min heartbeat, at most one commit per
    COMMIT_GAP (3 min) and at most COMMIT_MAX_H (7) per rolling hour — GitHub Pages (branch build) has a soft limit of
    10 builds/hour shared with the other workflows. Push = pull --rebase with retries; on a conflict our two feed files win.
The steps run as child processes (same scripts as before), so a crash in one step never stops the loop.
Local test:  python3 tools/kyvo_loop.py --max-min 4 --dry-run --no-git
"""
from __future__ import annotations
import argparse, json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEEDS = ["data/x_live.json", "data/kol_live.json", "data/gold.json", "data/pf_social.json", "data/tracker_feed.json",
         "data/early_shadow.json",   # v8.24 early-rule shadow log (rides along with the normal feed commits, never its own commit)
         "data/track_record.json", "data/flag_history.json",
         "data/gta_added.json",
         "data/runner2.json", "data/holders.json", "data/coin_checks.json"]   # v8.34 🚀 Runner 2.0 list (tools/runner2.py after every scan; runtime file, rides along with the feed commits)   # v8.32 🎮 GTA '📈 od dodania' reference (runtime file, rides along with the feed commits)   # v8.25: every flag saved right after the scan (git_sync merges races)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import git_sync  # noqa: E402  v8.25 conflict-safe commits (JSON merge for track_record / flag_history)

def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)

def run(cmd: list[str], env_extra: dict | None = None, timeout: int = 240) -> dict:
    """run a step; returns its GITHUB_OUTPUT key=values (commit / kol_commit)."""
    fd, outp = tempfile.mkstemp(prefix="kyvo_gho_"); os.close(fd)
    env = dict(os.environ, GITHUB_OUTPUT=outp, **(env_extra or {}))
    t = time.time()
    try:
        r = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True, timeout=timeout)
        tail = (r.stdout or "").strip().splitlines()[-3:]
        log(f"{Path(cmd[1]).name} rc={r.returncode} {time.time() - t:.0f}s |", " / ".join(tail)[:300])
        if r.returncode and r.stderr: log("  stderr:", r.stderr.strip().splitlines()[-1][:200])
    except subprocess.TimeoutExpired:
        log(f"{Path(cmd[1]).name} TIMEOUT after {timeout}s")
    out = {}
    try:
        for line in Path(outp).read_text().splitlines():
            if "=" in line: k, v = line.split("=", 1); out[k.strip()] = v.strip()
    except Exception: pass
    Path(outp).unlink(missing_ok=True)
    return out

class Bg:
    """v8.9: the New Tweet read (~1.5–2 min: ~24 accounts at 1 req/s) runs NEXT TO the Runner scan, so scans keep their ~90-s pace."""
    def __init__(self, cmd: list[str], env_extra: dict | None = None):
        fd, self.outp = tempfile.mkstemp(prefix="kyvo_gho_"); os.close(fd)
        fd, self.logp = tempfile.mkstemp(prefix="kyvo_bg_"); os.close(fd)   # v8.12: file, not a pipe (a full pipe would block the child)
        self.t = time.time(); self.cmd = cmd; self.lf = open(self.logp, "w")
        self.p = subprocess.Popen(cmd, cwd=ROOT, env=dict(os.environ, GITHUB_OUTPUT=self.outp, KYVO_LIVE_GT_BUDGET=os.environ.get("KYVO_LIVE_GT_BUDGET", "5"), **(env_extra or {})), stdout=self.lf, stderr=subprocess.STDOUT, text=True)
    def done(self) -> bool:
        if self.p.poll() is None and time.time() - self.t > 230: self.p.kill()   # v8.10: x_live stops itself at ~175 s
        return self.p.poll() is not None
    def result(self) -> dict:
        self.lf.close()
        try: out_txt = Path(self.logp).read_text(errors="replace")
        except Exception: out_txt = ""
        Path(self.logp).unlink(missing_ok=True)
        tail = out_txt.strip().splitlines()[-2:]
        log(f"{Path(self.cmd[1]).name} rc={self.p.returncode} {time.time() - self.t:.0f}s |", " / ".join(tail)[:300])
        out = {}
        try:
            for line in Path(self.outp).read_text().splitlines():
                if "=" in line: k, v = line.split("=", 1); out[k.strip()] = v.strip()
        except Exception: pass
        Path(self.outp).unlink(missing_ok=True)
        return out

def git(*a, check=False) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, check=check)

def commit_feeds(msg: str) -> bool:
    """v8.25: tools/git_sync.commit_files — on a push race the shared JSON files are merged with origin, never overwritten."""
    return git_sync.commit_files(FEEDS, msg, log=log)

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-min", type=float, default=50)
    ap.add_argument("--scan-every", type=float, default=90)
    ap.add_argument("--tweet-every", type=float, default=150)
    ap.add_argument("--gold-every", type=float, default=300, help="v8.12 🥇 Gold feed refresh (s); 0 = off")
    ap.add_argument("--pf-every", type=float, default=360, help="v8.14 pump.fun callouts/traders refresh (s); 0 = off")
    ap.add_argument("--tk-every", type=float, default=240, help="v8.14 Tracker feed refresh (s); 0 = off")
    ap.add_argument("--gta-every", type=float, default=240, help="v8.31 🎮 GTA 6 detector refresh (s); 0 = off")
    ap.add_argument("--commit-gap", type=float, default=180)
    ap.add_argument("--commit-max-h", type=int, default=7)
    ap.add_argument("--heartbeat", type=float, default=1800, help="commit refreshed metrics at least this often (s) even without new items")
    ap.add_argument("--state-dir", default=".kyvo_push")
    ap.add_argument("--dry-run", action="store_true", help="push step prints payloads, nothing is sent; no git")
    ap.add_argument("--no-git", action="store_true")
    a = ap.parse_args()
    sd = ROOT / a.state_dir; sd.mkdir(parents=True, exist_ok=True)
    lt = sd / "loop.json"                      # commit times survive between steps/runs (actions/cache)
    try: ls = json.loads(lt.read_text())
    except Exception: ls = {}
    commits = [t for t in ls.get("commits", []) if time.time() - t < 3600]
    last_commit = ls.get("last_commit", 0)
    py = sys.executable; end = time.time() + a.max_min * 60
    next_scan = next_tw = time.time(); pending = []; n_scan = n_tw = n_gold = 0
    next_gold = time.time() + 40                # v8.12: let the first Runner scan / tweet read start first (GeckoTerminal ~30 req/min)
    use_git = not (a.dry_run or a.no_git) and shutil.which("git")
    r2_out = f"{a.state_dir}/runner2.json" if a.dry_run else "data/runner2.json"   # v8.34 🚀 Runner 2.0 (dry run: never touches data/)
    hold_out = f"{a.state_dir}/holders.json" if a.dry_run else "data/holders.json"  # v8.35 👥 holder check
    cc_out = f"{a.state_dir}/coin_checks.json" if a.dry_run else "data/coin_checks.json"  # v8.36 🧪 bundle / fake volume / watch events
    push_cmd = [py, "tools/kyvo_push.py", "--flags", f"{a.state_dir}/flags.json", "--state", f"{a.state_dir}/sent.json", "--smart", f"{a.state_dir}/smart_alerts.json",
                "--gta", f"{a.state_dir}/gta_alerts.json", "--runner2", r2_out, "--holders", hold_out, "--checks", cc_out] + (["--dry-run"] if a.dry_run else [])
    tw = None; gd = None; pf = None; n_pf = 0; tk = None; n_tk = 0
    next_tk = time.time() + 40
    gt = None; n_gt = 0; next_gt = time.time() + 20      # v8.31 🎮 GTA detector (~5 s, DexScreener only)
    cc = None; n_cc = 0                                  # v8.36 🧪 coin checks (background, ≤ ~45 s, public RPC)
    next_pf = time.time() + 75                  # v8.14: after the first scan + gold start
    while time.time() < end - 20 or tw is not None or gd is not None or pf is not None or tk is not None or gt is not None or cc is not None:
        did = False
        if cc is not None and cc.done():
            o = cc.result(); cc = None
            if o.get("checks_new") == "true" and not pending and time.time() - last_commit > 900: pending.append("coin checks")
        if gt is not None and gt.done():
            gt.result(); gt = None; did = True
        if a.gta_every > 0 and gt is None and time.time() >= next_gt and time.time() < end - 60:
            next_gt = time.time() + a.gta_every; n_gt += 1
            gt = Bg([py, "tools/gta_push.py", "--out", f"{a.state_dir}/gta_alerts.json", "--state", f"{a.state_dir}/sent.json"]
                    + ([] if a.dry_run else ["--added", "data/gta_added.json"]))   # v8.32 first-seen reference (not in dry runs)
        if tk is not None and tk.done():
            o = tk.result(); tk = None
            if o.get("tracker_commit") == "true" and not pending and time.time() - last_commit > 900: pending.append("tracker feed")
        if a.tk_every > 0 and tk is None and time.time() >= next_tk and time.time() < end - 200:
            next_tk = time.time() + a.tk_every; n_tk += 1
            tk = Bg([py, "tools/pump_tracker.py", "--state-dir", a.state_dir] + (["--dry-run"] if a.dry_run else []))
        if pf is not None and pf.done():
            o = pf.result(); pf = None
            if o.get("pf_commit") == "true" and not pending and time.time() - last_commit > 900: pending.append("pump.fun callouts")
        if a.pf_every > 0 and pf is None and time.time() >= next_pf and time.time() < end - 200:
            next_pf = time.time() + a.pf_every; n_pf += 1
            pf = Bg([py, "tools/pump_social.py", "--state-dir", a.state_dir] + (["--dry-run"] if a.dry_run else []))
        if gd is not None and gd.done():
            o = gd.result(); gd = None; did = True
            if o.get("gold_commit") == "true": pending.append("gold")
        if a.gold_every > 0 and gd is None and time.time() >= next_gold and time.time() < end - 240:
            next_gold = time.time() + a.gold_every; n_gold += 1
            gd = Bg([py, "tools/gold.py", "--state-dir", a.state_dir] + (["--dry-run"] if a.dry_run else []), env_extra={"KYVO_FACT_CACHE": f"{a.state_dir}/facts"})
        if tw is not None and tw.done():
            o = tw.result(); tw = None; did = True
            if o.get("commit") == "true": pending.append("new tweets")
        if tw is None and time.time() >= next_tw and time.time() < end - 180:
            next_tw = time.time() + a.tweet_every; n_tw += 1
            tw = Bg([py, "tools/x_live.py"])
        if time.time() >= next_scan and time.time() < end - 45:
            next_scan = time.time() + a.scan_every; n_scan += 1
            o = run([py, "tools/discord_calls.py", "--flags-out", f"{a.state_dir}/flags.json", "--kol-out", "data/kol_live.json", "--early-out", "data/early_shadow.json",
                     "--audit-out", f"{a.state_dir}/audit.json"],
                    env_extra={"KYVO_CALLS_STATE": f"{a.state_dir}/calls_state.json", "KYVO_FACT_CACHE": f"{a.state_dir}/facts",
                               "KYVO_LEG2_CACHE": f"{a.state_dir}/leg2_shapes.json"}, timeout=300)   # v8.25: headroom for the cap-15 prefilter + leg2
            if o.get("kol_commit") == "true": pending.append("runner coins")
            # v8.25 item 1: every flag of this scan goes into data/track_record.json NOW (first flag kept, no network) + audit log;
            # + the Cloudflare worker's recent flags when KYVO_WORKER_FLAGS_URL is set (empty by default = off)
            t = run([py, "tools/track_record.py", "--merge-only", "--flags", f"{a.state_dir}/flags.json", "--out", "data/track_record.json",
                     "--history", "data/flag_history.json", "--audit", f"{a.state_dir}/audit.json"], timeout=60)
            if (t.get("track_new") or "0") not in ("", "0"): pending.append("new flags")
            hd = run([py, "tools/holders.py", "--flags", f"{a.state_dir}/flags.json", "--out", hold_out],
                     env_extra={"KYVO_FACT_CACHE": f"{a.state_dir}/facts"}, timeout=60)   # v8.35 👥 before Runner 2.0 (it drops ⚠️ coins)
            if hd.get("holders_new") == "true" and not pending and time.time() - last_commit > 900: pending.append("holders")
            r2 = run([py, "tools/runner2.py", "--flags", f"{a.state_dir}/flags.json", "--out", r2_out, "--state", f"{a.state_dir}/runner2_state.json",
                      "--holders", hold_out, "--checks", cc_out], timeout=60)
            if r2.get("runner2_new") == "true": pending.append("runner 2.0")
            if cc is None and time.time() < end - 90:   # v8.36 🧪 next to the loop (public RPC is slow), never blocks the next scan
                n_cc += 1
                cc = Bg([py, "tools/coin_checks.py", "--runner2", r2_out, "--out", cc_out, "--state", f"{a.state_dir}/coin_checks_state.json"],
                        env_extra={"KYVO_FACT_CACHE": f"{a.state_dir}/facts"})   # dry run: cc_out is in state_dir, data/ untouched
            did = True
        if did: run(push_cmd, timeout=120)
        now = time.time(); commits = [t for t in commits if now - t < 3600]
        due = bool(pending) or (now - last_commit >= a.heartbeat)
        if use_git and due and now - last_commit >= a.commit_gap and len(commits) < a.commit_max_h:
            msg = "feeds: " + (", ".join(dict.fromkeys(pending)) if pending else "refresh") + " [kyvo-loop]"
            if commit_feeds(msg): commits.append(now)
            last_commit = now; pending = []            # also after "nothing to commit" -> no hot loop
            lt.write_text(json.dumps({"commits": commits, "last_commit": last_commit}))
        wait = min(next_scan, next_tw, next_gold if a.gold_every > 0 else next_scan) - time.time()
        if a.pf_every > 0: wait = min(wait, next_pf - time.time())
        if a.tk_every > 0: wait = min(wait, next_tk - time.time())
        if a.gta_every > 0: wait = min(wait, next_gt - time.time())
        if tw is not None or gd is not None or pf is not None or tk is not None or gt is not None or cc is not None: wait = min(wait, 3)
        if wait > 0: time.sleep(min(wait, max(1, end - time.time())))
        if time.time() >= end - 20 and tw is None and gd is None and pf is None and tk is None and gt is None and cc is None: break
    log(f"loop done: {n_scan} scans, {n_tw} tweet reads, {n_gold} gold runs, {n_pf} pump.fun reads, {n_tk} tracker reads, {n_gt} gta reads, {len(commits)} commits in the last hour, pending={pending}")
    if use_git and pending and len(commits) < a.commit_max_h + 1:   # leave nothing important uncommitted for the next run
        if commit_feeds("feeds: " + ", ".join(dict.fromkeys(pending)) + " [kyvo-loop]"): commits.append(time.time()); last_commit = time.time()
    lt.write_text(json.dumps({"commits": commits, "last_commit": last_commit}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
