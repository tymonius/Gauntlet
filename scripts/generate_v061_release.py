#!/usr/bin/env python3
"""Generate and validate Gauntlet v0.6.1 structured release data.

The governing Markdown sources remain authoritative. This script parses their exact
card and Territory entries, carries forward stable non-text metadata from v0.6.0,
and generates:

- releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json
- releases/v0.6.1/Gauntlet_v0.6.1_Complete_Card_Reference.md

Run from anywhere inside the repository:

    python scripts/generate_v061_release.py
    python scripts/generate_v061_release.py --check

The --check mode generates in memory and fails when the tracked outputs differ.
Only the Python standard library is required.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

VERSION = "v0.6.1"
RELEASE_NAME = "First Playtest Revision"
STATUS = "Draft pre-release playtest edition"

EXPECTED_CARD_COUNTS = {
    "Neutral": 50,
    "Military": 12,
    "Diplomats": 12,
    "Financiers": 12,
    "Intelligence": 12,
    "Mystics": 12,
    "Inquisition": 12,
}

EXPECTED_TOTAL_VALUES = {
    "Neutral": 119,
    "Military": 35,
    "Diplomats": 35,
    "Financiers": 36,
    "Intelligence": 36,
    "Mystics": 36,
    "Inquisition": 37,
}

EXPECTED_UNIQUE = {
    "Neutral": ["Manifest Destiny"],
    "Military": ["Shock and Awe"],
    "Diplomats": [],
    "Financiers": ["Corner the Market"],
    "Intelligence": ["Sleeper Network"],
    "Mystics": ["Necromancy"],
    "Inquisition": [],
}

FACTION_CONFIG: dict[str, dict[str, Any]] = {
    "Military": {
        "id": "military",
        "color": "crimson red",
        "resource": "Command (maximum 2)",
        "leaders": ["General", "Commandant"],
        "victory": "Run the Gauntlet.",
        "source": "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
        "path": "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
    },
    "Diplomats": {
        "id": "diplomats",
        "color": "royal blue",
        "resource": "Influence (0–10)",
        "leaders": ["Ambassador", "Senator"],
        "victory": "Run the Gauntlet or complete the Peace Treaty.",
        "source": "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
        "path": "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    },
    "Financiers": {
        "id": "financiers",
        "color": "emerald green",
        "resource": "Capital (dynamic limit)",
        "leaders": ["Banker", "Executive"],
        "victory": "Run the Gauntlet or achieve Controlling Interest.",
        "source": "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
        "path": "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
    },
    "Intelligence": {
        "id": "intelligence",
        "color": "charcoal/black",
        "resource": "Intel and Operation Progress",
        "leaders": ["Ranger", "Spymaster"],
        "victory": "Run the Gauntlet or complete a Special Operation.",
        "source": "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
        "path": "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
    },
    "Mystics": {
        "id": "mystics",
        "color": "deep violet",
        "resource": None,
        "leaders": ["Alchemist", "Spirit Walker"],
        "victory": "Run the Gauntlet or complete the Ritual of Ascendance.",
        "source": "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
        "path": "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
    },
    "Inquisition": {
        "id": "inquisition",
        "color": "antique gold/ochre",
        "resource": "Conviction (maximum 4)",
        "leaders": ["Grand Inquisitor", "Witch Hunter"],
        "victory": "Run the Gauntlet or achieve Purification.",
        "source": "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
        "path": "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
    },
}

NEUTRAL_SOURCE = "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md"
TERRITORY_SOURCE = "docs/Gauntlet_v0.6.1_Territory_Pool.md"
BASELINE_DATA = "releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json"
CANONICAL_OUTPUT = "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"
REFERENCE_OUTPUT = "releases/v0.6.1/Gauntlet_v0.6.1_Complete_Card_Reference.md"

EFFECT_LABELS = {
    "Action",
    "Gambit",
    "Tactic",
    "Battle",
    "Mission",
    "Terms",
    "Accepted",
    "Refused",
    "Asset",
    "Overlay",
    "Loan",
    "Capacity",
    "Activate",
    "Compromised",
    "Other removal",
    "Effect",
    "Completion",
}

STALE_TERMS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Battle Hand", re.compile(r"\bBattle Hand(?:s)?\b", re.IGNORECASE)),
    ("hand commitment", re.compile(r"\bhand commitment(?:s)?\b", re.IGNORECASE)),
    ("battle cleanup", re.compile(r"\bbattle cleanup\b", re.IGNORECASE)),
    ("Heartland", re.compile(r"\bHeartland(?:s)?\b", re.IGNORECASE)),
    ("breakthrough victory", re.compile(r"\bbreakthrough victory\b", re.IGNORECASE)),
)


class GenerationError(RuntimeError):
    """Raised when a governing source cannot be parsed or validated."""


@dataclass
class ParsedEntry:
    name: str
    source: str
    cost: int | None = None
    complexity: str | None = None
    trait: str | None = None
    card_form: str | None = None
    unique: bool = False
    unique_rule: str | None = None
    effects: list[dict[str, str]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    arena: bool = False


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def read_text(root: Path, relative: str) -> str:
    path = root / relative
    if not path.is_file():
        raise GenerationError(f"Missing source: {relative}")
    return path.read_text(encoding="utf-8")


def slugify(value: str) -> str:
    value = value.lower().replace("’", "").replace("'", "")
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s-]+", "-", value).strip("-")
    return value


def strip_markdown(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
    return text.strip()


def split_h2_sections(text: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"^##\s+(.+?)\s*$", text, re.MULTILINE))
    sections: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        sections.append((match.group(1).strip(), text[start:end]))
    return sections


def metadata_value(section: str, label: str) -> str | None:
    pattern = re.compile(rf"^\*\*{re.escape(label)}:\*\*\s*(.+?)\s*$", re.MULTILINE)
    match = pattern.search(section)
    if not match:
        return None
    return strip_markdown(match.group(1).rstrip("  "))


def parse_blockquote_effects(section: str) -> tuple[list[dict[str, str]], list[str]]:
    effects: list[dict[str, str]] = []
    notes: list[str] = []
    current_label: str | None = None
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_label, current_lines
        if current_label is not None:
            text = "\n".join(current_lines).strip()
            effects.append({"label": current_label, "text": text})
        current_label = None
        current_lines = []

    for raw_line in section.splitlines():
        if not raw_line.startswith(">"):
            continue
        line = raw_line[1:]
        if line.startswith(" "):
            line = line[1:]
        label_match = re.match(r"^\*\*([^*]+):\*\*\s*(.*)$", line)
        if label_match and strip_markdown(label_match.group(1)) in EFFECT_LABELS:
            flush()
            current_label = strip_markdown(label_match.group(1))
            remainder = strip_markdown(label_match.group(2))
            if remainder:
                current_lines.append(remainder)
            continue
        if current_label is not None:
            current_lines.append(strip_markdown(line))
        elif line.strip():
            notes.append(strip_markdown(line))

    flush()
    return effects, notes


def parse_card_source(text: str, allegiance: str, source: str) -> list[ParsedEntry]:
    entries: list[ParsedEntry] = []
    for raw_name, section in split_h2_sections(text):
        cost_text = metadata_value(section, "Cost")
        if cost_text is None:
            continue
        try:
            cost = int(re.match(r"\d+", cost_text).group(0))  # type: ignore[union-attr]
        except (AttributeError, ValueError) as exc:
            raise GenerationError(f"Invalid cost for {allegiance} card {raw_name!r}: {cost_text!r}") from exc

        unique_rule = metadata_value(section, "Unique")
        effects, quote_notes = parse_blockquote_effects(section)
        if not effects:
            raise GenerationError(f"No printed effects found for {allegiance} card {raw_name!r}")

        metadata_lines = re.compile(
            r"^\*\*(Cost|Complexity|Trait|Card form|Unique):\*\*.*$", re.MULTILINE
        )
        remainder = metadata_lines.sub("", section)
        remainder = re.sub(r"^>.*$", "", remainder, flags=re.MULTILINE)
        remainder = re.sub(r"^#.*$", "", remainder, flags=re.MULTILINE)
        prose_notes = [
            strip_markdown(line)
            for line in remainder.splitlines()
            if strip_markdown(line)
            and not line.strip().startswith("---")
            and not line.strip().startswith("|")
        ]

        entries.append(
            ParsedEntry(
                name=strip_markdown(raw_name),
                source=source,
                cost=cost,
                complexity=metadata_value(section, "Complexity"),
                trait=metadata_value(section, "Trait"),
                card_form=metadata_value(section, "Card form"),
                unique=unique_rule is not None,
                unique_rule=unique_rule,
                effects=effects,
                notes=quote_notes + prose_notes,
            )
        )
    return entries


def parse_territories(text: str, source: str) -> list[ParsedEntry]:
    entries: list[ParsedEntry] = []
    for raw_heading, section in split_h2_sections(text):
        match = re.match(r"^(\d+)\.\s+(.+)$", raw_heading)
        if not match:
            continue
        number = int(match.group(1))
        name = strip_markdown(match.group(2))
        complexity = metadata_value(section, "Complexity")
        effects, notes = parse_blockquote_effects(section)
        if complexity is None or not effects:
            raise GenerationError(f"Incomplete Territory entry: {raw_heading}")
        entries.append(
            ParsedEntry(
                name=name,
                source=source,
                complexity=complexity,
                effects=effects,
                notes=notes,
                arena=number >= 22 or name.startswith("Arena:"),
            )
        )
    return entries


def normalize_effect_key(label: str) -> str:
    return slugify(label).replace("-", "_")


def card_to_json(entry: ParsedEntry, allegiance: str, old: dict[str, Any] | None) -> dict[str, Any]:
    data: dict[str, Any] = copy.deepcopy(old) if old else {}
    card_id = data.get("id") or f"{slugify(allegiance)}-{slugify(entry.name)}"
    data.update(
        {
            "id": card_id,
            "name": entry.name,
            "allegiance": allegiance,
            "cost": entry.cost,
            "complexity": entry.complexity,
            "trait": entry.trait,
            "card_form": entry.card_form,
            "unique": entry.unique,
            "unique_rule": entry.unique_rule,
            "effects": entry.effects,
            "source": entry.source,
        }
    )

    old_effect_keys = {
        "action",
        "battle",
        "gambit",
        "tactic",
        "mission",
        "terms",
        "accepted",
        "refused",
        "asset",
        "overlay",
        "loan",
        "capacity",
        "activate",
        "compromised",
        "other_removal",
        "effect",
        "completion",
    }
    for key in old_effect_keys:
        data.pop(key, None)
    for effect in entry.effects:
        data[normalize_effect_key(effect["label"])] = effect["text"]
    if entry.notes:
        data["rules_notes"] = entry.notes
    else:
        data.pop("rules_notes", None)
    return data


def territory_to_json(entry: ParsedEntry, old: dict[str, Any] | None) -> dict[str, Any]:
    data: dict[str, Any] = copy.deepcopy(old) if old else {}
    data.update(
        {
            "id": data.get("id") or f"territory-{slugify(entry.name)}",
            "name": entry.name,
            "type": "Arena" if entry.arena else "Territory",
            "arena": entry.arena,
            "complexity": entry.complexity,
            "text": "\n\n".join(effect["text"] for effect in entry.effects),
            "effects": entry.effects,
            "source": entry.source,
        }
    )
    if entry.notes:
        data["rules_notes"] = entry.notes
    else:
        data.pop("rules_notes", None)
    return data


def build_pool_summary(cards: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for allegiance in EXPECTED_CARD_COUNTS:
        pool = [card for card in cards if card["allegiance"] == allegiance]
        curve = Counter(str(card["cost"]) for card in pool)
        summary[allegiance] = {
            "count": len(pool),
            "total_value": sum(int(card["cost"]) for card in pool),
            "unique": [card["name"] for card in pool if card.get("unique")],
            "cost_curve": dict(sorted(curve.items(), key=lambda item: int(item[0]))),
        }
    return summary


def leader_image(name: str) -> str:
    return f"images/sketches/{name.lower()}.png"


def build_factions(old_factions: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    old_by_name = {item.get("name"): item for item in old_factions}
    factions: list[dict[str, Any]] = []
    for allegiance, config in FACTION_CONFIG.items():
        data = copy.deepcopy(old_by_name.get(allegiance, {}))
        leaders = []
        old_leaders = {item.get("name"): item for item in data.get("leaders", [])}
        for name in config["leaders"]:
            leader = copy.deepcopy(old_leaders.get(name, {}))
            leader.update({"name": name, "image": leader.get("image") or leader_image(name)})
            leaders.append(leader)
        data.update(
            {
                "id": config["id"],
                "name": allegiance,
                "color": config["color"],
                "resource": config["resource"],
                "leaders": leaders,
                "victory": config["victory"],
                "card_count": EXPECTED_CARD_COUNTS[allegiance],
                "source": config["source"],
            }
        )
        factions.append(data)
    return factions


def validate_sources(root: Path, source_paths: Iterable[str]) -> list[str]:
    errors: list[str] = []
    for relative in source_paths:
        text = read_text(root, relative)
        for label, pattern in STALE_TERMS:
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                errors.append(f"{relative}:{line}: obsolete term {label!r}")
    return errors


def validate_cards(cards: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    names = Counter(card["name"] for card in cards)
    for name, count in names.items():
        if count > 1:
            errors.append(f"Duplicate playable-card title: {name} ({count})")

    summary = build_pool_summary(cards)
    for allegiance, expected_count in EXPECTED_CARD_COUNTS.items():
        actual = summary[allegiance]
        if actual["count"] != expected_count:
            errors.append(
                f"{allegiance}: expected {expected_count} cards, found {actual['count']}"
            )
        if actual["total_value"] != EXPECTED_TOTAL_VALUES[allegiance]:
            errors.append(
                f"{allegiance}: expected total value {EXPECTED_TOTAL_VALUES[allegiance]}, "
                f"found {actual['total_value']}"
            )
        if sorted(actual["unique"]) != sorted(EXPECTED_UNIQUE[allegiance]):
            errors.append(
                f"{allegiance}: expected Unique cards {EXPECTED_UNIQUE[allegiance]}, "
                f"found {actual['unique']}"
            )

    for card in cards:
        labels = [effect["label"] for effect in card["effects"]]
        if not labels:
            errors.append(f"{card['name']}: no effects")
        if card["cost"] not in {1, 2, 3, 4, 5}:
            errors.append(f"{card['name']}: invalid cost {card['cost']}")
    return errors


def validate_territories(territories: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    if len(territories) != 25:
        errors.append(f"Expected 25 Territories/Arenas, found {len(territories)}")
    arena_count = sum(bool(item.get("arena")) for item in territories)
    if arena_count != 4:
        errors.append(f"Expected 4 Arenas, found {arena_count}")
    names = Counter(item["name"] for item in territories)
    for name, count in names.items():
        if count > 1:
            errors.append(f"Duplicate Territory title: {name} ({count})")
    return errors


def markdown_anchor(name: str) -> str:
    return slugify(name)


def reference_notes(card: dict[str, Any]) -> str:
    notes: list[str] = []
    if card.get("card_form"):
        notes.append(str(card["card_form"]))
    if card.get("trait"):
        notes.append(f"{card['trait']} trait")
    if card.get("unique"):
        notes.append("Unique")
    return "; ".join(notes) if notes else "—"


def relative_reference_link(allegiance: str, card: dict[str, Any]) -> str:
    if allegiance == "Neutral":
        source = "../../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md"
    else:
        source = FACTION_CONFIG[allegiance]["source"].removeprefix("releases/v0.6.1/")
    return f"{source}#{markdown_anchor(card['name'])}"


def build_reference(cards: list[dict[str, Any]], territories: list[dict[str, Any]]) -> str:
    lines: list[str] = [
        "# Gauntlet v0.6.1 Complete Card Reference",
        "",
        "> **Generated convenience reference.** This is the one-file inventory of every v0.6.1 Playable Card, Territory, and Arena. The linked Neutral Card Pool, Territory Pool, and definitive faction guides remain the governing sources for exact player-facing text.",
        "",
        "## Pool summary",
        "",
        "| Pool | Designs | Governing source |",
        "|---|---:|---|",
        "| Neutral | 50 | [Neutral Card Pool](../../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md) |",
    ]
    for allegiance in FACTION_CONFIG:
        config = FACTION_CONFIG[allegiance]
        label = f"{allegiance} faction guide"
        link = config["source"].removeprefix("releases/v0.6.1/")
        lines.append(f"| {allegiance} | 12 | [{label}]({link}) |")
    lines.extend(
        [
            "| **Playable-card total** | **122** | — |",
            "| Territories | 21 | [Territory Pool](../../docs/Gauntlet_v0.6.1_Territory_Pool.md) |",
            "| Arenas | 4 | [Territory Pool](../../docs/Gauntlet_v0.6.1_Territory_Pool.md) |",
            "| **Territory-card total** | **25** | — |",
            "",
        ]
    )

    for allegiance in EXPECTED_CARD_COUNTS:
        heading = "Neutral cards" if allegiance == "Neutral" else allegiance
        lines.extend([f"## {heading}", "", "| Card | Cost | Complexity | Notes |", "|---|---:|---|---|"])
        for card in [item for item in cards if item["allegiance"] == allegiance]:
            link = relative_reference_link(allegiance, card)
            complexity = card.get("complexity") or "—"
            lines.append(
                f"| [{card['name']}]({link}) | {card['cost']} | {complexity} | {reference_notes(card)} |"
            )
        lines.append("")

    lines.extend(["## Territories and Arenas", "", "| Territory | Category | Complexity |", "|---|---|---|"])
    for territory in territories:
        link = f"../../docs/Gauntlet_v0.6.1_Territory_Pool.md#{markdown_anchor(territory['name'])}"
        category = "Arena" if territory.get("arena") else "Territory"
        lines.append(f"| [{territory['name']}]({link}) | {category} | {territory['complexity']} |")
    lines.extend(
        [
            "",
            "---",
            "",
            "Generated from the v0.6.1 governing Markdown sources. Do not edit this file independently.",
            "",
        ]
    )
    return "\n".join(lines)


def build_data(root: Path) -> tuple[dict[str, Any], str, list[str]]:
    baseline_path = root / BASELINE_DATA
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))

    neutral_entries = parse_card_source(
        read_text(root, NEUTRAL_SOURCE), "Neutral", NEUTRAL_SOURCE
    )
    entries_by_allegiance: dict[str, list[ParsedEntry]] = {"Neutral": neutral_entries}
    for allegiance, config in FACTION_CONFIG.items():
        entries_by_allegiance[allegiance] = parse_card_source(
            read_text(root, config["path"]), allegiance, config["source"]
        )

    old_cards_by_key = {
        (card.get("allegiance"), card.get("name")): card for card in baseline.get("cards", [])
    }
    cards: list[dict[str, Any]] = []
    for allegiance in EXPECTED_CARD_COUNTS:
        for entry in entries_by_allegiance[allegiance]:
            cards.append(
                card_to_json(entry, allegiance, old_cards_by_key.get((allegiance, entry.name)))
            )

    territory_entries = parse_territories(
        read_text(root, TERRITORY_SOURCE), TERRITORY_SOURCE
    )
    baseline_territories = baseline.get("territories", [])
    old_territories_by_name = {item.get("name"): item for item in baseline_territories}
    territories = [
        territory_to_json(entry, old_territories_by_name.get(entry.name))
        for entry in territory_entries
    ]

    data = copy.deepcopy(baseline)
    data.update(
        {
            "version": VERSION,
            "name": RELEASE_NAME,
            "date": None,
            "status": STATUS,
            "battle": {
                "normal_reserve_size": 3,
                "normal_gambits": 1,
                "normal_tactics": 1,
                "gambit_destination": "Graveyard",
                "tactic_destination": "Discard Pile",
                "remaining_reserve_destination": "Discard Pile",
                "sequence": [
                    "opening_effects",
                    "set_gambits",
                    "form_reserves",
                    "reveal_gambits",
                    "choose_tactics",
                    "reveal_tactics",
                    "resolve_battle",
                    "aftermath",
                ],
                "defender_advantage": "The defender wins tied battle totals when defending a Territory they control or during a Last Stand battle.",
            },
            "factions": build_factions(baseline.get("factions", [])),
            "card_pool_summary": build_pool_summary(cards),
            "cards": cards,
            "territories": territories,
            "governing_sources": {
                "rulebook": "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
                "neutral_cards": NEUTRAL_SOURCE,
                "territories": TERRITORY_SOURCE,
                "faction_guides": [config["source"] for config in FACTION_CONFIG.values()],
            },
        }
    )

    battlefield = copy.deepcopy(data.get("battlefield", {}))
    battlefield.update(
        {
            "gauntlet": "Six Territory Cards arranged in one column.",
            "starting_position": "Each Player Token begins immediately before that player's end of the Gauntlet.",
            "capture": "At the start of a turn, capture a Territory occupied but not controlled.",
            "victory": "Capture the opponent's final Territory, advance beyond it, begin a Last Stand battle, and win that battle.",
        }
    )
    data["battlefield"] = battlefield

    source_paths = [
        "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
        NEUTRAL_SOURCE,
        TERRITORY_SOURCE,
        *(config["path"] for config in FACTION_CONFIG.values()),
    ]
    errors = validate_sources(root, source_paths)
    errors.extend(validate_cards(cards))
    errors.extend(validate_territories(territories))

    reference = build_reference(cards, territories)
    return data, reference, errors


def render_json(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def compare_output(path: Path, expected: str) -> bool:
    if not path.is_file():
        print(f"MISSING: {path}", file=sys.stderr)
        return False
    actual = path.read_text(encoding="utf-8")
    if actual != expected:
        print(f"OUT OF DATE: {path}", file=sys.stderr)
        return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if tracked generated outputs differ instead of writing them.",
    )
    args = parser.parse_args()

    root = repo_root()
    try:
        data, reference, errors = build_data(root)
    except (GenerationError, json.JSONDecodeError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if errors:
        print("v0.6.1 source validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    canonical_text = render_json(data)
    canonical_path = root / CANONICAL_OUTPUT
    reference_path = root / REFERENCE_OUTPUT

    if args.check:
        clean = compare_output(canonical_path, canonical_text)
        clean = compare_output(reference_path, reference) and clean
        if not clean:
            print("Run python scripts/generate_v061_release.py and commit the outputs.", file=sys.stderr)
            return 1
    else:
        canonical_path.parent.mkdir(parents=True, exist_ok=True)
        canonical_path.write_text(canonical_text, encoding="utf-8")
        reference_path.write_text(reference, encoding="utf-8")
        print(f"Wrote {canonical_path.relative_to(root)}")
        print(f"Wrote {reference_path.relative_to(root)}")

    print(
        "Validated 122 playable cards, 25 Territories/Arenas, six factions, "
        "card-pool values, Unique cards, and obsolete terminology."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
