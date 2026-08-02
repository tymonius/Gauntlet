from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATHS = [
    ROOT / "README.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md",
    ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
]
PATHS.extend(sorted((ROOT / "releases/v0.6.1/faction-guides").glob("**/*.md")))

patterns = {
    "activate": re.compile(r"\bactivat(?:e|es|ed|ing|ion|ions)\b", re.I),
    "destination": re.compile(r"\bdestination(?:s)?\b", re.I),
    "action card": re.compile(r"\bAction card(?:s)?\b", re.I),
    "perform faction action": re.compile(r"\bperform(?:s|ed|ing)?\b.*\bFaction Action\b|\bFaction Action\b.*\bperform(?:s|ed|ing)?\b", re.I),
    "occupation as action": re.compile(r"\benter(?:s|ed|ing)? Occupation\b|\bcarry out .*Occupation\b", re.I),
    "effect takes effect": re.compile(r"\beffect(?:s)? .*take(?:s)? effect\b|\beffect takes effect\b", re.I),
    "active faction ability": re.compile(r"\bactively used\b", re.I),
    "inactive asset": re.compile(r"\binactive Asset\b", re.I),
}

found = False
for path in PATHS:
    if not path.exists():
        continue
    lines = path.read_text(encoding="utf-8").splitlines()
    for number, line in enumerate(lines, start=1):
        matches = [name for name, pattern in patterns.items() if pattern.search(line)]
        if matches:
            found = True
            print(f"{path.relative_to(ROOT)}:{number} [{', '.join(matches)}] {line}")

if found:
    raise SystemExit("Natural-language audit found target phrases.")
