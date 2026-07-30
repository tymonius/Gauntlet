#!/usr/bin/env python3
"""Finalize the published v0.6.1 metadata and current-release labels."""

from __future__ import annotations

import json
from pathlib import Path

DATE_ISO = "2026-07-30"
DATE_DISPLAY = "July 30, 2026"


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_if_present(text: str, old: str, new: str, count: int = 1) -> str:
    return text.replace(old, new, count) if old in text else text


def finalize_generator() -> None:
    path = Path("scripts/generate_v061_release.py")
    text = path.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        'RELEASE_NAME = "First Playtest Revision"\nSTATUS = "Draft pre-release playtest edition"',
        'RELEASE_NAME = "First Playtest Revision"\nRELEASE_DATE = "2026-07-30"\nSTATUS = "Published playtest edition"',
    )
    if 'RELEASE_DATE = "2026-07-30"' not in text:
        raise SystemExit("Could not establish v0.6.1 release date in generator")
    text = replace_if_present(text, '            "date": None,', '            "date": RELEASE_DATE,')
    if '            "date": RELEASE_DATE,' not in text:
        raise SystemExit("Could not establish generated canonical release date")
    write(str(path), text)


def finalize_manifest() -> None:
    path = Path("releases/v0.6.1/Gauntlet_v0.6.1_Manifest.json")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["status"] = "published"
    manifest["publication_date"] = DATE_ISO
    manifest["public_links"] = {
        "project_site": "https://gauntlet.run/",
        "release_package": "https://gauntlet.run/releases/v0.6.1/",
        "browser_rulebook": "https://gauntlet.run/rulebook/",
        "rulebook_pdf": "https://gauntlet.run/releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf",
        "card_reference": "https://gauntlet.run/card-reference/",
        "deckbuilder": "https://gauntlet.run/deckbuilder/",
        "faction_sheets": "https://gauntlet.run/faction-sheets/",
        "playtest_sheet": "https://gauntlet.run/playtest/",
    }
    manifest["remaining_release_work"] = []
    validation = manifest.setdefault("validation", {})
    validation["production_workers_deployed"] = True
    validation["physical_qr_session_test_passed"] = True
    validation["ready_for_publication"] = True
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def finalize_release_documents() -> None:
    path = Path("releases/v0.6.1/Gauntlet_v0.6.1_Release_Notes.md")
    text = path.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        "**Release date:** To be assigned at publication  \n**Status:** Draft pre-release playtest edition",
        f"**Release date:** {DATE_DISPLAY}  \n**Status:** Published playtest edition",
    )
    write(str(path), text)

    path = Path("releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md")
    text = path.read_text(encoding="utf-8")
    text = replace_if_present(text, "**Status:** Draft implementation", f"**Published:** {DATE_DISPLAY}")
    write(str(path), text)

    path = Path("releases/v0.6.1/README.md")
    text = path.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        "**Status:** Draft release candidate under final production validation  \n**Publication date:** To be assigned after deployment and physical verification",
        f"**Status:** Published canonical playtest edition  \n**Publication date:** {DATE_DISPLAY}",
    )
    text = replace_if_present(
        text,
        "Until this package is completely validated and published, v0.6.0 remains the current canonical release.",
        "This package is the current canonical release for Gauntlet playtesting. v0.6.0 remains archived for historical reference.",
    )
    text = replace_if_present(text, "The draft release candidate now contains or drives:", "The published release contains or drives:")
    if "## Remaining before publication" in text:
        start = text.index("## Remaining before publication")
        end = text.index("## Deferred final priority: playable digital implementation")
        publication = f'''## Public release links

- [Project site](https://gauntlet.run/)
- [Browser Rulebook](https://gauntlet.run/rulebook/)
- [Rulebook PDF](https://gauntlet.run/releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf)
- [Card Reference](https://gauntlet.run/card-reference/)
- [Deckbuilder](https://gauntlet.run/deckbuilder/)
- [Faction Sheets](https://gauntlet.run/faction-sheets/)
- [Playtest Sheet](https://gauntlet.run/playtest/)

## Publication verification

Production D1 migrations and both Cloudflare Worker deployments passed, both health endpoints were verified, and the physical coded-sheet lifecycle passed in production on {DATE_DISPLAY}. The completed evidence is preserved in `Gauntlet_v0.6.1_Physical_Verification_Checklist.md` and `deployment-status.json`.

'''
        text = text[:start] + publication + text[end:]
    write(str(path), text)


def finalize_public_labels() -> None:
    path = Path("README.md")
    text = path.read_text(encoding="utf-8")
    replacements = {
        "**Current canonical version:** v0.6.1 — Faction Framework Release": "**Current canonical version:** v0.6.1 — First Playtest Revision",
        "Gauntlet v0.6 Rules Assistant": "Gauntlet v0.6.1 Rules Arbiter",
        "Gauntlet v0.6 Deckbuilder": "Gauntlet v0.6.1 Deckbuilder",
        "Gauntlet v0.6 Faction Sheets": "Gauntlet v0.6.1 Faction Sheets",
        "docs/Gauntlet_v0.6_Neutral_Card_Pool.md": "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
        "docs/Gauntlet_v0.6_Territory_Pool.md": "docs/Gauntlet_v0.6.1_Territory_Pool.md",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    write(str(path), text)

    path = Path("index.html")
    text = path.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        "Canonical pre-release playtest edition · v0.6.1",
        "Current canonical playtest edition · v0.6.1",
    )
    text = text.replace("Unpublished pre-release playtest project.", "Unpublished playtest project.")
    write(str(path), text)


def finalize_documentation_index() -> None:
    path = Path("docs/README.md")
    text = path.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        "For the current playable release, begin with the [v0.6.0 release package](../releases/v0.6.0/README.md). The [v0.6.1 release package](../releases/v0.6.1/README.md) is an implementation draft and is not yet canonical.",
        "For the current playable release, begin with the [v0.6.1 release package](../releases/v0.6.1/README.md). v0.6.0 and earlier packages remain available only for historical reference.",
    )
    if "## Canonical v0.6.0 sources" in text:
        start = text.index("## Canonical v0.6.0 sources")
        end = text.index("## Active v0.6.1 implementation records")
        canonical = '''## Canonical v0.6.1 sources

These files govern the current published playtest game:

1. [Official Rulebook](../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md) — shared rules.
2. [Definitive faction guides](../releases/v0.6.1/faction-guides/) — faction rules, Leaders, supplemental components, and exact faction-card text.
3. [Neutral Card Pool](Gauntlet_v0.6.1_Neutral_Card_Pool.md) — exact Neutral-card text.
4. [Territory Pool](Gauntlet_v0.6.1_Territory_Pool.md) — exact Territory and Arena text.
5. [Canonical Data](../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json) — generated structured data; do not edit independently.
6. [Reference Guide](../releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.md) — compact play reference derived from the governing sources.
7. [Release Notes](../releases/v0.6.1/Gauntlet_v0.6.1_Release_Notes.md) and [Changelog](../releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md) — release explanation and detailed changes from v0.6.0.

When a derived PDF, printable sheet, Deckbuilder entry, or digital implementation conflicts with these sources, correct the governing source and regenerate the derived artifact.

'''
        text = text[:start] + canonical + text[end:]
    text = replace_if_present(
        text,
        "These implementation records do not override the published v0.6.0 package. After publication, move them to the archive or reduce them to continuing implementation notes rather than maintaining duplicated rules.",
        "These implementation records preserve the decisions and production history behind v0.6.1. They do not override the canonical release sources above and may be archived when they no longer serve an active development purpose.",
    )
    write(str(path), text)


def finalize_development_status() -> None:
    path = Path("docs/Gauntlet_Development_Status.md")
    text = path.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        "**Current canonical version:** v0.6.0 — Faction Framework Release  \n**Release date:** July 20, 2026  \n**Status:** Canonical pre-release playtest edition",
        f"**Current canonical version:** v0.6.1 — First Playtest Revision  \n**Release date:** {DATE_DISPLAY}  \n**Status:** Canonical playtest edition",
    )
    text = replace_if_present(
        text,
        "Gauntlet v0.6.0 remains the sole published rules and card package for playtesting. Earlier working rules, preliminary rulebooks, review logs, and release trackers are preserved under `docs/Archive/` and are not active sources.\n\nThe first physical v0.6.0 playtest was held July 27, 2026. It exposed rules-language, timing, onboarding, table-organization, and playtest-instrumentation problems but no immediate balance failure. Approved corrections are being implemented for v0.6.1 and tracked in [Gauntlet v0.6.1 Implementation Ledger](Gauntlet_v0.6.1_Implementation_Ledger.md). Until the v0.6.1 package is complete and published, the v0.6.0 sources remain canonical.",
        "Gauntlet v0.6.1 is the current published rules and card package for playtesting. Earlier releases, working rules, preliminary rulebooks, review logs, and release trackers are retained for historical reference and do not override the v0.6.1 governing sources.\n\nThe first physical v0.6.0 playtest was held July 27, 2026. It exposed rules-language, timing, onboarding, table-organization, and playtest-instrumentation problems but no immediate balance failure. v0.6.1 implements those approved corrections and adds the production-coded formal playtest workflow.",
    )
    old_priority = '''### 1. v0.6.1 finalization and publication

- Run the source synchronization, canonical-data generation, automated tests, and strict release validators on the completed branch.
- Regenerate the rulebook, reference guide, playtest sheet, player mat, printable cards, and supplemental components from the synchronized governing sources.
- Visually inspect every regenerated player-facing artifact at intended print size and at desktop/mobile browser widths.
- Synchronize the revision branch with current `main` website, artwork, print, and browser-tool work before merging.
- Keep v0.6.0 canonical until the full v0.6.1 package passes those checks and is published.
'''
    new_priority = '''### 1. v0.6.1 post-release stabilization

- Use v0.6.1 as the sole governing package for current tabletop playtesting.
- Preserve the completed deployment and physical QR lifecycle evidence with the release package.
- Route any discovered defect through the governing source, regenerate affected outputs, and record the correction before the next tagged revision.
- Resume the deferred digital-engine migration without treating the legacy prototype as v0.6.1-compatible.
'''
    text = replace_if_present(text, old_priority, new_priority)
    write(str(path), text)


def finalize_validator() -> None:
    path = Path("scripts/validate_v061_release.py")
    text = path.read_text(encoding="utf-8")
    old = '''    if strict_generated and validation.get("ready_for_publication") is True:
        for key in ("visual_checks_passed", "browser_checks_passed"):
            if validation.get(key) is not True:
                errors.append(f"Manifest says publication-ready while validation.{key} is not true")
'''
    new = '''    if strict_generated and validation.get("ready_for_publication") is True:
        required_ready_checks = (
            "browser_checks_passed",
            "document_visual_checks_passed",
            "faction_sheet_visual_checks_passed",
            "faction_pdf_page_validation_passed",
            "formal_session_lifecycle_tested",
            "complete_print_package_visual_checks_passed",
            "production_workers_deployed",
            "physical_qr_session_test_passed",
        )
        for key in required_ready_checks:
            if validation.get(key) is not True:
                errors.append(f"Manifest says publication-ready while validation.{key} is not true")
        if manifest.get("status") != "published":
            errors.append("Manifest says publication-ready while status is not published")
        if not manifest.get("publication_date"):
            errors.append("Manifest says publication-ready without a publication date")
        if manifest.get("remaining_release_work"):
            errors.append("Manifest says publication-ready while remaining release work is listed")
        public_links = manifest.get("public_links") or {}
        for key in ("project_site", "release_package", "browser_rulebook", "rulebook_pdf", "card_reference", "deckbuilder", "faction_sheets", "playtest_sheet"):
            if not public_links.get(key):
                errors.append(f"Manifest says publication-ready without public_links.{key}")
'''
    text = replace_if_present(text, old, new)
    if "required_ready_checks" not in text:
        raise SystemExit("Could not establish publication-aware manifest validation")
    write(str(path), text)


def main() -> int:
    finalize_generator()
    finalize_manifest()
    finalize_release_documents()
    finalize_public_labels()
    finalize_documentation_index()
    finalize_development_status()
    finalize_validator()
    print("Finalized Gauntlet v0.6.1 publication metadata for July 30, 2026.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
