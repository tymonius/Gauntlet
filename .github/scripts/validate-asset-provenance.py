#!/usr/bin/env python3
"""Enforce provenance records for new, replaced, and deduplicated creative/source assets.

Assets that are byte-for-byte identical to the repository's declared provenance
baseline are explicitly tolerated as legacy-unresolved. Any governed asset added
or changed after that baseline must have a complete provenance record whose
SHA-256 matches the checked-in file. Retired duplicate paths may remain in the
provenance ledger only when an explicit retirement maps them to a byte-identical
canonical asset that is still governed and documented.
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
RETIREMENTS_PATH = ROOT / ".github" / "asset-provenance-retirements.json"
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

    try:
        retirements_policy = json.loads(RETIREMENTS_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        retirements_policy = {"version": 1, "retirements": []}
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Asset provenance retirements could not be read: {exc}", file=sys.stderr)
        return 1

    if policy.get("version") != 1:
        errors.append(".github/asset-provenance.json must use version 1")
    if retirements_policy.get("version") != 1:
        errors.append(".github/asset-provenance-retirements.json must use version 1")

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

    retirements_raw = retirements_policy.get("retirements", [])
    if not isinstance(retirements_raw, list):
        errors.append("retirements must be an array")
        retirements_raw = []

    retirements: dict[str, str] = {}
    for index, retirement in enumerate(retirements_raw):
        label = f"retirements[{index}]"
        if not isinstance(retirement, dict):
            errors.append(f"{label} must be an object")
            continue
        retired_path = normalized_repo_path(retirement.get("path"))
        canonical_path = normalized_repo_path(retirement.get("canonicalPath"))
        if retired_path is None:
            errors.append(f"{label}.path must be a normalized repository-relative path")
            continue
        if canonical_path is None:
            errors.append(f"{label}.canonicalPath must be a normalized repository-relative path")
            continue
        if retired_path == canonical_path:
            errors.append(f"{label} must map to a different canonical path")
            continue
        if retired_path in retirements:
            errors.append(f"duplicate asset retirement for {retired_path}")
            continue
        if not meaningful_text(retirement.get("reason")):
            errors.append(f"{label}.reason must be a meaningful, non-placeholder value")
        retirements[retired_path] = canonical_path

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
            # -z makes Git emit path names verbatim instead of C-quoting non-ASCII
            # names such as détente.png.
            tree_output = git("ls-tree", "-r", "-z", baseline)
            for entry in tree_output.split("\0"):
                if not entry or "\t" not in entry:
                    continue
                metadata, path = entry.split("\t", 1)
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

    retired_count = 0
    stale_records = set(records) - current_assets
    for path in sorted(stale_records):
        canonical_path = retirements.get(path)
        if canonical_path is None:
            errors.append(f"{path}: provenance record is stale because the governed asset does not exist")
            continue
        if canonical_path not in current_assets:
            errors.append(
                f"{path}: retirement canonical asset does not exist in governed scope: {canonical_path}"
            )
            continue
        if canonical_path not in records:
            errors.append(
                f"{path}: retirement canonical asset lacks an explicit provenance record: {canonical_path}"
            )
            continue
        retired_checksum = records[path].get("sha256")
        canonical_checksum = sha256_file(ROOT / canonical_path)
        if not isinstance(retired_checksum, str) or retired_checksum.lower() != canonical_checksum.lower():
            errors.append(
                f"{path}: retired provenance checksum does not match canonical asset {canonical_path}"
            )
            continue
        retired_count += 1

    for path, canonical_path in sorted(retirements.items()):
        if path not in records:
            errors.append(f"{path}: retirement has no provenance record to preserve")
        if path in current_assets:
            errors.append(f"{path}: retirement is stale because the retired asset still exists")
        if canonical_path not in current_assets:
            errors.append(f"{path}: retirement points to missing canonical asset {canonical_path}")

    if errors:
        print("Asset provenance validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(
        "Asset provenance OK: "
        f"{legacy_count} legacy-unresolved asset(s), "
        f"{documented_count} explicitly documented asset(s), "
        f"{retired_count} deduplicated retired path(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
