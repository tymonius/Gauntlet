#!/usr/bin/env python3
"""Generate the v0.6.0 one-file card reference from canonical structured data."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json"
DEFAULT_OUTPUT = ROOT / "releases/v0.6.0/Gauntlet_v0.6.0_Complete_Card_Reference.md"
FACTION_ORDER = [
    "Military",
    "Diplomats",
    "Financiers",
    "Intelligence",
    "Mystics",
    "Inquisition",
]


def github_slug(value: str) -> str:
    """Approximate GitHub's Markdown heading slug for the card headings in source files."""
    value = value.lower()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"[\s_]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def relative_source(source: str) -> str:
    """Return a source link relative to the release reference file."""
    release_prefix = "releases/v0.6.0/"
    if source.startswith(release_prefix):
        return source[len(release_prefix) :]
    if source.startswith("docs/"):
        return f"../../{source}"
    return f"../../{source}"


def linked_name(name: str, source: str) -> str:
    return f"[{name}]({relative_source(source)}#{github_slug(name)})"


def display(value: Any) -> str:
    if value in (None, "", False):
        return "—"
    return str(value)


def build_reference(data: dict[str, Any]) -> str:
    cards = data["cards"]
    territories = data["territories"]

    by_pool: dict[str, list[dict[str, Any]]] = {}
    for card in cards:
        by_pool.setdefault(card["allegiance"], []).append(card)

    arena_count = sum(1 for territory in territories if territory["arena"])
    territory_count = len(territories) - arena_count

    lines = [
        f"# Gauntlet {data['version']} Complete Card Reference",
        "",
        "> **Generated convenience reference.** This file provides a single Markdown inventory of every "
        f"{data['version']} Playable Card, Territory, and Arena. It does not replace the governing card "
        "sources. Exact player-facing card text remains controlled by the Neutral Card Pool, Territory "
        "Pool, and definitive faction guides.",
        "",
        "## Contents",
        "",
        "- [Pool summary](#pool-summary)",
        "- [Neutral cards](#neutral-cards)",
    ]
    lines.extend(f"- [{faction}](#{github_slug(faction)})" for faction in FACTION_ORDER)
    lines.extend(
        [
            "- [Territories and Arenas](#territories-and-arenas)",
            "",
            "## Pool summary",
            "",
            "| Pool | Designs | Governing source |",
            "|---|---:|---|",
        ]
    )

    neutral_source = by_pool["Neutral"][0]["source"]
    lines.append(
        f"| Neutral | {len(by_pool['Neutral'])} | "
        f"[Neutral Card Pool]({relative_source(neutral_source)}) |"
    )

    for faction in FACTION_ORDER:
        pool = by_pool[faction]
        source = pool[0]["source"]
        lines.append(
            f"| {faction} | {len(pool)} | "
            f"[{faction} faction guide]({relative_source(source)}) |"
        )

    lines.extend(
        [
            f"| **Playable-card total** | **{len(cards)}** | — |",
            f"| Territories | {territory_count} | "
            "[Territory Pool](../../docs/Gauntlet_v0.6_Territory_Pool.md) |",
            f"| Arenas | {arena_count} | "
            "[Territory Pool](../../docs/Gauntlet_v0.6_Territory_Pool.md) |",
            f"| **Territory-card total** | **{len(territories)}** | — |",
            "",
            "## Neutral cards",
            "",
            f"[Governing source]({relative_source(neutral_source)})",
            "",
            "| Card | Cost | Complexity | Trait | Unique |",
            "|---|---:|---|---|:---:|",
        ]
    )

    for card in by_pool["Neutral"]:
        lines.append(
            f"| {linked_name(card['name'], card['source'])} | {card['cost']} | "
            f"{display(card.get('complexity'))} | {display(card.get('trait'))} | "
            f"{'Yes' if card.get('unique') else '—'} |"
        )

    for faction in FACTION_ORDER:
        pool = by_pool[faction]
        source = pool[0]["source"]
        lines.extend(
            [
                "",
                f"## {faction}",
                "",
                f"[Governing source]({relative_source(source)})",
                "",
                "| Card | Cost | Trait | Printed form | Unique |",
                "|---|---:|---|---|:---:|",
            ]
        )
        for card in pool:
            lines.append(
                f"| {linked_name(card['name'], card['source'])} | {card['cost']} | "
                f"{display(card.get('trait'))} | {display(card.get('card_form'))} | "
                f"{'Yes' if card.get('unique') else '—'} |"
            )

    territory_source = territories[0]["source"]
    lines.extend(
        [
            "",
            "## Territories and Arenas",
            "",
            f"[Governing source]({relative_source(territory_source)})",
            "",
        ]
    )

    for territory in territories:
        lines.extend(
            [
                f"### {territory['number']}. "
                f"{linked_name(territory['name'], territory['source'])}",
                "",
                f"**Type:** {'Arena' if territory['arena'] else 'Territory'}  ",
                f"**Complexity:** {territory['complexity']}",
                "",
            ]
        )
        for paragraph in territory["text"].split("\n\n"):
            lines.extend([paragraph, ""])

    lines.extend(
        [
            "## Source hierarchy",
            "",
            "1. `Gauntlet_v0.6.0_Rulebook.md` governs shared rules.",
            "2. The definitive faction guides govern faction-specific rules and exact faction-card text.",
            "3. The Neutral Card Pool governs exact Neutral-card text.",
            "4. The Territory Pool governs exact Territory and Arena text.",
            "5. `Gauntlet_v0.6.0_Canonical_Data.json` mirrors those sources and is used to generate this reference.",
            "",
            f"Generated for Gauntlet {data['version']}.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if the existing output differs from generated content.",
    )
    args = parser.parse_args()

    data = json.loads(args.input.read_text(encoding="utf-8"))
    output = build_reference(data)

    if args.check:
        if not args.output.exists():
            raise SystemExit(f"Missing generated reference: {args.output}")
        if args.output.read_text(encoding="utf-8") != output:
            raise SystemExit(
                f"{args.output} is out of date. Run {Path(__file__).name}."
            )
        print(f"{args.output} is current.")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
