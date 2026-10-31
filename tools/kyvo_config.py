"""Kyvo v8.25 — ONE place for the public app address used by every server tool (push deep links, Discord embeds, User-Agent).
Override with the env var KYVO_APP_URL (e.g. a repo variable in the workflow). Default: the new home https://kyvo-app.github.io/."""
import os

APP_URL = (os.environ.get("KYVO_APP_URL") or "https://kyvo-app.github.io/").rstrip("/") + "/"
REPO_URL = os.environ.get("KYVO_REPO_URL") or "https://github.com/kyvo-app/kyvo-app.github.io"

def ua(name: str, ver: str) -> str:
    return f"Mozilla/5.0 ({name}/{ver}; +{APP_URL})"
