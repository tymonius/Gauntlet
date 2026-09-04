#!/usr/bin/env python3
"""Materialize evidence-backed legacy asset provenance records.

This helper intentionally refuses to resolve an asset unless the current Git blob is
byte-for-byte identical to the blob at the evidence manifest's introduction commit.
That keeps remediation conservative: the manifest may describe an evidence family,
but only unchanged binaries from the documented introduction commit are promoted out
of legacy-unresolved status.
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


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write materialized records to the policy ledger")
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

    introduction_commit = basis.get("introduction_commit")
    if not isinstance(introduction_commit, str) or len(introduction_commit) != 40:
        raise SystemExit("evidence_basis.introduction_commit must be a full commit SHA")
    git("cat-file", "-e", f"{introduction_commit}^{{commit}}")

    existing = {record["path"]: record for record in policy.get("assets", [])}
    materialized: list[dict[str, str]] = []

    for candidate in candidates:
        if not isinstance(candidate, dict) or not isinstance(candidate.get("path"), str):
            raise SystemExit("every remediation candidate must contain a path")
        rel = candidate["path"]
        absolute = ROOT / rel
        if not absolute.is_file():
            raise SystemExit(f"candidate asset does not exist: {rel}")

        try:
            introduced_blob = git("rev-parse", f"{introduction_commit}:{rel}")
        except subprocess.CalledProcessError as exc:
            raise SystemExit(f"{rel}: not present in documented introduction commit") from exc
        current_blob = git("hash-object", rel)
        if current_blob != introduced_blob:
            raise SystemExit(
                f"{rel}: current binary differs from the documented introduction-commit blob; manual review required"
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

    for record in materialized:
        existing[record["path"]] = record
    policy["assets"] = [existing[path] for path in sorted(existing)]

    print(f"Materialized {len(materialized)} evidence-backed provenance record(s).")
    for record in materialized:
        print(f"  {record['path']}  {record['sha256']}")

    if args.write:
        POLICY_PATH.write_text(json.dumps(policy, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Updated {POLICY_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
