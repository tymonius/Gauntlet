#!/usr/bin/env python3
"""Emit a complete exact-turn review corpus for all classifier-excluded chats."""
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

from conversation_audit_export import canonical, collect_selected_ids, digest, die, load_export
from conversation_audit_review import build_record

MANIFEST_SCHEMA = "gauntlet.excluded-conversation-review-manifest.v1"
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> tuple[int, str]:
    payload = "".join(canonical(record) + "\n" for record in records)
    path.write_text(payload, encoding="utf-8")
    return len(payload.encode("utf-8")), digest(payload)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Inventory every excluded conversation with exact user turns and assistant context."
    )
    parser.add_argument("source", type=Path, help="ChatGPT export ZIP, folder, or shard")
    parser.add_argument("--selected-transcripts", type=Path, nargs="+", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--chunk-mb", type=float, default=3.5)
    args = parser.parse_args(argv)
    if args.chunk_mb <= 0:
        die("--chunk-mb must be positive")

    private_paths = [args.source, *args.selected_transcripts]
    repository_private_paths = [path for path in private_paths if is_within(path, REPOSITORY_ROOT)]
    if repository_private_paths:
        die(
            "ChatGPT exports and transcript inputs must be stored outside the Gauntlet repository: "
            + ", ".join(str(path) for path in repository_private_paths)
        )

    output = args.output.resolve()
    if is_within(output, REPOSITORY_ROOT):
        die("--output must be outside the Gauntlet repository; private conversation data may not be written into the repo")

    conversations, sources = load_export(args.source)
    selected = collect_selected_ids(args.selected_transcripts)
    missing = selected - set(conversations)
    if missing:
        die(f"{len(missing)} selected conversation IDs are absent from the export")
    excluded = set(conversations) - selected
    records = [build_record(conversations[cid]) for cid in excluded]
    records.sort(key=lambda row: (-row["signal_score"], row["create_time"] or "", row["conversation_id"]))

    output.mkdir(parents=True, exist_ok=True)
    chunks, current, size = [], [], 0
    limit = int(args.chunk_mb * 1024 * 1024)
    for record in records:
        record_size = len((canonical(record) + "\n").encode("utf-8"))
        if current and size + record_size > limit:
            chunks.append(current)
            current, size = [], 0
        current.append(record)
        size += record_size
    if current:
        chunks.append(current)

    chunk_meta = []
    for index, chunk in enumerate(chunks, 1):
        path = output / f"excluded_conversation_review_part_{index:03d}.jsonl"
        byte_count, sha = write_jsonl(path, chunk)
        chunk_meta.append({
            "filename": path.name,
            "bytes": byte_count,
            "sha256": sha,
            "conversations": len(chunk),
            "user_turns": sum(row["user_turns"] for row in chunk),
        })

    inventory = output / "excluded_conversations_review_inventory.csv"
    fields = [
        "conversation_id", "title", "create_time", "update_time", "signal_score",
        "matched_signals", "user_turns", "current_path_user_turns",
        "off_path_user_turns", "record_sha256",
    ]
    with inventory.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in records:
            writer.writerow({
                **{key: row[key] for key in fields if key != "matched_signals"},
                "matched_signals": ";".join(row["matched_signals"]),
            })
    inventory_text = inventory.read_text(encoding="utf-8")

    manifest = {
        "schema": MANIFEST_SCHEMA,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
        "total_unique_conversations": len(conversations),
        "selected_conversations": len(selected),
        "excluded_conversations": len(records),
        "coverage": {
            "all_exported_conversation_ids_accounted_for": len(selected) + len(records) == len(conversations),
            "selected_and_excluded_disjoint": not bool(selected & excluded),
            "excluded_user_turns": sum(row["user_turns"] for row in records),
            "excluded_current_path_user_turns": sum(row["current_path_user_turns"] for row in records),
            "excluded_off_path_user_turns": sum(row["off_path_user_turns"] for row in records),
            "conversations_with_priority_signals": sum(row["signal_score"] > 0 for row in records),
        },
        "review_policy": {
            "every_excluded_conversation_emitted": True,
            "signal_score_is_priority_only": True,
            "signal_score_may_not_exclude_or_certify": True,
            "assistant_context_attached": True,
            "off_path_user_turns_preserved": True,
            "private_inputs_outside_repository": True,
            "private_outputs_outside_repository": True,
        },
        "inventory": {
            "filename": inventory.name,
            "bytes": len(inventory_text.encode("utf-8")),
            "sha256": digest(inventory_text),
        },
        "chunks": chunk_meta,
    }
    manifest["manifest_sha256"] = digest(canonical(manifest))
    (output / "excluded_conversation_review_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"Inventoried {len(records)} excluded conversations and "
        f"{manifest['coverage']['excluded_user_turns']} user turns across {len(chunks)} chunk(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
