#!/usr/bin/env python3
"""Validate the append-only Gauntlet live conversation tail."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "governance" / "conversation-audit"
TAIL = AUDIT / "live-tail.jsonl"
POLICY = AUDIT / "live-tail-policy.md"
ATTESTATION = AUDIT / "attestation.json"
ID_RE = re.compile(r"GNT-LIVE-\d{8}-\d{3}")
ALLOWED_RECONCILIATION = {"unmatched", "matched", "independently-reviewed"}


def fail(message: str) -> None:
    print(f"live-tail audit error: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    for path in (TAIL, POLICY, ATTESTATION):
        if not path.is_file():
            fail(f"missing {path.relative_to(ROOT)}")

    try:
        attestation = json.loads(ATTESTATION.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"cannot parse attestation: {exc}")

    rows: list[dict] = []
    for line_no, line in enumerate(TAIL.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            fail(f"blank line at {TAIL.relative_to(ROOT)}:{line_no}")
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            fail(f"invalid JSON at {TAIL.relative_to(ROOT)}:{line_no}: {exc}")
        rows.append(row)

    if not rows:
        fail("live tail is empty")

    seen_ids: set[str] = set()
    orders: dict[str, list[int]] = defaultdict(list)
    unmatched = 0

    for index, row in enumerate(rows, 1):
        turn_id = row.get("tail_turn_id")
        if not isinstance(turn_id, str) or not ID_RE.fullmatch(turn_id):
            fail(f"row {index} has invalid tail_turn_id: {turn_id}")
        if turn_id in seen_ids:
            fail(f"duplicate tail_turn_id: {turn_id}")
        seen_ids.add(turn_id)

        if row.get("schema_version") != 1:
            fail(f"{turn_id} has unsupported schema_version")
        if row.get("role") != "user":
            fail(f"{turn_id} must preserve a user turn")

        text = row.get("text")
        digest = row.get("sha256")
        if not isinstance(text, str) or not text:
            fail(f"{turn_id} lacks exact user text")
        expected = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if digest != expected:
            fail(f"{turn_id} text hash mismatch")

        conversation_ref = row.get("conversation_ref")
        order = row.get("observed_order")
        if not isinstance(conversation_ref, str) or not conversation_ref:
            fail(f"{turn_id} lacks conversation_ref")
        if not isinstance(order, int) or order < 1:
            fail(f"{turn_id} has invalid observed_order")
        orders[conversation_ref].append(order)

        status = row.get("reconciliation_status")
        if status not in ALLOWED_RECONCILIATION:
            fail(f"{turn_id} has invalid reconciliation_status: {status}")
        if status == "unmatched":
            unmatched += 1

        if not isinstance(row.get("capture_basis"), str) or not row["capture_basis"].strip():
            fail(f"{turn_id} lacks capture_basis")
        if not isinstance(row.get("requires_preceding_assistant_context"), bool):
            fail(f"{turn_id} lacks assistant-context flag")

    for conversation_ref, observed in orders.items():
        if observed != sorted(observed) or len(observed) != len(set(observed)):
            fail(f"non-monotonic or duplicate order in {conversation_ref}: {observed}")

    live = attestation.get("live_tail")
    if not isinstance(live, dict):
        fail("attestation lacks live_tail metadata")
    if live.get("scope") != "gauntlet-project":
        fail("live-tail scope must be the full Gauntlet project")
    if live.get("concurrent_conversations_allowed") is not True:
        fail("live-tail policy must allow concurrent project conversations")
    if live.get("certification_requires_complete_project_conversation_inventory") is not True:
        fail("certification must require a complete Gauntlet-project conversation inventory")
    if live.get("captured_user_turns") != len(rows):
        fail("attestation captured_user_turns disagrees with live tail")
    if live.get("unmatched_user_turns") != unmatched:
        fail("attestation unmatched_user_turns disagrees with live tail")
    if live.get("certification_requires_continuous_coverage") is not True:
        fail("attestation must require continuous coverage")

    if attestation.get("certification_status") == "complete" and unmatched:
        fail("complete certification cannot retain unmatched live-tail rows")

    print(
        f"Project-wide live conversation tail valid: {len(rows)} exact user turns "
        f"across {len(orders)} captured conversation(s), "
        f"{unmatched} unmatched pending export reconciliation."
    )


if __name__ == "__main__":
    main()
