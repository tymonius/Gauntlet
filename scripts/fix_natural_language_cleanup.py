from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATHS = [
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    ROOT / "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
]

for path in PATHS:
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        "perform no more than one Purge through Action Opportunities that turn.",
        "use no more than one Purge through Action Opportunities that turn.",
    )
    text = text.replace(
        "spend Conviction to perform one Purge:",
        "spend Conviction to use one Purge:",
    )
    path.write_text(text, encoding="utf-8")

AUDIT_PATHS = [
    ROOT / "README.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md",
    ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
]
AUDIT_PATHS.extend(sorted((ROOT / "releases/v0.6.1/faction-guides").glob("**/*.md")))

patterns = {
    "activate": re.compile(r"\bactivat(?:e|es|ed|ing|ion|ions)\b", re.I),
    "destination": re.compile(r"\bdestination(?:s)?\b", re.I),
    "action card": re.compile(r"\bAction card(?:s)?\b", re.I),
    "perform faction action": re.compile(r"\bperform(?:s|ed|ing)?\b.*\bFaction Action\b|\bFaction Action\b.*\bperform(?:s|ed|ing)?\b", re.I),
    "perform purge": re.compile(r"\bperform(?:s|ed|ing)?\b.*\bPurge\b", re.I),
    "occupation as action": re.compile(r"\benter(?:s|ed|ing)? Occupation\b|\bcarry out .*Occupation\b", re.I),
    "effect takes effect": re.compile(r"\beffect(?:s)? .*take(?:s)? effect\b|\beffect takes effect\b", re.I),
    "active faction ability": re.compile(r"\bactively used\b", re.I),
    "inactive asset": re.compile(r"\binactive Asset\b", re.I),
    "category switching": re.compile(r"rather than a Faction Action|is a Faction Ability at that timing", re.I),
}

issues: list[str] = []
for path in AUDIT_PATHS:
    if not path.exists():
        continue
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        for name, pattern in patterns.items():
            if pattern.search(line):
                issues.append(f"{path.relative_to(ROOT)}:{number} [{name}] {line}")
if issues:
    raise SystemExit("Remaining forced terminology:\n" + "\n".join(issues[:300]))
