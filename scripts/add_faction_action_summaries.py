from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GUIDES = ROOT / "releases/v0.6.1/faction-guides"

FILES = {
    "military": GUIDES / "military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
    "diplomat": GUIDES / "diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    "financier": GUIDES / "financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
    "intelligence": GUIDES / "intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
    "mystics": GUIDES / "mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
    "inquisition": GUIDES / "inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
}

TABLE_ROWS = {
    "military": (
        "| Resource gain | The first time each turn you win a battle, gain 1 Command. |\n",
        "| Resource gain | The first time each turn you win a battle, gain 1 Command. |\n"
        "| Faction Actions | None. Orders use their printed timings and do not use Action Opportunities. |\n",
    ),
    "diplomat": (
        "| Faction procedure | Offer Terms during opening effects. |\n",
        "| Faction procedure | Offer Terms during opening effects. |\n"
        "| Faction Actions | None. Terms and Leverage do not use Action Opportunities. |\n",
    ),
    "financier": (
        "| Financial Capacity | If Treasury value exceeds Territories controlled at the start of your turn, you may use both normal Action Opportunities; at least one must be a Financier Faction Action. |\n",
        "| Financial Capacity | If Treasury value exceeds Territories controlled at the start of your turn, you may use both normal Action Opportunities; at least one must be a Financier Faction Action. |\n"
        "| Faction Actions | Place a card in Treasury, buy or buy out a Deed, Play the Market, or use Hostile Takeover; all occur after movement. |\n",
    ),
    "intelligence": (
        "| Battle tools | Surveillance and Interference. |\n",
        "| Battle tools | Surveillance and Interference. |\n"
        "| Faction Actions | Start, complete, or abort a Mission; start or complete a Special Operation; all occur after movement. |\n",
    ),
    "mystics": (
        "| Progression | First Rite: Invocation; second: Transmutation; third: Convergence and Ritual. |\n",
        "| Progression | First Rite: Invocation; second: Transmutation; third: Convergence and Ritual. |\n"
        "| Faction Actions | Begin a Rite or, after all three Rites are complete, begin the Ritual of Ascendance; both occur after movement. |\n",
    ),
    "inquisition": (
        "| Faction Action | Purge; using one during your turn permits both normal Action Opportunities. |\n",
        "| Faction Actions | Purge. Using one through an Action Opportunity during your turn permits both normal Action Opportunities. |\n",
    ),
}

SECTIONS = {
    "military": """## Faction Actions

Military has **no Faction Actions**. Orders are Faction Abilities used at their printed timings; they do not use an Action Opportunity. Playing a Military card for its Action effect still uses an Action Opportunity under the shared rules.

""",
    "diplomat": """## Faction Actions

Diplomats have **no Faction Actions**. Offering Terms is a faction procedure during opening effects, and Leverage is a Faction Ability used before dice are rolled after refused Terms. Neither uses an Action Opportunity. Playing a Diplomat card for its Action effect still uses an Action Opportunity under the shared rules.

""",
    "financier": """## Faction Actions

Financiers have the following Faction Actions. Each uses one Action Opportunity and may be performed only after movement:

- **Place a card in Treasury:** Place one card from your Hand face up in your Treasury.
- **Buy or buy out a Deed:** Pay the full current cost to acquire one unowned Deed or buy out one opposing Financier's Deed.
- **Play the Market:** Discard one card from Hand, roll one die, and gain Capital according to the result.
- **Hostile Takeover — Executive only:** After winning a battle as the attacker that turn and becoming the occupier of the enemy Territory, buy or buy out its Deed; a successful purchase also gives you control of that Territory.

When Financial Capacity permits both normal Action Opportunities, at least one must be used for one of these Faction Actions. Line of Credit modifies a Deed purchase, and Subsidize modifies a battle; neither is a separate Faction Action.

""",
    "intelligence": """## Faction Actions

Intelligence has the following Faction Actions. Each uses one Action Opportunity and may be performed only after movement:

- **Start a Mission:** Place one eligible Intelligence card from Hand face down as your Active Mission.
- **Complete a Mission:** Reveal a satisfied Active Mission, gain its Mission reward, and put it in your Discard Pile.
- **Abort a Mission:** Reveal the Active Mission, spend Intel equal to its value, and put it in your Discard Pile.
- **Start a Special Operation:** When ready, place one eligible Intelligence card from Hand face down as your Special Operation.
- **Complete a Special Operation:** Reveal a satisfied, ready Special Operation, pay its Intel cost, and win the game.

Surveillance, Interference, Fieldcraft, and Mission Control are Faction Abilities, not Faction Actions. Mission Control may start a Mission without using an Action Opportunity only because its text expressly permits it.

""",
    "mystics": """## Faction Actions

Mystics have the following Faction Actions. Each uses one Action Opportunity and may be performed only after movement:

- **Begin a Rite:** Choose one incomplete Rite you may legally begin and pay its beginning cost.
- **Begin the Ritual of Ascendance:** After completing all three Rites, bind the required Arcane cards from Hand, Discard Pile, and Graveyard.

Completing a Rite is not a Faction Action; it occurs when that Rite's completion condition and timing are satisfied. Invocation, Transmutation, Convergence, and the Leader abilities are Faction Abilities, not Faction Actions.

""",
    "inquisition": """## Faction Actions

**Purge is the Inquisition's only Faction Action.** During either normal Action Opportunity on your turn, spend the listed Conviction to perform one Purge instead of playing a card for its Action effect.

Using a Purge through an Action Opportunity permits you to use both normal Action Opportunities that turn. The other opportunity may be used normally, but you may perform no more than one Purge through Action Opportunities that turn.

A Purge performed without using an Action Opportunity, such as one permitted by Final Judgment, is a Faction Ability at that timing rather than a Faction Action. It does not consume an Action Opportunity and does not count against the once-per-turn Action-Opportunity Purge limit.

""",
}

for key, path in FILES.items():
    text = path.read_text(encoding="utf-8")
    if "## Faction Actions\n" in text:
        continue

    old_row, new_row = TABLE_ROWS[key]
    if old_row not in text:
        raise SystemExit(f"Missing overview-table anchor in {path.relative_to(ROOT)}")
    text = text.replace(old_row, new_row, 1)

    anchor = "\n# 2. Components and setup\n"
    if anchor not in text:
        raise SystemExit(f"Missing section anchor in {path.relative_to(ROOT)}")
    text = text.replace(anchor, "\n" + SECTIONS[key] + "# 2. Components and setup\n", 1)
    path.write_text(text, encoding="utf-8")

changelog = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md"
text = changelog.read_text(encoding="utf-8")
entry = "- **Faction Action presentation:** Added a dedicated Faction Actions summary to every faction chapter, including explicit none entries where appropriate, and separated Action-Opportunity actions from other faction abilities and procedures.\n\n"
anchor = "## Post-release playtest changes\n\n"
if entry not in text:
    if anchor not in text:
        raise SystemExit("Missing changelog anchor")
    text = text.replace(anchor, anchor + entry, 1)
    changelog.write_text(text, encoding="utf-8")

for key, path in FILES.items():
    text = path.read_text(encoding="utf-8")
    if text.count("## Faction Actions\n") != 1:
        raise SystemExit(f"Expected exactly one Faction Actions section in {path.relative_to(ROOT)}")
    if "| Faction Actions |" not in text:
        raise SystemExit(f"Missing Faction Actions overview row in {path.relative_to(ROOT)}")
