#!/usr/bin/env bash
# Smart money + leaderboard only (no X). For X see update_x_viral.md
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/build_snapshots.py "$@"
echo "Next: refresh Viral per tools/update_x_viral.md then: python3 tools/update_x_viral.py --stamp"
