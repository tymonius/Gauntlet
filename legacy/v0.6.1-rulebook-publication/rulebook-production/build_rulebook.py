#!/usr/bin/env python3
"""Build the complete v0.6.1 Rulebook source from the approved PR #357 design.

The canonical Markdown remains the content source. This script only converts it
into semantic tokens and supplies the exact approved cover/back-cover markup;
actual page composition and measurement happen in the browser paginator.
"""

from __future__ import annotations

import html
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
RULEBOOK = REPO / "releases" / "v0.6.1" / "Gauntlet_v0.6.1_Rulebook.md"
APPROVED_PATH = REPO / "rulebook-design" / "build_proofs.py"

PAGE_BREAK = '<div class="page-break"></div>'
COMMENT_RE = re.compile(r"<!--[\s\S]*?-->")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
UL_RE = re.compile(r"^\s*[-*+]\s+(.+)$")
OL_RE = re.compile(r"^\s*(\d+)[.)]\s+(.+)$")
TABLE_RULE_RE = re.compile(r"^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$")
IMAGE_RE = re.compile(r"^!\[([^]]*)\]\((?:<([^>]+)>|([^\s)]+))(?:\s+\"[^\"]*\")?\)\s*$")

PARTS = {
    "Part I — Learn to Play": {
        "label": "PART I",
        "title": "Learn to Play",
        "flavor": "Learn the field before you command it",
        "summary": "Build a position, move through a shared battlefield, and resolve battles through hidden commitments and precise timing. This part teaches the ordinary flow of play before the detailed rules begin.",
    },
    "Part II — Complete Shared Rules": {
        "label": "PART II",
        "title": "Complete Shared Rules",
        "flavor": "Exact language for difficult interactions",
        "summary": "Use these chapters when deck construction, simultaneous timing, copied effects, replacements, reveals, destinations, or Overlays require a precise ruling.",
    },
    "Part III — Factions": {
        "label": "PART III",
        "title": "Factions",
        "flavor": "Six institutions contest one battlefield",
        "summary": "Each faction uses the shared Gauntlet while adding a distinct resource, tactical identity, and strategic pressure. Read the chapter for the faction and Leader used in the game.",
    },
    "Part IV — Reference": {
        "label": "PART IV",
        "title": "Reference",
        "flavor": "Keep the table moving",
        "summary": "Compact turn and battle sequences, game-term definitions, and publication information for quick consultation during play.",
    },
}

FACTIONS = {
    "Military": {"leaders": ["General", "Commandant"], "claim": "Command the advance."},
    "Diplomats": {"leaders": ["Ambassador", "Senator"], "claim": "Make the enemy agree."},
    "Financiers": {"leaders": ["Banker", "Executive"], "claim": "Own what others contest."},
    "Intelligence": {"leaders": ["Ranger", "Spymaster"], "claim": "Know before they act."},
    "Mystics": {"leaders": ["Alchemist", "Spirit Walker"], "claim": "Transform the hidden world."},
    "Inquisition": {"leaders": ["Grand Inquisitor", "Witch Hunter"], "claim": "Condemn what cannot endure."},
}

LEADERS = {leader for faction in FACTIONS.values() for leader in faction["leaders"]}


def load_approved_module():
    spec = importlib.util.spec_from_file_location("gauntlet_approved_rulebook_design", APPROVED_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load approved design source: {APPROVED_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def normalize_image_path(value: str) -> str:
    value = value.strip()
    while value.startswith("../"):
        value = value[3:]
    if value.startswith("images/"):
        return f"../{value}"
    return value


def inline_markup(value: str) -> str:
    """Render the deliberately small Markdown subset used by the Rulebook."""
    escaped = html.escape(value, quote=False)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", escaped)
    escaped = re.sub(r"\[([^]]+)\]\((?:&lt;)?([^)&]+)(?:&gt;)?\)", r'<a href="\2">\1</a>', escaped)
    return escaped


def split_table_row(line: str) -> list[str]:
    line = line.strip().strip("|")
    return [cell.strip() for cell in line.split("|")]


def is_block_start(lines: list[str], index: int) -> bool:
    line = lines[index]
    if not line.strip():
        return True
    if line.strip() in {"---", PAGE_BREAK}:
        return True
    if HEADING_RE.match(line) or UL_RE.match(line) or OL_RE.match(line) or IMAGE_RE.match(line.strip()):
        return True
    if line.lstrip().startswith(">"):
        return True
    if "|" in line and index + 1 < len(lines) and TABLE_RULE_RE.match(lines[index + 1]):
        return True
    return False


def parse_markdown(source: str) -> list[dict]:
    cleaned = COMMENT_RE.sub("", source).replace("\r\n", "\n").replace("\r", "\n")
    cleaned = cleaned.replace(PAGE_BREAK, f"\n{PAGE_BREAK}\n")
    lines = cleaned.split("\n")
    tokens: list[dict] = []
    token_id = 0

    def emit(kind: str, **payload) -> None:
        nonlocal token_id
        token_id += 1
        tokens.append({"id": f"source-{token_id}", "kind": kind, **payload})

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            i += 1
            continue
        if stripped == PAGE_BREAK:
            emit("pagebreak")
            i += 1
            continue
        if stripped == "---":
            emit("divider")
            i += 1
            continue

        heading = HEADING_RE.match(line)
        if heading:
            level = len(heading.group(1))
            title = heading.group(2).strip()
            emit("heading", level=level, title=title, html=inline_markup(title), plain=title)
            i += 1
            continue

        image = IMAGE_RE.match(stripped)
        if image:
            alt = image.group(1).strip()
            src = normalize_image_path(image.group(2) or image.group(3) or "")
            emit("image", alt=alt, src=src, plain=alt)
            i += 1
            continue

        if "|" in line and i + 1 < len(lines) and TABLE_RULE_RE.match(lines[i + 1]):
            headers = split_table_row(line)
            i += 2
            rows: list[list[str]] = []
            while i < len(lines) and lines[i].strip() and "|" in lines[i]:
                rows.append(split_table_row(lines[i]))
                i += 1
            emit(
                "table",
                headers=[inline_markup(cell) for cell in headers],
                rows=[[inline_markup(cell) for cell in row] for row in rows],
                plain=" ".join(headers + [cell for row in rows for cell in row]),
            )
            continue

        if UL_RE.match(line) or OL_RE.match(line):
            ordered = bool(OL_RE.match(line))
            items: list[str] = []
            while i < len(lines):
                match = OL_RE.match(lines[i]) if ordered else UL_RE.match(lines[i])
                if not match:
                    break
                text = match.group(2) if ordered else match.group(1)
                items.append(inline_markup(text.strip()))
                i += 1
            emit("list", ordered=ordered, items=items, plain=" ".join(re.sub(r"<[^>]+>", "", item) for item in items))
            continue

        if line.lstrip().startswith(">"):
            quote_lines: list[str] = []
            while i < len(lines) and lines[i].lstrip().startswith(">"):
                quote_lines.append(lines[i].lstrip()[1:].lstrip())
                i += 1
            paragraphs: list[str] = []
            current: list[str] = []
            for quote_line in quote_lines:
                if quote_line:
                    current.append(quote_line)
                elif current:
                    paragraphs.append(" ".join(current))
                    current = []
            if current:
                paragraphs.append(" ".join(current))
            emit(
                "quote",
                paragraphs=[inline_markup(paragraph) for paragraph in paragraphs],
                plain=" ".join(paragraphs),
            )
            continue

        paragraph_lines = [line]
        i += 1
        while i < len(lines) and not is_block_start(lines, i):
            paragraph_lines.append(lines[i])
            i += 1
        hard_break_parts: list[str] = []
        current = ""
        for paragraph_line in paragraph_lines:
            if paragraph_line.endswith("  "):
                current += paragraph_line.rstrip() + "\n"
            else:
                current += paragraph_line.strip() + " "
        for part in current.strip().split("\n"):
            hard_break_parts.append(inline_markup(part.strip()))
        rendered = "<br />".join(hard_break_parts)
        plain = " ".join(part.strip() for part in current.replace("\n", " ").split())
        emit("paragraph", html=rendered, plain=plain)

    return tokens


def build_metadata(tokens: list[dict]) -> dict:
    headings = [token for token in tokens if token["kind"] == "heading"]
    chapters = []
    current_part = "Front Matter"
    for token in headings:
        title = token["title"]
        if token["level"] == 1 and title in PARTS:
            current_part = title
        elif token["level"] == 1 and re.match(r"^\d+\.\s+", title):
            number, name = title.split(".", 1)
            chapters.append({"number": int(number), "title": name.strip(), "heading": title, "part": current_part})
        elif token["level"] == 1 and current_part == "Part IV — Reference":
            chapters.append({"number": None, "title": title, "heading": title, "part": current_part})
    return {
        "parts": PARTS,
        "factions": FACTIONS,
        "leaders": sorted(LEADERS),
        "chapters": chapters,
    }


def main() -> None:
    if not RULEBOOK.is_file():
        raise RuntimeError(f"Missing canonical Rulebook source: {RULEBOOK}")
    approved = load_approved_module()
    approved_pages = approved.build_pages()
    tokens = parse_markdown(RULEBOOK.read_text(encoding="utf-8"))
    metadata = build_metadata(tokens)

    payload = json.dumps({"tokens": tokens, "metadata": metadata}, ensure_ascii=False).replace("</", "<\\/")
    body = f'''
<main id="reader-root" aria-label="Gauntlet v0.6.1 Official Rulebook"></main>
<main id="booklet-root" aria-label="Gauntlet v0.6.1 imposed booklet"></main>
<template id="approved-cover">{approved_pages[0]}</template>
<template id="approved-back-cover">{approved_pages[11]}</template>
<script id="rulebook-data" type="application/json">{payload}</script>
<script type="module" src="paginate_rulebook.mjs"></script>
'''
    output = approved.shell(
        "Gauntlet v0.6.1 Official Rulebook",
        body,
        body_class="color-edition production-document",
    )
    output = output.replace(
        '<link rel="stylesheet" href="proof-runtime.css" />',
        '<link rel="stylesheet" href="../rulebook-design/proof-runtime.css" />\n<link rel="stylesheet" href="production.css" />',
    )
    destination = ROOT / "full-rulebook.html"
    destination.write_text(output, encoding="utf-8")
    print(f"generated {destination} with {len(tokens)} canonical content tokens")


if __name__ == "__main__":
    main()
