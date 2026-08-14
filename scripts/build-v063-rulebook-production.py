#!/usr/bin/env python3
"""Adapt the approved Rulebook production system to the current v0.6.3 source.

This is intentionally a thin source/version adapter. The certified v0.6.3
Markdown remains authoritative; this script restores only the presentation
structure that the approved PR #357 / PR #434 production system expects.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION = ROOT / "rulebook-production"
CURRENT_RULEBOOK = ROOT / "releases" / "v0.6.3-reconstructed" / "Gauntlet_v0.6.3_Rulebook.md"
PRODUCTION_SOURCE = PRODUCTION / ".v063-production-source.md"
HTML = PRODUCTION / "full-rulebook.html"
RUNTIME_PAGINATOR = PRODUCTION / ".paginate_rulebook_runtime.mjs"

LEADERS = (
    "General",
    "Commandant",
    "Ambassador",
    "Senator",
    "Banker",
    "Executive",
    "Ranger",
    "Spymaster",
    "Alchemist",
    "Spirit Walker",
    "Grand Inquisitor",
    "Witch Hunter",
)

sys.path.insert(0, str(PRODUCTION))

import build_rulebook  # noqa: E402
import build_complete_rulebook  # noqa: E402


def replace_required(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"Could not find expected {label} marker while adapting the approved Rulebook production output.")
    return source.replace(old, new)


def build_presentation_source(source: str) -> str:
    """Restore old production-only Leader hierarchy/art references.

    v0.6.3 moved Leader names from H2 to H3 beneath a shared H2 "Leaders"
    wrapper and removed sketch Markdown from rules authority. PR #434's approved
    paginator deliberately recognizes H2 Leader sections with image tokens.
    Convert only that structural/presentation layer in a transient source file;
    no rules prose is rewritten.
    """

    output: list[str] = []
    leader_names = set(LEADERS)
    leader_count = 0
    wrapper_count = 0
    in_leader = False

    for original_line in source.splitlines():
        if original_line == "## Leaders":
            wrapper_count += 1
            in_leader = False
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.+?)\s*$", original_line)
        heading_level = len(heading_match.group(1)) if heading_match else None
        heading_title = heading_match.group(2) if heading_match else None

        if heading_level == 3 and heading_title in leader_names:
            leader = heading_title
            image_rel = f"images/sketches/{leader.lower()}.png"
            image_path = ROOT / image_rel
            if not image_path.is_file():
                raise RuntimeError(f"Missing approved Leader sketch for {leader}: {image_rel}")
            output.append(f"## {leader}")
            output.append("")
            output.append(f"![{leader}](<{image_rel}>)")
            leader_count += 1
            in_leader = True
            continue

        if in_leader and heading_level is not None:
            if heading_level <= 2:
                in_leader = False
            elif heading_level >= 4:
                # The v0.6.3 Leader nesting is one level deeper because of the
                # removed "Leaders" wrapper. Restore the production hierarchy.
                output.append(f"{'#' * (heading_level - 1)} {heading_title}")
                continue

        output.append(original_line)

    if wrapper_count != 6:
        raise RuntimeError(f"Expected six v0.6.3 Leaders wrapper headings; found {wrapper_count}.")
    if leader_count != len(LEADERS):
        raise RuntimeError(f"Expected {len(LEADERS)} current Leader headings; transformed {leader_count}.")

    transformed = "\n".join(output)
    if source.endswith("\n"):
        transformed += "\n"

    # Prove the transform changed only heading depth/wrapper lines, presentation
    # whitespace, and the twelve approved image references. Every nonblank rules
    # line must otherwise remain byte-for-byte identical and in the same order.
    def semantic_lines(value: str) -> list[str]:
        result: list[str] = []
        for line in value.splitlines():
            if not line.strip() or line == "## Leaders":
                continue
            if re.match(r"^!\[[^]]+\]\(<images/sketches/[^>]+\.png>\)$", line):
                continue
            result.append(re.sub(r"^(#{1,6})\s+", "", line) if line.startswith("#") else line)
        return result

    if semantic_lines(source) != semantic_lines(transformed):
        raise RuntimeError("v0.6.3 production-source transform changed rules text instead of presentation structure only.")

    return transformed


def main() -> None:
    if not CURRENT_RULEBOOK.is_file():
        raise RuntimeError(f"Missing current Rulebook source: {CURRENT_RULEBOOK}")

    current_source = CURRENT_RULEBOOK.read_text(encoding="utf-8")
    production_source = build_presentation_source(current_source)
    PRODUCTION_SOURCE.write_text(production_source, encoding="utf-8")

    # Point the existing approved builder at the transient presentation source.
    # The source text itself remains the exact certified/published v0.6.3 file;
    # only Leader heading depth and approved sketch references are adapted.
    build_rulebook.RULEBOOK = PRODUCTION_SOURCE
    build_complete_rulebook.main()

    html = HTML.read_text(encoding="utf-8")
    html = replace_required(
        html,
        "Version 0.6.1 · First Playtest Revision",
        "Version 0.6.3",
        "approved cover version",
    )
    html = replace_required(
        html,
        "Gauntlet v0.6.1 Official Rulebook",
        "Gauntlet v0.6.3 Official Rulebook",
        "document title",
    )
    html = html.replace("GAUNTLET V0.6.1", "GAUNTLET V0.6.3")
    HTML.write_text(html, encoding="utf-8")

    paginator = RUNTIME_PAGINATOR.read_text(encoding="utf-8")
    paginator = replace_required(
        paginator,
        "GAUNTLET V0.6.1",
        "GAUNTLET V0.6.3",
        "folio version",
    )
    RUNTIME_PAGINATOR.write_text(paginator, encoding="utf-8")

    print(
        f"adapted approved Rulebook production system to {CURRENT_RULEBOOK.relative_to(ROOT)} "
        "with 12 presentation-only Leader sketches and the approved Leader-page hierarchy"
    )


if __name__ == "__main__":
    main()
