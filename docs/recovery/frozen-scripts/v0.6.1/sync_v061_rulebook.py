#!/usr/bin/env python3
"""Synchronize the player-facing v0.6.1 Rulebook with definitive faction guides.

The shared rules remain authored in the Rulebook Markdown. Part III is the major
Factions part, and its six numbered faction chapters are generated from the
player-facing portions of their definitive guides. This prevents a faction
correction from leaving the published Rulebook behind while preserving both the
Rulebook's teaching hierarchy and each faction's chapter-level identity.
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"
FACTION_START = "<!-- GENERATED FACTION CONTENT START -->"
FACTION_END = "<!-- GENERATED FACTION CONTENT END -->"


@dataclass(frozen=True)
class FactionSpec:
    name: str
    chapter: int
    guide: str
    leaders: tuple[tuple[str, str], ...]


FACTIONS = (
    FactionSpec(
        "Military",
        13,
        "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
        (("General", "general.png"), ("Commandant", "commandant.png")),
    ),
    FactionSpec(
        "Diplomats",
        14,
        "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
        (("Ambassador", "ambassador.png"), ("Senator", "senator.png")),
    ),
    FactionSpec(
        "Financiers",
        15,
        "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
        (("Banker", "banker.png"), ("Executive", "executive.png")),
    ),
    FactionSpec(
        "Intelligence",
        16,
        "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
        (("Ranger", "ranger.png"), ("Spymaster", "spymaster.png")),
    ),
    FactionSpec(
        "Mystics",
        17,
        "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
        (("Alchemist", "alchemist.png"), ("Spirit Walker", "spirit walker.png")),
    ),
    FactionSpec(
        "Inquisition",
        18,
        "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
        (("Grand Inquisitor", "grand inquisitor.png"), ("Witch Hunter", "witch hunter.png")),
    ),
)


def player_facing_guide_text(spec: FactionSpec) -> str:
    path = ROOT / spec.guide
    text = path.read_text(encoding="utf-8")

    overview = re.search(r"(?m)^# 1\. .+ overview\s*$", text)
    card_pool = re.search(r"(?m)^# \d+\. Canonical .+ card pool\s*$", text)
    if not overview or not card_pool or card_pool.start() <= overview.start():
        raise RuntimeError(f"Could not locate player-facing guide boundaries in {spec.guide}")

    lines = text[overview.start():card_pool.start()].strip().splitlines()
    leaders = dict(spec.leaders)
    output = [f"# {spec.chapter}. {spec.name}", ""]
    context = "overview"

    for line in lines:
        numbered = re.match(r"^# \d+\.\s+(.+)$", line)
        if numbered:
            title = numbered.group(1).strip()
            if title.lower().endswith(" overview"):
                context = "overview"
                continue
            if title.lower() == "leaders":
                context = "leaders"
                continue
            context = "section"
            output.extend([f"## {title}", ""])
            continue

        second = re.match(r"^##\s+(.+)$", line)
        if second:
            title = second.group(1).strip()
            if context == "leaders" and title in leaders:
                output.extend(
                    [
                        '<div class="page-break"></div>',
                        "",
                        f"## {title}",
                        "",
                        f"![{title}](<images/sketches/{leaders[title]}>)",
                        "",
                    ]
                )
            elif context == "overview":
                output.append(f"## {title}")
            else:
                output.append(f"### {title}")
            continue

        third = re.match(r"^###\s+(.+)$", line)
        if third:
            title = third.group(1).strip()
            output.append(f"### {title}" if context == "leaders" else f"#### {title}")
            continue

        output.append(line)

    return "\n".join(output).strip()


def generate(current: str) -> str:
    if current.count(FACTION_START) != 1 or current.count(FACTION_END) != 1:
        raise RuntimeError("Rulebook generated-faction boundaries are missing or duplicated")

    prefix, remainder = current.split(FACTION_START, 1)
    _, suffix = remainder.split(FACTION_END, 1)
    faction_chapters = "\n\n---\n\n".join(player_facing_guide_text(spec) for spec in FACTIONS)
    generated = (
        prefix.rstrip()
        + f"\n\n{FACTION_START}\n\n"
        + faction_chapters
        + f"\n\n{FACTION_END}"
        + suffix
    ).rstrip() + "\n"

    forbidden = (
        "# 14. Military",
        "# 15. Diplomats",
        "# 16. Financiers",
        "# 17. Intelligence",
        "# 18. Mystics",
        "# 19. Inquisition",
        "# 15. Standard Language and Reference Rules",
        "Use these verbs consistently:",
        "Avoid generic phrases such as",
    )
    for phrase in forbidden:
        if phrase in generated:
            raise RuntimeError(f"Obsolete player-facing Rulebook structure remains: {phrase}")

    if "# Part III — Factions" not in generated:
        raise RuntimeError("Generated Rulebook is missing Part III — Factions")

    for spec in FACTIONS:
        if f"# {spec.chapter}. {spec.name}" not in generated:
            raise RuntimeError(f"Missing generated faction chapter: {spec.name}")
        for leader, image in spec.leaders:
            if f"## {leader}" not in generated:
                raise RuntimeError(f"Missing generated Leader section: {leader}")
            if f"images/sketches/{image}" not in generated:
                raise RuntimeError(f"Missing generated Leader sketch: {leader}")

    return generated


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the Rulebook is not synchronized.")
    args = parser.parse_args()

    current = RULEBOOK.read_text(encoding="utf-8")
    generated = generate(current)
    if args.check:
        if generated != current:
            raise SystemExit("v0.6.1 Rulebook faction chapters are not synchronized")
        print("v0.6.1 Rulebook faction chapters are synchronized.")
        return 0

    if generated != current:
        RULEBOOK.write_text(generated, encoding="utf-8")
        print(f"Updated {RULEBOOK.relative_to(ROOT)}")
    else:
        print("v0.6.1 Rulebook already synchronized.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
