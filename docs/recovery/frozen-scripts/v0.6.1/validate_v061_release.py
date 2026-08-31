#!/usr/bin/env python3
"""Validate the complete Gauntlet v0.6.1 release package.

This is the release-level gate. It complements the canonical-data generator by
checking governing sources, browser tools, onboarding aids, generated artifacts,
version labels, stale terminology, and package completeness.

The validator has no third-party dependency for source checks. When pypdf and
python-docx are installed, it also validates generated PDF/DOCX outputs.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "releases" / "v0.6.1"

REQUIRED_SOURCES = [
    "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    "releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.md",
    "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    "releases/v0.6.1/Gauntlet_v0.6.1_Release_Notes.md",
    "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md",
    "releases/v0.6.1/Gauntlet_v0.6.1_Manifest.json",
    "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json",
    "releases/v0.6.1/Gauntlet_v0.6.1_Complete_Card_Reference.md",
    "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    "docs/Gauntlet_v0.6.1_Territory_Pool.md",
    "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
    "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
    "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
    "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
    "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
]

REQUIRED_BROWSER_FILES = [
    "rulebook/index.html",
    "rulebook/app.js",
    "card-reference/index.html",
    "card-reference/app.js",
    "deckbuilder/index.html",
    "deckbuilder/app.js",
    "deckbuilder/completed-factions.js",
    "rules-assistant/widget.js",
    "rules-assistant/local-search.js",
    "rules-assistant/worker-v061.js",
    "rules-assistant/worker-entry.js",
    "rules-assistant/wrangler.toml",
    "playtest/index.html",
    "playtest/styles.css",
    "playtest/session/index.html",
    "playtest/session/styles.css",
    "playtest/session/privacy.js",
    "playtest/session/app.js",
    "playtest/batch/index.html",
    "playtest/batch/styles.css",
    "playtest/batch/qrcode-loader.js",
    "playtest/batch/app.js",
    "playtest/player-mat/index.html",
    "playtest/player-mat/styles.css",
]

REQUIRED_GENERATED = [
    "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.docx",
    "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf",
    "releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.docx",
    "releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.pdf",
    "playtest/Gauntlet_v0.6.1_Playtest_Sheet.pdf",
    "playtest/player-mat/Gauntlet_v0.6.1_Player_Mat.pdf",
]

TEXT_EXTENSIONS = {".md", ".html", ".js", ".json", ".css", ".yml", ".yaml", ".txt", ".toml"}

OBSOLETE_RULE_TERMS = {
    "Battle Hand": re.compile(r"\bBattle Hand(?:s)?\b", re.IGNORECASE),
    "hand commitment": re.compile(r"\bhand commitment(?:s)?\b", re.IGNORECASE),
    "battle cleanup": re.compile(r"\bbattle cleanup\b", re.IGNORECASE),
    "breakthrough victory": re.compile(r"\bbreakthrough victory\b", re.IGNORECASE),
}

EXPECTED_COUNTS = {
    "Neutral": 50,
    "Military": 12,
    "Diplomats": 12,
    "Financiers": 12,
    "Intelligence": 12,
    "Mystics": 12,
    "Inquisition": 12,
}


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require_files(paths: Iterable[str], errors: list[str]) -> None:
    for relative in paths:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"Missing required file: {relative}")
        elif path.stat().st_size == 0:
            errors.append(f"Required file is empty: {relative}")


def line_number(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def validate_canonical(errors: list[str]) -> None:
    path = RELEASE / "Gauntlet_v0.6.1_Canonical_Data.json"
    if not path.is_file():
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"Canonical JSON is invalid: {exc}")
        return

    if data.get("version") != "v0.6.1":
        errors.append(f"Canonical version is {data.get('version')!r}, expected 'v0.6.1'")

    cards = data.get("cards") or []
    territories = data.get("territories") or []
    factions = data.get("factions") or []
    if len(cards) != 122:
        errors.append(f"Canonical data contains {len(cards)} playable cards, expected 122")
    if len(territories) != 25:
        errors.append(f"Canonical data contains {len(territories)} Territories, expected 25")
    if sum(bool(item.get("arena")) for item in territories) != 4:
        errors.append("Canonical data must contain exactly four Arenas")
    if len(factions) != 6:
        errors.append(f"Canonical data contains {len(factions)} factions, expected 6")

    pool_counts = Counter(card.get("allegiance") for card in cards)
    for allegiance, expected in EXPECTED_COUNTS.items():
        if pool_counts[allegiance] != expected:
            errors.append(
                f"Canonical {allegiance} pool contains {pool_counts[allegiance]} cards, expected {expected}"
            )

    duplicate_cards = [
        name for name, count in Counter(card.get("name") for card in cards).items() if count > 1
    ]
    if duplicate_cards:
        errors.append(f"Duplicate playable-card titles: {duplicate_cards}")
    duplicate_territories = [
        name for name, count in Counter(item.get("name") for item in territories).items() if count > 1
    ]
    if duplicate_territories:
        errors.append(f"Duplicate Territory titles: {duplicate_territories}")

    battle = data.get("battle") or {}
    expected_destinations = {
        "gambit_destination": "Graveyard",
        "tactic_destination": "Discard Pile",
        "remaining_reserve_destination": "Discard Pile",
    }
    for key, expected in expected_destinations.items():
        if battle.get(key) != expected:
            errors.append(f"Canonical battle.{key} is {battle.get(key)!r}, expected {expected!r}")


def validate_manifest(errors: list[str], strict_generated: bool) -> None:
    path = RELEASE / "Gauntlet_v0.6.1_Manifest.json"
    if not path.is_file():
        return
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"Manifest JSON is invalid: {exc}")
        return

    if manifest.get("version") != "v0.6.1":
        errors.append("Manifest version is not v0.6.1")
    if manifest.get("playable_card_designs") != 122:
        errors.append("Manifest playable-card total is not 122")
    if manifest.get("territories") != 25 or manifest.get("arenas") != 4:
        errors.append("Manifest Territory/Arena totals are incorrect")

    validation = manifest.get("validation") or {}
    for key in ("source_audit_complete", "canonical_data_generated", "automated_checks_passed"):
        if validation.get(key) is not True:
            errors.append(f"Manifest validation.{key} is not true")
    if strict_generated and validation.get("ready_for_publication") is True:
        required_ready_checks = (
            "browser_checks_passed",
            "document_visual_checks_passed",
            "faction_sheet_visual_checks_passed",
            "faction_pdf_page_validation_passed",
            "formal_session_lifecycle_tested",
            "complete_print_package_visual_checks_passed",
            "production_workers_deployed",
            "physical_qr_session_test_passed",
        )
        for key in required_ready_checks:
            if validation.get(key) is not True:
                errors.append(f"Manifest says publication-ready while validation.{key} is not true")
        if manifest.get("status") != "published":
            errors.append("Manifest says publication-ready while status is not published")
        if not manifest.get("publication_date"):
            errors.append("Manifest says publication-ready without a publication date")
        if manifest.get("remaining_release_work"):
            errors.append("Manifest says publication-ready while remaining release work is listed")
        public_links = manifest.get("public_links") or {}
        for key in ("project_site", "release_package", "browser_rulebook", "rulebook_pdf", "card_reference", "deckbuilder", "faction_sheets", "playtest_sheet"):
            if not public_links.get(key):
                errors.append(f"Manifest says publication-ready without public_links.{key}")


def validate_source_terminology(errors: list[str]) -> None:
    scan_paths = [*REQUIRED_SOURCES, *REQUIRED_BROWSER_FILES]
    for relative in scan_paths:
        path = ROOT / relative
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        text = path.read_text(encoding="utf-8")
        for label, pattern in OBSOLETE_RULE_TERMS.items():
            for match in pattern.finditer(text):
                nearby = text[max(0, match.start() - 90): match.end() + 90].lower()
                if "obsolete" in nearby or "forbidden" in nearby or "must not" in nearby:
                    continue
                errors.append(
                    f"{relative}:{line_number(text, match.start())}: obsolete rule term {label!r}"
                )


def validate_browser_sources(errors: list[str]) -> None:
    checks = {
        "rulebook/index.html": [
            "../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf",
            "Canonical rules · version 0.6.1",
        ],
        "rulebook/app.js": [
            "../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
            "../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf",
        ],
        "rules-assistant/local-search.js": [
            "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json",
            "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
        ],
        "rules-assistant/widget.js": [
            "playtestSessionId",
            "sheetSerial",
        ],
        "rules-assistant/worker-v061.js": [
            'const RULES_VERSION = "v0.6.1"',
            "sanitizePlaytestContext(payload)",
            "INSERT OR IGNORE INTO playtest_arbiter_links",
        ],
        "rules-assistant/worker-entry.js": [
            'import worker from "./worker-v061.js"',
            'url.pathname === "/api/v061/rules"',
            "return worker.fetch(",
        ],
        "rules-assistant/wrangler.toml": [
            'main = "worker-entry.js"',
            'SITE_ORIGIN = "https://gauntlet.run"',
        ],
        "deckbuilder/index.html": [
            "v0.6.1 Deckbuilder",
            "v061-runtime.js",
        ],
        "playtest/index.html": [
            "Generate coded batch",
            'id="session-qr"',
            'id="sheet-serial"',
        ],
        "playtest/session/index.html": [
            "Formal v0.6.1 playtest",
            "Ask the Rules Arbiter",
            'name="robots" content="noindex, nofollow"',
        ],
        "playtest/session/app.js": [
            "gauntlet_playtest_session_id",
            "installRulesInteractionLinker",
            "/arbiter",
        ],
        "playtest/batch/index.html": [
            "Coded Sheet Generator",
            "Download host manifest",
            'src="qrcode-loader.js',
        ],
        "playtest/batch/app.js": [
            "createQrCode(created.joinUrl)",
            "sensitive: true",
            "sheetTemplate.cloneNode(true)",
        ],
    }
    for relative, required in checks.items():
        path = ROOT / relative
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for value in required:
            if value not in text:
                errors.append(f"{relative}: missing required v0.6.1 source marker {value!r}")


def validate_generated_documents(errors: list[str], strict: bool) -> None:
    missing = [relative for relative in REQUIRED_GENERATED if not (ROOT / relative).is_file()]
    if missing:
        if strict:
            errors.extend(f"Missing generated release artifact: {relative}" for relative in missing)
        return

    for relative in REQUIRED_GENERATED:
        path = ROOT / relative
        if path.stat().st_size < 10_000:
            errors.append(f"Generated artifact is unexpectedly small: {relative}")

    try:
        from docx import Document
    except ImportError:
        Document = None
    try:
        from pypdf import PdfReader
    except ImportError:
        PdfReader = None

    if Document:
        for relative in REQUIRED_GENERATED:
            if not relative.endswith(".docx"):
                continue
            document = Document(ROOT / relative)
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
            for term in ("Gambit", "Tactic", "Aftermath"):
                if term not in text:
                    errors.append(f"{relative}: generated DOCX is missing {term}")
            if "v0.6.0" in text:
                errors.append(f"{relative}: generated DOCX still identifies v0.6.0")

    if PdfReader:
        for relative in REQUIRED_GENERATED:
            if not relative.endswith(".pdf"):
                continue
            reader = PdfReader(ROOT / relative)
            if not reader.pages:
                errors.append(f"{relative}: generated PDF has no pages")
                continue
            text = "\n".join((page.extract_text() or "") for page in reader.pages)
            if "v0.6.0" in text:
                errors.append(f"{relative}: generated PDF still identifies v0.6.0")
            if relative.endswith(("Rulebook.pdf", "Reference_Guide.pdf")):
                for term in ("Gambit", "Tactic", "Aftermath"):
                    if term not in text:
                        errors.append(f"{relative}: generated PDF is missing {term}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict-generated",
        action="store_true",
        help="Require all release PDFs and DOCX files to exist.",
    )
    args = parser.parse_args()

    errors: list[str] = []
    require_files(REQUIRED_SOURCES, errors)
    require_files(REQUIRED_BROWSER_FILES, errors)
    validate_canonical(errors)
    validate_manifest(errors, args.strict_generated)
    validate_source_terminology(errors)
    validate_browser_sources(errors)
    validate_generated_documents(errors, args.strict_generated)

    if errors:
        print("Gauntlet v0.6.1 release validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    mode = "strict" if args.strict_generated else "source"
    print(
        f"Gauntlet v0.6.1 {mode} validation passed: governing sources, 122 cards, "
        "25 Territories/Arenas, six factions, browser and formal-playtest source markers, "
        "and package metadata."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
