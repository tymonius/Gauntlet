#!/usr/bin/env python3
"""Validate the v0.6.1 uniquely coded formal-playtest workflow."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "rules-assistant/migrations/0001_rules_interactions.sql",
    "rules-assistant/migrations/0002_playtest_sessions.sql",
    "rules-assistant/worker-v061.js",
    "rules-assistant/worker.test.mjs",
    "rules-assistant/wrangler.toml",
    "workers/playtest-sessions/wrangler.toml",
    "workers/playtest-sessions/package.json",
    "workers/playtest-sessions/README.md",
    "workers/playtest-sessions/src/index.js",
    "workers/playtest-sessions/src/index.test.mjs",
    "playtest/README.md",
    "playtest/index.html",
    "playtest/session/index.html",
    "playtest/session/styles.css",
    "playtest/session/app.js",
    "playtest/batch/index.html",
    "playtest/batch/styles.css",
    "playtest/batch/app.js",
    "package.json",
]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require_markers(relative: str, markers: list[str], errors: list[str]) -> None:
    text = read(relative)
    for marker in markers:
        if marker not in text:
            errors.append(f"{relative}: missing marker {marker!r}")


def main() -> int:
    errors: list[str] = []
    for relative in REQUIRED:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"Missing formal-playtest file: {relative}")
        elif path.stat().st_size == 0:
            errors.append(f"Empty formal-playtest file: {relative}")
    if errors:
        return fail(errors)

    require_markers(
        "rules-assistant/migrations/0002_playtest_sessions.sql",
        [
            "ALTER TABLE rules_interactions ADD COLUMN playtest_session_id TEXT",
            "ALTER TABLE rules_interactions ADD COLUMN sheet_serial TEXT",
            "CREATE TABLE IF NOT EXISTS playtest_sessions",
            "token_hash TEXT NOT NULL UNIQUE",
            "host_key_hash TEXT NOT NULL",
            "sheet_serial TEXT NOT NULL UNIQUE",
            "CREATE TABLE IF NOT EXISTS playtest_participants",
            "CREATE TABLE IF NOT EXISTS playtest_session_events",
            "CREATE TABLE IF NOT EXISTS playtest_arbiter_links",
            "FOREIGN KEY (interaction_id) REFERENCES rules_interactions(id)",
        ],
        errors,
    )

    require_markers(
        "rules-assistant/worker-v061.js",
        [
            'const RULES_VERSION = "v0.6.1"',
            "canonical v0.6.1 pre-release playtest edition",
            "The current v0.6.1 rules do not specify this clearly",
            "sanitizePlaytestContext(payload)",
            "playtest_session_id, sheet_serial",
            "linkFormalPlaytest",
            "INSERT OR IGNORE INTO playtest_arbiter_links",
            "Reveal and resolution are different timings",
        ],
        errors,
    )

    require_markers(
        "workers/playtest-sessions/src/index.js",
        [
            'const CURRENT_RULES_VERSION = "v0.6.1"',
            "SESSION_ADMIN_TOKEN",
            "sessionCreationConfigured",
            "tokenHash = await sha256(token)",
            "hostKeyHash = await sha256(hostKey)",
            "This session is closed",
            "Rules Arbiter interaction not found",
            "UPDATE rules_interactions SET playtest_session_id = ?, sheet_serial = ?",
            "ALLOWED_ORIGINS",
        ],
        errors,
    )

    require_markers(
        "playtest/session/index.html",
        [
            "Join session",
            "Ask the Rules Arbiter",
            "Close session",
            "Designed for review, not surveillance",
            "../../rules-assistant/widget.js",
        ],
        errors,
    )
    require_markers(
        "playtest/session/app.js",
        [
            'params.get("code")',
            'params.get("host")',
            "gauntlet_playtest_session_id",
            "installRulesInteractionLinker",
            "/arbiter",
            "game_started",
            "game_stopped",
            "game_completed",
        ],
        errors,
    )

    require_markers(
        "playtest/batch/index.html",
        [
            "Number of sheets",
            "Facilitator creation key",
            "Download host manifest",
            "Print all sheets",
            "qrcode@1.5.4",
        ],
        errors,
    )
    require_markers(
        "playtest/batch/app.js",
        [
            "Authorization",
            "Bearer ${adminToken}",
            "createQrCode(created.joinUrl)",
            "sensitive: true",
            "hostUrl",
            "sheetTemplate.cloneNode(true)",
        ],
        errors,
    )

    require_markers(
        "playtest/index.html",
        [
            'href="batch/"',
            'id="session-qr"',
            'id="sheet-serial"',
            "params.get('serial')",
            "params.get('qr')",
        ],
        errors,
    )

    session_toml = read("workers/playtest-sessions/wrangler.toml")
    rules_toml = read("rules-assistant/wrangler.toml")
    database_ids = re.findall(r'database_id\s*=\s*"([^"]+)"', session_toml)
    rules_database_ids = re.findall(r'database_id\s*=\s*"([^"]+)"', rules_toml)
    if not database_ids or database_ids != rules_database_ids:
        errors.append("Playtest session Worker must use the same D1 database as the Rules Arbiter")
    if 'main = "worker-v061.js"' not in rules_toml:
        errors.append("Rules Arbiter wrangler.toml does not deploy worker-v061.js")
    if "SESSION_ADMIN_TOKEN" in session_toml:
        errors.append("SESSION_ADMIN_TOKEN must be a Worker secret, not committed in wrangler.toml")
    if "ALLOWED_ORIGINS" not in session_toml:
        errors.append("Playtest session Worker is missing its allowed-origin list")

    batch_html = read("playtest/batch/index.html")
    if "integrity=" in batch_html and "qrcode" in batch_html:
        errors.append("QR library uses an unverified Subresource Integrity value")
    if 'type="password"' not in batch_html:
        errors.append("Facilitator creation key must use a password input")

    root_package = json.loads(read("package.json"))
    scripts = root_package.get("scripts") or {}
    for script in ("test:rules-assistant", "test:playtest-sessions", "test:deckbuilder"):
        if script not in scripts:
            errors.append(f"package.json is missing {script}")

    worker_package = json.loads(read("workers/playtest-sessions/package.json"))
    worker_scripts = worker_package.get("scripts") or {}
    for script in ("dev", "deploy", "db:migrate:local", "db:migrate:remote"):
        if script not in worker_scripts:
            errors.append(f"playtest session package is missing {script}")

    for relative in REQUIRED:
        if Path(relative).suffix.lower() not in {".js", ".mjs", ".html", ".css", ".md", ".sql", ".toml", ".json"}:
            continue
        text = read(relative)
        if "v0.6.0" in text:
            errors.append(f"{relative}: obsolete v0.6.0 label remains")

    if errors:
        return fail(errors)

    print(
        "Validated v0.6.1 formal playtest sessions: shared D1 migration, hashed credentials, "
        "authorized batch creation, unique sheet serials, QR rendering, join/close workflow, "
        "governing Rules Arbiter linkage, and automated tests."
    )
    return 0


def fail(errors: list[str]) -> int:
    print("Gauntlet v0.6.1 formal-playtest validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
