from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"
NEUTRAL = ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md"
DIPLOMATS = ROOT / "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md"
FINANCIERS = ROOT / "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md"
INTELLIGENCE = ROOT / "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md"
MYSTICS = ROOT / "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md"


def apply(path: Path, replacements: dict[str, str]) -> None:
    text = path.read_text(encoding="utf-8")
    for old, new in replacements.items():
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


apply(
    RULEBOOK,
    {
        "During a battle initiated by entry into an occupied Territory, the defender remains in that position until the outcome is determined.":
            "During a battle initiated by entering the opponent's position on a Territory, the defender remains there until the outcome is determined.",
        "This gives the opponent a chance to counterattack before control changes.":
            "This gives the controller a chance to initiate a Counterattack before control changes.",
        "- do not choose another effect that itself applies another effect unless expressly allowed.":
            "- do not choose another copied-effect instruction unless expressly allowed.",
        "including result effects, retreat, occupation, card destinations, and follow-up effects":
            "including result effects, retreat, Occupation, card destinations, and follow-up effects",
    },
)

apply(
    NEUTRAL,
    {
        "During their next Capture step, they capture it normally if they are still the occupier.":
            "During their next Capture step, they capture it normally if they are still the occupier of that Territory.",
        "During their following Capture step, they capture it normally if they are still the occupier.":
            "During their following Capture step, they capture it normally if they are still the occupier of that Territory.",
        "When counterattacking an opponent occupying a Territory you control, draw two additional cards when forming your Reserve.":
            "When initiating a Counterattack, draw two additional cards when forming your Reserve.",
        "If you are counterattacking an opponent occupying a Territory you control, gain advantage.":
            "If this battle is a Counterattack, gain advantage.",
    },
)

apply(
    DIPLOMATS,
    {
        "4. conduct the battle and its Aftermath.": "4. continue the battle through the Aftermath.",
        "To enter it while unoccupied, discard one card.":
            "To enter it while no Player Token is there, discard one card.",
        "At the start of the placing player's turn, before the Capture step, if they occupy it, they discard one card or withdraw.":
            "At the start of the placing player's turn, before the Capture step, if their Player Token is there, they discard one card or withdraw.",
    },
)

apply(
    FINANCIERS,
    {
        "**Archetype:** Offensive acquisition, occupation, and immediate control":
            "**Archetype:** Offensive acquisition, Occupation, and immediate control",
        "you may buy or buy out that Deed, treating the Territory as occupied.":
            "you may buy or buy out that Deed, treating yourself as its occupier.",
        "Deed ownership is independent of Territory control and occupation.":
            "Deed ownership is independent of token position and Territory control.",
    },
)

apply(
    INTELLIGENCE,
    {
        "Complete after you win a battle in which an opposing banked Asset was activated or had its effect applied and none of your banked Assets were activated or had its effect applied.":
            "Complete after you win a battle in which an opposing banked Asset was activated or had its effect applied and none of your banked Assets were activated or had their effects applied.",
    },
)

apply(
    MYSTICS,
    {
        "Play it face up as an additional Tactic and apply its effect immediately after applying Black Covenant.":
            "Play it face up as an additional Tactic and apply its effect immediately after Black Covenant's effect.",
    },
)

forbidden = {
    RULEBOOK: [
        "entry into an occupied Territory",
        "chance to counterattack before control changes",
        "itself applies another effect",
        "retreat, occupation, card destinations",
    ],
    NEUTRAL: [
        "if they are still the occupier.",
        "counterattacking an opponent occupying a Territory you control",
    ],
    DIPLOMATS: ["conduct the battle and its Aftermath", "while unoccupied", "if they occupy it"],
    FINANCIERS: ["acquisition, occupation, and immediate control", "treating the Territory as occupied", "Territory control and occupation"],
    INTELLIGENCE: ["none of your banked Assets were activated or had its effect applied"],
    MYSTICS: ["immediately after applying Black Covenant"],
}

issues: list[str] = []
for path, phrases in forbidden.items():
    text = path.read_text(encoding="utf-8")
    for phrase in phrases:
        if phrase in text:
            issues.append(f"{path.relative_to(ROOT)}: {phrase}")
if issues:
    raise SystemExit("Final terminology polish failed:\n" + "\n".join(issues))
