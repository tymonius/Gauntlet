#!/usr/bin/env python3
"""Validate the current v0.7.1 playtest workflow and location-aware self-serve playtest contract."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "rules-assistant/migrations/0003_playtest_sessions.sql",
    "rules-assistant/migrations/0004_event_game_sessions.sql",
    "rules-assistant/migrations/0005_tracked_playtests.sql",
    "rules-assistant/migrations/0010_playtest_decision_experience.sql",
    "workers/playtest-sessions/wrangler.toml",
    "workers/playtest-sessions/src/index.js",
    "workers/playtest-sessions/src/tracked.js",
    "workers/playtest-sessions/src/analysis.js",
    "playtest/index.html",
    "playtest/portal.css",
    "playtest/sheet/index.html",
    "playtest/tracked/index.html",
    "playtest/tracked/app.js",
    "playtest/tracked/styles.css",
    "playtest/session/index.html",
    "playtest/onboarding/index.html",
    "playtest/guide/index.html",
    "playtest/player-mat/index.html",
    "start/index.html",
    "start/app.js",
    "scripts/test_v063_formal_session_e2e.mjs",
    "scripts/test_tracked_playtest_e2e.mjs",
]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

def require(path: str, markers: list[str], errors: list[str]) -> None:
    text = read(path)
    for marker in markers:
        if marker not in text:
            errors.append(f"{path}: missing marker {marker!r}")

def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED:
        p = ROOT / rel
        if not p.is_file() or p.stat().st_size == 0:
            errors.append(f"Missing or empty current-playtest file: {rel}")
    if errors:
        return fail(errors)

    require("workers/playtest-sessions/src/index.js", [
        'const CURRENT_RULES_VERSION = "v0.7.1"',
        'const GAME_SERIAL_PREFIX = "G071"',
        'const EVENT_SERIAL_PREFIX = "EV071"',
        'const SERIAL_PATTERN = /^G071-',
        "SESSION_ADMIN_TOKEN",
        "eventGamesSupported",
        "playerAttributionSupported",
    ], errors)
    require("workers/playtest-sessions/src/tracked.js", [
        'const CURRENT_RULES_VERSION = "v0.7.1"',
        'const serial = `G071-${randomCode(8)}`',
        'const MYSTICS_STARTER_RITES = Object.freeze({',
        'playMode',
        '"diagnostic_flag"',
        '"feels_decided"',
        '"no_meaningful_option"',
        'felt_decided_when',
        'agency_after_decided',
        'decisive_cause',
        'CREATION_LIMIT_PER_DAY',
    ], errors)
    require("rules-assistant/migrations/0010_playtest_decision_experience.sql", [
        "felt_decided_when",
        "agency_after_decided",
        "decisive_cause",
        "selection_reason",
    ], errors)
    require("playtest/index.html", [
        "Self-serve playtesting · canonical v0.7.1",
        "Start a self-serve playtest",
        "Together in person",
        "Playing remotely",
        'mode=physical',
        'mode=tts',
    ], errors)
    require("playtest/sheet/index.html", [
        "Gauntlet Playtest Sheet",
    ], errors)
    require("playtest/tracked/index.html", [
        'id="createPlayMode"',
        "Together in person — physical tabletop",
        "Remotely — Tabletop Simulator",
        'id="transportPanel"',
        'data-diagnostic-flag="feels_decided"',
        'data-diagnostic-flag="no_meaningful_option"',
        'id="createSelectionReason"',
        'id="joinSelectionReason"',
        'id="feltDecidedWhen"',
        'id="agencyAfterDecided"',
        "3790840635",
        "v0.7.1",
    ], errors)
    require("playtest/tracked/app.js", [
        "requestedPlayMode",
        "renderTransport",
        "recordDiagnostic",
        'eventType: "diagnostic_flag"',
        "feltDecidedWhen",
        "agencyAfterDecided",
        "decisiveCause",
        "selectionReason",
    ], errors)
    require("start/app.js", [
        'new URL("../playtest/tracked/"',
        'url.searchParams.set("mode"',
        'if (mode === "physical" || mode === "tts")',
    ], errors)
    require("start/index.html", [
        "Tabletop Simulator",
        "begins <strong>Onset</strong>",
    ], errors)
    require("start/app.js", [
        "Create tracked playtest",
    ], errors)

    for rel in [
        "playtest/index.html",
        "playtest/tracked/index.html",
        "playtest/session/index.html",
        "playtest/onboarding/index.html",
        "playtest/guide/index.html",
        "playtest/player-mat/index.html",
    ]:
        visible = re.sub(r"<[^>]+>", " ", read(rel))
        if re.search(r"(?:current|canonical|formal|game-night|play aid)[^\n]{0,60}v0\.6\.[13]", visible, re.I):
            errors.append(f"{rel}: still advertises a v0.6.x identity as current")
    if "pending battle" in read("start/index.html").lower():
        errors.append("start/index.html: still teaches Pending Battle")
    if "Faction Action" in read("playtest/onboarding/index.html"):
        errors.append("playtest/onboarding/index.html: still teaches retired Faction Action terminology")
    if "Defender's Advantage" in read("playtest/onboarding/index.html"):
        errors.append("playtest/onboarding/index.html: still teaches retired Defender's Advantage terminology")

    session_toml = read("workers/playtest-sessions/wrangler.toml")
    rules_toml = read("rules-assistant/wrangler.toml")
    session_ids = re.findall(r'database_id\s*=\s*"([^"]+)"', session_toml)
    rules_ids = re.findall(r'database_id\s*=\s*"([^"]+)"', rules_toml)
    if not session_ids or session_ids != rules_ids:
        errors.append("Playtest Worker must use the same D1 database as the Rules Arbiter")
    if 'main = "src/completeness.js"' not in session_toml:
        errors.append("Playtest Worker must deploy the complete Worker chain")
    if "SESSION_ADMIN_TOKEN" in session_toml:
        errors.append("SESSION_ADMIN_TOKEN must remain a Worker secret")

    if errors:
        return fail(errors)
    print("Validated v0.7.1 location-aware self-serve playtests, physical/TTS/facilitated compatibility, G071/EV071 runtime identity, live diagnostics, private decision-point feedback, and current terminology.")
    return 0

def fail(errors: list[str]) -> int:
    print("Gauntlet v0.7.1 playtest validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
