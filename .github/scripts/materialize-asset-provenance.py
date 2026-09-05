#!/usr/bin/env python3
"""Materialize or verify evidence-backed legacy asset provenance records.

Each remediation batch identifies a historical Git checkpoint that must contain the
same binary as the file currently checked in. The checkpoint may be the original
introduction commit or a later evidence/identity commit. Per-asset overrides are
supported. Batches may also name tightly scoped path prefixes when the evidence
explicitly applies to the complete governed corpus under those prefixes.
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


def is_ignored(rel: str, ignored_paths: tuple[str, ...]) -> bool:
    for ignored in ignored_paths:
        normalized = ignored.rstrip("/")
        if rel == normalized or rel.startswith(normalized + "/"):
            return True
    return False


def discover_prefix_assets(
    prefixes: list[str], governed_extensions: set[str], ignored_paths: tuple[str, ...]
) -> list[str]:
    discovered: set[str] = set()
    for prefix in prefixes:
        if not isinstance(prefix, str) or not prefix.strip():
            raise SystemExit("asset_prefixes entries must be non-empty strings")
        normalized = prefix.strip().lstrip("./")
        output = git("ls-files", "--", normalized)
        for rel in output.splitlines():
            if not rel or is_ignored(rel, ignored_paths):
                continue
            if Path(rel).suffix.lower() not in governed_extensions:
                continue
            if (ROOT / rel).is_file():
                discovered.add(rel)
    return sorted(discovered)


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

    policy_rules = policy.get("policy", {})
    governed_extensions = {
        ext.lower() for ext in policy_rules.get("extensions", [])
        if isinstance(ext, str) and ext.startswith(".")
    }
    ignored_paths = tuple(
        path for path in policy_rules.get("ignored_paths", []) if isinstance(path, str)
    )
    if not governed_extensions:
        raise SystemExit("asset provenance policy must define governed extensions")

    current_by_path = {record["path"]: record for record in policy.get("assets", [])}
    materialized: list[dict[str, str]] = []
    seen_paths: set[str] = set()

    for batch_index, batch in enumerate(normalize_batches(evidence), start=1):
        if not isinstance(batch, dict):
            raise SystemExit(f"batch {batch_index} must be an object")
        batch_id = batch.get("id", f"batch-{batch_index}")
        defaults = batch.get("defaults")
        basis = batch.get("evidence_basis")
        explicit_candidates = batch.get("assets", [])
        prefixes = batch.get("asset_prefixes", [])
        if not isinstance(defaults, dict) or not isinstance(basis, dict):
            raise SystemExit(f"{batch_id}: invalid batch structure")
        if not isinstance(explicit_candidates, list) or not isinstance(prefixes, list):
            raise SystemExit(f"{batch_id}: assets and asset_prefixes must be lists")
        if not explicit_candidates and not prefixes:
            raise SystemExit(f"{batch_id}: batch must contain assets and/or asset_prefixes")

        candidates: list[dict] = []
        explicit_paths: set[str] = set()
        for candidate in explicit_candidates:
            if not isinstance(candidate, dict) or not isinstance(candidate.get("path"), str):
                raise SystemExit(f"{batch_id}: every remediation candidate must contain a path")
            rel = candidate["path"]
            if rel in explicit_paths:
                raise SystemExit(f"{batch_id}: duplicate explicit remediation path: {rel}")
            explicit_paths.add(rel)
            candidates.append(candidate)

        for rel in discover_prefix_assets(prefixes, governed_extensions, ignored_paths):
            if rel not in explicit_paths:
                candidates.append({"path": rel})

        if not candidates:
            raise SystemExit(f"{batch_id}: no governed assets found for configured scope")

        for candidate in candidates:
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

    materialized.sort(key=lambda record: record["path"])
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
