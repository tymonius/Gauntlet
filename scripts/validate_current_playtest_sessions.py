#!/usr/bin/env python3
"""Validate the current playtest workflow and location-aware self-serve playtest contract."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIFECYCLE = json.loads((ROOT / "config/release-lifecycle.json").read_text(encoding="utf-8"))
CURRENT_VERSION = str(LIFECYCLE.get("current_release", ""))

REQUIRED = [
    "rules-assistant/migrations/0003_playtest_sessions.sql",
    "rules-assistant/migrations/0004_event_game_sessions.sql",
    "rules-assistant/migrations/0005_tracked_playtests.sql",
    "rules-assistant/migrations/0010_playtest_decision_experience.sql",
    "workers/playtest-sessions/wrangler.toml",
    "workers/playtest-sessions/src/index.js",
    "workers/playtest-sessions/src/release-identity.js",
    "workers/playtest-sessions/src/tracked.js",
    "workers/playtest-sessions/src/analysis.js",
    ".github/workflows/deploy-playtest-sessions.yml",
    "playtest/current-release.js",
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
    "playtest/host/create-event.js",
    "playtest/batch/app.js",
    "start/index.html",
    "start/app.js",
    "scripts/test-formal-session-e2e.mjs",
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
    release = LIFECYCLE.get("releases", {}).get(CURRENT_VERSION)
    if not CURRENT_VERSION or not isinstance(release, dict):
        errors.append("Release lifecycle does not define a current release")
    elif release.get("status") != "current" or release.get("public_cutover") is not True:
        errors.append(f"{CURRENT_VERSION} is not the approved current public release")
    for rel in REQUIRED:
        p = ROOT / rel
        if not p.is_file() or p.stat().st_size == 0:
            errors.append(f"Missing or empty current-playtest file: {rel}")
    if errors:
        return fail(errors)

    require("workers/playtest-sessions/src/index.js", [
        'from "./release-identity.js"',
        "CURRENT_RULES_VERSION",
        "GAME_SERIAL_PREFIX",
        "EVENT_SERIAL_PREFIX",
        "SERIAL_PATTERN",
        "SESSION_ADMIN_TOKEN",
        "eventGamesSupported",
        "playerAttributionSupported",
    ], errors)
    require("workers/playtest-sessions/src/tracked.js", [
        'import { CURRENT_RULES_VERSION, GAME_SERIAL_PREFIX } from "./release-identity.js"',
        'const serial = `${GAME_SERIAL_PREFIX}-${randomCode(8)}`',
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
    require("workers/playtest-sessions/src/release-identity.js", [
        f'export const CURRENT_RULES_VERSION = "{CURRENT_VERSION}"',
        "serialVersionToken",
        "sessionSerialPrefixes",
        "GAME_SERIAL_PREFIX = currentPrefixes.game",
        "EVENT_SERIAL_PREFIX = currentPrefixes.event",
    ], errors)
    require("playtest/current-release.js", [
        'const DEFAULT_LIFECYCLE_URL = "/config/release-lifecycle.json"',
        "currentPlaytestVersion",
        "matchCurrentPlaytestRelease",
        "resolveCurrentPlaytestRelease",
        "health.version !== version",
    ], errors)
    require("playtest/host/create-event.js", [
        'import { resolveCurrentPlaytestRelease } from "../current-release.js"',
        "resolveCurrentPlaytestRelease(API_ORIGIN)",
        "createSession(adminToken, eventLabel, release.version)",
        "rulesVersion,",
    ], errors)
    require("playtest/batch/app.js", [
        'import { resolveCurrentPlaytestRelease } from "../current-release.js"',
        "resolveCurrentPlaytestRelease(API_ORIGIN)",
        "rulesVersion: release.version",
        "batchMetadata.rulesVersion",
    ], errors)
    require(".github/workflows/deploy-playtest-sessions.yml", [
        "config/release-lifecycle.json",
        "expected_version = str(lifecycle.get('current_release', ''))",
        "sessions.get('version') != expected_version",
    ], errors)
    require("rules-assistant/migrations/0010_playtest_decision_experience.sql", [
        "felt_decided_when",
        "agency_after_decided",
        "decisive_cause",
        "selection_reason",
    ], errors)
    require("playtest/index.html", [
        f"Self-serve playtesting · canonical {CURRENT_VERSION}",
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
        CURRENT_VERSION,
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
    for rel in [
        "playtest/host/create-event.js",
        "playtest/batch/app.js",
        ".github/workflows/deploy-playtest-sessions.yml",
    ]:
        if 'v0.7.1' in read(rel):
            errors.append(f"{rel}: maintained playtest orchestration still embeds the current version")

    if errors:
        return fail(errors)
    print(f"Validated current {CURRENT_VERSION} location-aware self-serve playtests, version-derived session identifiers, physical/TTS/facilitated compatibility, live diagnostics, private decision-point feedback, and current terminology.")
    return 0

def fail(errors: list[str]) -> int:
    print(f"Gauntlet current {CURRENT_VERSION or 'unknown'} playtest validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
