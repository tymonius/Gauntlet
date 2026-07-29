#!/usr/bin/env python3
"""Synchronize the Rules Arbiter worker and browser sources with v0.6.1.

This is intentionally idempotent. It updates the worker's rules version and adds
formal-playtest context columns to interaction persistence without depending on a
second request from the browser session page.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / "rules-assistant" / "worker.js"
WIDGET = ROOT / "rules-assistant" / "widget.js"
LOCAL_SEARCH = ROOT / "rules-assistant" / "local-search.js"
VERSION = "v0.6.1"


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"Could not locate Rules Arbiter patch anchor: {label}")
    return text.replace(old, new, 1)


def synchronize_worker(text: str) -> str:
    text = text.replace("v0.6.0", VERSION)

    text = replace_required(
        text,
        """    const history = sanitizeHistory(payload?.history);\n    const sessionId = sanitizeSessionId(payload?.sessionId);""",
        """    const history = sanitizeHistory(payload?.history);\n    const sessionId = sanitizeSessionId(payload?.sessionId);\n    const playtestContext = sanitizePlaytestContext(payload);""",
        "request playtest context",
    )

    old_record = """          sessionId,\n          question,"""
    new_record = """          sessionId,\n          ...playtestContext,\n          question,"""
    occurrences = text.count(old_record)
    if occurrences:
        text = text.replace(old_record, new_record)
    elif text.count(new_record) < 2:
        raise RuntimeError("Could not locate both Rules Arbiter persistence records")

    text = replace_required(
        text,
        """          question, answer, game_version, ruling_status, confidence, answer_mode, model,\n          source_count, review_status, issue_types_json, reviewer_notes, resolution\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', '[]', '', '')""",
        """          question, answer, game_version, ruling_status, confidence, answer_mode, model,\n          source_count, playtest_session_id, sheet_serial, review_status, issue_types_json, reviewer_notes, resolution\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', '[]', '', '')""",
        "interaction persistence columns",
    )

    text = replace_required(
        text,
        """        record.model || null,\n        sourceRows.length\n      )""",
        """        record.model || null,\n        sourceRows.length,\n        record.playtestSessionId || null,\n        record.sheetSerial || null\n      )""",
        "interaction persistence bindings",
    )

    text = replace_required(
        text,
        """      id, session_id, sequence_index, created_at, question, answer, game_version,\n      ruling_status, confidence, answer_mode, model, source_count, review_status,""",
        """      id, session_id, sequence_index, created_at, question, answer, game_version,\n      ruling_status, confidence, answer_mode, model, source_count, playtest_session_id, sheet_serial, review_status,""",
        "admin interaction list fields",
    )

    text = replace_required(
        text,
        """export function sanitizeSessionId(value) {""",
        """export function sanitizePlaytestContext(payload) {\n  const playtestSessionId = String(payload?.playtestSessionId || \"\").trim();\n  const sheetSerial = String(payload?.sheetSerial || \"\").trim().toUpperCase();\n  return {\n    playtestSessionId: /^[0-9a-f-]{36}$/i.test(playtestSessionId) ? playtestSessionId : null,\n    sheetSerial: /^G061-[A-Z0-9]{6,12}$/.test(sheetSerial) ? sheetSerial : null\n  };\n}\n\nexport function sanitizeSessionId(value) {""",
        "playtest context sanitizer",
    )

    text = replace_required(
        text,
        '"source_count", "feedback_rating", "feedback_comment", "feedback_at",',
        '"source_count", "playtest_session_id", "sheet_serial", "feedback_rating", "feedback_comment", "feedback_at",',
        "CSV playtest fields",
    )
    return text


def synchronize_browser_source(path: Path) -> None:
    text = path.read_text(encoding="utf-8").replace("v0.6.0", VERSION)
    path.write_text(text, encoding="utf-8")


def validate(worker: str) -> list[str]:
    errors: list[str] = []
    required = [
        'version: "v0.6.1"',
        "canonical v0.6.1 pre-release playtest edition",
        "const playtestContext = sanitizePlaytestContext(payload);",
        "playtest_session_id, sheet_serial",
        "record.playtestSessionId || null",
        "export function sanitizePlaytestContext(payload)",
    ]
    for marker in required:
        if marker not in worker:
            errors.append(f"Rules Arbiter worker missing marker: {marker}")
    if "v0.6.0" in worker:
        errors.append("Rules Arbiter worker still identifies v0.6.0")
    for path in (WIDGET, LOCAL_SEARCH):
        text = path.read_text(encoding="utf-8")
        if "v0.6.0" in text:
            errors.append(f"{path.relative_to(ROOT)} still identifies v0.6.0")
    return errors


def main() -> int:
    try:
        worker = synchronize_worker(WORKER.read_text(encoding="utf-8"))
        WORKER.write_text(worker, encoding="utf-8")
        synchronize_browser_source(WIDGET)
        synchronize_browser_source(LOCAL_SEARCH)
        errors = validate(worker)
    except (OSError, RuntimeError) as exc:
        print(f"Rules Arbiter synchronization failed: {exc}", file=sys.stderr)
        return 1

    if errors:
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Synchronized Rules Arbiter worker, widget, retrieval sources, and formal-playtest context to v0.6.1.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
