#!/usr/bin/env python3
"""Validate the current v0.6.3 coded formal-playtest workflow."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "rules-assistant/migrations/0001_rules_interactions.sql",
    "rules-assistant/migrations/0002_review_export_checkpoints.sql",
    "rules-assistant/migrations/0003_playtest_sessions.sql",
    "rules-assistant/migrations/0004_event_game_sessions.sql",
    "rules-assistant/migrations/0005_tracked_playtests.sql",
    "rules-assistant/worker-entry.js",
    "rules-assistant/worker-v061.js",
    "rules-assistant/worker-v063.js",
    "rules-assistant/v063-public-corpus.js",
    "rules-assistant/local-search.js",
    "rules-assistant/wrangler.toml",
    "workers/playtest-sessions/wrangler.toml",
    "workers/playtest-sessions/package.json",
    "workers/playtest-sessions/README.md",
    "workers/playtest-sessions/src/index.js",
    "workers/playtest-sessions/src/index.test.mjs",
    "workers/playtest-sessions/src/tracked.js",
    "playtest/README.md",
    "playtest/index.html",
    "playtest/host/index.html",
    "playtest/host/create-event.js",
    "playtest/onboarding/index.html",
    "playtest/onboarding/app.js",
    "playtest/onboarding/app-core.js",
    "playtest/onboarding/identity-bridge.js",
    "playtest/onboarding/games.js",
    "playtest/session/index.html",
    "playtest/session/styles.css",
    "playtest/session/privacy.js",
    "playtest/session/app.js",
    "playtest/session/app-core.js",
    "playtest/session/event-game.js",
    "playtest/batch/index.html",
    "playtest/batch/styles.css",
    "playtest/batch/qrcode-loader.js",
    "playtest/batch/app.js",
    "playtest/tracked/index.html",
    "playtest/tracked/app.js",
    "scripts/test_v063_formal_session_e2e.mjs",
    "scripts/test_tracked_playtest_e2e.mjs",
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
        "rules-assistant/migrations/0003_playtest_sessions.sql",
        [
            "CREATE TABLE IF NOT EXISTS playtest_sessions",
            "token_hash TEXT NOT NULL UNIQUE",
            "host_key_hash TEXT NOT NULL",
            "sheet_serial TEXT NOT NULL UNIQUE",
            "rules_version TEXT NOT NULL",
            "CREATE TABLE IF NOT EXISTS playtest_participants",
            "CREATE TABLE IF NOT EXISTS playtest_session_events",
            "CREATE TABLE IF NOT EXISTS playtest_arbiter_links",
        ],
        errors,
    )
    require_markers(
        "rules-assistant/migrations/0004_event_game_sessions.sql",
        [
            "ADD COLUMN session_kind TEXT NOT NULL DEFAULT 'game'",
            "ADD COLUMN event_session_id TEXT",
            "ADD COLUMN identity_token_hash TEXT",
            "ADD COLUMN event_participant_id TEXT",
            "ADD COLUMN seat_index INTEGER",
            "ADD COLUMN participant_id TEXT",
            "ADD COLUMN playtest_participant_id TEXT",
        ],
        errors,
    )
    require_markers(
        "rules-assistant/migrations/0005_tracked_playtests.sql",
        [
            "CREATE TABLE IF NOT EXISTS playtest_session_results",
            "CREATE TABLE IF NOT EXISTS playtest_participant_responses",
            "CREATE TABLE IF NOT EXISTS playtest_public_creation_limits",
        ],
        errors,
    )

    require_markers(
        "rules-assistant/worker-entry.js",
        [
            'import v061Worker from "./worker-v061.js"',
            'import worker from "./worker-v063.js"',
            'if (requestedVersion === "v0.6.1") return v061Worker.fetch(request, env, context);',
            "return worker.fetch(request, env, context);",
        ],
        errors,
    )
    require_markers(
        "rules-assistant/worker-v063.js",
        [
            "current canonical v0.6.3 playtest edition",
            "certified v0.6.3 source passages",
            "V063_RULES_VERSION",
            "v063-public-corpus.js",
        ],
        errors,
    )
    require_markers(
        "rules-assistant/local-search.js",
        [
            'releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json',
            'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md',
            'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.pdf',
            'buildLocalFallbackAnswer(query, results, version = "v0.6.3")',
        ],
        errors,
    )

    require_markers(
        "workers/playtest-sessions/src/index.js",
        [
            'const CURRENT_RULES_VERSION = "v0.6.3"',
            'const GAME_SERIAL_PREFIX = "G063"',
            'const EVENT_SERIAL_PREFIX = "EV063"',
            'const SERIAL_PATTERN = /^G063-',
            "SESSION_ADMIN_TOKEN",
            "sessionCreationConfigured",
            "eventGamesSupported",
            "playerAttributionSupported",
            "event_session_id",
            "seat_index",
            "/games",
            "event-participants",
            "playtest_participant_id",
            "This session is closed",
            "Rules Arbiter interaction not found",
            "ALLOWED_ORIGINS",
        ],
        errors,
    )
    session_worker = read("workers/playtest-sessions/src/index.js")
    if 'const CURRENT_RULES_VERSION = "v0.6.1"' in session_worker:
        errors.append("playtest session Worker still declares v0.6.1 as current")
    if "G061-${randomCode" in session_worker:
        errors.append("playtest session Worker still generates G061 serials for new sessions")

    require_markers(
        "workers/playtest-sessions/src/tracked.js",
        [
            'const CURRENT_RULES_VERSION = "v0.6.3"',
            'const serial = `G063-${randomCode(8)}`',
            "trackedPlaytestsSupported: true",
            "automaticTrackedClosureSupported: true",
            "rulesVersion: CURRENT_RULES_VERSION",
        ],
        errors,
    )
    tracked_worker = read("workers/playtest-sessions/src/tracked.js")
    if 'const CURRENT_RULES_VERSION = "v0.6.1"' in tracked_worker:
        errors.append("tracked playtest Worker still declares v0.6.1 as current")
    if "G061-${randomCode" in tracked_worker:
        errors.append("tracked playtest Worker still generates G061 serials")

    require_markers(
        "playtest/host/create-event.js",
        [
            'const CURRENT_RULES_VERSION = "v0.6.3"',
            'rulesVersion: CURRENT_RULES_VERSION',
            'sessionKind: "event"',
        ],
        errors,
    )
    require_markers(
        "playtest/batch/app.js",
        [
            'rulesVersion: "v0.6.3"',
            'health.version !== "v0.6.3"',
            "gauntlet-v063-playtest-batch-",
            "createQrCode(created.joinUrl)",
            "sensitive: true",
        ],
        errors,
    )
    require_markers(
        "playtest/batch/index.html",
        [
            "Gauntlet v0.6.3 formal playtest sheets",
            'app.js?v=20260816-1',
            'name="referrer" content="no-referrer"',
            'name="robots" content="noindex, nofollow"',
            "Download host manifest",
        ],
        errors,
    )
    require_markers(
        "playtest/host/index.html",
        [
            'create-event.js?v=20260816-1',
            "Host Home",
        ],
        errors,
    )
    require_markers(
        "playtest/index.html",
        [
            "Gauntlet v0.6.3 Playtest Sheet",
            "Official v0.6.3 human-playtest questionnaire",
            'id="session-qr"',
            'id="sheet-serial"',
        ],
        errors,
    )

    require_markers(
        "playtest/onboarding/identity-bridge.js",
        [
            'purpose: "onboarding"',
            "participantToken",
            "gauntlet_event_identity_",
        ],
        errors,
    )
    require_markers(
        "playtest/onboarding/games.js",
        [
            "/games",
            "Create table codes",
            "Both players scan this code",
            "Download table manifest",
        ],
        errors,
    )
    require_markers(
        "playtest/session/app-core.js",
        [
            "el.rulesVersion.textContent = session.rulesVersion",
            "storeFormalContext(session)",
            "installRulesInteractionLinker",
            "/arbiter",
        ],
        errors,
    )
    require_markers(
        "playtest/session/event-game.js",
        [
            "eventSessionId",
            "event-participants",
            "eventParticipantId",
            "participantToken",
            "seatIndex",
        ],
        errors,
    )
    require_markers(
        "playtest/tracked/app.js",
        [
            'api("/api/tracked-games"',
            "storeRulesContext()",
            "installRulesInteractionLinker()",
        ],
        errors,
    )

    require_markers(
        "scripts/test_v063_formal_session_e2e.mjs",
        [
            'version: "v0.6.3"',
            'rulesVersion: "v0.6.3"',
            "/^EV063-",
            "/^G063-",
            'body: { rulesVersion: "v0.6.1" }',
            'legacyRead.rulesVersion, "v0.6.1"',
            'legacyRead.sheetSerial, "G061-LEGACY1"',
        ],
        errors,
    )
    require_markers(
        "scripts/test_tracked_playtest_e2e.mjs",
        [
            'health.version, "v0.6.3"',
            'created.rulesVersion, "v0.6.3"',
            "/^G063-",
            "'v0.6.3', 'explicit'",
            'title: "v0.6.3 Rulebook"',
        ],
        errors,
    )

    session_toml = read("workers/playtest-sessions/wrangler.toml")
    rules_toml = read("rules-assistant/wrangler.toml")
    database_ids = re.findall(r'database_id\s*=\s*"([^"]+)"', session_toml)
    rules_database_ids = re.findall(r'database_id\s*=\s*"([^"]+)"', rules_toml)
    if not database_ids or database_ids != rules_database_ids:
        errors.append("Playtest session Worker must use the same D1 database as the Rules Arbiter")
    if 'main = "worker-entry.js"' not in rules_toml:
        errors.append("Rules Arbiter wrangler.toml must deploy the integrated worker-entry.js wrapper")
    if 'main = "src/completeness.js"' not in session_toml:
        errors.append("Playtest session wrangler.toml must deploy the complete production Worker chain")
    if "SESSION_ADMIN_TOKEN" in session_toml:
        errors.append("SESSION_ADMIN_TOKEN must be a Worker secret, not committed in wrangler.toml")
    if "ALLOWED_ORIGINS" not in session_toml:
        errors.append("Playtest session Worker is missing its allowed-origin list")

    session_html = read("playtest/session/index.html")
    batch_html = read("playtest/batch/index.html")
    for relative, html in (("playtest/session/index.html", session_html), ("playtest/batch/index.html", batch_html)):
        if "googletagmanager" in html or "gtag(" in html:
            errors.append(f"{relative}: private formal-playtest page must not load analytics")
    if "cdn.jsdelivr.net/npm/qrcode" in batch_html:
        errors.append("QR library must be deferred through the local privacy-preserving loader")
    if 'type="password"' not in batch_html:
        errors.append("Facilitator creation key must use a password input")

    root_package = json.loads(read("package.json"))
    scripts = root_package.get("scripts") or {}
    required_scripts = [
        "governance:check",
        "test:rules-assistant",
        "test:playtest-sessions",
        "test:formal-session-e2e",
        "test:tracked-session-e2e",
        "test:deckbuilder",
    ]
    for script in required_scripts:
        if script not in scripts:
            errors.append(f"package.json is missing {script}")
    if "test_v063_formal_session_e2e.mjs" not in scripts.get("test:formal-session-e2e", ""):
        errors.append("test:formal-session-e2e does not target the v0.6.3 end-to-end test")
    if "test_tracked_playtest_e2e.mjs" not in scripts.get("test:tracked-session-e2e", ""):
        errors.append("test:tracked-session-e2e does not target the tracked end-to-end test")

    worker_package = json.loads(read("workers/playtest-sessions/package.json"))
    worker_scripts = worker_package.get("scripts") or {}
    for script in ("dev", "deploy", "db:migrate:local", "db:migrate:remote"):
        if script not in worker_scripts:
            errors.append(f"playtest session package is missing {script}")

    if errors:
        return fail(errors)

    print(
        "Validated v0.6.3 formal and tracked playtest sessions: current runtime versioning, G063/EV063 serials, "
        "event-scoped onboarding, public tracked games, two-seat sessions, player-attributed Rules Arbiter linkage, "
        "current browser fallback sources, privacy-safe QR rendering, and explicit legacy-read compatibility."
    )
    return 0


def fail(errors: list[str]) -> int:
    print("Gauntlet v0.6.3 formal-playtest validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
