#!/usr/bin/env python3
"""Validate the complete player-facing v0.6.1 Rulebook package.

Source validation checks the synchronized faction chapters, all twelve Leader
pages and sketches, the absence of internal editorial guidance, shared browser
font tokens, and public booklet links. Strict mode additionally validates the
half-letter reader PDF, editable DOCX, and imposed Letter booklet PDF.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "releases/v0.6.1"
RULEBOOK = RELEASE / "Gauntlet_v0.6.1_Rulebook.md"
REFERENCE = RELEASE / "Gauntlet_v0.6.1_Reference_Guide.md"
DOCX = RELEASE / "Gauntlet_v0.6.1_Rulebook.docx"
READER = RELEASE / "Gauntlet_v0.6.1_Rulebook.pdf"
BOOKLET = RELEASE / "Gauntlet_v0.6.1_Rulebook_Booklet.pdf"
MANIFEST = RELEASE / "Gauntlet_v0.6.1_Manifest.json"

LEADERS = (
    ("General", "general.png"),
    ("Commandant", "commandant.png"),
    ("Ambassador", "ambassador.png"),
    ("Senator", "senator.png"),
    ("Banker", "banker.png"),
    ("Executive", "executive.png"),
    ("Ranger", "ranger.png"),
    ("Spymaster", "spymaster.png"),
    ("Alchemist", "alchemist.png"),
    ("Spirit Walker", "spirit walker.png"),
    ("Grand Inquisitor", "grand inquisitor.png"),
    ("Witch Hunter", "witch hunter.png"),
)

FACTION_CHAPTERS = (
    "# 14. Military",
    "# 15. Diplomats",
    "# 16. Financiers",
    "# 17. Intelligence",
    "# 18. Mystics",
    "# 19. Inquisition",
)

FACTION_RULES = (
    "Command and Orders",
    "Offering Terms",
    "Controlling Interest",
    "Surveillance and Interference",
    "Ritual of Ascendance",
    "Purification",
)

PR336_RULEBOOK_TEXT = (
    "This is a tie rule, not an instance of the ordinary advantage mechanic.",
    "Defender's Advantage does not grant an additional die.",
    "Defender's Advantage means they win tied battle totals, and they separately add +1 to their battle total.",
    "Defender's Advantage applies, so the defender wins tied battle totals;",
    "the defender separately adds +1 to their battle total.",
)

PR336_REFERENCE_TEXT = (
    "On a tie, the defender wins if they control the contested Territory or are defending a Last Stand.",
    "Defender's Advantage means the defender wins ties; separately, the defender adds +1 to their battle total.",
)

FORBIDDEN_PLAYER_TEXT = (
    "# 15. Standard Language and Reference Rules",
    "Use these verbs consistently:",
    "Avoid generic phrases such as",
    "Battle Hand",
    "hand commitment",
)


def require_contains(text: str, required: tuple[str, ...], label: str, errors: list[str]) -> None:
    for value in required:
        if value not in text:
            errors.append(f"{label} is missing {value!r}")


def validate_sources(errors: list[str]) -> None:
    required_files = (
        RULEBOOK,
        REFERENCE,
        ROOT / "docs/Gauntlet_Rules_Language_and_Editorial_Standard.md",
        ROOT / "rulebook/index.html",
        ROOT / "rulebook/app.js",
        ROOT / "rulebook/markdown.js",
        ROOT / "rulebook/design-system.css",
        ROOT / "design-tokens.css",
        ROOT / "scripts/sync_v061_rulebook.py",
        ROOT / "scripts/render_v061_rulebook_pdf.mjs",
        ROOT / "scripts/impose_v061_rulebook_booklet.py",
        ROOT / "rules-assistant/v061-defenders-advantage.test.mjs",
        MANIFEST,
    )
    for path in required_files:
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"Missing or empty Rulebook package file: {path.relative_to(ROOT)}")

    if errors:
        return

    sync = subprocess.run(
        [sys.executable, str(ROOT / "scripts/sync_v061_rulebook.py"), "--check"],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if sync.returncode:
        errors.append(sync.stderr.strip() or sync.stdout.strip() or "Rulebook synchronization failed")

    rulebook = RULEBOOK.read_text(encoding="utf-8")
    reference = REFERENCE.read_text(encoding="utf-8")
    require_contains(rulebook, FACTION_CHAPTERS, "Rulebook Markdown", errors)
    require_contains(rulebook, FACTION_RULES, "Rulebook Markdown", errors)
    require_contains(rulebook, PR336_RULEBOOK_TEXT, "PR #336 Rulebook clarification", errors)
    require_contains(reference, PR336_REFERENCE_TEXT, "PR #336 Reference Guide clarification", errors)
    for leader, image in LEADERS:
        if f"## {leader}" not in rulebook:
            errors.append(f"Rulebook Markdown is missing Leader page {leader!r}")
        if f"images/sketches/{image}" not in rulebook:
            errors.append(f"Rulebook Markdown is missing the {leader} sketch reference")
    for value in FORBIDDEN_PLAYER_TEXT:
        if value in rulebook:
            errors.append(f"Player-facing Rulebook contains internal or obsolete text {value!r}")

    editorial = (ROOT / "docs/Gauntlet_Rules_Language_and_Editorial_Standard.md").read_text(
        encoding="utf-8"
    )
    require_contains(
        editorial,
        ("**Player-facing:** No", "Use these verbs consistently:", "the Aftermath of the battle"),
        "Internal editorial standard",
        errors,
    )

    browser = (ROOT / "rulebook/index.html").read_text(encoding="utf-8")
    require_contains(
        browser,
        (
            "../design-tokens.css",
            "design-system.css",
            "https://use.typekit.net/vgm6nwi.css",
            "Gauntlet_v0.6.1_Rulebook_Booklet.pdf",
        ),
        "Browser Rulebook",
        errors,
    )

    design = (ROOT / "rulebook/design-system.css").read_text(encoding="utf-8")
    require_contains(
        design,
        (
            "var(--font-display-historical)",
            "var(--font-display-web)",
            "var(--font-reading)",
            "var(--font-flavor)",
            "var(--font-interface)",
            "size: 5.5in 8.5in",
        ),
        "Rulebook design system",
        errors,
    )

    markdown_renderer = (ROOT / "rulebook/markdown.js").read_text(encoding="utf-8")
    if "html.push(PAGE_BREAK)" not in markdown_renderer:
        errors.append("Browser Markdown renderer does not preserve print page breaks")
    app = (ROOT / "rulebook/app.js").read_text(encoding="utf-8")
    if "buildPrintToc" not in app:
        errors.append("Browser Rulebook does not generate the print contents page")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"Rulebook manifest is invalid JSON: {exc}")
        return
    if "Gauntlet_v0.6.1_Rulebook_Booklet.pdf" not in (manifest.get("current_outputs") or []):
        errors.append("Release manifest does not list the booklet PDF")
    links = manifest.get("public_links") or {}
    if not links.get("rulebook_booklet_pdf"):
        errors.append("Release manifest does not publish rulebook_booklet_pdf")


def validate_generated(errors: list[str]) -> None:
    for path in (DOCX, READER, BOOKLET):
        if not path.is_file() or path.stat().st_size < 20_000:
            errors.append(f"Missing or unexpectedly small generated file: {path.relative_to(ROOT)}")
    if errors:
        return

    try:
        from docx import Document
        from pypdf import PdfReader
    except ImportError as exc:
        errors.append(f"Strict Rulebook validation requires python-docx and pypdf: {exc}")
        return

    document = Document(DOCX)
    docx_text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    require_contains(docx_text, tuple(name for name, _ in LEADERS), "Rulebook DOCX", errors)
    require_contains(docx_text, FACTION_RULES, "Rulebook DOCX", errors)
    require_contains(docx_text, PR336_RULEBOOK_TEXT, "PR #336 Rulebook DOCX clarification", errors)
    for value in FORBIDDEN_PLAYER_TEXT:
        if value in docx_text:
            errors.append(f"Rulebook DOCX contains internal or obsolete text {value!r}")
    section = document.sections[0]
    width = float(section.page_width.inches)
    height = float(section.page_height.inches)
    if abs(width - 5.5) > 0.05 or abs(height - 8.5) > 0.05:
        errors.append(f"Rulebook DOCX is not half-letter: {width:.2f} x {height:.2f} inches")
    with zipfile.ZipFile(DOCX) as archive:
        media = [name for name in archive.namelist() if name.startswith("word/media/")]
        if len(media) < 12:
            errors.append(f"Rulebook DOCX contains only {len(media)} embedded Leader images")

    reader = PdfReader(READER)
    if len(reader.pages) < 28:
        errors.append(f"Rulebook reader PDF has only {len(reader.pages)} pages")
    if reader.pages:
        width = float(reader.pages[0].mediabox.width)
        height = float(reader.pages[0].mediabox.height)
        if abs(width - 396) > 3 or abs(height - 612) > 3:
            errors.append(f"Rulebook reader PDF is not half-letter: {width} x {height} points")
    reader_text = "\n".join((page.extract_text() or "") for page in reader.pages)
    require_contains(reader_text, tuple(name for name, _ in LEADERS), "Rulebook reader PDF", errors)
    require_contains(reader_text, FACTION_RULES, "Rulebook reader PDF", errors)
    require_contains(reader_text, PR336_RULEBOOK_TEXT, "PR #336 reader-PDF clarification", errors)
    for value in FORBIDDEN_PLAYER_TEXT:
        if value in reader_text:
            errors.append(f"Rulebook reader PDF contains internal or obsolete text {value!r}")

    booklet = PdfReader(BOOKLET)
    padded_pages = math.ceil(len(reader.pages) / 4) * 4
    expected_sides = padded_pages // 2
    if len(booklet.pages) != expected_sides:
        errors.append(
            f"Booklet has {len(booklet.pages)} printed sides; expected {expected_sides} "
            f"from {len(reader.pages)} reader pages"
        )
    if booklet.pages:
        width = float(booklet.pages[0].mediabox.width)
        height = float(booklet.pages[0].mediabox.height)
        if abs(width - 792) > 3 or abs(height - 612) > 3:
            errors.append(f"Booklet PDF is not landscape Letter: {width} x {height} points")
    booklet_text = "\n".join((page.extract_text() or "") for page in booklet.pages)
    require_contains(booklet_text, tuple(name for name, _ in LEADERS), "Booklet PDF", errors)
    require_contains(booklet_text, PR336_RULEBOOK_TEXT, "PR #336 booklet-PDF clarification", errors)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict-generated", action="store_true")
    args = parser.parse_args()

    errors: list[str] = []
    validate_sources(errors)
    if args.strict_generated:
        validate_generated(errors)

    if errors:
        print("Gauntlet v0.6.1 Rulebook package validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    mode = "strict generated" if args.strict_generated else "source"
    print(
        f"Gauntlet v0.6.1 Rulebook {mode} validation passed: complete faction chapters, "
        "twelve illustrated Leader pages, PR #336 Defender's Advantage preservation, "
        "internal editorial separation, shared typography, half-letter reader edition, "
        "and imposed booklet package."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
