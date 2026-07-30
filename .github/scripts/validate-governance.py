#!/usr/bin/env python3
"""Validate Gauntlet decision provenance and implementation traceability."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
REGISTRY_PATH = ROOT / "governance" / "decision-registry.json"
TRACEABILITY_PATH = ROOT / "governance" / "traceability.json"
CANONICAL_PATH = ROOT / "releases" / "v0.6.0" / "Gauntlet_v0.6.0_Canonical_Data.json"

DECISION_ID = re.compile(r"^GNT-DEC-\d{4}-\d{4}-\d{3}$")
DECISION_STATUSES = {
    "proposed",
    "approved",
    "canonicalized",
    "implemented",
    "released",
    "quarantined",
    "superseded",
    "deprecated",
}
SUBJECT_STATUSES = {
    "implemented",
    "quarantined",
    "not_implemented",
    "in_progress",
    "canonicalized",
    "released",
}
SURFACE_STATUSES = {
    "complete",
    "partial",
    "unknown",
    "not_applicable",
    "not_implemented",
    "in_progress",
    "quarantined",
}
TEXT_EXTENSIONS = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".py",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}


class Validation:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load_json(path: Path, validation: Validation) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as handle:
            value = json.load(handle)
    except FileNotFoundError:
        validation.error(f"Missing required file: {path.relative_to(ROOT)}")
        return {}
    except json.JSONDecodeError as exc:
        validation.error(
            f"Invalid JSON in {path.relative_to(ROOT)} at line {exc.lineno}, column {exc.colno}: {exc.msg}"
        )
        return {}
    if not isinstance(value, dict):
        validation.error(f"{path.relative_to(ROOT)} must contain a JSON object.")
        return {}
    return value


def require_string(obj: dict[str, Any], key: str, context: str, validation: Validation) -> str:
    value = obj.get(key)
    if not isinstance(value, str) or not value.strip():
        validation.error(f"{context}.{key} must be a non-empty string.")
        return ""
    return value


def require_string_list(
    obj: dict[str, Any],
    key: str,
    context: str,
    validation: Validation,
    *,
    allow_empty: bool = True,
) -> list[str]:
    value = obj.get(key)
    if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
        validation.error(f"{context}.{key} must be a list of non-empty strings.")
        return []
    if not allow_empty and not value:
        validation.error(f"{context}.{key} must not be empty.")
    return value


def validate_registry(registry: dict[str, Any], validation: Validation) -> dict[str, dict[str, Any]]:
    if registry.get("schema_version") != 1:
        validation.error("governance/decision-registry.json schema_version must be 1.")
    decisions = registry.get("decisions")
    if not isinstance(decisions, list):
        validation.error("governance/decision-registry.json decisions must be an array.")
        return {}

    by_id: dict[str, dict[str, Any]] = {}
    subject_owners: dict[str, list[str]] = {}
    for index, raw in enumerate(decisions):
        context = f"decision[{index}]"
        if not isinstance(raw, dict):
            validation.error(f"{context} must be an object.")
            continue
        decision_id = require_string(raw, "id", context, validation)
        if decision_id and not DECISION_ID.fullmatch(decision_id):
            validation.error(
                f"{context}.id '{decision_id}' must match GNT-DEC-YYYY-MMDD-NNN."
            )
        if decision_id in by_id:
            validation.error(f"Duplicate decision ID: {decision_id}")
        elif decision_id:
            by_id[decision_id] = raw

        require_string(raw, "title", context, validation)
        require_string(raw, "recorded_on", context, validation)
        require_string(raw, "summary", context, validation)
        status = require_string(raw, "status", context, validation)
        if status and status not in DECISION_STATUSES:
            validation.error(f"{context}.status '{status}' is not supported.")
        kind = require_string(raw, "kind", context, validation)
        if kind not in {"card", "rule", "terminology", "governance", "release", "tooling"}:
            validation.error(f"{context}.kind '{kind}' is not supported.")

        subjects = require_string_list(raw, "subjects", context, validation, allow_empty=False)
        for subject in subjects:
            subject_owners.setdefault(subject, []).append(decision_id)

        evidence = raw.get("evidence", [])
        if not isinstance(evidence, list) or any(not isinstance(item, str) for item in evidence):
            validation.error(f"{context}.evidence must be a list of strings.")

        for key in ("supersedes_decision_ids", "supersedes_subjects"):
            require_string_list(raw, key, context, validation)

        guards = raw.get("current_source_guards", [])
        if not isinstance(guards, list):
            validation.error(f"{context}.current_source_guards must be an array.")
        else:
            for guard_index, guard in enumerate(guards):
                guard_context = f"{context}.current_source_guards[{guard_index}]"
                if not isinstance(guard, dict):
                    validation.error(f"{guard_context} must be an object.")
                    continue
                require_string(guard, "term", guard_context, validation)
                require_string_list(guard, "roots", guard_context, validation, allow_empty=False)
                require_string_list(guard, "allowed_paths", guard_context, validation)

    for decision_id, decision in by_id.items():
        for superseded in decision.get("supersedes_decision_ids", []):
            if superseded not in by_id:
                validation.error(
                    f"{decision_id} supersedes unknown decision ID {superseded}."
                )
            elif superseded == decision_id:
                validation.error(f"{decision_id} cannot supersede itself.")

    for subject, owners in subject_owners.items():
        if len(owners) > 1:
            active = [
                owner
                for owner in owners
                if by_id.get(owner, {}).get("status") not in {"superseded", "deprecated"}
            ]
            if len(active) > 1:
                validation.warn(
                    f"Subject {subject} has multiple active decisions: {', '.join(active)}. "
                    "This is allowed only when their scopes do not conflict."
                )
    return by_id


def validate_surface(
    subject_id: str,
    surface_name: str,
    surface: Any,
    validation: Validation,
) -> tuple[str, list[str]]:
    context = f"{subject_id}.{surface_name}"
    if not isinstance(surface, dict):
        validation.error(f"{context} must be an object.")
        return "", []
    status = surface.get("status")
    paths = surface.get("paths")
    if status not in SURFACE_STATUSES:
        validation.error(f"{context}.status '{status}' is not supported.")
        status = ""
    if not isinstance(paths, list) or any(not isinstance(path, str) or not path for path in paths):
        validation.error(f"{context}.paths must be a list of non-empty strings.")
        paths = []
    if status == "complete" and not paths:
        validation.error(f"{context} is complete but declares no paths.")
    for relative in paths:
        path = ROOT / relative
        if not path.exists():
            validation.error(f"{context} references missing path: {relative}")
    return status, paths


def validate_traceability(
    traceability: dict[str, Any],
    decisions: dict[str, dict[str, Any]],
    canonical: dict[str, Any],
    validation: Validation,
) -> None:
    if traceability.get("schema_version") != 1:
        validation.error("governance/traceability.json schema_version must be 1.")
    subjects = traceability.get("subjects")
    if not isinstance(subjects, list):
        validation.error("governance/traceability.json subjects must be an array.")
        return

    cards = canonical.get("cards")
    if not isinstance(cards, list):
        validation.error(f"{CANONICAL_PATH.relative_to(ROOT)} cards must be an array.")
        cards = []
    canonical_cards = {
        card.get("id"): card
        for card in cards
        if isinstance(card, dict) and isinstance(card.get("id"), str)
    }

    seen: set[str] = set()
    covered_decisions: set[str] = set()
    for index, raw in enumerate(subjects):
        context = f"traceability.subjects[{index}]"
        if not isinstance(raw, dict):
            validation.error(f"{context} must be an object.")
            continue
        subject_id = require_string(raw, "subject_id", context, validation)
        if subject_id in seen:
            validation.error(f"Duplicate traceability subject: {subject_id}")
        seen.add(subject_id)

        kind = require_string(raw, "kind", context, validation)
        decision_ids = require_string_list(
            raw, "decision_ids", context, validation, allow_empty=False
        )
        for decision_id in decision_ids:
            if decision_id not in decisions:
                validation.error(f"{subject_id} references unknown decision ID {decision_id}.")
            else:
                covered_decisions.add(decision_id)
                if subject_id not in decisions[decision_id].get("subjects", []):
                    validation.error(
                        f"{subject_id} references {decision_id}, but that decision does not list the subject."
                    )

        expected = raw.get("expected")
        if kind == "card":
            card = canonical_cards.get(subject_id)
            if card is None:
                validation.error(
                    f"{subject_id} is a traced card but is missing from the v0.6.0 canonical data."
                )
            if not isinstance(expected, dict):
                validation.error(f"{subject_id}.expected must be an object for cards.")
            elif card is not None:
                for field in ("name", "cost", "trait", "unique", "action", "battle"):
                    if field not in expected:
                        validation.error(f"{subject_id}.expected is missing {field}.")
                        continue
                    if card.get(field) != expected.get(field):
                        validation.error(
                            f"{subject_id} canonical {field} drift: expected "
                            f"{expected.get(field)!r}, found {card.get(field)!r}."
                        )

        surface_statuses: dict[str, str] = {}
        for surface_name in (
            "canonical",
            "rules_reference",
            "engine",
            "deckbuilder",
            "print_art",
            "tests",
        ):
            status, _ = validate_surface(
                subject_id, surface_name, raw.get(surface_name), validation
            )
            surface_statuses[surface_name] = status

        overall = raw.get("overall_status")
        if overall not in SUBJECT_STATUSES:
            validation.error(f"{subject_id}.overall_status '{overall}' is not supported.")
        if overall in {"implemented", "released"}:
            for required in ("canonical", "rules_reference", "engine", "tests"):
                if surface_statuses.get(required) != "complete":
                    validation.error(
                        f"{subject_id} is {overall}, but {required} is "
                        f"{surface_statuses.get(required)!r} instead of complete."
                    )
        if overall == "quarantined":
            if not isinstance(raw.get("quarantine_reason"), str) or not raw.get(
                "quarantine_reason", ""
            ).strip():
                validation.error(f"{subject_id} is quarantined without a quarantine_reason.")
            if surface_statuses.get("engine") not in {"quarantined", "partial"}:
                validation.error(
                    f"{subject_id} is quarantined, but engine status is not quarantined or partial."
                )
        if overall == "not_implemented":
            if surface_statuses.get("engine") not in {"not_implemented", "in_progress"}:
                validation.error(
                    f"{subject_id} is not_implemented, but engine status is "
                    f"{surface_statuses.get('engine')!r}."
                )

    for decision_id, decision in decisions.items():
        if decision.get("kind") == "governance":
            continue
        if decision.get("status") in {"superseded", "deprecated"}:
            continue
        if decision_id not in covered_decisions:
            validation.error(
                f"Active decision {decision_id} has no traceability subject entry."
            )


def iter_guard_files(root_spec: str) -> list[Path]:
    root = ROOT / root_spec
    if not root.exists():
        return []
    if root.is_file():
        return [root] if root.suffix.lower() in TEXT_EXTENSIONS else []
    return [
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS
    ]


def validate_source_guards(
    registry: dict[str, Any], validation: Validation
) -> None:
    for decision in registry.get("decisions", []):
        if not isinstance(decision, dict):
            continue
        decision_id = decision.get("id", "<unknown>")
        for guard in decision.get("current_source_guards", []):
            if not isinstance(guard, dict):
                continue
            term = guard.get("term")
            roots = guard.get("roots", [])
            allowed = set(guard.get("allowed_paths", []))
            if not isinstance(term, str) or not term:
                continue
            checked: set[Path] = set()
            for root_spec in roots:
                if not isinstance(root_spec, str):
                    continue
                for path in iter_guard_files(root_spec):
                    if path in checked:
                        continue
                    checked.add(path)
                    relative = path.relative_to(ROOT).as_posix()
                    if relative in allowed:
                        continue
                    try:
                        content = path.read_text(encoding="utf-8")
                    except UnicodeDecodeError:
                        continue
                    if term in content:
                        validation.error(
                            f"{decision_id} source guard found forbidden current term "
                            f"{term!r} in {relative}."
                        )


def main() -> int:
    validation = Validation()
    registry = load_json(REGISTRY_PATH, validation)
    traceability = load_json(TRACEABILITY_PATH, validation)
    canonical = load_json(CANONICAL_PATH, validation)

    decisions = validate_registry(registry, validation)
    validate_traceability(traceability, decisions, canonical, validation)
    validate_source_guards(registry, validation)

    for warning in validation.warnings:
        print(f"WARNING: {warning}")
    if validation.errors:
        print("\nGovernance integrity validation failed:")
        for error in validation.errors:
            print(f"  - {error}")
        return 1

    subject_count = len(traceability.get("subjects", []))
    decision_count = len(registry.get("decisions", []))
    print(
        f"Governance integrity passed: {decision_count} decisions and "
        f"{subject_count} traced subjects validated."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
