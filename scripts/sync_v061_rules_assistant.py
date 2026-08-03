#!/usr/bin/env python3
"""Synchronize and validate the governing v0.6.1 Rules Arbiter sources.

The deployed v0.6.1 service runs through the integrated administrative entry,
which delegates live rulings to the smart orchestration layer while retaining
the canonical v0.6.1 worker for shared helpers and administrative routes. This
script updates browser-facing version labels and validates that complete chain.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOVERNING_WORKER = ROOT / "rules-assistant" / "worker-v061.js"
SMART_WORKER = ROOT / "rules-assistant" / "smart-worker.js"
RULES_INTELLIGENCE = ROOT / "rules-assistant" / "rules-intelligence.js"
RULES_OPENAI = ROOT / "rules-assistant" / "rules-openai.js"
REVIEW_INTELLIGENCE = ROOT / "rules-assistant" / "review-intelligence.js"
WORKER_ENTRY = ROOT / "rules-assistant" / "worker-entry.js"
WRANGLER = ROOT / "rules-assistant" / "wrangler.toml"
WIDGET = ROOT / "rules-assistant" / "widget.js"
LOCAL_SEARCH = ROOT / "rules-assistant" / "local-search.js"
VERSION = "v0.6.1"


def synchronize_browser_source(path: Path) -> str:
    text = path.read_text(encoding="utf-8").replace("v0.6.0", VERSION)
    path.write_text(text, encoding="utf-8")
    return text


def require_markers(errors: list[str], label: str, text: str, markers: list[str]) -> None:
    for marker in markers:
        if marker not in text:
            errors.append(f"{label} missing marker: {marker}")


def validate(
    worker: str,
    smart_worker: str,
    rules_intelligence: str,
    rules_openai: str,
    review_intelligence: str,
    worker_entry: str,
    wrangler: str,
    widget: str,
    local_search: str,
) -> list[str]:
    errors: list[str] = []

    require_markers(
        errors,
        "Governing Rules Arbiter worker",
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
        errors.append("Governing Rules Arbiter worker still identifies v0.6.0")

    require_markers(
        errors,
        "Smart Rules Arbiter worker",
        smart_worker,
        [
            'import baseWorker, {',
            'from "./worker-v061.js"',
            "analyzeQuestionLocally",
            "retrieveIntelligentRules",
            "chooseReasoningEffort",
            "planQuestion",
            "verifyDraft",
            "verification.missing_queries",
            "persistSmartInteraction",
            "structuredQuestionPlanning: true",
            "relationshipAwareRetrieval: true",
            "independentVerification: true",
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
            'import worker from "./smart-worker.js"',
            'import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js"',
            'import { handleReviewExportCheckpoint } from "./review-export-checkpoint.js"',
            'import { handleReviewIntelligence } from "./review-intelligence.js"',
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
            'OPENAI_REASONING_EFFORT = "adaptive"',
            'RULES_SEMANTIC_PLANNER = "on"',
            'RULES_VERIFIER = "on"',
        ],
    )

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
        require_markers(errors, label, text, list(markers))

    return errors


def main() -> int:
    try:
        worker = GOVERNING_WORKER.read_text(encoding="utf-8")
        smart_worker = SMART_WORKER.read_text(encoding="utf-8")
        rules_intelligence = RULES_INTELLIGENCE.read_text(encoding="utf-8")
        rules_openai = RULES_OPENAI.read_text(encoding="utf-8")
        review_intelligence = REVIEW_INTELLIGENCE.read_text(encoding="utf-8")
        worker_entry = WORKER_ENTRY.read_text(encoding="utf-8")
        wrangler = WRANGLER.read_text(encoding="utf-8")
        widget = synchronize_browser_source(WIDGET)
        local_search = synchronize_browser_source(LOCAL_SEARCH)
        errors = validate(
            worker,
            smart_worker,
            rules_intelligence,
            rules_openai,
            review_intelligence,
            worker_entry,
            wrangler,
            widget,
            local_search,
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
        "Synchronized Rules Arbiter browser sources and validated the canonical "
        "v0.6.1 worker, smart orchestration, adaptive model passes, version-aware "
        "review pipeline, integrated entry, deployment configuration, and formal-"
        "playtest linkage."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
