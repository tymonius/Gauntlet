#!/usr/bin/env python3
"""Synchronize the browser Deckbuilder with the v0.6.1 governing sources.

The Deckbuilder continues to parse the governing Markdown at runtime. This script
updates version labels, source paths, parser boundaries, saved-Deck metadata,
legacy battle vocabulary, and required runtime/printing integrations, then
validates all 12 recommended Decks.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DECKBUILDER = ROOT / "deckbuilder"
TEXT_SUFFIXES = {".js", ".json", ".html", ".css", ".md"}

LEGACY_REPLACEMENTS = (
    ("move one space toward their Heartland", "move one position toward their end"),
    ("move one space toward the enemy Heartland", "move one position toward the opponent's end"),
    ("Battle Hands", "Reserves"),
    ("Battle Hand", "Reserve"),
    ("hand commitments", "Gambits"),
    ("hand commitment", "Gambit"),
    ("battle-drawn cards", "Tactics"),
    ("battle-drawn card", "Tactic"),
    ("battle draw cards", "Reserve cards"),
    ("battle draw card", "Reserve card"),
)


def update_text(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    text = original
    text = text.replace("v0.6.0", "v0.6.1")
    text = text.replace("Gauntlet_v0.6_", "Gauntlet_v0.6.1_")
    text = text.replace("v0.6-dev", "v0.6.1")
    text = text.replace("gauntlet-v0.6-dev-deck", "gauntlet-v0.6.1-deck")
    text = text.replace("Untitled v0.6 deck", "Untitled v0.6.1 Deck")
    for legacy, current in LEGACY_REPLACEMENTS:
        text = text.replace(legacy, current)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def patch_app() -> bool:
    path = DECKBUILDER / "app.js"
    original = path.read_text(encoding="utf-8")
    text = original
    text = text.replace(
        'start: "## 6. Canonical Inquisition card pool",\n'
        '    end: "## 7. Card-pool summary",\n'
        '    headingLevel: 3',
        'start: "# 6. Canonical Inquisition card pool",\n'
        '    end: "# 7. Quick reference",\n'
        '    headingLevel: 2',
    )
    text = text.replace(
        'start: "## 6. Canonical Financier card pool",\n'
        '    end: "## 7. Card-pool summary",\n'
        '    headingLevel: 3',
        'start: "# 6. Canonical Financier card pool",\n'
        '    end: "# 7. Quick reference",\n'
        '    headingLevel: 2',
    )
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def patch_territories() -> bool:
    path = DECKBUILDER / "territories.js"
    original = path.read_text(encoding="utf-8")
    text = original.replace(
        "consolidated v0.6 Territory source", "v0.6.1 Territory source"
    )
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def patch_index() -> bool:
    path = DECKBUILDER / "index.html"
    original = path.read_text(encoding="utf-8")
    text = original

    pairing_marker = '  <script src="print-reference-placement.js?v=20260722-1" defer></script>\n'
    pairing_script = '  <script src="print-duplex-sheet-pairing.js?v=20260729-1" defer></script>\n'
    if pairing_script not in text:
        if pairing_marker not in text:
            raise RuntimeError("Deckbuilder print-reference script marker not found")
        text = text.replace(pairing_marker, pairing_marker + pairing_script, 1)

    app_markers = [
        '  <script src="app.js?v=20260729-1" defer></script>\n',
        '  <script src="app.js" defer></script>\n',
    ]
    runtime_script = '  <script src="v061-runtime.js?v=20260729-1" defer></script>\n'
    if runtime_script not in text:
        marker = next((candidate for candidate in app_markers if candidate in text), None)
        if not marker:
            raise RuntimeError("Deckbuilder app-script marker not found")
        text = text.replace(marker, marker + runtime_script, 1)

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def validate() -> list[str]:
    errors: list[str] = []
    app = (DECKBUILDER / "app.js").read_text(encoding="utf-8")
    territories = (DECKBUILDER / "territories.js").read_text(encoding="utf-8")
    completed = (DECKBUILDER / "completed-factions.js").read_text(encoding="utf-8")
    index = (DECKBUILDER / "index.html").read_text(encoding="utf-8")
    combined = "\n".join([app, territories, completed, index])

    forbidden = [
        "v0.6.0",
        "Gauntlet_v0.6_Neutral",
        "Gauntlet_v0.6_Territory",
        "Battle Hand",
        "hand commitment",
        "move one space toward their Heartland",
        "move one space toward the enemy Heartland",
        "battle-drawn card",
    ]
    for term in forbidden:
        if term in combined:
            errors.append(f"Obsolete Deckbuilder term remains: {term}")

    required_paths = [
        "../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
        "../docs/Gauntlet_v0.6.1_Territory_Pool.md",
        "../releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
        "../releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
        "../releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
        "../releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
        "../releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
        "../releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
    ]
    for source in required_paths:
        if source not in combined:
            errors.append(f"Missing Deckbuilder source path: {source}")

    for required_file in ("v061-runtime.js", "print-duplex-sheet-pairing.js"):
        if not (DECKBUILDER / required_file).is_file():
            errors.append(f"Missing Deckbuilder runtime file: {required_file}")
    for required_script in ("v061-runtime.js?v=20260729-1", "print-duplex-sheet-pairing.js?v=20260729-1"):
        if required_script not in index:
            errors.append(f"Deckbuilder index does not load {required_script}")

    starters = json.loads(
        (DECKBUILDER / "starter-decks.json").read_text(encoding="utf-8")
    )
    if starters.get("version") != "v0.6.1":
        errors.append(f"Unexpected starter Deck version: {starters.get('version')}")
    decks = starters.get("decks") or []
    if len(decks) != 12:
        errors.append(f"Expected 12 recommended Decks, found {len(decks)}")
    for deck in decks:
        count = sum(int(item["quantity"]) for item in deck.get("cards", []))
        if count < 30:
            errors.append(f"{deck.get('name')}: only {count} playable cards")
        territories_for_deck = deck.get("territories", [])
        if len(territories_for_deck) != 3:
            errors.append(
                f"{deck.get('name')}: expected three Territories, found {len(territories_for_deck)}"
            )
        if len(set(territories_for_deck)) != len(territories_for_deck):
            errors.append(f"{deck.get('name')}: duplicate Territory selection")
        if sum(name.startswith("Arena:") for name in territories_for_deck) > 1:
            errors.append(f"{deck.get('name')}: more than one Arena")
    return errors


def main() -> int:
    changed: list[str] = []
    for path in DECKBUILDER.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES and update_text(path):
            changed.append(str(path.relative_to(ROOT)))
    if patch_app():
        changed.append("deckbuilder/app.js")
    if patch_territories():
        changed.append("deckbuilder/territories.js")
    try:
        if patch_index():
            changed.append("deckbuilder/index.html")
    except RuntimeError as exc:
        print(f"Deckbuilder v0.6.1 synchronization failed: {exc}", file=sys.stderr)
        return 1

    errors = validate()
    if errors:
        print("Deckbuilder v0.6.1 validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    unique_changed = sorted(set(changed))
    if unique_changed:
        print("Updated:")
        for path in unique_changed:
            print(f"- {path}")
    else:
        print("Deckbuilder sources were already synchronized.")
    print("Validated v0.6.1 source paths, current print fixes, and 12 recommended Decks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
