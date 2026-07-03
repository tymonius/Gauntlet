# Gauntlet v0.7 Parking Lot

**Status:** Post-v0.6 discussion notes  
**Purpose:** Capture promising ideas that should not be added to the v0.6 faction release, but may be revisited after v0.6 is locked, playtested, and released.

---

## Engineer Faction / Overlay-Centered Faction

### Concept

A future **Engineer** faction may use Overlays as a cornerstone of its gameplay.

The faction identity would be built around reshaping the Gauntlet itself rather than primarily conquering ground, negotiating around battles, exhausting the opponent, completing rites, buying leverage, or operating through hidden missions.

Possible identity statement:

> Engineers win by modifying the ground itself.

### Overlay Direction

Engineers could make Overlays a core system rather than an occasional faction-card tool.

Potential Engineer interactions:

- Place Overlays on Territories.
- Upgrade existing Overlays.
- Repair damaged or disabled Overlays.
- Move, dismantle, or replace Overlays.
- Build connected infrastructure across multiple Territories.
- Turn contested ground into functional routes, fortifications, or resource nodes.

Possible Engineer Overlay concepts:

| Overlay | Concept |
|---|---|
| Bridge | Easier movement across or through a Territory |
| Barricade | Makes entry, battle, or capture harder for the opponent |
| Supply Depot | Supports draw, recovery, banking, or repeat use from a Territory |
| Workshop | Upgrades, repairs, or repositions other Overlays |
| Minefield | Punishes entering, retreating through, or fighting on a Territory |
| Fortress | Makes a Territory harder to capture, possibly with upkeep |
| Roadworks | Enables extra movement from or into a Territory |
| Demolition Charges | Sacrifice to remove an Overlay or force withdrawal |

### Possible Victory Direction

The Engineer alternate victory should probably involve infrastructure, not merely control.

Possible directions:

- **Infrastructure Network:** win by controlling or occupying Territories containing Engineer Overlays in enough different positions.
- **Connected Route:** win by completing a connected chain of Engineer Overlays across the Gauntlet.
- **Built Environment:** win by having a specified number of upgraded or active Overlays in play at the start of your turn.

The strongest version is probably some kind of connected route or infrastructure network, because it makes Engineers care about space, position, and board shape.

### Design Guardrails

Do not add Engineers to v0.6.

Use Overlays sparingly in v0.6 so the future Engineer faction retains a distinct mechanical identity.

Other factions may still receive occasional Overlays when the effect is clearly factional and board-local, such as Diplomats placing a Demilitarized Zone. However, avoid giving every faction broad buildable infrastructure unless the effect strongly belongs to that faction rather than to Engineers.

When considering an Overlay for a non-Engineer faction, ask:

- Does this effect need to exist on a specific Territory?
- Does it create visible board-state counterplay?
- Is it clearly an expression of this faction's identity?
- Would it be cleaner as an Asset, Condition, Territory, or normal card?
- Are we accidentally designing an Engineer card?

### Current Decision

Park Engineers for v0.7 or later. Do not implement in the v0.6 faction framework.

---

## Day/Night Cycle Module

### Concept

Gauntlet may eventually include a Day/Night cycle as an optional or core module.

The game would alternate between Day and Night. Each player would take one turn during Day, then each player would take one turn during Night. After both players have taken a Night turn, the cycle returns to Day.

Proposed cycle:

1. Day — Player 1 turn.
2. Day — Player 2 turn.
3. Night — Player 1 turn.
4. Night — Player 2 turn.
5. Repeat.

This could be tracked with a simple two-sided Day/Night marker.

### Faction Affiliation

Each faction may have a Day or Night affiliation. Factions may receive small bonuses, altered timing, or card interactions during their affiliated time.

Potential affiliations for discussion:

| Day | Night |
|---|---|
| Military | Intelligence |
| Diplomats | Arcane |
| Financiers | Inquisition |

Day factions broadly represent open force, public legitimacy, visible institutions, finance, formal power, and battlefield command.

Night factions broadly represent secrecy, fear, hidden knowledge, rituals, surveillance, purges, and disruption.

Inquisition is flexible and could be reconsidered. It may fit Day if framed as public trial/authority, or Night if framed as fear, witch-hunting, purging, and condemnation.

### Starting-Time Balance Idea

To reduce first-player advantage, the game could begin during the first player's unaffiliated time.

- If Player 1's faction is affiliated with Day, the game starts at Night.
- If Player 1's faction is affiliated with Night, the game starts at Day.

This prevents Player 1 from receiving both first turn and immediate affiliated-time advantage.

### Design Guardrails

Day/Night should not be added to v0.6. It should be revisited only after the faction framework is stable.

If developed, the cycle should probably have no universal effect by itself. Instead, faction abilities, leader abilities, and cards may reference Day or Night.

Avoid harsh unaffiliated-time penalties such as disabling a faction's core system. Players should not feel forced to stall until their preferred time.

Preferred approach:

- Affiliated time gives modest bonuses or alternate timing.
- Unaffiliated time usually imposes no penalty.
- Day/Night creates timing tension, not dead turns.
- The module should require minimal components.
- The module should not obscure whether v0.6 faction balance is working.

### Possible Bonus Direction

Examples for later testing, not final rules:

- Military during Day: first battle initiated each turn gains +1, or first battle win grants additional Command.
- Diplomats during Day: first accepted/refused Terms each turn grants +1 Influence, or Proposal costs are reduced by 1, minimum 0.
- Financiers during Day: first Deed purchase costs 1 less, or Deed Income gains +1 Capital.
- Intelligence during Night: first Surveillance each turn costs 0, or completed Missions grant +1 Intel.
- Arcane during Night: first Arcane card sent from hand to Graveyard each turn draws one, or beginning a Rite is slightly easier.
- Inquisition during Night: first Purge each turn costs 1 less, minimum 1, or first opposing card entering Graveyard after battle grants extra Conviction.

### Open Questions

- Should Day/Night be an optional advanced module, scenario rule, or eventually core?
- Are faction affiliations fixed by faction, chosen by leader, or determined by deck construction?
- Should cards have Day/Night riders, or should only faction/leader abilities care?
- How strong can affiliated-time bonuses be before players stall during unaffiliated time?
- Does beginning during Player 1's unaffiliated time adequately offset first-player advantage?
- Does the cycle speed games by creating timing windows, or slow games by encouraging waiting?

### Current Decision

Park this idea for discussion after the v0.6 release. Do not implement in the v0.6 faction framework.
