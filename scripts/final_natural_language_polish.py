from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"
INQUISITION = ROOT / "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md"

text = RULEBOOK.read_text(encoding="utf-8").replace(
    "An effect cannot be canceled or negated after it has taken effect.",
    "An effect cannot be canceled or negated after it has been applied.",
)
RULEBOOK.write_text(text, encoding="utf-8")

text = INQUISITION.read_text(encoding="utf-8").replace(
    "no more than one Purge may be performed through Action Opportunities that turn.",
    "no more than one Purge may be used through Action Opportunities that turn.",
)
INQUISITION.write_text(text, encoding="utf-8")

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
