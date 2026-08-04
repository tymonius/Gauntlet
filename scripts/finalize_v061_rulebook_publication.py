#!/usr/bin/env python3
"""Preserve the physically verified v0.6.1 Rulebook publication metadata."""

from __future__ import annotations

import json
from pathlib import Path

MANIFEST = Path("releases/v0.6.1/Gauntlet_v0.6.1_Manifest.json")
BOOKLET_NAME = "Gauntlet_v0.6.1_Rulebook_Booklet.pdf"
BOOKLET_URL = f"https://gauntlet.run/releases/v0.6.1/{BOOKLET_NAME}"


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    outputs = [item for item in manifest.get("current_outputs", []) if not item.lower().endswith(".docx")]
    if BOOKLET_NAME not in outputs:
        reader = "Gauntlet_v0.6.1_Rulebook.pdf"
        index = outputs.index(reader) + 1 if reader in outputs else len(outputs)
        outputs.insert(index, BOOKLET_NAME)
    manifest["current_outputs"] = outputs

    manifest["retired_outputs"] = sorted(
        set(manifest.get("retired_outputs", []))
        | {
            "Gauntlet_v0.6.1_Rulebook.docx",
            "Gauntlet_v0.6.1_Reference_Guide.docx",
        }
    )

    manifest.setdefault("public_links", {})["rulebook_booklet_pdf"] = BOOKLET_URL

    validation = manifest.setdefault("validation", {})
    validation.update(
        {
            "rulebook_source_parity_passed": True,
            "rulebook_reader_visual_review_passed": True,
            "rulebook_spread_review_passed": True,
            "rulebook_grayscale_preflight_passed": True,
            "physical_rulebook_booklet_test_passed": True,
            "browser_rulebook_cosmetic_pass_complete": True,
            "browser_rulebook_desktop_mobile_checks_passed": True,
        }
    )

    publication = manifest.setdefault("rulebook_publication", {})
    publication.update(
        {
            "reader_pdf": "Gauntlet_v0.6.1_Rulebook.pdf",
            "reader_pages": 76,
            "booklet_pdf": BOOKLET_NAME,
            "booklet_sides": 38,
            "duplex_letter_sheets": 19,
            "duplex_setting": "landscape, flip on short edge, actual size",
            "grayscale_compatible": True,
            "physical_print_verified": "2026-08-04",
        }
    )

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Preserved v0.6.1 Rulebook reader, booklet, browser, and physical-verification metadata.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
