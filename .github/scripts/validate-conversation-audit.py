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
    required = [AUDIT / "README.md", AUDIT / "report.md", AUDIT / "corpus.json", AUDIT / "attestation.json"]
    for path in required:
        if not path.is_file():
            fail(f"missing {path.relative_to(ROOT)}")

    corpus = load_json(AUDIT / "corpus.json")
    attestation = load_json(AUDIT / "attestation.json")
    files = sorted(AUDIT.glob("decision-index-*.md"), key=lambda p: int(p.stem.rsplit("-", 1)[1]))
    if len(files) != 9:
        fail(f"expected 9 decision index files, found {len(files)}")

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

    expected_total = attestation.get("decision_threads")
    if len(rows) != expected_total:
        fail(f"expected {expected_total} decision rows, found {len(rows)}")
    if corpus.get("counts", {}).get("decision_threads") != expected_total:
        fail("corpus and attestation decision counts disagree")

    status_counts = Counter(row["status"] for row in rows)
    if dict(status_counts) != attestation.get("statuses"):
        fail(f"status counts disagree: {dict(status_counts)}")

    conversations = corpus.get("conversations", [])
    user_turns = sum(item.get("user_turns", 0) for item in conversations)
    if len(conversations) != 9:
        fail(f"expected 9 source conversations, found {len(conversations)}")
    if user_turns != attestation.get("verbatim_user_turns"):
        fail(f"user-turn count mismatch: {user_turns}")
    if corpus.get("counts", {}).get("verbatim_user_turns") != user_turns:
        fail("corpus user-turn count disagrees with source rows")

    source_names = {item.get("source_file") for item in conversations}
    for row in rows:
        evidence = row["evidence"]
        if evidence.startswith("project-conversation-search:"):
            continue
        cited = {part.split(":L", 1)[0].strip() for part in evidence.split(";")}
        unknown = cited - source_names
        if unknown:
            fail(f"{row['id']} cites unknown source(s): {', '.join(sorted(unknown))}")
        for part in evidence.split(";"):
            if not re.search(r":L\d+-L\d+$", part.strip()):
                fail(f"{row['id']} has malformed line evidence: {part.strip()}")

    print(
        "Conversation audit valid: "
        f"{len(conversations)} conversations, {user_turns} user turns, "
        f"{len(rows)} decision threads."
    )


if __name__ == "__main__":
    main()
