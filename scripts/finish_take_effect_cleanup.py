from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"
DIPLOMAT = ROOT / "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md"
MILITARY = ROOT / "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md"
INQUISITION = ROOT / "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md"


def apply(path: Path, replacements: dict[str, str]) -> None:
    text = path.read_text(encoding="utf-8")
    missing: list[str] = []
    for old, new in replacements.items():
        if old not in text:
            missing.append(old)
        text = text.replace(old, new)
    if missing:
        raise SystemExit(
            f"Missing expected text in {path.relative_to(ROOT)}:\n" + "\n---\n".join(missing)
        )
    path.write_text(text, encoding="utf-8")


apply(
    RULEBOOK,
    {
        "An effect cannot be canceled or negated after it has taken effect.":
            "An effect cannot be canceled or negated after it has been applied.",
        "A face-up Gambit that was revealed early remains in battle and takes effect at this stage unless its text says otherwise.":
            "A face-up Gambit that was revealed early remains in battle, and its effect is applied at this stage unless its text says otherwise.",
        "Diplomatic Latitude may offer two eligible Proposals with the same Stake. Stake that amount once. Only the selected Proposal takes effect or may become ratified.":
            "Diplomatic Latitude may offer two eligible Proposals with the same Stake. Stake that amount once. Only the selected Proposal's effect applies, and only it may become ratified.",
    },
)

apply(
    DIPLOMAT,
    {
        "Diplomatic Latitude may offer two eligible Proposals with the same Stake. Stake that amount once. Only the selected Proposal takes effect or may become ratified.":
            "Diplomatic Latitude may offer two eligible Proposals with the same Stake. Stake that amount once. Only the selected Proposal's effect applies, and only it may become ratified.",
        "The other Proposal does not take effect or become ratified. After the Terms conclude, put Diplomatic Latitude in your Discard Pile.":
            "The other Proposal has no effect and cannot become ratified. After the Terms conclude, put Diplomatic Latitude in your Discard Pile.",
    },
)

apply(
    MILITARY,
    {
        "If you do, put Field Command in your Graveyard after that Order takes effect.":
            "If you do, put Field Command in your Graveyard after that Order is used.",
    },
)

apply(
    INQUISITION,
    {
        "no more than one Purge may be performed through Action Opportunities that turn.":
            "no more than one Purge may be used through Action Opportunities that turn.",
    },
)

paths = [
    ROOT / "README.md",
    RULEBOOK,
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md",
    ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
]
paths.extend(sorted((ROOT / "releases/v0.6.1/faction-guides").glob("**/*.md")))

patterns = {
    "activate": re.compile(r"\bactivat(?:e|es|ed|ing|ion|ions)\b", re.I),
    "destination": re.compile(r"\bdestination(?:s)?\b", re.I),
    "action card": re.compile(r"\bAction card(?:s)?\b", re.I),
    "perform faction action": re.compile(r"\bperform(?:s|ed|ing)?\b.*\bFaction Action\b|\bFaction Action\b.*\bperform(?:s|ed|ing)?\b", re.I),
    "perform purge": re.compile(r"\bperform(?:s|ed|ing)?\b.*\bPurge\b|\bPurge\b.*\bperform(?:s|ed|ing)?\b", re.I),
    "occupation as action": re.compile(r"\benter(?:s|ed|ing)? Occupation\b|\bcarry out .*Occupation\b", re.I),
    "take effect": re.compile(r"\btake(?:s|n)? effect\b|\btook effect\b", re.I),
    "active faction ability": re.compile(r"\bactively used\b", re.I),
    "inactive asset": re.compile(r"\binactive Asset\b", re.I),
    "category switching": re.compile(r"rather than a Faction Action|is a Faction Ability at that timing", re.I),
}

issues: list[str] = []
for path in paths:
    if not path.exists():
        continue
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        for name, pattern in patterns.items():
            if pattern.search(line):
                issues.append(f"{path.relative_to(ROOT)}:{number} [{name}] {line}")
if issues:
    raise SystemExit("Remaining forced terminology:\n" + "\n".join(issues[:300]))
