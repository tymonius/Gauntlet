#!/usr/bin/env python3
"""Generate and validate Gauntlet v0.6.1 structured release data.

Governing Markdown remains authoritative. This standard-library script parses the
v0.6.1 Neutral, faction, and Territory sources; carries forward stable metadata
from v0.6.0; validates counts, values, Unique cards, and obsolete terminology;
and writes the canonical JSON and complete-card inventory.

Usage:
    python scripts/generate_v061_release.py
    python scripts/generate_v061_release.py --check
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
RELEASE_DATE = "2026-07-30"
STATUS = "Published playtest edition"

BASELINE = "releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json"
CANONICAL_OUTPUT = "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"
REFERENCE_OUTPUT = "releases/v0.6.1/Gauntlet_v0.6.1_Complete_Card_Reference.md"
NEUTRAL_SOURCE = "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md"
TERRITORY_SOURCE = "docs/Gauntlet_v0.6.1_Territory_Pool.md"
RULEBOOK_SOURCE = "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"

EXPECTED_COUNTS = {
    "Neutral": 50,
    "Military": 12,
    "Diplomats": 12,
    "Financiers": 12,
    "Intelligence": 12,
    "Mystics": 12,
    "Inquisition": 12,
}
EXPECTED_VALUES = {
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

FACTIONS: dict[str, dict[str, Any]] = {
    "Military": {
        "id": "military",
        "color": "crimson red",
        "resource": "Command (maximum 2)",
        "leaders": ["General", "Commandant"],
        "victory": "Run the Gauntlet.",
        "path": "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
    },
    "Diplomats": {
        "id": "diplomats",
        "color": "royal blue",
        "resource": "Influence (0–10)",
        "leaders": ["Ambassador", "Senator"],
        "victory": "Run the Gauntlet or complete the Peace Treaty.",
        "path": "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    },
    "Financiers": {
        "id": "financiers",
        "color": "emerald green",
        "resource": "Capital (dynamic limit)",
        "leaders": ["Banker", "Executive"],
        "victory": "Run the Gauntlet or achieve Controlling Interest.",
        "path": "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
    },
    "Intelligence": {
        "id": "intelligence",
        "color": "charcoal/black",
        "resource": "Intel and Operation Progress",
        "leaders": ["Ranger", "Spymaster"],
        "victory": "Run the Gauntlet or complete a Special Operation.",
        "path": "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
    },
    "Mystics": {
        "id": "mystics",
        "color": "deep violet",
        "resource": None,
        "leaders": ["Alchemist", "Spirit Walker"],
        "victory": "Run the Gauntlet or complete the Ritual of Ascendance.",
        "path": "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
    },
    "Inquisition": {
        "id": "inquisition",
        "color": "antique gold/ochre",
        "resource": "Conviction (maximum 4)",
        "leaders": ["Grand Inquisitor", "Witch Hunter"],
        "victory": "Run the Gauntlet or achieve Purification.",
        "path": "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
    },
}

PRINTED_LABELS = {
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
    "Use",
    "Compromised",
    "Other removal",
    "Effect",
    "Completion",
}

OBSOLETE = {
    "Battle Hand": re.compile(r"\bBattle Hand(?:s)?\b", re.IGNORECASE),
    "hand commitment": re.compile(r"\bhand commitment(?:s)?\b", re.IGNORECASE),
    "battle cleanup": re.compile(r"\bbattle cleanup\b", re.IGNORECASE),
    "Heartland": re.compile(r"\bHeartland(?:s)?\b", re.IGNORECASE),
    "breakthrough victory": re.compile(r"\bbreakthrough victory\b", re.IGNORECASE),
}


class GenerationError(RuntimeError):
    pass


@dataclass
class Entry:
    name: str
    source: str
    cost: int | None = None
    complexity: str | None = None
    trait: str | None = None
    card_form: str | None = None
    unique_rule: str | None = None
    effects: list[dict[str, str]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    arena: bool = False

    @property
    def unique(self) -> bool:
        return self.unique_rule is not None


def root_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def read(root: Path, relative: str) -> str:
    path = root / relative
    if not path.is_file():
        raise GenerationError(f"Missing source: {relative}")
    return path.read_text(encoding="utf-8")


def plain(text: str) -> str:
    text = text.strip().rstrip("  ")
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
    return text.strip()


def slug(text: str) -> str:
    text = text.lower().replace("’", "").replace("'", "")
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    return re.sub(r"[\s-]+", "-", text).strip("-")


def h2_sections(text: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"^##\s+(.+?)\s*$", text, re.MULTILINE))
    result: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        result.append((plain(match.group(1)), text[match.end() : end]))
    return result


def metadata(section: str, label: str) -> str | None:
    match = re.search(
        rf"^\*\*{re.escape(label)}:\*\*\s*(.+?)\s*$", section, re.MULTILINE
    )
    return plain(match.group(1)) if match else None


def quote_effects(section: str) -> tuple[list[dict[str, str]], list[str]]:
    """Parse labeled and unlabeled player-facing blockquote text.

    Cards such as Sanctions and all Territories intentionally use unlabeled text.
    Those passages are represented as one effect labeled ``Text``.
    """

    effects: list[dict[str, str]] = []
    unlabeled: list[str] = []
    label: str | None = None
    lines: list[str] = []

    def flush_labeled() -> None:
        nonlocal label, lines
        if label is not None:
            effects.append({"label": label, "text": "\n".join(lines).strip()})
        label = None
        lines = []

    for raw in section.splitlines():
        if not raw.startswith(">"):
            continue
        line = raw[1:]
        if line.startswith(" "):
            line = line[1:]
        match = re.match(r"^\*\*([^*]+):\*\*\s*(.*)$", line)
        candidate = plain(match.group(1)) if match else None
        if match and candidate in PRINTED_LABELS:
            flush_labeled()
            label = candidate
            remainder = plain(match.group(2))
            if remainder:
                lines.append(remainder)
        elif label is not None:
            lines.append(plain(line))
        elif line.strip():
            unlabeled.append(plain(line))

    flush_labeled()
    if unlabeled:
        effects.insert(0, {"label": "Text", "text": "\n".join(unlabeled).strip()})
    return effects, []


def trim_after_card_pool(text: str) -> str:
    start = re.search(r"^#\s+\d+\.\s+Canonical .* card pool\s*$", text, re.MULTILINE)
    if not start:
        return text
    body = text[start.end() :]
    end = re.search(r"^#\s+(?:\d+\.\s+)?(?:Quick reference|Appendix)\b.*$", body, re.MULTILINE)
    return body[: end.start()] if end else body


def prose_notes(section: str) -> list[str]:
    cleaned = re.sub(
        r"^\*\*(?:Cost|Complexity|Trait|Card form|Unique):\*\*.*$",
        "",
        section,
        flags=re.MULTILINE,
    )
    cleaned = re.sub(r"^>.*$", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^#.*$", "", cleaned, flags=re.MULTILINE)
    notes = []
    for line in cleaned.splitlines():
        value = plain(line)
        if value and value != "---" and not value.startswith("|"):
            notes.append(value)
    return notes


def parse_cards(text: str, allegiance: str, source: str) -> list[Entry]:
    text = trim_after_card_pool(text) if allegiance != "Neutral" else text
    entries: list[Entry] = []
    for name, section in h2_sections(text):
        cost_text = metadata(section, "Cost")
        if cost_text is None:
            continue
        match = re.match(r"\d+", cost_text)
        if not match:
            raise GenerationError(f"Invalid cost for {allegiance} card {name}: {cost_text}")
        effects, quote_notes = quote_effects(section)
        if not effects:
            raise GenerationError(f"No printed text found for {allegiance} card {name}")
        entries.append(
            Entry(
                name=name,
                source=source,
                cost=int(match.group(0)),
                complexity=metadata(section, "Complexity"),
                trait=metadata(section, "Trait"),
                card_form=metadata(section, "Card form"),
                unique_rule=metadata(section, "Unique"),
                effects=effects,
                notes=quote_notes + prose_notes(section),
            )
        )
    return entries


def parse_territories(text: str) -> list[Entry]:
    entries: list[Entry] = []
    for heading, section in h2_sections(text):
        match = re.match(r"^(\d+)\.\s+(.+)$", heading)
        if not match:
            continue
        effects, notes = quote_effects(section)
        complexity = metadata(section, "Complexity")
        if not complexity or not effects:
            raise GenerationError(f"Incomplete Territory entry: {heading}")
        number = int(match.group(1))
        entries.append(
            Entry(
                name=plain(match.group(2)),
                source=TERRITORY_SOURCE,
                complexity=complexity,
                effects=effects,
                notes=notes + prose_notes(section),
                arena=number >= 22,
            )
        )
    return entries


def effect_key(label: str) -> str:
    return slug(label).replace("-", "_")


def card_json(entry: Entry, allegiance: str, old: dict[str, Any] | None) -> dict[str, Any]:
    data = copy.deepcopy(old) if old else {}
    data.update(
        {
            "id": data.get("id") or f"{slug(allegiance)}-{slug(entry.name)}",
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
    for key in (
        "text",
        "action",
        "gambit",
        "tactic",
        "battle",
        "mission",
        "terms",
        "accepted",
        "refused",
        "asset",
        "overlay",
        "loan",
        "capacity",
        "activate",
        "use",
        "compromised",
        "other_removal",
        "effect",
        "completion",
    ):
        data.pop(key, None)
    for effect in entry.effects:
        data[effect_key(effect["label"])] = effect["text"]
    if entry.notes:
        data["rules_notes"] = entry.notes
    else:
        data.pop("rules_notes", None)
    return data


def territory_json(entry: Entry, old: dict[str, Any] | None) -> dict[str, Any]:
    data = copy.deepcopy(old) if old else {}
    full_text = "\n\n".join(effect["text"] for effect in entry.effects)
    data.update(
        {
            "id": data.get("id") or f"territory-{slug(entry.name)}",
            "name": entry.name,
            "type": "Arena" if entry.arena else "Territory",
            "arena": entry.arena,
            "complexity": entry.complexity,
            "text": full_text,
            "effects": entry.effects,
            "source": entry.source,
        }
    )
    if entry.notes:
        data["rules_notes"] = entry.notes
    else:
        data.pop("rules_notes", None)
    return data


def pool_summary(cards: list[dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for allegiance in EXPECTED_COUNTS:
        pool = [card for card in cards if card["allegiance"] == allegiance]
        curve = Counter(str(card["cost"]) for card in pool)
        result[allegiance] = {
            "count": len(pool),
            "total_value": sum(card["cost"] for card in pool),
            "unique": [card["name"] for card in pool if card.get("unique")],
            "cost_curve": dict(sorted(curve.items(), key=lambda item: int(item[0]))),
        }
    return result


def factions_json(old_factions: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    old_by_name = {item.get("name"): item for item in old_factions}
    result = []
    for allegiance, config in FACTIONS.items():
        data = copy.deepcopy(old_by_name.get(allegiance, {}))
        old_leaders = {item.get("name"): item for item in data.get("leaders", [])}
        leaders = []
        for name in config["leaders"]:
            leader = copy.deepcopy(old_leaders.get(name, {}))
            leader.update(
                {
                    "name": name,
                    "image": leader.get("image") or f"images/sketches/{name.lower()}.png",
                }
            )
            leaders.append(leader)
        data.update(
            {
                "id": config["id"],
                "name": allegiance,
                "color": config["color"],
                "resource": config["resource"],
                "leaders": leaders,
                "victory": config["victory"],
                "card_count": EXPECTED_COUNTS[allegiance],
                "source": config["path"],
            }
        )
        result.append(data)
    return result


def source_errors(root: Path, paths: Iterable[str]) -> list[str]:
    errors = []
    for relative in paths:
        text = read(root, relative)
        for label, pattern in OBSOLETE.items():
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                errors.append(f"{relative}:{line}: obsolete term {label!r}")
    return errors


def data_errors(cards: list[dict[str, Any]], territories: list[dict[str, Any]]) -> list[str]:
    errors = []
    names = Counter(card["name"] for card in cards)
    errors.extend(f"Duplicate playable-card title: {name}" for name, count in names.items() if count > 1)
    summary = pool_summary(cards)
    for allegiance in EXPECTED_COUNTS:
        actual = summary[allegiance]
        if actual["count"] != EXPECTED_COUNTS[allegiance]:
            errors.append(f"{allegiance}: expected {EXPECTED_COUNTS[allegiance]} cards, found {actual['count']}")
        if actual["total_value"] != EXPECTED_VALUES[allegiance]:
            errors.append(f"{allegiance}: expected value {EXPECTED_VALUES[allegiance]}, found {actual['total_value']}")
        if sorted(actual["unique"]) != sorted(EXPECTED_UNIQUE[allegiance]):
            errors.append(f"{allegiance}: expected Unique {EXPECTED_UNIQUE[allegiance]}, found {actual['unique']}")
    if len(cards) != 122:
        errors.append(f"Expected 122 playable cards, found {len(cards)}")
    if len(territories) != 25:
        errors.append(f"Expected 25 Territories/Arenas, found {len(territories)}")
    arena_count = sum(bool(item.get("arena")) for item in territories)
    if arena_count != 4:
        errors.append(f"Expected 4 Arenas, found {arena_count}")
    territory_names = Counter(item["name"] for item in territories)
    errors.extend(f"Duplicate Territory title: {name}" for name, count in territory_names.items() if count > 1)
    return errors


def reference_notes(card: dict[str, Any]) -> str:
    notes = []
    if card.get("card_form"):
        notes.append(card["card_form"])
    if card.get("trait"):
        notes.append(f"{card['trait']} trait")
    if card.get("unique"):
        notes.append("Unique")
    return "; ".join(notes) if notes else "—"


def card_link(allegiance: str, card: dict[str, Any]) -> str:
    if allegiance == "Neutral":
        path = "../../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md"
    else:
        path = FACTIONS[allegiance]["path"].removeprefix("releases/v0.6.1/")
    return f"{path}#{slug(card['name'])}"


def build_reference(cards: list[dict[str, Any]], territories: list[dict[str, Any]]) -> str:
    lines = [
        "# Gauntlet v0.6.1 Complete Card Reference",
        "",
        "> **Generated convenience reference.** This is the one-file inventory of every v0.6.1 Playable Card, Territory, and Arena. The linked governing sources remain authoritative for exact player-facing text.",
        "",
        "## Pool summary",
        "",
        "| Pool | Designs | Governing source |",
        "|---|---:|---|",
        "| Neutral | 50 | [Neutral Card Pool](../../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md) |",
    ]
    for allegiance, config in FACTIONS.items():
        path = config["path"].removeprefix("releases/v0.6.1/")
        lines.append(f"| {allegiance} | 12 | [{allegiance} faction guide]({path}) |")
    lines.extend(
        [
            "| **Playable-card total** | **122** | — |",
            "| Territories | 21 | [Territory Pool](../../docs/Gauntlet_v0.6.1_Territory_Pool.md) |",
            "| Arenas | 4 | [Territory Pool](../../docs/Gauntlet_v0.6.1_Territory_Pool.md) |",
            "| **Territory-card total** | **25** | — |",
            "",
        ]
    )
    for allegiance in EXPECTED_COUNTS:
        heading = "Neutral cards" if allegiance == "Neutral" else allegiance
        lines.extend([f"## {heading}", "", "| Card | Cost | Complexity | Notes |", "|---|---:|---|---|"])
        for card in [item for item in cards if item["allegiance"] == allegiance]:
            lines.append(
                f"| [{card['name']}]({card_link(allegiance, card)}) | {card['cost']} | "
                f"{card.get('complexity') or '—'} | {reference_notes(card)} |"
            )
        lines.append("")
    lines.extend(["## Territories and Arenas", "", "| Territory | Category | Complexity |", "|---|---|---|"])
    for territory in territories:
        link = f"../../docs/Gauntlet_v0.6.1_Territory_Pool.md#{slug(territory['name'])}"
        category = "Arena" if territory.get("arena") else "Territory"
        lines.append(f"| [{territory['name']}]({link}) | {category} | {territory['complexity']} |")
    lines.extend(["", "---", "", "Generated from the v0.6.1 governing Markdown sources. Do not edit independently.", ""])
    return "\n".join(lines)


def build(root: Path) -> tuple[dict[str, Any], str, list[str]]:
    baseline = json.loads(read(root, BASELINE))
    parsed: dict[str, list[Entry]] = {
        "Neutral": parse_cards(read(root, NEUTRAL_SOURCE), "Neutral", NEUTRAL_SOURCE)
    }
    for allegiance, config in FACTIONS.items():
        parsed[allegiance] = parse_cards(read(root, config["path"]), allegiance, config["path"])

    old_cards = {(item.get("allegiance"), item.get("name")): item for item in baseline.get("cards", [])}
    cards = [
        card_json(entry, allegiance, old_cards.get((allegiance, entry.name)))
        for allegiance in EXPECTED_COUNTS
        for entry in parsed[allegiance]
    ]

    territory_entries = parse_territories(read(root, TERRITORY_SOURCE))
    old_territories = {item.get("name"): item for item in baseline.get("territories", [])}
    territories = [territory_json(entry, old_territories.get(entry.name)) for entry in territory_entries]

    data = copy.deepcopy(baseline)
    data.pop("source_files", None)
    data.update(
        {
            "version": VERSION,
            "name": RELEASE_NAME,
            "date": RELEASE_DATE,
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
            "factions": factions_json(baseline.get("factions", [])),
            "card_pool_summary": pool_summary(cards),
            "cards": cards,
            "territories": territories,
            "governing_sources": {
                "rulebook": RULEBOOK_SOURCE,
                "neutral_cards": NEUTRAL_SOURCE,
                "territories": TERRITORY_SOURCE,
                "faction_guides": [config["path"] for config in FACTIONS.values()],
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

    source_paths = [RULEBOOK_SOURCE, NEUTRAL_SOURCE, TERRITORY_SOURCE, *(config["path"] for config in FACTIONS.values())]
    errors = source_errors(root, source_paths) + data_errors(cards, territories)
    return data, build_reference(cards, territories), errors


def compare(path: Path, expected: str) -> bool:
    if not path.is_file():
        print(f"MISSING: {path}", file=sys.stderr)
        return False
    if path.read_text(encoding="utf-8") != expected:
        print(f"OUT OF DATE: {path}", file=sys.stderr)
        return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail instead of writing when generated outputs differ.")
    args = parser.parse_args()
    root = root_dir()
    try:
        data, reference, errors = build(root)
    except (GenerationError, json.JSONDecodeError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    if errors:
        print("v0.6.1 source validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    canonical = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    canonical_path = root / CANONICAL_OUTPUT
    reference_path = root / REFERENCE_OUTPUT
    if args.check:
        valid = compare(canonical_path, canonical) and compare(reference_path, reference)
        if not valid:
            print("Run python scripts/generate_v061_release.py and commit the outputs.", file=sys.stderr)
            return 1
    else:
        canonical_path.parent.mkdir(parents=True, exist_ok=True)
        canonical_path.write_text(canonical, encoding="utf-8")
        reference_path.write_text(reference, encoding="utf-8")
        print(f"Wrote {canonical_path.relative_to(root)}")
        print(f"Wrote {reference_path.relative_to(root)}")
    print("Validated 122 playable cards, 25 Territories/Arenas, six factions, pool values, Unique cards, and obsolete terminology.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
