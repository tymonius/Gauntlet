from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATHS = [
    ROOT / "README.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md",
]
PATHS.extend(sorted((ROOT / "releases/v0.6.1/faction-guides").glob("**/*.md")))

REPLACEMENTS = {
    "Determine the winner, then gain normal Command before resolving other effects caused by that victory.":
        "Determine the winner, then gain normal Command before applying other effects caused by that victory.",
    "Choose one Proposal before resolving its Refused effect. Only it may be imposed.":
        "Choose one Proposal before applying its Refused effect. Only it may be imposed.",
    "and replaced overloaded uses of ‘resolve’ with operation-specific language.":
        "and replaced the former generic timing verb with operation-specific language.",
}

for path in PATHS:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")

pattern = re.compile(r"\bresolve(?:s|d)?\b|\bresolving\b|\bresolution\b", re.I)
leftovers: list[str] = []
for path in PATHS:
    if not path.exists():
        continue
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        audit_line = line.replace("Nonbinding Resolution", "")
        if pattern.search(audit_line):
            leftovers.append(f"{path.relative_to(ROOT)}:{number}: {line}")
if leftovers:
    raise SystemExit("Remaining overloaded terminology:\n" + "\n".join(leftovers[:200]))
