#!/usr/bin/env python3
"""Narrow PR #411 to the terminology package actually approved."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace_exact(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old!r}")
    target.write_text(text.replace(old, new), encoding="utf-8")


# Ordinary uses of “take effect” remain natural English. Only the tautological /
# rules-engine constructions around an effect “taking effect” are retired.
replace_exact(
    "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
    "If you do, put Field Command in your Graveyard after that Order is used.",
    "If you do, put Field Command in your Graveyard after that Order takes effect.",
)
replace_exact(
    "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    "Only the selected Proposal's effect applies, and only it may become ratified.",
    "Only the selected Proposal takes effect or may become ratified.",
)
replace_exact(
    "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    "The other Proposal has no effect and cannot become ratified.",
    "The other Proposal does not take effect or become ratified.",
)

# Assets use one ordinary verb: use. Do not substitute a separate “had an
# effect” taxonomy for voluntary or triggered Asset use.
replace_exact(
    "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
    "Opposing banked Assets have no effect during this battle.",
    "Opposing banked Assets cannot be used during this battle.",
)
replace_exact(
    "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
    "Complete after you win a battle in which an opposing banked Asset had an effect and none of your banked Assets had an effect.",
    "Complete after you win a battle in which the opponent used a banked Asset and you used none of your banked Assets.",
)

# “Use a Faction Action” is the approved category wording. Purge itself reads
# more naturally as a verb; do not force “use a Purge” throughout the chapter.
inq = "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md"
replace_exact(
    inq,
    "**Purge is the Inquisition's only Faction Action.** During either normal Action Opportunity on your turn, spend the listed Conviction to use one Purge instead of playing a card for its Action effect.",
    "**Purge is the Inquisition's only Faction Action.** During either normal Action Opportunity on your turn, spend the listed Conviction to Purge instead of playing a card for its Action effect.",
)
replace_exact(
    inq,
    "Using a Purge through an Action Opportunity permits you to use both normal Action Opportunities that turn. The other opportunity may be used normally, but you may use no more than one Purge through Action Opportunities that turn.",
    "When you use an Action Opportunity to Purge, you may use both normal Action Opportunities that turn. The other opportunity may be used normally, but only one Action Opportunity may be used to Purge that turn.",
)
replace_exact(
    inq,
    "During an Action Opportunity, spend Conviction on one Purge instead of playing a card for its Action effect. On your turn, you may use both the before- and after-movement Action Opportunities if one is used to Purge. You may use no more than one Purge through Action Opportunities that turn.",
    "During an Action Opportunity, spend Conviction to Purge instead of playing a card for its Action effect. On your turn, you may use both the before- and after-movement Action Opportunities if one is used to Purge. Only one Action Opportunity may be used to Purge that turn.",
)
replace_exact(
    inq,
    "During an Action Opportunity, instead of playing a card for its Action effect, spend Conviction to use one Purge:",
    "During an Action Opportunity, instead of playing a card for its Action effect, spend Conviction to Purge:",
)
replace_exact(
    inq,
    "On your turn, you may use both the before- and after-movement Action Opportunities if one is used to Purge. The other opportunity may be used normally. You may use no more than one Purge through Action Opportunities that turn.",
    "On your turn, you may use both the before- and after-movement Action Opportunities if one is used to Purge. The other opportunity may be used normally. Only one Action Opportunity may be used to Purge each turn.",
)
replace_exact(
    inq,
    "On your turn, you may use both normal Action Opportunities if one is used to Purge; no more than one Purge may be used through Action Opportunities that turn.",
    "On your turn, you may use both normal Action Opportunities if one is used to Purge; only one Action Opportunity may be used to Purge that turn.",
)
replace_exact(
    "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    "After winning a battle and clearing the battle cards, the Grand Inquisitor may use a discounted Purge.",
    "After winning a battle and clearing the battle cards, the Grand Inquisitor may immediately Purge at a reduced Conviction cost.",
)

# Preserve a separate Use effect in canonical data instead of folding it into
# Sleeper Network's Capacity text or retaining the retired activate field.
generator = "scripts/generate_v061_release.py"
replace_exact(generator, '    "Activate",', '    "Use",')
replace_exact(
    generator,
    '        "capacity",\n        "activate",\n        "compromised",',
    '        "capacity",\n        "activate",\n        "use",\n        "compromised",',
)

# Guard the approved scope in authoritative player-facing Markdown.
paths = [
    ROOT / "README.md",
    ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    *sorted((ROOT / "releases/v0.6.1/faction-guides").glob("*/Gauntlet_v0.6.1_*_Faction_Guide.md")),
]
text = "\n".join(path.read_text(encoding="utf-8") for path in paths)
for label, pattern in {
    "activate terminology": r"\bactivat(?:e|es|ed|ing|ion|ions)\b",
    "Action card": r"\bAction cards?\b",
    "Occupation used as an action": r"\b(?:enter|enters|entered|entering) Occupation\b",
    "player-facing destination terminology": r"\b(?:normal )?(?:card )?destinations?\b|destination-triggered|card-destination",
    "perform a Faction Action": r"\bperform(?:s|ed|ing)? (?:one |an? )?Faction Action\b",
}.items():
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        raise SystemExit(f"Residual {label}: {match.group(0)!r}")

# These approved retentions must remain represented.
for retained in ("eligible", "source", "active", "dormant"):
    if not re.search(rf"\b{retained}\b", text, re.IGNORECASE):
        raise SystemExit(f"Approved retained term disappeared: {retained}")

print("Approved terminology scope applied and audited.")
