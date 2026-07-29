#!/usr/bin/env python3
"""Synchronize and validate the governing v0.6.1 Rules Arbiter sources.

The deployed v0.6.1 worker is intentionally separate from the retained legacy
worker. This script updates browser-facing version labels and validates the
v0.6.1 worker/configuration without rewriting the legacy administrative worker.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOVERNING_WORKER = ROOT / "rules-assistant" / "worker-v061.js"
WRANGLER = ROOT / "rules-assistant" / "wrangler.toml"
WIDGET = ROOT / "rules-assistant" / "widget.js"
LOCAL_SEARCH = ROOT / "rules-assistant" / "local-search.js"
VERSION = "v0.6.1"


def synchronize_browser_source(path: Path) -> str:
    text = path.read_text(encoding="utf-8").replace("v0.6.0", VERSION)
    path.write_text(text, encoding="utf-8")
    return text


def validate(worker: str, wrangler: str, widget: str, local_search: str) -> list[str]:
    errors: list[str] = []

    worker_markers = [
        'const RULES_VERSION = "v0.6.1"',
        "canonical v0.6.1 pre-release playtest edition",
        "const playtestContext = sanitizePlaytestContext(payload);",
        "playtest_session_id, sheet_serial",
        "record.playtestSessionId || null",
        "export function sanitizePlaytestContext(payload)",
        "INSERT OR IGNORE INTO playtest_arbiter_links",
    ]
    for marker in worker_markers:
        if marker not in worker:
            errors.append(f"Governing Rules Arbiter worker missing marker: {marker}")
    if "v0.6.0" in worker:
        errors.append("Governing Rules Arbiter worker still identifies v0.6.0")

    if 'main = "worker-v061.js"' not in wrangler:
        errors.append("rules-assistant/wrangler.toml does not deploy worker-v061.js")
    if 'SITE_ORIGIN = "https://gauntlet.run"' not in wrangler:
        errors.append("Rules Arbiter SITE_ORIGIN is not configured for gauntlet.run")

    browser_checks = {
        "rules-assistant/widget.js": (
            widget,
            ['version: "v0.6.1"', "playtestSessionId", "sheetSerial"],
        ),
        "rules-assistant/local-search.js": (
            local_search,
            [
                "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json",
                "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
            ],
        ),
    }
    for label, (text, markers) in browser_checks.items():
        if "v0.6.0" in text:
            errors.append(f"{label} still identifies v0.6.0")
        for marker in markers:
            if marker not in text:
                errors.append(f"{label} missing marker: {marker}")

    return errors


def main() -> int:
    try:
        worker = GOVERNING_WORKER.read_text(encoding="utf-8")
        wrangler = WRANGLER.read_text(encoding="utf-8")
        widget = synchronize_browser_source(WIDGET)
        local_search = synchronize_browser_source(LOCAL_SEARCH)
        errors = validate(worker, wrangler, widget, local_search)
    except OSError as exc:
        print(f"Rules Arbiter synchronization failed: {exc}", file=sys.stderr)
        return 1

    if errors:
        print("Rules Arbiter synchronization failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "Synchronized Rules Arbiter browser sources and validated the governing "
        "v0.6.1 worker, deployment configuration, and formal-playtest linkage."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
