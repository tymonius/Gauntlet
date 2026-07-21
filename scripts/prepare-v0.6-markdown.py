#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


ONLINE_TEXT_BLOCK = """
## Online Tools and Updates

The Gauntlet project repository, current release materials, and browser tools are available at **[tymonius.github.io/Gauntlet](https://tymonius.github.io/Gauntlet/)**.

Build and validate v0.6 Decks with the **[Gauntlet Deckbuilder](https://tymonius.github.io/Gauntlet/deckbuilder-v0.6/)**.
"""

ONLINE_QR = """
![QR code for the Gauntlet v0.6 Deckbuilder](images/qr/gauntlet-v0.6-deckbuilder.svg)
"""


def prepare_rulebook(source: str) -> str:
    source = source.replace("\r\n", "\n")
    parts = source.split("---", 1)
    if len(parts) != 2:
        raise ValueError("Rulebook title separator not found")
    body = parts[1].lstrip("\n")
    body = body.replace("../../images/", "images/")
    body = body.replace("%20", " ")
    marker = "\n---\n\n# Rules Conventions"
    if marker not in body:
        raise ValueError("Rulebook welcome-section marker not found")
    online_block = ONLINE_TEXT_BLOCK + "\n" + ONLINE_QR
    body = body.replace(marker, f"\n{online_block}\n---\n\n# Rules Conventions", 1)
    frontmatter = """---
title: GAUNTLET
subtitle: Official Rulebook
date: Version 0.6.0
lang: en-US
---

<div class="docx-page-break"></div>

"""
    return frontmatter + body


def prepare_reference(source: str) -> str:
    source = source.replace("\r\n", "\n")
    source = re.sub(r"^# Gauntlet v0\.6\.0 Reference Guide\s*", "", source, count=1)
    frontmatter = """---
title: GAUNTLET
subtitle: v0.6.0 Reference Guide
date: July 20, 2026
lang: en-US
---

<div class="docx-page-break"></div>

"""
    return frontmatter + source.rstrip() + "\n\n" + ONLINE_TEXT_BLOCK + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=["rulebook", "reference"])
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    raw = args.source.read_text(encoding="utf-8")
    prepared = prepare_rulebook(raw) if args.kind == "rulebook" else prepare_reference(raw)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(prepared, encoding="utf-8")


if __name__ == "__main__":
    main()
