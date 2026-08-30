#!/usr/bin/env python3
"""Validate the preserved v0.6.1 Rules Arbiter after public-version cutover.

The public widget may advance to a later release. Historical v0.6.1 integrity is
therefore established by the immutable worker, its canonical retrieval source,
and the explicit versioned route in the integrated dispatcher—not by requiring
the public widget to remain pinned to v0.6.1 forever.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOVERNING_WORKER = ROOT / "rules-assistant" / "worker-v061.js"
SMART_WORKER = ROOT / "rules-assistant" / "smart-worker.js"
RULES_INTELLIGENCE = ROOT / "rules-assistant" / "rules-intelligence.js"
RULES_OPENAI = ROOT / "rules-assistant" / "rules-openai.js"
RULES_PACKETS = ROOT / "rules-assistant" / "rules-packets.js"
RULES_DETERMINISTIC = ROOT / "rules-assistant" / "rules-deterministic.js"
REVIEW_INTELLIGENCE = ROOT / "rules-assistant" / "review-intelligence.js"
WORKER_ENTRY = ROOT / "rules-assistant" / "worker-entry.js"
WRANGLER = ROOT / "rules-assistant" / "wrangler.toml"
WIDGET = ROOT / "rules-assistant" / "widget.js"
LOCAL_SEARCH = ROOT / "rules-assistant" / "local-search.js"
VERSION = "v0.6.1"


def require_markers(errors: list[str], label: str, text: str, markers: list[str]) -> None:
    for marker in markers:
        if marker not in text:
            errors.append(f"{label} missing marker: {marker}")


def validate(
    worker: str,
    smart_worker: str,
    rules_intelligence: str,
    rules_openai: str,
    rules_packets: str,
    rules_deterministic: str,
    review_intelligence: str,
    worker_entry: str,
    wrangler: str,
    widget: str,
    local_search: str,
) -> list[str]:
    errors: list[str] = []

    require_markers(
        errors,
        "Governing v0.6.1 Rules Arbiter worker",
        worker,
        [
            'const RULES_VERSION = "v0.6.1"',
            "canonical v0.6.1 pre-release playtest edition",
            "const playtestContext = sanitizePlaytestContext(payload);",
            "playtest_session_id, sheet_serial",
            "record.playtestSessionId || null",
            "export function sanitizePlaytestContext(payload)",
            "INSERT OR IGNORE INTO playtest_arbiter_links",
        ],
    )
    if "v0.6.0" in worker:
        errors.append("Governing v0.6.1 worker still identifies v0.6.0")

    require_markers(
        errors,
        "Smart Rules Arbiter worker",
        smart_worker,
        [
            'import baseWorker, {',
            'from "./worker-v061.js"',
            'from "./rules-packets.js"',
            'from "./rules-deterministic.js"',
            "resolveDeterministicRuling",
            "buildRulePacket",
            "prioritizeRulePacketSources",
            'mode: "retrieval_only"',
            'executionPath: "deterministic"',
            "persistSmartInteraction",
            "deterministicRuleAnswers: true",
            "explicitRulePackets: true",
            "structuredSubjectContinuity: true",
            "oneModelCallDefault",
        ],
    )

    require_markers(
        errors,
        "Rules intelligence layer",
        rules_intelligence,
        [
            "export function analyzeQuestionLocally",
            "export function retrieveIntelligentRules",
            "export function chooseReasoningEffort",
            "export function sanitizeGameState",
            "export async function buildCorpusReviewSnapshot",
        ],
    )

    require_markers(
        errors,
        "Rules model layer",
        rules_openai,
        [
            "export async function planQuestion",
            "export async function answerQuestion",
            "export async function verifyDraft",
            'const FALLBACK_MODEL = "gpt-5.6-terra"',
            "DEFAULT_SOURCE_LIMIT = 8",
            "DEFAULT_SOURCE_EXCERPT_LENGTH = 1000",
            "ACTIVE SUBJECT",
            "EXPLICIT RULE PACKET",
            "prompt_cache_key",
            'console.log("Rules model usage"',
        ],
    )

    require_markers(
        errors,
        "Rules packet layer",
        rules_packets,
        [
            "PACKET_DEFINITIONS",
            "export function resolveActiveContext",
            "export function buildRulePacket",
            "export function canonicalSourcesForIds",
            "export function prioritizeRulePacketSources",
            "Intelligence mirrors is a specialized subsection",
            "Revision is permitted after the opponent makes a replacement",
        ],
    )

    require_markers(
        errors,
        "Deterministic v0.6.1 Rules Arbiter layer",
        rules_deterministic,
        [
            "export function resolveDeterministicRuling",
            "setup-opening-hand",
            "territory-capture",
            "surveillance-overview",
            "peace-treaty-timing",
            "good-faith",
            "shock-and-awe",
            "impossible-choice-provisional",
            "export function materializeDeterministicSources",
        ],
    )

    require_markers(
        errors,
        "Rules review intelligence layer",
        review_intelligence,
        [
            'url.pathname === "/api/admin/review-corpus"',
            'url.pathname === "/api/admin/review-audits"',
            "historicalAccuracy",
            "currentValidity",
            'loadArchivedCorpus(env, "v0.6.0")',
        ],
    )

    require_markers(
        errors,
        "Integrated Rules Arbiter entry",
        worker_entry,
        [
            'import worker from "./worker-v061.js"',
            'import smartWorker from "./smart-worker.js"',
            'import { ADMIN_PAGE_WITH_INCREMENTAL_EXPORT } from "./admin-incremental-export-page.js"',
            'import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js"',
            'import { handleReviewExportCheckpoint } from "./review-export-checkpoint.js"',
            'import { handleReviewIntelligence } from "./review-intelligence.js"',
            'url.pathname === "/api/v061/rules"',
            'url.pathname === "/api/v061/health"',
            'return worker.fetch(new Request(legacyUrl, request), env, context);',
            "/api/admin/review-export-checkpoint",
            "/api/admin/review-corpus",
            "/api/admin/review-audits",
        ],
    )

    require_markers(
        errors,
        "Rules Arbiter deployment configuration",
        wrangler,
        [
            'main = "worker-entry.js"',
            'SITE_ORIGIN = "https://gauntlet.run"',
            'OPENAI_MODEL = "gpt-5.6-terra"',
            'OPENAI_REASONING_EFFORT = "low"',
            'RULES_SEMANTIC_PLANNER = "off"',
            'RULES_VERIFIER = "off"',
            'RULES_SOURCE_LIMIT = "8"',
            'RULES_SOURCE_EXCERPT_LENGTH = "1000"',
        ],
    )

    require_markers(
        errors,
        "Current Rules Arbiter widget",
        widget,
        ["playtestSessionId", "sheetSerial"],
    )
    require_markers(
        errors,
        "Historical v0.6.1 local search",
        local_search,
        [
            "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json",
            "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
        ],
    )
    if "v0.6.0" in local_search:
        errors.append("Historical v0.6.1 local search still identifies v0.6.0")

    return errors


def main() -> int:
    try:
        errors = validate(
            GOVERNING_WORKER.read_text(encoding="utf-8"),
            SMART_WORKER.read_text(encoding="utf-8"),
            RULES_INTELLIGENCE.read_text(encoding="utf-8"),
            RULES_OPENAI.read_text(encoding="utf-8"),
            RULES_PACKETS.read_text(encoding="utf-8"),
            RULES_DETERMINISTIC.read_text(encoding="utf-8"),
            REVIEW_INTELLIGENCE.read_text(encoding="utf-8"),
            WORKER_ENTRY.read_text(encoding="utf-8"),
            WRANGLER.read_text(encoding="utf-8"),
            WIDGET.read_text(encoding="utf-8"),
            LOCAL_SEARCH.read_text(encoding="utf-8"),
        )
    except OSError as exc:
        print(f"Rules Arbiter synchronization failed: {exc}", file=sys.stderr)
        return 1

    if errors:
        print("Rules Arbiter synchronization failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "Validated the preserved v0.6.1 worker, deterministic answers, explicit "
        "rule packets, canonical retrieval sources, formal-playtest linkage, and "
        "explicit historical dispatcher routes without pinning the current public "
        "widget to v0.6.1."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
