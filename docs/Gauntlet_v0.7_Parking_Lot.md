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

Overlays should remain a normal Gauntlet card type that any faction may use when an effect is board-local and visible. Engineers would not own Overlays as an exclusive mechanic; they would specialize in Overlays and interact with them more deeply than other factions.

Engineers could make Overlays a core system rather than an occasional faction-card tool.

Potential Engineer interactions:

- Place Overlays on Territories.
- Upgrade existing Overlays.
- Repair damaged or disabled Territories and Overlays.
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

### Repair

**Repair is reserved as an Engineer faction capability.** It is not a universal v0.6 Action.

Ruins Overlays such as Scorched Earth may remain indefinitely unless a specific card or future Engineer effect removes them. This preserves a distinctive Engineer role without preventing other factions from creating board-local Overlays.

Future testing should decide whether Repair is:

- a repeatable faction action;
- an Engineer resource expenditure;
- a leader ability;
- a family of Engineer cards;
- or some combination of those systems.

### Possible Victory Direction

The Engineer alternate victory should probably involve infrastructure, not merely control.

Possible directions:

- **Infrastructure Network:** win by controlling or occupying Territories containing Engineer Overlays in enough different positions.
- **Connected Route:** win by completing a connected chain of Engineer Overlays across the Gauntlet.
- **Built Environment:** win by having a specified number of upgraded or active Overlays in play at the start of your turn.

The strongest version is probably some kind of connected route or infrastructure network, because it makes Engineers care about space, position, and board shape.

### Design Guardrails

Do not add Engineers to v0.6.

Do not avoid Overlays in v0.6 merely to reserve the card type for Engineers. Other factions should be allowed to use Overlays when the effect is clearly factional, board-local, and more legible on a Territory than as an Asset, Condition, Territory, or normal card.

Engineers should be protected through depth and specialization, not exclusivity. A non-Engineer faction might place one or two specific Overlays; Engineers should be the faction that upgrades, repairs, moves, chains, dismantles, and wins through Overlay infrastructure.

When considering an Overlay for any faction, ask:

- Does this effect need to exist on a specific Territory?
- Does it create visible board-state counterplay?
- Is it clearly an expression of this faction's identity?
- Would it be cleaner as an Asset, Condition, Territory, or normal card?
- Is this a normal board-local faction effect, or does it require Engineer-level infrastructure depth?

### Current Decision

Park Engineers for v0.7 or later. Do not implement them in the v0.6 faction framework. Do not create a universal Repair action before the Engineer faction is designed.

---

## Multiplayer / Four-Player Variants

### Concept

A future v0.7+ module may support four-player Gauntlet.

This should not be added to v0.6. It should be explored only after the six-faction framework is stable.

### 2v2 Dual-Lane Prototype

Prior discussion explored a four-player variant with a two-tile-wide / 12-Territory Gauntlet and two players on each side.

Possible prototype:

- 6 columns x 2 rows.
- Two players per team.
- Alternating individual turns.
- Orthogonal movement.
- Team-controlled Territories.
- Each player has their own deck, hand, discard pile, Graveyard, and Asset bank.
- Team victory may require two breakthroughs or another shared-team win condition.

Design questions:

- Does each player control one lane, or can players cross lanes freely?
- Are Territories controlled by individual players or by the team?
- Do Asset bank limits count individual control or team control?
- Can one teammate defend or counterattack on the other's lane?
- How do faction alternate victories work in team play?

### Cross-Board / Central Arena Prototype

Prior discussion also explored a cross-shaped board where multiple lanes meet at a central Arena.

Possible directions:

- Large cross layout with four approaches meeting in the center.
- Smaller cross layout with fewer total Territories.
- A central Arena card or central contested Territory where the lanes connect.
- Players can potentially route around each other or enter another player's lane.

Design question:

- The cross variant may make it easier for players to get around blockers or create openings beyond an opponent's end of the Gauntlet, but it may also increase rules load and board-state ambiguity.

### Free-for-All / Arena Variant

Prior discussion treated free-for-all as a separate design problem, possibly under a **Gauntlet: Arena** style variant.

Open questions:

- Should alliances be allowed?
- If alliances are allowed, are they binding or purely table-talk?
- Does FFA need a different victory structure from normal breakthrough?
- How do kingmaking and runaway leader problems get controlled?
- Are faction alternate victories viable in FFA?

### Current Decision

Park all multiplayer variants for v0.7 or later. Do not implement in the v0.6 faction framework.

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
| Diplomats | Mystics |
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
- Mystics during Night: first Arcane card sent from hand to Graveyard each turn draws one, or beginning a Rite is slightly easier.
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
