#!/usr/bin/env python3
"""Enforce provenance records for new or replaced creative/source assets.

Assets that are byte-for-byte identical to the repository's declared provenance
baseline are explicitly tolerated as legacy-unresolved. Any governed asset added
or changed after that baseline must have a complete provenance record whose
SHA-256 matches the checked-in file.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / ".github" / "asset-provenance.json"
ALLOWED_ORIGINS = {
    "project-created",
    "commissioned",
    "generated",
    "third-party",
}
PLACEHOLDER_VALUES = {
    "?",
    "n/a",
    "na",
    "none",
    "tbd",
    "todo",
    "unknown",
    "unresolved",
}
HEX_40 = re.compile(r"^[0-9a-fA-F]{40}$")
HEX_64 = re.compile(r"^[0-9a-fA-F]{64}$")


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def under_prefix(path: str, prefix: str) -> bool:
    clean = prefix.rstrip("/")
    return path == clean or path.startswith(clean + "/")


def normalized_repo_path(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    path = value.strip().replace("\\", "/")
    if not path or path.startswith("/"):
        return None
    parts = Path(path).parts
    if ".." in parts or "." in parts:
        return None
    return path


def meaningful_text(value: object) -> bool:
    if not isinstance(value, str):
        return False
    text = value.strip()
    return bool(text) and text.casefold() not in PLACEHOLDER_VALUES


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    errors: list[str] = []

    try:
        policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Asset provenance policy could not be read: {exc}", file=sys.stderr)
        return 1

    if policy.get("version") != 1:
        errors.append(".github/asset-provenance.json must use version 1")

    baseline = policy.get("baseline_commit")
    if not isinstance(baseline, str) or not HEX_40.fullmatch(baseline):
        errors.append("baseline_commit must be a full 40-character Git commit SHA")
        baseline = ""

    policy_config = policy.get("policy")
    if not isinstance(policy_config, dict):
        errors.append("policy must be an object")
        policy_config = {}

    roots_raw = policy_config.get("governed_roots", [])
    extensions_raw = policy_config.get("extensions", [])
    ignored_raw = policy_config.get("ignored_paths", [])

    roots: list[str] = []
    if not isinstance(roots_raw, list) or not roots_raw:
        errors.append("policy.governed_roots must be a non-empty array")
    else:
        for value in roots_raw:
            normalized = normalized_repo_path(value)
            if normalized is None:
                errors.append(f"invalid governed root: {value!r}")
            else:
                roots.append(normalized.rstrip("/"))

    extensions: set[str] = set()
    if not isinstance(extensions_raw, list) or not extensions_raw:
        errors.append("policy.extensions must be a non-empty array")
    else:
        for value in extensions_raw:
            if not isinstance(value, str) or not re.fullmatch(r"\.[A-Za-z0-9]+", value):
                errors.append(f"invalid governed extension: {value!r}")
            else:
                extensions.add(value.lower())

    ignored: list[str] = []
    if not isinstance(ignored_raw, list):
        errors.append("policy.ignored_paths must be an array")
    else:
        for value in ignored_raw:
            normalized = normalized_repo_path(value)
            if normalized is None:
                errors.append(f"invalid ignored path: {value!r}")
            else:
                ignored.append(normalized.rstrip("/"))

    if policy_config.get("legacy_default_status") != "legacy-unresolved":
        errors.append('policy.legacy_default_status must be "legacy-unresolved"')

    def governed(path: str) -> bool:
        return (
            any(under_prefix(path, root) for root in roots)
            and Path(path).suffix.lower() in extensions
            and not any(under_prefix(path, prefix) for prefix in ignored)
        )

    records_raw = policy.get("assets", [])
    if not isinstance(records_raw, list):
        errors.append("assets must be an array")
        records_raw = []

    records: dict[str, dict[str, object]] = {}
    for index, record in enumerate(records_raw):
        label = f"assets[{index}]"
        if not isinstance(record, dict):
            errors.append(f"{label} must be an object")
            continue

        path = normalized_repo_path(record.get("path"))
        if path is None:
            errors.append(f"{label}.path must be a normalized repository-relative path")
            continue
        if path in records:
            errors.append(f"duplicate provenance record for {path}")
            continue
        records[path] = record

        if not governed(path):
            errors.append(f"provenance record is outside governed asset scope: {path}")

        origin = record.get("origin")
        if origin not in ALLOWED_ORIGINS:
            errors.append(
                f"{path}: origin must be one of {', '.join(sorted(ALLOWED_ORIGINS))}"
            )

        for field in ("creator", "source", "rights"):
            if not meaningful_text(record.get(field)):
                errors.append(f"{path}: {field} must be a meaningful, non-placeholder value")

        checksum = record.get("sha256")
        if not isinstance(checksum, str) or not HEX_64.fullmatch(checksum):
            errors.append(f"{path}: sha256 must be a 64-character hexadecimal digest")

    current_assets: set[str] = set()
    for root in roots:
        root_path = ROOT / root
        if not root_path.exists():
            errors.append(f"governed root does not exist: {root}")
            continue
        if not root_path.is_dir():
            errors.append(f"governed root is not a directory: {root}")
            continue
        for candidate in root_path.rglob("*"):
            if candidate.is_file():
                relative = candidate.relative_to(ROOT).as_posix()
                if governed(relative):
                    current_assets.add(relative)

    baseline_blobs: dict[str, str] = {}
    if baseline:
        try:
            git("cat-file", "-e", f"{baseline}^{{commit}}")
            tree_output = git("ls-tree", "-r", baseline)
            for line in tree_output.splitlines():
                if "\t" not in line:
                    continue
                metadata, path = line.split("\t", 1)
                fields = metadata.split()
                if len(fields) == 3 and fields[1] == "blob":
                    baseline_blobs[path] = fields[2]
        except subprocess.CalledProcessError as exc:
            detail = exc.stderr.strip() or str(exc)
            errors.append(f"baseline_commit cannot be resolved by Git: {detail}")

    documented_count = 0
    legacy_count = 0

    for path in sorted(current_assets):
        record = records.get(path)
        absolute = ROOT / path

        if record is not None:
            checksum = record.get("sha256")
            if isinstance(checksum, str) and HEX_64.fullmatch(checksum):
                actual = sha256_file(absolute)
                if actual.lower() != checksum.lower():
                    errors.append(
                        f"{path}: sha256 mismatch; asset changed without a provenance record update"
                    )
                else:
                    documented_count += 1
            continue

        baseline_blob = baseline_blobs.get(path)
        if baseline_blob is None:
            errors.append(
                f"{path}: new governed asset lacks an explicit provenance record"
            )
            continue

        try:
            current_blob = git("hash-object", path).strip()
        except subprocess.CalledProcessError as exc:
            detail = exc.stderr.strip() or str(exc)
            errors.append(f"{path}: could not compute Git blob identity: {detail}")
            continue

        if current_blob != baseline_blob:
            errors.append(
                f"{path}: governed asset changed since the legacy baseline and now requires an explicit provenance record"
            )
        else:
            legacy_count += 1

    for path in sorted(set(records) - current_assets):
        errors.append(f"{path}: provenance record is stale because the governed asset does not exist")

    if errors:
        print("Asset provenance validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(
        "Asset provenance OK: "
        f"{legacy_count} legacy-unresolved asset(s), "
        f"{documented_count} explicitly documented asset(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
