#!/usr/bin/env python3
"""Validate the committed Gauntlet conversation-to-decision audit."""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "governance" / "conversation-audit"
ID_RE = re.compile(r"GNT-CONV-\d{8}-\d{3}")
ROW_RE = re.compile(
    r"^\| `(?P<id>GNT-CONV-\d{8}-\d{3})` \| (?P<date>\d{4}-\d{2}-\d{2}) "
    r"\| `(?P<status>[^`]+)` \| `(?P<domain>[^`]+)` \| (?P<decision>.+) \| (?P<evidence>.+) \|$"
)
LINE_EVIDENCE_RE = re.compile(r":L\d+-L\d+$")
SEARCH_EVIDENCE_RE = re.compile(
    r"^project-conversation-search:.+:(?P<date>2026-07-(?:1\d|2\d|30))$"
)
ALLOWED = {"current", "superseded", "tentative", "deferred", "rejected", "deprecated"}


def fail(message: str) -> None:
    print(f"conversation audit error: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read {path.relative_to(ROOT)}: {exc}")


def main() -> None:
    required = [
        AUDIT / "README.md",
        AUDIT / "report.md",
        AUDIT / "corpus.json",
        AUDIT / "attestation.json",
        AUDIT / "july-10-30-sources.json",
        AUDIT / "status-overrides.json",
    ]
    for path in required:
        if not path.is_file():
            fail(f"missing {path.relative_to(ROOT)}")

    corpus = load_json(AUDIT / "corpus.json")
    attestation = load_json(AUDIT / "attestation.json")
    supplement = load_json(AUDIT / "july-10-30-sources.json")
    override_doc = load_json(AUDIT / "status-overrides.json")

    files = sorted(
        AUDIT.glob("decision-index-*.md"),
        key=lambda path: int(path.stem.rsplit("-", 1)[1]),
    )
    numbers = [int(path.stem.rsplit("-", 1)[1]) for path in files]
    expected_file_count = attestation.get("decision_index_files")
    if numbers != list(range(1, len(files) + 1)):
        fail(f"decision index numbering is not contiguous: {numbers}")
    if len(files) != expected_file_count:
        fail(f"expected {expected_file_count} decision index files, found {len(files)}")

    rows: list[dict[str, str]] = []
    for path in files:
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.startswith("| `GNT-CONV-"):
                continue
            match = ROW_RE.match(line)
            if not match:
                fail(f"malformed row at {path.relative_to(ROOT)}:{line_no}")
            row = match.groupdict()
            if row["status"] not in ALLOWED:
                fail(f"invalid status {row['status']} for {row['id']}")
            if "**" not in row["decision"] or " — " not in row["decision"]:
                fail(f"missing title/summary structure for {row['id']}")
            if not row["evidence"].strip() or row["evidence"].strip() == "-":
                fail(f"missing evidence for {row['id']}")
            rows.append(row)

    ids = [row["id"] for row in rows]
    if any(not ID_RE.fullmatch(value) for value in ids):
        fail("one or more decision IDs have invalid format")
    duplicates = sorted(value for value, count in Counter(ids).items() if count > 1)
    if duplicates:
        fail(f"duplicate decision IDs: {', '.join(duplicates)}")
    row_by_id = {row["id"]: row for row in rows}

    overrides: dict[str, str] = {}
    for raw in override_doc.get("overrides", []):
        if not isinstance(raw, dict):
            fail("status override must be an object")
        thread_id = raw.get("thread_id")
        target_id = raw.get("superseded_by")
        status = raw.get("effective_status")
        reason = raw.get("reason")
        if thread_id not in row_by_id:
            fail(f"override references unknown thread {thread_id}")
        if target_id not in row_by_id:
            fail(f"override target is unknown: {target_id}")
        if status not in ALLOWED:
            fail(f"override for {thread_id} has invalid status {status}")
        if thread_id == target_id:
            fail(f"override for {thread_id} cannot supersede itself")
        if not isinstance(reason, str) or not reason.strip():
            fail(f"override for {thread_id} lacks a reason")
        if thread_id in overrides:
            fail(f"duplicate status override for {thread_id}")
        overrides[thread_id] = status

    expected_total = attestation.get("decision_threads")
    if len(rows) != expected_total:
        fail(f"expected {expected_total} decision rows, found {len(rows)}")
    if corpus.get("counts", {}).get("decision_threads") != expected_total:
        fail("corpus and attestation decision counts disagree")

    effective_counts = Counter(overrides.get(row["id"], row["status"]) for row in rows)
    if dict(effective_counts) != attestation.get("statuses"):
        fail(f"effective status counts disagree: {dict(effective_counts)}")

    conversations = corpus.get("conversations", [])
    user_turns = sum(item.get("user_turns", 0) for item in conversations)
    if len(conversations) != 9:
        fail(f"expected 9 raw source conversations, found {len(conversations)}")
    if user_turns != attestation.get("verbatim_user_turns"):
        fail(f"user-turn count mismatch: {user_turns}")
    if corpus.get("counts", {}).get("verbatim_user_turns") != user_turns:
        fail("corpus user-turn count disagrees with source rows")

    source_names = {item.get("source_file") for item in conversations}
    search_rows = 0
    for row in rows:
        parts = [part.strip() for part in row["evidence"].split(";")]
        if parts[0].startswith("project-conversation-search:"):
            search_rows += 1
            for part in parts:
                if not SEARCH_EVIDENCE_RE.match(part):
                    fail(f"{row['id']} has malformed project-conversation evidence: {part}")
            continue
        cited = {part.split(":L", 1)[0] for part in parts}
        unknown = cited - source_names
        if unknown:
            fail(f"{row['id']} cites unknown source(s): {', '.join(sorted(unknown))}")
        for part in parts:
            if not LINE_EVIDENCE_RE.search(part):
                fail(f"{row['id']} has malformed line evidence: {part}")

    if search_rows != attestation.get("post_export_evidence_links"):
        fail(f"expected {attestation.get('post_export_evidence_links')} post-export rows, found {search_rows}")

    if supplement.get("counts", {}).get("new_decision_threads") != 109:
        fail("July supplement count must remain 109 for this attestation")
    new_files_rows = sum(
        1
        for path in files[9:]
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.startswith("| `GNT-CONV-")
    )
    if new_files_rows != supplement.get("counts", {}).get("new_decision_threads"):
        fail(f"July supplement declares 109 new rows but contains {new_files_rows}")
    if len(overrides) != supplement.get("counts", {}).get("effective_status_overrides"):
        fail("July supplement and status override counts disagree")

    print(
        "Conversation audit valid: "
        f"{len(conversations)} raw conversations, {user_turns} raw user turns, "
        f"{len(rows)} decision threads, {search_rows} July supplement rows, "
        f"{len(overrides)} effective status overrides."
    )


if __name__ == "__main__":
    main()
