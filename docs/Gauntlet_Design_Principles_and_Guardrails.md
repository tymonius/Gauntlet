# Gauntlet Design Principles and Guardrails

**Status:** Active design reference.  
**Purpose:** Evaluate proposed rules, cards, factions, components, and digital features without duplicating the canonical rulebook or the current development tracker.

Current rules live in the [official v0.6.0 rulebook](../releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md). Current testing priorities live in [Gauntlet Development Status](Gauntlet_Development_Status.md).

---

## 1. Core identity

Gauntlet is a tactical card-and-territory game about **running the Gauntlet**:

- advancing across contested ground;
- managing a small hand and limited card uses;
- making hidden battle commitments;
- occupying opposing Territories;
- surviving counterattacks;
- converting occupation into control; and
- defeating the opponent in their Last Stand.

The game should feel tense, interactive, positional, and decisive. Where the Player Tokens stand, which Territories face each player, and which cards have been permanently committed should matter.

Progress may be reversible, but it should not be endlessly resettable. A successful push should change the strategic situation even when the opponent retains meaningful counterplay.

---

## 2. Shared game and faction design

### Shared-game principle

> The shared game should teach Gauntlet. Factions should express different ways of pursuing power within Gauntlet.

Neutral cards and universal rules should establish:

- movement;
- battles;
- occupation, control, and capture;
- counterattacks;
- running the Gauntlet;
- Asset banking;
- Action and Battle effect timing;
- normal card destinations; and
- basic card flow, defense, and counterplay.

Faction systems should not be required for the shared game to function.

### Faction principle

A card belongs to a faction when it expresses **how that faction pursues power or victory**, not merely because the faction can use it efficiently.

- **Military:** conquest, battlefield momentum, Command, Orders, and direct pressure.
- **Diplomats:** Terms, concessions, legitimacy, Influence, and Peace Treaty.
- **Financiers:** Treasury, Capital, Deeds, leverage, income, and ownership.
- **Intelligence:** Missions, Intel, Surveillance, Interference, and Special Operation.
- **Mystics:** Rites, sacrifice, transformation, Graveyard interaction, and Ritual.
- **Inquisition:** Conviction, condemnation, suppression, Purge, and Purification.

Before moving a Neutral card into a faction, ask:

1. What shared tool leaves the Neutral pool?
2. Do other factions need that tool for interaction, emergency defense, pacing, or recovery?
3. Does the destination faction already perform the same job through its core system?
4. Would the card duplicate or bypass the faction mechanic rather than express it?

### Parallel progress

Both players should usually be able to make meaningful progress toward at least one victory condition at the same time.

Additional victory conditions should reduce pure tug-of-war without becoming disconnected solitaire systems. Opposing progress may increase pressure, cost, or risk, but should not automatically erase everything already accomplished.

Military is the deliberate exception: it is the baseline conquest faction and uses running the Gauntlet rather than a separate faction victory.

---

## 3. Complexity

Complexity is acceptable when it is:

- visible;
- thematic;
- concentrated in a coherent system;
- worth the decisions it creates;
- teachable through existing game objects; and
- consistent with the shared rules language.

Prefer effects that:

- resolve immediately;
- use existing zones and components;
- have a clear timing window;
- create visible choices and counterplay;
- are easy to infer from the board state; and
- advance positional play or a clear faction identity.

Avoid effects that:

- require hidden tracking;
- create multi-turn memory burdens without a visible object;
- add exceptions to already exceptional timing;
- require players to remember why a card is inactive;
- rewrite normal destinations without strong justification; or
- prevent the opponent from participating rather than improving the acting player's position.

Not every faction or card must be equally beginner-friendly. Advanced complexity is acceptable when it remains organized and legible.

---

## 4. Components and tracking

> Do not add a new piece, token, tracker, or supplemental card unless the mechanic clearly justifies it.

Prefer existing objects:

- Player Tokens;
- cards in the Draw Pile, hand, Battle Hand, Discard Pile, or Graveyard;
- banked Assets;
- controlled or occupied Territories;
- Overlays placed on Territories;
- cards bound to another visible component; and
- numbers tracked on a Leader or faction reference.

Before adding a marker, ask whether the state can instead be represented by:

- Territory control or occupation;
- a card in a visible zone;
- an Asset or Overlay;
- a faction reference or sliding tracker; or
- immediate resolution.

### Persistent effects

- Use an **Asset** for a player-owned persistent effect that should compete for Asset-bank capacity.
- Use an **Overlay** for an effect attached visibly to a specific Territory.
- Resolve and discard immediately when persistence is unnecessary.
- Use explicit card-specific self-tracking only when an Asset, Overlay, or immediate effect cannot represent the state cleanly.
- Do not create or revive a general Condition category.

Do not convert effects merely to eliminate terminology. Preserve pacing, counterplay, and clarity while using the approved object model.

---

## 5. Cards and Deck construction

### Printed information

Playable cards should show what is needed during play:

- title;
- deckbuilding value;
- allegiance where applicable;
- Action and/or Battle effect;
- reminder text where necessary; and
- mechanically relevant traits such as **Arcane**.

Deckbuilding-only metadata should live in canonical data, official lists, or digital tools rather than cluttering ordinary cards.

### Separate metadata axes

Development metadata may include:

- **Allegiance:** Neutral or faction-specific.
- **Starter eligibility:** whether a card belongs in an introductory Deck.
- **Complexity:** Basic or Advanced.
- **Watchlist:** a specific balance, pacing, wording, production, or interaction concern.

These are not printed gameplay classes. In particular, **Advanced** does not mean faction-specific or illegal in normal Deck construction.

### Card economy and destinations

Hand commitment should remain costly and intentional. Battle Hands should remain a renewable tactical resource unless an effect explicitly changes destination.

- Cards committed from hand normally go to the Graveyard.
- Cards chosen from a Battle Hand normally go to the Discard Pile.
- Unchosen Battle Hand cards normally go to the Discard Pile.

Cards that change these destinations should do so deliberately and visibly.

### Deckbuilding incentives

The deckbuilding-value system should create real tradeoffs rather than one solved curve. A Playable Deck below the value cap is legal, but the game should not accidentally reward unused value unless a larger or lower-cost Deck creates a genuine strategic benefit.

---

## 6. Movement, Territory, and pacing

Movement should arise from player choice and battle outcomes rather than repeated permission rolls.

Occupation before capture is central:

1. enter opposing ground;
2. win and occupy;
3. give the controller a counterattack window; and
4. capture at the start of the occupier's next turn if the position survives.

This sequence should remain the normal baseline. Immediate capture belongs on specific costly cards, Leader abilities, or exceptional effects.

### Asset-bank scaling

Asset capacity equals Territories controlled because territorial success should increase infrastructure capacity. This also creates snowball risk: losing a Territory may reduce both board position and engine capacity.

Do not silently add a minimum Asset capacity. Alternative limits belong in controlled comparison tests, not in the canonical rules without evidence.

Pacing changes should be evaluated using [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md), not solely by intuition or average game length.

---

## 7. Victory design

Running the Gauntlet is the universal baseline.

Faction-specific victories should be:

- public;
- visible;
- interactive;
- disruptable;
- connected to movement, battle, occupation, capture, cards, resources, or other existing game state;
- understandable before the final turn;
- possible without the opponent voluntarily enabling them; and
- more than a win-more confirmation of superior board position.

The core test is:

> Can this faction make progress while the opponent is making progress toward their own victory?

If not, the victory condition is likely recreating a static tug-of-war or a disconnected minigame.

---

## 8. Faction guardrails

### Military

- Must feel like direct battlefield competence, not simply normal Gauntlet with larger numbers.
- Command and Orders should create choices about momentum, defense, and capture timing.
- Watch chain battles and excessive shortcuts around the counterattack window.

### Diplomats

- Terms should create genuine accept/refuse decisions.
- Accepted Terms may avoid battle; refused Terms should generally improve the Diplomat's options rather than prohibit normal opposing play.
- Peace Treaty must remain viable under territorial pressure and must not depend entirely on voluntary acceptance.
- Avoid lingering hidden negotiation state.

### Financiers

- Economic systems must remain connected to Territory position and conflict.
- Treasury, Capital, Deeds, and buyouts should create visible leverage rather than bookkeeping for its own sake.
- Ownership progress should be contestable and understandable, including in mirror matches.

### Intelligence

- Hidden information should produce planning and tactical disruption, not constant checking or oppressive hand control.
- Missions should reward recognizable Gauntlet situations and usually be achievable within one or two turns when pursued.
- Interference should disrupt the current plan rather than destroy cards by default.
- Special Operation must remain publicly pressured by board state and contestable after it begins.

### Mystics

- Weirdness should be organized through consistent Rite, sacrifice, trait, and Graveyard templates.
- Ritual progress must remain public, interruptible, and connected to battles or board state.
- Mystics may be advanced, but should not become a solitaire puzzle.
- Cultural and ritual imagery should be invented or adapted carefully rather than directly appropriating living sacred traditions.

### Inquisition

- Should feel severe, procedural, and oppressive without using literal real-world religious iconography.
- Must have a functional plan against every faction, not only Mystics.
- Purification should create pressure through card attrition without making ordinary participation feel self-destructive or hopeless.
- Reserve scales imagery for a possible future Legal faction.

---

## 9. Future modules and factions

Post-v0.6 concepts belong in [the v0.7 Parking Lot](Gauntlet_v0.7_Parking_Lot.md).

A future faction may specialize in a shared component without owning it exclusively. For example, Engineers may specialize deeply in Overlays while current cards continue to use Overlays whenever a Territory-local effect is clearest.

Do not add hooks for Day/Night, multiplayer, Engineers, or other future modules to v0.6 cards unless the current game independently needs them.

---

## 10. Digital implementation

The Deckbuilder, canonical data, rules engine, interfaces, and telemetry are related but distinct layers.

- Canonical data defines versioned card and rules content.
- The engine defines legal state transitions.
- Interfaces request legal actions from the engine rather than reproducing rules independently.
- Hidden information must be exposed through player-specific views.
- Unsupported effects must be explicit rather than silently treated as resolved.
- Saved Decks and logs must retain their rules version.
- Version migration must be deliberate, not automatic.

Digital implementation is valuable when it exposes ambiguity in the physical rules. It does not become authoritative merely because code exists.

---

## 11. Development discipline

Prefer:

- ugly but testable prototypes;
- explicit assumptions;
- matched comparisons;
- human playtests after simulation;
- clear freeze, kill, and revisit criteria; and
- updating the governing source when a decision is approved.

Avoid:

- polishing an untested system;
- adding layers before core execution works;
- reviving historical ideas merely because they are documented;
- allowing multiple active documents to contradict one another; and
- treating archived discussion as current authority.

A superseded idea should be reopened only when a current test demonstrates a specific problem, the old idea addresses it, and the proposal is evaluated as a controlled experiment against simpler alternatives.
