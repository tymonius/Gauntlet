#!/usr/bin/env python3
"""Materialize or verify evidence-backed legacy asset provenance records.

The helper refuses to resolve an asset unless the current Git blob is byte-for-byte
identical to the blob at its documented introduction commit. A family may define a
default introduction commit, while individual assets may override it when repository
history proves they entered later.
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


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="write materialized records to the policy ledger")
    mode.add_argument("--check", action="store_true", help="verify the policy ledger exactly matches materialized records")
    args = parser.parse_args()

    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    evidence = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
    if policy.get("version") != 1 or evidence.get("version") != 1:
        raise SystemExit("policy and remediation manifest must both use version 1")

    defaults = evidence.get("defaults")
    basis = evidence.get("evidence_basis")
    candidates = evidence.get("assets")
    if not isinstance(defaults, dict) or not isinstance(basis, dict) or not isinstance(candidates, list):
        raise SystemExit("invalid remediation manifest structure")

    default_introduction_commit = validate_commit(
        basis.get("introduction_commit"), "evidence_basis.introduction_commit"
    )

    current_by_path = {record["path"]: record for record in policy.get("assets", [])}
    materialized: list[dict[str, str]] = []

    for candidate in candidates:
        if not isinstance(candidate, dict) or not isinstance(candidate.get("path"), str):
            raise SystemExit("every remediation candidate must contain a path")
        rel = candidate["path"]
        absolute = ROOT / rel
        if not absolute.is_file():
            raise SystemExit(f"candidate asset does not exist: {rel}")

        candidate_commit = candidate.get("introduction_commit", default_introduction_commit)
        introduction_commit = validate_commit(candidate_commit, f"{rel}.introduction_commit")
        try:
            introduced_blob = git("rev-parse", f"{introduction_commit}:{rel}")
        except subprocess.CalledProcessError as exc:
            raise SystemExit(f"{rel}: not present in documented introduction commit {introduction_commit}") from exc
        current_blob = git("hash-object", rel)
        if current_blob != introduced_blob:
            raise SystemExit(
                f"{rel}: current binary differs from blob at documented introduction commit "
                f"{introduction_commit}; manual review required"
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
