#!/usr/bin/env python3
"""Materialize or verify evidence-backed legacy asset provenance records.

Each remediation batch identifies a historical Git checkpoint that must contain the
same binary as the file currently checked in. The checkpoint may be the original
introduction commit or a later evidence/identity commit. Per-asset overrides are
supported. This proves continuity from a documented historical state without falsely
claiming that a later checkpoint was the asset's first introduction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / ".github" / "asset-provenance.json"
EVIDENCE_PATH = ROOT / ".github" / "asset-provenance-remediation.json"
REQUIRED = ("origin", "creator", "source", "rights")


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, check=True, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return result.stdout.strip()


def validate_commit(value: object, label: str) -> str:
    if not isinstance(value, str) or len(value) != 40:
        raise SystemExit(f"{label} must be a full commit SHA")
    git("cat-file", "-e", f"{value}^{{commit}}")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checkpoint_for(candidate: dict, basis: dict, label: str) -> str:
    for key in ("identity_commit", "introduction_commit"):
        if key in candidate:
            return validate_commit(candidate[key], f"{label}.{key}")
    for key in ("identity_commit", "introduction_commit"):
        if key in basis:
            return validate_commit(basis[key], f"{label}.evidence_basis.{key}")
    raise SystemExit(f"{label}: evidence_basis must define identity_commit or introduction_commit")


def normalize_batches(evidence: dict) -> list[dict]:
    version = evidence.get("version")
    if version == 1:
        # Backward compatibility for the first remediation manifest format.
        return [{
            "id": "legacy-v1",
            "defaults": evidence.get("defaults"),
            "evidence_basis": evidence.get("evidence_basis"),
            "assets": evidence.get("assets"),
        }]
    if version == 2:
        batches = evidence.get("batches")
        if not isinstance(batches, list) or not batches:
            raise SystemExit("version 2 remediation manifest must contain a non-empty batches list")
        return batches
    raise SystemExit("unsupported remediation manifest version")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="write materialized records to the policy ledger")
    mode.add_argument("--check", action="store_true", help="verify the policy ledger exactly matches materialized records")
    args = parser.parse_args()

    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    evidence = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
    if policy.get("version") != 1:
        raise SystemExit("asset provenance policy must use version 1")

    current_by_path = {record["path"]: record for record in policy.get("assets", [])}
    materialized: list[dict[str, str]] = []
    seen_paths: set[str] = set()

    for batch_index, batch in enumerate(normalize_batches(evidence), start=1):
        if not isinstance(batch, dict):
            raise SystemExit(f"batch {batch_index} must be an object")
        batch_id = batch.get("id", f"batch-{batch_index}")
        defaults = batch.get("defaults")
        basis = batch.get("evidence_basis")
        candidates = batch.get("assets")
        if not isinstance(defaults, dict) or not isinstance(basis, dict) or not isinstance(candidates, list):
            raise SystemExit(f"{batch_id}: invalid batch structure")

        for candidate in candidates:
            if not isinstance(candidate, dict) or not isinstance(candidate.get("path"), str):
                raise SystemExit(f"{batch_id}: every remediation candidate must contain a path")
            rel = candidate["path"]
            if rel in seen_paths:
                raise SystemExit(f"duplicate remediation path across batches: {rel}")
            seen_paths.add(rel)

            absolute = ROOT / rel
            if not absolute.is_file():
                raise SystemExit(f"candidate asset does not exist: {rel}")

            checkpoint = checkpoint_for(candidate, basis, f"{batch_id}:{rel}")
            try:
                historical_blob = git("rev-parse", f"{checkpoint}:{rel}")
            except subprocess.CalledProcessError as exc:
                raise SystemExit(f"{rel}: not present in documented checkpoint {checkpoint}") from exc
            current_blob = git("hash-object", rel)
            if current_blob != historical_blob:
                raise SystemExit(
                    f"{rel}: current binary differs from blob at documented checkpoint "
                    f"{checkpoint}; manual review or a later evidence checkpoint is required"
                )

            record: dict[str, str] = {"path": rel}
            for field in REQUIRED:
                value = candidate.get(field, defaults.get(field))
                if not isinstance(value, str) or not value.strip():
                    raise SystemExit(f"{rel}: missing remediation field {field}")
                record[field] = value.strip()
            notes = candidate.get("notes", defaults.get("notes"))
            if isinstance(notes, str) and notes.strip():
                record["notes"] = notes.strip()
            record["sha256"] = sha256_file(absolute)
            materialized.append(record)

    print(f"Materialized {len(materialized)} evidence-backed provenance record(s) in memory.")
    for record in materialized:
        print(f"  {record['path']}  {record['sha256']}")

    if args.check:
        mismatches = []
        for expected in materialized:
            actual = current_by_path.get(expected["path"])
            if actual != expected:
                mismatches.append(expected["path"])
        if mismatches:
            raise SystemExit(
                "provenance ledger does not match remediation evidence for: " + ", ".join(mismatches)
            )
        print("Remediation manifest and explicit provenance ledger are consistent.")
        return 0

    merged = dict(current_by_path)
    for record in materialized:
        merged[record["path"]] = record
    policy["assets"] = [merged[path] for path in sorted(merged)]

    if args.write:
        POLICY_PATH.write_text(json.dumps(policy, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Updated {POLICY_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
