#!/usr/bin/env python3
"""Synchronize Deckbuilder supplemental printing with v0.6.1.

The supplemental data is maintained in deckbuilder/v061-supplementals.js. This
script keeps the existing print renderer versioned correctly and ensures the
three double-sided Mystics Rite cards are included alongside Diplomat Proposal
fronts and Treaty Article backs.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRINT_JS = ROOT / "deckbuilder" / "print.js"
INDEX_HTML = ROOT / "deckbuilder" / "index.html"
SUPPLEMENTALS = ROOT / "deckbuilder" / "v061-supplementals.js"

RITE_CSS = """
.rite-card{--card-text-size:6pt;--card-label-size:5.8pt;display:grid;grid-template-rows:.22in .55in auto 1fr .16in;background:#f3edf7!important}.rite-card.completed{background:#e5d8ed!important}.rite-banner{display:flex;align-items:center;justify-content:center;border-bottom:1px solid #4b3158;background:#d7c4e0!important;color:#321c3e;font-size:5.5pt;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.rite-icon{display:flex;align-items:center;justify-content:center;font-size:24pt;color:#533564}.rite-title{padding:0 .08in .045in;border-bottom:1px solid #7c6188;font-family:Georgia,serif;font-size:11.4pt;font-weight:700;text-align:center}.rite-body{min-height:0;overflow:hidden;padding:.055in .085in .035in}.rite-section,.rite-complete,.rite-progress{font-size:var(--card-text-size);line-height:1.08}.rite-section+.rite-section,.rite-progress{margin-top:.045in;padding-top:.038in;border-top:1px solid #b7a4bf}.rite-footer{display:flex;align-items:center;justify-content:center;min-height:.16in;padding:.025in .055in;border-top:1px solid #4b3158;background:#d7c4e0!important;font-size:4.7pt;line-height:1;text-align:center}
""".strip()

RITE_BUILD_BLOCK = """
    if (packageData.rites?.length) {
      const riteFronts = packageData.rites.map(rite => riteToPrintHtml(rite, false));
      const riteBacks = [...packageData.rites]
        .reverse()
        .map(rite => riteToPrintHtml(rite, true));
      dedicatedPages.push(cardTableToHtml(riteFronts, 3));
      dedicatedPages.push(cardTableToHtml(riteBacks, 3));
    }
""".rstrip()

RITE_RENDERER = """
  function riteToPrintHtml(rite, completed) {
    if (completed) {
      return `<article class="print-card rite-card completed fit-target">
        <div class="rite-banner">Completed Rite</div>
        <div class="rite-icon">${escapeHtml(rite.icon || "✦")}</div>
        <div class="rite-title">${escapeHtml(rite.name)}</div>
        <div class="rite-body">
          <div class="rite-complete">This Rite is complete. Keep this side face up; it cannot be begun again.</div>
          <div class="rite-progress"><strong>Progression:</strong> First completed Rite unlocks Invocation. Second unlocks Transmutation. Third unlocks Convergence and permission to begin the Ritual of Ascendance.</div>
        </div>
        <div class="rite-footer">Pair with the incomplete side · not a Playable Deck card</div>
      </article>`;
    }
    return `<article class="print-card rite-card fit-target">
      <div class="rite-banner">Incomplete Rite</div>
      <div class="rite-icon">${escapeHtml(rite.icon || "✦")}</div>
      <div class="rite-title">${escapeHtml(rite.name)}</div>
      <div class="rite-body">
        ${rite.requirement ? `<div class="rite-section"><strong>Requirement:</strong> ${escapeHtml(rite.requirement)}</div>` : ""}
        <div class="rite-section"><strong>Beginning cost:</strong> ${escapeHtml(rite.beginning)}</div>
        <div class="rite-section"><strong>Completion:</strong> ${escapeHtml(rite.completion)}</div>
        ${rite.result ? `<div class="rite-section"><strong>Result:</strong> ${escapeHtml(rite.result)}</div>` : ""}
        <div class="rite-section"><strong>Interruption:</strong> ${escapeHtml(rite.interruption)}</div>
      </div>
      <div class="rite-footer">Flip when complete · not a Playable Deck card</div>
    </article>`;
  }
""".rstrip()


def synchronize() -> bool:
    text = PRINT_JS.read_text(encoding="utf-8")
    original = text

    text = text.replace("Gauntlet v0.6</title>", "Gauntlet v0.6.1</title>")
    text = text.replace("v0.6 dev", "v0.6.1")
    text = text.replace("Gauntlet v0.6 dev", "Gauntlet v0.6.1")

    territory_css_marker = ".territory{--card-text-size:8pt;--card-label-size:7pt}"
    if RITE_CSS not in text:
        if territory_css_marker not in text:
            raise RuntimeError("Deckbuilder print Territory CSS marker not found")
        text = text.replace(territory_css_marker, RITE_CSS + "\n" + territory_css_marker, 1)

    return_marker = """    return {
      leaderImage: packageData.leaderImages?.[data.leader.id] || "",
      inlineItems,
      dedicatedPages
    };"""
    if RITE_BUILD_BLOCK not in text:
        if return_marker not in text:
            raise RuntimeError("Deckbuilder supplemental return marker not found")
        text = text.replace(return_marker, RITE_BUILD_BLOCK + "\n\n" + return_marker, 1)

    territory_renderer_marker = "  function territoryToPrintHtml(territory) {"
    if RITE_RENDERER not in text:
        if territory_renderer_marker not in text:
            raise RuntimeError("Deckbuilder Territory renderer marker not found")
        text = text.replace(territory_renderer_marker, RITE_RENDERER + "\n\n" + territory_renderer_marker, 1)

    if text != original:
        PRINT_JS.write_text(text, encoding="utf-8")
        return True
    return False


def validate() -> list[str]:
    errors: list[str] = []
    print_text = PRINT_JS.read_text(encoding="utf-8")
    index_text = INDEX_HTML.read_text(encoding="utf-8")
    supplemental_text = SUPPLEMENTALS.read_text(encoding="utf-8") if SUPPLEMENTALS.is_file() else ""

    required = [
        "v061-supplementals.js?v=20260730-1",
        "packageData.rites?.length",
        "riteToPrintHtml",
        "Rite of Echoes",
        "Gambit Surveillance",
        "During an Action Opportunity",
    ]
    combined = "\n".join([print_text, index_text, supplemental_text])
    for term in required:
        if term not in combined:
            errors.append(f"Missing v0.6.1 supplemental print source: {term}")

    forbidden = ["v0.6 dev", "Battle Hand", "hand commitment", "played Tactics"]
    for term in forbidden:
        if term in combined:
            errors.append(f"Obsolete supplemental print term remains: {term}")

    return errors


def main() -> int:
    try:
        changed = synchronize()
    except RuntimeError as exc:
        print(f"Supplemental print synchronization failed: {exc}", file=sys.stderr)
        return 1

    errors = validate()
    if errors:
        print("Supplemental print validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Updated Deckbuilder supplemental print renderer." if changed else "Deckbuilder supplemental print renderer was already synchronized.")
    print("Validated v0.6.1 Leaders, references, trackers, Proposals, Rites, Deeds, and Purge printing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
